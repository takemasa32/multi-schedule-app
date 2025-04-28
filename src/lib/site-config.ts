// サービス名やロゴに関する設定を一元管理するファイル
interface SiteConfig {
  url: string;
  ogImage: string;
  illustrations: {
    hero: string;
  };
  // サービス名の設定
  name: {
    full: string;         // 完全なサービス名
    short: string;        // 省略形
    tagline: string;      // キャッチフレーズ/サブタイトル
  };
  // メタデータ設定
  meta: {
    title: string;        // ページタイトル (SEO用)
    description: string;  // サイト説明 (SEO用)
    themeColor: string;   // テーマカラー (マニフェスト用)
  };
  // ロゴ設定
  logo: {
    main: string;         // メインロゴのパス
    icon: string;         // アイコン（ファビコン）のパス
    svg: string;          // SVGロゴのパス（ヘッダーなどで使用）
    alt: string;          // ロゴの代替テキスト
  };
  // 著作権情報
  copyright: {
    year: number | string; // 著作権の年（数値または文字列）
    holder: string;        // 著作権者名
  };
}

// サービス設定
const siteConfig: SiteConfig = {
  name: {
    full: "DaySynth - β版",
    short: "DaySynth-β版",
    tagline: "みんなの予定を簡単調整",
  },
  meta: {
    title: "DaySynth - みんなの予定を簡単調整",
    description: "イベント・会議・集まりの日程調整を簡単に。複数の候補日から参加者の都合を集計し、最適な日程を見つけます。ログイン不要、リンク共有だけで誰でも簡単に回答できます。",
    themeColor: "#6366f1", // Primary color from theme.css
  },
  logo: {
    main: "/logo/favicon.svg", // メインロゴ（すでに設定されているパス）
    icon: "/logo/favicon.ico", // アイコン（ファビコン）
    svg: "/logo/favicon.svg", // SVGロゴ（ヘッダーで使用）
    alt: "複数日程調整アプリ",
  },
  copyright: {
    year: new Date().getFullYear(),
    holder: "DaySynth",
  },
  url: "https://schedule.k-tkms.com/",
  ogImage: "/logo/web-app-manifest-512x512.png",
  illustrations: {
    hero: "/logo/web-app-manifest-512x512.png", // Add the 'hero' property here
  },
};

export default siteConfig;
