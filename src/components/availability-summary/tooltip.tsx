import React, { useState, useEffect } from "react";
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
  /** デバッグ用: 最後にトリガーとなったイベント名 */
  lastEvent?: string;
  /** デバッグ用: 最後に更新されたタイムスタンプ */
  lastUpdate?: number;
}

interface TooltipProps {
  tooltip: TooltipState;
  portalElement: HTMLDivElement | null;
}

/**
 * デバッグ用: TooltipState の内容とデバイスタイプを表示するコンポーネント
 * 不要になったらこのブロックごと削除してください
 */
const TooltipDebug: React.FC<{ tooltip: TooltipState }> = ({ tooltip }) => {
  const [deviceType, setDeviceType] = React.useState<string>("判定中");
  React.useEffect(() => {
    const updateType = () => {
      if (typeof window !== "undefined") {
        setDeviceType(window.innerWidth < 640 ? "スマホ用" : "PC用");
      }
    };
    updateType();
    window.addEventListener("resize", updateType);
    return () => window.removeEventListener("resize", updateType);
  }, []);
  return (
    <div className="fixed bottom-2 right-2 z-[2000] bg-base-200 text-xs p-2 rounded shadow border border-base-300 max-w-xs break-all opacity-90">
      <div className="font-bold mb-1 text-secondary">Tooltipデバッグ情報</div>
      <div className="mb-1">
        デバイスタイプ: <span className="font-mono">{deviceType}</span>
      </div>
      <pre className="whitespace-pre-wrap text-xs leading-tight">
        {JSON.stringify(tooltip, null, 2)}
      </pre>
    </div>
  );
};

/**
 * 参加者情報を表示するツールチップコンポーネント
 */
export const Tooltip: React.FC<TooltipProps> = ({ tooltip, portalElement }) => {
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(portalElement);
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

  // --- デバッグ表示: tooltip.showに関係なく常に表示 ---
  // 不要になったら <TooltipDebug ... /> を削除してください
  //
  // 画面右下にデバッグ情報を表示
  //
  // ...既存のreturnの前に追加...
  //
  //
  // ...existing code...
  //
  // ツールチップ本体の表示（show=falseでもデバッグは出る）
  //
  // ...existing code...

  // 参加者情報が全くない場合
  const hasNoParticipants =
    tooltip.availableParticipants.length === 0 &&
    tooltip.unavailableParticipants.length === 0;

  // --- デバッグ表示 ---
  // show=falseでも必ずデバッグ情報を表示
  //
  // 既存のreturnの前にデバッグ表示を返す
  //
  //
  // ...existing code...
  //
  // show=falseならツールチップ本体は出さずデバッグのみ返す
  if (!rootEl) return <TooltipDebug tooltip={tooltip} />;
  if (!tooltip.show) return <TooltipDebug tooltip={tooltip} />;

  return (
    <>
      <TooltipDebug tooltip={tooltip} />
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
          onMouseEnter={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => {
            e.stopPropagation();
            e.preventDefault();
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
