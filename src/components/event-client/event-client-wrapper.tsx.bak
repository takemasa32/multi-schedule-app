"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { CalendarLinks } from "@/components/calendar-links";
import FinalizeEventSection from "@/components/finalize-event-section";
import EventHistory from "@/components/event-history";
import { addEventToHistory } from "@/lib/utils";
// import AvailabilitySummary from "../availability-summary/index";
import { toZonedTime } from "date-fns-tz";
import DateRangePicker from "../date-range-picker";
import { addEventDates } from "@/app/actions";
import { TimeSlot } from "@/lib/utils";
import { useRouter } from "next/navigation";

const TIME_ZONE = "Asia/Tokyo";
type EventDate = {
  id: string;
  start_time: string;
  end_time: string;
  label?: string;
};

type Participant = {
  id: string;
  name: string;
};

type Availability = {
  participant_id: string;
  event_date_id: string;
  availability: boolean;
};

// event型にfinal_date_idを追加
interface EventWithFinalDateId {
  id: string;
  title: string;
  description: string | null;
  public_token: string;
  admin_token: string | null;
  is_finalized: boolean;
  final_date_id?: string | null;
}

interface EventClientWrapperProps {
  event: EventWithFinalDateId;
  eventDates: EventDate[];
  participants: Participant[];
  availabilities: Availability[];
  finalizedDateIds: string[];
  isAdmin: boolean;
}

