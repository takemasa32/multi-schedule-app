'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import DateRangePicker from './date-range-picker';
import { TimeSlot } from '@/lib/utils';
import { useDeviceDetect } from '@/hooks/useDeviceDetect';
import useSelectionDragController from '@/hooks/useSelectionDragController';

/**
 * カレンダーで手動選択するコンポーネントのプロパティ
 */
interface ManualTimeSlotPickerProps {
  /** 選択中のマス一覧を親コンポーネントへ通知する */
  onTimeSlotsChange: (slots: TimeSlot[]) => void;
  /** 初期選択済みマス */
  initialSlots?: TimeSlot[];
}

/**
 * 期間を設定後、表形式（ヒートマップ風）で候補日時を手動選択できるコンポーネント
 */
export default function ManualTimeSlotPicker({
  onTimeSlotsChange,
  initialSlots = [],
}: ManualTimeSlotPickerProps) {
  const [allSlots, setAllSlots] = useState<TimeSlot[]>([]);
  // ★ ソースオブトゥルースは「選択されたキー集合」
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(initialSlots.map(slotKey)),
  );
  const { isMobile } = useDeviceDetect();

  /**
   * TimeSlot から一意なキー文字列を生成する
   */
  function slotKey(slot: TimeSlot) {
    const dateKey = format(slot.date, 'yyyy-MM-dd');
    return `${dateKey}_${slot.startTime}-${slot.endTime}`;
  }

  /**
   * DateRangePicker から生成された全マスを保持
   * ※ 参照が安定するように useCallback
   */
  const handleSlotsGenerate = useCallback((slots: TimeSlot[]) => {
    setAllSlots(slots);
  }, []);

  /**
   * initialSlots の変更を selectedKeys に一度だけ（内容が変わったときだけ）反映
   * JSON でハッシュ化して依存を安定化
   */
  const syncFromPropRef = useRef(false);
  const lastInitialHashRef = useRef<string | null>(null);
  useEffect(() => {
    const incomingSet = new Set(initialSlots.map(slotKey));
    const incomingHash = JSON.stringify(Array.from(incomingSet).sort());
    if (lastInitialHashRef.current === incomingHash) {
      return;
    }
    lastInitialHashRef.current = incomingHash;

    setSelectedKeys((prev) => {
      const prevHash = JSON.stringify(Array.from(prev).sort());
      if (prevHash === incomingHash) {
        return prev;
      }
      syncFromPropRef.current = true;
      return incomingSet;
    });
  }, [initialSlots]);

  /**
   * ★ 派生状態：selectedMap は state にせず useMemo で導出
   */
  const selectedMap = useMemo<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const s of allSlots) {
      map[slotKey(s)] = selectedKeys.has(slotKey(s));
    }
    return map;
  }, [allSlots, selectedKeys]);

  const applySelection = useCallback((keys: string[], value: boolean) => {
    setSelectedKeys((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const key of keys) {
        if (value) {
          if (!next.has(key)) {
            next.add(key);
            changed = true;
          }
        } else if (next.has(key)) {
          next.delete(key);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  /**
   * 親への通知は派生配列をメモ化してから effect で一回通知
   */
  const selectedSlots = useMemo<TimeSlot[]>(
    () => allSlots.filter((slot) => selectedKeys.has(slotKey(slot))),
    [allSlots, selectedKeys],
  );

  useEffect(() => {
    if (syncFromPropRef.current) {
      syncFromPropRef.current = false;
      return;
    }
    onTimeSlotsChange(selectedSlots);
  }, [onTimeSlotsChange, selectedSlots]);

  const dateKeys = useMemo(
    () => Array.from(new Set(allSlots.map((s) => format(s.date, 'yyyy-MM-dd')))).sort(),
    [allSlots],
  );
  // 週（Mon-Sun）ごとの起点（月曜日）配列を作成（PC/モバイル共通）
  const weekAnchors = useMemo(() => {
    const anchors: string[] = [];
    if (dateKeys.length === 0) return anchors;
    const first = startOfWeek(new Date(dateKeys[0] + 'T00:00:00'), {
      weekStartsOn: 1,
    });
    const last = endOfWeek(new Date(dateKeys[dateKeys.length - 1] + 'T00:00:00'), {
      weekStartsOn: 1,
    });
    let cur = new Date(first);
    while (cur <= last) {
      anchors.push(format(cur, 'yyyy-MM-dd'));
      cur = addDays(cur, 7);
    }
    return anchors;
  }, [dateKeys]);
  const [weekIndex, setWeekIndex] = useState(0);
  // weekAnchorsの長さに応じて現在のindexをクランプ
  useEffect(() => {
    if (weekAnchors.length === 0) return;
    setWeekIndex((idx) => Math.min(idx, weekAnchors.length - 1));
  }, [weekAnchors]);
  const timeKeys = useMemo(
    () => Array.from(new Set(allSlots.map((s) => `${s.startTime}-${s.endTime}`))).sort(),
    [allSlots],
  );

  const visibleDates = useMemo(() => {
    if (weekAnchors.length === 0) return [] as string[];
    const mondayStr = weekAnchors[Math.min(weekIndex, weekAnchors.length - 1)];
    const monday = new Date(mondayStr + 'T00:00:00');
    return Array.from({ length: 7 }, (_, i) => format(addDays(monday, i), 'yyyy-MM-dd'));
  }, [weekAnchors, weekIndex]);

  const weekLabel = useMemo(() => {
    if (visibleDates.length === 0) return '';
    const first = new Date(`${visibleDates[0]}T00:00:00`).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const last = new Date(`${visibleDates[visibleDates.length - 1]}T00:00:00`).toLocaleDateString(
      'ja-JP',
      {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      },
    );
    return `${first} 〜 ${last}`;
  }, [visibleDates]);

  const selectionController = useSelectionDragController({
    isSelected: (key) => selectedKeys.has(key),
    applySelection,
    rangeResolver: ({ targetKey }) => (targetKey ? [targetKey] : []),
    disableBodyScroll: true,
    enableKeyboard: false,
  });

  // コンパクトなヘッダー日付表示（例: 7/1 + (火) を2行）
  const getCompactDateParts = useCallback((dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`);
    const md = d.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
    });
    const wd = d.toLocaleDateString('ja-JP', { weekday: 'short' });
    return { md, wd };
  }, []);

  return (
    <div className="space-y-4">
      {(() => {
        const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
        const props = isTest
          ? {}
          : ({
              initialStartDate: (() => {
                const d = new Date();
                d.setHours(0, 0, 0, 0);
                return d;
              })(),
              initialEndDate: (() => {
                const d = new Date();
                d.setDate(d.getDate() + 6);
                d.setHours(0, 0, 0, 0);
                return d;
              })(),
              initialDefaultStartTime: '09:00',
              initialDefaultEndTime: '18:00',
              initialIntervalUnit: '60',
              allowPastDates: true,
            } as const);
        return <DateRangePicker onTimeSlotsChange={handleSlotsGenerate} {...props} />;
      })()}
      {allSlots.length > 0 && (
        <p className="text-sm text-gray-500">
          カレンダー上でクリックして、候補の日時を個別に追加します。
        </p>
      )}
      {allSlots.length > 0 && (
        <div className={`-mx-2 sm:-mx-4 md:-mx-6 ${isMobile ? 'touch-none' : ''}`}>
          {/* 表示範囲（ボタンとは別行） */}
          {weekAnchors.length > 0 && (
            <div className="text-base-content/80 mb-1 px-4 text-xs sm:text-sm" aria-live="polite">
              表示: {weekLabel}（月曜はじまり）
            </div>
          )}
          {/* 週送りボタン行（左右に配置） */}
          {weekAnchors.length > 0 && (
            <div className="mb-2 flex items-center justify-between px-4">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setWeekIndex((i) => Math.max(0, i - 1))}
                disabled={weekIndex <= 0}
                aria-label="前の週へ"
              >
                ← 前の週
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setWeekIndex((i) => Math.min(weekAnchors.length - 1, i + 1))}
                disabled={weekIndex >= weekAnchors.length - 1}
                aria-label="次の週へ"
              >
                次の週 →
              </button>
            </div>
          )}
          <table className="table-xs border-base-300 table w-full min-w-0 table-fixed border-collapse border text-center">
            <thead>
              <tr>
                <th
                  className={`bg-base-200 sticky left-0 top-0 z-20 text-left ${
                    isMobile ? 'w-12 p-1 text-[10px]' : 'w-12 p-1 text-[11px]'
                  }`}
                >
                  時間
                </th>
                {visibleDates.map((d) => {
                  const parts = getCompactDateParts(d);
                  return (
                    <th
                      key={d}
                      className={`bg-base-200 sticky top-0 z-10 whitespace-normal text-center ${
                        isMobile
                          ? 'p-0.5 text-[10px] leading-tight'
                          : 'p-0.5 text-[11px] leading-tight'
                      }`}
                    >
                      <span className="block">{parts.md}</span>
                      <span className="text-base-content/70 block text-[10px]">({parts.wd})</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th
                  className={`bg-base-100 sticky left-0 z-10 h-3 ${isMobile ? 'p-0' : 'p-0'}`}
                ></th>
                {visibleDates.map((date) => (
                  <td key={`${date}-spacer`} className="h-3"></td>
                ))}
              </tr>
              {timeKeys.map((time) => (
                <tr key={time}>
                  <th
                    className={`bg-base-100 sticky left-0 z-10 whitespace-nowrap pr-2 text-right ${
                      isMobile ? 'px-2 py-0 text-[10px]' : 'px-2 py-0 text-[11px]'
                    }`}
                  >
                    <span
                      className="text-base-content/80 absolute left-2 text-xs font-medium leading-none"
                      style={{ top: 0 }}
                    >
                      {time.split('-')[0].replace(/^0/, '')}
                    </span>
                  </th>
                  {visibleDates.map((date) => {
                    const key = `${date}_${time}`;
                    const exists = key in selectedMap;
                    const active = exists ? selectedMap[key] : false;
                    return (
                      <td
                        key={key}
                        className={`border-base-300 border text-center ${
                          isMobile ? 'p-0.5' : 'p-0.5'
                        }`}
                      >
                        {exists ? (
                          <div
                            data-testid="slot-cell"
                            data-key={key}
                            data-selection-key={key}
                            className={`w-full ${
                              isMobile ? 'h-8' : 'h-9'
                            } flex cursor-pointer select-none items-center justify-center rounded-sm transition-colors ${
                              active
                                ? 'bg-success text-success-content font-semibold'
                                : 'bg-base-200/70 text-base-content/70'
                            }`}
                            {...selectionController.getCellProps(key)}
                            aria-label={active ? '選択済み' : '未選択'}
                          >
                            {active ? '○' : '×'}
                          </div>
                        ) : (
                          <div
                            className={`w-full ${
                              isMobile ? 'h-8' : 'h-9'
                            } bg-base-200/30 text-base-content/30 flex select-none items-center justify-center rounded-sm`}
                          >
                            –
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {timeKeys.length > 0 &&
                visibleDates.length > 0 &&
                (() => {
                  const lastTime = timeKeys[timeKeys.length - 1].split('-')[1];
                  const formatted = lastTime === '24:00' ? '24:00' : lastTime.replace(/^0/, '');
                  return (
                    <tr>
                      <th
                        className={`bg-base-100 sticky left-0 z-10 whitespace-nowrap pr-2 text-right ${
                          isMobile ? 'px-2 py-0 text-[10px]' : 'px-2 py-0 text-[11px]'
                        }`}
                      >
                        <span
                          className="text-base-content/80 absolute left-2 text-xs font-medium leading-none"
                          style={{ top: 0 }}
                        >
                          {formatted}
                        </span>
                      </th>
                      {visibleDates.map((date) => (
                        <td
                          key={`${date}-endtime`}
                          className="border-base-300 border p-0 text-center"
                        />
                      ))}
                    </tr>
                  );
                })()}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
