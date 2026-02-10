'use server';

import { getAuthSession } from '@/lib/auth';
import { createSupabaseAdmin } from '@/lib/supabase';
import {
  computeAutoFillAvailability,
  isRangeOverlapping,
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
  overrideDateIds: string[];
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
    start: new Date(start),
    end: new Date(end),
  };
  const overlappingBlocks = blocks.filter((block) =>
    isRangeOverlapping(targetRange, {
      start: new Date(block.start_time),
      end: new Date(block.end_time),
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
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    startDate >= endDate
  ) {
    return [];
  }

  const result: Array<{ start: string; end: string }> = [];
  let cursor = new Date(startDate);
  while (cursor < endDate) {
    const next = new Date(cursor.getTime() + 60 * 60 * 1000);
    const chunkEnd = next < endDate ? next : endDate;
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
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      isAuthenticated: false,
      hasSyncTargetEvents: false,
      lockedDateIds: [],
      autoFillAvailabilities: {},
      overrideDateIds: [],
    };
  }

  const supabase = createSupabaseAdmin();
  if (eventDates.length === 0) {
    return {
      isAuthenticated: true,
      hasSyncTargetEvents: false,
      lockedDateIds: [],
      autoFillAvailabilities: {},
      overrideDateIds: [],
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

  eventDates.forEach((date) => {
    if (lockedSet.has(date.id)) return;
    const result = computeAutoFillWithPriority({
      start: date.start_time,
      end: date.end_time,
      blocks: (blocks ?? []) as ScheduleBlock[],
      templates: (templates ?? []) as ScheduleTemplate[],
    });
    if (result !== null) {
      autoFillAvailabilities[date.id] = result;
    }
  });

  return {
    isAuthenticated: true,
    hasSyncTargetEvents,
    lockedDateIds,
    autoFillAvailabilities,
    overrideDateIds,
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
}): Promise<void> {
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
  }
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
      start_time: range.start,
      end_time: range.end,
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
  if (overrideDateIds.length === 0) return;
  const selectedSet = new Set(selectedDateIds);
  const payload = overrideDateIds.map((dateId) => ({
    user_id: userId,
    event_id: eventId,
    event_date_id: dateId,
    availability: selectedSet.has(dateId),
    reason: 'conflict_override',
    updated_at: new Date().toISOString(),
  }));

  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from('user_event_availability_overrides')
    .upsert(payload, { onConflict: 'user_id,event_id,event_date_id' });

  if (error) {
    console.error('上書き情報の保存に失敗しました:', error);
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

  if (!startTime || !endTime || startTime >= endTime) {
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

  const ranges = splitToHourlyRanges(startTime, endTime);
  if (ranges.length === 0) {
    return { success: false, message: '時間帯の指定が正しくありません' };
  }

  const payload = ranges.map((range) => ({
    user_id: userId,
    start_time: range.start,
    end_time: range.end,
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

  const normalized = templates.filter(
    (row) =>
      Number.isInteger(row.weekday) &&
      row.weekday >= 0 &&
      row.weekday <= 6 &&
      row.startTime &&
      row.endTime &&
      row.startTime < row.endTime,
  );
  if (!normalized.length) {
    return { success: false, message: '曜日ごとの設定が不正です', updatedCount: 0 };
  }

  const supabase = createSupabaseAdmin();
  const payload = normalized.map((row) => ({
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
    return { success: false, message: '週ごとの用事の更新に失敗しました', updatedCount: 0 };
  }

  return { success: true, updatedCount: payload.length };
}
