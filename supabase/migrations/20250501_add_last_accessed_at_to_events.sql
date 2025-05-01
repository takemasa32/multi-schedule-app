-- イベントの最終アクセス日時カラム追加
ALTER TABLE events ADD COLUMN IF NOT EXISTS last_accessed_at timestamp;
-- 既存イベントにはcreated_atをセット（NULLのままでもOKだが、初期値として）
UPDATE events SET last_accessed_at = created_at WHERE last_accessed_at IS NULL;