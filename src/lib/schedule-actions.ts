'use server';

import { getAuthSession } from '@/lib/auth';
import { createSupabaseAdmin } from '@/lib/supabase';
import {
  computeAutoFillAvailability,
  isRangeOverlapping,
  toComparableDate,
  toWallClockUtcIso,
  type ScheduleBlock,
  type ScheduleTemplate,
} from '@/lib/schedule-utils';

type EventDateRange = {
  id: string;
  start_time: string;
  end_time: string;
};

type ScheduleContext = {
  isAuthenticated: boolean;
  hasSyncTargetEvents: boolean;
  lockedDateIds: string[];
  autoFillAvailabilities: Record<string, boolean>;
  dailyAutoFillDateIds: string[];
  overrideDateIds: string[];
  coveredDateIds: string[];
  uncoveredDateKeys: string[];
  uncoveredDayCount: number;
  requireWeeklyStep: boolean;
  hasAccountSeedData: boolean;
};

type UserScheduleTemplateRow = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  availability: boolean;
  source: string;
  sample_count: number;
  updated_at?: string;
};

type UserScheduleBlockRow = {
  id: string;
  start_time: string;
  end_time: string;
  availability: boolean;
  source: string;
  event_id: string | null;
  updated_at?: string;
};

type SyncPreviewDateRow = {
  eventDateId: string;
  startTime: string;
  endTime: string;
  currentAvailability: boolean;
  desiredAvailability: boolean;
  willChange: boolean;
  isProtected: boolean;
};

export type UserAvailabilitySyncPreviewEvent = {
  eventId: string;
  publicToken: string;
  title: string;
  isFinalized: boolean;
  changes: {
    total: number;
    availableToUnavailable: number;
    unavailableToAvailable: number;
    protected: number;
  };
  dates: SyncPreviewDateRow[];
};

const toLocalDateTimeString = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;

const normalizeManualBlockRange = ({
  startTime,
  endTime,
}: {
  startTime: string;
  endTime: string;
}): { startTime: string; endTime: string } => {
  const startDate = toComparableDate(startTime);
  const endDate = toComparableDate(endTime);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { startTime, endTime };
  }

  const isSameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();
  const isMidnightEnd =
    endDate.getHours() === 0 &&
    endDate.getMinutes() === 0 &&
    endDate.getSeconds() === 0 &&
    endDate.getMilliseconds() === 0;

  // 同日 00:00 終了は「その日の終わり（翌日00:00）」として補正する。
  if (isSameDay && isMidnightEnd && endDate <= startDate) {
    const adjustedEnd = new Date(endDate);
    adjustedEnd.setDate(adjustedEnd.getDate() + 1);
    return {
      startTime: toLocalDateTimeString(startDate),
      endTime: toLocalDateTimeString(adjustedEnd),
    };
  }

  return { startTime, endTime };
};

