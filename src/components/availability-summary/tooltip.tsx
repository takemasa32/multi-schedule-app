import React from "react";
import { createPortal } from "react-dom";

// ツールチップの状態を表す型
export interface TooltipState {
  show: boolean;
  x: number;
  y: number;
  dateId: string | null;
  availableParticipants: string[];
  unavailableParticipants: string[];
  dateLabel?: string;
  timeLabel?: string;
}

interface TooltipProps {
  tooltip: TooltipState;
  portalElement: HTMLDivElement | null;
}

/**
 * 参加者情報を表示するツールチップコンポーネント
 */
export const Tooltip: React.FC<TooltipProps> = ({ tooltip, portalElement }) => {
  if (!tooltip.show || !portalElement) return null;

  const tooltipStyle = {
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
  } as React.CSSProperties;

  // 参加者情報が全くない場合
  const hasNoParticipants =
    tooltip.availableParticipants.length === 0 &&
    tooltip.unavailableParticipants.length === 0;

  return createPortal(
    <div
      style={tooltipStyle}
      className="bg-base-100 border border-base-300 shadow-lg p-3 rounded-lg"
      onMouseEnter={(e) => e.stopPropagation()}
    >
      {/* 日付・時間ラベルを先頭に表示 */}
      {(tooltip.dateLabel || tooltip.timeLabel) && (
        <div className="mb-2 text-base text-center">
          {tooltip.dateLabel && (
            <span className="font-bold text-primary">{tooltip.dateLabel}</span>
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
                {tooltip.availableParticipants.map((name, idx) => (
                  <li key={`avail-${idx}`} className="mb-0.5">
                    {name}
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
                {tooltip.unavailableParticipants.map((name, idx) => (
                  <li key={`unavail-${idx}`} className="mb-0.5">
                    {name}
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
          {/* {tooltip.unavailableParticipants.length === 0 &&
            tooltip.availableParticipants.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200 text-gray-500 text-sm">
                <p>参加不可の方はいません</p>
              </div>
            )} */}
        </>
      )}
    </div>,
    portalElement
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
