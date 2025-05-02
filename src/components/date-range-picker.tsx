"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format,
  eachDayOfInterval,
  isWithinInterval,
  isEqual,
  parseISO,
  setHours,
  setMinutes,
} from "date-fns";
import { TimeSlot } from "@/lib/utils"; // 共通のTimeSlot型をインポート

interface DateRangePickerProps {
  onDatesChange?: (dates: Date[]) => void; // 後方互換性のため残す
  onTimeSlotsChange: (timeSlots: TimeSlot[]) => void; // 新しいコールバック
}

export default function DateRangePicker({
  onDatesChange,
  onTimeSlotsChange,
}: DateRangePickerProps) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [excludedDates, setExcludedDates] = useState<Date[]>([]);
  const [excludeDate, setExcludeDate] = useState<string>("");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [intervalUnit, setIntervalUnit] = useState<string>("120"); // 時間帯の単位（分）

  // デフォルトの開始時間と終了時間を0時から24時に設定
  const [defaultStartTime, setDefaultStartTime] = useState<string>("00:00");
  const [defaultEndTime, setDefaultEndTime] = useState<string>("24:00");

  // 期間全体を時間帯に分割する（15分、30分、60分など）
  const generatePeriodTimeSlots = useCallback(() => {
    if (!startDate || !endDate) {
      setErrorMessage("開始日と終了日を設定してください");
      setTimeSlots([]);
      return;
    }
    // 過去日を候補にしない（本日未満は除外）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate < today) {
      setErrorMessage("開始日は本日以降の日付を選択してください");
      setTimeSlots([]);
      return;
    }
    if (endDate < today) {
      setErrorMessage("終了日は本日以降の日付を選択してください");
      setTimeSlots([]);
      return;
    }
    if (startDate > endDate) {
      setErrorMessage("開始日は終了日より前である必要があります");
      setTimeSlots([]);
      return;
    }

    // 除外日を除いた日付のみを対象にする
    const targetDates = eachDayOfInterval({
      start: startDate,
      end: endDate,
    })
      .filter(
        (date) => !excludedDates.some((excluded) => isEqual(excluded, date))
      )
      .filter((date) => date >= today); // 過去日除外

    if (targetDates.length === 0) {
      setErrorMessage(
        "候補日程が1つもありません。期間や除外日を見直してください"
      );
      setTimeSlots([]);
      return;
    }

    // 文字列から数値に変換（分単位）
    const intervalMinutes = parseInt(intervalUnit);
    if (isNaN(intervalMinutes) || intervalMinutes <= 0) {
      setErrorMessage("有効な時間間隔を選択してください");
      return;
    }

    const newTimeSlots: TimeSlot[] = [];

    targetDates.forEach((date) => {
      // デフォルト開始時間を設定
      const [startHour, startMinute] = defaultStartTime.split(":").map(Number);
      let currentTime = setHours(
        setMinutes(date, startMinute || 0),
        startHour || 0
      );

      let endTime;
      // 終了時間が24:00の場合は翌日の0:00として扱う
      if (defaultEndTime === "24:00") {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        endTime = setHours(setMinutes(nextDay, 0), 0);
      } else {
        // それ以外の場合は当日の指定時刻
        const [endHour, endMinute] = defaultEndTime.split(":").map(Number);
        endTime = setHours(setMinutes(date, endMinute || 0), endHour || 0);

        // 終了時間が開始時間より前の場合は翌日として扱う
        if (endTime < currentTime) {
          endTime.setDate(endTime.getDate() + 1);
        }
      }

      while (currentTime < endTime) {
        const slotStartTime = format(currentTime, "HH:mm");
        // intervalMinutesを使って正しい時間間隔で加算する
        const nextTime = new Date(currentTime);
        nextTime.setMinutes(nextTime.getMinutes() + intervalMinutes);

        // 次の時間が終了時間を超えないようにする
        const slotEndTime =
          nextTime > endTime
            ? defaultEndTime === "24:00"
              ? "24:00"
              : format(endTime, "HH:mm")
            : format(nextTime, "HH:mm");

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
  ]);

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
          (date) =>
            !excludedDates.some((excludedDate) => isEqual(excludedDate, date))
        );

        // 状態更新とコールバック
        onDatesChange?.(filteredDates);

        // 日付が設定されたら時間枠を自動生成
        generatePeriodTimeSlots();
      } catch {
        setErrorMessage(
          "正しい期間を選択してください。開始日は終了日より前である必要があります。"
        );
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newDate && newDate < today) {
      setErrorMessage("開始日は本日以降の日付を選択してください");
    } else if (newDate && endDate && newDate > endDate) {
      setErrorMessage("開始日は終了日より前である必要があります");
    } else {
      setErrorMessage(null);
    }
  };

  // 終了日の変更処理
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = parseDateSafely(e.target.value);
    setEndDate(newDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newDate && newDate < today) {
      setErrorMessage("終了日は本日以降の日付を選択してください");
    } else if (startDate && newDate && startDate > newDate) {
      setErrorMessage("終了日は開始日より後である必要があります");
    } else {
      setErrorMessage(null);
    }
  };

  // 除外日を追加
  const handleAddExcludeDate = () => {
    if (!excludeDate) {
      setErrorMessage("除外する日付を選択してください");
      return;
    }

    const newExcludeDate = parseDateSafely(excludeDate);
    if (!newExcludeDate) {
      setErrorMessage("有効な日付を選択してください");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newExcludeDate < today) {
      setErrorMessage("除外日は本日以降の日付のみ指定できます");
      return;
    }

    // 既に追加済みの日付は追加しない
    if (excludedDates.some((date) => isEqual(date, newExcludeDate))) {
      setErrorMessage("この日付は既に除外リストに追加されています");
      return;
    }

    // 期間内の日付のみ除外可能
    if (
      startDate &&
      endDate &&
      isWithinInterval(newExcludeDate, { start: startDate, end: endDate })
    ) {
      setExcludedDates([...excludedDates, newExcludeDate]);
      setExcludeDate("");
      setErrorMessage(null);
    } else {
      setErrorMessage("除外日は選択した期間内である必要があります");
    }
  };

  // 除外日を削除
  const handleRemoveExcludeDate = (dateToRemove: Date) => {
    setExcludedDates(
      excludedDates.filter((date) => !isEqual(date, dateToRemove))
    );
  };

  // タイムスロットに変更があったらコールバック実行
  useEffect(() => {
    // 親コンポーネントにタイムスロット情報を渡す
    onTimeSlotsChange(timeSlots);

    // 後方互換性のために日付配列も渡す（オプショナル）
    if (onDatesChange) {
      const uniqueDates = Array.from(
        new Set(timeSlots.map((slot) => format(slot.date, "yyyy-MM-dd")))
      ).map((dateStr) => new Date(dateStr));
      onDatesChange(uniqueDates);
    }
  }, [timeSlots, onTimeSlotsChange, onDatesChange]);

  // 時間間隔の選択肢変更ハンドラ
  const handleIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setIntervalUnit(e.target.value);
  };

  // デフォルト開始時間変更ハンドラ
  const handleDefaultStartTimeChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setDefaultStartTime(e.target.value);
    // 時間が変更されたら時間枠を再生成
    if (startDate && endDate) {
      setTimeSlots([]); // 一度クリアしてから
      setTimeout(() => generatePeriodTimeSlots(), 0);
    }
  };

  // デフォルト終了時間変更ハンドラ
  const handleDefaultEndTimeChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    // 「24:00」の特殊ケースを処理
    const value = e.target.value === "00:00" ? "24:00" : e.target.value;
    setDefaultEndTime(value);
    // 時間が変更されたら時間枠を再生成
    if (startDate && endDate) {
      setTimeSlots([]); // 一度クリアしてから
      setTimeout(() => generatePeriodTimeSlots(), 0);
    }
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="alert alert-warning flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-5 w-5"
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

      <div className="grid md:grid-cols-2 gap-4">
        <label className="form-control w-full">
          <span className="label-text font-semibold flex items-center gap-1">
            開始日
            <span
              className="tooltip tooltip-bottom"
              data-tip="イベント期間の開始日"
            >
              <button
                type="button"
                tabIndex={-1}
                className="btn btn-xs btn-circle btn-ghost p-0 min-h-0 h-5 w-5"
              >
                ?
              </button>
            </span>
          </span>
          <input
            type="date"
            className="input input-bordered w-full mt-1"
            value={startDate ? format(startDate, "yyyy-MM-dd") : ""}
            onChange={handleStartDateChange}
          />
        </label>
        <label className="form-control w-full">
          <span className="label-text font-semibold flex items-center gap-1">
            終了日
            <span
              className="tooltip tooltip-bottom"
              data-tip="イベント期間の終了日"
            >
              <button
                type="button"
                tabIndex={-1}
                className="btn btn-xs btn-circle btn-ghost p-0 min-h-0 h-5 w-5"
              >
                ?
              </button>
            </span>
          </span>
          <input
            type="date"
            className="input input-bordered w-full mt-1"
            value={endDate ? format(endDate, "yyyy-MM-dd") : ""}
            onChange={handleEndDateChange}
          />
        </label>
      </div>

      <div className="card bg-base-100 shadow border border-base-200">
        <div className="card-body p-4">
          <h3 className="card-title text-base font-bold mb-2 flex items-center gap-1">
            除外日の設定
            <span
              className="tooltip tooltip-bottom"
              data-tip="候補から外したい日付を指定できます"
            >
              <button
                type="button"
                tabIndex={-1}
                className="btn btn-xs btn-circle btn-ghost p-0 min-h-0 h-5 w-5"
              >
                ?
              </button>
            </span>
          </h3>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="date"
                className="input input-bordered flex-grow"
                value={excludeDate}
                onChange={(e) => setExcludeDate(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-outline btn-primary"
                onClick={handleAddExcludeDate}
              >
                追加
              </button>
            </div>
            {excludedDates.length > 0 && (
              <div className="mt-2">
                <h4 className="text-xs font-semibold mb-1 text-gray-500">
                  除外する日：
                </h4>
                <div className="flex flex-wrap gap-2">
                  {excludedDates.map((date, index) => (
                    <div
                      key={index}
                      className="badge badge-outline gap-2 p-2 bg-base-200"
                    >
                      {format(date, "yyyy/MM/dd")}
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs ml-1"
                        onClick={() => handleRemoveExcludeDate(date)}
                        aria-label="除外日を削除"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow border border-base-200">
        <div className="card-body p-4">
          <h3 className="card-title text-base font-bold mb-2">時間枠の設定</h3>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <label className="form-control w-full">
              <span className="label-text flex items-center gap-1">
                デフォルト開始時間
                <span
                  className="tooltip tooltip-bottom"
                  data-tip="各日の開始範囲時間を設定します"
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    className="btn btn-xs btn-circle btn-ghost p-0 min-h-0 h-5 w-5"
                  >
                    ?
                  </button>
                </span>
              </span>
              <input
                type="time"
                className="input input-bordered w-full mt-1"
                value={defaultStartTime}
                onChange={handleDefaultStartTimeChange}
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text flex items-center gap-1">
                デフォルト終了時間
                <span
                  className="tooltip tooltip-bottom"
                  data-tip="各日の終了範囲時間を設定します"
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    className="btn btn-xs btn-circle btn-ghost p-0 min-h-0 h-5 w-5"
                  >
                    ?
                  </button>
                </span>
              </span>
              <input
                type="time"
                className="input input-bordered w-full mt-1"
                value={defaultEndTime === "24:00" ? "00:00" : defaultEndTime}
                onChange={handleDefaultEndTimeChange}
              />
              <span className="label-text-alt text-info mt-1">
                00:00は翌日0:00として扱われます
              </span>
            </label>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <label className="form-control w-full">
              <span className="label-text flex items-center gap-1">
                時間枠の間隔
                <span
                  className="tooltip tooltip-bottom"
                  data-tip="1枠あたりの時間の長さを選択してください"
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    className="btn btn-xs btn-circle btn-ghost p-0 min-h-0 h-5 w-5"
                  >
                    ?
                  </button>
                </span>
              </span>
              <select
                className="select select-bordered w-full bg-base-100 text-base-content mt-1"
                value={intervalUnit}
                onChange={handleIntervalChange}
              >
                <option value="15">15分</option>
                <option value="30">30分</option>
                <option value="60">1時間</option>
                <option value="120">2時間</option>
                <option value="180">3時間</option>
                <option value="360">6時間</option>
                <option value="720">12時間</option>
              </select>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
