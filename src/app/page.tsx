import HeroSection from "@/components/landing/hero-section";
import LandingPageClient from "@/components/landing/landing-page-client";
import siteConfig from "@/lib/site-config";

export const dynamic = "force-static";
export const revalidate = 86400;

export const metadata = {
  title: "日程調整 DaySynth｜最適日がすぐに見つかる・ログイン不要・無料",
  description:
    "バンド練習や会議、ゲームイベントなど複数候補から最適な日程をすぐに決定。ログイン不要・無料・広告なしのシンプルな日程調整アプリ。スマホ・PC両対応。",
  openGraph: {
    title:
      "日程調整アプリ DaySynth｜最適日がすぐに見つかる・ログイン不要・無料",
    description:
      "バンド練習や会議、ゲームイベントなど複数候補から最適な日程をすぐに決定。ログイン不要・無料・広告なしのシンプルな日程調整アプリ。スマホ・PC両対応。",
    url: siteConfig.url,
    images: [
      {
        url: "/api/og?type=home",
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
  return (
    <>
      <HeroSection />
      <LandingPageClient />
    </>
  );
}
