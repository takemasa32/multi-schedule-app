"use client";

import { useState } from "react";
import { finalizeEvent } from "@/app/actions";

interface FinalizeEventSectionProps {
  eventId: string;
  eventDates: {
    id: string;
    start_time: string;
    end_time: string;
    label?: string;
  }[];
  adminToken: string;
  availabilities: {
    participant_id: string;
    event_date_id: string;
    availability: boolean;
  }[];
  participants: {
    id: string;
    name: string;
  }[];
}

export default function FinalizeEventSection({
  eventId,
  eventDates,
  adminToken,
  availabilities,
  participants,
}: FinalizeEventSectionProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [selectedDateIds, setSelectedDateIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDateToggle = (dateId: string) => {
    setSelectedDateIds((prev) =>
      prev.includes(dateId)
        ? prev.filter((id) => id !== dateId)
        : [...prev, dateId]
    );
  };

  const handleProceedToConfirm = () => {
    if (selectedDateIds.length === 0) {
      setError("少なくとも1つの日程を選択してください");
      return;
    }
    setError(null);
    setIsConfirming(true);
  };

  const confirmFinalize = async () => {
    if (selectedDateIds.length === 0) return;

    setIsProcessing(true);
    try {
      await finalizeEvent(eventId, selectedDateIds, adminToken);
      // 成功時はServer Actionでページがリロードされるため、追加の処理は不要
    } catch (error) {
      console.error("確定処理でエラーが発生しました:", error);
      setError(
        error instanceof Error
          ? error.message
          : "確定処理中にエラーが発生しました"
      );
      setIsProcessing(false);
      setIsConfirming(false);
    }
  };

  const cancelConfirm = () => {
    setIsConfirming(false);
  };

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

  // 選択した日程に参加可能な人数を計算
  const getAvailableParticipantsCount = (dateId: string) => {
    return availabilities.filter(
      (a) => a.event_date_id === dateId && a.availability
    ).length;
  };

  // 選択した日程に参加可能な参加者の名前リストを取得
  const getAvailableParticipants = (dateId: string) => {
    const availableParticipantIds = availabilities
      .filter((a) => a.event_date_id === dateId && a.availability)
      .map((a) => a.participant_id);

    return participants
      .filter((p) => availableParticipantIds.includes(p.id))
      .map((p) => p.name);
  };

  // 選択された複数の時間枠に参加可能な人数を計算（すべての選択時間枠を満たす人）
  const getParticipantsForAllSelectedDates = () => {
    if (selectedDateIds.length === 0) return [];

    // 全参加者IDを取得
    const allParticipantIds = [...new Set(participants.map((p) => p.id))];

    // 各日程ごとの参加可能な参加者IDをマップ
    const availableByDate = selectedDateIds.map((dateId) => {
      return availabilities
        .filter((a) => a.event_date_id === dateId && a.availability)
        .map((a) => a.participant_id);
    });

    // すべての選択された日程に参加可能な参加者を特定
    const availableForAll = allParticipantIds.filter((participantId) => {
      return availableByDate.every((dateParticipants) =>
        dateParticipants.includes(participantId)
      );
    });

    // 参加者IDから名前に変換
    return participants
      .filter((p) => availableForAll.includes(p.id))
      .map((p) => p.name);
  };

  return (
    <div className="mt-8 border-t pt-6">
      <h3 className="text-xl font-bold mb-4">主催者専用: 日程の確定</h3>

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

      {isConfirming ? (
        <div className="bg-warning p-4 rounded-lg">
          <h4 className="font-bold mb-2">以下の日程で確定しますか？</h4>
          <ul className="list-disc pl-5 mb-4">
            {selectedDateIds.map((dateId) => {
              const date = eventDates.find((d) => d.id === dateId);
              return date ? (
                <li key={dateId}>
                  「{formatDate(date.start_time)}」〜「
                  {formatDate(date.end_time)}」
                  <span className="ml-2 text-sm">
                    (参加可能: {getAvailableParticipantsCount(dateId)}人)
                  </span>
                </li>
              ) : null;
            })}
          </ul>

          <div className="mb-4">
            <p className="text-sm">
              <strong>
                全ての選択日程で参加可能:{" "}
                {getParticipantsForAllSelectedDates().length}人
              </strong>
            </p>
            {getParticipantsForAllSelectedDates().length > 0 && (
              <p className="text-sm text-gray-600">
                {getParticipantsForAllSelectedDates().join(", ")}
              </p>
            )}
          </div>

          <p className="text-warning mb-4">この操作は元に戻せません。</p>

          <div className="flex gap-3">
            <button
              onClick={confirmFinalize}
              disabled={isProcessing}
              className="btn btn-primary"
            >
              {isProcessing ? (
                <>
                  <span className="loading loading-spinner"></span>
                  処理中...
                </>
              ) : (
                "確定する"
              )}
            </button>
            <button
              onClick={cancelConfirm}
              disabled={isProcessing}
              className="btn btn-ghost"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-4">
            以下の候補から、最終的な日程を選択してください（複数選択可能）:
          </p>
          <div className="space-y-2">
            {eventDates.map((date) => (
              <div
                key={date.id}
                className={`flex justify-between items-center p-3 rounded-md ${
                  selectedDateIds.includes(date.id)
                    ? "bg-accent bg-opacity-20"
                    : "bg-base-200"
                }`}
              >
                <label className="flex items-center gap-3 cursor-pointer w-full">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-accent"
                    checked={selectedDateIds.includes(date.id)}
                    onChange={() => handleDateToggle(date.id)}
                  />
                  <div>
                    <span className="font-medium">
                      {formatDate(date.start_time)}〜{formatDate(date.end_time)}
                    </span>
                    {date.label && (
                      <span className="ml-2 text-sm text-gray-500">
                        {date.label}
                      </span>
                    )}
                    <div className="text-sm">
                      参加可能: {getAvailableParticipantsCount(date.id)}人
                      <span className="text-xs text-gray-500 ml-2">
                        ({getAvailableParticipants(date.id).join(", ")})
                      </span>
                    </div>
                  </div>
                </label>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <button
              onClick={handleProceedToConfirm}
              className="btn btn-accent"
              disabled={selectedDateIds.length === 0}
            >
              選択した日程で確定する ({selectedDateIds.length}件選択中)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
