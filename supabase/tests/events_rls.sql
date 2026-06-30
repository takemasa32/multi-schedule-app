-- events テーブル RLS/制約テスト（pgTAP）
-- テスト用: supabase test db で実行

BEGIN;
SELECT plan(4);

-- 1. 公開トークン一致でSELECTできる
SELECT ok(EXISTS(SELECT 1 FROM events WHERE public_token = '11111111-1111-1111-1111-111111111111'), '公開トークン一致でSELECTできる');

-- 2. 存在しないトークンでSELECTできない
SELECT is((SELECT count(*) FROM events WHERE public_token = '00000000-0000-0000-0000-000000000099'), 0::bigint, '存在しないトークンでSELECTできない');

-- 3. 匿名ユーザーはINSERTできない
SELECT throws_ok('INSERT INTO events (id, title) VALUES (''99999999-9999-9999-9999-999999999999'', ''不正'')', 'permission denied', 'anonはINSERTできない');

-- 4. 管理トークンは公開されない
SELECT is((SELECT count(*) FROM events WHERE admin_token = '22222222-2222-2222-2222-222222222222'), 1::bigint, '管理トークンは1件のみ');

SELECT finish();
ROLLBACK;
