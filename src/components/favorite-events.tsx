'use client';
/**
 * お気に入りイベント一覧を表示するコンポーネント
 *
 * @module FavoriteEvents
 * @returns {JSX.Element} お気に入りイベント一覧のリスト
 * @remarks
 * - グローバル状態（FavoriteEventsProvider）からお気に入りイベントを取得し、一覧表示します。
 * - イベントID・タイトル・最終アクセス日時を表示します。
 * - お気に入りが1件もない場合は案内メッセージを表示します。
 */
import Link from 'next/link';
import { Star } from 'lucide-react';
import { useFavoriteEvents } from '@/components/favorite-events-context';

export default function FavoriteEvents() {
  const { favorites, isHydrated, removeFavorite } = useFavoriteEvents();

  if (!isHydrated) {
    return (
      <div className="border-base-300 bg-base-100 text-base-content/60 rounded-xl border p-4 text-sm">
        お気に入りイベントを読み込んでいます...
      </div>
    );
  }

  if (!favorites.length) {
    return (
      <div className="border-base-300 bg-base-100 rounded-xl border border-dashed p-4">
        <p className="font-semibold">お気に入りはまだありません</p>
        <p className="text-base-content/70 mt-1 text-sm leading-relaxed">
          よく開くイベントを登録しておくと、ここからすぐにアクセスできます。
        </p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-3">
      {favorites.map((ev) => (
        <li key={ev.id} className="card bg-base-100 flex flex-col p-3 shadow-sm">
          <div className="flex-1">
            <Link
              href={`/event/${ev.id}`}
              className="text-primary block truncate text-base font-semibold hover:underline"
            >
              {ev.title || ev.id}
            </Link>
            {ev.lastAccessed && (
              <span className="text-base-content/50 mt-1 block text-xs">
                最終アクセス: {new Date(ev.lastAccessed).toLocaleDateString()}
              </span>
            )}
          </div>
          <button
            type="button"
            className="btn btn-xs btn-ghost text-base-content/60 hover:text-error mt-2 self-end"
            title="お気に入りから削除"
            aria-label={`${ev.title || ev.id}をお気に入りから削除`}
            onClick={() => removeFavorite(ev.id)}
          >
            <Star aria-hidden="true" className="size-4" fill="currentColor" strokeWidth={2.25} />
            解除
          </button>
        </li>
      ))}
    </ul>
  );
}
