'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  applyUserAvailabilitySyncForEvent,
  fetchUserAvailabilitySyncPreview,
  fetchUserScheduleBlocks,
  saveUserScheduleBlockChanges,
  type UserAvailabilitySyncPreviewEvent,
} from '@/lib/schedule-actions';
import { toComparableDate } from '@/lib/schedule-utils';
import { addDays, endOfWeek, startOfWeek } from 'date-fns';
import WeekNavigationBar from '@/components/week-navigation-bar';

type ScheduleBlock = {
  id: string;
  start_time: string;
  end_time: string;
  availability: boolean;
  source: string;
  event_id: string | null;
  updated_at?: string;
};

type CellState = 'available' | 'unavailable' | 'empty';

type BlockCell = {
  id?: string;
  availability: boolean;
  source: string;
};

const normalizeTime = (value: string): string => {
  const matched = value.match(/^(\d{2}:\d{2})/);
  return matched ? matched[1] : value;
};

const toLocalDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

const toLocalTimeKey = (date: Date): string =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

const toDisplayTimeRangeKey = (start: Date, end: Date): string => {
  const startTime = toLocalTimeKey(start);
  const endTime = toLocalTimeKey(end);
  const spansNextDay = toLocalDateKey(start) !== toLocalDateKey(end);

  // 24:00終了として表示し、日付またぎの終端を明確にする。
  if (spansNextDay && endTime === '00:00') {
    return `${startTime}-24:00`;
  }

  return `${startTime}-${endTime}`;
};

const toBlockCellKey = (dateKey: string, timeKey: string) => `${dateKey}_${timeKey}`;

const parseBlockCellKey = (
  key: string,
): { dateKey: string; startTime: string; endTime: string } | null => {
  const [dateKey, range] = key.split('_');
  const [startTime, endTime] = (range ?? '').split('-');
  if (!dateKey || !startTime || !endTime) return null;
  return { dateKey, startTime: normalizeTime(startTime), endTime: normalizeTime(endTime) };
};

const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const resolveDatedBlockDateTimeRange = ({
  dateKey,
  startTime,
  endTime,
}: {
  dateKey: string;
  startTime: string;
  endTime: string;
}): { startDateTime: string; endDateTime: string } => {
  const startDate = new Date(`${dateKey}T00:00:00`);
  const endDate = new Date(startDate);
  const normalizedEndTime = endTime === '24:00' ? '00:00' : endTime;

  // 終了時刻が開始時刻より前、または24:00指定なら翌日終了として扱う。
  if (endTime === '24:00' || toMinutes(normalizedEndTime) < toMinutes(startTime)) {
    endDate.setDate(endDate.getDate() + 1);
  }

  const endDateKey = toLocalDateKey(endDate);

  return {
    startDateTime: `${dateKey}T${startTime}:00`,
    endDateTime: `${endDateKey}T${normalizedEndTime}:00`,
  };
};

const toTimeString = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const DATED_UPDATE_SUCCESS_MESSAGE = '予定一括管理を更新しました';

