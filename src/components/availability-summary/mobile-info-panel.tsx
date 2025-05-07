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
      className="fixed bottom-0 left-0 right-0 bg-base-100/95 border-t-4 border-primary p-4 z-50 shadow-2xl animate-slideUp max-h-80 overflow-auto rounded-t-2xl transition-all duration-200"
      style={{ boxShadow: "0 8px 32px 0 rgba(31,41,55,0.25)" }}
    >
      {/* ドラッグバー風アクセント */}
      <div className="flex flex-col items-center mb-2">
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-2" />
        <div className="flex justify-between items-center w-full">
          {(dateLabel || timeLabel) && (
            <div className="font-bold text-base-content text-lg">
              {dateLabel} {timeLabel}
            </div>
          )}
          <button
            onClick={onClose}
            className="btn btn-md btn-circle btn-ghost text-xl"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
      </div>
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
            <div className="mb-4">
              <div className="font-medium text-success mb-2 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-success flex-shrink-0"></span>
                <span className="text-base">
                  参加可能（{availableParticipants.length}名）
                </span>
              </div>
              <ul className="pl-6 list-disc text-primary text-base">
                {availableParticipants.map((name, idx) => (
                  <li key={`avail-${idx}`} className="mb-1">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {unavailableParticipants.length > 0 && (
            <div>
              <div className="font-medium text-error mb-2 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-error flex-shrink-0"></span>
                <span className="text-base">
                  参加不可（{unavailableParticipants.length}名）
                </span>
              </div>
              <ul className="pl-6 list-disc text-primary text-base">
                {unavailableParticipants.map((name, idx) => (
                  <li key={`unavail-${idx}`} className="mb-1">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MobileInfoPanel;
