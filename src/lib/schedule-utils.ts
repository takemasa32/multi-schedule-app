/**
 * 予定の自動反映ロジックで利用する時間比較ユーティリティ
 */

export type ScheduleBlock = {
  start_time: string;
  end_time: string;
  availability: boolean;
};

export type ScheduleTemplate = {
  weekday: number;
  start_time: string;
  end_time: string;
  availability: boolean;
  source: string;
  sample_count: number;
};

type TimeRange = {
  start: Date;
  end: Date;
};

type TimeOfDayRange = {
  weekday: number;
  startMinutes: number;
  endMinutes: number;
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

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const isRangeOverlapping = (a: TimeRange, b: TimeRange): boolean => {
  return a.start < b.end && a.end > b.start;
};

const toTimeOfDayRange = (date: Date): TimeOfDayRange => {
  const startMinutes = date.getHours() * 60 + date.getMinutes();
  return {
    weekday: date.getDay(),
    startMinutes,
    endMinutes: startMinutes,
  };
};

const toTemplateRange = (template: ScheduleTemplate): TimeOfDayRange => {
  return {
    weekday: template.weekday,
    startMinutes: toMinutes(template.start_time),
    endMinutes: toMinutes(template.end_time),
  };
};

const isTimeOfDayOverlapping = (a: TimeOfDayRange, b: TimeOfDayRange): boolean => {
  if (a.weekday !== b.weekday) return false;
  return a.startMinutes < b.endMinutes && a.endMinutes > b.startMinutes;
};

const isTimeOfDayContained = (inner: TimeOfDayRange, outer: TimeOfDayRange): boolean => {
  if (inner.weekday !== outer.weekday) return false;
  return inner.startMinutes >= outer.startMinutes && inner.endMinutes <= outer.endMinutes;
};

export const computeAutoFillAvailability = ({
  start,
  end,
  blocks,
  templates,
}: {
  start: string;
  end: string;
  blocks: ScheduleBlock[];
  templates: ScheduleTemplate[];
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

  const targetStart = toComparableDate(start);
  const targetEnd = toComparableDate(end);
  const targetDayRange: TimeOfDayRange = {
    ...toTimeOfDayRange(targetStart),
    endMinutes: targetEnd.getHours() * 60 + targetEnd.getMinutes(),
  };

  const hasTemplateUnavailable = templates.some((template) => {
    if (template.availability) return false;
    const tplRange = toTemplateRange(template);
    return isTimeOfDayOverlapping(targetDayRange, tplRange);
  });
  if (hasTemplateUnavailable) return false;

  const hasTemplateAvailable = templates.some((template) => {
    if (!template.availability) return false;
    const tplRange = toTemplateRange(template);
    return isTimeOfDayContained(targetDayRange, tplRange);
  });
  if (hasTemplateAvailable) return true;

  return null;
};
