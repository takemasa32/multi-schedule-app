import { useRef, useState, useEffect } from "react";

/**
 * ドラッグ・スクロール判定用カスタムフック
 * threshold: ドラッグ判定とするピクセル数
 *
 * @returns isDragging: 現在ドラッグ中かどうか
 */
function useDragScrollBlocker(threshold = 10) {
  const [isDragging, setIsDragging] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const moveCountRef = useRef(0);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch" || e.pointerType === "pen") {
        startRef.current = { x: e.clientX, y: e.clientY };
        moveCountRef.current = 0;
        setIsDragging(false);
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!startRef.current) return;
      const dx = Math.abs(e.clientX - startRef.current.x);
      const dy = Math.abs(e.clientY - startRef.current.y);
      if (dx > threshold || dy > threshold) {
        moveCountRef.current += 1;
        setIsDragging(true);
      }
    };
    const onPointerUp = () => {
      setIsDragging(false);
      moveCountRef.current = 0;
      startRef.current = null;
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [threshold]);

  return isDragging;
}

export default useDragScrollBlocker;
