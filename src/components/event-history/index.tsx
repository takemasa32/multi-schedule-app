'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { EventHistoryItem, getEventHistory, clearEventHistory } from '@/lib/utils';

interface EventHistoryProps {
  maxDisplay?: number;
  showClearButton?: boolean;
  title?: string;
}

export default function EventHistory({
  maxDisplay = 5,
  showClearButton = true,
  title = '過去のイベント'
}: EventHistoryProps) {
  const [history, setHistory] = useState<EventHistoryItem[]>([]);
  
  useEffect(() => {
    // クライアント側でのみ実行
    setHistory(getEventHistory());
    
    // ストレージの変更を監視する
    const handleStorageChange = () => {
      setHistory(getEventHistory());
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // 履歴が空の場合は何も表示しない
  if (history.length === 0) return null;
  
  // 表示する履歴を制限
  const displayHistory = history.slice(0, maxDisplay);
  
  const handleClearHistory = () => {
    clearEventHistory();
    setHistory([]);
  };
  
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return '今日';
    } else if (diffDays === 1) {
      return '昨日';
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}/${day}`;
    }
  };
  
  return (
    <div className="mt-8 mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium">{title}</h3>
        {showClearButton && history.length > 0 && (
          <button 
            onClick={handleClearHistory}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            履歴をクリア
          </button>
        )}
      </div>
      
      <div className="bg-base-200 rounded-lg p-3">
        <ul className="divide-y divide-base-300">
          {displayHistory.map((event) => (
            <li key={event.id} className="py-2 flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <Link
                  href={event.isCreatedByMe && event.adminToken 
                    ? `/event/${event.id}?admin=${event.adminToken}` 
                    : `/event/${event.id}`}
                  className="block truncate text-primary hover:underline"
                >
                  {event.title}
                </Link>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatTimestamp(event.createdAt)}
                  {event.isCreatedByMe && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary">
                      主催
                    </span>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
        
        {history.length > maxDisplay && (
          <div className="mt-2 text-center">
            <Link href="/history" className="text-sm text-primary hover:underline">
              すべての履歴を表示
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}