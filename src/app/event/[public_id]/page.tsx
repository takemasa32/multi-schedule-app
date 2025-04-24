import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { EventHeader } from "@/components/event-header";
import AvailabilityForm from "@/components/availability-form";
import AvailabilitySummary from "@/components/availability-summary";
import { CalendarLinks } from "@/components/calendar-links";
import FinalizeEventSection from "@/components/finalize-event-section";

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

  const supabase = createClient();

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

      {event.is_finalized && finalizedDates.length > 0 ? (
        <>
          <div className="alert alert-success mb-8">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>日程が確定しました！</span>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-bold mb-2">確定した日程:</h3>
            <ul className="list-disc pl-5 space-y-1">
              {finalizedDates.map((date) => (
                <li key={date.id}>
                  {new Date(date.start_time).toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })}{" "}
                  {new Date(date.start_time).toLocaleTimeString("ja-JP", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  〜{" "}
                  {new Date(date.end_time).toLocaleTimeString("ja-JP", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </li>
              ))}
            </ul>
          </div>

          <Suspense fallback={<div>カレンダーリンクを読み込み中...</div>}>
            <CalendarLinks
              eventTitle={event.title}
              eventDates={finalizedDates}
              eventId={event.id}
            />
          </Suspense>

          <div className="card bg-base-100 shadow-md mb-8 mt-8">
            <div className="card-body">
              <h3 className="card-title text-lg">引き続き回答できます</h3>
              <p className="text-sm text-gray-600 mb-4">
                イベントは確定していますが、引き続き回答を更新できます。
              </p>
              <AvailabilityForm
                eventId={event.id}
                publicToken={event.public_token}
                eventDates={eventDates || []}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="card bg-base-100 shadow-md mb-8">
          <div className="card-body">
            <AvailabilityForm
              eventId={event.id}
              publicToken={event.public_token}
              eventDates={eventDates || []}
            />
          </div>
        </div>
      )}

      <div className="card bg-base-100 shadow-md mb-8">
        <div className="card-body">
          <h2 className="card-title text-xl mb-4">回答状況</h2>
          <AvailabilitySummary
            participants={participants || []}
            eventDates={eventDates || []}
            availabilities={availabilities || []}
            finalizedDateIds={finalizedDateIds}
          />
        </div>
      </div>

      {isAdmin && !event.is_finalized && (
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">管理者メニュー</h2>
            <FinalizeEventSection
              eventId={event.id}
              adminToken={adminToken}
              eventDates={eventDates || []}
              availabilities={availabilities || []}
              participants={participants || []}
            />
          </div>
        </div>
      )}
    </main>
  );
}
