'use client';

import Card from '@/components/layout/Card';
import ShareEventButton from '@/components/share-event-button';
import FavoriteToggle from '@/components/favorite-toggle';

interface EventHeaderProps {
  eventId: string;
  title: string;
  description?: string | null;
  isFinalized: boolean;
}

export function EventHeader({
  eventId,
  title,
  description,
  isFinalized,
}: EventHeaderProps) {
  // イベント公開用URLを生成
  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    const { protocol, host } = window.location;
    return `${protocol}//${host}/event/${eventId}`;
  };

  return (
    <Card className="mb-8" isHighlighted={isFinalized}>
      <div className="mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <h1 className="text-3xl font-bold">
              {isFinalized && <span className="text-success mr-2">✓</span>}
              {title}
            </h1>
            <FavoriteToggle eventId={eventId} title={title} />
          </div>
          {isFinalized && <div className="badge badge-success mb-3 text-white">日程確定済み</div>}
          {description && <p className="text-base-content/70 whitespace-pre-wrap">{description}</p>}
        </div>
        <ShareEventButton
          url={getShareUrl()}
          className="self-start"
          title={`${title}|daySynth-日程調整`}
          text={`${title} の予定を入力してください。`}
        />
      </div>
    </Card>
  );
}
