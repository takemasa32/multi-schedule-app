import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { formatIcsDate } from '@/lib/utils';

export async function GET(
  request: Request,
  { params }: { params: { event_id: string } }
) {
  try {
    const eventId = params.event_id;
    // サーバーサイド用のSupabaseクライアントを初期化
    const supabaseAdmin = getSupabaseServerClient();

    // イベント情報を取得
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, title, description, is_finalized, final_date_id')
      .eq('id', eventId)
      .single();

    if (eventError || !event || !event.is_finalized || !event.final_date_id) {
      return new Response('イベントが見つからないか、まだ確定されていません', {
        status: 404
      });
    }

    // 確定した日程の情報を取得
    const { data: finalDate, error: dateError } = await supabaseAdmin
      .from('event_dates')
      .select('date_time')
      .eq('id', event.final_date_id)
      .single();

    if (dateError || !finalDate) {
      return new Response('日程情報が見つかりません', {
        status: 404
      });
    }

    // 日程の開始時間と終了時間を設定
    const startDate = new Date(finalDate.date_time);
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 1); // デフォルトで1時間の予定として設定

    // ICSファイルの内容を生成
    const icsContent = generateIcsContent({
      startDate,
      endDate,
      title: event.title,
      description: event.description || '',
      eventId: event.id
    });

    // ファイル名に使用できるようにタイトルを整形
    const safeTitle = event.title.replace(/[^\w\s]/gi, '').trim() || 'event';

    // レスポンスを返す
    return new Response(icsContent, {
      headers: {
        'Content-Type': 'text/calendar',
        'Content-Disposition': `attachment; filename="${safeTitle}.ics"`,
      },
    });

  } catch (error) {
    console.error('ICSファイル生成エラー:', error);
    return new Response('カレンダーデータの生成に失敗しました', {
      status: 500
    });
  }
}

interface IcsEventProps {
  startDate: Date;
  endDate: Date;
  title: string;
  description: string;
  eventId: string;
}

function generateIcsContent({
  startDate,
  endDate,
  title,
  description,
  eventId
}: IcsEventProps): string {
  const now = new Date();

  // ICSファイルの内容を構築
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MultiScheduleApp//JP',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${eventId}@multischeduleapp.example.com`,
    `DTSTAMP:${formatIcsDate(now)}`,
    `DTSTART:${formatIcsDate(startDate)}`,
    `DTEND:${formatIcsDate(endDate)}`,
    `SUMMARY:${escapeIcsValue(title)}`,
    `DESCRIPTION:${escapeIcsValue(description)}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

// ICS用の特殊文字エスケープ
function escapeIcsValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}
