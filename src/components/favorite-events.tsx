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
  const { favorites, removeFavorite } = useFavoriteEvents();

  if (!favorites.length) {
    return (
      <p className="text-gray-500 text-sm mt-2">
        お気に入りイベントはありません。
      </p>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
      {favorites.map((ev) => (
        <li
          key={ev.id}
          className="card bg-base-100 shadow-sm flex flex-col p-3"
        >
          <div className="flex-1">
            <Link
              href={`/event/${ev.id}`}
              className="font-semibold text-primary text-base hover:underline truncate block"
            >
              {ev.title || ev.id}
            </Link>
            {ev.lastAccessed && (
              <span className="text-xs text-gray-400 block mt-1">
                最終アクセス: {new Date(ev.lastAccessed).toLocaleDateString()}
              </span>
            )}
          </div>
          <button
            className="btn btn-xs btn-outline btn-error mt-2 self-end"
            title="お気に入りから削除"
            onClick={() => removeFavorite(ev.id)}
          >
            解除
          </button>
        </li>
      ))}
    </ul>
  );
}
