import { buildParticipantsByDateIndex, fetchParticipantsByDate } from '../tooltip-utils';
import type { Participant } from '@/types/participant';

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
