'use client';

import Link from 'next/link';

interface FinalizeEventSectionProps {
  publicToken: string;
  eventDates: {
    id: string;
    start_time: string;
    end_time: string;
    label?: string;
  }[];
  availabilities: {
    participant_id: string;
    event_date_id: string;
    availability: boolean;
  }[];
  finalizedDateIds?: string[];
}

export default function FinalizeEventSection({
  publicToken,
  eventDates,
  availabilities,
  finalizedDateIds = [],
}: FinalizeEventSectionProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const finalizedDates = finalizedDateIds
    .map((dateId) => eventDates.find((date) => date.id === dateId))
    .filter((date): date is NonNullable<typeof date> => Boolean(date));

  const availableCounts = finalizedDateIds.map((dateId) =>
    availabilities.filter((availability) => {
      return availability.event_date_id === dateId && availability.availability;
    }).length,
  );

  const candidateAvailabilityCounts = eventDates.map((date) =>
    availabilities.filter((availability) => {
      return availability.event_date_id === date.id && availability.availability;
    }).length,
  );
  const maxAvailableCount = candidateAvailabilityCounts.reduce((max, count) => Math.max(max, count), 0);
  const peakCandidateCount = candidateAvailabilityCounts.filter(
    (count) => count === maxAvailableCount,
  ).length;

  const totalAvailable = availableCounts.reduce((sum, count) => sum + count, 0);
  const averageAvailable =
    availableCounts.length > 0 ? Math.round(totalAvailable / availableCounts.length) : 0;

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-bold">日程の確定</h3>
          <p className="text-sm text-base-content/65">
            {finalizedDateIds.length > 0 ? `${finalizedDateIds.length}件を確定中` : '未確定'}
          </p>
        </div>
        <Link href={`/event/${publicToken}/finalize`} className="btn btn-primary w-full sm:w-auto">
          {finalizedDateIds.length > 0 ? '確定内容を変更する' : '日程を確定する'}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-base-300 bg-base-200/60 px-4 py-3">
          <p className="text-xs text-base-content/60">候補</p>
          <p className="mt-1 text-lg font-bold">{peakCandidateCount}件</p>
        </div>
        <div className="rounded-2xl border border-base-300 bg-base-200/60 px-4 py-3">
          <p className="text-xs text-base-content/60">平均参加可能</p>
          <p className="mt-1 text-lg font-bold">{finalizedDateIds.length > 0 ? `${averageAvailable}人` : '-'}</p>
        </div>
      </div>

      {finalizedDates.length > 0 && (
        <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
          <p className="text-sm font-semibold">確定済みの日程</p>
          <ul className="mt-3 space-y-2 text-sm">
            {finalizedDates.map((date) => (
              <li key={date.id} className="rounded-xl bg-base-200/60 px-3 py-2">
                {formatDate(date.start_time)} {formatTime(date.start_time)}〜{formatTime(date.end_time)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
