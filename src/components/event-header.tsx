'use client';

import Card from '@/components/layout/Card';
import ShareEventButton from '@/components/share-event-button';
import FavoriteToggle from '@/components/favorite-toggle';
import siteConfig from '@/lib/site-config';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface EventHeaderProps {
  eventId: string;
  title: string;
  description?: string | null;
  isFinalized: boolean;
}

export function EventHeader({ eventId, title, description, isFinalized }: EventHeaderProps) {
  const pathname = usePathname();
  const isEventDetailPage = pathname === `/event/${eventId}`;

  // イベント公開用URLを生成
  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    const { protocol, host } = window.location;
    return `${protocol}//${host}/event/${eventId}`;
  };

  return (
    <>
      {isEventDetailPage && (
        <div className="mb-2">
          <nav aria-label="戻るナビゲーション">
            <Link
              href="/"
              aria-label="ホームへ戻る"
              className="text-base-content/55 hover:text-base-content/75 -ml-1 inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-[13px] font-normal transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>ホーム</span>
            </Link>
          </nav>
        </div>
      )}
      <Card className="mb-6" isHighlighted={isFinalized}>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div className="flex-1">
            <div className="flex items-start gap-2">
              <h1 className="page-title">{title}</h1>
              <FavoriteToggle eventId={eventId} title={title} />
            </div>
            {isFinalized && (
              <div className="border-success/25 bg-success/8 text-success mt-3 inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm font-medium">
                <span aria-hidden="true">✓</span> 日程確定済み
              </div>
            )}
            {description && (
              <p className="text-base-content/70 whitespace-pre-wrap leading-7">{description}</p>
            )}
          </div>
          <ShareEventButton
            url={getShareUrl()}
            className="self-start"
            title={`${title}｜${siteConfig.share.eventTitleSuffix}`}
            text={`${title}\n${isFinalized ? siteConfig.share.finalizedEventText : siteConfig.share.eventText}`}
          />
        </div>
      </Card>
    </>
  );
}
