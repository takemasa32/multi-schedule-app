import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import AvailabilityForm from "@/components/availability-form";
import AvailabilitySummary from "@/components/availability-summary";
import FinalizeEventSection from "@/components/finalize-event-section";

export default async function EventDetailPage({
  params,
}: {
  params: { public_id: string };
}) {
  const cookieStore = cookies();
  const adminToken = cookieStore.get("admin_token")?.value;

  // Supabaseクライアントの初期化
  const supabase = createServerComponentClient({ cookies });

  // イベント情報の取得
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*, event_dates(id, date_time, label)")
    .eq("public_token", params.public_id)
    .single();

  // イベントが見つからない場合は404を返す
  if (eventError || !event) {
    return notFound();
  }

  // 管理者かどうかの確認
  const isAdmin = adminToken && adminToken === event.admin_token;

  // 参加者と回答情報を取得
  const { data: participants } = await supabase
    .from("participants")
    .select("id, name")
    .eq("event_id", event.id);

  const { data: availabilities } = await supabase
    .from("availabilities")
    .select("participant_id, event_date_id, availability")
    .eq("event_id", event.id);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">{event.title}</h1>

      {event.description && (
        <p className="mb-6 text-gray-700">{event.description}</p>
      )}

      {/* イベントが確定している場合は確定結果を表示 */}
      {event.is_finalized ? (
        <div className="bg-success text-success-content p-4 rounded-lg mb-6">
          <h2 className="text-xl font-bold">このイベントは確定しました！</h2>
          {/* 確定情報の表示部分（後で実装） */}
        </div>
      ) : (
        <>
          {/* 回答フォーム */}
          <AvailabilityForm
            eventToken={params.public_id}
            eventDates={event.event_dates}
          />

          {/* 回答集計表示 */}
          <AvailabilitySummary
            eventDates={event.event_dates}
            participants={participants || []}
            availabilities={availabilities || []}
          />

          {/* 管理者のみ表示: 日程確定機能 */}
          {isAdmin && !event.is_finalized && (
            <FinalizeEventSection
              eventId={event.id}
              eventDates={event.event_dates}
              adminToken={adminToken}
            />
          )}
        </>
      )}

      <footer className="mt-10 text-sm text-gray-500">
        <p>※ このリンクを知っている方は誰でも回答できます。</p>
      </footer>
    </div>
  );
}
