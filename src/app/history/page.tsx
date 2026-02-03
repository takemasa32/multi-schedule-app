'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  EventHistoryItem,
  getEventHistory,
  clearEventHistory,
  removeEventFromHistory,
  setEventHistory,
} from '@/lib/utils';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import FavoriteEvents from '@/components/favorite-events';
import { FavoriteEventsProvider } from '@/components/favorite-events-context';
import { signIn, useSession } from 'next-auth/react';
import {
  clearServerEventHistory,
  removeEventHistoryItem,
  syncEventHistory,
} from '@/lib/event-history-actions';
import EventOpenForm from '@/components/event-open-form';

export default function HistoryPage() {
  const [history, setHistory] = useState<EventHistoryItem[]>(() => getEventHistory());
  const { status } = useSession();

  useEffect(() => {
    // ストレージの変更を監視
    const handleStorageChange = () => {
      setHistory(getEventHistory());
    };

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
      // 同期結果が空でもローカル履歴を保持し、表示のチラツキを防ぐ
      const nextHistory = synced.length === 0 && localHistory.length > 0 ? localHistory : synced;
      if (nextHistory.length > 0) {
        setEventHistory(nextHistory);
      }
      setHistory(nextHistory);
    };

    void syncHistory();
  }, [status]);

  const handleClearHistory = () => {
    if (confirm('すべての履歴を削除してもよろしいですか？')) {
      clearEventHistory();
      if (status === 'authenticated') {
        void clearServerEventHistory();
      }
      setHistory([]);
    }
  };

  const handleRemoveItem = (eventId: string) => {
    removeEventFromHistory(eventId);
    if (status === 'authenticated') {
      void removeEventHistoryItem(eventId);
    }
    setHistory(getEventHistory());
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <FavoriteEventsProvider>
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs
          items={[
            { label: '閲覧履歴', href: '/history' },
          ]}
        />

        <h1 className="mb-6 text-2xl font-bold">イベント閲覧履歴</h1>
        {status !== 'authenticated' && (
          <div className="alert alert-info mb-6">
            <div>
              <p className="text-sm">ログインすると履歴がデバイス間で同期されます。</p>
            </div>
            <button onClick={() => void signIn('google')} className="btn btn-sm btn-outline">
              Googleでログイン
            </button>
          </div>
        )}

        <EventOpenForm />

        <section className="mb-8">
          <h2 className="mb-2 text-lg font-semibold">お気に入りイベント</h2>
          <FavoriteEvents />
        </section>

        {history.length === 0 ? (
          <div className="bg-base-200 rounded-lg py-10 text-center">
            <p>閲覧履歴はありません</p>
            <Link href="/" className="btn btn-primary mt-4">
              ホームに戻る
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">{history.length}件のイベント履歴があります</p>
              <button onClick={handleClearHistory} className="btn btn-outline btn-sm">
                すべての履歴を削除
              </button>
            </div>

            <div className="bg-base-200 overflow-hidden rounded-lg">
              <ul className="divide-base-300 divide-y">
                {history.map((event) => (
                  <li key={event.id} className="hover:bg-base-300 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link
                          href={`/event/${event.id}`}
                          className="text-primary text-lg font-medium hover:underline"
                        >
                          {event.title}
                        </Link>
                        <p className="mt-1 text-sm text-gray-500">{formatDate(event.createdAt)}</p>
                      </div>

                      <div className="flex items-center space-x-2">
                        {event.isCreatedByMe && <span className="badge badge-primary">主催</span>}
                        <button
                          onClick={() => handleRemoveItem(event.id)}
                          className="btn btn-ghost btn-xs"
                          title="履歴から削除"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 text-center">
              <Link href="/" className="btn btn-primary">
                ホームに戻る
              </Link>
            </div>
          </>
        )}
      </div>
    </FavoriteEventsProvider>
  );
}
