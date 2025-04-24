'use client';

import { useState } from 'react';
import { formatDateTimeWithDay } from '@/lib/utils';
import { finalizeEvent } from '@/lib/actions';

interface EventDate {
  id: string;
  event_id: string;
  date_time: string;
  label: string | null;
}

interface Participant {
  id: string;
  name: string;
}

interface Availability {
  id: string;
  event_id: string;
  participant_id: string;
  event_date_id: string;
  availability: boolean;
}

interface AvailabilitySummaryProps {
  eventDates: EventDate[];
  participants: Participant[];
  availabilities: Availability[];
  isAdmin: boolean;
  eventId: string;
  adminToken?: string;
}

export function AvailabilitySummary({ 
  eventDates, 
  participants, 
  availabilities, 
  isAdmin, 
  eventId, 
  adminToken 
}: AvailabilitySummaryProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [confirmingDateId, setConfirmingDateId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 日程ごとの参加可能人数を集計
  const dateAvailabilityCounts = eventDates.map(date => {
    const availableCount = availabilities.filter(
      avail => avail.event_date_id === date.id && avail.availability
    ).length;
    const unavailableCount = availabilities.filter(
      avail => avail.event_date_id === date.id && !avail.availability
    ).length;
    
    return {
      date,
      availableCount,
      unavailableCount,
      totalResponses: availableCount + unavailableCount,
      availableParticipants: availabilities
        .filter(avail => avail.event_date_id === date.id && avail.availability)
        .map(avail => participants.find(p => p.id === avail.participant_id))
        .filter(Boolean) as Participant[]
    };
  }).sort((a, b) => {
    // 参加可能人数が多い順にソート（同数の場合は日付順）
    if (b.availableCount !== a.availableCount) {
      return b.availableCount - a.availableCount;
    }
    return new Date(a.date.date_time).getTime() - new Date(b.date.date_time).getTime();
  });

  // 参加者ごとの回答状況を集計するためのヘルパー関数
  const getParticipantAvailability = (participantId: string, dateId: string) => {
    const avail = availabilities.find(
      a => a.participant_id === participantId && a.event_date_id === dateId
    );
    return avail ? avail.availability : null;
  };

  // 日程確定ボタンのハンドラ
  const handleConfirmDate = async (dateId: string) => {
    if (!adminToken) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('event_id', eventId);
      formData.append('admin_token', adminToken);
      formData.append('date_id', dateId);

      // Server Actionの呼び出し
      await finalizeEvent(formData);
      
    } catch (err: unknown) {
      console.error('日程確定エラー:', err);
      setError(err instanceof Error ? err.message : '日程の確定に失敗しました。時間をおいて再度お試しください。');
      setIsSubmitting(false);
      setConfirmingDateId(null);
    }
  };

  // 確定するかの確認ダイアログ表示
  const confirmFinalizeDate = (dateId: string) => {
    setConfirmingDateId(dateId);
  };

  // 確定のキャンセル
  const cancelFinalize = () => {
    setConfirmingDateId(null);
  };

  if (participants.length === 0) {
    return (
      <div className="alert alert-info">
        まだ回答がありません。最初の回答が入ると結果がここに表示されます。
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>候補日程</th>
              <th className="text-center">○</th>
              <th className="text-center">×</th>
              {isAdmin && <th className="text-center">アクション</th>}
            </tr>
          </thead>
          <tbody>
            {dateAvailabilityCounts.map(({ date, availableCount, unavailableCount }) => (
              <tr key={date.id}>
                <td>
                  <div>
                    {formatDateTimeWithDay(date.date_time)}
                    {date.label && <span className="text-gray-500 ml-2">({date.label})</span>}
                  </div>
                </td>
                <td className="text-center font-bold text-success">{availableCount}</td>
                <td className="text-center font-bold text-error">{unavailableCount}</td>
                {isAdmin && (
                  <td className="text-center">
                    {confirmingDateId === date.id ? (
                      <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <button 
                          onClick={() => handleConfirmDate(date.id)}
                          className="btn btn-sm btn-success"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : (
                            '確定する'
                          )}
                        </button>
                        <button 
                          onClick={cancelFinalize}
                          className="btn btn-sm btn-ghost"
                          disabled={isSubmitting}
                        >
                          キャンセル
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => confirmFinalizeDate(date.id)}
                        className="btn btn-sm btn-outline btn-accent"
                      >
                        この日程で確定
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-center my-6">
        <button 
          className="btn btn-outline btn-sm"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? '詳細を隠す' : '詳細を表示する'}
        </button>
      </div>

      {showDetails && participants.length > 0 && (
        <div className="overflow-x-auto mt-4">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>参加者</th>
                {eventDates.map(date => (
                  <th key={date.id} className="text-center">
                    <div className="text-xs whitespace-normal max-w-[120px]">
                      {formatDateTimeWithDay(date.date_time)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {participants.map(participant => (
                <tr key={participant.id}>
                  <td>{participant.name}</td>
                  {eventDates.map(date => {
                    const avail = getParticipantAvailability(participant.id, date.id);
                    return (
                      <td key={date.id} className="text-center">
                        {avail === true && <span className="text-success font-bold">○</span>}
                        {avail === false && <span className="text-error font-bold">×</span>}
                        {avail === null && <span className="text-gray-400">-</span>}
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