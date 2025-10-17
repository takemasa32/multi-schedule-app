"use client";

import {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
  useId,
} from "react";
import { Tooltip, TooltipState } from "./tooltip";
import ListView from "./list-view";
import HeatmapView from "./heatmap-view";
import DetailedView from "./detailed-view";
import { formatDate, formatTime, getDateString } from "./date-utils";
import useDragScrollBlocker from "../../hooks/useDragScrollBlocker";
import { useDeviceDetect } from "../../hooks/useDeviceDetect";
import MobileInfoPanel from "./mobile-info-panel";
import type { Participant } from "@/types/participant";
import {
  calcTooltipPosition,
  buildDateTimeLabel,
  fetchParticipantsByDate,
} from "../../lib/tooltip-utils";

type EventDate = {
  id: string;
  start_time: string;
  end_time: string;
  label?: string;
};

type Availability = {
  participant_id: string;
  event_date_id: string;
  availability: boolean;
};

type HeatmapCell = {
  dateId: string;
  availableCount: number;
  unavailableCount: number;
  heatmapLevel: number;
  isSelected: boolean;
  totalResponses: number;
  slotKey: string;
};

type AvailabilitySummaryProps = {
  eventDates: EventDate[];
  participants: Participant[];
  availabilities: Availability[];
  finalizedDateIds?: string[];
  onShowParticipantForm?: (
    participantId: string,
    participantName: string,
    participantAvailabilities: Record<string, boolean>
  ) => void;
  publicToken?: string;
  excludedParticipantIds?: string[];
  testIdPrefix?: string;
  /**
   * セルをカラー表示するための最小参加人数
   * 1を指定すると従来通り全てのセルがカラー表示されます
   */
  minColoredCount?: number;
};

// type ViewMode = "list" | "heatmap" | "detailed";

/**
 * イベントの参加可能状況を表示するコンポーネント
 */
