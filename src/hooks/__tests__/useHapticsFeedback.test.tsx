import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import useHapticsFeedback from '@/hooks/useHapticsFeedback';

function TriggerTestComponent() {
  const { notifyDragStart, notifySelectionChange } = useHapticsFeedback({
    disableInTest: false,
  });

  return (
    <div>
      <button type="button" onClick={notifyDragStart}>
        drag-start
      </button>
      <button type="button" onClick={notifySelectionChange}>
        selection
      </button>
    </div>
  );
}

function ConfigurableTriggerTestComponent({
  mobileOnly = true,
  disableInTest = false,
}: {
  mobileOnly?: boolean;
  disableInTest?: boolean;
}) {
  const { notifyDragStart } = useHapticsFeedback({
    mobileOnly,
    disableInTest,
  });

  return (
    <button type="button" onClick={notifyDragStart}>
      drag-start-only
    </button>
  );
}

function IdentityProbe({
  onSnapshot,
}: {
  onSnapshot: (value: ReturnType<typeof useHapticsFeedback>) => void;
}) {
  const [count, setCount] = useState(0);
  const feedback = useHapticsFeedback({
    mobileOnly: false,
    disableInTest: false,
  });

  onSnapshot(feedback);

  return (
    <button type="button" onClick={() => setCount((prev) => prev + 1)}>
      rerender-{count}
    </button>
  );
}

describe('useHapticsFeedback', () => {
  const originalInnerWidth = window.innerWidth;
  const originalMatchMedia = window.matchMedia;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDateNow = Date.now;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 390,
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    Date.now = originalDateNow;
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
  });

  it('モバイル幅では navigator.vibrate を優先して呼び出す', async () => {
    const vibrate = jest.fn().mockReturnValue(true);
    Object.defineProperty(window.navigator, 'vibrate', {
      configurable: true,
      value: vibrate,
    });

    render(<TriggerTestComponent />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'drag-start' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'drag-start' }));
    fireEvent.click(screen.getByRole('button', { name: 'selection' }));

    expect(vibrate).toHaveBeenCalledWith([20]);
    expect(vibrate).toHaveBeenCalledWith([16]);
  });

  it('同条件の再描画では通知コールバックの参照を維持する', () => {
    const snapshots: Array<ReturnType<typeof useHapticsFeedback>> = [];

    render(<IdentityProbe onSnapshot={(value) => snapshots.push(value)} />);
    fireEvent.click(screen.getByRole('button', { name: 'rerender-0' }));

    expect(snapshots.length).toBeGreaterThanOrEqual(2);
    const beforeRerender = snapshots[snapshots.length - 2];
    const afterRerender = snapshots[snapshots.length - 1];

    expect(beforeRerender).toBe(afterRerender);
    expect(beforeRerender.notifyDragStart).toBe(afterRerender.notifyDragStart);
    expect(beforeRerender.notifyDragEnd).toBe(afterRerender.notifyDragEnd);
    expect(beforeRerender.notifySelectionChange).toBe(afterRerender.notifySelectionChange);
  });

  it('disableInTest が有効なときは通知しない', () => {
    const vibrate = jest.fn().mockReturnValue(true);
    Object.defineProperty(window.navigator, 'vibrate', {
      configurable: true,
      value: vibrate,
    });

    render(<ConfigurableTriggerTestComponent mobileOnly={false} disableInTest />);
    fireEvent.click(screen.getByRole('button', { name: 'drag-start-only' }));

    expect(vibrate).not.toHaveBeenCalled();
  });

  it('mobileOnly が有効でデスクトップ幅の場合は通知しない', () => {
    const vibrate = jest.fn().mockReturnValue(true);
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1280,
    });
    Object.defineProperty(window.navigator, 'vibrate', {
      configurable: true,
      value: vibrate,
    });

    render(<ConfigurableTriggerTestComponent mobileOnly disableInTest={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'drag-start-only' }));

    expect(vibrate).not.toHaveBeenCalled();
  });

  it('reduced motion 設定時は通知しない', () => {
    const vibrate = jest.fn().mockReturnValue(true);
    Object.defineProperty(window.navigator, 'vibrate', {
      configurable: true,
      value: vibrate,
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    render(<ConfigurableTriggerTestComponent mobileOnly={false} disableInTest={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'drag-start-only' }));

    expect(vibrate).not.toHaveBeenCalled();
  });

  it('同一イベントはクールダウン中に連続実行されない', () => {
    const vibrate = jest.fn().mockReturnValue(true);
    Object.defineProperty(window.navigator, 'vibrate', {
      configurable: true,
      value: vibrate,
    });
    Date.now = jest.fn().mockReturnValue(1000);

    render(<ConfigurableTriggerTestComponent mobileOnly={false} disableInTest={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'drag-start-only' }));
    fireEvent.click(screen.getByRole('button', { name: 'drag-start-only' }));

    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith([20]);
  });
});
