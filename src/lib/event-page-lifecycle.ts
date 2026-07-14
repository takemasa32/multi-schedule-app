import { after } from 'next/server';
import { touchEventLastAccessedIfStale } from '@/lib/actions';

/**
 * イベントのアクセス記録をレスポンス後に更新する。
 * 表示に不要な書き込み処理を各ページの初期表示から分離する。
 *
 * @param {string} publicToken イベントの公開トークン
 * @returns {void}
 */
export function deferEventLastAccessedTouch(publicToken: string): void {
  after(() => touchEventLastAccessedIfStale(publicToken));
}
