"use client";

import { useState, useEffect } from "react";
import {
  format,
  eachDayOfInterval,
  isWithinInterval,
  isEqual,
  parseISO,
} from "date-fns";
import { ja } from "date-fns/locale";

interface DateRangePickerProps {
  onDatesChange: (dates: Date[]) => void;
}

export default function DateRangePicker({
  onDatesChange,
}: DateRangePickerProps) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [excludedDates, setExcludedDates] = useState<Date[]>([]);
  const [excludeDate, setExcludeDate] = useState<string>("");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        onDatesChange(filteredDates);
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage(
          "正しい期間を選択してください。開始日は終了日より前である必要があります。"
        );
        setSelectedDates([]);
        onDatesChange([]);
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="start-date"
            className="block text-sm font-medium mb-1"
          >
            開始日 <span className="text-error">*</span>
          </label>
          <input
            type="date"
            id="start-date"
            className="input input-bordered w-full"
            onChange={handleStartDateChange}
            required
          />
        </div>
        <div>
          <label htmlFor="end-date" className="block text-sm font-medium mb-1">
            終了日 <span className="text-error">*</span>
          </label>
          <input
            type="date"
            id="end-date"
            className="input input-bordered w-full"
            onChange={handleEndDateChange}
            min={startDate ? format(startDate, "yyyy-MM-dd") : undefined}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="exclude-date" className="block text-sm font-medium">
          除外日を設定
        </label>
        <div className="flex space-x-2">
          <input
            type="date"
            id="exclude-date"
            className="input input-bordered flex-1"
            value={excludeDate}
            onChange={(e) => setExcludeDate(e.target.value)}
            min={startDate ? format(startDate, "yyyy-MM-dd") : undefined}
            max={endDate ? format(endDate, "yyyy-MM-dd") : undefined}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleAddExcludeDate}
          >
            除外日を追加
          </button>
        </div>
      </div>

      {/* 除外日リスト */}
      {excludedDates.length > 0 && (
        <div className="bg-base-200 p-3 rounded-md">
          <h4 className="font-medium mb-2">除外日一覧:</h4>
          <ul className="space-y-1">
            {excludedDates.map((date, index) => (
              <li key={index} className="flex justify-between items-center">
                <span>{format(date, "yyyy年MM月dd日(E)", { locale: ja })}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => handleRemoveExcludeDate(date)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 候補日程プレビュー */}
      {selectedDates.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">
            候補日程プレビュー（{selectedDates.length}日間）:
          </h4>
          <div className="bg-base-200 p-3 rounded-md max-h-40 overflow-y-auto">
            {selectedDates.map((date, index) => (
              <div key={index} className="mb-1">
                {format(date, "yyyy年MM月dd日(E)", { locale: ja })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 日程情報を隠し項目として保持 */}
      {selectedDates.map((date, index) => (
        <input
          key={index}
          type="hidden"
          name="dates"
          value={format(date, "yyyy-MM-dd")}
        />
      ))}
    </div>
  );
}
