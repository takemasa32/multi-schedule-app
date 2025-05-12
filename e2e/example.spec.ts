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

test('トップページが表示される', async ({ page }) => {
  await gotoWithRetry(page, '/');

  // タイトルはOK
  await expect(page).toHaveTitle(/日程調整 DaySynth/);

  // ②JSレンダリング完了を待つ
  await page.waitForLoadState('networkidle');

  const heading = page.getByText('新規イベント作成', { exact: false });
  await expect(heading).toBeVisible({ timeout: 10000 });
});
