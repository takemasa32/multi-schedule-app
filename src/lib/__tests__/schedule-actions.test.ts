import {
  applyUserAvailabilitySyncForEvent,
  saveUserScheduleBlockChanges,
  saveAvailabilityOverrides,
  upsertUserScheduleBlock,
  upsertWeeklyTemplatesFromWeekdaySelections,
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
      if (table === 'user_schedule_templates') {
        const sourceEqMock = jest.fn().mockResolvedValue({ data: [], error: null });
        const userEqMock = jest.fn().mockReturnValue({ eq: sourceEqMock });
        return { select: jest.fn().mockReturnValue({ eq: userEqMock }) };
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
      if (table === 'availabilities' && fromMock.mock.calls.length === 8) {
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

describe('upsertWeeklyTemplatesFromWeekdaySelections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuthSession.mockResolvedValue({
      user: { id: 'user-1' },
    });
  });

  it('空配列は allowClear=false ならエラーを返す', async () => {
    const result = await upsertWeeklyTemplatesFromWeekdaySelections({
      templates: [],
    });

    expect(result).toEqual({
      success: false,
      message: '保存対象の設定がありません',
      updatedCount: 0,
    });
    expect(mockedCreateSupabaseAdmin).not.toHaveBeenCalled();
  });

  it('空配列でも allowClear=true なら手動テンプレを全削除できる', async () => {
    const existingRows = [
      {
        id: 'old-1',
        weekday: 1,
        start_time: '08:00:00',
        end_time: '09:00:00',
        availability: false,
      },
    ];
    const selectSecondEqMock = jest.fn().mockResolvedValue({ data: existingRows, error: null });
    const selectFirstEqMock = jest.fn().mockReturnValue({ eq: selectSecondEqMock });
    const selectMock = jest.fn().mockReturnValue({ eq: selectFirstEqMock });
    const deleteInMock = jest.fn().mockResolvedValue({ error: null });
    const deleteSecondEqMock = jest.fn().mockReturnValue({ in: deleteInMock });
    const deleteFirstEqMock = jest.fn().mockReturnValue({ eq: deleteSecondEqMock });
    const deleteMock = jest.fn().mockReturnValue({ eq: deleteFirstEqMock });
    const fromMock = jest
      .fn()
      .mockReturnValueOnce({ select: selectMock })
      .mockReturnValueOnce({ delete: deleteMock });
    mockedCreateSupabaseAdmin.mockReturnValue({ from: fromMock });

    const result = await upsertWeeklyTemplatesFromWeekdaySelections({
      templates: [],
      allowClear: true,
    });

    expect(result).toEqual({ success: true, updatedCount: 0 });
    expect(deleteFirstEqMock).toHaveBeenCalledWith('user_id', 'user-1');
    expect(deleteSecondEqMock).toHaveBeenCalledWith('source', 'manual');
    expect(deleteInMock).toHaveBeenCalledWith('id', ['old-1']);
  });

  it('終了が 00:00 の時間帯は 24:00 に正規化して保存する', async () => {
    const selectSecondEqMock = jest.fn().mockResolvedValue({ data: [], error: null });
    const selectFirstEqMock = jest.fn().mockReturnValue({ eq: selectSecondEqMock });
    const selectMock = jest.fn().mockReturnValue({ eq: selectFirstEqMock });
    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    const fromMock = jest
      .fn()
      .mockReturnValueOnce({ select: selectMock })
      .mockReturnValueOnce({ upsert: upsertMock });
    mockedCreateSupabaseAdmin.mockReturnValue({ from: fromMock });

    const result = await upsertWeeklyTemplatesFromWeekdaySelections({
      templates: [
        {
          weekday: 1,
          startTime: '23:00',
          endTime: '00:00',
          availability: true,
        },
      ],
    });

    expect(result).toEqual({ success: true, updatedCount: 1 });
    expect(upsertMock).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          user_id: 'user-1',
          weekday: 1,
          start_time: '23:00',
          end_time: '24:00',
          availability: true,
          source: 'manual',
        }),
      ],
      { onConflict: 'user_id,weekday,start_time,end_time,source' },
    );
    expect(selectFirstEqMock).toHaveBeenCalledWith('user_id', 'user-1');
    expect(selectSecondEqMock).toHaveBeenCalledWith('source', 'manual');
  });

  it('replaceExisting 未指定では入力外の既存行を維持する', async () => {
    const existingRows = [
      {
        id: 'old-1',
        weekday: 1,
        start_time: '08:00:00',
        end_time: '09:00:00',
        availability: false,
      },
      {
        id: 'old-2',
        weekday: 1,
        start_time: '10:00:00',
        end_time: '11:00:00',
        availability: true,
      },
    ];
    const selectSecondEqMock = jest.fn().mockResolvedValue({ data: existingRows, error: null });
    const selectFirstEqMock = jest.fn().mockReturnValue({ eq: selectSecondEqMock });
    const selectMock = jest.fn().mockReturnValue({ eq: selectFirstEqMock });
    const upsertMock = jest.fn().mockResolvedValue({ error: null });

    const fromMock = jest
      .fn()
      .mockReturnValueOnce({ select: selectMock })
      .mockReturnValueOnce({ upsert: upsertMock });
    mockedCreateSupabaseAdmin.mockReturnValue({ from: fromMock });

    const result = await upsertWeeklyTemplatesFromWeekdaySelections({
      templates: [
        {
          weekday: 1,
          startTime: '08:00',
          endTime: '09:00',
          availability: false,
        },
      ],
    });

    expect(result).toEqual({ success: true, updatedCount: 2 });
    expect(fromMock).toHaveBeenCalledTimes(2);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          user_id: 'user-1',
          weekday: 1,
          start_time: '08:00',
          end_time: '09:00',
          availability: false,
          source: 'manual',
        }),
        expect.objectContaining({
          user_id: 'user-1',
          weekday: 1,
          start_time: '10:00',
          end_time: '11:00',
          availability: true,
          source: 'manual',
        }),
      ]),
      { onConflict: 'user_id,weekday,start_time,end_time,source' },
    );
  });

  it('replaceExisting=true なら入力外の既存行を削除する', async () => {
    const existingRows = [
      {
        id: 'old-1',
        weekday: 1,
        start_time: '08:00:00',
        end_time: '09:00:00',
        availability: false,
      },
      {
        id: 'old-2',
        weekday: 1,
        start_time: '10:00:00',
        end_time: '11:00:00',
        availability: true,
      },
    ];
    const selectSecondEqMock = jest.fn().mockResolvedValue({ data: existingRows, error: null });
    const selectFirstEqMock = jest.fn().mockReturnValue({ eq: selectSecondEqMock });
    const selectMock = jest.fn().mockReturnValue({ eq: selectFirstEqMock });
    const upsertMock = jest.fn().mockResolvedValue({ error: null });

    const deleteInMock = jest.fn().mockResolvedValue({ error: null });
    const deleteSecondEqMock = jest.fn().mockReturnValue({ in: deleteInMock });
    const deleteFirstEqMock = jest.fn().mockReturnValue({ eq: deleteSecondEqMock });
    const deleteMock = jest.fn().mockReturnValue({ eq: deleteFirstEqMock });

    const fromMock = jest
      .fn()
      .mockReturnValueOnce({ select: selectMock })
      .mockReturnValueOnce({ upsert: upsertMock })
      .mockReturnValueOnce({ delete: deleteMock });
    mockedCreateSupabaseAdmin.mockReturnValue({ from: fromMock });

    const result = await upsertWeeklyTemplatesFromWeekdaySelections({
      templates: [
        {
          weekday: 1,
          startTime: '08:00',
          endTime: '09:00',
          availability: false,
        },
      ],
      replaceExisting: true,
    });

    expect(result).toEqual({ success: true, updatedCount: 1 });
    expect(upsertMock).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          user_id: 'user-1',
          weekday: 1,
          start_time: '08:00',
          end_time: '09:00',
          availability: false,
          source: 'manual',
        }),
      ],
      { onConflict: 'user_id,weekday,start_time,end_time,source' },
    );
    expect(deleteFirstEqMock).toHaveBeenCalledWith('user_id', 'user-1');
    expect(deleteSecondEqMock).toHaveBeenCalledWith('source', 'manual');
    expect(deleteInMock).toHaveBeenCalledWith('id', ['old-2']);
  });

  it('重複・重なりを圧縮し、不要な既存テンプレ行を削除する', async () => {
    const existingRows = [
      {
        id: 'old-1',
        weekday: 1,
        start_time: '08:00:00',
        end_time: '09:00:00',
        availability: false,
      },
    ];
    const selectSecondEqMock = jest.fn().mockResolvedValue({ data: existingRows, error: null });
    const selectFirstEqMock = jest.fn().mockReturnValue({ eq: selectSecondEqMock });
    const selectMock = jest.fn().mockReturnValue({ eq: selectFirstEqMock });

    const upsertMock = jest.fn().mockResolvedValue({ error: null });

    const deleteInMock = jest.fn().mockResolvedValue({ error: null });
    const deleteSecondEqMock = jest.fn().mockReturnValue({ in: deleteInMock });
    const deleteFirstEqMock = jest.fn().mockReturnValue({ eq: deleteSecondEqMock });
    const deleteMock = jest.fn().mockReturnValue({ eq: deleteFirstEqMock });

    const fromMock = jest
      .fn()
      .mockReturnValueOnce({ select: selectMock })
      .mockReturnValueOnce({ upsert: upsertMock })
      .mockReturnValueOnce({ delete: deleteMock });
    mockedCreateSupabaseAdmin.mockReturnValue({ from: fromMock });

    const result = await upsertWeeklyTemplatesFromWeekdaySelections({
      templates: [
        {
          weekday: 1,
          startTime: '08:00',
          endTime: '10:00',
          availability: false,
        },
      ],
    });

    expect(result).toEqual({ success: true, updatedCount: 1 });
    expect(upsertMock).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          user_id: 'user-1',
          weekday: 1,
          start_time: '08:00',
          end_time: '10:00',
          availability: false,
          source: 'manual',
        }),
      ],
      { onConflict: 'user_id,weekday,start_time,end_time,source' },
    );
    expect(deleteFirstEqMock).toHaveBeenCalledWith('user_id', 'user-1');
    expect(deleteSecondEqMock).toHaveBeenCalledWith('source', 'manual');
    expect(deleteInMock).toHaveBeenCalledWith('id', ['old-1']);
  });

  it('不要行整理に失敗しても upsert 成功時は警告付きで success=true を返す', async () => {
    const existingRows = [
      {
        id: 'old-1',
        weekday: 1,
        start_time: '08:00:00',
        end_time: '09:00:00',
        availability: false,
      },
    ];
    const selectSecondEqMock = jest.fn().mockResolvedValue({ data: existingRows, error: null });
    const selectFirstEqMock = jest.fn().mockReturnValue({ eq: selectSecondEqMock });
    const selectMock = jest.fn().mockReturnValue({ eq: selectFirstEqMock });

    const upsertMock = jest.fn().mockResolvedValue({ error: null });

    const deleteInMock = jest.fn().mockResolvedValue({ error: { message: 'delete failed' } });
    const deleteSecondEqMock = jest.fn().mockReturnValue({ in: deleteInMock });
    const deleteFirstEqMock = jest.fn().mockReturnValue({ eq: deleteSecondEqMock });
    const deleteMock = jest.fn().mockReturnValue({ eq: deleteFirstEqMock });

    const fromMock = jest
      .fn()
      .mockReturnValueOnce({ select: selectMock })
      .mockReturnValueOnce({ upsert: upsertMock })
      .mockReturnValueOnce({ delete: deleteMock });
    mockedCreateSupabaseAdmin.mockReturnValue({ from: fromMock });

    const result = await upsertWeeklyTemplatesFromWeekdaySelections({
      templates: [
        {
          weekday: 1,
          startTime: '08:00',
          endTime: '10:00',
          availability: false,
        },
      ],
    });

    expect(result).toEqual({
      success: true,
      message:
        '週ごとの用事は保存されましたが、一部の古いデータの整理に失敗しました。時間をおいてページを再読み込みしてください。',
      updatedCount: 1,
    });
    expect(deleteInMock).toHaveBeenCalledWith('id', ['old-1']);
  });
});
