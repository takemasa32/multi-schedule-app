"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { CalendarLinks } from "@/components/calendar-links";
import FinalizeEventSection from "@/components/finalize-event-section";
import EventHistory from "@/components/event-history";
import { addEventToHistory } from "@/lib/utils";
import AvailabilitySummary from "../availability-summary/index";
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
  const [viewMode, setViewMode] = useState<"list" | "heatmap" | "detailed">(
    "heatmap"
  );
  // 参加者の表示/非表示トグル用ステート
  const [excludedParticipantIds, setExcludedParticipantIds] = useState<
    string[]
  >([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // 追加候補用のステート
  const [pendingTimeSlots, setPendingTimeSlots] = useState<TimeSlot[]>([]);
  const [addModalState, setAddModalState] = useState<
    "confirm" | "loading" | "success" | "error" | null
  >(null);
  const [addModalError, setAddModalError] = useState<string | null>(null);
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
          <AvailabilitySummary
            participants={participants}
            eventDates={eventDates}
            availabilities={availabilities}
            finalizedDateIds={finalizedDateIds}
            publicToken={event.public_token}
            viewMode={viewMode}
            setViewMode={setViewMode}
            excludedParticipantIds={excludedParticipantIds}
          />
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

      {/* 日程追加セクション（控えめな折りたたみUI） */}
      <div className="card bg-base-100 shadow-md border border-base-200 my-8">
        <div className="card-body">
          <details>
            <summary className="cursor-pointer font-bold text-lg mb-2">
              日程を追加する
            </summary>
            <div className="mt-4">
              {/* 日程追加フォーム */}
              <DateRangePicker
                onTimeSlotsChange={(timeSlots) => {
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setPendingTimeSlots(timeSlots);
                }}
              />
              <button
                className={`btn btn-primary mt-2 ${
                  addModalState === "loading" ? "loading" : ""
                }`}
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  if (
                    !Array.isArray(pendingTimeSlots) ||
                    pendingTimeSlots.length === 0
                  ) {
                    setErrorMessage("日程を選択してください");
                    return;
                  }
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
              {addModalState && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-base-200/80"
                  role="dialog"
                  aria-modal="true"
                >
                  <div className="bg-base-100 rounded-xl shadow-xl border border-base-300 p-6 w-full max-w-xs flex flex-col items-center">
                    {addModalState === "confirm" && (
                      <>
                        <div className="mb-4 text-center text-base font-semibold text-base-content">
                          選択した日程を追加します。よろしいですか？
                        </div>
                        <div className="flex gap-4 mt-2">
                          <button
                            className="btn btn-primary rounded-full px-6"
                            data-testid="confirm-add-dates"
                            onClick={async () => {
                              setAddModalState("loading");
                              setAddModalError(null);
                              // 一括送信
                              const fd = new FormData();
                              fd.set("eventId", event.id);
                              pendingTimeSlots.forEach((slot) => {
                                const dateStr = `${slot.date.getFullYear()}-${String(
                                  slot.date.getMonth() + 1
                                ).padStart(2, "0")}-${String(
                                  slot.date.getDate()
                                ).padStart(2, "0")}`;
                                const start = `${dateStr}T${slot.startTime}`;
                                const end = `${dateStr}T${slot.endTime}`;
                                fd.append("start", start);
                                fd.append("end", end);
                              });
                              const res = await addEventDates(fd);
                              if (!res.success) {
                                setAddModalError(
                                  res.message || "日程追加に失敗しました"
                                );
                                setAddModalState("error");
                              } else {
                                // UI更新を確実に反映
                                await new Promise((r) => setTimeout(r, 0));
                                setAddModalState("success");
                                // ペンディングはOKボタン押下時にクリア
                                // setPendingTimeSlots([]);
                              }
                            }}
                          >
                            OK
                          </button>
                          <button
                            className="btn btn-outline btn-secondary rounded-full px-6"
                            data-testid="cancel-add-dates"
                            onClick={() => setAddModalState(null)}
                          >
                            キャンセル
                          </button>
                        </div>
                      </>
                    )}
                    {addModalState === "loading" && (
                      <>
                        <div className="mb-4 text-center text-base font-semibold text-base-content">
                          日程を追加中...
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <span className="loading loading-spinner loading-lg" />
                          <div className="text-sm mt-2">処理中...</div>
                        </div>
                      </>
                    )}
                    {addModalState === "success" && (
                      <>
                        <div className="mb-4 text-center text-base font-semibold text-success">
                          日程を追加しました
                        </div>
                        <button
                          className="btn btn-primary rounded-full px-6"
                          onClick={() => {
                            setAddModalState(null);
                            setPendingTimeSlots([]);
                            router.refresh();
                          }}
                        >
                          OK
                        </button>
                      </>
                    )}
                    {addModalState === "error" && (
                      <>
                        <div className="mb-4 text-center text-base font-semibold text-error">
                          {addModalError || "日程追加に失敗しました"}
                        </div>
                        <button
                          className="btn btn-primary rounded-full px-6"
                          onClick={() => setAddModalState(null)}
                        >
                          OK
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
              {errorMessage && (
                <div className="alert alert-error mt-2 text-sm">
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="alert alert-success mt-2 text-sm">
                  {successMessage}
                </div>
              )}
              <div className="alert alert-info my-2 text-sm">
                追加した日程は既存の候補と重複しない場合のみ反映されます。
                必要な場合のみご利用ください。
              </div>
            </div>
          </details>
        </div>
      </div>

      {/* 過去のイベント履歴セクション */}
      <EventHistory maxDisplay={3} />
    </>
  );
}
