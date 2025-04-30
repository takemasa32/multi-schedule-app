import { getEvent } from "@/lib/actions";
import { getEventDates } from "@/lib/actions";
import { getParticipantById } from "@/lib/actions";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AvailabilityForm from "@/components/availability-form";
import { EventHeader } from "@/components/event-header";
import siteConfig from "@/lib/site-config";
import { Metadata } from "next";

// 動的メタデータ生成関数
export async function generateMetadata({
  params,
}: {
  params: { public_id: string };
}): Promise<Metadata> {
  // イベント情報を取得
  const { public_id } = params;
  const event = await getEvent(public_id);

  if (!event) {
    return {
      title: `イベントが見つかりません | ${siteConfig.name.full}`,
      description: `お探しのイベントは存在しないか、削除された可能性があります。`,
    };
  }

  // イベントのタイトルを取得
  const eventTitle = event.title;

  return {
    title: `回答フォーム | ${siteConfig.name.full}`,
    description: `「${eventTitle}」の日程調整に回答するフォームです。あなたの参加可能な日程を選択してください。`,
    robots: {
      index: false,
      follow: true,
    },
    openGraph: {
      title: `回答フォーム | ${siteConfig.name.full}`,
      description: `「${eventTitle}」の日程調整に回答するフォームです。あなたの参加可能な日程を選択してください。`,
      url: `${siteConfig.url}/event/${public_id}/input`,
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function EventInput({
  params,
  searchParams,
}: {
  params: Promise<{ public_id: string }>;
  searchParams: Promise<{ participant_id?: string }>;
}) {
  // paramsとsearchParamsをawaitして取得
  const { public_id } = await params;
  const awaitedSearchParams = await searchParams;
  const participantId = awaitedSearchParams.participant_id;

  // イベント情報を取得
  const event = await getEvent(public_id);
  if (!event) {
    notFound();
  }

  // イベントの日程を取得
  const eventDates = await getEventDates(event.id);

  // 既存の参加者情報と回答を取得（編集モードの場合）
  let existingParticipant = null;
  let existingAvailabilities = null;

  if (participantId) {
    const result = await getParticipantById(participantId, event.id);
    if (result) {
      existingParticipant = result.participant;
      existingAvailabilities = result.availabilityMap;
    }
  }

  const isEditMode = !!participantId && !!existingParticipant;
  const pageTitle = isEditMode ? "回答を編集する" : "新しく回答する";

  return (
    <div className="container mx-auto md:px-4 py-8">
      <EventHeader
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
        <Suspense fallback={<div>フォームを読み込み中...</div>}>
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
