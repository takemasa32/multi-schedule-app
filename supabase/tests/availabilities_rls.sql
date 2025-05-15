-- availabilities テーブル RLS/制約テスト（pgTAP）
-- テスト用: supabase test db で実行

BEGIN;
SELECT plan(7);

-- 1. 公開トークン一致イベントの出欠SELECT可
SELECT ok(EXISTS(SELECT 1 FROM availabilities WHERE event_id = '00000000-0000-0000-0000-000000000001'), '公開トークン一致イベントの出欠SELECT可');

-- 2. 存在しないイベントIDでSELECT不可
SELECT is((SELECT count(*) FROM availabilities WHERE event_id = '00000000-0000-0000-0000-000000000099'), 0::bigint, '存在しないイベントIDでSELECT不可');

-- 3. anonでINSERTできない（RLS）
SELECT throws_ok('INSERT INTO availabilities (id, event_id, participant_id, event_date_id, availability) VALUES (''99999999-9999-9999-9999-999999999999'', ''00000000-0000-0000-0000-000000000001'', ''00000000-0000-0000-0000-000000000201'', ''00000000-0000-0000-0000-000000000101'', true)', 'permission denied', 'anonはINSERTできない');

-- 4. public_token一致イベントのみINSERT可（他イベントは不可）
SELECT throws_ok('INSERT INTO availabilities (id, event_id, participant_id, event_date_id, availability) VALUES (''99999999-9999-9999-9999-999999999998'', ''99999999-9999-9999-9999-999999999998'', ''00000000-0000-0000-0000-000000000201'', ''00000000-0000-0000-0000-000000000101'', true)', 'permission denied', 'public_token不一致イベントにはINSERT不可');

-- 5. UPDATE禁止
SELECT throws_ok('UPDATE availabilities SET availability = false WHERE id = ''00000000-0000-0000-0000-000000000301''', 'permission denied', 'anonはUPDATEできない');

-- 6. DELETE禁止
SELECT throws_ok('DELETE FROM availabilities WHERE id = ''00000000-0000-0000-0000-000000000301''', 'permission denied', 'anonはDELETEできない');

-- 7. participant_id,event_date_idユニーク制約違反
SELECT throws_ok('INSERT INTO availabilities (event_id, participant_id, event_date_id, availability) VALUES (''00000000-0000-0000-0000-000000000001'', ''00000000-0000-0000-0000-000000000201'', ''00000000-0000-0000-0000-000000000101'', true)', 'duplicate key value violates unique constraint', 'participant_id,event_date_idユニーク制約違反でエラー');

SELECT finish();
ROLLBACK;
