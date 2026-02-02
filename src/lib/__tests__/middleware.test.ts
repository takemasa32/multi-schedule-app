/**
 * @jest-environment jsdom
 */

import { NextRequest } from 'next/server';

// Next.jsモジュールのモック
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    next: jest.fn(() => ({ type: 'next' })),
    redirect: jest.fn((url: URL, status: number) => ({
      type: 'redirect',
      url: url.toString(),
      status,
    })),
  },
}));

import { proxy, isLineInAppBrowser, shouldExcludePath } from '../../proxy';

// Next.jsモジュールのモックへの参照を取得
const { NextResponse } = jest.requireMock('next/server');

describe('proxy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isLineInAppBrowser', () => {
    it('Line/[version]形式のUser-Agentを正しく判定する', () => {
      expect(isLineInAppBrowser('Line/11.1.0')).toBe(true);
      expect(isLineInAppBrowser('Line/12.0.1')).toBe(true);
      expect(isLineInAppBrowser('Mozilla/5.0 Line/11.1.0')).toBe(true);
    });

    it('Line App形式のUser-Agentを正しく判定する', () => {
      expect(isLineInAppBrowser('Line App')).toBe(true);
      expect(isLineInAppBrowser('Mozilla/5.0 Line App Desktop')).toBe(true);
    });

    it('LINE以外のUser-Agentを正しく判定する', () => {
      expect(isLineInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)')).toBe(
        false,
      );
      expect(
        isLineInAppBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
      ).toBe(false);
      expect(isLineInAppBrowser('Instagram 123.0.0.21.114')).toBe(false);
      expect(isLineInAppBrowser('FBAN/FBIOS')).toBe(false);
      expect(isLineInAppBrowser('')).toBe(false);
    });

    it('部分的にLineを含むがLINEアプリではないUser-Agentを正しく判定する', () => {
      expect(isLineInAppBrowser('Timeline Browser')).toBe(false);
      expect(isLineInAppBrowser('Baseline Chrome')).toBe(false);
      expect(isLineInAppBrowser('online service')).toBe(false);
    });
  });

  describe('proxy function', () => {
    const createMockRequest = (
      pathname: string,
      userAgent: string,
      searchParams?: Record<string, string>,
    ) => {
      const url = new URL(`http://localhost:3000${pathname}`);
      if (searchParams) {
        Object.entries(searchParams).forEach(([key, value]) => {
          url.searchParams.set(key, value);
        });
      }

      // URLのcloneメソッドをモック（any型で回避）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (url as any).clone = jest.fn(() => {
        const clonedUrl = new URL(url.toString());
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (clonedUrl as any).clone = (url as any).clone; // 再帰的にモックを設定
        return clonedUrl;
      });

      return {
        nextUrl: url,
        headers: {
          get: jest.fn((header: string) => {
            if (header === 'user-agent') return userAgent;
            return null;
          }),
        },
      } as unknown as NextRequest;
    };

    it('APIルートではリダイレクトしない', () => {
      const request = createMockRequest('/api/test', 'Line/11.1.0');
      const response = proxy(request);

      expect(response).toEqual({ type: 'next' });
    });

    it('Next.js内部リクエストではリダイレクトしない', () => {
      const request = createMockRequest('/_next/static/test.js', 'Line/11.1.0');
      const response = proxy(request);

      expect(response).toEqual({ type: 'next' });
    });

    it('静的ファイルではリダイレクトしない', () => {
      const request = createMockRequest('/favicon.ico', 'Line/11.1.0');
      const response = proxy(request);

      expect(response).toEqual({ type: 'next' });
    });

    it('LINEアプリ以外のUser-Agentではリダイレクトしない', () => {
      const request = createMockRequest(
        '/event/test-id',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      );
      const response = proxy(request);

      expect(response).toEqual({ type: 'next' });
    });

    it('LINEアプリのUser-Agentでリダイレクトする', () => {
      const request = createMockRequest('/event/test-id', 'Line/11.1.0');
      proxy(request);

      expect(NextResponse.redirect).toHaveBeenCalledWith(expect.any(URL), 302);

      const redirectCall = (NextResponse.redirect as jest.Mock).mock.calls[0];
      const redirectUrl = redirectCall[0] as URL;
      expect(redirectUrl.pathname).toBe('/event/test-id');
      expect(redirectUrl.searchParams.get('openExternalBrowser')).toBe('1');
    });

    it('既にopenExternalBrowser=1が設定されている場合はリダイレクトしない', () => {
      const request = createMockRequest('/event/test-id', 'Line/11.1.0', {
        openExternalBrowser: '1',
      });
      const response = proxy(request);

      expect(response).toEqual({ type: 'next' });
    });

    it('ルートパスでもリダイレクトする', () => {
      const request = createMockRequest('/', 'Line/11.1.0');
      proxy(request);

      expect(NextResponse.redirect).toHaveBeenCalledWith(expect.any(URL), 302);

      const redirectCall = (NextResponse.redirect as jest.Mock).mock.calls[0];
      const redirectUrl = redirectCall[0] as URL;
      expect(redirectUrl.pathname).toBe('/');
      expect(redirectUrl.searchParams.get('openExternalBrowser')).toBe('1');
    });

    it('履歴ページでもリダイレクトする', () => {
      const request = createMockRequest('/history', 'Line/11.1.0');
      proxy(request);

      expect(NextResponse.redirect).toHaveBeenCalledWith(expect.any(URL), 302);

      const redirectCall = (NextResponse.redirect as jest.Mock).mock.calls[0];
      const redirectUrl = redirectCall[0] as URL;
      expect(redirectUrl.pathname).toBe('/history');
      expect(redirectUrl.searchParams.get('openExternalBrowser')).toBe('1');
    });

    it('Line App (デスクトップ版)でもリダイレクトする', () => {
      const request = createMockRequest('/event/test-id', 'Mozilla/5.0 Line App Desktop');
      proxy(request);

      expect(NextResponse.redirect).toHaveBeenCalledWith(expect.any(URL), 302);
    });
  });

  describe('shouldExcludePath', () => {
    it('APIルートを正しく除外する', () => {
      expect(shouldExcludePath('/api/test')).toBe(true);
      expect(shouldExcludePath('/api/og')).toBe(true);
      expect(shouldExcludePath('/api')).toBe(true);
    });

    it('Next.js内部ルートを正しく除外する', () => {
      expect(shouldExcludePath('/_next/static/test.js')).toBe(true);
      expect(shouldExcludePath('/_next/image/test.png')).toBe(true);
      expect(shouldExcludePath('/_next')).toBe(true);
    });

    it('静的ファイルを正しく除外する', () => {
      expect(shouldExcludePath('/favicon.ico')).toBe(true);
      expect(shouldExcludePath('/logo/icon.png')).toBe(true);
      expect(shouldExcludePath('/test.js')).toBe(true);
      expect(shouldExcludePath('/styles.css')).toBe(true);
    });

    it('通常のページルートは除外しない', () => {
      expect(shouldExcludePath('/')).toBe(false);
      expect(shouldExcludePath('/history')).toBe(false);
      expect(shouldExcludePath('/event/test-id')).toBe(false);
      expect(shouldExcludePath('/about')).toBe(false);
    });
  });
});
