"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import DateRangePicker from "./date-range-picker";
import { TimeSlot } from "@/lib/utils";
import useDragScrollBlocker from "@/hooks/useDragScrollBlocker";
import { useDeviceDetect } from "@/hooks/useDeviceDetect";

/**
 * カレンダーで手動選択するコンポーネントのプロパティ
 */
interface ManualTimeSlotPickerProps {
  /** 選択中のマス一覧を親コンポーネントへ通知する */
  onTimeSlotsChange: (slots: TimeSlot[]) => void;
  /** 初期選択済みマス */
  initialSlots?: TimeSlot[];
}

/**
 * 期間を設定後、表形式（ヒートマップ風）で候補日時を手動選択できるコンポーネント
 */
export default function ManualTimeSlotPicker({
  onTimeSlotsChange,
  initialSlots = [],
}: ManualTimeSlotPickerProps) {
  const [allSlots, setAllSlots] = useState<TimeSlot[]>([]);
  // ★ ソースオブトゥルースは「選択されたキー集合」
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(initialSlots.map(slotKey))
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragState, setDragState] = useState<boolean | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; key: string } | null>(null);
  // スクロール操作を検出して、スクロール中はセル操作を無効化
  const isScrollDragging = useDragScrollBlocker(10);
  const { isMobile } = useDeviceDetect();

  /**
   * TimeSlot から一意なキー文字列を生成する
   */
  function slotKey(slot: TimeSlot) {
    const dateKey = format(slot.date, "yyyy-MM-dd");
    return `${dateKey}_${slot.startTime}-${slot.endTime}`;
  }

  /**
   * DateRangePicker から生成された全マスを保持
   * ※ 参照が安定するように useCallback
   */
  const handleSlotsGenerate = useCallback((slots: TimeSlot[]) => {
    setAllSlots(slots);
  }, []);

  /**
   * initialSlots の変更を selectedKeys に一度だけ（内容が変わったときだけ）反映
   * JSON でハッシュ化して依存を安定化
   */
  const initialHash = useMemo(
    () => JSON.stringify(initialSlots.map(slotKey).sort()),
    [initialSlots]
  );
  // initialSlots の実体比較は initialHash で行うため、依存は initialHash のみとする
  useEffect(() => {
    setSelectedKeys(new Set(initialSlots.map(slotKey)));
  },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [initialHash]);

  /**
   * ★ 派生状態：selectedMap は state にせず useMemo で導出
   */
  const selectedMap = useMemo<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const s of allSlots) {
      map[slotKey(s)] = selectedKeys.has(slotKey(s));
    }
    return map;
  }, [allSlots, selectedKeys]);

  /**
   * ON/OFF トグルは selectedKeys を更新
   */
  const toggleSlot = useCallback((key: string, value?: boolean) => {
    setSelectedKeys((prev) => {
      const current = prev.has(key);
      const nextVal = value ?? !current;
      // 値が変わらない場合は Set を作成しない
      if (current === nextVal) {
        return prev;
      }

      const next = new Set(prev);
      if (nextVal) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, []);

  const handleMouseDown = (key: string) => {
    if (isScrollDragging) return;
    const newState = !selectedMap[key];
    toggleSlot(key, newState);
    setIsDragging(true);
    setDragState(newState);
  };

  const handleMouseEnter = (key: string) => {
    if (isDragging && dragState !== null) {
      toggleSlot(key, dragState);
    }
  };

  const handleTouchStart = (key: string, e?: React.TouchEvent) => {
    // グリッド上ではスクロールを許可しないため、即座に選択モードへ
    if (e?.touches && e.touches[0]) {
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY, key };
    }
    const newState = !selectedMap[key];
    toggleSlot(key, newState);
    setIsDragging(true);
    setDragState(newState);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (isDragging && dragState !== null) {
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const cell = element?.closest<HTMLDivElement>("[data-key]");
      if (cell) {
        toggleSlot(cell.getAttribute("data-key") as string, dragState);
      }
    }
  };

  const endDrag = useCallback(() => {
    setIsDragging(false);
    setDragState(null);
    touchStartRef.current = null;
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener("mouseup", endDrag);
    window.addEventListener("touchend", endDrag);
    return () => {
      window.removeEventListener("mouseup", endDrag);
      window.removeEventListener("touchend", endDrag);
    };
  }, [isDragging, endDrag]);

  // 選択モード中はページスクロールを抑止（モバイル）
  useEffect(() => {
    if (!isMobile) return;
    if (isDragging) {
      const prevOverflow = document.body.style.overflow;
      const prevTouch: string = (document.body.style as unknown as { touchAction?: string }).touchAction || "";
      document.body.style.overflow = "hidden";
      (document.body.style as unknown as { touchAction?: string }).touchAction = "none";
      return () => {
        document.body.style.overflow = prevOverflow;
        (document.body.style as unknown as { touchAction?: string }).touchAction = prevTouch;
      };
    }
  }, [isDragging, isMobile]);

  /**
   * 親への通知は派生配列をメモ化してから effect で一回通知
   */
  const selectedSlots = useMemo<TimeSlot[]>(
    () => allSlots.filter((slot) => selectedKeys.has(slotKey(slot))),
    [allSlots, selectedKeys]
  );

  const notifyTimeSlotChange = useCallback(
    (selected: TimeSlot[]) => {
      onTimeSlotsChange(selected);
    },
    [onTimeSlotsChange]
  );

  useEffect(() => {
    notifyTimeSlotChange(selectedSlots);
  }, [notifyTimeSlotChange, selectedSlots]);

  const dateKeys = useMemo(
    () =>
      Array.from(
        new Set(allSlots.map((s) => format(s.date, "yyyy-MM-dd")))
      ).sort(),
    [allSlots]
  );
  // 週（Mon-Sun）ごとの起点（月曜日）配列を作成（PC/モバイル共通）
  const weekAnchors = useMemo(() => {
    const anchors: string[] = [];
    if (dateKeys.length === 0) return anchors;
    const first = startOfWeek(new Date(dateKeys[0] + "T00:00:00"), { weekStartsOn: 1 });
    const last = endOfWeek(new Date(dateKeys[dateKeys.length - 1] + "T00:00:00"), { weekStartsOn: 1 });
    let cur = new Date(first);
    while (cur <= last) {
      anchors.push(format(cur, "yyyy-MM-dd"));
      cur = addDays(cur, 7);
    }
    return anchors;
  }, [dateKeys]);
  const [weekIndex, setWeekIndex] = useState(0);
  // weekAnchorsの長さに応じて現在のindexをクランプ
  useEffect(() => {
    if (weekAnchors.length === 0) return;
    setWeekIndex((idx) => Math.min(idx, weekAnchors.length - 1));
  }, [weekAnchors]);
  const timeKeys = useMemo(
    () =>
      Array.from(
        new Set(allSlots.map((s) => `${s.startTime}-${s.endTime}`))
      ).sort(),
    [allSlots]
  );

  const visibleDates = useMemo(() => {
    if (weekAnchors.length === 0) return [] as string[];
    const mondayStr = weekAnchors[Math.min(weekIndex, weekAnchors.length - 1)];
    const monday = new Date(mondayStr + "T00:00:00");
    return Array.from({ length: 7 }, (_, i) => format(addDays(monday, i), "yyyy-MM-dd"));
  }, [weekAnchors, weekIndex]);

  const weekLabel = useMemo(() => {
    if (visibleDates.length === 0) return "";
    const first = visibleDates[0];
    const last = visibleDates[6];
    return `${first} 〜 ${last}`;
  }, [visibleDates]);

  // コンパクトなヘッダー日付表示（例: 7/1 + (火) を2行）
  const getCompactDateParts = useCallback((dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`);
    const md = d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
    const wd = d.toLocaleDateString("ja-JP", { weekday: "short" });
    return { md, wd };
  }, []);

  return (
    <div className="space-y-4">
      {(() => {
        const isTest =
          typeof process !== "undefined" && process.env.NODE_ENV === "test";
        const props = isTest
          ? {}
          : {
              initialStartDate: (() => {
                const d = new Date();
                d.setHours(0, 0, 0, 0);
                return d;
              })(),
              initialEndDate: (() => {
                const d = new Date();
                d.setDate(d.getDate() + 6);
                d.setHours(0, 0, 0, 0);
                return d;
              })(),
              initialDefaultStartTime: "09:00",
              initialDefaultEndTime: "18:00",
              initialIntervalUnit: "60",
              allowPastDates: true,
            } as const;
        return (
          <DateRangePicker
            onTimeSlotsChange={handleSlotsGenerate}
            {...props}
          />
        );
      })()}
      {allSlots.length > 0 && (
        <p className="text-sm text-gray-500">
          カレンダー上でクリックして、候補の日時を個別に追加します。
        </p>
      )}
      {allSlots.length > 0 && (
        <div
          className={`-mx-2 sm:-mx-4 md:-mx-6 ${isMobile ? "touch-none" : ""}`}
        >
          {/* 表示範囲（ボタンとは別行） */}
          {weekAnchors.length > 0 && (
            <div className="px-4 text-xs sm:text-sm text-base-content/80 mb-1" aria-live="polite">
              表示: {weekLabel}（月曜はじまり）
            </div>
          )}
          {/* 週送りボタン行（左右に配置） */}
          {weekAnchors.length > 0 && (
            <div className="flex items-center justify-between mb-2 px-4">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setWeekIndex((i) => Math.max(0, i - 1))}
                disabled={weekIndex <= 0}
                aria-label="前の週へ"
              >
                ← 前の週
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setWeekIndex((i) => Math.min(weekAnchors.length - 1, i + 1))}
                disabled={weekIndex >= weekAnchors.length - 1}
                aria-label="次の週へ"
              >
                次の週 →
              </button>
            </div>
          )}
          <table className="table table-xs table-fixed w-full min-w-0 text-center border-collapse border border-base-300">
            <thead>
              <tr>
                <th
                  className={`sticky left-0 top-0 bg-base-200 z-20 text-left ${
                    isMobile ? "w-12 p-1 text-[10px]" : "w-12 p-1 text-[11px]"
                  }`}
                >
                  時間
                </th>
                {visibleDates.map((d) => {
                  const parts = getCompactDateParts(d);
                  return (
                  <th
                    key={d}
                    className={`text-center whitespace-normal bg-base-200 sticky top-0 z-10 ${
                      isMobile ? "p-0.5 text-[10px] leading-tight" : "p-0.5 text-[11px] leading-tight"
                    }`}
                  >
                    <span className="block">{parts.md}</span>
                    <span className="block text-[10px] text-base-content/70">({parts.wd})</span>
                  </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {timeKeys.map((time) => (
                <tr key={time}>
                  <th
                    className={`whitespace-nowrap text-right pr-2 sticky left-0 bg-base-100 z-10 ${
                      isMobile ? "p-1 text-[10px]" : "p-1 text-[11px]"
                    }`}
                  >
                    {time.split("-")[0].replace(/^0/, "")}
                  </th>
                  {visibleDates.map((date) => {
                    const key = `${date}_${time}`;
                    const exists = key in selectedMap;
                    const active = exists ? selectedMap[key] : false;
                    return (
                      <td
                        key={key}
                        className={`text-center border border-base-300 ${
                          isMobile ? "p-0.5" : "p-0.5"
                        }`}
                      >
                        {exists ? (
                          <div
                            data-testid="slot-cell"
                            data-key={key}
                            className={`w-full ${
                              isMobile ? "h-7" : "h-8"
                            } flex items-center justify-center cursor-pointer transition-colors select-none ${
                              active
                                ? "bg-primary text-primary-content font-bold"
                                : "bg-base-200"
                            }`}
                            onMouseDown={(e) => {
                              if (isMobile) return; // タッチ端末の合成マウスイベントを無視
                              e.preventDefault();
                              handleMouseDown(key);
                            }}
                            onMouseEnter={() => {
                              if (isMobile) return; // タッチ端末の合成マウスイベントを無視
                              handleMouseEnter(key);
                            }}
                            onTouchStart={(e) => {
                              handleTouchStart(key, e);
                            }}
                            onTouchMove={handleTouchMove}
                            role="button"
                            aria-label={active ? "選択済み" : "未選択"}
                          >
                            {active ? "○" : ""}
                          </div>
                        ) : (
                          <div className={`w-full ${isMobile ? "h-7" : "h-8"} flex items-center justify-center bg-base-200/50 text-base-content/30 select-none`}>
                            –
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
  );
}
