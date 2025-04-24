"use client";

import { FormEvent, useState } from "react";
import { createEvent } from "@/app/actions";
import DateRangePicker from "./date-range-picker";
import { TimeSlot } from "@/lib/utils";

export default function EventForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!title.trim()) {
      setError("タイトルを入力してください");
      setIsSubmitting(false);
      return;
    }

    if (timeSlots.length === 0) {
      setError("少なくとも1つの日程を選択してください");
      setIsSubmitting(false);
      return;
    }

    try {
      const formData = new FormData(e.target as HTMLFormElement);

      // フォームに時間スロット情報を追加
      timeSlots.forEach((slot, index) => {
        // 日付と時間文字列から完全な日時オブジェクトを作成
        const startDateTime = new Date(slot.date);
        const [startHours, startMinutes] = slot.startTime
          .split(":")
          .map(Number);
        startDateTime.setHours(startHours, startMinutes, 0, 0);

        const endDateTime = new Date(slot.date);
        const [endHours, endMinutes] = slot.endTime.split(":").map(Number);
        endDateTime.setHours(endHours, endMinutes, 0, 0);

        formData.append(`startTimes`, startDateTime.toISOString());
        formData.append(`endTimes`, endDateTime.toISOString());
      });

      await createEvent(formData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "予期せぬエラーが発生しました"
      );
      setIsSubmitting(false);
    }
  };

  const handleTimeSlotsChange = (newTimeSlots: TimeSlot[]) => {
    setTimeSlots(newTimeSlots);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      <div className="form-control">
        <label htmlFor="title" className="label">
          <span className="label-text">
            イベントタイトル <span className="text-error">*</span>
          </span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          className="input input-bordered w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="form-control">
        <label htmlFor="description" className="label">
          <span className="label-text">説明（任意）</span>
        </label>
        <textarea
          id="description"
          name="description"
          className="textarea textarea-bordered h-24"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">
            候補日程 <span className="text-error">*</span>
          </span>
        </label>
        <DateRangePicker onTimeSlotsChange={handleTimeSlotsChange} />
      </div>

      <div className="form-control mt-6">
        <button
          type="submit"
          className={`btn btn-primary ${isSubmitting ? "loading" : ""}`}
          disabled={isSubmitting || timeSlots.length === 0}
        >
          {isSubmitting ? "作成中..." : "イベントを作成"}
        </button>
      </div>

      {/* 選択された時間スロット数の表示 */}
      {timeSlots.length > 0 && (
        <div className="text-sm text-success">
          {timeSlots.length}個の候補日程が選択されています
        </div>
      )}
    </form>
  );
}
