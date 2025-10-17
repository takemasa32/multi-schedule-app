"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
} from "react";

type SelectionKey = string;

/**
 * 範囲選択の解決ロジック
 */
type RangeResolver = (params: {
  startKey: SelectionKey;
  targetKey: SelectionKey;
}) => SelectionKey[];

/**
 * useSelectionDragController に渡すオプション
 */
export interface SelectionDragControllerOptions {
  /**
   * 対象キーが選択済みかどうかを返す関数
   */
  isSelected: (key: SelectionKey) => boolean;
  /**
   * 指定キー群に対して選択状態を反映する関数
   */
  applySelection: (keys: SelectionKey[], selected: boolean) => void;
  /**
   * 範囲選択のロジック（未指定の場合は個別セルのみ）
   */
  rangeResolver?: RangeResolver;
  /**
   * ポインター操作開始を無視する条件（例: スクロール判定時など）
   */
  shouldIgnorePointerDown?: (
    event: ReactPointerEvent<HTMLElement>,
    key: SelectionKey
  ) => boolean;
  /**
   * ポインター移動を無視する条件
   */
  shouldIgnorePointerEnter?: (
    event: ReactPointerEvent<HTMLElement> | PointerEvent,
    key: SelectionKey
  ) => boolean;
  /**
   * ポインターイベントからキーを取得する関数
   * 省略時は data-selection-key 属性を探索する
   */
  getKeyFromElement?: (element: Element | null) => SelectionKey | null;
  /**
   * ドラッグ開始時の副作用（例: 計測など）
   */
  onDragStart?: () => void;
  /**
   * ドラッグ終了時の副作用
   */
  onDragEnd?: () => void;
  /**
   * ドラッグ中は body スクロールを抑止するかどうか
   */
  disableBodyScroll?: boolean;
  /**
   * 初回クリック時に選択状態を決定するロジック
   * 省略時はトグル動作（!isSelected）となる
   */
  resolveInitialIntent?: (key: SelectionKey) => boolean;
  /**
   * キーボード操作を許可するかどうか
   */
  enableKeyboard?: boolean;
}

export interface SelectionCellPropsOptions {
  disabled?: boolean;
  focusable?: boolean;
  role?: string;
}

export interface SelectionDragControllerResult {
  /**
   * セル要素に付与するイベントハンドラ群を返す
   */
  getCellProps: (
    key: SelectionKey,
    options?: SelectionCellPropsOptions
  ) => HTMLAttributes<HTMLElement>;
  /**
   * 現在ドラッグ中かどうか
   */
  isDragging: boolean;
  /**
   * 指定キーを即時トグルするユーティリティ
   */
  toggleKey: (key: SelectionKey, nextState?: boolean) => void;
  /**
   * ドラッグ操作を強制終了する
   */
  cancelDrag: () => void;
}

const defaultRangeResolver: RangeResolver = ({ targetKey }) => [targetKey];

const defaultGetKeyFromElement = (
  element: Element | null
): SelectionKey | null => {
  if (!element) return null;
  const target = element.closest<HTMLElement>("[data-selection-key]");
  if (!target) return null;
  const key = target.getAttribute("data-selection-key");
  return key ?? null;
};

/**
 * カレンダー系 UI のドラッグ選択ロジックを共通化するカスタムフック
 */
