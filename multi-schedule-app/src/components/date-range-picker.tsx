"use client";

import { useState } from "react";

interface DateRangePickerProps {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  setDateRange: (range: { startDate: Date; endDate: Date }) => void;
  excludedDates: Date[];
  onAddExcludedDate: (date: Date) => void;
  onRemoveExcludedDate: (index: number) => void;
}

export default function DateRangePicker({
  dateRange,
  setDateRange,
  excludedDates,
  onAddExcludedDate,
  onRemoveExcludedDate,
}: DateRangePickerProps) {
  const [newExcludeDate, setNewExcludeDate] = useState<string>("");

  // 日付をYYYY-MM-DD形式に変換する関数
  const formatDate = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  // 期間の開始日変更ハンドラ
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = new Date(e.target.value);
    setDateRange({
      startDate: newStartDate,
      endDate:
        newStartDate > dateRange.endDate ? newStartDate : dateRange.endDate,
    });
  };

  // 期間の終了日変更ハンドラ
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = new Date(e.target.value);
    setDateRange({
      startDate:
        newEndDate < dateRange.startDate ? newEndDate : dateRange.startDate,
      endDate: newEndDate,
    });
  };

  // 除外日追加ハンドラ
  const handleAddExcludedDate = () => {
    if (!newExcludeDate) return;

    const excludeDate = new Date(newExcludeDate);

    // 範囲内の日付であることを確認
    if (excludeDate < dateRange.startDate || excludeDate > dateRange.endDate) {
      alert("除外する日付は期間内の日付を選択してください");
      return;
    }

    // 既に除外リストにあるか確認
    const alreadyExists = excludedDates.some(
      (date) =>
        date.getFullYear() === excludeDate.getFullYear() &&
        date.getMonth() === excludeDate.getMonth() &&
        date.getDate() === excludeDate.getDate()
    );

    if (alreadyExists) {
      alert("この日付は既に除外リストに追加されています");
      return;
    }

    onAddExcludedDate(excludeDate);
    setNewExcludeDate("");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">開始日</span>
          </label>
          <input
            type="date"
            value={formatDate(dateRange.startDate)}
            onChange={handleStartDateChange}
            className="input input-bordered"
            min={formatDate(new Date())} // 今日以降の日付のみ
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">終了日</span>
          </label>
          <input
            type="date"
            value={formatDate(dateRange.endDate)}
            onChange={handleEndDateChange}
            className="input input-bordered"
            min={formatDate(dateRange.startDate)} // 開始日以降の日付のみ
          />
        </div>
      </div>

      <div className="divider">除外する日</div>

      <div className="flex flex-col md:flex-row gap-2">
        <div className="form-control flex-1">
          <input
            type="date"
            value={newExcludeDate}
            onChange={(e) => setNewExcludeDate(e.target.value)}
            className="input input-bordered"
            min={formatDate(dateRange.startDate)}
            max={formatDate(dateRange.endDate)}
          />
        </div>
        <button
          type="button"
          onClick={handleAddExcludedDate}
          className="btn btn-outline"
          disabled={!newExcludeDate}
        >
          除外日を追加
        </button>
      </div>

      {/* 除外日リスト */}
      {excludedDates.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">除外する日程：</h3>
          <div className="flex flex-wrap gap-2">
            {excludedDates.map((date, index) => (
              <div key={index} className="badge badge-lg gap-2">
                {date.toLocaleDateString("ja-JP")}
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => onRemoveExcludedDate(index)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 候補日程のプレビュー */}
      <div className="card bg-base-200 p-4 mt-4">
        <h3 className="text-sm font-medium mb-2">候補日程プレビュー：</h3>
        <p className="text-sm">
          {formatDate(dateRange.startDate)} から {formatDate(dateRange.endDate)}{" "}
          の期間
          {excludedDates.length > 0
            ? `（${excludedDates.length}日を除外）`
            : ""}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          候補日数:{" "}
          {Math.floor(
            (dateRange.endDate.getTime() - dateRange.startDate.getTime()) /
              (1000 * 60 * 60 * 24)
          ) +
            1 -
            excludedDates.length}
          日
        </p>
      </div>
    </div>
  );
}
