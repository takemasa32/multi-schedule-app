import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { getOptimizedDateDisplay } from './date-utils';

// ダークテーマと判定する候補名一覧（next-themesのresolvedThemeを想定）
const DARK_THEME_NAMES = new Set([
  'dark',
  'night',
  'dracula',
  'dim',
  'business',
  'forest',
  'coffee',
  'black',
  'sunset',
  'halloween',
  'luxury',
  'lofi',
]);

/**
 * テーマ名からダークテーマかどうかを判定する
 * @param themeName テーマ名（null/undefined許容）
 * @returns true: ダーク、false: ライト、null: 判定不能
 */
const evaluateDarkThemeByName = (themeName: string | null | undefined): boolean | null => {
  if (!themeName) {
    return null;
  }

  const normalized = themeName.toLowerCase().trim();
  if (!normalized) {
    return null;
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return null;
  }

  if (tokens.some((token) => token === 'system')) {
    return null;
  }

  if (tokens.some((token) => DARK_THEME_NAMES.has(token))) {
    return true;
  }

  if (tokens.some((token) => token === 'light' || token === 'cupcake')) {
    return false;
  }

  return null;
};

/**
 * OSのカラースキーム設定からダークテーマかどうかを取得する
 * @returns ダークテーマならtrue
 */
