"use client";

import { useState } from "react";
import { format } from "date-fns";
import { createEvent } from "@/lib/actions";

export default function EventFormClient() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<string>("00:00");
  const [endTime, setEndTime] = useState<string>("23:59");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Date オブジェクトを文字列に変換する関数
  const formatDateForInput = (date: Date | null): string => {
    if (!date) return "";
    return format(date, "yyyy-MM-dd");
  };

  // 文字列から Date オブジェクトへ変換するハンドラー
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStartDate(value ? new Date(value) : null);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEndDate(value ? new Date(value) : null);
  };

  // 開始日から終了日までの日付配列を生成
  const generateDateRange = (start: Date | null, end: Date | null): Date[] => {
    if (!start || !end) return [];

    const dateArray: Date[] = [];
    const currentDate = new Date(start);

    // 日付を正規化（時間部分をリセット）
    currentDate.setHours(0, 0, 0, 0);
    const endDateNormalized = new Date(end);
    endDateNormalized.setHours(0, 0, 0, 0);

    // 開始日から終了日までの日付を配列に追加
    while (currentDate <= endDateNormalized) {
      dateArray.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dateArray;
  };

  // 日付と時間から時間スロットを生成
  const generateTimeSlots = (
    dates: Date[],
    start: string,
    end: string
  ): { start: string; end: string }[] => {
    const timeSlots: { start: string; end: string }[] = [];

    // 時間文字列を時間と分に分割
    const [startHour, startMinute] = start.split(":").map(Number);
    const [endHour, endMinute] = end.split(":").map(Number);

    dates.forEach((date) => {
      // 開始日時と終了日時を作成
      const startDate = new Date(date);
      startDate.setHours(startHour, startMinute, 0, 0);

      const endDate = new Date(date);
      endDate.setHours(endHour, endMinute, 0, 0);

      // 23:59の場合は翌日の0時に調整
      if (endHour === 23 && endMinute === 59) {
        endDate.setDate(endDate.getDate() + 1);
        endDate.setHours(0, 0, 0, 0);
      }

      // 終了時間が開始時間より前の場合は翌日として扱う
      if (
        endHour < startHour ||
        (endHour === startHour && endMinute <= startMinute)
      ) {
        endDate.setDate(endDate.getDate() + 1);
      }

      // ISO形式の文字列に変換
      timeSlots.push({
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      });
    });

    return timeSlots;
  };

  // フォーム送信ハンドラー
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset error
    setError(null);

    // Validate form
    if (!title) {
      setError("タイトルは必須です");
      return;
    }

    if (!startDate || !endDate) {
      setError("開始日と終了日は必須です");
      return;
    }

    if (endDate < startDate) {
      setError("終了日は開始日より後にしてください");
      return;
    }

    // 時間のバリデーション
    if (!startTime || !endTime) {
      setError("開始時間と終了時間は必須です");
      return;
    }

    setIsSubmitting(true);

    try {
      // 日付範囲の生成
      const dateRange = generateDateRange(startDate, endDate);

      // 候補日程を生成
      const timeSlots = generateTimeSlots(dateRange, startTime, endTime);

      if (timeSlots.length === 0) {
        setError("有効な時間スロットがありません");
        setIsSubmitting(false);
        return;
      }

      // Create form data
      const formData = new FormData();
      formData.append("title", title);
      if (description) formData.append("description", description);

      // 各時間スロットをFormDataに追加
      timeSlots.forEach((slot) => {
        formData.append("startTimes", slot.start);
        formData.append("endTimes", slot.end);
      });

      console.log("Submitting time slots:", timeSlots);

      // Call server action
      await createEvent(formData);

      // Redirection is handled by the server action
    } catch (error) {
      console.error("Form submission error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "イベント作成中にエラーが発生しました"
      );
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="alert alert-error">
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
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          イベントタイトル
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          required
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          説明
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium">
            開始日
          </label>
          <input
            type="date"
            id="startDate"
            value={formatDateForInput(startDate)}
            onChange={handleStartDateChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="endDate" className="block text-sm font-medium">
            終了日
          </label>
          <input
            type="date"
            id="endDate"
            value={formatDateForInput(endDate)}
            onChange={handleEndDateChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="startTime" className="block text-sm font-medium">
            開始時間
          </label>
          <select
            id="startTime"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required
            disabled={isSubmitting}
          >
            {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
              <option
                key={`hour-${hour}`}
                value={`${hour.toString().padStart(2, "0")}:00`}
              >
                {`${hour.toString().padStart(2, "0")}:00`}
              </option>
            ))}
            {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
              <option
                key={`hour-half-${hour}`}
                value={`${hour.toString().padStart(2, "0")}:30`}
              >
                {`${hour.toString().padStart(2, "0")}:30`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="endTime" className="block text-sm font-medium">
            終了時間
          </label>
          <select
            id="endTime"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required
            disabled={isSubmitting}
          >
            {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
              <option
                key={`hour-${hour}`}
                value={`${hour.toString().padStart(2, "0")}:00`}
              >
                {`${hour.toString().padStart(2, "0")}:00`}
              </option>
            ))}
            {Array.from({ length: 23 }, (_, i) => i).map((hour) => (
              <option
                key={`hour-half-${hour}`}
                value={`${hour.toString().padStart(2, "0")}:30`}
              >
                {`${hour.toString().padStart(2, "0")}:30`}
              </option>
            ))}
            <option key="23:59" value="23:59">
              23:59
            </option>
          </select>
        </div>
      </div>

      <div className="mt-6 p-4 bg-base-200 rounded-md border border-base-300">
        <h3 className="text-base font-semibold mb-2">作成される候補日程</h3>
        {startDate && endDate && startTime && endTime ? (
          <div>
            <p className="mb-2">
              <span className="font-semibold">
                {formatDateForInput(startDate)}
              </span>{" "}
              から{" "}
              <span className="font-semibold">
                {formatDateForInput(endDate)}
              </span>{" "}
              までの各日について
            </p>
            <p className="text-base">
              毎日 <span className="font-semibold">{startTime}</span> から{" "}
              <span className="font-semibold">{endTime}</span>{" "}
              までの時間が候補として登録されます
            </p>
            <div className="text-xs text-base-content/70 mt-3 p-2 bg-base-300/50 rounded">
              例:{" "}
              {startDate ? format(startDate, "yyyy年M月d日") : "2025年4月1日"}{" "}
              {startTime} から{" "}
              {startDate ? format(startDate, "yyyy年M月d日") : "2025年4月1日"}{" "}
              {endTime}
              <br />
              　　
              {startDate && endDate && startDate < endDate
                ? format(
                    new Date(startDate.getTime() + 86400000),
                    "yyyy年M月d日"
                  )
                : "2025年4月2日"}{" "}
              {startTime} から{" "}
              {startDate && endDate && startDate < endDate
                ? format(
                    new Date(startDate.getTime() + 86400000),
                    "yyyy年M月d日"
                  )
                : "2025年4月2日"}{" "}
              {endTime}
              <br />
              　　...
            </div>
          </div>
        ) : (
          <p>日付と時間を選択してください</p>
        )}
      </div>

      <div className="flex justify-end mt-8">
        <button
          type="submit"
          className={`px-6 py-3 bg-primary text-primary-content rounded-md hover:bg-primary-focus transition-all duration-200 shadow-md ${
            isSubmitting ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={isSubmitting}
        >
          {isSubmitting ? "イベント作成中..." : "イベントを作成"}
        </button>
      </div>
    </form>
  );
}
