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
    <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 p-4 z-50 shadow-lg animate-slideUp max-h-80 overflow-auto">
      <div className="flex justify-between items-center mb-2">
        {(dateLabel || timeLabel) && (
          <div className="font-bold">
            {dateLabel} {timeLabel}
          </div>
        )}
        <button
          onClick={onClose}
          className="btn btn-sm btn-circle btn-ghost"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>
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
        <div>
          {availableParticipants.length > 0 && (
            <div className="mb-3">
              <div className="font-medium text-success mb-2 flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-success flex-shrink-0"></span>
                <span>参加可能（{availableParticipants.length}名）</span>
              </div>
              <ul className="pl-5 list-disc text-primary">
                {availableParticipants.map((name, idx) => (
                  <li key={`avail-${idx}`} className="mb-0.5">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {unavailableParticipants.length > 0 && (
            <div>
              <div className="font-medium text-error mb-2 flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-error flex-shrink-0"></span>
                <span>参加不可（{unavailableParticipants.length}名）</span>
              </div>
              <ul className="pl-5 list-disc text-primary">
                {unavailableParticipants.map((name, idx) => (
                  <li key={`unavail-${idx}`} className="mb-0.5">
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
