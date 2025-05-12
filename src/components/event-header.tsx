"use client";

import Card from "@/components/layout/Card";
import ShareEventButton from "@/components/share-event-button";
import FavoriteToggle from "@/components/favorite-toggle";

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
  // 現在のURLから公開用URLのみを取得
  const getShareUrl = () => {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.href);
    url.searchParams.delete("admin");
    return url.toString();
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
        <ShareEventButton url={getShareUrl()} className="self-start" />
      </div>

      {!isFinalized && isAdmin && (
        <div className="alert bg-info/10 text-info border-l-4 border-info text-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6 mr-2"
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
