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
import Link from "next/link";
import { useFavoriteEvents } from "@/components/favorite-events-context";

export default function FavoriteEvents() {
  const { favorites } = useFavoriteEvents();

  if (!favorites.length) {
    return <p className="text-gray-500 text-sm">お気に入りイベントはありません。</p>;
  }

  return (
    <ul className="space-y-2">
      {favorites.map(ev => (
        <li key={ev.id} className="flex items-center gap-2">
          <Link href={`/event/${ev.id}`} className="link link-primary">
            {ev.title || ev.id}
          </Link>
          {ev.lastAccessed && (
            <span className="text-xs text-gray-400 ml-2">
              ({new Date(ev.lastAccessed).toLocaleDateString()})
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
