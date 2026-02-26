'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import React from 'react';
import PortalTooltip from './common/portal-tooltip';
import { format, eachDayOfInterval, isEqual, parseISO, setHours, setMinutes } from 'date-fns';
import { TimeSlot } from '@/lib/utils'; // 共通のTimeSlot型をインポート

interface DateRangePickerProps {
  onDatesChange?: (dates: Date[]) => void; // 後方互換性のため残す
  onTimeSlotsChange: (timeSlots: TimeSlot[]) => void; // 新しいコールバック
  onSettingsChange?: (settings: DateRangeSettings) => void;
  hideUi?: boolean;
  /** 初期開始日（未指定時はnull） */
  initialStartDate?: Date | null;
  /** 初期終了日（未指定時はnull） */
  initialEndDate?: Date | null;
  /** 初期の各日の開始時刻（例: "09:00"、未指定時は"08:00"） */
  initialDefaultStartTime?: string;
  /** 初期の各日の終了時刻（例: "18:00"、未指定時は"18:00"） */
  initialDefaultEndTime?: string;
  /** 初期時間間隔（分、文字列。例: "60"。未指定時は"120"） */
  initialIntervalUnit?: string;
  /** 時間間隔を固定する場合の分指定（指定時は UI をロックする） */
  forcedIntervalMinutes?: number | null;
  /** 過去日もスロット生成対象にする（手動入力UIで使用） */
  allowPastDates?: boolean;
}

export type DateRangeSettings = {
  startDate: Date | null;
  endDate: Date | null;
  defaultStartTime: string;
  defaultEndTime: string;
  intervalUnit: string;
};

