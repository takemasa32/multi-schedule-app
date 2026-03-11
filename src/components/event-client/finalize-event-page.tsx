'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { addDays, endOfWeek, format, startOfWeek } from 'date-fns';
import { finalizeEvent } from '@/lib/actions';
import ConfirmationModal from '@/components/common/confirmation-modal';
import WizardProgress from '@/components/common/wizard-progress';
import WeekNavigationBar from '@/components/week-navigation-bar';
import useScrollToError from '@/hooks/useScrollToError';
import useSelectionDragController from '@/hooks/useSelectionDragController';
import { useDeviceDetect } from '@/hooks/useDeviceDetect';

type FinalizeEventPageProps = {
  eventId: string;
  publicToken: string;
  eventTitle: string;
  eventDates: {
    id: string;
    start_time: string;
    end_time: string;
    label?: string;
  }[];
  availabilities: {
    participant_id: string;
    event_date_id: string;
    availability: boolean;
  }[];
  participants: {
    id: string;
    name: string;
    comment?: string | null;
  }[];
  finalizedDateIds?: string[];
};

type FinalizeStep = 1 | 2;
type ConfirmationKind = 'save' | 'clear' | null;

const finalizeSteps = [
  { label: '候補を選ぶ', shortLabel: '選択' },
  { label: '内容を確認', shortLabel: '確認' },
];

