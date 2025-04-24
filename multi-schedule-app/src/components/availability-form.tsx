'use client';

import { useState } from 'react';
import { submitAvailability } from '@/lib/actions';
import { formatDateTimeWithDay } from '@/lib/utils';

interface EventDate {
  id: string;
  event_id: string;
  date_time: string;
  label: string | null;
}

interface AvailabilityFormProps {
  eventToken: string;
  eventDates: EventDate[];
}

export function AvailabilityForm({ eventToken, eventDates }: AvailabilityFormProps) {
  const [name, setName] = useState('');
  const [availabilities, setAvailabilities] = useState<{[key: string]: boolean}>(
    eventDates.reduce((acc, date) => ({...acc, [date.id]: false}), {})
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ローカルストレージから名前を復元（あれば）
  useState(() => {
    const savedName = localStorage.getItem('participant_name');
    if (savedName) {
      setName(savedName);
    }
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleAvailabilityChange = (dateId: string, checked: boolean) => {
    setAvailabilities(prev => ({
      ...prev,
      [dateId]: checked
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // バリデーション
    if (!name.trim()) {
      setError('お名前を入力してください');
      return;
    }

    setIsSubmitting(true);

    try {
      // 名前をローカルストレージに保存
      localStorage.setItem('participant_name', name);

      // フォームデータの準備
      const formData = new FormData();
      formData.append('participant_name', name);
      formData.append('event_token', eventToken);

      // 各日程の回答状態を追加
      Object.entries(availabilities).forEach(([dateId, isAvailable]) => {
        if (isAvailable) {
          formData.append(`availability_${dateId}`, 'on');
        }
      });

      // Server Actionの呼び出し
      await submitAvailability(formData);
      
      // 成功メッセージ表示（実際にはページが再レンダリングされるため表示されない可能性が高い）
      setSuccess(true);
      
    } catch (err: unknown) {
      console.error('回答送信エラー:', err);
      setError(err instanceof Error ? err.message : '回答の送信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card bg-base-100 shadow-lg">
      <div className="card-body">
        <h2 className="card-title text-xl mb-4">回答フォーム</h2>

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success mb-4">
            <span>回答を送信しました！</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" htmlFor="participant_name">
              お名前 *
            </label>
            <input
              id="participant_name"
              type="text"
              className="input input-bordered w-full"
              value={name}
              onChange={handleNameChange}
              placeholder="例：山田太郎"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              ※同じ名前で再回答すると上書きされます
            </p>
          </div>

          <div className="mb-6">
            <p className="block text-sm font-medium mb-3">参加可能な日程にチェックしてください *</p>
            
            <div className="space-y-3">
              {eventDates.map(date => (
                <div key={date.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`date-${date.id}`}
                    className="checkbox checkbox-primary"
                    checked={availabilities[date.id]}
                    onChange={e => handleAvailabilityChange(date.id, e.target.checked)}
                  />
                  <label htmlFor={`date-${date.id}`} className="ml-3 select-none">
                    {formatDateTimeWithDay(date.date_time)}
                    {date.label && <span className="ml-2 text-gray-500">({date.label})</span>}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="card-actions justify-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  送信中...
                </>
              ) : (
                '回答を送信'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}