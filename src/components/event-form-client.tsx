'use client';

import React, { useRef, useState, useTransition, useEffect } from 'react';
import { format } from 'date-fns';
import { createEvent, type CreateEventActionResult } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import DateRangePicker from './date-range-picker';
import ManualTimeSlotPicker from './manual-time-slot-picker';
import { TimeSlot, addEventToHistory, EVENT_HISTORY_SYNC_MAX_ITEMS } from '@/lib/utils';
import TermsCheckbox from './terms/terms-checkbox';
import useScrollToError from '@/hooks/useScrollToError';
import PortalTooltip from './common/portal-tooltip';

type CreateEventSuccess = Extract<CreateEventActionResult, { success: true }>;

const isCreateEventSuccess = (
  payload: CreateEventActionResult | undefined,
): payload is CreateEventSuccess => Boolean(payload && payload.success);

export default function EventFormClient() {
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [autoSlots, setAutoSlots] = useState<TimeSlot[]>([]);
  const [manualSlots, setManualSlots] = useState<TimeSlot[]>([]);
  /**
   * 候補日程の入力方式
   * - "auto": 期間から自動で作成（初期設定）
   * - "manual": カレンダーで手動選択
   */
  const [inputMode, setInputMode] = useState<'auto' | 'manual'>('auto');
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const errorRef = useRef<HTMLDivElement | null>(null);
  const [tipOpen, setTipOpen] = useState(false);
  const [tipAnchor, setTipAnchor] = useState<{ x: number; y: number } | null>(null);
  const [tipText, setTipText] = useState<string>('');
  const openTip = (e: React.MouseEvent, text: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTipAnchor({ x: rect.left, y: rect.bottom });
    setTipText(text);
    setTipOpen(true);
    e.stopPropagation();
  };

  // 入力方式変更時に表示するスロットを更新
  useEffect(() => {
    setTimeSlots(inputMode === 'auto' ? autoSlots : manualSlots);
  }, [inputMode, autoSlots, manualSlots]);

  // エラー発生時に自動スクロール
  useScrollToError(error, errorRef);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('タイトルは必須です');
      return;
    }
    if (timeSlots.length === 0) {
      setError('イベント設定が正しくありません。少なくとも1つの時間枠を設定してください');
      return;
    }
    if (!termsAccepted) {
      setError('利用規約への同意が必要です');
      return;
    }
    const formData = new FormData();
    formData.append('title', title);
    if (description.trim()) {
      formData.append('description', description);
    }

    timeSlots.forEach((slot) => {
      const dateStr = format(slot.date, 'yyyy-MM-dd');
      formData.append('startDates', dateStr);
      formData.append('startTimes', slot.startTime);
      formData.append('endDates', dateStr);
      formData.append('endTimes', slot.endTime);
    });

    startTransition(async () => {
      try {
        // サーバーアクションでイベント作成し、公開トークンを受け取る
        const result = (await createEvent(formData)) as CreateEventActionResult;

        if (!isCreateEventSuccess(result)) {
          setError(result?.message || 'イベント作成中にエラーが発生しました');
          return;
        }

        if (!result.publicToken) {
          setError('イベント作成中にエラーが発生しました');
          return;
        }

        // リダイレクト前に履歴に追加（ローカルストレージ）
        if (typeof window !== 'undefined') {
          const historyItem = {
            id: result.publicToken,
            title,
            createdAt: new Date().toISOString(),
            isCreatedByMe: true,
          };
          addEventToHistory(historyItem, EVENT_HISTORY_SYNC_MAX_ITEMS);
        }

        const redirectPath = result.redirectUrl ?? `/event/${result.publicToken}`;
        router.push(redirectPath);
      } catch (err) {
        console.error('Form submission error:', err);
        setError(err instanceof Error ? err.message : 'イベント作成中にエラーが発生しました');
      }
    });
  };

  const handleTimeSlotsChange = (newSlots: TimeSlot[]) => {
    if (inputMode === 'auto') {
      setAutoSlots(newSlots);
    } else {
      setManualSlots(newSlots);
    }
    setTimeSlots(newSlots);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="alert alert-error" role="alert" ref={errorRef}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 shrink-0 stroke-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          イベントタイトル
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          disabled={isPending}
          placeholder="例：〇〇の日程調整"
          aria-describedby="title-hint"
        />
        <p id="title-hint" className="mt-1 text-xs text-gray-500">
          イベントの目的や内容が分かるタイトルを入力してください（必須）
        </p>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          説明
        </label>
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          data-testid="event-description-input"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          rows={3}
          disabled={isPending}
          placeholder="（任意）備考や注意事項があれば記入してください。"
          aria-describedby="description-hint"
        />
        <p id="description-hint" className="mt-1 text-xs text-gray-500">
          （任意）イベントの詳細や参加者へのメッセージを記入できます
        </p>
      </div>

      <div className="card bg-base-100 border-base-300 border p-2 shadow-sm md:p-4">
        <h3 className="card-title mb-2 text-lg">候補日程の設定</h3>
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center">
            <span className="whitespace-nowrap font-medium">入力方式</span>
          </div>
          <label className="flex w-full cursor-pointer items-center justify-between gap-2 sm:w-auto">
            <span className="flex items-center gap-1 whitespace-nowrap text-sm">
              カレンダーで手動選択
              <button
                type="button"
                tabIndex={-1}
                className="btn btn-xs btn-circle btn-ghost h-5 min-h-0 w-5 p-0"
                aria-label="カレンダーで手動選択のヒント"
                onClick={(e) =>
                  openTip(
                    e,
                    'オンにすると、日付×時間の表が表示され、セルをドラッグ/タップでON/OFFできます。表は現在の設定（期間・時間帯・間隔）に連動します。',
                  )
                }
              >
                ?
              </button>
            </span>
            <input
              type="checkbox"
              role="switch"
              aria-label="カレンダーで手動選択"
              className="toggle toggle-primary"
              checked={inputMode === 'manual'}
              onChange={(e) => setInputMode(e.target.checked ? 'manual' : 'auto')}
            />
          </label>
        </div>
        {inputMode === 'auto' ? (
          <DateRangePicker onTimeSlotsChange={handleTimeSlotsChange} />
        ) : (
          <ManualTimeSlotPicker
            onTimeSlotsChange={handleTimeSlotsChange}
            initialSlots={manualSlots}
          />
        )}
        <p className="mt-2 text-xs text-gray-500">
          日付と時間帯を選択し、複数の候補枠を追加できます。最低1つ以上の時間枠を設定してください。
        </p>
      </div>
      <PortalTooltip
        open={tipOpen}
        anchor={tipAnchor}
        text={tipText}
        onClose={() => setTipOpen(false)}
      />
      <TermsCheckbox isChecked={termsAccepted} onChange={setTermsAccepted} id="event-form-terms" />
      <div className="mt-8 flex justify-end">
        <button
          type="submit"
          className={`btn btn-primary btn-lg ${isPending ? 'cursor-not-allowed opacity-50' : ''}`}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <span className="loading loading-spinner loading-sm mr-2" />
              イベント作成中...
            </>
          ) : (
            'イベントを作成'
          )}
        </button>
      </div>
    </form>
  );
}
