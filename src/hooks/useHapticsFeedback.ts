'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDeviceDetect } from '@/hooks/useDeviceDetect';

type HapticEventType =
  | 'drag-start'
  | 'drag-end'
  | 'selection-change'
  | 'toggle'
  | 'success'
  | 'error';

/**
 * Hapticsの有効判定に使うオプション
 */
type HapticsFeedbackOptions = {
  /**
   * モバイル環境のみに制限するか（デフォルト: true）
   */
  mobileOnly?: boolean;
  /**
   * テスト環境でも有効化するか（デフォルト: false）
   */
  disableInTest?: boolean;
};

type WebHapticsModule = {
  WebHaptics: new () => {
    trigger: (preset: string | number | number[]) => Promise<void>;
    destroy: () => void;
  };
};

const EVENT_COOLDOWN_MS: Record<HapticEventType, number> = {
  'drag-start': 80,
  'drag-end': 120,
  'selection-change': 120,
  toggle: 80,
  success: 120,
  error: 180,
};

const EVENT_PRESET: Record<HapticEventType, string | number[]> = {
  'drag-start': 'nudge',
  'drag-end': [35],
  'selection-change': [18],
  toggle: [25],
  success: 'success',
  error: 'error',
};

const EVENT_VIBRATION_PATTERN: Record<HapticEventType, number | number[]> = {
  'drag-start': [20],
  'drag-end': [28],
  'selection-change': [16],
  toggle: [22],
  success: [20, 40, 28],
  error: [36, 24, 36],
};

/**
 * 触覚フィードバックを呼び出すための共通フック
 * web-haptics が使えない環境では自動的に no-op で動作する。
 */
export function useHapticsFeedback(options: HapticsFeedbackOptions = {}) {
  const { mobileOnly = true, disableInTest = true } = options;
  const { isMobile } = useDeviceDetect();
  const hapticsRef = useRef<InstanceType<WebHapticsModule['WebHaptics']> | null>(null);
  const loadPromiseRef = useRef<Promise<InstanceType<
    WebHapticsModule['WebHaptics']
  > | null> | null>(null);
  const lastEventAtRef = useRef<Record<HapticEventType, number>>({
    'drag-start': 0,
    'drag-end': 0,
    'selection-change': 0,
    toggle: 0,
    success: 0,
    error: 0,
  });

  const isEnabled = useMemo(() => {
    if (typeof window === 'undefined') return false;
    if (disableInTest && process.env.NODE_ENV === 'test') return false;
    if (mobileOnly && !isMobile) return false;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
    return true;
  }, [disableInTest, isMobile, mobileOnly]);

  const ensureInstance = useCallback(async () => {
    if (!isEnabled) {
      return null;
    }
    if (hapticsRef.current) {
      return hapticsRef.current;
    }
    if (loadPromiseRef.current) {
      return loadPromiseRef.current;
    }

    loadPromiseRef.current = import('web-haptics')
      .then((mod) => {
        const webHapticsModule = mod as WebHapticsModule;
        hapticsRef.current = new webHapticsModule.WebHaptics();
        return hapticsRef.current;
      })
      .catch(() => null);

    return loadPromiseRef.current;
  }, [isEnabled]);

  const triggerNavigatorVibrate = useCallback((eventType: HapticEventType) => {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
      return false;
    }

    try {
      return navigator.vibrate(EVENT_VIBRATION_PATTERN[eventType]);
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    return () => {
      hapticsRef.current?.destroy();
      hapticsRef.current = null;
      loadPromiseRef.current = null;
    };
  }, []);

  const notify = useCallback(
    async (eventType: HapticEventType) => {
      if (!isEnabled) return;

      const now = Date.now();
      const cooldown = EVENT_COOLDOWN_MS[eventType];
      if (now - lastEventAtRef.current[eventType] < cooldown) {
        return;
      }

      if (triggerNavigatorVibrate(eventType)) {
        lastEventAtRef.current[eventType] = now;
        return;
      }

      const instance = await ensureInstance();
      if (!instance) {
        return;
      }

      try {
        await instance.trigger(EVENT_PRESET[eventType]);
        lastEventAtRef.current[eventType] = now;
      } catch {
        // 端末やブラウザ事情で失敗してもUX劣化を避けるため握りつぶす
      }
    },
    [ensureInstance, isEnabled, triggerNavigatorVibrate],
  );

  const notifyDragStart = useCallback(() => {
    void notify('drag-start');
  }, [notify]);

  const notifyDragEnd = useCallback(() => {
    void notify('drag-end');
  }, [notify]);

  const notifySelectionChange = useCallback(() => {
    void notify('selection-change');
  }, [notify]);

  const notifyToggle = useCallback(() => {
    void notify('toggle');
  }, [notify]);

  const notifySuccess = useCallback(() => {
    void notify('success');
  }, [notify]);

  const notifyError = useCallback(() => {
    void notify('error');
  }, [notify]);

  return useMemo(
    () => ({
      notifyDragStart,
      notifyDragEnd,
      notifySelectionChange,
      notifyToggle,
      notifySuccess,
      notifyError,
    }),
    [
      notifyDragEnd,
      notifyDragStart,
      notifyError,
      notifySelectionChange,
      notifySuccess,
      notifyToggle,
    ],
  );
}

export default useHapticsFeedback;
