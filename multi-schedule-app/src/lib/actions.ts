"use server";

import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

// 環境変数が設定されていることを確認
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("必要な環境変数が設定されていません");
}

// サービスロール権限でのSupabaseクライアント作成
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * イベントを作成するサーバーアクション
 */
export async function createEvent(formData: FormData) {
  // フォームデータの取得
  const title = formData.get("title") as string;
  const description = formData.get("description") as string | null;
  const dates = formData.getAll("dates") as string[];

  // バリデーション
  if (!title || title.trim() === "") {
    throw new Error("イベントタイトルは必須です");
  }

  if (dates.length === 0) {
    throw new Error("少なくとも1つの候補日程を設定してください");
  }

  try {
    // eventsテーブルへイベント情報を挿入
    const { data: eventData, error: eventError } = await supabaseAdmin
      .from("events")
      .insert({
        title,
        description: description || null,
        // UUID はデータベース側で自動生成
      })
      .select("id, public_token, admin_token");

    if (eventError || !eventData || eventData.length === 0) {
      console.error("イベント作成エラー:", eventError);
      throw new Error("イベント情報の保存に失敗しました");
    }

    const event = eventData[0];

    // event_datesテーブルへ候補日程を挿入
    const dateRows = dates.map((dateStr) => ({
      event_id: event.id,
      date_time: new Date(dateStr),
    }));

    const { error: dateError } = await supabaseAdmin
      .from("event_dates")
      .insert(dateRows);

    if (dateError) {
      console.error("候補日程保存エラー:", dateError);
      throw new Error("候補日程の保存に失敗しました");
    }

    // 管理者ページへリダイレクト
    redirect(`/event/${event.public_token}/admin/${event.admin_token}`);
  } catch (error) {
    console.error("処理中にエラーが発生しました:", error);
    throw error;
  }
}
