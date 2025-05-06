import { formatDate, formatTime } from "../components/availability-summary/date-utils";

/**
 * ツールチップの座標を画面端で調整する
 */
export function calcTooltipPosition(
  x: number,
  y: number,
  width = 320,
  height = 200
): { x: number; y: number } {
  return {
    x: Math.min(x, window.innerWidth - width),
    y: Math.min(y, window.innerHeight - height),
  };
}

/**
 * 日付・時間ラベルを組み立てる
 */
export function buildDateTimeLabel(eventDates: any[], dateId: string) {
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
export function fetchParticipantsByDate(
  participants: { id: string; name: string }[],
  availabilities: { participant_id: string; event_date_id: string; availability: boolean }[],
  dateId: string
) {
  const availableParticipants: string[] = [];
  const unavailableParticipants: string[] = [];
  participants.forEach((participant) => {
    const a = availabilities.find(
      (av) => av.participant_id === participant.id && av.event_date_id === dateId
    );
    if (a?.availability === true) availableParticipants.push(participant.name);
    else if (a?.availability === false) unavailableParticipants.push(participant.name);
  });
  return { availableParticipants, unavailableParticipants };
}
