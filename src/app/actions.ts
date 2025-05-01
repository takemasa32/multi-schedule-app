"use server";

import { createSupabaseClient } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";

/**
 * イベント作成処理
 */
export async function createEvent(formData: FormData) {
  try {
    // フォームからデータを取得
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;

    // 開始・終了時間の配列を取得
    const startTimes = formData.getAll("startTimes") as string[];
    const endTimes = formData.getAll("endTimes") as string[];

    // バリデーション
    if (!title || !title.trim()) {
      throw new Error("タイトルを入力してください");
    }

    if (!startTimes.length || !endTimes.length || startTimes.length !== endTimes.length) {
      throw new Error("候補日程の情報が正しくありません");
    }

    // トークン生成
    const publicToken = uuidv4();
    const adminToken = uuidv4();

    // Supabaseクライアント取得
    const supabase = createSupabaseClient();

    // イベント作成
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        public_token: publicToken,
        admin_token: adminToken,
      })
      .select("id")
      .single();

    if (eventError || !eventData) {
      console.error("イベント作成エラー:", eventError);
      throw new Error("イベント作成に失敗しました。もう一度お試しください。");
    }

    // 候補日程を登録
    const dateEntries = [];
    for (let i = 0; i < startTimes.length; i++) {
      dateEntries.push({
        event_id: eventData.id,
        start_time: startTimes[i],
        end_time: endTimes[i],
      });
    }

    const { error: datesError } = await supabase
      .from("event_dates")
      .insert(dateEntries);

    if (datesError) {
      console.error("候補日程登録エラー:", datesError);
      // イベントは作成済みだがロールバックはせず、エラーを返す
      throw new Error("候補日程の登録に失敗しました。イベント管理者に連絡してください。");
    }

    // クライアントコンポーネントで履歴保存できるように情報を返す
    const redirectUrl = `/event/${publicToken}?admin=${adminToken}`;

    return {
      success: true,
      publicToken,
      adminToken,
      redirectUrl
    };

  } catch (err) {
    // エラーログ出力
    console.error("Error in createEvent:", err);

    // Next.jsのリダイレクト例外はそのまま投げる（リダイレクト処理を妨げない）
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
      throw err;
    }

    // それ以外のエラーは適切なメッセージにラップして返す
    throw new Error(err instanceof Error ? err.message : "予期せぬエラーが発生しました");
  }
}

/**
 * 参加者の回答を保存するAction
 */
export async function submitAvailability(formData: FormData) {
  try {
    const eventId = formData.get("eventId") as string;
    const publicToken = formData.get("publicToken") as string;
    const participantName = formData.get("participant_name") as string;

    // 編集モードの場合、既存の参加者IDが提供される
    const participantId = formData.get("participantId") as string | null;

    // バリデーション
    if (!eventId || !publicToken || !participantName) {
      return { success: false, message: "必須項目が未入力です" };
    }

    const supabase = createSupabaseClient();

    // イベントの存在確認
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id")
      .eq("public_token", publicToken)
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return { success: false, message: "イベントが見つかりません" };
    }

    // 参加者の作成/特定
    let existingParticipantId = participantId;

    if (!existingParticipantId) {
      // 参加者IDが指定されていない場合は、名前で既存参加者を探す
      const { data: existingParticipant } = await supabase
        .from("participants")
        .select("id")
        .eq("event_id", eventId)
        .eq("name", participantName)
        .maybeSingle();

      if (existingParticipant) {
        existingParticipantId = existingParticipant.id;
      } else {
        // 新規参加者を作成
        const responseToken = uuidv4();
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

        existingParticipantId = newParticipant.id;
      }
    }

    // 既存の参加者の回答を削除
    await supabase
      .from("availabilities")
      .delete()
      .eq("participant_id", existingParticipantId)
      .eq("event_id", eventId);

    // フォームデータから利用可能時間を収集
    const availabilityEntries = [];

    for (const [key, value] of formData.entries()) {
      if (key.startsWith("availability_")) {
        const dateId = key.replace("availability_", "");
        availabilityEntries.push({
          event_id: eventId,
          participant_id: existingParticipantId,
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

    return {
      success: true,
      message: "回答を送信しました。ありがとうございます！"
    };
  } catch (err) {
    console.error("Error in submitAvailability:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "予期せぬエラーが発生しました"
    };
  }
}

/**
 * イベント日程確定用のAction
 * 複数の日程を確定できるように修正
 * 管理者でなくても使えるように変更
 */
export async function finalizeEvent(eventId: string, dateIds: string[]) {
  try {
    if (!eventId || !dateIds || dateIds.length === 0) {
      return { success: false, message: "必須パラメータが不足しています" };
    }

    const supabase = createSupabaseClient();

    // イベント情報を取得
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, public_token")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      console.error("Event retrieval error:", eventError);
      return { success: false, message: "イベントが見つかりません" };
    }

    // 選択された日程が存在するか確認
    const { data: dateCheck, error: dateCheckError } = await supabase
      .from("event_dates")
      .select("id")
      .eq("event_id", eventId)
      .in("id", dateIds);

    if (dateCheckError || !dateCheck || dateCheck.length !== dateIds.length) {
      console.error("Invalid date selection:", dateCheckError);
      return { success: false, message: "選択された日程が見つかりません" };
    }

    // イベントを確定済み状態に更新
    // 互換性のためfinal_date_idも設定（最初の日程IDを使用）
    const { error: finalizeError } = await supabase
      .from("events")
      .update({
        is_finalized: true,
        final_date_id: dateIds[0]  // 互換性のため最初の日程IDを設定
      })
      .eq("id", eventId);

    if (finalizeError) {
      console.error("Finalize error:", finalizeError);
      return { success: false, message: "イベント確定に失敗しました" };
    }

    // 確定日程テーブルをクリアしてから新しい日程を挿入（再確定の場合のため）
    await supabase
      .from("finalized_dates")
      .delete()
      .eq("event_id", eventId);

    // 複数の確定日程をfinalized_datesテーブルに登録
    const finalizedEntries = dateIds.map(dateId => ({
      event_id: eventId,
      event_date_id: dateId
    }));

    const { error: insertError } = await supabase
      .from("finalized_dates")
      .insert(finalizedEntries);

    if (insertError) {
      console.error("Finalized dates insertion error:", insertError);
      return { success: false, message: "確定日程の登録に失敗しました" };
    }

    // ページを再検証
    revalidatePath(`/event/${event.public_token}`);

    return { success: true };
  } catch (err) {
    console.error("Error in finalizeEvent:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "予期せぬエラーが発生しました"
    };
  }
}
