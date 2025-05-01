"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { isTouchDevice } from "./date-utils";
import { Tooltip, TooltipState, isTouchEvent } from "./tooltip";
import ListView from "./list-view";
import HeatmapView from "./heatmap-view";
import DetailedView from "./detailed-view";
import { formatDate, formatTime, getDateString } from "./date-utils";

type EventDate = {
  id: string;
  start_time: string;
  end_time: string;
  label?: string;
};

type Participant = { id: string; name: string };

type Availability = {
  participant_id: string;
  event_date_id: string;
  availability: boolean;
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
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  publicToken?: string;
};

type ViewMode = "list" | "heatmap" | "detailed";

/**
 * イベントの参加可能状況を表示するコンポーネント
 */
export default function AvailabilitySummary({
  eventDates,
  participants,
  availabilities,
  finalizedDateIds = [],
  onShowParticipantForm,
  viewMode,
  setViewMode,
  publicToken,
}: AvailabilitySummaryProps) {
  // ツールチップの状態
  const [tooltip, setTooltip] = useState<TooltipState>({
    show: false,
    x: 0,
    y: 0,
    dateId: null,
    availableParticipants: [],
    unavailableParticipants: [],
  });

  // コンテナref追加 - ツールチップ外部クリック判定用
  const containerRef = useRef<HTMLDivElement>(null);

  // ツールチップ表示のためのポータル用参照
  const tooltipPortalRef = useRef<HTMLDivElement | null>(null);

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
    const dateMap = new Map();

    eventDates.forEach((date) => {
      const dateKey = getDateString(date.start_time);
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: dateKey,
          dayOfWeek: date.start_time,
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
    const timeMap = new Map();

    eventDates.forEach((date) => {
      const startTimeObj = new Date(date.start_time);
      // 開始時刻をキーとして使用
      const timeKey = `${startTimeObj
        .getHours()
        .toString()
        .padStart(2, "0")}:${startTimeObj
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;

      if (!timeMap.has(timeKey)) {
        const endTimeObj = new Date(date.end_time);
        // 終了時刻のフォーマット
        let endTimeKey;

        // 00:00の場合は24:00として表示するかどうかを判断
        if (endTimeObj.getHours() === 0 && endTimeObj.getMinutes() === 0) {
          // 開始日と終了日を比較
          const startDate = new Date(startTimeObj);
          startDate.setHours(0, 0, 0, 0);

          const endDate = new Date(endTimeObj);
          endDate.setHours(0, 0, 0, 0);

          // 終了日が開始日の翌日である場合は24:00と表示
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

        timeMap.set(timeKey, {
          startTime: timeKey,
          endTime: endTimeKey,
          label: date.label || "",
          timeObj: startTimeObj,
        });
      }
    });

    return Array.from(timeMap.values()).sort(
      (a, b) =>
        a.timeObj.getHours() * 60 +
        a.timeObj.getMinutes() -
        (b.timeObj.getHours() * 60 + b.timeObj.getMinutes())
    );
  }, [eventDates]);

  // 集計計算: 日程ごとの参加可能者数
  const summary = useMemo(() => {
    return eventDates.map((date) => {
      const availableCount = availabilities.filter(
        (a) => a.event_date_id === date.id && a.availability
      ).length;
      const unavailableCount = availabilities.filter(
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
  }, [eventDates, availabilities, finalizedDateIds]);

  // 参加者が参加可能かどうかを判定
  const isParticipantAvailable = useCallback(
    (participantId: string, dateId: string) => {
      const availability = availabilities.find(
        (a) => a.participant_id === participantId && a.event_date_id === dateId
      );
      return availability ? availability.availability : null;
    },
    [availabilities]
  );

  // 特定の日程に対して参加可能な参加者と不可能な参加者のリストを取得する関数
  const getParticipantsByDateId = useCallback(
    (dateId: string) => {
      const availableParticipants: string[] = [];
      const unavailableParticipants: string[] = [];

      participants.forEach((participant) => {
        const isAvailable = isParticipantAvailable(participant.id, dateId);
        if (isAvailable === true) {
          availableParticipants.push(participant.name);
        } else if (isAvailable === false) {
          unavailableParticipants.push(participant.name);
        }
      });

      return { availableParticipants, unavailableParticipants };
    },
    [participants, isParticipantAvailable]
  );

  // ツールチップ表示処理
  const handleMouseEnter = (event: React.MouseEvent, dateId: string) => {
    if (isTouchDevice()) return; // タッチデバイスではホバーイベントをスキップ

    const { availableParticipants, unavailableParticipants } =
      getParticipantsByDateId(dateId);

    // 日付・時間ラベルを取得
    const eventDate = eventDates.find((d) => d.id === dateId);
    const dateLabel = eventDate ? formatDate(eventDate.start_time) : "";
    const timeLabel = eventDate
      ? `${formatTime(eventDate.start_time, eventDates)}〜${formatTime(
          eventDate.end_time,
          eventDates
        )}`
      : "";

    // マウス位置を取得 - ウィンドウサイズに基づいて調整
    const x = Math.min(event.clientX, window.innerWidth - 320);
    const y = Math.min(event.clientY, window.innerHeight - 200);

    setTooltip({
      show: true,
      x,
      y,
      dateId,
      availableParticipants,
      unavailableParticipants,
      dateLabel,
      timeLabel,
    });
  };

  // ツールチップを直近で開いたかどうかのフラグ
  const justOpenedTooltipRef = useRef(false);

  // ツールチップ表示処理（タッチ/クリック）
  const handleClick = (
    event: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>,
    dateId: string
  ) => {
    event.stopPropagation(); // バブリングを防止
    if (event.nativeEvent) {
      event.nativeEvent.stopImmediatePropagation(); // ネイティブ伝播も止める
    }

    // タッチイベントの場合はデフォルト動作を防止
    if (isTouchEvent(event)) {
      event.preventDefault();
    }

    // すでに同じ日程のツールチップが表示されている場合は閉じる
    if (tooltip.show && tooltip.dateId === dateId) {
      setTooltip((prev) => ({ ...prev, show: false }));
      return;
    }

    const { availableParticipants, unavailableParticipants } =
      getParticipantsByDateId(dateId);

    // 日付・時間ラベルを取得
    const eventDate = eventDates.find((d) => d.id === dateId);
    const dateLabel = eventDate ? formatDate(eventDate.start_time) : "";
    const timeLabel = eventDate
      ? `${formatTime(eventDate.start_time, eventDates)}〜${formatTime(
          eventDate.end_time,
          eventDates
        )}`
      : "";

    // タッチ/クリック位置を取得
    let x: number, y: number;
    if (isTouchEvent(event)) {
      // タッチイベントの場合
      const touch = event.touches?.[0] || event.changedTouches?.[0];
      if (touch) {
        x = Math.min(touch.clientX, window.innerWidth - 320);
        y = Math.min(touch.clientY, window.innerHeight - 200);
      } else {
        // タッチが取得できない場合はデフォルト位置
        x = window.innerWidth / 2 - 150;
        y = window.innerHeight / 2 - 100;
      }
      justOpenedTooltipRef.current = true; // タッチで開いた直後はtrue
      setTimeout(() => {
        justOpenedTooltipRef.current = false;
      }, 350); // 350ms後に解除
    } else {
      // マウスイベントの場合
      x = Math.min(event.clientX, window.innerWidth - 320);
      y = Math.min(event.clientY, window.innerHeight - 200);
    }

    setTooltip({
      show: true,
      x,
      y,
      dateId,
      availableParticipants,
      unavailableParticipants,
      dateLabel,
      timeLabel,
    });
  };

  // ツールチップ非表示処理
  const handleMouseLeave = () => {
    if (isTouchDevice()) return; // タッチデバイスではホバーイベントをスキップ
    setTooltip((prev) => ({ ...prev, show: false }));
  };

  // 最大参加可能者数を算出（セルごとの availableCount の最大値）
  const maxAvailable = useMemo(() => {
    return eventDates.reduce((max, date) => {
      const cnt = availabilities.filter(
        (a) => a.event_date_id === date.id && a.availability
      ).length;
      return Math.max(max, cnt);
    }, 0);
  }, [eventDates, availabilities]);

  // ヒートマップデータの取得 - 日付×時間のマトリックス
  const heatmapData = useMemo(() => {
    // 各日付×時間帯のセルデータを格納するマップ
    const cellMap = new Map();

    // イベント日程をマップに変換
    eventDates.forEach((date) => {
      const startDate = new Date(date.start_time);
      const dateStr = getDateString(date.start_time);
      // 時間部分をキーに使用
      const timeStr = `${startDate
        .getHours()
        .toString()
        .padStart(2, "0")}:${startDate
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
      const key = `${dateStr}_${timeStr}`;

      const availableCount = availabilities.filter(
        (a) => a.event_date_id === date.id && a.availability
      ).length;
      const unavailableCount = availabilities.filter(
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
      });
    });

    return cellMap;
  }, [eventDates, availabilities, finalizedDateIds]);

  // 参加者の回答データを取得して編集用に整形する
  const getParticipantAvailabilities = useCallback(
    (participantId: string) => {
      const result: Record<string, boolean> = {};

      eventDates.forEach((date) => {
        // 該当する参加者の回答を検索
        const response = availabilities.find(
          (a) =>
            a.participant_id === participantId && a.event_date_id === date.id
        );

        // 回答が見つかれば、その値を使用。なければデフォルトでfalse
        result[date.id] = response ? response.availability : false;
      });

      return result;
    },
    [eventDates, availabilities]
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
    window.addEventListener("scroll", closeTooltipOnOutsideClick);

    // クリーンアップ関数
    return () => {
      document.removeEventListener("click", closeTooltipOnOutsideClick);
      document.removeEventListener("touchend", closeTooltipOnOutsideClick);
      window.removeEventListener("scroll", closeTooltipOnOutsideClick);
    };
  }, [closeTooltipOnOutsideClick]);

  // 参加者がまだいない場合は表示しない
  if (participants.length === 0) {
    return null;
  }

  return (
    <div
      className="mb-8 bg-base-100 border rounded-lg shadow-sm transition-all availability-summary"
      ref={containerRef}
    >
      <div className="p-2 sm:p-4">
        <h2 className="text-xl font-bold mb-2 sm:mb-4">みんなの回答状況</h2>

        {/* 表示切り替えタブ */}
        <div className="tabs tabs-boxed mb-2 sm:mb-4 bg-base-300 p-1 rounded-lg">
          <a
            className={`tab transition-all ${
              viewMode === "heatmap"
                ? "tab-active bg-primary text-primary-content font-medium"
                : "text-base-content"
            }`}
            onClick={() => setViewMode("heatmap")}
          >
            ヒートマップ表示
          </a>
          <a
            className={`tab transition-all ${
              viewMode === "detailed"
                ? "tab-active bg-primary text-primary-content font-medium"
                : "text-base-content"
            }`}
            onClick={() => setViewMode("detailed")}
          >
            個別表示
          </a>
          <a
            className={`tab transition-all ${
              viewMode === "list"
                ? "tab-active bg-primary text-primary-content font-medium"
                : "text-base-content"
            }`}
            onClick={() => setViewMode("list")}
          >
            リスト表示
          </a>
        </div>

        {/* リスト表示モード */}
        {viewMode === "list" && (
          <ListView
            summary={summary}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            eventDates={eventDates}
          />
        )}

        {/* ヒートマップ表示モード */}
        {viewMode === "heatmap" && (
          <HeatmapView
            uniqueDates={uniqueDates}
            uniqueTimeSlots={uniqueTimeSlots}
            heatmapData={heatmapData}
            maxAvailable={maxAvailable}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
          />
        )}

        {/* 詳細表示モード（個人ごとの回答詳細） */}
        {viewMode === "detailed" && (
          <DetailedView
            eventDates={eventDates}
            participants={participants}
            isParticipantAvailable={isParticipantAvailable}
            finalizedDateIds={finalizedDateIds}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            onEditClick={onShowParticipantForm ? handleEditClick : undefined}
            publicToken={publicToken}
          />
        )}
      </div>
      {/* ツールチップコンポーネントをレンダリング */}
      <Tooltip tooltip={tooltip} portalElement={tooltipPortalRef.current} />
    </div>
  );
}
