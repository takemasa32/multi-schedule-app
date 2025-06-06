import { isMobileDevice, isIOS, isAndroid, isStandalone } from '../utils';

describe('デバイス判定ユーティリティ', () => {
  const originalUA = navigator.userAgent;
  const originalMatchMedia = window.matchMedia;
  const originalStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', { value: originalUA, configurable: true });
    window.matchMedia = originalMatchMedia;
    (navigator as Navigator & { standalone?: boolean }).standalone = originalStandalone;
  });

  it('iPhone UA を検出できる', () => {
    Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)', configurable: true });
    expect(isMobileDevice()).toBe(true);
    expect(isIOS()).toBe(true);
    expect(isAndroid()).toBe(false);
  });

  it('Android UA を検出できる', () => {
    Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (Linux; Android 10)', configurable: true });
    expect(isMobileDevice()).toBe(true);
    expect(isAndroid()).toBe(true);
    expect(isIOS()).toBe(false);
  });

  it('スタンドアロン判定はmatchMediaとstandaloneで動作する', () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    expect(isStandalone()).toBe(true);
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    (navigator as Navigator & { standalone?: boolean }).standalone = true;
    expect(isStandalone()).toBe(true);
    (navigator as Navigator & { standalone?: boolean }).standalone = false;
    expect(isStandalone()).toBe(false);
  });
});
