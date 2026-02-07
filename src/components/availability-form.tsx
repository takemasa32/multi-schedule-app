'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  submitAvailability,
  checkParticipantExists,
  linkMyParticipantAnswerByName,
} from '@/lib/actions';
import { formatDateTimeWithDay } from '@/lib/utils';
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
  overrideDateIds?: string[];
}

type ViewMode = 'list' | 'table' | 'heatmap';
type WeekDay = '月' | '火' | '水' | '木' | '金' | '土' | '日';
type WeekDaySchedule = {
  selected: boolean;
  timeSlots: Record<string, boolean>;
};
type CellStatus = 'available' | 'unavailable' | 'empty';

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
  overrideDateIds: initialOverrideDateIds = [],
}: AvailabilityFormProps) {
  const [name, setName] = useState(initialParticipant?.name || '');
  const [comment, setComment] = useState(initialParticipant?.comment || '');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false); // 更新モード用の状態
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  // 名前の重複確認用状態
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState<boolean>(false);
  const [isCheckingName, setIsCheckingName] = useState(false);
  // フォーム送信の一時保存用
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
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
  const [showPrefillModal, setShowPrefillModal] = useState(false);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [pendingSyncFormData, setPendingSyncFormData] = useState<FormData | null>(null);
  const [overrideDateIds, setOverrideDateIds] = useState<string[]>(initialOverrideDateIds);
  const [manuallyEditedDateIds, setManuallyEditedDateIds] = useState<Record<string, true>>({});
  const [isLinkingExistingAnswer, setIsLinkingExistingAnswer] = useState(false);
  const [linkExistingAnswerMessage, setLinkExistingAnswerMessage] = useState<string | null>(null);

  // エラー発生時に自動スクロール
  useScrollToError(error, errorRef);
  const [viewMode, setViewMode] = useState<ViewMode>('heatmap');
  // 週入力モード（アコーディオンを表示中か）：この状態が true の時は通常入力を無効化
  const [isWeekdayModeActive, setIsWeekdayModeActive] = useState(false);
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
          className: `bg-success/90 text-success-content font-semibold border border-success/50 shadow-inner${
            isLocked ? ' opacity-60' : ''
          }`,
          status: 'available' as CellStatus,
        };
      } else {
        return {
          className: `bg-base-200/70 text-base-content/70 border border-base-300/40${
            isLocked ? ' opacity-60' : ' hover:bg-base-200'
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
          next[weekday] = {
            selected: value ? true : schedule.selected,
            timeSlots: {
              ...schedule.timeSlots,
              [slot]: value,
            },
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

  const applyAutoFill = useCallback(() => {
    setSelectedDates((prev) => {
      const next = { ...prev };
      Object.entries(autoFillAvailabilities).forEach(([dateId, value]) => {
        next[dateId] = value;
      });
      return next;
    });
    setShowPrefillModal(false);
  }, [autoFillAvailabilities]);

  const skipAutoFill = useCallback(() => {
    setShowPrefillModal(false);
  }, []);

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
    [isAuthenticated, hasSyncTargetEvents, handleFormAction],
  );

  const handleSyncScopeChoice = useCallback(
    (scope: 'current' | 'all') => {
      if (!pendingSyncFormData) return;
      pendingSyncFormData.set('sync_scope', scope);
      setShowSyncConfirm(false);
      setIsSubmitting(true);
      void handleFormAction(pendingSyncFormData);
      setPendingSyncFormData(null);
    },
    [pendingSyncFormData, handleFormAction],
  );

  const handleLinkExistingAnswer = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setLinkExistingAnswerMessage('先にお名前を入力してください');
      return;
    }

    setIsLinkingExistingAnswer(true);
    setLinkExistingAnswerMessage(null);
    const result = await linkMyParticipantAnswerByName({
      eventId,
      participantName: trimmedName,
    });
    setIsLinkingExistingAnswer(false);

    if (result.success && result.participantId && typeof window !== 'undefined') {
      window.location.href = `/event/${publicToken}/input?participant_id=${result.participantId}`;
      return;
    }

    setLinkExistingAnswerMessage(result.message);
  }, [eventId, name, publicToken]);

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
    if (mode !== 'new' || !isAuthenticated) return;
    if (Object.keys(autoFillAvailabilities).length === 0) return;
    setShowPrefillModal(true);
  }, [mode, isAuthenticated, autoFillAvailabilities]);

  // 時間範囲を読みやすい形式にフォーマット
  const formatTimeRange = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);

    // 00:00を24:00として表示する処理
    const formatEndTime = () => {
      if (end.getHours() === 0 && end.getMinutes() === 0) {
        // 開始日と終了日を比較
        const startDate = new Date(start);
        startDate.setHours(0, 0, 0, 0); // 時刻部分をリセット

        const endDate = new Date(end);
        endDate.setHours(0, 0, 0, 0); // 時刻部分をリセット

        // 終了日が開始日の翌日である場合は24:00と表示
        if (endDate.getTime() - startDate.getTime() === 24 * 60 * 60 * 1000) {
          return '24:00';
        }
      }

      return `${end.getHours().toString().padStart(2, '0')}:${end
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
    };

    // 同じ日または24:00にまたがる場合は日付を1回だけ表示
    const startDay = new Date(start);
    startDay.setHours(0, 0, 0, 0);

    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    const oneDayDiff = endDay.getTime() - startDay.getTime() === 24 * 60 * 60 * 1000;
    const sameDay = startDay.getTime() === endDay.getTime();

    if (sameDay || (oneDayDiff && end.getHours() === 0 && end.getMinutes() === 0)) {
      return `${formatDateTimeWithDay(start)} 〜 ${formatEndTime()}`;
    } else {
      // 異なる日の場合は両方の日付を表示
      return `${formatDateTimeWithDay(start)} 〜 ${formatDateTimeWithDay(end)}`;
    }
  };

  // フォーム送信前のバリデーション用
  const validateForm = async () => {
    if (!name.trim()) {
      setError('お名前を入力してください');
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
    if (!(await validateForm())) {
      e.preventDefault();
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

    e.preventDefault(); // デフォルトの送信をキャンセル

    // 名前をLocalStorageに保存
    localStorage.setItem('participantName', name);

    try {
      // 既存の参加者がいるか確認
      const exists = await checkExistingParticipant();

      if (exists) {
        // 既存の参加者がいる場合は確認ダイアログを表示
        setPendingFormData(formData);
        setShowOverwriteConfirm(true);
      } else {
        // 既存の参加者がいない場合はそのまま送信
        promptSyncScope(formData);
      }
    } catch (error) {
      console.error('送信エラー:', error);
      setError('送信中にエラーが発生しました');
    }
  };

  // Server Actionを使用したフォーム送信処理
  async function handleFormAction(formData: FormData): Promise<void> {
    try {
      formData.set('override_date_ids', JSON.stringify(overrideDateIds));
      // 編集モードの場合、既存の参加者IDを追加
      if (mode === 'edit' && initialParticipant?.id) {
        formData.append('participantId', initialParticipant.id);
      }

      const response = await submitAvailability(formData);

      if (response.success) {
        setFeedback(response.message ?? '送信が完了しました');
        // 入力ページの場合は元の確認ページに戻る
        if (typeof window !== 'undefined') {
          window.location.href = `/event/${publicToken}`;
        }
      } else {
        setError(response.message || '送信に失敗しました');
      }

      setIsSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '送信に失敗しました');
      setIsSubmitting(false);
    }
  }

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

  const currentWeekDateSet = useMemo(() => new Set(currentWeekDates), [currentWeekDates]);

  // 日付のグループ化（日付別に時間帯をまとめる）
  const dateGroups = useMemo(() => {
    const groups: Record<string, typeof eventDates> = {};

    eventDates.forEach((date) => {
      const dateObj = new Date(date.start_time);
      const dateKey = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD形式

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }

      groups[dateKey].push(date);
    });

    // 日付順にソート
    const sortedGroups = Object.entries(groups)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([dateStr, dates]) => {
        const date = new Date(dateStr);
        return {
          dateKey: dateStr,
          formattedDate: date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short',
          }),
          slots: dates.sort(
            (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
          ),
        };
      });

    if (currentWeekDateSet.size === 0) {
      return sortedGroups;
    }

    return sortedGroups.filter((group) => currentWeekDateSet.has(group.dateKey));
  }, [eventDates, currentWeekDateSet]);

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
  const initializeWeekdayTimeSlots = () => {
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

    // 既存の選択データがある場合、曜日ごとに振り分ける
    eventDates.forEach((date) => {
      if (selectedDates[date.id]) {
        const dateObj = new Date(date.start_time);
        const weekday = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()] as WeekDay;
        const timeKey = getTimeKey(date.start_time, date.end_time);
        weekdayData[weekday][timeKey] = true;
      }
    });

    // 各曜日に時間帯スロットを設定
    const updatedSelections = { ...weekdaySelections };
    Object.keys(updatedSelections).forEach((day) => {
      const weekday = day as WeekDay;
      // 少なくとも1つ選択されている場合はその曜日を「選択済み」とする
      const hasSelection = Object.values(weekdayData[weekday]).some((val) => val);

      updatedSelections[weekday] = {
        selected: hasSelection,
        timeSlots: weekdayData[weekday],
      };
    });

    setWeekdaySelections(updatedSelections);
  };

  // CellStatusに基づいて表示するアイコンやテキスト
  const getCellContent = (status: CellStatus) => {
    switch (status) {
      case 'available':
        return (
          <div className="inline-block select-none text-lg font-bold">○</div> // inline-blockを追加して表示を安定化
        );
      case 'unavailable':
        return (
          <div className="inline-block select-none text-lg font-bold opacity-70">×</div> // 同様にinline-blockを追加
        );
      case 'empty':
        return <span className="inline-block select-none">ー</span>;
    }
  };

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

  // 編集モードを切り替える処理
  const handleEditClick = () => {
    setIsEditing(true);
    setFeedback(null); // 編集モードに変わるとフィードバックメッセージを消去
  };

  // 曜日ごとの選択と時間帯を適用する関数
  const applyWeekdaySelections = useCallback(() => {
    // 更新する日程の選択状態を準備
    const newSelectedDates = { ...selectedDates };

    // 選択された曜日と時間帯のデータを処理
    Object.entries(weekdaySelections).forEach(([day, daySchedule]) => {
      if (!daySchedule.selected) return; // 選択されていない曜日はスキップ

      // 全イベント日程をループして、選択された曜日に該当する日程を更新
      eventDates.forEach((date) => {
        const dateObj = new Date(date.start_time);
        const weekday = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];

        if (weekday === day) {
          if (manuallyEditedDateIds[date.id]) {
            return;
          }
          // この日程の時間帯ID
          const timeKey = getTimeKey(date.start_time, date.end_time);

          // 時間帯ごとの設定がある場合のみ適用する
          // 週入力の選択を優先（既存の選択を上書き）
          if (daySchedule.timeSlots[timeKey] !== undefined) {
            newSelectedDates[date.id] = daySchedule.timeSlots[timeKey];
          }
        }
      });
    });

    // 状態を更新
    setSelectedDates(newSelectedDates);
  }, [weekdaySelections, eventDates, selectedDates, getTimeKey, manuallyEditedDateIds]);

  return (
    <div className="bg-base-100 mb-8 animate-fadeIn rounded-lg border p-4 shadow-sm transition-all md:p-6">
      {feedback && !isEditing ? (
        <>
          <h2 className="mb-4 text-xl font-bold">回答が送信されました</h2>
          <div className="feedback-message feedback-success mb-6" role="alert">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mr-2 h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{feedback}</span>
          </div>
          <p className="text-base-content">
            ご回答ありがとうございました。他の参加者の回答状況は下のセクションでご確認いただけます。
          </p>
          <p className="mb-6 mt-2 text-sm text-gray-500">
            ※ 回答内容を更新したい場合は以下のボタンをクリックしてください。
          </p>
          <button type="button" onClick={handleEditClick} className="btn btn-outline btn-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mr-2 h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 1 1 3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
            回答を更新する
          </button>
        </>
      ) : (
        <>
          <h2 className="mb-4 text-xl font-bold">
            {mode === 'edit'
              ? `${initialParticipant?.name}さんの予定を編集`
              : isEditing
                ? '回答を更新する'
                : '回答する'}
          </h2>

          {error && (
            <div
              className="alert alert-error mb-4"
              role="alert"
              aria-live="assertive"
              ref={errorRef}
            >
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

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
            onClick={(e) => {
              // フォームクリック時のバブリング処理
              // セルクリックとフォーム送信の競合を防ぐ
              const target = e.target as HTMLElement;
              // セル内クリックの場合は特別処理
              if (target.closest('[data-date-id]')) {
                // ここでは何もしない（セル側で処理）
              }
            }}
          >
            {/* イベント情報を隠しフィールドとして渡す */}
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="publicToken" value={publicToken} />

            <div className={isWeekdayModeActive ? 'pointer-events-none opacity-50' : ''}>
              <label htmlFor="participant_name" className="mb-1 block text-sm font-medium">
                お名前 <span className="text-error">*</span>
              </label>
              <input
                type="text"
                id="participant_name"
                name="participant_name"
                className="input input-bordered w-full transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={false}
                disabled={isWeekdayModeActive}
              />
              {isAuthenticated && mode === 'new' && (
                <div className="bg-base-200 mt-2 rounded-md p-3 text-xs">
                  <p className="mb-2">
                    未ログイン時の回答がある場合、同じ名前の回答をアカウントに紐づけできます。
                  </p>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline"
                    onClick={() => void handleLinkExistingAnswer()}
                    disabled={isLinkingExistingAnswer || isWeekdayModeActive}
                  >
                    {isLinkingExistingAnswer ? '検索中...' : '既存回答を探して紐づける'}
                  </button>
                  {linkExistingAnswerMessage && (
                    <p className="mt-2 text-xs text-gray-600">{linkExistingAnswerMessage}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="space-y-3">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <label className="block text-sm font-medium">
                    候補日程から参加可能な日を選択してください
                    <span className="text-error">*</span>
                  </label>

                  <div
                    role="group"
                    aria-label="表示形式の選択"
                    className={`join bg-base-200 rounded-lg ${
                      isWeekdayModeActive ? 'pointer-events-none opacity-50' : ''
                    }`}
                  >
                    <button
                      type="button"
                      className={`join-item btn btn-sm ${
                        viewMode === 'heatmap'
                          ? 'btn-active bg-primary text-primary-content font-medium'
                          : 'text-base-content'
                      }`}
                      onClick={() => setViewMode('heatmap')}
                      aria-pressed={viewMode === 'heatmap'}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="mr-1 h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M5 3a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5zm0 8a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H5zm6-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V5zm0 8a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2z" />
                      </svg>
                      表
                    </button>
                    <button
                      type="button"
                      className={`join-item btn btn-sm ${
                        viewMode === 'list'
                          ? 'btn-active bg-primary text-primary-content font-medium'
                          : 'text-base-content'
                      }`}
                      onClick={() => setViewMode('list')}
                      aria-pressed={viewMode === 'list'}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="mr-1 h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3 4a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zm0 4a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zm0 4a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      個別
                    </button>
                    <button
                      type="button"
                      className={`join-item btn btn-sm ${
                        viewMode === 'table'
                          ? 'btn-active bg-primary text-primary-content font-medium'
                          : 'text-base-content'
                      }`}
                      onClick={() => setViewMode('table')}
                      aria-pressed={viewMode === 'table'}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="mr-1 h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5 4a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H5zm-1 9v-1h5v2H5a1 1 0 0 1-1-1zm7 1h4a1 1 0 0 0 1-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z"
                          clipRule="evenodd"
                        />
                      </svg>
                      リスト
                    </button>
                  </div>
                </div>
              </div>

              <div className="mb-4 flex flex-col gap-3 md:flex-row">
                <div
                  className={`bg-info/10 text-info border-info/20 flex flex-grow items-center rounded-lg border p-2 text-xs ${
                    isWeekdayModeActive ? 'opacity-50' : ''
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    className="stroke-info mr-1 h-4 w-4 flex-shrink-0"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
                    ></path>
                  </svg>
                  <span>
                    {isWeekdayModeActive
                      ? '曜日入力モード中です。設定を適用またはキャンセルしてから回答を送信してください。'
                      : 'セルをドラッグすると複数選択できます（タッチ操作も対応）'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // アコーディオンを開く/閉じる処理
                    setIsWeekdayModeActive(!isWeekdayModeActive);
                    // 週入力モードがアクティブになったときは時間帯スロットを初期化
                    if (!isWeekdayModeActive) {
                      initializeWeekdayTimeSlots();
                    }
                  }}
                  className={`btn btn-sm ${
                    isWeekdayModeActive ? 'btn-primary' : 'btn-accent'
                  } flex-shrink-0 text-xs font-medium sm:text-sm`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="mr-1 h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M6 2a1 1 0 0 1 1-1v1h8V1a1 1 0 1 1 2 0v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1zm0 5a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2H6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  曜日ごとの時間帯設定
                  {isWeekdayModeActive ? '（閉じる）' : ''}
                </button>
              </div>

              {/* 週入力アコーディオンセクション */}
              {isWeekdayModeActive && (
                <div className="mb-6 animate-fadeIn transition-all duration-300">
                  <div className="bg-base-200 border-base-300 rounded-lg border p-4 shadow-sm">
                    <h3 className="mb-4 text-lg font-bold">曜日ごとの時間帯設定</h3>
                    <p className="mb-4 text-sm">
                      曜日と時間帯で参加可能な枠を一括設定できます。表の各セルをクリックして、参加可能（○）または参加不可（×）を設定してください。
                    </p>

                    <div className="divider text-xs">曜日×時間帯表</div>

                    <div
                      className="matrix-container -mx-4 mb-4 touch-none overflow-x-hidden"
                      style={{ touchAction: 'none' }}
                    >
                      <table
                        className="table-xs table w-full table-fixed border-collapse"
                        onMouseDown={(e) => e.preventDefault()} // ドラッグ動作中のテキスト選択を防止
                        onTouchStart={(e) => e.preventDefault()} // タッチ操作中のスクロールを完全に防止
                      >
                        <thead className="sticky top-0 z-20">
                          <tr className="bg-base-200">
                            <th className="border-base-300 bg-base-200 sticky left-0 top-0 z-30 border px-2 py-1 text-center">
                              <span className="text-xs">\</span>
                            </th>
                            {Object.entries(weekdaySelections).map(([day]) => (
                              <th
                                key={day}
                                className="border-base-300 border px-1 py-1 text-center"
                              >
                                {day}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const baseSchedule = Object.values(weekdaySelections)[0];
                            const sortedTimeSlots = baseSchedule
                              ? Object.keys(baseSchedule.timeSlots).sort()
                              : [];
                            if (sortedTimeSlots.length === 0) {
                              return (
                                <tr>
                                  <td
                                    colSpan={1 + Object.keys(weekdaySelections).length}
                                    className="py-4 text-center"
                                  >
                                    利用可能な時間帯がありません
                                  </td>
                                </tr>
                              );
                            }
                            return (
                              <>
                                {sortedTimeSlots.map((timeSlot) => {
                                  const [startTime] = timeSlot.split('-');
                                  return (
                                    <tr key={timeSlot}>
                                      <td className="border-base-300 bg-base-100 sticky left-0 z-10 whitespace-nowrap border px-2 py-0 text-right">
                                        <span
                                          className="text-base-content/80 absolute left-2 text-xs font-medium leading-none"
                                          style={{ top: 0 }}
                                        >
                                          {startTime.replace(/^0/, '')}
                                        </span>
                                      </td>
                                      {Object.entries(weekdaySelections).map(
                                        ([day, daySchedule]) => {
                                          const matrixKey = getMatrixKey(day as WeekDay, timeSlot);
                                          return (
                                            <td
                                              key={`${day}-${timeSlot}`}
                                              className="border-base-300 w-16 cursor-pointer border p-0 text-center sm:w-auto"
                                              data-day={day}
                                              data-time-slot={timeSlot}
                                              data-selection-key={matrixKey}
                                              {...weekdaySelectionController.getCellProps(
                                                matrixKey,
                                                {
                                                  disabled: !isWeekdayModeActive,
                                                },
                                              )}
                                            >
                                              <div
                                                className={`flex h-7 w-full items-center justify-center rounded-none sm:rounded-sm ${
                                                  daySchedule.timeSlots[timeSlot]
                                                    ? 'bg-success text-success-content'
                                                    : 'bg-base-200'
                                                }`}
                                              >
                                                {daySchedule.timeSlots[timeSlot] ? (
                                                  <div className="inline-block select-none text-lg font-bold">
                                                    ○
                                                  </div>
                                                ) : (
                                                  <div className="inline-block select-none text-lg font-bold opacity-70">
                                                    ×
                                                  </div>
                                                )}
                                              </div>
                                            </td>
                                          );
                                        },
                                      )}
                                    </tr>
                                  );
                                })}
                                {(() => {
                                  const lastSlot = sortedTimeSlots[sortedTimeSlots.length - 1];
                                  const [, rawEnd] = lastSlot.split('-');
                                  const displayEnd =
                                    rawEnd === '24:00' ? rawEnd : rawEnd.replace(/^0/, '');
                                  return (
                                    <tr key="weekday-endtime">
                                      <td className="border-base-300 bg-base-100 sticky left-0 z-10 whitespace-nowrap border px-2 py-0 text-right">
                                        <span
                                          className="text-base-content/80 absolute left-2 text-xs font-medium leading-none"
                                          style={{ top: 0 }}
                                        >
                                          {displayEnd}
                                        </span>
                                      </td>
                                      {Object.keys(weekdaySelections).map((day) => (
                                        <td
                                          key={`${day}-endtime`}
                                          className="border-base-300 border p-0"
                                        />
                                      ))}
                                    </tr>
                                  );
                                })()}
                              </>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>

                    {Object.entries(weekdaySelections).filter(
                      ([, daySchedule]) => daySchedule.selected,
                    ).length === 0 && (
                      <div className="py-4 text-center text-sm text-gray-500">
                        曜日を選択すると、時間帯の設定が表示されます
                      </div>
                    )}

                    <div className="text-base-content/70 mb-4 text-xs">
                      ※選択した曜日の時間帯ごとに参加可否を設定できます。
                      <br />
                      チェックがついている時間帯が「参加可能」になります。
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => setIsWeekdayModeActive(false)}
                      >
                        キャンセル
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          // 選択した曜日と時間帯に基づいて日程を更新
                          applyWeekdaySelections();
                          setIsWeekdayModeActive(false);
                        }}
                      >
                        設定を適用する
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ページネーションUI - 週入力モードが無効の場合のみ表示 */}
              {!isWeekdayModeActive &&
                (viewMode === 'heatmap' || viewMode === 'table' || viewMode === 'list') &&
                heatmapData.totalPages > 1 && (
                  <div className="mb-4">
                    <WeekNavigationBar
                      periodLabel={`${heatmapData.currentDateRange?.startLabel ?? '-'} 〜 ${
                        heatmapData.currentDateRange?.endLabel ?? '-'
                      }`}
                      currentPage={currentPage}
                      totalPages={heatmapData.totalPages}
                      onPageChange={handlePageChange}
                      trailingNote="表示: 1週間"
                    />
                  </div>
                )}

              {/* 週入力モードがアクティブでない場合のみ、通常の入力フォームを表示 */}
              {!isWeekdayModeActive && (
                <>
                  {/* 選択した日程の隠しフィールド */}
                  {Object.entries(selectedDates).map(
                    ([dateId, isSelected]) =>
                      isSelected && (
                        <input
                          key={dateId}
                          type="hidden"
                          name={`availability_${dateId}`}
                          value="on"
                        />
                      ),
                  )}

                  {viewMode === 'list' && (
                    <div
                      className="grid select-none grid-cols-1 gap-1"
                      onMouseLeave={handleMouseLeave}
                    >
                      {/* リストビュー用にページネーションされたイベント日程データを準備 */}
                      {(() => {
                        // 日程を日付順にソート
                        const sortedDates = [...eventDates]
                          .sort(
                            (a, b) =>
                              new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
                          )
                          .filter((date) => {
                            if (currentWeekDateSet.size === 0) {
                              return true;
                            }
                            const dateKey = new Date(date.start_time).toISOString().split('T')[0];
                            return currentWeekDateSet.has(dateKey);
                          });

                        return sortedDates.map((date) => {
                          const { className, status } = getCellStyle(date.id);
                          const isConflict = lockedDateIdSet.has(date.id);
                          const isLocked = isConflict && !overrideDateIdSet.has(date.id);
                          const interactiveProps = dateSelectionController.getCellProps(date.id, {
                            disabled: isWeekdayModeActive || isLocked,
                          });
                          return (
                            <div
                              key={date.id}
                              data-date-id={date.id}
                              data-selection-key={date.id}
                              className={`flex items-center rounded-lg border p-3 transition-colors ${
                                status === 'available'
                                  ? 'bg-success/10 border-success/40'
                                  : 'bg-base-200/10 border-base-300/40 hover:bg-base-200/20'
                              } ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                              {...interactiveProps}
                              onClick={() => {
                                if (isLocked) {
                                  handleLockedOverride(date.id);
                                }
                              }}
                            >
                              <div
                                className={`mr-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors duration-150 ${className}`}
                              >
                                {getCellContent(status)}
                              </div>
                              <div className="grid grid-cols-1">
                                <span className="font-medium">
                                  {formatTimeRange(date.start_time, date.end_time)}
                                </span>
                                {date.label && (
                                  <span className="text-sm text-gray-500">{date.label}</span>
                                )}
                                {isConflict && (
                                  <span className="badge badge-warning mt-1 w-fit text-xs">
                                    重複しています
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}

                  {viewMode === 'table' && (
                    <div className="select-none overflow-x-auto" onMouseLeave={handleMouseLeave}>
                      <table className="table w-full table-fixed border-collapse">
                        <thead>
                          <tr className="bg-base-200">
                            <th className="border-base-300 w-32 border">日付</th>
                            <th className="border-base-300 w-32 border">時間帯</th>
                            <th className="border-base-300 w-24 border text-center">参加可否</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dateGroups.map((group) => (
                            <React.Fragment key={group.dateKey}>
                              {group.slots.map((date, index) => {
                                const start = new Date(date.start_time);
                                const end = new Date(date.end_time);
                                const timeStr = `${start
                                  .getHours()
                                  .toString()
                                  .padStart(2, '0')}:${start
                                  .getMinutes()
                                  .toString()
                                  .padStart(2, '0')}～${end
                                  .getHours()
                                  .toString()
                                  .padStart(2, '0')}:${end
                                  .getMinutes()
                                  .toString()
                                  .padStart(2, '0')}`;

                                const { className, status } = getCellStyle(date.id);
                                const isConflict = lockedDateIdSet.has(date.id);
                                const isLocked = isConflict && !overrideDateIdSet.has(date.id);

                                return (
                                  <tr key={date.id} className="hover" data-date-id={date.id}>
                                    {index === 0 && (
                                      <td
                                        rowSpan={group.slots.length}
                                        className="border-base-300 bg-base-100 border align-middle"
                                      >
                                        <div className="font-medium">{group.formattedDate}</div>
                                      </td>
                                    )}
                                    <td className="border-base-300 border">{timeStr}</td>
                                    <td className="border-base-300 w-20 border text-center sm:w-auto">
                                      <div
                                        className={`flex h-10 w-full items-center justify-center rounded-none transition-colors duration-200 ease-in-out sm:rounded-md ${className} ${
                                          isLocked ? 'cursor-not-allowed' : 'cursor-pointer'
                                        }`}
                                        data-selection-key={date.id}
                                        {...dateSelectionController.getCellProps(date.id, {
                                          disabled: isWeekdayModeActive || isLocked,
                                        })}
                                        onClick={() => {
                                          if (isLocked) {
                                            handleLockedOverride(date.id);
                                          }
                                        }}
                                      >
                                        {getCellContent(status)}
                                      </div>
                                      {isConflict && (
                                        <div className="mt-1 text-center">
                                          <span className="badge badge-warning text-xs">
                                            重複しています
                                          </span>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {viewMode === 'heatmap' && (
                    <div
                      className="table-container-mobile select-none overflow-x-auto overscroll-contain"
                      style={{
                        overscrollBehaviorY: 'contain',
                        touchAction: dateSelectionController.isDragging ? 'none' : 'pan-x', // ドラッグ中はタッチ操作を無効化
                      }}
                      onMouseLeave={handleMouseLeave}
                    >
                      <table className="table-xs sm:table-sm table w-full table-fixed border-collapse">
                        <thead className="sticky top-0 z-20">
                          <tr className="bg-base-200">
                            <th className="border-base-300 bg-base-200 sticky left-0 top-0 z-30 w-12 border px-1 py-1 text-center sm:w-24 sm:px-2 sm:py-3">
                              <span className="text-xs sm:text-sm">時間</span>
                            </th>
                            {heatmapData.dates.map((date) => (
                              <th
                                key={date.dateKey}
                                className="border-base-300 heatmap-cell-mobile border px-1 py-1 text-center sm:px-2 sm:py-3"
                              >
                                <span className="whitespace-nowrap text-xs sm:text-sm">
                                  {date.formattedDate.split('(')[0]}
                                  <br />
                                  <span className="text-xs text-gray-500">
                                    ({date.formattedDate.split('(')[1]}
                                  </span>
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {/* Spacer for top time label */}
                          <tr>
                            <td className="bg-base-100 sticky left-0 z-10 h-3 sm:h-4"></td>
                          </tr>
                          {heatmapData.timeSlots.map((timeSlot) => {
                            const [startTime] = timeSlot.split('-');
                            const formattedStartTime = startTime.replace(/^0/, '');

                            return (
                              <tr key={timeSlot} className="hover">
                                <td className="border-base-300 bg-base-100 sticky left-0 z-10 whitespace-nowrap border px-2 py-0 text-center font-medium">
                                  <span
                                    className="text-base-content/80 absolute left-2 text-xs font-medium sm:text-sm"
                                    style={{
                                      top: 0,
                                      transform: 'translateY(-50%)',
                                    }}
                                  >
                                    {formattedStartTime}
                                  </span>
                                </td>
                                {heatmapData.dates.map((date) => {
                                  const dateId = heatmapData.dateMap[date.dateKey]?.[timeSlot];
                                  const { className, status } = getCellStyle(dateId);
                                  const isConflict = dateId ? lockedDateIdSet.has(dateId) : false;
                                  const isLocked =
                                    Boolean(dateId) && isConflict && !overrideDateIdSet.has(dateId);

                                  return (
                                    <td
                                      key={`${date.dateKey}-${timeSlot}`}
                                      className="border-base-300 w-16 border p-0 text-center sm:w-auto"
                                      data-date-id={dateId}
                                    >
                                      {dateId ? (
                                        <div
                                          className={`flex h-9 w-full items-center justify-center rounded-none transition-colors duration-150 sm:h-10 sm:rounded-sm ${className} ${
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
                                          title={
                                            isConflict ? '確定イベントと重複しています' : undefined
                                          }
                                        >
                                          {getCellContent(status)}
                                        </div>
                                      ) : (
                                        <div className="bg-base-200/30 text-base-content/30 flex h-9 w-full items-center justify-center rounded-none sm:h-10 sm:rounded-sm">
                                          <span className="text-xs sm:text-sm">ー</span>
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                          {/* Row for the last end time */}
                          {heatmapData.timeSlots.length > 0 &&
                            (() => {
                              const lastTimeSlot =
                                heatmapData.timeSlots[heatmapData.timeSlots.length - 1];
                              const [, endTime] = lastTimeSlot.split('-');
                              let formattedEndTime = endTime.replace(/^0/, '');
                              if (endTime === '00:00') {
                                formattedEndTime = '24:00';
                              }
                              return (
                                <tr className="h-0">
                                  <td className="border-base-300 bg-base-100 sticky left-0 z-10 whitespace-nowrap border px-2 py-0 text-center font-medium">
                                    <span
                                      className="text-base-content/80 absolute left-2 text-xs font-medium sm:text-sm"
                                      style={{
                                        top: 0,
                                        transform: 'translateY(-50%)',
                                      }}
                                    >
                                      {formattedEndTime}
                                    </span>
                                  </td>
                                  {heatmapData.dates.map((date) => (
                                    <td key={`${date.dateKey}-endtime-filler`} />
                                  ))}
                                </tr>
                              );
                            })()}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-4">
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
                disabled={isWeekdayModeActive}
              />
            </div>

            {/* 初期反映の確認ダイアログ */}
            {showPrefillModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-base-100 w-full max-w-md rounded-lg p-6 shadow-xl">
                  <h3 className="mb-2 text-lg font-bold">過去の予定から反映しますか？</h3>
                  <p className="mb-6 text-sm text-gray-600">
                    ログイン中の予定情報をもとに、回答の初期値を設定できます。
                  </p>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={skipAutoFill} className="btn btn-outline">
                      まっさらで始める
                    </button>
                    <button type="button" onClick={applyAutoFill} className="btn btn-primary">
                      反映する（推奨）
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 名前重複時の確認ダイアログ */}
            {showOverwriteConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-base-100 w-full max-w-md rounded-lg p-6 shadow-xl">
                  <h3 className="mb-4 text-lg font-bold">同じ名前の回答が既に存在します</h3>
                  <p className="mb-6">
                    「{name}
                    」さんの回答は既に登録されています。上書きしてもよろしいですか？
                    <br />
                    （以前の回答は削除されます）
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowOverwriteConfirm(false)}
                      className="btn btn-outline"
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setShowOverwriteConfirm(false);
                        if (pendingFormData) {
                          setPendingFormData(null);
                          promptSyncScope(pendingFormData);
                        }
                      }}
                      className="btn btn-primary"
                    >
                      上書きする
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 同期範囲の確認ダイアログ */}
            {showSyncConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-base-100 w-full max-w-md rounded-lg p-6 shadow-xl">
                  <h3 className="mb-4 text-lg font-bold">変更の反映範囲</h3>
                  <p className="mb-6 text-sm text-gray-600">
                    この変更を他のイベントにも反映しますか？
                  </p>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSyncConfirm(false);
                        setPendingSyncFormData(null);
                        setIsSubmitting(false);
                      }}
                      className="btn btn-outline"
                    >
                      キャンセル
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
                      全イベントへ反映
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className={`flex flex-wrap gap-2 pt-4 ${isWeekdayModeActive ? 'opacity-50' : ''}`}>
              <TermsCheckbox
                isChecked={termsAccepted}
                onChange={setTermsAccepted}
                id="availability-form-terms"
                disabled={isWeekdayModeActive}
              />

              <button
                type="submit"
                className={`btn btn-primary w-full md:w-auto ${
                  isSubmitting || isWeekdayModeActive || isCheckingName ? 'opacity-70' : ''
                }`}
                disabled={isSubmitting || isWeekdayModeActive || isCheckingName}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm mr-2"></span>
                    {isEditing ? '保存中...' : '送信中...'}
                  </>
                ) : isCheckingName ? (
                  <>
                    <span className="loading loading-spinner loading-sm mr-2"></span>
                    名前を確認中...
                  </>
                ) : isWeekdayModeActive ? (
                  '曜日ごとの設定を完了してください'
                ) : mode === 'edit' ? (
                  '回答を更新する'
                ) : (
                  '回答を送信'
                )}
              </button>

              {/* キャンセルボタン - 入力ページに戻る */}
              <a
                href={isSubmitting || isWeekdayModeActive ? '#' : `/event/${publicToken}`}
                className={`btn btn-outline w-full md:w-auto ${
                  isSubmitting || isWeekdayModeActive ? 'pointer-events-none opacity-60' : ''
                }`}
                onClick={(e) => (isSubmitting || isWeekdayModeActive) && e.preventDefault()}
              >
                キャンセル
              </a>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