export default function DateRangePicker({
  onDatesChange,
  onTimeSlotsChange,
  onSettingsChange,
  hideUi = false,
  initialStartDate = null,
  initialEndDate = null,
  initialDefaultStartTime = '08:00',
  initialDefaultEndTime = '18:00',
  initialIntervalUnit = '120',
  allowPastDates = false,
  forcedIntervalMinutes = null,
}: DateRangePickerProps) {
  const [startDate, setStartDate] = useState<Date | null>(initialStartDate);
  const [endDate, setEndDate] = useState<Date | null>(initialEndDate);
  const [excludedDates] = useState<Date[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const forcedIntervalUnit = forcedIntervalMinutes != null ? String(forcedIntervalMinutes) : null;
  const [intervalUnit, setIntervalUnit] = useState<string>(
    forcedIntervalUnit ?? initialIntervalUnit,
  ); // 時間帯の単位（分）
  const isIntervalLocked = forcedIntervalUnit != null;
  const intervalOptions = [
    { value: '10', label: '10分' },
    { value: '30', label: '30min' },
    { value: '60', label: '1h' },
    { value: '120', label: '2h' },
    { value: '180', label: '3h' },
    { value: '360', label: '6h' },
  ];
  const quickIntervals = ['30', '60', '120', '180'];
  const [showCustomSelect, setShowCustomSelect] = useState(false);
  const shouldAddForcedIntervalOption =
    isIntervalLocked && !intervalOptions.some((option) => option.value === forcedIntervalUnit);
  const selectableIntervalOptions = shouldAddForcedIntervalOption
    ? [...intervalOptions, { value: forcedIntervalUnit, label: `${forcedIntervalUnit}分` }]
    : intervalOptions;
  const isQuickInterval = quickIntervals.includes(intervalUnit);

  // 候補枠生成の基準となる開始・終了時刻の初期値を 8:00 〜 18:00 に設定
  const [defaultStartTime, setDefaultStartTime] = useState<string>(initialDefaultStartTime);
  const [defaultEndTime, setDefaultEndTime] = useState<string>(initialDefaultEndTime);

  // 期間全体を時間帯に分割する（15分、30分、60分など）
  const generatePeriodTimeSlots = useCallback(() => {
    if (!startDate || !endDate) {
      setErrorMessage('開始日と終了日を設定してください');
      setTimeSlots([]);
      return;
    }
    // 過去日制約（allowPastDates=false の場合のみ適用）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!allowPastDates) {
      if (startDate < today) {
        setErrorMessage('開始日は本日以降の日付を選択してください');
        setTimeSlots([]);
        return;
      }
      if (endDate < today) {
        setErrorMessage('終了日は本日以降の日付を選択してください');
        setTimeSlots([]);
        return;
      }
    }
    if (startDate > endDate) {
      setErrorMessage('開始日は終了日より前である必要があります');
      setTimeSlots([]);
      return;
    }

    // 除外日を除いた日付のみを対象にする
    let targetDates = eachDayOfInterval({
      start: startDate,
      end: endDate,
    }).filter((date) => !excludedDates.some((excluded) => isEqual(excluded, date)));
    if (!allowPastDates) {
      targetDates = targetDates.filter((date) => date >= today);
    }

    if (targetDates.length === 0) {
      setErrorMessage('候補日程が1つもありません。期間や除外日を見直してください');
      setTimeSlots([]);
      return;
    }

    // 文字列から数値に変換（分単位）
    const intervalMinutes = parseInt(intervalUnit);
    if (isNaN(intervalMinutes) || intervalMinutes <= 0) {
      setErrorMessage('有効な時間間隔を選択してください');
      return;
    }

    const newTimeSlots: TimeSlot[] = [];

    targetDates.forEach((date) => {
      // 各日の開始時刻を基準に初期化
      const [startHour, startMinute] = defaultStartTime.split(':').map(Number);
      let currentTime = setHours(setMinutes(date, startMinute || 0), startHour || 0);

      let endTime;
      // 終了時間が24:00の場合は翌日の0:00として扱う
      if (defaultEndTime === '24:00') {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        endTime = setHours(setMinutes(nextDay, 0), 0);
      } else {
        // それ以外の場合は当日の指定時刻
        const [endHour, endMinute] = defaultEndTime.split(':').map(Number);
        endTime = setHours(setMinutes(date, endMinute || 0), endHour || 0);

        // 終了時間が開始時間より前の場合は翌日として扱う
        if (endTime < currentTime) {
          endTime.setDate(endTime.getDate() + 1);
        }
      }

      while (currentTime < endTime) {
        const slotStartTime = format(currentTime, 'HH:mm');
        // intervalMinutesを使って正しい時間間隔で加算する
        const nextTime = new Date(currentTime);
        nextTime.setMinutes(nextTime.getMinutes() + intervalMinutes);

        // 次の時間が終了時間を超えないようにする
        const reaches24HourEnd =
          defaultEndTime === '24:00' && nextTime.getTime() >= endTime.getTime();
        const slotEndTime = reaches24HourEnd
          ? '24:00'
          : nextTime > endTime
            ? format(endTime, 'HH:mm')
            : format(nextTime, 'HH:mm');

        newTimeSlots.push({
          date,
          startTime: slotStartTime,
          endTime: slotEndTime,
        });

        currentTime = nextTime;
      }
    });

    setTimeSlots(newTimeSlots);
    setErrorMessage(null);
  }, [
    startDate,
    endDate,
    excludedDates,
    intervalUnit,
    defaultStartTime,
    defaultEndTime,
    allowPastDates,
  ]);

  useEffect(() => {
    if (forcedIntervalUnit) {
      setIntervalUnit(forcedIntervalUnit);
    }
  }, [forcedIntervalUnit]);
  useEffect(() => {
    if (isIntervalLocked) {
      setShowCustomSelect(true);
      return;
    }
    setShowCustomSelect((prev) => prev || !isQuickInterval);
  }, [isIntervalLocked, isQuickInterval]);

  /**
   * 時間枠の長さ（分）を切り替えるハンドラ
   */
  const handleIntervalUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setIntervalUnit(e.target.value);
  };

  // 日付文字列を安全にDate型に変換
  const parseDateSafely = (dateString: string): Date | null => {
    try {
      if (!dateString) return null;
      const date = parseISO(dateString);
      if (isNaN(date.getTime())) return null;
      return date;
    } catch {
      return null;
    }
  };

  // 開始日、終了日、除外日が変更されたとき、または時間間隔・各日の開始/終了時刻が変更されたときに時間枠を自動生成
  useEffect(() => {
    if (startDate && endDate) {
      try {
        // 開始日と終了日の間の全日付を生成
        const allDates = eachDayOfInterval({ start: startDate, end: endDate });

        // 除外日を除いたリストを作成
        const filteredDates = allDates.filter(
          (date) => !excludedDates.some((excludedDate) => isEqual(excludedDate, date)),
        );

        // 状態更新とコールバック
        onDatesChange?.(filteredDates);

        // 日付が設定されたら時間枠を自動生成
        generatePeriodTimeSlots();
      } catch {
        setErrorMessage('正しい期間を選択してください。開始日は終了日より前である必要があります。');
        onDatesChange?.([]);
      }
    }
  }, [
    startDate,
    endDate,
    excludedDates,
    intervalUnit,
    defaultStartTime,
    defaultEndTime,
    onDatesChange,
    generatePeriodTimeSlots,
  ]);

  // 開始日の変更処理
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = parseDateSafely(e.target.value);
    setStartDate(newDate);
    if (!allowPastDates) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (newDate && newDate < today) {
        setErrorMessage('開始日は本日以降の日付を選択してください');
        return;
      }
    }

    if (newDate && endDate && newDate > endDate) {
      setErrorMessage('開始日は終了日より前である必要があります');
    } else {
      setErrorMessage(null);
    }
  };

  // 終了日の変更処理
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = parseDateSafely(e.target.value);
    setEndDate(newDate);
    if (!allowPastDates) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (newDate && newDate < today) {
        setErrorMessage('終了日は本日以降の日付を選択してください');
        return;
      }
    }

    if (startDate && newDate && startDate > newDate) {
      setErrorMessage('終了日は開始日より後である必要があります');
    } else {
      setErrorMessage(null);
    }
  };

  // タイムスロットに変更があったらコールバック実行
  // 親から渡されるコールバックの参照が毎レンダーで変わっても
  // 無限ループを避けるためにref経由で最新を呼び出す
  const onTimeSlotsChangeRef = useRef(onTimeSlotsChange);
  const onDatesChangeRef = useRef(onDatesChange);

  useEffect(() => {
    onTimeSlotsChangeRef.current = onTimeSlotsChange;
  }, [onTimeSlotsChange]);

  useEffect(() => {
    onDatesChangeRef.current = onDatesChange;
  }, [onDatesChange]);

  useEffect(() => {
    onSettingsChange?.({
      startDate,
      endDate,
      defaultStartTime,
      defaultEndTime,
      intervalUnit,
    });
  }, [startDate, endDate, defaultStartTime, defaultEndTime, intervalUnit, onSettingsChange]);

  useEffect(() => {
    // 親コンポーネントにタイムスロット情報を渡す
    onTimeSlotsChangeRef.current(timeSlots);

    // 後方互換性のために日付配列も渡す（オプショナル）
    const cb = onDatesChangeRef.current;
    if (cb) {
      const uniqueDates = Array.from(
        new Set(timeSlots.map((slot) => format(slot.date, 'yyyy-MM-dd'))),
      ).map((dateStr) => new Date(dateStr));
      cb(uniqueDates);
    }
  }, [timeSlots]);

  // 各日の開始時刻変更ハンドラ
  const handleDefaultStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDefaultStartTime(e.target.value);
    // 時間が変更されたら時間枠を再生成
    if (startDate && endDate) {
      generatePeriodTimeSlots();
    }
  };

  // 各日の終了時刻変更ハンドラ
  const handleDefaultEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 「24:00」の特殊ケースを処理
    const value = e.target.value === '00:00' ? '24:00' : e.target.value;
    setDefaultEndTime(value);
    // 時間が変更されたら時間枠を再生成
    if (startDate && endDate) {
      generatePeriodTimeSlots();
    }
  };

  if (hideUi) {
    return null;
  }

  return (
    <div className="space-y-5">
      {/* フォーム用のポータルツールチップ中継（クリックされた?からカスタムツールチップを開く） */}
      <FormTipsRelay />
      {errorMessage && (
        <div className="alert alert-warning flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 shrink-0 stroke-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">期間</h3>
          <button
            type="button"
            tabIndex={-1}
            className="btn btn-xs btn-circle btn-ghost h-5 min-h-0 w-5 p-0"
            aria-label="期間ヘルプ"
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const detail = {
                x: rect.left,
                y: rect.bottom,
                text: 'イベント期間の開始日と終了日を指定します',
              } as const;
              window.dispatchEvent(new CustomEvent('form:show-tip', { detail }));
            }}
          >
            ?
          </button>
        </div>
        <div className="join w-full">
          <input
            id="drp-start-date"
            type="date"
            className="input input-bordered join-item w-full"
            value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
            onChange={handleStartDateChange}
            aria-label="開始日"
          />
          <span className="join-item hidden items-center px-3 text-sm text-base-content/60 sm:flex">
            〜
          </span>
          <input
            id="drp-end-date"
            type="date"
            className="input input-bordered join-item w-full"
            value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
            onChange={handleEndDateChange}
            aria-label="終了日"
          />
        </div>
        <div className="flex justify-between text-[11px] text-base-content/60">
          <span>開始日</span>
          <span className="sm:hidden">〜</span>
          <span>終了日</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">時間帯</h3>
          <button
            type="button"
            tabIndex={-1}
            className="btn btn-xs btn-circle btn-ghost h-5 min-h-0 w-5 p-0"
            aria-label="時間帯ヘルプ"
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const detail = {
                x: rect.left,
                y: rect.bottom,
                text: '各日の開始・終了時刻を指定します。終了時刻が開始時刻より早い場合は翌日扱いになります。',
              } as const;
              window.dispatchEvent(new CustomEvent('form:show-tip', { detail }));
            }}
          >
            ?
          </button>
        </div>
        <div className="join w-full">
          <input
            id="drp-default-start-time"
            type="time"
            className="input input-bordered join-item w-full"
            value={defaultStartTime}
            onChange={handleDefaultStartTimeChange}
            aria-label="各日の開始時刻"
          />
          <span className="join-item hidden items-center px-3 text-sm text-base-content/60 sm:flex">
            〜
          </span>
          <input
            id="drp-default-end-time"
            type="time"
            className="input input-bordered join-item w-full"
            value={defaultEndTime === '24:00' ? '00:00' : defaultEndTime}
            onChange={handleDefaultEndTimeChange}
            aria-label="各日の終了時刻"
          />
        </div>
        <div className="flex justify-between text-[11px] text-base-content/60">
          <span>開始時刻</span>
          <span className="sm:hidden">〜</span>
          <span>終了時刻</span>
        </div>
        <span className="label-text-alt text-info text-xs">
          00:00は翌日0:00として扱われます
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">時間枠の長さ</h3>
          <span className="text-xs text-base-content/60">1枠の長さ</span>
        </div>
        <div className="form-control w-full">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="drp-interval-unit" className="label-text text-xs font-medium">
              長さ
            </label>
            <button
              type="button"
              tabIndex={-1}
              className="btn btn-xs btn-circle btn-ghost h-5 min-h-0 w-5 p-0"
              aria-label="時間枠の長さヘルプ"
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const detail = {
                  x: rect.left,
                  y: rect.bottom,
                  text: '各枠の長さを分単位で設定します',
                } as const;
                window.dispatchEvent(new CustomEvent('form:show-tip', { detail }));
              }}
            >
              ?
            </button>
          </div>
          <div className="mt-2 flex flex-nowrap gap-2 overflow-x-auto">
            {quickIntervals.map((value) => {
              const label = selectableIntervalOptions.find((option) => option.value === value)
                ?.label;
              return (
                <button
                  key={value}
                  type="button"
                  className={`btn btn-xs ${intervalUnit === value ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => {
                    setIntervalUnit(value);
                    setShowCustomSelect(false);
                  }}
                  disabled={isIntervalLocked}
                >
                  {label ?? `${value}分`}
                </button>
              );
            })}
            <button
              type="button"
              className={`btn btn-xs ${!isQuickInterval ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setShowCustomSelect(true)}
              disabled={isIntervalLocked}
            >
              その他
            </button>
          </div>
          {showCustomSelect && (
            <select
              id="drp-interval-unit"
              className="select select-bordered mt-2 w-full"
              value={intervalUnit}
              onChange={(e) => {
                handleIntervalUnitChange(e);
                const nextValue = e.target.value;
                if (quickIntervals.includes(nextValue)) {
                  setShowCustomSelect(false);
                }
              }}
              aria-label="時間枠の長さ"
              disabled={isIntervalLocked}
            >
              {selectableIntervalOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
          {isIntervalLocked && (
            <span className="label-text-alt mt-1 text-base-content/60">
              既存イベントの設定に合わせて固定されています
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ローカルコンポーネント：date-range-picker 内の "?" クリックでポータルツールチップを出す
function FormTipsRelay() {
  const [open, setOpen] = React.useState(false);
  const [anchor, setAnchor] = React.useState<{ x: number; y: number } | null>(null);
  const [text, setText] = React.useState('');

  React.useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ x: number; y: number; text: string }>;
      setAnchor({ x: ce.detail.x, y: ce.detail.y });
      setText(ce.detail.text);
      setOpen(true);
      e.stopPropagation();
    };
    window.addEventListener('form:show-tip', handler as EventListener);
    return () => window.removeEventListener('form:show-tip', handler as EventListener);
  }, []);

  return <PortalTooltip open={open} anchor={anchor} text={text} onClose={() => setOpen(false)} />;
}
