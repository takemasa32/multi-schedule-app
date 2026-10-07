import { answerScheduleAvailability, loadAnswerSchedule } from '@/lib/mcp/answer-context';
import type { PoolClient } from 'pg';

const date = { id: 'date', start_time: '2026-10-12T19:00:00Z', end_time: '2026-10-12T20:00:00Z' };
describe('MCPの予定による回答補完', () => {
  it('情報なしと部分的な空き時間を参加可能と推測しない', () => {
    expect(answerScheduleAvailability(date, { blocks: [], busy: [] })).toBeNull();
    expect(
      answerScheduleAvailability(date, {
        blocks: [
          { start_time: date.start_time, end_time: '2026-10-12T19:30:00Z', availability: true },
        ],
        busy: [],
      }),
    ).toBeNull();
  });
  it('空き時間が全体を覆えば可、不可または確定日程の重複があれば不可にする', () => {
    const context = {
      blocks: [{ start_time: date.start_time, end_time: date.end_time, availability: true }],
      busy: [],
    };
    expect(answerScheduleAvailability(date, context)).toBe(true);
    expect(
      answerScheduleAvailability(date, {
        ...context,
        blocks: [
          ...context.blocks,
          { start_time: '2026-10-12T19:30:00Z', end_time: date.end_time, availability: false },
        ],
      }),
    ).toBe(false);
    expect(answerScheduleAvailability(date, { ...context, busy: [date] })).toBe(false);
  });
  it('期間限定で取得し、日本時間の壁時計時刻を9時間ずらさない', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    await loadAnswerSchedule({ query } as unknown as PoolClient, 'me', 'event', [date]);
    expect(query.mock.calls[0][1]).toEqual([
      'me',
      '2026-10-12T19:00:00.000Z',
      '2026-10-12T20:00:00.000Z',
    ]);
  });
});
