-- participants テーブル RLS/制約テスト（pgTAP）
-- テスト用: supabase test db で実行

BEGIN;
SELECT plan(7);

-- 1. 公開トークン一致イベントの参加者SELECT可
SELECT ok(EXISTS(SELECT 1 FROM participants WHERE event_id = '00000000-0000-0000-0000-000000000001'), '公開トークン一致イベントの参加者SELECT可');

-- 2. 存在しないイベントIDでSELECT不可
SELECT is((SELECT count(*) FROM participants WHERE event_id = '00000000-0000-0000-0000-000000000099'), 0::bigint, '存在しないイベントIDでSELECT不可');

-- 3. anonでINSERTできない（RLS）
SELECT throws_ok('INSERT INTO participants (id, event_id, name) VALUES (''99999999-9999-9999-9999-999999999999'', ''00000000-0000-0000-0000-000000000001'', ''不正'')', 'permission denied', 'anonはINSERTできない');

-- 4. public_token一致イベントのみINSERT可（他イベントは不可）
SELECT throws_ok('INSERT INTO participants (id, event_id, name) VALUES (''99999999-9999-9999-9999-999999999998'', ''99999999-9999-9999-9999-999999999998'', ''不正'')', 'permission denied', 'public_token不一致イベントにはINSERT不可');

-- 5. UPDATE禁止
SELECT throws_ok('UPDATE participants SET name = ''改名'' WHERE id = ''00000000-0000-0000-0000-000000000201''', 'permission denied', 'anonはUPDATEできない');

-- 6. DELETE禁止
SELECT throws_ok('DELETE FROM participants WHERE id = ''00000000-0000-0000-0000-000000000201''', 'permission denied', 'anonはDELETEできない');

-- 7. event_id,nameユニーク制約違反
SELECT throws_ok('INSERT INTO participants (event_id, name) VALUES (''00000000-0000-0000-0000-000000000001'', ''テスト太郎'')', 'duplicate key value violates unique constraint', 'event_id,nameユニーク制約違反でエラー');

SELECT finish();
ROLLBACK;
