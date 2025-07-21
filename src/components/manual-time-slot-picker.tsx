"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import DateRangePicker from "./date-range-picker";
import { TimeSlot } from "@/lib/utils";

/**
 * 手動で候補マスを選択するコンポーネントのプロパティ
 */
interface ManualTimeSlotPickerProps {
  /** 選択中のマス一覧を親コンポーネントへ通知する */
  onTimeSlotsChange: (slots: TimeSlot[]) => void;
  /** 初期選択済みマス */
  initialSlots?: TimeSlot[];
}

/**
 * 期間を設定後、表形式で候補マスを直接選択できるコンポーネント
 */
export default function ManualTimeSlotPicker({
  onTimeSlotsChange,
  initialSlots = [],
}: ManualTimeSlotPickerProps) {
  const [allSlots, setAllSlots] = useState<TimeSlot[]>([]);
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragState, setDragState] = useState<boolean | null>(null);

  /**
   * TimeSlot から一意なキー文字列を生成する
   */
  const slotKey = (slot: TimeSlot) => {
    const dateKey = format(slot.date, "yyyy-MM-dd");
    return `${dateKey}_${slot.startTime}-${slot.endTime}`;
  };

  /**
   * DateRangePicker から生成された全マスを保持し、選択状態を初期化する
   */
  const handleSlotsGenerate = (slots: TimeSlot[]) => {
    setAllSlots(slots);
  };

  useEffect(() => {
    const selectedKeys = new Set(initialSlots.map(slotKey));
    const map: Record<string, boolean> = {};
    allSlots.forEach((s) => {
      map[slotKey(s)] = selectedKeys.has(slotKey(s));
    });
    setSelectedMap(map);
  }, [allSlots, initialSlots]);

  /**
   * マスの ON/OFF をトグルする
   */
  const toggleSlot = (key: string, value?: boolean) => {
    setSelectedMap((prev) => ({
      ...prev,
      [key]: value !== undefined ? value : !prev[key],
    }));
  };

  const handleMouseDown = (key: string) => {
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

  const handleTouchStart = (key: string) => {
    const newState = !selectedMap[key];
    toggleSlot(key, newState);
    setIsDragging(true);
    setDragState(newState);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && dragState !== null) {
      const touch = e.touches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const cell = element?.closest<HTMLDivElement>("[data-key]");
      if (cell) {
        toggleSlot(cell.dataset.key as string, dragState);
      }
    }
  };

  const endDrag = useCallback(() => {
    setIsDragging(false);
    setDragState(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mouseup", endDrag);
      window.addEventListener("touchend", endDrag);
      return () => {
        window.removeEventListener("mouseup", endDrag);
        window.removeEventListener("touchend", endDrag);
      };
    }
  }, [isDragging, endDrag]);

  useEffect(() => {
    const selected = allSlots.filter((slot) => selectedMap[slotKey(slot)]);
    onTimeSlotsChange(selected);
  }, [selectedMap, allSlots, onTimeSlotsChange]);

  const dateKeys = Array.from(
    new Set(allSlots.map((s) => format(s.date, "yyyy-MM-dd")))
  ).sort();
  const timeKeys = Array.from(
    new Set(allSlots.map((s) => `${s.startTime}-${s.endTime}`))
  ).sort();

  return (
    <div className="space-y-4">
      <DateRangePicker onTimeSlotsChange={handleSlotsGenerate} />
      {allSlots.length > 0 && (
        <p className="text-sm text-gray-500">
          表のマスをクリックまたはドラッグして候補枠を選択してください
        </p>
      )}
      {allSlots.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table table-sm border border-base-300">
            <thead>
              <tr>
                <th className="w-20">時間</th>
                {dateKeys.map((d) => (
                  <th key={d} className="text-center whitespace-nowrap">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeKeys.map((time) => (
                <tr key={time}>
                  <th className="whitespace-nowrap text-right pr-2">{time}</th>
                  {dateKeys.map((date) => {
                    const key = `${date}_${time}`;
                    if (!(key in selectedMap)) return <td key={key}></td>;
                    const active = selectedMap[key];
                    return (
                      <td key={key} className="p-0 text-center border border-base-300">
                        <div
                          data-testid="slot-cell"
                          data-key={key}
                          className={`w-full h-7 flex items-center justify-center cursor-pointer ${active ? "bg-success text-success-content" : "bg-base-200"}`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleMouseDown(key);
                          }}
                          onMouseEnter={() => handleMouseEnter(key)}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            handleTouchStart(key);
                          }}
                          onTouchMove={handleTouchMove}
                          role="button"
                          aria-label={active ? "選択済み" : "未選択"}
                        >
                          {active ? (
                            <span className="text-lg font-bold select-none">○</span>
                          ) : (
                            <span className="text-lg font-bold opacity-70 select-none">×</span>
                          )}
                        </div>
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

