"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { formatISO } from "date-fns";
import { revalidatePath } from "next/cache";

export async function createEvent(formData: FormData) {
  const title = formData.get("title") as string;
  const description = formData.get("description") as string || null;

  // 新しい仕様：開始時刻と終了時刻のペアを取得
  const startTimes = formData.getAll("startTimes") as string[];
  const endTimes = formData.getAll("endTimes") as string[];

  // バリデーション
  if (!title || title.trim() === "") {
    throw new Error("タイトルは必須です");
  }

  if (startTimes.length === 0 || endTimes.length === 0 || startTimes.length !== endTimes.length) {
    throw new Error("少なくとも1つの候補時間帯を設定してください");
  }

  // DB接続
  const supabase = createClient();

  try {
    const publicToken = uuidv4();
    const adminToken = uuidv4();

    // イベント作成
    const { data: eventData, error } = await supabase
      .from("events")
      .insert({
        title,
        description,
        public_token: publicToken,
        admin_token: adminToken,
      })
      .select("id, public_token, admin_token")
      .single();

    if (error || !eventData) {
      console.error("Event creation error:", error);
      throw new Error("イベントの作成に失敗しました");
    }

    // 候補日程の作成
    const dateRows = [];
    for (let i = 0; i < startTimes.length; i++) {
      const startTime = new Date(startTimes[i]);
      const endTime = new Date(endTimes[i]);

      // 有効な日時かチェック
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        continue; // 無効な日時はスキップ
      }

      // 終了が開始より後であることを確認
      if (startTime >= endTime) {
        continue; // 無効な時間帯はスキップ
      }

      dateRows.push({
        event_id: eventData.id,
        start_time: formatISO(startTime),
        end_time: formatISO(endTime)
      });
    }

    if (dateRows.length === 0) {
      throw new Error("有効な候補時間帯がありません");
    }

    const { error: datesError } = await supabase
      .from("event_dates")
      .insert(dateRows);

    if (datesError) {
      console.error("Event dates error:", datesError);
      throw new Error("候補日程の作成に失敗しました");
    }

    // 成功時はイベント詳細ページへリダイレクト
    // 管理者用クエリパラメータを追加
    redirect(`/event/${publicToken}?admin=${adminToken}`);
  } catch (err) {
    console.error("Error in createEvent:", err);
    throw new Error(err instanceof Error ? err.message : "予期せぬエラーが発生しました");
  }
}

// 参加者の回答を保存するAction
export async function submitAvailability(formData: FormData) {
  const eventId = formData.get("eventId") as string;
  const publicToken = formData.get("publicToken") as string;
  const participantName = formData.get("participant_name") as string;

  // バリデーション
  if (!participantName || participantName.trim() === "") {
    throw new Error("お名前は必須です");
  }

  if (!eventId || !publicToken) {
    throw new Error("イベント情報が不正です");
  }

  const supabase = createClient();

  try {
    // イベント情報の確認
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, is_finalized")
      .eq("id", eventId)
      .eq("public_token", publicToken)
      .single();

    if (eventError || !event) {
      console.error("Event not found:", eventError);
      throw new Error("イベントが見つかりませんでした");
    }

    if (event.is_finalized) {
      throw new Error("このイベントはすでに確定済みです");
    }

    // 参加者の登録または取得
    const responseToken = uuidv4();
    let participantId: string;

    // 同じ名前の参加者が既に存在するか確認
    const { data: existingParticipant } = await supabase
      .from("participants")
      .select("id")
      .eq("event_id", eventId)
      .eq("name", participantName)
      .maybeSingle();

    if (existingParticipant) {
      participantId = existingParticipant.id;

      // 既存の回答を削除
      await supabase
        .from("availabilities")
        .delete()
        .eq("event_id", eventId)
        .eq("participant_id", participantId);
    } else {
      // 新規参加者を作成
      const { data: newParticipant, error: participantError } = await supabase
        .from("participants")
        .insert({
          event_id: eventId,
          name: participantName,
          response_token: responseToken
        })
        .select("id")
        .single();

      if (participantError || !newParticipant) {
        console.error("Participant creation error:", participantError);
        throw new Error("参加者登録に失敗しました");
      }

      participantId = newParticipant.id;
    }

    // フォームデータから利用可能時間を収集
    const availabilityEntries: Array<{
      event_id: string;
      participant_id: string;
      event_date_id: string;
      availability: boolean;
    }> = [];

    for (const [key, value] of formData.entries()) {
      if (key.startsWith("availability_")) {
        const dateId = key.replace("availability_", "");
        availabilityEntries.push({
          event_id: eventId,
          participant_id: participantId,
          event_date_id: dateId,
          availability: value === "on" // checkbox値はonまたは存在しない
        });
      }
    }

    // 回答がない場合
    if (availabilityEntries.length === 0) {
      throw new Error("少なくとも1つの回答を入力してください");
    }

    // 回答を登録
    const { error: availabilityError } = await supabase
      .from("availabilities")
      .insert(availabilityEntries);

    if (availabilityError) {
      console.error("Availability submission error:", availabilityError);
      throw new Error("回答の保存に失敗しました");
    }

    // ページを再検証（キャッシュを更新）
    revalidatePath(`/event/${publicToken}`);

    return { success: true };
  } catch (err) {
    console.error("Error in submitAvailability:", err);
    throw new Error(err instanceof Error ? err.message : "予期せぬエラーが発生しました");
  }
}

// イベント日程確定用のAction
export async function finalizeEvent(eventId: string, dateId: string, adminToken: string) {
  if (!eventId || !dateId || !adminToken) {
    throw new Error("必須パラメータが不足しています");
  }

  const supabase = createClient();

  try {
    // 管理者権限の確認
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("admin_token", adminToken)
      .single();

    if (eventError || !event) {
      console.error("Admin validation error:", eventError);
      throw new Error("管理者権限がありません");
    }

    // イベント日程の確定
    const { error: finalizeError } = await supabase
      .from("events")
      .update({
        is_finalized: true,
        final_date_id: dateId
      })
      .eq("id", eventId);

    if (finalizeError) {
      console.error("Finalize error:", finalizeError);
      throw new Error("イベント確定に失敗しました");
    }

    // URLからクエリパラメータを維持したままページを再検証
    revalidatePath(`/event/[public_id]`);

    return { success: true };
  } catch (err) {
    console.error("Error in finalizeEvent:", err);
    throw new Error(err instanceof Error ? err.message : "予期せぬエラーが発生しました");
  }
}
