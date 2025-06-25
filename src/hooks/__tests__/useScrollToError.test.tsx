import { renderHook, act } from '@testing-library/react';
import useScrollToError from '../useScrollToError';

describe('useScrollToError', () => {
  it('errorが設定されたときにscrollIntoViewが呼ばれる', () => {
    const element = document.createElement('div');
    const spy = jest.fn();
    element.scrollIntoView = spy;
    const ref = { current: element } as React.RefObject<HTMLDivElement>;
    const { rerender } = renderHook(({ error }) => useScrollToError(error, ref), {
      initialProps: { error: null },
    });
    act(() => {
      rerender({ error: 'エラー' });
    });
    expect(spy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  });

  it('errorがnullの場合はscrollIntoViewを呼ばない', () => {
    const element = document.createElement('div');
    const spy = jest.fn();
    element.scrollIntoView = spy;
    const ref = { current: element } as React.RefObject<HTMLDivElement>;
    renderHook(() => useScrollToError(null, ref));
    expect(spy).not.toHaveBeenCalled();
  });

  it('ref.currentがnullの場合はscrollIntoViewを呼ばない', () => {
    const original = Element.prototype.scrollIntoView;
    const spy = jest.fn();
    Element.prototype.scrollIntoView = spy;
    const ref = { current: null } as React.RefObject<HTMLDivElement>;
    renderHook(() => useScrollToError('エラー', ref));
    expect(spy).not.toHaveBeenCalled();
    Element.prototype.scrollIntoView = original;
  });
});
