import { test, expect, Page } from '@playwright/test';

// サーバー起動遅延＋JSレンダリング待ち対策
async function gotoWithRetry(page: Page, url: string, maxRetry = 10, interval = 2000) {
  let lastErr;
  for (let i = 0; i < maxRetry; i++) {
    try {
      if (!url) {
        throw new Error('URLが指定されていません');
      }
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      return;
    } catch (err) {
      lastErr = err;
      await new Promise((res) => setTimeout(res, interval));
    }
  }
  throw lastErr;
}

let eventUrl: string;
const eventTitle = `お気に入りE2Eテストイベント-${Date.now()}`;

test.describe.serial('お気に入りイベント機能', () => {
  test('テスト用のイベントを作成する', async ({ page }) => {
    await gotoWithRetry(page, '/create');
    await page.waitForLoadState('networkidle');
    await expect(page.getByLabel('イベントタイトル')).toBeVisible();
    await page.getByLabel('イベントタイトル').fill(eventTitle);
    await page.getByLabel('説明').fill('お気に入り機能のE2E自動テスト用イベント');
    
    const dateInputs = await page.locator('input[type="date"]').all();
    if (dateInputs.length >= 2) {
      await dateInputs[0].fill('2099-02-01');
      await dateInputs[1].fill('2099-02-05');
    }
    const timeInputs = await page.locator('input[type="time"]').all();
    if (timeInputs.length >= 2) {
      await timeInputs[0].fill('11:00');
      await timeInputs[1].fill('16:00');
    }

    const termsCheckbox = page.getByLabel('利用規約');
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check();
    }

    await page.getByRole('button', { name: /イベントを作成/ }).click();
    await page.waitForURL(/\/event\//, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    
    eventUrl = page.url();
    expect(eventUrl).toContain('/event/');
  });

  test('イベントをお気に入り登録・解除できる', async ({ page }) => {
    // 1. イベントページでお気に入り登録
    await gotoWithRetry(page, eventUrl);
    await expect(page.getByRole('heading', { name: eventTitle })).toBeVisible({ timeout: 10000 });

    // aria-labelを優先するアクセシブルな名前でボタンを特定する
    await page.getByRole('button', { name: 'お気に入り登録' }).click();
    
    // クリック後に状態が変わったことを確認
    const unfavoriteButton = page.getByRole('button', { name: 'お気に入り解除' });
    await expect(unfavoriteButton).toBeVisible();

    // 2. ホーム画面でお気に入りを確認
    await gotoWithRetry(page, '/home');
    await expect(page.getByRole('heading', { name: 'お気に入りイベント' })).toBeVisible();
    const favoriteList = page.locator('ul.grid');
    const favoriteItem = favoriteList.locator(`li:has-text("${eventTitle}")`);
    await expect(favoriteItem).toBeVisible();

    // 3. イベントページでお気に入り解除
    await gotoWithRetry(page, eventUrl);
    await expect(page.getByRole('heading', { name: eventTitle })).toBeVisible({ timeout: 10000 });
    await unfavoriteButton.click();
    
    // 解除後に元のボタンが表示されることを確認
    const favoriteButton = page.getByRole('button', { name: 'お気に入り登録' });
    await expect(favoriteButton).toBeVisible();

    // 4. ホーム画面でお気に入りが解除されていることを確認
    await gotoWithRetry(page, '/home');
    await expect(page.getByRole('heading', { name: 'お気に入りイベント' })).toBeVisible();
    await expect(favoriteItem).not.toBeVisible();
  });
});
