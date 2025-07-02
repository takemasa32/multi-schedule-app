"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import DateRangePicker from "./date-range-picker";
import { TimeSlot } from "@/lib/utils";

/**
 * 手動で候補マスを選択するコンポーネントのプロパティ
 */
interface ManualTimeSlotPickerProps {
  /** 選択中のマス一覧を親コンポーネントへ通知する */
  onTimeSlotsChange: (slots: TimeSlot[]) => void;
}

/**
 * 期間を設定後、表形式で候補マスを直接選択できるコンポーネント
 */
export default function ManualTimeSlotPicker({
  onTimeSlotsChange,
}: ManualTimeSlotPickerProps) {
  const [allSlots, setAllSlots] = useState<TimeSlot[]>([]);
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});

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
    const map: Record<string, boolean> = {};
    slots.forEach((s) => {
      map[slotKey(s)] = false;
    });
    setSelectedMap(map);
  };

  /**
   * マスの ON/OFF をトグルする
   */
  const toggleSlot = (key: string) => {
    setSelectedMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
                      <td key={key} className="text-center">
                        <button
                          type="button"
                          className={`btn btn-xs ${active ? "btn-primary" : "btn-ghost"}`}
                          onClick={() => toggleSlot(key)}
                        >
                          {active ? "✓" : ""}
                        </button>
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

