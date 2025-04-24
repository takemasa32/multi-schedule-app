-- パスワードハッシュを保存するカラムを追加
ALTER TABLE events 
ADD COLUMN admin_password_hash text;

-- 既存のレコードはNULL値（パスワードなし）とする
COMMENT ON COLUMN events.admin_password_hash IS 'ハッシュ化された管理者パスワード。NULLの場合はパスワードなし（tokenのみで認証）';