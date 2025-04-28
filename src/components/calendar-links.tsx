"use client";

import { useState } from "react";

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
  // ローディング状態を管理するstate
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isIcsLoading, setIsIcsLoading] = useState(false);

  // Google カレンダーリンクの生成
  const generateGoogleCalendarLink = () => {
    // APIエンドポイントで正確な日時情報を取得するURLを指定
    return `/api/calendar/${eventId}?googleCalendar=true`;
  };

  // .ics ファイルのダウンロードリンク
  const generateIcsDownloadLink = () => {
    // publicTokenを使用してAPIエンドポイントを呼び出す
    return `/api/calendar/ics/${eventId}`;
  };

  // 確定された日程の件数
  const eventCount = eventDates.length;

  return (
    <div className="card bg-base-100 shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">カレンダーに追加</h3>

      {eventCount === 1 ? (
        <p className="mb-4">確定された日程をカレンダーに追加できます。</p>
      ) : (
        <p className="mb-4">
          <strong>{eventCount}件</strong>
          の確定された日程をカレンダーに追加できます。
          {eventCount > 1 && (
            <span className="text-sm text-gray-600 block mt-1">
              ※ 複数の日程は別々のカレンダーイベントとして追加されます
            </span>
          )}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <a
          href={generateGoogleCalendarLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          onClick={() => setIsGoogleLoading(true)}
        >
          {isGoogleLoading ? (
            <>
              <span className="loading loading-spinner loading-sm mr-2"></span>
              読み込み中...
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M19,4H18V2H16V4H8V2H6V4H5A2,2,0,0,0,3,6V20a2,2,0,0,0,2,2H19a2,2,0,0,0,2-2V6A2,2,0,0,0,19,4Zm0,16H5V10H19ZM19,8H5V6H19ZM7,12h4v4H7Z" />
              </svg>
              Google カレンダーに追加
            </>
          )}
        </a>

        <a
          href={generateIcsDownloadLink()}
          className="btn btn-secondary"
          onClick={() => setIsIcsLoading(true)}
        >
          {isIcsLoading ? (
            <>
              <span className="loading loading-spinner loading-sm mr-2"></span>
              ダウンロード中...
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12,16a1,1,0,0,1-1-1V4a1,1,0,0,1,2,0V15A1,1,0,0,1,12,16Z" />
                <path d="M19,20H5a1,1,0,0,1,0-2H19a1,1,0,0,1,0,2Z" />
              </svg>
              iCalendar (.ics) をダウンロード
            </>
          )}
        </a>
      </div>

      <p className="text-xs text-gray-500 mt-4">
        ※ カレンダーに追加すると、イベント日時を自動設定します。
      </p>
    </div>
  );
}
