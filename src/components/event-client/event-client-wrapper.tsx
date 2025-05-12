"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { CalendarLinks } from "@/components/calendar-links";
import FinalizeEventSection from "@/components/finalize-event-section";
import EventHistory from "@/components/event-history";
import { addEventToHistory } from "@/lib/utils";
import AvailabilitySummary from "../availability-summary/index";

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

interface EventClientWrapperProps {
  event: {
    id: string;
    title: string;
    description: string | null;
    public_token: string;
    admin_token: string | null;
    is_finalized: boolean;
  };
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

  // 確定された日程の詳細情報を取得
  const finalizedDates = eventDates.filter((date) =>
    finalizedDateIds.includes(date.id)
  );

  // ページロード時にイベント履歴に追加
  useEffect(() => {
    // イベント情報を履歴に追加
    addEventToHistory({
      id: event.public_token,
      title: event.title,
      adminToken: isAdmin ? event.admin_token ?? undefined : undefined,
      createdAt: new Date().toISOString(),
      isCreatedByMe: isAdmin,
    });
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

      {/* 過去のイベント履歴セクション */}
      <EventHistory maxDisplay={3} />
    </>
  );
}
