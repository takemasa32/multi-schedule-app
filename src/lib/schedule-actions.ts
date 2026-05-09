'use server';

import { getAuthSession } from '@/lib/auth';
import { createSupabaseAdmin } from '@/lib/supabase';
import {
  computeAutoFillAvailability,
  isFutureScheduleDate,
  isRangeOverlapping,
  toComparableDate,
  toTokyoWallClockDate,
  toWallClockUtcIso,
  type ScheduleBlock,
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

const computeAccountBlockAutoFill = ({
  start,
  end,
  blocks,
}: {
  start: string;
  end: string;
  blocks: ScheduleBlock[];
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
    return computeAutoFillAvailability({
      start,
      end,
      blocks: overlappingBlocks,
      templates: [],
    });
  }

  return null;
};

type SyncPreviewBuildOptions = {
  targetEventIds?: string[];
  excludeEventId?: string;
};

type SyncPreviewLink = {
  event_id: string;
  participant_id: string;
};

type SyncPreviewContext = {
  links: SyncPreviewLink[];
  eventsMap: Map<
    string,
    {
      id: string;
      title: string;
      public_token: string;
      is_finalized: boolean;
    }
  >;
  blocks: ScheduleBlock[];
  busyIntervals: Array<{ event_id: string; start_time: string; end_time: string }>;
  eventDatesByEventId: Map<string, EventDateRange[]>;
  protectedDateIdsByEventId: Map<string, Set<string>>;
  currentAvailabilitiesByParticipantId: Map<string, Map<string, boolean>>;
};

const buildSyncPreviewContext = async (
  userId: string,
  options?: SyncPreviewBuildOptions,
): Promise<SyncPreviewContext> => {
  const supabase = createSupabaseAdmin();

  const { data: allLinks, error: linkError } = await supabase
    .from('user_event_links')
    .select('event_id,participant_id')
    .eq('user_id', userId);

  if (linkError || !allLinks) {
    console.error('イベント紐付け取得エラー:', linkError);
    return {
      links: [],
      eventsMap: new Map(),
      blocks: [],
      busyIntervals: [],
      eventDatesByEventId: new Map(),
      protectedDateIdsByEventId: new Map(),
      currentAvailabilitiesByParticipantId: new Map(),
    };
  }

  const targetSet =
    options?.targetEventIds && options.targetEventIds.length > 0
      ? new Set(options.targetEventIds)
      : null;
  const links = allLinks
    .filter(
      (
        row,
      ): row is {
        event_id: string;
        participant_id: string;
      } => Boolean(row.event_id) && Boolean(row.participant_id),
    )
    .filter((row) => !targetSet || targetSet.has(row.event_id))
    .filter((row) => (options?.excludeEventId ? row.event_id !== options.excludeEventId : true));

  if (links.length === 0) {
    return {
      links: [],
      eventsMap: new Map(),
      blocks: [],
      busyIntervals: [],
      eventDatesByEventId: new Map(),
      protectedDateIdsByEventId: new Map(),
      currentAvailabilitiesByParticipantId: new Map(),
    };
  }

  const allEventIds = Array.from(new Set(allLinks.map((row) => row.event_id).filter(Boolean)));
  const scopedEventIds = Array.from(new Set(links.map((row) => row.event_id)));
  const scopedParticipantIds = Array.from(new Set(links.map((row) => row.participant_id)));

  const { data: blocks } = await supabase
    .from('user_schedule_blocks')
    .select('start_time,end_time,availability')
    .eq('user_id', userId);

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

  const { data: eventsData, error: eventsError } = await supabase
    .from('events')
    .select('id,title,public_token,is_finalized')
    .in('id', scopedEventIds);
  if (eventsError) {
    console.error('イベント情報取得エラー:', eventsError);
  }
  const eventsMap = new Map((eventsData ?? []).map((row) => [row.id, row]));

  const { data: allEventDates, error: datesError } = await supabase
    .from('event_dates')
    .select('id,event_id,start_time,end_time')
    .in('event_id', scopedEventIds)
    .order('start_time', { ascending: true });
  if (datesError) {
    console.error('イベント日程取得エラー:', datesError);
  }
  const eventDatesByEventId = new Map<string, EventDateRange[]>();
  (allEventDates ?? []).forEach((row) => {
    const current = eventDatesByEventId.get(row.event_id) ?? [];
    current.push({
      id: row.id,
      start_time: row.start_time,
      end_time: row.end_time,
    });
    eventDatesByEventId.set(row.event_id, current);
  });

  const { data: overrides, error: overridesError } = await supabase
    .from('user_event_availability_overrides')
    .select('event_id,event_date_id')
    .eq('user_id', userId)
    .in('event_id', scopedEventIds);
  if (overridesError) {
    console.error('上書き情報取得エラー:', overridesError);
  }
  const protectedDateIdsByEventId = new Map<string, Set<string>>();
  (overrides ?? []).forEach((row) => {
    const set = protectedDateIdsByEventId.get(row.event_id) ?? new Set<string>();
    set.add(row.event_date_id);
    protectedDateIdsByEventId.set(row.event_id, set);
  });

  const { data: currentAvailabilities, error: currentAvailabilitiesError } = await supabase
    .from('availabilities')
    .select('participant_id,event_date_id,availability')
    .in('participant_id', scopedParticipantIds);
  if (currentAvailabilitiesError) {
    console.error('現在回答取得エラー:', currentAvailabilitiesError);
  }
  const currentAvailabilitiesByParticipantId = new Map<string, Map<string, boolean>>();
  (currentAvailabilities ?? []).forEach((row) => {
    const map = currentAvailabilitiesByParticipantId.get(row.participant_id) ?? new Map();
    map.set(row.event_date_id, row.availability);
    currentAvailabilitiesByParticipantId.set(row.participant_id, map);
  });

  return {
    links,
    eventsMap,
    blocks: (blocks ?? []) as ScheduleBlock[],
    busyIntervals,
    eventDatesByEventId,
    protectedDateIdsByEventId,
    currentAvailabilitiesByParticipantId,
  };
};

const buildUserAvailabilitySyncPreview = async (
  userId: string,
  options?: SyncPreviewBuildOptions,
): Promise<UserAvailabilitySyncPreviewEvent[]> => {
  const context = await buildSyncPreviewContext(userId, options);
  if (context.links.length === 0) return [];

  const previewEvents: UserAvailabilitySyncPreviewEvent[] = [];
  const now = toTokyoWallClockDate();

  for (const link of context.links) {
    const eventInfo = context.eventsMap.get(link.event_id);
    if (!eventInfo) continue;
    const eventDates = (context.eventDatesByEventId.get(link.event_id) ?? []).filter((date) =>
      isFutureScheduleDate(date, now),
    );
    if (eventDates.length === 0) continue;
    const protectedSet = context.protectedDateIdsByEventId.get(link.event_id) ?? new Set<string>();
    const currentMap =
      context.currentAvailabilitiesByParticipantId.get(link.participant_id) ??
      new Map<string, boolean>();

    const dates: SyncPreviewDateRow[] = eventDates.map((date) => {
      const currentAvailability = currentMap.get(date.id) ?? false;

      let desiredAvailability = currentAvailability;
      const hasBusyOverlap = context.busyIntervals.some((busy) => {
        if (busy.event_id === link.event_id) return false;
        return isRangeOverlapping(
          { start: new Date(date.start_time), end: new Date(date.end_time) },
          { start: new Date(busy.start_time), end: new Date(busy.end_time) },
        );
      });

      if (hasBusyOverlap) {
        desiredAvailability = false;
      } else {
        const auto = computeAccountBlockAutoFill({
          start: date.start_time,
          end: date.end_time,
          blocks: context.blocks,
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
    const result = computeAccountBlockAutoFill({
      start: date.start_time,
      end: date.end_time,
      blocks: (blocks ?? []) as ScheduleBlock[],
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
  const targetEventIds = Array.from(new Set(links.map((link) => link.event_id)));
  const participantIds = Array.from(new Set(links.map((link) => link.participant_id)));

  const { data: blocks } = await supabase
    .from('user_schedule_blocks')
    .select('start_time,end_time,availability')
    .eq('user_id', userId);

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

  const { data: eventDatesRows, error: eventDatesError } = await supabase
    .from('event_dates')
    .select('id,event_id,start_time,end_time')
    .in('event_id', targetEventIds);
  if (eventDatesError) {
    console.error('イベント日程取得エラー:', eventDatesError);
    return;
  }
  const eventDatesByEventId = new Map<string, EventDateRange[]>();
  (eventDatesRows ?? []).forEach((row) => {
    const current = eventDatesByEventId.get(row.event_id) ?? [];
    current.push({
      id: row.id,
      start_time: row.start_time,
      end_time: row.end_time,
    });
    eventDatesByEventId.set(row.event_id, current);
  });

  const { data: overridesRows, error: overridesError } = await supabase
    .from('user_event_availability_overrides')
    .select('event_id,event_date_id,availability')
    .eq('user_id', userId)
    .in('event_id', targetEventIds);
  if (overridesError) {
    console.error('上書き情報取得エラー:', overridesError);
  }
  const overrideMapByEventId = new Map<string, Map<string, boolean>>();
  (overridesRows ?? []).forEach((row) => {
    const map = overrideMapByEventId.get(row.event_id) ?? new Map<string, boolean>();
    map.set(row.event_date_id, row.availability);
    overrideMapByEventId.set(row.event_id, map);
  });

  const { data: currentAvailabilitiesRows, error: currentAvailabilitiesError } = await supabase
    .from('availabilities')
    .select('participant_id,event_date_id,availability')
    .in('participant_id', participantIds);
  if (currentAvailabilitiesError) {
    console.error('現在回答取得エラー:', currentAvailabilitiesError);
  }
  const currentAvailabilitiesByParticipantId = new Map<string, Set<string>>();
  (currentAvailabilitiesRows ?? []).forEach((row) => {
    if (!row.availability) return;
    const set = currentAvailabilitiesByParticipantId.get(row.participant_id) ?? new Set<string>();
    set.add(row.event_date_id);
    currentAvailabilitiesByParticipantId.set(row.participant_id, set);
  });

  for (const link of links) {
    const eventDates = eventDatesByEventId.get(link.event_id) ?? [];
    if (eventDates.length === 0) continue;

    const overrideMap = overrideMapByEventId.get(link.event_id) ?? new Map<string, boolean>();
    const selectedSet = new Set(
      currentAvailabilitiesByParticipantId.get(link.participant_id) ?? [],
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

      const auto = computeAccountBlockAutoFill({
        start: date.start_time,
        end: date.end_time,
        blocks: (blocks ?? []) as ScheduleBlock[],
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

export async function fetchUserAvailabilitySyncPreview(
  options?: SyncPreviewBuildOptions,
): Promise<UserAvailabilitySyncPreviewEvent[]> {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) return [];
  return buildUserAvailabilitySyncPreview(userId, options);
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

  const previewEvents = await buildUserAvailabilitySyncPreview(userId, {
    targetEventIds: [eventId],
  });
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

  const previewDateIds = new Set(target.dates.map((row) => row.eventDateId));
  const { data: existingAvailabilities, error: existingAvailabilitiesError } = await supabase
    .from('availabilities')
    .select('event_date_id,availability')
    .eq('event_id', eventId)
    .eq('participant_id', link.participant_id);

  if (existingAvailabilitiesError) {
    console.error('既存回答取得エラー:', existingAvailabilitiesError);
    return { success: false, message: '既存回答の取得に失敗しました', updatedCount: 0 };
  }

  const preservedSelectedDates = (existingAvailabilities ?? [])
    .filter((row) => row.availability && !previewDateIds.has(row.event_date_id))
    .map((row) => row.event_date_id);

  const payloadDateIds = Array.from(new Set([...preservedSelectedDates, ...selectedDates]));
  const payload = payloadDateIds.map((eventDateId) => ({
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

/**
 * 日付ブロックの変更を一括保存する
 * クライアントからは1回のServer Action呼び出しで反映し、待ち時間を短縮する。
 */
export async function saveUserScheduleBlockChanges({
  upserts,
  deleteIds,
}: {
  upserts: Array<{
    startTime: string;
    endTime: string;
    availability: boolean;
    replaceBlockId?: string;
  }>;
  deleteIds: string[];
}): Promise<{ success: boolean; message?: string; updatedCount: number }> {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, message: 'ログインが必要です', updatedCount: 0 };
  }

  const supabase = createSupabaseAdmin();
  const deleteTargetIds = new Set(deleteIds);
  const payload: Array<{
    user_id: string;
    start_time: string;
    end_time: string;
    availability: boolean;
    source: string;
    event_id: string | null;
    updated_at: string;
  }> = [];

  for (const row of upserts) {
    if (row.replaceBlockId) {
      deleteTargetIds.add(row.replaceBlockId);
    }

    const normalizedRange = normalizeManualBlockRange({
      startTime: row.startTime,
      endTime: row.endTime,
    });
    const startDate = toComparableDate(normalizedRange.startTime);
    const endDate = toComparableDate(normalizedRange.endTime);
    if (
      !normalizedRange.startTime ||
      !normalizedRange.endTime ||
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      startDate >= endDate
    ) {
      return {
        success: false,
        message: '時間帯の指定が正しくありません',
        updatedCount: 0,
      };
    }

    const ranges = splitToHourlyRanges(normalizedRange.startTime, normalizedRange.endTime);
    if (ranges.length === 0) {
      return {
        success: false,
        message: '時間帯の指定が正しくありません',
        updatedCount: 0,
      };
    }

    payload.push(
      ...ranges.map((range) => ({
        user_id: userId,
        start_time: toWallClockUtcIso(range.start),
        end_time: toWallClockUtcIso(range.end),
        availability: row.availability,
        source: 'manual',
        event_id: null,
        updated_at: new Date().toISOString(),
      })),
    );
  }

  const deleteIdList = Array.from(deleteTargetIds);
  if (deleteIdList.length > 0) {
    const { error: deleteError } = await supabase
      .from('user_schedule_blocks')
      .delete()
      .eq('user_id', userId)
      .in('id', deleteIdList);
    if (deleteError) {
      console.error('予定ブロック一括削除エラー:', deleteError);
      return {
        success: false,
        message: '予定ブロックの更新に失敗しました',
        updatedCount: 0,
      };
    }
  }

  if (payload.length > 0) {
    const { error: upsertError } = await supabase
      .from('user_schedule_blocks')
      .upsert(payload, { onConflict: 'user_id,start_time,end_time' });
    if (upsertError) {
      console.error('予定ブロック一括更新エラー:', upsertError);
      return {
        success: false,
        message: '予定ブロックの更新に失敗しました',
        updatedCount: 0,
      };
    }
  }

  return { success: true, updatedCount: payload.length };
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
