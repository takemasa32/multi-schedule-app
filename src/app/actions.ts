"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
// Databaseの型が定義されていなければ、型情報なしでも問題ありません
// import { Database } from '@/lib/database.types';

// サーバーサイド用Supabaseクライアントの初期化
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function createEvent(formData: FormData) {
  const title = formData.get("title") as string;
  const description = formData.get("description") as string | null;
  const dates = formData.getAll("dates"); // 候補日程フィールド

  // バリデーション
  if (!title || dates.length === 0) {
    throw new Error("必要項目が未入力です");
  }

  try {
    // イベント作成
    const { data: eventData, error } = await supabaseAdmin
      .from("events")
      .insert({
        title,
        description,
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