export default function EventClientWrapper({
  event,
  eventDates,
  participants,
  availabilities,
  finalizedDateIds,
  isAdmin,
}: EventClientWrapperProps) {
  // viewModeのステート追加
  // 回答状況（集計）はサーバー側で描画するためviewModeは不要
  // const [viewMode, setViewMode] = useState<"list" | "heatmap" | "detailed">(
  //   "heatmap"
  // );
  // 参加者の表示/非表示トグル用ステート
  const [excludedParticipantIds, setExcludedParticipantIds] = useState<
    string[]
  >([]);
  // 追加候補用のステート
  const [pendingTimeSlots, setPendingTimeSlots] = useState<TimeSlot[]>([]);
  const [addModalState, setAddModalState] = useState<
    "confirm" | "loading" | "success" | "error" | null
  >(null);
  const [addModalError, setAddModalError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<{
    message: string;
    key: number;
  } | null>(null);
  const router = useRouter();

  // finalizedDateIdsが空かつfinal_date_idが存在する場合はそれを使う
  let effectiveFinalizedDateIds = finalizedDateIds;
  if (
    event.is_finalized &&
    (!finalizedDateIds || finalizedDateIds.length === 0) &&
    event.final_date_id
  ) {
    effectiveFinalizedDateIds = [event.final_date_id];
  }

  const finalizedDates = eventDates
    .filter((date) => effectiveFinalizedDateIds.includes(date.id))
    .map((date) => {
      // server から来る date.start_time が ISO 文字列 (例: "2025-05-20T00:00:00Z") なら…
      const startJst = toZonedTime(date.start_time, TIME_ZONE);
      const endJst = toZonedTime(date.end_time, TIME_ZONE);
      return {
        ...date,
        startJst,
        endJst,
      };
    });

  // ページロード時にイベント履歴に追加
  useEffect(() => {
    // イベント情報を履歴に追加
    addEventToHistory(
      {
        id: event.public_token,
        title: event.title,
        adminToken: isAdmin ? event.admin_token ?? undefined : undefined,
        createdAt: new Date().toISOString(),
        isCreatedByMe: isAdmin,
      },
      30
    ); // 履歴保存件数を30件に拡張
  }, [event.public_token, event.title, event.admin_token, isAdmin]);

  // 参加者名バッジのトグルUI
  const handleToggleParticipant = (id: string) => {
    setExcludedParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  // クイック自動延長用state
  const sortedDates = [...eventDates].sort((a, b) =>
    a.start_time.localeCompare(b.start_time)
  );
  const last = sortedDates[sortedDates.length - 1];
  const defaultLastDate = last ? last.start_time.slice(0, 10) : "";
  const [extendTo, setExtendTo] = useState<string>(defaultLastDate);
  const [quickSlots, setQuickSlots] = useState<TimeSlot[]>([]);

  // 既存日程のパターン（1日ごとの時間帯リスト）を抽出
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
    // 最も多いパターンを代表パターンとする
    const patterns = Object.values(byDay);
    if (patterns.length === 0) return [];
    // 代表パターン（最頻出）
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

  // クイック延長日付選択時のスロット生成（代表パターンを繰り返し）
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
    // 既存スロットの重複判定用セットを作成
    const existingSet = new Set(
      eventDates.map((d) => {
        const day = d.start_time.slice(0, 10);
        const start = d.start_time.slice(11, 16);
        const end = d.end_time.slice(11, 16);
        return `${day}_${start}_${end}`;
      })
    );
    for (const d = new Date(lastDate); d <= to; d.setDate(d.getDate() + 1)) {
      if (d.getTime() === lastDate.getTime()) continue; // 最終日自身は除外
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
    <>
      {/* 確定済みイベントの表示 */}
      {event.is_finalized && finalizedDates.length > 0 && (
        <>
          <div className="alert alert-success mb-8">
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
            <span>日程が確定しました！</span>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-bold mb-2">確定した日程:</h3>
            <ul className="list-disc pl-5 space-y-1">
              {finalizedDates.map((date) => (
                <li key={date.id}>
                  {new Date(date.start_time).toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })}{" "}
                  {new Date(date.start_time).toLocaleTimeString("ja-JP", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  〜{" "}
                  {new Date(date.end_time).toLocaleTimeString("ja-JP", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </li>
              ))}
            </ul>
          </div>

          <CalendarLinks
            eventTitle={event.title}
            eventDates={finalizedDates}
            eventId={event.id}
          />
        </>
      )}

      {/* 参加回答ボタンエリア */}
      <div className="card bg-base-100 shadow-md border border-base-200 overflow-visible mb-8">
        <div className="card-body">
          <h3 className="card-title text-lg">参加予定を入力する</h3>
          <p className="text-sm text-gray-600 mb-4">
            {event.is_finalized
              ? "イベントは確定していますが、引き続き回答を更新できます。"
              : "以下のボタンから参加予定を入力してください。"}
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/event/${event.public_token}/input`}
              className="btn btn-primary"
              onClick={(e) => {
                // ボタンクリック時のローディング表示
                const target = e.currentTarget;
                target.classList.add("loading");
                // loading-spinnerクラスの要素を動的に追加
                const spinner = document.createElement("span");
                spinner.className = "loading loading-spinner loading-sm mr-2";
                target.prepend(spinner);
                // テキスト内容を変更
                const textNode = Array.from(target.childNodes).find(
                  (node) => node.nodeType === Node.TEXT_NODE
                );
                if (textNode) {
                  textNode.textContent = "移動中...";
                }
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                  clipRule="evenodd"
                />
              </svg>
              新しく回答する
            </Link>

            {participants.length > 0 && (
              <div className="dropdown dropdown-bottom dropdown-end relative">
                <div
                  tabIndex={0}
                  role="button"
                  className="btn btn-secondary m-1"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  既存の回答を編集
                </div>
                <ul
                  tabIndex={0}
                  className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 max-h-60 overflow-y-auto z-[100] absolute"
                  style={{ maxHeight: "300px" }}
                >
                  {participants.map((participant) => (
                    <li key={participant.id}>
                      <Link
                        href={`/event/${event.public_token}/input?participant_id=${participant.id}`}
                      >
                        {participant.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 回答状況表示エリア */}
      <div className="card bg-base-100 shadow-md border border-base-200 mb-8">
        <div className="card-body p-0">
          <h2 className="p-4 border-b border-base-200 font-bold text-xl">
            回答状況
          </h2>
          {/* 回答状況（集計）はサーバー側で描画するためここでは非表示に */}
          {/* <AvailabilitySummary
            participants={participants}
            eventDates={eventDates}
            availabilities={availabilities}
            finalizedDateIds={finalizedDateIds}
            publicToken={event.public_token}
            viewMode={viewMode}
            setViewMode={setViewMode}
            excludedParticipantIds={excludedParticipantIds}
          /> */}
          {/* 参加者名リスト（表示/非表示トグル） */}
          {participants.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 py-2 mb-2 items-center">
              <span className="text-sm text-gray-500 mr-2">表示選択:</span>
              {participants.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`badge px-3 py-2 cursor-pointer transition-all border-2 ${
                    excludedParticipantIds.includes(p.id)
                      ? "badge-outline border-error text-error bg-error/10"
                      : "badge-primary border-primary"
                  }`}
                  aria-pressed={excludedParticipantIds.includes(p.id)}
                  onClick={() => handleToggleParticipant(p.id)}
                  title={
                    excludedParticipantIds.includes(p.id)
                      ? "表示に戻す"
                      : "非表示にする"
                  }
                >
                  {excludedParticipantIds.includes(p.id) ? (
                    <span className="mr-1">🚫</span>
                  ) : (
                    <span className="mr-1">👤</span>
                  )}
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 日程確定セクション */}
      <div className="card bg-base-100 shadow-md border border-base-200">
        <div className="card-body">
          <h2 className="card-title text-xl mb-4">
            {event.is_finalized ? "日程修正セクション" : "日程確定セクション"}
          </h2>
          {event.is_finalized && (
            <div className="alert alert-warning mb-4">
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>
                日程が既に確定していますが、必要に応じて修正できます。
              </span>
            </div>
          )}
          <FinalizeEventSection
            eventId={event.id}
            eventDates={eventDates}
            availabilities={availabilities}
            participants={participants}
            finalizedDateIds={finalizedDateIds}
          />
        </div>
      </div>

      {/* クイック自動延長UI + 柔軟な日程追加（サブ） */}
      <div className="card bg-base-100 shadow-md border border-base-200 my-8">
        <div className="card-body">
          <details open>
            <summary className="cursor-pointer font-bold text-lg mb-2">
              日程を追加する
            </summary>
            <div className="mt-4 flex flex-col gap-2">
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
                        // quickSlotsを日付ごとにグループ化
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
                            {date.getDate()}（{"日月火水木金土"[date.getDay()]}
                            ）: {count}枠追加
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
            </div>
          </details>
        </div>
      </div>

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
                    // 日付ごとにグループ化
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
                    // 日付昇順で表示
                    return Object.values(grouped)
                      .sort((a, b) => a.date.getTime() - b.date.getTime())
                      .map(({ date, count }) => (
                        <li key={getLocalDateKey(date)} className="mb-1">
                          <span className="font-semibold">
                            {date.getFullYear()}/{date.getMonth() + 1}/
                            {date.getDate()}（{"日月火水木金土"[date.getDay()]}
                            ）
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
                      // FormData生成
                      const formData = new FormData();
                      formData.append("eventId", event.id);
                      pendingTimeSlots.forEach((slot) => {
                        // 日付+時間をISO文字列で組み立て
                        const y = slot.date.getFullYear();
                        const m = String(slot.date.getMonth() + 1).padStart(
                          2,
                          "0"
                        );
                        const d = String(slot.date.getDate()).padStart(2, "0");
                        const dateStr = `${y}-${m}-${d}`;
                        formData.append(
                          "start",
                          `${dateStr} ${slot.startTime}:00`
                        );
                        formData.append("end", `${dateStr} ${slot.endTime}:00`);
                      });
                      const res = await addEventDates(formData);
                      if (!res.success) {
                        // デバッグ用ログ出力
                        console.error("[日程追加エラー]", {
                          error: res.message,
                          pendingTimeSlots,
                          eventDates,
                          extendTo,
                          dailyPattern: extractDailyPatterns(eventDates),
                        });
                        setAddModalError(res.message || "追加に失敗しました");
                        setAddModalState("error");
                      } else {
                        setAddModalState("success");
                        setShowToast({
                          message: `${pendingTimeSlots.length}件の日程を追加しました`,
                          key: Date.now(),
                        });
                        setTimeout(() => {
                          setAddModalState(null);
                          setPendingTimeSlots([]); // ここだけでリセット
                          setAddModalError(null);
                        }, 1200);
                        router.refresh();
                      }
                    } catch (e: unknown) {
                      // デバッグ用ログ出力
                      console.error("[日程追加例外]", {
                        error: e,
                        pendingTimeSlots,
                        eventDates,
                        extendTo,
                        dailyPattern: extractDailyPatterns(eventDates),
                      });
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

      {/* 過去のイベント履歴セクション */}
      <EventHistory maxDisplay={3} />
    </>
  );
}
