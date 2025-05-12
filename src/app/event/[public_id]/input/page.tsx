// src/app/event/[public_id]/page.tsx
import { getEvent, getEventDates, getParticipantById } from "@/lib/actions";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AvailabilityForm from "@/components/availability-form";
import { EventHeader } from "@/components/event-header";
import siteConfig from "@/lib/site-config";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { public_id: string };
}): Promise<Metadata> {
  const { public_id } = params;
  const event = await getEvent(public_id);
  if (!event) {
    return {
      title: `イベントが見つかりません | ${siteConfig.name.full}`,
      description: `お探しのイベントは存在しないか、削除された可能性があります。`,
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

type EventPageProps = {
  params: { public_id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function EventPage({
  params,
  searchParams,
}: EventPageProps) {
  const { public_id } = params;
  const participantId =
    typeof searchParams.participant_id === "string"
      ? searchParams.participant_id
      : undefined;

  // イベント情報を取得
  const event = await getEvent(public_id);
  if (!event) {
    notFound();
  }

  // 候補日程・既存参加者情報を並列取得
  let eventDates,
    existingParticipant = null,
    existingAvailabilities = null;
  if (participantId) {
    const [dates, result] = await Promise.all([
      getEventDates(event.id),
      getParticipantById(participantId, event.id),
    ]);
    eventDates = dates;
    if (result) {
      existingParticipant = result.participant;
      existingAvailabilities = result.availabilityMap;
    }
  } else {
    eventDates = await getEventDates(event.id);
  }

  const isEditMode = !!participantId && !!existingParticipant;
  const pageTitle = isEditMode ? "回答を編集する" : "新しく回答する";

  return (
    <div className="container mx-auto md:px-4 py-8">
      <EventHeader
        eventId={event.id}
        title={event.title}
        description={event.description}
        isFinalized={event.is_finalized}
        isAdmin={false}
      />

      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">{pageTitle}</h2>
        {isEditMode ? (
          <p className="text-gray-600 mb-4">
            「{existingParticipant.name}」さんの回答を編集しています。
          </p>
        ) : (
          <p className="text-gray-600 mb-4">
            あなたの名前と参加可能な日程を入力してください。
          </p>
        )}
      </div>

      <div className="bg-base rounded-lg shadow-md md:p-6">
        <Suspense fallback={<div>読み込み中...</div>}>
          <AvailabilityForm
            eventId={event.id}
            eventDates={eventDates}
            initialParticipant={existingParticipant}
            initialAvailabilities={existingAvailabilities || undefined}
            mode={isEditMode ? "edit" : "new"}
            publicToken={public_id}
          />
        </Suspense>
      </div>

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
