import React from "react";
import { formatDate, formatTime } from "./date-utils";

interface DetailedViewProps {
  eventDates: Array<{
    id: string;
    start_time: string;
    end_time: string;
    label?: string;
  }>;
  participants: Array<{
    id: string;
    name: string;
  }>;
  isParticipantAvailable: (
    participantId: string,
    dateId: string
  ) => boolean | null;
  finalizedDateIds: string[];
  onMouseEnter: (e: React.MouseEvent, dateId: string) => void;
  onMouseLeave: () => void;
  onClick: (
    e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>,
    dateId: string
  ) => void;
  onEditClick?: (participantId: string, participantName: string) => void;
  publicToken?: string;
}

/**
 * 詳細表示モード（個人ごとの回答詳細）
 */
const DetailedView: React.FC<DetailedViewProps> = ({
  eventDates,
  participants,
  isParticipantAvailable,
  finalizedDateIds,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onEditClick,
  publicToken,
}) => {
  return (
    <div className="mt-4 overflow-x-auto fade-in">
      <div className="relative">
        <table className="table table-xs w-full min-w-[400px]">
          <thead>
            <tr>
              <th className="sticky left-0 bg-base-200 z-20 text-xs sm:text-sm min-w-[90px] whitespace-nowrap shadow-md">
                参加者
              </th>
              {eventDates.map((date, index, arr) => {
                const currentDate = new Date(date.start_time);
                let prevDate = null;

                if (index > 0) {
                  prevDate = new Date(arr[index - 1].start_time);
                }

                const isSameDay =
                  prevDate &&
                  currentDate.getDate() === prevDate.getDate() &&
                  currentDate.getMonth() === prevDate.getMonth() &&
                  currentDate.getFullYear() === prevDate.getFullYear();

                // 時刻表示を簡素化
                const formattedTime = formatTime(
                  date.start_time,
                  eventDates
                ).replace(/^0/, "");

                return (
                  <th
                    key={date.id}
                    className={`text-center whitespace-nowrap text-xs sm:text-sm ${
                      finalizedDateIds?.includes(date.id)
                        ? "bg-success bg-opacity-10"
                        : ""
                    }`}
                  >
                    {!isSameDay && formatDate(date.start_time)}
                    <div className="text-xs">{formattedTime}</div>
                    {finalizedDateIds?.includes(date.id) && (
                      <span className="block badge badge-xs badge-success mt-1">
                        確定
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {participants.map((participant) => (
              <tr
                key={participant.id}
                className="hover:bg-base-200 transition-colors"
              >
                <td className="whitespace-nowrap font-medium sticky left-0 bg-base-100 z-10 flex items-center justify-between gap-2">
                  <span>{participant.name}</span>
                  {onEditClick ? (
                    <button
                      onClick={() =>
                        onEditClick(participant.id, participant.name)
                      }
                      className="btn btn-ghost btn-xs tooltip tooltip-right"
                      data-tip="この参加者の予定を編集"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                  ) : (
                    <a
                      href={`/event/${publicToken}/input?participant_id=${participant.id}`}
                      className="btn btn-ghost btn-xs tooltip tooltip-right"
                      data-tip="この参加者の予定を編集"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </a>
                  )}
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
                      className={`text-center transition-colors cursor-pointer ${
                        isFinalized ? "bg-success bg-opacity-10" : ""
                      }`}
                      onMouseEnter={(e) => onMouseEnter(e, date.id)}
                      onMouseLeave={onMouseLeave}
                      onClick={(e) => onClick(e, date.id)}
                      onTouchStart={(e) => onClick(e, date.id)}
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
    </div>
  );
};

export default DetailedView;
