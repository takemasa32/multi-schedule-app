-- event_dates テーブル RLS/制約テスト（pgTAP）
-- テスト用: supabase test db で実行

BEGIN;
SELECT plan(5);

-- 1. 公開トークン一致イベントの日程SELECT可
SELECT ok(EXISTS(SELECT 1 FROM event_dates WHERE event_id = '00000000-0000-0000-0000-000000000001'), '公開トークン一致イベントの日程SELECT可');

-- 2. 存在しないイベントIDでSELECT不可
SELECT is((SELECT count(*) FROM event_dates WHERE event_id = '00000000-0000-0000-0000-000000000099'), 0::bigint, '存在しないイベントIDでSELECT不可');

-- 3. anonでINSERTできない（RLS）
SELECT throws_ok('INSERT INTO event_dates (id, event_id, date_time) VALUES (''99999999-9999-9999-9999-999999999999'', ''00000000-0000-0000-0000-000000000001'', now())', 'permission denied', 'anonはINSERTできない');

-- 4. anonでUPDATEできない
SELECT throws_ok('UPDATE event_dates SET label = ''改名'' WHERE id = ''00000000-0000-0000-0000-000000000101''', 'permission denied', 'anonはUPDATEできない');

-- 5. anonでDELETEできない
SELECT throws_ok('DELETE FROM event_dates WHERE id = ''00000000-0000-0000-0000-000000000101''', 'permission denied', 'anonはDELETEできない');

SELECT finish();
ROLLBACK;
