import { z } from 'zod';

export const eventInput = z
  .object({
    public_token: z
      .string()
      .min(10)
      .max(64)
      .regex(/^[A-Za-z0-9-]+$/),
  })
  .strict();
export const answerInput = eventInput
  .extend({
    name: z.string().trim().min(1).max(100),
    comment: z.string().max(2000).nullable().optional(),
    availabilities: z
      .array(z.object({ event_date_id: z.uuid(), availability: z.boolean() }).strict())
      .min(1)
      .max(1000),
  })
  .strict()
  .refine(
    (input) =>
      new Set(input.availabilities.map((row) => row.event_date_id)).size ===
      input.availabilities.length,
    '候補日時が重複しています',
  );

// DaySynthの保存形式に合わせ、日本時間の壁時計時刻で指定する。
const localHour = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):00:00$/)
  .refine((value) => {
    const date = new Date(`${value}Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 19) === value;
  }, '実在する日時を指定してください');

export const scheduleInput = z
  .object({
    start_time: localHour,
    end_time: localHour,
    availability: z.boolean(),
    allow_finalized: z.boolean().default(false),
  })
  .strict()
  .refine((input) => {
    const duration = Date.parse(`${input.end_time}Z`) - Date.parse(`${input.start_time}Z`);
    return duration > 0 && duration <= 7 * 24 * 60 * 60 * 1000;
  }, '期間は正の長さで7日以内にしてください');

export const weekInput = z.object({ week_start: z.iso.date() }).strict();
export type AnswerInput = z.infer<typeof answerInput>;
export type ScheduleInput = z.infer<typeof scheduleInput>;

export function proposedScheduleBlocks(input: ScheduleInput) {
  const end = Date.parse(`${input.end_time}Z`);
  const rows = [];
  for (let time = Date.parse(`${input.start_time}Z`); time < end; time += 3600000) {
    rows.push({
      start_time: new Date(time).toISOString(),
      end_time: new Date(time + 3600000).toISOString(),
      availability: input.availability,
    });
  }
  return rows;
}
