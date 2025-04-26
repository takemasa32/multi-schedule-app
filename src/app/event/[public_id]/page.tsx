import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { EventHeader } from "@/components/event-header";
import EventClientWrapper from "@/components/event-client/event-client-wrapper";
import { CalendarLinks } from "@/components/calendar-links";

interface EventPageProps {
  params: {
    public_id: string;
  };
  searchParams: {
    admin?: string;
  };
}

export default async function EventPage({
  params,
  searchParams,
}: EventPageProps) {
  // Next.js 15.3.1に対応するため、paramsとsearchParamsを非同期で取得
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);

  const { public_id } = resolvedParams;
  const adminToken = resolvedSearchParams.admin || null;

  const supabase = createSupabaseClient();

  // イベント情報を取得
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select(
      `
      *,
      event_dates!event_dates_event_id_fkey(*)
    `
    )
    .eq("public_token", public_id)
    .single();

  if (eventError || !event) {
    console.error("Event not found:", eventError);
    notFound();
  }

  // 有効な管理者かチェック
  const isAdmin = adminToken && adminToken === event.admin_token;

  // 参加者と回答を取得
  const { data: participants } = await supabase
    .from("participants")
    .select("id, name")
    .eq("event_id", event.id);

  // イベント日程の時間帯を取得
  const { data: eventDates } = await supabase
    .from("event_dates")
    .select("id, start_time, end_time")
    .eq("event_id", event.id)
    .order("start_time", { ascending: true });

  // 全回答データを取得
  const { data: availabilities } = await supabase
    .from("availabilities")
    .select("participant_id, event_date_id, availability")
    .eq("event_id", event.id);

  // 確定した日程IDのリストを取得（新しい確定日程テーブルから）
  let finalizedDateIds: string[] = [];
  if (event.is_finalized) {
    const { data: finalizedDates } = await supabase
      .from("finalized_dates")
      .select("event_date_id")
      .eq("event_id", event.id);

    if (finalizedDates && finalizedDates.length > 0) {
      finalizedDateIds = finalizedDates.map((fd) => fd.event_date_id);
    } else if (event.final_date_id) {
      // 互換性のため、既存のfinal_date_idがあれば使用
      finalizedDateIds = [event.final_date_id];
    }
  }

  // 確定された日程の詳細情報を取得
  const finalizedDates =
    eventDates?.filter((date) => finalizedDateIds.includes(date.id)) || [];

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
        adminToken={adminToken}
      />
    </main>
  );
}
