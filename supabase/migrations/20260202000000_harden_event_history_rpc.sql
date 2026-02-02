-- イベント閲覧履歴RPCの安全性と競合耐性を強化

-- user_id と authjs.users の整合性を担保する
ALTER TABLE event_access_histories
  ADD CONSTRAINT event_access_histories_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES authjs.users(id)
  ON DELETE CASCADE;

-- 競合に強い upsert へ置き換え
CREATE OR REPLACE FUNCTION upsert_event_access_history(
  p_user_id text,
  p_event_public_token text,
  p_event_title text,
  p_is_created_by_me boolean,
  p_accessed_at timestamptz
)
RETURNS event_access_histories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, authjs
AS $$
DECLARE
  result_record event_access_histories;
BEGIN
  INSERT INTO event_access_histories (
    user_id,
    event_public_token,
    event_title,
    is_created_by_me,
    first_accessed_at,
    last_accessed_at,
    access_count
  )
  VALUES (
    p_user_id,
    p_event_public_token,
    p_event_title,
    p_is_created_by_me,
    p_accessed_at,
    p_accessed_at,
    1
  )
  ON CONFLICT (user_id, event_public_token)
  DO UPDATE SET
    event_title = EXCLUDED.event_title,
    is_created_by_me = (event_access_histories.is_created_by_me OR EXCLUDED.is_created_by_me),
    last_accessed_at = GREATEST(event_access_histories.last_accessed_at, EXCLUDED.last_accessed_at),
    access_count = event_access_histories.access_count + 1
  RETURNING * INTO result_record;

  RETURN result_record;
END;
$$;

COMMENT ON FUNCTION upsert_event_access_history(text, text, text, boolean, timestamptz)
  IS 'イベント閲覧履歴をユーザー単位でupsertし、アクセス回数と最終アクセス日時を更新する。';

-- 関数の実行権限を公開しない（service_roleのみ利用）
REVOKE EXECUTE ON FUNCTION upsert_event_access_history(text, text, text, boolean, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION upsert_event_access_history(text, text, text, boolean, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION upsert_event_access_history(text, text, text, boolean, timestamptz) FROM authenticated;
