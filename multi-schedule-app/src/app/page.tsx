"use client";

import { useState } from "react";
import { createEvent } from "@/src/app/actions";
import DateRangePicker from "@/src/components/date-range-picker";

export default function Home() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateRange, setDateRange] = useState({
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1週間後をデフォルト終了日に
  });
  const [excludedDates, setExcludedDates] = useState<Date[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleAddExcludedDate = (date: Date) => {
    setExcludedDates([...excludedDates, date]);
  };

  const handleRemoveExcludedDate = (indexToRemove: number) => {
    setExcludedDates(
      excludedDates.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    // バリデーション
    if (!title.trim()) {
      setErrorMessage("イベント名は必須です");
      setIsSubmitting(false);
      return;
    }

    try {
      // 開始日から終了日までの全日付を生成
      const allDates = generateDateRange(
        dateRange.startDate,
        dateRange.endDate
      );

      // 除外日を除いた候補日程を作成
      const candidateDates = allDates.filter(
        (date) =>
          !excludedDates.some((excludedDate) => isSameDay(excludedDate, date))
      );

      if (candidateDates.length === 0) {
        setErrorMessage(
          "有効な候補日程がありません。期間設定を見直してください。"
        );
        setIsSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);

      // 候補日程を追加
      candidateDates.forEach((date) => {
        formData.append("dates", date.toISOString().split("T")[0]); // YYYY-MM-DD形式で追加
      });

      await createEvent(formData);
      // 成功すれば自動的にリダイレクト
    } catch (error) {
      console.error("イベント作成エラー:", error);
      setErrorMessage("イベント作成中にエラーが発生しました。");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">新規イベント作成</h1>

      {errorMessage && (
        <div className="alert alert-error mb-4">
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card bg-base-100 shadow-xl p-6">
        <div className="form-control mb-4">
          <label className="label" htmlFor="title">
            <span className="label-text">イベント名</span>
            <span className="label-text-alt text-error">*必須</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input input-bordered w-full"
            placeholder="例: 社内ミーティング"
            required
          />
        </div>

        <div className="form-control mb-6">
          <label className="label" htmlFor="description">
            <span className="label-text">説明</span>
            <span className="label-text-alt">任意</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="textarea textarea-bordered h-24"
            placeholder="イベントの詳細や備考を記入してください"
          />
        </div>

        <div className="divider">候補日程の期間設定</div>

        <DateRangePicker
          dateRange={dateRange}
          setDateRange={setDateRange}
          excludedDates={excludedDates}
          onAddExcludedDate={handleAddExcludedDate}
          onRemoveExcludedDate={handleRemoveExcludedDate}
        />

        <div className="mt-8">
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                作成中...
              </>
            ) : (
              "イベントを作成"
            )}
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          <p>
            ※
            作成後にリンクが発行されます。リンクを共有して参加者を募ってください。
          </p>
        </div>
      </form>
    </main>
  );
}

// 日付が同じかどうかを判定する関数
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// 開始日から終了日までの全日付を配列として生成する関数
function generateDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}
