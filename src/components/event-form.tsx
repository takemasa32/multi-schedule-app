"use client";

import React, { useState } from "react";
import DateRangePicker from "./date-range-picker";
import { createEvent } from "@/app/actions"; // Server Actionをインポート

export default function EventForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // これを削除または修正するか、別のクライアント側ハンドラとして利用
  // handleSubmitはもう不要です。フォーム要素にaction属性を直接指定します

  return (
    <form action={createEvent} className="space-y-6">
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
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          イベントタイトル <span className="text-error">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          className="input input-bordered w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          イベントの説明 (任意)
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="textarea textarea-bordered w-full"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        ></textarea>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          候補日程 <span className="text-error">*</span>
        </label>
        <DateRangePicker onDatesChange={setSelectedDates} />
      </div>

      <div>
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={isSubmitting || selectedDates.length === 0}
        >
          {isSubmitting ? (
            <>
              <span className="loading loading-spinner"></span>
              送信中...
            </>
          ) : (
            "イベントを作成"
          )}
        </button>
      </div>

      <div className="text-sm text-gray-500 mt-4">
        * イベント作成後、参加者に共有するための公開リンクが発行されます。
      </div>
    </form>
  );
}
