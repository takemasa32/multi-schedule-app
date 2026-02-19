import React from 'react';
import type { Participant } from '@/types/participant';
import { formatDate, formatTime } from './date-utils';

interface DetailedViewProps {
  eventDates: Array<{
    id: string;
    start_time: string;
    end_time: string;
    label?: string;
  }>;
  participants: Participant[];
  isParticipantAvailable: (participantId: string, dateId: string) => boolean | null;
  finalizedDateIds: string[];
  onEditClick?: (participantId: string, participantName: string) => void;
  publicToken?: string;
  myParticipantId?: string | null;
}

/**
 * 詳細表示モード（個人ごとの回答詳細）
 */
const DetailedView: React.FC<DetailedViewProps> = ({
  eventDates,
  participants,
  isParticipantAvailable,
  finalizedDateIds,
  onEditClick,
  publicToken,
  myParticipantId = null,
}) => {
  return (
    <div className="fade-in mt-4 overflow-x-auto">
      <div className="relative">
        <table className="table-xs table w-full min-w-[400px]">
          <thead>
            <tr>
              <th className="bg-base-200 sticky left-0 z-20 min-w-[90px] whitespace-nowrap text-xs shadow-md sm:text-sm">
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
                const formattedTime = formatTime(date.start_time, eventDates).replace(/^0/, '');

                return (
                  <th
                    key={date.id}
                    className={`whitespace-nowrap text-center text-xs sm:text-sm ${
                      finalizedDateIds?.includes(date.id) ? 'bg-success bg-opacity-10' : ''
                    }`}
                  >
                    {!isSameDay && formatDate(date.start_time)}
                    <div className="text-xs">{formattedTime}</div>
                    {finalizedDateIds?.includes(date.id) && (
                      <span className="badge badge-xs badge-success mt-1 block">確定</span>
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
                className={`hover:bg-base-200 transition-colors ${
                  myParticipantId === participant.id ? 'bg-success/5' : ''
                }`}
              >
                <td className="bg-base-100 sticky left-0 z-10 whitespace-nowrap font-medium">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span>{participant.name}</span>
                      {myParticipantId === participant.id && (
                        <span className="badge badge-xs badge-success ml-2">自分の回答</span>
                      )}
                      {participant.comment && (
                        <div className="break-words text-xs text-gray-500">
                          {participant.comment}
                        </div>
                      )}
                    </div>
                    {onEditClick ? (
                      <button
                        onClick={() => onEditClick(participant.id, participant.name)}
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
                  </div>
                </td>
                {eventDates.map((date) => {
                  const isAvailable = isParticipantAvailable(participant.id, date.id);
                  const isFinalized = finalizedDateIds?.includes(date.id);
                  return (
                    <td
                      key={date.id}
                      className={`text-center transition-colors ${
                        isFinalized ? 'bg-success bg-opacity-10' : ''
                      }`}
                    >
                      {isAvailable === true && (
                        <div className="text-success bg-success mx-auto flex h-6 w-6 animate-fadeIn items-center justify-center rounded-full bg-opacity-10 font-bold">
                          ○
                        </div>
                      )}
                      {isAvailable === false && (
                        <div className="text-error bg-error mx-auto flex h-6 w-6 animate-fadeIn items-center justify-center rounded-full bg-opacity-10 font-bold">
                          ×
                        </div>
                      )}
                      {isAvailable === null && (
                        <div className="mx-auto flex h-6 w-6 items-center justify-center text-gray-300">
                          {/* 未回答セルも中央揃えで表示 */}-
                        </div>
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
