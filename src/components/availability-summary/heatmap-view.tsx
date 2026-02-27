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
const HEATMAP_CELL_RADIUS = '0.4rem';
const HEATMAP_JOIN_BLEED_PX = 1;
const HEATMAP_FADE_TRANSITION = 'background-color 220ms ease, filter 220ms ease, color 220ms ease';

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

type HeatmapCellVisual = {
  dateId: string;
  isSelected: boolean;
  availableCount: number;
  unavailableCount: number;
  hasData: boolean;
  hasResponses: boolean;
  isPastColumnGrayscale: boolean;
  lineColor: string;
  lineTone: 'none' | 'neutral' | 'primary' | 'past';
  boundarySignature: string;
  cellStyle: React.CSSProperties;
  countTextClass: string;
  unavailableTextClass: string;
  joinKey: string | null;
};

type HeatmapCellShape = {
  cornerClass: string;
  cornerStyle: React.CSSProperties;
  joinsTop: boolean;
  joinsBottom: boolean;
  joinsLeft: boolean;
  joinsRight: boolean;
  raisedTopVisual: HeatmapCellVisual | null;
  raisedBottomVisual: HeatmapCellVisual | null;
  raisedLeftVisual: HeatmapCellVisual | null;
  raisedRightVisual: HeatmapCellVisual | null;
};

type HeatmapDateColumn = HeatmapViewProps['uniqueDates'][number];
type HeatmapTimeSlot = HeatmapViewProps['uniqueTimeSlots'][number];

/**
 * ヒートマップセルキーを生成する
 * @param date 日付文字列
 * @param slotKey 時間帯キー
 * @returns セルキー
 */
const getHeatmapCellKey = (date: string, slotKey: string): string => `${date}_${slotKey}`;

/**
 * 2つのセルが角丸連結できるか判定する
 * @param current 現在セルの見た目情報
 * @param neighbor 隣接セルの見た目情報
 * @returns 連結可能ならtrue
 */
const canJoinCellVisual = (
  current: HeatmapCellVisual | undefined,
  neighbor: HeatmapCellVisual | undefined,
): boolean => {
  return (
    current !== undefined &&
    neighbor !== undefined &&
    current.joinKey !== null &&
    current.joinKey === neighbor.joinKey
  );
};

/**
 * セルが有色（回答あり）かどうかを判定する
 * @param visual セル見た目情報
 * @returns 有色セルならtrue
 */
const isColoredCellVisual = (visual: HeatmapCellVisual | undefined): boolean => {
  return visual !== undefined && visual.hasData && visual.hasResponses;
};

/**
 * 上辺の背景抜け補正を描画するか判定する
 * @param isDarkTheme ダークテーマかどうか
 * @param hasBoundaryLine 境界線が表示されるか
 * @param current 現在セルの見た目情報
 * @param top 上側セルの見た目情報
 * @param joinsTop 上側セルと連結するか
 * @param isTopRaisedOverCurrent 上側セルが現在セルより上に載るか
 * @returns 補正を描画するならtrue
 */
const shouldRenderJoinBleedOnTop = ({
  isDarkTheme,
  hasBoundaryLine,
  current,
  top,
  joinsTop,
  isTopRaisedOverCurrent,
}: {
  isDarkTheme: boolean;
  hasBoundaryLine: boolean;
  current: HeatmapCellVisual;
  top: HeatmapCellVisual | undefined;
  joinsTop: boolean;
  isTopRaisedOverCurrent: boolean;
}): boolean => {
  if (hasBoundaryLine) {
    return false;
  }

  // ライトテーマでは有色セル同士の境界を優先して補正
  if (!isDarkTheme) {
    return isColoredCellVisual(current) && isColoredCellVisual(top);
  }

  // ダークテーマでは従来通り、連結中かつ上載りでない境界のみ補正
  return current.hasData && joinsTop && !isTopRaisedOverCurrent;
};

/**
 * 角丸連結状態からセルの角丸クラスを解決する
 * @param joinsTop 上側セルと連結するか
 * @param joinsBottom 下側セルと連結するか
 * @param joinsLeft 左側セルと連結するか
 * @param joinsRight 右側セルと連結するか
 * @returns 適用するTailwind角丸クラス
 */
