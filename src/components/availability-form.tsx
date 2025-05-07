"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { submitAvailability } from "@/app/actions";
import { formatDateTimeWithDay } from "@/lib/utils";
import TermsCheckbox from "./terms/terms-checkbox";

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
  initialParticipant?: {
    id: string;
    name: string;
  } | null;
  initialAvailabilities?: Record<string, boolean>;
  mode?: "new" | "edit";
}

type ViewMode = "list" | "table" | "heatmap";
type WeekDay = "月" | "火" | "水" | "木" | "金" | "土" | "日";
type WeekDaySchedule = {
  selected: boolean;
  timeSlots: Record<string, boolean>;
};
type CellStatus = "available" | "unavailable" | "empty";

export default function AvailabilityForm({
  eventId,
  publicToken,
  eventDates,
  initialParticipant,
  initialAvailabilities = {},
  mode = "new",
}: AvailabilityFormProps) {
  const [name, setName] = useState(initialParticipant?.name || "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false); // 更新モード用の状態
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  // 名前の重複確認用状態
  const [showOverwriteConfirm, setShowOverwriteConfirm] =
    useState<boolean>(false);
  const [isCheckingName, setIsCheckingName] = useState(false);
  // フォーム送信の一時保存用
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  // すべての日程に対して初期状態を設定
  const [selectedDates, setSelectedDates] = useState<Record<string, boolean>>(
    () => {
      const initialState: Record<string, boolean> = {};
      // 初期値がある場合はそれを使用
      if (Object.keys(initialAvailabilities).length > 0) {
        return { ...initialState, ...initialAvailabilities };
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
  const [dragStartId, setDragStartId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<boolean | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("heatmap");
  // 週入力モード（アコーディオンを表示中か）：この状態が true の時は通常入力を無効化
  const [isWeekdayModeActive, setIsWeekdayModeActive] = useState(false);
  // 曜日マトリックスのドラッグ選択関連の状態
  const [isDraggingMatrix, setIsDraggingMatrix] = useState(false);
  const [matrixDragState, setMatrixDragState] = useState<boolean | null>(null); // ドラッグ中の設定値
  // 曜日ごとの選択状態と時間帯設定
  const [weekdaySelections, setWeekdaySelections] = useState<
    Record<WeekDay, WeekDaySchedule>
  >({
    月: { selected: false, timeSlots: {} },
    火: { selected: false, timeSlots: {} },
    水: { selected: false, timeSlots: {} },
    木: { selected: false, timeSlots: {} },
    金: { selected: false, timeSlots: {} },
    土: { selected: false, timeSlots: {} },
    日: { selected: false, timeSlots: {} },
  });
  // タッチ操作対応のための状態
  const [isTouching, setIsTouching] = useState(false);
  // 週入力マトリックスのタッチ操作対応
  const [isMatrixTouching, setIsMatrixTouching] = useState(false);

  // ページネーション用の状態
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(7); // デフォルトは1週間
  const pageSizeOptions = [
    { value: 3, label: "3日" },
    { value: 5, label: "5日" },
    { value: 7, label: "1週間" },
  ];

  // セルのスタイルと状態を返す関数
  const getCellStyle = useCallback(
    (dateId: string | undefined) => {
      if (!dateId) {
        return {
          className: "bg-gray-100 text-gray-400",
          status: "empty" as CellStatus,
        };
      }

      const isSelected = selectedDates[dateId];
      if (isSelected) {
        return {
          className: "bg-success text-success-content",
          status: "available" as CellStatus,
        };
      } else {
        return {
          className: "bg-base-200 hover:bg-base-300",
          status: "unavailable" as CellStatus,
        };
      }
    },
    [selectedDates]
  );

  // ドラッグ終了処理
  const handleMatrixDragEnd = useCallback(() => {
    setIsDraggingMatrix(false);
    setMatrixDragState(null);
    setIsMatrixTouching(false);
    // ドラッグ終了時にスクロールを再度許可する
    document.body.classList.remove("no-scroll");
  }, []);

  // 現在座標からセルを引き当てる共通関数
  const applyDragToElement = useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;

      // 熱マップセル（date-id）の処理
      const dateId = el.dataset.dateId;
      if (isDragging && dragState !== null && dateId) {
        // --- ここから範囲選択ロジック追加 ---
        if (dragStartId && dragStartId !== dateId) {
          // eventDatesの並び順でdragStartIdとdateIdの間の全セルを一括で更新
          const ids = eventDates.map((d) => d.id);
          const startIdx = ids.indexOf(dragStartId);
          const endIdx = ids.indexOf(dateId);
          if (startIdx !== -1 && endIdx !== -1) {
            const [from, to] =
              startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
            setSelectedDates((prev) => {
              const updated = { ...prev };
              for (let i = from; i <= to; i++) {
                updated[ids[i]] = dragState;
              }
              return updated;
            });
            return;
          }
        }
        // --- ここまで範囲選択ロジック ---
        // 1セルのみの場合は従来通り
        setSelectedDates((prev) => {
          if (prev[dateId] === dragState) return prev;
          return { ...prev, [dateId]: dragState };
        });
        return;
      }

      // 曜日マトリックスセル（day＋timeSlot）の処理
      const day = el.dataset.day;
      const slot = el.dataset.timeSlot;
      if (
        isDraggingMatrix &&
        matrixDragState !== null &&
        day &&
        slot &&
        Object.keys(weekdaySelections).includes(day as WeekDay)
      ) {
        const weekday = day as WeekDay;
        setWeekdaySelections((prev) => {
          // 同じ値であれば更新しない（パフォーマンス最適化）
          if (prev[weekday].timeSlots[slot] === matrixDragState) {
            return prev;
          }
          return {
            ...prev,
            [weekday]: {
              selected: true,
              timeSlots: {
                ...prev[weekday].timeSlots,
                [slot]: matrixDragState,
              },
            },
          };
        });
      }
    },
    [
      isDragging,
      dragState,
      isDraggingMatrix,
      matrixDragState,
      weekdaySelections,
      eventDates,
      dragStartId,
    ]
  );

  // マトリックスでのタッチ移動処理
  const handleMatrixTouchMove = useCallback(
    (e: React.TouchEvent | globalThis.TouchEvent) => {
      if (isMatrixTouching && matrixDragState !== null) {
        // スクロールを防止
        try {
          e.preventDefault();
        } catch {
          // パッシブイベントの場合は何もしない
        }

        // タッチ位置の要素を取得
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);

        if (element) {
          // マトリックスのセルを探索し、共通関数に処理を委譲
          const cellElement = element.closest("td[data-day][data-time-slot]");
          applyDragToElement(cellElement as HTMLElement | null);
        }
      }
    },
    [isMatrixTouching, matrixDragState, applyDragToElement]
  );

  // 全体にイベントリスナーを設定（ドラッグ終了用）
  useEffect(() => {
    if (isDraggingMatrix) {
      // ドラッグ中はbodyにno-scrollクラスを追加してスクロールを防止
      document.body.classList.add("no-scroll");
      window.addEventListener("mouseup", handleMatrixDragEnd);
      window.addEventListener("touchend", handleMatrixDragEnd);
      return () => {
        document.body.classList.remove("no-scroll");
        window.removeEventListener("mouseup", handleMatrixDragEnd);
        window.removeEventListener("touchend", handleMatrixDragEnd);
      };
    }
  }, [isDraggingMatrix, handleMatrixDragEnd]);

  // --- 共通ポインターイベント処理 ---
  /** セル選択のポインターイベント統一処理 */
  const commonPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      // ポインターキャプチャを使用しない（削除）
      e.preventDefault();
      e.stopPropagation();
      document.body.classList.add("no-scroll");
      const el = e.currentTarget;

      // ───── 表マップセルの場合 ─────
      const dateId = el.dataset.dateId;
      if (dateId) {
        const newState = !selectedDates[dateId];
        setSelectedDates((prev) => ({ ...prev, [dateId]: newState }));
        setIsDragging(true);
        setDragState(newState);
        return;
      }

      // ──── 曜日マトリックスセルの場合 ────
      const day = el.dataset.day;
      const slot = el.dataset.timeSlot;
      if (
        day &&
        slot &&
        Object.keys(weekdaySelections).includes(day as WeekDay)
      ) {
        const weekday = day as WeekDay;
        const newVal = !weekdaySelections[weekday].timeSlots[slot];
        setWeekdaySelections((prev) => ({
          ...prev,
          [weekday]: {
            selected: true,
            timeSlots: { ...prev[weekday].timeSlots, [slot]: newVal },
          },
        }));
        setIsDraggingMatrix(true);
        setIsMatrixTouching(true);
        setMatrixDragState(newVal);
      }
    },
    [selectedDates, weekdaySelections]
  );

  const commonPointerEnter = useCallback(
    (e: React.PointerEvent<HTMLElement> | PointerEvent) => {
      // イベントがネイティブか React かを判定
      const isNative = e instanceof PointerEvent;

      // スクロールを防止
      try {
        e.preventDefault();
      } catch {}

      // 参照要素を取得
      const el: HTMLElement | null = isNative
        ? (e.target as HTMLElement).closest("[data-date-id], [data-day]")
        : e.currentTarget;

      applyDragToElement(el);
    },
    [applyDragToElement]
  );

  const commonPointerUp = useCallback(() => {
    // ドラッグ状態をリセット
    setIsDragging(false);
    setDragState(null);
    setIsDraggingMatrix(false);
    setMatrixDragState(null);
    document.body.classList.remove("no-scroll");
  }, []);

  // ネイティブイベント用のラッパー関数
  const handleNativePointerMove = useCallback(
    (e: PointerEvent) => {
      e.preventDefault();
      applyDragToElement(
        document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
      );
    },
    [applyDragToElement]
  );

  const handleNativePointerUp = useCallback(() => {
    commonPointerUp();
  }, [commonPointerUp]);
  // --- ここまで共通処理 ---

  /* 監視用 useEffect */
  useEffect(() => {
    if (isDragging) {
      // ドラッグ中はbodyにno-scrollクラスを追加してスクロールを防止
      document.body.classList.add("no-scroll");

      // グローバルなポインターイベントリスナーを追加
      window.addEventListener("pointermove", handleNativePointerMove);
      window.addEventListener("pointerup", handleNativePointerUp);

      return () => {
        document.body.classList.remove("no-scroll");
        window.removeEventListener("pointermove", handleNativePointerMove);
        window.removeEventListener("pointerup", handleNativePointerUp);
      };
    }
  }, [isDragging, handleNativePointerMove, handleNativePointerUp]);

  // --- 曜日マトリックス用グローバルポインター＆タッチ監視 ---
  useEffect(() => {
    if (isDraggingMatrix) {
      document.body.classList.add("no-scroll");

      // グローバルポインターイベント監視を追加
      window.addEventListener("pointermove", handleNativePointerMove);
      window.addEventListener("pointerup", handleNativePointerUp);

      // タッチ移動・終了を拾う（passive: false）
      window.addEventListener("touchmove", handleMatrixTouchMove, {
        passive: false,
      });
      window.addEventListener("touchend", handleMatrixDragEnd);

      return () => {
        document.body.classList.remove("no-scroll");
        window.removeEventListener("pointermove", handleNativePointerMove);
        window.removeEventListener("pointerup", handleNativePointerUp);
        window.removeEventListener("touchmove", handleMatrixTouchMove);
        window.removeEventListener("touchend", handleMatrixDragEnd);
      };
    }
  }, [
    isDraggingMatrix,
    handleMatrixDragEnd,
    handleMatrixTouchMove,
    handleNativePointerMove,
    handleNativePointerUp,
    commonPointerEnter,
    commonPointerUp,
  ]);

  // LocalStorageから以前の名前を復元、または既存の回答データの名前を使用
  useEffect(() => {
    // 既存回答データの名前があればそれを優先
    if (initialParticipant?.name) {
      setName(initialParticipant.name);
    } else {
      const savedName = localStorage.getItem("participantName");
      if (savedName) {
        setName(savedName);
      }
    }
  }, [initialParticipant]);

  // 時間範囲を読みやすい形式にフォーマット
  const formatTimeRange = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);

    // 00:00を24:00として表示する処理
    const formatEndTime = () => {
      if (end.getHours() === 0 && end.getMinutes() === 0) {
        // 開始日と終了日を比較
        const startDate = new Date(start);
        startDate.setHours(0, 0, 0, 0); // 時刻部分をリセット

        const endDate = new Date(end);
        endDate.setHours(0, 0, 0, 0); // 時刻部分をリセット

        // 終了日が開始日の翌日である場合は24:00と表示
        if (endDate.getTime() - startDate.getTime() === 24 * 60 * 60 * 1000) {
          return "24:00";
        }
      }

      return `${end.getHours().toString().padStart(2, "0")}:${end
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
    };

    // 同じ日または24:00にまたがる場合は日付を1回だけ表示
    const startDay = new Date(start);
    startDay.setHours(0, 0, 0, 0);

    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    const oneDayDiff =
      endDay.getTime() - startDay.getTime() === 24 * 60 * 60 * 1000;
    const sameDay = startDay.getTime() === endDay.getTime();

    if (
      sameDay ||
      (oneDayDiff && end.getHours() === 0 && end.getMinutes() === 0)
    ) {
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

    if (!termsAccepted) {
      setError("利用規約への同意が必要です");
      return false;
    }

    return true;
  };

  // 同じ名前の参加者がいるかチェックする関数
  const checkExistingParticipant = async () => {
    // 編集モードなら既に自分の回答なので確認不要
    if (mode === "edit" || initialParticipant?.name === name) {
      return false;
    }

    setIsCheckingName(true);

    try {
      const response = await fetch(
        `/api/check-participant?eventId=${encodeURIComponent(
          eventId
        )}&name=${encodeURIComponent(name)}`
      );
      const data = await response.json();

      setIsCheckingName(false);
      return data.exists;
    } catch (error) {
      console.error("参加者チェックエラー:", error);
      setIsCheckingName(false);
      return false; // エラー時は存在しないとして扱う
    }
  };

  // この関数はServer Actionを呼び出す前の準備として使用
  const handleSubmit = async (e: React.FormEvent) => {
    if (!validateForm()) {
      e.preventDefault();
      return;
    }

    // フォームデータを取得
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    e.preventDefault(); // デフォルトの送信をキャンセル

    // 名前をLocalStorageに保存
    localStorage.setItem("participantName", name);

    try {
      // 既存の参加者がいるか確認
      const exists = await checkExistingParticipant();

      if (exists) {
        // 既存の参加者がいる場合は確認ダイアログを表示
        setPendingFormData(formData);
        setShowOverwriteConfirm(true);
      } else {
        // 既存の参加者がいない場合はそのまま送信
        setIsSubmitting(true);
        await handleFormAction(formData);
      }
    } catch (error) {
      console.error("送信エラー:", error);
      setError("送信中にエラーが発生しました");
    }
  };

  // Server Actionを使用したフォーム送信処理
  const handleFormAction = async (formData: FormData): Promise<void> => {
    try {
      // 編集モードの場合、既存の参加者IDを追加
      if (mode === "edit" && initialParticipant?.id) {
        formData.append("participantId", initialParticipant.id);
      }

      const response = await submitAvailability(formData);

      if (response.success) {
        setFeedback(response.message ?? "送信が完了しました");
        // 入力ページの場合は元の確認ページに戻る
        if (typeof window !== "undefined") {
          window.location.href = `/event/${publicToken}`;
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

      const dateKey = [
        start.getFullYear(),
        String(start.getMonth() + 1).padStart(2, "0"),
        String(start.getDate()).padStart(2, "0"),
      ].join("-");

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

  // start_time と end_time から時間帯のキーを生成する関数
  const getTimeKey = (startTime: string, endTime: string): string => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return `${start.getHours().toString().padStart(2, "0")}:${start
      .getMinutes()
      .toString()
      .padStart(2, "0")}-${end.getHours().toString().padStart(2, "0")}:${end
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  // 週入力モード用の時間帯スロットを初期化する関数
  const initializeWeekdayTimeSlots = () => {
    // 全ての時間帯を収集
    const timeSlots: Record<string, boolean> = {};

    // すべての日程から時間帯を抽出
    eventDates.forEach((date) => {
      const timeKey = getTimeKey(date.start_time, date.end_time);
      timeSlots[timeKey] = false; // デフォルト値はfalse
    });

    // 曜日別の選択状態マッピングを作成
    const weekdayData: Record<WeekDay, Record<string, boolean>> = {
      月: { ...timeSlots },
      火: { ...timeSlots },
      水: { ...timeSlots },
      木: { ...timeSlots },
      金: { ...timeSlots },
      土: { ...timeSlots },
      日: { ...timeSlots },
    };

    // 既存の選択データがある場合、曜日ごとに振り分ける
    eventDates.forEach((date) => {
      if (selectedDates[date.id]) {
        const dateObj = new Date(date.start_time);
        const weekday = ["日", "月", "火", "水", "木", "金", "土"][
          dateObj.getDay()
        ] as WeekDay;
        const timeKey = getTimeKey(date.start_time, date.end_time);
        weekdayData[weekday][timeKey] = true;
      }
    });

    // 各曜日に時間帯スロットを設定
    const updatedSelections = { ...weekdaySelections };
    Object.keys(updatedSelections).forEach((day) => {
      const weekday = day as WeekDay;
      // 少なくとも1つ選択されている場合はその曜日を「選択済み」とする
      const hasSelection = Object.values(weekdayData[weekday]).some(
        (val) => val
      );

      updatedSelections[weekday] = {
        selected: hasSelection,
        timeSlots: weekdayData[weekday],
      };
    });

    setWeekdaySelections(updatedSelections);
  };

  // ドラッグ選択の開始
  const handleMouseDown = useCallback(
    (dateId: string, initialState: boolean) => {
      setIsDragging(true);
      setDragStartId(dateId);
      setDragState(!initialState); // クリックした時の反対の状態にする

      // クリックした要素の状態を変更（State Batchingを活用するため関数形式を使用）
      setSelectedDates((prev) => {
        return {
          ...prev,
          [dateId]: !initialState,
        };
      });
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
    // ドラッグ終了時にスクロールを再度許可する
    document.body.classList.remove("no-scroll");
  }, []);

  // マウスが領域外に出た時の処理
  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDragStartId(null);
      setDragState(null);
    }
  }, [isDragging]);

  // タッチ操作開始（スマホ向け）- シンプル化したバージョン
  const handleTouchStart = useCallback(
    (dateId: string, initialState: boolean) => {
      // タッチ操作時はすぐに選択状態に移行
      setIsTouching(true);
      setDragStartId(dateId);
      setDragState(!initialState);

      // 即座に選択状態を反映
      setSelectedDates((prev) => ({
        ...prev,
        [dateId]: !initialState,
      }));

      // preventDefault()は専用のイベントリスナーで処理するため、ここでは呼び出さない
    },
    [] // 依存配列を空のままにして、コールバックが再作成されないようにする
  );

  // タッチ移動（スマホ向け）- ドラッグ状態の管理を改善
  const handleTouchMove = useCallback(
    (e: React.TouchEvent | globalThis.TouchEvent) => {
      // 条件チェックをシンプルに
      if (isTouching && dragState !== null) {
        // preventDefault()は専用のイベントリスナーで処理するため、ここでは呼び出さない

        // タッチ位置の要素を取得
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);

        // 共通関数に処理を委譲
        applyDragToElement(
          element?.closest("[data-date-id]") as HTMLElement | null
        );
      }
    },
    [isTouching, dragState, applyDragToElement]
  );

  // タッチ終了（スマホ向け）
  const handleTouchEnd = useCallback(() => {
    setIsTouching(false);
    setDragStartId(null);
    setDragState(null);
    // タッチ終了時にスクロールを再度許可する
    document.body.classList.remove("no-scroll");
  }, []);

  // 全体にイベントリスナーを設定（ドラッグ終了用）
  useEffect(() => {
    if (isDragging) {
      // ドラッグ中はbodyにno-scrollクラスを追加してスクロールを防止
      document.body.classList.add("no-scroll");
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.body.classList.remove("no-scroll");
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseUp]);

  // タッチ操作のイベントリスナー
  useEffect(() => {
    if (isTouching) {
      // ドラッグ中はbodyにno-scrollクラスを追加
      document.body.classList.add("no-scroll");

      // タッチ操作用のイベントリスナーを追加
      window.addEventListener("touchend", handleTouchEnd);

      // touchmoveは明示的にpassive: falseを設定
      // 型付きのハンドラーを別途定義して、スコープ外で確実に削除できるようにする
      const handleDomTouchMove = (e: globalThis.TouchEvent) => {
        // タッチ操作中はスクロールを防止 - ここではpreventDefaultをtry-catchで囲む
        if (isTouching) {
          try {
            // passive: falseが設定されていれば実行される
            e.preventDefault();
          } catch {
            // パッシブイベントの場合は何もしない
          }
          handleTouchMove(e);
        }
      };

      // passive: false を明示的に指定することで、preventDefault()が可能になる
      window.addEventListener("touchmove", handleDomTouchMove, {
        passive: false,
      });

      return () => {
        document.body.classList.remove("no-scroll");
        window.removeEventListener("touchend", handleTouchEnd);
        window.removeEventListener("touchmove", handleDomTouchMove);
      };
    }
  }, [isTouching, handleTouchEnd, handleTouchMove]);

  // マトリックス用のタッチ操作イベントリスナー
  useEffect(() => {
    if (isMatrixTouching) {
      // ドラッグ中はbodyにno-scrollクラスを追加
      document.body.classList.add("no-scroll");

      // タッチ操作用のイベントリスナーを追加
      const handleMatrixTouchEnd = () => {
        setIsMatrixTouching(false);
        setMatrixDragState(null);
        document.body.classList.remove("no-scroll");
      };

      window.addEventListener("touchend", handleMatrixTouchEnd);

      // マトリクス用のタッチムーブハンドラを登録
      // passive: false を明示的に指定
      window.addEventListener("touchmove", handleMatrixTouchMove, {
        passive: false,
      });

      return () => {
        document.body.classList.remove("no-scroll");
        window.removeEventListener("touchend", handleMatrixTouchEnd);
        window.removeEventListener("touchmove", handleMatrixTouchMove);
      };
    }
  }, [isMatrixTouching, handleMatrixTouchMove]);

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

  // 曜日ごとの選択と時間帯を適用する関数
  const applyWeekdaySelections = useCallback(() => {
    // 更新する日程の選択状態を準備
    const newSelectedDates = { ...selectedDates };

    // 選択された曜日と時間帯のデータを処理
    Object.entries(weekdaySelections).forEach(([day, daySchedule]) => {
      if (!daySchedule.selected) return; // 選択されていない曜日はスキップ

      // 全イベント日程をループして、選択された曜日に該当する日程を更新
      eventDates.forEach((date) => {
        const dateObj = new Date(date.start_time);
        const weekday = ["日", "月", "火", "水", "木", "金", "土"][
          dateObj.getDay()
        ];

        if (weekday === day) {
          // この日程の時間帯ID
          const timeKey = getTimeKey(date.start_time, date.end_time);

          // 時間帯ごとの設定がある場合のみ適用する
          // 週入力の選択を優先（既存の選択を上書き）
          if (daySchedule.timeSlots[timeKey] !== undefined) {
            newSelectedDates[date.id] = daySchedule.timeSlots[timeKey];
          }
        }
      });
    });

    // 状態を更新
    setSelectedDates(newSelectedDates);
  }, [weekdaySelections, eventDates, selectedDates, getTimeKey]);

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
            {mode === "edit"
              ? `${initialParticipant?.name}さんの予定を編集`
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
            onSubmit={handleSubmit}
            className="space-y-4"
            onClick={(e) => {
              // フォームクリック時のバブリング処理
              // セルクリックとフォーム送信の競合を防ぐ
              const target = e.target as HTMLElement;
              // セル内クリックの場合は特別処理
              if (target.closest("[data-date-id]")) {
                // ここでは何もしない（セル側で処理）
              }
            }}
          >
            {/* イベント情報を隠しフィールドとして渡す */}
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="publicToken" value={publicToken} />

            <div
              className={
                isWeekdayModeActive ? "opacity-50 pointer-events-none" : ""
              }
            >
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
                disabled={isWeekdayModeActive}
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
                    className={`join bg-base-200 rounded-lg ${
                      isWeekdayModeActive
                        ? "opacity-50 pointer-events-none"
                        : ""
                    }`}
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
                      表
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

              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <div
                  className={`bg-info/10 p-2 text-xs text-info rounded-lg border border-info/20 flex items-center flex-grow ${
                    isWeekdayModeActive ? "opacity-50" : ""
                  }`}
                >
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
                      d="M13 16h-1v-4h-1m-1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <span>
                    {isWeekdayModeActive
                      ? "曜日入力モード中です。設定を適用またはキャンセルしてから回答を送信してください。"
                      : "セルをドラッグすると複数選択できます（タッチ操作も対応）"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // アコーディオンを開く/閉じる処理
                    setIsWeekdayModeActive(!isWeekdayModeActive);
                    // 週入力モードがアクティブになったときは時間帯スロットを初期化
                    if (!isWeekdayModeActive) {
                      initializeWeekdayTimeSlots();
                    }
                  }}
                  className={`btn btn-sm ${
                    isWeekdayModeActive ? "btn-primary" : "btn-accent"
                  } text-xs sm:text-sm font-medium flex-shrink-0`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  曜日ごとの時間帯設定
                  {isWeekdayModeActive ? "（閉じる）" : ""}
                </button>
              </div>

              {/* 週入力アコーディオンセクション */}
              {isWeekdayModeActive && (
                <div className="mb-6 animate-fadeIn transition-all duration-300">
                  <div className="bg-base-200 p-4 rounded-lg shadow-sm border border-base-300">
                    <h3 className="text-lg font-bold mb-4">
                      曜日ごとの時間帯設定
                    </h3>
                    <p className="text-sm mb-4">
                      曜日と時間帯で参加可能な枠を一括設定できます。表の各セルをクリックして、参加可能（○）または参加不可（×）を設定してください。
                    </p>

                    <div className="divider text-xs">曜日×時間帯表</div>

                    <div
                      className="mb-4 overflow-x-auto overflow-y-hidden matrix-container touch-none"
                      style={{ touchAction: "none" }}
                    >
                      <table
                        className="table table-xs border-collapse"
                        onMouseDown={(e) => e.preventDefault()} // ドラッグ動作中のテキスト選択を防止
                        onTouchStart={(e) => e.preventDefault()} // タッチ操作中のスクロールを完全に防止
                      >
                        <thead className="sticky top-0 z-20">
                          <tr className="bg-base-200">
                            <th className="px-2 py-1 text-center border border-base-300 sticky left-0 top-0 bg-base-200 z-30">
                              <span className="text-xs">\</span>
                            </th>
                            {Object.entries(weekdaySelections).map(([day]) => (
                              <th
                                key={day}
                                className="px-1 py-1 text-center border border-base-300"
                              >
                                {day}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Object.keys(
                            Object.values(weekdaySelections)[0]?.timeSlots || {}
                          ).length > 0 ? (
                            Object.keys(
                              Object.values(weekdaySelections)[0].timeSlots
                            )
                              .sort()
                              .map((timeSlot) => {
                                const [startTime] = timeSlot.split("-");
                                return (
                                  <tr key={timeSlot}>
                                    <td className="font-medium border border-base-300 whitespace-nowrap sticky left-0 bg-base-100 z-10">
                                      {startTime}
                                    </td>
                                    {Object.entries(weekdaySelections).map(
                                      ([day, daySchedule]) => (
                                        <td
                                          key={`${day}-${timeSlot}`}
                                          className="text-center border border-base-300 p-0 cursor-pointer"
                                          data-day={day}
                                          data-time-slot={timeSlot}
                                          onPointerDown={commonPointerDown}
                                          onPointerEnter={commonPointerEnter}
                                          onPointerUp={commonPointerUp}
                                        >
                                          <div
                                            className={`w-full h-7 flex items-center justify-center ${
                                              daySchedule.timeSlots[timeSlot]
                                                ? "bg-success text-success-content"
                                                : "bg-base-200"
                                            }`}
                                          >
                                            {daySchedule.timeSlots[timeSlot] ? (
                                              <div className="text-lg font-bold select-none inline-block">
                                                ○
                                              </div>
                                            ) : (
                                              <div className="text-lg font-bold opacity-70 select-none inline-block">
                                                ×
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                      )
                                    )}
                                  </tr>
                                );
                              })
                          ) : (
                            <tr>
                              <td
                                colSpan={
                                  1 + Object.keys(weekdaySelections).length
                                }
                                className="text-center py-4"
                              >
                                利用可能な時間帯がありません
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {Object.entries(weekdaySelections).filter(
                      ([, daySchedule]) => daySchedule.selected
                    ).length === 0 && (
                      <div className="text-center text-sm text-gray-500 py-4">
                        曜日を選択すると、時間帯の設定が表示されます
                      </div>
                    )}

                    <div className="text-xs text-base-content/70 mb-4">
                      ※選択した曜日の時間帯ごとに参加可否を設定できます。
                      <br />
                      チェックがついている時間帯が「参加可能」になります。
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => setIsWeekdayModeActive(false)}
                      >
                        キャンセル
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          // 選択した曜日と時間帯に基づいて日程を更新
                          applyWeekdaySelections();
                          setIsWeekdayModeActive(false);
                        }}
                      >
                        設定を適用する
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ページネーションUI - 週入力モードが無効の場合のみ表示 */}
              {!isWeekdayModeActive &&
                (viewMode === "heatmap" ||
                  viewMode === "table" ||
                  viewMode === "list") &&
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

              {/* 週入力モードがアクティブでない場合のみ、通常の入力フォームを表示 */}
              {!isWeekdayModeActive && (
                <>
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
                                handleMouseDown(
                                  date.id,
                                  !!selectedDates[date.id]
                                )
                              }
                              onMouseEnter={() => handleMouseEnter(date.id)}
                              onTouchStart={() =>
                                handleTouchStart(
                                  date.id,
                                  !!selectedDates[date.id]
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
                                  {formatTimeRange(
                                    date.start_time,
                                    date.end_time
                                  )}
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
                            <th className="w-32 border border-base-300">
                              日付
                            </th>
                            <th className="w-32 border border-base-300">
                              時間帯
                            </th>
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

                                const { className, status } = getCellStyle(
                                  date.id
                                );

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
                                        onTouchStart={() =>
                                          handleTouchStart(
                                            date.id,
                                            !!selectedDates[date.id]
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
                      className="overflow-x-auto select-none overscroll-contain table-container-mobile"
                      style={{
                        overscrollBehaviorY: "contain",
                        touchAction: isDragging ? "none" : "pan-x", // ドラッグ中はタッチ操作を無効化
                      }}
                      onMouseLeave={handleMouseLeave}
                    >
                      <table className="table table-xs sm:table-sm table-fixed w-full border-collapse">
                        <thead className="sticky top-0 z-20">
                          <tr className="bg-base-200">
                            <th className="w-12 sm:w-24 px-1 py-1 sm:px-2 sm:py-3 text-center border border-base-300 sticky left-0 top-0 bg-base-200 z-30">
                              <span className="text-xs sm:text-sm">時間</span>
                            </th>
                            {heatmapData.dates.map((date) => (
                              <th
                                key={date.dateKey}
                                className="px-1 py-1 sm:px-2 sm:py-3 text-center border border-base-300 heatmap-cell-mobile"
                              >
                                <span className="text-xs sm:text-sm whitespace-nowrap">
                                  {date.formattedDate.split("(")[0]}
                                  <br />
                                  <span className="text-xs text-gray-500">
                                    ({date.formattedDate.split("(")[1]}
                                  </span>
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {heatmapData.timeSlots.map(
                            (timeSlot, index, timeSlots) => {
                              // 時間が変わるときだけ表示するためのチェック
                              const [startTime] = timeSlot.split("-");
                              const showTime =
                                index === 0 ||
                                timeSlot.split("-")[0] !==
                                  timeSlots[index - 1].split("-")[0];

                              // 時間表示を省スペース化
                              const formattedStartTime = startTime.replace(
                                /^0/,
                                ""
                              );

                              return (
                                <tr key={timeSlot} className="hover">
                                  <td className="px-1 py-0 sm:px-2 sm:py-1 font-medium text-center whitespace-nowrap border border-base-300 bg-base-100 sticky left-0 z-10">
                                    {showTime ? (
                                      <span className="text-xs sm:text-sm">
                                        {formattedStartTime}
                                      </span>
                                    ) : (
                                      <span className="text-xs sm:text-sm text-gray-400">
                                        -
                                      </span>
                                    )}
                                  </td>
                                  {heatmapData.dates.map((date) => {
                                    const dateId =
                                      heatmapData.dateMap[date.dateKey]?.[
                                        timeSlot
                                      ];
                                    const { className, status } =
                                      getCellStyle(dateId);

                                    return (
                                      <td
                                        key={`${date.dateKey}-${timeSlot}`}
                                        className="p-0 text-center border border-base-300"
                                        data-date-id={dateId}
                                      >
                                        {dateId ? (
                                          <div
                                            className={`w-full h-5 sm:h-6 md:h-8 rounded-none sm:rounded-sm flex items-center justify-center cursor-pointer transition-colors duration-200 ease-in-out ${className} touch-manipulation`}
                                            data-date-id={dateId}
                                            onPointerDown={commonPointerDown}
                                            onPointerEnter={commonPointerEnter}
                                            onPointerUp={commonPointerUp}
                                          >
                                            {getCellContent(status)}
                                          </div>
                                        ) : (
                                          <div className="w-full h-5 sm:h-6 md:h-8 rounded-none sm:rounded-sm flex items-center justify-center bg-gray-100 text-gray-400">
                                            <span className="text-xs sm:text-sm">
                                              ー
                                            </span>
                                          </div>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            }
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 名前重複時の確認ダイアログ */}
            {showOverwriteConfirm && (
              <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
                <div className="bg-base-100 p-6 rounded-lg shadow-xl max-w-md w-full">
                  <h3 className="text-lg font-bold mb-4">
                    同じ名前の回答が既に存在します
                  </h3>
                  <p className="mb-6">
                    「{name}
                    」さんの回答は既に登録されています。上書きしてもよろしいですか？
                    <br />
                    （以前の回答は削除されます）
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowOverwriteConfirm(false)}
                      className="btn btn-outline"
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setShowOverwriteConfirm(false);
                        if (pendingFormData) {
                          setIsSubmitting(true);
                          await handleFormAction(pendingFormData);
                          setPendingFormData(null);
                        }
                      }}
                      className="btn btn-primary"
                    >
                      上書きする
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div
              className={`pt-4 flex flex-wrap gap-2 ${
                isWeekdayModeActive ? "opacity-50" : ""
              }`}
            >
              <TermsCheckbox
                isChecked={termsAccepted}
                onChange={setTermsAccepted}
                id="availability-form-terms"
                disabled={isWeekdayModeActive}
              />

              <button
                type="submit"
                className={`btn btn-primary w-full md:w-auto ${
                  isSubmitting || isWeekdayModeActive || isCheckingName
                    ? "opacity-70"
                    : ""
                }`}
                disabled={isSubmitting || isWeekdayModeActive || isCheckingName}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm mr-2"></span>
                    {isEditing ? "保存中..." : "送信中..."}
                  </>
                ) : isCheckingName ? (
                  <>
                    <span className="loading loading-spinner loading-sm mr-2"></span>
                    名前を確認中...
                  </>
                ) : isWeekdayModeActive ? (
                  "曜日ごとの設定を完了してください"
                ) : mode === "edit" ? (
                  "回答を更新する"
                ) : (
                  "回答を送信"
                )}
              </button>

              {/* キャンセルボタン - 入力ページに戻る */}
              <a
                href={
                  isSubmitting || isWeekdayModeActive
                    ? "#"
                    : `/event/${publicToken}`
                }
                className={`btn btn-outline w-full md:w-auto ${
                  isSubmitting || isWeekdayModeActive
                    ? "opacity-60 pointer-events-none"
                    : ""
                }`}
                onClick={(e) =>
                  (isSubmitting || isWeekdayModeActive) && e.preventDefault()
                }
              >
                キャンセル
              </a>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
