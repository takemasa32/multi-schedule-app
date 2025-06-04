import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ParticipantSummary } from "@/types/participant";

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
  lastPointerType?: "touch" | "mouse" | "pen";
}

interface TooltipProps {
  tooltip: TooltipState;
  portalElement: HTMLDivElement | null;
}

/**
 * 参加者情報を表示するツールチップコンポーネント
 */
export const Tooltip: React.FC<TooltipProps> = ({ tooltip, portalElement }) => {
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(portalElement);
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
    const id = "tooltip-portal";
    let elem = document.getElementById(id) as HTMLDivElement | null;
    if (!elem) {
      elem = document.createElement("div");
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
    if (tooltip.show && tooltip.lastPointerType === "touch") {
      autoHideTimerRef.current = setTimeout(() => {
        if (tooltip.show && !isTouchActiveRef.current) {
          window.dispatchEvent(new CustomEvent("tooltip:autohide"));
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
    tooltip.availableParticipants.length === 0 &&
    tooltip.unavailableParticipants.length === 0;

  // ツールチップ自体へのポインターイベントハンドラ
  const handleTooltipPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (e.pointerType === "touch") {
      isTouchActiveRef.current = true;
    }
  };

  const handleTooltipPointerUp = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (e.pointerType === "touch") {
      isTouchActiveRef.current = false;
    }
  };

  if (!rootEl) return null;
  if (!tooltip.show) return null;

  return (
    <>
      {createPortal(
        <div
          style={{
            position: "fixed",
            top: `${tooltip.y + 10}px`,
            left: `${tooltip.x + 10}px`,
            zIndex: 1000,
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
            padding: "12px",
            maxWidth: "300px",
            fontSize: "14px",
          }}
          className="bg-base-100 border border-base-300 shadow-lg p-3 rounded-lg"
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
            if (tooltip.lastPointerType === "touch") {
              autoHideTimerRef.current = setTimeout(() => {
                window.dispatchEvent(new CustomEvent("tooltip:autohide"));
              }, 3000);
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {/* 日付・時間ラベルを先頭に表示 */}
          {(tooltip.dateLabel || tooltip.timeLabel) && (
            <div className="mb-2 text-base text-center">
              {tooltip.dateLabel && (
                <span className="font-bold text-primary">
                  {tooltip.dateLabel}
                </span>
              )}
              {tooltip.dateLabel && tooltip.timeLabel && <span> </span>}
              {tooltip.timeLabel && (
                <span className="font-bold text-secondary">
                  {tooltip.timeLabel}
                </span>
              )}
            </div>
          )}
          {hasNoParticipants ? (
            <div className="text-center text-gray-500 py-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mx-auto mb-1"
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
                  <div className="font-medium text-success mb-2 flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-success flex-shrink-0"></span>
                    <span>
                      参加可能（{tooltip.availableParticipants.length}名）
                    </span>
                  </div>
                  <ul className="pl-5 list-disc text-primary">
                    {tooltip.availableParticipants.map((p, idx) => (
                      <li key={`avail-${idx}`} className="mb-0.5">
                        {p.name}
                        {p.comment && (
                          <div className="text-xs text-gray-500 break-words">
                            {p.comment}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {tooltip.unavailableParticipants.length > 0 && (
                <div>
                  <div className="font-medium text-error mb-2 flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-error flex-shrink-0"></span>
                    <span>
                      参加不可（{tooltip.unavailableParticipants.length}名）
                    </span>
                  </div>
                  <ul className="pl-5 list-disc text-primary">
                    {tooltip.unavailableParticipants.map((p, idx) => (
                      <li key={`unavail-${idx}`} className="mb-0.5">
                        {p.name}
                        {p.comment && (
                          <div className="text-xs text-gray-500 break-words">
                            {p.comment}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {tooltip.availableParticipants.length === 0 &&
                tooltip.unavailableParticipants.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200 text-gray-500 text-sm">
                    <p>参加可能な方はいません</p>
                  </div>
                )}
            </>
          )}
        </div>,
        rootEl
      )}
    </>
  );
};

/**
 * タイプガード：タッチイベントかどうかを判定
 */
export function isTouchEvent(
  e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>
): e is React.TouchEvent<HTMLElement> {
  return "touches" in e || "changedTouches" in e;
}
