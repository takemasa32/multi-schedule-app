/**
 * 日付・時間関連のユーティリティ関数
 */

/**
 * 日付を読みやすい形式にフォーマット
 */
export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
};

/**
 * 時間をフォーマットする関数
 * 00:00が前日のイベントの終了時刻の場合は24:00と表示
 */
export const formatTime = (dateString: string, eventDates: { start_time: string }[]) => {
  const date = new Date(dateString);

  // 00:00の場合は24:00として表示する条件を修正
  if (date.getHours() === 0 && date.getMinutes() === 0) {
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    prevDate.setHours(0, 0, 0, 0); // 日付部分だけ比較するため時刻部分をリセット

    // 日付部分の比較を行い、前日のイベントがあるか確認
    for (const eventDate of eventDates) {
      const startDate = new Date(eventDate.start_time);
      const startDay = new Date(startDate);
      startDay.setHours(0, 0, 0, 0); // 時刻部分をリセット

      // 前日のイベントがあれば 24:00 と表示
      if (startDay.getTime() === prevDate.getTime()) {
        return "24:00";
      }
    }
  }

  return date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * 曜日を抽出
 */
export const getDayOfWeek = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("ja-JP", { weekday: "short" });
};

/**
 * 日付だけを抽出 (YYYY/MM/DD形式)
 */
export const getDateString = (dateString: string) => {
  const date = new Date(dateString);
  // タイムゾーンの問題を避けるため、UTCベースで日付を取得
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Tokyo", // 明示的に日本時間を指定
  });
};

/**
 * 最適化された日付表示（同じ年月は省略）
 */
export const getOptimizedDateDisplay = (
  dateString: string,
  index: number,
  allDates: string[]
) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const dayOfWeek = getDayOfWeek(dateString);

  // 最初の日付または前の日付と年月が異なる場合は年月を表示
  if (index === 0) {
    return {
      yearMonth: `${year}年${month + 1}月`,
      day: `${day}日(${dayOfWeek})`
    };
  }

  // 前の日付と比較
  const prevDate = new Date(allDates[index - 1]);

  // 年が変わる場合
  if (prevDate.getFullYear() !== year) {
    return {
      yearMonth: `${year}年${month + 1}月`,
      day: `${day}日(${dayOfWeek})`
    };
  }

  // 月が変わる場合
  if (prevDate.getMonth() !== month) {
    return {
      yearMonth: `${month + 1}月`,
      day: `${day}日(${dayOfWeek})`
    };
  }

  // 同じ月なら日付と曜日のみ
  return {
    yearMonth: null,
    day: `${day}日(${dayOfWeek})`
  };
};

/**
 * タッチデバイスかどうかを判定
 */
export const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    ((navigator as Navigator & { msMaxTouchPoints?: number }).msMaxTouchPoints || 0) > 0
  );
};