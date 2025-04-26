"use client";

import { useState } from "react";
import AvailabilityForm from "@/components/availability-form";
import AvailabilitySummary from "@/components/availability-summary";
import { CalendarLinks } from "@/components/calendar-links";
import FinalizeEventSection from "@/components/finalize-event-section";

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
  adminToken: string | null;
}

export default function EventClientWrapper({
  event,
  eventDates,
  participants,
  availabilities,
  finalizedDateIds,
  isAdmin,
  adminToken,
}: EventClientWrapperProps) {
  // 参加者の編集モードを管理
  const [editingParticipant, setEditingParticipant] = useState<{
    id: string;
    name: string;
    availabilities: Record<string, boolean>;
  } | null>(null);

  // 編集対象の参加者情報をセット
  const handleEditParticipant = (
    participantId: string,
    participantName: string,
    participantAvailabilities: Record<string, boolean>
  ) => {
    setEditingParticipant({
      id: participantId,
      name: participantName,
      availabilities: participantAvailabilities,
    });
    // ページの先頭にスクロール
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 編集キャンセル
  const handleCancelEdit = () => {
    setEditingParticipant(null);
  };

  // 編集完了後のフィードバック
  const handleEditComplete = () => {
    setEditingParticipant(null);
    // 編集が完了したら、ページをリロードして最新データを表示
    window.location.reload();
  };

  // 確定された日程の詳細情報を取得
  const finalizedDates = eventDates.filter((date) =>
    finalizedDateIds.includes(date.id)
  );

  return (
    <>
      {editingParticipant ? (
        // 参加者編集モード
        <div className="card bg-base-100 shadow-md mb-8">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">
              参加者「{editingParticipant.name}」の予定を編集
            </h2>
            <div className="bg-warning bg-opacity-10 p-4 rounded-lg mb-4">
              <p className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="stroke-warning flex-shrink-0 w-6 h-6 mr-2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                送信済みの予定を編集しています。
              </p>
            </div>
            <AvailabilityForm
              eventId={event.id}
              publicToken={event.public_token}
              eventDates={eventDates}
              existingResponses={{
                participantName: editingParticipant.name,
                availabilities: editingParticipant.availabilities,
                participantId: editingParticipant.id, // 既存の参加者IDを渡す
              }}
              onEditComplete={handleEditComplete}
              onCancelEdit={handleCancelEdit}
              isEditMode={true}
            />
          </div>
        </div>
      ) : event.is_finalized && finalizedDates.length > 0 ? (
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

          <div className="card bg-base-100 shadow-md mb-8 mt-8">
            <div className="card-body">
              <h3 className="card-title text-lg">引き続き回答できます</h3>
              <p className="text-sm text-gray-600 mb-4">
                イベントは確定していますが、引き続き回答を更新できます。
              </p>
              <AvailabilityForm
                eventId={event.id}
                publicToken={event.public_token}
                eventDates={eventDates}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="card bg-base-100 shadow-md mb-8">
          <div className="card-body">
            <AvailabilityForm
              eventId={event.id}
              publicToken={event.public_token}
              eventDates={eventDates}
            />
          </div>
        </div>
      )}

      <div className="card bg-base-100 shadow-md mb-8">
        <div className="card-body">
          <h2 className="card-title text-xl mb-4">回答状況</h2>
          <AvailabilitySummary
            participants={participants}
            eventDates={eventDates}
            availabilities={availabilities}
            finalizedDateIds={finalizedDateIds}
            eventId={event.id}
            publicToken={event.public_token}
            onEditParticipant={handleEditParticipant}
          />
        </div>
      </div>

      {isAdmin && !event.is_finalized && adminToken && (
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">管理者メニュー</h2>
            <FinalizeEventSection
              eventId={event.id}
              adminToken={adminToken}
              eventDates={eventDates}
              availabilities={availabilities}
              participants={participants}
            />
          </div>
        </div>
      )}
    </>
  );
}
