/**
 * 日付フォーマット用ユーティリティ関数
 */

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
