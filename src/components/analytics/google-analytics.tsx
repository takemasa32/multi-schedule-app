'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { GOOGLE_LOGIN_MARKER_COOKIE } from '@/lib/google-login-marker';

export type AnalyticsAuthState = 'authenticated' | 'guest';
export type AnalyticsInputMode = 'auto' | 'manual';
export type AnalyticsIntervalUnit = '10' | '30' | '60' | '120' | '180' | '360' | 'other';
export type AnalyticsBoolean = 'yes' | 'no';
export type ShareMethod = 'web_share' | 'clipboard' | 'fallback';
export type ShareContentType = 'event' | 'finalized' | 'available_dates';
export type CreateStep =
  | 'event_info'
  | 'input_mode'
  | 'candidate_settings'
  | 'manual_calendar'
  | 'confirmation';
export type AnswerStep = 'name' | 'weekly' | 'availability';

/**
 * GA4 に送信できるイベントとパラメータの契約。
 * キーを追加する場合は管理画面のカスタム定義と設計書を同時に更新する。
 */
export type AnalyticsEventParams = {
  create_started: Record<string, never>;
  create_step_completed: {
    step: CreateStep;
    input_mode?: AnalyticsInputMode;
  };
  event_created: {
    input_mode: AnalyticsInputMode;
    interval_unit: AnalyticsIntervalUnit;
  };
  answer_started: {
    auth_state: AnalyticsAuthState;
  };
  answer_step_completed: {
    step: AnswerStep;
    auth_state: AnalyticsAuthState;
    weekly_used?: AnalyticsBoolean;
  };
  answer_submitted: {
    auth_state: AnalyticsAuthState;
    weekly_used: AnalyticsBoolean;
  };
  answer_edited: {
    auth_state: AnalyticsAuthState;
    weekly_used: AnalyticsBoolean;
  };
  share: {
    method: ShareMethod;
    content_type: ShareContentType;
  };
  finalize_started: {
    has_existing_finalization: AnalyticsBoolean;
  };
  event_finalized: {
    selection_count: number;
  };
  event_finalization_updated: {
    selection_count: number;
  };
  event_unfinalized: Record<string, never>;
  login: {
    method: 'Google';
  };
};

export type AnalyticsEventName = keyof AnalyticsEventParams;

type Gtag = (
  command: string,
  target: string | Date,
  config?: Record<string, string | number | boolean | undefined>,
) => void;

type AnalyticsPageContext = {
  page_location: string;
  page_path: string;
  page_title: string;
  page_referrer: string;
};

type PendingGtagCall = [
  string,
  string | Date,
  Record<string, string | number | boolean | undefined>?,
];

const eventParamKeys: Record<AnalyticsEventName, readonly string[]> = {
  create_started: [],
  create_step_completed: ['step', 'input_mode'],
  event_created: ['input_mode', 'interval_unit'],
  answer_started: ['auth_state'],
  answer_step_completed: ['step', 'auth_state', 'weekly_used'],
  answer_submitted: ['auth_state', 'weekly_used'],
  answer_edited: ['auth_state', 'weekly_used'],
  share: ['method', 'content_type'],
  finalize_started: ['has_existing_finalization'],
  event_finalized: ['selection_count'],
  event_finalization_updated: ['selection_count'],
  event_unfinalized: [],
  login: ['method'],
};

const allowedIntervalUnits: readonly AnalyticsIntervalUnit[] = [
  '10',
  '30',
  '60',
  '120',
  '180',
  '360',
  'other',
];

const isMeasurementId = (value: string | undefined): value is string =>
  Boolean(value && /^G-[A-Z0-9]+$/i.test(value));

const getGtag = (): Gtag | null => {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return null;
  }
  return window.gtag;
};

const queueGtag = (
  command: string,
  target: string | Date,
  config?: PendingGtagCall[2],
): boolean => {
  if (typeof window === 'undefined') return false;
  window.__daysynthGtagQueue ??= [];
  window.__daysynthGtagQueue.push([command, target, config]);
  return true;
};