const toTemplateTimeMinutes = (value: string): number | null => {
  const matched = value.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!matched) return null;

  const hours = Number(matched[1]);
  const minutes = Number(matched[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours === 24 && minutes === 0) return 24 * 60;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const normalizeWeeklyTemplateRange = ({
  startTime,
  endTime,
}: {
  startTime: string;
  endTime: string;
}): { startTime: string; endTime: string } | null => {
  const startMinutes = toTemplateTimeMinutes(startTime);
  const endMinutes = toTemplateTimeMinutes(endTime);
  if (startMinutes === null || endMinutes === null) return null;

  const isMidnightEnd = endMinutes === 0 && startMinutes > 0;
  const normalizedEndMinutes = isMidnightEnd ? 24 * 60 : endMinutes;
  const normalizedEndTime = isMidnightEnd ? '24:00' : endTime;

  if (startMinutes >= normalizedEndMinutes) return null;

  return { startTime, endTime: normalizedEndTime };
};

type WeeklyTemplateNormalizedRow = {
  weekday: number;
  startTime: string;
  endTime: string;
  availability: boolean;
};

type WeeklyTemplateCandidateRow = {
  weekday: number;
  startMinutes: number;
  endMinutes: number;
  availability: boolean;
  priority: number;
};

const toWeeklyTemplateTimeString = (minutes: number): string => {
  if (minutes === 24 * 60) return '24:00';
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const normalizeWeeklyTemplateRow = ({
  weekday,
  startTime,
  endTime,
  availability,
}: {
  weekday: number;
  startTime: string;
  endTime: string;
  availability: boolean;
}): WeeklyTemplateNormalizedRow | null => {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return null;
  const normalizedRange = normalizeWeeklyTemplateRange({ startTime, endTime });
  if (!normalizedRange) return null;
  const startMinutes = toTemplateTimeMinutes(normalizedRange.startTime);
  const endMinutes = toTemplateTimeMinutes(normalizedRange.endTime);
  if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) return null;
  return {
    weekday,
    startTime: toWeeklyTemplateTimeString(startMinutes),
    endTime: toWeeklyTemplateTimeString(endMinutes),
    availability,
  };
};

const toWeeklyTemplateKey = ({
  weekday,
  startTime,
  endTime,
}: {
  weekday: number;
  startTime: string;
  endTime: string;
}): string => `${weekday}_${startTime}-${endTime}`;

const compactWeeklyTemplateRows = ({
  existingRows,
  incomingRows,
}: {
  existingRows: Array<{
    weekday: number;
    startTime: string;
    endTime: string;
    availability: boolean;
  }>;
  incomingRows: WeeklyTemplateNormalizedRow[];
}): WeeklyTemplateNormalizedRow[] => {
  const existingCandidates: WeeklyTemplateCandidateRow[] = existingRows.flatMap((row) => {
    const startMinutes = toTemplateTimeMinutes(row.startTime);
    const endMinutes = toTemplateTimeMinutes(row.endTime);
    if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) return [];
    return [
      {
        weekday: row.weekday,
        startMinutes,
        endMinutes,
        availability: row.availability,
        priority: 0,
      },
    ];
  });

  const incomingCandidates: WeeklyTemplateCandidateRow[] = incomingRows.flatMap((row, index) => {
    const startMinutes = toTemplateTimeMinutes(row.startTime);
    const endMinutes = toTemplateTimeMinutes(row.endTime);
    if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) return [];
    return [
      {
        weekday: row.weekday,
        startMinutes,
        endMinutes,
        availability: row.availability,
        priority: index + 1,
      },
    ];
  });

  const result: WeeklyTemplateNormalizedRow[] = [];
  for (let weekday = 0; weekday <= 6; weekday += 1) {
    const dayExisting = existingCandidates.filter((row) => row.weekday === weekday);
    const dayIncoming = incomingCandidates.filter((row) => row.weekday === weekday);
    if (dayExisting.length === 0 && dayIncoming.length === 0) continue;

    const boundaries = Array.from(
      new Set(
        [...dayExisting, ...dayIncoming].flatMap((row) => [row.startMinutes, row.endMinutes]),
      ),
    ).sort((a, b) => a - b);
    if (boundaries.length < 2) continue;

    const daySegments: Array<{ startMinutes: number; endMinutes: number; availability: boolean }> =
      [];
    for (let i = 0; i < boundaries.length - 1; i += 1) {
      const startMinutes = boundaries[i];
      const endMinutes = boundaries[i + 1];
      if (startMinutes >= endMinutes) continue;

      const incomingCover = dayIncoming
        .filter((row) => row.startMinutes <= startMinutes && endMinutes <= row.endMinutes)
        .sort((a, b) => a.priority - b.priority);
      if (incomingCover.length > 0) {
        daySegments.push({
          startMinutes,
          endMinutes,
          availability: incomingCover[incomingCover.length - 1].availability,
        });
        continue;
      }

      const existingCover = dayExisting.filter(
        (row) => row.startMinutes <= startMinutes && endMinutes <= row.endMinutes,
      );
      if (existingCover.length === 0) continue;
      daySegments.push({
        startMinutes,
        endMinutes,
        availability: existingCover.some((row) => !row.availability) ? false : true,
      });
    }

    const merged: Array<{ startMinutes: number; endMinutes: number; availability: boolean }> = [];
    daySegments.forEach((segment) => {
      const last = merged[merged.length - 1];
      if (
        last &&
        last.endMinutes === segment.startMinutes &&
        last.availability === segment.availability
      ) {
        last.endMinutes = segment.endMinutes;
        return;
      }
      merged.push({ ...segment });
    });

    merged.forEach((segment) => {
      result.push({
        weekday,
        startTime: toWeeklyTemplateTimeString(segment.startMinutes),
        endTime: toWeeklyTemplateTimeString(segment.endMinutes),
        availability: segment.availability,
      });
    });
  }

  return result;
};

