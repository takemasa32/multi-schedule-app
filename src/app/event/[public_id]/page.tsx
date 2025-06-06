import { getEvent } from "@/lib/actions";
import { getEventDates } from "@/lib/actions";
import { getParticipants } from "@/lib/actions";
import { getAvailabilities } from "@/lib/actions";
import { getFinalizedDateIds } from "@/lib/actions";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import SectionDivider from "@/components/layout/SectionDivider";
import siteConfig from "@/lib/site-config";
import { Metadata, Viewport } from "next";
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

  const eventDatesPromise = getEventDates(event.id);
  const participantsPromise = getParticipants(event.id);

  return (
    <>
      <div className="bg-base-200 mb-6 py-4">
        <div className="container mx-auto max-w-5xl px-4">
          <Breadcrumbs items={[{ label: "イベント詳細" }]} />
        </div>
      </div>
      <div className="fade-in pb-12">
        {isAdmin && !event.is_finalized && (
          <div className="alert bg-info/10 text-info border-l-4 border-info text-sm mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6 mr-2"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>現在管理者として閲覧中です。</span>
          </div>
        )}
          <SectionDivider title="イベント情報" />
          {/* フォーム・日程追加など主要UIもストリーミング表示 */}
        <Suspense
          fallback={
            <div className="my-8">
              <div className="flex flex-col gap-4">
                <div className="skeleton h-8 w-1/2" />
                <div className="skeleton h-6 w-full" />
                <div className="skeleton h-12 w-3/4" />
              </div>
            </div>
          }
        >
            <EventFormSectionLoader
              event={event}
              eventDates={eventDatesPromise}
              participants={participantsPromise}
            />
          </Suspense>

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
          <EventDetailsSectionLoader
            event={{
              id: event.id,
              title: event.title,
              public_token: event.public_token,
              is_finalized: event.is_finalized,
              final_date_id: event.final_date_id,
            }}
            eventDates={eventDatesPromise}
            participants={participantsPromise}
          />
        </Suspense>
      </div>
    </>
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

async function EventFormSectionLoader({
  event,
  eventDates,
  participants,
}: {
  event: {
    id: string;
    title: string;
    description: string | null;
    public_token: string;
    is_finalized: boolean;
    final_date_id?: string | null;
  };
  eventDates: Promise<EventDate[]>;
  participants: Promise<{ id: string; name: string }[]>;
}) {
  const [dates, participantList] = await Promise.all([eventDates, participants]);
  return (
    <EventFormSection
      event={event}
      eventDates={dates}
      participants={participantList}
    />
  );
}

async function EventDetailsSectionLoader({
  event,
  eventDates,
  participants,
}: {
  event: EventDetailsSectionEvent;
  eventDates: Promise<EventDate[]>;
  participants: Promise<{ id: string; name: string }[]>;
}) {
  const [dates, participantList, availabilities, finalizedDateIds] =
    await Promise.all([
      eventDates,
      participants,
      getAvailabilities(event.id),
      event.is_finalized
        ? getFinalizedDateIds(event.id, event.final_date_id ?? null)
        : Promise.resolve([]),
    ]);
  return (
    <EventDetailsSection
      event={event}
      eventDates={dates}
      participants={participantList || []}
      availabilities={availabilities || []}
      finalizedDateIds={finalizedDateIds}
    />
  );
}
