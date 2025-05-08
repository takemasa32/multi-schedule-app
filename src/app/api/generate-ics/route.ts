import { NextRequest } from "next/server";
import { createSupabaseClient } from "@/lib/supabase";

/**
 * イベントの確定日程からiCalendar(.ics)ファイルを生成して返すAPI
 * クエリ: ?event={public_token}
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const publicToken = searchParams.get("event");
  if (!publicToken) {
    return new Response("eventパラメータが必要です", { status: 400 });
  }
  const supabase = createSupabaseClient();
  // イベント情報取得
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, description, final_date_id")
    .eq("public_token", publicToken)
    .single();
  if (eventError || !event) {
    return new Response("イベントが見つかりません", { status: 404 });
  }
  if (!event.final_date_id) {
    return new Response("確定日程がありません", { status: 400 });
  }
  // 日程情報取得
  const { data: date, error: dateError } = await supabase
    .from("event_dates")
    .select("start_time, end_time")
    .eq("id", event.final_date_id)
    .single();
  if (dateError || !date) {
    return new Response("日程情報が取得できません", { status: 404 });
  }
  // iCalendar形式テキスト生成
  const dtStart = formatICSDate(date.start_time);
  const dtEnd = formatICSDate(date.end_time);
  const now = formatICSDate(new Date().toISOString());
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//MultiScheduleApp//EN\nBEGIN:VEVENT\nUID:${event.id}@multischeduleapp\nDTSTAMP:${now}\nDTSTART:${dtStart}\nDTEND:${dtEnd}\nSUMMARY:${escapeICS(event.title)}\nDESCRIPTION:${escapeICS(event.description || "")}\nEND:VEVENT\nEND:VCALENDAR\n`;
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename=event.ics`,
    },
  });
}

/**
 * ISO文字列をiCalendarの日時形式(UTC)に変換
 * 例: 2025-05-10T10:00:00Z → 20250510T100000Z
 */
function formatICSDate(iso: string): string {
  const d = new Date(iso);
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+/, "Z")
    .replace("T", "T");
}

/**
 * iCalendar用にテキストをエスケープ
 */
function escapeICS(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
