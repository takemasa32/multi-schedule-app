'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import React from 'react';
import PortalTooltip from './common/portal-tooltip';
import { format, eachDayOfInterval, isEqual, parseISO, setHours, setMinutes } from 'date-fns';
import { TimeSlot } from '@/lib/utils'; // 共通のTimeSlot型をインポート

interface DateRangePickerProps {
  onDatesChange?: (dates: Date[]) => void; // 後方互換性のため残す
  onTimeSlotsChange: (timeSlots: TimeSlot[]) => void; // 新しいコールバック
  /** 初期開始日（未指定時はnull） */
  initialStartDate?: Date | null;
  /** 初期終了日（未指定時はnull） */
  initialEndDate?: Date | null;
  /** 初期の基本開始時刻（例: "09:00"、未指定時は"08:00"） */
  initialDefaultStartTime?: string;
  /** 初期の基本終了時刻（例: "18:00"、未指定時は"18:00"） */
  initialDefaultEndTime?: string;
  /** 初期時間間隔（分、文字列。例: "60"。未指定時は"120"） */
  initialIntervalUnit?: string;
  /** 時間間隔を固定する場合の分指定（指定時は UI をロックする） */
  forcedIntervalMinutes?: number | null;
  /** 過去日もスロット生成対象にする（手動入力UIで使用） */
  allowPastDates?: boolean;
}

export default function DateRangePicker({
  onDatesChange,
  onTimeSlotsChange,
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
      // デフォルト開始時間を設定
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
        const slotEndTime =
          nextTime > endTime
            ? defaultEndTime === '24:00'
              ? '24:00'
              : format(endTime, 'HH:mm')
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

  // 開始日、終了日、除外日が変更されたとき、または時間間隔・デフォルト時間が変更されたときに時間枠を自動生成
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

  // デフォルト開始時間変更ハンドラ
  const handleDefaultStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDefaultStartTime(e.target.value);
    // 時間が変更されたら時間枠を再生成
    if (startDate && endDate) {
      generatePeriodTimeSlots();
    }
  };

  // デフォルト終了時間変更ハンドラ
  const handleDefaultEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 「24:00」の特殊ケースを処理
    const value = e.target.value === '00:00' ? '24:00' : e.target.value;
    setDefaultEndTime(value);
    // 時間が変更されたら時間枠を再生成
    if (startDate && endDate) {
      generatePeriodTimeSlots();
    }
  };

  return (
    <div className="space-y-6">
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

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <div className="form-control w-full">
          <div className="flex items-center gap-1">
            <label htmlFor="drp-start-date" className="label-text font-semibold">
              開始日
            </label>
            <button
              type="button"
              tabIndex={-1}
              className="btn btn-xs btn-circle btn-ghost h-5 min-h-0 w-5 p-0"
              aria-label="開始日ヘルプ"
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const detail = {
                  x: rect.left,
                  y: rect.bottom,
                  text: 'イベント期間の開始日',
                } as const;
                window.dispatchEvent(new CustomEvent('form:show-tip', { detail }));
              }}
            >
              ?
            </button>
          </div>
          <input
            id="drp-start-date"
            type="date"
            className="input input-bordered mt-1 w-full"
            value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
            onChange={handleStartDateChange}
            aria-label="開始日"
          />
        </div>
        <div className="form-control w-full">
          <div className="flex items-center gap-1">
            <label htmlFor="drp-end-date" className="label-text font-semibold">
              終了日
            </label>
            <button
              type="button"
              tabIndex={-1}
              className="btn btn-xs btn-circle btn-ghost h-5 min-h-0 w-5 p-0"
              aria-label="終了日ヘルプ"
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const detail = {
                  x: rect.left,
                  y: rect.bottom,
                  text: 'イベント期間の終了日',
                } as const;
                window.dispatchEvent(new CustomEvent('form:show-tip', { detail }));
              }}
            >
              ?
            </button>
          </div>
          <input
            id="drp-end-date"
            type="date"
            className="input input-bordered mt-1 w-full"
            value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
            onChange={handleEndDateChange}
            aria-label="終了日"
          />
        </div>
      </div>

      <div className="card bg-base-100 border-base-200 border shadow">
        <div className="card-body p-3 sm:p-4">
          <h3 className="card-title mb-2 text-base font-bold">時間枠の設定</h3>
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <div className="form-control w-full">
              <div className="flex items-center gap-1">
                <label htmlFor="drp-default-start-time" className="label-text">
                  候補枠の開始基準時刻
                </label>
                <button
                  type="button"
                  tabIndex={-1}
                  className="btn btn-xs btn-circle btn-ghost h-5 min-h-0 w-5 p-0"
                  aria-label="候補枠の開始基準時刻ヘルプ"
                  onClick={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const detail = {
                      x: rect.left,
                      y: rect.bottom,
                      text:
                        '候補枠を自動生成するときの開始基準です。指定した時刻から時間枠を作成します。',
                    } as const;
                    window.dispatchEvent(new CustomEvent('form:show-tip', { detail }));
                  }}
                >
                  ?
                </button>
              </div>
              <input
                id="drp-default-start-time"
                type="time"
                className="input input-bordered mt-1 w-full"
                value={defaultStartTime}
                onChange={handleDefaultStartTimeChange}
                aria-label="候補枠の開始基準時刻"
              />
            </div>
            <div className="form-control w-full">
              <div className="flex items-center gap-1">
                <label htmlFor="drp-default-end-time" className="label-text">
                  候補枠の終了基準時刻
                </label>
                <button
                  type="button"
                  tabIndex={-1}
                  className="btn btn-xs btn-circle btn-ghost h-5 min-h-0 w-5 p-0"
                  aria-label="候補枠の終了基準時刻ヘルプ"
                  onClick={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const detail = {
                      x: rect.left,
                      y: rect.bottom,
                      text:
                        '候補枠を自動生成するときの終了基準です。開始基準より早い場合は翌日扱いになります。',
                    } as const;
                    window.dispatchEvent(new CustomEvent('form:show-tip', { detail }));
                  }}
                >
                  ?
                </button>
              </div>
              <input
                id="drp-default-end-time"
                type="time"
                className="input input-bordered mt-1 w-full"
                value={defaultEndTime === '24:00' ? '00:00' : defaultEndTime}
                onChange={handleDefaultEndTimeChange}
                aria-label="候補枠の終了基準時刻"
              />
              <span className="label-text-alt text-info mt-1">00:00は翌日0:00として扱われます</span>
            </div>
          </div>
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
