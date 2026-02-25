'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  linkMyParticipantAnswerById,
  unlinkMyParticipantAnswerByEventPublicToken,
} from '@/lib/actions';
import { getEventHistory, setEventHistory } from '@/lib/utils';

type EventAnswerLinkEditorProps = {
  eventId: string;
  eventPublicToken: string;
  participants: { id: string; name: string }[];
  linkedParticipantId: string | null;
  onLinkedParticipantIdChange: (participantId: string | null) => void;
};

export default function EventAnswerLinkEditor({
  eventId,
  eventPublicToken,
  participants,
  linkedParticipantId,
  onLinkedParticipantIdChange,
}: EventAnswerLinkEditorProps) {
  const { status } = useSession();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedParticipantId, setSelectedParticipantId] = useState('');

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

  return (
    <div className="bg-base-200 mb-4 rounded-lg p-3" data-testid="event-answer-link-editor">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">このイベントの回答紐づき</p>
        <button
          type="button"
          className="btn btn-xs btn-outline"
          data-testid="event-answer-link-edit-toggle"
          onClick={() => {
            setIsEditMode((prev) => !prev);
            setMessage('');
          }}
        >
          {isEditMode ? '編集を終了' : '回答紐づきを編集'}
        </button>
      </div>

      <p className="text-xs text-gray-500">
        {linkedParticipant
          ? `現在は「${linkedParticipant.name}」の回答がアカウントに紐づいています。`
          : '未ログイン時の回答を、このアカウントへ紐づけできます。'}
      </p>

      {isEditMode && (
        <div className="mt-3">
          {linkedParticipant ? (
            <button
              type="button"
              className="btn btn-sm btn-warning"
              data-testid="event-answer-link-unlink"
              disabled={isSubmitting}
              onClick={async () => {
                if (!window.confirm('このイベントの回答紐づきを解除しますか？')) return;
                setIsSubmitting(true);
                const result = await unlinkMyParticipantAnswerByEventPublicToken(eventPublicToken);
                setIsSubmitting(false);
                setMessage(result.message);
                if (!result.success) return;
                onLinkedParticipantIdChange(null);
                updateHistoryAnsweredState(false);
              }}
            >
              {isSubmitting ? '解除中...' : '紐づきを解除'}
            </button>
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
                onClick={async () => {
                  setIsSubmitting(true);
                  let result = await linkMyParticipantAnswerById({
                    eventId,
                    participantId: selectedParticipantId,
                  });
                  if (result.requiresConfirmation) {
                    const confirmed = window.confirm(
                      `${result.message}\n\n紐づけを続ける場合は「OK」を押してください。`,
                    );
                    if (confirmed) {
                      result = await linkMyParticipantAnswerById({
                        eventId,
                        participantId: selectedParticipantId,
                        confirmNameMismatch: true,
                      });
                    } else {
                      result = { success: false, message: '紐づけをキャンセルしました' };
                    }
                  }
                  setIsSubmitting(false);
                  setMessage(result.message);
                  if (!result.success) return;
                  onLinkedParticipantIdChange(selectedParticipantId);
                  updateHistoryAnsweredState(true);
                }}
              >
                {isSubmitting ? '紐づけ中...' : 'この回答を紐づける'}
              </button>
            </div>
          )}
        </div>
      )}

      {message && <p className="mt-2 text-xs text-gray-600">{message}</p>}
    </div>
  );
}
