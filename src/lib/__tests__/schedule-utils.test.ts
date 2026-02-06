import { computeAutoFillAvailability } from '@/lib/schedule-utils';

describe('computeAutoFillAvailability', () => {
  it('可は内包のみを反映する', () => {
    const result = computeAutoFillAvailability({
      start: '2026-02-05T10:00:00.000Z',
      end: '2026-02-05T11:00:00.000Z',
      blocks: [
        {
          start_time: '2026-02-05T09:00:00.000Z',
          end_time: '2026-02-05T12:00:00.000Z',
          availability: true,
        },
      ],
      templates: [],
    });

    expect(result).toBe(true);
  });

  it('不可は重なりで反映する', () => {
    const result = computeAutoFillAvailability({
      start: '2026-02-05T10:00:00.000Z',
      end: '2026-02-05T12:00:00.000Z',
      blocks: [
        {
          start_time: '2026-02-05T11:30:00.000Z',
          end_time: '2026-02-05T13:00:00.000Z',
          availability: false,
        },
      ],
      templates: [],
    });

    expect(result).toBe(false);
  });

  it('不可が優先される', () => {
    const result = computeAutoFillAvailability({
      start: '2026-02-05T10:00:00.000Z',
      end: '2026-02-05T11:00:00.000Z',
      blocks: [
        {
          start_time: '2026-02-05T09:00:00.000Z',
          end_time: '2026-02-05T12:00:00.000Z',
          availability: true,
        },
        {
          start_time: '2026-02-05T10:30:00.000Z',
          end_time: '2026-02-05T10:45:00.000Z',
          availability: false,
        },
      ],
      templates: [],
    });

    expect(result).toBe(false);
  });

  it('テンプレの不可は重なりで反映する', () => {
    const weekday = new Date('2026-02-02T10:30:00.000Z').getDay();
    const result = computeAutoFillAvailability({
      start: '2026-02-02T10:30:00.000Z',
      end: '2026-02-02T11:30:00.000Z',
      blocks: [],
      templates: [
        {
          weekday,
          start_time: '10:00',
          end_time: '11:00',
          availability: false,
          source: 'manual',
          sample_count: 1,
        },
      ],
    });

    expect(result).toBe(false);
  });

  it('テンプレの可は内包のみ反映する', () => {
    const weekday = new Date('2026-02-02T10:15:00.000Z').getDay();
    const result = computeAutoFillAvailability({
      start: '2026-02-02T10:15:00.000Z',
      end: '2026-02-02T10:45:00.000Z',
      blocks: [],
      templates: [
        {
          weekday,
          start_time: '10:00',
          end_time: '11:00',
          availability: true,
          source: 'manual',
          sample_count: 1,
        },
      ],
    });

    expect(result).toBe(true);
  });

  it('判定できない場合はnullを返す', () => {
    const weekday = new Date('2026-02-02T10:00:00.000Z').getDay();
    const result = computeAutoFillAvailability({
      start: '2026-02-02T10:00:00.000Z',
      end: '2026-02-02T12:00:00.000Z',
      blocks: [],
      templates: [
        {
          weekday,
          start_time: '10:00',
          end_time: '11:00',
          availability: true,
          source: 'manual',
          sample_count: 1,
        },
      ],
    });

    expect(result).toBeNull();
  });

  it('タイムゾーン付きブロックでもローカル時刻基準で重なり判定する', () => {
    const result = computeAutoFillAvailability({
      start: '2026-02-05T10:00:00',
      end: '2026-02-05T12:00:00',
      blocks: [
        {
          start_time: '2026-02-05T10:30:00+00:00',
          end_time: '2026-02-05T11:00:00+00:00',
          availability: false,
        },
      ],
      templates: [],
    });

    expect(result).toBe(false);
  });
});
