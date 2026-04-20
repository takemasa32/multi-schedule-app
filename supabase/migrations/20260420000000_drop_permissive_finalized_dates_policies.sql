-- finalized_dates の過剰に広い書き込みポリシーを削除し、
-- 読み取り専用方針（公開リンク閲覧）と整合させる。
-- 書き込みは server-side service_role 運用で実施する。

DROP POLICY IF EXISTS "Allow insert for finalized_dates" ON public.finalized_dates;
DROP POLICY IF EXISTS "Allow update for finalized_dates" ON public.finalized_dates;
DROP POLICY IF EXISTS "Allow delete for finalized_dates" ON public.finalized_dates;
