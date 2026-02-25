import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = 'http://127.0.0.1:3100';
const EVENT_TOKEN = '39TP9Dwpu1Wp';
const EVENT_URL = `${BASE_URL}/event/${EVENT_TOKEN}`;
const INPUT_URL = `${EVENT_URL}/input`;
const DEV_ID = process.env.CHECK_DEV_ID ?? 'devuser';
const DEV_PASSWORD = process.env.CHECK_DEV_PASSWORD ?? 'devpass';

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = `/tmp/account-flow-check-${stamp}`;
await fs.mkdir(outDir, { recursive: true });

const report = {
  outDir,
  checks: [],
  pageErrors: [],
  consoleErrors: [],
};

const add = (name, ok, detail = '') => report.checks.push({ name, ok, detail });

const attachDebug = (page, label) => {
  page.on('pageerror', (err) => {
    report.pageErrors.push({ label, message: String(err) });
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      report.consoleErrors.push({ label, text: msg.text() });
    }
  });
};

const safeSetTerms = async (page) => {
  const checkbox = page.getByLabel(/利用規約/).first();
  if (await checkbox.isVisible().catch(() => false)) {
    await checkbox.check({ force: true });
    return;
  }
  await page.evaluate(() => {
    const c = document.querySelector(
      '#availability-form-terms,input[name="terms"],input[type="checkbox"]',
    );
    if (!(c instanceof HTMLInputElement)) return;
    c.checked = true;
    c.dispatchEvent(new Event('input', { bubbles: true }));
    c.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

const submitGuestAnswer = async (context, name) => {
  const page = await context.newPage();
  attachDebug(page, `guest:${name}`);
  await page.goto(EVENT_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  await page.goto(INPUT_URL, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('お名前').fill(name);
  await page.waitForTimeout(1200);
  const tableButtons = page.locator('table tbody button');
  const buttonCount = await tableButtons.count();
  if (buttonCount > 0) {
    await tableButtons.first().click();
  } else {
    const dateCells = page.locator('[data-date-id]');
    const dateCount = await dateCells.count();
    if (dateCount > 0) {
      await dateCells.first().click();
    }
  }
  await safeSetTerms(page);
  await page.getByRole('button', { name: /回答を送信|回答を更新する/ }).click();
  const overwriteModal = page.getByText('同じ名前の回答が既に存在します');
  const hasOverwriteModal = await overwriteModal.isVisible().catch(() => false);
  if (hasOverwriteModal) {
    await page.getByRole('button', { name: '上書きする' }).click({ force: true });
  } else {
    const appearedLater = await overwriteModal.waitFor({ state: 'visible', timeout: 1200 }).then(
      () => true,
      () => false,
    );
    if (appearedLater) {
      await page.getByRole('button', { name: '上書きする' }).click({ force: true });
    }
  }
  await page.waitForTimeout(1500);
  const bodyText = (await page.textContent('body')) ?? '';
  const submitted =
    page.url().includes(`/event/${EVENT_TOKEN}`) &&
    !page.url().includes('/input') &&
    !bodyText.includes('利用規約への同意が必要です');
  await page.screenshot({ path: path.join(outDir, `guest-submit-${name}.png`), fullPage: true });
  if (!submitted) {
    throw new Error(`未ログイン回答の送信に失敗: name=${name}, url=${page.url()}`);
  }
  await page.close();
};

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  // 1) 未ログイン状態
  const guestCtx = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    locale: 'ja-JP',
  });
  const guestPage = await guestCtx.newPage();
  attachDebug(guestPage, 'guest-main');

  await guestPage.goto(`${BASE_URL}/account`, { waitUntil: 'domcontentloaded' });
  const unauthText = await guestPage.textContent('body');
  add(
    '未ログイン/account案内表示',
    Boolean(unauthText?.includes('ログインすると予定設定を管理できます。')),
  );
  await guestPage.screenshot({ path: path.join(outDir, 'account-unauth.png'), fullPage: true });

  const candidateName = `候補_${Date.now()}`;
  await submitGuestAnswer(guestCtx, candidateName);
  add('未ログイン回答作成(候補用)', true, candidateName);

  // 2) ログイン
  await guestPage.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'domcontentloaded' });
  await guestPage.getByLabel('開発ID').fill(DEV_ID);
  await guestPage.getByLabel('開発パスワード').fill(DEV_PASSWORD);
  await guestPage.getByRole('button', { name: '開発用ログインで進む' }).click();
  await guestPage.waitForTimeout(1500);

  // 3) /account フラッシュ確認
  await guestPage.goto(`${BASE_URL}/account`, { waitUntil: 'domcontentloaded' });
  const firstPaintText = await guestPage.textContent('body');
  const flashAtFirstPaint = Boolean(
    firstPaintText?.includes('ログインすると予定設定を管理できます。'),
  );
  await guestPage.waitForTimeout(1500);
  const settledText = await guestPage.textContent('body');
  const flashAfterSettle = Boolean(settledText?.includes('ログインすると予定設定を管理できます。'));
  add('ログイン直後/accountフラッシュなし(初期描画)', !flashAtFirstPaint);
  add('ログイン直後/accountフラッシュなし(安定後)', !flashAfterSettle);
  await guestPage.screenshot({
    path: path.join(outDir, 'account-auth-desktop.png'),
    fullPage: true,
  });

  // 4) /account では未ログイン回答紐づけセクションを表示しない
  await guestPage.waitForTimeout(1500);
  const hasAccountLinker = ((await guestPage.textContent('body')) ?? '').includes(
    '未ログイン回答の紐づけ',
  );
  add('/account で未ログイン回答紐づけを表示しない', !hasAccountLinker);

  // 5) not_found
  await guestPage.goto(INPUT_URL, { waitUntil: 'domcontentloaded' });
  await guestPage.getByLabel('お名前').fill(`未存在_${Date.now()}`);
  await guestPage.getByRole('button', { name: '既存回答を探して紐づける' }).click();
  await guestPage.waitForTimeout(1200);
  const notFoundText = (await guestPage.textContent('body')) ?? '';
  add(
    'イベント入力画面の既存回答紐づけ(not_found)',
    notFoundText.includes('見つかりませんでした') || notFoundText.includes('見つかりません'),
  );

  // 6) ambiguous
  const dupName = `重複_${Date.now()}`;
  const dupGuest1 = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    locale: 'ja-JP',
  });
  const dupGuest2 = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    locale: 'ja-JP',
  });
  await submitGuestAnswer(dupGuest1, dupName);
  await submitGuestAnswer(dupGuest2, dupName);
  await dupGuest1.close();
  await dupGuest2.close();

  await guestPage.goto(INPUT_URL, { waitUntil: 'domcontentloaded' });
  await guestPage.getByLabel('お名前').fill(dupName);
  await guestPage.getByRole('button', { name: '既存回答を探して紐づける' }).click();
  await guestPage.waitForTimeout(1200);
  const ambiguousText = (await guestPage.textContent('body')) ?? '';
  const duplicateExistsModal = await guestPage
    .getByText('同じ名前の回答が既に存在します')
    .isVisible()
    .catch(() => false);
  add(
    'イベント入力画面の既存回答紐づけ(ambiguous)',
    ambiguousText.includes('同名の回答が複数') || duplicateExistsModal,
    ambiguousText.includes('同名の回答が複数')
      ? dupName
      : duplicateExistsModal
        ? '重複は上書き確認モーダルで処理'
        : 'ambiguous文言なし',
  );

  // 7) イベント入力画面での名前紐づけ 成功
  const successName = `成功_${Date.now()}`;
  const anotherGuest = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    locale: 'ja-JP',
  });
  await submitGuestAnswer(anotherGuest, successName);
  await anotherGuest.close();

  await guestPage.goto(INPUT_URL, { waitUntil: 'domcontentloaded' });
  await guestPage.getByLabel('お名前').fill(successName);
  await guestPage.getByRole('button', { name: '既存回答を探して紐づける' }).click();
  await guestPage.waitForTimeout(1500);
  add(
    'イベント入力画面の既存回答紐づけ(成功)',
    guestPage.url().includes('participant_id='),
    guestPage.url(),
  );

  // 8) /account では未ログイン回答紐づけ導線を表示しない
  await guestPage.goto(`${BASE_URL}/account`, { waitUntil: 'domcontentloaded' });
  await guestPage.waitForTimeout(1200);
  const hasLinkerButtonAfter = ((await guestPage.textContent('body')) ?? '').includes(
    'この回答を紐づける',
  );
  add('/account で回答紐づけボタンを表示しない', !hasLinkerButtonAfter);

  // 9) 週ごとの用事 更新
  await guestPage.waitForTimeout(1800);
  await guestPage.getByRole('button', { name: '編集する' }).first().click();
  const weeklyCells = guestPage.locator('button[aria-label*=":"]');
  const weeklyCellCount = await weeklyCells.count();
  if (weeklyCellCount > 0) {
    await weeklyCells.first().click();
  }
  await guestPage.getByRole('button', { name: '更新する' }).first().click();
  await guestPage.waitForTimeout(1200);
  const weeklyText = (await guestPage.textContent('body')) ?? '';
  add(
    '週ごとの用事の更新',
    weeklyText.includes('週ごとの用事を更新しました') || weeklyText.includes('変更はありません'),
    `cells=${weeklyCellCount}`,
  );

  // 10) 予定一括管理 更新
  await guestPage.getByRole('button', { name: '予定一括管理' }).click();
  await guestPage.waitForTimeout(400);
  await guestPage.getByRole('button', { name: '編集する' }).first().click();
  const datedCells = guestPage.locator('button[aria-label^="20"]');
  const datedCellCount = await datedCells.count();
  if (datedCellCount > 0) {
    await datedCells.first().click();
  }
  await guestPage.getByRole('button', { name: '更新する' }).first().click();
  await guestPage.waitForTimeout(1500);
  const datedText = (await guestPage.textContent('body')) ?? '';
  add(
    '予定一括管理の更新',
    datedText.includes('予定一括管理を更新しました') || datedText.includes('変更はありません'),
    `cells=${datedCellCount}`,
  );
  add(
    '反映プレビュー導線の表示',
    datedText.includes('変更対象のイベントはありません') ||
      datedText.includes('この変更を適用') ||
      datedText.includes('変更はありません'),
  );

  // 11) モバイル表示
  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'ja-JP',
  });
  const mobilePage = await mobileCtx.newPage();
  attachDebug(mobilePage, 'mobile');

  // ログイン状態を引き継ぐため storageState を利用
  const state = await guestCtx.storageState();
  await mobileCtx.close();
  const mobileAuthCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'ja-JP',
    storageState: state,
  });
  const mobileAuthPage = await mobileAuthCtx.newPage();
  attachDebug(mobileAuthPage, 'mobile-auth');

  await mobileAuthPage.goto(`${BASE_URL}/account`, { waitUntil: 'domcontentloaded' });
  await mobileAuthPage.waitForTimeout(1500);
  await mobileAuthPage.screenshot({
    path: path.join(outDir, 'account-auth-mobile.png'),
    fullPage: true,
  });

  await mobileAuthPage.goto(INPUT_URL, { waitUntil: 'domcontentloaded' });
  await mobileAuthPage.waitForTimeout(1200);
  const tableViewButton = mobileAuthPage.getByRole('button', { name: '表' }).first();
  if (await tableViewButton.isVisible().catch(() => false)) {
    await tableViewButton.click();
  }
  await mobileAuthPage.waitForTimeout(400);
  await mobileAuthPage.screenshot({
    path: path.join(outDir, 'event-input-mobile.png'),
    fullPage: true,
  });

  const cellMetrics = await mobileAuthPage.evaluate(() => {
    const cellButton = document.querySelector('table tbody td button, [data-date-id]');
    if (!cellButton) return null;
    const r = cellButton.getBoundingClientRect();
    return {
      width: Math.round(r.width),
      height: Math.round(r.height),
      ratio: Number((r.width / r.height).toFixed(2)),
    };
  });
  add(
    'モバイルセル縦横比チェック',
    Boolean(cellMetrics && cellMetrics.ratio >= 0.75),
    JSON.stringify(cellMetrics),
  );

  await mobileAuthCtx.close();
  await guestCtx.close();
} finally {
  await browser.close();
}

const okCount = report.checks.filter((c) => c.ok).length;
const ng = report.checks.filter((c) => !c.ok);
report.summary = {
  total: report.checks.length,
  passed: okCount,
  failed: ng.length,
};

await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf-8');
console.log(JSON.stringify(report, null, 2));
if (ng.length > 0) {
  process.exitCode = 2;
}
