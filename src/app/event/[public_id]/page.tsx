import { getEvent } from "@/lib/actions";
import { getEventDates } from "@/lib/actions";
import { getParticipants } from "@/lib/actions";
import { getAvailabilities } from "@/lib/actions";
import { getFinalizedDateIds } from "@/lib/actions";
import { notFound } from "next/navigation";
import EventClientWrapper from "@/components/event-client/event-client-wrapper";
import { EventHeader } from "@/components/event-header";

// Next.js 15.3.1でのParams型定義の変更に対応
interface EventPageProps {
  params: Promise<{
    public_id: string;
  }>;
  searchParams: Promise<{
    admin?: string;
  }>;
}

export default async function EventPage({
  params,
  searchParams,
}: EventPageProps) {
  // Next.js 15.3.1に対応するため、paramsとsearchParamsを非同期で取得
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const { public_id } = resolvedParams;
  const adminToken = resolvedSearchParams.admin || null;

  // イベント情報を取得
  const event = await getEvent(public_id);

  if (!event) {
    console.error("Event not found");
    notFound();
  }

  // 有効な管理者かチェック（必ずboolean型に変換）
  const isAdmin = Boolean(adminToken && adminToken === event.admin_token);

  // 参加者を取得（ページネーション対応）
  const participants = await getParticipants(event.id);

  // イベント日程の時間帯を取得（ページネーション対応）
  const eventDates = await getEventDates(event.id);

  // 全回答データを取得（ページネーション対応）
  const availabilities = await getAvailabilities(event.id);

  // 確定した日程IDのリストを取得（新しい確定日程テーブルから）
  let finalizedDateIds: string[] = [];
  if (event.is_finalized) {
    finalizedDateIds = await getFinalizedDateIds(event.id, event.final_date_id);
  }

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <EventHeader
        title={event.title}
        description={event.description}
        isFinalized={event.is_finalized}
      />

      {/* クライアントラッパーに全ての必要なデータを渡す */}
      <EventClientWrapper
        event={event}
        eventDates={eventDates || []}
        participants={participants || []}
        availabilities={availabilities || []}
        finalizedDateIds={finalizedDateIds}
        isAdmin={isAdmin}
      />
    </main>
  );
}
