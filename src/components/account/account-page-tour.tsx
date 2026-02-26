'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import {
  setAccountPageTourState,
  shouldAutoStartAccountPageTour,
  type AccountPageTourStatus,
} from '@/lib/account-tour';

type AccountTourPlacement = 'top' | 'bottom';

export type AccountTourStep = {
  id: string;
  target: string;
  title: string;
  description: string;
  placement?: AccountTourPlacement;
  optional?: boolean;
};

type AccountPageTourProps = {
  initialIsAuthenticated: boolean;
};

type HighlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const HIGHLIGHT_OFFSET_PX = 4;
const HIGHLIGHT_RADIUS_PX = 16;
const buildRoundedRectPath = (
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): string => {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  return [
    `M${x + r} ${y}`,
    `H${x + width - r}`,
    `A${r} ${r} 0 0 1 ${x + width} ${y + r}`,
    `V${y + height - r}`,
    `A${r} ${r} 0 0 1 ${x + width - r} ${y + height}`,
    `H${x + r}`,
    `A${r} ${r} 0 0 1 ${x} ${y + height - r}`,
    `V${y + r}`,
    `A${r} ${r} 0 0 1 ${x + r} ${y}`,
    'Z',
  ].join(' ');
};

const ACCOUNT_TOUR_STEPS: AccountTourStep[] = [
  {
    id: 'profile',
    target: '[data-tour-id="account-profile-card"]',
    title: 'アカウント情報',
    description:
      'ここで表示名とメールアドレスを確認できます。ログアウトや連携解除も行えます。',
    placement: 'bottom',
  },
  {
    id: 'schedule-overview',
    target: '[data-tour-id="account-schedule-templates"]',
    title: '予定の設定',
    description:
      'このエリアで予定をまとめて管理します。タブで「日付ごとの予定」と「曜日ごとの予定」を切り替えます。',
    placement: 'bottom',
  },
  {
    id: 'dated-edit',
    target: '[data-tour-id="account-dated-edit"]',
    title: '日付ごとの予定を編集',
    description:
      '「編集する」から日付ごとの予定を変更できます。変更内容は下の「回答イベントへの反映」で確認できます。',
    placement: 'bottom',
  },
  {
    id: 'weekly-tab',
    target: '[data-tour-id="account-tab-weekly"]',
    title: '曜日ごとの予定',
    description: '毎週くり返す予定は、このタブで設定します。',
    placement: 'bottom',
  },
  {
    id: 'sync-section',
    target: '[data-tour-id="account-sync-section"]',
    title: '回答イベントへの反映',
    description:
      '予定を変えたあと、どのイベントに反映されるか確認してから適用できます。',
    placement: 'top',
  },
  {
    id: 'favorites-history',
    target: '[data-tour-id="account-favorite-history"]',
    title: 'お気に入りと回答履歴',
    description:
      'お気に入りイベントと回答履歴を確認できます。よく使うイベントの再アクセスや過去回答の確認に利用します。',
    placement: 'top',
  },
  {
    id: 'tour-finish',
    target: '[data-testid="account-tour-open"]',
    title: 'ツアーは以上です',
    description: 'もう一度見たいときは「使い方ツアー」を押してください。',
    placement: 'bottom',
  },
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const findFirstStepIndex = (): number =>
  ACCOUNT_TOUR_STEPS.findIndex((step) => document.querySelector(step.target));

const findNextStepIndex = (currentIndex: number, direction: 1 | -1): number => {
  let cursor = currentIndex + direction;
  while (cursor >= 0 && cursor < ACCOUNT_TOUR_STEPS.length) {
    const step = ACCOUNT_TOUR_STEPS[cursor];
    if (document.querySelector(step.target)) return cursor;
    cursor += direction;
  }
  return -1;
};

const getTargetRect = (step: AccountTourStep): HighlightRect | null => {
  const target = document.querySelector(step.target);
  if (!target) return null;
  const rect = target.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
  };
};

const scrollToStepTarget = (step: AccountTourStep) => {
  const target = document.querySelector(step.target);
  if (!target) return;
  target.scrollIntoView({ block: 'center', behavior: 'smooth' });
};

const saveTourState = (status: AccountPageTourStatus) => {
  setAccountPageTourState(status);
};

