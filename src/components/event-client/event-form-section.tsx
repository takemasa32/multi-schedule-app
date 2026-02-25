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
          <div className="alert alert-success mb-8 mt-4">
            <span>日程が確定しました！</span>
          </div>
          <div className="mb-8">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-bold">確定した日程:</h3>
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
      <div className="card bg-base-100 border-base-200 mb-8 overflow-visible border shadow-md">
        <div className="card-body">
          <div className="mb-1 flex items-start justify-between gap-2">
            <h3 className="card-title text-lg">参加予定を入力する</h3>
            <EventAnswerLinkEditor
              eventId={event.id}
              eventPublicToken={event.public_token}
              participants={participants}
              linkedParticipantId={linkedParticipantId}
              onLinkedParticipantIdChange={setLinkedParticipantId}
            />
          </div>
          <p className="mb-4 text-sm text-gray-600">
            {event.is_finalized
              ? 'イベントは確定していますが、引き続き回答を更新できます。'
              : '以下のボタンから参加予定を入力してください。'}
          </p>

          <div className="flex flex-wrap gap-3">
            <Link href={`/event/${event.public_token}/input`} className="btn btn-primary">
              新しく回答する
            </Link>
            {/* 既存の回答を編集ボタン（参加者が1人以上いる場合のみ） */}
            {participants.length > 0 && (
              <div className="dropdown dropdown-bottom dropdown-end relative">
                <div tabIndex={0} role="button" className="btn btn-secondary m-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="mr-1 h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  既存の回答を編集
                </div>
                <ul
                  tabIndex={0}
                  className="dropdown-content menu bg-base-100 rounded-box absolute z-[100] max-h-60 w-52 overflow-y-auto p-2 shadow"
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
