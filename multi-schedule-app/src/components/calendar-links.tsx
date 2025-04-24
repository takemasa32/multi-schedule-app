'use client';

import { formatGoogleCalendarDate, formatIcsDate } from '@/lib/utils';

interface Event {
  id: string;
  title: string;
  description: string | null;
}

interface EventDate {
  id: string;
  date_time: string;
}

interface CalendarLinksProps {
  event: Event;
  finalDate: EventDate | null;
}

export function CalendarLinks({ event, finalDate }: CalendarLinksProps) {
  if (!finalDate) return null;
  
  // 日程の開始時間と終了時間を設定
  const startDate = new Date(finalDate.date_time);
  const endDate = new Date(startDate);
  endDate.setHours(startDate.getHours() + 1); // デフォルトで1時間の予定として設定
  
  // Google カレンダーリンクの生成
  const generateGoogleCalendarLink = () => {
    const params = new URLSearchParams();
    params.append('text', event.title);
    params.append('dates', `${formatGoogleCalendarDate(startDate)}/${formatGoogleCalendarDate(endDate)}`);
    
    if (event.description) {
      params.append('details', event.description);
    }
    
    return `https://calendar.google.com/calendar/r/eventedit?${params.toString()}`;
  };
  
  // .ics ファイルのダウンロードリンク
  const generateIcsDownloadLink = () => {
    return `/api/calendar/${event.id}`;
  };
  
  return (
    <div className="card bg-base-100 shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">カレンダーに追加</h3>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <a 
          href={generateGoogleCalendarLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            className="w-5 h-5 mr-2"
          >
            <path d="M19,4H17V3a1,1,0,0,0-2,0V4H9V3A1,1,0,0,0,7,3V4H5A3,3,0,0,0,2,7V19a3,3,0,0,0,3,3H19a3,3,0,0,0,3-3V7A3,3,0,0,0,19,4Zm1,15a1,1,0,0,1-1,1H5a1,1,0,0,1-1-1V10H20Zm0-11H4V7A1,1,0,0,1,5,6H7V7A1,1,0,0,0,9,7V6h6V7a1,1,0,0,0,2,0V6h2a1,1,0,0,1,1,1Z" />
          </svg>
          Google カレンダーで開く
        </a>
        
        <a 
          href={generateIcsDownloadLink()}
          className="btn btn-outline"
          download={`${event.title}.ics`}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            className="w-5 h-5 mr-2"
          >
            <path d="M12,16a1,1,0,0,1-.71-.29l-5-5A1,1,0,0,1,7.71,9.29L12,13.59l4.29-4.3a1,1,0,0,1,1.42,1.42l-5,5A1,1,0,0,1,12,16Z" />
            <path d="M12,16a1,1,0,0,1-1-1V4a1,1,0,0,1,2,0V15A1,1,0,0,1,12,16Z" />
            <path d="M19,20H5a1,1,0,0,1,0-2H19a1,1,0,0,1,0,2Z" />
          </svg>
          iCalendar (.ics) をダウンロード
        </a>
      </div>
      
      <p className="text-xs text-gray-500 mt-4">
        ※ カレンダーに追加すると、イベント日時を自動設定します。
      </p>
    </div>
  );
}