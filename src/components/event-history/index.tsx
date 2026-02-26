'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { EventHistoryItem, getEventHistory, clearEventHistory, setEventHistory } from '@/lib/utils';
import { FavoriteEventsProvider, useFavoriteEvents } from '@/components/favorite-events-context';
import { signIn, useSession } from 'next-auth/react';
import { clearServerEventHistory, syncEventHistory } from '@/lib/event-history-actions';
import { unlinkMyParticipantAnswerByEventPublicToken } from '@/lib/actions';

interface EventHistoryProps {
  maxDisplay?: number;
  showClearButton?: boolean;
  title?: string;
  withProvider?: boolean;
  enableAnswerLinkEdit?: boolean;
}

export default function EventHistory({
  maxDisplay = 5,
  showClearButton = true,
  title = 'イベント閲覧履歴',
  withProvider = true,
  enableAnswerLinkEdit = false,
}: EventHistoryProps) {
  if (!withProvider) {
    return (
      <EventHistoryInner
        maxDisplay={maxDisplay}
        showClearButton={showClearButton}
        title={title}
        enableAnswerLinkEdit={enableAnswerLinkEdit}
      />
    );
  }

  return (
    <FavoriteEventsProvider>
      <EventHistoryInner
        maxDisplay={maxDisplay}
        showClearButton={showClearButton}
        title={title}
        enableAnswerLinkEdit={enableAnswerLinkEdit}
      />
    </FavoriteEventsProvider>
  );
}

function EventHistoryInner({
  maxDisplay = 5,
  showClearButton = true,
  title = '過去のイベント',
  enableAnswerLinkEdit = false,
}: EventHistoryProps) {
  const [history, setHistory] = useState<EventHistoryItem[]>([]);
  const { favorites, addFavorite, removeFavorite } = useFavoriteEvents();
  const { status } = useSession();
  const [isEditMode, setIsEditMode] = useState(false);
  const [unlinkingEventId, setUnlinkingEventId] = useState<string | null>(null);
  const [messageMap, setMessageMap] = useState<Record<string, string>>({});

  useEffect(() => {
    // ストレージの変更を監視する
    const handleStorageChange = () => {
      setHistory(getEventHistory());
    };

    setHistory(getEventHistory());
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      setHistory(getEventHistory());
      return;
    }
    if (status !== 'authenticated') return;

    const syncHistory = async () => {
      const localHistory = getEventHistory();
      const synced = await syncEventHistory(localHistory);
      // サーバー同期の結果が空でもローカル履歴を保持し、チラツキを防ぐ
      const nextHistory = synced.length === 0 && localHistory.length > 0 ? localHistory : synced;
      if (nextHistory.length > 0) {
        setEventHistory(nextHistory);
      }
      setHistory(nextHistory);
      window.dispatchEvent(new CustomEvent('event-history-synced'));
    };

    void syncHistory();
  }, [status]);

  // 履歴が空の場合は何も表示しない
  if (history.length === 0) return null;

  // 表示する履歴を制限
  const displayHistory = history.slice(0, maxDisplay);

  const handleClearHistory = () => {
    if (!confirm('すべての履歴を削除してもよろしいですか？')) return;
    clearEventHistory();
    if (status === 'authenticated') {
      void clearServerEventHistory();
    }
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

  // アカウントに紐づいた回答が1件でもある場合のみ編集導線を表示する。
  const hasLinkedAnswers = history.some((event) => event.answeredByMe);

  return (
    <div className="mb-4 mt-8">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-medium">{title}</h3>
        <div className="flex items-center gap-2">
          {enableAnswerLinkEdit && hasLinkedAnswers && (
            <button
              type="button"
              className="btn btn-xs btn-outline"
              onClick={() => setIsEditMode((prev) => !prev)}
              data-testid="event-history-answer-edit-toggle"
            >
              {isEditMode ? '編集を終了' : '回答紐づきを編集'}
            </button>
          )}
          {showClearButton && history.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="text-sm text-base-content/60 hover:text-base-content/80"
            >
              履歴をクリア
            </button>
          )}
        </div>
      </div>

      {status !== 'authenticated' && (
        <div className="mb-2 text-xs text-base-content/60">
          <span>ログインすると履歴を同期できます。</span>
          <button
            onClick={() => void signIn('google')}
            className="text-primary ml-2 underline underline-offset-2"
          >
            ログイン
          </button>
        </div>
      )}

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
                  <p className="mt-1 text-xs text-base-content/60">
                    {formatTimestamp(event.createdAt)}
                    {event.isCreatedByMe && (
                      <span className="bg-primary/20 text-primary ml-2 inline-flex items-center rounded px-2 py-0.5 text-xs font-medium">
                        主催
                      </span>
                    )}
                    {event.answeredByMe && (
                      <span className="bg-success/20 text-success ml-2 inline-flex items-center rounded px-2 py-0.5 text-xs font-medium">
                        回答済み
                      </span>
                    )}
                  </p>
                  {messageMap[event.id] && (
                    <p className="mt-1 text-xs text-base-content/60">{messageMap[event.id]}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {enableAnswerLinkEdit && isEditMode && event.answeredByMe && (
                    <button
                      type="button"
                      className="btn btn-xs btn-warning"
                      data-testid={`event-history-unlink-${event.id}`}
                      disabled={unlinkingEventId === event.id}
                      onClick={async () => {
                        const confirmed =
                          window.confirm('このイベントの回答紐づきを解除しますか？');
                        if (!confirmed) return;
                        setUnlinkingEventId(event.id);
                        const result = await unlinkMyParticipantAnswerByEventPublicToken(event.id);
                        setUnlinkingEventId(null);
                        setMessageMap((prev) => ({ ...prev, [event.id]: result.message }));
                        if (!result.success) return;

                        // 紐づけ解除後はローカル履歴上の回答済み状態も即時更新する。
                        const nextHistory = history.map((item) =>
                          item.id === event.id
                            ? {
                                ...item,
                                answeredByMe: false,
                                myParticipantName: null,
                              }
                            : item,
                        );
                        setHistory(nextHistory);
                        setEventHistory(nextHistory);
                      }}
                    >
                      {unlinkingEventId === event.id ? '解除中...' : '紐づきを解除'}
                    </button>
                  )}

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
                </div>
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
