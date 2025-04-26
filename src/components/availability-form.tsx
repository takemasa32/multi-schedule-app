"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  TouchEvent,
} from "react";
import { submitAvailability } from "@/app/actions";
import { formatDateTimeWithDay } from "@/lib/utils";

interface AvailabilityFormProps {
  eventId: string;
  publicToken: string;
  eventDates: {
    id: string;
    start_time: string;
    end_time: string;
    label?: string;
  }[];
  // 既存の回答データがある場合はそれを受け取る
  existingResponses?: {
    participantName?: string;
    availabilities?: Record<string, boolean>;
    participantId?: string; // 編集モードの場合は参加者IDも渡す
  };
  onEditComplete?: () => void; // 編集完了時のコールバック
  onCancelEdit?: () => void; // 編集キャンセル時のコールバック
  isEditMode?: boolean; // 編集モードかどうか
}

type ViewMode = "list" | "table" | "heatmap";
type CellStatus = "available" | "unavailable" | "empty";

export default function AvailabilityForm({
  eventId,
  publicToken,
  eventDates,
  existingResponses,
  onEditComplete,
  onCancelEdit,
  isEditMode = false,
}: AvailabilityFormProps) {
  const [name, setName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false); // 更新モード用の状態
  // すべての日程に対して初期状態を「不可」（false）に設定
  const [selectedDates, setSelectedDates] = useState<Record<string, boolean>>(
    () => {
      const initialState: Record<string, boolean> = {};
      // 既存の回答がある場合はそれを使用、ない場合は全てfalseで初期化
      if (existingResponses?.availabilities) {
        return { ...initialState, ...existingResponses.availabilities };
      }
      // すべての日程に対してfalse（不可）を初期値として設定
      eventDates.forEach((date) => {
        initialState[date.id] = false;
      });
      return initialState;
    }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ドラッグ選択関連の状態
  const [isDragging, setIsDragging] = useState(false);
  // この変数は将来の機能拡張のために保持しています
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [dragStartId, setDragStartId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<boolean | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("heatmap");
  // タッチ操作対応のための状態
  const [isTouching, setIsTouching] = useState(false);

  // ページネーション用の状態
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(7); // デフォルトは1週間
  const pageSizeOptions = [
    { value: 3, label: "3日" },
    { value: 5, label: "5日" },
    { value: 7, label: "1週間" },
    { value: 14, label: "2週間" },
    { value: 0, label: "すべて表示" },
  ];

  // LocalStorageから以前の名前を復元、または既存の回答データの名前を使用
  useEffect(() => {
    // 既存回答データの名前があればそれを優先
    if (existingResponses?.participantName) {
      setName(existingResponses.participantName);
    } else {
      const savedName = localStorage.getItem("participantName");
      if (savedName) {
        setName(savedName);
      }
    }
  }, [existingResponses]);

  // 時間範囲を読みやすい形式にフォーマット
  const formatTimeRange = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);

    // 00:00を24:00として表示する処理
    const formatEndTime = () => {
      if (end.getHours() === 0 && end.getMinutes() === 0) {
        return "24:00";
      } else {
        return `${end.getHours().toString().padStart(2, "0")}:${end
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;
      }
    };

    // 同じ日の場合は日付を1回だけ表示
    if (start.toDateString() === end.toDateString()) {
      return `${formatDateTimeWithDay(start)} 〜 ${formatEndTime()}`;
    } else {
      // 異なる日の場合は両方の日付を表示
      return `${formatDateTimeWithDay(start)} 〜 ${formatDateTimeWithDay(end)}`;
    }
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
  const handleSubmit = async (e: React.FormEvent) => {
    if (!validateForm()) {
      e.preventDefault();
    } else {
      // 名前をLocalStorageに保存
      localStorage.setItem("participantName", name);
      setIsSubmitting(true);
      // formのaction属性がServer Actionを呼び出すため
      // ここでは送信準備のみ行う
    }
  };

  // Server Actionを使用したフォーム送信処理
  const handleFormAction = async (formData: FormData): Promise<void> => {
    try {
      // 編集モードの場合、既存の参加者IDを追加
      if (isEditMode && existingResponses?.participantId) {
        formData.append("participantId", existingResponses.participantId);
      }

      const response = await submitAvailability(formData);

      if (response.success) {
        setFeedback(response.message ?? "送信が完了しました");
        // 編集モードで編集完了コールバックがあれば呼び出す
        if (isEditMode && onEditComplete) {
          onEditComplete();
        }
      } else {
        setError(response.message || "送信に失敗しました");
      }

      setIsSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました");
      setIsSubmitting(false);
    }
  };

  // 日付のグループ化（日付別に時間帯をまとめる）
  const dateGroups = useMemo(() => {
    const groups: Record<string, typeof eventDates> = {};

    eventDates.forEach((date) => {
      const dateObj = new Date(date.start_time);
      const dateKey = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD形式

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }

      groups[dateKey].push(date);
    });

    // 日付順にソート
    const sortedGroups = Object.entries(groups)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([dateStr, dates]) => {
        const date = new Date(dateStr);
        return {
          dateKey: dateStr,
          formattedDate: date.toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "short",
          }),
          slots: dates.sort(
            (a, b) =>
              new Date(a.start_time).getTime() -
              new Date(b.start_time).getTime()
          ),
        };
      });

    // テーブルビュー向けにページネーション処理
    if (viewMode === "table" && pageSize > 0) {
      return sortedGroups.slice(
        currentPage * pageSize,
        (currentPage + 1) * pageSize
      );
    }

    return sortedGroups;
  }, [eventDates, currentPage, pageSize, viewMode]);

  // ヒートマップ表示用のデータ構造を生成
  const heatmapData = useMemo(() => {
    // 全ての時間スロットを抽出（時:分の形式）
    const allTimeSlots = new Set<string>();
    const dateMap: Record<string, Record<string, string>> = {};

    // 全日付を抽出
    const allDates = new Set<string>();

    eventDates.forEach((date) => {
      const start = new Date(date.start_time);
      const end = new Date(date.end_time);

      const dateKey = start.toISOString().split("T")[0];
      allDates.add(dateKey);

      const timeKey = `${start.getHours().toString().padStart(2, "0")}:${start
        .getMinutes()
        .toString()
        .padStart(2, "0")}-${end.getHours().toString().padStart(2, "0")}:${end
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
      allTimeSlots.add(timeKey);

      if (!dateMap[dateKey]) {
        dateMap[dateKey] = {};
      }

      dateMap[dateKey][timeKey] = date.id;
    });

    // 時間スロットを時間順にソート
    const sortedTimeSlots = Array.from(allTimeSlots).sort();

    // 日付を日付順にソート
    const sortedDates = Array.from(allDates).sort();

    // 現在のページとページサイズに基づいて表示する日付をフィルタリング
    const paginatedDates =
      pageSize === 0
        ? sortedDates // pageSize=0の場合はすべて表示
        : sortedDates.slice(
            currentPage * pageSize,
            (currentPage + 1) * pageSize
          );

    // 総ページ数を計算
    const totalPages =
      pageSize === 0 ? 1 : Math.ceil(sortedDates.length / pageSize);

    return {
      timeSlots: sortedTimeSlots,
      dates: paginatedDates.map((dateStr) => {
        const date = new Date(dateStr);
        return {
          dateKey: dateStr,
          formattedDate: date.toLocaleDateString("ja-JP", {
            month: "numeric",
            day: "numeric",
            weekday: "short",
          }),
        };
      }),
      dateMap,
      totalPages,
      allDatesCount: sortedDates.length,
      currentDateRange:
        paginatedDates.length > 0
          ? {
              start: new Date(paginatedDates[0]).toLocaleDateString("ja-JP", {
                month: "numeric",
                day: "numeric",
              }),
              end: new Date(
                paginatedDates[paginatedDates.length - 1]
              ).toLocaleDateString("ja-JP", {
                month: "numeric",
                day: "numeric",
              }),
            }
          : null,
    };
  }, [eventDates, currentPage, pageSize]);

  // ドラッグ選択の開始
  const handleMouseDown = useCallback(
    (dateId: string, initialState: boolean) => {
      setIsDragging(true);
      setDragStartId(dateId);
      setDragState(!initialState); // クリックした時の反対の状態にする

      // クリックした要素の状態を即座に変更
      setSelectedDates((prev) => ({
        ...prev,
        [dateId]: !initialState,
      }));
    },
    []
  );

  // ドラッグ中の処理
  const handleMouseEnter = useCallback(
    (dateId: string) => {
      if (isDragging && dragState !== null) {
        setSelectedDates((prev) => ({
          ...prev,
          [dateId]: dragState,
        }));
      }
    },
    [isDragging, dragState]
  );

  // ドラッグ終了
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStartId(null);
    setDragState(null);
  }, []);

  // マウスが領域外に出た時の処理
  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDragStartId(null);
      setDragState(null);
    }
  }, [isDragging]);

  // タッチ操作開始（スマホ向け）
  const handleTouchStart = useCallback(
    (dateId: string, initialState: boolean, e: TouchEvent) => {
      e.preventDefault(); // デフォルトのスクロールなどを防止
      setIsTouching(true);
      setDragStartId(dateId);
      setDragState(!initialState);

      setSelectedDates((prev) => ({
        ...prev,
        [dateId]: !initialState,
      }));
    },
    []
  );

  // タッチ移動（スマホ向け）
  const handleTouchMove = useCallback(
    (e: React.TouchEvent | globalThis.TouchEvent) => {
      // !isTouching || !dragStateではない方が良い（二重否定で複雑）
      // 論理的には「タッチ中」かつ「ドラッグ状態がnullでない」という条件が正しい
      if (isTouching && dragState !== null) {
        // タッチ位置の要素を取得
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);

        if (element) {
          // data-date-id属性を持つ要素を探索
          const dateElement = element.closest("[data-date-id]");
          if (dateElement) {
            const dateId = dateElement.getAttribute("data-date-id");
            if (dateId) {
              setSelectedDates((prev) => ({
                ...prev,
                [dateId]: dragState,
              }));
            }
          }
        }
      }
    },
    [isTouching, dragState]
  );

  // タッチ終了（スマホ向け）
  const handleTouchEnd = useCallback(() => {
    setIsTouching(false);
    setDragStartId(null);
    setDragState(null);
  }, []);

  // 全体にイベントリスナーを設定（ドラッグ終了用）
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseUp]);

  // タッチ操作のイベントリスナー
  useEffect(() => {
    if (isTouching) {
      // 型付きのハンドラーを定義
      const handleDomTouchMove = (e: globalThis.TouchEvent) => {
        handleTouchMove(e);
      };

      window.addEventListener("touchend", handleTouchEnd);
      window.addEventListener("touchmove", handleDomTouchMove);

      return () => {
        window.removeEventListener("touchend", handleTouchEnd);
        window.removeEventListener("touchmove", handleDomTouchMove);
      };
    }
  }, [isTouching, handleTouchEnd, handleTouchMove]);

  // セルの状態に基づいたクラス名とスタイルを生成する
  const getCellStyle = (
    dateId: string | undefined
  ): { className: string; status: CellStatus } => {
    if (!dateId)
      return { className: "bg-gray-100 text-gray-400", status: "empty" };

    const isSelected = !!selectedDates[dateId];

    if (isSelected) {
      return {
        className: "bg-success text-success-content shadow-md", // text-white → text-success-contentに変更して適切なコントラストを確保
        status: "available",
      };
    }

    return {
      className: "bg-base-200 hover:bg-base-300",
      status: "unavailable",
    };
  };

  // CellStatusに基づいて表示するアイコンやテキスト
  const getCellContent = (status: CellStatus) => {
    switch (status) {
      case "available":
        return (
          <div className="text-lg font-bold select-none inline-block">○</div> // inline-blockを追加して表示を安定化
        );
      case "unavailable":
        return (
          <div className="text-lg font-bold opacity-70 select-none inline-block">
            ×
          </div> // 同様にinline-blockを追加
        );
      case "empty":
        return <span className="select-none inline-block">ー</span>;
    }
  };

  // ページを変更するハンドラー
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  // ページサイズを変更するハンドラー
  const handlePageSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newSize = parseInt(e.target.value, 10);
      setPageSize(newSize);
      setCurrentPage(0); // ページサイズ変更時は最初のページに戻る
    },
    []
  );

  // 編集モードを切り替える処理
  const handleEditClick = () => {
    setIsEditing(true);
    setFeedback(null); // 編集モードに変わるとフィードバックメッセージを消去
  };

  return (
    <div className="mb-8 p-6 bg-base-100 border rounded-lg shadow-sm transition-all animate-fadeIn">
      {feedback && !isEditing ? (
        <>
          <h2 className="text-xl font-bold mb-4">回答が送信されました</h2>
          <div className="feedback-message feedback-success mb-6" role="alert">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
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
            <span>{feedback}</span>
          </div>
          <p className="text-base-content">
            ご回答ありがとうございました。他の参加者の回答状況は下のセクションでご確認いただけます。
          </p>
          <p className="mt-2 mb-6 text-sm text-gray-500">
            ※ 回答内容を更新したい場合は以下のボタンをクリックしてください。
          </p>
          <button
            type="button"
            onClick={handleEditClick}
            className="btn btn-outline btn-primary"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
            回答を更新する
          </button>
        </>
      ) : (
        <>
          <h2 className="text-xl font-bold mb-4">
            {isEditMode
              ? `${existingResponses?.participantName}さんの予定を編集`
              : isEditing
              ? "回答を更新する"
              : "回答する"}
          </h2>

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
            action={handleFormAction}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* イベント情報を隠しフィールドとして渡す */}
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="publicToken" value={publicToken} />

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
                className="input input-bordered w-full transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <label className="block text-sm font-medium">
                    候補日程から参加可能な日を選択してください
                    <span className="text-error">*</span>
                  </label>

                  <div
                    role="group"
                    aria-label="表示形式の選択"
                    className="join bg-base-200 rounded-lg"
                  >
                    <button
                      type="button"
                      className={`join-item btn btn-sm ${
                        viewMode === "heatmap"
                          ? "btn-active bg-primary text-primary-content font-medium"
                          : "text-base-content"
                      }`}
                      onClick={() => setViewMode("heatmap")}
                      aria-pressed={viewMode === "heatmap"}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      ヒートマップ
                    </button>
                    <button
                      type="button"
                      className={`join-item btn btn-sm ${
                        viewMode === "list"
                          ? "btn-active bg-primary text-primary-content font-medium"
                          : "text-base-content"
                      }`}
                      onClick={() => setViewMode("list")}
                      aria-pressed={viewMode === "list"}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      個別
                    </button>
                    <button
                      type="button"
                      className={`join-item btn btn-sm ${
                        viewMode === "table"
                          ? "btn-active bg-primary text-primary-content font-medium"
                          : "text-base-content"
                      }`}
                      onClick={() => setViewMode("table")}
                      aria-pressed={viewMode === "table"}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z"
                          clipRule="evenodd"
                        />
                      </svg>
                      リスト
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-info/10 p-2 mb-4 text-xs text-info rounded-lg border border-info/20 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="stroke-info flex-shrink-0 w-4 h-4 mr-1"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                <span>
                  セルをドラッグすると複数選択できます（タッチ操作も対応）
                </span>
              </div>

              {/* ページネーションUI */}
              {/* リストビュー、ヒートマップビュー、テーブルビューでのページネーション表示 */}
              {(viewMode === "heatmap" ||
                viewMode === "table" ||
                viewMode === "list") &&
                pageSize > 0 &&
                heatmapData.allDatesCount > pageSize && (
                  <div className="flex flex-col md:flex-row justify-between items-center gap-3 mb-4 bg-base-200 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      {heatmapData.currentDateRange && (
                        <span className="text-sm font-medium">
                          表示期間: {heatmapData.currentDateRange.start} から{" "}
                          {heatmapData.currentDateRange.end}
                          <span className="text-xs text-gray-500 ml-1">
                            (全{heatmapData.allDatesCount}日中{" "}
                            {currentPage * pageSize + 1}-
                            {Math.min(
                              (currentPage + 1) * pageSize,
                              heatmapData.allDatesCount
                            )}
                            日目)
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="join">
                        <button
                          type="button"
                          className="join-item btn btn-sm btn-outline"
                          onClick={() => handlePageChange(0)}
                          disabled={currentPage === 0}
                        >
                          «
                        </button>
                        <button
                          type="button"
                          className="join-item btn btn-sm btn-outline"
                          onClick={() =>
                            handlePageChange(Math.max(0, currentPage - 1))
                          }
                          disabled={currentPage === 0}
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          className="join-item btn btn-sm btn-outline"
                          onClick={() =>
                            handlePageChange(
                              Math.min(
                                heatmapData.totalPages - 1,
                                currentPage + 1
                              )
                            )
                          }
                          disabled={currentPage >= heatmapData.totalPages - 1}
                        >
                          ›
                        </button>
                        <button
                          type="button"
                          className="join-item btn btn-sm btn-outline"
                          onClick={() =>
                            handlePageChange(heatmapData.totalPages - 1)
                          }
                          disabled={currentPage >= heatmapData.totalPages - 1}
                        >
                          »
                        </button>
                      </div>
                      <select
                        className="select select-sm select-bordered"
                        value={pageSize}
                        onChange={handlePageSizeChange}
                        aria-label="表示日数"
                      >
                        {pageSizeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

              {/* 選択した日程の隠しフィールド */}
              {Object.entries(selectedDates).map(
                ([dateId, isSelected]) =>
                  isSelected && (
                    <input
                      key={dateId}
                      type="hidden"
                      name={`availability_${dateId}`}
                      value="on"
                    />
                  )
              )}

              {viewMode === "list" && (
                <div
                  className="grid grid-cols-1 gap-1 select-none"
                  onMouseLeave={handleMouseLeave}
                >
                  {/* リストビュー用にページネーションされたイベント日程データを準備 */}
                  {(() => {
                    // 日程を日付順にソート
                    const sortedDates = [...eventDates].sort(
                      (a, b) =>
                        new Date(a.start_time).getTime() -
                        new Date(b.start_time).getTime()
                    );

                    // ページネーション処理
                    const paginatedDates =
                      pageSize === 0
                        ? sortedDates
                        : sortedDates.slice(
                            currentPage * pageSize,
                            (currentPage + 1) * pageSize
                          );

                    return paginatedDates.map((date) => {
                      const { className, status } = getCellStyle(date.id);
                      return (
                        <div
                          key={date.id}
                          data-date-id={date.id}
                          className={`flex items-center p-3 rounded-md border border-base-300 transition-all cursor-pointer ${
                            status === "available"
                              ? "bg-base-100"
                              : "hover:bg-base-200"
                          }`}
                          onMouseDown={() =>
                            handleMouseDown(date.id, !!selectedDates[date.id])
                          }
                          onMouseEnter={() => handleMouseEnter(date.id)}
                          onTouchStart={(e) =>
                            handleTouchStart(
                              date.id,
                              !!selectedDates[date.id],
                              e
                            )
                          }
                        >
                          <div
                            className={`flex items-center justify-center w-10 h-10 rounded-md mr-4 shrink-0 transition-colors duration-200 ease-in-out ${className}`}
                          >
                            {getCellContent(status)}
                          </div>
                          <div className="grid grid-cols-1">
                            <span className="font-medium">
                              {formatTimeRange(date.start_time, date.end_time)}
                            </span>
                            {date.label && (
                              <span className="text-sm text-gray-500">
                                {date.label}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {viewMode === "table" && (
                <div
                  className="overflow-x-auto select-none"
                  onMouseLeave={handleMouseLeave}
                >
                  <table className="table table-fixed w-full border-collapse">
                    <thead>
                      <tr className="bg-base-200">
                        <th className="w-32 border border-base-300">日付</th>
                        <th className="w-32 border border-base-300">時間帯</th>
                        <th className="w-24 text-center border border-base-300">
                          参加可否
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dateGroups.map((group) => (
                        <React.Fragment key={group.dateKey}>
                          {group.slots.map((date, index) => {
                            const start = new Date(date.start_time);
                            const end = new Date(date.end_time);
                            const timeStr = `${start
                              .getHours()
                              .toString()
                              .padStart(2, "0")}:${start
                              .getMinutes()
                              .toString()
                              .padStart(2, "0")}～${end
                              .getHours()
                              .toString()
                              .padStart(2, "0")}:${end
                              .getMinutes()
                              .toString()
                              .padStart(2, "0")}`;

                            const { className, status } = getCellStyle(date.id);

                            return (
                              <tr
                                key={date.id}
                                className="hover"
                                data-date-id={date.id}
                              >
                                {index === 0 && (
                                  <td
                                    rowSpan={group.slots.length}
                                    className="align-middle border border-base-300 bg-base-100"
                                  >
                                    <div className="font-medium">
                                      {group.formattedDate}
                                    </div>
                                  </td>
                                )}
                                <td className="border border-base-300">
                                  {timeStr}
                                </td>
                                <td className="text-center border border-base-300">
                                  <div
                                    className={`w-full h-10 mx-auto rounded-md flex items-center justify-center cursor-pointer transition-colors duration-200 ease-in-out ${className}`}
                                    onMouseDown={() =>
                                      handleMouseDown(
                                        date.id,
                                        !!selectedDates[date.id]
                                      )
                                    }
                                    onMouseEnter={() =>
                                      handleMouseEnter(date.id)
                                    }
                                    onTouchStart={(e) =>
                                      handleTouchStart(
                                        date.id,
                                        !!selectedDates[date.id],
                                        e
                                      )
                                    }
                                  >
                                    {getCellContent(status)}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {viewMode === "heatmap" && (
                <div
                  className="overflow-x-auto select-none"
                  onMouseLeave={handleMouseLeave}
                >
                  <table className="table table-fixed w-full border-collapse">
                    <thead>
                      <tr className="bg-base-200">
                        <th className="w-24 px-2 py-3 text-center border border-base-300">
                          時間帯\日付
                        </th>
                        {heatmapData.dates.map((date) => (
                          <th
                            key={date.dateKey}
                            className="w-24 px-2 py-3 text-center whitespace-nowrap border border-base-300"
                          >
                            {date.formattedDate}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heatmapData.timeSlots.map((timeSlot) => (
                        <tr key={timeSlot} className="hover">
                          <td className="px-2 py-3 font-medium text-center whitespace-nowrap border border-base-300 bg-base-100">
                            {timeSlot}
                          </td>
                          {heatmapData.dates.map((date) => {
                            const dateId =
                              heatmapData.dateMap[date.dateKey]?.[timeSlot];
                            const { className, status } = getCellStyle(dateId);

                            return (
                              <td
                                key={`${date.dateKey}-${timeSlot}`}
                                className="p-1 text-center border border-base-300"
                                data-date-id={dateId}
                              >
                                {dateId ? (
                                  <div
                                    className={`w-full h-10 rounded-md flex items-center justify-center cursor-pointer transition-colors duration-200 ease-in-out ${className}`}
                                    onMouseDown={() =>
                                      dateId &&
                                      handleMouseDown(
                                        dateId,
                                        !!selectedDates[dateId]
                                      )
                                    }
                                    onMouseEnter={() =>
                                      dateId && handleMouseEnter(dateId)
                                    }
                                    onTouchStart={(e) =>
                                      dateId &&
                                      handleTouchStart(
                                        dateId,
                                        !!selectedDates[dateId],
                                        e
                                      )
                                    }
                                  >
                                    {getCellContent(status)}
                                  </div>
                                ) : (
                                  <div className="w-full h-10 rounded-md flex items-center justify-center bg-gray-100 text-gray-400">
                                    ー
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                className="btn btn-primary w-full md:w-auto transition-all btn-animated shadow-lg hover:shadow-xl"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm mr-2"></span>
                    送信中...
                  </>
                ) : isEditMode ? (
                  "編集を保存"
                ) : (
                  "回答を送信"
                )}
              </button>

              {/* 編集モードの場合はキャンセルボタンを表示 */}
              {isEditMode && onCancelEdit && (
                <button
                  type="button"
                  className="btn btn-outline w-full md:w-auto"
                  onClick={onCancelEdit}
                  disabled={isSubmitting}
                >
                  キャンセル
                </button>
              )}
            </div>
          </form>
        </>
      )}
    </div>
  );
}
