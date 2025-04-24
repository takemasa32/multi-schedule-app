-- event_datesテーブルのスキーマを変更し、単一のdate_timeから開始/終了時刻のペアに変更
ALTER TABLE event_dates
  DROP COLUMN date_time,
  ADD COLUMN start_time TIMESTAMP NOT NULL,
  ADD COLUMN end_time TIMESTAMP NOT NULL;

-- date_timeに基づく既存のユニーク制約を削除し、新しいstart_time, end_timeに対応するものを追加
ALTER TABLE IF EXISTS event_dates DROP CONSTRAINT IF EXISTS uniq_date_per_event;
ALTER TABLE event_dates ADD CONSTRAINT uniq_timerange_per_event UNIQUE(event_id, start_time, end_time);