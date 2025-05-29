"use client";
import Link from "next/link";
import { CalendarLinks } from "@/components/calendar-links";
import { addEventToHistory } from "@/lib/utils";

import { EventDate } from "./event-details-section";

interface EventFormSectionProps {
  event: {
    id: string;
    title: string;
    description: string | null;
    public_token: string;
    is_finalized: boolean;
    final_date_id?: string | null;
  };
  eventDates: EventDate[];
  participants: { id: string; name: string }[];
}

export default function EventFormSection({
  event,
  eventDates,
  participants,
}: EventFormSectionProps) {
  // 確定済み日程のローカル変換
  let finalizedDates: EventDate[] = [];
  if (event.is_finalized && event.final_date_id) {
    finalizedDates = eventDates.filter((d) => d.id === event.final_date_id);
  }

  // 履歴追加（初回のみ）
  addEventToHistory(
    {
      id: event.public_token,
      title: event.title,
      createdAt: new Date().toISOString(),
      isCreatedByMe: false,
    },
    30
  );

  return (
    <>
      {/* 確定済み日程表示・カレンダー連携 */}
      {event.is_finalized && finalizedDates.length > 0 && (
        <div>
          <div className="alert alert-success mb-8">
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
        </div>
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
            >
              新しく回答する
            </Link>
            {/* 既存の回答を編集ボタン（参加者が1人以上いる場合のみ） */}
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
    </>
  );
}
