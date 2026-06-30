import {
  applyUserAvailabilitySyncForEvent,
  fetchUserAvailabilitySyncPreview,
  fetchUserAvailabilitySyncPreviewResult,
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

const createRangeMock = <T,>(pages: T[][]) =>
  jest.fn((from: number) =>
    Promise.resolve({
      data: pages[Math.floor(from / 1000)] ?? [],
      error: null,
    }),
  );

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
        const rangeMock = createRangeMock([
          [
            {
              start_time: '2099-05-09T13:00:00',
              end_time: '2099-05-09T14:00:00',
              availability: true,
            },
          ],
        ]);
        const orderMock = jest.fn().mockReturnValue({ range: rangeMock });
        const gtMock = jest.fn().mockReturnValue({ order: orderMock });
        const ltMock = jest.fn().mockReturnValue({ gt: gtMock });
        const eqMock = jest.fn().mockReturnValue({ lt: ltMock });
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
        const rangeMock = createRangeMock([
          [
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
        ]);
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({ range: rangeMock }),
            }),
          }),
        };
      }
      if (table === 'user_event_availability_overrides') {
        const rangeMock = createRangeMock([[]]);
        const { firstOrderMock } = createOrderedRangeChain(rangeMock);
        const inMock = jest.fn().mockReturnValue({ order: firstOrderMock });
        const eqMock = jest.fn().mockReturnValue({ in: inMock });
        return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
      }
      if (table === 'availabilities' && fromMock.mock.calls.length === 7) {
        const rangeMock = createRangeMock([currentAvailabilities]);
        const { firstOrderMock } = createOrderedRangeChain(rangeMock);
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({ order: firstOrderMock }),
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

describe('fetchUserAvailabilitySyncPreviewResult', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuthSession.mockResolvedValue({
      user: { id: 'user-1' },
    });
  });

  it('回答なしからアカウント予定の可へ変わる差分を検出する', async () => {
    const eventId = 'event-1';
    const participantId = 'participant-1';
    const firstDateId = 'date-1';
    const secondDateId = 'date-2';

    const fromMock = jest.fn((table: string) => {
      if (table === 'user_event_links') {
        const eqMock = jest.fn().mockResolvedValue({
          data: [{ event_id: eventId, participant_id: participantId }],
          error: null,
        });
        return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
      }
      if (table === 'user_schedule_blocks') {
        const rangeMock = createRangeMock([
          [
            {
              start_time: '2099-06-03T14:00:00+00:00',
              end_time: '2099-06-03T15:00:00+00:00',
              availability: true,
            },
            {
              start_time: '2099-06-03T15:00:00+00:00',
              end_time: '2099-06-03T16:00:00+00:00',
              availability: true,
            },
          ],
        ]);
        const orderMock = jest.fn().mockReturnValue({ range: rangeMock });
        const gtMock = jest.fn().mockReturnValue({ order: orderMock });
        const ltMock = jest.fn().mockReturnValue({ gt: gtMock });
        const eqMock = jest.fn().mockReturnValue({ lt: ltMock });
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
                  title: '同期対象イベント',
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
        const rangeMock = createRangeMock([
          [
            {
              id: firstDateId,
              event_id: eventId,
              start_time: '2099-06-03T14:00:00',
              end_time: '2099-06-03T15:00:00',
            },
            {
              id: secondDateId,
              event_id: eventId,
              start_time: '2099-06-03T15:00:00',
              end_time: '2099-06-03T16:00:00',
            },
          ],
        ]);
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({ range: rangeMock }),
            }),
          }),
        };
      }
      if (table === 'user_event_availability_overrides') {
        const rangeMock = createRangeMock([[]]);
        const { firstOrderMock } = createOrderedRangeChain(rangeMock);
        const inMock = jest.fn().mockReturnValue({ order: firstOrderMock });
        const eqMock = jest.fn().mockReturnValue({ in: inMock });
        return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
      }
      if (table === 'availabilities') {
        const rangeMock = createRangeMock([[]]);
        const { firstOrderMock } = createOrderedRangeChain(rangeMock);
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({ order: firstOrderMock }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });
    mockedCreateSupabaseAdmin.mockReturnValue({ from: fromMock });

    const result = await fetchUserAvailabilitySyncPreviewResult();

    expect(result.success).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      eventId,
      title: '同期対象イベント',
      changes: {
        total: 2,
        availableToUnavailable: 0,
        unavailableToAvailable: 2,
        protected: 0,
      },
    });
    expect(result.events[0]?.dates.filter((date) => date.willChange)).toEqual([
      expect.objectContaining({
        eventDateId: firstDateId,
        currentAvailability: false,
        desiredAvailability: true,
      }),
      expect.objectContaining({
        eventDateId: secondDateId,
        currentAvailability: false,
        desiredAvailability: true,
      }),
    ]);
  });

  it('イベント候補と予定ブロックが1000件を超えても差分を検出する', async () => {
    const eventId = 'event-1';
    const participantId = 'participant-1';
    const targetDateId = 'date-after-first-page';
    const toDateTime = (date: Date) => date.toISOString().slice(0, 19);
    const toUtcDateTime = (date: Date) => `${toDateTime(date)}+00:00`;
    const fillerDates = Array.from({ length: 1000 }, (_, index) => ({
      id: `date-${index}`,
      event_id: eventId,
      start_time: toDateTime(new Date(Date.UTC(2099, 0, 1, index))),
      end_time: toDateTime(new Date(Date.UTC(2099, 0, 1, index + 1))),
    }));
    const fillerBlocks = Array.from({ length: 1000 }, (_, index) => ({
      start_time: toUtcDateTime(new Date(Date.UTC(2099, 1, 1, index))),
      end_time: toUtcDateTime(new Date(Date.UTC(2099, 1, 1, index + 1))),
      availability: false,
    }));
    const eventDateRangeMock = createRangeMock([
      fillerDates,
      [
        {
          id: targetDateId,
          event_id: eventId,
          start_time: '2099-06-03T14:00:00',
          end_time: '2099-06-03T15:00:00',
        },
      ],
    ]);
    const blockRangeMock = createRangeMock([
      fillerBlocks,
      [
        {
          start_time: '2099-06-03T14:00:00+00:00',
          end_time: '2099-06-03T15:00:00+00:00',
          availability: true,
        },
      ],
    ]);

    const fromMock = jest.fn((table: string) => {
      if (table === 'user_event_links') {
        const eqMock = jest.fn().mockResolvedValue({
          data: [{ event_id: eventId, participant_id: participantId }],
          error: null,
        });
        return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
      }
      if (table === 'event_dates') {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({ range: eventDateRangeMock }),
            }),
          }),
        };
      }
      if (table === 'user_schedule_blocks') {
        const orderMock = jest.fn().mockReturnValue({ range: blockRangeMock });
        const gtMock = jest.fn().mockReturnValue({ order: orderMock });
        const ltMock = jest.fn().mockReturnValue({ gt: gtMock });
        const eqMock = jest.fn().mockReturnValue({ lt: ltMock });
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
                  title: 'ページング対象イベント',
                  public_token: 'event-token',
                  is_finalized: false,
                },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === 'user_event_availability_overrides') {
        const rangeMock = createRangeMock([[]]);
        const { firstOrderMock } = createOrderedRangeChain(rangeMock);
        const inMock = jest.fn().mockReturnValue({ order: firstOrderMock });
        const eqMock = jest.fn().mockReturnValue({ in: inMock });
        return { select: jest.fn().mockReturnValue({ eq: eqMock }) };
      }
      if (table === 'availabilities') {
        const rangeMock = createRangeMock([[]]);
        const { firstOrderMock } = createOrderedRangeChain(rangeMock);
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({ order: firstOrderMock }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });
    mockedCreateSupabaseAdmin.mockReturnValue({ from: fromMock });

    const result = await fetchUserAvailabilitySyncPreviewResult();

    expect(eventDateRangeMock).toHaveBeenCalledWith(0, 999);
    expect(eventDateRangeMock).toHaveBeenCalledWith(1000, 1999);
    expect(blockRangeMock).toHaveBeenCalledWith(0, 999);
    expect(blockRangeMock).toHaveBeenCalledWith(1000, 1999);
    expect(result.success).toBe(true);
    expect(result.events[0]?.changes.unavailableToAvailable).toBe(1);
    expect(result.events[0]?.dates.filter((date) => date.willChange)).toEqual([
      expect.objectContaining({
        eventDateId: targetDateId,
        currentAvailability: false,
        desiredAvailability: true,
      }),
    ]);
  });

  it('サーバー側でログイン状態を確認できない場合は認証失敗として返す', async () => {
    mockedGetAuthSession.mockResolvedValue(null);

    const result = await fetchUserAvailabilitySyncPreviewResult();

    expect(result).toEqual({
      success: false,
      reason: 'unauthenticated',
      message: 'ログイン状態を確認できませんでした。ページを再読み込みしてから再度お試しください。',
      events: [],
    });
    expect(mockedCreateSupabaseAdmin).not.toHaveBeenCalled();
  });
});

describe('fetchUserAvailabilitySyncPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('サーバー側でログイン状態を確認できない場合は差分なしの空配列に丸めない', async () => {
    mockedGetAuthSession.mockResolvedValue(null);

    await expect(fetchUserAvailabilitySyncPreview()).rejects.toThrow(
      'ログイン状態を確認できませんでした。ページを再読み込みしてから再度お試しください。',
    );
    expect(mockedCreateSupabaseAdmin).not.toHaveBeenCalled();
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
    const maybeSingleMock = jest.fn().mockResolvedValue({
      data: { participant_id: 'participant-other' },
      error: null,
    });
    const fromMock = jest.fn((table: string) => {
      if (table === 'user_event_links') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock }),
            }),
          }),
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
  });

  it('自分に紐づいた回答は予定へ保存できる', async () => {
    let userEventLinksCallCount = 0;
    let eventDatesCallCount = 0;
    let availabilitiesCallCount = 0;
    let userScheduleBlocksCallCount = 0;
    const scheduleUpsertMock = jest.fn().mockResolvedValue({ error: null });

    const fromMock = jest.fn((table: string) => {
      if (table === 'user_event_links') {
        userEventLinksCallCount += 1;
        if (userEventLinksCallCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { participant_id: 'participant-1' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (userEventLinksCallCount === 2) {
          return { upsert: jest.fn().mockResolvedValue({ error: null }) };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ event_id: 'event-2', participant_id: 'participant-2' }],
              error: null,
            }),
          }),
        };
      }
      if (table === 'participants') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'participant-1', event_id: 'event-1' },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'event_dates') {
        eventDatesCallCount += 1;
        if (eventDatesCallCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'date-1',
                      start_time: '2099-06-03T14:00:00',
                      end_time: '2099-06-03T15:00:00',
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        const rangeMock = createRangeMock([
          [
            {
              id: 'date-2',
              event_id: 'event-2',
              start_time: '2099-06-04T14:00:00',
              end_time: '2099-06-04T15:00:00',
            },
          ],
        ]);
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({ range: rangeMock }),
            }),
          }),
        };
      }
      if (table === 'availabilities') {
        availabilitiesCallCount += 1;
        if (availabilitiesCallCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ event_date_id: 'date-1', availability: true }],
                  error: null,
                }),
              }),
            }),
          };
        }
        const rangeMock = createRangeMock([
          [{ participant_id: 'participant-2', event_date_id: 'date-2', availability: false }],
        ]);
        const { firstOrderMock } = createOrderedRangeChain(rangeMock);
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({ order: firstOrderMock }),
          }),
        };
      }
      if (table === 'user_schedule_blocks') {
        userScheduleBlocksCallCount += 1;
        if (userScheduleBlocksCallCount === 1) {
          return { upsert: scheduleUpsertMock };
        }
        const rangeMock = createRangeMock([
          [{ start_time: '2099-06-04T14:00:00', end_time: '2099-06-04T15:00:00', availability: true }],
        ]);
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              lt: jest.fn().mockReturnValue({
                gt: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({ range: rangeMock }),
                }),
              }),
            }),
          }),
        };
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
                  id: 'event-2',
                  title: '同期対象イベント',
                  public_token: 'event-2-token',
                  is_finalized: false,
                },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === 'user_event_availability_overrides') {
        const rangeMock = createRangeMock([[]]);
        const { firstOrderMock } = createOrderedRangeChain(rangeMock);
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({ order: firstOrderMock }),
            }),
          }),
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
      previewCount: 1,
    });
    expect(scheduleUpsertMock).toHaveBeenCalledWith(
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