const computeAutoFillWithPriority = ({
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
  const targetRange = {
    start: toComparableDate(start),
    end: toComparableDate(end),
  };
  const overlappingBlocks = blocks.filter((block) =>
    isRangeOverlapping(targetRange, {
      start: toComparableDate(block.start_time),
      end: toComparableDate(block.end_time),
    }),
  );

  if (overlappingBlocks.length > 0) {
    // 日付ごとの予定がある枠は、予定一括管理を優先する。
    return computeAutoFillAvailability({
      start,
      end,
      blocks: overlappingBlocks,
      templates: [],
    });
  }

  // 日付ごとの予定がない枠のみ、週ごとの用事を使う。
  return computeAutoFillAvailability({
    start,
    end,
    blocks: [],
    templates,
  });
};

const buildUserAvailabilitySyncPreview = async (
  userId: string,
): Promise<UserAvailabilitySyncPreviewEvent[]> => {
  const supabase = createSupabaseAdmin();

  const { data: allLinks, error: linkError } = await supabase
    .from('user_event_links')
    .select('event_id,participant_id')
    .eq('user_id', userId);

  if (linkError || !allLinks) {
    console.error('イベント紐付け取得エラー:', linkError);
    return [];
  }

  const links = allLinks.filter((row) => Boolean(row.participant_id));
  if (links.length === 0) return [];

  const allEventIds = allLinks.map((row) => row.event_id);

  const { data: blocks } = await supabase
    .from('user_schedule_blocks')
    .select('start_time,end_time,availability')
    .eq('user_id', userId);

  const { data: templates } = await supabase
    .from('user_schedule_templates')
    .select('weekday,start_time,end_time,availability,source,sample_count')
    .eq('user_id', userId)
    .eq('source', 'manual');

  const { data: finalizedDates } =
    allEventIds.length > 0
      ? await supabase
          .from('finalized_dates')
          .select('event_id,event_date_id,event_dates(start_time,end_time)')
          .in('event_id', allEventIds)
      : { data: [] };

  const busyIntervals = (finalizedDates ?? [])
    .map((row) => {
      const eventDate = Array.isArray(row.event_dates) ? row.event_dates[0] : row.event_dates;
      if (!eventDate?.start_time || !eventDate?.end_time) return null;
      return {
        event_id: row.event_id,
        start_time: eventDate.start_time,
        end_time: eventDate.end_time,
      };
    })
    .filter((row): row is { event_id: string; start_time: string; end_time: string } =>
      Boolean(row),
    );

  const { data: eventsData } = await supabase
    .from('events')
    .select('id,title,public_token,is_finalized')
    .in(
      'id',
      links.map((row) => row.event_id),
    );
  const eventsMap = new Map((eventsData ?? []).map((row) => [row.id, row]));

  const previewEvents: UserAvailabilitySyncPreviewEvent[] = [];

  for (const link of links) {
    const participantId = link.participant_id;
    if (!participantId) continue;

    const eventInfo = eventsMap.get(link.event_id);
    if (!eventInfo) continue;

    const { data: eventDates, error: datesError } = await supabase
      .from('event_dates')
      .select('id,start_time,end_time')
      .eq('event_id', link.event_id)
      .order('start_time', { ascending: true });

    if (datesError || !eventDates) {
      console.error('イベント日程取得エラー:', datesError);
      continue;
    }

    const { data: overrides } = await supabase
      .from('user_event_availability_overrides')
      .select('event_date_id')
      .eq('user_id', userId)
      .eq('event_id', link.event_id);
    const protectedSet = new Set((overrides ?? []).map((row) => row.event_date_id));

    const { data: currentAvailabilities } = await supabase
      .from('availabilities')
      .select('event_date_id,availability')
      .eq('participant_id', participantId);
    const currentMap = new Map(
      (currentAvailabilities ?? []).map((row) => [row.event_date_id, row.availability]),
    );

    const dates: SyncPreviewDateRow[] = eventDates.map((date) => {
      const currentAvailability = currentMap.get(date.id) ?? false;

      let desiredAvailability = currentAvailability;
      const hasBusyOverlap = busyIntervals.some((busy) => {
        if (busy.event_id === link.event_id) return false;
        return isRangeOverlapping(
          { start: new Date(date.start_time), end: new Date(date.end_time) },
          { start: new Date(busy.start_time), end: new Date(busy.end_time) },
        );
      });

      if (hasBusyOverlap) {
        desiredAvailability = false;
      } else {
        const auto = computeAutoFillWithPriority({
          start: date.start_time,
          end: date.end_time,
          blocks: (blocks ?? []) as ScheduleBlock[],
          templates: (templates ?? []) as ScheduleTemplate[],
        });
        if (auto !== null) {
          desiredAvailability = auto;
        }
      }

      const willChange = currentAvailability !== desiredAvailability;
      const isProtected = protectedSet.has(date.id);

      return {
        eventDateId: date.id,
        startTime: date.start_time,
        endTime: date.end_time,
        currentAvailability,
        desiredAvailability,
        willChange,
        isProtected,
      };
    });

    const total = dates.filter((row) => row.willChange).length;
    if (total === 0) continue;

    previewEvents.push({
      eventId: link.event_id,
      publicToken: eventInfo.public_token,
      title: eventInfo.title,
      isFinalized: eventInfo.is_finalized,
      changes: {
        total,
        availableToUnavailable: dates.filter(
          (row) => row.willChange && row.currentAvailability && !row.desiredAvailability,
        ).length,
        unavailableToAvailable: dates.filter(
          (row) => row.willChange && !row.currentAvailability && row.desiredAvailability,
        ).length,
        protected: dates.filter((row) => row.willChange && row.isProtected).length,
      },
      dates,
    });
  }

  return previewEvents.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
};

const splitToHourlyRanges = (start: string, end: string): Array<{ start: string; end: string }> => {
  const startDate = toComparableDate(start);
  const endDate = toComparableDate(end);
  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    startDate >= endDate
  ) {
    return [];
  }

  const result: Array<{ start: string; end: string }> = [];
  let cursor = new Date(
    Date.UTC(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
      startDate.getHours(),
      startDate.getMinutes(),
      startDate.getSeconds(),
      startDate.getMilliseconds(),
    ),
  );
  const endAt = new Date(
    Date.UTC(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
      endDate.getHours(),
      endDate.getMinutes(),
      endDate.getSeconds(),
      endDate.getMilliseconds(),
    ),
  );

  while (cursor < endAt) {
    const next = new Date(cursor.getTime() + 60 * 60 * 1000);
    const chunkEnd = next < endAt ? next : endAt;
    result.push({
      start: new Date(cursor).toISOString(),
      end: new Date(chunkEnd).toISOString(),
    });
    cursor = chunkEnd;
  }

  return result;
};

