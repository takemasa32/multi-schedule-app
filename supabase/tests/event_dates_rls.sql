-- event_dates テーブル RLS/制約テスト（pgTAP）
-- テスト用: supabase test db で実行

BEGIN;
SELECT plan(5);

SET LOCAL ROLE anon;

-- 1. 公開イベントの日程をSELECTできる
SELECT ok(EXISTS(SELECT 1 FROM event_dates WHERE event_id = '00000000-0000-0000-0000-000000000001'), '公開トークン一致イベントの日程SELECT可');

-- 2. 存在しないイベントIDでSELECT不可
SELECT is((SELECT count(*) FROM event_dates WHERE event_id = '00000000-0000-0000-0000-000000000099'), 0::bigint, '存在しないイベントIDでSELECT不可');

-- 3. anonでINSERTできない（RLS）
SELECT throws_ok(
  $$INSERT INTO event_dates (id, event_id, start_time, end_time) VALUES ('99999999-9999-9999-9999-999999999999', '00000000-0000-0000-0000-000000000001', '2099-01-01 10:00:00+09', '2099-01-01 11:00:00+09')$$,
  'new row violates row-level security policy for table "event_dates"',
  'anonのINSERTはRLSで拒否される'
);

-- 4. anonのUPDATEは対象0件で無効化される
UPDATE event_dates SET label = '改名' WHERE id = '00000000-0000-0000-0000-000000000101';
SELECT is(
  (SELECT label FROM event_dates WHERE id = '00000000-0000-0000-0000-000000000101'),
  NULL::text,
  'anonのUPDATEでは日程ラベルは変更されない'
);

-- 5. anonのDELETEは対象0件で無効化される
DELETE FROM event_dates WHERE id = '00000000-0000-0000-0000-000000000101';
SELECT ok(
  EXISTS(SELECT 1 FROM event_dates WHERE id = '00000000-0000-0000-0000-000000000101'),
  'anonのDELETEでは日程は削除されない'
);

SELECT finish();
ROLLBACK;
