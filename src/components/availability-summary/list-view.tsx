import React from 'react';
import { formatTime } from './date-utils';

/**
 * リスト表示モードのプロパティ
 */
interface ListViewProps {
  summary: Array<{
    dateId: string;
    startTime: string;
    endTime: string;
    label?: string;
    availableCount: number;
    unavailableCount: number;
    isSelected: boolean;
    formattedDate: string;
  }>;
  /**
   * ツールチップ表示用: Pointerイベントで呼ばれる
   */
  onPointerTooltipStart?: (e: React.PointerEvent<Element>, dateId: string) => void;
  onPointerTooltipEnd?: (e: React.PointerEvent<Element>, dateId: string) => void;
  onPointerTooltipClick?: (e: React.PointerEvent<Element>, dateId: string) => void;
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
    <div className="fade-in -mx-2 overflow-x-auto sm:mx-0">
      <table className="table-xs table w-full min-w-[340px]">
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
                item.isSelected ? 'bg-success bg-opacity-10' : ''
              } hover:bg-base-200 transition-colors`}
            >
              <td className="whitespace-nowrap">
                <span className="text-xs font-medium sm:text-sm">{item.formattedDate}</span>
                {item.label && <span className="ml-2 text-xs text-base-content/60">{item.label}</span>}
                {item.isSelected && <span className="badge badge-success badge-xs ml-2">確定</span>}
              </td>
              <td className="whitespace-nowrap text-xs sm:text-sm">
                {/* 時間表示を最適化 - 先頭の0を削除してコンパクトに */}
                {formatTime(item.startTime, eventDates).replace(/^0/, '')}
                <span className="text-xs text-base-content/60">
                  {/* 終了時刻を矢印記号で簡潔に表示 */}→
                  {formatTime(item.endTime, eventDates).replace(/^0/, '')}
                </span>
              </td>
              <td className="text-center">
                <div
                  className="flex cursor-pointer items-center justify-center gap-2"
                  onPointerEnter={(e) => onPointerTooltipStart?.(e, item.dateId)}
                  onPointerLeave={(e) => onPointerTooltipEnd?.(e, item.dateId)}
                  onPointerUp={(e) => onPointerTooltipClick?.(e, item.dateId)}
                >
                  <div className="flex items-center">
                    <span className="bg-success mr-1 h-3 w-3 rounded-full"></span>
                    <span className="font-medium" data-testid={`available-count-${item.dateId}`}>
                      {item.availableCount}
                    </span>
                  </div>
                  <span>/</span>
                  <div className="flex items-center">
                    <span className="bg-error mr-1 h-3 w-3 rounded-full"></span>
                    <span className="font-medium" data-testid={`unavailable-count-${item.dateId}`}>
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