const scrollToTop = () => {
  if (typeof window === 'undefined' || typeof window.scrollTo !== 'function') {
    return;
  }

  try {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch {
    // テスト環境では scrollTo が未実装なことがあるため何もしない
  }
};

/**
 * 日程確定専用ページの本体
 * @param {FinalizeEventPageProps} props 日程確定に必要な情報
 * @returns {JSX.Element} 日程確定ページ
 */
export default function FinalizeEventPage({
  eventId,
  publicToken,
  eventTitle,
  eventDates,
  availabilities,
  participants,
  finalizedDateIds = [],
}: FinalizeEventPageProps) {
  const router = useRouter();
  const { isMobile } = useDeviceDetect();
  const [currentStep, setCurrentStep] = useState<FinalizeStep>(1);
  const [selectedDateIds, setSelectedDateIds] = useState<string[]>(finalizedDateIds);
  const [confirmationKind, setConfirmationKind] = useState<ConfirmationKind>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekIndex, setWeekIndex] = useState(0);
  const errorRef = useRef<HTMLDivElement | null>(null);

  useScrollToError(error, errorRef);

  const extractDateString = (dateString: string) => {
    const date = new Date(dateString);
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  };

  const extractTimeString = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getHours().toString().padStart(2, '0')}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  };

  const dateOrderMap = useMemo(
    () => new Map(eventDates.map((eventDate, index) => [eventDate.id, index])),
    [eventDates],
  );

  const sortDateIds = useCallback(
    (dateIds: Iterable<string>) =>
      Array.from(new Set(dateIds)).sort((a, b) => {
        return (dateOrderMap.get(a) ?? Number.MAX_SAFE_INTEGER) - (dateOrderMap.get(b) ?? Number.MAX_SAFE_INTEGER);
      }),
    [dateOrderMap],
  );

  useEffect(() => {
    setSelectedDateIds(sortDateIds(finalizedDateIds));
  }, [finalizedDateIds, sortDateIds]);

  const dateMap = useMemo(
    () => new Map(eventDates.map((eventDate) => [eventDate.id, eventDate])),
    [eventDates],
  );

  const selectedDateIdSet = useMemo(() => new Set(selectedDateIds), [selectedDateIds]);
  const finalizedDateIdSet = useMemo(() => new Set(finalizedDateIds), [finalizedDateIds]);

  const dateKeys = useMemo(
    () =>
      Array.from(new Set(eventDates.map((eventDate) => extractDateString(eventDate.start_time)))).sort(),
    [eventDates],
  );

  const weekAnchors = useMemo(() => {
    if (dateKeys.length === 0) return [] as string[];

    const first = startOfWeek(new Date(`${dateKeys[0]}T00:00:00`), { weekStartsOn: 1 });
    const last = endOfWeek(new Date(`${dateKeys[dateKeys.length - 1]}T00:00:00`), {
      weekStartsOn: 1,
    });

    const anchors: string[] = [];
    for (let cursor = new Date(first); cursor <= last; cursor = addDays(cursor, 7)) {
      anchors.push(format(cursor, 'yyyy-MM-dd'));
    }

    return anchors;
  }, [dateKeys]);

  useEffect(() => {
    if (weekAnchors.length === 0) return;
    setWeekIndex((prev) => Math.min(prev, weekAnchors.length - 1));
  }, [weekAnchors]);

  const visibleDates = useMemo(() => {
    if (weekAnchors.length === 0) return [] as string[];
    const monday = new Date(`${weekAnchors[Math.min(weekIndex, weekAnchors.length - 1)]}T00:00:00`);
    return Array.from({ length: 7 }, (_, index) => format(addDays(monday, index), 'yyyy-MM-dd'));
  }, [weekAnchors, weekIndex]);

  const weekLabel = useMemo(() => {
    if (visibleDates.length === 0) return '';
    const first = new Date(`${visibleDates[0]}T00:00:00`).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const last = new Date(`${visibleDates[visibleDates.length - 1]}T00:00:00`).toLocaleDateString(
      'ja-JP',
      {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      },
    );
    return `${first} 〜 ${last}`;
  }, [visibleDates]);

  const { timeSlots, dateTimeMap } = useMemo(() => {
    const timeSet = new Set<string>();
    const map: Record<string, Record<string, string>> = {};

    eventDates.forEach((eventDate) => {
      const dateKey = extractDateString(eventDate.start_time);
      const timeSlot = `${extractTimeString(eventDate.start_time)}-${extractTimeString(
        eventDate.end_time,
      )}`;
      timeSet.add(timeSlot);
      map[dateKey] ??= {};
      map[dateKey][timeSlot] = eventDate.id;
    });

    const orderedTimeSlots = Array.from(timeSet).sort((left, right) => left.localeCompare(right));

    return { timeSlots: orderedTimeSlots, dateTimeMap: map };
  }, [eventDates]);

  const lastEndLabel = useMemo(() => {
    if (timeSlots.length === 0) return null;
    const [, endTime] = timeSlots[timeSlots.length - 1].split('-');
    return endTime === '24:00' ? endTime : endTime.replace(/^0/, '');
  }, [timeSlots]);

  const getHeaderDisplayParts = useCallback((dateStr: string, prevDateStr: string | null) => {
    const current = new Date(`${dateStr}T00:00:00`);
    const prev = prevDateStr ? new Date(`${prevDateStr}T00:00:00`) : null;

    const year = current.getFullYear();
    const month = current.getMonth() + 1;
    const day = current.getDate();
    const weekday = current.toLocaleDateString('ja-JP', { weekday: 'short' });

    const label = (() => {
      if (!prev) return `${month}/${day}`;
      if (year !== prev.getFullYear()) return `${year}/${month}/${day}`;
      if (month !== prev.getMonth() + 1) return `${month}/${day}`;
      return String(day);
    })();

    return { label, weekday };
  }, []);

  const formatDateLabel = (dateId: string) => {
    const eventDate = dateMap.get(dateId);
    if (!eventDate) return '不明な日程';
    const start = new Date(eventDate.start_time);
    const end = new Date(eventDate.end_time);
    return `${start.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    })} ${start.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    })}〜${end.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  const getAvailableParticipantsCount = (dateId: string) =>
    availabilities.filter((availability) => {
      return availability.event_date_id === dateId && availability.availability;
    }).length;

  const maxAvailableParticipantsCount = useMemo(() => {
    const countMap = availabilities.reduce<Record<string, number>>((acc, availability) => {
      if (!availability.availability) {
        return acc;
      }

      acc[availability.event_date_id] = (acc[availability.event_date_id] ?? 0) + 1;
      return acc;
    }, {});

    return eventDates.reduce((maxCount, eventDate) => {
      return Math.max(maxCount, countMap[eventDate.id] ?? 0);
    }, 0);
  }, [eventDates, availabilities]);

  const getParticipantsForAllSelectedDates = () => {
    if (selectedDateIds.length === 0) return [];

    const allParticipantIds = [...new Set(participants.map((participant) => participant.id))];
    const availableByDate = selectedDateIds.map((dateId) =>
      availabilities
        .filter((availability) => availability.event_date_id === dateId && availability.availability)
        .map((availability) => availability.participant_id),
    );

    const availableForAll = allParticipantIds.filter((participantId) =>
      availableByDate.every((dateParticipants) => dateParticipants.includes(participantId)),
    );

    return participants
      .filter((participant) => availableForAll.includes(participant.id))
      .map((participant) => participant.name);
  };

  const intersectionParticipants = getParticipantsForAllSelectedDates();

  const unchangedSelection =
    selectedDateIds.length === finalizedDateIds.length &&
    selectedDateIds.every((dateId) => finalizedDateIdSet.has(dateId));

  const newSelectedDateIds = selectedDateIds.filter((dateId) => !finalizedDateIdSet.has(dateId));
  const removedDateIds = finalizedDateIds.filter((dateId) => !selectedDateIdSet.has(dateId));
  const keptDateIds = finalizedDateIds.filter((dateId) => selectedDateIdSet.has(dateId));

  const applySelection = useCallback(
    (keys: string[], selected: boolean) => {
      setSelectedDateIds((prev) => {
        const next = new Set(prev);
        let changed = false;

        keys.forEach((key) => {
          if (selected) {
            if (!next.has(key)) {
              next.add(key);
              changed = true;
            }
            return;
          }

          if (next.delete(key)) {
            changed = true;
          }
        });

        return changed ? sortDateIds(next) : prev;
      });
    },
    [sortDateIds],
  );

  const dateSelectionController = useSelectionDragController({
    isSelected: (key) => selectedDateIdSet.has(key),
    applySelection,
    disableBodyScroll: true,
    enableKeyboard: false,
  });

  const proceedToConfirm = () => {
    if (selectedDateIds.length === 0 && finalizedDateIds.length === 0) {
      setError('少なくとも1つの日程を選択してください。');
      return;
    }
    setError(null);
    setCurrentStep(2);
    scrollToTop();
  };

  const handleBack = () => {
    setError(null);
    if (currentStep === 2) {
      setCurrentStep(1);
      scrollToTop();
      return;
    }
    router.push(`/event/${publicToken}`);
  };

  const openConfirmModal = () => {
    if (selectedDateIds.length === 0 && finalizedDateIds.length > 0) {
      setConfirmationKind('clear');
      return;
    }
    setConfirmationKind('save');
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await finalizeEvent(eventId, selectedDateIds);

      if (!result.success) {
        setError(result.message ?? '確定処理に失敗しました。');
        setConfirmationKind(null);
        setIsProcessing(false);
        return;
      }

      const status = selectedDateIds.length === 0 ? 'cleared' : 'saved';
      router.replace(`/event/${publicToken}?finalize_status=${status}`);
      router.refresh();
    } catch (caughtError) {
      console.error('確定処理でエラーが発生しました:', caughtError);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : '確定処理中にエラーが発生しました。',
      );
      setConfirmationKind(null);
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-2.5 md:space-y-6">
      <div className="rounded-2xl border border-base-300 bg-base-100 p-2.5 shadow-sm sm:p-4 md:rounded-3xl md:p-6">
        <WizardProgress
          currentStep={currentStep}
          steps={finalizeSteps}
          currentLabel={currentStep === 1 ? '日程を選ぶ' : '内容を確認する'}
        />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold md:text-2xl">{eventTitle}</h1>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-full border border-base-300 bg-base-200 px-3 py-1.5 text-sm font-semibold">
              {selectedDateIds.length}件選択中
            </div>
            {finalizedDateIds.length > 0 && (
              <div className="rounded-full border border-base-300 bg-base-200 px-3 py-1.5 text-sm text-base-content/70">
                現在 {finalizedDateIds.length}件
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" ref={errorRef}>
          <span>{error}</span>
        </div>
      )}

      {currentStep === 1 ? (
        <>
          <section className="rounded-2xl border border-base-300 bg-base-100 p-2.5 shadow-sm sm:p-4 md:rounded-3xl md:p-6">
            <div className="mb-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 sm:gap-3">
              <div className="rounded-2xl bg-base-200 px-3 py-2.5">
                <p className="text-[11px] text-base-content/60">選択中</p>
                <p className="mt-1 text-base font-bold md:text-lg">{selectedDateIds.length}件</p>
              </div>
              <div className="rounded-2xl bg-base-200 px-3 py-2.5">
                <p className="text-[11px] text-base-content/60">全選択で参加可能</p>
                <p className="mt-1 text-base font-bold md:text-lg">{intersectionParticipants.length}人</p>
              </div>
              <div className="rounded-2xl bg-base-200 px-3 py-2.5">
                <p className="text-[11px] text-base-content/60">総参加者</p>
                <p className="mt-1 text-base font-bold md:text-lg">{participants.length}人</p>
              </div>
            </div>

            {finalizedDateIds.length > 0 && (
              <div className="alert alert-info mt-4 text-sm">
                <div>
                  <p className="font-semibold">現在の確定</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {finalizedDateIds.map((dateId) => (
                      <li key={dateId}>{formatDateLabel(dateId)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {weekAnchors.length > 1 && (
              <div className="mt-4">
                <WeekNavigationBar
                  periodLabel={weekLabel}
                  currentPage={weekIndex}
                  totalPages={weekAnchors.length}
                  onPageChange={setWeekIndex}
                  periodPrefix="表示:"
                  trailingNote="1週間"
                  hidePageIndicator={isMobile}
                />
              </div>
            )}

            <div
              className="mt-4 select-none overflow-x-auto overscroll-contain rounded-2xl border border-base-300"
              style={{
                overscrollBehaviorY: 'contain',
                touchAction: dateSelectionController.isDragging ? 'none' : 'pan-x',
              }}
            >
              <table className="table-xs border-base-300 table w-full min-w-0 table-fixed border-collapse border text-center">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-base-200">
                    <th className="border-base-300 bg-base-200 sticky left-0 top-0 z-30 w-11 border px-1 py-2 text-center md:w-14 md:px-2 md:py-3">
                      <span className="text-xs">時間</span>
                    </th>
                    {visibleDates.map((dateKey, index) => {
                      const prevDate = index > 0 ? visibleDates[index - 1] : null;
                      const parts = getHeaderDisplayParts(dateKey, prevDate);
                      return (
                        <th
                          key={dateKey}
                          className="border-base-300 heatmap-cell-mobile border px-0 py-0 text-center md:px-1 md:py-2"
                        >
                          <div className="flex flex-col items-center leading-tight">
                            <span className="text-xs font-semibold md:text-sm">{parts.label}</span>
                            <span className="text-xs text-base-content/60">({parts.weekday})</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th className="bg-base-100 border-base-300 sticky left-0 z-10 h-1 border p-0 md:h-3" />
                    {visibleDates.map((dateKey) => (
                      <td key={`${dateKey}-spacer`} className="h-1 md:h-3" />
                    ))}
                  </tr>
                  {timeSlots.map((timeSlot, rowIndex) => {
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
                        {visibleDates.map((dateKey) => {
                          const dateId = dateTimeMap[dateKey]?.[timeSlot] ?? null;
                          const isSelected = dateId ? selectedDateIdSet.has(dateId) : false;
                          const availableCount = dateId ? getAvailableParticipantsCount(dateId) : 0;
                          const availabilityPercent =
                            participants.length > 0
                              ? Math.round((availableCount / participants.length) * 100)
                              : 0;
                          const isPeakAvailability =
                            availableCount > 0 && availableCount === maxAvailableParticipantsCount;

                          if (!dateId) {
                            return (
                              <td key={`${dateKey}-${timeSlot}`} className="border-base-300 border p-0 md:p-px">
                                <div className="bg-base-200/30 text-base-content/30 flex aspect-square w-full items-center justify-center rounded-sm px-1 text-xs font-semibold leading-none shadow-[inset_0_0_0_1px_rgba(148,163,184,0.14)] md:h-11 md:aspect-auto md:rounded-md md:px-2 md:text-sm">
                                  -
                                </div>
                              </td>
                            );
                          }

                          let bgStyle = {};
                          if (isPeakAvailability) {
                            bgStyle = {
                              backgroundColor: 'rgba(16, 185, 129, 0.98)',
                              color: 'rgb(236, 253, 245)',
                            };
                          } else if (availabilityPercent >= 75) {
                            bgStyle = { backgroundColor: 'rgba(52, 211, 153, 0.8)' };
                          } else if (availabilityPercent >= 50) {
                            bgStyle = { backgroundColor: 'rgba(52, 211, 153, 0.6)' };
                          } else if (availabilityPercent >= 25) {
                            bgStyle = { backgroundColor: 'rgba(251, 191, 36, 0.6)' };
                          } else if (availabilityPercent > 0) {
                            bgStyle = { backgroundColor: 'rgba(248, 113, 113, 0.45)' };
                          } else {
                            bgStyle = { backgroundColor: 'rgba(226, 232, 240, 0.7)' };
                          }

                          const contentStyle = isSelected
                            ? {
                                ...bgStyle,
                                boxShadow:
                                  'inset 0 0 0 2px rgb(29, 78, 216), inset 0 0 0 999px rgba(37, 99, 235, 0.38), 0 8px 18px rgba(37, 99, 235, 0.16)',
                                color: 'rgb(239, 246, 255)',
                              }
                            : bgStyle;

                          return (
                            <td
                              key={`${dateKey}-${timeSlot}`}
                              className="border-base-300 border p-0 md:p-px"
                            >
                              <button
                                type="button"
                                data-selection-key={dateId}
                                className="flex aspect-square w-full items-center justify-center rounded-sm px-1.5 text-xs font-semibold leading-none tabular-nums shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] transition-[transform,colors,box-shadow] duration-150 md:h-11 md:aspect-auto md:rounded-md md:px-2 md:text-sm"
                                style={contentStyle}
                                {...dateSelectionController.getCellProps(dateId, {
                                  role: 'switch',
                                })}
                                aria-pressed={isSelected}
                                aria-label={isSelected ? '選択済み' : '未選択'}
                              >
                                <div className="flex flex-col items-center justify-center leading-none">
                                  <span>{isMobile ? availableCount : `${availableCount}人`}</span>
                                  {!isMobile && (
                                    <span
                                      className={`mt-1 text-[10px] ${
                                        isSelected ? 'text-primary-content/90' : 'text-base-content/70'
                                      }`}
                                    >
                                      {availabilityPercent}%
                                    </span>
                                  )}
                                </div>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {lastEndLabel && (
                    <tr className="h-0">
                      <th className="bg-base-100 border-base-300 relative border px-1 py-0 text-right md:px-2">
                        <span className="absolute left-2 top-0 -translate-y-1/2 text-xs font-medium">
                          {lastEndLabel}
                        </span>
                      </th>
                      {visibleDates.map((dateKey) => (
                        <td key={`${dateKey}-endtime`} className="border-base-300 border p-0" />
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {intersectionParticipants.length > 0 && (
              <div className="mt-4 rounded-2xl border border-base-300 bg-base-200/60 px-4 py-3">
                <p className="text-sm font-semibold">
                  すべての選択日程で参加可能: {intersectionParticipants.length}人
                </p>
              </div>
            )}
          </section>

          <div className="sticky bottom-2 z-20 rounded-2xl border border-base-300 bg-base-100/95 px-2.5 py-2.5 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:bottom-3 sm:px-4 sm:py-3 md:static md:rounded-3xl md:px-6 md:py-4 md:shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold">選択中 {selectedDateIds.length}件</p>
                <p className="text-xs text-base-content/70 md:text-sm">
                  {selectedDateIds.length > 0
                    ? '確認へ進めます。'
                    : finalizedDateIds.length > 0
                      ? '0件にすると解除します。'
                      : '1件以上選んでください。'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row">
                <Link href={`/event/${publicToken}`} className="btn btn-ghost btn-sm sm:btn-md">
                  詳細へ戻る
                </Link>
                <button type="button" className="btn btn-primary btn-sm sm:btn-md" onClick={proceedToConfirm}>
                  内容を確認する
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <section className="rounded-2xl border border-base-300 bg-base-100 p-2.5 shadow-sm sm:p-4 md:rounded-3xl md:p-6">
            <h2 className="text-lg font-semibold md:text-xl">変更内容の確認</h2>

            {unchangedSelection ? (
              <div className="alert alert-info mt-4 text-sm">
                <span>現在の確定内容から変更はありません。</span>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-2 md:gap-4">
                <div className="rounded-2xl border border-base-300 bg-base-200/60 px-3 py-3 md:p-4">
                  <p className="text-sm font-semibold">新しく確定する</p>
                  <p className="mt-1 text-lg font-bold md:text-2xl">{newSelectedDateIds.length}件</p>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-200/60 px-3 py-3 md:p-4">
                  <p className="text-sm font-semibold">解除する</p>
                  <p className="mt-1 text-lg font-bold md:text-2xl">{removedDateIds.length}件</p>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-200/60 px-3 py-3 md:p-4">
                  <p className="text-sm font-semibold">維持する</p>
                  <p className="mt-1 text-lg font-bold md:text-2xl">{keptDateIds.length}件</p>
                </div>
              </div>
            )}

            <div className="mt-4 grid gap-4 xl:grid-cols-3">
              <div className="rounded-2xl border border-base-300 p-4">
                <h3 className="font-semibold text-success">今回確定する日程</h3>
                {selectedDateIds.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm">
                    {selectedDateIds.map((dateId) => (
                      <li key={dateId} className="rounded-xl bg-base-200/70 px-3 py-2">
                        <p>{formatDateLabel(dateId)}</p>
                        <p className="mt-1 text-base-content/60">
                          参加可能 {getAvailableParticipantsCount(dateId)}人
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-base-content/60">
                    今回はすべての確定を解除します。
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-base-300 p-4">
                <h3 className="font-semibold text-error">解除される日程</h3>
                {removedDateIds.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm">
                    {removedDateIds.map((dateId) => (
                      <li key={dateId} className="rounded-xl bg-error/10 px-3 py-2">
                        {formatDateLabel(dateId)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-base-content/60">解除される日程はありません。</p>
                )}
              </div>

              <div className="rounded-2xl border border-base-300 p-4">
                <h3 className="font-semibold">全選択で参加可能な人</h3>
                {intersectionParticipants.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                    {intersectionParticipants.map((participantName) => (
                      <li key={participantName} className="badge badge-outline badge-lg px-3 py-3">
                        {participantName}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-base-content/60">
                    全選択に共通して参加できる人はいません。
                  </p>
                )}
              </div>
            </div>
          </section>

          <div className="rounded-2xl border border-base-300 bg-base-100 p-2.5 shadow-sm sm:p-4 md:rounded-3xl md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-base-content/70">
                {selectedDateIds.length === 0 && finalizedDateIds.length > 0
                  ? 'この操作で、現在の確定をすべて解除します。'
                  : '問題なければ保存します。'}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row">
                <button type="button" className="btn btn-ghost btn-sm sm:btn-md" onClick={handleBack}>
                  選び直す
                </button>
                <button type="button" className="btn btn-primary btn-sm sm:btn-md" onClick={openConfirmModal}>
                  {selectedDateIds.length === 0 && finalizedDateIds.length > 0
                    ? 'この内容で解除する'
                    : 'この内容で保存する'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <ConfirmationModal
        isOpen={confirmationKind !== null}
        title={
          confirmationKind === 'clear'
            ? 'すべての確定を解除しますか？'
            : 'この内容で日程を確定しますか？'
        }
        description={
          confirmationKind === 'clear'
            ? '現在確定している日程をすべて解除します。必要ならあとで同じ画面から再度選択できます。'
            : '保存するとイベント詳細ページの確定表示が更新されます。あとから再調整も可能です。'
        }
        confirmLabel={confirmationKind === 'clear' ? '解除する' : '保存する'}
        confirmButtonClassName={confirmationKind === 'clear' ? 'btn-warning' : 'btn-primary'}
        isConfirming={isProcessing}
        confirmingLabel={confirmationKind === 'clear' ? '解除中...' : '保存中...'}
        onCancel={() => {
          if (isProcessing) return;
          setConfirmationKind(null);
        }}
        onConfirm={handleConfirm}
        widthClassName="max-w-2xl"
      >
        <div className="space-y-3 text-sm">
          {selectedDateIds.length > 0 ? (
            <div>
              <p className="font-semibold">確定後の日程</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {selectedDateIds.map((dateId) => (
                  <li key={dateId}>{formatDateLabel(dateId)}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p>確定済みの日程は 0 件になります。</p>
          )}
          {removedDateIds.length > 0 && (
            <div>
              <p className="font-semibold text-error">解除される日程</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {removedDateIds.map((dateId) => (
                  <li key={dateId}>{formatDateLabel(dateId)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </ConfirmationModal>
    </div>
  );
}
