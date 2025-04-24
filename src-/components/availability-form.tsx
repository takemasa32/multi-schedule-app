"use client";

import { useState } from "react";
import { submitAvailability } from "@/app/actions";

interface AvailabilityFormProps {
  eventToken: string;
  eventDates: { id: string; date_time: string; label?: string }[];
}

export default function AvailabilityForm({
  eventToken,
  eventDates,
}: AvailabilityFormProps) {
  const [name, setName] = useState("");
  const [selectedDates, setSelectedDates] = useState<Record<string, boolean>>(
    {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 日付を読みやすい形式にフォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
    });
  };

  const handleCheckboxChange = (dateId: string) => {
    setSelectedDates((prev) => ({
      ...prev,
      [dateId]: !prev[dateId],
    }));
  };

  // フォーム送信前のバリデーション用
  const validateForm = () => {
    if (!name.trim()) {
      setError("お名前を入力してください");
      return false;
    }
    return true;
  };

  // この関数はServer Actionを呼び出す前の準備として使用
  // 実際の送信はformのaction属性がServer Actionを直接呼ぶ
  const handleSubmit = async (e: React.FormEvent) => {
    if (!validateForm()) {
      e.preventDefault();
    } else {
      setIsSubmitting(true);
      // formのaction属性がServer Actionを呼び出すため
      // ここでは送信準備のみ行う
    }
  };

  return (
    <div className="mb-8 p-6 bg-base-100 border rounded-lg shadow-sm">
      <h2 className="text-xl font-bold mb-4">回答する</h2>

      {error && (
        <div className="alert alert-error mb-4">
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

      <form
        action={submitAvailability}
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {/* イベントトークンを隠しフィールドとして保持 */}
        <input type="hidden" name="event_token" value={eventToken} />

        <div>
          <label
            htmlFor="participant_name"
            className="block text-sm font-medium mb-1"
          >
            お名前 <span className="text-error">*</span>
          </label>
          <input
            type="text"
            id="participant_name"
            name="participant_name"
            className="input input-bordered w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            候補日程から参加可能な日を選択してください{" "}
            <span className="text-error">*</span>
          </label>
          <div className="space-y-2">
            {eventDates.map((date) => (
              <div key={date.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={`availability_${date.id}`}
                  name={`availability_${date.id}`}
                  className="checkbox"
                  checked={!!selectedDates[date.id]}
                  onChange={() => handleCheckboxChange(date.id)}
                />
                <label htmlFor={`availability_${date.id}`} className="ml-3">
                  <span className="font-medium">
                    {formatDate(date.date_time)}
                  </span>
                  {date.label && (
                    <span className="ml-2 text-sm text-gray-500">
                      {date.label}
                    </span>
                  )}
                </label>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner"></span>
              送信中...
            </>
          ) : (
            "回答を送信"
          )}
        </button>
      </form>
    </div>
  );
}