export async function getUserScheduleContext(
  eventId: string,
  eventDates: EventDateRange[],
): Promise<ScheduleContext> {
  const toDateKey = (value: string): string => {
    const date = toComparableDate(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const toTimeSlotKey = (start: string, end: string): string => {
    const startDate = toComparableDate(start);
    const endDate = toComparableDate(end);
    const toHm = (date: Date) =>
      `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    return `${toHm(startDate)}-${toHm(endDate)}`;
  };

  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      isAuthenticated: false,
      hasSyncTargetEvents: false,
      lockedDateIds: [],
      autoFillAvailabilities: {},
      dailyAutoFillDateIds: [],
      overrideDateIds: [],
      coveredDateIds: [],
      uncoveredDateKeys: [],
      uncoveredDayCount: 0,
      requireWeeklyStep: false,
      hasAccountSeedData: false,
    };
  }

  const supabase = createSupabaseAdmin();
  if (eventDates.length === 0) {
    return {
      isAuthenticated: true,
      hasSyncTargetEvents: false,
      lockedDateIds: [],
      autoFillAvailabilities: {},
      dailyAutoFillDateIds: [],
      overrideDateIds: [],
      coveredDateIds: [],
      uncoveredDateKeys: [],
      uncoveredDayCount: 0,
      requireWeeklyStep: false,
      hasAccountSeedData: false,
    };
  }

  const startTimes = eventDates.map((d) => d.start_time);
  const endTimes = eventDates.map((d) => d.end_time);
  const minStart = startTimes.reduce((min, value) => (value < min ? value : min), startTimes[0]);
  const maxEnd = endTimes.reduce((max, value) => (value > max ? value : max), endTimes[0]);

  const { data: blocks, error: blocksError } = await supabase
    .from('user_schedule_blocks')
    .select('start_time,end_time,availability,source')
    .eq('user_id', userId)
    .lt('start_time', maxEnd)
    .gt('end_time', minStart);

  if (blocksError) {
    console.error('予定ブロック取得エラー:', blocksError);
  }

  const { data: templates, error: templatesError } = await supabase
    .from('user_schedule_templates')
    .select('weekday,start_time,end_time,availability,source,sample_count')
    .eq('user_id', userId)
    .eq('source', 'manual');

  if (templatesError) {
    console.error('予定テンプレ取得エラー:', templatesError);
  }

  const { data: linkEvents } = await supabase
    .from('user_event_links')
    .select('event_id,participant_id')
    .eq('user_id', userId);

  const hasSyncTargetEvents = (linkEvents ?? []).some(
    (row) => row.event_id !== eventId && Boolean(row.participant_id),
  );
  const linkedEventIds = (linkEvents ?? []).map((row) => row.event_id).filter(Boolean);

  const { data: finalizedDates } =
    linkedEventIds.length > 0
      ? await supabase
          .from('finalized_dates')
          .select('event_id,event_date_id,event_dates(start_time,end_time)')
          .in('event_id', linkedEventIds)
      : { data: [] };

  const busyIntervals = (finalizedDates ?? [])
    .map((row) => {
      const eventDate = Array.isArray(row.event_dates) ? row.event_dates[0] : row.event_dates;
      if (!eventDate?.start_time || !eventDate?.end_time) return null;
      return {
        event_id: row.event_id,
        start_time: eventDate.start_time,
        end_time: eventDate.end_time,
      };
    })
    .filter((row): row is { event_id: string; start_time: string; end_time: string } =>
      Boolean(row),
    );

  const { data: overrides } = await supabase
    .from('user_event_availability_overrides')
    .select('event_date_id')
    .eq('user_id', userId)
    .eq('event_id', eventId);

  const overrideDateIds = (overrides ?? []).map((row) => row.event_date_id);

  const lockedDateIds = eventDates
    .filter((date) =>
      busyIntervals.some((busy) => {
        if (busy.event_id === eventId) return false;
        return isRangeOverlapping(
          { start: new Date(date.start_time), end: new Date(date.end_time) },
          { start: new Date(busy.start_time), end: new Date(busy.end_time) },
        );
      }),
    )
    .map((date) => date.id);

  const lockedSet = new Set(lockedDateIds);
  const autoFillAvailabilities: Record<string, boolean> = {};
  const dailyCoveredSet = new Set<string>(lockedDateIds);
  const dailyAutoFillSet = new Set<string>();

  eventDates.forEach((date) => {
    const blockOnlyResult = computeAutoFillAvailability({
      start: date.start_time,
      end: date.end_time,
      blocks: (blocks ?? []) as ScheduleBlock[],
      templates: [],
    });
    if (blockOnlyResult !== null) {
      dailyCoveredSet.add(date.id);
    }

    if (lockedSet.has(date.id)) return;
    const result = computeAutoFillWithPriority({
      start: date.start_time,
      end: date.end_time,
      blocks: (blocks ?? []) as ScheduleBlock[],
      templates: (templates ?? []) as ScheduleTemplate[],
    });
    if (result !== null) {
      autoFillAvailabilities[date.id] = result;
      if (blockOnlyResult !== null) {
        dailyAutoFillSet.add(date.id);
      }
    }
  });

  const coveredSet = new Set<string>([...lockedDateIds, ...Object.keys(autoFillAvailabilities)]);
  const coveredDateIds = eventDates
    .filter((date) => coveredSet.has(date.id))
    .map((date) => date.id);

  // Step2必須/省略判定は、週テンプレではなく「各日予定（blocks）で判定可能な枠」ベースで算出する。

  const uncoveredDateKeys = Array.from(
    new Set(
      eventDates
        .filter((date) => !dailyCoveredSet.has(date.id))
        .map((date) => toDateKey(date.start_time)),
    ),
  ).sort();
  const uncoveredDayCount = uncoveredDateKeys.length;
  const uncoveredCellCount = eventDates.filter((date) => !dailyCoveredSet.has(date.id)).length;
  const uniqueTimeSlotCount = new Set(
    eventDates.map((date) => toTimeSlotKey(date.start_time, date.end_time)),
  ).size;
  const weeklyCellCount = 7 * uniqueTimeSlotCount;
  const requireWeeklyStep = uncoveredCellCount > weeklyCellCount;
  const hasAccountSeedData =
    Boolean(blocks && blocks.length > 0) ||
    Boolean(templates && templates.length > 0) ||
    lockedDateIds.length > 0;

  return {
    isAuthenticated: true,
    hasSyncTargetEvents,
    lockedDateIds,
    autoFillAvailabilities,
    dailyAutoFillDateIds: Array.from(dailyAutoFillSet),
    overrideDateIds,
    coveredDateIds,
    uncoveredDateKeys,
    uncoveredDayCount,
    requireWeeklyStep,
    hasAccountSeedData,
  };
}

export async function upsertUserEventLink({
  userId,
  eventId,
  participantId,
}: {
  userId: string;
  eventId: string;
  participantId?: string | null;
}): Promise<{ success: boolean; code?: string; message?: string }> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from('user_event_links').upsert(
    {
      user_id: userId,
      event_id: eventId,
      participant_id: participantId ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,event_id' },
  );

  if (error) {
    console.error('ユーザーイベント紐付けの更新に失敗しました:', error);
    return { success: false, code: error.code, message: error.message };
  }
  return { success: true };
}

export async function upsertUserScheduleBlocks({
  userId,
  eventId,
  eventDates,
  selectedDateIds,
}: {
  userId: string;
  eventId: string;
  eventDates: EventDateRange[];
  selectedDateIds: string[];
}): Promise<void> {
  if (eventDates.length === 0) return;
  const selectedSet = new Set(selectedDateIds);
  const payload = eventDates.flatMap((date) =>
    splitToHourlyRanges(date.start_time, date.end_time).map((range) => ({
      user_id: userId,
      start_time: toWallClockUtcIso(range.start),
      end_time: toWallClockUtcIso(range.end),
      availability: selectedSet.has(date.id),
      source: 'event',
      event_id: eventId,
      updated_at: new Date().toISOString(),
    })),
  );

  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from('user_schedule_blocks')
    .upsert(payload, { onConflict: 'user_id,start_time,end_time' });

  if (error) {
    console.error('予定ブロックの更新に失敗しました:', error);
  }
}

export async function updateUserScheduleTemplatesFromBlocks({
  userId,
  eventDates,
  selectedDateIds,
}: {
  userId: string;
  eventDates: EventDateRange[];
  selectedDateIds: string[];
}): Promise<void> {
  // 週次テンプレは手動登録のみを採用するため、自動学習更新は行わない。
  void userId;
  void eventDates;
  void selectedDateIds;
}

export async function saveAvailabilityOverrides({
  userId,
  eventId,
  overrideDateIds,
  selectedDateIds,
}: {
  userId: string;
  eventId: string;
  overrideDateIds: string[];
  selectedDateIds: string[];
}): Promise<void> {
  const supabase = createSupabaseAdmin();

  if (overrideDateIds.length === 0) {
    const { error: clearError } = await supabase
      .from('user_event_availability_overrides')
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId);
    if (clearError) {
      console.error('上書き情報の削除に失敗しました:', clearError);
    }
    return;
  }

  const selectedSet = new Set(selectedDateIds);
  const payload = overrideDateIds.map((dateId) => ({
    user_id: userId,
    event_id: eventId,
    event_date_id: dateId,
    availability: selectedSet.has(dateId),
    reason: 'conflict_override',
    updated_at: new Date().toISOString(),
  }));

  const { error: upsertError } = await supabase
    .from('user_event_availability_overrides')
    .upsert(payload, { onConflict: 'user_id,event_id,event_date_id' });

  if (upsertError) {
    console.error('上書き情報の保存に失敗しました:', upsertError);
    return;
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('user_event_availability_overrides')
    .select('event_date_id')
    .eq('user_id', userId)
    .eq('event_id', eventId);

  if (existingError) {
    console.error('上書き情報の取得に失敗しました:', existingError);
    return;
  }

  const overrideIdSet = new Set(overrideDateIds);
  const staleDateIds = (existingRows ?? [])
    .map((row) => row.event_date_id)
    .filter((dateId) => !overrideIdSet.has(dateId));

  if (staleDateIds.length === 0) return;

  const { error: deleteError } = await supabase
    .from('user_event_availability_overrides')
    .delete()
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .in('event_date_id', staleDateIds);

  if (deleteError) {
    console.error('不要な上書き情報の削除に失敗しました:', deleteError);
  }
}

export async function syncUserAvailabilities({
  userId,
  scope,
  currentEventId,
}: {
  userId: string;
  scope: 'current' | 'all';
  currentEventId?: string;
}): Promise<void> {
  const supabase = createSupabaseAdmin();

  const { data: allLinks, error: linkError } = await supabase
    .from('user_event_links')
    .select('event_id, participant_id')
    .eq('user_id', userId);

  if (linkError) {
    console.error('イベント紐付け取得エラー:', linkError);
    return;
  }

  const links = (allLinks ?? []).filter(
    (
      link,
    ): link is {
      event_id: string;
      participant_id: string;
    } => {
      if (!link.participant_id) return false;
      if (scope === 'current') {
        return currentEventId ? link.event_id === currentEventId : false;
      }
      if (currentEventId) {
        return link.event_id !== currentEventId;
      }
      return true;
    },
  );

  if (links.length === 0) return;

  const allEventIds = (allLinks ?? []).map((link) => link.event_id);

  const { data: blocks } = await supabase
    .from('user_schedule_blocks')
    .select('start_time,end_time,availability')
    .eq('user_id', userId);

  const { data: templates } = await supabase
    .from('user_schedule_templates')
    .select('weekday,start_time,end_time,availability,source,sample_count')
    .eq('user_id', userId)
    .eq('source', 'manual');

  const { data: finalizedDates } =
    allEventIds.length > 0
      ? await supabase
          .from('finalized_dates')
          .select('event_id,event_date_id,event_dates(start_time,end_time)')
          .in('event_id', allEventIds)
      : { data: [] };

  const busyIntervals = (finalizedDates ?? [])
    .map((row) => {
      const eventDate = Array.isArray(row.event_dates) ? row.event_dates[0] : row.event_dates;
      if (!eventDate?.start_time || !eventDate?.end_time) return null;
      return {
        event_id: row.event_id,
        start_time: eventDate.start_time,
        end_time: eventDate.end_time,
      };
    })
    .filter((row): row is { event_id: string; start_time: string; end_time: string } =>
      Boolean(row),
    );

  for (const link of links) {
    const { data: eventDates, error: datesError } = await supabase
      .from('event_dates')
      .select('id,start_time,end_time')
      .eq('event_id', link.event_id);

    if (datesError || !eventDates) {
      console.error('イベント日程取得エラー:', datesError);
      continue;
    }

    const { data: overrides } = await supabase
      .from('user_event_availability_overrides')
      .select('event_date_id,availability')
      .eq('user_id', userId)
      .eq('event_id', link.event_id);

    const overrideMap = new Map(
      (overrides ?? []).map((row) => [row.event_date_id, row.availability]),
    );

    const { data: currentAvailabilities } = await supabase
      .from('availabilities')
      .select('event_date_id,availability')
      .eq('participant_id', link.participant_id);

    const selectedSet = new Set(
      (currentAvailabilities ?? [])
        .filter((row) => row.availability)
        .map((row) => row.event_date_id),
    );

    eventDates.forEach((date) => {
      const override = overrideMap.get(date.id);
      if (override !== undefined) {
        if (override) {
          selectedSet.add(date.id);
        } else {
          selectedSet.delete(date.id);
        }
        return;
      }

      const hasBusyOverlap = busyIntervals.some((busy) => {
        if (busy.event_id === link.event_id) return false;
        return isRangeOverlapping(
          { start: new Date(date.start_time), end: new Date(date.end_time) },
          { start: new Date(busy.start_time), end: new Date(busy.end_time) },
        );
      });
      if (hasBusyOverlap) {
        selectedSet.delete(date.id);
        return;
      }

      const auto = computeAutoFillWithPriority({
        start: date.start_time,
        end: date.end_time,
        blocks: (blocks ?? []) as ScheduleBlock[],
        templates: (templates ?? []) as ScheduleTemplate[],
      });

      if (auto === true) {
        selectedSet.add(date.id);
      } else if (auto === false) {
        selectedSet.delete(date.id);
      }
    });

    const payload = Array.from(selectedSet).map((dateId) => ({
      event_date_id: dateId,
      availability: true,
    }));

    const { error: syncError } = await supabase.rpc('update_participant_availability', {
      p_participant_id: link.participant_id,
      p_event_id: link.event_id,
      p_availabilities: payload,
    });

    if (syncError) {
      console.error('回答同期エラー:', syncError);
    }
  }
}

export async function fetchUserAvailabilitySyncPreview(): Promise<
  UserAvailabilitySyncPreviewEvent[]
> {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) return [];
  return buildUserAvailabilitySyncPreview(userId);
}

export async function applyUserAvailabilitySyncForEvent({
  eventId,
  selectedAvailabilities,
  overwriteProtected,
  allowFinalized,
}: {
  eventId: string;
  selectedAvailabilities?: Record<string, boolean>;
  overwriteProtected: boolean;
  allowFinalized: boolean;
}): Promise<{ success: boolean; message: string; updatedCount: number }> {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, message: 'ログインが必要です', updatedCount: 0 };
  }

  const previewEvents = await buildUserAvailabilitySyncPreview(userId);
  const target = previewEvents.find((row) => row.eventId === eventId);
  if (!target) {
    return { success: true, message: 'このイベントに反映すべき変更はありません', updatedCount: 0 };
  }
  if (target.isFinalized && !allowFinalized) {
    return {
      success: false,
      message: '確定済みイベントです。更新する場合は許可を有効にしてください',
      updatedCount: 0,
    };
  }

  const selectedDates = target.dates
    .filter((row) => {
      const requested =
        selectedAvailabilities && row.eventDateId in selectedAvailabilities
          ? selectedAvailabilities[row.eventDateId]
          : row.desiredAvailability;

      if (row.isProtected && !overwriteProtected) {
        return row.currentAvailability;
      }
      return requested;
    })
    .map((row) => row.eventDateId);

  const supabase = createSupabaseAdmin();
  const { data: link, error: linkError } = await supabase
    .from('user_event_links')
    .select('participant_id')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .maybeSingle();

  if (linkError || !link?.participant_id) {
    return { success: false, message: '参加者情報の取得に失敗しました', updatedCount: 0 };
  }

  const payload = selectedDates.map((eventDateId) => ({
    event_date_id: eventDateId,
    availability: true,
  }));

  const { error: syncError } = await supabase.rpc('update_participant_availability', {
    p_participant_id: link.participant_id,
    p_event_id: eventId,
    p_availabilities: payload,
  });

  if (syncError) {
    console.error('イベント単位同期エラー:', syncError);
    return { success: false, message: 'イベント更新に失敗しました', updatedCount: 0 };
  }

  const updatedCount = target.dates.filter((row) => {
    const requested =
      selectedAvailabilities && row.eventDateId in selectedAvailabilities
        ? selectedAvailabilities[row.eventDateId]
        : row.desiredAvailability;
    if (row.isProtected && !overwriteProtected) return false;
    return requested !== row.currentAvailability;
  }).length;

  return { success: true, message: 'イベントを更新しました', updatedCount };
}

export async function fetchUserScheduleTemplates(): Promise<{
  manual: UserScheduleTemplateRow[];
  learned: UserScheduleTemplateRow[];
}> {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return { manual: [], learned: [] };
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from('user_schedule_templates')
    .select('id,weekday,start_time,end_time,availability,source,sample_count')
    .eq('user_id', userId)
    .order('weekday', { ascending: true });

  if (error || !data) {
    console.error('テンプレ取得エラー:', error);
    return { manual: [], learned: [] };
  }

  return {
    manual: data.filter((row) => row.source === 'manual'),
    learned: [],
  };
}

export async function fetchUserScheduleBlocks(): Promise<UserScheduleBlockRow[]> {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return [];
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from('user_schedule_blocks')
    .select('id,start_time,end_time,availability,source,event_id,updated_at')
    .eq('user_id', userId)
    .order('start_time', { ascending: true });

  if (error || !data) {
    console.error('予定ブロック取得エラー:', error);
    return [];
  }

  return data as UserScheduleBlockRow[];
}

export async function createManualScheduleTemplate({
  weekday,
  startTime,
  endTime,
  availability,
}: {
  weekday: number;
  startTime: string;
  endTime: string;
  availability: boolean;
}): Promise<{ success: boolean; message?: string }> {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, message: 'ログインが必要です' };
  }

  if (weekday < 0 || weekday > 6) {
    return { success: false, message: '曜日の指定が正しくありません' };
  }
  if (!startTime || !endTime || startTime >= endTime) {
    return { success: false, message: '時間帯の指定が正しくありません' };
  }

  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from('user_schedule_templates').upsert(
    {
      user_id: userId,
      weekday,
      start_time: startTime,
      end_time: endTime,
      availability,
      source: 'manual',
      sample_count: 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,weekday,start_time,end_time,source' },
  );

  if (error) {
    console.error('テンプレ追加エラー:', error);
    return { success: false, message: 'テンプレの追加に失敗しました' };
  }

  return { success: true };
}

export async function removeScheduleTemplate(templateId: string): Promise<{ success: boolean }> {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false };
  }

  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from('user_schedule_templates')
    .delete()
    .eq('id', templateId)
    .eq('user_id', userId);

  if (error) {
    console.error('テンプレ削除エラー:', error);
    return { success: false };
  }

  return { success: true };
}

export async function upsertUserScheduleBlock({
  startTime,
  endTime,
  availability,
  replaceBlockId,
}: {
  startTime: string;
  endTime: string;
  availability: boolean;
  replaceBlockId?: string;
}): Promise<{ success: boolean; message?: string }> {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, message: 'ログインが必要です' };
  }

  const normalizedRange = normalizeManualBlockRange({ startTime, endTime });
  const startDate = toComparableDate(normalizedRange.startTime);
  const endDate = toComparableDate(normalizedRange.endTime);
  if (
    !normalizedRange.startTime ||
    !normalizedRange.endTime ||
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    startDate >= endDate
  ) {
    return { success: false, message: '時間帯の指定が正しくありません' };
  }

  const supabase = createSupabaseAdmin();
  if (replaceBlockId) {
    const { error: deleteError } = await supabase
      .from('user_schedule_blocks')
      .delete()
      .eq('id', replaceBlockId)
      .eq('user_id', userId);
    if (deleteError) {
      console.error('予定ブロック置換削除エラー:', deleteError);
      return { success: false, message: '予定ブロックの更新に失敗しました' };
    }
  }

  const ranges = splitToHourlyRanges(normalizedRange.startTime, normalizedRange.endTime);
  if (ranges.length === 0) {
    return { success: false, message: '時間帯の指定が正しくありません' };
  }

  const payload = ranges.map((range) => ({
    user_id: userId,
    start_time: toWallClockUtcIso(range.start),
    end_time: toWallClockUtcIso(range.end),
    availability,
    source: 'manual',
    event_id: null,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('user_schedule_blocks')
    .upsert(payload, { onConflict: 'user_id,start_time,end_time' });

  if (error) {
    console.error('予定ブロック更新エラー:', error);
    return { success: false, message: '予定ブロックの更新に失敗しました' };
  }

  return { success: true };
}

export async function removeUserScheduleBlock(blockId: string): Promise<{ success: boolean }> {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false };
  }

  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from('user_schedule_blocks')
    .delete()
    .eq('id', blockId)
    .eq('user_id', userId);

  if (error) {
    console.error('予定ブロック削除エラー:', error);
    return { success: false };
  }

  return { success: true };
}

export async function upsertWeeklyTemplatesFromWeekdaySelections({
  templates,
}: {
  templates: Array<{
    weekday: number;
    startTime: string;
    endTime: string;
    availability: boolean;
  }>;
}): Promise<{ success: boolean; message?: string; updatedCount: number }> {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, message: 'ログインが必要です', updatedCount: 0 };
  }

  if (!templates.length) {
    return { success: false, message: '保存対象の設定がありません', updatedCount: 0 };
  }

  const normalized = templates.flatMap((row) => {
    const normalizedRow = normalizeWeeklyTemplateRow({
      weekday: row.weekday,
      startTime: row.startTime,
      endTime: row.endTime,
      availability: row.availability,
    });
    return normalizedRow ? [normalizedRow] : [];
  });
  if (!normalized.length) {
    return { success: false, message: '曜日ごとの設定が不正です', updatedCount: 0 };
  }

  const supabase = createSupabaseAdmin();
  const { data: existingRows, error: existingError } = await supabase
    .from('user_schedule_templates')
    .select('id,weekday,start_time,end_time,availability')
    .eq('user_id', userId)
    .eq('source', 'manual');

  if (existingError) {
    console.error('週次テンプレ既存データ取得エラー:', existingError);
    return {
      success: false,
      message: '週ごとの用事の取得に失敗しました。時間をおいて再試行してください。',
      updatedCount: 0,
    };
  }

  const compacted = compactWeeklyTemplateRows({
    existingRows: (existingRows ?? []).flatMap((row) => {
      const normalizedExisting = normalizeWeeklyTemplateRow({
        weekday: row.weekday,
        startTime: row.start_time,
        endTime: row.end_time,
        availability: row.availability,
      });
      return normalizedExisting ? [normalizedExisting] : [];
    }),
    incomingRows: normalized,
  });

  if (compacted.length === 0) {
    return { success: false, message: '曜日ごとの設定が不正です', updatedCount: 0 };
  }

  const payload = compacted.map((row) => ({
    user_id: userId,
    weekday: row.weekday,
    start_time: row.startTime,
    end_time: row.endTime,
    availability: row.availability,
    source: 'manual',
    sample_count: 1,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('user_schedule_templates')
    .upsert(payload, { onConflict: 'user_id,weekday,start_time,end_time,source' });

  if (error) {
    console.error('週次テンプレ更新エラー:', error);
    return {
      success: false,
      message: '週ごとの用事の更新に失敗しました。再読み込み後にもう一度お試しください。',
      updatedCount: 0,
    };
  }

  const keepKeys = new Set(compacted.map((row) => toWeeklyTemplateKey(row)));
  const staleIds = (existingRows ?? [])
    .flatMap((row) => {
      const normalizedExisting = normalizeWeeklyTemplateRow({
        weekday: row.weekday,
        startTime: row.start_time,
        endTime: row.end_time,
        availability: row.availability,
      });
      if (!normalizedExisting) return [row.id];
      const key = toWeeklyTemplateKey(normalizedExisting);
      return keepKeys.has(key) ? [] : [row.id];
    })
    .filter((id): id is string => Boolean(id));

  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('user_schedule_templates')
      .delete()
      .eq('user_id', userId)
      .eq('source', 'manual')
      .in('id', staleIds);

    if (deleteError) {
      console.error('週次テンプレ整理エラー:', deleteError);
      return {
        // upsert 自体は成功しているため、整理失敗は警告として扱う。
        success: true,
        message:
          '週ごとの用事は保存されましたが、一部の古いデータの整理に失敗しました。時間をおいてページを再読み込みしてください。',
        updatedCount: payload.length,
      };
    }
  }

  return { success: true, updatedCount: payload.length };
}
