-- アカウント予定連携のためのテーブルを追加

-- ユーザーとイベントの紐付け
CREATE TABLE IF NOT EXISTS public.user_event_links (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  user_id text NOT NULL REFERENCES authjs.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES public.participants(id) ON DELETE SET NULL,
  auto_sync boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_event_links_user_event_idx
  ON public.user_event_links (user_id, event_id);

CREATE UNIQUE INDEX IF NOT EXISTS user_event_links_participant_idx
  ON public.user_event_links (participant_id)
  WHERE participant_id IS NOT NULL;

ALTER TABLE public.user_event_links ENABLE ROW LEVEL SECURITY;

-- ユーザーの予定ブロック（実日時）
CREATE TABLE IF NOT EXISTS public.user_schedule_blocks (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  user_id text NOT NULL REFERENCES authjs.users(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  availability boolean NOT NULL,
  source text NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_schedule_blocks_time_check CHECK (start_time < end_time)
);

CREATE UNIQUE INDEX IF NOT EXISTS user_schedule_blocks_user_time_idx
  ON public.user_schedule_blocks (user_id, start_time, end_time);

ALTER TABLE public.user_schedule_blocks ENABLE ROW LEVEL SECURITY;

-- 週次テンプレ（手動/学習）
CREATE TABLE IF NOT EXISTS public.user_schedule_templates (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  user_id text NOT NULL REFERENCES authjs.users(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  availability boolean NOT NULL,
  source text NOT NULL,
  sample_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_schedule_templates_time_check CHECK (start_time < end_time)
);

CREATE UNIQUE INDEX IF NOT EXISTS user_schedule_templates_user_time_idx
  ON public.user_schedule_templates (user_id, weekday, start_time, end_time, source);

ALTER TABLE public.user_schedule_templates ENABLE ROW LEVEL SECURITY;

-- 手動上書き（イベント内のみ）
CREATE TABLE IF NOT EXISTS public.user_event_availability_overrides (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  user_id text NOT NULL REFERENCES authjs.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  event_date_id uuid NOT NULL REFERENCES public.event_dates(id) ON DELETE CASCADE,
  availability boolean NOT NULL,
  reason text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_event_availability_overrides_idx
  ON public.user_event_availability_overrides (user_id, event_id, event_date_id);

ALTER TABLE public.user_event_availability_overrides ENABLE ROW LEVEL SECURITY;
