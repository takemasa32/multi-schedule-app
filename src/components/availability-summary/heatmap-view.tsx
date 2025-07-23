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
  /** カラー表示する最小参加人数 */
  minColoredCount: number;
  /** スライダー変更時のハンドラ */
  onMinColoredCountChange?: (count: number) => void;
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
  minColoredCount,
  onMinColoredCountChange,
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
            {/* スペーサー：最初の時間ラベルがヘッダーに隠れるのを防ぐ */}
            <tr>
              <td className="h-3 sm:h-4 sticky left-0 bg-base-100 z-10"></td>
            </tr>
            {uniqueTimeSlots.map((timeSlot) => {
              // 時間表示の最適化 - 1:00のような形式に変換
              const formattedStartTime = timeSlot.startTime.replace(/^0/, "");

              return (
                <tr key={timeSlot.startTime}>
                  <td className=" text-left font-medium whitespace-nowrap sticky left-0 bg-base-100 z-10 p-1 sm:px-2 text-xs sm:text-sm">
                    <span
                      style={{
                        position: "absolute",
                        top: 0, // 上辺を基準にする
                        left: "0.5rem",
                        transform: "translateY(-50%)", // 高さの半分だけ上に移動
                        backgroundColor:
                          "var(--fallback-b1,oklch(var(--b1)/var(--tw-bg-opacity,1)))",
                        padding: "0 0.25rem",
                      }}
                    >
                      {formattedStartTime}
                    </span>
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
                      filter:
                        availableCount < minColoredCount
                          ? "grayscale(1)"
                          : "none",
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
                            <span
                              className={
                                `font-bold text-xs sm:text-base` +
                                (opacityValue >= 0.6 ? " text-white" : "")
                              }
                            >
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
            {/* 最下部の終了時間を表示するための行 */}
            {uniqueTimeSlots.length > 0 &&
              (() => {
                const lastTimeSlot =
                  uniqueTimeSlots[uniqueTimeSlots.length - 1];
                let formattedEndTime = lastTimeSlot.endTime.replace(/^0/, "");
                if (lastTimeSlot.endTime === "00:00") {
                  formattedEndTime = "24:00";
                }
                return (
                  <tr className="h-0">
                    <td className="relative text-left font-medium whitespace-nowrap sticky left-0 bg-base-100 z-10 p-1 sm:px-2 text-xs sm:text-sm">
                      <span
                        style={{
                          position: "absolute",
                          top: 0,
                          left: "0.5rem",
                          transform: "translateY(-50%)",
                          backgroundColor:
                            "var(--fallback-b1,oklch(var(--b1)/var(--tw-bg-opacity,1)))",
                          padding: "0 0.25rem",
                        }}
                      >
                        {formattedEndTime}
                      </span>
                    </td>
                    {/* Empty cells to match column count */}
                    {uniqueDates.map((dateInfo) => (
                      <td key={`${dateInfo.date}-endtime`}></td>
                    ))}
                  </tr>
                );
              })()}
          </tbody>
        </table>
      </div>

      {/* 色の凡例とフィルター設定を統合したUI */}
      {/* 色の凡例 */}
      <div className="flex justify-center items-center gap-1 sm:gap-2 text-xs sm:text-sm">
        <span className="text-gray-600">少ない</span>
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
        <span className="text-gray-600">多い</span>
      </div>
      <div className="bg-base-100 p-2 sm:p-3 mt-2 sm:mt-3 rounded-lg border">
        <div className="flex flex-col gap-3">
          {/* スライダーによるフィルター設定 */}
          {onMinColoredCountChange && (
            <details className="collapse bg-gradient-to-r from-base-200/50 to-base-300/30 rounded-lg border border-base-300/50 group">
              <summary className="collapse-title flex items-center justify-between cursor-pointer px-3 py-1 min-h-0 relative">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <span className="font-semibold text-sm text-base-content">
                    フィルター設定
                  </span>
                  <div className="badge badge-primary badge-sm">
                    {minColoredCount}人以上
                  </div>
                </div>
                {/* 開閉マークを右上に絶対配置 */}
                <span
                  className="absolute right-2 top-1.5 sm:top-2 w-4 h-4 flex items-center justify-center pointer-events-none"
                  aria-hidden="true"
                >
                  {/* ▼: 閉じているとき, ▲: 開いているとき */}
                  <svg
                    className="transition-transform duration-200 group-open:rotate-180"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                  >
                    <polyline
                      points="4,6 8,10 12,6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </summary>
              <div className="collapse-content px-3 pb-3 pt-0">
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-xs text-base-content/70">
                      {minColoredCount}人未満の時間帯をグレー表示
                    </p>
                  </div>

                  <div className="relative px-2">
                    <input
                      type="range"
                      min={0}
                      max={Math.max(maxAvailable, 1)}
                      step={1}
                      value={minColoredCount}
                      onChange={(e) =>
                        onMinColoredCountChange(
                          parseInt(e.target.value, 10) ?? 1
                        )
                      }
                      className="range range-primary range-sm w-full"
                      style={{
                        height: "0.5rem",
                        minHeight: "0.5rem",
                        maxHeight: "0.5rem",
                      }}
                    />

                    {/* 目盛り */}
                    <div className="flex justify-between items-center mt-2 px-1">
                      <div className="flex flex-col items-center">
                        <div className="w-1 h-1 bg-primary/60 rounded-full mb-1"></div>
                        <span className="text-xs font-medium text-base-content/60">
                          0
                        </span>
                      </div>
                      {maxAvailable > 2 && (
                        <div className="hidden sm:flex flex-col items-center">
                          <div className="w-1 h-1 bg-primary/40 rounded-full mb-1"></div>
                          <span className="text-xs text-base-content/50">
                            {Math.ceil(maxAvailable / 2)}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col items-center">
                        <div className="w-1 h-1 bg-primary/60 rounded-full mb-1"></div>
                        <span className="text-xs font-medium text-base-content/60">
                          {maxAvailable}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* インジケーター */}
                  <div className="flex justify-center">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <span className="text-base-content/60">表示</span>
                      </div>
                      <div className="w-px h-3 bg-base-300"></div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-base-300"></div>
                        <span className="text-base-content/40">非表示</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeatmapView;
