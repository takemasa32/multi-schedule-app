"use client";

import React, { useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import { createEvent } from "@/lib/actions";
import { useRouter } from "next/navigation";
import DateRangePicker from "./date-range-picker";
import { TimeSlot, addEventToHistory } from "@/lib/utils";
import TermsCheckbox from "./terms/terms-checkbox";
import useScrollToError from "@/hooks/useScrollToError";

export default function EventFormClient() {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const errorRef = useRef<HTMLDivElement | null>(null);

  // エラー発生時に自動スクロール
  useScrollToError(error, errorRef);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("タイトルは必須です");
      return;
    }
    if (timeSlots.length === 0) {
      setError(
        "イベント設定が正しくありません。少なくとも1つの時間枠を設定してください"
      );
      return;
    }
    if (!termsAccepted) {
      setError("利用規約への同意が必要です");
      return;
    }
    const formData = new FormData();
    formData.append("title", title);
    if (description.trim()) {
      formData.append("description", description);
    }

    timeSlots.forEach((slot) => {
      const dateStr = format(slot.date, "yyyy-MM-dd");
      formData.append("startDates", dateStr);
      formData.append("startTimes", slot.startTime);
      formData.append("endDates", dateStr);
      formData.append("endTimes", slot.endTime);
    });

    startTransition(async () => {
      try {
        // サーバーアクションでイベント作成し、{ publicToken, adminToken } を返却する想定
        const result = await createEvent(formData);

        // リダイレクト前に履歴に追加（ローカルストレージ）
        if (
          typeof window !== "undefined" &&
          result &&
          result.publicToken &&
          result.adminToken
        ) {
          // イベントを履歴に追加
          addEventToHistory({
            id: result.publicToken,
            title: title,
            adminToken: result.adminToken,
            createdAt: new Date().toISOString(),
            isCreatedByMe: true,
          });
        }

        router.push(`${result.redirectUrl}`);
      } catch (err) {
        console.error("Form submission error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "イベント作成中にエラーが発生しました"
        );
      }
    });
  };

  const handleTimeSlotsChange = (newSlots: TimeSlot[]) => {
    setTimeSlots(newSlots);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="alert alert-error" role="alert" ref={errorRef}>
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
              d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
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
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          disabled={isPending}
          placeholder="例：〇〇の日程調整"
          aria-describedby="title-hint"
        />
        <p id="title-hint" className="text-xs text-gray-500 mt-1">
          イベントの目的や内容が分かるタイトルを入力してください（必須）
        </p>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          説明
        </label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          disabled={isPending}
          placeholder="（任意）備考や注意事項があれば記入してください。"
          aria-describedby="description-hint"
        />
        <p id="description-hint" className="text-xs text-gray-500 mt-1">
          （任意）イベントの詳細や参加者へのメッセージを記入できます
        </p>
      </div>

      <div className="card bg-base-100 shadow-sm border border-base-300 p-4">
        <h3 className="card-title text-lg mb-4">候補日程の設定</h3>
        <DateRangePicker onTimeSlotsChange={handleTimeSlotsChange} />
        <p className="text-xs text-gray-500 mt-2">
          日付と時間帯を選択し、複数の候補枠を追加できます。最低1つ以上の時間枠を設定してください。
        </p>
      </div>
      <TermsCheckbox
        isChecked={termsAccepted}
        onChange={setTermsAccepted}
        id="event-form-terms"
      />
      <div className="flex justify-end mt-8">
        <button
          type="submit"
          className={`btn btn-primary btn-lg ${
            isPending ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <span className="loading loading-spinner loading-sm mr-2" />
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
