import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 640;

/**
 * デバイスがモバイルかどうかを判定するカスタムフック
 * @returns { isMobile: boolean }
 */
export function useDeviceDetect() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return { isMobile };
}
