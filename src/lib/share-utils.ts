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
 * @returns メッセージ文字列。該当日程が無い場合は「該当する日程がありません」のメッセージ。
 */
export function buildAvailableDatesMessage(
  dates: ShareEventDate[],
  availabilities: ShareAvailability[],
  minCount: number,
): string {
  if (minCount <= 0) return '';

  // 日付ごとに参加可能な時間帯を配列で保持
  const grouped = new Map<string, { start: Date; end: Date }[]>();

  dates.forEach((date) => {
    const count = availabilities.filter(
      (a) => a.event_date_id === date.id && a.availability,
    ).length;
    if (count >= minCount) {
      const start = new Date(date.start_time);
      const end = new Date(date.end_time);
      const label = `${start.getMonth() + 1}月${start.getDate()}日`;
      const arr = grouped.get(label) ?? [];
      arr.push({ start, end });
      grouped.set(label, arr);
    }
  });

  if (grouped.size === 0) {
    return `[${minCount}人以上が参加可能な日程]\n該当する日程がありません`;
  }

  const lines = Array.from(grouped.entries())
    // 日付順に並べ替え（各日付の最初の時間帯で判定）
    .sort((a, b) => a[1][0].start.getTime() - b[1][0].start.getTime())
    .map(([label, ranges]) => {
      // 開始時刻順に並べ替え
      ranges.sort((a, b) => a.start.getTime() - b.start.getTime());

      // 隣接・重複する時間帯を統合
      const merged: { start: Date; end: Date }[] = [];
      for (const r of ranges) {
        const last = merged[merged.length - 1];
        if (last && r.start.getTime() <= last.end.getTime()) {
          if (r.end > last.end) last.end = r.end;
        } else {
          merged.push({ start: r.start, end: r.end });
        }
      }

      const rangeStrings = merged.map((m) => {
        const startStr = `${m.start.getHours().toString().padStart(2, '0')}:${m.start
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;
        const endStr = `${m.end.getHours().toString().padStart(2, '0')}:${m.end
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;
        return `${startStr}-${endStr}`;
      });

      return `- ${label} ${rangeStrings.join(', ')}`;
    });

  return `[${minCount}人以上が参加可能な日程]` + '\n' + lines.join('\n');
}
