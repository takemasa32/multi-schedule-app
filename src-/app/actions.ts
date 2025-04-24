import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "../lib/supabase-admin";

/**
 * イベントの日程を確定するServer Action
 */
export async function finalizeEvent(
  eventId: string,
  dateId: string,
  adminToken: string
) {
  try {
    // 管理者権限チェック
    const { data: event, error: authError } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("admin_token", adminToken)
      .single();

    if (authError || !event) {
      throw new Error("権限がないか、イベントが存在しません");
    }

    // 日程確定処理
    const { error: updateError } = await supabaseAdmin
      .from("events")
      .update({
        is_finalized: true,
        final_date_id: dateId,
      })
      .eq("id", eventId);

    if (updateError) {
      console.error("日程確定エラー:", updateError);
      throw new Error("日程の確定に失敗しました");
    }

    // ページを再検証（更新）
    revalidatePath(`/event/${eventId}`);

    return { success: true };
  } catch (error) {
    console.error("日程確定処理でエラー:", error);
    throw error instanceof Error
      ? error
      : new Error("予期しないエラーが発生しました");
  }
}

export async function submitAvailability(formData: FormData) {
  const name = formData.get("participant_name") as string;
  const eventToken = formData.get("event_token") as string;

  try {
    // 入力チェック
    if (!name || !eventToken) throw new Error("必要な情報が不足しています");

    // イベント特定（tokenから）
    const { data: events, error: evErr } = await supabaseAdmin
      .from("events")
      .select("id, is_finalized")
      .eq("public_token", eventToken)
      .limit(1);

    if (evErr || !events?.length) {
      throw new Error("イベントが存在しません");
    }

    const event = events[0];
    if (event.is_finalized) {
      throw new Error("このイベントは既に確定済みです");
    }

    // 参加者登録（すでに存在する場合は既存の参加者IDを使用）
    let participantId: string;

    const { data: existingParticipants } = await supabaseAdmin
      .from("participants")
      .select("id")
      .eq("event_id", event.id)
      .eq("name", name)
      .limit(1);

    if (existingParticipants?.length) {
      // 既存参加者の場合
      participantId = existingParticipants[0].id;

      // 古い回答を削除
      await supabaseAdmin
        .from("availabilities")
        .delete()
        .eq("participant_id", participantId);
    } else {
      // 新規参加者の場合
      const { data: newParticipant, error: partErr } = await supabaseAdmin
        .from("participants")
        .insert({
          event_id: event.id,
          name,
          response_token: crypto.randomUUID(), // 将来的な編集用トークン
        })
        .select("id")
        .single();

      if (partErr || !newParticipant) {
        throw new Error("参加者の登録に失敗しました");
      }

      participantId = newParticipant.id;
    }

    // 回答を登録
    const availabilityRows: {
      event_id: string;
      participant_id: string;
      event_date_id: string;
      availability: boolean;
    }[] = [];

    // FormDataからcheckboxの値を取得
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("availability_")) {
        const dateId = key.replace("availability_", "");
        // checkboxはチェックされている場合のみformDataに含まれる
        availabilityRows.push({
          event_id: event.id,
          participant_id: participantId,
          event_date_id: dateId,
          availability: true,
        });
      }
    }

    // 回答がない場合はエラー
    if (availabilityRows.length === 0) {
      throw new Error("少なくとも1つの日程を選択してください");
    }

    const { error: availErr } = await supabaseAdmin
      .from("availabilities")
      .insert(availabilityRows);

    if (availErr) {
      console.error("回答保存エラー:", availErr);
      throw new Error("回答の保存に失敗しました");
    }

    // ページを再検証して最新データを表示
    revalidatePath(`/event/${eventToken}`);

    return { success: true };
  } catch (error) {
    console.error("回答送信エラー:", error);
    throw error instanceof Error
      ? error
      : new Error("予期しないエラーが発生しました");
  }
}
