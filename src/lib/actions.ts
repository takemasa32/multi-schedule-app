'use server';

import { redirect } from 'next/navigation';
import { createSupabaseAdmin } from './supabase';
import { v4 as uuidv4 } from 'uuid'; // You may need to install this package: npm install uuid @types/uuid

export async function createEvent(formData: FormData) {
  const title = formData.get('title') as string;
  const description = formData.get('description') as string | null;

  // 複数の時間スロットを取得
  const startTimes = formData.getAll('startTimes') as string[];
  const endTimes = formData.getAll('endTimes') as string[];

  // Validation
  if (!title) {
    throw new Error('イベントタイトルは必須です');
  }

  if (!startTimes.length || !endTimes.length || startTimes.length !== endTimes.length) {
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

    // クライアントから送信された時間スロットを使用
    const timeslots = [];
    for (let i = 0; i < startTimes.length; i++) {
      timeslots.push({
        event_id: event.id,
        start_time: startTimes[i],
        end_time: endTimes[i],
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
