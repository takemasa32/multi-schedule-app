import { test, expect, Page } from '@playwright/test';

// サーバー起動遅延＋JSレンダリング待ち対策
async function gotoWithRetry(page: Page, url: string, maxRetry = 10, interval = 2000) {
  let lastErr;
  for (let i = 0; i < maxRetry; i++) {
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      return;
    } catch (err) {
      lastErr = err;
      await new Promise((res) => setTimeout(res, interval));
    }
  }
  throw lastErr;
}

test('イベント作成→参加者回答→主催者確定→カレンダー連携', async ({ page, context }) => {
  // 1. トップページから新規イベント作成
  await gotoWithRetry(page, '/');
  await expect(page.getByText('新規イベント作成')).toBeVisible();
  await page.fill('input[name="title"]', 'E2Eテストイベント');
  await page.fill('textarea[name="description"]', 'E2E自動テスト用イベント');
  // 日程追加（datetime-local）
  await page.fill('input[type="datetime-local"]', '2025-05-20T10:00');
  // 利用規約同意
  if (await page.getByLabel('利用規約').isVisible()) {
    await page.getByLabel('利用規約').check();
  }
  await page.getByRole('button', { name: /イベントを作成/ }).click();

  // 2. イベント詳細ページ遷移・URL取得
  await page.waitForURL(/\/event\//);
  const eventUrl = page.url();
  expect(eventUrl).toMatch(/\/event\//);

  // 3. 参加者として別タブでアクセスし、回答送信
  const participantPage = await context.newPage();
  await gotoWithRetry(participantPage, eventUrl);
  await participantPage.fill('input[name="participant_name"]', 'E2E参加者');
  await participantPage.getByLabel('利用規約').check();
  // 1つ目の候補日程を○に
  const firstCell = participantPage.getByText('×').first();
  await firstCell.click();
  await participantPage.getByRole('button', { name: /回答を送信/ }).click();
  await expect(participantPage.getByText('回答が送信されました')).toBeVisible();

  // 4. 主催者画面で集計反映・日程確定
  await page.reload();
  await expect(page.getByText('E2E参加者')).toBeVisible();
  // 「この日程で確定」ボタン押下
  const finalizeBtn = page.getByRole('button', { name: /この日程で確定/ });
  await finalizeBtn.click();
  // 確定ダイアログが出る場合はOK
  if (await page.getByRole('dialog').isVisible()) {
    await page.getByRole('button', { name: /確定/ }).click();
  }
  await expect(page.getByText('イベント日程が確定しました')).toBeVisible();

  // 5. カレンダー連携（.ics/Googleカレンダー）
  const icsLink = page.getByRole('link', { name: /カレンダーに追加/ });
  await expect(icsLink).toBeVisible();
  const googleCalLink = page.getByRole('link', { name: /Googleカレンダー/ });
  await expect(googleCalLink).toBeVisible();
});
