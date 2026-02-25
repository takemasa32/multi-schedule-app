import { saveAvailabilityOverrides, upsertUserScheduleBlock } from '@/lib/schedule-actions';
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
