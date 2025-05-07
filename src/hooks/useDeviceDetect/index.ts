"use client";

import { useState, useEffect } from "react";

/**
 * デバイスタイプを検出するカスタムフック
 * @returns {Object} isMobile - モバイルデバイスかどうか
 */
export function useDeviceDetect() {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // 初期チェック
    const checkIfMobile = () => {
      // 768px未満をモバイルとみなす (Tailwindのmdブレークポイント)
      setIsMobile(window.innerWidth < 768);
    };

    // コンポーネントマウント時に実行
    checkIfMobile();

    // リサイズ時のチェック
    window.addEventListener("resize", checkIfMobile);

    // クリーンアップ
    return () => {
      window.removeEventListener("resize", checkIfMobile);
    };
  }, []);

  return { isMobile };
}

export default useDeviceDetect;