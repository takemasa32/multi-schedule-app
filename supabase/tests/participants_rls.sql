-- participants テーブル RLS/制約テスト（pgTAP）
-- テスト用: supabase test db で実行

BEGIN;
SELECT plan(6);

SET LOCAL ROLE anon;

-- 1. 公開イベントの参加者をSELECTできる
SELECT ok(EXISTS(SELECT 1 FROM participants WHERE event_id = '00000000-0000-0000-0000-000000000001'), '公開トークン一致イベントの参加者SELECT可');

-- 2. 存在しないイベントIDでSELECT不可
SELECT is((SELECT count(*) FROM participants WHERE event_id = '00000000-0000-0000-0000-000000000099'), 0::bigint, '存在しないイベントIDでSELECT不可');

-- 3. anonでINSERTできない（RLS）
SELECT throws_ok(
  $$INSERT INTO participants (id, event_id, name) VALUES ('99999999-9999-9999-9999-999999999999', '00000000-0000-0000-0000-000000000001', '不正')$$,
  'new row violates row-level security policy for table "participants"',
  'anonのINSERTはRLSで拒否される'
);

-- 4. public_token一致イベントのみINSERT可（他イベントは不可）
SELECT throws_ok(
  $$INSERT INTO participants (id, event_id, name) VALUES ('99999999-9999-9999-9999-999999999998', '99999999-9999-9999-9999-999999999997', '不正')$$,
  'new row violates row-level security policy for table "participants"',
  'anonのINSERTは対象イベントに関係なくRLSで拒否される'
);

-- 5. anonのUPDATEは対象0件で無効化される
UPDATE participants SET name = '改名' WHERE id = '00000000-0000-0000-0000-000000000201';
SELECT is(
  (SELECT name FROM participants WHERE id = '00000000-0000-0000-0000-000000000201'),
  'テスト太郎',
  'anonのUPDATEでは参加者名は変更されない'
);

-- 6. anonのDELETEは対象0件で無効化される
DELETE FROM participants WHERE id = '00000000-0000-0000-0000-000000000201';
SELECT ok(
  EXISTS(SELECT 1 FROM participants WHERE id = '00000000-0000-0000-0000-000000000201'),
  'anonのDELETEでは参加者は削除されない'
);

SELECT finish();
ROLLBACK;