export default function useSelectionDragController(
  options: SelectionDragControllerOptions
): SelectionDragControllerResult {
  const {
    isSelected,
    applySelection,
    rangeResolver = defaultRangeResolver,
    shouldIgnorePointerDown,
    shouldIgnorePointerEnter,
    getKeyFromElement = defaultGetKeyFromElement,
    onDragStart,
    onDragEnd,
    disableBodyScroll = false,
    resolveInitialIntent,
    enableKeyboard = true,
  } = options;

  const [isDraggingState, setIsDraggingState] = useState(false);
  const dragInfoRef = useRef<{
    isDragging: boolean;
    anchorKey: SelectionKey | null;
    intent: boolean | null;
    pointerId: number | null;
  }>({
    isDragging: false,
    anchorKey: null,
    intent: null,
    pointerId: null,
  });

  const bodyLockRef = useRef<{
    overflow: string;
    touchAction: string;
    overscrollBehavior: string;
  } | null>(null);

  const lockBodyScroll = useCallback(() => {
    if (!disableBodyScroll) return;
    if (typeof document === "undefined") return;
    if (bodyLockRef.current) return;

    const bodyStyle = document.body.style;
    bodyLockRef.current = {
      overflow: bodyStyle.overflow,
      touchAction: bodyStyle.touchAction,
      overscrollBehavior: (bodyStyle as unknown as {
        overscrollBehavior?: string;
      }).overscrollBehavior || "",
    };
    bodyStyle.overflow = "hidden";
    bodyStyle.touchAction = "none";
    (bodyStyle as unknown as { overscrollBehavior?: string }).overscrollBehavior =
      "contain";
  }, [disableBodyScroll]);

  const unlockBodyScroll = useCallback(() => {
    if (typeof document === "undefined") return;
    if (!bodyLockRef.current) return;
    const bodyStyle = document.body.style;
    bodyStyle.overflow = bodyLockRef.current.overflow;
    bodyStyle.touchAction = bodyLockRef.current.touchAction;
    (bodyStyle as unknown as { overscrollBehavior?: string }).overscrollBehavior =
      bodyLockRef.current.overscrollBehavior;
    bodyLockRef.current = null;
  }, []);

  const resetDragState = useCallback(() => {
    dragInfoRef.current = {
      isDragging: false,
      anchorKey: null,
      intent: null,
      pointerId: null,
    };
    setIsDraggingState(false);
    unlockBodyScroll();
    onDragEnd?.();
  }, [onDragEnd, unlockBodyScroll]);

  const applyRangeSelection = useCallback(
    (targetKey: SelectionKey | null) => {
      if (!targetKey) return;
      const { anchorKey, intent, isDragging } = dragInfoRef.current;
      if (!isDragging || intent === null) {
        return;
      }

      const keys = rangeResolver({
        startKey: anchorKey ?? targetKey,
        targetKey,
      });
      if (keys.length === 0) return;
      applySelection(keys, intent);
    },
    [applySelection, rangeResolver]
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>, key: SelectionKey) => {
      if (event.button !== undefined && event.button !== 0) {
        return;
      }
      if (shouldIgnorePointerDown?.(event, key)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const nextState = resolveInitialIntent?.(key) ?? !isSelected(key);
      dragInfoRef.current = {
        isDragging: true,
        anchorKey: key,
        intent: nextState,
        pointerId: event.pointerId ?? null,
      };
      setIsDraggingState(true);
      lockBodyScroll();
      onDragStart?.();

      applyRangeSelection(key);
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {
        // pointer capture が利用できない環境では無視
      }
    },
    [
      applyRangeSelection,
      isSelected,
      lockBodyScroll,
      onDragStart,
      resolveInitialIntent,
      shouldIgnorePointerDown,
    ]
  );

  const handlePointerEnter = useCallback(
    (event: ReactPointerEvent<HTMLElement>, key: SelectionKey) => {
      if (
        shouldIgnorePointerEnter?.(event, key) ||
        !dragInfoRef.current.isDragging
      ) {
        return;
      }
      event.preventDefault();
      applyRangeSelection(key);
    },
    [applyRangeSelection, shouldIgnorePointerEnter]
  );

  const finishDrag = useCallback(
    (event?: ReactPointerEvent<HTMLElement> | PointerEvent) => {
      if (!dragInfoRef.current.isDragging) return;
      if (
        event instanceof PointerEvent &&
        dragInfoRef.current.pointerId !== null &&
        event.pointerId !== dragInfoRef.current.pointerId
      ) {
        return;
      }
      if (event && "currentTarget" in event) {
        try {
          event.currentTarget.releasePointerCapture?.(
            (event as ReactPointerEvent<HTMLElement>).pointerId
          );
        } catch {
          // release に失敗した場合も後続処理を継続
        }
      }
      resetDragState();
    },
    [resetDragState]
  );

  useEffect(() => {
    if (!dragInfoRef.current.isDragging) return;
    const handlePointerMove = (event: PointerEvent) => {
      if (
        dragInfoRef.current.pointerId !== null &&
        event.pointerId !== dragInfoRef.current.pointerId
      ) {
        return;
      }
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const key = getKeyFromElement(element);
      if (!key) {
        return;
      }
      if (shouldIgnorePointerEnter?.(event, key)) {
        return;
      }
      applyRangeSelection(key);
    };

    const handlePointerUp = (event: PointerEvent) => {
      finishDrag(event);
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", handlePointerUp, { passive: false });
    window.addEventListener("pointercancel", handlePointerUp, {
      passive: false,
    });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [
    applyRangeSelection,
    finishDrag,
    getKeyFromElement,
    shouldIgnorePointerEnter,
  ]);

  useEffect(() => {
    return () => {
      resetDragState();
    };
  }, [resetDragState]);

  const toggleKey = useCallback(
    (key: SelectionKey, nextState?: boolean) => {
      const resolved = nextState ?? !isSelected(key);
      applySelection([key], resolved);
    },
    [applySelection, isSelected]
  );

  const getCellProps = useCallback(
    (
      key: SelectionKey,
      { disabled = false, focusable = false, role = "button" }: SelectionCellPropsOptions = {}
    ): HTMLAttributes<HTMLElement> => {
      if (disabled) {
        return {
          "data-selection-key": key,
          "aria-disabled": true,
          role,
        };
      }

      const props: HTMLAttributes<HTMLElement> = {
        "data-selection-key": key,
        role,
        onPointerDown: (event) => handlePointerDown(event, key),
        onPointerEnter: (event) => handlePointerEnter(event, key),
        onPointerUp: (event) => finishDrag(event),
        onPointerCancel: (event) => finishDrag(event),
        onPointerLeave: (event) => {
          if (
            shouldIgnorePointerEnter?.(event, key) ||
            !dragInfoRef.current.isDragging
          ) {
            return;
          }
          event.preventDefault();
        },
        "aria-pressed": isSelected(key),
      };

      if (focusable) {
        props.tabIndex = 0;
      }

      if (enableKeyboard) {
        props.onKeyDown = (event) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            toggleKey(key);
          }
        };
      }

      return props;
    },
    [
      enableKeyboard,
      finishDrag,
      handlePointerDown,
      handlePointerEnter,
      isSelected,
      shouldIgnorePointerEnter,
      toggleKey,
    ]
  );

  const cancelDrag = useCallback(() => {
    if (!dragInfoRef.current.isDragging) return;
    resetDragState();
  }, [resetDragState]);

  return useMemo(
    () => ({
      getCellProps,
      isDragging: isDraggingState,
      toggleKey,
      cancelDrag,
    }),
    [cancelDrag, getCellProps, isDraggingState, toggleKey]
  );
}
