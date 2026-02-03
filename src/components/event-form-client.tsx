'use client';

import React, { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { format } from 'date-fns';
import { createEvent, type CreateEventActionResult } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import DateRangePicker, { DateRangeSettings } from './date-range-picker';
import ManualTimeSlotPicker from './manual-time-slot-picker';
import { TimeSlot, addEventToHistory, EVENT_HISTORY_SYNC_MAX_ITEMS } from '@/lib/utils';
import TermsCheckbox from './terms/terms-checkbox';
import useScrollToError from '@/hooks/useScrollToError';

type CreateEventSuccess = Extract<CreateEventActionResult, { success: true }>;

type InputMode = 'auto' | 'manual' | null;

type Step = 1 | 2 | 3;

type Step2SubStep = 'mode' | 'settings' | 'calendar';

const isCreateEventSuccess = (
  payload: CreateEventActionResult | undefined,
): payload is CreateEventSuccess => Boolean(payload && payload.success);

const inputModeLabel = (mode: InputMode) => {
  if (mode === 'auto') return '自動で作成';
  if (mode === 'manual') return '手動で選択';
  return '未選択';
};

const parseTimeToMinutes = (time: string) => {
  if (time === '24:00') return 24 * 60;
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

export default function EventFormClient() {
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [autoSlots, setAutoSlots] = useState<TimeSlot[]>([]);
  const [manualSlots, setManualSlots] = useState<TimeSlot[]>([]);
  const [manualCandidateSlots, setManualCandidateSlots] = useState<TimeSlot[]>([]);
  const [sharedSettings, setSharedSettings] = useState<DateRangeSettings | null>(null);
  const [manualSelectionSettingsKey, setManualSelectionSettingsKey] = useState<string | null>(null);
  const manualInteractionStartedRef = useRef(false);
  /**
   * 候補日程の入力方式
   * - "auto": 期間から自動で作成
   * - "manual": カレンダーで手動選択
   */
  const [inputMode, setInputMode] = useState<InputMode>(null);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [step2SubStep, setStep2SubStep] = useState<Step2SubStep>('mode');
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const errorRef = useRef<HTMLDivElement | null>(null);
  const stepIndicatorRef = useRef<HTMLDivElement | null>(null);
  const lastStepRef = useRef<{ currentStep: Step; step2SubStep: Step2SubStep } | null>(null);

  // 入力方式変更時に表示するスロットを更新
  useEffect(() => {
    if (inputMode === 'auto') {
      setTimeSlots(autoSlots);
      return;
    }
    if (inputMode === 'manual') {
      setTimeSlots(manualSlots);
      return;
    }
    setTimeSlots([]);
  }, [inputMode, autoSlots, manualSlots]);

  // エラー発生時に自動スクロール
  useScrollToError(error, errorRef);

  const validateStep1 = () => {
    if (!title.trim()) {
      setError('タイトルは必須です');
      return false;
    }
    return true;
  };

  const validateStep2Mode = () => {
    if (!inputMode) {
      setError('入力方式を選択してください');
      return false;
    }
    return true;
  };

  const validateStep2Settings = () => {
    if (timeSlots.length === 0) {
      setError('イベント設定が正しくありません。少なくとも1つの時間枠を設定してください');
      return false;
    }
    return true;
  };

  const validateManualSettings = () => {
    if (!sharedSettings?.startDate || !sharedSettings?.endDate) {
      setError('開始日と終了日を設定してください');
      return false;
    }
    if (manualCandidateSlots.length === 0) {
      setError('期間と時間帯を設定してください');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError(null);
    if (currentStep === 1) {
      if (!validateStep1()) return;
      setCurrentStep(2);
      setStep2SubStep('mode');
      return;
    }

    if (currentStep === 2 && step2SubStep === 'mode') {
      if (!validateStep2Mode()) return;
      setStep2SubStep('settings');
      return;
    }

    if (currentStep === 2 && step2SubStep === 'settings') {
      if (inputMode === 'manual') {
        if (!validateManualSettings()) return;
        if (
          sharedSettingsKey &&
          manualSlots.length > 0 &&
          manualSelectionSettingsKey &&
          manualSelectionSettingsKey !== sharedSettingsKey
        ) {
          setManualSlots([]);
          setManualSelectionSettingsKey(null);
        }
        setStep2SubStep('calendar');
        return;
      }
      if (!validateStep2Settings()) return;
      setCurrentStep(3);
      return;
    }

    if (currentStep === 2 && step2SubStep === 'calendar') {
      if (!validateStep2Settings()) return;
      setCurrentStep(3);
      return;
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentStep === 1) {
      return;
    }
    if (currentStep === 2) {
      if (step2SubStep === 'settings') {
        setStep2SubStep('mode');
        return;
      }
      if (step2SubStep === 'calendar') {
        setStep2SubStep('settings');
        return;
      }
      setCurrentStep(1);
      return;
    }
    if (currentStep === 3) {
      setCurrentStep(2);
      setStep2SubStep(inputMode === 'manual' ? 'calendar' : 'settings');
    }
  };

  useEffect(() => {
    if (currentStep === 2 && step2SubStep === 'calendar') {
      manualInteractionStartedRef.current = false;
    }
  }, [currentStep, step2SubStep]);

  useEffect(() => {
    if (!stepIndicatorRef.current) return;
    if (!lastStepRef.current) {
      lastStepRef.current = { currentStep, step2SubStep };
      return;
    }
    if (
      lastStepRef.current.currentStep === currentStep &&
      lastStepRef.current.step2SubStep === step2SubStep
    ) {
      return;
    }
    lastStepRef.current = { currentStep, step2SubStep };
    const headerOffset = 88;
    const elementTop = stepIndicatorRef.current.getBoundingClientRect().top + window.scrollY;
    const targetTop = Math.max(elementTop - headerOffset, 0);
    window.scrollTo({ top: targetTop, behavior: 'smooth' });
  }, [currentStep, step2SubStep]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (currentStep !== 3) {
      setError('入力内容を確認して次へ進んでください');
      return;
    }

    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }
    if (!validateStep2Mode()) {
      setCurrentStep(2);
      setStep2SubStep('mode');
      return;
    }
    if (!validateStep2Settings()) {
      setCurrentStep(2);
      setStep2SubStep(inputMode === 'manual' ? 'calendar' : 'settings');
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

  const autoInitialProps = sharedSettings
    ? {
        initialStartDate: sharedSettings.startDate,
        initialEndDate: sharedSettings.endDate,
        initialDefaultStartTime: sharedSettings.defaultStartTime,
        initialDefaultEndTime: sharedSettings.defaultEndTime,
        initialIntervalUnit: sharedSettings.intervalUnit,
      }
    : {};
  const sharedSettingsKey = useMemo(() => {
    if (!sharedSettings) return null;
    return JSON.stringify({
      startDate: sharedSettings.startDate?.toISOString() ?? null,
      endDate: sharedSettings.endDate?.toISOString() ?? null,
      defaultStartTime: sharedSettings.defaultStartTime,
      defaultEndTime: sharedSettings.defaultEndTime,
      intervalUnit: sharedSettings.intervalUnit,
    });
  }, [sharedSettings]);

  const handleTimeSlotsChange = (newSlots: TimeSlot[]) => {
    if (inputMode === 'auto') {
      setAutoSlots(newSlots);
    }
    if (inputMode === 'manual') {
      if (
        step2SubStep === 'calendar' &&
        manualSlots.length > 0 &&
        newSlots.length === 0 &&
        !manualInteractionStartedRef.current
      ) {
        return;
      }
      manualInteractionStartedRef.current = true;
      setManualSlots(newSlots);
      if (sharedSettingsKey) {
        setManualSelectionSettingsKey(sharedSettingsKey);
      }
    }
    setTimeSlots(newSlots);
  };

  const dateRangeSummary = useMemo(() => {
    if (timeSlots.length === 0) return '未設定';
    const dates = timeSlots.map((slot) => slot.date.getTime()).sort((a, b) => a - b);
    const start = new Date(dates[0]);
    const end = new Date(dates[dates.length - 1]);
    return `${format(start, 'yyyy-MM-dd')} 〜 ${format(end, 'yyyy-MM-dd')}`;
  }, [timeSlots]);

  const timeRangeSummary = useMemo(() => {
    if (timeSlots.length === 0) return '未設定';
    const startMinutes = timeSlots.map((slot) => parseTimeToMinutes(slot.startTime));
    const endMinutes = timeSlots.map((slot) => parseTimeToMinutes(slot.endTime));
    const minStart = Math.min(...startMinutes);
    const maxEnd = Math.max(...endMinutes);
    const formatMinutes = (minutes: number) => {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      const paddedHour = String(hour).padStart(2, '0');
      const paddedMinute = String(minute).padStart(2, '0');
      return `${paddedHour}:${paddedMinute}`;
    };
    return `${formatMinutes(minStart)} 〜 ${formatMinutes(maxEnd)}`;
  }, [timeSlots]);

  const stepLabel = useMemo(() => {
    if (currentStep === 1) return 'ステップ1: 基本情報';
    if (currentStep === 2 && step2SubStep === 'mode') return 'ステップ2-1: 入力方式の選択';
    if (currentStep === 2 && step2SubStep === 'settings') return 'ステップ2-2: 設定';
    if (currentStep === 2 && step2SubStep === 'calendar') return 'ステップ2-3: カレンダー選択';
    return 'ステップ3: 確認・作成';
  }, [currentStep, step2SubStep]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div ref={stepIndicatorRef} className="mb-2 overflow-x-auto">
        <ul className="steps w-full whitespace-nowrap text-xs sm:text-sm">
          <li className={`step ${currentStep >= 1 ? 'step-primary' : ''}`}>
            <span className="sm:hidden">基本</span>
            <span className="hidden sm:inline">基本情報</span>
          </li>
          <li className={`step ${currentStep >= 2 ? 'step-primary' : ''}`}>
            <span className="sm:hidden">候補</span>
            <span className="hidden sm:inline">候補日程</span>
          </li>
          <li className={`step ${currentStep >= 3 ? 'step-primary' : ''}`}>確認</li>
        </ul>
      </div>

      <div className="scroll-mt-24 text-base font-semibold">{stepLabel}</div>

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

      {currentStep === 1 && (
        <div className="space-y-6" data-testid="create-step-1">
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

          <div className="flex justify-end">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNext}
              data-testid="create-next"
            >
              次へ
            </button>
          </div>
        </div>
      )}

      {currentStep === 2 && step2SubStep === 'mode' && (
        <div className="space-y-4" data-testid="create-step-2-mode">
          <p className="text-xs text-gray-500">作成方法を選択してください。</p>
          <div role="radiogroup" aria-label="入力方式" className="grid gap-4 md:grid-cols-2">
            <label
              className={`card cursor-pointer border transition-all ${
                inputMode === 'auto' ? 'border-primary shadow-sm' : 'border-base-300'
              }`}
              data-testid="input-mode-auto"
            >
              <input
                type="radio"
                name="input-mode"
                className="sr-only"
                checked={inputMode === 'auto'}
                onChange={() => setInputMode('auto')}
                disabled={isPending}
              />
              <div className="card-body p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">自動で作成</h3>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-secondary">おすすめ</span>
                    {inputMode === 'auto' && <span className="badge badge-primary">選択中</span>}
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  期間と時間帯を入力すると候補枠を自動生成します。
                </p>
                <div className="mt-3 text-xs text-gray-500">
                  <p>向いている人: まとめて候補枠を作りたい方</p>
                  <p>できること: 期間内の時間枠を一括生成</p>
                  <p>所要感: 1〜2分</p>
                </div>
              </div>
            </label>
            <label
              className={`card cursor-pointer border transition-all ${
                inputMode === 'manual' ? 'border-primary shadow-sm' : 'border-base-300'
              }`}
              data-testid="input-mode-manual"
            >
              <input
                type="radio"
                name="input-mode"
                className="sr-only"
                checked={inputMode === 'manual'}
                onChange={() => setInputMode('manual')}
                disabled={isPending}
              />
              <div className="card-body p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">手動で選択</h3>
                  {inputMode === 'manual' && <span className="badge badge-primary">選択中</span>}
                </div>
                <p className="mt-2 text-sm text-gray-600">カレンダー表で候補枠を直接選びます。</p>
                <div className="mt-3 text-xs text-gray-500">
                  <p>向いている人: 候補枠を細かく調整したい方</p>
                  <p>できること: 表をドラッグして柔軟に選択</p>
                  <p>所要感: 2〜3分</p>
                </div>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <button type="button" className="btn" onClick={handleBack}>
              戻る
            </button>
            <button type="button" className="btn btn-primary" onClick={handleNext}>
              次へ
            </button>
          </div>
        </div>
      )}

      {currentStep === 2 && step2SubStep === 'settings' && (
        <div className="space-y-6" data-testid="create-step-2-settings">
          <p className="text-sm text-gray-500">候補日程の期間と時間帯を設定してください。</p>

          <div className="space-y-2">
            <h3 className="text-base font-semibold">候補日程の設定</h3>
            {inputMode === 'auto' && (
              <DateRangePicker
                onTimeSlotsChange={handleTimeSlotsChange}
                onSettingsChange={setSharedSettings}
                {...autoInitialProps}
              />
            )}
            {inputMode === 'manual' && (
              <DateRangePicker
                onTimeSlotsChange={setManualCandidateSlots}
                onSettingsChange={setSharedSettings}
                allowPastDates
                {...autoInitialProps}
              />
            )}
            <p className="mt-2 text-xs text-gray-500">
              日付と時間帯を選択し、複数の候補枠を追加できます。最低1つ以上の時間枠を設定してください。
            </p>
          </div>

          <div className="flex items-center justify-between">
            <button type="button" className="btn" onClick={handleBack}>
              戻る
            </button>
            <button type="button" className="btn btn-primary" onClick={handleNext}>
              {inputMode === 'manual' ? 'カレンダーへ' : '次へ'}
            </button>
          </div>
        </div>
      )}

      {currentStep === 2 && step2SubStep === 'calendar' && inputMode === 'manual' && (
        <div className="space-y-6" data-testid="create-step-2-calendar">
          <p className="text-sm text-gray-500">カレンダーで日程候補を選択してください。</p>

          <ManualTimeSlotPicker
            onTimeSlotsChange={handleTimeSlotsChange}
            initialSlots={manualSlots}
            showDateRangePicker={false}
            {...autoInitialProps}
          />

          <div className="flex items-center justify-between">
            <button type="button" className="btn" onClick={handleBack}>
              戻る
            </button>
            <button type="button" className="btn btn-primary" onClick={handleNext}>
              次へ
            </button>
          </div>
        </div>
      )}

      {currentStep === 3 && (
        <div className="space-y-6" data-testid="create-step-3">
          <div className="border-base-300 bg-base-100 rounded-md border p-4">
            <div className="text-sm font-semibold">入力内容の確認</div>
            <div className="mt-3 grid gap-2 text-sm text-gray-700">
              <div>
                <span className="font-semibold">タイトル:</span> {title || '未入力'}
              </div>
              <div>
                <span className="font-semibold">説明:</span> {description || '未入力'}
              </div>
              <div>
                <span className="font-semibold">入力方式:</span> {inputModeLabel(inputMode)}
              </div>
              <div>
                <span className="font-semibold">日付範囲:</span> {dateRangeSummary}
              </div>
              <div>
                <span className="font-semibold">時間帯:</span> {timeRangeSummary}
              </div>
            </div>
          </div>

          <TermsCheckbox
            isChecked={termsAccepted}
            onChange={setTermsAccepted}
            id="event-form-terms"
          />

          <div className="flex items-center justify-between">
            <button type="button" className="btn" onClick={handleBack} disabled={isPending}>
              戻る
            </button>
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
        </div>
      )}
    </form>
  );
}
