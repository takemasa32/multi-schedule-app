import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from "@/lib/supabase";
import { formatIcsDate } from '@/lib/utils';
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Next.js 15.3.1のAPIルートハンドラの形式に合わせる
export async function GET(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  { params }: any
) {
  try {
    const eventId = params.event_id;
    const url = new URL(request.url);
    const isGoogleCalendar = url.searchParams.get('googleCalendar') === 'true';

    // サーバーサイド用のSupabaseクライアントを初期化
    const supabase = createSupabaseClient();

    // イベント情報を取得
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, description, is_finalized, public_token')
      .eq('id', eventId)
      .single();

    if (eventError || !event || !event.is_finalized) {
      return new NextResponse('イベントが見つからないか、まだ確定されていません', {
        status: 404
      });
    }

    // 確定した日程の情報を取得（複数日程対応）
    // まずfinalized_datesテーブルから確定した日程IDを取得
    const { data: finalizedDates, error: finalizedError } = await supabase
      .from('finalized_dates')
      .select('event_date_id')
      .eq('event_id', eventId);

    if (finalizedError || !finalizedDates || finalizedDates.length === 0) {
      // 確定日程がfinalized_datesになければ、従来のfinal_date_idを検索
      const { data: eventWithFinalDate } = await supabase
        .from('events')
        .select('final_date_id')
        .eq('id', eventId)
        .single();

      // それでも確定日程がなければエラー
      if (!eventWithFinalDate?.final_date_id) {
        return new NextResponse('確定された日程が見つかりません', {
          status: 404
        });
      }

      // 従来のfinal_date_idを使用
      const finalDateIds = [eventWithFinalDate.final_date_id];

      // 日程の詳細を取得
      const { data: finalDates, error: dateError } = await supabase
        .from('event_dates')
        .select('id, start_time, end_time, label')
        .in('id', finalDateIds);

      if (dateError || !finalDates || finalDates.length === 0) {
        return new NextResponse('日程情報が見つかりません', {
          status: 404
        });
      }

      // Google Calendar URLの生成
      if (isGoogleCalendar) {
        // 単一の日程の場合
        const date = finalDates[0];
        const startDate = new Date(date.start_time);
        const endDate = new Date(date.end_time);

        const googleParams = new URLSearchParams({
          action: 'TEMPLATE',
          text: event.title,
          details: event.description || '',
          dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`
        });

        // Google Calendarリンクにリダイレクト
        return NextResponse.redirect(`https://calendar.google.com/calendar/render?${googleParams.toString()}`);
      }

      // ICSファイルの生成（単一日程）
      const icsContent = generateIcsContent({
        events: finalDates.map(date => ({
          startDate: new Date(date.start_time),
          endDate: new Date(date.end_time),
          title: event.title,
          description: event.description || '',
          eventId: `${event.id}-${date.id}`
        }))
      });

      // ファイル名に使用できるようにタイトルを整形
      const safeTitle = event.title.replace(/[^\w\s]/gi, '').trim() || 'event';

      // iCSファイルをダウンロード
      return new NextResponse(icsContent, {
        headers: {
          'Content-Type': 'text/calendar',
          'Content-Disposition': `attachment; filename="${safeTitle}.ics"`,
        },
      });
    } else {
      // 複数確定日程の処理
      const finalDateIds = finalizedDates.map(fd => fd.event_date_id);

      // 複数の確定日程の詳細情報を取得
      const { data: finalDates, error: dateError } = await supabase
        .from('event_dates')
        .select('id, start_time, end_time, label')
        .in('id', finalDateIds);

      if (dateError || !finalDates || finalDates.length === 0) {
        return new NextResponse('日程情報が見つかりません', {
          status: 404
        });
      }

      // Google Calendar URLの生成
      if (isGoogleCalendar) {
        // 最初の日程でGoogleカレンダーURLを生成（Googleカレンダーは複数イベントを一度に作成できないため）
        const date = finalDates[0];
        const startDate = new Date(date.start_time);
        const endDate = new Date(date.end_time);

        const googleParams = new URLSearchParams({
          action: 'TEMPLATE',
          text: `${event.title} ${finalDates.length > 1 ? `(1/${finalDates.length})` : ''}`,
          details: event.description || '',
          dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`
        });

        // Google Calendarリンクにリダイレクト
        return NextResponse.redirect(`https://calendar.google.com/calendar/render?${googleParams.toString()}`);
      }

      // 複数イベント用のICSファイルを生成
      const icsContent = generateIcsContent({
        events: finalDates.map(date => ({
          startDate: new Date(date.start_time),
          endDate: new Date(date.end_time),
          title: event.title,
          description: event.description || '',
          eventId: `${event.id}-${date.id}`
        }))
      });

      // ファイル名に使用できるようにタイトルを整形
      const safeTitle = event.title.replace(/[^\w\s]/gi, '').trim() || 'event';

      // iCSファイルをダウンロード
      return new NextResponse(icsContent, {
        headers: {
          'Content-Type': 'text/calendar',
          'Content-Disposition': `attachment; filename="${safeTitle}.ics"`,
        },
      });
    }
  } catch (error) {
    console.error('カレンダーデータ生成エラー:', error);
    return new NextResponse('カレンダーデータの生成に失敗しました', {
      status: 500
    });
  }
}

interface IcsEventProps {
  events: Array<{
    startDate: Date;
    endDate: Date;
    title: string;
    description: string;
    eventId: string;
  }>;
}

function generateIcsContent({ events }: IcsEventProps): string {
  const now = new Date();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MultiScheduleApp//JP',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  // 複数のイベントをサポート
  events.forEach(event => {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.eventId}@multischeduleapp.example.com`,
      `DTSTAMP:${formatIcsDate(now)}`,
      `DTSTART:${formatIcsDate(event.startDate)}`,
      `DTEND:${formatIcsDate(event.endDate)}`,
      `SUMMARY:${escapeIcsValue(event.title)}`,
      `DESCRIPTION:${escapeIcsValue(event.description)}`,
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// ICS用の特殊文字エスケープ
function escapeIcsValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// Google Calendar用の日付フォーマット（YYYYMMDDTHHMMSSZ形式）
function formatGoogleDate(date: Date): string {
  // 日本時間として解釈してからUTC形式に変換
  return dayjs(date)
    .tz("Asia/Tokyo")
    .utc()
    .format("YYYYMMDDTHHmmss") + "Z";
}
