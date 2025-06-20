import React from "react";
import { formatTime } from "./date-utils";

/**
 * リスト表示モードのプロパティ
 */
interface ListViewProps {
  summary: Array<{
    dateId: string;
    startTime: string;
    endTime: string;
    label?: string | null;
    availableCount: number;
    unavailableCount: number;
    isSelected: boolean;
    formattedDate: string;
  }>;
  /**
   * ツールチップ表示用: Pointerイベントで呼ばれる
   */
  onPointerTooltipStart?: (
    e: React.PointerEvent<Element>,
    dateId: string
  ) => void;
  onPointerTooltipEnd?: (
    e: React.PointerEvent<Element>,
    dateId: string
  ) => void;
  onPointerTooltipClick?: (
    e: React.PointerEvent<Element>,
    dateId: string
  ) => void;
  eventDates: Array<{ start_time: string; end_time: string }>;
}

/**
 * リスト表示モード
 */
const ListView: React.FC<ListViewProps> = ({
  summary,
  onPointerTooltipStart,
  onPointerTooltipEnd,
  onPointerTooltipClick,
  eventDates,
}) => {
  return (
    <div className="overflow-x-auto fade-in -mx-2 sm:mx-0">
      <table className="table table-xs w-full min-w-[340px]">
        <thead>
          <tr>
            <th>日程</th>
            <th>時間</th>
            <th className="text-center">参加可能 / 不可</th>
          </tr>
        </thead>
        <tbody>
          {summary.map((item) => (
            <tr
              key={item.dateId}
              className={`${
                item.isSelected ? "bg-success bg-opacity-10" : ""
              } hover:bg-base-200 transition-colors`}
            >
              <td className="whitespace-nowrap">
                <span className="font-medium text-xs sm:text-sm">
                  {item.formattedDate}
                </span>
                {item.label && (
                  <span className="ml-2 text-xs text-gray-500">
                    {item.label}
                  </span>
                )}
                {item.isSelected && (
                  <span className="badge badge-success badge-xs ml-2">
                    確定
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap text-xs sm:text-sm">
                {/* 時間表示を最適化 - 先頭の0を削除してコンパクトに */}
                {formatTime(item.startTime, eventDates).replace(/^0/, "")}
                <span className="text-xs text-gray-500">
                  {/* 終了時刻を矢印記号で簡潔に表示 */}→
                  {formatTime(item.endTime, eventDates).replace(/^0/, "")}
                </span>
              </td>
              <td className="text-center">
                <div
                  className="flex items-center justify-center gap-2 cursor-pointer"
                  onPointerEnter={(e) =>
                    onPointerTooltipStart?.(e, item.dateId)
                  }
                  onPointerLeave={(e) => onPointerTooltipEnd?.(e, item.dateId)}
                  onPointerUp={(e) => onPointerTooltipClick?.(e, item.dateId)}
                >
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-success mr-1"></span>
                    <span
                      className="font-medium"
                      data-testid={`available-count-${item.dateId}`}
                    >
                      {item.availableCount}
                    </span>
                  </div>
                  <span>/</span>
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-error mr-1"></span>
                    <span
                      className="font-medium"
                      data-testid={`unavailable-count-${item.dateId}`}
                    >
                      {item.unavailableCount}
                    </span>
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ListView;
