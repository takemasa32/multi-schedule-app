import { render, fireEvent, screen } from '@testing-library/react';
import useHapticsFeedback from '@/hooks/useHapticsFeedback';

function TestComponent() {
  const {
    notifyDragStart,
    notifyDragEnd,
    notifySelectionChange,
    notifyToggle,
    notifySuccess,
    notifyError,
  } = useHapticsFeedback();

  return (
    <div>
      <button type="button" onClick={notifyDragStart}>
        drag-start
      </button>
      <button type="button" onClick={notifyDragEnd}>
        drag-end
      </button>
      <button type="button" onClick={notifySelectionChange}>
        selection
      </button>
      <button type="button" onClick={notifyToggle}>
        toggle
      </button>
      <button type="button" onClick={notifySuccess}>
        success
      </button>
      <button type="button" onClick={notifyError}>
        error
      </button>
    </div>
  );
}

describe('useHapticsFeedback', () => {
  it('テスト環境では呼び出しても例外を投げない', () => {
    render(<TestComponent />);

    fireEvent.click(screen.getByRole('button', { name: 'drag-start' }));
    fireEvent.click(screen.getByRole('button', { name: 'drag-end' }));
    fireEvent.click(screen.getByRole('button', { name: 'selection' }));
    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    fireEvent.click(screen.getByRole('button', { name: 'success' }));
    fireEvent.click(screen.getByRole('button', { name: 'error' }));

    expect(true).toBe(true);
  });
});
