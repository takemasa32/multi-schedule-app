/**
 * お気に入り登録/解除ボタンコンポーネント
 *
 * @module FavoriteToggle
 * @param {Object} props - コンポーネントのprops
 * @param {string} props.eventId - イベントID
 * @param {string} props.title - イベントタイトル
 * @returns {JSX.Element} お気に入り登録/解除ボタン
 * @remarks
 * - グローバル状態（FavoriteEventsProvider）を利用し、お気に入りの追加・削除を行います。
 * - ボタン押下でお気に入り状態をトグルし、UIに即時反映されます。
 */
import { useEffect, useState } from 'react';
import { useFavoriteEvents } from '@/components/favorite-events-context';

interface Props {
  eventId: string;
  title: string;
}

export default function FavoriteToggle({ eventId, title }: Props) {
  const { favorites, addFavorite, removeFavorite } = useFavoriteEvents();
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    setIsFavorite(favorites.some((ev) => ev.id === eventId));
  }, [favorites, eventId]);

  const handleToggle = () => {
    if (isFavorite) {
      removeFavorite(eventId);
    } else {
      addFavorite({
        id: eventId,
        title,
        lastAccessed: new Date().toISOString(),
      });
    }
  };

  return (
    <button
      className={`btn btn-sm ${isFavorite ? 'btn-warning' : 'btn-outline'}`}
      onClick={handleToggle}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? 'お気に入り解除' : 'お気に入り登録'}
      type="button"
    >
      {isFavorite ? '★ お気に入り解除' : '☆ お気に入り登録'}
    </button>
  );
}
