
export type ShareEventDate = {
  id: string;
  start_time: string;
  end_time: string;
  label?: string;
};

export type ShareAvailability = {
  participant_id: string;
  event_date_id: string;
  availability: boolean;
};

/**
 * 指定した参加人数以上が参加可能な日程を共有用メッセージに整形する
 * @param dates 候補日程
 * @param availabilities 回答データ
 * @param minCount 最低参加人数
 * @returns メッセージ文字列。該当日程が無い場合は空文字。
 */
export function buildAvailableDatesMessage(
  dates: ShareEventDate[],
  availabilities: ShareAvailability[],
  minCount: number
): string {
  if (minCount <= 0) return "";

  const lines: string[] = [];

  dates.forEach((date) => {
    const count = availabilities.filter(
      (a) => a.event_date_id === date.id && a.availability
    ).length;
    if (count >= minCount) {
      const start = new Date(date.start_time);
      const end = new Date(date.end_time);
      const dateLabel = `${start.getMonth() + 1}月${start.getDate()}日`;
      const startTime = `${start.getHours().toString().padStart(2, "0")}:${start
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
      const endTime = `${end.getHours().toString().padStart(2, "0")}:${end
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
      lines.push(`- ${dateLabel} ${startTime}-${endTime}`);
    }
  });

  if (lines.length === 0) return "";

  return `[${minCount}人以上が参加可能な日程]` + "\n" + lines.join("\n");
}

