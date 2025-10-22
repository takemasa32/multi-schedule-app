'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { differenceInMinutes, parseISO } from 'date-fns';
import DateRangePicker from '../date-range-picker';
import ManualTimeSlotPicker from '../manual-time-slot-picker';
import { addEventDates } from '@/lib/actions';
import { TimeSlot } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { EventDate } from './event-details-section';
import useScrollToError from '@/hooks/useScrollToError';

interface EventDateAddSectionProps {
  event: {
    id: string;
    title: string;
    public_token: string;
  };
  eventDates: EventDate[];
}

export default function EventDateAddSection({ event, eventDates }: EventDateAddSectionProps) {
  const inferPreferredMode = useCallback((dates: EventDate[]): 'auto' | 'manual' => {
    if (dates.length < 2) {
      return 'manual';
    }
    const byDay: Record<string, { start: string; end: string }[]> = {};
    dates.forEach((d) => {
      const day = d.start_time.slice(0, 10);
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push({
        start: d.start_time.slice(11, 16),
        end: d.end_time.slice(11, 16),
      });
    });
    const normalizedPatterns = Object.values(byDay).map((slots) =>
      slots
        .slice()
        .sort((a, b) => `${a.start}-${a.end}`.localeCompare(`${b.start}-${b.end}`))
        .map(({ start, end }) => `${start}-${end}`)
        .join('|'),
    );
    const uniquePatterns = new Set(normalizedPatterns);
    return uniquePatterns.size === 1 ? 'auto' : 'manual';
  }, []);
  // クイック自動延長用state
  const sortedDates = [...eventDates].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const last = sortedDates[sortedDates.length - 1];
  const defaultLastDate = last ? last.start_time.slice(0, 10) : '';
  const [addMode, setAddModeState] = useState<'auto' | 'manual'>(() =>
    inferPreferredMode(eventDates),
  );
  const [extendTo, setExtendTo] = useState<string>(defaultLastDate);
  const [quickSlots, setQuickSlots] = useState<TimeSlot[]>([]);
  const [manualSlots, setManualSlots] = useState<TimeSlot[]>([]);
  const [autoRangeSource, setAutoRangeSource] = useState<TimeSlot[]>([]);
  const [pendingTimeSlots, setPendingTimeSlots] = useState<TimeSlot[]>([]);
  const [addModalState, setAddModalState] = useState<
    'confirm' | 'loading' | 'success' | 'error' | null
  >(null);
  const [addModalError, setAddModalError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);
  const manualOverrideRef = useRef(false);
  // エラー発生時に自動スクロール
  useScrollToError(addModalError, errorRef);
  useEffect(() => {
    setAddModalError(null);
  }, [addMode]);
  const [showToast, setShowToast] = useState<{
    message: string;
    key: number;
  } | null>(null);
  const [optimisticSlotKeys, setOptimisticSlotKeys] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const existingSlotKeySet = useMemo(() => {
    const set = new Set<string>(optimisticSlotKeys);
    eventDates.forEach((d) => {
      const day = d.start_time.slice(0, 10);
      const start = d.start_time.slice(11, 16);
      const end = d.end_time.slice(11, 16);
      set.add(`${day}_${start}-${end}`);
    });
    return set;
  }, [eventDates, optimisticSlotKeys]);

  const disabledManualKeys = useMemo(() => Array.from(existingSlotKeySet), [existingSlotKeySet]);

  const baseIntervalMinutes = useMemo(() => {
    const intervals: number[] = [];
    eventDates.forEach((d) => {
      const start = parseISO(d.start_time);
      const end = parseISO(d.end_time);
      const diff = differenceInMinutes(end, start);
      if (diff > 0) {
        intervals.push(diff);
      }
    });
    if (intervals.length === 0) {
      return 60;
    }
    const unique = Array.from(new Set(intervals));
    if (unique.length === 1) {
      return unique[0];
    }
    return Math.min(...unique);
  }, [eventDates]);

  const baseTimeDefaults = useMemo(() => {
    if (eventDates.length === 0) {
      return { start: '08:00', end: '18:00' } as const;
    }

    const dailyPattern = extractDailyPatterns(eventDates);
    const source =
      dailyPattern.length > 0
        ? dailyPattern
        : eventDates.map((d) => ({
            start: d.start_time.slice(11, 16),
            end: d.end_time.slice(11, 16),
          }));

    const timeStringToMinutes = (time: string): number => {
      if (time === '24:00') {
        return 24 * 60;
      }
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const minutesToTimeString = (minutes: number): string => {
      if (minutes >= 24 * 60) {
        return '24:00';
      }
      const hours = Math.floor(minutes / 60)
        .toString()
        .padStart(2, '0');
      const mins = (minutes % 60).toString().padStart(2, '0');
      return `${hours}:${mins}`;
    };

    let minStart = Number.POSITIVE_INFINITY;
    let maxEnd = Number.NEGATIVE_INFINITY;

    source.forEach(({ start, end }) => {
      minStart = Math.min(minStart, timeStringToMinutes(start));
      maxEnd = Math.max(maxEnd, timeStringToMinutes(end));
    });

    if (!Number.isFinite(minStart) || !Number.isFinite(maxEnd)) {
      return { start: '08:00', end: '18:00' } as const;
    }

    return {
      start: minutesToTimeString(minStart),
      end: minutesToTimeString(maxEnd),
    } as const;
  }, [eventDates]);

  const lastSlotDate = useMemo(() => {
    if (!last) {
      return null;
    }
    const base = new Date(last.start_time.slice(0, 10));
    base.setHours(0, 0, 0, 0);
    return Number.isNaN(base.getTime()) ? null : base;
  }, [last]);

  const manualInitialDate = useMemo(() => {
    if (!lastSlotDate) {
      return null;
    }
    const next = new Date(lastSlotDate);
    next.setDate(next.getDate() + 1);
    return Number.isNaN(next.getTime()) ? null : next;
  }, [lastSlotDate]);

  const preferredMode = useMemo(
    () => inferPreferredMode(eventDates),
    [eventDates, inferPreferredMode],
  );

  useEffect(() => {
    manualOverrideRef.current = false;
  }, [eventDates]);

  useEffect(() => {
    if (!manualOverrideRef.current && addMode !== preferredMode) {
      setAddModeState(preferredMode);
    }
  }, [preferredMode, addMode]);

  const setAddMode = useCallback((mode: 'auto' | 'manual') => {
    manualOverrideRef.current = true;
    setAddModeState(mode);
  }, []);

  const toSlotKey = (slot: TimeSlot) => {
    const y = slot.date.getFullYear();
    const m = String(slot.date.getMonth() + 1).padStart(2, '0');
    const d = String(slot.date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}_${slot.startTime}-${slot.endTime}`;
  };

  const filterNewSlots = useCallback(
    (slots: TimeSlot[]) => {
      const acceptedMap = new Map<string, TimeSlot>();
      let skippedExisting = 0;
      let skippedDuplicate = 0;
      slots.forEach((slot) => {
        const key = toSlotKey(slot);
        if (existingSlotKeySet.has(key)) {
          skippedExisting += 1;
          return;
        }
        if (acceptedMap.has(key)) {
          skippedDuplicate += 1;
          return;
        }
        acceptedMap.set(key, slot);
      });
      return {
        accepted: Array.from(acceptedMap.values()),
        skippedExisting,
        skippedDuplicate,
      };
    },
    [existingSlotKeySet],
  );

  const manualFilterResult = useMemo(
    () => filterNewSlots(manualSlots),
    [manualSlots, filterNewSlots],
  );
  const manualEffectiveSlots = manualFilterResult.accepted;
  const manualDuplicateCount =
    manualFilterResult.skippedExisting + manualFilterResult.skippedDuplicate;

  const autoRangeFilterResult = useMemo(
    () => filterNewSlots(autoRangeSource),
    [autoRangeSource, filterNewSlots],
  );
  const autoRangePreview = autoRangeFilterResult.accepted;
  const autoRangeSkippedExisting = autoRangeFilterResult.skippedExisting;
  const autoRangeSkippedDuplicate = autoRangeFilterResult.skippedDuplicate;

  // 代表パターン抽出
  function extractDailyPatterns(dates: EventDate[]) {
    const byDay: Record<string, { start: string; end: string }[]> = {};
    dates.forEach((d) => {
      const day = d.start_time.slice(0, 10);
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push({
        start: d.start_time.slice(11, 16),
        end: d.end_time.slice(11, 16),
      });
    });
    const patterns = Object.values(byDay);
    if (patterns.length === 0) return [];
    const freq: Record<string, number> = {};
    patterns.forEach((p) => {
      const key = p.map((s) => `${s.start}-${s.end}`).join(',');
      freq[key] = (freq[key] || 0) + 1;
    });
    const mainKey = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
    return mainKey.split(',').map((s) => {
      const [start, end] = s.split('-');
      return { start, end };
    });
  }
  // クイック延長日付選択時のスロット生成
  useEffect(() => {
    if (!last || !extendTo) {
      setQuickSlots([]);
      return;
    }
    const slots: TimeSlot[] = [];
    const lastDate = new Date(last.start_time.slice(0, 10));
    lastDate.setHours(0, 0, 0, 0);
    const to = new Date(extendTo);
    to.setHours(0, 0, 0, 0);
    const pattern = extractDailyPatterns(eventDates);
    if (pattern.length === 0) {
      setQuickSlots([]);
      return;
    }
    const existingSet = new Set(
      eventDates.map((d) => {
        const day = d.start_time.slice(0, 10);
        const start = d.start_time.slice(11, 16);
        const end = d.end_time.slice(11, 16);
        return `${day}_${start}_${end}`;
      }),
    );
    for (const d = new Date(lastDate); d <= to; d.setDate(d.getDate() + 1)) {
      if (d.getTime() === lastDate.getTime()) continue;
      pattern.forEach(({ start, end }) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${day}`;
        const key = `${dateStr}_${start}_${end}`;
        if (!existingSet.has(key)) {
          slots.push({ date: new Date(d), startTime: start, endTime: end });
        }
      });
    }
    setQuickSlots(slots);
  }, [extendTo, last, eventDates]);

  const getLocalDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(date.getDate()).padStart(2, '0')}`;
  const weekdayChars = '日月火水木金土';
  const groupSlotsByDate = (slots: TimeSlot[]) => {
    const grouped: Record<string, { date: Date; count: number }> = {};
    slots.forEach((slot) => {
      const key = getLocalDateKey(slot.date);
      if (!grouped[key]) {
        grouped[key] = { date: slot.date, count: 0 };
      }
      grouped[key].count += 1;
    });
    return Object.values(grouped).sort((a, b) => a.date.getTime() - b.date.getTime());
  };
  const formatDateListItem = (date: Date) =>
    `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}（${weekdayChars[date.getDay()]}）`;

  return (
    <div className="my-4 flex flex-col gap-4">
      <button
        className="btn btn-outline btn-primary mb-4"
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? '日程追加を閉じる' : '日程を追加する'}
      </button>
      {open && (
        <div className="card bg-base-100 border-base-200 border shadow-md">
          <div className="card-body">
            {eventDates.length === 0 ? (
              <div>既存日程がありません</div>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold text-gray-600">追加方式</span>
                  <div className="btn-group">
                    <button
                      type="button"
                      className={`btn btn-sm ${addMode === 'auto' ? 'btn-primary btn-active' : 'btn-outline'}`}
                      onClick={() => setAddMode('auto')}
                      disabled={addMode === 'auto'}
                    >
                      期間ベース
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${addMode === 'manual' ? 'btn-primary btn-active' : 'btn-outline'}`}
                      onClick={() => setAddMode('manual')}
                      disabled={addMode === 'manual'}
                    >
                      カレンダー手動選択
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {addMode === 'auto'
                    ? '既存日程と同じ時間割で期間を指定し、一括で候補日程を追加します。'
                    : 'カレンダー上で候補枠を個別に塗りつぶして追加します（既存日程は選択不可）。'}
                </p>
                <div className="border-base-200 my-4 border-t" />
                {addMode === 'auto' ? (
                  <div className="space-y-6">
                    <div>
                      <label className="label" htmlFor="extendToDate">
                        <span className="label-text">延長したい最終日</span>
                      </label>
                      <input
                        id="extendToDate"
                        type="date"
                        className="input input-bordered w-full max-w-xs"
                        min={defaultLastDate}
                        value={extendTo}
                        onChange={(e) => setExtendTo(e.target.value)}
                        disabled={addModalState === 'loading'}
                      />
                      <div className="my-2 text-sm">
                        追加される日程:
                        <ul className="list-disc pl-5">
                          {(() => {
                            const grouped = groupSlotsByDate(quickSlots);
                            if (grouped.length === 0) return <li>なし</li>;
                            return grouped.map(({ date, count }) => (
                              <li key={getLocalDateKey(date)}>
                                {formatDateListItem(date)}: {count}枠追加
                              </li>
                            ));
                          })()}
                        </ul>
                      </div>
                      <button
                        className={`btn btn-primary${addModalState === 'loading' ? 'loading' : ''}`}
                        type="button"
                        disabled={quickSlots.length === 0 || addModalState === 'loading'}
                        onClick={() => {
                          setAddModalError(null);
                          const filtered = filterNewSlots(quickSlots);
                          if (filtered.accepted.length === 0) {
                            setAddModalState('error');
                            setAddModalError('追加する日程がありません');
                            return;
                          }
                          setPendingTimeSlots(filtered.accepted);
                          setAddModalState('confirm');
                        }}
                      >
                        {addModalState === 'loading' ? (
                          <>
                            <span className="loading loading-spinner loading-sm mr-2" />
                            追加準備中...
                          </>
                        ) : (
                          'この日まで自動延長して追加'
                        )}
                      </button>
                    </div>
                    <details>
                      <summary className="mb-2 cursor-pointer text-base font-bold opacity-70">
                        詳細な日程追加（任意の範囲・時間帯）
                      </summary>
                      <div className="space-y-3 pt-2">
                        <DateRangePicker
                          onTimeSlotsChange={(timeSlots) => {
                            setAutoRangeSource(timeSlots);
                            if (addModalState !== 'confirm') {
                              const filtered = filterNewSlots(timeSlots);
                              setPendingTimeSlots(filtered.accepted);
                            }
                          }}
                          forcedIntervalMinutes={baseIntervalMinutes}
                          initialDefaultStartTime={baseTimeDefaults.start}
                          initialDefaultEndTime={baseTimeDefaults.end}
                          initialIntervalUnit={String(baseIntervalMinutes)}
                          initialStartDate={lastSlotDate}
                          initialEndDate={lastSlotDate}
                        />
                        {autoRangePreview.length > 0 ? (
                          <div className="bg-base-200/60 rounded-lg p-3 text-sm">
                            <div className="font-semibold">生成された日程概要</div>
                            <ul className="mt-2 list-disc pl-5">
                              {groupSlotsByDate(autoRangePreview).map(({ date, count }) => (
                                <li key={getLocalDateKey(date)}>
                                  {formatDateListItem(date)}: {count}枠追加
                                </li>
                              ))}
                            </ul>
                            {autoRangeSkippedExisting + autoRangeSkippedDuplicate > 0 && (
                              <p className="text-warning mt-2 text-xs">
                                既存日程と重複した {autoRangeSkippedExisting} 件
                                {autoRangeSkippedDuplicate > 0
                                  ? ` / 重複選択 ${autoRangeSkippedDuplicate} 件`
                                  : ''}
                                は除外されました。
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">
                            期間と時間帯を設定すると生成結果が表示されます。
                          </p>
                        )}
                        <button
                          className={`btn btn-primary${
                            addModalState === 'loading' ? 'loading' : ''
                          }`}
                          type="button"
                          onClick={() => {
                            if (addModalState === 'loading') {
                              return;
                            }
                            setAddModalError(null);
                            if (autoRangePreview.length === 0) {
                              setPendingTimeSlots([]);
                              setAddModalError(
                                '既存日程と重複しているため追加できる枠がありません',
                              );
                              setAddModalState('error');
                              return;
                            }
                            setPendingTimeSlots([...autoRangePreview]);
                            setAddModalState('confirm');
                          }}
                        >
                          {addModalState === 'loading' ? (
                            <>
                              <span className="loading loading-spinner loading-sm mr-2" />
                              追加中...
                            </>
                          ) : (
                            '日程を追加'
                          )}
                        </button>
                      </div>
                    </details>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ManualTimeSlotPicker
                      onTimeSlotsChange={setManualSlots}
                      disabledSlotKeys={disabledManualKeys}
                      forcedIntervalMinutes={baseIntervalMinutes}
                      initialDefaultStartTime={baseTimeDefaults.start}
                      initialDefaultEndTime={baseTimeDefaults.end}
                      initialIntervalUnit={String(baseIntervalMinutes)}
                      initialStartDate={manualInitialDate}
                      initialEndDate={manualInitialDate}
                    />
                    {manualSlots.length === 0 ? (
                      <p className="text-xs text-gray-500">
                        カレンダーで追加したい枠を選択すると概要が表示されます。
                      </p>
                    ) : (
                      <div className="bg-base-200/60 rounded-lg p-3 text-sm">
                        <div className="font-semibold">選択中の日程</div>
                        {manualEffectiveSlots.length > 0 ? (
                          <ul className="mt-2 list-disc pl-5">
                            {groupSlotsByDate(manualEffectiveSlots).map(({ date, count }) => (
                              <li key={getLocalDateKey(date)}>
                                {formatDateListItem(date)}: {count}枠追加予定
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-warning mt-2 text-xs">
                            既存日程と重複しているため追加対象がありません。
                          </p>
                        )}
                      </div>
                    )}
                    {manualDuplicateCount > 0 && (
                      <p className="text-warning text-xs">
                        既存日程または重複選択 {manualDuplicateCount} 件の枠は自動的に除外されます。
                      </p>
                    )}
                    <button
                      className={`btn btn-primary${addModalState === 'loading' ? 'loading' : ''}`}
                      type="button"
                      onClick={() => {
                        if (addModalState === 'loading') {
                          return;
                        }
                        setAddModalError(null);
                        if (manualSlots.length === 0) {
                          setAddModalState('error');
                          setAddModalError('追加する日程が選択されていません');
                          return;
                        }
                        if (manualEffectiveSlots.length === 0) {
                          setPendingTimeSlots([]);
                          setAddModalState('error');
                          setAddModalError('既存日程と重複しているため追加できる枠がありません');
                          return;
                        }
                        setPendingTimeSlots([...manualEffectiveSlots]);
                        setAddModalState('confirm');
                      }}
                    >
                      {addModalState === 'loading' ? (
                        <>
                          <span className="loading loading-spinner loading-sm mr-2" />
                          追加中...
                        </>
                      ) : (
                        '選択した日程を確認'
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
            {/* 日程追加確認モーダル */}
            {(addModalState === 'confirm' ||
              addModalState === 'loading' ||
              addModalState === 'error' ||
              addModalState === 'success') && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
                style={{
                  pointerEvents:
                    addModalState === 'loading' || addModalState === 'success' ? 'none' : 'auto',
                }}
              >
                <div
                  className="bg-base-100 relative flex max-h-[80vh] w-full max-w-md flex-col rounded-lg p-6 shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="mb-2 text-lg font-bold">日程追加の確認</h3>
                  <div className="flex-1 overflow-y-auto pr-1">
                    {addModalState === 'success' ? (
                      <div
                        className="alert alert-success mb-4"
                        data-testid="event-date-add-success"
                      >
                        日程を追加しました。
                      </div>
                    ) : (
                      <>
                        <p className="mb-2 text-sm text-gray-700">
                          以下の日程を追加します。よろしいですか？
                        </p>
                        <ul className="mb-4 text-sm">
                          {(() => {
                            const grouped: Record<string, { date: Date; count: number }> = {};
                            pendingTimeSlots.forEach((slot) => {
                              const key = getLocalDateKey(slot.date);
                              if (!grouped[key]) grouped[key] = { date: slot.date, count: 0 };
                              grouped[key].count += 1;
                            });
                            return Object.values(grouped)
                              .sort((a, b) => a.date.getTime() - b.date.getTime())
                              .map(({ date, count }) => (
                                <li key={getLocalDateKey(date)} className="mb-1">
                                  <span className="font-semibold">
                                    {date.getFullYear()}/{date.getMonth() + 1}/{date.getDate()}（
                                    {'日月火水木金土'[date.getDay()]}）
                                  </span>
                                  : {count}枠追加
                                </li>
                              ));
                          })()}
                        </ul>
                      </>
                    )}
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    {!['loading', 'success'].includes(addModalState ?? '') && (
                      <button
                        className="btn btn-outline"
                        onClick={() => {
                          setAddModalState(null);
                          setPendingTimeSlots([]);
                          setAddModalError(null);
                        }}
                        type="button"
                      >
                        キャンセル
                      </button>
                    )}
                    {addModalState !== 'success' && (
                      <button
                        className={`btn btn-primary${addModalState === 'loading' ? 'loading' : ''}`}
                        onClick={async () => {
                          const slotsToAdd = [...pendingTimeSlots];
                          if (slotsToAdd.length === 0) {
                            setAddModalState('error');
                            setAddModalError('重複や除外により追加できる候補がありません');
                            return;
                          }
                          setAddModalState('loading');
                          setAddModalError(null);
                          try {
                            const formData = new FormData();
                            formData.append('eventId', event.id);
                            slotsToAdd.forEach((slot) => {
                              const y = slot.date.getFullYear();
                              const m = String(slot.date.getMonth() + 1).padStart(2, '0');
                              const d = String(slot.date.getDate()).padStart(2, '0');
                              const dateStr = `${y}-${m}-${d}`;
                              formData.append('start', `${dateStr} ${slot.startTime}:00`);
                              formData.append('end', `${dateStr} ${slot.endTime}:00`);
                            });
                            const res = await addEventDates(formData);
                            if (!res.success) {
                              setAddModalError(res.message || '追加に失敗しました');
                              setAddModalState('error');
                            } else {
                              const addedKeys = slotsToAdd.map(toSlotKey);
                              setOptimisticSlotKeys((prev) => {
                                const merged = new Set(prev);
                                addedKeys.forEach((key) => merged.add(key));
                                return Array.from(merged);
                              });
                              setAddModalState('success');
                              setShowToast({
                                message: `${slotsToAdd.length}件の日程を追加しました`,
                                key: Date.now(),
                              });
                              setTimeout(() => {
                                setAddModalState(null);
                                setPendingTimeSlots([]);
                                setAddModalError(null);
                              }, 1200);
                              router.refresh();
                            }
                          } catch (e: unknown) {
                            if (e instanceof Error) {
                              setAddModalError(e.message);
                            } else {
                              setAddModalError('追加に失敗しました');
                            }
                            setAddModalState('error');
                          }
                        }}
                        type="button"
                        disabled={addModalState === 'loading'}
                      >
                        {addModalState === 'loading' ? (
                          <>
                            <span className="loading loading-spinner loading-sm mr-2" />
                            追加中...
                          </>
                        ) : (
                          '追加する'
                        )}
                      </button>
                    )}
                  </div>
                  {addModalError && (
                    <div
                      className="alert alert-error mt-3 text-sm"
                      ref={errorRef}
                      data-testid="event-date-add-error"
                    >
                      {addModalError}
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Toast通知 */}
            {showToast && (
              <div
                key={showToast.key}
                className="bg-success animate-fade-in fixed bottom-6 right-6 z-[1000] rounded px-4 py-2 text-white shadow-lg"
                style={{ minWidth: 180, textAlign: 'center' }}
              >
                {showToast.message}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
