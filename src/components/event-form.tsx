"use client";

import { FormEvent, useState } from "react";
import { createEvent } from "@/app/actions";
import { TimeSlot } from "@/lib/utils";
import { toast } from "react-hot-toast";

export default function EventForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 時間枠の自動生成用の状態
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [timeInterval, setTimeInterval] = useState(120); // デフォルトは120分間隔
  const [startHour, setStartHour] = useState(0); // デフォルトは0時から
  const [endHour, setEndHour] = useState(23); // デフォルトは24時まで

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // バリデーション
      if (!title.trim()) {
        throw new Error("タイトルを入力してください");
      }

      if (timeSlots.length === 0) {
        throw new Error("少なくとも1つの日程を選択してください");
      }

      const formData = new FormData(e.target as HTMLFormElement);

      // フォームに時間スロット情報を追加
      timeSlots.forEach((slot) => {
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

      // イベント作成リクエスト実行
      try {
        await createEvent(formData);

        // If we reach here, no error was thrown and no redirect happened yet
        toast.success("イベントが作成されました！");

        // Next.jsのRedirect例外はキャッチできないため、
        // この後のコードは実行されない（サーバーサイドでリダイレクト処理される）
      } catch (error: unknown) {
        // リダイレクト例外はサーバーサイドで処理される
        // それ以外のエラーはここでキャッチ
        if (
          error instanceof Error &&
          !error.message.includes("NEXT_REDIRECT")
        ) {
          throw new Error(error.message);
        }
      }
    } catch (err) {
      console.error("イベント作成エラー:", err);
      setError(
        err instanceof Error ? err.message : "予期せぬエラーが発生しました"
      );
      toast.error(
        err instanceof Error ? err.message : "予期せぬエラーが発生しました"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 日付範囲と間隔から自動的に時間枠を生成する
  const generateTimeSlots = () => {
    if (!startDate || !endDate) {
      setError("開始日と終了日を設定してください");
      return;
    }

    if (startDate > endDate) {
      setError("開始日は終了日より前にしてください");
      return;
    }

    if (startHour >= endHour) {
      setError("開始時刻は終了時刻より前にしてください");
      return;
    }

    const slots: TimeSlot[] = [];
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0); // 日付のみ比較するために時刻をリセット

    // 終了日を含めるために、終了日の翌日の0時を計算
    const endDatePlus = new Date(endDate);
    endDatePlus.setDate(endDatePlus.getDate() + 1);
    endDatePlus.setHours(0, 0, 0, 0);

    // 日付ごとに処理
    while (currentDate < endDatePlus) {
      // その日の時間枠を生成
      for (let hour = startHour; hour < endHour; hour += timeInterval / 60) {
        // 時間と分に分解
        const wholeHours = Math.floor(hour);
        const minutes = Math.round((hour - wholeHours) * 60);

        // 開始時間
        const startTime = `${wholeHours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}`;

        // 終了時間（timeInterval分後）
        const endHour = wholeHours + Math.floor(timeInterval / 60);
        const endMinute = minutes + (timeInterval % 60);
        let finalEndHour = endHour;
        let finalEndMinute = endMinute;

        // 分が60以上になった場合の調整
        if (endMinute >= 60) {
          finalEndHour += Math.floor(endMinute / 60);
          finalEndMinute = endMinute % 60;
        }

        // 終了時間が営業時間を超える場合はスキップ
        if (
          finalEndHour > endHour ||
          (finalEndHour === endHour && finalEndMinute > 0)
        ) {
          continue;
        }

        const endTime = `${finalEndHour
          .toString()
          .padStart(2, "0")}:${finalEndMinute.toString().padStart(2, "0")}`;

        slots.push({
          date: new Date(currentDate),
          startTime,
          endTime,
        });
      }

      // 次の日へ
      currentDate.setDate(currentDate.getDate() + 1);
    }

    setTimeSlots(slots);
    setError(null);

    if (slots.length === 0) {
      setError(
        "設定した条件では時間枠が生成できませんでした。条件を変更してください"
      );
    } else {
      toast.success(`${slots.length}個の時間枠を生成しました`);
    }
  };

  // 時間間隔のオプション
  const timeIntervalOptions = [
    { value: 15, label: "15分" },
    { value: 30, label: "30分" },
    { value: 60, label: "1時間" },
    { value: 120, label: "2時間" },
    { value: 180, label: "3時間" },
    { value: 240, label: "4時間" },
  ];

  // 時間帯のオプション（0～23時）
  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: `${i}:00`,
  }));

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

      <div className="divider">時間枠の自動生成</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="form-control">
          <label htmlFor="startDate" className="label">
            <span className="label-text">
              開始日 <span className="text-error">*</span>
            </span>
          </label>
          <input
            type="date"
            id="startDate"
            className="input input-bordered"
            onChange={(e) =>
              setStartDate(e.target.value ? new Date(e.target.value) : null)
            }
          />
        </div>

        <div className="form-control">
          <label htmlFor="endDate" className="label">
            <span className="label-text">
              終了日 <span className="text-error">*</span>
            </span>
          </label>
          <input
            type="date"
            id="endDate"
            className="input input-bordered"
            onChange={(e) =>
              setEndDate(e.target.value ? new Date(e.target.value) : null)
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="form-control">
          <label htmlFor="startHour" className="label">
            <span className="label-text">開始時刻</span>
          </label>
          <select
            id="startHour"
            className="select select-bordered w-full"
            value={startHour}
            onChange={(e) => setStartHour(Number(e.target.value))}
          >
            {hourOptions.map((option) => (
              <option key={`start-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-control">
          <label htmlFor="endHour" className="label">
            <span className="label-text">終了時刻</span>
          </label>
          <select
            id="endHour"
            className="select select-bordered w-full"
            value={endHour}
            onChange={(e) => setEndHour(Number(e.target.value))}
          >
            {hourOptions.map((option) => (
              <option key={`end-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-control">
          <label htmlFor="timeInterval" className="label">
            <span className="label-text">時間間隔</span>
          </label>
          <select
            id="timeInterval"
            className="select select-bordered w-full"
            value={timeInterval}
            onChange={(e) => setTimeInterval(Number(e.target.value))}
          >
            {timeIntervalOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-control">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={generateTimeSlots}
        >
          時間枠を生成
        </button>
      </div>

      {timeSlots.length > 0 && (
        <div className="form-control">
          <label className="label">
            <span className="label-text">
              生成された時間枠 ({timeSlots.length}個)
            </span>
          </label>
          <div className="bg-base-200 p-4 rounded-lg max-h-60 overflow-y-auto">
            <ul className="space-y-1">
              {timeSlots.map((slot, index) => {
                const date = slot.date.toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "short",
                });
                return (
                  <li key={index} className="flex items-center justify-between">
                    <span>
                      {date} {slot.startTime}～{slot.endTime}
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost text-error"
                      onClick={() =>
                        setTimeSlots((slots) =>
                          slots.filter((_, i) => i !== index)
                        )
                      }
                    >
                      削除
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <div className="form-control mt-6">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting || timeSlots.length === 0}
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
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
