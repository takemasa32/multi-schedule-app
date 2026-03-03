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

/**
 * 触覚フィードバックを呼び出すための共通フック
 * web-haptics が使えない環境では自動的に no-op で動作する。
 */
export function useHapticsFeedback(options: HapticsFeedbackOptions = {}) {
  const { mobileOnly = true } = options;
  const { isMobile } = useDeviceDetect();
  const hapticsRef = useRef<InstanceType<WebHapticsModule['WebHaptics']> | null>(null);
  const loadPromiseRef = useRef<Promise<InstanceType<WebHapticsModule['WebHaptics']> | null> | null>(
    null,
  );
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
    if (process.env.NODE_ENV === 'test') return false;
    if (mobileOnly && !isMobile) return false;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
    return true;
  }, [isMobile, mobileOnly]);

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
    [ensureInstance, isEnabled],
  );

  return {
    notifyDragStart: () => {
      void notify('drag-start');
    },
    notifyDragEnd: () => {
      void notify('drag-end');
    },
    notifySelectionChange: () => {
      void notify('selection-change');
    },
    notifyToggle: () => {
      void notify('toggle');
    },
    notifySuccess: () => {
      void notify('success');
    },
    notifyError: () => {
      void notify('error');
    },
  };
}

export default useHapticsFeedback;
