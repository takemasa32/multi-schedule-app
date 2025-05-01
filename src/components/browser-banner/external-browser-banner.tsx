"use client";

import { useEffect, useState } from "react";
import InApp from "detect-inapp";

export default function ExternalBrowserBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    const ua = navigator.userAgent || "";
    const inapp = new InApp(ua);

    // LINE判定
    const isLine = inapp.isInApp && inapp.browser === "line";

    // Instagram判定
    const isInstagram = ua.includes("Instagram");

    // Facebook判定
    const isFacebook = ua.includes("FBAN") || ua.includes("FBAV");

    // TikTok判定
    const isTikTok = ua.includes("ByteDance") || ua.includes("ByteLo");

    // Twitter判定（推定）
    const isTwitter = ua.includes("Twitter") || ua.includes("X Browser");

    if (isLine || isInstagram || isFacebook || isTikTok || isTwitter) {
      setShowBanner(true);
    }
  }, []);

  if (!isClient || !showBanner) return null;

  // 現在のURLを取得
  const currentUrl = typeof window !== "undefined" ? window.location.href : "#";

  return (
    <div className="fixed bottom-0 left-0 w-full bg-base-200 text-base-content p-3 z-50 shadow-lg border-t border-base-300">
      <div className="container mx-auto relative max-w-xl flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* 閉じるボタンを右上にabsolute配置 */}
        <button
          onClick={() => setShowBanner(false)}
          className="btn btn-ghost btn-sm absolute top-2 right-2"
          aria-label="外部ブラウザで開くバナーを閉じる"
        >
          ×
        </button>
        <div className="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="w-5 h-5 mr-2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm">
            アプリ内ブラウザで閲覧中です。機能を全て使用するには標準ブラウザでの利用をおすすめします。
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm"
            aria-label="標準ブラウザで開く"
          >
            ブラウザで開く
          </a>
        </div>
      </div>
    </div>
  );
}
