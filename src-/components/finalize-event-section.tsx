"use client";

import { useState } from "react";
import { finalizeEvent } from "@/app/actions"; // これから作成するServer Action

interface FinalizeEventSectionProps {
  eventId: string;
  eventDates: { id: string; date_time: string; label?: string }[];
  adminToken: string;
}

export default function FinalizeEventSection({
  eventId,
  eventDates,
  adminToken,
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

  return (
    <div className="mt-8 border-t pt-6">
      <h3 className="text-xl font-bold mb-4">主催者専用: 日程の確定</h3>

      {isConfirming ? (
        <div className="bg-warning p-4 rounded-lg">
          <h4 className="font-bold mb-2">確定しますか？</h4>
          <p className="mb-4">
            {selectedDateId &&
              `「${formatDate(
                eventDates.find((d) => d.id === selectedDateId)?.date_time || ""
              )}」
              で確定します。この操作は元に戻せません。`}
          </p>
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
                    {formatDate(date.date_time)}
                  </span>
                  {date.label && (
                    <span className="ml-2 text-sm text-gray-500">
                      {date.label}
                    </span>
                  )}
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
