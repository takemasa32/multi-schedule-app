import {
  buildDateTimeLabel,
  buildParticipantsByDateIndex,
  calcTooltipPosition,
  fetchParticipantsByDate,
} from '../tooltip-utils';
import type { Participant } from '@/types/participant';

describe('calcTooltipPosition', () => {
  const originalWidth = window.innerWidth;
  const originalHeight = window.innerHeight;

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight });
  });

  it('右端に近い場合は左寄せで表示する', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 700 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });

    const result = calcTooltipPosition(690, 300, 120, 200);
    expect(result).toEqual({ x: 570, y: 300 });
  });

  it('左寄せ時のX座標は10未満にならない', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 80 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });

    const result = calcTooltipPosition(20, 240, 120, 100);
    expect(result.x).toBe(10);
  });

  it('モバイル幅ではY座標を80px上にずらす', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });

    const result = calcTooltipPosition(100, 300, 120, 200);
    expect(result).toEqual({ x: 100, y: 220 });
  });

  it('デスクトップでは下端を超えないように調整する', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });

    const result = calcTooltipPosition(100, 580, 120, 200);
    expect(result).toEqual({ x: 100, y: 400 });
  });
});

describe('buildDateTimeLabel', () => {
  const eventDates = [
    {
      id: 'd1',
      start_time: '2026-01-01T09:00:00',
      end_time: '2026-01-01T10:00:00',
    },
    {
      id: 'd2',
      start_time: '2026-01-02T00:00:00',
      end_time: '2026-01-02T01:00:00',
    },
  ];

  it('対象日付が存在する場合は日付ラベルと時間ラベルを返す', () => {
    const result = buildDateTimeLabel(eventDates, 'd1');

    expect(result.dateLabel).toContain('1/1');
    expect(result.timeLabel).toBe('09:00〜10:00');
  });

  it('対象日付が存在しない場合は空文字を返す', () => {
    const result = buildDateTimeLabel(eventDates, 'missing');
    expect(result).toEqual({ dateLabel: '', timeLabel: '' });
  });
});

describe('fetchParticipantsByDate', () => {
  it('コメント付きで参加者を分類できる', () => {
    const participants: Participant[] = [
      { id: 'p1', name: 'Alice', comment: 'よろしく' },
      { id: 'p2', name: 'Bob', comment: null },
      { id: 'p3', name: 'Charlie' },
    ];
    const availabilities = [
      { participant_id: 'p1', event_date_id: 'd1', availability: true },
      { participant_id: 'p2', event_date_id: 'd1', availability: false },
      { participant_id: 'p3', event_date_id: 'd1', availability: false },
    ];
    const result = fetchParticipantsByDate(participants, availabilities, 'd1');
    expect(result.availableParticipants).toEqual([{ name: 'Alice', comment: 'よろしく' }]);
    expect(result.unavailableParticipants).toEqual([
      { name: 'Bob', comment: null },
      { name: 'Charlie', comment: undefined },
    ]);
  });
});

describe('buildParticipantsByDateIndex', () => {
  it('日付ID単位で参加可否を事前集計できる', () => {
    const participants: Participant[] = [
      { id: 'p1', name: 'Alice', comment: 'OK' },
      { id: 'p2', name: 'Bob', comment: 'NG' },
      { id: 'p3', name: 'Carol' },
    ];
    const availabilities = [
      { participant_id: 'p1', event_date_id: 'd1', availability: true },
      { participant_id: 'p2', event_date_id: 'd1', availability: false },
      { participant_id: 'p3', event_date_id: 'd2', availability: true },
      { participant_id: 'missing', event_date_id: 'd2', availability: false },
    ];

    const result = buildParticipantsByDateIndex(participants, availabilities);
    expect(result.get('d1')).toEqual({
      availableParticipants: [{ name: 'Alice', comment: 'OK' }],
      unavailableParticipants: [{ name: 'Bob', comment: 'NG' }],
    });
    expect(result.get('d2')).toEqual({
      availableParticipants: [{ name: 'Carol', comment: undefined }],
      unavailableParticipants: [],
    });
  });
});
