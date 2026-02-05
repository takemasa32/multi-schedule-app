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

const toKey = (weekday: number, startTime: string, endTime: string) =>
  `${weekday}_${startTime}_${endTime}`;

export async function getUserScheduleContext(
  eventId: string,
  eventDates: EventDateRange[],
): Promise<ScheduleContext> {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      isAuthenticated: false,
      lockedDateIds: [],
      autoFillAvailabilities: {},
      overrideDateIds: [],
    };
  }

  const supabase = createSupabaseAdmin();
  if (eventDates.length === 0) {
    return {
      isAuthenticated: true,
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
    .eq('user_id', userId);

  if (templatesError) {
    console.error('予定テンプレ取得エラー:', templatesError);
  }

  const { data: linkEvents } = await supabase
    .from('user_event_links')
    .select('event_id')
    .eq('user_id', userId);

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
    .filter((row): row is { event_id: string; start_time: string; end_time: string } => Boolean(row));

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
    const result = computeAutoFillAvailability({
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
  const payload = eventDates.map((date) => ({
    user_id: userId,
    start_time: date.start_time,
    end_time: date.end_time,
    availability: selectedSet.has(date.id),
    source: 'event',
    event_id: eventId,
    updated_at: new Date().toISOString(),
  }));

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
  if (eventDates.length === 0) return;

  const supabase = createSupabaseAdmin();
  const { data: templates, error } = await supabase
    .from('user_schedule_templates')
    .select('id,weekday,start_time,end_time,availability,source,sample_count')
    .eq('user_id', userId);

  if (error) {
    console.error('テンプレ取得エラー:', error);
    return;
  }

  const manualKeys = new Set<string>();
  const learnedMap = new Map<string, UserScheduleTemplateRow>();

  (templates ?? []).forEach((template) => {
    const key = toKey(template.weekday, template.start_time, template.end_time);
    if (template.source === 'manual') {
      manualKeys.add(key);
    } else {
      learnedMap.set(key, template);
    }
  });

  const selectedSet = new Set(selectedDateIds);
  const updates: UserScheduleTemplateRow[] = [];
  const inserts: Array<{
    weekday: number;
    start_time: string;
    end_time: string;
    availability: boolean;
    sample_count: number;
    updated_at: string;
  }> = [];

  eventDates.forEach((date) => {
    const start = new Date(date.start_time);
    const end = new Date(date.end_time);
    const weekday = start.getDay();
    const startTime = `${String(start.getHours()).padStart(2, '0')}:${String(
      start.getMinutes(),
    ).padStart(2, '0')}`;
    const endTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(
      2,
      '0',
    )}`;
    const key = toKey(weekday, startTime, endTime);
    if (manualKeys.has(key)) {
      return;
    }

    const availability = selectedSet.has(date.id);
    const existing = learnedMap.get(key);
    if (!existing) {
      inserts.push({
        weekday,
        start_time: startTime,
        end_time: endTime,
        availability,
        sample_count: 1,
        updated_at: new Date().toISOString(),
      });
      return;
    }

    let nextAvailability = existing.availability;
    let nextSample = existing.sample_count;
    if (existing.availability === availability) {
      nextSample += 1;
    } else {
      nextSample -= 1;
      if (nextSample <= 0) {
        nextAvailability = availability;
        nextSample = 1;
      }
    }

    updates.push({
      ...existing,
      availability: nextAvailability,
      sample_count: nextSample,
      updated_at: new Date().toISOString(),
    });
  });

  for (const record of inserts) {
    const { error: insertError } = await supabase.from('user_schedule_templates').insert({
      user_id: userId,
      weekday: record.weekday,
      start_time: record.start_time,
      end_time: record.end_time,
      availability: record.availability,
      source: 'learned',
      sample_count: record.sample_count,
      updated_at: record.updated_at,
    });
    if (insertError) {
      console.error('テンプレ追加エラー:', insertError);
    }
  }

  for (const record of updates) {
    const { error: updateError } = await supabase
      .from('user_schedule_templates')
      .update({
        availability: record.availability,
        sample_count: record.sample_count,
        updated_at: record.updated_at,
      })
      .eq('id', record.id);
    if (updateError) {
      console.error('テンプレ更新エラー:', updateError);
    }
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

  const links = (allLinks ?? []).filter((link) => {
    if (!link.participant_id) return false;
    if (scope === 'current') {
      return currentEventId ? link.event_id === currentEventId : false;
    }
    if (currentEventId) {
      return link.event_id !== currentEventId;
    }
    return true;
  });

  if (links.length === 0) return;

  const allEventIds = (allLinks ?? []).map((link) => link.event_id);

  const { data: blocks } = await supabase
    .from('user_schedule_blocks')
    .select('start_time,end_time,availability')
    .eq('user_id', userId);

  const { data: templates } = await supabase
    .from('user_schedule_templates')
    .select('weekday,start_time,end_time,availability,source,sample_count')
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
    .filter((row): row is { event_id: string; start_time: string; end_time: string } => Boolean(row));

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

      const auto = computeAutoFillAvailability({
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
    learned: data.filter((row) => row.source !== 'manual'),
  };
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
