'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CalendarLinks } from '@/components/calendar-links';
import ShareEventButton from '@/components/share-event-button';
import { addEventToHistory, EVENT_HISTORY_SYNC_MAX_ITEMS } from '@/lib/utils';
import { recordEventHistory } from '@/lib/event-history-actions';
import { useSession } from 'next-auth/react';
import EventAnswerLinkEditor from '@/components/event-client/event-answer-link-editor';

import { EventDate } from './event-details-section';

interface EventFormSectionProps {
  event: {
    id: string;
    title: string;
    description: string | null;
    public_token: string;
    is_finalized: boolean;
    final_date_id?: string | null;
  };
  eventDates: EventDate[];
  participants: { id: string; name: string; comment?: string | null }[];
  finalizedDateIds?: string[];
  myParticipantId?: string | null;
}

export default function EventFormSection({
  event,
  eventDates,
  participants,
  finalizedDateIds = [],
  myParticipantId = null,
}: EventFormSectionProps) {
  const { status } = useSession();
  const [linkedParticipantId, setLinkedParticipantId] = useState<string | null>(myParticipantId);
  const historyItemRef = useRef({
    id: event.public_token,
    title: event.title,
    createdAt: new Date().toISOString(),
    isCreatedByMe: false,
  });
  // 確定済み日程のローカル変換（複数対応）
  /**
   * 確定済み日程を取得するローカル関数
   * @param event - イベント情報
   * @param eventDates - 全ての候補日程
   * @param finalizedDateIds - 確定された日程IDの配列
   * @returns 確定済み日程の配列
   */
  const getFinalizedDates = (
    event: EventFormSectionProps['event'],
    eventDates: EventDate[],
    finalizedDateIds: string[],
  ): EventDate[] => {
    if (!event.is_finalized) {
      return [];
    }

    // 複数確定日程がある場合を優先
    if (finalizedDateIds.length > 0) {
      return eventDates.filter((date) => finalizedDateIds.includes(date.id));
    }

    // 単一確定日程の場合（後方互換性のため）
    if (event.final_date_id) {
      return eventDates.filter((date) => date.id === event.final_date_id);
    }

    return [];
  };

  // 確定済み日程の取得
  const finalizedDates = getFinalizedDates(event, eventDates, finalizedDateIds);

  // 共有用URLを生成
  const getShareUrl = React.useCallback(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/event/${event.public_token}`;
  }, [event.public_token]);

  // 履歴追加（初回のみ）
  useEffect(() => {
    const historyItem = historyItemRef.current;
    addEventToHistory(historyItem, EVENT_HISTORY_SYNC_MAX_ITEMS);
    if (status === 'authenticated') {
      void recordEventHistory(historyItem);
    }
  }, [status]);

  useEffect(() => {
    setLinkedParticipantId(myParticipantId);
  }, [myParticipantId]);

  return (
    <>
      {/* 確定済み日程表示・カレンダー連携 */}
      {event.is_finalized && finalizedDates.length > 0 && (
        <div>
          <div className="alert alert-success border-success/25 bg-success/8 mb-6">
            <span>日程が確定しています</span>
          </div>
          <div className="mb-8">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="section-heading">確定した日程</h2>
              <ShareEventButton
                url={getShareUrl()}
                className="btn-sm"
                title={`${event.title}|daySynth-確定日程`}
                text={`${event.title} の日程が確定しました。`}
                label="確定日程を共有"
                ariaLabel="確定日程を共有"
                includeTextInClipboard={true}
              />
            </div>
            <ul className="list-disc space-y-1 pl-5">
              {finalizedDates.map((date) => (
                <li key={date.id}>
                  {new Date(date.start_time).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short',
                  })}{' '}
                  {new Date(date.start_time).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  〜{' '}
                  {new Date(date.end_time).toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </li>
              ))}
            </ul>
          </div>
          <CalendarLinks eventTitle={event.title} eventDates={finalizedDates} eventId={event.id} />
        </div>
      )}
      {/* 参加回答ボタンエリア */}
      <div className="surface mb-8 overflow-visible">
        <div className="p-5 sm:p-6">
          <div className="mb-1 flex items-start justify-between gap-2">
            <h2 className="section-heading">参加予定を入力する</h2>
            <EventAnswerLinkEditor
              eventId={event.id}
              eventPublicToken={event.public_token}
              participants={participants}
              linkedParticipantId={linkedParticipantId}
              onLinkedParticipantIdChange={setLinkedParticipantId}
            />
          </div>
          <p className="text-base-content/70 mb-4 text-sm">
            {event.is_finalized
              ? 'イベントは確定していますが、引き続き回答を更新できます。'
              : '参加できる候補日を回答してください。'}
          </p>

          <div className="flex flex-wrap gap-3">
            <Link href={`/event/${event.public_token}/input`} className="btn btn-primary">
              新しく回答する
            </Link>
            {/* 既存の回答を編集ボタン（参加者が1人以上いる場合のみ） */}
            {participants.length > 0 && (
              <div className="dropdown dropdown-bottom dropdown-end relative">
                <button type="button" className="btn btn-outline">
                  既存の回答を編集
                </button>
                <ul
                  tabIndex={0}
                  className="dropdown-content menu bg-base-100 border-base-300 absolute z-[100] mt-2 max-h-60 w-56 overflow-y-auto rounded-lg border p-2 shadow-lg"
                  style={{ maxHeight: '300px' }}
                >
                  {linkedParticipantId && (
                    <li>
                      <Link
                        href={`/event/${event.public_token}/input?participant_id=${linkedParticipantId}`}
                      >
                        自分の回答を編集
                      </Link>
                    </li>
                  )}
                  {participants.map((participant) => (
                    <li key={participant.id}>
                      <Link
                        href={`/event/${event.public_token}/input?participant_id=${participant.id}`}
                      >
                        {participant.name}
                        {participant.id === linkedParticipantId ? '（自分）' : ''}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
