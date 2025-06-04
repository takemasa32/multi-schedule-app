-- 参加者テーブルにコメント列を追加
ALTER TABLE participants
  ADD COLUMN IF NOT EXISTS comment text;
