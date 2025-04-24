"use client";

import { useState } from "react";

interface AvailabilitySummaryProps {
  eventDates: {
    id: string;
    start_time: string;
    end_time: string;
    label?: string;
  }[];
  participants: { id: string; name: string }[];
  availabilities: {
    participant_id: string;
    event_date_id: string;
    availability: boolean;
  }[];
  finalizedDateIds?: string[] | null; // 複数の確定日程IDを受け取るように変更
}

export default function AvailabilitySummary({
  eventDates,
  participants,
  availabilities,
  finalizedDateIds = [],
}: AvailabilitySummaryProps) {
  const [showDetailedView, setShowDetailedView] = useState(false);

  // 日付を読みやすい形式にフォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      month: "numeric",
      day: "numeric",
      weekday: "short",
    });
  };

  // 時間をフォーマット
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    // 00:00の場合は24:00として表示
    if (date.getHours() === 0 && date.getMinutes() === 0) {
      return "24:00";
    } else {
      return date.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  // 集計計算: 日程ごとの参加可能者数
  const calculateSummary = () => {
    return eventDates.map((date) => {
      const availableCount = availabilities.filter(
        (a) => a.event_date_id === date.id && a.availability
      ).length;
      const unavailableCount = availabilities.filter(
        (a) => a.event_date_id === date.id && !a.availability
      ).length;

      return {
        dateId: date.id,
        startTime: date.start_time,
        endTime: date.end_time,
        label: date.label,
        availableCount,
        unavailableCount,
        formattedDate: formatDate(date.start_time),
        formattedTime: `${formatTime(date.start_time)}〜${formatTime(
          date.end_time
        )}`,
        isSelected: finalizedDateIds?.includes(date.id) || false, // 複数の確定日程をチェック
      };
    });
  };

  const summary = calculateSummary();

  // 参加者が参加可能かどうかを判定
  const isParticipantAvailable = (participantId: string, dateId: string) => {
    const availability = availabilities.find(
      (a) => a.participant_id === participantId && a.event_date_id === dateId
    );
    return availability ? availability.availability : null;
  };

  // 参加者がまだいない場合は表示しない
  if (participants.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 bg-base-100 border rounded-lg shadow-sm">
      <h2 className="text-xl font-bold mb-4">みんなの回答状況</h2>

      {/* サマリー表示（常に表示） */}
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>日程</th>
              <th>時間</th>
              <th className="text-center">参加可能 / 不可</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((item) => (
              <tr
                key={item.dateId}
                className={item.isSelected ? "bg-success bg-opacity-10" : ""}
              >
                <td className="whitespace-nowrap">
                  <span className="font-medium">{item.formattedDate}</span>
                  {item.label && (
                    <span className="ml-2 text-sm text-gray-500">
                      {item.label}
                    </span>
                  )}
                  {item.isSelected && (
                    <span className="badge badge-success ml-2">確定</span>
                  )}
                </td>
                <td className="whitespace-nowrap">{item.formattedTime}</td>
                <td className="text-center">
                  <span className="text-success font-medium">
                    {item.availableCount}
                  </span>
                  {" / "}
                  <span className="text-error font-medium">
                    {item.unavailableCount}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 詳細表示切り替えボタン */}
      <div className="mt-4 text-center">
        <button
          className="btn btn-outline btn-sm"
          onClick={() => setShowDetailedView(!showDetailedView)}
        >
          {showDetailedView ? "詳細を閉じる" : "詳細を表示"}
        </button>
      </div>

      {/* 詳細表示（参加者ごとの表） */}
      {showDetailedView && (
        <div className="mt-4 overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>参加者</th>
                {eventDates.map((date) => (
                  <th
                    key={date.id}
                    className={`text-center whitespace-nowrap ${
                      finalizedDateIds?.includes(date.id)
                        ? "bg-success bg-opacity-10"
                        : ""
                    }`}
                  >
                    {formatDate(date.start_time)}
                    <br />
                    <span className="text-xs">
                      {formatTime(date.start_time)}
                    </span>
                    {finalizedDateIds?.includes(date.id) && (
                      <span className="block badge badge-xs badge-success mt-1">
                        確定
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {participants.map((participant) => (
                <tr key={participant.id}>
                  <td className="whitespace-nowrap font-medium">
                    {participant.name}
                  </td>
                  {eventDates.map((date) => {
                    const isAvailable = isParticipantAvailable(
                      participant.id,
                      date.id
                    );
                    const isFinalized = finalizedDateIds?.includes(date.id);
                    return (
                      <td
                        key={date.id}
                        className={`text-center ${
                          isFinalized ? "bg-success bg-opacity-10" : ""
                        }`}
                      >
                        {isAvailable === true && (
                          <span className="text-success">○</span>
                        )}
                        {isAvailable === false && (
                          <span className="text-error">×</span>
                        )}
                        {isAvailable === null && (
                          <span className="text-gray-300">-</span>
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
