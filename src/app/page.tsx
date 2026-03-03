import type { Metadata } from 'next';
import LandingPageClient from '@/components/landing/landing-page-client';
import siteConfig from '@/lib/site-config';

export const metadata: Metadata = {
  title: '日程調整 DaySynth｜最適日がすぐに見つかる・ログイン不要・無料',
  description:
    '候補日の作成から回答集計、日程確定までを最短導線で完了。DaySynthはログイン不要・無料・スマホ最適化の日程調整サービスです。',
  openGraph: {
    title: '日程調整アプリ DaySynth｜最短で決まる日程調整',
    description:
      '会議・練習・イベントの日程調整をシンプルに。ヒートマップで最適日を見つけて、確定後の共有までスムーズに進められます。',
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
 * ランディングページ。
 * メタ情報はサーバーで保持し、視覚演出はクライアントに分離する。
 */
export default function LandingPage() {
  return <LandingPageClient />;
}