export default function AvailabilitySummary({
  eventDates,
  participants,
  availabilities,
  finalizedDateIds = [],
  onShowParticipantForm,
  publicToken,
  excludedParticipantIds = [],
  testIdPrefix,
  minColoredCount = 1,
}: AvailabilitySummaryProps) {
  // viewModeは内部でuseState管理
  const [viewMode, setViewMode] = useState<"list" | "heatmap" | "detailed">(
    "heatmap"
  );
  // 色付けの最小人数を保持
  const [minColored, setMinColored] = useState<number>(minColoredCount);
  // useDeviceDetectは必ずトップレベルで呼び出す
  const { isMobile } = useDeviceDetect();
  // ツールチップの状態
  const [tooltip, setTooltip] = useState<TooltipState>({
    show: false,
    x: 0,
    y: 0,
    dateId: null,
    availableParticipants: [],
    unavailableParticipants: [],
  });

  // 除外されていない参加者リストを作成
  const filteredParticipants = useMemo(
    () => participants.filter((p) => !excludedParticipantIds.includes(p.id)),
    [participants, excludedParticipantIds]
  );
  // 除外されていない参加者のみでavailabilitiesもフィルタ
  const filteredAvailabilities = useMemo(
    () =>
      availabilities.filter(
        (a) => !excludedParticipantIds.includes(a.participant_id)
      ),
    [availabilities, excludedParticipantIds]
  );

  // スクロール中かどうかを追跡するstate
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const touchMoveCountRef = useRef<number>(0);

  // スクロール検出用のイベントハンドラ
  const handleScroll = useCallback(() => {
    // スクロール中はツールチップを非表示
    if (tooltip.show) {
      setTooltip((prev) => ({ ...prev, show: false }));
    }

    // スクロール中フラグを立てる
    setIsScrolling(true);

    // 既存のタイマーがあればクリア
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }

    // スクロール停止から少し待ってからフラグを戻す
    scrollTimerRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 200); // 200msの待機時間
  }, [tooltip.show]);

  // コンテナref追加 - ツールチップ外部クリック判定用
  const containerRef = useRef<HTMLDivElement>(null);

  // ツールチップ表示のためのポータル用参照
  const tooltipPortalRef = useRef<HTMLDivElement | null>(null);
  const internalId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const tabTestIdBase = useMemo(() => {
    if (testIdPrefix) {
      return `${testIdPrefix}-availability-tab`;
    }
    return `availability-tab-${internalId}`;
  }, [testIdPrefix, internalId]);
  const buildTabTestId = useCallback(
    (key: "heatmap" | "detailed" | "list") => `${tabTestIdBase}-${key}`,
    [tabTestIdBase]
  );

  // コンポーネントマウント時にポータル要素を作成
  useMemo(() => {
    if (typeof document !== "undefined") {
      const portalElement =
        document.getElementById("tooltip-portal") ||
        document.createElement("div");
      if (!document.getElementById("tooltip-portal")) {
        portalElement.id = "tooltip-portal";
        document.body.appendChild(portalElement);
      }
      tooltipPortalRef.current = portalElement as HTMLDivElement;
    }
    return null;
  }, []);

  // 日付をまとめる (重複を排除)
  const uniqueDates = useMemo(() => {
    const dateMap = new Map<string, { date: string; dateObj: Date }>();

    eventDates.forEach((date) => {
      const dateKey = getDateString(date.start_time);
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: dateKey,
          dateObj: new Date(date.start_time),
        });
      }
    });

    return Array.from(dateMap.values()).sort(
      (a, b) => a.dateObj.getTime() - b.dateObj.getTime()
    );
  }, [eventDates]);

  // 時間帯をまとめる (重複を排除)
  const uniqueTimeSlots = useMemo(() => {
    const timeMap = new Map<
      string,
      {
        slotKey: string;
        startTime: string;
        endTime: string;
        timeObj: Date;
        labels: Set<string>;
      }
    >();

    eventDates.forEach((date) => {
      const startTimeObj = new Date(date.start_time);
      const endTimeObj = new Date(date.end_time);

      const startTimeKey = `${startTimeObj
        .getHours()
        .toString()
        .padStart(2, "0")}:${startTimeObj
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

      let endTimeKey: string;
      if (endTimeObj.getHours() === 0 && endTimeObj.getMinutes() === 0) {
        const startDate = new Date(startTimeObj);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(endTimeObj);
        endDate.setHours(0, 0, 0, 0);

        if (endDate.getTime() - startDate.getTime() === 24 * 60 * 60 * 1000) {
          endTimeKey = "24:00";
        } else {
          endTimeKey = `${endTimeObj
            .getHours()
            .toString()
            .padStart(2, "0")}:${endTimeObj
            .getMinutes()
            .toString()
            .padStart(2, "0")}`;
        }
      } else {
        endTimeKey = `${endTimeObj
          .getHours()
          .toString()
          .padStart(2, "0")}:${endTimeObj
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;
      }

      const slotKey = `${startTimeKey}-${endTimeKey}`;
      if (!timeMap.has(slotKey)) {
        timeMap.set(slotKey, {
          slotKey,
          startTime: startTimeKey,
          endTime: endTimeKey,
          timeObj: startTimeObj,
          labels: new Set<string>(),
        });
      }

      if (date.label) {
        timeMap.get(slotKey)?.labels.add(date.label);
      }
    });

    return Array.from(timeMap.values())
      .map((item) => ({
        slotKey: item.slotKey,
        startTime: item.startTime,
        endTime: item.endTime,
        timeObj: item.timeObj,
        labels: Array.from(item.labels),
      }))
      .sort((a, b) => {
        const aMinutes = a.timeObj.getHours() * 60 + a.timeObj.getMinutes();
        const bMinutes = b.timeObj.getHours() * 60 + b.timeObj.getMinutes();
        if (aMinutes !== bMinutes) {
          return aMinutes - bMinutes;
        }
        // 同じ開始時刻の場合は終了時刻の早い順
        const aEnd = parseInt(a.endTime.replace(":", ""), 10);
        const bEnd = parseInt(b.endTime.replace(":", ""), 10);
        return aEnd - bEnd;
      });
  }, [eventDates]);

  // 集計計算: 日程ごとの参加可能者数
  const summary = useMemo(() => {
    return eventDates.map((date) => {
      const availableCount = filteredAvailabilities.filter(
        (a) => a.event_date_id === date.id && a.availability
      ).length;
      const unavailableCount = filteredAvailabilities.filter(
        (a) => a.event_date_id === date.id && !a.availability
      ).length;

      // ヒートマップの色の強さを計算
      const totalResponses = availableCount + unavailableCount;

      // 少人数でもより明確な差が出るように計算方法を変更
      let heatmapLevel = 0;
      if (totalResponses > 0) {
        // 参加可能な人数に基づいてレベルを計算（単純な割合でなく）
        if (availableCount > 0) {
          // 参加可能な人がいる場合、最低でも色がつくようにする
          const rate = availableCount / Math.max(1, totalResponses);
          // 2人だとしても、1人と2人で明確な差をつける
          heatmapLevel = Math.max(2, Math.floor(rate * 10) + 1);
        }
      }

      return {
        dateId: date.id,
        startTime: date.start_time,
        endTime: date.end_time,
        label: date.label,
        availableCount,
        unavailableCount,
        heatmapLevel,
        availabilityRate:
          totalResponses > 0 ? availableCount / totalResponses : 0,
        formattedDate: formatDate(date.start_time),
        formattedTime: `${formatTime(
          date.start_time,
          eventDates
        )}〜${formatTime(date.end_time, eventDates)}`,
        isSelected: finalizedDateIds?.includes(date.id) || false,
      };
    });
  }, [eventDates, filteredAvailabilities, finalizedDateIds]);

  // 参加者が参加可能かどうかを判定
  const isParticipantAvailable = useCallback(
    (participantId: string, dateId: string) => {
      const availability = filteredAvailabilities.find(
        (a) => a.participant_id === participantId && a.event_date_id === dateId
      );
      return availability ? availability.availability : null;
    },
    [filteredAvailabilities]
  );

  // ツールチップ表示処理（Pointerイベント）
  const handlePointerEnter = (
    event: React.PointerEvent<Element>,
    dateId: string
  ) => {
    const { availableParticipants, unavailableParticipants } =
      fetchParticipantsByDate(
        filteredParticipants,
        filteredAvailabilities,
        dateId
      );
    const { dateLabel, timeLabel } = buildDateTimeLabel(eventDates, dateId);
    const { x, y } = calcTooltipPosition(event.clientX, event.clientY);
    setTooltip({
      show: true,
      x,
      y,
      dateId,
      availableParticipants,
      unavailableParticipants,
      dateLabel,
      timeLabel,
      lastEvent: `pointerenter:${event.pointerType}`,
      lastUpdate: Date.now(),
    });
  };

  /**
   * ツールチップ/モバイルパネル表示処理（Pointerイベント）
   */
  const handlePointerClick = (
    event: React.PointerEvent<Element>,
    dateId: string
  ) => {
    event.stopPropagation();
    if (event.nativeEvent) {
      event.nativeEvent.stopImmediatePropagation();
    }
    const { availableParticipants, unavailableParticipants } =
      fetchParticipantsByDate(
        filteredParticipants,
        filteredAvailabilities,
        dateId
      );
    const { dateLabel, timeLabel } = buildDateTimeLabel(eventDates, dateId);
    if (isMobile) {
      // モバイルは下部パネルで表示
      if (tooltip.show && tooltip.dateId === dateId) {
        setTooltip((prev) => ({ ...prev, show: false }));
      } else {
        setTooltip({
          show: true,
          x: 0,
          y: 0,
          dateId,
          availableParticipants,
          unavailableParticipants,
          dateLabel,
          timeLabel,
          lastEvent: "mobile-tap",
          lastUpdate: Date.now(),
        });
      }
      return;
    }
    // ...既存のPC用ツールチップ表示ロジック...
    if (tooltip.show && tooltip.dateId === dateId) {
      setTooltip((prev) => ({
        ...prev,
        show: false,
        lastEvent: "close",
        lastUpdate: Date.now(),
      }));
      return;
    }
    const { x, y } = calcTooltipPosition(event.clientX, event.clientY);
    setTooltip({
      show: true,
      x,
      y,
      dateId,
      availableParticipants,
      unavailableParticipants,
      dateLabel,
      timeLabel,
      lastEvent: `pointerup:${event.pointerType}`,
      lastUpdate: Date.now(),
      lastPointerType: event.pointerType as "touch" | "mouse" | "pen",
    });
  };

  const handlePointerEnd = (event: React.PointerEvent<Element>) => {
    setTooltip((prev) => ({
      ...prev,
      show: false,
      lastEvent: `pointerleave:${event.pointerType}`,
      lastUpdate: Date.now(),
    }));
  };

  // タッチ開始位置を記録
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches && e.touches[0]) {
      touchStartPosRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      touchMoveCountRef.current = 0;
    }
  }, []);

  // タッチ移動でスクロール検出
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!touchStartPosRef.current || !e.touches || !e.touches[0]) return;

      const moveX = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
      const moveY = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);

      // 少しでも動いたらカウント
      if (moveX > 5 || moveY > 5) {
        touchMoveCountRef.current += 1;

        // 一定以上の移動が検出されたらスクロール中と判断
        if (touchMoveCountRef.current > 3 && !isScrolling) {
          handleScroll();
        }
      }
    },
    [handleScroll, isScrolling]
  );

  // 最大参加可能者数を算出（セルごとの availableCount の最大値）
  const maxAvailable = useMemo(() => {
    return eventDates.reduce((max, date) => {
      const cnt = filteredAvailabilities.filter(
        (a) => a.event_date_id === date.id && a.availability
      ).length;
      return Math.max(max, cnt);
    }, 0);
  }, [eventDates, filteredAvailabilities]);

  // ヒートマップデータの取得 - 日付×時間のマトリックス
  const heatmapData = useMemo(() => {
    // 各日付×時間帯のセルデータを格納するマップ
    const cellMap = new Map<string, HeatmapCell>();

    // イベント日程をマップに変換
    eventDates.forEach((date) => {
      const startDate = new Date(date.start_time);
      const dateStr = getDateString(date.start_time);
      // 時間部分をキーに使用
      const startTimeStr = `${startDate
        .getHours()
        .toString()
        .padStart(2, "0")}:${startDate
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
      let endTimeStr: string;
      const endDateObj = new Date(date.end_time);
      if (endDateObj.getHours() === 0 && endDateObj.getMinutes() === 0) {
        const startDay = new Date(startDate);
        startDay.setHours(0, 0, 0, 0);
        const endDay = new Date(endDateObj);
        endDay.setHours(0, 0, 0, 0);
        if (endDay.getTime() - startDay.getTime() === 24 * 60 * 60 * 1000) {
          endTimeStr = "24:00";
        } else {
          endTimeStr = `${endDateObj
            .getHours()
            .toString()
            .padStart(2, "0")}:${endDateObj
            .getMinutes()
            .toString()
            .padStart(2, "0")}`;
        }
      } else {
        endTimeStr = `${endDateObj
          .getHours()
          .toString()
          .padStart(2, "0")}:${endDateObj
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;
      }

      const slotKey = `${startTimeStr}-${endTimeStr}`;
      const key = `${dateStr}_${slotKey}`;

      const availableCount = filteredAvailabilities.filter(
        (a) => a.event_date_id === date.id && a.availability
      ).length;
      const unavailableCount = filteredAvailabilities.filter(
        (a) => a.event_date_id === date.id && !a.availability
      ).length;

      const totalResponses = availableCount + unavailableCount;
      const availabilityRate =
        totalResponses > 0 ? availableCount / totalResponses : 0;
      const heatmapLevel = Math.round(availabilityRate * 10);

      cellMap.set(key, {
        dateId: date.id,
        availableCount,
        unavailableCount,
        heatmapLevel,
        isSelected: finalizedDateIds?.includes(date.id) || false,
        totalResponses,
        slotKey,
      });
    });

    return cellMap;
  }, [eventDates, filteredAvailabilities, finalizedDateIds]);

  // 参加者の回答データを取得して編集用に整形する
  const getParticipantAvailabilities = useCallback(
    (participantId: string) => {
      const result: Record<string, boolean> = {};

      eventDates.forEach((date) => {
        // 該当する参加者の回答を検索
        const response = filteredAvailabilities.find(
          (a) =>
            a.participant_id === participantId && a.event_date_id === date.id
        );

        // 回答が見つかれば、その値を使用。なければデフォルトでfalse
        result[date.id] = response ? response.availability : false;
      });

      return result;
    },
    [eventDates, filteredAvailabilities]
  );

  // 参加者の編集ボタンがクリックされたときの処理
  const handleEditClick = (participantId: string, participantName: string) => {
    if (onShowParticipantForm) {
      const participantAvailabilities =
        getParticipantAvailabilities(participantId);
      onShowParticipantForm(
        participantId,
        participantName,
        participantAvailabilities
      );
    }
  };

  // ツールチップが直前に開かれたかを追跡するref
  const justOpenedTooltipRef = useRef<boolean>(false);

  // ドキュメント全体のクリックとスクロールイベントを監視してツールチップを閉じる
  const closeTooltipOnOutsideClick = useCallback(
    (e: Event) => {
      // ツールチップ表示中のみ処理
      if (!tooltip.show) return;

      // タッチ直後のtouchendは無視
      if (e.type === "touchend" && justOpenedTooltipRef.current) {
        return;
      }

      // 可用性サマリーコンテナ内のクリックは無視
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setTooltip((prev) => ({ ...prev, show: false }));
      }
    },
    [tooltip.show]
  );

  // マウント時にグローバルイベントリスナーを追加
  useEffect(() => {
    // PCとタッチデバイス両方に対応
    document.addEventListener("click", closeTooltipOnOutsideClick);
    document.addEventListener("touchend", closeTooltipOnOutsideClick);
    // スクロール時にもツールチップを閉じる
    window.addEventListener("scroll", handleScroll, { passive: true });
    // タッチイベント検出
    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });

    // クリーンアップ関数
    return () => {
      document.removeEventListener("click", closeTooltipOnOutsideClick);
      document.removeEventListener("touchend", closeTooltipOnOutsideClick);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, [
    closeTooltipOnOutsideClick,
    handleScroll,
    handleTouchStart,
    handleTouchMove,
  ]);

  // Tooltip自動非表示（スマホタップ時）
  useEffect(() => {
    const handler = () => setTooltip((prev) => ({ ...prev, show: false }));
    window.addEventListener("tooltip:autohide", handler);
    return () => window.removeEventListener("tooltip:autohide", handler);
  }, []);

  // ドラッグ・スクロール判定
  const isDragging = useDragScrollBlocker(10);

  return (
    <div
      className="mb-8 bg-base-100 border rounded-lg shadow-sm transition-all availability-summary"
      ref={containerRef}
      onScroll={handleScroll}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="p-2 sm:p-4">
        <h2 className="text-xl font-bold mb-2 sm:mb-4">みんなの回答状況</h2>

        {/* 表示切り替えタブ */}
        <div className="tabs space-x-4 tabs-boxed mb-2 sm:mb-4 bg-base-300 p-1 rounded-lg">
          <a
            className={`tab  transition-all ${
              viewMode === "heatmap"
                ? "tab-active bg-primary text-primary-content font-medium px-2"
                : "text-base-content"
            }`}
            data-testid={buildTabTestId("heatmap")}
            onClick={() => setViewMode("heatmap")}
          >
            ヒートマップ
          </a>
          <a
            className={`tab transition-all ${
              viewMode === "detailed"
                ? "tab-active bg-primary text-primary-content font-medium px-2"
                : "text-base-content"
            }`}
            data-testid={buildTabTestId("detailed")}
            onClick={() => setViewMode("detailed")}
          >
            個別
          </a>
          <a
            className={`tab transition-all ${
              viewMode === "list"
                ? "tab-active bg-primary text-primary-content font-medium px-2"
                : "text-base-content"
            }`}
            data-testid={buildTabTestId("list")}
            onClick={() => setViewMode("list")}
          >
            リスト
          </a>
        </div>

        {/* リスト表示モード */}
        {viewMode === "list" && (
          <ListView summary={summary} eventDates={eventDates} />
        )}

        {/* ヒートマップ表示モード */}
        {viewMode === "heatmap" && (
          <HeatmapView
            uniqueDates={uniqueDates}
            uniqueTimeSlots={uniqueTimeSlots}
            heatmapData={heatmapData}
            maxAvailable={maxAvailable}
            onPointerTooltipStart={isMobile ? () => {} : handlePointerEnter}
            onPointerTooltipEnd={isMobile ? () => {} : handlePointerEnd}
            onPointerTooltipClick={handlePointerClick}
            isDragging={isDragging}
            minColoredCount={minColored}
            onMinColoredCountChange={setMinColored}
          />
        )}

        {/* 詳細表示モード（個人ごとの回答詳細） */}
        {viewMode === "detailed" && (
          <DetailedView
            eventDates={eventDates}
            participants={filteredParticipants}
            isParticipantAvailable={isParticipantAvailable}
            finalizedDateIds={finalizedDateIds}
            onEditClick={onShowParticipantForm ? handleEditClick : undefined}
            publicToken={publicToken}
          />
        )}
      </div>
      {/* PCのみツールチップ */}
      {!isMobile && (
        <Tooltip tooltip={tooltip} portalElement={tooltipPortalRef.current} />
      )}
      {/* モバイルのみ下部パネル */}
      {isMobile && (
        <MobileInfoPanel
          show={tooltip.show}
          dateLabel={tooltip.dateLabel}
          timeLabel={tooltip.timeLabel}
          availableParticipants={tooltip.availableParticipants || []}
          unavailableParticipants={tooltip.unavailableParticipants || []}
          onClose={() => setTooltip((prev) => ({ ...prev, show: false }))}
        />
      )}
    </div>
  );
}
