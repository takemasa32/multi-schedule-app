import HeroSection from '@/components/landing/hero-section';
import LandingPage from '@/components/landing/landing-page';
import siteConfig from '@/lib/site-config';

export const metadata = {
  title: siteConfig.share.homeTitle,
  description: siteConfig.share.homeDescription,
  openGraph: {
    title: siteConfig.share.homeTitle,
    description: siteConfig.share.homeDescription,
    url: siteConfig.url,
    images: [
      {
        url: '/api/og?type=home',
        width: 1200,
        height: 630,
      },
    ],
  },
};

/**
 * ランディングページ
 * - サーバーコンポーネントとして実装
 * - metadataを設定し、静的なLP本文はサーバーコンポーネントで描画する
 */
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <LandingPage />
    </>
  );
}
