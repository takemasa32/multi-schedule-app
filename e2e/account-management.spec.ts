import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

type RuntimeConfig = {
  dbUrl: string;
  baseUrl: string;
  devLoginId: string;
  devLoginPassword: string;
};

type SeededEvent = {
  id: string;
  publicToken: string;
  title: string;
  dateIds: string[];
};

const loadRuntimeConfig = (): RuntimeConfig => {
  const envFromProcess = {
    dbUrl: process.env.SUPABASE_DB_URL ?? '',
    baseUrl: process.env.E2E_BASE_URL ?? '',
    devLoginId: process.env.E2E_DEV_LOGIN_ID ?? process.env.DEV_LOGIN_ID ?? '',
    devLoginPassword: process.env.E2E_DEV_LOGIN_PASSWORD ?? process.env.DEV_LOGIN_PASSWORD ?? '',
  };

  if (
    envFromProcess.dbUrl &&
    envFromProcess.baseUrl &&
    envFromProcess.devLoginId &&
    envFromProcess.devLoginPassword
  ) {
    return envFromProcess;
  }

  const map: Record<string, string> = {};
  const lines = readFileSync('.env.local', 'utf-8').split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx < 0) return;
    const key = trimmed.slice(0, idx).trim();
    const rawValue = trimmed.slice(idx + 1).trim();
    const value =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ? rawValue.slice(1, -1)
        : rawValue;
    map[key] = value;
  });

  return {
    dbUrl: envFromProcess.dbUrl || map.SUPABASE_DB_URL || '',
    baseUrl: envFromProcess.baseUrl || 'http://localhost:3201',
    devLoginId: envFromProcess.devLoginId || map.E2E_DEV_LOGIN_ID || map.DEV_LOGIN_ID || 'e2e-dev',
    devLoginPassword:
      envFromProcess.devLoginPassword ||
      map.E2E_DEV_LOGIN_PASSWORD ||
      map.DEV_LOGIN_PASSWORD ||
      'e2e-devpass',
  };
};

const runtime = loadRuntimeConfig();
const isDevLoginEnabled =
  process.env.ENABLE_DEV_LOGIN === 'true' || process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true';

const randomToken = (length: number): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const loginAsDevUser = async (page: Page): Promise<void> => {
  await page.goto('/account', { waitUntil: 'domcontentloaded' });
  if (
    await page
      .getByRole('button', { name: 'ログアウト' })
      .isVisible()
      .catch(() => false)
  ) {
    return;
  }

  await page.goto(`/auth/signin?callbackUrl=${encodeURIComponent('/account')}`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByRole('heading', { name: '開発用ログイン' })).toBeVisible();
  await page.getByLabel('開発ID').fill(runtime.devLoginId);
  await page.getByLabel('開発パスワード').fill(runtime.devLoginPassword);
  await page.getByRole('button', { name: '開発用ログインで進む' }).click({ force: true });
  await expect(page.getByRole('button', { name: 'ログアウト' })).toBeVisible();
};

const dismissAccountTourIfVisible = async (page: Page): Promise<void> => {
  const tourDialog = page.getByTestId('account-tour-dialog');
  await page.waitForTimeout(150);
  if (!(await tourDialog.isVisible().catch(() => false))) return;
  const skipButton = page.getByTestId('account-tour-skip');
  if (await skipButton.isVisible().catch(() => false)) {
    await skipButton.click({ force: true });
  }
  await expect(tourDialog).toBeHidden();
};

