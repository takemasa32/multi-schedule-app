import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import AvailabilityForm from "@/components/availability-form";
import AvailabilitySummary from "@/components/availability-summary";
import FinalizeEventSection from "@/components/finalize-event-section";
import { CalendarLinks } from "@/components/calendar-links";
import { EventHeader } from "@/components/event-header";
import { formatDateTimeWithDay } from "@/lib/utils";

// サーバーサイドでのSupabaseクライアントを初期化する共通関数をインポート
import { getSupabaseServerClient } from "@/lib/supabase";

export default async function EventDetailPage({
  params,
}: {
  params: { public_id: string };
}) {
  // 非同期APIであるparamsをawait
  const resolvedParams = await params;
  const publicId = resolvedParams.public_id;

  const cookieStore = await cookies();
  const adminToken = cookieStore.get("admin_token")?.value;

  // Supabaseクライアントの取得
  const supabase = getSupabaseServerClient();

  // イベント情報の取得
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*, event_dates!event_dates_event_id_fkey(id, date_time, label)")
    .eq("public_token", publicId)
    .single();

  if (eventError) {
    console.error("イベント取得エラー:", eventError);
  }
  // イベントが見つからない場合は404を返す
  if (eventError || !event) {
    return notFound();
  }

  // 管理者かどうかの確認
  const isAdmin = Boolean(adminToken && adminToken === event.admin_token);

  // 参加者と回答情報を取得
  const { data: participants } = await supabase
    .from("participants")
    .select("id, name")
    .eq("event_id", event.id);

  const { data: availabilities } = await supabase
    .from("availabilities")
    .select("participant_id, event_date_id, availability")
    .eq("event_id", event.id);

  // 確定した日程の情報を取得
  let finalDateInfo = null;
  if (event.is_finalized && event.final_date_id) {
    const finalDate = event.event_dates.find(
      (date: any) => date.id === event.final_date_id
    );
    if (finalDate) {
      finalDateInfo = finalDate;
    }
  }

  // 確定日程に参加可能なメンバーのリストを作成
  const availableParticipants = [];
  if (finalDateInfo && participants && availabilities) {
    for (const participant of participants) {
      const availability = availabilities.find(
        (a) =>
          a.participant_id === participant.id &&
          a.event_date_id === finalDateInfo.id &&
          a.availability === true
      );

      if (availability) {
        availableParticipants.push(participant);
      }
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダーコンポーネントを追加 */}
      <EventHeader event={event} isAdmin={isAdmin} finalDate={finalDateInfo} />

      {/* イベントが確定している場合は確定結果を表示 */}
      {event.is_finalized && finalDateInfo ? (
        <div className="space-y-6">
          <div className="bg-success text-success-content p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-2">
              このイベントは確定しました！
            </h2>
            <p className="text-2xl font-bold my-4">
              {formatDateTimeWithDay(finalDateInfo.date_time)}
            </p>

            {/* 参加者リスト */}
            {availableParticipants.length > 0 && (
              <div>
                <p className="font-medium">
                  出席予定の参加者（{availableParticipants.length}名）:
                </p>
                <ul className="mt-2 list-disc list-inside">
                  {availableParticipants.map((participant) => (
                    <li key={participant.id}>{participant.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* カレンダー連携コンポーネント */}
          <CalendarLinks event={event} finalDate={finalDateInfo} />

          {/* 候補日程（グレーアウト表示） */}
          <div className="mt-6 opacity-60">
            <h3 className="text-lg font-medium mb-3">候補日程（選考結果）:</h3>
            <div className="space-y-1">
              {event.event_dates.map((date: any) => (
                <div
                  key={date.id}
                  className={`p-2 rounded ${
                    date.id === event.final_date_id
                      ? "bg-success bg-opacity-20 border-l-4 border-success"
                      : "bg-base-200"
                  }`}
                >
                  {formatDateTimeWithDay(date.date_time)}
                  {date.id === event.final_date_id && (
                    <span className="ml-2 font-medium text-success">
                      （確定）
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="alert alert-info">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <span>
              回答受付は終了しました。「カレンダーに追加」ボタンからご自身のカレンダーに予定を追加できます。
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* 回答フォーム */}
          <AvailabilityForm
            eventToken={publicId}
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
