import {
  sanitizePagePath,
  sanitizePageReferrer,
  trackEvent,
  trackPageView,
} from '../google-analytics';

describe('Google Analytics のサニタイズと送信', () => {
  const originalMeasurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalGtag = window.gtag;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS = 'G-TEST123';
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
    window.gtag = jest.fn();
    window.__daysynthGtagQueue = [];
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    if (originalMeasurementId === undefined) {
      delete process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS;
    } else {
      process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS = originalMeasurementId;
    }
    (process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv;
    window.gtag = originalGtag;
    delete window.__daysynthGtagQueue;
  });

  it('公開トークン、クエリ、allowlist外のパスを固定値へ置き換える', () => {
    expect(sanitizePagePath('/event/public-token?participant_id=participant-1')).toBe(
      '/event/[public_id]',
    );
    expect(sanitizePagePath('/event/public-token/finalize?title=秘密')).toBe(
      '/event/[public_id]/finalize',
    );
    expect(sanitizePagePath('/account/private-value')).toBe('/unknown');
  });

  it('同一オリジンの参照元をサニタイズし、外部・空の参照元を限定する', () => {
    expect(
      sanitizePageReferrer(
        'http://localhost/event/public-token?participant_id=x',
        'http://localhost',
      ),
    ).toBe('http://localhost/event/[public_id]');
    expect(
      sanitizePageReferrer('https://referrer.example/path?title=秘密', 'http://localhost'),
    ).toBe('https://referrer.example');
    expect(sanitizePageReferrer(undefined, 'http://localhost')).toBe('');
    expect(sanitizePageReferrer('not a URL', 'http://localhost')).toBe('');
  });

  it('イベント payload に安全なページコンテキストだけを付ける', () => {
    window.history.replaceState({}, '', '/event/public-token/input?participant_id=participant-1');

    expect(
      trackEvent('share', {
        method: 'clipboard',
        content_type: 'event',
      }),
    ).toBe(true);

    expect(window.gtag).toHaveBeenCalledWith(
      'event',
      'share',
      expect.objectContaining({
        page_path: '/event/[public_id]/input',
        page_location: 'http://localhost/event/[public_id]/input',
        page_title: '回答 | DaySynth',
        page_referrer: '',
        method: 'clipboard',
        content_type: 'event',
      }),
    );
    const eventPayload = (window.gtag as jest.Mock).mock.calls[0][2] as Record<string, unknown>;
    expect(eventPayload).not.toHaveProperty('participant_id');
    expect(eventPayload).not.toHaveProperty('public-token');
  });

  it('ページビューを手動送信し、referrer未指定でも空文字を明示する', () => {
    window.history.replaceState({}, '', '/event/public-token/finalize?participant_id=x');

    expect(trackPageView(window.location.pathname)).toBe(true);
    expect(window.gtag).toHaveBeenCalledWith(
      'config',
      'G-TEST123',
      expect.objectContaining({
        send_page_view: false,
        page_path: '/event/[public_id]/finalize',
        page_referrer: '',
      }),
    );
    expect(window.gtag).toHaveBeenCalledWith(
      'event',
      'page_view',
      expect.objectContaining({
        page_path: '/event/[public_id]/finalize',
        page_referrer: '',
      }),
    );
  });

  it('gtag の遅延中は allowlist イベントをキューへ保持する', () => {
    delete window.gtag;

    expect(trackEvent('create_started', {})).toBe(true);
    expect(window.__daysynthGtagQueue).toHaveLength(1);
    expect(window.__daysynthGtagQueue?.[0][0]).toBe('event');
    expect(window.__daysynthGtagQueue?.[0][1]).toBe('create_started');
  });

  it('測定ID未設定または開発環境では送信しない', () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS;
    expect(trackEvent('create_started', {})).toBe(false);
    expect(window.gtag).not.toHaveBeenCalled();

    process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS = 'G-TEST123';
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    expect(trackEvent('create_started', {})).toBe(false);
    expect(window.gtag).not.toHaveBeenCalled();
  });
});
