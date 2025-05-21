import React from "react";

interface MobileInfoPanelProps {
  show: boolean;
  dateLabel?: string;
  timeLabel?: string;
  availableParticipants: string[];
  unavailableParticipants: string[];
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
      className="fixed left-0 right-0 z-50"
      style={{
        top: "env(safe-area-inset-top, 0px)",
        marginTop: "56px", // ヘッダー分の余白（必要に応じて調整）
        pointerEvents: "auto",
      }}
    >
      <div
        className="mx-auto bg-base-100/95 border-b-4 border-primary shadow-2xl animate-slideDown rounded-b-2xl transition-all duration-200"
        style={{
          maxHeight: "50vh", // 画面の半分まで
          overflowY: "auto",
          boxShadow: "0 8px 32px 0 rgba(31,41,55,0.25)",
          width: "96%",
        }}
      >
        {/* ドラッグバー風アクセント＋タイトル＋閉じる */}
        <div className="flex flex-col items-center pt-2 pb-1 px-2 sticky top-0 bg-base-100/95 z-10">
          <div className="w-10 h-1 bg-gray-300 rounded-full mb-1" />
          <div className="flex justify-between items-center w-full min-h-8">
            {(dateLabel || timeLabel) && (
              <div className="font-bold text-base-content text-base truncate max-w-[70vw]">
                {dateLabel} {timeLabel}
              </div>
            )}
            <button
              onClick={onClose}
              className="btn btn-sm btn-circle btn-ghost text-lg ml-2"
              aria-label="閉じる"
              style={{ minWidth: 32, minHeight: 32 }}
            >
              ✕
            </button>
          </div>
        </div>
        <div className="px-2 pb-2">
          {hasNoParticipants ? (
            <div className="text-center text-gray-500 py-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 mx-auto mb-2"
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
                  <div className="font-medium text-success mb-1 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-success flex-shrink-0"></span>
                    <span className="text-sm">
                      参加可能（{availableParticipants.length}名）
                    </span>
                  </div>
                  <ul className="pl-5 list-disc text-primary text-sm">
                    {availableParticipants.map((name, idx) => (
                      <li key={`avail-${idx}`} className="mb-0.5 truncate">
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {unavailableParticipants.length > 0 && (
                <div>
                  <div className="font-medium text-error mb-1 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-error flex-shrink-0"></span>
                    <span className="text-sm">
                      参加不可（{unavailableParticipants.length}名）
                    </span>
                  </div>
                  <ul className="pl-5 list-disc text-primary text-sm">
                    {unavailableParticipants.map((name, idx) => (
                      <li key={`unavail-${idx}`} className="mb-0.5 truncate">
                        {name}
                      </li>
                    ))}
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
