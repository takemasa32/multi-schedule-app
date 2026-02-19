'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  fetchUnlinkedAnswerCandidates,
  linkMyParticipantAnswerById,
  type UnlinkedAnswerCandidate,
} from '@/lib/actions';

const formatLastAccessed = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function AccountAnswerLinker() {
  const [candidates, setCandidates] = useState<UnlinkedAnswerCandidate[]>([]);
  const [selectedParticipantMap, setSelectedParticipantMap] = useState<Record<string, string>>({});
  const [messageMap, setMessageMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [linkingEventId, setLinkingEventId] = useState<string | null>(null);

  const loadCandidates = useCallback(async () => {
    setIsLoading(true);
    const data = await fetchUnlinkedAnswerCandidates();
    setCandidates(data);
    setSelectedParticipantMap(
      Object.fromEntries(data.map((row) => [row.eventId, row.participants[0]?.id ?? ''])),
    );
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadCandidates();
    const handleHistorySynced = () => {
      void loadCandidates();
    };
    window.addEventListener('event-history-synced', handleHistorySynced);
    return () => {
      window.removeEventListener('event-history-synced', handleHistorySynced);
    };
  }, [loadCandidates]);

  const hasCandidates = useMemo(() => candidates.length > 0, [candidates.length]);

  if (!hasCandidates) {
    return null;
  }

  return (
    <section
      className="mb-8"
      data-testid="account-answer-linker"
      data-tour-id="account-answer-linker"
    >
      <h2 className="mb-2 text-lg font-semibold">未ログイン回答の紐づけ</h2>
      <p className="mb-3 text-sm text-gray-500">
        未ログイン時に閲覧・回答したイベントを、アカウントへ紐づけできます。
      </p>

      <div className="mb-3 flex justify-end">
        <button
          type="button"
          className="btn btn-sm btn-outline"
          onClick={() => void loadCandidates()}
          disabled={isLoading}
          data-testid="answer-linker-refresh"
        >
          {isLoading ? '読み込み中...' : '候補を更新'}
        </button>
      </div>

      <div className="space-y-3">
        {candidates.map((candidate) => {
          const selectedId = selectedParticipantMap[candidate.eventId] ?? '';
          const isLinking = linkingEventId === candidate.eventId;
          return (
            <div
              key={candidate.eventId}
              className="bg-base-100 rounded-lg border p-4"
              data-testid={`answer-linker-candidate-${candidate.eventId}`}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{candidate.title}</p>
                  <p className="text-xs text-gray-500">
                    最終閲覧: {formatLastAccessed(candidate.lastAccessedAt)}
                  </p>
                </div>
                <Link
                  href={`/event/${candidate.publicToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-xs btn-outline"
                >
                  イベントを開く
                </Link>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  className="select select-bordered select-sm w-full sm:max-w-xs"
                  value={selectedId}
                  data-testid={`answer-linker-select-${candidate.eventId}`}
                  onChange={(e) =>
                    setSelectedParticipantMap((prev) => ({
                      ...prev,
                      [candidate.eventId]: e.target.value,
                    }))
                  }
                >
                  {candidate.participants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.name}（回答: {formatLastAccessed(participant.createdAt)}）
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  disabled={!selectedId || isLinking}
                  data-testid={`answer-linker-link-${candidate.eventId}`}
                  onClick={async () => {
                    if (!selectedId) return;
                    setLinkingEventId(candidate.eventId);
                    const result = await linkMyParticipantAnswerById({
                      eventId: candidate.eventId,
                      participantId: selectedId,
                    });
                    setLinkingEventId(null);
                    setMessageMap((prev) => ({
                      ...prev,
                      [candidate.eventId]: result.message,
                    }));
                    if (result.success) {
                      await loadCandidates();
                    }
                  }}
                >
                  {isLinking ? '紐づけ中...' : 'この回答を紐づける'}
                </button>
              </div>

              {messageMap[candidate.eventId] && (
                <p className="mt-2 text-xs text-gray-600">{messageMap[candidate.eventId]}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
