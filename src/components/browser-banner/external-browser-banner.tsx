"use client";

import { useEffect, useState } from "react";
import InApp from "detect-inapp";

// ロギング用（将来はGA等に差し替え可）
function logEvent(event: string, detail?: unknown) {
  console.log(`[ExternalBrowserBanner] ${event}`, detail || "");
}

export default function ExternalBrowserBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [browser, setBrowser] = useState<string>("");
  const [isAndroid, setIsAndroid] = useState(false);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    const ua = navigator.userAgent || "";
    const inapp = new InApp(ua);
    const isLine = inapp.isInApp && inapp.browser === "line";
    const isInstagram = inapp.isInApp && inapp.browser === "instagram";
    const isFacebook = inapp.isInApp && inapp.browser === "facebook";
    const isTikTok = inapp.isInApp && inapp.browser === "tiktok";
    // Twitter/Xはdetect-inappのbrowser名が"twitter"または"x"
    const isTwitter =
      inapp.isInApp && (inapp.browser === "twitter" || inapp.browser === "x");
    const isTarget =
      isLine || isInstagram || isFacebook || isTikTok || isTwitter;
    setBrowser(
      isLine
        ? "line"
        : isInstagram
        ? "instagram"
        : isFacebook
        ? "facebook"
        : isTikTok
        ? "tiktok"
        : isTwitter
        ? "twitter"
        : ""
    );
    setIsAndroid(/Android/i.test(ua));
    if (isTarget) {
      setShowBanner(true);
      logEvent("show", { browser: inapp.browser });
    }
  }, []);

  if (!isClient || !showBanner) return null;

  // 現在のURL
  const currentUrl = typeof window !== "undefined" ? window.location.href : "#";
  // LINE用: ?openExternalBrowser=1
  const lineUrl = currentUrl.includes("openExternalBrowser=1")
    ? currentUrl
    : currentUrl +
      (currentUrl.includes("?") ? "&" : "?") +
      "openExternalBrowser=1";
  // Facebook用Intentスキーム（Androidのみ）
  const intentUrl = `intent://${currentUrl.replace(
    /^https?:\/\//,
    ""
  )}#Intent;scheme=https;package=com.android.chrome;end`;

  // コピー処理
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopyMsg("リンクをコピーしました！ブラウザで貼り付けてください。");
      logEvent("copy", { browser });
      setTimeout(() => setCopyMsg(null), 2000);
    } catch {
      setCopyMsg("コピーに失敗しました。長押しでコピーしてください。");
      setTimeout(() => setCopyMsg(null), 2000);
    }
  };

  // サービス別案内
  let guide: React.ReactNode = null;
  let openBtn: React.ReactNode = null;
  if (browser === "line") {
    guide = (
      <>
        <div className="text-sm mb-1">LINEアプリ内ブラウザで閲覧中です。</div>
        <ul className="text-xs list-disc pl-5 mb-1">
          <li>「ブラウザで開く」ボタンを押すと標準ブラウザで開きます。</li>
          <li>
            もし開けない場合は、右上「︙」→「他のアプリで開く」もお試しください。
          </li>
        </ul>
      </>
    );
    openBtn = (
      <a
        href={lineUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-primary btn-sm"
        aria-label="標準ブラウザで開く"
        onClick={() => logEvent("open_external", { browser: "line" })}
      >
        ブラウザで開く
      </a>
    );
  } else if (browser === "facebook") {
    guide = (
      <>
        <div className="text-sm mb-1">
          Facebookアプリ内ブラウザで閲覧中です。
        </div>
        <ul className="text-xs list-disc pl-5 mb-1">
          <li>右上「︙」→「外部で開く」から標準ブラウザで開けます。</li>
          <li>Androidの場合は下のボタンから直接Chrome等で開けます。</li>
        </ul>
      </>
    );
    openBtn = isAndroid ? (
      <a
        href={intentUrl}
        className="btn btn-primary btn-sm"
        aria-label="Chromeで開く"
        onClick={() =>
          logEvent("open_external", { browser: "facebook", intent: true })
        }
      >
        Chromeで開く
      </a>
    ) : null;
  } else if (browser === "instagram") {
    guide = (
      <>
        <div className="text-sm mb-1">
          Instagramアプリ内ブラウザで閲覧中です。
        </div>
        <ul className="text-xs list-disc pl-5 mb-1">
          <li>右上「︙」→「ブラウザで開く」を選択してください。</li>
        </ul>
      </>
    );
  } else if (browser === "twitter" || browser === "x") {
    guide = (
      <>
        <div className="text-sm mb-1">
          X（旧Twitter）アプリ内ブラウザで閲覧中です。
        </div>
        <ul className="text-xs list-disc pl-5 mb-1">
          <li>右下「︙」→「ブラウザで開く」を選択してください。</li>
        </ul>
      </>
    );
  } else if (browser === "tiktok") {
    guide = (
      <>
        <div className="text-sm mb-1">TikTokアプリ内ブラウザで閲覧中です。</div>
        <ul className="text-xs list-disc pl-5 mb-1">
          <li>
            右上「︙」→「リンクをコピー」→Chrome等で貼り付けて開いてください。
          </li>
        </ul>
      </>
    );
  } else {
    guide = (
      <div className="text-sm mb-1">
        アプリ内ブラウザで閲覧中です。標準ブラウザでのご利用をおすすめします。
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 w-full bg-base-200 text-base-content p-3 z-50 shadow-lg border-t border-base-300">
      <div className="container mx-auto relative max-w-xl flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* 閉じるボタン */}
        <button
          onClick={() => {
            setShowBanner(false);
            logEvent("close", { browser });
          }}
          className="btn btn-ghost btn-sm absolute top-2 right-2"
          aria-label="外部ブラウザで開くバナーを閉じる"
        >
          ×
        </button>
        <div className="flex flex-col items-start w-full">
          <div className="flex items-center mb-1">
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
            <span className="text-sm font-bold">
              外部ブラウザでのご利用を推奨
            </span>
          </div>
          {guide}
          <div className="flex flex-row gap-2 mt-1">
            {openBtn}
            <button
              className="btn btn-outline btn-sm"
              onClick={handleCopy}
              aria-label="リンクをコピー"
            >
              リンクをコピー
            </button>
          </div>
          {copyMsg && (
            <div className="mt-1 text-xs text-success">{copyMsg}</div>
          )}
        </div>
      </div>
    </div>
  );
}
