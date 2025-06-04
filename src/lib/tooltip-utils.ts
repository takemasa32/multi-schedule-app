import { formatDate, formatTime } from "../components/availability-summary/date-utils";

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
  height = 200
): { x: number; y: number } {
  // 画面の幅・高さを取得（SSR対応）
  const windowWidth = typeof window !== "undefined" ? window.innerWidth : 0;
  const windowHeight = typeof window !== "undefined" ? window.innerHeight : 0;

  // 右端に近い場合は左寄せで表示
  const adjustedX = windowWidth - x < width ? Math.max(x - width, 10) : x;

  // モバイルでは少し上にずらして親要素に隠れないように
  const isMobile = typeof window !== "undefined" ? window.innerWidth <= 768 : false;
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
  end_time: string;   // or Date if you are using Date objects
}

export function buildDateTimeLabel(eventDates: EventDate[], dateId: string) {
  const eventDate = eventDates.find((d) => d.id === dateId);
  return {
    dateLabel: eventDate ? formatDate(eventDate.start_time) : "",
    timeLabel: eventDate
      ? `${formatTime(eventDate.start_time, eventDates)}〜${formatTime(
          eventDate.end_time,
          eventDates
        )}`
      : "",
  };
}

/**
 * 参加可否リストを取得
 */
import type { Participant, ParticipantSummary } from "@/types/participant";

export function fetchParticipantsByDate(
  participants: Participant[],
  availabilities: {
    participant_id: string;
    event_date_id: string;
    availability: boolean;
  }[],
  dateId: string
) {
  const availableParticipants: ParticipantSummary[] = [];
  const unavailableParticipants: ParticipantSummary[] = [];
  participants.forEach((participant) => {
    const a = availabilities.find(
      (av) => av.participant_id === participant.id && av.event_date_id === dateId
    );
    if (a?.availability === true)
      availableParticipants.push({ name: participant.name, comment: participant.comment });
    else if (a?.availability === false)
      unavailableParticipants.push({ name: participant.name, comment: participant.comment });
  });
  return { availableParticipants, unavailableParticipants };
}