const resolveCornerClass = ({
  joinsTop,
  joinsBottom,
  joinsLeft,
  joinsRight,
}: {
  joinsTop: boolean;
  joinsBottom: boolean;
  joinsLeft: boolean;
  joinsRight: boolean;
}): string => {
  const classes: string[] = [];
  if (!joinsTop && !joinsLeft) classes.push(`rounded-tl-[${HEATMAP_CELL_RADIUS}]`);
  if (!joinsTop && !joinsRight) classes.push(`rounded-tr-[${HEATMAP_CELL_RADIUS}]`);
  if (!joinsBottom && !joinsLeft) classes.push(`rounded-bl-[${HEATMAP_CELL_RADIUS}]`);
  if (!joinsBottom && !joinsRight) classes.push(`rounded-br-[${HEATMAP_CELL_RADIUS}]`);
  return classes.length > 0 ? classes.join(' ') : 'rounded-none';
};

/**
 * 角丸連結状態からセルの角丸スタイルを解決する
 * @param joinsTop 上側セルと連結するか
 * @param joinsBottom 下側セルと連結するか
 * @param joinsLeft 左側セルと連結するか
 * @param joinsRight 右側セルと連結するか
 * @returns インライン角丸スタイル
 */
const resolveCornerStyle = ({
  joinsTop,
  joinsBottom,
  joinsLeft,
  joinsRight,
}: {
  joinsTop: boolean;
  joinsBottom: boolean;
  joinsLeft: boolean;
  joinsRight: boolean;
}): React.CSSProperties => {
  const radius = HEATMAP_CELL_RADIUS;
  return {
    borderTopLeftRadius: !joinsTop && !joinsLeft ? radius : '0px',
    borderTopRightRadius: !joinsTop && !joinsRight ? radius : '0px',
    borderBottomLeftRadius: !joinsBottom && !joinsLeft ? radius : '0px',
    borderBottomRightRadius: !joinsBottom && !joinsRight ? radius : '0px',
  };
};

/**
 * 角丸と重なり表現を同時に計算する
 * @param cellVisuals セル見た目情報
 * @param uniqueDates 日付列
 * @param uniqueTimeSlots 時間帯行
 * @returns セルごとの描画形状
 */
