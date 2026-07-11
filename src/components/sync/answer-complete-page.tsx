'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { saveParticipantAnswerAsUserSchedule } from '@/lib/schedule-actions';

type AnswerCompletePageProps = {
  eventId: string;
  publicToken: string;
  participantId: string | null;
  isAuthenticated: boolean;
  syncWarning?: 'partial' | null;
};

type SaveState = 'idle' | 'saved-no-preview' | 'saved-with-preview' | 'error';

export default function AnswerCompletePage({
  eventId,
  publicToken,
  participantId,
  isAuthenticated,
  syncWarning = null,
}: AnswerCompletePageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const eventPath = `/event/${publicToken}${syncWarning === 'partial' ? '?sync_warning=partial' : ''}`;
  const syncReviewPath = `/event/${publicToken}/input/sync-review${
    syncWarning === 'partial' ? '?sync_warning=partial' : ''
  }`;
  const canSaveSchedule = isAuthenticated && Boolean(participantId);

  useEffect(() => {
    if (saveState !== 'saved-no-preview') return;
    const timerId = window.setTimeout(() => {
      router.replace(eventPath);
    }, 1200);
    return () => window.clearTimeout(timerId);
  }, [eventPath, router, saveState]);

  const handleSaveSchedule = () => {
    if (!participantId) return;
    setMessage(null);
    startTransition(async () => {
      const result = await saveParticipantAnswerAsUserSchedule({
        eventId,
        participantId,
      });
      setMessage(result.message);
      if (!result.success) {
        setSaveState('error');
        return;
      }
      setSaveState(result.previewCount > 0 ? 'saved-with-preview' : 'saved-no-preview');
    });
  };

  return (
    <div className="app-page-narrow max-w-2xl py-8" data-testid="answer-complete-page">
      <div className="surface p-5 sm:p-7">
        <div className="mb-5">
          <p className="page-eyebrow text-success">COMPLETE</p>
          <h1 className="page-title">回答ありがとうございます</h1>
        </div>

        {syncWarning === 'partial' && (
          <div className="alert alert-warning mb-4 text-sm">
            <span>
              回答は保存されましたが、一部の同期処理に失敗しました。時間をおいて再度お試しください。
            </span>
          </div>
        )}

        {!canSaveSchedule ? (
          <div className="space-y-4">
            <p className="text-base-content/70 text-sm">
              ログインすると、回答をアカウントに保存して次回以降の入力に利用できます。
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Link href={eventPath} className="btn btn-primary">
                イベント結果を見る
              </Link>
            </div>
          </div>
        ) : saveState === 'idle' || saveState === 'error' ? (
          <div className="space-y-4">
            <p className="text-base-content/80 text-sm">この回答をアカウントに保存しますか？</p>
            {message && (
              <p className={saveState === 'error' ? 'text-error text-sm' : 'text-info text-sm'}>
                {message}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Link href={eventPath} className="btn btn-outline" data-testid="complete-skip-save">
                保存しない
              </Link>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveSchedule}
                disabled={isPending}
                data-testid="complete-save-schedule"
              >
                {isPending ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        ) : saveState === 'saved-with-preview' ? (
          <div className="space-y-4">
            <p className="text-base-content/80 text-sm">他の回答済みイベントにも反映しますか？</p>
            {message && <p className="text-info text-sm">{message}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <Link href={eventPath} className="btn btn-outline" data-testid="complete-skip-sync">
                反映しない
              </Link>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => router.push(syncReviewPath)}
                data-testid="complete-open-sync-review"
              >
                反映する
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-base-content/80 text-sm">
              他イベントへの反映は不要でした。イベント結果ページへ移動しています。
            </p>
            {message && <p className="text-info text-sm">{message}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
