-- 新規イベント作成時にlast_accessed_atが自動で現在時刻になるようデフォルト値を設定
ALTER TABLE events
  ALTER COLUMN last_accessed_at SET DEFAULT now();

-- NULLのものにはcreated_atを設定しておく
UPDATE events
  SET last_accessed_at = created_at
  WHERE last_accessed_at IS NULL;
