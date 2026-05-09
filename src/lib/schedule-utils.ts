/**
 * 予定の自動反映ロジックで利用する時間比較ユーティリティ
 */

export type ScheduleBlock = {
  start_time: string;
  end_time: string;
  availability: boolean;
};

type TimeRange = {
  start: Date;
  end: Date;
};

export const toComparableDate = (value: string): Date => {
  const match = value.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/,
  );
  if (match) {
    return new Date(`${match[1]}T${match[2]}`);
  }
  return new Date(value);
};

/**
 * タイムゾーン表現の差を吸収し、壁時計時刻（YYYY-MM-DD HH:mm:ss）を維持した UTC ISO へ正規化する
 */
export const toWallClockUtcIso = (value: string): string => {
  const date = toComparableDate(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds(),
    ),
  ).toISOString();
};

export const isFutureScheduleDate = (date: { end_time: string }, now = new Date()): boolean => {
  const endAt = toComparableDate(date.end_time);
  if (Number.isNaN(endAt.getTime())) return false;
  return endAt > now;
};

export const toTokyoWallClockDate = (date = new Date()): Date => {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const valueMap = Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]),
  );

  return new Date(
    valueMap.year,
    valueMap.month - 1,
    valueMap.day,
    valueMap.hour,
    valueMap.minute,
    valueMap.second,
  );
};

const toTimeRange = (start: string, end: string): TimeRange => ({
  start: toComparableDate(start),
  end: toComparableDate(end),
});

const isCoveredByRanges = (target: TimeRange, ranges: TimeRange[]): boolean => {
  const normalized = ranges
    .map((range) => ({
      start: range.start < target.start ? target.start : range.start,
      end: range.end > target.end ? target.end : range.end,
    }))
    .filter((range) => range.start < range.end)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (normalized.length === 0) return false;

  let coveredUntil = target.start;
  for (const range of normalized) {
    if (range.start > coveredUntil) {
      return false;
    }
    if (range.end > coveredUntil) {
      coveredUntil = range.end;
    }
    if (coveredUntil >= target.end) {
      return true;
    }
  }

  return coveredUntil >= target.end;
};

export const isRangeOverlapping = (a: TimeRange, b: TimeRange): boolean => {
  return a.start < b.end && a.end > b.start;
};

export const computeAutoFillAvailability = ({
  start,
  end,
  blocks,
}: {
  start: string;
  end: string;
  blocks: ScheduleBlock[];
}): boolean | null => {
  const targetRange = toTimeRange(start, end);

  const hasUnavailableOverlap = blocks.some((block) => {
    if (block.availability) return false;
    return isRangeOverlapping(targetRange, toTimeRange(block.start_time, block.end_time));
  });
  if (hasUnavailableOverlap) return false;

  const availableRanges = blocks
    .filter((block) => block.availability)
    .map((block) => toTimeRange(block.start_time, block.end_time));
  if (isCoveredByRanges(targetRange, availableRanges)) return true;

  return null;
};
