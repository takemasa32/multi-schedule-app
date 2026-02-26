'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  fetchUserScheduleTemplates,
  upsertWeeklyTemplatesFromWeekdaySelections,
} from '@/lib/schedule-actions';
import { submitAvailability, checkParticipantExists } from '@/lib/actions';
import TermsCheckbox from './terms/terms-checkbox';
import useScrollToError from '@/hooks/useScrollToError';
import useSelectionDragController from '@/hooks/useSelectionDragController';
import { addDays, endOfWeek, startOfWeek } from 'date-fns';
import WeekNavigationBar from './week-navigation-bar';

interface AvailabilityFormProps {
  eventId: string;
  publicToken: string;
  eventDates: {
    id: string;
    start_time: string;
    end_time: string;
    label?: string;
  }[];
  // 既存の回答データがある場合はそれを受け取る
  initialParticipant?: {
    id: string;
    name: string;
    comment?: string | null;
  } | null;
  initialAvailabilities?: Record<string, boolean>;
  mode?: 'new' | 'edit';
  isAuthenticated?: boolean;
  hasSyncTargetEvents?: boolean;
  lockedDateIds?: string[];
  autoFillAvailabilities?: Record<string, boolean>;
  dailyAutoFillDateIds?: string[];
  overrideDateIds?: string[];
  coveredDateIds?: string[];
  uncoveredDateKeys?: string[];
  uncoveredDayCount?: number;
  requireWeeklyStep?: boolean;
  hasAccountSeedData?: boolean;
}

type WeekDay = '月' | '火' | '水' | '木' | '金' | '土' | '日';
type WeekDaySchedule = {
  selected: boolean;
  timeSlots: Record<string, boolean>;
};
type CellStatus = 'available' | 'unavailable' | 'empty';
type WizardStep = 1 | 2 | 3 | 4;
type WeeklyTemplatePayloadRow = {
  weekday: number;
  startTime: string;
  endTime: string;
  availability: boolean;
};

const toWeeklyTemplateSlotKey = (startTime: string, endTime: string): string => {
  const normalizedStartTime = startTime.slice(0, 5);
  const normalizedEndSource = endTime.slice(0, 5);
  const normalizedEndTime = normalizedEndSource === '24:00' ? '00:00' : normalizedEndSource;
  return `${normalizedStartTime}-${normalizedEndTime}`;
};

