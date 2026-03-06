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

  beforeEach(() => {
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
});
