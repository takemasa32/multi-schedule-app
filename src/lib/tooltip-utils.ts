import { formatDate, formatTime } from '../components/availability-summary/date-utils';
import type { Participant, ParticipantSummary } from '@/types/participant';

/**
 * 参加者の最終更新日時を回答詳細表示用に整形する
 * @param value 更新日時文字列
 * @returns 表示用日時。日時が不正な場合はnull。
 */
export function formatParticipantUpdatedAt(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const month = String(date.getMonth() + 1);
  const day = String(date.getDate());
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${month}/${day} ${hours}:${minutes}`;
}

/**
 * ツールチップの座標を画面端で調整する
 * @param x クリックされたX座標
 * @param y クリックされたY座標
 * @param width ツールチップの幅（デフォルト320px）
 * @param height ツールチップの高さ（デフォルト200px）
 * @returns 調整されたX, Y座標
 */
export function calcTooltipPosition(
  x: number,
  y: number,
  width = 320,
  height = 200,
): { x: number; y: number } {
  // 画面の幅・高さを取得（SSR対応）
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 0;

  // 右端に近い場合は左寄せで表示
  const adjustedX = windowWidth - x < width ? Math.max(x - width, 10) : x;

  // モバイルでは少し上にずらして親要素に隠れないように
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 640 : false;
  const adjustedY = isMobile
    ? Math.max(y - 80, 10) // モバイルではより上に表示
    : Math.min(y, windowHeight - height); // デスクトップでは下端調整

  return { x: adjustedX, y: adjustedY };
}

/**
 * 日付・時間ラベルを組み立てる
 */
interface EventDate {
  id: string;
  start_time: string; // or Date if you are using Date objects
  end_time: string; // or Date if you are using Date objects
}

export function buildDateTimeLabel(eventDates: EventDate[], dateId: string) {
  const eventDate = eventDates.find((d) => d.id === dateId);
  return {
    dateLabel: eventDate ? formatDate(eventDate.start_time) : '',
    timeLabel: eventDate
      ? `${formatTime(eventDate.start_time, eventDates)}〜${formatTime(
          eventDate.end_time,
          eventDates,
        )}`
      : '',
  };
}

/**
 * 日付IDごとの参加可否リストを構築
 */
export function buildParticipantsByDateIndex(
  participants: Participant[],
  availabilities: {
    participant_id: string;
    event_date_id: string;
    availability: boolean;
    created_at?: string;
  }[],
): Map<
  string,
  {
    availableParticipants: ParticipantSummary[];
    unavailableParticipants: ParticipantSummary[];
  }
> {
  const participantMap = new Map(
    participants.map((participant) => {
      const summary: ParticipantSummary = {
        name: participant.name,
        comment: participant.comment,
      };
      if (participant.created_at) {
        summary.updated_at = participant.created_at;
      }
      return [participant.id, summary] as const;
    }),
  );

  const dateMap = new Map<
    string,
    {
      availableParticipants: ParticipantSummary[];
      unavailableParticipants: ParticipantSummary[];
    }
  >();

  availabilities.forEach((availability) => {
    const participant = participantMap.get(availability.participant_id);
    if (!participant) return;
    const participantSummary: ParticipantSummary = {
      ...participant,
    };
    const updatedAt = availability.created_at ?? participant.updated_at;
    if (updatedAt) {
      participantSummary.updated_at = updatedAt;
    }

    const current = dateMap.get(availability.event_date_id) ?? {
      availableParticipants: [],
      unavailableParticipants: [],
    };

    if (availability.availability) {
      current.availableParticipants.push(participantSummary);
    } else {
      current.unavailableParticipants.push(participantSummary);
    }

    dateMap.set(availability.event_date_id, current);
  });

  return dateMap;
}

/**
 * 参加可否リストを取得
 * @deprecated ホバー性能改善のため、可能な限り事前に `buildParticipantsByDateIndex` を利用する
 */

export function fetchParticipantsByDate(
  participants: Participant[],
  availabilities: {
    participant_id: string;
    event_date_id: string;
    availability: boolean;
    created_at?: string;
  }[],
  dateId: string,
) {
  const index = buildParticipantsByDateIndex(participants, availabilities);
  const availableParticipants = index.get(dateId)?.availableParticipants ?? [];
  const unavailableParticipants = index.get(dateId)?.unavailableParticipants ?? [];
  return { availableParticipants, unavailableParticipants };
}
