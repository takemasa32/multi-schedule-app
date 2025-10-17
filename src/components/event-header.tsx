"use client";

import Card from "@/components/layout/Card";
import ShareEventButton from "@/components/share-event-button";
import FavoriteToggle from "@/components/favorite-toggle";

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
    if (typeof window === "undefined") return "";
    const { protocol, host } = window.location;
    return `${protocol}//${host}/event/${eventId}`;
  };

  return (
    <Card className="mb-8" isHighlighted={isFinalized}>
      <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold">
              {isFinalized && <span className="text-success mr-2">✓</span>}
              {title}
            </h1>
            <FavoriteToggle eventId={eventId} title={title} />
          </div>
          {isFinalized && (
            <div className="badge badge-success text-white mb-3">
              日程確定済み
            </div>
          )}
          {description && (
            <p className="text-base-content/70 whitespace-pre-wrap">
              {description}
            </p>
          )}
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
