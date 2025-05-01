import React from "react";
import { getOptimizedDateDisplay } from "./date-utils";

interface HeatmapViewProps {
  uniqueDates: Array<{
    date: string;
    dayOfWeek: string;
    dateObj: Date;
  }>;
  uniqueTimeSlots: Array<{
    startTime: string;
    endTime: string;
    label: string;
    timeObj: Date;
  }>;
  heatmapData: Map<string, {
    dateId: string;
    availableCount: number;
    unavailableCount: number;
    heatmapLevel: number;
    isSelected: boolean;
  }>;
  maxAvailable: number;
  onMouseEnter: (e: React.MouseEvent, dateId: string) => void;
  onMouseLeave: () => void;
  onClick: (e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>, dateId: string) => void;
}

/**
 * ヒートマップ表示モード
 */
const HeatmapView: React.FC<HeatmapViewProps> = ({
  uniqueDates,
  uniqueTimeSlots,
  heatmapData,
  maxAvailable,
  onMouseEnter,
  onMouseLeave,
  onClick,
}) => {
  return (
    <div className="fade-in">
      <div className="bg-base-100 p-1 sm:p-2 mb-2 text-xs sm:text-sm">
        <span className="font-medium">
          色が濃いほど参加可能な人が多い時間帯です
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="table w-full text-center border-collapse">
          <thead className="sticky top-0 z-20">
            <tr className="bg-base-200">
              <th className="text-left sticky left-0 top-0 bg-base-200 z-30 p-1 sm:p-2 text-xs sm:text-sm">
                時間
              </th>
              {uniqueDates.map((dateInfo, index, arr) => {
                const optimizedDisplay = getOptimizedDateDisplay(
                  dateInfo.dateObj.toISOString(),
                  index,
                  arr.map((d) => d.dateObj.toISOString())
                );
                return (
                  <th
                    key={dateInfo.date}
                    className="text-center p-1 sm:px-2 sm:py-3 min-w-[50px] sm:min-w-[80px] text-xs sm:text-sm sticky top-0 bg-base-200 z-20"
                  >
                    {optimizedDisplay.yearMonth && (
                      <>
                        {optimizedDisplay.yearMonth}
                        <br />
                      </>
                    )}
                    {optimizedDisplay.day}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {uniqueTimeSlots.map((timeSlot, index, timeSlots) => {
              // 時間表示の最適化 - 1:00のような形式に変換
              const formattedStartTime = timeSlot.startTime.replace(
                /^0/,
                ""
              );

              // 時間が変わるときのみ表示する条件を追加
              const showTime =
                index === 0 ||
                timeSlot.startTime.split(":")[0] !==
                  timeSlots[index - 1].startTime.split(":")[0];

              return (
                <tr key={timeSlot.startTime}>
                  <td className="text-left font-medium whitespace-nowrap sticky left-0 bg-base-100 z-10 p-1 sm:px-2 text-xs sm:text-sm">
                    {showTime ? (
                      <>{formattedStartTime}</>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  {uniqueDates.map((dateInfo) => {
                    const key = `${dateInfo.date}_${timeSlot.startTime}`;
                    const cellData = heatmapData.get(key);
                    const isSelected = cellData?.isSelected || false;
                    const availableCount = cellData?.availableCount || 0;
                    const unavailableCount = cellData?.unavailableCount || 0;
                    const hasData = cellData !== undefined;

                    // テーマカラー単色スケール：最大参加者数に応じた不透明度
                    const ratio =
                      maxAvailable > 0
                        ? availableCount / maxAvailable
                        : 0;

                    // 不透明度を計算 - 5%刻みに丸める処理
                    const raw = 20 + ratio * 80; // 20〜100 の実数
                    const opacity5 = Math.round(raw / 5) * 5; // 5 の倍数へ丸め
                    const opacityValue = Math.min(
                      Math.max(opacity5, 20),
                      100
                    ); // 20〜100に制限

                    // Tailwindの不透明度クラス名をマップから取得
                    const opacityClasses: Record<number, string> = {
                      20: "bg-primary-500/20",
                      25: "bg-primary-500/25",
                      30: "bg-primary-500/30",
                      35: "bg-primary-500/35",
                      40: "bg-primary-500/40",
                      45: "bg-primary-500/45",
                      50: "bg-primary-500/50",
                      55: "bg-primary-500/55",
                      60: "bg-primary-500/60",
                      65: "bg-primary-500/65",
                      70: "bg-primary-500/70",
                      75: "bg-primary-500/75",
                      80: "bg-primary-500/80",
                      85: "bg-primary-500/85",
                      90: "bg-primary-500/90",
                      95: "bg-primary-500/95",
                      100: "bg-primary-500/100",
                    };
                    const opacityClass =
                      opacityClasses[opacityValue] || "bg-primary-500/20";

                    // 確定済み日程用の追加クラス
                    const selectedClass = isSelected
                      ? "border-2 border-success"
                      : "";

                    return (
                      <td
                        key={key}
                        className={`relative p-0 sm:p-1 transition-all ${opacityClass} ${selectedClass} cursor-pointer`}
                        onMouseEnter={(e) =>
                          hasData &&
                          onMouseEnter(e, cellData?.dateId || "")
                        }
                        onMouseLeave={() => hasData && onMouseLeave()}
                        onClick={(e) =>
                          hasData &&
                          onClick(e, cellData?.dateId || "")
                        }
                        onTouchStart={(e) =>
                          hasData &&
                          onClick(e, cellData?.dateId || "")
                        }
                      >
                        {hasData ? (
                          <div className="flex flex-col items-center justify-center h-full">
                            <span className="font-bold text-xs sm:text-base">
                              {availableCount}
                            </span>
                            {unavailableCount > 0 && (
                              <span className="text-[10px] sm:text-xs text-gray-500">
                                ({unavailableCount})
                              </span>
                            )}
                            {isSelected && (
                              <div className="absolute top-0 right-0 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-success rounded-full m-0.5 sm:m-1"></div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center items-center mt-2 sm:mt-3 gap-1 sm:gap-2 text-xs sm:text-sm">
        <span>少ない</span>
        <div className="flex">
          {Array.from({ length: 11 }).map((_, i) => {
            const opacity = 20 + i * 8; // Values from 20 to 100
            return (
              <div
                key={i}
                className={`w-2 h-2 sm:w-4 sm:h-4 border border-gray-200 bg-primary/${opacity}`}
              ></div>
            );
          })}
        </div>
        <span>多い</span>
      </div>
    </div>
  );
};

export default HeatmapView;