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
  const { public_id } = params;
  const adminToken = searchParams.admin || null;

  const supabase = createClient();

  // イベント情報を取得
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*, event_dates(*)")
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

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <EventHeader
        title={event.title}
        description={event.description}
        isFinalized={event.is_finalized}
      />

      {event.is_finalized && event.final_date_id ? (
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

          <Suspense fallback={<div>カレンダーリンクを読み込み中...</div>}>
            <CalendarLinks
              eventTitle={event.title}
              eventDateId={event.final_date_id}
              eventId={event.id}
            />
          </Suspense>
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
            finalDateId={event.final_date_id}
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