export default function AccountPageTour({ initialIsAuthenticated }: AccountPageTourProps) {
  const { status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [tooltipHeight, setTooltipHeight] = useState(0);
  const initialScrollYRef = useRef(0);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const isAuthenticated =
    status === 'authenticated' || (status === 'loading' && initialIsAuthenticated);
  const currentStep = ACCOUNT_TOUR_STEPS[currentStepIndex];

  const visibleStepIndexes = useMemo(() => {
    if (!isOpen || typeof document === 'undefined') return [];
    return ACCOUNT_TOUR_STEPS.flatMap((step, index) =>
      document.querySelector(step.target) ? [index] : [],
    );
  }, [isOpen]);
  const visibleStepCount =
    visibleStepIndexes.length > 0 ? visibleStepIndexes.length : ACCOUNT_TOUR_STEPS.length;
  const currentVisibleStepIndex = visibleStepIndexes.indexOf(currentStepIndex);
  const currentVisibleStepNumber =
    currentVisibleStepIndex >= 0
      ? currentVisibleStepIndex + 1
      : Math.min(currentStepIndex + 1, visibleStepCount);
  const progressPercent = Math.round((currentVisibleStepNumber / visibleStepCount) * 100);

  const refreshRect = useCallback(
    (index: number) => {
      const step = ACCOUNT_TOUR_STEPS[index];
      const rect = getTargetRect(step);
      setHighlightRect(rect);
    },
    [setHighlightRect],
  );

  const openTour = useCallback(() => {
    const first = findFirstStepIndex();
    if (first < 0) return;
    initialScrollYRef.current = typeof window === 'undefined' ? 0 : window.scrollY;
    setCurrentStepIndex(first);
    setIsOpen(true);
    scrollToStepTarget(ACCOUNT_TOUR_STEPS[first]);
    window.setTimeout(() => {
      refreshRect(first);
    }, 120);
  }, [refreshRect]);

  const closeTour = useCallback(
    (statusToSave: AccountPageTourStatus) => {
      saveTourState(statusToSave);
      setIsOpen(false);
      setHighlightRect(null);
      if (statusToSave === 'completed' && typeof window !== 'undefined') {
        const isJestLikeEnv =
          typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
        if (isJestLikeEnv) return;
        try {
          window.scrollTo({ top: initialScrollYRef.current, behavior: 'smooth' });
        } catch {
          // テスト環境（JSDOM）では scrollTo 未実装のため無視する。
        }
      }
    },
    [setIsOpen],
  );

  const moveStep = useCallback(
    (direction: 1 | -1) => {
      const nextIndex = findNextStepIndex(currentStepIndex, direction);
      if (nextIndex < 0) {
        if (direction === 1) closeTour('completed');
        return;
      }
      setCurrentStepIndex(nextIndex);
      scrollToStepTarget(ACCOUNT_TOUR_STEPS[nextIndex]);
      window.setTimeout(() => {
        refreshRect(nextIndex);
      }, 120);
    },
    [closeTour, currentStepIndex, refreshRect],
  );

  useEffect(() => {
    if (!isAuthenticated || status !== 'authenticated') return;
    if (!shouldAutoStartAccountPageTour()) return;
    openTour();
  }, [isAuthenticated, status, openTour]);

  useEffect(() => {
    if (!isOpen) return;
    const step = ACCOUNT_TOUR_STEPS[currentStepIndex];
    const hasTarget = Boolean(document.querySelector(step.target));
    if (hasTarget) {
      refreshRect(currentStepIndex);
      return;
    }
    const nextIndex = findNextStepIndex(currentStepIndex, 1);
    if (nextIndex < 0) {
      closeTour('completed');
      return;
    }
    setCurrentStepIndex(nextIndex);
  }, [closeTour, currentStepIndex, isOpen, refreshRect]);

  useEffect(() => {
    if (!isOpen) return;
    const update = () => {
      refreshRect(currentStepIndex);
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [currentStepIndex, isOpen, refreshRect]);

  useEffect(() => {
    if (!isOpen) return;
    const updateTooltipHeight = () => {
      const nextHeight = tooltipRef.current?.getBoundingClientRect().height ?? 0;
      setTooltipHeight((prev) => (Math.abs(prev - nextHeight) < 1 ? prev : nextHeight));
    };
    const frame = window.requestAnimationFrame(updateTooltipHeight);
    window.addEventListener('resize', updateTooltipHeight);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updateTooltipHeight);
    };
  }, [currentStepIndex, isOpen]);

  const tooltipStyle = useMemo(() => {
    if (!highlightRect) return undefined;
    if (typeof window === 'undefined') return undefined;
    const safeViewportPadding = 12;
    const maxHeight = Math.max(180, window.innerHeight - safeViewportPadding * 2);
    const measuredTooltipHeight = tooltipHeight > 0 ? tooltipHeight : 260;

    const isMobile = window.innerWidth < 640;
    if (isMobile) {
      return {
        position: 'fixed' as const,
        left: safeViewportPadding,
        right: safeViewportPadding,
        bottom: safeViewportPadding,
        width: 'auto',
        maxHeight,
      };
    }

    const width = Math.min(360, Math.max(260, window.innerWidth * 0.28));
    const topCandidate = highlightRect.top - window.scrollY - 16;
    const bottomCandidate = highlightRect.top - window.scrollY + highlightRect.height + 16;
    const useTop = currentStep.placement === 'top' || topCandidate > 240;
    const top = useTop ? topCandidate - measuredTooltipHeight : bottomCandidate;
    const minTop = safeViewportPadding;
    const maxTop = Math.max(minTop, window.innerHeight - measuredTooltipHeight - safeViewportPadding);
    return {
      position: 'fixed' as const,
      width,
      maxHeight,
      top: clamp(top, minTop, maxTop),
      left: clamp(
        highlightRect.left - window.scrollX + highlightRect.width / 2 - width / 2,
        safeViewportPadding,
        window.innerWidth - width - safeViewportPadding,
      ),
    };
  }, [currentStep.placement, highlightRect, tooltipHeight]);

  const currentStepPositionText = `${currentVisibleStepNumber} / ${visibleStepCount}`;
  const highlightViewportRect =
    highlightRect && typeof window !== 'undefined'
      ? {
          top: highlightRect.top - window.scrollY - HIGHLIGHT_OFFSET_PX,
          left: highlightRect.left - window.scrollX - HIGHLIGHT_OFFSET_PX,
          width: highlightRect.width + HIGHLIGHT_OFFSET_PX * 2,
          height: highlightRect.height + HIGHLIGHT_OFFSET_PX * 2,
        }
      : null;
  const viewportSize =
    typeof window !== 'undefined'
      ? { width: window.innerWidth, height: window.innerHeight }
      : { width: 0, height: 0 };

  return (
    <>
      {isAuthenticated && (
        <button
          type="button"
          className="btn btn-sm btn-outline"
          data-testid="account-tour-open"
          onClick={openTour}
        >
          使い方ツアー
        </button>
      )}

      {isOpen && currentStep && (
        <>
          {highlightViewportRect ? (
            <svg
              className="fixed inset-0 z-40"
              width={viewportSize.width}
              height={viewportSize.height}
              viewBox={`0 0 ${viewportSize.width} ${viewportSize.height}`}
              aria-hidden="true"
            >
              <path
                d={`M0 0H${viewportSize.width}V${viewportSize.height}H0V0Z ${buildRoundedRectPath(
                  highlightViewportRect.left,
                  highlightViewportRect.top,
                  highlightViewportRect.width,
                  highlightViewportRect.height,
                  HIGHLIGHT_RADIUS_PX,
                )}`}
                fill="rgba(0,0,0,0.3)"
                fillRule="evenodd"
              />
            </svg>
          ) : (
            <div className="fixed inset-0 z-40 bg-black/30" aria-hidden="true" />
          )}
          {highlightRect && (
            <div
              className="border-primary pointer-events-none fixed z-50 border-2"
              style={{
                top: highlightViewportRect?.top ?? 0,
                left: highlightViewportRect?.left ?? 0,
                width: highlightViewportRect?.width ?? 0,
                height: highlightViewportRect?.height ?? 0,
                borderRadius: HIGHLIGHT_RADIUS_PX,
              }}
              aria-hidden="true"
            />
          )}

          <div
            ref={tooltipRef}
            className="bg-base-100 fixed z-50 overflow-y-auto rounded-2xl border border-base-300 shadow-xl"
            style={tooltipStyle}
            role="dialog"
            aria-modal="true"
            aria-label="アカウントページの使い方"
            data-testid="account-tour-dialog"
          >
            <div className="bg-primary h-1 w-full" />
            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="bg-primary/12 text-primary inline-flex h-8 w-8 items-center justify-center rounded-full">
                    <Sparkles size={16} aria-hidden="true" />
                  </span>
                  <h2 className="text-base font-semibold">アカウントページの使い方</h2>
                </div>
                <span className="bg-base-200 text-base-content/70 rounded-full px-2.5 py-1 text-xs font-medium">
                  {currentStepPositionText}
                </span>
              </div>

              <progress
                className="progress progress-primary h-1.5 w-full"
                value={progressPercent}
                max={100}
              />

              <div>
                <p className="text-base font-semibold">{currentStep.title}</p>
                <p className="text-base-content/70 mt-1.5 text-sm leading-relaxed">
                  {currentStep.description}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-ghost text-base-content/70 hover:text-base-content"
                  onClick={() => closeTour('skipped')}
                  data-testid="account-tour-skip"
                >
                  スキップ
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => moveStep(-1)}
                    disabled={findNextStepIndex(currentStepIndex, -1) < 0}
                    data-testid="account-tour-prev"
                  >
                    <ChevronLeft size={14} aria-hidden="true" />
                    戻る
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => moveStep(1)}
                    data-testid="account-tour-next"
                  >
                    {findNextStepIndex(currentStepIndex, 1) < 0 ? '完了' : '次へ'}
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
