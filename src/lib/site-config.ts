// サービス名やロゴに関する設定を一元管理するファイル
interface SiteConfig {
  url: string;
  ogImage: string;
  illustrations: {
    hero: string;
  };
  // サービス名の設定
  name: {
    full: string; // 完全なサービス名
    short: string; // 省略形
    tagline: string; // キャッチフレーズ/サブタイトル
  };
  // メタデータ設定
  meta: {
    title: string; // ページタイトル (SEO用)
    description: string; // サイト説明 (SEO用)
    themeColor: string; // テーマカラー (マニフェスト用)
    keywords?: string; // 検索キーワード (SEO用)
  };
  // ロゴ設定
  logo: {
    main: string; // メインロゴのパス
    icon: string; // アイコン（ファビコン）のパス
    svg: string; // SVGロゴのパス（ヘッダーなどで使用）
    alt: string; // ロゴの代替テキスト
  };
  // 著作権情報
  copyright: {
    year: number | string; // 著作権の年（数値または文字列）
    holder: string; // 著作権者名
  };
}

// サービス設定
const siteConfig: SiteConfig = {
  name: {
    full: 'DaySynth',
    short: 'DaySynth',
    tagline: 'みんなの予定を簡単調整',
  },
  meta: {
    title: 'DaySynth（デイシンス／でいしんす） - みんなの予定を簡単調整',
    description:
      'DaySynth（デイシンス／でいしんす）は、複数の日程から最適な予定を見つける、シンプルで使いやすい日程調整アプリです。バンド練習やゲーム会、会議など、グループのスケジュール調整に最適。候補日を重ねて合成し、全員の都合を一目で把握できます。ログイン不要・無料。',
    themeColor: '#6366f1',
    keywords:
      'DaySynth, デイシンス, でいしんす, daysynth, 日程調整, スケジュール調整, 候補日, バンド練習, ゲーム会, 会議, イベント, カレンダー, 無料, ログイン不要,簡単, シンプル, 使いやすい, グループ, スケジュール, ',
  },
  logo: {
    main: '/logo/favicon.svg', // メインロゴ（すでに設定されているパス）
    icon: '/logo/favicon.ico', // アイコン（ファビコン）
    svg: '/logo/favicon.svg', // SVGロゴ（ヘッダーで使用）
    alt: '複数日程調整アプリ',
  },
  copyright: {
    year: new Date().getFullYear(),
    holder: 'DaySynth',
  },
  url: 'https://schedule.k-tkms.com/',
  ogImage: '/logo/web-app-manifest-512x512.png',
  illustrations: {
    hero: '/logo/web-app-manifest-512x512.png',
  },
};

export default siteConfig;
