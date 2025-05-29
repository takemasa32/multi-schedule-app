"use client";
import FinalizeEventSection from "@/components/finalize-event-section";
import EventHistory from "@/components/event-history";
import EventDateAddSection from "@/components/event-client/event-date-add-section";
import { useState } from "react";

// 型定義
export type EventDate = {
  id: string;
  start_time: string;
  end_time: string;
  label?: string;
};
export type Participant = { id: string; name: string };
export type Availability = {
  participant_id: string;
  event_date_id: string;
  availability: boolean;
};

interface EventDetailsSectionProps {
  event: {
    id: string;
    title: string;
    public_token: string;
    is_finalized: boolean;
  };
  eventDates: EventDate[];
  participants: Participant[];
  availabilities: Availability[];
  finalizedDateIds: string[];
}

export default function EventDetailsSection({
  event,
  eventDates,
  participants,
  availabilities,
  finalizedDateIds,
}: EventDetailsSectionProps) {
  // 参加者名バッジのトグルUI
  const [excludedParticipantIds, setExcludedParticipantIds] = useState<
    string[]
  >([]);
  const handleToggleParticipant = (id: string) => {
    setExcludedParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };
  return (
    <>
      {/* 参加者名リスト（表示/非表示トグル） */}
      {participants.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 py-2 mb-2 items-center">
          <span className="text-sm text-gray-500 mr-2">表示選択:</span>
          {participants.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`badge px-3 py-2 cursor-pointer transition-all border-2 ${
                excludedParticipantIds.includes(p.id)
                  ? "badge-outline border-error text-error bg-error/10"
                  : "badge-primary border-primary"
              }`}
              aria-pressed={excludedParticipantIds.includes(p.id)}
              onClick={() => handleToggleParticipant(p.id)}
              title={
                excludedParticipantIds.includes(p.id)
                  ? "表示に戻す"
                  : "非表示にする"
              }
            >
              {excludedParticipantIds.includes(p.id) ? (
                <span className="mr-1">🚫</span>
              ) : (
                <span className="mr-1">👤</span>
              )}
              {p.name}
            </button>
          ))}
        </div>
      )}
      {/* --- イベント管理・修正セクション --- */}
      <div className="card bg-base-100 shadow-md border border-base-200 my-8">
        <div className="card-body">
          <h2 className="font-bold text-xl mb-2">イベント管理・修正</h2>
          <p className="text-sm text-gray-500 mb-4">
            主催者向け：
            <br />
            日程の確定や候補日程の追加・修正を行えます。
          </p>
          <div className="flex flex-col md:flex-row gap-8">
            {/* 日程確定セクション */}
            <div className="flex-1 min-w-0">
              <FinalizeEventSection
                eventId={event.id}
                eventDates={eventDates}
                availabilities={availabilities}
                participants={participants}
                finalizedDateIds={finalizedDateIds}
              />
            </div>
            <div className="divider md:divider-horizontal my-1 md:my-0" />
            {/* 日程追加セクション */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg mb-2">候補日程の追加</h3>
              <EventDateAddSection event={event} eventDates={eventDates} />
            </div>
          </div>
        </div>
      </div>
      {/* 履歴セクション */}
      <EventHistory maxDisplay={3} />
    </>
  );
}
