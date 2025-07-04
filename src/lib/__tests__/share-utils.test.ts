import { buildAvailableDatesMessage } from '../share-utils';

describe('buildAvailableDatesMessage', () => {
  const dates = [
    { id: 'd1', start_time: '2025-05-01T10:00:00', end_time: '2025-05-01T11:00:00' },
    { id: 'd2', start_time: '2025-05-02T12:00:00', end_time: '2025-05-02T13:00:00' },
  ];
  const availabilities = [
    { participant_id: 'p1', event_date_id: 'd1', availability: true },
    { participant_id: 'p2', event_date_id: 'd1', availability: true },
    { participant_id: 'p1', event_date_id: 'd2', availability: false },
    { participant_id: 'p2', event_date_id: 'd2', availability: true },
  ];

  it('参加人数2人、閾値2で1件のみ返す', () => {
    expect(buildAvailableDatesMessage(dates, availabilities, 2)).toBe(
      '[2人以上が参加可能な日程]\n- 5月1日 10:00-11:00'
    );
  });

  it('閾値1なら2件返す', () => {
    expect(buildAvailableDatesMessage(dates, availabilities, 1)).toBe(
      '[1人以上が参加可能な日程]\n- 5月1日 10:00-11:00\n- 5月2日 12:00-13:00'
    );
  });

  it('該当なしの場合は空文字', () => {
    expect(buildAvailableDatesMessage(dates, availabilities, 3)).toBe('');
  });
});
