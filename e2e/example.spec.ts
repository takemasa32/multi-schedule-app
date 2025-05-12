import { test, expect, Page } from '@playwright/test';

// サーバー起動遅延対策: goto時にリトライ
async function gotoWithRetry(page: Page, url: string, maxRetry = 10, interval = 2000) {
  let lastErr;
  for (let i = 0; i < maxRetry; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
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
  await expect(page).toHaveTitle(/複数日程調整/);
  await expect(page.getByRole('heading', { name: /新規イベント作成/ })).toBeVisible();
});
