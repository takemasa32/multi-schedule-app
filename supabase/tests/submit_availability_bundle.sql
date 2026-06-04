-- submit_availability_bundle の自動入力逆保存防止テスト（pgTAP）

BEGIN;
SELECT plan(12);

SELECT is(
  (
    SELECT count(*)::bigint
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'submit_availability_bundle'
      AND p.pronargs = 8
  ),
  0::bigint,
  '古い8引数の回答送信RPCは残らない'
);

SELECT is(
  has_function_privilege(
    'anon',
    'public.submit_availability_bundle(uuid,text,uuid,text,text,jsonb,text,jsonb,jsonb)',
    'EXECUTE'
  ),
  false,
  '新しい回答送信RPCはanonから直接実行できない'
);

INSERT INTO authjs.users (id, email, name)
VALUES ('pgtap-user-1', 'pgtap-user-1@example.com', 'PGTAP User 1');

INSERT INTO public.events (id, public_token, admin_token, title, description, created_at)
VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'SubmitBundleToken01',
    '30000000-0000-0000-0000-000000000001',
    '3時間イベントA',
    '',
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'SubmitBundleToken02',
    '30000000-0000-0000-0000-000000000002',
    '3時間イベントB',
    '',
    now()
  );

INSERT INTO public.event_dates (id, event_id, start_time, end_time, created_at)
VALUES
  (
    '10000000-0000-0000-0000-000000000101',
    '10000000-0000-0000-0000-000000000001',
    '2099-06-01T10:00:00Z',
    '2099-06-01T13:00:00Z',
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000102',
    '10000000-0000-0000-0000-000000000002',
    '2099-06-02T10:00:00Z',
    '2099-06-02T13:00:00Z',
    now()
  );

INSERT INTO public.user_schedule_blocks (
  user_id,
  start_time,
  end_time,
  availability,
  source,
  event_id,
  updated_at
)
VALUES
  ('pgtap-user-1', '2099-06-01T10:00:00Z', '2099-06-01T11:00:00Z', false, 'manual', null, '2026-01-01T00:00:00Z'),
  ('pgtap-user-1', '2099-06-01T11:00:00Z', '2099-06-01T12:00:00Z', false, 'manual', null, '2026-01-01T00:00:00Z'),
  ('pgtap-user-1', '2099-06-01T12:00:00Z', '2099-06-01T13:00:00Z', true, 'manual', null, '2026-01-01T00:00:00Z'),
  ('pgtap-user-1', '2099-06-02T10:00:00Z', '2099-06-02T11:00:00Z', false, 'manual', null, '2026-01-02T00:00:00Z'),
  ('pgtap-user-1', '2099-06-02T11:00:00Z', '2099-06-02T12:00:00Z', false, 'manual', null, '2026-01-02T00:00:00Z'),
  ('pgtap-user-1', '2099-06-02T12:00:00Z', '2099-06-02T13:00:00Z', true, 'manual', null, '2026-01-02T00:00:00Z');

SELECT ok(
  (SELECT success FROM public.submit_availability_bundle(
    '10000000-0000-0000-0000-000000000001',
    'SubmitBundleToken01',
    NULL,
    '自動入力未変更',
    NULL,
    '[{"event_date_id":"10000000-0000-0000-0000-000000000101","availability":false}]'::jsonb,
    'pgtap-user-1',
    '[]'::jsonb,
    '[]'::jsonb
  ) LIMIT 1),
  '自動入力未変更でも送信成功する'
);

SELECT is(
  (SELECT availability FROM public.user_schedule_blocks WHERE user_id='pgtap-user-1' AND start_time='2099-06-01T12:00:00Z' AND end_time='2099-06-01T13:00:00Z'),
  true,
  '未変更送信では元の可ブロックを壊さない'
);

SELECT is(
  (SELECT source FROM public.user_schedule_blocks WHERE user_id='pgtap-user-1' AND start_time='2099-06-01T12:00:00Z' AND end_time='2099-06-01T13:00:00Z'),
  'manual',
  '未変更送信では source を維持する'
);

SELECT ok(
  (SELECT success FROM public.submit_availability_bundle(
    '10000000-0000-0000-0000-000000000002',
    'SubmitBundleToken02',
    NULL,
    '明示変更あり',
    NULL,
    '[{"event_date_id":"10000000-0000-0000-0000-000000000102","availability":true}]'::jsonb,
    'pgtap-user-1',
    '[]'::jsonb,
    '["10000000-0000-0000-0000-000000000102"]'::jsonb
  ) LIMIT 1),
  '明示変更ありでも送信成功する'
);

SELECT is(
  (SELECT availability FROM public.user_schedule_blocks WHERE user_id='pgtap-user-1' AND start_time='2099-06-02T10:00:00Z' AND end_time='2099-06-02T11:00:00Z'),
  true,
  '明示変更時は先頭1時間も更新される'
);

SELECT is(
  (SELECT availability FROM public.user_schedule_blocks WHERE user_id='pgtap-user-1' AND start_time='2099-06-02T11:00:00Z' AND end_time='2099-06-02T12:00:00Z'),
  true,
  '明示変更時は中間1時間も更新される'
);

SELECT is(
  (SELECT availability FROM public.user_schedule_blocks WHERE user_id='pgtap-user-1' AND start_time='2099-06-02T12:00:00Z' AND end_time='2099-06-02T13:00:00Z'),
  true,
  '明示変更時は末尾1時間も更新される'
);

SELECT is(
  (SELECT source FROM public.user_schedule_blocks WHERE user_id='pgtap-user-1' AND start_time='2099-06-02T10:00:00Z' AND end_time='2099-06-02T11:00:00Z'),
  'event',
  '明示変更で更新された枠は event 由来に切り替わる'
);

SELECT is(
  (SELECT event_id FROM public.user_schedule_blocks WHERE user_id='pgtap-user-1' AND start_time='2099-06-02T10:00:00Z' AND end_time='2099-06-02T11:00:00Z'),
  '10000000-0000-0000-0000-000000000002'::uuid,
  '明示変更で更新された枠は今回イベントに紐づく'
);

SELECT is(
  (SELECT count(*)::bigint FROM public.user_schedule_blocks WHERE user_id='pgtap-user-1' AND start_time >= '2099-06-02T10:00:00Z' AND end_time <= '2099-06-02T13:00:00Z'),
  3::bigint,
  '明示変更した3時間候補は3件の1時間枠として保持される'
);

SELECT finish();
ROLLBACK;
