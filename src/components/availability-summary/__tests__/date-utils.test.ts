import {
  formatDate,
  formatTime,
  getDateString,
  getDayOfWeek,
  getOptimizedDateDisplay,
  isTouchDevice,
} from '../date-utils';

describe('date-utils', () => {
  describe('formatDate / getDayOfWeek / getDateString', () => {
    it('日付文字列を日本語形式でフォーマットできる', () => {
      const value = formatDate('2026-01-02T09:30:00');
      expect(value).toContain('1/2');
    });

    it('曜日を抽出できる', () => {
      const value = getDayOfWeek('2026-01-02T09:30:00');
      expect(value).toBe('金');
    });

    it('日付のみをYYYY/M/D形式で取得できる', () => {
      const value = getDateString('2026-01-02T12:00:00Z');
      expect(value).toBe('2026/1/2');
    });
  });

  describe('formatTime', () => {
    it('00:00が前日のイベント終端なら24:00を返す', () => {
      const result = formatTime('2026-01-02T00:00:00', [
        { start_time: '2026-01-01T09:00:00' },
        { start_time: '2026-01-03T09:00:00' },
      ]);

      expect(result).toBe('24:00');
    });

    it('通常時刻はロケール形式で返す', () => {
      const result = formatTime('2026-01-02T10:05:00', []);
      expect(result).toBe('10:05');
    });
  });

  describe('getOptimizedDateDisplay', () => {
    it('先頭要素は年・月を含めて返す', () => {
      const allDates = ['2026-01-01T10:00:00', '2026-01-02T10:00:00'];
      const result = getOptimizedDateDisplay(allDates[0], 0, allDates);

      expect(result).toEqual({
        yearMonth: '2026年1月',
        day: '1日(木)',
      });
    });

    it('年が変わる場合は年・月を表示する', () => {
      const allDates = ['2025-12-31T10:00:00', '2026-01-01T10:00:00'];
      const result = getOptimizedDateDisplay(allDates[1], 1, allDates);

      expect(result).toEqual({
        yearMonth: '2026年1月',
        day: '1日(木)',
      });
    });

    it('月のみ変わる場合は月だけを表示する', () => {
      const allDates = ['2026-01-31T10:00:00', '2026-02-01T10:00:00'];
      const result = getOptimizedDateDisplay(allDates[1], 1, allDates);

      expect(result).toEqual({
        yearMonth: '2月',
        day: '1日(日)',
      });
    });

    it('同じ月ではyearMonthを省略する', () => {
      const allDates = ['2026-02-01T10:00:00', '2026-02-05T10:00:00'];
      const result = getOptimizedDateDisplay(allDates[1], 1, allDates);

      expect(result).toEqual({
        yearMonth: null,
        day: '5日(木)',
      });
    });
  });

  describe('isTouchDevice', () => {
    const originalMaxTouchPoints = navigator.maxTouchPoints;
    const originalMsMaxTouchPoints = (navigator as Navigator & { msMaxTouchPoints?: number })
      .msMaxTouchPoints;

    afterEach(() => {
      delete (window as Window & { ontouchstart?: unknown }).ontouchstart;
      Object.defineProperty(navigator, 'maxTouchPoints', {
        configurable: true,
        value: originalMaxTouchPoints,
      });
      Object.defineProperty(navigator, 'msMaxTouchPoints', {
        configurable: true,
        value: originalMsMaxTouchPoints,
      });
    });

    it('ontouchstartがあればtrueを返す', () => {
      Object.defineProperty(window, 'ontouchstart', {
        configurable: true,
        value: () => undefined,
      });

      expect(isTouchDevice()).toBe(true);
    });

    it('msMaxTouchPointsが1以上ならtrueを返す', () => {
      delete (window as Window & { ontouchstart?: unknown }).ontouchstart;
      Object.defineProperty(navigator, 'maxTouchPoints', {
        configurable: true,
        value: 0,
      });
      Object.defineProperty(navigator, 'msMaxTouchPoints', {
        configurable: true,
        value: 2,
      });

      expect(isTouchDevice()).toBe(true);
    });

    it('どの条件にも当てはまらない場合はfalseを返す', () => {
      delete (window as Window & { ontouchstart?: unknown }).ontouchstart;
      Object.defineProperty(navigator, 'maxTouchPoints', {
        configurable: true,
        value: 0,
      });
      Object.defineProperty(navigator, 'msMaxTouchPoints', {
        configurable: true,
        value: 0,
      });

      expect(isTouchDevice()).toBe(false);
    });
  });
});
