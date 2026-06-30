ALTER TABLE public.participants
  ALTER COLUMN created_at TYPE timestamptz
  USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.availabilities
  ALTER COLUMN created_at TYPE timestamptz
  USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN created_at SET DEFAULT now();
