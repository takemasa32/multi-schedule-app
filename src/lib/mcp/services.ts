import 'server-only';
import { authPool } from '@/lib/auth';
import { createSupabaseAdmin } from '@/lib/supabase';
import {
  applyUserAvailabilitySyncForEvent,
  fetchUserAvailabilitySyncPreviewResult,
  saveUserScheduleBlockChanges,
} from '@/lib/schedule-service';
import {
  answerInput,
  proposedScheduleBlocks,
  scheduleInput,
  type AnswerInput,
  type ScheduleInput,
} from './schemas';

export class McpInputError extends Error {}

export async function readEvent(publicToken: string) {
  const supabase = createSupabaseAdmin();
  const { data: event, error } = await supabase
    .from('events')
    .select('id,title,description,public_token,is_finalized')
    .eq('public_token', publicToken)
    .maybeSingle();
  if (error) throw new Error('イベントを取得できませんでした');
  if (!event) throw new McpInputError('イベントが見つかりません');
  const dates = [];
  for (let from = 0; ; from += 1000) {
    const page = await supabase
      .from('event_dates')
      .select('id,start_time,end_time')
      .eq('event_id', event.id)
      .order('start_time')
      .order('id')
      .range(from, from + 999);
    if (page.error) throw new Error('候補日時を取得できませんでした');
    dates.push(...(page.data ?? []));
    if (!page.data || page.data.length < 1000) break;
  }
  return { ...event, dates, time_zone: 'Asia/Tokyo' };
}

export async function readMyAnswer(userId: string, publicToken: string) {
  const event = await readEvent(publicToken);
  const supabase = createSupabaseAdmin();
  const { data: link, error } = await supabase
    .from('user_event_links')
    .select('participant_id')
    .eq('user_id', userId)
    .eq('event_id', event.id)
    .maybeSingle();
  if (error) throw new Error('回答の紐づきを取得できませんでした');
  if (!link?.participant_id) return { answer: null };
  const participant = await supabase
    .from('participants')
    .select('name,comment')
    .eq('id', link.participant_id)
    .eq('event_id', event.id)
    .maybeSingle();
  if (participant.error || !participant.data) throw new Error('回答を取得できませんでした');
  const selected = new Map<string, boolean>();
  for (let from = 0; ; from += 1000) {
    const page = await supabase
      .from('availabilities')
      .select('event_date_id,availability')
      .eq('participant_id', link.participant_id)
      .order('event_date_id')
      .range(from, from + 999);
    if (page.error) throw new Error('回答を取得できませんでした');
    for (const row of page.data ?? []) selected.set(row.event_date_id, row.availability);
    if (!page.data || page.data.length < 1000) break;
  }
  return {
    answer: {
      ...participant.data,
      availabilities: event.dates.map((date) => ({
        event_date_id: date.id,
        availability: selected.get(date.id) ?? false,
      })),
    },
  };
}

