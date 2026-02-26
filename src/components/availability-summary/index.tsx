'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Tooltip, TooltipState } from './tooltip';
import HeatmapView from './heatmap-view';
import { getDateString } from './date-utils';
import useDragScrollBlocker from '../../hooks/useDragScrollBlocker';
import { useDeviceDetect } from '../../hooks/useDeviceDetect';
import MobileInfoPanel from './mobile-info-panel';
import type { Participant } from '@/types/participant';
import {
  calcTooltipPosition,
  buildDateTimeLabel,
  buildParticipantsByDateIndex,
} from '../../lib/tooltip-utils';

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
    participantAvailabilities: Record<string, boolean>,
  ) => void;
  publicToken?: string;
  excludedParticipantIds?: string[];
  testIdPrefix?: string;
  /**
   * セルをカラー表示するための最小参加人数
   * 1を指定すると従来通り全てのセルがカラー表示されます
   */
  minColoredCount?: number;
  myParticipantId?: string | null;
};

/**
 * イベントの参加可能状況を表示するコンポーネント
 */
export default function AvailabilitySummary({
  eventDates,
  participants,
  availabilities,
  finalizedDateIds = [],
  excludedParticipantIds = [],
  minColoredCount = 1,
}: AvailabilitySummaryProps) {
  // 色付けの最小人数を保持
  const [minColored, setMinColored] = useState<number>(minColoredCount);
  // 過去日程をグレースケール表示するかの設定（初期値はオン）
  const [isPastEventGrayscale, setIsPastEventGrayscale] = useState<boolean>(false);
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
    [participants, excludedParticipantIds],
  );
  // 除外されていない参加者のみでavailabilitiesもフィルタ
  const filteredAvailabilities = useMemo(
    () => availabilities.filter((a) => !excludedParticipantIds.includes(a.participant_id)),
    [availabilities, excludedParticipantIds],
  );
  const participantsByDateIndex = useMemo(
    () => buildParticipantsByDateIndex(filteredParticipants, filteredAvailabilities),
    [filteredParticipants, filteredAvailabilities],
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
  // コンポーネントマウント時にポータル要素を作成
  useMemo(() => {
    if (typeof document !== 'undefined') {
      const portalElement =
        document.getElementById('tooltip-portal') || document.createElement('div');
      if (!document.getElementById('tooltip-portal')) {
        portalElement.id = 'tooltip-portal';
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

    return Array.from(dateMap.values()).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
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

      const startTimeKey = `${startTimeObj.getHours().toString().padStart(2, '0')}:${startTimeObj
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;

      let endTimeKey: string;
      if (endTimeObj.getHours() === 0 && endTimeObj.getMinutes() === 0) {
        const startDate = new Date(startTimeObj);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(endTimeObj);
        endDate.setHours(0, 0, 0, 0);

        if (endDate.getTime() - startDate.getTime() === 24 * 60 * 60 * 1000) {
          endTimeKey = '24:00';
        } else {
          endTimeKey = `${endTimeObj.getHours().toString().padStart(2, '0')}:${endTimeObj
            .getMinutes()
            .toString()
            .padStart(2, '0')}`;
        }
      } else {
        endTimeKey = `${endTimeObj.getHours().toString().padStart(2, '0')}:${endTimeObj
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;
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
        const aEnd = parseInt(a.endTime.replace(':', ''), 10);
        const bEnd = parseInt(b.endTime.replace(':', ''), 10);
        return aEnd - bEnd;
      });
  }, [eventDates]);

  // ツールチップ表示処理（Pointerイベント）
  const handlePointerEnter = (event: React.PointerEvent<Element>, dateId: string) => {
    const availableParticipants = participantsByDateIndex.get(dateId)?.availableParticipants ?? [];
    const unavailableParticipants = participantsByDateIndex.get(dateId)?.unavailableParticipants ?? [];
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
  const handlePointerClick = (event: React.PointerEvent<Element>, dateId: string) => {
    event.stopPropagation();
    if (event.nativeEvent) {
      event.nativeEvent.stopImmediatePropagation();
    }
    const availableParticipants = participantsByDateIndex.get(dateId)?.availableParticipants ?? [];
    const unavailableParticipants = participantsByDateIndex.get(dateId)?.unavailableParticipants ?? [];
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
          lastEvent: 'mobile-tap',
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
        lastEvent: 'close',
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
      lastPointerType: event.pointerType as 'touch' | 'mouse' | 'pen',
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
    [handleScroll, isScrolling],
  );

  // 最大参加可能者数を算出（セルごとの availableCount の最大値）
  const maxAvailable = useMemo(() => {
    const availableCountMap = new Map<string, number>();
    filteredAvailabilities.forEach((availability) => {
      if (!availability.availability) return;
      const current = availableCountMap.get(availability.event_date_id) ?? 0;
      availableCountMap.set(availability.event_date_id, current + 1);
    });

    return eventDates.reduce((max, date) => {
      const cnt = availableCountMap.get(date.id) ?? 0;
      return Math.max(max, cnt);
    }, 0);
  }, [eventDates, filteredAvailabilities]);

  // ヒートマップデータの取得 - 日付×時間のマトリックス
  const heatmapData = useMemo(() => {
    // 各日付×時間帯のセルデータを格納するマップ
    const cellMap = new Map<string, HeatmapCell>();
    const summaryByDateId = new Map<string, { availableCount: number; unavailableCount: number }>();

    filteredAvailabilities.forEach((availability) => {
      const summary = summaryByDateId.get(availability.event_date_id) ?? {
        availableCount: 0,
        unavailableCount: 0,
      };

      if (availability.availability) {
        summary.availableCount += 1;
      } else {
        summary.unavailableCount += 1;
      }

      summaryByDateId.set(availability.event_date_id, summary);
    });

    // イベント日程をマップに変換
    eventDates.forEach((date) => {
      const startDate = new Date(date.start_time);
      const dateStr = getDateString(date.start_time);
      // 時間部分をキーに使用
      const startTimeStr = `${startDate.getHours().toString().padStart(2, '0')}:${startDate
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
      let endTimeStr: string;
      const endDateObj = new Date(date.end_time);
      if (endDateObj.getHours() === 0 && endDateObj.getMinutes() === 0) {
        const startDay = new Date(startDate);
        startDay.setHours(0, 0, 0, 0);
        const endDay = new Date(endDateObj);
        endDay.setHours(0, 0, 0, 0);
        if (endDay.getTime() - startDay.getTime() === 24 * 60 * 60 * 1000) {
          endTimeStr = '24:00';
        } else {
          endTimeStr = `${endDateObj.getHours().toString().padStart(2, '0')}:${endDateObj
            .getMinutes()
            .toString()
            .padStart(2, '0')}`;
        }
      } else {
        endTimeStr = `${endDateObj.getHours().toString().padStart(2, '0')}:${endDateObj
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;
      }

      const slotKey = `${startTimeStr}-${endTimeStr}`;
      const key = `${dateStr}_${slotKey}`;

      const summary = summaryByDateId.get(date.id);
      const availableCount = summary?.availableCount ?? 0;
      const unavailableCount = summary?.unavailableCount ?? 0;

      const totalResponses = availableCount + unavailableCount;
      const availabilityRate = totalResponses > 0 ? availableCount / totalResponses : 0;
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

  // ツールチップが直前に開かれたかを追跡するref
  const justOpenedTooltipRef = useRef<boolean>(false);

  // ドキュメント全体のクリックとスクロールイベントを監視してツールチップを閉じる
  const closeTooltipOnOutsideClick = useCallback(
    (e: Event) => {
      // ツールチップ表示中のみ処理
      if (!tooltip.show) return;

      // タッチ直後のtouchendは無視
      if (e.type === 'touchend' && justOpenedTooltipRef.current) {
        return;
      }

      // 可用性サマリーコンテナ内のクリックは無視
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setTooltip((prev) => ({ ...prev, show: false }));
      }
    },
    [tooltip.show],
  );

  // マウント時にグローバルイベントリスナーを追加
  useEffect(() => {
    // PCとタッチデバイス両方に対応
    document.addEventListener('click', closeTooltipOnOutsideClick);
    document.addEventListener('touchend', closeTooltipOnOutsideClick);
    // スクロール時にもツールチップを閉じる
    window.addEventListener('scroll', handleScroll, { passive: true });
    // タッチイベント検出
    document.addEventListener('touchstart', handleTouchStart, {
      passive: true,
    });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });

    // クリーンアップ関数
    return () => {
      document.removeEventListener('click', closeTooltipOnOutsideClick);
      document.removeEventListener('touchend', closeTooltipOnOutsideClick);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, [closeTooltipOnOutsideClick, handleScroll, handleTouchStart, handleTouchMove]);

  // Tooltip自動非表示（スマホタップ時）
  useEffect(() => {
    const handler = () => setTooltip((prev) => ({ ...prev, show: false }));
    window.addEventListener('tooltip:autohide', handler);
    return () => window.removeEventListener('tooltip:autohide', handler);
  }, []);

  // ドラッグ・スクロール判定
  const isDragging = useDragScrollBlocker(10);

  return (
    <div
      className="bg-base-100 availability-summary mb-6 rounded-lg border shadow-sm transition-all sm:mb-8"
      ref={containerRef}
      onScroll={handleScroll}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="p-3 sm:p-5">
        <h2 className="mb-3 text-lg font-bold sm:mb-4 sm:text-xl">みんなの回答状況</h2>
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
          isPastEventGrayscaleEnabled={isPastEventGrayscale}
          onPastEventGrayscaleToggle={setIsPastEventGrayscale}
        />
      </div>
      {/* PCのみツールチップ */}
      {!isMobile && <Tooltip tooltip={tooltip} portalElement={tooltipPortalRef.current} />}
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
