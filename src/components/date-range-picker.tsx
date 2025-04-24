"use client";

import { useState, useEffect } from "react";
import {
  format,
  eachDayOfInterval,
  isWithinInterval,
  isEqual,
  parseISO,
  addHours,
  setHours,
  setMinutes,
} from "date-fns";
import { ja } from "date-fns/locale";
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
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [intervalUnit, setIntervalUnit] = useState<string>("60"); // 時間帯の単位（分）

  // 新しいタイムスロットを追加
  const addTimeSlot = () => {
    if (!startDate) {
      setErrorMessage("まず開始日を選択してください");
      return;
    }

    // デフォルトの時間枠を設定（例: 10:00-11:00）
    const newSlot: TimeSlot = {
      date: startDate,
      startTime: "10:00",
      endTime: "11:00",
    };

    setTimeSlots([...timeSlots, newSlot]);
  };

  // タイムスロットを削除
  const removeTimeSlot = (index: number) => {
    const updatedSlots = [...timeSlots];
    updatedSlots.splice(index, 1);
    setTimeSlots(updatedSlots);
  };

  // タイムスロットの日付を更新
  const updateTimeSlotDate = (index: number, dateStr: string) => {
    const date = parseDateSafely(dateStr);
    if (!date) return;

    const updatedSlots = [...timeSlots];
    updatedSlots[index] = {
      ...updatedSlots[index],
      date,
    };
    setTimeSlots(updatedSlots);
  };

  // タイムスロットの開始時間を更新
  const updateTimeSlotStart = (index: number, timeStr: string) => {
    const updatedSlots = [...timeSlots];
    updatedSlots[index] = {
      ...updatedSlots[index],
      startTime: timeStr,
    };
    setTimeSlots(updatedSlots);
  };

  // タイムスロットの終了時間を更新
  const updateTimeSlotEnd = (index: number, timeStr: string) => {
    const updatedSlots = [...timeSlots];
    updatedSlots[index] = {
      ...updatedSlots[index],
      endTime: timeStr,
    };
    setTimeSlots(updatedSlots);
  };

  // 無限ループを修正：依存配列を適切に設定
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
        setSelectedDates(filteredDates);
        onDatesChange?.(filteredDates);
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage(
          "正しい期間を選択してください。開始日は終了日より前である必要があります。"
        );
        setSelectedDates([]);
        onDatesChange?.([]);
      }
    }
  }, [startDate, endDate, excludedDates, onDatesChange]); // 依存配列を明示的に設定

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

  // 開始日の変更処理
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = parseDateSafely(e.target.value);
    setStartDate(newDate);
    if (newDate && endDate && newDate > endDate) {
      setErrorMessage("開始日は終了日より前である必要があります");
    } else {
      setErrorMessage(null);
    }
  };

  // 終了日の変更処理
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = parseDateSafely(e.target.value);
    setEndDate(newDate);
    if (startDate && newDate && startDate > newDate) {
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

  // 期間全体を時間帯に分割する（15分、30分、60分など）
  const generatePeriodTimeSlots = () => {
    if (!startDate || !endDate) {
      setErrorMessage("開始日と終了日を設定してください");
      return;
    }

    // 除外日を除いた日付のみを対象にする
    const targetDates = eachDayOfInterval({
      start: startDate,
      end: endDate,
    }).filter(
      (date) => !excludedDates.some((excluded) => isEqual(excluded, date))
    );

    // 文字列から数値に変換（分単位）
    const intervalMinutes = parseInt(intervalUnit);
    if (isNaN(intervalMinutes) || intervalMinutes <= 0) {
      setErrorMessage("有効な時間間隔を選択してください");
      return;
    }

    // デフォルトの開始時刻と終了時刻（例: 9:00-17:00）
    const defaultStartHour = 9;
    const defaultEndHour = 17;

    const newTimeSlots: TimeSlot[] = [];

    targetDates.forEach((date) => {
      // 9:00 から 17:00まで、選択された間隔で時間枠を生成
      let currentTime = setHours(setMinutes(date, 0), defaultStartHour);
      const endTime = setHours(setMinutes(date, 0), defaultEndHour);

      while (currentTime < endTime) {
        const slotStartTime = format(currentTime, "HH:mm");
        // intervalMinutesを使って正しい時間間隔で加算する
        const nextTime = new Date(currentTime);
        nextTime.setMinutes(nextTime.getMinutes() + intervalMinutes);
        const slotEndTime = format(nextTime, "HH:mm");

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

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="alert alert-warning">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
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
        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">開始日</span>
            </div>
            <input
              type="date"
              className="input input-bordered w-full"
              value={startDate ? format(startDate, "yyyy-MM-dd") : ""}
              onChange={handleStartDateChange}
            />
          </label>
        </div>

        <div>
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text">終了日</span>
            </div>
            <input
              type="date"
              className="input input-bordered w-full"
              value={endDate ? format(endDate, "yyyy-MM-dd") : ""}
              onChange={handleEndDateChange}
            />
          </label>
        </div>
      </div>

      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h3 className="card-title text-lg">除外日の設定</h3>
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
                className="btn btn-primary"
                onClick={handleAddExcludeDate}
              >
                追加
              </button>
            </div>

            {excludedDates.length > 0 && (
              <div className="mt-2">
                <h4 className="text-sm font-semibold mb-1">除外する日：</h4>
                <div className="flex flex-wrap gap-2">
                  {excludedDates.map((date, index) => (
                    <div key={index} className="badge badge-outline gap-2 p-3">
                      {format(date, "yyyy/MM/dd")}
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => handleRemoveExcludeDate(date)}
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

      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h3 className="card-title text-lg">時間枠の設定</h3>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-grow">
              <label className="form-control w-full">
                <div className="label">
                  <span className="label-text">時間枠の間隔</span>
                </div>
                <select
                  className="select select-bordered w-full"
                  value={intervalUnit}
                  onChange={handleIntervalChange}
                >
                  <option value="15">15分</option>
                  <option value="30">30分</option>
                  <option value="60">1時間</option>
                  <option value="120">2時間</option>
                </select>
              </label>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={generatePeriodTimeSlots}
            >
              時間枠を自動生成
            </button>
            <button
              type="button"
              className="btn btn-outline btn-primary"
              onClick={addTimeSlot}
            >
              時間枠を手動追加
            </button>
          </div>

          {/* タイムスロットの一覧表示と編集UI */}
          {timeSlots.length > 0 && (
            <div className="overflow-x-auto mt-4">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>日付</th>
                    <th>開始時間</th>
                    <th>終了時間</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((slot, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="date"
                          className="input input-bordered input-sm w-full"
                          value={format(slot.date, "yyyy-MM-dd")}
                          onChange={(e) =>
                            updateTimeSlotDate(index, e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="time"
                          className="input input-bordered input-sm w-full"
                          value={slot.startTime}
                          onChange={(e) =>
                            updateTimeSlotStart(index, e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="time"
                          className="input input-bordered input-sm w-full"
                          value={slot.endTime}
                          onChange={(e) =>
                            updateTimeSlotEnd(index, e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-error"
                          onClick={() => removeTimeSlot(index)}
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedDates.length > 0 && (
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h3 className="card-title text-lg">選択中の日程</h3>
            <p>
              {selectedDates.length}日間の日程が選択されています：
              {selectedDates.slice(0, 3).map((date, i) => (
                <span key={i} className="badge badge-primary mx-1">
                  {format(date, "yyyy/MM/dd")}
                </span>
              ))}
              {selectedDates.length > 3 && "..."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
