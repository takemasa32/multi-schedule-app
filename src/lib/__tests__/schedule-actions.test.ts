import {
  applyUserAvailabilitySyncForEvent,
  saveParticipantAnswerAsUserSchedule,
  saveUserScheduleBlockChanges,
  saveAvailabilityOverrides,
  upsertUserScheduleBlock,
} from '@/lib/schedule-actions';
import { getAuthSession } from '@/lib/auth';
import { createSupabaseAdmin } from '@/lib/supabase';

jest.mock('@/lib/auth', () => ({
  getAuthSession: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  createSupabaseAdmin: jest.fn(),
}));

const mockedGetAuthSession = getAuthSession as jest.Mock;
const mockedCreateSupabaseAdmin = createSupabaseAdmin as jest.Mock;

const createRangeMock = <T>(responses: T[]) => {
  return jest.fn().mockImplementation((from: number) => {
    const index = Math.floor(from / 1000);
    return Promise.resolve({ data: responses[index] ?? [], error: null });
  });
};

const createOrderedRangeChain = (rangeMock: jest.Mock) => {
  const secondOrderMock = jest.fn().mockReturnValue({ range: rangeMock });
  const firstOrderMock = jest.fn().mockReturnValue({ order: secondOrderMock });
  return { firstOrderMock, secondOrderMock };
};

describe('saveAvailabilityOverrides', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('overrideDateIds が空の場合は既存 override を削除する', async () => {
    const secondEqMock = jest.fn().mockResolvedValue({ error: null });
    const firstEqMock = jest.fn().mockReturnValue({ eq: secondEqMock });
    const deleteMock = jest.fn().mockReturnValue({ eq: firstEqMock });
    const fromMock = jest.fn().mockReturnValue({ delete: deleteMock });
    mockedCreateSupabaseAdmin.mockReturnValue({ from: fromMock });

    await saveAvailabilityOverrides({
      userId: 'user-1',
      eventId: 'event-1',
      overrideDateIds: [],
      selectedDateIds: [],
    });

    expect(fromMock).toHaveBeenCalledWith('user_event_availability_overrides');
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(firstEqMock).toHaveBeenCalledWith('user_id', 'user-1');
    expect(secondEqMock).toHaveBeenCalledWith('event_id', 'event-1');
  });

  it('override を upsert 後に不要行を削除する', async () => {
    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    const selectSecondEqMock = jest.fn().mockResolvedValue({
      data: [{ event_date_id: 'd1' }, { event_date_id: 'd2' }],
      error: null,
    });
    const selectFirstEqMock = jest.fn().mockReturnValue({ eq: selectSecondEqMock });
    const selectMock = jest.fn().mockReturnValue({ eq: selectFirstEqMock });

    const deleteInMock = jest.fn().mockResolvedValue({ error: null });
    const deleteSecondEqMock = jest.fn().mockReturnValue({ in: deleteInMock });
    const deleteFirstEqMock = jest.fn().mockReturnValue({ eq: deleteSecondEqMock });
    const deleteMock = jest.fn().mockReturnValue({ eq: deleteFirstEqMock });

    const fromMock = jest
      .fn()
      .mockReturnValueOnce({ upsert: upsertMock })
      .mockReturnValueOnce({ select: selectMock })
      .mockReturnValueOnce({ delete: deleteMock });

    mockedCreateSupabaseAdmin.mockReturnValue({ from: fromMock });

    await saveAvailabilityOverrides({
      userId: 'user-1',
      eventId: 'event-1',
      overrideDateIds: ['d1'],
      selectedDateIds: ['d1'],
    });

    expect(upsertMock).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          user_id: 'user-1',
          event_id: 'event-1',
          event_date_id: 'd1',
          availability: true,
        }),
      ],
      { onConflict: 'user_id,event_id,event_date_id' },
    );

    expect(selectFirstEqMock).toHaveBeenCalledWith('user_id', 'user-1');
    expect(selectSecondEqMock).toHaveBeenCalledWith('event_id', 'event-1');

    expect(deleteFirstEqMock).toHaveBeenCalledWith('user_id', 'user-1');
    expect(deleteSecondEqMock).toHaveBeenCalledWith('event_id', 'event-1');
    expect(deleteInMock).toHaveBeenCalledWith('event_date_id', ['d2']);
  });
});

