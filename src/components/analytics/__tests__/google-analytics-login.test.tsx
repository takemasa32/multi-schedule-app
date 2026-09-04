import React from 'react';
import { render, waitFor } from '@testing-library/react';
import GoogleAnalytics from '../google-analytics';

jest.mock('next/script', () => {
  const ReactForMock = jest.requireActual('react') as typeof React;

  return function MockScript({ onReady, onLoad }: { onReady?: () => void; onLoad?: () => void }) {
    ReactForMock.useEffect(() => {
      onReady?.();
      onLoad?.();
    }, [onLoad, onReady]);
    return null;
  };
});

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('GoogleAnalytics のログインマーカー', () => {
  const originalMeasurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS = 'G-TEST123';
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    window.gtag = jest.fn();
    document.cookie = 'daysynth_google_login=; Max-Age=0; Path=/';
  });

  afterEach(() => {
    if (originalMeasurementId === undefined) {
      delete process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS;
    } else {
      process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS = originalMeasurementId;
    }
    (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
    document.cookie = 'daysynth_google_login=; Max-Age=0; Path=/';
    jest.clearAllMocks();
  });

  it('既存セッションの再水和だけでは login を送らない', async () => {
    render(<GoogleAnalytics />);

    await waitFor(() => {
      const loginCalls = (window.gtag as jest.Mock).mock.calls.filter(
        ([command, name]) => command === 'event' && name === 'login',
      );
      expect(loginCalls).toHaveLength(0);
    });
  });

  it('OAuth成功マーカーを一度だけ消費して login を送る', async () => {
    document.cookie = 'daysynth_google_login=1; Path=/';
    render(<GoogleAnalytics />);

    await waitFor(() => {
      const loginCalls = (window.gtag as jest.Mock).mock.calls.filter(
        ([command, name]) => command === 'event' && name === 'login',
      );
      expect(loginCalls).toHaveLength(1);
      expect(loginCalls[0][2]).toEqual(
        expect.objectContaining({ method: 'Google', page_referrer: '' }),
      );
    });

    expect(document.cookie).not.toContain('daysynth_google_login=1');
  });
});
