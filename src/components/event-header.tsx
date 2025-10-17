'use client';

import Card from '@/components/layout/Card';
import ShareEventButton from '@/components/share-event-button';
import FavoriteToggle from '@/components/favorite-toggle';

interface EventHeaderProps {
  eventId: string;
  title: string;
  description?: string | null;
  isFinalized: boolean;
  isAdmin: boolean;
}

export function EventHeader({
  eventId,
  title,
  description,
  isFinalized,
  isAdmin,
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

      {!isFinalized && isAdmin && (
        <div className="alert bg-info/10 text-info border-info border-l-4 text-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mr-2 h-6 w-6 shrink-0 stroke-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>現在管理者として閲覧中です。</span>
        </div>
      )}
    </Card>
  );
}
