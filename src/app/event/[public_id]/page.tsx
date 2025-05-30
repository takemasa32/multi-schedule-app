import { getEvent } from "@/lib/actions";
import { getEventDates } from "@/lib/actions";
import { getParticipants } from "@/lib/actions";
import { getAvailabilities } from "@/lib/actions";
import { getFinalizedDateIds } from "@/lib/actions";
import { notFound } from "next/navigation";
import { EventHeader } from "@/components/event-header";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import SectionDivider from "@/components/layout/SectionDivider";
import siteConfig from "@/lib/site-config";
import { Metadata, Viewport } from "next";
import { FavoriteEventsProvider } from "@/components/favorite-events-context";
import { Suspense } from "react";
import EventFormSection from "@/components/event-client/event-form-section";
import EventDetailsSection from "@/components/event-client/event-details-section";
import type { EventDate } from "@/components/event-client/event-details-section";

interface EventPageProps {
  params: Promise<{
    public_id: string;
  }>;
  searchParams: Promise<{
    admin?: string;
  }>;
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// 動的メタデータ生成関数
export async function generateMetadata({
  params,
}: {
  params: Promise<{ public_id: string }>;
}): Promise<Metadata> {
  const { public_id } = await params;
  const event = await getEvent(public_id);
  if (!event) {
    // イベントが見つからない場合のメタデータ
    return {
      title: `イベントが見つかりません | ${siteConfig.name.full}`,
      description: `お探しのイベントは存在しないか、削除された可能性があります。`,
    };
  }

  // イベントのタイトルを取得
  const eventTitle = event.title;
  const isFinalized = event.is_finalized;

  // 確定済みかどうかでタイトルと説明を変える
  const title = isFinalized
    ? `${eventTitle} (日程確定済み) | ${siteConfig.name.full}`
    : `${eventTitle} | ${siteConfig.name.full}`;

  const description = isFinalized
    ? `${eventTitle}の日程が確定しました。詳細を確認して予定に追加しましょう。`
    : `${eventTitle}の日程調整ページです。あなたの参加可能な日程を選択して回答してください。`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteConfig.url}/event/${public_id}`,
      images: [
        {
          url: `/api/og?type=event&title=${encodeURIComponent(eventTitle)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function EventPage({
  params,
  searchParams,
}: EventPageProps) {
  const { public_id } = await params;
  const { admin: adminToken } = await searchParams;

  const event = await getEvent(public_id);
  if (!event) {
    console.error("Event not found");
    notFound();
  }
  const isAdmin = Boolean(adminToken && adminToken === event.admin_token);

  // eventDatesのみ先に取得
  const eventDates = await getEventDates(event.id);
  // 参加者一覧も取得
  const participants = await getParticipants(event.id);

  return (
    <FavoriteEventsProvider>
      <div className="bg-base-200 mb-6 py-4">
        <div className="container mx-auto max-w-5xl px-4">
          <Breadcrumbs items={[{ label: "イベント詳細" }]} />
        </div>
      </div>
      <div className="container mx-auto max-w-5xl px-4 pb-12">
        <div className="fade-in">
          <EventHeader
            eventId={public_id}
            title={event.title}
            description={event.description}
            isFinalized={event.is_finalized}
            isAdmin={isAdmin}
          />
          <SectionDivider title="イベント情報" />
          {/* フォーム・日程追加など主要UIは即時描画 */}
          <EventFormSection
            event={event}
            eventDates={eventDates || []}
            participants={participants || []}
          />

          {/* 参加者・確定・履歴など重い部分はサスペンス＋スケルトンで遅延描画 */}
          <Suspense
            fallback={
              <div className="my-8">
                <div className="flex flex-col gap-4">
                  <div className="skeleton h-8 w-1/2" />
                  <div className="skeleton h-6 w-full" />
                  <div className="skeleton h-6 w-5/6" />
                  <div className="skeleton h-6 w-2/3" />
                </div>
              </div>
            }
          >
            {/* サーバー側で必要なデータを取得して渡す */}
            <EventDetailsSectionLoader
              event={{
                id: event.id,
                title: event.title,
                public_token: event.public_token,
                is_finalized: event.is_finalized,
                final_date_id: event.final_date_id,
              }}
              eventDates={eventDates || []}
            />
          </Suspense>
        </div>
      </div>
    </FavoriteEventsProvider>
  );
}

// EventDetailsSection用のラッパー（サーバー側でデータ取得）
type EventDetailsSectionEvent = {
  id: string;
  title: string;
  public_token: string;
  is_finalized: boolean;
  final_date_id?: string | null;
};

async function EventDetailsSectionLoader({
  event,
  eventDates,
}: {
  event: EventDetailsSectionEvent;
  eventDates: EventDate[];
}) {
  const [participants, availabilities, finalizedDateIds] = await Promise.all([
    getParticipants(event.id),
    getAvailabilities(event.id),
    event.is_finalized
      ? getFinalizedDateIds(event.id, event.final_date_id ?? null)
      : Promise.resolve([]),
  ]);
  return (
    <EventDetailsSection
      event={event}
      eventDates={eventDates}
      participants={participants || []}
      availabilities={availabilities || []}
      finalizedDateIds={finalizedDateIds}
    />
  );
}
