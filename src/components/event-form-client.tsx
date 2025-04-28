"use client";

import { useState } from "react";
import { format } from "date-fns";
import { createEvent } from "@/lib/actions";
import DateRangePicker from "./date-range-picker";
import { TimeSlot } from "@/lib/utils";

export default function EventFormClient() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    if (timeSlots.length === 0) {
      setError("少なくとも1つの時間枠を設定してください");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create form data
      const formData = new FormData();
      formData.append("title", title);
      if (description) formData.append("description", description);

      // タイムスロットを文字列形式に変換してFormDataに追加
      timeSlots.forEach((slot) => {
        // 日付をYYYY-MM-DD形式で取得
        const dateStr = format(slot.date, "yyyy-MM-dd");

        // 開始時間と終了時間をそのまま文字列として使用
        const startTime = slot.startTime;
        const endTime = slot.endTime;

        // 日付と時間を組み合わせて文字列として送信（タイムゾーンは考慮しない）
        formData.append("startDates", dateStr);
        formData.append("startTimes", startTime);
        formData.append("endDates", dateStr);
        formData.append("endTimes", endTime);
      });

      console.log("Submitting time slots:", timeSlots);

      // Call server action
      const result = await createEvent(formData);

      // リダイレクトURLが返された場合は遷移
      if (result && result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return; // 早期リターンして以降のコードを実行しない
      }

      // リダイレクトが行われなかった場合（サーバーアクションのリダイレクトが動作しない場合の対応）
      setError("イベントは作成されましたが、ページの更新に失敗しました。");
      setIsSubmitting(false);
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

  // DateRangePickerからのタイムスロット変更を処理
  const handleTimeSlotsChange = (newTimeSlots: TimeSlot[]) => {
    setTimeSlots(newTimeSlots);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      {/* DateRangePicker コンポーネントを挿入 */}
      <div className="card bg-base-100 shadow-sm border border-base-300 p-4">
        <h3 className="card-title text-lg mb-4">候補日程の設定</h3>
        <DateRangePicker onTimeSlotsChange={handleTimeSlotsChange} />
      </div>

      {/* 生成された時間枠のプレビュー表示
      {timeSlots.length > 0 && (
        <div className="mt-6 p-4 bg-base-200 rounded-md border border-base-300">
          <h3 className="text-base font-semibold mb-2">作成される候補日程</h3>
          <p className="mb-2">{timeSlots.length}個の時間枠が設定されています</p>

          <div className="overflow-x-auto max-h-48">
            <table className="table table-compact w-full">
              <thead>
                <tr>
                  <th>日付</th>
                  <th>開始時間</th>
                  <th>終了時間</th>
                </tr>
              </thead>
              <tbody>
                {timeSlots.slice(0, 10).map((slot, index) => (
                  <tr key={index}>
                    <td>{format(slot.date, "yyyy/MM/dd (E)")}</td>
                    <td>{slot.startTime}</td>
                    <td>{slot.endTime}</td>
                  </tr>
                ))}
                {timeSlots.length > 10 && (
                  <tr>
                    <td colSpan={3} className="text-center">
                      ...他 {timeSlots.length - 10} 件
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )} */}

      <div className="flex justify-end mt-8">
        <button
          type="submit"
          className={`px-6 py-3 bg-primary text-primary-content rounded-md hover:bg-primary-focus transition-all duration-200 shadow-md ${
            isSubmitting ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner loading-sm mr-2"></span>
              イベント作成中...
            </>
          ) : (
            "イベントを作成"
          )}
        </button>
      </div>
    </form>
  );
}
