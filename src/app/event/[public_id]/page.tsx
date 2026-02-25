import { getEvent } from '@/lib/actions';
import { getEventDates } from '@/lib/actions';
import { getParticipants } from '@/lib/actions';
import { getAvailabilities } from '@/lib/actions';
import { getFinalizedDateIds } from '@/lib/actions';
import { getMyLinkedParticipantIdForEvent } from '@/lib/actions';
import { EventNotFoundError } from '@/lib/errors';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import SectionDivider from '@/components/layout/SectionDivider';
import siteConfig from '@/lib/site-config';
import { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import EventFormSection from '@/components/event-client/event-form-section';
import EventDetailsSection from '@/components/event-client/event-details-section';
import type {
  EventDate,
  Participant,
  Availability,
} from '@/components/event-client/event-details-section';
import EventDetailsSectionSkeleton from '@/components/event-client/event-details-section-skeleton';

interface EventPageProps {
  params: Promise<{
    public_id: string;
  }>;
}

export const viewport: Viewport = {
  width: 'device-width',
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
  let event;
  try {
    event = await getEvent(public_id);
  } catch (err) {
    if (err instanceof EventNotFoundError) {
      return {
        title: `イベントが見つかりません | ${siteConfig.name.full}`,
        description: `お探しのイベントは存在しないか、削除された可能性があります。`,
      };
    }
    console.error('メタデータ取得エラー:', err);
    return {
      title: `イベント取得エラー | ${siteConfig.name.full}`,
      description: `イベント情報の取得中に問題が発生しました。時間をおいて再度お試しください。`,
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

export default async function EventPage({ params }: EventPageProps) {
  const { public_id } = await params;

  let event;
  try {
    event = await getEvent(public_id);
  } catch (err) {
    if (err instanceof EventNotFoundError) {
      notFound();
    }
    console.error('イベント取得エラー:', err);
    throw err;
  }
  // 同時に走らせるデータ取得処理をここで起動しておく
  const eventDatesPromise = getEventDates(event.id);
  const participantsPromise = getParticipants(event.id);
  const myParticipantIdPromise = getMyLinkedParticipantIdForEvent(event.id);
  const availabilitiesPromise = getAvailabilities(event.id);
  const finalizedDateIdsPromise = event.is_finalized
    ? getFinalizedDateIds(event.id, event.final_date_id ?? null)
    : Promise.resolve<string[]>([]);

  // フォーム表示に必須となるデータは全て揃ってから描画する
  const [eventDates, participants, finalizedDateIds, myParticipantId] = await Promise.all([
    eventDatesPromise,
    participantsPromise,
    finalizedDateIdsPromise,
    myParticipantIdPromise,
  ]);

  return (
    <>
      <div className="bg-base-200 mb-6 py-4">
        <div className="container mx-auto max-w-5xl px-4">
          <Breadcrumbs items={[{ label: 'イベント詳細' }]} />
        </div>
      </div>
      <div className="fade-in pb-12">
        <SectionDivider title="イベント情報" />
        {/* 確実に揃っている情報は即時表示し、不要なスケルトンを避ける */}
        <div className="my-8">
          <EventFormSection
            event={event}
            eventDates={eventDates}
            participants={participants}
            finalizedDateIds={finalizedDateIds}
            myParticipantId={myParticipantId}
          />
        </div>

        {/* 参加者・確定・履歴など重い部分はサスペンス＋スケルトンで遅延描画 */}
        <Suspense
          fallback={
            <div className="my-8">
              <EventDetailsSectionSkeleton />
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
            eventDates={eventDates}
            participants={participants}
            availabilities={availabilitiesPromise}
            finalizedDateIds={finalizedDateIds}
            myParticipantId={myParticipantId}
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

/**
 * イベント詳細セクションのローダーコンポーネント
 * サーバー側で非同期データ（availabilities）を待機してからEventDetailsSectionコンポーネントをレンダリングする
 *
 * @param {Object} props - コンポーネントのプロパティ
 * @param {EventDetailsSectionEvent} props.event - イベント情報
 * @param {EventDate[]} props.eventDates - イベント候補日時一覧
 * @param {Participant[]} props.participants - 参加者一覧
 * @param {Promise<Availability[]>} props.availabilities - 出欠情報一覧（非同期）
 * @param {string[]} props.finalizedDateIds - 確定済み日時ID一覧
 * @returns {Promise<JSX.Element>} EventDetailsSectionコンポーネント
 */
async function EventDetailsSectionLoader({
  event,
  eventDates,
  participants,
  availabilities,
  finalizedDateIds,
  myParticipantId,
}: {
  event: EventDetailsSectionEvent;
  eventDates: EventDate[];
  participants: Participant[];
  availabilities: Promise<Availability[]>;
  finalizedDateIds: string[];
  myParticipantId: string | null;
}) {
  const availabilityList = await availabilities;
  return (
    <EventDetailsSection
      event={event}
      eventDates={eventDates}
      participants={participants || []}
      availabilities={availabilityList || []}
      finalizedDateIds={finalizedDateIds}
      myParticipantId={myParticipantId}
    />
  );
}
