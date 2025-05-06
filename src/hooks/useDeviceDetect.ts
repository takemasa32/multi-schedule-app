import { useState, useEffect } from "react";

/**
 * デバイスがモバイルかどうかを判定するカスタムフック
 * @returns { isMobile: boolean }
 */
export function useDeviceDetect() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return { isMobile };
}
