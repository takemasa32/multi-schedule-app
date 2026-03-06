'use server';

import { getAuthSession } from '@/lib/auth';
import { createSupabaseAdmin } from '@/lib/supabase';
import type { EventHistoryItem } from '@/lib/utils';
import { EVENT_HISTORY_SYNC_MAX_ITEMS } from '@/lib/utils';

type EventHistoryRow = {
  event_public_token: string;
  event_title: string;
  is_created_by_me: boolean;
  last_accessed_at: string;
};

type EventBasicRow = {
  id: string;
  public_token: string;
};

type UserEventLinkRow = {
  event_id: string;
  participant_id: string | null;
};

const isValidHistoryItem = (item: EventHistoryItem) =>
  Boolean(item?.id && item?.title && item?.createdAt);

const mapRowToItem = (row: EventHistoryRow): EventHistoryItem => ({
  id: row.event_public_token,
  title: row.event_title,
  createdAt: row.last_accessed_at,
  isCreatedByMe: row.is_created_by_me,
});

export async function fetchEventHistory(): Promise<EventHistoryItem[]> {
  const session = await getAuthSession();
  if (!session?.user?.id) return [];

  // 認証済みユーザーのみ履歴を返す
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from('event_access_histories')
    .select('event_public_token,event_title,is_created_by_me,last_accessed_at')
    .eq('user_id', session.user.id)
    .order('last_accessed_at', { ascending: false })
    .limit(EVENT_HISTORY_SYNC_MAX_ITEMS);

  if (error || !data) {
    console.error('イベント履歴の取得に失敗しました:', error);
    return [];
  }

  const baseItems = data.map((row) => mapRowToItem(row));
  const publicTokens = Array.from(new Set(baseItems.map((item) => item.id)));
  if (publicTokens.length === 0) {
    return baseItems;
  }

  const { data: eventsData } = await supabase
    .from('events')
    .select('id,public_token')
    .in('public_token', publicTokens);
  const events = (eventsData ?? []) as EventBasicRow[];
  const eventIdByToken = new Map(events.map((event) => [event.public_token, event.id]));

  const eventIds = events.map((event) => event.id);
  if (eventIds.length === 0) {
    return baseItems;
  }

  const { data: linksData } = await supabase
    .from('user_event_links')
    .select('event_id,participant_id')
    .eq('user_id', session.user.id)
    .in('event_id', eventIds);
  const links = (linksData ?? []) as UserEventLinkRow[];
  const participantIdByEventId = new Map<string, string | null>(
    links.map((link) => [link.event_id, link.participant_id]),
  );

  return baseItems.map((item) => {
    const eventId = eventIdByToken.get(item.id);
    const participantId = eventId ? (participantIdByEventId.get(eventId) ?? null) : null;
    return {
      ...item,
      answeredByMe: Boolean(participantId),
    };
  });
}

export async function recordEventHistory(item: EventHistoryItem): Promise<void> {
  const session = await getAuthSession();
  if (!session?.user?.id) return;
  if (!isValidHistoryItem(item)) return;

  // 履歴の登録・更新はRPCで一括処理する
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.rpc('upsert_event_access_history', {
    p_user_id: session.user.id,
    p_event_public_token: item.id,
    p_event_title: item.title,
    p_is_created_by_me: item.isCreatedByMe,
    p_accessed_at: item.createdAt,
  });

  if (error) {
    console.error('イベント履歴の登録に失敗しました:', error);
  }
}

export async function syncEventHistory(
  localHistory: EventHistoryItem[],
): Promise<EventHistoryItem[]> {
  const session = await getAuthSession();
  if (!session?.user?.id) return localHistory;

  // ローカル履歴をサーバーへ反映してから最新を取得する
  const supabase = createSupabaseAdmin();
  const candidates = localHistory.filter(isValidHistoryItem).slice(0, EVENT_HISTORY_SYNC_MAX_ITEMS);
  if (candidates.length > 0) {
    const { data, error } = await supabase.rpc('upsert_event_access_histories_bulk', {
      p_user_id: session.user.id,
      p_items: candidates.map((item) => ({
        event_public_token: item.id,
        event_title: item.title,
        is_created_by_me: item.isCreatedByMe,
        accessed_at: item.createdAt,
      })),
    });
    if (error) {
      console.error('イベント履歴の一括同期に失敗しました:', error);
    } else {
      const summary = Array.isArray(data) ? data[0] : data;
      const skippedCount =
        summary && typeof summary.skipped_count === 'number' ? summary.skipped_count : 0;
      if (skippedCount > 0) {
        console.warn('イベント履歴の一括同期でスキップが発生しました:', {
          skippedCount,
        });
      }
    }
  }

  return fetchEventHistory();
}

export async function removeEventHistoryItem(eventPublicToken: string): Promise<void> {
  const session = await getAuthSession();
  if (!session?.user?.id || !eventPublicToken) return;

  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from('event_access_histories')
    .delete()
    .eq('user_id', session.user.id)
    .eq('event_public_token', eventPublicToken);

  if (error) {
    console.error('イベント履歴の削除に失敗しました:', error);
  }
}

export async function clearServerEventHistory(): Promise<void> {
  const session = await getAuthSession();
  if (!session?.user?.id) return;

  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from('event_access_histories')
    .delete()
    .eq('user_id', session.user.id);

  if (error) {
    console.error('イベント履歴の全削除に失敗しました:', error);
  }
}
