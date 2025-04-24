"use server";

import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

// Supabase クライアントの初期化
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function createEvent(formData: FormData) {
  try {
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const dates = formData.getAll("dates") as string[];

    // バリデーション
    if (!title || dates.length === 0) {
      throw new Error("タイトルと少なくとも1つの候補日程が必要です");
    }

    // UUIDの生成
    const publicToken = uuidv4();
    const adminToken = uuidv4();

    // イベントの作成
    const { data: eventData, error } = await supabaseAdmin
      .from("events")
      .insert({
        title,
        description,
        public_token: publicToken,
        admin_token: adminToken,
      })
      .select("id");

    if (error || !eventData) {
      console.error("イベント作成エラー:", error);
      throw new Error("イベント作成に失敗しました");
    }

    const eventId = eventData[0].id;

    // 候補日程を保存
    const dateRows = dates.map((dateStr) => ({
      event_id: eventId,
      date_time: new Date(`${dateStr}T00:00:00`).toISOString(),
    }));

    const { error: dateError } = await supabaseAdmin
      .from("event_dates")
      .insert(dateRows);

    if (dateError) {
      console.error("日程保存エラー:", dateError);
      throw new Error("日程の保存に失敗しました");
    }

    // イベント詳細ページへリダイレクト
    redirect(`/event/${publicToken}/admin/${adminToken}`);
  } catch (error) {
    console.error("Error in createEvent:", error);
    throw error;
  }
}
