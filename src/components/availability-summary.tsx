"use client";

import { useState, useMemo } from "react";

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
  finalizedDateIds?: string[] | null;
}

type ViewMode = "list" | "heatmap" | "detailed";

export default function AvailabilitySummary({
  eventDates,
  participants,
  availabilities,
  finalizedDateIds = [],
}: AvailabilitySummaryProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("heatmap");

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

  // 曜日を抽出
  const getDayOfWeek = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", { weekday: "short" });
  };

  // 日付だけを抽出 (YYYY/MM/DD形式)
  const getDateString = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  };

  // 日付をまとめる (重複を排除)
  const uniqueDates = useMemo(() => {
    const dateMap = new Map();

    eventDates.forEach((date) => {
      const dateKey = getDateString(date.start_time);
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: dateKey,
          dayOfWeek: getDayOfWeek(date.start_time),
          dateObj: new Date(date.start_time),
        });
      }
    });

    return Array.from(dateMap.values()).sort(
      (a, b) => a.dateObj.getTime() - b.dateObj.getTime()
    );
  }, [eventDates]);

  // 時間帯をまとめる (重複を排除)
  const uniqueTimeSlots = useMemo(() => {
    const timeMap = new Map();

    eventDates.forEach((date) => {
      const startTimeObj = new Date(date.start_time);
      const timeKey = `${startTimeObj
        .getHours()
        .toString()
        .padStart(2, "0")}:${startTimeObj
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
      if (!timeMap.has(timeKey)) {
        const endTimeObj = new Date(date.end_time);
        const endTimeKey = `${endTimeObj
          .getHours()
          .toString()
          .padStart(2, "0")}:${endTimeObj
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;
        timeMap.set(timeKey, {
          startTime: timeKey,
          endTime: endTimeKey,
          label: date.label || "",
          timeObj: startTimeObj,
        });
      }
    });

    return Array.from(timeMap.values()).sort(
      (a, b) =>
        a.timeObj.getHours() * 60 +
        a.timeObj.getMinutes() -
        (b.timeObj.getHours() * 60 + b.timeObj.getMinutes())
    );
  }, [eventDates]);

  // 集計計算: 日程ごとの参加可能者数
  const summary = useMemo(() => {
    return eventDates.map((date) => {
      const availableCount = availabilities.filter(
        (a) => a.event_date_id === date.id && a.availability
      ).length;
      const unavailableCount = availabilities.filter(
        (a) => a.event_date_id === date.id && !a.availability
      ).length;

      // ヒートマップの色の強さを計算（参加率に基づく）
      const totalResponses = availableCount + unavailableCount;
      const availabilityRate =
        totalResponses > 0 ? availableCount / totalResponses : 0;
      // 0-10の範囲で色の強さを計算
      const heatmapLevel = Math.round(availabilityRate * 10);

      return {
        dateId: date.id,
        startTime: date.start_time,
        endTime: date.end_time,
        label: date.label,
        availableCount,
        unavailableCount,
        heatmapLevel,
        availabilityRate,
        formattedDate: formatDate(date.start_time),
        formattedTime: `${formatTime(date.start_time)}〜${formatTime(
          date.end_time
        )}`,
        isSelected: finalizedDateIds?.includes(date.id) || false,
      };
    });
  }, [eventDates, availabilities, finalizedDateIds]);

  // 参加者が参加可能かどうかを判定
  const isParticipantAvailable = (participantId: string, dateId: string) => {
    const availability = availabilities.find(
      (a) => a.participant_id === participantId && a.event_date_id === dateId
    );
    return availability ? availability.availability : null;
  };

  // ヒートマップデータの取得 - 日付×時間のマトリックス
  const heatmapData = useMemo(() => {
    // 各日付×時間帯のセルデータを格納するマップ
    const cellMap = new Map();

    // イベント日程をマップに変換
    eventDates.forEach((date) => {
      const dateStr = getDateString(date.start_time);
      const timeStr = formatTime(date.start_time);
      const key = `${dateStr}_${timeStr}`;

      const availableCount = availabilities.filter(
        (a) => a.event_date_id === date.id && a.availability
      ).length;
      const unavailableCount = availabilities.filter(
        (a) => a.event_date_id === date.id && !a.availability
      ).length;

      const totalResponses = availableCount + unavailableCount;
      const availabilityRate =
        totalResponses > 0 ? availableCount / totalResponses : 0;
      const heatmapLevel = Math.round(availabilityRate * 10);

      cellMap.set(key, {
        dateId: date.id,
        availableCount,
        unavailableCount,
        heatmapLevel,
        isSelected: finalizedDateIds?.includes(date.id) || false,
      });
    });

    return cellMap;
  }, [eventDates, availabilities, finalizedDateIds]);

  // 参加者がまだいない場合は表示しない
  if (participants.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 bg-base-100 border rounded-lg shadow-sm transition-all">
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">みんなの回答状況</h2>

        {/* 表示切り替えタブ */}
        <div className="tabs tabs-boxed mb-4 bg-base-300 p-1 rounded-lg">
          <a
            className={`tab transition-all ${
              viewMode === "heatmap"
                ? "tab-active bg-primary text-primary-content font-medium"
                : "text-base-content"
            }`}
            onClick={() => setViewMode("heatmap")}
          >
            ヒートマップ表示
          </a>
          <a
            className={`tab transition-all ${
              viewMode === "detailed"
                ? "tab-active bg-primary text-primary-content font-medium"
                : "text-base-content"
            }`}
            onClick={() => setViewMode("detailed")}
          >
            個別表示
          </a>
          <a
            className={`tab transition-all ${
              viewMode === "list"
                ? "tab-active bg-primary text-primary-content font-medium"
                : "text-base-content"
            }`}
            onClick={() => setViewMode("list")}
          >
            リスト表示
          </a>
        </div>

        {/* リスト表示モード */}
        {viewMode === "list" && (
          <div className="overflow-x-auto fade-in">
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
                    className={`${
                      item.isSelected ? "bg-success bg-opacity-10" : ""
                    } hover:bg-base-200 transition-colors`}
                  >
                    <td className="whitespace-nowrap">
                      <span className="font-medium">{item.formattedDate}</span>
                      {item.label && (
                        <span className="ml-2 text-sm text-gray-500">
                          {item.label}
                        </span>
                      )}
                      {item.isSelected && (
                        <span className="badge badge-success badge-sm ml-2">
                          確定
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">{item.formattedTime}</td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="flex items-center">
                          <span className="w-3 h-3 rounded-full bg-success mr-1"></span>
                          <span className="font-medium">
                            {item.availableCount}
                          </span>
                        </div>
                        <span>/</span>
                        <div className="flex items-center">
                          <span className="w-3 h-3 rounded-full bg-error mr-1"></span>
                          <span className="font-medium">
                            {item.unavailableCount}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ヒートマップ表示モード */}
        {viewMode === "heatmap" && (
          <div className="overflow-x-auto fade-in">
            <div className="bg-base-100 p-2 mb-2 text-sm">
              <span className="font-medium">
                色が濃いほど参加可能な人が多い時間帯です
              </span>
            </div>
            <table className="table table-zebra w-full text-center">
              <thead>
                <tr className="bg-base-200">
                  <th className="text-left">時間 \ 日付</th>
                  {uniqueDates.map((dateInfo) => (
                    <th key={dateInfo.date} className="text-center px-2 py-3">
                      {dateInfo.date}
                      <br />
                      <span className="text-xs">({dateInfo.dayOfWeek})</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uniqueTimeSlots.map((timeSlot) => (
                  <tr key={timeSlot.startTime}>
                    <td className="text-left font-medium whitespace-nowrap">
                      {timeSlot.startTime}〜{timeSlot.endTime}
                    </td>
                    {uniqueDates.map((dateInfo) => {
                      const key = `${dateInfo.date}_${timeSlot.startTime}`;
                      const cellData = heatmapData.get(key);
                      const heatmapClass = cellData
                        ? `heatmap-${cellData.heatmapLevel}`
                        : "heatmap-0";
                      const isSelected = cellData?.isSelected || false;
                      const availableCount = cellData?.availableCount || 0;
                      const unavailableCount = cellData?.unavailableCount || 0;
                      const hasData = cellData !== undefined;

                      return (
                        <td
                          key={key}
                          className={`relative p-3 transition-all ${heatmapClass} ${
                            isSelected ? "ring-2 ring-success" : ""
                          }`}
                        >
                          {hasData ? (
                            <div className="flex flex-col items-center justify-center h-full">
                              <span className="font-bold">
                                {availableCount}
                              </span>
                              {unavailableCount > 0 && (
                                <span className="text-xs text-gray-500">
                                  ({unavailableCount})
                                </span>
                              )}
                              {isSelected && (
                                <div className="absolute top-0 right-0 w-2 h-2 bg-success rounded-full m-1"></div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-center items-center mt-3 gap-2 text-sm">
              <span>少ない</span>
              <div className="flex">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                  <div
                    key={level}
                    className={`heatmap-${level} w-4 h-4 border border-gray-200`}
                  ></div>
                ))}
              </div>
              <span>多い</span>
            </div>
          </div>
        )}

        {/* 詳細表示モード（個人ごとの回答詳細） */}
        {viewMode === "detailed" && (
          <div className="mt-4 overflow-x-auto fade-in">
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
                  <tr
                    key={participant.id}
                    className="hover:bg-base-200 transition-colors"
                  >
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
                          className={`text-center transition-colors ${
                            isFinalized ? "bg-success bg-opacity-10" : ""
                          }`}
                        >
                          {isAvailable === true && (
                            <div className="text-success font-bold w-6 h-6 rounded-full bg-success bg-opacity-10 flex items-center justify-center mx-auto animate-fadeIn">
                              ○
                            </div>
                          )}
                          {isAvailable === false && (
                            <div className="text-error font-bold w-6 h-6 rounded-full bg-error bg-opacity-10 flex items-center justify-center mx-auto animate-fadeIn">
                              ×
                            </div>
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
    </div>
  );
}
