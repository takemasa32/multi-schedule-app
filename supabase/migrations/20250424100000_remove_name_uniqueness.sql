-- 同名参加者を許可するために、participants テーブルの event_id と name のユニーク制約を削除
ALTER TABLE IF EXISTS participants DROP CONSTRAINT IF EXISTS uniq_name_per_event;