const prefersDarkColorScheme = (): boolean => {
  if (typeof window === 'undefined' || !('matchMedia' in window)) {
    return false;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

/**
 * 過去日程の列に適用するビジュアルパレットを取得する
 * @param isDarkTheme ダークテーマかどうか
 * @returns 過去日程用の配色設定
 */
const createPastColumnPalette = (isDarkTheme: boolean) => ({
  // ダークは従来通り、ライトはグレー系に変更
  headerBaseColor: isDarkTheme ? 'rgba(17, 24, 39, 0.82)' : 'rgba(220, 220, 220, 0.9)',
  headerGradientTop: isDarkTheme ? 'rgba(17, 24, 39, 0.9)' : 'rgba(220, 220, 220, 0.95)',
  headerGradientBottom: isDarkTheme ? 'rgba(17, 24, 39, 0.78)' : 'rgba(200, 200, 200, 0.82)',
  headerTextColor: isDarkTheme ? 'rgba(226, 232, 240, 0.85)' : 'rgba(100, 100, 100, 0.85)',
  columnBaseLayer: isDarkTheme
    ? 'linear-gradient(0deg, rgba(30, 41, 59, 0.32), rgba(30, 41, 59, 0.32))'
    : 'linear-gradient(0deg, rgba(220, 220, 220, 0.6), rgba(220, 220, 220, 0.6))',
  columnBaseLayerMuted: isDarkTheme
    ? 'linear-gradient(0deg, rgba(30, 41, 59, 0.38), rgba(30, 41, 59, 0.38))'
    : 'linear-gradient(0deg, rgba(180, 180, 180, 0.52), rgba(180, 180, 180, 0.52))',
  baseOverlay: isDarkTheme ? 'rgba(15, 23, 42, 0.24)' : 'rgba(160, 160, 160, 0.14)',
  emphasizedOverlay: isDarkTheme ? 'rgba(15, 23, 42, 0.34)' : 'rgba(160, 160, 160, 0.2)',
});

interface HeatmapViewProps {
  uniqueDates: Array<{
    date: string;
    dateObj: Date;
  }>;
  uniqueTimeSlots: Array<{
    slotKey: string;
    startTime: string;
    endTime: string;
    timeObj: Date;
    labels: string[];
  }>;
  heatmapData: Map<
    string,
    {
      dateId: string;
      availableCount: number;
      unavailableCount: number;
      heatmapLevel: number;
      isSelected: boolean;
      totalResponses: number;
    }
  >;
  maxAvailable: number;
  onPointerTooltipStart: (e: React.PointerEvent<Element>, dateId: string) => void;
  onPointerTooltipEnd: (e: React.PointerEvent<Element>, dateId: string) => void;
  onPointerTooltipClick: (e: React.PointerEvent<Element>, dateId: string) => void;
  isDragging?: boolean;
  /** カラー表示する最小参加人数 */
  minColoredCount: number;
  /** スライダー変更時のハンドラ */
  onMinColoredCountChange?: (count: number) => void;
  /** 過去日程をグレースケールで表示するか */
  isPastEventGrayscaleEnabled: boolean;
  /** 過去日程のグレースケール設定変更時のハンドラ */
  onPastEventGrayscaleToggle?: (enabled: boolean) => void;
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
  isPastEventGrayscaleEnabled,
  onPastEventGrayscaleToggle,
}) => {
  const { resolvedTheme } = useTheme();

  /**
   * テーマ判定（クライアント側のみ）
   * SSR時はnull、クライアント側で実際のテーマを判定
   */
  const getTheme = useCallback((): boolean | null => {
    if (typeof window === 'undefined') {
      return null; // SSR時はnull（未判定）
    }

    // next-themesのresolvedThemeを優先
    if (resolvedTheme) {
      const evalTheme = evaluateDarkThemeByName(resolvedTheme);
      if (evalTheme !== null) return evalTheme;
    }

    // data-theme属性
    const attrTheme = document.documentElement.getAttribute('data-theme');
    const evalTheme = evaluateDarkThemeByName(attrTheme);
    if (evalTheme !== null) return evalTheme;

    // OS設定
    return prefersDarkColorScheme();
  }, [resolvedTheme]);

  const [isDarkTheme, setIsDarkTheme] = useState<boolean | null>(getTheme);

  // テーマ変更を監視
  useEffect(() => {
    setIsDarkTheme(getTheme());
  }, [getTheme]);

  // isDarkThemeがnullの場合はfalseをデフォルトとして使用（パレット生成用）
  const pastColumnPalette = useMemo(
    () => createPastColumnPalette(isDarkTheme ?? false),
    [isDarkTheme],
  );
  // タッチ操作の状態をuseRefで管理
  const isDraggingRef = useRef(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  // 初回描画時に「今日」の列へスクロールしたかどうか
  const scrolledToTodayRef = useRef(false);

  // SSR/CSR不一致防止: 今日の日付（0時）をuseState+useEffectで管理
  const [startOfToday, setStartOfToday] = useState<Date | null>(null);
  useEffect(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setStartOfToday(d);
  }, []);

  // 初期スクロール: 今日が範囲内なら左端に
  useEffect(() => {
    if (scrolledToTodayRef.current || !tableRef.current || !startOfToday) return;
    const todayIndex = uniqueDates.findIndex((dateInfo) => {
      const dateOnly = new Date(dateInfo.dateObj);
      dateOnly.setHours(0, 0, 0, 0);
      return dateOnly.getTime() === startOfToday.getTime();
    });
    if (todayIndex === -1) return;
    // th要素のdata-date-index属性で取得
    const headerCells = tableRef.current.querySelectorAll('th[data-date-index]');
    if (!headerCells || headerCells.length === 0) return;
    const targetCell = headerCells[todayIndex] as HTMLTableCellElement;
    const firstCell = headerCells[0] as HTMLTableCellElement;
    if (!targetCell || !firstCell) return;
    // スクロール位置計算（レスポンシブ考慮）
    const scrollLeft = targetCell.offsetLeft - firstCell.offsetLeft;
    tableRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    scrolledToTodayRef.current = true;
  }, [startOfToday, uniqueDates]);

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
      <div className="bg-base-100 mb-2 p-1 text-xs sm:p-2 sm:text-sm">
        <span className="font-medium">色が濃いほど参加可能な人が多い時間帯です</span>
      </div>
      <div
        className="overflow-x-auto"
        ref={tableRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <table className="table-xs table w-full min-w-[360px] border-collapse text-center sm:table">
          <thead className="sticky top-0 z-20">
            <tr className="bg-base-200">
              <th className="bg-base-200 sticky left-0 top-0 z-30 min-w-[48px] p-1 text-left text-xs sm:p-2 sm:text-sm">
                時間
              </th>
              {uniqueDates.map((dateInfo, index, arr) => {
                const optimizedDisplay = getOptimizedDateDisplay(
                  dateInfo.dateObj.toISOString(),
                  index,
                  arr.map((d) => d.dateObj.toISOString()),
                );
                // 列ヘッダーでも過去日程かどうかを判定し、視覚的な強調を行う
                // SSR時（startOfToday === null or isDarkTheme === null）はスタイルを適用しない
                const dateOnly = new Date(dateInfo.dateObj);
                dateOnly.setHours(0, 0, 0, 0);
                const isPastDate =
                  startOfToday !== null ? dateOnly.getTime() < startOfToday.getTime() : false;
                const headerStyle =
                  isPastDate && isDarkTheme !== null && startOfToday !== null
                    ? {
                        backgroundColor: pastColumnPalette.headerBaseColor,
                        backgroundImage: `linear-gradient(180deg, ${pastColumnPalette.headerGradientTop} 0%, ${pastColumnPalette.headerGradientBottom} 100%)`,
                        color: pastColumnPalette.headerTextColor,
                      }
                    : undefined;
                return (
                  <th
                    key={dateInfo.date}
                    data-date-index={index}
                    className={`bg-base-200 sticky top-0 z-20 min-w-[44px] p-1 text-center text-xs sm:min-w-[80px] sm:px-2 sm:py-3 sm:text-sm ${
                      isPastDate ? 'text-base-content/70' : 'text-base-content'
                    }`}
                    style={headerStyle}
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
              <td className="bg-base-100 sticky left-0 z-10 h-3 sm:h-4"></td>
            </tr>
            {uniqueTimeSlots.map((timeSlot) => {
              // 時間表示をコンパクトに整形（先頭ゼロを削除）
              const formattedStartTime = timeSlot.startTime.replace(/^0/, '');
              const formattedEndTime =
                timeSlot.endTime === '24:00' ? '24:00' : timeSlot.endTime.replace(/^0/, '');

              return (
                <tr key={timeSlot.slotKey}>
                  <td
                    className="bg-base-100 sticky left-0 z-10 whitespace-nowrap p-1 text-left text-xs font-medium sm:px-2 sm:text-sm"
                    aria-label={`${formattedStartTime}〜${formattedEndTime}`}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 0, // 上辺を基準にする
                        left: '0.5rem',
                        transform: 'translateY(-50%)', // 高さの半分だけ上に移動
                        backgroundColor:
                          'var(--fallback-b1,oklch(var(--b1)/var(--tw-bg-opacity,1)))',
                        padding: '0 0.25rem',
                      }}
                    >
                      {formattedStartTime}
                    </span>
                  </td>
                  {uniqueDates.map((dateInfo) => {
                    const key = `${dateInfo.date}_${timeSlot.slotKey}`;
                    const cellData = heatmapData.get(key);
                    const isSelected = cellData?.isSelected || false;
                    const availableCount = cellData?.availableCount || 0;
                    const unavailableCount = cellData?.unavailableCount || 0;
                    const totalResponses = cellData?.totalResponses ?? 0;
                    const hasData = cellData !== undefined;
                    const hasResponses = totalResponses > 0;
                    const dateOnly = new Date(dateInfo.dateObj);
                    dateOnly.setHours(0, 0, 0, 0);
                    // SSR時（startOfToday === null）は過去判定しない
                    const isPastDate =
                      startOfToday !== null ? dateOnly.getTime() < startOfToday.getTime() : false;

                    // テーマカラー単色スケール：最大参加者数に応じた不透明度
                    const ratio = maxAvailable > 0 ? availableCount / maxAvailable : 0;

                    // 不透明度を計算 - 5%刻みに丸める処理
                    const raw = 20 + ratio * 80; // 20〜100 の実数
                    const opacity5 = Math.round(raw / 5) * 5; // 5 の倍数へ丸め
                    const opacityValue = Math.min(Math.max(opacity5, 20), 100) / 100; // 0.2〜1.0に変換

                    // 過去日程グレースケール・色表示ロジック最適化
                    const shouldApplyPastGrayscale =
                      hasData && isPastEventGrayscaleEnabled && isPastDate;
                    const shouldDimPastColumn = isPastDate;
                    // グレースケール条件: minColoredCount未満 or 過去日程グレースケール
                    const filterValues: string[] = [];
                    if (
                      hasData &&
                      hasResponses &&
                      (availableCount < minColoredCount || shouldApplyPastGrayscale)
                    ) {
                      filterValues.push('grayscale(1)');
                    }
                    // 過去日程はダーク/ライトで色・不透明度を調整
                    const adjustedOpacity = shouldApplyPastGrayscale
                      ? (isDarkTheme ?? false)
                        ? Math.max(Math.min(opacityValue * 0.45, 0.32), 0.08)
                        : Math.max(Math.min(opacityValue * 0.55, 0.45), 0.18)
                      : opacityValue;
                    const pastBaseRgb = (isDarkTheme ?? false) ? '80, 88, 104' : '148, 163, 184';
                    const backgroundColor =
                      hasData && hasResponses
                        ? shouldApplyPastGrayscale
                          ? `rgba(${pastBaseRgb}, ${adjustedOpacity})`
                          : `rgba(var(--p-rgb, 87, 13, 248), ${adjustedOpacity})`
                        : 'transparent';
                    // 過去日程の列に控えめなオーバーレイを被せ、背景が途切れないようにする
                    const overlayColor = shouldDimPastColumn
                      ? shouldApplyPastGrayscale
                        ? pastColumnPalette.emphasizedOverlay
                        : pastColumnPalette.baseOverlay
                      : null;
                    // 過去列用の淡い下地レイヤーを合成
                    const backgroundLayers: string[] = [];
                    if (overlayColor) {
                      backgroundLayers.push(
                        `linear-gradient(0deg, ${overlayColor}, ${overlayColor})`,
                      );
                    }
                    if (shouldDimPastColumn) {
                      backgroundLayers.push(
                        shouldApplyPastGrayscale
                          ? pastColumnPalette.columnBaseLayerMuted
                          : pastColumnPalette.columnBaseLayer,
                      );
                    }
                    const cellStyle = {
                      backgroundColor,
                      backgroundImage:
                        backgroundLayers.length > 0 ? backgroundLayers.join(', ') : undefined,
                      filter: filterValues.length > 0 ? filterValues.join(' ') : 'none',
                    } as React.CSSProperties;

                    // テキスト色: グレースケール時はコントラスト重視
                    const countTextBaseClass = 'text-xs font-bold sm:text-base';
                    const countTextClass = shouldApplyPastGrayscale
                      ? `${countTextBaseClass} ${(isDarkTheme ?? false) ? 'text-base-content/80' : 'text-base-content/60'}`
                      : `${countTextBaseClass}${opacityValue >= 0.6 ? ' text-white' : ' text-base-content'}`;
                    const unavailableTextClass = shouldApplyPastGrayscale
                      ? (isDarkTheme ?? false)
                        ? 'text-[10px] text-base-content/50 sm:text-xs'
                        : 'text-[10px] text-base-content/60 sm:text-xs'
                      : 'text-[10px] text-base-content/70 sm:text-xs';

                    // すべてのイベントハンドラを付与し、イベント内で分岐
                    return (
                      <td
                        key={key}
                        style={cellStyle}
                        className={`relative cursor-pointer p-0 transition-all sm:p-1 ${
                          isSelected ? 'border-success border-2' : ''
                        }`}
                        onPointerEnter={(e) => {
                          if (!hasData || isDragging) return;
                          onPointerTooltipStart?.(e, cellData?.dateId || '');
                        }}
                        onPointerLeave={(e) => {
                          if (!hasData || isDragging) return;
                          onPointerTooltipEnd?.(e, cellData?.dateId || '');
                        }}
                        /**
                         * セルのPointerUpでツールチップ表示（スマホはタップで即表示）
                         */
                        onPointerUp={(e) => {
                          if (!hasData || isDragging) return;
                          onPointerTooltipClick?.(e, cellData?.dateId || '');
                        }}
                      >
                        {hasData ? (
                          <div className="flex h-full flex-col items-center justify-center">
                            {hasResponses ? (
                              <>
                                <span className={countTextClass}>{availableCount}</span>
                                {unavailableCount > 0 && (
                                  <span className={unavailableTextClass}>({unavailableCount})</span>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="sr-only">回答なし</span>
                                <span
                                  aria-hidden="true"
                                  className="text-xs text-base-content/50 sm:text-sm"
                                >
                                  0
                                </span>
                              </>
                            )}
                            {isSelected && (
                              <div className="bg-success absolute right-0 top-0 m-0.5 h-1.5 w-1.5 rounded-full sm:m-1 sm:h-2 sm:w-2"></div>
                            )}
                          </div>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            {/* イベント未設定セルも中央揃えで視認性を統一 */}
                            <span className="sr-only">イベント未設定</span>
                            <span aria-hidden="true" className="text-xs text-base-content/40 sm:text-sm">
                              -
                            </span>
                          </div>
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
                const lastTimeSlot = uniqueTimeSlots[uniqueTimeSlots.length - 1];
                let formattedEndTime = lastTimeSlot.endTime.replace(/^0/, '');
                if (lastTimeSlot.endTime === '00:00') {
                  formattedEndTime = '24:00';
                }
                return (
                  <tr className="h-0">
                    <td className="bg-base-100 sticky left-0 z-10 whitespace-nowrap p-1 text-left text-xs font-medium sm:px-2 sm:text-sm">
                      <span
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: '0.5rem',
                          transform: 'translateY(-50%)',
                          backgroundColor:
                            'var(--fallback-b1,oklch(var(--b1)/var(--tw-bg-opacity,1)))',
                          padding: '0 0.25rem',
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
      <div className="flex items-center justify-center gap-1 text-xs sm:gap-2 sm:text-sm">
        <span className="text-base-content/70">少ない</span>
        <div className="flex">
          {Array.from({ length: 11 }).map((_, i) => {
            const opacity = (20 + i * 8) / 100; // 0.2～1.0の値
            return (
              <div
                key={i}
                style={{
                  backgroundColor: `rgba(var(--p-rgb, 87, 13, 248), ${opacity})`,
                  border: '1px solid #e5e7eb',
                }}
                className="h-2 w-2 sm:h-4 sm:w-4"
              />
            );
          })}
        </div>
        <span className="text-base-content/70">多い</span>
      </div>
      <div className="bg-base-100 mt-2 rounded-lg border p-2 sm:mt-3 sm:p-3">
        <div className="flex flex-col gap-3">
          {/* スライダーによるフィルター設定 */}
          {onMinColoredCountChange && (
            <details className="from-base-200/50 to-base-300/30 border-base-300/50 group collapse rounded-lg border bg-gradient-to-r">
              <summary className="collapse-title relative flex min-h-0 cursor-pointer items-center justify-between px-3 py-1">
                <div className="flex items-center gap-2">
                  <div className="bg-primary h-2 w-2 rounded-full"></div>
                  <span className="text-base-content text-sm font-semibold">フィルター設定</span>
                  <div className="badge badge-primary badge-sm">{minColoredCount}人以上</div>
                </div>
                {/* 開閉マークを右上に絶対配置 */}
                <span
                  className="pointer-events-none absolute right-2 top-1.5 flex h-4 w-4 items-center justify-center sm:top-2"
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
                    <p className="text-base-content/70 text-xs">
                      {minColoredCount}人未満の時間帯をグレー表示
                    </p>
                  </div>

                  <div className="bg-base-200/60 flex items-center justify-between rounded-md px-3 py-2">
                    <div className="text-left text-xs">
                      <p className="text-base-content font-semibold">過去日程のグレー表示</p>
                      <p className="text-base-content/70">オフにすると過去日程にも色が付きます</p>
                    </div>
                    <input
                      type="checkbox"
                      className="toggle toggle-primary toggle-sm"
                      checked={isPastEventGrayscaleEnabled}
                      onChange={(event) => onPastEventGrayscaleToggle?.(event.target.checked)}
                      aria-label="過去日程のグレー表示切り替え"
                    />
                  </div>

                  <div className="relative px-2">
                    <input
                      type="range"
                      min={0}
                      max={Math.max(maxAvailable, 1)}
                      step={1}
                      value={minColoredCount}
                      onChange={(e) => onMinColoredCountChange(parseInt(e.target.value, 10) ?? 1)}
                      className="range range-primary range-sm w-full"
                      style={{
                        height: '0.5rem',
                        minHeight: '0.5rem',
                        maxHeight: '0.5rem',
                      }}
                    />

                    {/* 目盛り */}
                    <div className="mt-2 flex items-center justify-between px-1">
                      <div className="flex flex-col items-center">
                        <div className="bg-primary/60 mb-1 h-1 w-1 rounded-full"></div>
                        <span className="text-base-content/60 text-xs font-medium">0</span>
                      </div>
                      {maxAvailable > 2 && (
                        <div className="hidden flex-col items-center sm:flex">
                          <div className="bg-primary/40 mb-1 h-1 w-1 rounded-full"></div>
                          <span className="text-base-content/50 text-xs">
                            {Math.ceil(maxAvailable / 2)}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col items-center">
                        <div className="bg-primary/60 mb-1 h-1 w-1 rounded-full"></div>
                        <span className="text-base-content/60 text-xs font-medium">
                          {maxAvailable}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* インジケーター */}
                  <div className="flex justify-center">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="bg-primary h-2 w-2 rounded-full"></div>
                        <span className="text-base-content/60">表示</span>
                      </div>
                      <div className="bg-base-300 h-3 w-px"></div>
                      <div className="flex items-center gap-1">
                        <div className="bg-base-300 h-2 w-2 rounded-full"></div>
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
