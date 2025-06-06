import { renderHook, act } from "@testing-library/react";
import useDragScrollBlocker from "../useDragScrollBlocker";

// JSDOM環境向けにPointerEventを簡易実装
class TestPointerEvent extends Event {
  clientX: number;
  clientY: number;
  pointerType: string;
  constructor(
    type: string,
    props: {
      clientX?: number;
      clientY?: number;
      pointerType?: string;
      bubbles?: boolean;
      cancelable?: boolean;
    } = {}
  ) {
    super(type, { bubbles: props.bubbles, cancelable: props.cancelable });
    this.clientX = props.clientX || 0;
    this.clientY = props.clientY || 0;
    this.pointerType = props.pointerType || "mouse";
  }
}
if (typeof window.PointerEvent === "undefined") {
  // @ts-expect-error - グローバルPointerEventにテスト用クラスを割り当て
  window.PointerEvent = TestPointerEvent;
}

describe("useDragScrollBlocker", () => {
  it("ドラッグ量が閾値を超えるとtrueになる", () => {
    const { result } = renderHook(() => useDragScrollBlocker(10));
    act(() => {
      window.dispatchEvent(
        new PointerEvent("pointerdown", {
          pointerType: "touch",
          clientX: 0,
          clientY: 0,
        })
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          pointerType: "touch",
          clientX: 20,
          clientY: 0,
        })
      );
    });
    expect(result.current).toBe(true);
    act(() => {
      window.dispatchEvent(new PointerEvent("pointerup"));
    });
    expect(result.current).toBe(false);
  });
});
