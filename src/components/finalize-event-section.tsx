"use client";

import { useState, useMemo, useRef } from "react";
import { finalizeEvent } from "@/lib/actions";
import useScrollToError from "@/hooks/useScrollToError";

interface FinalizeEventSectionProps {
  eventId: string;
  eventDates: {
    id: string;
    start_time: string;
    end_time: string;
    label?: string;
  }[];
  availabilities: {
    participant_id: string;
    event_date_id: string;
    availability: boolean;
  }[];
  participants: {
    id: string;
    name: string;
    comment?: string | null;
  }[];
  finalizedDateIds?: string[]; // 確定済みの日程IDの配列
}

export default function FinalizeEventSection({
  eventId,
  eventDates,
  availabilities,
  participants,
  finalizedDateIds = [], // 確定済み日程IDのデフォルト値を空配列にする
}: FinalizeEventSectionProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [selectedDateIds, setSelectedDateIds] =
    useState<string[]>(finalizedDateIds); // 確定済みの日程IDで初期化
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false); // 折りたたみ状態
  const errorRef = useRef<HTMLDivElement | null>(null);

  // エラー発生時に自動スクロール
  useScrollToError(error, errorRef);

  const handleDateToggle = (dateId: string) => {
    setSelectedDateIds((prev) =>
      prev.includes(dateId)
        ? prev.filter((id) => id !== dateId)
        : [...prev, dateId]
    );
  };

  const handleProceedToConfirm = () => {
    // 「全解除」も許可: 既存確定がある場合は選択ゼロでもOK
    if (selectedDateIds.length === 0 && finalizedDateIds.length === 0) {
      setError("少なくとも1つの日程を選択してください");
      return;
    }
    setError(null);
    setIsConfirming(true);
  };

  const confirmFinalize = async () => {
    setIsProcessing(true);
    setError(null);

    // eventId/selectedDateIdsのバリデーション
    if (!eventId || !Array.isArray(selectedDateIds)) {
      setError("必須パラメータが不足しています");
      setIsProcessing(false);
      return;
    }

    try {
      const result = await finalizeEvent(eventId, selectedDateIds);

      if (!result.success) {
        setError(result.message || "確定処理に失敗しました");
        setIsProcessing(false);
        return;
      }

      window.location.reload();
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
    });
  };

  // 時間だけをフォーマット
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 選択した日程に参加可能な人数を計算
  const getAvailableParticipantsCount = (dateId: string) => {
    return availabilities.filter(
      (a) => a.event_date_id === dateId && a.availability
    ).length;
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

  // 日付部分だけを抽出する（年月日）
  const extractDateString = (dateString: string) => {
    const date = new Date(dateString);
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  };

  // 時間部分だけを抽出する（時分）
  const extractTimeString = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  // ユニークな日付と時間帯を取得
  const { uniqueDates, uniqueTimeslots } = useMemo(() => {
    // ユニークな日付のセット
    const dateSet = new Set<string>();
    // 時間の開始と終了のセット
    const timeSet = new Set<string>();

    eventDates.forEach((date) => {
      // 日付部分のみを取り出して追加
      dateSet.add(extractDateString(date.start_time));

      // 開始時間と終了時間を追加
      timeSet.add(extractTimeString(date.start_time));
      timeSet.add(extractTimeString(date.end_time));
    });

    // ソートされた日付配列を作成
    const sortedDates = Array.from(dateSet).sort();
    const uniqueDates = sortedDates.map((dateStr) => {
      const date = new Date(dateStr);
      return {
        dateStr,
        label: date.toLocaleDateString("ja-JP", {
          month: "numeric",
          day: "numeric",
          weekday: "short",
        }),
      };
    });

    // ソートされた時間配列を作成
    const sortedTimes = Array.from(timeSet).sort();

    // 時間帯のペア（開始-終了）を作成
    const timeslots: { start: string; end: string }[] = [];
    for (let i = 0; i < sortedTimes.length - 1; i++) {
      timeslots.push({
        start: sortedTimes[i],
        end: sortedTimes[i + 1],
      });
    }

    return { uniqueDates, uniqueTimeslots: timeslots };
  }, [eventDates]);

  // 特定の日付と時間帯に対応するイベント日程IDを取得
  const getDateIdForSlot = (
    dateStr: string,
    startTime: string,
    endTime: string
  ) => {
    const matchedDate = eventDates.find((date) => {
      const dateOnly = extractDateString(date.start_time);
      const startTimeOnly = extractTimeString(date.start_time);
      const endTimeOnly = extractTimeString(date.end_time);

      return (
        dateOnly === dateStr &&
        startTimeOnly === startTime &&
        endTimeOnly === endTime
      );
    });

    return matchedDate?.id || null;
  };

  // 特定の日程セルが選択されているかどうか
  const isDateSelected = (dateId: string | null) => {
    if (!dateId) return false;
    return selectedDateIds.includes(dateId);
  };

  // マトリクス表示用の日程と時間帯のセル生成
  const renderTimeSlotMatrix = () => {
    return (
      <div>
        {finalizedDateIds.length > 0 && (
          <div className="alert alert-success mb-4">
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h4 className="font-bold">確定済みの日程があります</h4>
              <ul className="list-disc list-inside mt-1 text-sm">
                {finalizedDateIds.map((dateId) => {
                  const date = eventDates.find((d) => d.id === dateId);
                  if (!date) return null;
                  return (
                    <li key={dateId}>
                      {formatDate(date.start_time)}{" "}
                      {formatTime(date.start_time)}〜{formatTime(date.end_time)}
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs mt-1">
                ※
                これらの日程は既に選択状態になっています。修正する場合はマトリクスから選択/解除してください。
              </p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto mb-6">
          <table className="table w-full text-sm md:text-base">
            <thead>
              <tr>
                <th className="bg-base-300 sticky left-0 z-10 whitespace-normal min-w-20 max-w-24">
                  時間帯
                </th>
                {uniqueDates.map((date) => (
                  <th
                    key={date.dateStr}
                    className="text-center whitespace-normal min-w-16 px-1 py-2"
                  >
                    {date.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uniqueTimeslots.map((slot) => (
                <tr key={`${slot.start}-${slot.end}`}>
                  <th className="bg-base-300 sticky left-0 z-10 text-xs md:text-sm whitespace-nowrap">
                    {slot.start}
                  </th>
                  {uniqueDates.map((date) => {
                    const dateId = getDateIdForSlot(
                      date.dateStr,
                      slot.start,
                      slot.end
                    );
                    const isSelected = isDateSelected(dateId);
                    const availableCount = dateId
                      ? getAvailableParticipantsCount(dateId)
                      : 0;
                    const availabilityPercent =
                      participants.length > 0
                        ? Math.round(
                            (availableCount / participants.length) * 100
                          )
                        : 0;

                    if (!dateId) {
                      return (
                        <td
                          key={`${date.dateStr}-${slot.start}`}
                          className="bg-base-200 text-center"
                        >
                          -
                        </td>
                      );
                    }

                    // セルの色・バッジは「現在の選択状態（selectedDateIds）」で判定
                    let bgStyle = {};
                    if (availabilityPercent >= 75) {
                      bgStyle = { backgroundColor: "rgba(52, 211, 153, 0.8)" };
                    } else if (availabilityPercent >= 50) {
                      bgStyle = { backgroundColor: "rgba(52, 211, 153, 0.6)" };
                    } else if (availabilityPercent >= 25) {
                      bgStyle = { backgroundColor: "rgba(251, 191, 36, 0.6)" };
                    } else if (availabilityPercent > 0) {
                      bgStyle = { backgroundColor: "rgba(239, 68, 68, 0.4)" };
                    } else {
                      bgStyle = { backgroundColor: "rgba(243, 244, 246, 0.8)" };
                    }

                    // 選択状態で色・枠・バッジを切り替え
                    const cellStyle = {
                      ...bgStyle,
                      ...(isSelected
                        ? {
                            backgroundColor: "rgba(6, 182, 212, 0.5)",
                            borderWidth: "2px",
                            borderColor: "rgb(6, 182, 212)",
                          }
                        : {}),
                    };

                    return (
                      <td
                        key={`${date.dateStr}-${slot.start}`}
                        className={`text-center transition-all p-1 md:p-2 z-10 ${
                          isSelected ? "border-2 border-accent" : ""
                        }`}
                        style={cellStyle}
                      >
                        <button
                          type="button"
                          className="w-full h-full flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-accent rounded"
                          aria-pressed={isSelected}
                          tabIndex={0}
                          onClick={() => dateId && handleDateToggle(dateId)}
                        >
                          <span className="font-semibold text-xs md:text-sm">
                            {availableCount}人
                          </span>
                          <span className="text-xs hidden md:block">
                            {availabilityPercent}%
                          </span>
                          {isSelected && (
                            <span className="badge badge-accent badge-xs md:badge-sm mt-1">
                              {finalizedDateIds.includes(dateId)
                                ? "確定"
                                : "選択"}
                            </span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center mt-4">
          <div className="mb-4">
            <span className="font-semibold">
              選択中: {selectedDateIds.length}件の日程
            </span>
            {selectedDateIds.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium">
                  全ての選択日程で参加可能:{" "}
                  {getParticipantsForAllSelectedDates().length}人
                </p>
                {getParticipantsForAllSelectedDates().length > 0 && (
                  <p className="text-xs text-gray-600">
                    {getParticipantsForAllSelectedDates().join(", ")}
                  </p>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleProceedToConfirm}
            className="btn btn-accent"
            disabled={
              selectedDateIds.length === 0 && finalizedDateIds.length === 0
            }
          >
            {selectedDateIds.length === 0 && finalizedDateIds.length > 0
              ? "確定を解除する"
              : "選択した日程で確定する (" +
                selectedDateIds.length +
                "件選択中)"}
          </button>
        </div>

        <div className="mt-8">
          <h4 className="text-sm font-semibold mb-2">凡例：</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <h5 className="text-xs font-medium">参加率に応じた色：</h5>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-error bg-opacity-30 mr-1"></div>
                  <span>0〜25%</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-warning bg-opacity-50 mr-1"></div>
                  <span>25〜50%</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-success bg-opacity-50 mr-1"></div>
                  <span>50〜75%</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-success bg-opacity-80 mr-1"></div>
                  <span>75〜100%</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h5 className="text-xs font-medium">日程の状態：</h5>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-success bg-opacity-30 border-2 border-success mr-1"></div>
                  <span>確定済み</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-accent bg-opacity-50 border-2 border-accent mr-1"></div>
                  <span>選択中（未確定）</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- 確認ダイアログの分岐整理 ---
  const renderConfirmDialog = () => {
    // 全解除モード
    if (finalizedDateIds.length > 0 && selectedDateIds.length === 0) {
      return (
        <div className="bg-info bg-opacity-15 p-4 rounded-lg border border-info shadow-sm">
          <h4 className="font-bold mb-2 text-info-content">
            全ての確定を解除しますか？
          </h4>
          <div className="flex gap-3 mt-4">
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
                "確定を解除する"
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
      );
    }
    // 新規確定 or 変更モード
    return (
      <div className="bg-info bg-opacity-15 p-4 rounded-lg border border-info shadow-sm">
        <h4 className="font-bold mb-2 text-info-content">
          以下の日程で確定しますか？
        </h4>
        {finalizedDateIds.length > 0 && (
          <div className="mb-4">
            <h5 className="font-semibold text-sm mb-1">既に確定済みの日程:</h5>
            <ul className="list-disc pl-5 mb-2 text-sm">
              {finalizedDateIds.map((dateId) => {
                const date = eventDates.find((d) => d.id === dateId);
                const willBeRemoved = !selectedDateIds.includes(dateId);
                return date ? (
                  <li
                    key={dateId}
                    className={willBeRemoved ? "text-error line-through" : ""}
                  >
                    {formatDate(date.start_time)} {formatTime(date.start_time)}
                    〜{formatTime(date.end_time)}
                    {willBeRemoved && (
                      <span className="ml-2 text-xs badge badge-error badge-sm">
                        解除されます
                      </span>
                    )}
                  </li>
                ) : null;
              })}
            </ul>
            {finalizedDateIds.some((id) => !selectedDateIds.includes(id)) && (
              <p className="text-xs text-error">
                ※ 取り消し線の日程は選択が解除されます。
              </p>
            )}
          </div>
        )}
        {selectedDateIds.length > 0 && (
          <>
            <h5 className="font-semibold mb-1">
              {finalizedDateIds.length > 0
                ? "確定する日程:"
                : "以下の日程を確定します:"}
            </h5>
            <ul className="list-disc pl-5 mb-4">
              {selectedDateIds.map((dateId) => {
                const date = eventDates.find((d) => d.id === dateId);
                const isNewlySelected = !finalizedDateIds.includes(dateId);
                return date ? (
                  <li key={dateId}>
                    {formatDate(date.start_time)} {formatTime(date.start_time)}
                    〜{formatTime(date.end_time)}
                    <span className="ml-2 text-sm">
                      (参加可能: {getAvailableParticipantsCount(dateId)}人)
                    </span>
                    {isNewlySelected && finalizedDateIds.length > 0 && (
                      <span className="badge badge-accent badge-sm ml-2">
                        新規
                      </span>
                    )}
                  </li>
                ) : null;
              })}
            </ul>
          </>
        )}
        {selectedDateIds.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium">
              <strong>
                全ての選択日程で参加可能:
                {getParticipantsForAllSelectedDates().length}人
              </strong>
            </p>
            {getParticipantsForAllSelectedDates().length > 0 && (
              <p className="text-sm text-neutral-content">
                {getParticipantsForAllSelectedDates().join(", ")}
              </p>
            )}
          </div>
        )}
        <p className="text-error mb-4 text-sm font-medium flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          確定後も必要に応じて変更可能です（この画面から再選択して確定し直せます）。
        </p>
        <div className="flex gap-3 mt-4">
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
          {/* 現状維持ボタン: 変更がない場合のみ */}
          {selectedDateIds.length === finalizedDateIds.length &&
            selectedDateIds.every((id) => finalizedDateIds.includes(id)) && (
              <button
                onClick={cancelConfirm}
                disabled={isProcessing}
                className="btn btn-outline"
              >
                現在の確定内容を維持する
              </button>
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-0">
      <h3 className="text-xl font-bold">日程の確定</h3>
      <div className="my-4 flex flex-col gap-4">
        <button
          className="btn btn-outline btn-secondary mb-4"
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {isOpen ? "閉じる" : "日程の確定を開く"}
        </button>
      </div>
      {isOpen && (
        <div className="animate-fade-in">
          {error && (
            <div className="alert alert-error mb-4" ref={errorRef}>
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

          {isConfirming ? renderConfirmDialog() : renderTimeSlotMatrix()}
        </div>
      )}
    </div>
  );
}
