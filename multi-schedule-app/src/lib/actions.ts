'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from './supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * イベント作成のServer Action
 */
export async function createEvent(formData: FormData) {
  // フォームデータの取得
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const dates = formData.getAll('dates') as string[];

  // バリデーション
  if (!title) {
    throw new Error('イベントのタイトルを入力してください');
  }

  const validDates = dates.filter(date => date.trim() !== '');
  if (validDates.length === 0) {
    throw new Error('少なくとも1つの候補日程を入力してください');
  }

  try {
    // トークン生成
    const publicToken = uuidv4();
    const adminToken = uuidv4();

    // イベントレコードの作成
    const { data: event, error: eventError } = await supabaseAdmin.from('events').insert({
      title,
      description: description || null,
      public_token: publicToken,
      admin_token: adminToken,
      is_finalized: false
    }).select('id');

    if (eventError || !event || event.length === 0) {
      console.error('イベント作成エラー:', eventError);
      throw new Error('イベントの作成に失敗しました');
    }

    const eventId = event[0].id;
    
    // 候補日程レコードの作成
    const dateRecords = validDates.map(date => ({
      event_id: eventId,
      date_time: new Date(date).toISOString()
    }));

    const { error: datesError } = await supabaseAdmin.from('event_dates').insert(dateRecords);

    if (datesError) {
      console.error('候補日程作成エラー:', datesError);
      throw new Error('候補日程の保存に失敗しました');
    }

    // 成功したら、イベント詳細ページ（管理者ビュー）にリダイレクト
    redirect(`/event/${publicToken}?admin=${adminToken}`);

  } catch (error) {
    console.error('処理エラー:', error);
    throw new Error('処理中にエラーが発生しました。時間をおいて再度お試しください。');
  }
}

/**
 * 参加者の回答を保存するServer Action
 */
export async function submitAvailability(formData: FormData) {
  const name = formData.get('participant_name') as string;
  const eventToken = formData.get('event_token') as string;

  if (!name || !eventToken) {
    throw new Error('名前と必要情報が入力されていません');
  }

  try {
    // イベントの取得
    const { data: events, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id, is_finalized')
      .eq('public_token', eventToken);

    if (eventError || !events || events.length === 0) {
      throw new Error('イベントが見つかりません');
    }

    const event = events[0];

    // イベントが確定済みの場合は回答不可
    if (event.is_finalized) {
      throw new Error('このイベントは既に確定済みです');
    }

    // 参加者の登録
    // 同じ名前の参加者が既に存在するか確認
    const { data: existingParticipants } = await supabaseAdmin
      .from('participants')
      .select('id')
      .eq('event_id', event.id)
      .eq('name', name);

    let participantId: string;

    if (existingParticipants && existingParticipants.length > 0) {
      // 既存の参加者の情報を使用
      participantId = existingParticipants[0].id;

      // 既存の回答を削除
      await supabaseAdmin
        .from('availabilities')
        .delete()
        .eq('participant_id', participantId);
    } else {
      // 新しい参加者を作成
      const { data: newParticipant, error: participantError } = await supabaseAdmin
        .from('participants')
        .insert({ 
          event_id: event.id, 
          name, 
          response_token: uuidv4() 
        })
        .select('id');

      if (participantError || !newParticipant || newParticipant.length === 0) {
        throw new Error('参加者情報の保存に失敗しました');
      }

      participantId = newParticipant[0].id;
    }

    // 候補日程の取得
    const { data: eventDates, error: datesError } = await supabaseAdmin
      .from('event_dates')
      .select('id')
      .eq('event_id', event.id);

    if (datesError || !eventDates) {
      throw new Error('候補日程の取得に失敗しました');
    }

    // 回答データの構築
    const availabilityRecords = [];

    for (const dateItem of eventDates) {
      const isAvailable = formData.get(`availability_${dateItem.id}`) === 'on';
      availabilityRecords.push({
        event_id: event.id,
        participant_id: participantId,
        event_date_id: dateItem.id,
        availability: isAvailable
      });
    }

    // 回答の保存
    const { error: availError } = await supabaseAdmin
      .from('availabilities')
      .insert(availabilityRecords);

    if (availError) {
      throw new Error('回答の保存に失敗しました');
    }

    // キャッシュの更新
    revalidatePath(`/event/${eventToken}`);

  } catch (error) {
    console.error('回答保存エラー:', error);
    throw error;
  }
}

/**
 * イベント日程を確定するServer Action
 */
export async function finalizeEvent(formData: FormData) {
  const eventId = formData.get('event_id') as string;
  const adminToken = formData.get('admin_token') as string;
  const dateId = formData.get('date_id') as string;

  if (!eventId || !adminToken || !dateId) {
    throw new Error('必要な情報が不足しています');
  }

  try {
    // 権限チェック
    const { data: events, error: eventError } = await supabaseAdmin
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('admin_token', adminToken);

    if (eventError || !events || events.length === 0) {
      throw new Error('権限がないか、イベントが存在しません');
    }

    // イベントの更新
    const { error: updateError } = await supabaseAdmin
      .from('events')
      .update({ 
        is_finalized: true,
        final_date_id: dateId 
      })
      .eq('id', eventId);

    if (updateError) {
      throw new Error('イベントの確定に失敗しました');
    }

    // イベントのpublic_tokenを取得してリダイレクト用に使用
    const { data: eventData } = await supabaseAdmin
      .from('events')
      .select('public_token')
      .eq('id', eventId)
      .single();

    // キャッシュの更新
    revalidatePath(`/event/${eventData?.public_token}`);

  } catch (error) {
    console.error('確定処理エラー:', error);
    throw error;
  }
}