import React from 'react';
import type { ParticipantSummary } from '@/types/participant';
import { formatParticipantUpdatedAt } from '@/lib/tooltip-utils';

interface MobileInfoPanelProps {
  show: boolean;
  dateLabel?: string;
  timeLabel?: string;
  availableParticipants: ParticipantSummary[];
  unavailableParticipants: ParticipantSummary[];
  onClose: () => void;
}

const MobileInfoPanel: React.FC<MobileInfoPanelProps> = ({
  show,
  dateLabel,
  timeLabel,
  availableParticipants,
  unavailableParticipants,
  onClose,
}) => {
  if (!show) return null;
  const hasNoParticipants =
    availableParticipants.length === 0 && unavailableParticipants.length === 0;

  return (
    <div
      className="fixed left-0 right-0 z-50 px-2"
      style={{
        top: 'env(safe-area-inset-top, 0px)',
        marginTop: '52px',
        pointerEvents: 'auto',
      }}
    >
      <div
        className="bg-base-100 border-base-300 mx-auto w-full rounded-b-lg border-b sm:max-w-[560px]"
        role="dialog"
        aria-modal="false"
        aria-label="回答詳細パネル"
        style={{
          maxHeight: '56vh',
          overflowY: 'auto',
          boxShadow: '0 8px 32px 0 rgba(31,41,55,0.25)',
        }}
      >
        {/* ドラッグバー風アクセント＋タイトル＋閉じる */}
        <div className="bg-base-100/95 sticky top-0 z-10 flex flex-col items-center px-2 pb-1 pt-2">
          <div className="bg-base-300 mb-1 h-1 w-10 rounded-full" />
          <div className="flex min-h-8 w-full items-center justify-between">
            {(dateLabel || timeLabel) && (
              <div className="text-base-content max-w-[68vw] truncate text-sm font-bold sm:max-w-[460px] sm:text-base">
                {dateLabel} {timeLabel}
              </div>
            )}
            <button
              onClick={onClose}
              className="btn btn-sm btn-circle btn-ghost ml-2 text-lg"
              aria-label="閉じる"
              style={{ minWidth: 32, minHeight: 32 }}
            >
              ✕
            </button>
          </div>
        </div>
        <div className="px-2 pb-2">
          {hasNoParticipants ? (
            <div className="text-base-content/80 py-4 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto mb-2 h-6 w-6"
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
              <p className="text-base">まだ回答者がいません</p>
            </div>
          ) : (
            <div>
              {availableParticipants.length > 0 && (
                <div className="mb-3">
                  <div className="text-success mb-1 flex items-center gap-2 font-medium">
                    <span className="bg-success h-3 w-3 flex-shrink-0 rounded-full"></span>
                    <span className="text-sm">参加可能（{availableParticipants.length}名）</span>
                  </div>
                  <ul className="text-primary list-disc pl-5 text-sm">
                    {availableParticipants.map((p, idx) => {
                      const updatedAt = formatParticipantUpdatedAt(p.updated_at);
                      return (
                        <li key={`avail-${idx}`} className="mb-1">
                          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                            <span className="min-w-0 truncate">{p.name}</span>
                            {updatedAt && (
                              <span className="text-base-content/50 text-[10px] leading-tight">
                                最終更新 {updatedAt}
                              </span>
                            )}
                          </div>
                          {p.comment && (
                            <div className="text-base-content/60 break-words text-xs">
                              {p.comment}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {unavailableParticipants.length > 0 && (
                <div>
                  <div className="text-error mb-1 flex items-center gap-2 font-medium">
                    <span className="bg-error h-3 w-3 flex-shrink-0 rounded-full"></span>
                    <span className="text-sm">参加不可（{unavailableParticipants.length}名）</span>
                  </div>
                  <ul className="text-primary list-disc pl-5 text-sm">
                    {unavailableParticipants.map((p, idx) => {
                      const updatedAt = formatParticipantUpdatedAt(p.updated_at);
                      return (
                        <li key={`unavail-${idx}`} className="mb-1">
                          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                            <span className="min-w-0 truncate">{p.name}</span>
                            {updatedAt && (
                              <span className="text-base-content/50 text-[10px] leading-tight">
                                最終更新 {updatedAt}
                              </span>
                            )}
                          </div>
                          {p.comment && (
                            <div className="text-base-content/60 break-words text-xs">
                              {p.comment}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileInfoPanel;
