import { getEvent } from "@/lib/actions";
import { getEventDates } from "@/lib/actions";
import { getParticipants } from "@/lib/actions";
import { getAvailabilities } from "@/lib/actions";
import { getFinalizedDateIds } from "@/lib/actions";
import { notFound } from "next/navigation";
import EventClientWrapper from "@/components/event-client/event-client-wrapper";
import { EventHeader } from "@/components/event-header";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import SectionDivider from "@/components/layout/SectionDivider";
import siteConfig from "@/lib/site-config";
import { Metadata, ResolvingMetadata } from "next";

// Next.js 15.3.1でのParams型定義の変更に対応
interface EventPageProps {
  params: Promise<{
    public_id: string;
  }>;
  searchParams: Promise<{
    admin?: string;
  }>;
}

// 動的メタデータ生成関数
export async function generateMetadata(
  { params }: { params: { public_id: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  // イベント情報を取得
  const { public_id } = params;
  const event = await getEvent(public_id);

  if (!event) {
    return {
      title: `イベントが見つかりません | ${siteConfig.name.full}`,
      description: `お探しのイベントは存在しないか、削除された可能性があります。`,
    };
  }

  // イベントのタイトルを取得
  const eventTitle = event.title;
  const isFinalized = event.is_finalized;
  
  // 確定済みかどうかでタイトルと説明を変える
  const title = isFinalized 
    ? `${eventTitle} (日程確定済み) | ${siteConfig.name.full}` 
    : `${eventTitle} | ${siteConfig.name.full}`;
    
  const description = isFinalized
    ? `${eventTitle}の日程が確定しました。詳細を確認して予定に追加しましょう。`
    : `${eventTitle}の日程調整ページです。あなたの参加可能な日程を選択して回答してください。`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteConfig.url}/event/${public_id}`,
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function EventPage({
  params,
  searchParams,
}: EventPageProps) {
  // Next.js 15.3.1に対応するため、paramsとsearchParamsを非同期で取得
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const { public_id } = resolvedParams;
  const adminToken = resolvedSearchParams.admin || null;

  // イベント情報を取得
  const event = await getEvent(public_id);

  if (!event) {
    console.error("Event not found");
    notFound();
  }

  // 有効な管理者かチェック（必ずboolean型に変換）
  const isAdmin = Boolean(adminToken && adminToken === event.admin_token);

  // 参加者を取得（ページネーション対応）
  const participants = await getParticipants(event.id);

  // イベント日程の時間帯を取得（ページネーション対応）
  const eventDates = await getEventDates(event.id);

  // 全回答データを取得（ページネーション対応）
  const availabilities = await getAvailabilities(event.id);

  // 確定した日程IDのリストを取得（新しい確定日程テーブルから）
  let finalizedDateIds: string[] = [];
  if (event.is_finalized) {
    finalizedDateIds = await getFinalizedDateIds(event.id, event.final_date_id);
  }

  return (
    <>
      <div className="bg-base-200 mb-6 py-4">
        <div className="container mx-auto max-w-5xl px-4">
          <Breadcrumbs items={[{ label: "イベント詳細" }]} />
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 pb-12">
        <div className="fade-in">
          <EventHeader
            title={event.title}
            description={event.description}
            isFinalized={event.is_finalized}
            isAdmin={isAdmin}
          />

          <SectionDivider title="イベント情報" />

          {/* クライアントラッパーに全ての必要なデータを渡す */}
          <EventClientWrapper
            event={event}
            eventDates={eventDates || []}
            participants={participants || []}
            availabilities={availabilities || []}
            finalizedDateIds={finalizedDateIds}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </>
  );
}
