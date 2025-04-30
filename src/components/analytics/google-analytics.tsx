"use client";

import Script from "next/script";

// Google Analyticsのページビュートラッキング関数
export const pageview = (url: string) => {
  if (typeof window.gtag !== "undefined") {
    window.gtag("config", process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS as string, {
      page_path: url,
    });
  }
};

// Google Analytics用のカスタムイベント送信関数
export const event = ({
  action,
  category,
  label,
  value,
}: {
  action: string;
  category: string;
  label: string;
  value?: number;
}) => {
  if (typeof window.gtag !== "undefined") {
    window.gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Google Analyticsコンポーネント
export default function GoogleAnalytics() {
  // 開発環境では実行しない
  const isDevelopment = process.env.NODE_ENV === "development";
  const gaId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS;

  if (isDevelopment || !gaId) {
    // 開発環境またはGA IDがない場合は何も表示しない
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}

// TypeScriptのためにグローバル変数を拡張
declare global {
  interface Window {
    gtag: (
      command: string,
      target: string,
      config?: Record<string, unknown>
    ) => void;
  }
}
