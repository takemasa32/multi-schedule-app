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
  const [selectedDateId, setSelectedDateId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFinalize = async (dateId: string) => {
    setSelectedDateId(dateId);
    setIsConfirming(true);
  };

  const confirmFinalize = async () => {
    if (!selectedDateId) return;

    setIsProcessing(true);
    try {
      await finalizeEvent(eventId, selectedDateId, adminToken);
      // 成功時はServer Actionでページがリロードされるため、追加の処理は不要
    } catch (error) {
      console.error("確定処理でエラーが発生しました:", error);
      setIsProcessing(false);
      setIsConfirming(false);
    }
  };

  const cancelConfirm = () => {
    setIsConfirming(false);
    setSelectedDateId(null);
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

  return (
    <div className="mt-8 border-t pt-6">
      <h3 className="text-xl font-bold mb-4">主催者専用: 日程の確定</h3>

      {isConfirming ? (
        <div className="bg-warning p-4 rounded-lg">
          <h4 className="font-bold mb-2">確定しますか？</h4>
          <p className="mb-4">
            {selectedDateId && (
              <>
                「
                {formatDate(
                  eventDates.find((d) => d.id === selectedDateId)?.start_time ||
                    ""
                )}
                」 で確定します。この操作は元に戻せません。
              </>
            )}
          </p>
          {selectedDateId && (
            <div className="mb-4">
              <p>参加可能: {getAvailableParticipantsCount(selectedDateId)}人</p>
              {getAvailableParticipants(selectedDateId).length > 0 && (
                <p className="text-sm text-gray-600">
                  {getAvailableParticipants(selectedDateId).join(", ")}
                </p>
              )}
            </div>
          )}
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
            以下の候補から、最終的な日程を選んで確定してください:
          </p>
          <div className="space-y-2">
            {eventDates.map((date) => (
              <div
                key={date.id}
                className="flex justify-between items-center p-3 bg-base-200 rounded-md"
              >
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
                  </div>
                </div>
                <button
                  onClick={() => handleFinalize(date.id)}
                  className="btn btn-sm btn-accent"
                >
                  この日程で確定
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
