'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  linkMyParticipantAnswerById,
  unlinkMyParticipantAnswerByEventPublicToken,
} from '@/lib/actions';
import { getEventHistory, setEventHistory } from '@/lib/utils';
import ConfirmationModal from '@/components/common/confirmation-modal';

type EventAnswerLinkEditorProps = {
  eventId: string;
  eventPublicToken: string;
  participants: { id: string; name: string }[];
  linkedParticipantId: string | null;
  onLinkedParticipantIdChange: (participantId: string | null) => void;
};

type ConfirmState =
  | {
      type: 'unlink';
    }
  | {
      type: 'link-name-mismatch';
      message: string;
      participantId: string;
    };

export default function EventAnswerLinkEditor({
  eventId,
  eventPublicToken,
  participants,
  linkedParticipantId,
  onLinkedParticipantIdChange,
}: EventAnswerLinkEditorProps) {
  const { status } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  useEffect(() => {
    setSelectedParticipantId(linkedParticipantId ?? participants[0]?.id ?? '');
  }, [linkedParticipantId, participants]);

  const linkedParticipant = useMemo(
    () => participants.find((participant) => participant.id === linkedParticipantId) ?? null,
    [linkedParticipantId, participants],
  );

  // 回答者の編集導線はログイン時のみ表示する。
  if (status !== 'authenticated') {
    return null;
  }

  if (participants.length === 0) {
    return null;
  }

  const updateHistoryAnsweredState = (answeredByMe: boolean) => {
    const history = getEventHistory();
    const nextHistory = history.map((item) =>
      item.id === eventPublicToken
        ? {
            ...item,
            answeredByMe,
            myParticipantName: answeredByMe ? item.myParticipantName : null,
          }
        : item,
    );
    setEventHistory(nextHistory);
  };

  const handleUnlink = async () => {
    setIsSubmitting(true);
    const result = await unlinkMyParticipantAnswerByEventPublicToken(eventPublicToken);
    setIsSubmitting(false);
    setConfirmState(null);
    setMessage(result.message);
    if (!result.success) return;
    onLinkedParticipantIdChange(null);
    updateHistoryAnsweredState(false);
  };

  const handleLink = async (confirmNameMismatch = false, participantId = selectedParticipantId) => {
    setIsSubmitting(true);
    const result = await linkMyParticipantAnswerById({
      eventId,
      participantId,
      confirmNameMismatch,
    });
    setIsSubmitting(false);
    if (result.requiresConfirmation) {
      setConfirmState({
        type: 'link-name-mismatch',
        message: result.message,
        participantId,
      });
      return;
    }

    setConfirmState(null);
    setMessage(result.message);
    if (!result.success) return;
    onLinkedParticipantIdChange(participantId);
    updateHistoryAnsweredState(true);
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-xs btn-outline"
        data-testid="event-answer-link-open"
        onClick={() => {
          setMessage('');
          setIsDialogOpen(true);
        }}
      >
        回答紐づきを編集
      </button>

      {isDialogOpen && (
        <div className="modal modal-open" role="dialog" aria-modal="true">
          <div className="modal-box">
            <h4 className="text-base font-semibold">このイベントの回答紐づき編集</h4>
            <p className="mt-1 text-sm text-base-content/60">
              {linkedParticipant
                ? `現在は「${linkedParticipant.name}」の回答が紐づいています。`
                : '現在は未紐づけです。紐づける回答を選択してください。'}
            </p>

            <div className="mt-4">
              {linkedParticipant ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-warning"
                    data-testid="event-answer-link-unlink"
                    disabled={isSubmitting}
                    onClick={() => setConfirmState({ type: 'unlink' })}
                  >
                    {isSubmitting ? '解除中...' : '紐づきを解除'}
                  </button>
                  <p className="text-xs text-base-content/60">この操作で回答データは削除されません。</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    className="select select-bordered select-sm w-full sm:max-w-xs"
                    data-testid="event-answer-link-select"
                    value={selectedParticipantId}
                    onChange={(event) => setSelectedParticipantId(event.target.value)}
                  >
                    {participants.map((participant) => (
                      <option key={participant.id} value={participant.id}>
                        {participant.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    data-testid="event-answer-link-link"
                    disabled={!selectedParticipantId || isSubmitting}
                    onClick={() => void handleLink()}
                  >
                    {isSubmitting ? '紐づけ中...' : 'この回答を紐づける'}
                  </button>
                </div>
              )}
            </div>

            {message && <p className="mt-3 text-xs text-base-content/70">{message}</p>}

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-sm"
                data-testid="event-answer-link-close"
                onClick={() => setIsDialogOpen(false)}
              >
                閉じる
              </button>
            </div>
          </div>
          <button
            type="button"
            aria-label="モーダルを閉じる"
            className="modal-backdrop"
            onClick={() => setIsDialogOpen(false)}
          />
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmState?.type === 'unlink'}
        title="回答紐づきを解除"
        description="このイベントの回答紐づきを解除します。回答データそのものは削除されません。"
        confirmLabel="解除する"
        confirmButtonClassName="btn-warning"
        isConfirming={isSubmitting && confirmState?.type === 'unlink'}
        confirmingLabel="解除中..."
        onConfirm={() => void handleUnlink()}
        onCancel={() => {
          if (isSubmitting) return;
          setConfirmState(null);
        }}
      />

      <ConfirmationModal
        isOpen={confirmState?.type === 'link-name-mismatch'}
        title="別名の回答を紐づけますか？"
        description={
          confirmState?.type === 'link-name-mismatch'
            ? `${confirmState.message} 問題なければこのまま紐づけを続けてください。`
            : undefined
        }
        confirmLabel="紐づけを続ける"
        confirmButtonClassName="btn-primary"
        isConfirming={isSubmitting && confirmState?.type === 'link-name-mismatch'}
        confirmingLabel="紐づけ中..."
        onConfirm={() => {
          if (confirmState?.type !== 'link-name-mismatch') return;
          void handleLink(true, confirmState.participantId);
        }}
        onCancel={() => {
          if (isSubmitting) return;
          setConfirmState(null);
          setMessage('紐づけをキャンセルしました');
        }}
      />
    </>
  );
}
