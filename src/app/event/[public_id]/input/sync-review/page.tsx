import { redirect } from 'next/navigation';
import { getEvent } from '@/lib/actions';
import { getAuthSession } from '@/lib/auth';
import SyncReviewPage from '@/components/sync/sync-review-page';

type SyncReviewRouteProps = {
  params: Promise<{ public_id: string }>;
};

export default async function SyncReviewRoutePage({ params }: SyncReviewRouteProps) {
  const { public_id: publicId } = await params;
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect(`/event/${publicId}`);
  }

  try {
    const event = await getEvent(publicId);
    return <SyncReviewPage publicToken={publicId} currentEventId={event.id} />;
  } catch (error) {
    console.error('同期確認ページの初期化エラー:', error);
    redirect(`/event/${publicId}`);
  }
}
