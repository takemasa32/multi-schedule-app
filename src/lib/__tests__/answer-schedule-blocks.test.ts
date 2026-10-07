import { upsertUserScheduleBlocks } from '@/lib/schedule-service';
import { createSupabaseAdmin } from '@/lib/supabase';

jest.mock('@/lib/auth', () => ({ getAuthSession: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ createSupabaseAdmin: jest.fn() }));
const dates = [
  { id: 'long', start_time: '2026-10-12T10:00:00Z', end_time: '2026-10-12T12:00:00Z' },
  { id: 'short', start_time: '2026-10-12T10:00:00Z', end_time: '2026-10-12T11:00:00Z' },
];
describe('Web回答をアカウント予定へ保存する', () => {
  const upsert = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    upsert.mockResolvedValue({ error: null });
    (createSupabaseAdmin as jest.Mock).mockReturnValue({ from: () => ({ upsert }) });
  });
  it.each([true, false])(
    '重なる候補の回答が一致する場合は各予定枠を一度だけ保存する（可=%s）',
    async (available) => {
      await expect(
        upsertUserScheduleBlocks({
          userId: 'me',
          eventId: 'event',
          eventDates: dates,
          selectedDateIds: available ? ['long', 'short'] : [],
        }),
      ).resolves.toEqual({ success: true });
      const payload = upsert.mock.calls[0][0];
      expect(payload).toHaveLength(2);
      expect(payload.map((row: { start_time: string }) => row.start_time)).toEqual([
        '2026-10-12T10:00:00.000Z',
        '2026-10-12T11:00:00.000Z',
      ]);
      expect(
        payload.every((row: { availability: boolean }) => row.availability === available),
      ).toBe(true);
    },
  );
  it('同じ予定枠に可と不可がある場合はDBへ保存しない', async () => {
    await expect(
      upsertUserScheduleBlocks({
        userId: 'me',
        eventId: 'event',
        eventDates: dates,
        selectedDateIds: ['long'],
      }),
    ).resolves.toMatchObject({ success: false, message: expect.stringContaining('矛盾') });
    expect(upsert).not.toHaveBeenCalled();
  });
});
