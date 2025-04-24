"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase";
import * as bcrypt from 'bcryptjs';

// サーバーサイド用Supabaseクライアントの初期化
const supabaseAdmin = getSupabaseServerClient();

export async function createEvent(formData: FormData) {
  const title = formData.get("title") as string;
  const description = formData.get("description") as string | null;
  const dates = formData.getAll("dates"); // 候補日程フィールド
  const adminPassword = formData.get("adminPassword") as string | null; // 管理者パスワード（任意）

  // バリデーション
  if (!title || dates.length === 0) {
    throw new Error("必要項目が未入力です");
  }

  try {
    // パスワードがあればハッシュ化
    let adminPasswordHash = null;
    if (adminPassword && adminPassword.trim() !== "") {
      adminPasswordHash = await bcrypt.hash(adminPassword, 10);
    }

    // イベント作成
    const { data: eventData, error } = await supabaseAdmin
      .from("events")
      .insert({
        title,
        description,
        admin_password_hash: adminPasswordHash,
        // UUIDは自動生成 (テーブル定義のdefault値に依存)
      })
      .select("id, public_token, admin_token");

    if (error || !eventData?.length) {
      console.error("イベント作成エラー:", error);
      throw new Error("イベント作成に失敗しました");
    }

    const newEvent = eventData[0];

    // 候補日程の挿入
    const dateRows = dates.map((dateStr) => ({
      event_id: newEvent.id,
      date_time: new Date(dateStr as string),
    }));

    const { error: dateError } = await supabaseAdmin
      .from("event_dates")
      .insert(dateRows);

    if (dateError) {
      console.error("日程保存エラー:", dateError);
      throw new Error("日程の保存に失敗しました");
    }

    // 作成成功：管理用ページへリダイレクト
    return redirect(
      `/event/${newEvent.public_token}/admin/${newEvent.admin_token}`
    );
  } catch (error) {
    console.error("Server Action実行エラー:", error);
    throw error instanceof Error
      ? error
      : new Error("予期しないエラーが発生しました");
  }
}

/**
 * 参加可否回答を送信するサーバーアクション
 */
export async function submitAvailability(formData: FormData) {
  try {
    const name = formData.get("participant_name") as string;
    const eventToken = formData.get("event_token") as string;

    // バリデーション
    if (!name || !eventToken) {
      throw new Error("名前とイベントトークンは必須です");
    }

    // イベント取得（公開トークンから）
    const { data: events, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, is_finalized")
      .eq("public_token", eventToken);

    if (eventError || !events?.length) {
      console.error("イベント取得エラー:", eventError);
      throw new Error("イベントが見つかりませんでした");
    }

    const event = events[0];

    // 確定済みイベントへの回答を拒否
    if (event.is_finalized) {
      throw new Error("このイベントは既に確定済みです");
    }

    // 参加者登録
    const { data: newParticipant, error: participantError } = await supabaseAdmin
      .from("participants")
      .insert({
        event_id: event.id,
        name
      })
      .select("id");

    if (participantError || !newParticipant?.length) {
      console.error("参加者登録エラー:", participantError);
      throw new Error("参加者の登録に失敗しました");
    }

    const participantId = newParticipant[0].id;

    // 回答データの作成
    const availabilityRows = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("availability_")) {
        const dateId = key.replace("availability_", "");
        const isAvailable = value === "on"; // チェックボックスの値

        availabilityRows.push({
          event_id: event.id,
          participant_id: participantId,
          event_date_id: dateId,
          availability: isAvailable
        });
      }
    }

    // 回答が一つもない場合
    if (availabilityRows.length === 0) {
      throw new Error("少なくとも1つの日程に回答してください");
    }

    // 回答データの保存
    const { error: availabilityError } = await supabaseAdmin
      .from("availabilities")
      .insert(availabilityRows);

    if (availabilityError) {
      console.error("回答登録エラー:", availabilityError);
      throw new Error("回答の保存に失敗しました");
    }

    return { success: true };
  } catch (error) {
    console.error("回答送信エラー:", error);
    throw error instanceof Error
      ? error
      : new Error("予期しないエラーが発生しました");
  }
}

/**
 * イベントの日程を確定するサーバーアクション
 */
export async function finalizeEvent(eventId: string, dateId: string, adminToken: string) {
  try {
    // 管理者権限の確認
    const { data: events, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, admin_token, is_finalized")
      .eq("id", eventId)
      .single();

    if (eventError || !events) {
      console.error("イベント取得エラー:", eventError);
      throw new Error("イベントが見つかりませんでした");
    }

    // 管理者トークンが一致するか確認
    if (events.admin_token !== adminToken) {
      throw new Error("管理者権限がありません");
    }

    // 既に確定済みでないか確認
    if (events.is_finalized) {
      throw new Error("このイベントは既に確定済みです");
    }

    // 日程が存在するか確認
    const { data: dateCheck, error: dateError } = await supabaseAdmin
      .from("event_dates")
      .select("id")
      .eq("id", dateId)
      .eq("event_id", eventId)
      .single();

    if (dateError || !dateCheck) {
      console.error("日程確認エラー:", dateError);
      throw new Error("指定された日程が見つかりません");
    }

    // イベントを確定状態に更新
    const { error: updateError } = await supabaseAdmin
      .from("events")
      .update({
        is_finalized: true,
        final_date_id: dateId
      })
      .eq("id", eventId);

    if (updateError) {
      console.error("日程確定エラー:", updateError);
      throw new Error("日程の確定に失敗しました");
    }

    // 正常終了 - キャッシュを更新して現在のページを再表示
    return { success: true };
  } catch (error) {
    console.error("日程確定エラー:", error);
    throw error instanceof Error
      ? error
      : new Error("予期しないエラーが発生しました");
  }
}
