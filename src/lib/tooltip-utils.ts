import { formatDate, formatTime } from '../components/availability-summary/date-utils';
import type { Participant, ParticipantSummary } from '@/types/participant';

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
  }[],
): Map<
  string,
  {
    availableParticipants: ParticipantSummary[];
    unavailableParticipants: ParticipantSummary[];
  }
> {
  const participantMap = new Map(
    participants.map((participant) => [
      participant.id,
      {
        name: participant.name,
        comment: participant.comment,
      },
    ]),
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

    const current = dateMap.get(availability.event_date_id) ?? {
      availableParticipants: [],
      unavailableParticipants: [],
    };

    if (availability.availability) {
      current.availableParticipants.push(participant);
    } else {
      current.unavailableParticipants.push(participant);
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
  }[],
  dateId: string,
) {
  const index = buildParticipantsByDateIndex(participants, availabilities);
  const availableParticipants = index.get(dateId)?.availableParticipants ?? [];
  const unavailableParticipants = index.get(dateId)?.unavailableParticipants ?? [];
  return { availableParticipants, unavailableParticipants };
}
