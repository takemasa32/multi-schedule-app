import EventForm from '@/components/event-form';
import Card from '@/components/layout/Card';
import siteConfig from '@/lib/site-config';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `イベント作成 | ${siteConfig.name.full}`,
  description: `複数の候補日程を設定して、参加者の都合を簡単に調整できるイベントを作成します。${siteConfig.name.full}で最適な日程を見つけましょう。`,
  openGraph: {
    title: `イベント作成 | ${siteConfig.name.full}`,
    description: `複数の候補日程を設定して、参加者の都合を簡単に調整できるイベントを作成します。${siteConfig.name.full}で最適な日程を見つけましょう。`,
    url: `${siteConfig.url}/create`,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function CreateEventPage() {
  return (
    <div className="app-page-narrow">
      <header className="page-header fade-in">
        <p className="page-eyebrow">EVENT SETUP</p>
        <h1 className="page-title">新しいイベントを作成</h1>
        <p className="page-description">
          候補日程を設定すると、参加者へ送れる共有リンクが発行されます。
          まずはイベント名から入力してください。
        </p>
      </header>

      <Card className="fade-in" noPadding>
        <EventForm />
      </Card>
    </div>
  );
}