test.describe('アカウント連携管理E2E @auth-required', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(
    !runtime.dbUrl || !runtime.devLoginId || !runtime.devLoginPassword,
    'E2Eに必要な環境変数（SUPABASE_DB_URL / DEV_LOGIN_ID / DEV_LOGIN_PASSWORD）が不足しています',
  );
  test.skip(!isDevLoginEnabled, '開発用ログインが無効のためスキップします');

  let db: Client;
  let userId: string;
  const createdEventIds: string[] = [];
  const createdTokens: string[] = [];

  const createSeedEvent = async (
    titlePrefix: string,
    slots: Array<{ start: string; end: string }>,
  ) => {
    const title = `${titlePrefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const publicToken = randomToken(12);
    const eventInsert = await db.query<{ id: string }>(
      'insert into public.events(public_token,title) values($1,$2) returning id',
      [publicToken, title],
    );
    const eventId = eventInsert.rows[0].id;
    createdEventIds.push(eventId);
    createdTokens.push(publicToken);

    const dateIds: string[] = [];
    for (const slot of slots) {
      const inserted = await db.query<{ id: string }>(
        'insert into public.event_dates(event_id,start_time,end_time) values($1,$2,$3) returning id',
        [eventId, slot.start, slot.end],
      );
      dateIds.push(inserted.rows[0].id);
    }

    return { id: eventId, publicToken, title, dateIds } satisfies SeededEvent;
  };

  const createParticipant = async (eventId: string, name: string) => {
    const inserted = await db.query<{ id: string }>(
      'insert into public.participants(event_id,name,response_token) values($1,$2,$3) returning id',
      [eventId, name, randomUUID()],
    );
    return inserted.rows[0].id;
  };

  test.beforeAll(async () => {
    db = new Client({ connectionString: runtime.dbUrl });
    await db.connect();
    const email = `${runtime.devLoginId}@local.dev`;
    const existing = await db.query<{ id: string }>('select id from authjs.users where email=$1', [
      email,
    ]);

    if (existing.rowCount && existing.rows[0]) {
      userId = existing.rows[0].id;
      return;
    }

    const inserted = await db.query<{ id: string }>(
      'insert into authjs.users(name,email,"emailVerified") values($1,$2,now()) returning id',
      ['開発ユーザー', email],
    );
    userId = inserted.rows[0].id;
  });

  test.afterAll(async () => {
    if (!db) return;
    if (createdEventIds.length > 0) {
      await db.query(
        'delete from public.user_event_links where user_id=$1 and event_id = any($2::uuid[])',
        [userId, createdEventIds],
      );
      await db.query('delete from public.availabilities where event_id = any($1::uuid[])', [
        createdEventIds,
      ]);
      await db.query('delete from public.participants where event_id = any($1::uuid[])', [
        createdEventIds,
      ]);
      await db.query('delete from public.event_dates where event_id = any($1::uuid[])', [
        createdEventIds,
      ]);
      await db.query('delete from public.events where id = any($1::uuid[])', [createdEventIds]);
    }
    if (createdTokens.length > 0) {
      await db.query(
        'delete from public.event_access_histories where user_id=$1 and event_public_token = any($2::text[])',
        [userId, createdTokens],
      );
    }
    await db.query(
      "delete from public.user_schedule_blocks where user_id=$1 and source='manual' and start_time >= '2099-01-01'::timestamptz and end_time < '2100-01-01'::timestamptz",
      [userId],
    );
    await db.query(
      "delete from public.user_schedule_templates where user_id=$1 and source='manual' and start_time='03:00'::time and end_time='04:00'::time",
      [userId],
    );
    await db.end();
  });

  test('ログイン直後の /account で未ログイン文言がフラッシュしない', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'DBシード併用ケースはchromiumで安定実行');

    await loginAsDevUser(page);
    await page.goto('/account', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).not.toContainText('ログインすると予定設定を管理できます。');
    await page.waitForTimeout(700);
    await expect(page.locator('body')).not.toContainText('ログインすると予定設定を管理できます。');
  });

  test('/account ツアーは初回表示後に抑止され、手動で再表示できる', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'DBシード併用ケースはchromiumで安定実行');

    await loginAsDevUser(page);
    await page.goto('/account', { waitUntil: 'domcontentloaded' });

    await page.evaluate(() => {
      localStorage.removeItem('account_page_tour_state_v1');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    const tourDialog = page.getByRole('dialog', { name: 'アカウントページの使い方' });
    await expect(tourDialog).toBeVisible();
    await page.getByTestId('account-tour-skip').click();
    await expect(tourDialog).toBeHidden();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(tourDialog).toBeHidden();

    await page.getByTestId('account-tour-open').first().click();
    await expect(tourDialog).toBeVisible();
    await page.getByTestId('account-tour-next').click();
    await expect(tourDialog.getByText('マイ予定設定')).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTestId('account-tour-skip').click();
    await expect(tourDialog).toBeHidden();

    await page.getByTestId('account-tour-open').first().click();
    await expect(tourDialog).toBeVisible();
    await page.getByTestId('account-tour-next').click();
    await expect(tourDialog.getByText('マイ予定設定')).toBeVisible();
  });

  test('未ログイン回答の紐づけ候補を /account で紐づけできる', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'DBシード併用ケースはchromiumで安定実行');

    const event = await createSeedEvent('E2E_候補イベント', [
      { start: '2099-02-02T03:00:00Z', end: '2099-02-02T04:00:00Z' },
    ]);
    const participantId = await createParticipant(event.id, 'E2E_候補参加者');

    await db.query(
      `insert into public.event_access_histories(user_id,event_public_token,event_title,is_created_by_me,last_accessed_at)
       values($1,$2,$3,false,now())
       on conflict(user_id,event_public_token)
       do update set event_title=excluded.event_title,last_accessed_at=excluded.last_accessed_at`,
      [userId, event.publicToken, event.title],
    );

    await loginAsDevUser(page);
    await page.goto('/account', { waitUntil: 'domcontentloaded' });
    await dismissAccountTourIfVisible(page);
    const refreshButton = page
      .getByTestId('answer-linker-refresh')
      .filter({ hasText: '候補を更新' })
      .first();
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();

    const candidateCard = page
      .locator('[data-testid^="answer-linker-candidate-"]')
      .filter({ hasText: event.title })
      .first();
    await expect(candidateCard).toBeVisible();
    await candidateCard.locator('[data-testid^="answer-linker-link-"]').click();
    await expect
      .poll(
        async () => {
          const linked = await db.query<{ participant_id: string | null }>(
            'select participant_id from public.user_event_links where user_id=$1 and event_id=$2',
            [userId, event.id],
          );
          return linked.rows[0]?.participant_id ?? null;
        },
        { timeout: 10000 },
      )
      .toBe(participantId);
  });

  test('イベント入力画面では既存回答紐づけ導線を表示しない', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'DBシード併用ケースはchromiumで安定実行');

    const event = await createSeedEvent('E2E_入力紐づけ', [
      { start: '2099-03-02T03:00:00Z', end: '2099-03-02T04:00:00Z' },
    ]);

    await loginAsDevUser(page);
    await page.goto(`/event/${event.publicToken}/input`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('availability-link-existing-answer')).toHaveCount(0);
  });

  test('週ごとの用事/予定一括管理の更新と反映プレビュー導線を確認できる', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'DBシード併用ケースはchromiumで安定実行');

    const syncEvent = await createSeedEvent('E2E_反映対象', [
      { start: '2099-04-06T03:00:00Z', end: '2099-04-06T04:00:00Z' },
    ]);
    const syncParticipantId = await createParticipant(syncEvent.id, `E2E_同期_${Date.now()}`);
    await db.query(
      'insert into public.availabilities(event_id,participant_id,event_date_id,availability) values($1,$2,$3,false)',
      [syncEvent.id, syncParticipantId, syncEvent.dateIds[0]],
    );
    await db.query(
      `insert into public.user_event_links(user_id,event_id,participant_id,auto_sync,created_at,updated_at)
       values($1,$2,$3,true,now(),now())
       on conflict(user_id,event_id) do update set participant_id=excluded.participant_id,updated_at=now()`,
      [userId, syncEvent.id, syncParticipantId],
    );

    await db.query(
      `insert into public.user_schedule_templates(user_id,weekday,start_time,end_time,availability,source,sample_count,updated_at)
       values($1,1,'03:00','04:00',true,'manual',0,now())
       on conflict(user_id,weekday,start_time,end_time,source)
       do update set availability=excluded.availability,updated_at=now()`,
      [userId],
    );
    await db.query(
      `insert into public.user_schedule_blocks(user_id,start_time,end_time,availability,source,event_id,updated_at)
       values($1,date_trunc('hour', now()),date_trunc('hour', now()) + interval '1 hour',true,'manual',null,now())
       on conflict(user_id,start_time,end_time)
       do update set
         availability=excluded.availability,
         source=excluded.source,
         event_id=excluded.event_id,
         updated_at=excluded.updated_at`,
      [userId],
    );

    await loginAsDevUser(page);
    await page.goto('/account', { waitUntil: 'domcontentloaded' });
    await dismissAccountTourIfVisible(page);
    const scheduleTemplates = page.getByTestId('account-schedule-templates').first();

    await scheduleTemplates.getByTestId('account-tab-weekly').click();
    await scheduleTemplates.getByTestId('weekly-edit').click();
    await scheduleTemplates.locator('button[aria-label*=":"]').first().click();
    await scheduleTemplates.getByTestId('weekly-save').click();
    await expect(scheduleTemplates).toContainText(/週ごとの用事を更新しました|変更はありません/);

    await scheduleTemplates.getByTestId('account-tab-dated').click();
    await scheduleTemplates.getByTestId('dated-edit').click();
    await scheduleTemplates.locator('button[aria-label^="20"]').first().click();
    await scheduleTemplates.getByTestId('dated-save').click();
    await expect(scheduleTemplates).toContainText(/予定一括管理を更新しました|変更はありません/);

    await scheduleTemplates.getByTestId('sync-check-button').click();
    const syncSection = scheduleTemplates.getByTestId('schedule-sync-section');
    await expect(syncSection).toContainText(
      /変更対象のイベントはありません|変更のあるイベントを下で確認できます|この変更を適用/,
    );
  });

  test('予定一括管理が新規回答と回答イベント反映に適用される', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'DBシード併用ケースはchromiumで安定実行');

    const syncEvent = await createSeedEvent('E2E_反映対象_実適用', [
      { start: '2099-05-03T03:00:00Z', end: '2099-05-03T04:00:00Z' },
    ]);
    const syncParticipantId = await createParticipant(syncEvent.id, `E2E_反映先_${Date.now()}`);
    await db.query(
      'insert into public.availabilities(event_id,participant_id,event_date_id,availability) values($1,$2,$3,false)',
      [syncEvent.id, syncParticipantId, syncEvent.dateIds[0]],
    );
    await db.query(
      `insert into public.user_event_links(user_id,event_id,participant_id,auto_sync,created_at,updated_at)
       values($1,$2,$3,true,now(),now())
       on conflict(user_id,event_id) do update set participant_id=excluded.participant_id,updated_at=now()`,
      [userId, syncEvent.id, syncParticipantId],
    );

    const answerEvent = await createSeedEvent('E2E_新規回答_自動反映', [
      { start: '2099-05-10T03:00:00Z', end: '2099-05-10T04:00:00Z' },
    ]);

    await db.query(
      `insert into public.user_schedule_blocks(user_id,start_time,end_time,availability,source,event_id,updated_at)
       values
       ($1,'2099-05-03T03:00:00Z','2099-05-03T04:00:00Z',true,'manual',null,now()),
       ($1,'2099-05-10T03:00:00Z','2099-05-10T04:00:00Z',true,'manual',null,now())
       on conflict(user_id,start_time,end_time)
       do update set availability=excluded.availability,source='manual',event_id=null,updated_at=now()`,
      [userId],
    );

    await loginAsDevUser(page);
    await page.goto(`/event/${answerEvent.publicToken}/input`, { waitUntil: 'domcontentloaded' });

    const answerName = `E2E_自動反映回答_${Date.now()}`;
    await page.getByLabel('お名前').fill(answerName);
    await page.getByRole('button', { name: '次へ' }).click();
    const weeklyNextButton = page.getByRole('button', { name: '次へ' });
    if (await weeklyNextButton.isVisible().catch(() => false)) {
      await weeklyNextButton.click();
      const saveWeeklyButton = page.getByRole('button', { name: '更新して次へ' });
      if (await saveWeeklyButton.isVisible().catch(() => false)) {
        await saveWeeklyButton.click();
      }
    }
    await page.getByRole('button', { name: '確認へ進む' }).click();
    await page.getByLabel('利用規約を読み、同意します').check();
    await page.getByRole('button', { name: '回答を送信' }).click();
    await page.waitForTimeout(400);
    const syncScopeButton = page.getByRole('button', { name: 'このイベントのみ' });
    if (await syncScopeButton.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'このイベントのみ' }).click();
    }

    await expect
      .poll(
        async () => {
          const participant = await db.query<{ id: string }>(
            'select id from public.participants where event_id=$1 and name=$2 order by created_at desc limit 1',
            [answerEvent.id, answerName],
          );
          return participant.rows[0]?.id ?? null;
        },
        { timeout: 10000 },
      )
      .not.toBeNull();
    const answeredParticipant = await db.query<{ id: string }>(
      'select id from public.participants where event_id=$1 and name=$2 order by created_at desc limit 1',
      [answerEvent.id, answerName],
    );
    const answeredParticipantId = answeredParticipant.rows[0]?.id;
    expect(answeredParticipantId).toBeTruthy();

    await expect
      .poll(
        async () => {
          const row = await db.query<{ availability: boolean }>(
            'select availability from public.availabilities where event_id=$1 and participant_id=$2 and event_date_id=$3',
            [answerEvent.id, answeredParticipantId, answerEvent.dateIds[0]],
          );
          return row.rows[0]?.availability ?? null;
        },
        { timeout: 10000 },
      )
      .toBe(true);

    await page.goto('/account', { waitUntil: 'domcontentloaded' });
    await dismissAccountTourIfVisible(page);
    const scheduleTemplates = page.getByTestId('account-schedule-templates').first();
    await scheduleTemplates.getByTestId('account-tab-dated').click();
    await scheduleTemplates.getByTestId('sync-check-button').click();

    const syncCard = scheduleTemplates
      .getByTestId('schedule-sync-section')
      .locator('div')
      .filter({ hasText: syncEvent.title })
      .first();
    await expect(syncCard).toBeVisible();
    await expect(syncCard).toContainText('変更 1件');

    await scheduleTemplates.getByTestId(`sync-apply-${syncEvent.id}`).click();
    await expect
      .poll(
        async () => {
          const row = await db.query<{ availability: boolean }>(
            'select availability from public.availabilities where event_id=$1 and participant_id=$2 and event_date_id=$3',
            [syncEvent.id, syncParticipantId, syncEvent.dateIds[0]],
          );
          return row.rows[0]?.availability ?? null;
        },
        { timeout: 10000 },
      )
      .toBe(true);
  });
});
