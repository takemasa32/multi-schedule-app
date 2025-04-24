-- スキーマとテーブル作成
CREATE SCHEMA IF NOT EXISTS public;

-- UUID拡張を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- イベントテーブル
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  public_token uuid NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
  admin_token uuid NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  is_finalized boolean NOT NULL DEFAULT false,
  final_date_id uuid,
  created_at timestamp NOT NULL DEFAULT now(),
  created_by uuid
);

-- イベント候補日程テーブル
CREATE TABLE event_dates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date_time timestamp NOT NULL,
  label text,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uniq_date_per_event UNIQUE(event_id, date_time)
);

-- final_date_idの外部キー制約を追加
ALTER TABLE events
  ADD CONSTRAINT fk_events_final_date
  FOREIGN KEY (final_date_id)
  REFERENCES event_dates(id);

-- 参加者テーブル
CREATE TABLE participants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  response_token uuid,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uniq_name_per_event UNIQUE(event_id, name)
);

-- 出欠回答テーブル
CREATE TABLE availabilities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  event_date_id uuid NOT NULL REFERENCES event_dates(id) ON DELETE CASCADE,
  availability boolean NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uniq_availability UNIQUE(participant_id, event_date_id)
);

-- インデックス作成
CREATE INDEX idx_avail_event ON availabilities(event_id);
CREATE INDEX idx_avail_participant ON availabilities(participant_id);
CREATE INDEX idx_avail_date ON availabilities(event_date_id);
CREATE INDEX idx_event_dates_event ON event_dates(event_id);

-- RLSの設定
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE availabilities ENABLE ROW LEVEL SECURITY;

-- 開発中は全テーブルに対して一時的に全許可ポリシーを設定
CREATE POLICY "Allow all for development" ON events FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON event_dates FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON participants FOR ALL USING (true);
CREATE POLICY "Allow all for development" ON availabilities FOR ALL USING (true);
