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

  return data.map((row) => mapRowToItem(row));
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

export async function syncEventHistory(localHistory: EventHistoryItem[]): Promise<EventHistoryItem[]> {
  const session = await getAuthSession();
  if (!session?.user?.id) return localHistory;

  // ローカル履歴をサーバーへ反映してから最新を取得する
  const supabase = createSupabaseAdmin();
  const candidates = localHistory.filter(isValidHistoryItem).slice(0, EVENT_HISTORY_SYNC_MAX_ITEMS);

  for (const item of candidates) {
    const { error } = await supabase.rpc('upsert_event_access_history', {
      p_user_id: session.user.id,
      p_event_public_token: item.id,
      p_event_title: item.title,
      p_is_created_by_me: item.isCreatedByMe,
      p_accessed_at: item.createdAt,
    });

    if (error) {
      console.error('イベント履歴の同期に失敗しました:', error);
      break;
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
  const { error } = await supabase.from('event_access_histories').delete().eq('user_id', session.user.id);

  if (error) {
    console.error('イベント履歴の全削除に失敗しました:', error);
  }
}
