-- 確定された日程を複数保持するためのテーブル
CREATE TABLE IF NOT EXISTS public.finalized_dates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  event_date_id uuid NOT NULL REFERENCES public.event_dates(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT finalized_dates_unique UNIQUE (event_id, event_date_id)
);

-- 権限設定
ALTER TABLE public.finalized_dates ENABLE ROW LEVEL SECURITY;

-- 適切なインデックスを追加
CREATE INDEX IF NOT EXISTS idx_finalized_dates_event_id ON public.finalized_dates(event_id);

-- RLSポリシー（基本的にはイベントと同様のアクセス制限）
CREATE POLICY "Everyone with event token can read finalized dates"
  ON public.finalized_dates FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = finalized_dates.event_id
  ));

-- 既存データの移行（events.final_date_idが設定されているものがあれば）
INSERT INTO public.finalized_dates (event_id, event_date_id)
SELECT id, final_date_id
FROM public.events
WHERE is_finalized = true
AND final_date_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 注意：将来的にはfinal_date_idフィールドは削除することも検討できますが、
-- 互換性のために一時的に残しておきます。
