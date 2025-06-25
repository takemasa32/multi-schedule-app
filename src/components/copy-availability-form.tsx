"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  copyAvailabilityBetweenEvents,
  getEventInfoFromUrl,
} from "@/lib/actions";
import useScrollToError from "@/hooks/useScrollToError";

interface EventInfo {
  success: boolean;
  event?: {
    title: string;
  };
  message?: string;
}

interface CopyAvailabilityFormProps {
  eventId: string;
  publicToken: string;
  onSuccess?: (message: string) => void;
  onClose?: () => void;
}

export default function CopyAvailabilityForm({
  eventId,
  onSuccess,
  onClose,
}: CopyAvailabilityFormProps) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [matchType, setMatchType] = useState<"exact" | "time" | "day" | "both">(
    "both"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);

  // エラー発生時に自動スクロール
  useScrollToError(error, errorRef);

  const [sourceEventInfo, setSourceEventInfo] = useState<EventInfo | null>(
    null
  );

  // ローカルストレージから前回の名前を読み込み
  useEffect(() => {
    const savedName = localStorage.getItem("participantName");
    if (savedName) {
      setParticipantName(savedName);
    }
  }, []);

  // URL貼り付け時のイベント情報取得
  const handleUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setSourceUrl(e.target.value);
    setSourceEventInfo(null);
    setError(null);

    if (e.target.value.trim().length > 5) {
      setIsLoading(true);
      try {
        const result = await getEventInfoFromUrl(e.target.value);
        if (result.success && result.event) {
          setSourceEventInfo(result);
        } else {
          // URLが無効な場合はクリアするが、エラーメッセージは表示しない（入力途中かもしれないため）
          setSourceEventInfo(null);
        }
      } catch (err) {
        console.error("Error fetching event info:", err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // コピー実行
  const handleCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!sourceUrl.trim()) {
      setError("コピー元のイベントURLを入力してください");
      return;
    }

    if (!participantName.trim()) {
      setError("お名前を入力してください");
      return;
    }

    setIsLoading(true);
    try {
      const result = await copyAvailabilityBetweenEvents(
        sourceUrl,
        eventId,
        participantName,
        matchType
      );

      if (result.success) {
        localStorage.setItem("participantName", participantName);
        onSuccess?.(result.message || "予定のコピーが成功しました");
        onClose?.();
      } else {
        setError(result.message || "コピーに失敗しました");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "予期せぬエラーが発生しました"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-base-100 p-6 rounded-lg shadow-md border border-base-300 animate-fadeIn">
      <h3 className="text-lg font-bold mb-4">過去の予定をコピー</h3>

      {error && (
        <div className="alert alert-error mb-4 text-sm" ref={errorRef}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-5 w-5"
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

      <form onSubmit={handleCopy} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            コピー元のイベントURL <span className="text-error">*</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={sourceUrl}
            onChange={handleUrlChange}
            placeholder="https://example.com/event/abcdef"
            disabled={isLoading}
            required
          />
          {isLoading && (
            <div className="mt-1 text-xs">
              <span className="loading loading-spinner loading-xs"></span>{" "}
              情報を取得中...
            </div>
          )}
          {sourceEventInfo && sourceEventInfo.event && (
            <div className="mt-2 text-sm text-success">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="inline-block h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              イベント「{sourceEventInfo.event.title}」が見つかりました
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            お名前（コピー元の回答者名） <span className="text-error">*</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            placeholder="山田 太郎"
            disabled={isLoading}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            マッチング方法
          </label>
          <select
            className="select select-bordered w-full"
            value={matchType}
            onChange={(e) =>
              setMatchType(e.target.value as "exact" | "time" | "day" | "both")
            }
            disabled={isLoading}
          >
            <option value="both">
              時間帯と曜日が一致する予定をコピー（デフォルト）
            </option>
            <option value="time">
              時間帯のみ一致する予定をコピー（例: 毎日10-12時）
            </option>
            <option value="day">
              曜日のみ一致する予定をコピー（例: 毎週月曜）
            </option>
            <option value="exact">完全一致する日付のみコピー</option>
          </select>
          <div className="text-xs mt-1 text-base-content/70">
            ※
            コピー元とコピー先のイベント日程が異なる場合、一致条件に基づいて回答をコピーします
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            disabled={isLoading}
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                コピー中...
              </>
            ) : (
              "予定をコピー"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
