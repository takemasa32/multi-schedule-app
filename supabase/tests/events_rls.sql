-- events テーブル RLS/制約テスト（pgTAP）
-- テスト用: supabase test db で実行

BEGIN;
SELECT plan(4);

SET LOCAL ROLE anon;

-- 1. 既存イベントをanonでSELECTできる
SELECT ok(EXISTS(SELECT 1 FROM events WHERE public_token = 'SeedToken0001'), '公開イベントをanonでSELECTできる');

-- 2. 存在しないトークンではSELECTできない
SELECT is((SELECT count(*) FROM events WHERE public_token = 'MissingToken01'), 0::bigint, '存在しないトークンでSELECTできない');

-- 3. anonはINSERTできない
SELECT throws_ok(
  $$INSERT INTO events (id, public_token, admin_token, title) VALUES ('99999999-9999-9999-9999-999999999999', 'BlockedToken1', '99999999-9999-9999-9999-999999999998', '不正')$$,
  'new row violates row-level security policy for table "events"',
  'anonのINSERTはRLSで拒否される'
);

-- 4. anonのUPDATEは対象0件で無効化される
UPDATE events SET title = '改ざん' WHERE id = '00000000-0000-0000-0000-000000000001';
SELECT is(
  (SELECT title FROM events WHERE id = '00000000-0000-0000-0000-000000000001'),
  'テストイベント',
  'anonのUPDATEではイベント内容は変更されない'
);

SELECT finish();
ROLLBACK;
