'use server';

import { authPool, getAuthSession } from '@/lib/auth';

const DELETE_CONFIRM_TEXT = '削除';

/**
 * アカウント連携情報を削除する
 * @param {FormData} formData - フォーム入力
 * @returns {{ success: boolean; message?: string }} 実行結果
 */
export async function deleteAccount(formData: FormData) {
  const confirmation = String(formData.get('confirmation') ?? '').trim();

  if (confirmation !== DELETE_CONFIRM_TEXT) {
    return { success: false, message: '確認文字が一致しません。' };
  }

  const session = await getAuthSession();
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, message: 'ログインしてください。' };
  }

  const client = await authPool.connect();

  try {
    await client.query('BEGIN');
    const result = await client.query('DELETE FROM authjs.users WHERE id = $1', [userId]);
    await client.query('COMMIT');

    if (result.rowCount === 0) {
      return { success: false, message: '削除対象のアカウントが見つかりません。' };
    }

    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('アカウント削除に失敗しました:', error);
    return { success: false, message: 'アカウント削除に失敗しました。' };
  } finally {
    client.release();
  }
}