export default function AvailabilityForm({
  eventId,
  publicToken,
  eventDates,
  initialParticipant,
  initialAvailabilities = {},
  mode = 'new',
  isAuthenticated = false,
  hasSyncTargetEvents = false,
  lockedDateIds = [],
  autoFillAvailabilities = {},
  dailyAutoFillDateIds = [],
  overrideDateIds: initialOverrideDateIds = [],
  coveredDateIds: _coveredDateIds = [],
  uncoveredDateKeys: _uncoveredDateKeys = [],
  uncoveredDayCount = 0,
  requireWeeklyStep: _requireWeeklyStep = false,
  hasAccountSeedData: _hasAccountSeedData = false,
}: AvailabilityFormProps) {
  const isNewMode = mode === 'new';
  const showWeeklyStep = !isAuthenticated || uncoveredDayCount > 0;
  const weeklyStep = showWeeklyStep ? ((isNewMode ? 2 : 1) as WizardStep) : null;
  const heatmapStep: WizardStep = isNewMode
    ? ((showWeeklyStep ? 3 : 2) as WizardStep)
    : ((showWeeklyStep ? 2 : 1) as WizardStep);
  const confirmStep: WizardStep = isNewMode
    ? ((showWeeklyStep ? 4 : 3) as WizardStep)
    : ((showWeeklyStep ? 3 : 2) as WizardStep);

  const [name, setName] = useState(initialParticipant?.name || '');
  const [comment, setComment] = useState(initialParticipant?.comment || '');
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [weekdayInitialized, setWeekdayInitialized] = useState(false);
  const [showNameInputOnDuplicate, setShowNameInputOnDuplicate] = useState(false);
  const [isCheckingName, setIsCheckingName] = useState(false);
  // すべての日程に対して初期状態を設定
  const [selectedDates, setSelectedDates] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    // 初期値がある場合はそれを使用
    if (Object.keys(initialAvailabilities).length > 0) {
      return { ...initialState, ...initialAvailabilities };
    }
    // すべての日程に対してfalse（不可）を初期値として設定
    eventDates.forEach((date) => {
      initialState[date.id] = false;
    });
    return initialState;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [showGuestConfirm, setShowGuestConfirm] = useState(false);
  const [pendingSyncFormData, setPendingSyncFormData] = useState<FormData | null>(null);
  const [showWeeklySaveConfirm, setShowWeeklySaveConfirm] = useState(false);
  const [pendingWeeklyTemplates, setPendingWeeklyTemplates] = useState<WeeklyTemplatePayloadRow[]>(
    [],
  );
  const [isSavingWeeklyTemplates, setIsSavingWeeklyTemplates] = useState(false);
  const [isLoadingWeeklyTemplates, setIsLoadingWeeklyTemplates] = useState(false);
  const [isCheckingWeeklyTemplateChanges, setIsCheckingWeeklyTemplateChanges] = useState(false);
  const [weeklyTemplateLoadError, setWeeklyTemplateLoadError] = useState<string | null>(null);
  const [hasWeekdayEdits, setHasWeekdayEdits] = useState(false);
  const [hasManualWeeklyTemplates, setHasManualWeeklyTemplates] = useState(false);
  const [overrideDateIds, setOverrideDateIds] = useState<string[]>(initialOverrideDateIds);
  const [manuallyEditedDateIds, setManuallyEditedDateIds] = useState<Record<string, true>>({});
  const hasAutoFillAppliedRef = useRef(false);
  const wizardTitleRef = useRef<HTMLHeadingElement | null>(null);
  const previousStepRef = useRef<WizardStep | null>(null);

  // エラー発生時に自動スクロール
  useScrollToError(error, errorRef);
  const isWeekdayModeActive = weeklyStep !== null && currentStep === weeklyStep;
  // 曜日ごとの選択状態と時間帯設定
  const [weekdaySelections, setWeekdaySelections] = useState<Record<WeekDay, WeekDaySchedule>>({
    月: { selected: false, timeSlots: {} },
    火: { selected: false, timeSlots: {} },
    水: { selected: false, timeSlots: {} },
    木: { selected: false, timeSlots: {} },
    金: { selected: false, timeSlots: {} },
    土: { selected: false, timeSlots: {} },
    日: { selected: false, timeSlots: {} },
  });

  // ページネーション用の状態
  const [currentPage, setCurrentPage] = useState(0);
  const lockedDateIdSet = useMemo(() => new Set(lockedDateIds), [lockedDateIds]);
  const overrideDateIdSet = useMemo(() => new Set(overrideDateIds), [overrideDateIds]);
  const dailyAutoFillDateIdSet = useMemo(
    () => new Set(dailyAutoFillDateIds),
    [dailyAutoFillDateIds],
  );

  // セルのスタイルと状態を返す関数
  const getCellStyle = useCallback(
    (dateId: string | undefined) => {
      if (!dateId) {
        return {
          className: 'bg-base-200/40 text-base-content/40',
          status: 'empty' as CellStatus,
        };
      }

      const isSelected = selectedDates[dateId];
      const isLocked = lockedDateIdSet.has(dateId) && !overrideDateIdSet.has(dateId);
      if (isSelected) {
        return {
          className: `bg-success/90 text-success-content font-semibold shadow-inner ${
            isLocked ? 'opacity-60 ring-1 ring-base-300/50' : ''
          }`,
          status: 'available' as CellStatus,
        };
      } else {
        return {
          className: `bg-base-200/70 text-base-content/70 ${
            isLocked ? 'opacity-60 ring-1 ring-base-300/50' : 'hover:bg-base-200'
          }`,
          status: 'unavailable' as CellStatus,
        };
      }
    },
    [selectedDates, lockedDateIdSet, overrideDateIdSet],
  );

  const applyDateSelection = useCallback((keys: string[], value: boolean) => {
    const changedKeys: string[] = [];
    setSelectedDates((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const key of keys) {
        if (!key) {
          continue;
        }
        if (next[key] === value) {
          continue;
        }
        next[key] = value;
        changed = true;
        changedKeys.push(key);
      }
      return changed ? next : prev;
    });
    if (changedKeys.length > 0) {
      setManuallyEditedDateIds((prev) => {
        const next = { ...prev };
        changedKeys.forEach((key) => {
          next[key] = true;
        });
        return next;
      });
    }
  }, []);

  const dateSelectionController = useSelectionDragController({
    isSelected: (key) => Boolean(selectedDates[key]),
    applySelection: applyDateSelection,
    rangeResolver: ({ targetKey }) => (targetKey ? [targetKey] : []),
    shouldIgnorePointerDown: (_event, _key) => isWeekdayModeActive,
    shouldIgnorePointerEnter: (_event, _key) => isWeekdayModeActive,
    disableBodyScroll: true,
  });

  const getMatrixKey = useCallback((weekday: WeekDay, slot: string) => `${weekday}__${slot}`, []);

  const parseMatrixKey = useCallback((key: string) => {
    const [weekday, slot] = key.split('__');
    return { weekday: weekday as WeekDay, slot };
  }, []);

  const applyMatrixSelection = useCallback(
    (keys: string[], value: boolean) => {
      setHasWeekdayEdits(true);
      setWeekdaySelections((prev) => {
        let changed = false;
        const next: Record<WeekDay, WeekDaySchedule> = { ...prev };
        keys.forEach((rawKey) => {
          const { weekday, slot } = parseMatrixKey(rawKey);
          if (!weekday || !slot) return;
          const schedule = next[weekday];
          if (!schedule) return;
          if ((schedule.timeSlots[slot] ?? false) === value) {
            return;
          }
          changed = true;
          const nextTimeSlots = {
            ...schedule.timeSlots,
            [slot]: value,
          };
          next[weekday] = {
            // 全セルが false に戻った曜日は未選択として扱い、意図しない保存対象化を防ぐ。
            selected: Object.values(nextTimeSlots).some(Boolean),
            timeSlots: nextTimeSlots,
          };
        });
        return changed ? next : prev;
      });
    },
    [parseMatrixKey],
  );

  const weekdaySelectionController = useSelectionDragController({
    isSelected: (key) => {
      const { weekday, slot } = parseMatrixKey(key);
      return Boolean(weekdaySelections[weekday]?.timeSlots[slot]);
    },
    applySelection: applyMatrixSelection,
    rangeResolver: ({ targetKey }) => [targetKey],
    shouldIgnorePointerDown: (_event, _key) => !isWeekdayModeActive,
    shouldIgnorePointerEnter: (_event, _key) => !isWeekdayModeActive,
    disableBodyScroll: true,
    enableKeyboard: false,
  });

  const handleMouseLeave = useCallback(() => {
    dateSelectionController.cancelDrag();
  }, [dateSelectionController]);

  const handleLockedOverride = useCallback(
    (dateId: string) => {
      if (!lockedDateIdSet.has(dateId)) return;
      if (overrideDateIdSet.has(dateId)) return;
      const confirmed = window.confirm(
        'この枠は別の確定イベントと重複しています。上書きしますか？',
      );
      if (!confirmed) return;
      setOverrideDateIds((prev) => (prev.includes(dateId) ? prev : [...prev, dateId]));
      setSelectedDates((prev) => ({
        ...prev,
        [dateId]: !prev[dateId],
      }));
      setManuallyEditedDateIds((prev) => ({
        ...prev,
        [dateId]: true,
      }));
    },
    [lockedDateIdSet, overrideDateIdSet],
  );

  // LocalStorageから以前の名前を復元、または既存の回答データの名前を使用
  useEffect(() => {
    // 既存回答データの名前とコメントがあればそれを優先
    if (initialParticipant?.name) {
      setName(initialParticipant.name);
    } else {
      const savedName = localStorage.getItem('participantName');
      if (savedName) {
        setName(savedName);
      }
    }
    if (initialParticipant?.comment) {
      setComment(initialParticipant.comment);
    }
  }, [initialParticipant]);

  useEffect(() => {
    setCurrentStep(1);
    setWeekdayInitialized(false);
    setHasWeekdayEdits(false);
    setHasManualWeeklyTemplates(false);
    setIsLoadingWeeklyTemplates(false);
    setIsCheckingWeeklyTemplateChanges(false);
    setWeeklyTemplateLoadError(null);
    hasAutoFillAppliedRef.current = false;
  }, [mode, eventId]);

  useEffect(() => {
    if (!isNewMode) return;
    setCurrentStep(1);
  }, [isAuthenticated, isNewMode]);

  useEffect(() => {
    if (!isNewMode || !isAuthenticated) return;
    if (hasAutoFillAppliedRef.current) return;
    if (Object.keys(autoFillAvailabilities).length === 0) return;
    setSelectedDates((prev) => {
      const next = { ...prev };
      Object.entries(autoFillAvailabilities).forEach(([dateId, value]) => {
        next[dateId] = value;
      });
      return next;
    });
    hasAutoFillAppliedRef.current = true;
  }, [autoFillAvailabilities, isAuthenticated, isNewMode]);

  useEffect(() => {
    if (previousStepRef.current === null) {
      previousStepRef.current = currentStep;
      return;
    }
    if (previousStepRef.current === currentStep) return;
    previousStepRef.current = currentStep;
    if (!wizardTitleRef.current) return;

    // ステップ遷移時はウィザード見出しまで戻し、次にやることを認識しやすくする。
    const titleTop = wizardTitleRef.current.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: Math.max(0, titleTop - 16), behavior: 'smooth' });
  }, [currentStep]);

  // フォーム送信前のバリデーション用
  const validateForm = async () => {
    if (!name.trim()) {
      setError('お名前を入力してください');
      return false;
    }

    if (!Object.values(selectedDates).some(Boolean)) {
      setError('少なくとも1つの参加可能枠（○）を選択してください');
      return false;
    }

    if (!termsAccepted) {
      setError('利用規約への同意が必要です');
      return false;
    }

    return true;
  };

  // 同じ名前の参加者がいるかチェックする関数
  const checkExistingParticipant = async () => {
    // 編集モードなら既に自分の回答なので確認不要
    if (mode === 'edit' || initialParticipant?.name === name) {
      return false;
    }

    setIsCheckingName(true);

    try {
      const result = await checkParticipantExists(eventId, name);
      setIsCheckingName(false);
      return result.exists;
    } catch (error) {
      console.error('参加者チェックエラー:', error);
      setIsCheckingName(false);
      return false; // エラー時は存在しないとして扱う
    }
  };

  // この関数はServer Actionを呼び出す前の準備として使用
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep !== confirmStep) {
      setError('確認ステップで送信してください');
      return;
    }
    if (!(await validateForm())) {
      return;
    }

    // フォームデータを取得
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    // // デバッグ: hiddenフィールドと名前を出力
    // console.log(
    //   "[E2E DEBUG] eventId:",
    //   formData.get("eventId"),
    //   "publicToken:",
    //   formData.get("publicToken"),
    //   "participant_name:",
    //   formData.get("participant_name")
    // );

    // 名前をLocalStorageに保存
    localStorage.setItem('participantName', name);

    try {
      // 既存の参加者がいるか確認
      const exists = await checkExistingParticipant();

      if (exists) {
        setShowNameInputOnDuplicate(true);
        setError('同じ名前の回答が既に存在します。お名前を変更してください。');
      } else {
        // 既存の参加者がいない場合はそのまま送信
        setShowNameInputOnDuplicate(false);
        promptSyncScope(formData);
      }
    } catch (error) {
      console.error('送信エラー:', error);
      setError('送信中にエラーが発生しました');
    }
  };

  // Server Actionを使用したフォーム送信処理
  const handleFormAction = useCallback(
    async (formData: FormData): Promise<void> => {
      try {
        const syncScope = (formData.get('sync_scope') as string) ?? 'current';
        const shouldOpenSyncReview =
          syncScope === 'all' && (formData.get('sync_defer') as string) === 'true';
        formData.set('override_date_ids', JSON.stringify(overrideDateIds));
        // 編集モードの場合、既存の参加者IDを追加
        if (mode === 'edit' && initialParticipant?.id) {
          formData.append('participantId', initialParticipant.id);
        }

        const response = await submitAvailability(formData);

        if (response.success) {
          // 同期確認が必要な場合は専用ページへ遷移し、それ以外は結果ページへ戻る。
          if (typeof window !== 'undefined') {
            window.location.href = shouldOpenSyncReview
              ? `/event/${publicToken}/input/sync-review`
              : `/event/${publicToken}`;
          }
        } else {
          setError(response.message || '送信に失敗しました');
        }

        setIsSubmitting(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : '送信に失敗しました');
        setIsSubmitting(false);
      }
    },
    [initialParticipant?.id, mode, overrideDateIds, publicToken],
  );

  const promptSyncScope = useCallback(
    (formData: FormData) => {
      if (!isAuthenticated || !hasSyncTargetEvents) {
        setIsSubmitting(true);
        void handleFormAction(formData);
        return;
      }
      setPendingSyncFormData(formData);
      setShowSyncConfirm(true);
    },
    [handleFormAction, hasSyncTargetEvents, isAuthenticated],
  );

  const handleSyncScopeChoice = useCallback(
    (scope: 'current' | 'all') => {
      if (!pendingSyncFormData) return;
      pendingSyncFormData.set('sync_scope', scope);
      if (scope === 'all') {
        pendingSyncFormData.set('sync_defer', 'true');
      } else {
        pendingSyncFormData.delete('sync_defer');
      }
      setShowSyncConfirm(false);
      setIsSubmitting(true);
      void handleFormAction(pendingSyncFormData);
      setPendingSyncFormData(null);
    },
    [handleFormAction, pendingSyncFormData],
  );

  const handleCloseSyncScopeConfirm = useCallback(() => {
    setShowSyncConfirm(false);
    setPendingSyncFormData(null);
  }, []);

  const handleSignInAndContinue = useCallback(() => {
    if (typeof window === 'undefined') return;
    const callbackUrl = `${window.location.pathname}${window.location.search}`;
    window.location.href = `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  }, []);

  const handleNextStep = useCallback(() => {
    setError(null);

    if (isNewMode && currentStep === 1) {
      if (!name.trim()) {
        setError('お名前を入力してください');
        return;
      }
      setCurrentStep(weeklyStep ?? heatmapStep);
      return;
    }

    if (weeklyStep !== null && currentStep === weeklyStep) {
      setCurrentStep(heatmapStep);
      return;
    }

    if (currentStep === heatmapStep) {
      if (!Object.values(selectedDates).some(Boolean)) {
        setError('少なくとも1つの参加可能枠（○）を選択してください');
        return;
      }
      setCurrentStep(confirmStep);
    }
  }, [confirmStep, currentStep, heatmapStep, isNewMode, name, selectedDates, weeklyStep]);

  const handleOpenGuestConfirm = useCallback(() => {
    setShowGuestConfirm(true);
  }, []);

  const handleContinueAsGuest = useCallback(() => {
    setShowGuestConfirm(false);
    handleNextStep();
  }, [handleNextStep]);

  const handleCloseGuestConfirm = useCallback(() => {
    setShowGuestConfirm(false);
  }, []);

  const handlePrevStep = useCallback(() => {
    setError(null);
    if (currentStep <= 1) {
      return;
    }
    if (isNewMode && currentStep === 2) {
      setCurrentStep(1);
      return;
    }
    if (currentStep === heatmapStep && weeklyStep !== null) {
      setCurrentStep(weeklyStep);
      return;
    }
    if (currentStep === confirmStep) {
      setCurrentStep(heatmapStep);
      return;
    }
    setCurrentStep((prev) => Math.max(prev - 1, 1) as WizardStep);
  }, [confirmStep, currentStep, heatmapStep, isNewMode, weeklyStep]);

  const uniqueDateKeys = useMemo(() => {
    const keys = new Set<string>();
    eventDates.forEach((date) => {
      const dateObj = new Date(date.start_time);
      const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(
        2,
        '0',
      )}-${String(dateObj.getDate()).padStart(2, '0')}`;
      keys.add(dateKey);
    });
    return Array.from(keys).sort();
  }, [eventDates]);

  const weeklyDateBuckets = useMemo(() => {
    if (uniqueDateKeys.length === 0) {
      return [] as string[][];
    }
    const firstWeekStart = startOfWeek(new Date(`${uniqueDateKeys[0]}T00:00:00`), {
      weekStartsOn: 1,
    });
    const lastWeekEnd = endOfWeek(
      new Date(`${uniqueDateKeys[uniqueDateKeys.length - 1]}T00:00:00`),
      { weekStartsOn: 1 },
    );

    const buckets: string[][] = [];
    for (
      let cursor = new Date(firstWeekStart);
      cursor.getTime() <= lastWeekEnd.getTime();
      cursor = addDays(cursor, 7)
    ) {
      const week: string[] = [];
      for (let i = 0; i < 7; i += 1) {
        const date = addDays(cursor, i);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          '0',
        )}-${String(date.getDate()).padStart(2, '0')}`;
        week.push(key);
      }
      buckets.push(week);
    }

    return buckets;
  }, [uniqueDateKeys]);

  useEffect(() => {
    if (weeklyDateBuckets.length === 0) {
      if (currentPage !== 0) {
        setCurrentPage(0);
      }
      return;
    }
    if (currentPage >= weeklyDateBuckets.length) {
      setCurrentPage(weeklyDateBuckets.length - 1);
    }
  }, [currentPage, weeklyDateBuckets.length]);

  const currentWeekDates = useMemo(() => {
    if (weeklyDateBuckets.length === 0) {
      return [] as string[];
    }
    const clampedIndex = Math.min(Math.max(currentPage, 0), weeklyDateBuckets.length - 1);
    return weeklyDateBuckets[clampedIndex];
  }, [currentPage, weeklyDateBuckets]);

  // ヒートマップ表示用のデータ構造を生成
  const heatmapData = useMemo(() => {
    const allTimeSlots = new Set<string>();
    const dateMap: Record<string, Record<string, string>> = {};

    eventDates.forEach((date) => {
      const start = new Date(date.start_time);
      const end = new Date(date.end_time);

      const dateKey = [
        start.getFullYear(),
        String(start.getMonth() + 1).padStart(2, '0'),
        String(start.getDate()).padStart(2, '0'),
      ].join('-');

      const timeKey = `${start.getHours().toString().padStart(2, '0')}:${start
        .getMinutes()
        .toString()
        .padStart(2, '0')}-${end.getHours().toString().padStart(2, '0')}:${end
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
      allTimeSlots.add(timeKey);

      if (!dateMap[dateKey]) {
        dateMap[dateKey] = {};
      }

      dateMap[dateKey][timeKey] = date.id;
    });

    const sortedTimeSlots = Array.from(allTimeSlots).sort();
    const displayDates = (
      currentWeekDates.length > 0 ? currentWeekDates : (weeklyDateBuckets[0] ?? [])
    ) as string[];

    const dates = displayDates.map((dateStr) => {
      const date = new Date(`${dateStr}T00:00:00`);
      return {
        dateKey: dateStr,
        formattedDate: date.toLocaleDateString('ja-JP', {
          month: 'numeric',
          day: 'numeric',
          weekday: 'short',
        }),
      };
    });

    const currentDateRange = dates.length
      ? {
          startLabel: new Date(`${dates[0].dateKey}T00:00:00`).toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
          }),
          endLabel: new Date(`${dates[dates.length - 1].dateKey}T00:00:00`).toLocaleDateString(
            'ja-JP',
            {
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
            },
          ),
        }
      : null;

    return {
      timeSlots: sortedTimeSlots,
      dates,
      dateMap,
      totalPages: weeklyDateBuckets.length || (dates.length > 0 ? 1 : 0),
      allDatesCount: uniqueDateKeys.length,
      currentDateRange,
    };
  }, [eventDates, currentWeekDates, uniqueDateKeys.length, weeklyDateBuckets]);

  // start_time と end_time から時間帯のキーを生成する関数
  const getTimeKey = useCallback((startTime: string, endTime: string): string => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return `${start.getHours().toString().padStart(2, '0')}:${start
      .getMinutes()
      .toString()
      .padStart(2, '0')}-${end.getHours().toString().padStart(2, '0')}:${end
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  }, []);

  // 週入力モード用の時間帯スロットを初期化する関数
  const initializeWeekdayTimeSlots = useCallback(async () => {
    setIsLoadingWeeklyTemplates(isAuthenticated);
    setWeeklyTemplateLoadError(null);

    // 全ての時間帯を収集
    const timeSlots: Record<string, boolean> = {};

    // すべての日程から時間帯を抽出
    eventDates.forEach((date) => {
      const timeKey = getTimeKey(date.start_time, date.end_time);
      timeSlots[timeKey] = false; // デフォルト値はfalse
    });

    // 曜日別の選択状態マッピングを作成
    const weekdayData: Record<WeekDay, Record<string, boolean>> = {
      月: { ...timeSlots },
      火: { ...timeSlots },
      水: { ...timeSlots },
      木: { ...timeSlots },
      金: { ...timeSlots },
      土: { ...timeSlots },
      日: { ...timeSlots },
    };

    const buildSelections = (selectedWeekdaysByTemplate: Set<WeekDay>) => {
      const updatedSelections = {} as Record<WeekDay, WeekDaySchedule>;
      (Object.keys(weekdayData) as WeekDay[]).forEach((day) => {
        const weekday = day as WeekDay;
        // テンプレの該当行がある曜日、または少なくとも1つ選択されている曜日を選択済みにする。
        const hasSelection =
          selectedWeekdaysByTemplate.has(weekday) ||
          Object.values(weekdayData[weekday]).some((val) => val);

        updatedSelections[weekday] = {
          selected: hasSelection,
          timeSlots: weekdayData[weekday],
        };
      });
      return updatedSelections;
    };

    const baseSelectedWeekdays = new Set<WeekDay>();
    eventDates.forEach((date) => {
      const dateObj = new Date(date.start_time);
      const weekday = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()] as WeekDay;
      const timeKey = getTimeKey(date.start_time, date.end_time);
      if (selectedDates[date.id]) {
        weekdayData[weekday][timeKey] = true;
        baseSelectedWeekdays.add(weekday);
      }
    });

    // 取得中でも空状態を見せないよう、まずはイベント枠ベースで表示する。
    setWeekdaySelections(buildSelections(baseSelectedWeekdays));

    if (!isAuthenticated) {
      setHasManualWeeklyTemplates(false);
      setIsLoadingWeeklyTemplates(false);
      return;
    }

    const templateWeekdayMap = new Map<string, boolean>();
    const selectedWeekdaysByTemplate = new Set<WeekDay>(baseSelectedWeekdays);
    try {
      const templateData = await fetchUserScheduleTemplates();
      setHasManualWeeklyTemplates(templateData.manual.length > 0);
      templateData.manual.forEach((template) => {
        const weekday = ['日', '月', '火', '水', '木', '金', '土'][template.weekday] as
          | WeekDay
          | undefined;
        if (!weekday) return;
        const key = `${weekday}_${toWeeklyTemplateSlotKey(template.start_time, template.end_time)}`;
        templateWeekdayMap.set(key, template.availability);
      });
      eventDates.forEach((date) => {
        const dateObj = new Date(date.start_time);
        const weekday = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()] as WeekDay;
        const timeKey = getTimeKey(date.start_time, date.end_time);
        const templateKey = `${weekday}_${timeKey}`;
        if (templateWeekdayMap.has(templateKey)) {
          weekdayData[weekday][timeKey] = templateWeekdayMap.get(templateKey) ?? false;
          selectedWeekdaysByTemplate.add(weekday);
        }
      });
      setWeekdaySelections(buildSelections(selectedWeekdaysByTemplate));
    } catch (err) {
      console.error('週予定テンプレ取得エラー:', err);
      setHasManualWeeklyTemplates(false);
      setWeeklyTemplateLoadError(
        'アカウントの週予定を取得できませんでした。手入力で続行できます。',
      );
    } finally {
      setIsLoadingWeeklyTemplates(false);
    }
  }, [eventDates, getTimeKey, isAuthenticated, selectedDates]);

  useEffect(() => {
    if (weeklyStep === null) return;
    if (currentStep !== weeklyStep) return;
    if (weekdayInitialized) return;
    void initializeWeekdayTimeSlots();
    setWeekdayInitialized(true);
  }, [currentStep, initializeWeekdayTimeSlots, weekdayInitialized, weeklyStep]);

  // ページを変更するハンドラー
  const handlePageChange = useCallback(
    (newPage: number) => {
      if (weeklyDateBuckets.length === 0) {
        setCurrentPage(0);
        return;
      }
      const clamped = Math.min(Math.max(newPage, 0), weeklyDateBuckets.length - 1);
      setCurrentPage(clamped);
    },
    [weeklyDateBuckets],
  );

  // 曜日ごとの選択と時間帯を適用する関数
  const applyWeekdaySelections = useCallback(() => {
    // 更新する日程の選択状態を準備
    const newSelectedDates = { ...selectedDates };

    // 選択された曜日と時間帯のデータを処理
    Object.entries(weekdaySelections).forEach(([day, daySchedule]) => {
      // 全イベント日程をループして、選択された曜日に該当する日程を更新
      eventDates.forEach((date) => {
        const dateObj = new Date(date.start_time);
        const weekday = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];

        if (weekday === day) {
          // 各日予定（アカウント紐づけ）で反映済みの枠は、曜日一括入力では上書きしない。
          if (dailyAutoFillDateIdSet.has(date.id)) {
            return;
          }
          if (manuallyEditedDateIds[date.id]) {
            return;
          }
          // この日程の時間帯ID
          const timeKey = getTimeKey(date.start_time, date.end_time);

          // 時間帯ごとの設定がある場合のみ適用する
          // 週入力の選択を優先（既存の選択を上書き）
          if (daySchedule.timeSlots[timeKey] !== undefined) {
            newSelectedDates[date.id] = daySchedule.selected
              ? daySchedule.timeSlots[timeKey]
              : false;
          }
        }
      });
    });

    // 状態を更新
    setSelectedDates(newSelectedDates);
  }, [
    weekdaySelections,
    eventDates,
    selectedDates,
    getTimeKey,
    manuallyEditedDateIds,
    dailyAutoFillDateIdSet,
  ]);

  const weekdayToNumber = useCallback((weekday: WeekDay): number => {
    const mapping: Record<WeekDay, number> = {
      日: 0,
      月: 1,
      火: 2,
      水: 3,
      木: 4,
      金: 5,
      土: 6,
    };
    return mapping[weekday];
  }, []);

  const buildWeeklyTemplatePayload = useCallback((): WeeklyTemplatePayloadRow[] => {
    const rows: WeeklyTemplatePayloadRow[] = [];
    Object.entries(weekdaySelections).forEach(([day, daySchedule]) => {
      if (!daySchedule.selected) return;
      const weekday = weekdayToNumber(day as WeekDay);
      Object.entries(daySchedule.timeSlots).forEach(([timeKey, availability]) => {
        const [startTime, endTime] = timeKey.split('-');
        if (!startTime || !endTime) return;
        rows.push({
          weekday,
          startTime,
          endTime,
          availability,
        });
      });
    });
    return rows;
  }, [weekdaySelections, weekdayToNumber]);

  const hasWeeklyTemplateChanges = useCallback(
    (
      payload: WeeklyTemplatePayloadRow[],
      manualRows: Array<{
        weekday: number;
        start_time: string;
        end_time: string;
        availability: boolean;
      }>,
    ): boolean => {
      if (payload.length === 0) return false;
      const manualMap = new Map<string, boolean>();
      manualRows.forEach((row) => {
        manualMap.set(
          `${row.weekday}_${toWeeklyTemplateSlotKey(row.start_time, row.end_time)}`,
          row.availability,
        );
      });
      return payload.some((row) => {
        const key = `${row.weekday}_${toWeeklyTemplateSlotKey(row.startTime, row.endTime)}`;
        const current = manualMap.get(key);
        return current === undefined || current !== row.availability;
      });
    },
    [],
  );

  const proceedToHeatmap = useCallback(() => {
    setShowWeeklySaveConfirm(false);
    setPendingWeeklyTemplates([]);
    setHasWeekdayEdits(false);
    setCurrentStep(heatmapStep);
  }, [heatmapStep]);

  const handleProceedFromWeeklyStep = useCallback(async () => {
    if (isLoadingWeeklyTemplates || isCheckingWeeklyTemplateChanges) {
      return;
    }
    setError(null);
    applyWeekdaySelections();

    if (!isAuthenticated) {
      setCurrentStep(heatmapStep);
      return;
    }

    if (!hasWeekdayEdits) {
      setCurrentStep(heatmapStep);
      return;
    }

    const payload = buildWeeklyTemplatePayload();
    if (payload.length === 0) {
      setCurrentStep(heatmapStep);
      return;
    }

    setIsCheckingWeeklyTemplateChanges(true);
    try {
      const templates = await fetchUserScheduleTemplates();
      const changed = hasWeeklyTemplateChanges(payload, templates.manual);
      if (!changed) {
        setCurrentStep(heatmapStep);
        return;
      }

      setPendingWeeklyTemplates(payload);
      setShowWeeklySaveConfirm(true);
    } catch (err) {
      console.error('週予定差分確認エラー:', err);
      setError('週予定の確認に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsCheckingWeeklyTemplateChanges(false);
    }
  }, [
    applyWeekdaySelections,
    buildWeeklyTemplatePayload,
    hasWeekdayEdits,
    hasWeeklyTemplateChanges,
    heatmapStep,
    isCheckingWeeklyTemplateChanges,
    isAuthenticated,
    isLoadingWeeklyTemplates,
  ]);

  const handleSaveWeeklyAndProceed = useCallback(async () => {
    if (!pendingWeeklyTemplates.length) {
      proceedToHeatmap();
      return;
    }
    setIsSavingWeeklyTemplates(true);
    const result = await upsertWeeklyTemplatesFromWeekdaySelections({
      templates: pendingWeeklyTemplates,
    });
    setIsSavingWeeklyTemplates(false);
    if (!result.success) {
      setError(result.message ?? '週予定の更新に失敗しました');
      return;
    }
    proceedToHeatmap();
  }, [pendingWeeklyTemplates, proceedToHeatmap]);

  const selectedAvailableCount = useMemo(
    () => Object.values(selectedDates).filter(Boolean).length,
    [selectedDates],
  );
  const insertedAccountDatesLabel = useMemo(() => {
    if (!isAuthenticated) return null;
    const insertedIds = dailyAutoFillDateIds;
    if (insertedIds.length === 0) return null;

    const insertedDates = eventDates
      .filter((date) => insertedIds.includes(date.id))
      .map((date) => new Date(date.start_time))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (insertedDates.length === 0) return null;
    const formatter = new Intl.DateTimeFormat('ja-JP', {
      month: 'numeric',
      day: 'numeric',
    });
    const uniqueLabels = Array.from(new Set(insertedDates.map((date) => formatter.format(date))));
    if (uniqueLabels.length <= 3) {
      return `${uniqueLabels.join('、')}（${uniqueLabels.length}日）`;
    }
    return `${uniqueLabels[0]}、${uniqueLabels[1]}、${uniqueLabels[2]} ほか（${uniqueLabels.length}日）`;
  }, [dailyAutoFillDateIds, eventDates, isAuthenticated]);
  const heatmapLastEndLabel = useMemo(() => {
    if (heatmapData.timeSlots.length === 0) return null;
    const [, endTime] = heatmapData.timeSlots[heatmapData.timeSlots.length - 1].split('-');
    if (!endTime) return null;
    if (endTime === '00:00') return '24:00';
    return endTime.replace(/^0/, '');
  }, [heatmapData.timeSlots]);
  const stepLabels = useMemo(
    () =>
      isNewMode
        ? showWeeklyStep
          ? ['回答者情報', '曜日一括入力', '予定確認・修正', '確認・送信']
          : ['回答者情報', '予定確認・修正', '確認・送信']
        : showWeeklyStep
          ? ['曜日一括入力', '予定確認・修正', '確認・送信']
          : ['予定確認・修正', '確認・送信'],
    [isNewMode, showWeeklyStep],
  );
  const stepLabel = useMemo(() => {
    const label = stepLabels[currentStep - 1] ?? stepLabels[0] ?? '';
    return `ステップ${currentStep}: ${label}`;
  }, [currentStep, stepLabels]);
  const weeklyStepLeadMessage = useMemo(() => {
    if (isAuthenticated && isLoadingWeeklyTemplates) {
      return 'アカウント予定を読み込んでいます。';
    }
    if (isAuthenticated && hasManualWeeklyTemplates) {
      return '各曜日の予定を反映しました。変更がないか確認してください。';
    }
    return '各曜日の予定を入力してください。';
  }, [hasManualWeeklyTemplates, isAuthenticated, isLoadingWeeklyTemplates]);
  const weekdayTimeSlots = useMemo(() => {
    const baseSchedule = Object.values(weekdaySelections)[0];
    return baseSchedule ? Object.keys(baseSchedule.timeSlots).sort() : [];
  }, [weekdaySelections]);
  const weekdayLastEndLabel = useMemo(() => {
    if (weekdayTimeSlots.length === 0) return null;
    const [, endTime] = weekdayTimeSlots[weekdayTimeSlots.length - 1].split('-');
    if (!endTime) return null;
    return endTime === '00:00' ? '24:00' : endTime;
  }, [weekdayTimeSlots]);

  return (
    <div className="bg-base-100 mb-8 animate-fadeIn rounded-lg border p-4 shadow-sm transition-all md:p-6">
      <h2 ref={wizardTitleRef} className="mb-3 text-xl font-bold">
        {mode === 'edit' ? `${initialParticipant?.name ?? '回答'}の編集` : '回答ウィザード'}
      </h2>
      <div className="mb-2 overflow-x-auto">
        <ul className="steps w-full whitespace-nowrap text-xs sm:text-sm">
          {stepLabels.map((label, index) => {
            const step = (index + 1) as WizardStep;
            return (
              <li key={label} className={`step ${currentStep >= step ? 'step-primary' : ''}`}>
                <span className="sm:hidden">Step {step}</span>
                <span className="hidden sm:inline">{label}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mb-4 scroll-mt-24 text-base font-semibold">{stepLabel}</div>

      {error && (
        <div className="alert alert-error mb-4" role="alert" aria-live="assertive" ref={errorRef}>
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="publicToken" value={publicToken} />
        <input type="hidden" name="participant_name" value={name} />

        {Object.entries(selectedDates).map(
          ([dateId, isSelected]) =>
            isSelected && (
              <input key={dateId} type="hidden" name={`availability_${dateId}`} value="on" />
            ),
        )}

        {isNewMode && currentStep === 1 && (
          <section className="space-y-4" data-testid="availability-step-1">
            <div className="bg-base-200 rounded-md p-3 text-sm">まずは名前を入力してください。</div>

            <div>
              <label htmlFor="participant_name" className="mb-1 block text-sm font-medium">
                お名前 <span className="text-error">*</span>
              </label>
              <input
                type="text"
                id="participant_name"
                className="input input-bordered w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {!isAuthenticated && (
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleOpenGuestConfirm}
                  data-testid="availability-guest-continue"
                >
                  ログインせずに進む
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSignInAndContinue}
                  data-testid="availability-login-continue"
                >
                  ログインして進む
                </button>
              </div>
            )}

            {isAuthenticated && (
              <div className="flex justify-end">
                <button type="button" className="btn btn-primary" onClick={handleNextStep}>
                  次へ
                </button>
              </div>
            )}
          </section>
        )}

        {showWeeklyStep && weeklyStep !== null && currentStep === weeklyStep && (
          <section className="space-y-4" data-testid="availability-step-weekly">
            <div className="bg-info/10 border-info/20 rounded-lg border p-3 text-sm">
              <p>{weeklyStepLeadMessage}</p>
              {isAuthenticated && isLoadingWeeklyTemplates && (
                <p className="text-base-content/70 mt-2 flex items-center gap-2 text-xs">
                  <span className="loading loading-spinner loading-xs" aria-hidden="true"></span>
                  週予定を取得中です。読み込み完了までお待ちください。
                </p>
              )}
              {weeklyTemplateLoadError && (
                <p className="text-warning mt-2 text-xs">{weeklyTemplateLoadError}</p>
              )}
            </div>

            <div className="bg-base-200 border-base-300 rounded-lg border p-1 shadow-sm sm:p-3">
              <h3 className="mb-3 text-lg font-bold">曜日一括入力</h3>
              <div className="matrix-container -mx-1 mb-2 touch-none overflow-hidden sm:mx-0 sm:mb-3">
                <table
                  className="table-xs border-base-300 table w-full table-fixed border-collapse border text-center"
                  onMouseDown={(e) => e.preventDefault()}
                  onTouchStart={(e) => e.preventDefault()}
                  onTouchMove={(e) => e.preventDefault()}
                >
                  <thead>
                    <tr className="bg-base-200">
                      <th className="border-base-300 w-10 border px-0.5 py-2 text-center md:w-14 md:px-2 md:py-3">
                        時間
                      </th>
                      {Object.keys(weekdaySelections).map((day) => (
                        <th
                          key={day}
                          className="border-base-300 border px-0 py-0 text-center md:px-1 md:py-2"
                        >
                          <span className="text-xs font-semibold md:text-sm">{day}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {weekdayTimeSlots.length === 0 ? (
                      <tr>
                        <td
                          colSpan={1 + Object.keys(weekdaySelections).length}
                          className="py-4 text-center text-sm"
                        >
                          利用可能な時間帯がありません
                        </td>
                      </tr>
                    ) : (
                      <>
                        <tr>
                          <th className="bg-base-100 border-base-300 h-1 border p-0 md:h-3"></th>
                          {Object.keys(weekdaySelections).map((day) => (
                            <td key={`${day}-spacer`} className="h-1 md:h-3" />
                          ))}
                        </tr>
                        {weekdayTimeSlots.map((timeSlot, rowIndex) => {
                          const [startTime] = timeSlot.split('-');
                          return (
                            <tr key={timeSlot}>
                              <th className="bg-base-100 border-base-300 relative border px-1 py-0 text-right md:px-2">
                                <span
                                  className={`absolute left-2 text-xs font-medium ${
                                    rowIndex === 0 ? 'top-0' : 'top-0 -translate-y-1/2'
                                  }`}
                                >
                                  {startTime.replace(/^0/, '')}
                                </span>
                              </th>
                              {Object.entries(weekdaySelections).map(([day, daySchedule]) => {
                                const matrixKey = getMatrixKey(day as WeekDay, timeSlot);
                                return (
                                  <td
                                    key={`${day}-${timeSlot}`}
                                    className="border-base-300 border p-0 md:p-1"
                                    data-day={day}
                                    data-time-slot={timeSlot}
                                    data-selection-key={matrixKey}
                                    {...weekdaySelectionController.getCellProps(matrixKey, {
                                      disabled:
                                        !isWeekdayModeActive ||
                                        isLoadingWeeklyTemplates ||
                                        isCheckingWeeklyTemplateChanges,
                                    })}
                                  >
                                    <div
                                      className={`flex aspect-square w-full items-center justify-center rounded-md text-xs font-semibold leading-none md:aspect-auto md:h-10 md:text-sm ${
                                        daySchedule.timeSlots[timeSlot]
                                          ? 'bg-success text-success-content'
                                          : 'bg-base-100 text-base-content/80'
                                      }`}
                                    >
                                      {daySchedule.timeSlots[timeSlot] ? '○' : '×'}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                        {weekdayLastEndLabel && (
                          <tr className="h-0">
                            <th className="bg-base-100 border-base-300 relative border px-1 py-0 text-right md:px-2">
                              <span className="absolute left-2 top-0 -translate-y-1/2 text-xs font-medium">
                                {weekdayLastEndLabel === '24:00'
                                  ? '24:00'
                                  : weekdayLastEndLabel.replace(/^0/, '')}
                              </span>
                            </th>
                            {Object.keys(weekdaySelections).map((day) => (
                              <td key={`${day}-end`} className="border-base-300 border p-0" />
                            ))}
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-2">
              <button
                type="button"
                className="btn btn-outline"
                onClick={handlePrevStep}
                disabled={currentStep === 1}
              >
                戻る
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleProceedFromWeeklyStep()}
                disabled={isLoadingWeeklyTemplates || isCheckingWeeklyTemplateChanges}
              >
                {isLoadingWeeklyTemplates
                  ? '予定を読み込み中...'
                  : isCheckingWeeklyTemplateChanges
                    ? '差分を確認中...'
                    : '次へ'}
              </button>
            </div>
          </section>
        )}

        {currentStep === heatmapStep && (
          <section className="space-y-4" data-testid="availability-step-heatmap">
            <div className="bg-base-200 rounded-lg p-1 text-sm sm:p-3">
              <p>表で予定を確認・修正してください。</p>
              {insertedAccountDatesLabel && (
                <p className="text-base-content/60 mt-1 text-xs">
                  アカウント予定を反映済み（{insertedAccountDatesLabel}）
                </p>
              )}
            </div>
            {heatmapData.totalPages > 1 && (
              <WeekNavigationBar
                periodLabel={`${heatmapData.currentDateRange?.startLabel ?? '-'} 〜 ${
                  heatmapData.currentDateRange?.endLabel ?? '-'
                }`}
                currentPage={currentPage}
                totalPages={heatmapData.totalPages}
                onPageChange={handlePageChange}
                trailingNote="表示: 1週間"
              />
            )}

            <div
              className="table-container-mobile -mx-3 select-none overflow-x-auto overscroll-contain sm:mx-0"
              style={{
                overscrollBehaviorY: 'contain',
                touchAction: dateSelectionController.isDragging ? 'none' : 'pan-x',
              }}
              onMouseLeave={handleMouseLeave}
            >
              <table className="table-xs border-base-300 table w-full min-w-0 table-fixed border-collapse border text-center">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-base-200">
                    <th className="border-base-300 bg-base-200 sticky left-0 top-0 z-30 w-10 border px-0.5 py-2 text-center md:w-14 md:px-2 md:py-3">
                      <span className="text-xs">時間</span>
                    </th>
                    {heatmapData.dates.map((date) => (
                      <th
                        key={date.dateKey}
                        className="border-base-300 heatmap-cell-mobile border px-0 py-0 text-center md:px-1 md:py-2"
                      >
                        <div className="flex flex-col items-center leading-tight">
                          <span className="text-xs font-semibold md:text-sm">
                            {date.formattedDate.split('(')[0]}
                          </span>
                          <span className="text-xs text-base-content/60">
                            ({date.formattedDate.split('(')[1]}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th className="bg-base-100 border-base-300 sticky left-0 z-10 h-1 border p-0 md:h-3"></th>
                    {heatmapData.dates.map((date) => (
                      <td key={`${date.dateKey}-spacer`} className="h-1 md:h-3" />
                    ))}
                  </tr>
                  {heatmapData.timeSlots.map((timeSlot, rowIndex) => {
                    const [startTime] = timeSlot.split('-');
                    const formattedStartTime = startTime.replace(/^0/, '');

                    return (
                      <tr key={timeSlot}>
                        <th className="bg-base-100 border-base-300 relative border px-1 py-0 text-right md:px-2">
                          <span
                            className={`absolute left-2 text-xs font-medium ${
                              rowIndex === 0 ? 'top-0' : 'top-0 -translate-y-1/2'
                            }`}
                          >
                            {formattedStartTime}
                          </span>
                        </th>
                        {heatmapData.dates.map((date) => {
                          const dateId = heatmapData.dateMap[date.dateKey]?.[timeSlot];
                          const { className, status } = getCellStyle(dateId);
                          const isConflict = dateId ? lockedDateIdSet.has(dateId) : false;
                          const isLocked =
                            Boolean(dateId) && isConflict && !overrideDateIdSet.has(dateId);

                          return (
                            <td
                              key={`${date.dateKey}-${timeSlot}`}
                              className="border-base-300 border p-0 md:p-1"
                              data-date-id={dateId}
                              data-time-slot={timeSlot}
                            >
                              {dateId ? (
                                <div
                                  className={`flex aspect-square w-full items-center justify-center rounded-md text-xs font-semibold leading-none transition-colors duration-150 md:aspect-auto md:h-10 md:text-sm ${className} ${
                                    isLocked ? 'cursor-not-allowed' : 'cursor-pointer'
                                  }`}
                                  data-date-id={dateId}
                                  data-selection-key={dateId}
                                  {...dateSelectionController.getCellProps(dateId, {
                                    disabled: isWeekdayModeActive || isLocked,
                                  })}
                                  onClick={() => {
                                    if (isLocked && dateId) {
                                      handleLockedOverride(dateId);
                                    }
                                  }}
                                  title={isConflict ? '確定イベントと重複しています' : undefined}
                                >
                                  {status === 'available'
                                    ? '○'
                                    : status === 'unavailable'
                                      ? '×'
                                      : '-'}
                                </div>
                              ) : (
                                <div className="bg-base-200/30 text-base-content/30 flex aspect-square w-full items-center justify-center rounded-md text-xs font-semibold leading-none md:aspect-auto md:h-10 md:text-sm">
                                  <span>-</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {heatmapLastEndLabel && (
                    <tr className="h-0">
                      <th className="bg-base-100 border-base-300 relative border px-1 py-0 text-right md:px-2">
                        <span className="absolute left-2 top-0 -translate-y-1/2 text-xs font-medium">
                          {heatmapLastEndLabel}
                        </span>
                      </th>
                      {heatmapData.dates.map((date) => (
                        <td
                          key={`${date.dateKey}-endtime`}
                          className="border-base-300 border p-0"
                        />
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap justify-between gap-2">
              <button type="button" className="btn btn-outline" onClick={handlePrevStep}>
                戻る
              </button>
              <button type="button" className="btn btn-primary" onClick={handleNextStep}>
                確認へ進む
              </button>
            </div>
          </section>
        )}

        {currentStep === confirmStep && (
          <section className="space-y-4" data-testid="availability-step-confirm">
            <div className="bg-base-200 rounded-lg p-3 text-sm">
              <p>お名前: {name || '未入力'}</p>
              <p>参加可能枠（○）: {selectedAvailableCount}件</p>
            </div>

            <div>
              {showNameInputOnDuplicate && (
                <div className="mb-4">
                  <label
                    htmlFor="participant_name_confirm"
                    className="mb-1 block text-sm font-medium"
                  >
                    お名前 <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    id="participant_name_confirm"
                    className="input input-bordered w-full"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError(null);
                    }}
                  />
                </div>
              )}

              <label htmlFor="comment" className="mb-1 block text-sm font-medium">
                コメント・メモ
              </label>
              <textarea
                id="comment"
                name="comment"
                className="textarea textarea-bordered w-full"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>

            <TermsCheckbox
              isChecked={termsAccepted}
              onChange={setTermsAccepted}
              id="availability-form-terms"
              disabled={isSubmitting}
            />

            <div className="flex flex-wrap justify-between gap-2">
              <button type="button" className="btn btn-outline" onClick={handlePrevStep}>
                戻る
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || isCheckingName}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm mr-2"></span>
                    送信中...
                  </>
                ) : isCheckingName ? (
                  <>
                    <span className="loading loading-spinner loading-sm mr-2"></span>
                    名前を確認中...
                  </>
                ) : mode === 'edit' ? (
                  '回答を更新する'
                ) : (
                  '回答を送信'
                )}
              </button>
            </div>
          </section>
        )}

        {/* 同期範囲の確認ダイアログ */}
        {showSyncConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-base-100 w-full max-w-md rounded-lg p-6 shadow-xl">
              <h3 className="mb-4 text-lg font-bold">回答後の保存方法</h3>
              <p className="mb-6 text-sm text-base-content/70">
                この回答をアカウント予定に保存し、他イベントへの反映も実行しますか？
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseSyncScopeConfirm}
                  className="btn btn-ghost"
                >
                  確認へ戻る
                </button>
                <button
                  type="button"
                  onClick={() => handleSyncScopeChoice('current')}
                  className="btn btn-outline"
                >
                  このイベントのみ
                </button>
                <button
                  type="button"
                  onClick={() => handleSyncScopeChoice('all')}
                  className="btn btn-primary"
                >
                  アカウント予定に保存して反映
                </button>
              </div>
            </div>
          </div>
        )}

        {showWeeklySaveConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-base-100 w-full max-w-md rounded-lg p-6 shadow-xl">
              <h3 className="mb-4 text-lg font-bold">週予定の更新</h3>
              <p className="mb-6 text-sm text-base-content/70">
                曜日一括入力の変更をアカウントの週予定にも反映しますか？
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={proceedToHeatmap}
                  disabled={isSavingWeeklyTemplates}
                >
                  更新せず次へ
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void handleSaveWeeklyAndProceed()}
                  disabled={isSavingWeeklyTemplates}
                >
                  {isSavingWeeklyTemplates ? '更新中...' : '更新して次へ'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showGuestConfirm && (
          <div className="modal modal-open" role="dialog" aria-modal="true">
            <div className="modal-box max-w-lg">
              <h3 className="mb-2 text-lg font-bold">ログイン方法を選択してください</h3>
              <p className="text-base-content/80 text-sm leading-relaxed">
                ログインすると回答履歴の同期や、次回入力の自動反映が利用できます。おすすめは
                <span className="text-primary font-semibold">「ログインして回答」</span>
                です。
              </p>
              <div className="mt-5 space-y-2">
                <button
                  type="button"
                  className="btn btn-primary w-full"
                  onClick={handleSignInAndContinue}
                  data-testid="availability-guest-confirm-signin"
                >
                  ログインして回答
                </button>
                <button
                  type="button"
                  className="btn btn-outline w-full"
                  onClick={handleContinueAsGuest}
                  data-testid="availability-guest-confirm-continue"
                >
                  ログインせず回答
                </button>
              </div>
              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={handleCloseGuestConfirm}>
                  戻る
                </button>
              </div>
            </div>
            <button
              type="button"
              className="modal-backdrop"
              aria-label="ログイン確認を閉じる"
              onClick={handleCloseGuestConfirm}
            />
          </div>
        )}
      </form>
    </div>
  );
}
