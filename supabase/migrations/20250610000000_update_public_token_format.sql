-- 公開トークンをUUIDから短い英数字トークンへ移行する
-- URL共有しやすい形式を採用するため、events.public_tokenをtext型へ変更する

ALTER TABLE events
  ALTER COLUMN public_token DROP DEFAULT;

ALTER TABLE events
  ALTER COLUMN public_token TYPE text USING public_token::text;

ALTER TABLE events
  ALTER COLUMN public_token SET NOT NULL;

-- 長さに関する最小要件を追加し、意図しない空文字や極端に短い値を防ぐ
ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_public_token_length_check;

ALTER TABLE events
  ADD CONSTRAINT events_public_token_length_check CHECK (char_length(public_token) BETWEEN 10 AND 64);

-- トランザクション関数を新しい型定義に合わせて再定義する
DROP FUNCTION IF EXISTS create_event_with_dates(text, text, uuid, uuid, jsonb);

CREATE OR REPLACE FUNCTION create_event_with_dates(
  p_title text,
  p_description text,
  p_public_token text,
  p_admin_token uuid,
  p_event_dates jsonb
)
RETURNS TABLE (
  event_id uuid,
  public_token text,
  admin_token uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_event_id uuid;
  date_record jsonb;
BEGIN
  -- イベントを作成（last_accessed_atは自動設定）
  INSERT INTO events (title, description, public_token, admin_token, last_accessed_at)
  VALUES (p_title, p_description, p_public_token, p_admin_token, now())
  RETURNING id INTO new_event_id;

  -- 候補日程を挿入
  FOR date_record IN SELECT * FROM jsonb_array_elements(p_event_dates)
  LOOP
    INSERT INTO event_dates (event_id, start_time, end_time)
    VALUES (
      new_event_id,
      (date_record->>'start_time')::timestamp,
      (date_record->>'end_time')::timestamp
    );
  END LOOP;

  -- 結果を返す
  RETURN QUERY SELECT new_event_id, p_public_token, p_admin_token;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;
