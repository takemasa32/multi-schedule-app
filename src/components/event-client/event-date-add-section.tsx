"use client";
import { useState, useEffect } from "react";
import DateRangePicker from "../date-range-picker";
import { addEventDates } from "@/app/actions";
import { TimeSlot } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { EventDate } from "./event-details-section";

interface EventDateAddSectionProps {
  event: {
    id: string;
    title: string;
    public_token: string;
  };
  eventDates: EventDate[];
}

export default function EventDateAddSection({
  event,
  eventDates,
}: EventDateAddSectionProps) {
  // クイック自動延長用state
  const sortedDates = [...eventDates].sort((a, b) =>
    a.start_time.localeCompare(b.start_time)
  );
  const last = sortedDates[sortedDates.length - 1];
  const defaultLastDate = last ? last.start_time.slice(0, 10) : "";
  const [extendTo, setExtendTo] = useState<string>(defaultLastDate);
  const [quickSlots, setQuickSlots] = useState<TimeSlot[]>([]);
  const [pendingTimeSlots, setPendingTimeSlots] = useState<TimeSlot[]>([]);
  const [addModalState, setAddModalState] = useState<
    "confirm" | "loading" | "success" | "error" | null
  >(null);
  const [addModalError, setAddModalError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<{
    message: string;
    key: number;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // 代表パターン抽出
  function extractDailyPatterns(dates: EventDate[]) {
    const byDay: Record<string, { start: string; end: string }[]> = {};
    dates.forEach((d) => {
      const day = d.start_time.slice(0, 10);
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push({
        start: d.start_time.slice(11, 16),
        end: d.end_time.slice(11, 16),
      });
    });
    const patterns = Object.values(byDay);
    if (patterns.length === 0) return [];
    const freq: Record<string, number> = {};
    patterns.forEach((p) => {
      const key = p.map((s) => `${s.start}-${s.end}`).join(",");
      freq[key] = (freq[key] || 0) + 1;
    });
    const mainKey = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
    return mainKey.split(",").map((s) => {
      const [start, end] = s.split("-");
      return { start, end };
    });
  }
  // クイック延長日付選択時のスロット生成
  useEffect(() => {
    if (!last || !extendTo) {
      setQuickSlots([]);
      return;
    }
    const slots: TimeSlot[] = [];
    const lastDate = new Date(last.start_time.slice(0, 10));
    lastDate.setHours(0, 0, 0, 0);
    const to = new Date(extendTo);
    to.setHours(0, 0, 0, 0);
    const pattern = extractDailyPatterns(eventDates);
    if (pattern.length === 0) {
      setQuickSlots([]);
      return;
    }
    const existingSet = new Set(
      eventDates.map((d) => {
        const day = d.start_time.slice(0, 10);
        const start = d.start_time.slice(11, 16);
        const end = d.end_time.slice(11, 16);
        return `${day}_${start}_${end}`;
      })
    );
    for (const d = new Date(lastDate); d <= to; d.setDate(d.getDate() + 1)) {
      if (d.getTime() === lastDate.getTime()) continue;
      pattern.forEach(({ start, end }) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const dateStr = `${y}-${m}-${day}`;
        const key = `${dateStr}_${start}_${end}`;
        if (!existingSet.has(key)) {
          slots.push({ date: new Date(d), startTime: start, endTime: end });
        }
      });
    }
    setQuickSlots(slots);
  }, [extendTo, last, eventDates]);

  const getLocalDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getDate()).padStart(2, "0")}`;

  return (
    <div className="my-4 flex flex-col gap-4">
      <button
        className="btn btn-outline btn-primary mb-4"
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "日程追加を閉じる" : "日程を追加する"}
      </button>
      {open && (
        <div className="card bg-base-100 shadow-md border border-base-200">
          <div className="card-body">
            {eventDates.length === 0 ? (
              <div>既存日程がありません</div>
            ) : (
              <>
                <label className="label" htmlFor="extendToDate">
                  <span className="label-text">延長したい最終日</span>
                </label>
                <input
                  id="extendToDate"
                  type="date"
                  className="input input-bordered w-full max-w-xs"
                  min={defaultLastDate}
                  value={extendTo}
                  onChange={(e) => setExtendTo(e.target.value)}
                  disabled={addModalState === "loading"}
                />
                <div className="my-2 text-sm">
                  追加される日程:
                  <ul className="list-disc pl-5">
                    {(() => {
                      const grouped: Record<
                        string,
                        { date: Date; count: number }
                      > = {};
                      quickSlots.forEach((slot) => {
                        const key = getLocalDateKey(slot.date);
                        if (!grouped[key])
                          grouped[key] = { date: slot.date, count: 0 };
                        grouped[key].count += 1;
                      });
                      const sorted = Object.values(grouped).sort(
                        (a, b) => a.date.getTime() - b.date.getTime()
                      );
                      if (sorted.length === 0) return <li>なし</li>;
                      return sorted.map(({ date, count }) => (
                        <li key={getLocalDateKey(date)}>
                          {date.getFullYear()}/{date.getMonth() + 1}/
                          {date.getDate()}（{"日月火水木金土"[date.getDay()]}）:{" "}
                          {count}枠追加
                        </li>
                      ));
                    })()}
                  </ul>
                </div>
                <button
                  className={`btn btn-primary${
                    addModalState === "loading" ? " loading" : ""
                  }`}
                  type="button"
                  disabled={
                    quickSlots.length === 0 ||
                    !!(
                      addModalState &&
                      ["loading", "success"].includes(addModalState)
                    )
                  }
                  onClick={() => {
                    setPendingTimeSlots([...quickSlots]);
                    setAddModalState("confirm");
                  }}
                >
                  {addModalState === "loading" ? (
                    <>
                      <span className="loading loading-spinner loading-sm mr-2" />
                      追加準備中...
                    </>
                  ) : (
                    "この日まで自動延長して追加"
                  )}
                </button>
                {/* 柔軟な日程追加（サブUI, 折りたたみ） */}
                <details className="mt-4">
                  <summary className="cursor-pointer font-bold text-base mb-2 opacity-70">
                    詳細な日程追加（任意の範囲・時間帯）
                  </summary>
                  <div className="mt-4">
                    <DateRangePicker
                      onTimeSlotsChange={(timeSlots) => {
                        if (addModalState !== "confirm") {
                          setPendingTimeSlots(timeSlots);
                        }
                      }}
                    />
                    <button
                      className={`btn btn-primary mt-2 ${
                        addModalState === "loading" ? "loading" : ""
                      }`}
                      type="button"
                      onClick={() => {
                        setAddModalState("confirm");
                      }}
                    >
                      {addModalState === "loading" ? (
                        <>
                          <span className="loading loading-spinner loading-sm mr-2" />
                          追加中...
                        </>
                      ) : (
                        "日程を追加"
                      )}
                    </button>
                  </div>
                </details>
              </>
            )}
            {/* 日程追加確認モーダル */}
            {(addModalState === "confirm" ||
              addModalState === "loading" ||
              addModalState === "error" ||
              addModalState === "success") && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
                style={{
                  pointerEvents: addModalState === "loading" ? "none" : "auto",
                }}
              >
                <div
                  className="bg-base-100 rounded-lg shadow-lg p-6 w-full max-w-md relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="font-bold text-lg mb-2">日程追加の確認</h3>
                  {addModalState === "success" ? (
                    <div className="alert alert-success mb-4">
                      日程を追加しました。
                    </div>
                  ) : (
                    <>
                      <p className="mb-2 text-sm text-gray-700">
                        以下の日程を追加します。よろしいですか？
                      </p>
                      <ul className="mb-4 text-sm">
                        {(() => {
                          const grouped: Record<
                            string,
                            { date: Date; count: number }
                          > = {};
                          pendingTimeSlots.forEach((slot) => {
                            const key = getLocalDateKey(slot.date);
                            if (!grouped[key])
                              grouped[key] = { date: slot.date, count: 0 };
                            grouped[key].count += 1;
                          });
                          return Object.values(grouped)
                            .sort((a, b) => a.date.getTime() - b.date.getTime())
                            .map(({ date, count }) => (
                              <li key={getLocalDateKey(date)} className="mb-1">
                                <span className="font-semibold">
                                  {date.getFullYear()}/{date.getMonth() + 1}/
                                  {date.getDate()}（
                                  {"日月火水木金土"[date.getDay()]}）
                                </span>
                                : {count}枠追加
                              </li>
                            ));
                        })()}
                      </ul>
                    </>
                  )}
                  <div className="flex gap-2 justify-end">
                    {!["loading", "success"].includes(addModalState ?? "") && (
                      <button
                        className="btn btn-outline"
                        onClick={() => {
                          setAddModalState(null);
                          setPendingTimeSlots([]);
                          setAddModalError(null);
                        }}
                        type="button"
                      >
                        キャンセル
                      </button>
                    )}
                    {addModalState !== "success" && (
                      <button
                        className={`btn btn-primary${
                          addModalState === "loading" ? " loading" : ""
                        }`}
                        onClick={async () => {
                          setAddModalState("loading");
                          setAddModalError(null);
                          try {
                            const formData = new FormData();
                            formData.append("eventId", event.id);
                            pendingTimeSlots.forEach((slot) => {
                              const y = slot.date.getFullYear();
                              const m = String(
                                slot.date.getMonth() + 1
                              ).padStart(2, "0");
                              const d = String(slot.date.getDate()).padStart(
                                2,
                                "0"
                              );
                              const dateStr = `${y}-${m}-${d}`;
                              formData.append(
                                "start",
                                `${dateStr} ${slot.startTime}:00`
                              );
                              formData.append(
                                "end",
                                `${dateStr} ${slot.endTime}:00`
                              );
                            });
                            const res = await addEventDates(formData);
                            if (!res.success) {
                              setAddModalError(
                                res.message || "追加に失敗しました"
                              );
                              setAddModalState("error");
                            } else {
                              setAddModalState("success");
                              setShowToast({
                                message: `${pendingTimeSlots.length}件の日程を追加しました`,
                                key: Date.now(),
                              });
                              setTimeout(() => {
                                setAddModalState(null);
                                setPendingTimeSlots([]);
                                setAddModalError(null);
                              }, 1200);
                              router.refresh();
                            }
                          } catch (e: unknown) {
                            if (e instanceof Error) {
                              setAddModalError(e.message);
                            } else {
                              setAddModalError("追加に失敗しました");
                            }
                            setAddModalState("error");
                          }
                        }}
                        type="button"
                        disabled={
                          !!(
                            addModalState &&
                            ["loading", "success"].includes(addModalState)
                          )
                        }
                      >
                        {addModalState === "loading" ? (
                          <>
                            <span className="loading loading-spinner loading-sm mr-2" />
                            追加中...
                          </>
                        ) : (
                          "追加する"
                        )}
                      </button>
                    )}
                  </div>
                  {addModalError && (
                    <div className="alert alert-error mt-3 text-sm">
                      {addModalError}
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Toast通知 */}
            {showToast && (
              <div
                key={showToast.key}
                className="fixed bottom-6 right-6 z-[1000] bg-success text-white px-4 py-2 rounded shadow-lg animate-fade-in"
                style={{ minWidth: 180, textAlign: "center" }}
              >
                {showToast.message}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
