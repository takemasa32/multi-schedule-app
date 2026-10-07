import 'server-only';
import type { PoolClient } from 'pg';
import {
  computeAutoFillAvailability,
  isRangeOverlapping,
  toComparableDate,
  toWallClockUtcIso,
  type ScheduleBlock,
} from '@/lib/schedule-utils';

export type AnswerDate = { id: string; start_time: string; end_time: string };

/** 対象期間の本人予定と確定日時だけを取得する。取得失敗を予定なしと扱わない。 */
export async function loadAnswerSchedule(
  db: PoolClient,
  userId: string,
  eventId: string,
  dates: AnswerDate[],
) {
  if (!dates.length)
    return {
      blocks: [] as ScheduleBlock[],
      busy: [] as Array<{ start_time: string; end_time: string }>,
    };
  const starts = dates.map((date) => date.start_time).sort();
  const ends = dates.map((date) => date.end_time).sort();
  const params = [userId, toWallClockUtcIso(starts[0]), toWallClockUtcIso(ends[ends.length - 1])];
  const blocks = await db.query<ScheduleBlock>(
    `SELECT (start_time AT TIME ZONE 'UTC')::text AS start_time,
     (end_time AT TIME ZONE 'UTC')::text AS end_time, availability FROM public.user_schedule_blocks
     WHERE user_id = $1 AND start_time < $3::timestamptz AND end_time > $2::timestamptz
     ORDER BY start_time, end_time, id FOR UPDATE`,
    params,
  );
  const busy = await db.query<{ start_time: string; end_time: string }>(
    `SELECT d.start_time::text, d.end_time::text FROM public.finalized_dates f
     JOIN public.event_dates d ON d.id = f.event_date_id
     JOIN public.user_event_links l ON l.event_id = f.event_id AND l.user_id = $1
     WHERE f.event_id <> $4 AND d.start_time < $3::timestamp AND d.end_time > $2::timestamp
     ORDER BY d.start_time, d.end_time, d.id`,
    [...params, eventId],
  );
  return { blocks: blocks.rows, busy: busy.rows };
}

/** Web版と同じく、不可の重複を優先し、可の完全な被覆だけを参加可能とする。 */
export function answerScheduleAvailability(
  date: AnswerDate,
  context: Awaited<ReturnType<typeof loadAnswerSchedule>>,
) {
  const range = { start: toComparableDate(date.start_time), end: toComparableDate(date.end_time) };
  if (
    context.busy.some((busy) =>
      isRangeOverlapping(range, {
        start: toComparableDate(busy.start_time),
        end: toComparableDate(busy.end_time),
      }),
    )
  )
    return false;
  return computeAutoFillAvailability({
    start: date.start_time,
    end: date.end_time,
    blocks: context.blocks,
  });
}
