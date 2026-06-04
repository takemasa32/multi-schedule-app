-- availabilities テーブル RLS/制約テスト（pgTAP）
-- テスト用: supabase test db で実行

BEGIN;
SELECT plan(6);

SET LOCAL ROLE anon;

-- 1. 公開イベントの出欠をSELECTできる
SELECT ok(EXISTS(SELECT 1 FROM availabilities WHERE event_id = '00000000-0000-0000-0000-000000000001'), '公開トークン一致イベントの出欠SELECT可');

-- 2. 存在しないイベントIDでSELECT不可
SELECT is((SELECT count(*) FROM availabilities WHERE event_id = '00000000-0000-0000-0000-000000000099'), 0::bigint, '存在しないイベントIDでSELECT不可');

-- 3. anonでINSERTできない（RLS）
SELECT throws_ok(
  $$INSERT INTO availabilities (id, event_id, participant_id, event_date_id, availability) VALUES ('99999999-9999-9999-9999-999999999999', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000102', true)$$,
  'new row violates row-level security policy for table "availabilities"',
  'anonのINSERTはRLSで拒否される'
);

-- 4. public_token一致イベントのみINSERT可（他イベントは不可）
SELECT throws_ok(
  $$INSERT INTO availabilities (id, event_id, participant_id, event_date_id, availability) VALUES ('99999999-9999-9999-9999-999999999998', '99999999-9999-9999-9999-999999999997', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000102', true)$$,
  'new row violates row-level security policy for table "availabilities"',
  'anonのINSERTは対象イベントに関係なくRLSで拒否される'
);

-- 5. anonのUPDATEは対象0件で無効化される
UPDATE availabilities SET availability = false WHERE id = '00000000-0000-0000-0000-000000000301';
SELECT is(
  (SELECT availability FROM availabilities WHERE id = '00000000-0000-0000-0000-000000000301'),
  true,
  'anonのUPDATEでは出欠は変更されない'
);

-- 6. anonのDELETEは対象0件で無効化される
DELETE FROM availabilities WHERE id = '00000000-0000-0000-0000-000000000301';
SELECT ok(
  EXISTS(SELECT 1 FROM availabilities WHERE id = '00000000-0000-0000-0000-000000000301'),
  'anonのDELETEでは出欠は削除されない'
);

SELECT finish();
ROLLBACK;
