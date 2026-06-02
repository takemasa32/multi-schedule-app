import { redirect } from 'next/navigation';
import { getEvent, touchEventLastAccessedIfStale } from '@/lib/actions';
import { getAuthSession } from '@/lib/auth';
import AnswerCompletePage from '@/components/sync/answer-complete-page';

type AnswerCompleteRouteProps = {
  params: Promise<{ public_id: string }>;
  searchParams: Promise<{ participant_id?: string; sync_warning?: string }>;
};

export default async function AnswerCompleteRoutePage({
  params,
  searchParams,
}: AnswerCompleteRouteProps) {
  const { public_id: publicId } = await params;
  const { participant_id: participantId = null, sync_warning: syncWarning } = await searchParams;
  const session = await getAuthSession();

  try {
    const event = await getEvent(publicId);
    await touchEventLastAccessedIfStale(publicId);

    return (
      <AnswerCompletePage
        eventId={event.id}
        publicToken={publicId}
        participantId={participantId}
        isAuthenticated={Boolean(session?.user?.id)}
        syncWarning={syncWarning === 'partial' ? 'partial' : null}
      />
    );
  } catch (error) {
    console.error('回答完了ページの初期化エラー:', error);
    redirect(`/event/${publicId}`);
  }
}
