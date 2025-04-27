/**
 * 日付フォーマット用ユーティリティ関数
 */

// Supabase クエリに関するインターフェース
export interface SupabaseQueryInterface {
  range(from: number, to: number): SupabaseQueryInterface;
  order(column: string, options?: { ascending: boolean }): SupabaseQueryInterface;
  then<T>(onfulfilled?: ((value: T) => T | PromiseLike<T>)): Promise<T>;
}

// Supabaseのクエリ結果インターフェース
export interface SupabaseQueryResult<T> {
  data: T[] | null;
  error: Error | null;
}

// タイムスロットのインターフェース定義
export interface TimeSlot {
  date: Date;
  startTime: string; // HH:mm形式
  endTime: string;   // HH:mm形式
}

// 日付を「YYYY/MM/DD」形式でフォーマットする
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

// 日付を「YYYY/MM/DD HH:MM」形式でフォーマットする
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// 曜日を取得する（日本語）
export function getDayOfWeek(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"];
  return dayOfWeek[d.getDay()];
}

// 日付を「M/D (曜)」形式でフォーマットする
export function formatDateWithDay(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dayOfWeek = getDayOfWeek(d);
  return `${month}/${day} (${dayOfWeek})`;
}

// 日付を「M/D (曜) HH:MM」形式でフォーマットする
export function formatDateTimeWithDay(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dayOfWeek = getDayOfWeek(d);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${month}/${day} (${dayOfWeek}) ${hours}:${minutes}`;
}

// 時刻を「HH:MM」形式でフォーマットする
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  
  // 00:00は24:00として表示する条件があれば、ここでチェック
  if (hours === "00" && minutes === "00") {
    // 呼び出し側で前日の日付かどうかチェックが必要な場合は
    // そのロジックを追加する。基本的には単純に表示するだけ
    return "00:00";
  }
  
  return `${hours}:${minutes}`;
}

/**
 * Googleカレンダー用の日時フォーマットに変換する
 * 形式: YYYYMMDDTHHmmssZ
 */
export function formatGoogleCalendarDate(date: Date): string {
  return date.toISOString().replace(/-|:|\.\d{3}/g, "");
}

/**
 * ICS形式の日時フォーマットに変換する
 * 形式: YYYYMMDDTHHmmssZ
 */
export function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/-|:|\.\d{3}/g, "");
}

/**
 * 日付を日本語形式でフォーマットする (YYYY年MM月DD日(曜日))
 */
export function formatJapaneseDate(date: Date): string {
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = weekdays[date.getDay()];

  return `${year}年${month}月${day}日(${weekday})`;
}

/**
 * 日時を日本語形式でフォーマットする (YYYY年MM月DD日(曜日) HH:mm)
 */
export function formatJapaneseDateTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${formatJapaneseDate(date)} ${hours}:${minutes}`;
}

/**
 * UUIDを生成する（クライアント側での一時的なID生成用）
 */
export function generateUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Supabaseのクエリを使って、ページネーション処理を行いながら全てのデータを取得する関数
 * @param query Supabaseのクエリオブジェクト（from().select()など）
 * @param pageSize 1回あたりの取得サイズ（最大1000）
 * @returns 全データの配列
 */
export async function fetchAllPaginated<T>(query: SupabaseQueryInterface, pageSize = 1000): Promise<T[]> {
  let allData: T[] = [];
  let page = 0;
  let hasMoreData = true;

  while (hasMoreData) {
    const result = await query
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('created_at', { ascending: false }) as unknown as SupabaseQueryResult<T>;

    const { data, error } = result;

    if (error) {
      console.error('データ取得エラー:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      hasMoreData = false;
    } else {
      allData = [...allData, ...data];

      // 取得したデータが要求したページサイズより少ない場合は、これ以上のデータがないと判断
      if (data.length < pageSize) {
        hasMoreData = false;
      } else {
        page++;
      }
    }
  }

  return allData;
}

/**
 * 指定したフィールドで並べ替えたデータをページネーション処理しながら全て取得する関数
 * @param query Supabaseのクエリオブジェクト
 * @param orderField 並び替えのフィールド
 * @param options 並び替えオプション
 * @param pageSize 1回あたりの取得サイズ（最大1000）
 * @returns 全データの配列
 */
export async function fetchAllPaginatedWithOrder<T>(
  query: SupabaseQueryInterface,
  orderField: string,
  options: { ascending: boolean } = { ascending: true },
  pageSize = 1000
): Promise<T[]> {
  let allData: T[] = [];
  let page = 0;
  let hasMoreData = true;

  while (hasMoreData) {
    const result = await query
      .order(orderField, options)
      .range(page * pageSize, (page + 1) * pageSize - 1) as unknown as SupabaseQueryResult<T>;

    const { data, error } = result;

    if (error) {
      console.error('データ取得エラー:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      hasMoreData = false;
    } else {
      allData = [...allData, ...data];

      if (data.length < pageSize) {
        hasMoreData = false;
      } else {
        page++;
      }
    }
  }

  return allData;
}
