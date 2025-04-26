'use server';

import { redirect } from 'next/navigation';
import { createSupabaseAdmin } from './supabase';
import { v4 as uuidv4 } from 'uuid'; // You may need to install this package: npm install uuid @types/uuid

export async function createEvent(formData: FormData) {
  const title = formData.get('title') as string;
  const description = formData.get('description') as string | null;

  // 日付と時間を別々に取得
  const startDates = formData.getAll('startDates') as string[];
  const startTimes = formData.getAll('startTimes') as string[];
  const endDates = formData.getAll('endDates') as string[];
  const endTimes = formData.getAll('endTimes') as string[];

  // Validation
  if (!title) {
    throw new Error('イベントタイトルは必須です');
  }

  if (!startDates.length || !startTimes.length || !endDates.length || !endTimes.length ||
      startDates.length !== startTimes.length || startTimes.length !== endTimes.length) {
    throw new Error('候補日程の情報が正しくありません');
  }

  try {
    // Create Supabase client
    const supabaseAdmin = createSupabaseAdmin();

    // Generate UUIDs for tokens
    const publicToken = uuidv4();
    const adminToken = uuidv4();

    // Create event
    const { data: eventData, error: eventError } = await supabaseAdmin
      .from('events')
      .insert({
        title,
        description,
        public_token: publicToken,
        admin_token: adminToken,
      })
      .select('id, public_token, admin_token');

    if (eventError || !eventData?.length) {
      console.error('イベント作成エラー:', eventError);
      throw new Error('イベントの作成に失敗しました: ' + (eventError?.message || 'データベースエラー'));
    }

    const event = eventData[0];

    // クライアントから送信された日付と時間を結合して保存
    const timeslots = [];
    for (let i = 0; i < startDates.length; i++) {
      // 日付と時間を結合してSQLのタイムスタンプ形式（YYYY-MM-DD HH:MI:SS）に変換
      // タイムゾーンを指定しないことで、クライアントの表示と一致させる
      const startDateTimeStr = `${startDates[i]} ${startTimes[i]}:00`;

      // 24:00の特殊ケース対応（翌日の00:00に変換）
      let endTimeFormatted = endTimes[i];
      let endDateFormatted = endDates[i];

      if (endTimes[i] === '24:00') {
        // 24:00は翌日の00:00として扱う
        endTimeFormatted = '00:00:00';

        // 日付を1日進める
        const endDateObj = new Date(endDates[i]);
        endDateObj.setDate(endDateObj.getDate() + 1);
        endDateFormatted = endDateObj.toISOString().split('T')[0];
      } else {
        // 通常のケースでは秒を追加
        endTimeFormatted = `${endTimes[i]}:00`;
      }

      const endDateTimeStr = `${endDateFormatted} ${endTimeFormatted}`;

      timeslots.push({
        event_id: event.id,
        start_time: startDateTimeStr,
        end_time: endDateTimeStr,
      });
    }

    // Skip date insertion if no timeslots
    if (timeslots.length === 0) {
      throw new Error('候補日程が生成できません');
    }

    // Insert timeslots
    const { error: dateError } = await supabaseAdmin
      .from('event_dates')
      .insert(timeslots);

    if (dateError) {
      console.error('日程登録エラー:', dateError);
      throw new Error('候補日程の登録に失敗しました');
    }

    // Redirect to event page with admin token
    redirect(`/event/${event.public_token}?admin=${event.admin_token}`);

  } catch (error) {
    console.error('イベント作成処理エラー:', error);
    throw error; // Re-throw to be caught by error boundary
  }
}

/**
 * 特定の参加者IDに基づいて参加者情報と回答を取得する
 */
export async function getParticipantById(participantId: string, eventId: string) {
  const supabase = createSupabaseAdmin();

  // 参加者情報を取得
  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .select('*')
    .eq('id', participantId)
    .eq('event_id', eventId)
    .single();

  if (participantError || !participant) {
    console.error("参加者取得エラー:", participantError);
    return null;
  }

  // 参加者の回答を取得
  const { data: availabilities, error: availError } = await supabase
    .from('availabilities')
    .select(`
      id,
      event_date_id,
      availability
    `)
    .eq('participant_id', participantId)
    .eq('event_id', eventId);

  if (availError) {
    console.error("回答取得エラー:", availError);
    return null;
  }

  // 回答をイベント日付IDでマップ化
  const availabilityMap = availabilities.reduce((acc, item) => {
    acc[item.event_date_id] = item.availability;
    return acc;
  }, {} as Record<string, boolean>);

  return {
    participant,
    availabilityMap
  };
}

/**
 * 公開トークンを使用してイベントを取得する
 */
export async function getEvent(publicToken: string) {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('public_token', publicToken)
    .single();

  if (error) {
    console.error('イベント取得エラー:', error);
    return null;
  }

  return data;
}

/**
 * イベントIDに基づいて参加者一覧を取得する
 */
export async function getParticipants(eventId: string) {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('event_id', eventId);

  if (error) {
    console.error('参加者一覧取得エラー:', error);
    return [];
  }

  return data || [];
}

/**
 * イベントの全回答データを取得する
 */
export async function getAvailabilities(eventId: string) {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('availabilities')
    .select('*')
    .eq('event_id', eventId);

  if (error) {
    console.error('回答データ取得エラー:', error);
    return [];
  }

  return data || [];
}

/**
 * 確定した日程IDのリストを取得する
 */
export async function getFinalizedDateIds(eventId: string, finalDateId: string | null) {
  const supabase = createSupabaseAdmin();

  if (!finalDateId) return [];

  // 確定日程テーブルから確定した日程IDを取得
  const { data, error } = await supabase
    .from('event_finalized_dates')
    .select('event_date_id')
    .eq('event_id', eventId);

  if (error) {
    console.error('確定日程取得エラー:', error);
    return [];
  }

  // event_date_idの配列を返す
  return data.map(item => item.event_date_id);
}

/**
 * イベントIDに基づいてイベント日程を取得する
 */
export async function getEventDates(eventId: string) {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('event_dates')
    .select('*')
    .eq('event_id', eventId)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('イベント日程取得エラー:', error);
    return [];
  }

  return data || [];
}
