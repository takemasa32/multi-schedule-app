'use client';
import Link from 'next/link';
import EventHistory from '@/components/event-history';
import AddToHomeScreen from '@/components/add-to-home-screen';
import FavoriteEvents from '@/components/favorite-events';
import { FavoriteEventsProvider } from '@/components/favorite-events-context';
import siteConfig from '@/lib/site-config';
import { useState } from 'react';

export default function PwaHomePage() {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleOpenEvent = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const value = input.trim();
    if (!value) {
      setError('URLまたはIDを入力してください');
      return;
    }
    let id = value;
    try {
      const url = new URL(value);
      const match = url.pathname.match(/\/event\/([\w-]+)/);
      if (match) id = match[1];
    } catch {
      // 入力がURLでなければそのままIDとして扱う
    }
    if (!id.match(/^[\w-]{8,}$/)) {
      setError('有効なイベントIDまたはURLを入力してください');
      return;
    }
    window.location.href = `/event/${id}`;
  };

  return (
    <FavoriteEventsProvider>
      <main className="mx-auto max-w-xl space-y-6 p-4">
        <h1 className="mb-2 text-2xl font-bold">
          {siteConfig.name.full}
          <span className="mt-1 block text-base font-normal text-gray-500">
            {siteConfig.name.tagline}
          </span>
        </h1>
        <AddToHomeScreen />
        <section>
          <Link href="/create" className="btn btn-primary mb-4 w-full">
            新しいイベントを作成する
          </Link>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold">お気に入りイベント</h2>
          <FavoriteEvents />
        </section>
        <section className="mt-2">
          <h2 className="mb-2 text-lg font-semibold">イベントURL/IDから開く</h2>
          <form className="flex gap-2" onSubmit={handleOpenEvent}>
            <input
              type="text"
              className="input input-bordered flex-1"
              placeholder="イベントURLまたはIDを入力"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="イベントURLまたはID"
            />
            <button type="submit" className="btn btn-secondary">
              開く
            </button>
          </form>
          <p className="mt-1 text-xs text-gray-500">
            イベントのURLまたはIDを入力すると、該当イベントページをすぐに開けます。
          </p>
          {error && <p className="text-error mt-1 text-sm">{error}</p>}
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold">最近アクセスしたイベント</h2>
          <EventHistory />
        </section>
      </main>
    </FavoriteEventsProvider>
  );
}
