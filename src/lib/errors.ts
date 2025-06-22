/**
 * イベントが存在しない場合に投げられるエラー
 */
export class EventNotFoundError extends Error {
  constructor(message = 'イベントが見つかりません') {
    super(message);
    this.name = 'EventNotFoundError';
  }
}

/**
 * Supabase からの取得に失敗した場合の汎用エラー
 */
export class EventFetchError extends Error {
  constructor(message = 'イベント取得中にエラーが発生しました') {
    super(message);
    this.name = 'EventFetchError';
  }
}