const buildCellShapeMap = ({
  cellVisuals,
  uniqueDates,
  uniqueTimeSlots,
}: {
  cellVisuals: Map<string, HeatmapCellVisual>;
  uniqueDates: HeatmapDateColumn[];
  uniqueTimeSlots: HeatmapTimeSlot[];
}): Map<string, HeatmapCellShape> => {
  const fallbackRadiusClass = `rounded-[${HEATMAP_CELL_RADIUS}]`;
  const fallbackCornerStyle: React.CSSProperties = {
    borderRadius: HEATMAP_CELL_RADIUS,
  };
  const shapeMap = new Map<string, HeatmapCellShape>();

  uniqueTimeSlots.forEach((timeSlot, rowIndex) => {
    uniqueDates.forEach((dateInfo, colIndex) => {
      const key = getHeatmapCellKey(dateInfo.date, timeSlot.slotKey);
      const current = cellVisuals.get(key);
      if (!current || current.joinKey === null) {
        shapeMap.set(key, {
          cornerClass: fallbackRadiusClass,
          cornerStyle: fallbackCornerStyle,
          joinsTop: false,
          joinsBottom: false,
          joinsLeft: false,
          joinsRight: false,
          raisedTopVisual: null,
          raisedBottomVisual: null,
          raisedLeftVisual: null,
          raisedRightVisual: null,
        });
        return;
      }

      const topKey =
        rowIndex > 0
          ? getHeatmapCellKey(dateInfo.date, uniqueTimeSlots[rowIndex - 1].slotKey)
          : null;
      const bottomKey =
        rowIndex < uniqueTimeSlots.length - 1
          ? getHeatmapCellKey(dateInfo.date, uniqueTimeSlots[rowIndex + 1].slotKey)
          : null;
      const leftKey =
        colIndex > 0 ? getHeatmapCellKey(uniqueDates[colIndex - 1].date, timeSlot.slotKey) : null;
      const rightKey =
        colIndex < uniqueDates.length - 1
          ? getHeatmapCellKey(uniqueDates[colIndex + 1].date, timeSlot.slotKey)
          : null;

      const top = topKey ? cellVisuals.get(topKey) : undefined;
      const bottom = bottomKey ? cellVisuals.get(bottomKey) : undefined;
      const left = leftKey ? cellVisuals.get(leftKey) : undefined;
      const right = rightKey ? cellVisuals.get(rightKey) : undefined;

      let joinsTop = canJoinCellVisual(current, top);
      let joinsLeft = canJoinCellVisual(current, left);
      let joinsRight = canJoinCellVisual(current, right);
      let joinsBottom = canJoinCellVisual(current, bottom);

      // 「上に載る」段差レイヤーは上下左右すべて無効化する。
      // 重ね塗りによる色の濃化を抑え、セル単位の濃淡を素直に読み取れる見た目を優先する。
      const shouldRaiseTop = false;
      const shouldRaiseBottom = false;
      const shouldRaiseLeft = false;
      const shouldRaiseRight = false;
      if (shouldRaiseTop) {
        joinsTop = false;
      }
      if (shouldRaiseBottom) {
        joinsBottom = false;
      }
      if (shouldRaiseLeft) {
        joinsLeft = false;
      }
      if (shouldRaiseRight) {
        joinsRight = false;
      }

      const cornerFlags = {
        joinsTop,
        joinsBottom,
        joinsLeft,
        joinsRight,
      };
      shapeMap.set(key, {
        cornerClass: resolveCornerClass(cornerFlags),
        cornerStyle: resolveCornerStyle(cornerFlags),
        joinsTop,
        joinsBottom,
        joinsLeft,
        joinsRight,
        raisedTopVisual: shouldRaiseTop ? (top ?? null) : null,
        raisedBottomVisual: shouldRaiseBottom ? (bottom ?? null) : null,
        raisedLeftVisual: shouldRaiseLeft ? (left ?? null) : null,
        raisedRightVisual: shouldRaiseRight ? (right ?? null) : null,
      });
    });
  });

  return shapeMap;
};

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
  const isMouseDragActiveRef = useRef(false);
  const isMouseDraggingRef = useRef(false);
  const mouseStartXRef = useRef(0);
  const mouseStartScrollLeftRef = useRef(0);
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

  // PC向け: ドラッグで左右スクロール
  const endMouseDragRef = useRef<() => void>(() => {});

  const applyMouseDrag = useCallback((clientX: number) => {
    if (!isMouseDragActiveRef.current) return;
    const container = tableRef.current;
    if (!container) return;

    const deltaX = clientX - mouseStartXRef.current;
    if (Math.abs(deltaX) > 3) {
      isMouseDraggingRef.current = true;
    }
    container.scrollLeft = mouseStartScrollLeftRef.current - deltaX;
  }, []);

  const handleWindowMouseMove = useCallback(
    (e: MouseEvent) => {
      applyMouseDrag(e.clientX);
      if (isMouseDragActiveRef.current) {
        e.preventDefault();
      }
    },
    [applyMouseDrag],
  );

  const handleWindowMouseUp = useCallback(() => {
    endMouseDragRef.current();
  }, []);

  const endMouseDrag = useCallback(() => {
    if (!isMouseDragActiveRef.current) return;
    isMouseDragActiveRef.current = false;
    window.removeEventListener('mousemove', handleWindowMouseMove);
    window.removeEventListener('mouseup', handleWindowMouseUp);
    if (tableRef.current) {
      tableRef.current.style.cursor = 'grab';
    }
    document.body.style.userSelect = '';
    requestAnimationFrame(() => {
      isMouseDraggingRef.current = false;
    });
  }, [handleWindowMouseMove, handleWindowMouseUp]);

  endMouseDragRef.current = endMouseDrag;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const container = tableRef.current;
    if (!container) return;
    const hasHorizontalOverflow = container.scrollWidth > container.clientWidth + 1;
    if (!hasHorizontalOverflow) return;

    isMouseDragActiveRef.current = true;
    isMouseDraggingRef.current = false;
    mouseStartXRef.current = e.clientX;
    mouseStartScrollLeftRef.current = container.scrollLeft;
    container.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    e.preventDefault();
  };

  const handleMouseUp = () => {
    endMouseDrag();
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      document.body.style.userSelect = '';
    };
  }, [handleWindowMouseMove, handleWindowMouseUp]);

  const cellVisuals = useMemo(() => {
    const visualMap = new Map<string, HeatmapCellVisual>();

    uniqueTimeSlots.forEach((timeSlot) => {
      uniqueDates.forEach((dateInfo) => {
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
        const isPastDate =
          startOfToday !== null ? dateOnly.getTime() < startOfToday.getTime() : false;

        const ratio = maxAvailable > 0 ? availableCount / maxAvailable : 0;
        const raw = 20 + ratio * 80;
        const opacity5 = Math.round(raw / 5) * 5;
        const opacityValue = Math.min(Math.max(opacity5, 20), 100) / 100;

        const shouldApplyPastGrayscale = hasData && isPastEventGrayscaleEnabled && isPastDate;
        const shouldDimPastColumn = isPastEventGrayscaleEnabled && isPastDate;
        const filterValues: string[] = [];
        if (
          hasData &&
          hasResponses &&
          (availableCount < minColoredCount || shouldApplyPastGrayscale)
        ) {
          filterValues.push('grayscale(1)');
        }
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
        const overlayColor = shouldDimPastColumn
          ? shouldApplyPastGrayscale
            ? pastColumnPalette.emphasizedOverlay
            : pastColumnPalette.baseOverlay
          : null;
        const backgroundLayers: string[] = [];
        if (overlayColor) {
          backgroundLayers.push(`linear-gradient(0deg, ${overlayColor}, ${overlayColor})`);
        }
        if (shouldDimPastColumn) {
          backgroundLayers.push(
            shouldApplyPastGrayscale
              ? pastColumnPalette.columnBaseLayerMuted
              : pastColumnPalette.columnBaseLayer,
          );
        }
        const filter = filterValues.length > 0 ? filterValues.join(' ') : 'none';
        const backgroundImage =
          backgroundLayers.length > 0 ? backgroundLayers.join(', ') : undefined;
        const cellStyle = {
          backgroundColor,
          backgroundImage,
          filter,
          transition: HEATMAP_FADE_TRANSITION,
        } as React.CSSProperties;
        const lineColor = (() => {
          if (!hasData) {
            return 'transparent';
          }
          if (!hasResponses) {
            return (isDarkTheme ?? false)
              ? 'rgba(148, 163, 184, 0.24)'
              : 'rgba(148, 163, 184, 0.48)';
          }
          if (shouldApplyPastGrayscale) {
            return (isDarkTheme ?? false) ? 'rgba(80, 88, 104, 0.58)' : 'rgba(126, 139, 161, 0.58)';
          }
          return `rgba(var(--p-rgb, 87, 13, 248), ${Math.min(opacityValue + 0.16, 1)})`;
        })();
        const lineTone: HeatmapCellVisual['lineTone'] = !hasData
          ? 'none'
          : !hasResponses
            ? 'neutral'
            : shouldApplyPastGrayscale
              ? 'past'
              : 'primary';
        const boundarySignature = hasData
          ? `${lineTone}|${backgroundColor}|${backgroundImage ?? ''}|${filter}`
          : 'none';

        const countTextBaseClass = 'text-xs font-bold sm:text-base';
        const countTextClass = shouldApplyPastGrayscale
          ? `${countTextBaseClass} ${(isDarkTheme ?? false) ? 'text-base-content/80' : 'text-base-content/60'}`
          : `${countTextBaseClass}${opacityValue >= 0.6 ? ' text-white' : ' text-base-content'}`;
        const unavailableTextClass = shouldApplyPastGrayscale
          ? (isDarkTheme ?? false)
            ? 'text-[10px] text-base-content/50 sm:text-xs'
            : 'text-[10px] text-base-content/60 sm:text-xs'
          : 'text-[10px] text-base-content/70 sm:text-xs';
        const joinKey =
          hasData && hasResponses
            ? `${shouldApplyPastGrayscale ? 'past' : filter !== 'none' ? 'muted' : 'primary'}|${
                shouldDimPastColumn ? 'past-column' : 'normal-column'
              }`
            : null;

        visualMap.set(key, {
          dateId: cellData?.dateId ?? '',
          isSelected,
          availableCount,
          unavailableCount,
          hasData,
          hasResponses,
          isPastColumnGrayscale: shouldDimPastColumn,
          lineColor,
          lineTone,
          boundarySignature,
          cellStyle,
          countTextClass,
          unavailableTextClass,
          joinKey,
        });
      });
    });

    return visualMap;
  }, [
    heatmapData,
    isDarkTheme,
    isPastEventGrayscaleEnabled,
    maxAvailable,
    minColoredCount,
    pastColumnPalette.baseOverlay,
    pastColumnPalette.columnBaseLayer,
    pastColumnPalette.columnBaseLayerMuted,
    pastColumnPalette.emphasizedOverlay,
    startOfToday,
    uniqueDates,
    uniqueTimeSlots,
  ]);

  const boundaryLineColorMap = useMemo(() => {
    const boundaryMap = new Map<string, string>();
    const resolveBoundaryColor = (current: HeatmapCellVisual, top?: HeatmapCellVisual) => {
      if (!top) return 'transparent';
      // 見た目シグネチャが異なる境界では線を出さない
      if (current.boundarySignature !== top.boundarySignature) {
        return 'transparent';
      }
      if (current.lineTone === 'none') {
        return 'transparent';
      }
      // ライトテーマでは背景（neutral）以外の時間罫線を出さない
      if (!(isDarkTheme ?? false) && current.lineTone !== 'neutral') {
        return 'transparent';
      }

      if (current.lineTone === 'primary') {
        return (isDarkTheme ?? false)
          ? 'rgba(var(--p-rgb, 87, 13, 248), 0.52)'
          : 'rgba(var(--p-rgb, 87, 13, 248), 0.40)';
      }
      if (current.lineTone === 'past') {
        return (isDarkTheme ?? false) ? 'rgba(80, 88, 104, 0.56)' : 'rgba(126, 139, 161, 0.46)';
      }
      if (current.lineTone === 'neutral') {
        return (isDarkTheme ?? false) ? 'rgba(100, 116, 139, 0.48)' : 'rgba(100, 116, 139, 0.36)';
      }

      return 'transparent';
    };

    uniqueTimeSlots.forEach((timeSlot, rowIndex) => {
      uniqueDates.forEach((dateInfo) => {
        const key = `${dateInfo.date}_${timeSlot.slotKey}`;
        const current = cellVisuals.get(key);
        if (!current) return;

        const topKey =
          rowIndex > 0 ? `${dateInfo.date}_${uniqueTimeSlots[rowIndex - 1].slotKey}` : null;
        const top = topKey ? cellVisuals.get(topKey) : undefined;
        boundaryMap.set(key, resolveBoundaryColor(current, top));
      });
    });

    return boundaryMap;
  }, [cellVisuals, isDarkTheme, uniqueDates, uniqueTimeSlots]);

  const cellShapeMap = useMemo(
    () =>
      buildCellShapeMap({
        cellVisuals,
        uniqueDates,
        uniqueTimeSlots,
      }),
    [cellVisuals, uniqueDates, uniqueTimeSlots],
  );

  return (
    <div
      className="fade-in space-y-2 sm:space-y-3"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <p className="text-base-content/60 hidden px-1 text-right text-[11px] sm:block">
        ドラッグで左右スクロール
      </p>
      <div
        className="bg-base-100 border-base-300 overflow-x-auto rounded-lg border sm:cursor-grab"
        ref={tableRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        <table className="w-full min-w-[400px] table-fixed border-separate border-spacing-0 text-center sm:min-w-[680px]">
          {/* 日付列が少ない時でも時間列だけが不自然に伸びないよう、先頭列幅を固定する */}
          <colgroup>
            <col className="w-[50px] sm:w-[64px]" />
            {uniqueDates.map((dateInfo) => (
              <col key={`${dateInfo.date}-col`} className="w-[44px] sm:w-[72px]" />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-20">
            <tr className="bg-base-200">
              <th className="bg-base-200 border-base-300 sticky left-0 top-0 isolate z-30 min-w-[50px] border-r px-1 py-1 text-left text-xs sm:min-w-[64px] sm:px-1.5 sm:py-2 sm:text-sm">
                時間
              </th>
              {uniqueDates.map((dateInfo, index, arr) => {
                const optimizedDisplay = getOptimizedDateDisplay(
                  dateInfo.dateObj.toISOString(),
                  index,
                  arr.map((d) => d.dateObj.toISOString()),
                );
                const mobileMonthDay = `${dateInfo.dateObj.getMonth() + 1}/${dateInfo.dateObj.getDate()}`;
                const mobileWeekday = dateInfo.dateObj.toLocaleDateString('ja-JP', {
                  weekday: 'short',
                });
                // 列ヘッダーでも過去日程かどうかを判定し、視覚的な強調を行う
                // SSR時（startOfToday === null or isDarkTheme === null）はスタイルを適用しない
                const dateOnly = new Date(dateInfo.dateObj);
                dateOnly.setHours(0, 0, 0, 0);
                const isPastDate =
                  startOfToday !== null ? dateOnly.getTime() < startOfToday.getTime() : false;
                const headerStyle =
                  isPastEventGrayscaleEnabled &&
                  isPastDate &&
                  isDarkTheme !== null &&
                  startOfToday !== null
                    ? {
                        backgroundColor: pastColumnPalette.headerBaseColor,
                        backgroundImage: `linear-gradient(180deg, ${pastColumnPalette.headerGradientTop} 0%, ${pastColumnPalette.headerGradientBottom} 100%)`,
                        color: pastColumnPalette.headerTextColor,
                        transition: HEATMAP_FADE_TRANSITION,
                      }
                    : undefined;
                return (
                  <th
                    key={dateInfo.date}
                    data-date-index={index}
                    className={`bg-base-200 sticky top-0 z-20 min-w-[48px] px-0.5 py-1 text-center text-xs sm:min-w-[96px] sm:px-2 sm:py-3 sm:text-sm ${
                      isPastDate ? 'text-base-content/70' : 'text-base-content'
                    }`}
                    style={headerStyle}
                  >
                    <span className="flex flex-col items-center leading-tight sm:hidden">
                      <span className="text-[11px] font-semibold">{mobileMonthDay}</span>
                      <span className="text-base-content/70 text-[9px]">{mobileWeekday}</span>
                    </span>
                    <span className="hidden sm:inline">
                      {optimizedDisplay.yearMonth && (
                        <>
                          {optimizedDisplay.yearMonth}
                          <br />
                        </>
                      )}
                      {optimizedDisplay.day}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* スペーサー：最初の時間ラベルがヘッダーに隠れるのを防ぐ */}
            <tr>
              <td className="bg-base-200 border-base-300 sticky left-0 isolate z-20 h-3 border-r sm:h-4"></td>
            </tr>
            {uniqueTimeSlots.map((timeSlot, rowIndex) => {
              // 時間表示をコンパクトに整形（先頭ゼロを削除）
              const formattedStartTime = timeSlot.startTime.replace(/^0/, '');
              const formattedEndTime =
                timeSlot.endTime === '24:00' ? '24:00' : timeSlot.endTime.replace(/^0/, '');

              return (
                <tr key={timeSlot.slotKey}>
                  <td
                    className="bg-base-200 border-base-300 sticky left-0 isolate z-20 whitespace-nowrap border-r py-1 pl-1 pr-0.5 text-left text-xs font-medium sm:py-1.5 sm:pl-1.5 sm:pr-1 sm:text-sm"
                    aria-label={`${formattedStartTime}〜${formattedEndTime}`}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 0, // 上辺を基準にする
                        left: '0.25rem',
                        transform: 'translateY(-50%)', // 高さの半分だけ上に移動
                        backgroundColor: 'oklch(var(--b2)/0.96)',
                        padding: '0 0.25rem',
                      }}
                    >
                      {formattedStartTime}
                    </span>
                  </td>
                  {uniqueDates.map((dateInfo, colIndex) => {
                    const key = `${dateInfo.date}_${timeSlot.slotKey}`;
                    const visual = cellVisuals.get(key);
                    if (!visual) return null;
                    const cellShape = cellShapeMap.get(key);
                    const rawCornerClass =
                      cellShape?.cornerClass ?? `rounded-[${HEATMAP_CELL_RADIUS}]`;
                    const rawCornerStyle = cellShape?.cornerStyle ?? {
                      borderRadius: HEATMAP_CELL_RADIUS,
                    };
                    const joinsTop = cellShape?.joinsTop ?? false;
                    const raisedTopVisual = cellShape?.raisedTopVisual ?? null;
                    const raisedBottomVisual = cellShape?.raisedBottomVisual ?? null;
                    const raisedLeftVisual = cellShape?.raisedLeftVisual ?? null;
                    const raisedRightVisual = cellShape?.raisedRightVisual ?? null;
                    const {
                      dateId,
                      isSelected,
                      availableCount,
                      unavailableCount,
                      hasData,
                      hasResponses,
                      isPastColumnGrayscale,
                      cellStyle,
                      countTextClass,
                      unavailableTextClass,
                    } = visual;
                    // 過去日程グレー表示の列は回答有無に関わらず境界を直線で見せる
                    const shouldUseStraightPastBoundary = isPastColumnGrayscale;
                    const cornerClass = shouldUseStraightPastBoundary
                      ? 'rounded-none'
                      : rawCornerClass;
                    const cornerStyle = shouldUseStraightPastBoundary
                      ? {
                          borderTopLeftRadius: '0px',
                          borderTopRightRadius: '0px',
                          borderBottomLeftRadius: '0px',
                          borderBottomRightRadius: '0px',
                        }
                      : rawCornerStyle;
                    const shouldFillWrapperBackground = cornerClass === 'rounded-none';
                    const effectiveRaisedTopVisual = shouldUseStraightPastBoundary
                      ? null
                      : raisedTopVisual;
                    const effectiveRaisedBottomVisual = shouldUseStraightPastBoundary
                      ? null
                      : raisedBottomVisual;
                    const effectiveRaisedLeftVisual = shouldUseStraightPastBoundary
                      ? null
                      : raisedLeftVisual;
                    const effectiveRaisedRightVisual = shouldUseStraightPastBoundary
                      ? null
                      : raisedRightVisual;
                    const topNeighborKey =
                      rowIndex > 0
                        ? getHeatmapCellKey(dateInfo.date, uniqueTimeSlots[rowIndex - 1].slotKey)
                        : null;
                    const topVisual = topNeighborKey ? cellVisuals.get(topNeighborKey) : undefined;
                    // 段差レイヤーを無効化しているため、上セルが載る状態は常に発生しない。
                    const isTopRaisedOverCurrent = false;
                    const boundaryLineColor = boundaryLineColorMap.get(key) ?? 'transparent';
                    const hasBoundaryLine = boundaryLineColor !== 'transparent';
                    const wrapperStyle = shouldFillWrapperBackground
                      ? {
                          backgroundColor: cellStyle.backgroundColor,
                          backgroundImage: cellStyle.backgroundImage,
                          filter: cellStyle.filter,
                          transition: HEATMAP_FADE_TRANSITION,
                        }
                      : undefined;
                    const shouldRenderJoinBleed = shouldRenderJoinBleedOnTop({
                      isDarkTheme: isDarkTheme ?? false,
                      hasBoundaryLine,
                      current: visual,
                      top: topVisual,
                      joinsTop,
                      isTopRaisedOverCurrent,
                    });
                    const hasNonZeroRadius = (
                      radius: React.CSSProperties['borderTopLeftRadius'] | undefined,
                    ): boolean =>
                      radius !== undefined &&
                      radius !== null &&
                      radius !== '0px' &&
                      radius !== '0' &&
                      radius !== 0;
                    const hasRoundedTopEdge =
                      hasNonZeroRadius(cornerStyle.borderTopLeftRadius) ||
                      hasNonZeroRadius(cornerStyle.borderTopRightRadius) ||
                      hasNonZeroRadius(cornerStyle.borderRadius);
                    const shouldRenderTopBoundaryLine = hasBoundaryLine && !hasRoundedTopEdge;
                    const joinBleedBaseStyle = shouldRenderJoinBleed
                      ? {
                          backgroundColor:
                            topVisual?.cellStyle.backgroundColor ?? cellStyle.backgroundColor,
                          backgroundImage:
                            topVisual?.cellStyle.backgroundImage ?? cellStyle.backgroundImage,
                          filter: topVisual?.cellStyle.filter ?? cellStyle.filter,
                        }
                      : undefined;
                    // 境界ごとの重ね塗りを避けるため、背景抜け防止は縦方向（上辺）のみを担当する
                    const joinBleedTopStyle = joinBleedBaseStyle
                      ? {
                          ...joinBleedBaseStyle,
                          top: `-${HEATMAP_JOIN_BLEED_PX}px`,
                          left: '0px',
                          right: '0px',
                          height: `${HEATMAP_JOIN_BLEED_PX}px`,
                        }
                      : null;
                    const cellSurfaceStyle = shouldFillWrapperBackground
                      ? {
                          ...cornerStyle,
                        }
                      : {
                          ...cellStyle,
                          ...cornerStyle,
                        };

                    // すべてのイベントハンドラを付与し、イベント内で分岐
                    return (
                      <td
                        key={key}
                        data-col-index={colIndex}
                        style={{
                          padding: 0,
                          borderTopWidth: shouldRenderTopBoundaryLine ? '1px' : '0px',
                          borderTopStyle: 'solid',
                          borderTopColor: shouldRenderTopBoundaryLine
                            ? boundaryLineColor
                            : 'transparent',
                        }}
                        className={`relative cursor-pointer p-0 align-top ${isSelected ? 'border-success border-2' : ''}`}
                        onPointerEnter={(e) => {
                          if (!hasData || isDragging || isMouseDraggingRef.current) return;
                          onPointerTooltipStart?.(e, dateId);
                        }}
                        onPointerLeave={(e) => {
                          if (!hasData || isDragging || isMouseDraggingRef.current) return;
                          onPointerTooltipEnd?.(e, dateId);
                        }}
                        /**
                         * セルのPointerUpでツールチップ表示（スマホはタップで即表示）
                         */
                        onPointerUp={(e) => {
                          if (!hasData || isDragging || isMouseDraggingRef.current) return;
                          onPointerTooltipClick?.(e, dateId);
                        }}
                      >
                        {joinBleedTopStyle && (
                          <div
                            aria-hidden="true"
                            className="heatmap-join-bleed heatmap-join-bleed-top pointer-events-none absolute z-0"
                            style={joinBleedTopStyle}
                          />
                        )}
                        {hasData ? (
                          <div
                            className="relative h-full min-h-8 w-full overflow-hidden sm:min-h-9"
                            style={wrapperStyle}
                          >
                            {effectiveRaisedTopVisual && (
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-x-0 top-0"
                                style={{
                                  height: `calc(${HEATMAP_CELL_RADIUS} + 1px)`,
                                  backgroundColor:
                                    effectiveRaisedTopVisual.cellStyle.backgroundColor,
                                  backgroundImage:
                                    effectiveRaisedTopVisual.cellStyle.backgroundImage,
                                  filter: effectiveRaisedTopVisual.cellStyle.filter,
                                }}
                              />
                            )}
                            {effectiveRaisedBottomVisual && (
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-x-0 bottom-0"
                                style={{
                                  height: `calc(${HEATMAP_CELL_RADIUS} + 1px)`,
                                  backgroundColor:
                                    effectiveRaisedBottomVisual.cellStyle.backgroundColor,
                                  backgroundImage:
                                    effectiveRaisedBottomVisual.cellStyle.backgroundImage,
                                  filter: effectiveRaisedBottomVisual.cellStyle.filter,
                                }}
                              />
                            )}
                            {effectiveRaisedLeftVisual && (
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-y-0 left-0"
                                style={{
                                  width: `calc(${HEATMAP_CELL_RADIUS} + 1px)`,
                                  backgroundColor:
                                    effectiveRaisedLeftVisual.cellStyle.backgroundColor,
                                  backgroundImage:
                                    effectiveRaisedLeftVisual.cellStyle.backgroundImage,
                                  filter: effectiveRaisedLeftVisual.cellStyle.filter,
                                }}
                              />
                            )}
                            {effectiveRaisedRightVisual && (
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-y-0 right-0"
                                style={{
                                  width: `calc(${HEATMAP_CELL_RADIUS} + 1px)`,
                                  backgroundColor:
                                    effectiveRaisedRightVisual.cellStyle.backgroundColor,
                                  backgroundImage:
                                    effectiveRaisedRightVisual.cellStyle.backgroundImage,
                                  filter: effectiveRaisedRightVisual.cellStyle.filter,
                                }}
                              />
                            )}
                            <div
                              style={cellSurfaceStyle}
                              className={`relative z-10 flex h-full min-h-8 w-full flex-col items-center justify-center overflow-hidden sm:min-h-9 ${cornerClass}`}
                            >
                              {hasResponses ? (
                                <>
                                  <span className={countTextClass}>{availableCount}</span>
                                  {unavailableCount > 0 && (
                                    <span className={`${unavailableTextClass} hidden sm:inline`}>
                                      ({unavailableCount})
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <span className="sr-only">回答なし</span>
                                  <span
                                    aria-hidden="true"
                                    className="text-base-content/50 text-xs sm:text-sm"
                                  >
                                    0
                                  </span>
                                </>
                              )}
                              {isSelected && (
                                <div className="bg-success absolute right-0 top-0 m-0.5 h-1.5 w-1.5 rounded-full sm:m-1 sm:h-2 sm:w-2"></div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex h-full min-h-8 w-full items-center justify-center sm:min-h-9">
                            {/* イベント未設定セルも中央揃えで視認性を統一 */}
                            <span className="sr-only">イベント未設定</span>
                            <span
                              aria-hidden="true"
                              className="text-base-content/40 text-xs sm:text-sm"
                            >
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
                    <td className="bg-base-200 border-base-300 sticky left-0 isolate z-20 whitespace-nowrap border-r py-1 pl-1 pr-0.5 text-left text-xs font-medium sm:py-1.5 sm:pl-1.5 sm:pr-1 sm:text-sm">
                      <span
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: '0.25rem',
                          transform: 'translateY(-50%)',
                          backgroundColor: 'oklch(var(--b2)/0.96)',
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

      <div className="bg-base-100 rounded-lg border p-2 sm:p-3">
        <div className="flex flex-col gap-3">
          {/* スライダーによるフィルター設定 */}
          {onMinColoredCountChange && (
            <details className="from-base-200/50 to-base-300/30 border-base-300/50 group collapse rounded-lg border bg-gradient-to-r">
              <summary className="collapse-title relative flex min-h-0 cursor-pointer items-center justify-between gap-2 px-3 py-1.5 sm:py-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2 pr-5 sm:pr-6">
                  <div className="bg-primary h-2 w-2 rounded-full"></div>
                  <span className="text-base-content text-sm font-semibold leading-tight">
                    フィルター設定
                  </span>
                  <div className="badge badge-primary badge-sm whitespace-nowrap">
                    {minColoredCount}人以上
                  </div>
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
