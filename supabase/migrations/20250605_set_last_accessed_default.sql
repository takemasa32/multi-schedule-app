-- 新規イベント作成時にlast_accessed_atが自動で現在時刻になるようデフォルト値を設定
ALTER TABLE events
  ALTER COLUMN last_accessed_at SET DEFAULT now();

-- NULLのものにはcreated_atを設定しておく
UPDATE events
  SET last_accessed_at = created_at
  WHERE last_accessed_at IS NULL;

-- create_event_with_dates 関数に last_accessed_at の設定を追加
CREATE OR REPLACE FUNCTION create_event_with_dates(
  p_title text,
  p_description text,
  p_public_token uuid,
  p_admin_token uuid,
  p_event_dates jsonb
)
RETURNS TABLE (
  event_id uuid,
  public_token uuid,
  admin_token uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_event_id uuid;
  date_record jsonb;
BEGIN
  -- イベントを作成
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
