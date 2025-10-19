'use client';

import { useState } from 'react';
import { formatDateTimeWithDay } from '@/lib/utils';

interface CalendarLinksProps {
  eventTitle: string;
  eventDates: {
    id: string;
    start_time: string;
    end_time: string;
    label?: string;
  }[];
  eventId: string;
  description?: string | null;
}

export function CalendarLinks({ eventDates, eventId }: CalendarLinksProps) {
  // 各日程のローディング状態を管理するための配列
  const [loadingStates, setLoadingStates] = useState<
    Record<string, { google: boolean; ics: boolean }>
  >({});

  // Google カレンダーリンクの生成 - 日程IDごとに個別のリンク
  const generateGoogleCalendarLink = (eventDateId: string) => {
    return `/api/calendar/${eventId}?googleCalendar=true&dateId=${eventDateId}`;
  };

  // .ics ファイルのダウンロードリンク - 日程IDごとに個別のICSファイル
  const generateIcsDownloadLink = (eventDateId: string) => {
    return `/api/calendar/ics/${eventId}?dateId=${eventDateId}`;
  };

  // 特定の日程のローディング状態を更新
  const setLoading = (dateId: string, type: 'google' | 'ics', value: boolean) => {
    setLoadingStates((prev) => ({
      ...prev,
      [dateId]: {
        ...prev[dateId],
        [type]: value,
      },
    }));
  };

  // 特定の日程のGoogle Calendarのローディング状態を取得
  const isGoogleLoading = (dateId: string) => {
    return loadingStates[dateId]?.google || false;
  };

  // 特定の日程のiCalendarのローディング状態を取得
  const isIcsLoading = (dateId: string) => {
    return loadingStates[dateId]?.ics || false;
  };

  // 時間範囲を読みやすい形式にフォーマット
  const formatTimeRange = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);

    // 00:00を24:00として表示する処理
    const formatEndTime = () => {
      if (end.getHours() === 0 && end.getMinutes() === 0) {
        // 開始日と終了日を比較
        const startDate = new Date(start);
        startDate.setHours(0, 0, 0, 0); // 時刻部分をリセット

        const endDate = new Date(end);
        endDate.setHours(0, 0, 0, 0); // 時刻部分をリセット

        // 終了日が開始日の翌日である場合は24:00と表示
        if (endDate.getTime() - startDate.getTime() === 24 * 60 * 60 * 1000) {
          return '24:00';
        }
      }

      return `${end.getHours().toString().padStart(2, '0')}:${end
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
    };

    // 同じ日または24:00にまたがる場合は日付を1回だけ表示
    const startDay = new Date(start);
    startDay.setHours(0, 0, 0, 0);

    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    const oneDayDiff = endDay.getTime() - startDay.getTime() === 24 * 60 * 60 * 1000;
    const sameDay = startDay.getTime() === endDay.getTime();

    if (sameDay || (oneDayDiff && end.getHours() === 0 && end.getMinutes() === 0)) {
      return `${formatDateTimeWithDay(start)} 〜 ${formatEndTime()}`;
    } else {
      // 異なる日の場合は両方の日付を表示
      return `${formatDateTimeWithDay(start)} 〜 ${formatDateTimeWithDay(end)}`;
    }
  };

  return (
    <div className="card bg-base-100 p-6 shadow-lg">
      <h3 className="mb-4 text-lg font-semibold">カレンダーに追加</h3>

      <p className="mb-4">
        {eventDates.length === 1 ? (
          '確定された日程をカレンダーに追加できます。'
        ) : (
          <>
            <strong>{eventDates.length}件</strong>
            の確定された日程をそれぞれカレンダーに追加できます。
          </>
        )}
      </p>

      <div className="divide-base-300 divide-y">
        {eventDates.map((date) => (
          <div key={date.id} className="py-4 first:pt-0 last:pb-0">
            <div className="mb-3 font-medium">
              {formatTimeRange(date.start_time, date.end_time)}
              {date.label && <span className="ml-2 text-sm text-gray-500">({date.label})</span>}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {/* Google Calendar ボタン */}
              <a
                href={generateGoogleCalendarLink(date.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setLoading(date.id, 'google', true);
                  setTimeout(() => setLoading(date.id, 'google', false), 3000);
                }}
              >
                {isGoogleLoading(date.id) ? (
                  <>
                    <span className="loading loading-spinner loading-xs mr-2"></span>
                    読み込み中...
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="mr-2 h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M19,4H18V2H16V4H8V2H6V4H5A2,2,0,0,0,3,6V20a2,2,0,0,0,2,2H19a2,2,0,0,0,2-2V6A2,2,0,0,0,19,4Zm0,16H5V10H19ZM19,8H5V6H19ZM7,12h4v4H7Z" />
                    </svg>
                    Googleカレンダー
                  </>
                )}
              </a>

              {/* iCalendar ダウンロードボタン */}
              <a
                href={generateIcsDownloadLink(date.id)}
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setLoading(date.id, 'ics', true);
                  setTimeout(() => setLoading(date.id, 'ics', false), 3000);
                }}
              >
                {isIcsLoading(date.id) ? (
                  <>
                    <span className="loading loading-spinner loading-xs mr-2"></span>
                    ダウンロード中...
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="mr-2 h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12,16a1,1,0,0,1-1-1V4a1,1,0,0,1,2,0V15A1,1,0,0,1,12,16Z" />
                      <path d="M19,20H5a1,1,0,0,1,0-2H19a1,1,0,0,1,0,2Z" />
                    </svg>
                    カレンダーに追加
                  </>
                )}
              </a>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-500">
        ※ カレンダーに追加すると、イベント日時を自動設定します。
      </p>
    </div>
  );
}