describe('upsertUserScheduleBlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuthSession.mockResolvedValue({
      user: { id: 'user-1' },
    });
  });

  it('同日 23:00-00:00 指定は翌日 00:00 終了に補正して保存する', async () => {
    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    const fromMock = jest.fn().mockReturnValue({ upsert: upsertMock });
    mockedCreateSupabaseAdmin.mockReturnValue({ from: fromMock });

    const result = await upsertUserScheduleBlock({
      startTime: '2026-03-10T23:00:00',
      endTime: '2026-03-10T00:00:00',
      availability: true,
    });

    expect(result).toEqual({ success: true });
    expect(upsertMock).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          user_id: 'user-1',
          start_time: '2026-03-10T23:00:00.000Z',
          end_time: '2026-03-11T00:00:00.000Z',
          availability: true,
          source: 'manual',
          event_id: null,
        }),
      ],
      { onConflict: 'user_id,start_time,end_time' },
    );
  });

  it('同日で終了が開始より前でも 00:00 以外は不正として拒否する', async () => {
    const result = await upsertUserScheduleBlock({
      startTime: '2026-03-10T23:00:00',
      endTime: '2026-03-10T22:00:00',
      availability: false,
    });

    expect(result).toEqual({
      success: false,
      message: '時間帯の指定が正しくありません',
    });
    expect(mockedCreateSupabaseAdmin).not.toHaveBeenCalled();
  });
});

describe('saveUserScheduleBlockChanges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuthSession.mockResolvedValue({
      user: { id: 'user-1' },
    });
  });

  it('一括更新と削除を1回のServer Actionで処理できる', async () => {
    const deleteInMock = jest.fn().mockResolvedValue({ error: null });
    const deleteEqMock = jest.fn().mockReturnValue({ in: deleteInMock });
    const deleteMock = jest.fn().mockReturnValue({ eq: deleteEqMock });
    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    const fromMock = jest
      .fn()
      .mockReturnValueOnce({ delete: deleteMock })
      .mockReturnValueOnce({ upsert: upsertMock });
    mockedCreateSupabaseAdmin.mockReturnValue({ from: fromMock });

    const result = await saveUserScheduleBlockChanges({
      upserts: [
        {
          startTime: '2026-03-10T23:00:00',
          endTime: '2026-03-10T00:00:00',
          availability: true,
          replaceBlockId: 'replace-1',
        },
      ],
      deleteIds: ['remove-1'],
    });

    expect(result).toEqual({ success: true, updatedCount: 1 });
    expect(deleteEqMock).toHaveBeenCalledWith('user_id', 'user-1');
    expect(deleteInMock).toHaveBeenCalledWith(
      'id',
      expect.arrayContaining(['remove-1', 'replace-1']),
    );
    expect(upsertMock).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          user_id: 'user-1',
          start_time: '2026-03-10T23:00:00.000Z',
          end_time: '2026-03-11T00:00:00.000Z',
          availability: true,
          source: 'manual',
          event_id: null,
        }),
      ],
      { onConflict: 'user_id,start_time,end_time' },
    );
  });
});

describe('applyUserAvailabilitySyncForEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuthSession.mockResolvedValue({
      user: { id: 'user-1' },
    });
  });

  it('過去候補を表示対象から除外しても既存の選択済み回答は保持してRPCへ渡す', async () => {
    const rpcMock = jest.fn().mockResolvedValue({ error: null });
    const participantId = 'participant-1';
    const eventId = 'event-1';
    const pastDateId = '00000000-0000-0000-0000-000000000001';
    const futureDateId = '00000000-0000-0000-0000-000000000002';
    const allLinks = [{ event_id: eventId, participant_id: participantId }];
    const currentAvailabilities = [
      { participant_id: participantId, event_date_id: pastDateId, availability: true },
      { participant_id: participantId, event_date_id: futureDateId, availability: false },
    ];

    const fromMock = jest.fn((table: string) => {
      if (table === 'user_event_links' && fromMock.mock.calls.length === 1) {
        const eqMock = jest.fn().mockResolvedValue({ data: allLinks, error: null });
        return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
      }
      if (table === 'user_schedule_blocks') {
        const eqMock = jest.fn().mockResolvedValue({
          data: [
            {
              start_time: '2099-05-09T13:00:00',
              end_time: '2099-05-09T14:00:00',
              availability: true,
            },
          ],
          error: null,
        });
        return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
      }
      if (table === 'finalized_dates') {
        return {
          select: jest.fn().mockReturnValue({ in: jest.fn().mockResolvedValue({ data: [] }) }),
        };
      }
      if (table === 'events') {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [
                {
                  id: eventId,
                  title: '対象イベント',
                  public_token: 'event-token',
                  is_finalized: false,
                },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === 'event_dates') {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: pastDateId,
                    event_id: eventId,
                    start_time: '2000-05-09T13:00:00',
                    end_time: '2000-05-09T14:00:00',
                  },
                  {
                    id: futureDateId,
                    event_id: eventId,
                    start_time: '2099-05-09T13:00:00',
                    end_time: '2099-05-09T14:00:00',
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'user_event_availability_overrides') {
        const inMock = jest.fn().mockResolvedValue({ data: [], error: null });
        const eqMock = jest.fn().mockReturnValue({ in: inMock });
        return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
      }
      if (table === 'availabilities' && fromMock.mock.calls.length === 7) {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: currentAvailabilities, error: null }),
          }),
        };
      }
      if (table === 'user_event_links') {
        const eventEqMock = jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { participant_id: participantId },
            error: null,
          }),
        });
        const userEqMock = jest.fn().mockReturnValue({ eq: eventEqMock });
        return { select: jest.fn().mockReturnValue({ eq: userEqMock }) };
      }
      if (table === 'availabilities') {
        const participantEqMock = jest
          .fn()
          .mockResolvedValue({ data: currentAvailabilities, error: null });
        const eventEqMock = jest.fn().mockReturnValue({ eq: participantEqMock });
        return { select: jest.fn().mockReturnValue({ eq: eventEqMock }) };
      }
      throw new Error(`unexpected table: ${table}`);
    });
    mockedCreateSupabaseAdmin.mockReturnValue({ from: fromMock, rpc: rpcMock });

    const result = await applyUserAvailabilitySyncForEvent({
      eventId,
      selectedAvailabilities: { [futureDateId]: true },
      overwriteProtected: false,
      allowFinalized: false,
    });

    expect(result).toEqual({ success: true, message: 'イベントを更新しました', updatedCount: 1 });
    expect(rpcMock).toHaveBeenCalledWith('update_participant_availability', {
      p_participant_id: participantId,
      p_event_id: eventId,
      p_availabilities: expect.arrayContaining([
        { event_date_id: pastDateId, availability: true },
        { event_date_id: futureDateId, availability: true },
      ]),
    });
  });
});

describe('saveParticipantAnswerAsUserSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuthSession.mockResolvedValue({
      user: { id: 'user-1' },
    });
  });

  it('別の参加者に紐づいた回答は保存できない', async () => {
    const userEventLinksMaybeSingleMock = jest.fn().mockResolvedValue({
      data: { participant_id: 'participant-other' },
      error: null,
    });
    const userEventLinksEqEventMock = jest
      .fn()
      .mockReturnValue({ maybeSingle: userEventLinksMaybeSingleMock });
    const userEventLinksEqUserMock = jest.fn().mockReturnValue({ eq: userEventLinksEqEventMock });

    const fromMock = jest.fn((table: string) => {
      if (table === 'user_event_links') {
        return {
          select: jest.fn().mockReturnValue({ eq: userEventLinksEqUserMock }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });

    mockedCreateSupabaseAdmin.mockReturnValue({ from: fromMock });

    const result = await saveParticipantAnswerAsUserSchedule({
      eventId: 'event-1',
      participantId: 'participant-1',
    });

    expect(result).toEqual({
      success: false,
      message: 'この回答は現在のアカウントに紐づいていないため保存できません',
      previewCount: 0,
    });
    expect(userEventLinksEqUserMock).toHaveBeenCalledWith('user_id', 'user-1');
    expect(userEventLinksEqEventMock).toHaveBeenCalledWith('event_id', 'event-1');
  });

  it('自分に紐づいた回答は予定へ保存し差分件数を返す', async () => {
    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    const userEventLinksMaybeSingleMock = jest
      .fn()
      .mockResolvedValueOnce({
        data: { participant_id: 'participant-1' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { participant_id: 'participant-1' },
        error: null,
      });
    const userEventLinksEqEventMock = jest
      .fn()
      .mockReturnValue({ maybeSingle: userEventLinksMaybeSingleMock });
    const userEventLinksEqUserMock = jest.fn().mockReturnValue({ eq: userEventLinksEqEventMock });
    const userEventLinksSelectMock = jest.fn().mockReturnValue({ eq: userEventLinksEqUserMock });
    const userEventLinksUpsertMock = jest.fn().mockResolvedValue({ error: null });

    const eventDatesOrderMock = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'date-1',
          start_time: '2099-06-03T14:00:00',
          end_time: '2099-06-03T15:00:00',
        },
      ],
      error: null,
    });
    const eventDatesEqMock = jest.fn().mockReturnValue({ order: eventDatesOrderMock });

    const availabilitiesParticipantEqMock = jest.fn().mockResolvedValue({
      data: [{ event_date_id: 'date-1', availability: true }],
      error: null,
    });
    const availabilitiesEventEqMock = jest
      .fn()
      .mockReturnValue({ eq: availabilitiesParticipantEqMock });

    const previewLinksEqMock = jest.fn().mockResolvedValue({
      data: [{ event_id: 'event-2', participant_id: 'participant-2' }],
      error: null,
    });
    const previewBlocksRangeMock = createRangeMock([
      [{ start_time: '2099-06-04T14:00:00', end_time: '2099-06-04T15:00:00', availability: true }],
    ]);
    const previewBlocksOrderMock = jest.fn().mockReturnValue({ range: previewBlocksRangeMock });
    const previewBlocksGtMock = jest.fn().mockReturnValue({ order: previewBlocksOrderMock });
    const previewBlocksLtMock = jest.fn().mockReturnValue({ gt: previewBlocksGtMock });
    const previewBlocksEqMock = jest.fn().mockReturnValue({ lt: previewBlocksLtMock });

    const previewFinalizedInMock = jest.fn().mockResolvedValue({ data: [] });
    const previewEventsInMock = jest.fn().mockResolvedValue({
      data: [{ id: 'event-2', title: '同期対象イベント', public_token: 'event-2-token', is_finalized: false }],
      error: null,
    });
    const previewEventDatesRangeMock = createRangeMock([
      [
        {
          id: 'date-2',
          event_id: 'event-2',
          start_time: '2099-06-04T14:00:00',
          end_time: '2099-06-04T15:00:00',
        },
      ],
    ]);
    const previewEventDatesOrderMock = jest
      .fn()
      .mockReturnValue({ range: previewEventDatesRangeMock });
    const previewEventDatesInMock = jest
      .fn()
      .mockReturnValue({ order: previewEventDatesOrderMock });
    const previewOverridesRangeMock = createRangeMock([[]]);
    const { firstOrderMock: previewOverridesFirstOrderMock } =
      createOrderedRangeChain(previewOverridesRangeMock);
    const previewOverridesInMock = jest
      .fn()
      .mockReturnValue({ order: previewOverridesFirstOrderMock });
    const previewOverridesEqMock = jest.fn().mockReturnValue({ in: previewOverridesInMock });
    const previewAvailabilitiesRangeMock = createRangeMock([
      [{ participant_id: 'participant-2', event_date_id: 'date-2', availability: false }],
    ]);
    const { firstOrderMock: previewAvailabilitiesFirstOrderMock } = createOrderedRangeChain(
      previewAvailabilitiesRangeMock,
    );
    const previewAvailabilitiesInMock = jest
      .fn()
      .mockReturnValue({ order: previewAvailabilitiesFirstOrderMock });

    let userEventLinksCallCount = 0;
    let eventDatesCallCount = 0;
    let availabilitiesCallCount = 0;
    let userScheduleBlocksCallCount = 0;
    const fromMock = jest.fn((table: string) => {
      if (table === 'user_event_links') {
        userEventLinksCallCount += 1;
      }
      if (table === 'event_dates') {
        eventDatesCallCount += 1;
      }
      if (table === 'availabilities') {
        availabilitiesCallCount += 1;
      }
      if (table === 'user_schedule_blocks') {
        userScheduleBlocksCallCount += 1;
      }

      if (table === 'user_event_links' && userEventLinksCallCount === 1) {
        return { select: userEventLinksSelectMock };
      }
      if (table === 'participants') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({ maybeSingle: jest.fn().mockResolvedValue({
                data: { id: 'participant-1', event_id: 'event-1' },
                error: null,
              }) }),
            }),
          }),
        };
      }
      if (table === 'event_dates' && eventDatesCallCount === 1) {
        return { select: jest.fn().mockReturnValue({ eq: eventDatesEqMock }) };
      }
      if (table === 'availabilities' && availabilitiesCallCount === 1) {
        return { select: jest.fn().mockReturnValue({ eq: availabilitiesEventEqMock }) };
      }
      if (table === 'user_event_links' && userEventLinksCallCount === 2) {
        return { upsert: userEventLinksUpsertMock };
      }
      if (table === 'user_schedule_blocks' && userScheduleBlocksCallCount === 1) {
        return { upsert: upsertMock };
      }
      if (table === 'user_event_links' && userEventLinksCallCount === 3) {
        return {
          select: jest.fn().mockReturnValue({ eq: previewLinksEqMock }),
        };
      }
      if (table === 'event_dates' && eventDatesCallCount === 2) {
        return {
          select: jest.fn().mockReturnValue({ in: previewEventDatesInMock }),
        };
      }
      if (table === 'user_schedule_blocks' && userScheduleBlocksCallCount === 2) {
        return {
          select: jest.fn().mockReturnValue({ eq: previewBlocksEqMock }),
        };
      }
      if (table === 'finalized_dates') {
        return {
          select: jest.fn().mockReturnValue({ in: previewFinalizedInMock }),
        };
      }
      if (table === 'events') {
        return {
          select: jest.fn().mockReturnValue({ in: previewEventsInMock }),
        };
      }
      if (table === 'user_event_availability_overrides') {
        return {
          select: jest.fn().mockReturnValue({ eq: previewOverridesEqMock }),
        };
      }
      if (table === 'availabilities' && availabilitiesCallCount === 2) {
        return {
          select: jest.fn().mockReturnValue({ in: previewAvailabilitiesInMock }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });

    mockedCreateSupabaseAdmin.mockReturnValue({ from: fromMock });

    const result = await saveParticipantAnswerAsUserSchedule({
      eventId: 'event-1',
      participantId: 'participant-1',
    });

    expect(result).toEqual({
      success: true,
      message: '自分の予定として保存しました',
      previewCount: 0,
    });
    expect(userEventLinksUpsertMock).toHaveBeenCalled();
    expect(upsertMock).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          user_id: 'user-1',
          event_id: 'event-1',
          availability: true,
          source: 'event',
        }),
      ],
      { onConflict: 'user_id,start_time,end_time' },
    );
  });
});