const normalizePathname = (value: string): string => {
  if (!value) return '/';

  try {
    const parsed = new URL(value, 'https://daysynth.invalid');
    return parsed.pathname || '/';
  } catch {
    const withoutQuery = value.split(/[?#]/, 1)[0] ?? '/';
    return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
  }
};

/**
 * GA4 用のページパスから公開トークンとクエリを除去する。
 * @param {string} value ブラウザのパスまたは URL
 * @returns {string} ルート構造だけを残したページパス
 */
export const sanitizePagePath = (value: string): string => {
  const pathname = normalizePathname(value);
  const eventMatch = pathname.match(/^\/event\/[^/]+(\/.*)?$/);
  if (eventMatch) {
    const suffix = eventMatch[1] ?? '';
    const allowedSuffixes = new Set([
      '',
      '/finalize',
      '/input',
      '/input/complete',
      '/input/sync-review',
    ]);
    return allowedSuffixes.has(suffix) ? `/event/[public_id]${suffix}` : '/event/[public_id]';
  }

  const normalizedPath = pathname.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  const allowedStaticPaths = new Set([
    '/',
    '/create',
    '/history',
    '/account',
    '/auth/signin',
    '/auth/error',
    '/terms',
    '/privacy',
    '/404',
    '/500',
    '/unauthorized',
  ]);
  return allowedStaticPaths.has(normalizedPath) ? normalizedPath : '/unknown';
};

const getPageTitle = (path: string): string => {
  if (path === '/') return 'DaySynth';
  if (path === '/create') return 'イベント作成 | DaySynth';
  if (path === '/history') return '履歴 | DaySynth';
  if (path === '/account') return 'アカウント | DaySynth';
  if (path === '/auth/signin') return 'ログイン | DaySynth';
  if (path === '/auth/error') return '認証エラー | DaySynth';
  if (path === '/terms') return '利用規約 | DaySynth';
  if (path === '/privacy') return 'プライバシーポリシー | DaySynth';
  if (path === '/event/[public_id]/finalize') return '日程の確定 | DaySynth';
  if (path === '/event/[public_id]/input') return '回答 | DaySynth';
  if (path.startsWith('/event/[public_id]/input/')) return '回答完了 | DaySynth';
  if (path === '/event/[public_id]') return 'イベント詳細 | DaySynth';
  return 'DaySynth';
};

/**
 * リファラーを同一オリジンでは構造化し、外部リファラーではオリジンだけにする。
 * @param {string | undefined} value ブラウザのリファラー URL
 * @param {string} origin 現在のオリジン
 * @returns {string} GA4 に送る安全なリファラー。値がない場合は空文字
 */
export const sanitizePageReferrer = (value: string | undefined, origin: string): string => {
  if (!value) return '';
  try {
    const referrer = new URL(value);
    if (referrer.origin === origin) {
      return `${origin}${sanitizePagePath(referrer.pathname)}`;
    }
    return referrer.origin;
  } catch {
    return '';
  }
};

const getPageContext = (pathname: string, referrer?: string): AnalyticsPageContext | null => {
  if (typeof window === 'undefined') return null;
  const pagePath = sanitizePagePath(pathname);
  const origin = window.location.origin;
  return {
    page_location: `${origin}${pagePath}`,
    page_path: pagePath,
    page_title: getPageTitle(pagePath),
    page_referrer: sanitizePageReferrer(
      referrer ?? (typeof document === 'undefined' ? undefined : document.referrer),
      origin,
    ),
  };
};

const filterEventParams = <Name extends AnalyticsEventName>(
  name: Name,
  params: AnalyticsEventParams[Name],
): Record<string, string | number | boolean> => {
  const allowedKeys = new Set(eventParamKeys[name]);
  const filtered: Record<string, string | number | boolean> = {};

  Object.entries(params).forEach(([key, value]) => {
    if (!allowedKeys.has(key) || value === undefined) return;
    if (typeof value === 'number' && !Number.isFinite(value)) return;
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean')
      return;
    filtered[key] = value;
  });

  return filtered;
};

/**
 * allowlist に定義された GA4 イベントを送信する。
 * 計測の失敗はアプリケーションの操作結果へ伝播させない。
 * @param {Name} name イベント名
 * @param {AnalyticsEventParams[Name]} params イベント固有のパラメータ
 * @returns {boolean} gtag が受け付けた場合は true、それ以外は false
 */
export function trackEvent<Name extends AnalyticsEventName>(
  name: Name,
  params: AnalyticsEventParams[Name],
): boolean {
  const gaId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS;
  if (process.env.NODE_ENV === 'development' || !isMeasurementId(gaId)) return false;

  try {
    const gtag = getGtag();
    const context = getPageContext(typeof window === 'undefined' ? '/' : window.location.pathname);
    if (!context) return false;
    const eventParams = {
      ...context,
      ...filterEventParams(name, params),
    };
    if (gtag) {
      gtag('event', name, eventParams);
    } else {
      queueGtag('event', name, eventParams);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * サニタイズしたページビューを送信する。
 * @param {string} pathname 現在のパス
 * @param {string} [referrer] 直前ページまたはブラウザのリファラー
 * @returns {boolean} gtag が受け付けた場合は true、それ以外は false
 */
export function trackPageView(pathname: string, referrer?: string): boolean {
  const gaId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS;
  if (process.env.NODE_ENV === 'development' || !isMeasurementId(gaId)) return false;

  try {
    const gtag = getGtag();
    const context = getPageContext(pathname, referrer);
    if (!context) return false;
    const config = {
      send_page_view: false,
      ...context,
    };
    if (gtag) {
      gtag('config', gaId, config);
      gtag('event', 'page_view', context);
    } else {
      queueGtag('config', gaId, config);
      queueGtag('event', 'page_view', context);
    }
    return true;
  } catch {
    return false;
  }
}

const consumeGoogleLoginMarker = (): boolean => {
  if (typeof document === 'undefined') return false;
  try {
    const marker = document.cookie
      .split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(`${GOOGLE_LOGIN_MARKER_COOKIE}=`));
    if (!marker) return false;

    document.cookie = `${GOOGLE_LOGIN_MARKER_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
    return true;
  } catch {
    // Cookie が利用できない環境でもログイン後の画面を壊さない
    return false;
  }
};

const normalizeIntervalUnit = (value: string | undefined): AnalyticsIntervalUnit =>
  value && allowedIntervalUnits.includes(value as AnalyticsIntervalUnit)
    ? (value as AnalyticsIntervalUnit)
    : 'other';

export { normalizeIntervalUnit };

/**
 * GA4 の文字列パラメータ用に boolean を正規化する。
 * @param {boolean} value 対象の boolean 値
 * @returns {AnalyticsBoolean} yes または no
 */
export const toAnalyticsBoolean = (value: boolean): AnalyticsBoolean => (value ? 'yes' : 'no');

/**
 * GA4 のスクリプトを初期化し、App Router のページビューを手動送信する。
 * @returns {JSX.Element | null} GA4 スクリプト要素、または計測無効時の null
 */
export default function GoogleAnalytics() {
  const pathname = usePathname();
  const gaId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS;
  const isConfigured = process.env.NODE_ENV !== 'development' && isMeasurementId(gaId);
  const [scriptReady, setScriptReady] = useState(false);
  const lastPathRef = useRef<string | null>(null);
  const previousPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (isConfigured && typeof window.gtag === 'function') {
      setScriptReady(true);
    }
  }, [isConfigured]);

  useEffect(() => {
    if (!isConfigured || !scriptReady || !pathname || lastPathRef.current === pathname) return;
    const referrer = previousPathRef.current
      ? `${window.location.origin}${sanitizePagePath(previousPathRef.current)}`
      : document.referrer;
    if (trackPageView(pathname, referrer)) {
      lastPathRef.current = pathname;
      previousPathRef.current = pathname;
    }
  }, [isConfigured, pathname, scriptReady]);

  useEffect(() => {
    if (!isConfigured || !scriptReady) return;
    if (consumeGoogleLoginMarker()) {
      trackEvent('login', { method: 'Google' });
    }
  }, [isConfigured, scriptReady]);

  if (!isConfigured || !gaId) {
    return null;
  }

  const serializedGaId = JSON.stringify(gaId).replace(/</g, '\\u003c');
  const initializationScript = `
    (function () {
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
      var origin = window.location.origin;
      var rawPath = window.location.pathname || '/';
      var eventMatch = rawPath.match(/^\\/event\\/[^/]+(\\/.*)?$/);
      var eventSuffix = eventMatch && eventMatch[1] ? eventMatch[1] : '';
      var eventSuffixes = ['', '/finalize', '/input', '/input/complete', '/input/sync-review'];
      var staticPaths = ['/', '/create', '/history', '/account', '/auth/signin', '/auth/error', '/terms', '/privacy', '/404', '/500', '/unauthorized'];
      var normalizedPath = rawPath.replace(/\\/$/, '') || '/';
      var safePath = '/unknown';
      if (eventMatch && eventSuffixes.indexOf(eventSuffix) !== -1) {
        safePath = '/event/[public_id]' + eventSuffix;
      } else if (staticPaths.indexOf(normalizedPath) !== -1) {
        safePath = normalizedPath;
      }
      var safeReferrer = '';
      try {
        if (document.referrer) {
          var referrer = new URL(document.referrer, origin);
          if (referrer.origin === origin) {
            var referrerMatch = referrer.pathname.match(/^\\/event\\/[^/]+(\\/.*)?$/);
            var referrerSuffix = referrerMatch && referrerMatch[1] ? referrerMatch[1] : '';
            safeReferrer = referrer.origin + (
              referrerMatch && eventSuffixes.indexOf(referrerSuffix) !== -1
                ? '/event/[public_id]' + referrerSuffix
                : staticPaths.indexOf(referrer.pathname.replace(/\\/$/, '') || '/') !== -1
                  ? referrer.pathname.replace(/\\/$/, '') || '/'
                  : '/unknown'
            );
          } else {
            safeReferrer = referrer.origin;
          }
        }
      } catch (_error) {}
      window.gtag('js', new Date());
      window.gtag('config', ${serializedGaId}, {
        send_page_view: false,
        page_location: origin + safePath,
        page_path: safePath,
        page_title: 'DaySynth',
        page_referrer: safeReferrer
      });
      var pendingCalls = window.__daysynthGtagQueue || [];
      pendingCalls.forEach(function (args) { window.gtag.apply(window, args); });
      window.__daysynthGtagQueue = [];
    })();
  `;
  return (
    <>
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        dangerouslySetInnerHTML={{
          __html: initializationScript,
        }}
      />
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`}
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
      />
    </>
  );
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    __daysynthGtagQueue?: PendingGtagCall[];
  }
}
