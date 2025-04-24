import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { formatIcsDate } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const eventId = params.eventId;

  if (!eventId) {
    return new Response("イベントIDが指定されていません", { status: 400 });
  }

  // Supabaseクライアントの初期化
  const supabase = createServerSupabaseClient();

  try {
    // イベント情報の取得
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title, description, is_finalized, final_date_id")
      .eq("public_token", eventId)
      .single();

    if (eventError || !event) {
      console.error("イベント取得エラー:", eventError);
      return new Response("イベントが見つかりません", { status: 404 });
    }

    if (!event.is_finalized || !event.final_date_id) {
      return new Response("このイベントはまだ確定していません", {
        status: 400,
      });
    }

    // 確定した日程の取得
    const { data: finalDate, error: dateError } = await supabase
      .from("event_dates")
      .select("date_time")
      .eq("id", event.final_date_id)
      .single();

    if (dateError || !finalDate) {
      console.error("日程取得エラー:", dateError);
      return new Response("日程情報が見つかりません", { status: 404 });
    }

    // ICSファイルの生成
    const eventDate = new Date(finalDate.date_time);
    // 終了時間は開始時間の1時間後をデフォルトとする
    const eventEndDate = new Date(eventDate.getTime() + 60 * 60 * 1000);

    const now = new Date();
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ScheduleApp//JP",
      "BEGIN:VEVENT",
      `UID:${event.id}@schedulingapp`,
      `DTSTAMP:${formatIcsDate(now)}`,
      `DTSTART:${formatIcsDate(eventDate)}`,
      `DTEND:${formatIcsDate(eventEndDate)}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description || ""}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    return new Response(icsContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          event.title
        )}.ics"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("ICSファイル生成エラー:", error);
    return new Response("カレンダーファイルの生成に失敗しました", {
      status: 500,
    });
  }
}
