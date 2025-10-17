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
  // 「今すぐ無料で日程調整を始める」ボタンの存在でトップページ表示を判定
  const ctaBtn = page.getByRole('link', {
    name: /今すぐ無料で日程調整を始める/,
  });
  await expect(ctaBtn).toBeVisible({ timeout: 10000 });
});