/** 本人の紐づきをロックし、名前検索をせずに回答と紐づきを原子的に保存する。 */
export async function saveMyAnswer(userId: string, rawInput: AnswerInput) {
  const input = answerInput.parse(rawInput);
  const db = await authPool.connect();
  try {
    await db.query('BEGIN');
    const eventResult = await db.query<{ id: string }>(
      'SELECT id FROM public.events WHERE public_token = $1 FOR SHARE',
      [input.public_token],
    );
    const eventId = eventResult.rows[0]?.id;
    if (!eventId) throw new McpInputError('イベントが見つかりません');
    // 未紐づけの初回回答も同一アカウントから同時に作成しない。
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
      `mcp-answer:${userId}:${eventId}`,
    ]);
    const dates = await db.query<{ id: string }>(
      'SELECT id FROM public.event_dates WHERE event_id = $1 FOR SHARE',
      [eventId],
    );
    const validIds = new Set(dates.rows.map((row) => row.id));
    if (input.availabilities.some((row) => !validIds.has(row.event_date_id)))
      throw new McpInputError('対象イベント以外の候補日時は指定できません');
    const link = await db.query<{ participant_id: string | null }>(
      'SELECT participant_id FROM public.user_event_links WHERE user_id = $1 AND event_id = $2 FOR UPDATE',
      [userId, eventId],
    );
    let participantId = link.rows[0]?.participant_id;
    let created = false;
    if (!participantId) {
      const participant = await db.query<{ id: string }>(
        `INSERT INTO public.participants (event_id, name, comment, response_token) VALUES ($1,$2,$3,pg_catalog.gen_random_uuid()) RETURNING id`,
        [eventId, input.name, input.comment ?? null],
      );
      participantId = participant.rows[0].id;
      if (link.rows.length) {
        await db.query(
          'UPDATE public.user_event_links SET participant_id = $3, updated_at = now() WHERE user_id = $1 AND event_id = $2',
          [userId, eventId, participantId],
        );
      } else {
        await db.query(
          'INSERT INTO public.user_event_links (user_id,event_id,participant_id) VALUES ($1,$2,$3)',
          [userId, eventId, participantId],
        );
      }
      created = true;
    } else {
      const updated = await db.query(
        'UPDATE public.participants SET name = $3, comment = coalesce($4, comment) WHERE id = $1 AND event_id = $2 RETURNING id',
        [participantId, eventId, input.name, input.comment],
      );
      if (!updated.rowCount) throw new McpInputError('回答の紐づきを確認できません');
      if (input.comment === null)
        await db.query('UPDATE public.participants SET comment = NULL WHERE id = $1', [
          participantId,
        ]);
    }
    // 指定された枠だけを更新する。未指定の回答・手動上書きは保持する。
    const previous = await db.query<{ event_date_id: string; availability: boolean }>(
      'SELECT event_date_id, availability FROM public.availabilities WHERE participant_id = $1',
      [participantId],
    );
    const answers = new Map(previous.rows.map((row) => [row.event_date_id, row.availability]));
    for (const row of input.availabilities) answers.set(row.event_date_id, row.availability);
    // Webと同じく参加可能だけを保存し、レコードのない枠は参加不可として扱う。
    const payload = [...answers]
      .filter(([, availability]) => availability)
      .map(([event_date_id]) => ({ event_date_id, availability: true }));
    await db.query('SELECT public.update_participant_availability($1::uuid, $2::uuid, $3::jsonb)', [
      participantId,
      eventId,
      JSON.stringify(payload),
    ]);
    await db.query(
      `INSERT INTO public.user_event_availability_overrides (user_id,event_id,event_date_id,availability,reason)
      SELECT $1,$2,x.event_date_id,x.availability,'conflict_override' FROM jsonb_to_recordset($3::jsonb) AS x(event_date_id uuid, availability boolean)
      ON CONFLICT (user_id,event_id,event_date_id) DO UPDATE SET availability = EXCLUDED.availability, updated_at = now()`,
      [userId, eventId, JSON.stringify(input.availabilities)],
    );
    await db.query('UPDATE public.events SET last_accessed_at = now() WHERE id = $1', [eventId]);
    await db.query('COMMIT');
    return { success: true, created, changed_slots: input.availabilities.length };
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    db.release();
  }
}

export async function previewMyScheduleUpdate(userId: string, rawInput: ScheduleInput) {
  const input = scheduleInput.parse(rawInput);
  const result = await fetchUserAvailabilitySyncPreviewResult(userId, {
    proposedBlocks: proposedScheduleBlocks(input),
    strict: true,
  });
  if (!result.success) throw new McpInputError(result.message);
  return {
    events: result.events.map((event) => ({
      public_token: event.publicToken,
      title: event.title,
      skipped: event.isFinalized && !input.allow_finalized,
      changed_slots: event.changes.total - event.changes.protected,
      protected_slots: event.changes.protected,
    })),
  };
}

/** 予定保存後に再計算し、各イベントの成功・失敗を分けて返す。再実行しても予定は増殖しない。 */
export async function updateMySchedule(userId: string, rawInput: ScheduleInput) {
  const input = scheduleInput.parse(rawInput);
  // 不完全な取得結果で保存を始めない。
  await previewMyScheduleUpdate(userId, input);
  const saved = await saveUserScheduleBlockChanges(userId, {
    upserts: [
      { startTime: input.start_time, endTime: input.end_time, availability: input.availability },
    ],
    deleteIds: [],
  });
  if (!saved.success) throw new McpInputError(saved.message ?? '予定を保存できませんでした');
  const events: Array<{
    public_token: string;
    status: 'updated' | 'skipped' | 'failed';
    changed_slots: number;
  }> = [];
  try {
    const preview = await fetchUserAvailabilitySyncPreviewResult(userId, { strict: true });
    if (!preview.success) throw new Error();
    for (const event of preview.events) {
      if (event.isFinalized && !input.allow_finalized) {
        events.push({ public_token: event.publicToken, status: 'skipped', changed_slots: 0 });
        continue;
      }
      try {
        const applied = await applyUserAvailabilitySyncForEvent(userId, {
          eventId: event.eventId,
          overwriteProtected: false,
          allowFinalized: input.allow_finalized,
          strict: true,
        });
        events.push({
          public_token: event.publicToken,
          status: applied.success ? 'updated' : 'failed',
          changed_slots: applied.updatedCount,
        });
      } catch {
        events.push({ public_token: event.publicToken, status: 'failed', changed_slots: 0 });
      }
    }
    return {
      schedule_saved: true,
      sync_complete: events.every((event) => event.status !== 'failed'),
      events,
    };
  } catch {
    return {
      schedule_saved: true,
      sync_complete: false,
      events,
      message:
        '予定は保存しましたが、回答への反映を完了できませんでした。同じ予定更新を再実行すると反映を再試行できます。',
    };
  }
}
