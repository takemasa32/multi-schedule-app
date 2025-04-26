// filepath: /home/takemasa32/programs/multi-schedule-app/src/app/event/[public_id]/input/page.tsx
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { EventHeader } from "@/components/event-header";
import InputForm from "./input-form";

interface InputPageProps {
  params: {
    public_id: string;
  };
  searchParams: {
    participantId?: string;
    mode?: string; // "new" or "edit"
  };
}

export default async function InputPage({
  params,
  searchParams,
}: InputPageProps) {
  // Next.js 15.3.1に対応するため、paramsとsearchParamsを非同期で取得
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);

  const { public_id } = resolvedParams;
  const participantId = resolvedSearchParams.participantId || null;
  const mode = resolvedSearchParams.mode || "new";

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

  // イベント日程の取得
  const eventDatesQuery = supabase
    .from("event_dates")
    .select("id, start_time, end_time")
    .eq("event_id", event.id)
    .order("start_time", { ascending: true });

  const { data: eventDates, error: datesError } = await eventDatesQuery;

  if (datesError) {
    console.error("Error fetching event dates:", datesError);
    notFound();
  }

  // 既存参加者情報の取得（編集モードの場合）
  let existingParticipant = null;
  let existingAvailabilities: Record<string, boolean> = {};

  if (participantId && mode === "edit") {
    // 参加者情報の取得
    const { data: participant, error: partError } = await supabase
      .from("participants")
      .select("*")
      .eq("id", participantId)
      .eq("event_id", event.id)
      .single();

    if (partError || !participant) {
      console.error("Participant not found:", partError);
      redirect(`/event/${public_id}`);
    }

    // 参加者の回答を取得
    const { data: availabilities, error: availError } = await supabase
      .from("availabilities")
      .select("*")
      .eq("participant_id", participantId)
      .eq("event_id", event.id);

    if (!availError && availabilities) {
      existingAvailabilities = availabilities.reduce((acc, item) => {
        acc[item.event_date_id] = item.availability;
        return acc;
      }, {} as Record<string, boolean>);
    }

    existingParticipant = {
      id: participant.id,
      name: participant.name,
      availabilities: existingAvailabilities,
    };
  }

  return (
    <main className="container mx-auto max-w-5xl px-4 py-8">
      <EventHeader
        title={event.title}
        description={event.description}
        isFinalized={event.is_finalized}
      />

      <div className="my-8">
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">
              {mode === "edit" ? "参加予定を編集" : "参加予定を入力"}
            </h2>
            <Suspense fallback={<div>読み込み中...</div>}>
              <InputForm
                eventId={event.id}
                publicToken={event.public_token}
                eventDates={eventDates || []}
                existingParticipant={existingParticipant}
                mode={mode as "new" | "edit"}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}