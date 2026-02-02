-- Auth.js用スキーマ（Supabase Authとは分離）
CREATE SCHEMA IF NOT EXISTS authjs;

-- Auth.js Adapter用テーブル
CREATE TABLE IF NOT EXISTS authjs.users (
  id text PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text,
  email text UNIQUE,
  "emailVerified" timestamptz,
  image text
);

CREATE TABLE IF NOT EXISTS authjs.accounts (
  id text PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" text NOT NULL REFERENCES authjs.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  provider text NOT NULL,
  "providerAccountId" text NOT NULL,
  refresh_token text,
  access_token text,
  expires_at bigint,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  oauth_token_secret text,
  oauth_token text,
  UNIQUE (provider, "providerAccountId")
);

CREATE TABLE IF NOT EXISTS authjs.sessions (
  id text PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" text NOT NULL REFERENCES authjs.users(id) ON DELETE CASCADE,
  "sessionToken" text NOT NULL UNIQUE,
  expires timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS authjs.verification_token (
  identifier text NOT NULL,
  token text NOT NULL,
  expires timestamptz NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- イベント閲覧履歴（Auth.jsのユーザーIDと紐づける）
CREATE TABLE IF NOT EXISTS event_access_histories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id text NOT NULL,
  event_public_token text NOT NULL REFERENCES events(public_token) ON DELETE CASCADE,
  event_title text NOT NULL,
  is_created_by_me boolean NOT NULL DEFAULT false,
  first_accessed_at timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz NOT NULL DEFAULT now(),
  access_count integer NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS event_access_histories_user_event_idx
  ON event_access_histories (user_id, event_public_token);

CREATE INDEX IF NOT EXISTS event_access_histories_last_accessed_idx
  ON event_access_histories (user_id, last_accessed_at DESC);

ALTER TABLE event_access_histories ENABLE ROW LEVEL SECURITY;

-- イベント履歴を安全にupsertするRPC
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
AS $$
DECLARE
  existing_record event_access_histories;
BEGIN
  SELECT * INTO existing_record
  FROM event_access_histories
  WHERE user_id = p_user_id
    AND event_public_token = p_event_public_token;

  IF FOUND THEN
    UPDATE event_access_histories
    SET event_title = p_event_title,
        is_created_by_me = (event_access_histories.is_created_by_me OR p_is_created_by_me),
        last_accessed_at = GREATEST(event_access_histories.last_accessed_at, p_accessed_at),
        access_count = event_access_histories.access_count + 1
    WHERE user_id = p_user_id
      AND event_public_token = p_event_public_token
    RETURNING * INTO existing_record;

    RETURN existing_record;
  END IF;

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
  RETURNING * INTO existing_record;

  RETURN existing_record;
END;
$$;

COMMENT ON FUNCTION upsert_event_access_history(text, text, text, boolean, timestamptz)
  IS 'イベント閲覧履歴をユーザー単位でupsertし、アクセス回数と最終アクセス日時を更新する。';
