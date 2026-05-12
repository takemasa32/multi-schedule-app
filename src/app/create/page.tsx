import EventForm from '@/components/event-form';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
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
    <>
      <div className="mb-6 border-b border-base-300 bg-base-200/50 py-4">
        <div className="container mx-auto max-w-5xl px-4">
          <Breadcrumbs items={[{ label: 'イベント作成' }]} />
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 pb-12">
        <div className="fade-in mb-8">
          <h1 className="mb-3 text-3xl font-semibold leading-tight sm:text-4xl">新規イベント作成</h1>
          <p className="max-w-2xl leading-7 text-base-content/70">
            候補日程を設定すると、参加者へ送れる共有リンクが発行されます。
            まずはイベント名から入力してください。
          </p>
        </div>

        <Card className="fade-in animate-delay-100 border-base-300">
          <EventForm />
        </Card>
      </div>
    </>
  );
}
