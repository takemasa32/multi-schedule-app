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
  openDateAddition?: boolean;
}

export default function EventDetailsSection({
  event,
  eventDates,
  participants,
  availabilities,
  finalizedDateIds,
  myParticipantId = null,
  openDateAddition = false,
}: EventDetailsSectionProps) {
  // 参加者名バッジのトグルUI
  const [excludedParticipantIds, setExcludedParticipantIds] = useState<string[]>([]);
  const [isDateAdditionOpen, setIsDateAdditionOpen] = useState(openDateAddition);
  const handleToggleParticipant = (id: string) => {
    setExcludedParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id],
    );
  };
  return (
    <>
      {/* 回答状況（集計）セクション */}
      <section className="surface mb-8 overflow-hidden">
        <div className="p-5 sm:px-6">
          <h2 className="section-heading">回答状況</h2>
        </div>
        <div className="border-base-300 border-t">
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
            <div className="border-base-300 flex flex-wrap items-center gap-2 border-t px-4 py-4 sm:px-6">
              <span className="text-base-content/70 mr-2 text-sm font-medium">表示選択:</span>
              {participants.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`participant-toggle btn btn-sm min-h-9 cursor-pointer rounded-lg bg-transparent px-3 py-2 font-medium shadow-none transition-colors ${
                    excludedParticipantIds.includes(p.id)
                      ? 'border-base-300 text-base-content/45 line-through'
                      : 'border-primary/30 text-base-content'
                  }`}
                  aria-pressed={excludedParticipantIds.includes(p.id)}
                  onClick={() => handleToggleParticipant(p.id)}
                  title={excludedParticipantIds.includes(p.id) ? '表示に戻す' : '非表示にする'}
                >
                  {p.name}
                  {myParticipantId === p.id && (
                    <span className="text-success ml-1 text-xs">（自分）</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {participants.length > 0 && (
            <div className="border-base-300 border-t px-4 py-4 sm:px-6">
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
      </section>
      {/* --- イベント管理・修正セクション --- */}
      <section className="surface my-8 p-5 sm:p-6">
        <h2 className="section-heading mb-1">イベント日程の管理</h2>
        <p className="section-description mb-6">日程を確定するか、候補日を追加できます。</p>
        <div
          className={isDateAdditionOpen ? 'flex flex-col gap-8' : 'flex flex-col gap-8 md:flex-row'}
        >
          {/* 日程確定セクション */}
          <div className={isDateAdditionOpen ? 'hidden' : 'min-w-0 flex-1'}>
            <FinalizeEventSection
              publicToken={event.public_token}
              eventDates={eventDates}
              availabilities={availabilities}
              finalizedDateIds={finalizedDateIds}
            />
          </div>
          {!isDateAdditionOpen && <div className="divider md:divider-horizontal my-1 md:my-0" />}
          {/* 日程追加セクション */}
          <div className="min-w-0 flex-1" id="candidate-date-addition">
            <h3 className="mb-2 text-lg font-semibold">候補日程の追加</h3>
            <EventDateAddSection
              event={event}
              eventDates={eventDates}
              initiallyOpen={openDateAddition}
              onOpenChange={setIsDateAdditionOpen}
            />
          </div>
        </div>
      </section>
      {/* 履歴セクション */}
      <EventHistory maxDisplay={3} />
    </>
  );
}
