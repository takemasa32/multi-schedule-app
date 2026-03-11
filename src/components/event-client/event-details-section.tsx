'use client';

import FinalizeEventSection from '@/components/finalize-event-section';
import EventHistory from '@/components/event-history';
import EventDateAddSection from '@/components/event-client/event-date-add-section';
import AvailabilitySummary from '@/components/availability-summary';
import { useState } from 'react';
import ShareAvailableDatesButton from '@/components/share-available-dates-button';

// 型定義
export type EventDate = {
  id: string;
  start_time: string;
  end_time: string;
  label?: string;
};
export type Participant = { id: string; name: string; comment?: string | null };
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
  myParticipantId?: string | null;
}

export default function EventDetailsSection({
  event,
  eventDates,
  participants,
  availabilities,
  finalizedDateIds,
  myParticipantId = null,
}: EventDetailsSectionProps) {
  // 参加者名バッジのトグルUI
  const [excludedParticipantIds, setExcludedParticipantIds] = useState<string[]>([]);
  const handleToggleParticipant = (id: string) => {
    setExcludedParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id],
    );
  };
  return (
    <>
      {/* 回答状況（集計）セクション */}
      <div className="card bg-base-100 border-base-200 mb-8 border shadow-md">
        <div className="card-body p-0">
          <h2 className="border-base-200 border-b p-4 text-xl font-bold">回答状況</h2>
          {/* 回答集計コンポーネント */}
          <AvailabilitySummary
            eventDates={eventDates}
            participants={participants}
            availabilities={availabilities}
            finalizedDateIds={finalizedDateIds}
            excludedParticipantIds={excludedParticipantIds}
            testIdPrefix="public"
            myParticipantId={myParticipantId}
          />
          {/* 参加者名リスト（表示/非表示トグル） */}
          {participants.length > 0 && (
            <div className="border-base-200 mb-2 flex flex-wrap items-center gap-2 border-b px-4 py-2">
              <span className="mr-2 text-sm text-base-content/60">表示選択:</span>
              {participants.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`badge cursor-pointer border-2 px-3 py-2 transition-all ${
                    excludedParticipantIds.includes(p.id)
                      ? 'badge-outline border-error text-error bg-error/10'
                      : 'badge-primary border-primary'
                  }`}
                  aria-pressed={excludedParticipantIds.includes(p.id)}
                  onClick={() => handleToggleParticipant(p.id)}
                  title={excludedParticipantIds.includes(p.id) ? '表示に戻す' : '非表示にする'}
                >
                  {excludedParticipantIds.includes(p.id) ? (
                    <span className="mr-1">🚫</span>
                  ) : (
                    <span className="mr-1">👤</span>
                  )}
                  {p.name}
                  {myParticipantId === p.id && (
                    <span className="badge badge-xs badge-success ml-1">自分</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {participants.length > 0 && (
            <div className="border-base-200 border-t px-4 py-4">
              <ShareAvailableDatesButton
                eventTitle={event.title}
                publicToken={event.public_token}
                eventDates={eventDates}
                participants={participants}
                availabilities={availabilities}
              />
            </div>
          )}
        </div>
      </div>
      {/* --- イベント管理・修正セクション --- */}
      <div className="card bg-base-100 border-base-200 my-8 border shadow-md">
        <div className="card-body">
          <h2 className="mb-4 text-xl font-bold">イベント管理・修正</h2>
          <div className="flex flex-col gap-8 md:flex-row">
            {/* 日程確定セクション */}
            <div className="min-w-0 flex-1">
              <FinalizeEventSection
                publicToken={event.public_token}
                eventDates={eventDates}
                availabilities={availabilities}
                finalizedDateIds={finalizedDateIds}
              />
            </div>
            <div className="divider md:divider-horizontal my-1 md:my-0" />
            {/* 日程追加セクション */}
            <div className="min-w-0 flex-1">
              <h3 className="mb-2 text-lg font-semibold">候補日程の追加</h3>
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
