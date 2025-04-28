-- INSERTポリシーをfinalized_datesテーブルに追加
CREATE POLICY "Allow insert for finalized_dates"
  ON public.finalized_dates FOR INSERT
  WITH CHECK (true); -- サーバー側で権限チェックを行うためRLSは緩めに設定

-- 既存のイベント日程を確定するためのINSERTを許可
-- （通常はサーバーサイドの認証でチェックするが、RLSの追加保護として設定）
CREATE POLICY "Allow update for finalized_dates"
  ON public.finalized_dates FOR UPDATE
  USING (true);

-- finalized_datesテーブルからの削除を許可（再確定時に使用）
CREATE POLICY "Allow delete for finalized_dates"
  ON public.finalized_dates FOR DELETE
  USING (true);