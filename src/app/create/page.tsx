import EventForm from "@/components/event-form";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import Card from "@/components/layout/Card";
import siteConfig from "@/lib/site-config";
import { Metadata } from "next";

export const revalidate = 0;

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
      <div className="bg-base-200 mb-6 py-4">
        <div className="container mx-auto max-w-5xl px-4">
          <Breadcrumbs items={[{ label: "イベント作成" }]} />
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 pb-12">
        <div className="text-center mb-8 fade-in">
          <h1 className="text-4xl font-bold mb-3">新規イベント作成</h1>
          <p className="text-base-content/70 max-w-xl mx-auto">
            候補日程を複数選択して、参加者に共有する{siteConfig.name.full}
            を作成します。 作成後に共有用リンクが発行されます。
          </p>
        </div>

        <Card className="fade-in animate-delay-100">
          <EventForm />
        </Card>
      </div>
    </>
  );
}
