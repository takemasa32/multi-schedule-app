"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { submitAvailability } from "@/lib/actions";
import Link from "next/link";
import useScrollToError from "@/hooks/useScrollToError";

interface EventDate {
  id: string;
  start_time: string;
  end_time: string;
  label?: string;
}

interface InputFormProps {
  eventId: string;
  publicToken: string;
  eventDates: EventDate[];
  existingParticipant: {
    id: string;
    name: string;
    availabilities: Record<string, boolean>;
    comment?: string | null;
  } | null;
  mode: "new" | "edit";
}

export default function InputForm({
  publicToken,
  eventDates,
  existingParticipant,
  mode,
}: InputFormProps) {
  const router = useRouter();
  const [participantName, setParticipantName] = useState("");
  const [comment, setComment] = useState("");
  const [availabilities, setAvailabilities] = useState<Record<string, boolean>>(
    {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);

  // エラー発生時に自動スクロール
  useScrollToError(errorMessage, errorRef);

  // 既存データがある場合は初期値を設定
  useEffect(() => {
    if (existingParticipant) {
      setParticipantName(existingParticipant.name);
      setAvailabilities(existingParticipant.availabilities);
      if (existingParticipant.comment) {
        setComment(existingParticipant.comment);
      }
    } else {
      // 新規の場合、全てのイベント日程をfalseで初期化
      const initialAvailabilities = eventDates.reduce((acc, date) => {
        acc[date.id] = false;
        return acc;
      }, {} as Record<string, boolean>);
      setAvailabilities(initialAvailabilities);
    }
  }, [existingParticipant, eventDates]);

  const handleAvailabilityChange = (dateId: string, isAvailable: boolean) => {
    setAvailabilities((prev) => ({
      ...prev,
      [dateId]: isAvailable,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    if (participantName.trim() === "") {
      setErrorMessage("名前を入力してください");
      setIsSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("participant_name", participantName);
      formData.append("event_token", publicToken);
      formData.append("comment", comment);

      if (mode === "edit" && existingParticipant) {
        formData.append("participant_id", existingParticipant.id);
      }

      // 利用可能状況を追加
      Object.entries(availabilities).forEach(([dateId, isAvailable]) => {
        formData.append(`availability_${dateId}`, isAvailable ? "on" : "off");
      });

      await submitAvailability(formData);

      // 送信成功したら元のイベントページに戻る
      router.push(`/event/${publicToken}`);
    } catch (error) {
      console.error("回答送信エラー:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "回答の送信中にエラーが発生しました。"
      );
      setIsSubmitting(false);
    }
  };

  // 日付フォーマット関数
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  };

  // 時間フォーマット関数
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <div className="alert alert-error" ref={errorRef}>
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
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="form-control w-full">
        <label className="label">
          <span className="label-text">お名前</span>
        </label>
        <input
          type="text"
          placeholder="お名前を入力してください"
          className="input input-bordered w-full"
          value={participantName}
          onChange={(e) => setParticipantName(e.target.value)}
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="divider">候補日程の参加可否</div>

      <div className="space-y-4">
        {eventDates.map((date) => (
          <div key={date.id} className="form-control">
            <label className="cursor-pointer label justify-start gap-4">
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={availabilities[date.id] || false}
                onChange={(e) =>
                  handleAvailabilityChange(date.id, e.target.checked)
                }
                disabled={isSubmitting}
              />
              <span className="label-text">
                {formatDate(date.start_time)} {formatTime(date.start_time)}～
                {formatTime(date.end_time)}
              </span>
            </label>
          </div>
        ))}
      </div>

      <div className="form-control w-full">
        <label className="label">
          <span className="label-text">コメント・メモ</span>
        </label>
        <textarea
          className="textarea textarea-bordered w-full"
          placeholder="コメントを入力してください"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
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
        <Link href={`/event/${publicToken}`} className="btn btn-neutral">
          キャンセル
        </Link>
      </div>
    </form>
  );
}
