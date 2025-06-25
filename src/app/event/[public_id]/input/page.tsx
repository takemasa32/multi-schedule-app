// src/app/event/[public_id]/page.tsx
import {
  getEvent,
  getEventDates,
  getParticipantById,
} from "@/lib/actions";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AvailabilityForm from "@/components/availability-form";
import siteConfig from "@/lib/site-config";
import { Metadata } from "next";
import { EventNotFoundError } from "@/lib/errors";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ public_id: string }>;
}): Promise<Metadata> {
  const { public_id } = await params;
  let event;
  try {
    event = await getEvent(public_id, { updateLastAccessed: false });
  } catch (err) {
    if (err instanceof EventNotFoundError) {
      return {
        title: `イベントが見つかりません | ${siteConfig.name.full}`,
        description:
          `お探しのイベントは存在しないか、削除された可能性があります。`,
      };
    }
    console.error('メタデータ取得エラー:', err);
    return {
      title: `イベント取得エラー | ${siteConfig.name.full}`,
      description:
        `イベント情報の取得中に問題が発生しました。時間をおいて再度お試しください。`,
    };
  }
  const eventTitle = event.title;
  return {
    title: `イベント詳細 | ${siteConfig.name.full}`,
    description: `「${eventTitle}」の日程調整ページです。`,
    robots: { index: false, follow: true },
    openGraph: {
      title: `イベント詳細 | ${siteConfig.name.full}`,
      description: `「${eventTitle}」の日程調整ページです。`,
      url: `${siteConfig.url}/event/${public_id}`,
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
    },
  };
}

async function AvailabilityFormSectionLoader({
  eventId,
  publicToken,
  eventDates,
  participantPromise,
}: {
  eventId: string;
  publicToken: string;
  eventDates: Promise<{ id: string; start_time: string; end_time: string }[]>;
  participantPromise: Promise<
    | {
        participant: { id: string; name: string };
        availabilityMap: Record<string, boolean>;
      }
    | null
  >;
}) {
  const [dates, participantResult] = await Promise.all([
    eventDates,
    participantPromise,
  ]);

  const existingParticipant = participantResult?.participant || null;
  const existingAvailabilities = participantResult?.availabilityMap || null;
  const isEditMode = !!existingParticipant;
  const pageTitle = isEditMode ? "回答を編集する" : "新しく回答する";

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">{pageTitle}</h2>
        {isEditMode ? (
          <p className="text-gray-600 mb-4">
            「{existingParticipant?.name}」さんの回答を編集しています。
          </p>
        ) : (
          <p className="text-gray-600 mb-4">
            あなたの名前と参加可能な日程を入力してください。
          </p>
        )}
      </div>

      <div className="bg-base rounded-lg shadow-md md:p-6">
        <AvailabilityForm
          eventId={eventId}
          publicToken={publicToken}
          eventDates={dates}
          initialParticipant={existingParticipant}
          initialAvailabilities={existingAvailabilities || undefined}
          mode={isEditMode ? "edit" : "new"}
        />
      </div>
    </>
  );
}

type EventPageProps = {
  params: Promise<{ public_id: string }>;
  searchParams: Promise<{ participant_id?: string }>;
};

export default async function EventPage({
  params,
  searchParams,
}: EventPageProps) {
  const { public_id } = await params;
  const { participant_id: participantId } = await searchParams;

  let event;
  try {
    event = await getEvent(public_id, { updateLastAccessed: false });
  } catch (err) {
    if (err instanceof EventNotFoundError) {
      notFound();
    }
    console.error('イベント取得エラー:', err);
    throw err;
  }

  const eventDatesPromise = getEventDates(event.id);
  const participantPromise = participantId
    ? getParticipantById(participantId, event.id)
    : Promise.resolve(null);

  return (
    <div className="container mx-auto md:px-4 py-8">

        <Suspense
          fallback={
            <div className="my-8">
              <div className="flex flex-col gap-4">
                <div className="skeleton h-8 w-1/2" />
                <div className="skeleton h-6 w-full" />
                <div className="skeleton h-6 w-5/6" />
              </div>
            </div>
          }
        >
          <AvailabilityFormSectionLoader
            eventId={event.id}
            publicToken={public_id}
            eventDates={eventDatesPromise}
            participantPromise={participantPromise}
          />
        </Suspense>

        <div className="mt-6">
          <a
            href={`/event/${public_id}`}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            回答状況の確認・集計に戻る
          </a>
        </div>
      </div>
  );
}
