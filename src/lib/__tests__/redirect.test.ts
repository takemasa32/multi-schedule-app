import { normalizeCallbackUrl } from '@/lib/redirect';

describe('normalizeCallbackUrl', () => {
  it('空の場合はルートを返す', () => {
    expect(normalizeCallbackUrl(null)).toBe('/');
    expect(normalizeCallbackUrl(undefined)).toBe('/');
  });

  it('相対パスはそのまま返す', () => {
    expect(normalizeCallbackUrl('/history')).toBe('/history');
    expect(normalizeCallbackUrl('/account?tab=events')).toBe('/account?tab=events');
  });

  it('外部URLはルートにフォールバックする', () => {
    expect(normalizeCallbackUrl('https://example.com')).toBe('/');
    expect(normalizeCallbackUrl('http://localhost:3000')).toBe('/');
  });

  it('プロトコル相対や無効な形式はルートにフォールバックする', () => {
    expect(normalizeCallbackUrl('//evil.com')).toBe('/');
    expect(normalizeCallbackUrl('javascript:alert(1)')).toBe('/');
  });
});
