'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { EventHistoryItem, getEventHistory, clearEventHistory } from '@/lib/utils';
import { FavoriteEventsProvider, useFavoriteEvents } from '@/components/favorite-events-context';

interface EventHistoryProps {
  maxDisplay?: number;
  showClearButton?: boolean;
  title?: string;
}

export default function EventHistory({
  maxDisplay = 5,
  showClearButton = true,
  title = 'イベント閲覧履歴',
}: EventHistoryProps) {
  return (
    <FavoriteEventsProvider>
      <EventHistoryInner maxDisplay={maxDisplay} showClearButton={showClearButton} title={title} />
    </FavoriteEventsProvider>
  );
}

function EventHistoryInner({
  maxDisplay = 5,
  showClearButton = true,
  title = '過去のイベント',
}: EventHistoryProps) {
  const [history, setHistory] = useState<EventHistoryItem[]>([]);
  const { favorites, addFavorite, removeFavorite } = useFavoriteEvents();

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
    <div className="mb-4 mt-8">
      <div className="mb-2 flex items-center justify-between">
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
        <ul className="divide-base-300 divide-y">
          {displayHistory.map((event) => {
            const isFavorite = favorites.some((fav) => fav.id === event.id);
            return (
              <li key={event.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/event/${event.id}`}
                    className="text-primary block truncate hover:underline"
                  >
                    {event.title}
                  </Link>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {formatTimestamp(event.createdAt)}
                    {event.isCreatedByMe && (
                      <span className="bg-primary/20 text-primary ml-2 inline-flex items-center rounded px-2 py-0.5 text-xs font-medium">
                        主催
                      </span>
                    )}
                  </p>
                </div>
                <button
                  className={`btn btn-xs ${
                    isFavorite ? 'btn-outline btn-error' : 'btn-outline btn-primary'
                  }`}
                  title={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
                  onClick={() => {
                    if (isFavorite) {
                      removeFavorite(event.id);
                    } else {
                      addFavorite({
                        id: event.id,
                        title: event.title,
                        lastAccessed: event.createdAt,
                      });
                    }
                  }}
                >
                  {isFavorite ? '解除' : '☆追加'}
                </button>
              </li>
            );
          })}
        </ul>

        {history.length > maxDisplay && (
          <div className="mt-2 text-center">
            <Link href="/history" className="text-primary text-sm hover:underline">
              すべての履歴を表示
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
