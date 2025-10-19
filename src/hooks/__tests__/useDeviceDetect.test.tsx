import { renderHook, act } from '@testing-library/react';
import { useDeviceDetect } from '../useDeviceDetect';

describe('useDeviceDetect', () => {
  it('画面幅に応じてモバイル判定が切り替わる', () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 500,
      configurable: true,
    });
    const { result } = renderHook(() => useDeviceDetect());
    expect(result.current.isMobile).toBe(true);
    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 800 });
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current.isMobile).toBe(false);
  });
});
