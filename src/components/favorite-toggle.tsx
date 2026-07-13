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
import { Star } from 'lucide-react';
import { useFavoriteEvents } from '@/components/favorite-events-context';

interface Props {
  eventId: string;
  title: string;
}

export default function FavoriteToggle({ eventId, title }: Props) {
  const { favorites, addFavorite, removeFavorite } = useFavoriteEvents();
  const isFavorite = favorites.some((event) => event.id === eventId);

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
      className={`btn btn-icon border-base-300 ${
        isFavorite
          ? 'border-warning/60 bg-warning/15 text-warning hover:bg-warning/20'
          : 'bg-base-100 text-base-content/65 hover:border-warning/50 hover:bg-warning/10 hover:text-warning'
      }`}
      onClick={handleToggle}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? 'お気に入り解除' : 'お気に入り登録'}
      type="button"
    >
      <Star
        aria-hidden="true"
        className="size-5"
        fill={isFavorite ? 'currentColor' : 'none'}
        strokeWidth={2.25}
      />
    </button>
  );
}