const buildSyncPreviewMatrix = (event: UserAvailabilitySyncPreviewEvent) => {
  const dateKeys = new Set<string>();
  const timeKeys = new Set<string>();
  const map: Record<string, (typeof event.dates)[number]> = {};

  event.dates.forEach((row) => {
    const start = new Date(row.startTime);
    const end = new Date(row.endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
    const dateKey = toLocalDateKey(start);
    const timeKey = toDisplayTimeRangeKey(start, end);
    dateKeys.add(dateKey);
    timeKeys.add(timeKey);
    map[`${dateKey}_${timeKey}`] = row;
  });

  const sortedDates = Array.from(dateKeys).sort();
  const sortedTimes = Array.from(timeKeys).sort(
    (a, b) => toMinutes(a.split('-')[0]) - toMinutes(b.split('-')[0]),
  );

  return { sortedDates, sortedTimes, map };
};

const toWeeklyDateBuckets = (dateKeys: string[]): string[][] => {
  if (dateKeys.length === 0) return [];
  const firstWeekStart = startOfWeek(new Date(`${dateKeys[0]}T00:00:00`), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(new Date(`${dateKeys[dateKeys.length - 1]}T00:00:00`), {
    weekStartsOn: 1,
  });

  const buckets: string[][] = [];
  for (
    let cursor = new Date(firstWeekStart);
    cursor.getTime() <= lastWeekEnd.getTime();
    cursor = addDays(cursor, 7)
  ) {
    const week: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      const date = addDays(cursor, i);
      week.push(toLocalDateKey(date));
    }
    buckets.push(week);
  }
  return buckets;
};

const resolveInitialSyncPreviewWeekPage = (event: UserAvailabilitySyncPreviewEvent): number => {
  const matrix = buildSyncPreviewMatrix(event);
  const dateBuckets = toWeeklyDateBuckets(matrix.sortedDates);
  if (dateBuckets.length === 0) return 0;

  const changedDateKeys = event.dates
    .filter((row) => row.willChange)
    .map((row) => {
      const start = new Date(row.startTime);
      return Number.isNaN(start.getTime()) ? null : toLocalDateKey(start);
    })
    .filter((key): key is string => key !== null)
    .sort();

  const firstChangedDateKey = changedDateKeys[0];
  if (!firstChangedDateKey) return 0;

  const page = dateBuckets.findIndex((week) => week.includes(firstChangedDateKey));
  return page >= 0 ? page : 0;
};

const buildInitialSyncPreviewWeekPageMap = (
  events: UserAvailabilitySyncPreviewEvent[],
): Record<string, number> =>
  Object.fromEntries(
    events.map((event) => [event.eventId, resolveInitialSyncPreviewWeekPage(event)]),
  );

const reconcileEventAfterApply = ({
  event,
  selectedAvailabilities,
  overwriteProtected,
}: {
  event: UserAvailabilitySyncPreviewEvent;
  selectedAvailabilities: Record<string, boolean>;
  overwriteProtected: boolean;
}): UserAvailabilitySyncPreviewEvent => {
  const dates = event.dates.map((row) => {
    const requested =
      row.eventDateId in selectedAvailabilities
        ? selectedAvailabilities[row.eventDateId]
        : row.desiredAvailability;

    const nextCurrentAvailability =
      row.isProtected && !overwriteProtected ? row.currentAvailability : requested;
    const nextWillChange = nextCurrentAvailability !== row.desiredAvailability;

    return {
      ...row,
      currentAvailability: nextCurrentAvailability,
      willChange: nextWillChange,
    };
  });

  const total = dates.filter((row) => row.willChange).length;

  return {
    ...event,
    dates,
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
  };
};

type AccountScheduleTemplatesProps = {
  initialIsAuthenticated?: boolean;
};

export default function AccountScheduleTemplates({
  initialIsAuthenticated = false,
}: AccountScheduleTemplatesProps) {
  const { status } = useSession();
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [isLoading, setIsLoading] = useState(initialIsAuthenticated || status === 'authenticated');

  const [datedEditing, setDatedEditing] = useState(false);
  const [datedSaving, setDatedSaving] = useState(false);
  const [datedDraftMap, setDatedDraftMap] = useState<Record<string, CellState>>({});
  const [datedMessage, setDatedMessage] = useState<string | null>(null);
  const [blockPage, setBlockPage] = useState<number | null>(null);
  const [syncPreviewEvents, setSyncPreviewEvents] = useState<UserAvailabilitySyncPreviewEvent[]>(
    [],
  );
  const [syncCellSelectionMap, setSyncCellSelectionMap] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [syncPreviewWeekPageMap, setSyncPreviewWeekPageMap] = useState<Record<string, number>>({});
  const [syncOverwriteMap, setSyncOverwriteMap] = useState<Record<string, boolean>>({});
  const [syncAllowFinalizedMap, setSyncAllowFinalizedMap] = useState<Record<string, boolean>>({});
  const [syncMessageMap, setSyncMessageMap] = useState<Record<string, string>>({});
  const [isSyncPreviewLoading, setIsSyncPreviewLoading] = useState(false);
  const [syncPreviewMessage, setSyncPreviewMessage] = useState<string | null>(null);
  const [syncApplyingEventIds, setSyncApplyingEventIds] = useState<Set<string>>(new Set());
  const [hasLoadedSyncPreview, setHasLoadedSyncPreview] = useState(false);
  const syncApplyingEventIdsRef = useRef<Set<string>>(new Set());
  const syncSectionRef = useRef<HTMLDivElement | null>(null);

  const isAuthenticated =
    status === 'authenticated' || (status === 'loading' && initialIsAuthenticated);

  const loadAll = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const blocksData = await fetchUserScheduleBlocks();
      setScheduleBlocks(blocksData);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (datedMessage !== DATED_UPDATE_SUCCESS_MESSAGE) return;
    const timerId = window.setTimeout(() => {
      setDatedMessage(null);
    }, 4000);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [datedMessage]);

  const loadSyncPreview = useCallback(async (): Promise<UserAvailabilitySyncPreviewEvent[]> => {
    setIsSyncPreviewLoading(true);
    setHasLoadedSyncPreview(true);
    setSyncPreviewMessage(null);
    try {
      const preview = await fetchUserAvailabilitySyncPreview();
      setSyncPreviewEvents(preview);
      setSyncCellSelectionMap(
        Object.fromEntries(
          preview.map((row) => [
            row.eventId,
            Object.fromEntries(row.dates.map((date) => [date.eventDateId, date.desiredAvailability])),
          ]),
        ),
      );
      setSyncPreviewWeekPageMap(buildInitialSyncPreviewWeekPageMap(preview));
      setSyncOverwriteMap(Object.fromEntries(preview.map((row) => [row.eventId, false])));
      setSyncAllowFinalizedMap(Object.fromEntries(preview.map((row) => [row.eventId, false])));
      setSyncMessageMap({});
      if (preview.length === 0) {
        setSyncPreviewMessage(
          '変更対象のイベントはありません（ログイン後に回答したイベントが未登録、または差分がありません）',
        );
      }
      return preview;
    } catch (error) {
      console.error('反映対象取得エラー:', error);
      setSyncPreviewMessage(
        '反映対象の取得に失敗しました。時間をおいて再度お試しください。',
      );
      return [];
    } finally {
      setIsSyncPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (
      !hasLoadedSyncPreview ||
      isSyncPreviewLoading ||
      syncApplyingEventIds.size > 0 ||
      syncPreviewEvents.length > 0
    ) {
      return;
    }
    setSyncPreviewMessage(
      '変更対象のイベントはありません（ログイン後に回答したイベントが未登録、または差分がありません）',
    );
  }, [hasLoadedSyncPreview, isSyncPreviewLoading, syncApplyingEventIds.size, syncPreviewEvents.length]);

  const handleApplySyncEvent = useCallback(
    async (eventId: string) => {
      if (syncApplyingEventIdsRef.current.has(eventId)) return;

      syncApplyingEventIdsRef.current.add(eventId);
      setSyncApplyingEventIds((prev) => {
        const next = new Set(prev);
        next.add(eventId);
        return next;
      });

      try {
        const selectedAvailabilities = syncCellSelectionMap[eventId] ?? {};
        const overwriteProtected = syncOverwriteMap[eventId] ?? false;
        const allowFinalized = syncAllowFinalizedMap[eventId] ?? false;

        const result = await applyUserAvailabilitySyncForEvent({
          eventId,
          selectedAvailabilities,
          overwriteProtected,
          allowFinalized,
        });

        setSyncMessageMap((prev) => ({
          ...prev,
          [eventId]: result.message,
        }));

        if (!result.success) return;

        setSyncPreviewEvents((prev) =>
          prev.flatMap((event) => {
            if (event.eventId !== eventId) return [event];
            const reconciled = reconcileEventAfterApply({
              event,
              selectedAvailabilities,
              overwriteProtected,
            });
            return reconciled.changes.total > 0 ? [reconciled] : [];
          }),
        );
        setSyncCellSelectionMap((prev) => {
          const next = { ...prev };
          delete next[eventId];
          return next;
        });
        setSyncPreviewWeekPageMap((prev) => {
          const next = { ...prev };
          delete next[eventId];
          return next;
        });
        setSyncOverwriteMap((prev) => {
          const next = { ...prev };
          delete next[eventId];
          return next;
        });
        setSyncAllowFinalizedMap((prev) => {
          const next = { ...prev };
          delete next[eventId];
          return next;
        });
      } finally {
        syncApplyingEventIdsRef.current.delete(eventId);
        setSyncApplyingEventIds((prev) => {
          const next = new Set(prev);
          next.delete(eventId);
          return next;
        });
      }
    },
    [syncAllowFinalizedMap, syncCellSelectionMap, syncOverwriteMap],
  );

  const handleCancelSyncEvent = useCallback((eventId: string) => {
    setSyncPreviewEvents((prev) => prev.filter((event) => event.eventId !== eventId));
    setSyncCellSelectionMap((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
    setSyncPreviewWeekPageMap((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
    setSyncOverwriteMap((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
    setSyncAllowFinalizedMap((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
    setSyncMessageMap((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
  }, []);

  const blockCalendarData = useMemo(() => {
    const dateKeys = new Set<string>();
    const timeKeys = new Set<string>();
    const dateMap: Record<string, Record<string, BlockCell>> = {};

    scheduleBlocks.forEach((block) => {
      const start = toComparableDate(block.start_time);
      const end = toComparableDate(block.end_time);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

      const dateKey = toLocalDateKey(start);
      const timeKey = toDisplayTimeRangeKey(start, end);
      dateKeys.add(dateKey);
      timeKeys.add(timeKey);
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = {};
      }
      dateMap[dateKey][timeKey] = {
        id: block.id,
        availability: block.availability,
        source: block.source,
      };
    });

    return {
      dateKeys: Array.from(dateKeys).sort(),
      timeKeys: Array.from(timeKeys).sort(),
      dateMap,
    };
  }, [scheduleBlocks]);

  const weeklyDateBuckets = useMemo(() => {
    if (blockCalendarData.dateKeys.length === 0) return [] as string[][];
    const today = new Date();
    const todayWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const todayWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const firstWeekStart = startOfWeek(new Date(`${blockCalendarData.dateKeys[0]}T00:00:00`), {
      weekStartsOn: 1,
    });
    const lastWeekEnd = endOfWeek(
      new Date(`${blockCalendarData.dateKeys[blockCalendarData.dateKeys.length - 1]}T00:00:00`),
      { weekStartsOn: 1 },
    );
    const rangeStart =
      firstWeekStart.getTime() <= todayWeekStart.getTime() ? firstWeekStart : todayWeekStart;
    const rangeEnd = lastWeekEnd.getTime() >= todayWeekEnd.getTime() ? lastWeekEnd : todayWeekEnd;
    const buckets: string[][] = [];
    for (
      let cursor = new Date(rangeStart);
      cursor.getTime() <= rangeEnd.getTime();
      cursor = addDays(cursor, 7)
    ) {
      const week: string[] = [];
      for (let i = 0; i < 7; i += 1) {
        const date = addDays(cursor, i);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          '0',
        )}-${String(date.getDate()).padStart(2, '0')}`;
        week.push(key);
      }
      buckets.push(week);
    }
    return buckets;
  }, [blockCalendarData.dateKeys]);

  useEffect(() => {
    if (weeklyDateBuckets.length === 0) {
      setBlockPage(null);
      return;
    }
    if (blockPage !== null && blockPage >= weeklyDateBuckets.length) {
      setBlockPage(weeklyDateBuckets.length - 1);
    }
  }, [blockPage, weeklyDateBuckets.length]);

  const todayDateKey = useMemo(() => toLocalDateKey(new Date()), []);
  const initialBlockPage = useMemo(
    () => weeklyDateBuckets.findIndex((week) => week.includes(todayDateKey)),
    [todayDateKey, weeklyDateBuckets],
  );
  const resolvedBlockPage =
    blockPage ??
    (initialBlockPage >= 0 ? initialBlockPage : Math.max(weeklyDateBuckets.length - 1, 0));

  const visibleBlockDates = useMemo(
    () => weeklyDateBuckets[Math.max(0, resolvedBlockPage)] ?? [],
    [resolvedBlockPage, weeklyDateBuckets],
  );

  const datedPeriodLabel = useMemo(() => {
    if (visibleBlockDates.length === 0) return null;
    const start = new Date(`${visibleBlockDates[0]}T00:00:00`);
    const end = new Date(`${visibleBlockDates[visibleBlockDates.length - 1]}T00:00:00`);
    return `${start.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
    })} 〜 ${end.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
    })}`;
  }, [visibleBlockDates]);

  const weekTimeKeys = useMemo(() => {
    const set = new Set<string>();
    visibleBlockDates.forEach((dateKey) => {
      const entries = blockCalendarData.dateMap[dateKey] ?? {};
      Object.keys(entries).forEach((timeKey) => set.add(timeKey));
    });
    return Array.from(set).sort((a, b) => {
      const [aStart] = a.split('-');
      const [bStart] = b.split('-');
      return toMinutes(aStart) - toMinutes(bStart);
    });
  }, [blockCalendarData.dateMap, visibleBlockDates]);

  const datedDisplayRows = useMemo(() => {
    const baseRows = weekTimeKeys.map((timeKey) => ({
      label: timeKey,
      timeKeys: [timeKey],
    }));
    if (weekTimeKeys.length < 2) {
      return baseRows;
    }

    const minuteRanges = weekTimeKeys.map((timeKey) => {
      const [startTime, endTime] = timeKey.split('-');
      return {
        timeKey,
        start: toMinutes(startTime),
        end: toMinutes(endTime),
      };
    });

    const isAllOneHour = minuteRanges.every((range) => range.end - range.start === 60);
    if (!isAllOneHour || minuteRanges.length % 2 !== 0) {
      return baseRows;
    }

    for (let i = 0; i < minuteRanges.length; i += 2) {
      const first = minuteRanges[i];
      const second = minuteRanges[i + 1];
      if (!second || second.start !== first.end) {
        return baseRows;
      }

      for (const dateKey of visibleBlockDates) {
        const firstCell = blockCalendarData.dateMap[dateKey]?.[first.timeKey];
        const secondCell = blockCalendarData.dateMap[dateKey]?.[second.timeKey];
        const firstExists = Boolean(firstCell);
        const secondExists = Boolean(secondCell);
        if (firstExists !== secondExists) {
          return baseRows;
        }
        if (firstCell && secondCell && firstCell.availability !== secondCell.availability) {
          return baseRows;
        }
      }
    }

    const mergedRows: Array<{ label: string; timeKeys: string[] }> = [];
    for (let i = 0; i < minuteRanges.length; i += 2) {
      const first = minuteRanges[i];
      const second = minuteRanges[i + 1];
      mergedRows.push({
        label: `${toTimeString(first.start)}-${toTimeString(second.end)}`,
        timeKeys: [first.timeKey, second.timeKey],
      });
    }
    return mergedRows;
  }, [blockCalendarData.dateMap, visibleBlockDates, weekTimeKeys]);

  const datedLastEndLabel = useMemo(() => {
    if (datedDisplayRows.length === 0) return null;
    const [, end] = datedDisplayRows[datedDisplayRows.length - 1].label.split('-');
    return end;
  }, [datedDisplayRows]);

  const getBlockCellState = useCallback(
    (key: string): CellState => {
      if (datedEditing && key in datedDraftMap) return datedDraftMap[key];
      const parsed = parseBlockCellKey(key);
      if (!parsed) return 'empty';
      const value =
        blockCalendarData.dateMap[parsed.dateKey]?.[`${parsed.startTime}-${parsed.endTime}`];
      if (!value) return 'empty';
      return value.availability ? 'available' : 'unavailable';
    },
    [blockCalendarData.dateMap, datedDraftMap, datedEditing],
  );

  const cycleState = (state: CellState): CellState => {
    if (state === 'available') return 'unavailable';
    if (state === 'unavailable') return 'empty';
    return 'available';
  };

  const saveDated = async () => {
    setDatedMessage(null);
    setDatedSaving(true);
    const upserts: Array<{
      startTime: string;
      endTime: string;
      availability: boolean;
      replaceBlockId?: string;
    }> = [];
    const deleteIds: string[] = [];

    Object.keys(datedDraftMap).forEach((key) => {
      const parsed = parseBlockCellKey(key);
      if (!parsed) return;
      const timeKey = `${parsed.startTime}-${parsed.endTime}`;
      const current = blockCalendarData.dateMap[parsed.dateKey]?.[timeKey];
      const draft = datedDraftMap[key];

      if (draft === 'empty') {
        if (current?.id) {
          deleteIds.push(current.id);
        }
        return;
      }

      const nextAvailability = draft === 'available';
      if (current && current.availability === nextAvailability) return;
      const dateTimeRange = resolveDatedBlockDateTimeRange({
        dateKey: parsed.dateKey,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
      });

      upserts.push({
        startTime: dateTimeRange.startDateTime,
        endTime: dateTimeRange.endDateTime,
        availability: nextAvailability,
        replaceBlockId: current?.id,
      });
    });

    if (upserts.length === 0 && deleteIds.length === 0) {
      setDatedMessage('変更はありません');
      setDatedSaving(false);
      setDatedEditing(false);
      return;
    }

    const result = await saveUserScheduleBlockChanges({
      upserts,
      deleteIds,
    });
    if (!result.success) {
      setDatedMessage(result.message ?? '日付ブロックの更新に失敗しました');
      setDatedSaving(false);
      return;
    }

    setDatedSaving(false);
    setDatedEditing(false);
    setDatedMessage(DATED_UPDATE_SUCCESS_MESSAGE);
    const [, preview] = await Promise.all([loadAll(), loadSyncPreview()]);
    if (preview.length > 0) {
      setSyncPreviewMessage('変更のあるイベントを下で確認できます');
      requestAnimationFrame(() => {
        syncSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-base-200 rounded-lg p-4 text-sm text-base-content/60">
        ログインすると予定設定を管理できます。
      </div>
    );
  }

  return (
    <div
      className="bg-base-100 rounded-lg border p-4 shadow-sm"
      data-testid="account-schedule-templates"
      data-tour-id="account-schedule-templates"
    >
      <h3 className="mb-2 text-lg font-semibold">マイ予定設定</h3>
      <p className="mb-4 text-sm text-base-content/60">
        日付ごとの予定を管理し、回答済みイベントへの反映内容を確認できます。
      </p>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">予定一括管理</h4>
            {datedEditing ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => {
                    setDatedDraftMap({});
                    setDatedEditing(false);
                    setDatedMessage(null);
                  }}
                  disabled={datedSaving}
                  data-testid="dated-cancel"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => void saveDated()}
                  disabled={datedSaving}
                  data-testid="dated-save"
                >
                  {datedSaving ? '更新中...' : '更新する'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => {
                  setDatedDraftMap({});
                  setDatedEditing(true);
                  setDatedMessage(null);
                }}
                disabled={isLoading}
                data-testid="dated-edit"
                data-tour-id="account-dated-edit"
              >
                編集する
              </button>
            )}
          </div>

          {isLoading ? (
            <p className="text-sm text-base-content/60">予定データを読み込んでいます...</p>
          ) : blockCalendarData.dateKeys.length === 0 ? (
            <p className="text-sm text-base-content/60">予定データはまだありません。</p>
          ) : (
            <>
              <div className="mb-2">
                <WeekNavigationBar
                  periodLabel={datedPeriodLabel ?? '-'}
                  currentPage={resolvedBlockPage}
                  totalPages={weeklyDateBuckets.length}
                  onPageChange={setBlockPage}
                  hidePageIndicator={true}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="table-xs table w-full table-fixed border-collapse">
                  <thead>
                    <tr className="bg-base-200">
                      <th className="border-base-300 w-12 border px-1 py-2 text-center md:w-14 md:px-2 md:py-3">
                        時間
                      </th>
                      {visibleBlockDates.map((dateKey) => {
                        const date = new Date(`${dateKey}T00:00:00`);
                        return (
                          <th
                            key={dateKey}
                            className="border-base-300 border px-0.5 py-1 text-center md:px-1 md:py-2"
                          >
                            <div className="flex flex-col items-center leading-tight">
                              <span className="text-xs font-semibold md:text-sm">
                                {date.toLocaleDateString('ja-JP', {
                                  month: 'numeric',
                                  day: 'numeric',
                                })}
                              </span>
                              <span className="text-xs text-base-content/60">
                                ({date.toLocaleDateString('ja-JP', { weekday: 'short' })})
                              </span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th className="bg-base-100 border-base-300 sticky left-0 z-10 h-1 border p-0 md:h-3"></th>
                      {visibleBlockDates.map((dateKey) => (
                        <td key={`${dateKey}-spacer`} className="h-1 md:h-3" />
                      ))}
                    </tr>
                    {datedDisplayRows.map((row, rowIndex) => (
                      <tr key={row.label}>
                        <th className="bg-base-100 border-base-300 relative border px-1 py-0 text-right md:px-2">
                          <span
                            className={`absolute left-2 text-xs font-medium ${
                              rowIndex === 0 ? 'top-0' : 'top-0 -translate-y-1/2'
                            }`}
                          >
                            {row.label.split('-')[0].replace(/^0/, '')}
                          </span>
                        </th>
                        {visibleBlockDates.map((dateKey) => {
                          const keys = row.timeKeys.map((timeKey) =>
                            toBlockCellKey(dateKey, timeKey),
                          );
                          const rowCellKey = `${dateKey}_${row.label}`;
                          const state = getBlockCellState(keys[0]);
                          const className =
                            state === 'available'
                              ? 'bg-success text-success-content'
                              : state === 'unavailable'
                                ? 'bg-warning/70 text-warning-content'
                                : 'bg-base-200/40 text-base-content/40';
                          return (
                            <td key={rowCellKey} className="border-base-300 border p-0.5 md:p-1">
                              <button
                                type="button"
                                className={`mx-auto aspect-square w-7 rounded-md text-xs font-semibold md:aspect-auto md:h-10 md:w-full md:text-sm ${className}`}
                                onClick={() =>
                                  datedEditing &&
                                  setDatedDraftMap((prev) => ({
                                    ...prev,
                                    ...Object.fromEntries(
                                      keys.map((key) => [
                                        key,
                                        cycleState(prev[key] ?? getBlockCellState(key)),
                                      ]),
                                    ),
                                  }))
                                }
                                disabled={!datedEditing}
                                aria-label={`${dateKey} ${row.label}`}
                              >
                                {state === 'available' ? '○' : state === 'unavailable' ? '×' : '-'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {datedLastEndLabel && (
                      <tr className="h-0">
                        <th className="bg-base-100 border-base-300 relative border px-1 py-0 text-right md:px-2">
                          <span className="absolute left-2 top-0 -translate-y-1/2 text-xs font-medium">
                            {datedLastEndLabel === '00:00'
                              ? '24:00'
                              : datedLastEndLabel.replace(/^0/, '')}
                          </span>
                        </th>
                        {visibleBlockDates.map((dateKey) => (
                          <td key={`${dateKey}-end`} className="border-base-300 border p-0" />
                        ))}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {datedEditing && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => void saveDated()}
                    disabled={datedSaving}
                    data-testid="dated-save-bottom"
                  >
                    {datedSaving ? '更新中...' : '更新する'}
                  </button>
                </div>
              )}
            </>
          )}
          <div className="mt-2 text-xs text-base-content/60">凡例: ○=可 / ×=不可 / -=未設定</div>
          {datedMessage && <p className="text-info mt-2 text-sm">{datedMessage}</p>}

          <div
            ref={syncSectionRef}
            className="mt-6 space-y-3"
            data-testid="schedule-sync-section"
            data-tour-id="account-sync-section"
          >
            <div className="flex items-center justify-between gap-2">
              <h5 className="text-sm font-semibold">回答イベントへの反映</h5>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => void loadSyncPreview()}
                disabled={isSyncPreviewLoading || datedEditing}
                data-testid="sync-check-button"
              >
                {isSyncPreviewLoading ? '確認中...' : '変更内容を確認'}
              </button>
            </div>
            <p className="text-xs text-base-content/60">
              予定一括管理の変更が、過去・未来を含む回答済みイベントへどう反映されるかを確認できます。
            </p>
            {syncPreviewMessage && <p className="text-sm text-base-content/60">{syncPreviewMessage}</p>}

            <div className="space-y-3">
              {syncPreviewEvents.map((event) => {
                const matrix = buildSyncPreviewMatrix(event);
                const dateBuckets = toWeeklyDateBuckets(matrix.sortedDates);
                const currentWeekPage = Math.min(
                  syncPreviewWeekPageMap[event.eventId] ?? 0,
                  Math.max(dateBuckets.length - 1, 0),
                );
                const visibleDates = dateBuckets[currentWeekPage] ?? [];
                const isUpdating = syncApplyingEventIds.has(event.eventId);
                const selection = syncCellSelectionMap[event.eventId] ?? {};
                const weekPeriodLabel =
                  visibleDates.length > 0
                    ? `${new Date(`${visibleDates[0]}T00:00:00`).toLocaleDateString('ja-JP', {
                        month: 'numeric',
                        day: 'numeric',
                      })} 〜 ${new Date(
                        `${visibleDates[visibleDates.length - 1]}T00:00:00`,
                      ).toLocaleDateString('ja-JP', {
                        month: 'numeric',
                        day: 'numeric',
                      })}`
                    : '-';
                return (
                  <div key={event.eventId} className="bg-base-100 rounded-lg border p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">
                          <Link href={`/event/${event.publicToken}`} className="link link-hover">
                            {event.title}
                          </Link>
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs">
                          <span className="badge badge-info badge-outline">
                            変更 {event.changes.total}件
                          </span>
                          {event.changes.availableToUnavailable > 0 && (
                            <span className="badge badge-error badge-outline">
                              可→不可 {event.changes.availableToUnavailable}
                            </span>
                          )}
                          {event.changes.unavailableToAvailable > 0 && (
                            <span className="badge badge-success badge-outline">
                              不可→可 {event.changes.unavailableToAvailable}
                            </span>
                          )}
                          {event.changes.protected > 0 && (
                            <span className="badge badge-warning badge-outline">
                              保護 {event.changes.protected}件
                            </span>
                          )}
                          {event.isFinalized && (
                            <span className="badge badge-warning">確定済み</span>
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/event/${event.publicToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline"
                      >
                        このイベントに移動
                      </Link>
                    </div>

                    {dateBuckets.length > 1 && (
                      <div className="mb-2">
                        <WeekNavigationBar
                          periodLabel={weekPeriodLabel}
                          currentPage={currentWeekPage}
                          totalPages={dateBuckets.length}
                          onPageChange={(page) =>
                            setSyncPreviewWeekPageMap((prev) => ({
                              ...prev,
                              [event.eventId]: page,
                            }))
                          }
                          hidePageIndicator={true}
                        />
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="table-xs table w-full table-fixed border-collapse">
                        <thead>
                          <tr className="bg-base-200">
                            <th className="border-base-300 w-20 border px-1 py-1 text-center">
                              時間
                            </th>
                            {visibleDates.map((dateKey) => {
                              const date = new Date(`${dateKey}T00:00:00`);
                              return (
                                <th
                                  key={dateKey}
                                  className="border-base-300 border px-0.5 py-1 text-center"
                                >
                                  <div className="flex flex-col items-center leading-tight">
                                    <span className="text-xs font-semibold">
                                      {date.toLocaleDateString('ja-JP', {
                                        month: 'numeric',
                                        day: 'numeric',
                                      })}
                                    </span>
                                    <span className="text-xs text-base-content/60">
                                      ({date.toLocaleDateString('ja-JP', { weekday: 'short' })})
                                    </span>
                                  </div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {matrix.sortedTimes.map((timeKey) => (
                            <tr key={`${event.eventId}_${timeKey}`}>
                              <th className="border-base-300 border px-1 py-1 text-xs">
                                {timeKey}
                              </th>
                              {visibleDates.map((dateKey) => {
                                const slot = matrix.map[`${dateKey}_${timeKey}`];
                                if (!slot) {
                                  return (
                                    <td
                                      key={`${dateKey}_${timeKey}`}
                                      className="border-base-300 text-base-content/30 border text-center text-xs"
                                    >
                                      -
                                    </td>
                                  );
                                }
                                const selected =
                                  slot.eventDateId in selection
                                    ? selection[slot.eventDateId]
                                    : slot.desiredAvailability;
                                const willApplyChange = selected !== slot.currentAvailability;
                                const cellClass = willApplyChange
                                  ? selected
                                    ? 'bg-success text-success-content ring-success ring-2'
                                    : 'bg-warning/80 text-warning-content ring-warning ring-2'
                                  : 'bg-base-200/50 text-base-content/40';
                                return (
                                  <td
                                    key={`${dateKey}_${timeKey}`}
                                    className="border-base-300 border p-0.5 md:p-1"
                                  >
                                    <button
                                      type="button"
                                      className={`mx-auto aspect-square w-7 rounded-md text-xs font-semibold md:aspect-auto md:h-10 md:w-full md:text-sm ${cellClass}`}
                                      onClick={() =>
                                        slot.willChange &&
                                        setSyncCellSelectionMap((prev) => ({
                                          ...prev,
                                          [event.eventId]: {
                                            ...(prev[event.eventId] ?? {}),
                                            [slot.eventDateId]:
                                              (prev[event.eventId]?.[slot.eventDateId] ??
                                                slot.desiredAvailability) ===
                                              slot.desiredAvailability
                                                ? slot.currentAvailability
                                                : slot.desiredAvailability,
                                          },
                                        }))
                                      }
                                      disabled={!slot.willChange}
                                      aria-label={`${event.title} ${dateKey} ${timeKey}`}
                                    >
                                      {selected ? '○' : '×'}
                                      {slot.isProtected && (
                                        <span className="ml-1 text-[10px]">保</span>
                                      )}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      {event.changes.protected > 0 && (
                        <label className="label cursor-pointer gap-2 py-0">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-sm"
                            checked={syncOverwriteMap[event.eventId] ?? false}
                            onChange={(e) =>
                              setSyncOverwriteMap((prev) => ({
                                ...prev,
                                [event.eventId]: e.target.checked,
                              }))
                            }
                          />
                          <span className="label-text text-xs">保護された枠も上書きする</span>
                        </label>
                      )}
                      {event.isFinalized && (
                        <label className="label cursor-pointer gap-2 py-0">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-sm"
                            checked={syncAllowFinalizedMap[event.eventId] ?? false}
                            onChange={(e) =>
                              setSyncAllowFinalizedMap((prev) => ({
                                ...prev,
                                [event.eventId]: e.target.checked,
                              }))
                            }
                          />
                          <span className="label-text text-xs">確定済みイベントにも反映する</span>
                        </label>
                      )}

                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        disabled={isUpdating}
                        data-testid={`sync-cancel-${event.eventId}`}
                        onClick={() => handleCancelSyncEvent(event.eventId)}
                      >
                        この変更をキャンセル
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary ml-auto"
                        disabled={isUpdating}
                        data-testid={`sync-apply-${event.eventId}`}
                        onClick={() => void handleApplySyncEvent(event.eventId)}
                      >
                        {isUpdating ? '適用中...' : 'この変更を適用'}
                      </button>
                    </div>
                    {syncMessageMap[event.eventId] && (
                      <p className="mt-2 text-xs text-base-content/70">{syncMessageMap[event.eventId]}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
    </div>
  );
}
