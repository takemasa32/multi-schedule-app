'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  createManualScheduleTemplate,
  fetchUserScheduleTemplates,
  removeScheduleTemplate,
} from '@/lib/schedule-actions';

type ScheduleTemplate = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  availability: boolean;
  source: string;
  sample_count: number;
};

const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];

export default function AccountScheduleTemplates() {
  const { status } = useSession();
  const [manualTemplates, setManualTemplates] = useState<ScheduleTemplate[]>([]);
  const [learnedTemplates, setLearnedTemplates] = useState<ScheduleTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    weekday: 1,
    startTime: '09:00',
    endTime: '18:00',
    availability: true,
  });

  const loadTemplates = useCallback(async () => {
    if (status !== 'authenticated') return;
    setIsLoading(true);
    const data = await fetchUserScheduleTemplates();
    setManualTemplates(data.manual);
    setLearnedTemplates(data.learned);
    setIsLoading(false);
  }, [status]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const handleCreate = async () => {
    setMessage(null);
    const result = await createManualScheduleTemplate({
      weekday: formState.weekday,
      startTime: formState.startTime,
      endTime: formState.endTime,
      availability: formState.availability,
    });

    if (!result.success) {
      setMessage(result.message ?? 'テンプレの追加に失敗しました');
      return;
    }
    setMessage('テンプレを追加しました');
    await loadTemplates();
  };

  const handleRemove = async (templateId: string) => {
    setMessage(null);
    const result = await removeScheduleTemplate(templateId);
    if (!result.success) {
      setMessage('テンプレの削除に失敗しました');
      return;
    }
    setMessage('テンプレを削除しました');
    await loadTemplates();
  };

  if (status !== 'authenticated') {
    return (
      <div className="bg-base-200 rounded-lg p-4 text-sm text-gray-500">
        ログインすると予定テンプレを管理できます。
      </div>
    );
  }

  return (
    <div className="bg-base-100 rounded-lg border p-4 shadow-sm">
      <h3 className="mb-2 text-lg font-semibold">マイ予定テンプレ</h3>
      <p className="mb-4 text-sm text-gray-500">
        週次で使う予定（可/不可）を登録すると、新規回答時の自動反映に使われます。
      </p>

      <div className="grid gap-2 md:grid-cols-5">
        <label className="form-control">
          <span className="label-text text-sm">曜日</span>
          <select
            className="select select-bordered"
            value={formState.weekday}
            onChange={(e) => setFormState({ ...formState, weekday: Number(e.target.value) })}
          >
            {weekdayLabels.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="form-control">
          <span className="label-text text-sm">開始</span>
          <input
            type="time"
            className="input input-bordered"
            value={formState.startTime}
            onChange={(e) => setFormState({ ...formState, startTime: e.target.value })}
          />
        </label>
        <label className="form-control">
          <span className="label-text text-sm">終了</span>
          <input
            type="time"
            className="input input-bordered"
            value={formState.endTime}
            onChange={(e) => setFormState({ ...formState, endTime: e.target.value })}
          />
        </label>
        <label className="form-control">
          <span className="label-text text-sm">可否</span>
          <select
            className="select select-bordered"
            value={formState.availability ? 'available' : 'unavailable'}
            onChange={(e) =>
              setFormState({ ...formState, availability: e.target.value === 'available' })
            }
          >
            <option value="available">可</option>
            <option value="unavailable">不可</option>
          </select>
        </label>
        <div className="flex items-end">
          <button type="button" onClick={handleCreate} className="btn btn-primary w-full">
            追加
          </button>
        </div>
      </div>

      {message && <p className="mt-2 text-sm text-info">{message}</p>}

      <div className="mt-4">
        <h4 className="mb-2 text-sm font-semibold">手動テンプレ</h4>
        {isLoading ? (
          <p className="text-sm text-gray-500">読み込み中...</p>
        ) : manualTemplates.length === 0 ? (
          <p className="text-sm text-gray-500">登録済みのテンプレはありません。</p>
        ) : (
          <ul className="divide-base-200 divide-y">
            {manualTemplates.map((template) => (
              <li key={template.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {weekdayLabels[template.weekday]} {template.start_time}-{template.end_time}{' '}
                  {template.availability ? '可' : '不可'}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => handleRemove(template.id)}
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4">
        <h4 className="mb-2 text-sm font-semibold">学習テンプレ（自動）</h4>
        {learnedTemplates.length === 0 ? (
          <p className="text-sm text-gray-500">学習データはまだありません。</p>
        ) : (
          <ul className="divide-base-200 divide-y">
            {learnedTemplates.map((template) => (
              <li key={template.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {weekdayLabels[template.weekday]} {template.start_time}-{template.end_time}{' '}
                  {template.availability ? '可' : '不可'}
                  <span className="ml-2 text-xs text-gray-400">
                    学習:{template.sample_count}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
