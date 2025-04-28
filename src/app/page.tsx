import LandingPageClient from "@/components/landing/landing-page-client";
import siteConfig from "@/lib/site-config";

export const metadata = {
  title: "日程調整アプリ",
  description:
    "複数の日程から最適な予定を見つける、シンプルで使いやすい日程調整アプリです。",
  openGraph: {
    title: "日程調整アプリ",
    description:
      "複数の日程から最適な予定を見つける、シンプルで使いやすい日程調整アプリです。",
    url: siteConfig.url,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
      },
    ],
  },
};

/**
 * ランディングページ
 * - サーバーコンポーネントとして実装
 * - metadataを設定し、クライアントコンポーネントのLandingPageClientを呼び出す
 */
export default function LandingPage() {
  return <LandingPageClient />;
}
