import React, { useRef } from "react";
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
  heatmapData: Map<
    string,
    {
      dateId: string;
      availableCount: number;
      unavailableCount: number;
      heatmapLevel: number;
      isSelected: boolean;
    }
  >;
  maxAvailable: number;
  onPointerTooltipStart: (
    e: React.PointerEvent<Element>,
    dateId: string
  ) => void;
  onPointerTooltipEnd: (e: React.PointerEvent<Element>, dateId: string) => void;
  onPointerTooltipClick: (
    e: React.PointerEvent<Element>,
    dateId: string
  ) => void;
  isDragging?: boolean;
}

/**
 * ヒートマップ表示モード
 */
const HeatmapView: React.FC<HeatmapViewProps> = ({
  uniqueDates,
  uniqueTimeSlots,
  heatmapData,
  maxAvailable,
  onPointerTooltipStart,
  onPointerTooltipEnd,
  onPointerTooltipClick,
  isDragging,
}) => {
  // タッチ操作の状態をuseRefで管理
  const isDraggingRef = useRef(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // タッチ開始位置を記録
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches && e.touches.length === 1) {
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      touchStartXRef.current = x;
      touchStartYRef.current = y;
      isDraggingRef.current = false;
    }
  };

  // タッチ移動量がしきい値を超えたらスクロール操作と判断
  const handleTouchMove = (e: React.TouchEvent) => {
    if (
      touchStartXRef.current !== null &&
      touchStartYRef.current !== null &&
      e.touches &&
      e.touches.length === 1
    ) {
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const diffX = Math.abs(x - touchStartXRef.current);
      const diffY = Math.abs(y - touchStartYRef.current);
      if (diffX > 10 || diffY > 10) {
        isDraggingRef.current = true;
      }
    }
  };

  // タッチ終了時の処理
  const handleTouchEnd = () => {
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    isDraggingRef.current = false;
  };

  return (
    <div
      className="fade-in"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="bg-base-100 p-1 sm:p-2 mb-2 text-xs sm:text-sm">
        <span className="font-medium">
          色が濃いほど参加可能な人が多い時間帯です
        </span>
      </div>
      <div
        className="overflow-x-auto"
        ref={tableRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <table className="table table-xs sm:table w-full text-center border-collapse min-w-[360px]">
          <thead className="sticky top-0 z-20">
            <tr className="bg-base-200">
              <th className="text-left sticky left-0 top-0 bg-base-200 z-30 p-1 sm:p-2 text-xs sm:text-sm min-w-[48px]">
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
                    className="text-center p-1 sm:px-2 sm:py-3 min-w-[44px] sm:min-w-[80px] text-xs sm:text-sm sticky top-0 bg-base-200 z-20"
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
              const formattedStartTime = timeSlot.startTime.replace(/^0/, "");

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
                      maxAvailable > 0 ? availableCount / maxAvailable : 0;

                    // 不透明度を計算 - 5%刻みに丸める処理
                    const raw = 20 + ratio * 80; // 20〜100 の実数
                    const opacity5 = Math.round(raw / 5) * 5; // 5 の倍数へ丸め
                    const opacityValue =
                      Math.min(Math.max(opacity5, 20), 100) / 100; // 0.2〜1.0に変換

                    // セルの背景色と境界線のスタイル（動的な部分のみインラインスタイル）
                    const cellStyle = {
                      backgroundColor: hasData
                        ? `rgba(var(--p-rgb, 87, 13, 248), ${opacityValue})`
                        : "transparent",
                    } as React.CSSProperties;

                    // すべてのイベントハンドラを付与し、イベント内で分岐
                    return (
                      <td
                        key={key}
                        style={cellStyle}
                        className={`relative p-0 sm:p-1 transition-all cursor-pointer ${
                          isSelected ? "border-2 border-success" : ""
                        }`}
                        onPointerEnter={(e) => {
                          if (!hasData || isDragging) return;
                          onPointerTooltipStart?.(e, cellData?.dateId || "");
                        }}
                        onPointerLeave={(e) => {
                          if (!hasData || isDragging) return;
                          onPointerTooltipEnd?.(e, cellData?.dateId || "");
                        }}
                        /**
                         * セルのPointerUpでツールチップ表示（スマホはタップで即表示）
                         */
                        onPointerUp={(e) => {
                          if (!hasData || isDragging) return;
                          onPointerTooltipClick?.(e, cellData?.dateId || "");
                        }}
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
            const opacity = (20 + i * 8) / 100; // 0.2～1.0の値
            return (
              <div
                key={i}
                style={{
                  backgroundColor: `rgba(var(--p-rgb, 87, 13, 248), ${opacity})`,
                  border: "1px solid #e5e7eb",
                }}
                className="w-2 h-2 sm:w-4 sm:h-4"
              />
            );
          })}
        </div>
        <span>多い</span>
      </div>
    </div>
  );
};

export default HeatmapView;
