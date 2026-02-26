import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ParticipantSummary } from '@/types/participant';

// ツールチップの状態を表す型
export interface TooltipState {
  show: boolean;
  x: number;
  y: number;
  dateId: string | null;
  availableParticipants: ParticipantSummary[];
  unavailableParticipants: ParticipantSummary[];
  dateLabel?: string;
  timeLabel?: string;
  /** デバッグ用: 最後にトリガーとなったイベント名 */
  lastEvent?: string;
  /** デバッグ用: 最後に更新されたタイムスタンプ */
  lastUpdate?: number;
  /** 最後に開いたPointer種別（"touch"|"mouse"|"pen"） */
  lastPointerType?: 'touch' | 'mouse' | 'pen';
}

interface TooltipProps {
  tooltip: TooltipState;
  portalElement: HTMLDivElement | null;
}

const VIEWPORT_PADDING = 8;
const TOOLTIP_OFFSET = 10;

/**
 * 参加者情報を表示するツールチップコンポーネント
 */
export const Tooltip: React.FC<TooltipProps> = ({ tooltip, portalElement }) => {
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(portalElement);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: tooltip.x + TOOLTIP_OFFSET,
    y: tooltip.y + TOOLTIP_OFFSET,
  });
  // 自動非表示タイマー用ref
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  // タッチ操作中フラグ
  const isTouchActiveRef = useRef<boolean>(false);

  // portalElementが渡されない場合のフォールバック生成
  useEffect(() => {
    if (portalElement) {
      setRootEl(portalElement);
      return;
    }
    const id = 'tooltip-portal';
    let elem = document.getElementById(id) as HTMLDivElement | null;
    if (!elem) {
      elem = document.createElement('div');
      elem.id = id;
      document.body.appendChild(elem);
    }
    setRootEl(elem);
    return () => {
      // クリーンアップ不要（永続的にbodyに置く）
    };
  }, [portalElement]);

  // スマホタッチで開いた場合は一定時間後に自動で非表示
  useEffect(() => {
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
    if (tooltip.show && tooltip.lastPointerType === 'touch') {
      autoHideTimerRef.current = setTimeout(() => {
        if (tooltip.show && !isTouchActiveRef.current) {
          window.dispatchEvent(new CustomEvent('tooltip:autohide'));
        }
      }, 3000);
    }
    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = null;
      }
    };
  }, [tooltip.show, tooltip.lastPointerType]);

  // 参加者情報が全くない場合
  const hasNoParticipants =
    tooltip.availableParticipants.length === 0 && tooltip.unavailableParticipants.length === 0;

  const updateTooltipPosition = useCallback(() => {
    if (typeof window === 'undefined') return;
    const tooltipEl = tooltipRef.current;
    if (!tooltipEl) {
      setPosition({ x: tooltip.x + TOOLTIP_OFFSET, y: tooltip.y + TOOLTIP_OFFSET });
      return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const rect = tooltipEl.getBoundingClientRect();
    const width = Math.min(rect.width, viewportWidth - VIEWPORT_PADDING * 2);
    const height = Math.min(rect.height, viewportHeight - VIEWPORT_PADDING * 2);

    let nextX = tooltip.x + TOOLTIP_OFFSET;
    let nextY = tooltip.y + TOOLTIP_OFFSET;

    if (nextX + width > viewportWidth - VIEWPORT_PADDING) {
      nextX = Math.max(VIEWPORT_PADDING, viewportWidth - width - VIEWPORT_PADDING);
    }
    if (nextY + height > viewportHeight - VIEWPORT_PADDING) {
      nextY = Math.max(VIEWPORT_PADDING, viewportHeight - height - VIEWPORT_PADDING);
    }

    setPosition((prev) => {
      if (Math.abs(prev.x - nextX) < 1 && Math.abs(prev.y - nextY) < 1) {
        return prev;
      }
      return { x: nextX, y: nextY };
    });
  }, [tooltip.x, tooltip.y]);

  useEffect(() => {
    if (!tooltip.show) return;
    const rafId = window.requestAnimationFrame(updateTooltipPosition);
    window.addEventListener('resize', updateTooltipPosition, { passive: true });
    window.addEventListener('scroll', updateTooltipPosition, { passive: true, capture: true });
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateTooltipPosition);
      window.removeEventListener('scroll', updateTooltipPosition, true);
    };
  }, [tooltip.show, updateTooltipPosition]);

  // ツールチップ自体へのポインターイベントハンドラ
  const handleTooltipPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (e.pointerType === 'touch') {
      isTouchActiveRef.current = true;
    }
  };

  const handleTooltipPointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (e.pointerType === 'touch') {
      isTouchActiveRef.current = false;
    }
  };

  if (!rootEl) return null;
  if (!tooltip.show) return null;

  return (
    <>
      {createPortal(
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            top: `${position.y}px`,
            left: `${position.x}px`,
            zIndex: 1000,
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
            padding: '12px',
            maxWidth: 'min(320px, calc(100vw - 16px))',
            maxHeight: 'min(70vh, 420px)',
            overflowY: 'auto',
            fontSize: '14px',
          }}
          className="bg-base-100 border-base-300 rounded-lg border p-3 shadow-lg"
          onPointerDown={handleTooltipPointerDown}
          onPointerUp={handleTooltipPointerUp}
          onPointerEnter={(e) => {
            e.stopPropagation();
            if (autoHideTimerRef.current) {
              clearTimeout(autoHideTimerRef.current);
              autoHideTimerRef.current = null;
            }
          }}
          onPointerLeave={(e) => {
            e.stopPropagation();
            if (tooltip.lastPointerType === 'touch') {
              autoHideTimerRef.current = setTimeout(() => {
                window.dispatchEvent(new CustomEvent('tooltip:autohide'));
              }, 3000);
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {/* 日付・時間ラベルを先頭に表示 */}
          {(tooltip.dateLabel || tooltip.timeLabel) && (
            <div className="mb-2 text-center text-base">
              {tooltip.dateLabel && (
                <span className="text-primary font-bold">{tooltip.dateLabel}</span>
              )}
              {tooltip.dateLabel && tooltip.timeLabel && <span> </span>}
              {tooltip.timeLabel && (
                <span className="text-secondary font-bold">{tooltip.timeLabel}</span>
              )}
            </div>
          )}
          {hasNoParticipants ? (
            <div className="py-2 text-center text-base-content/80">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto mb-1 h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p>まだ回答者がいません</p>
            </div>
          ) : (
            <>
              {tooltip.availableParticipants.length > 0 && (
                <div className="mb-3">
                  <div className="text-success mb-2 flex items-center gap-1.5 font-medium">
                    <span className="bg-success h-3.5 w-3.5 flex-shrink-0 rounded-full"></span>
                    <span>参加可能（{tooltip.availableParticipants.length}名）</span>
                  </div>
                  <ul className="text-primary list-disc pl-5">
                    {tooltip.availableParticipants.map((p, idx) => (
                      <li key={`avail-${idx}`} className="mb-0.5">
                        {p.name}
                        {p.comment && (
                          <div className="break-words text-xs text-base-content/60">{p.comment}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {tooltip.unavailableParticipants.length > 0 && (
                <div>
                  <div className="text-error mb-2 flex items-center gap-1.5 font-medium">
                    <span className="bg-error h-3.5 w-3.5 flex-shrink-0 rounded-full"></span>
                    <span>参加不可（{tooltip.unavailableParticipants.length}名）</span>
                  </div>
                  <ul className="text-primary list-disc pl-5">
                    {tooltip.unavailableParticipants.map((p, idx) => (
                      <li key={`unavail-${idx}`} className="mb-0.5">
                        {p.name}
                        {p.comment && (
                          <div className="break-words text-xs text-base-content/60">{p.comment}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {tooltip.availableParticipants.length === 0 &&
                tooltip.unavailableParticipants.length > 0 && (
                  <div className="mt-2 border-t border-base-300 pt-2 text-sm text-base-content/60">
                    <p>参加可能な方はいません</p>
                  </div>
                )}
            </>
          )}
        </div>,
        rootEl,
      )}
    </>
  );
};

/**
 * タイプガード：タッチイベントかどうかを判定
 */
export function isTouchEvent(
  e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>,
): e is React.TouchEvent<HTMLElement> {
  return 'touches' in e || 'changedTouches' in e;
}
