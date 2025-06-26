import { test, expect, Page } from '@playwright/test';

// Helper function for retrying navigation
async function gotoWithRetry(page: Page, url: string, maxRetry = 10, interval = 2000) {
  let lastErr;
  for (let i = 0; i < maxRetry; i++) {
    try {
      if (!url) throw new Error('URLが指定されていません');
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      return;
    } catch (err) {
      lastErr = err;
      await new Promise((res) => setTimeout(res, interval));
    }
  }
  throw lastErr;
}

// Helper function to create a new event
async function createEvent(page: Page, title: string): Promise<{ url: string; id: string }> {
    await gotoWithRetry(page, '/create');
    await page.waitForLoadState('networkidle');
    await expect(page.getByLabel('イベントタイトル')).toBeVisible();
    await page.getByLabel('イベントタイトル').fill(title);
    await page.getByLabel('説明').fill(`${title}のE2E自動テスト用イベント`);
    
    const dateInputs = await page.locator('input[type="date"]').all();
    if (dateInputs.length >= 2) {
      await dateInputs[0].fill('2099-04-01');
      await dateInputs[1].fill('2099-04-05');
    }
    const timeInputs = await page.locator('input[type="time"]').all();
    if (timeInputs.length >= 2) {
      await timeInputs[0].fill('10:00');
      await timeInputs[1].fill('20:00');
    }

    const termsCheckbox = page.getByLabel('利用規約');
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check();
    }

    await page.getByRole('button', { name: /イベントを作成/ }).click();
    await page.waitForURL(/\/event\//, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    
    const url = page.url();
    const id = url.split('/event/')[1].split('?')[0];
    return { url, id };
}

test.describe('イベントURL/IDから開く機能', () => {
  let eventInfo: { url: string; id: string };
  const eventTitle = `URL開くテストイベント-${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    eventInfo = await createEvent(page, eventTitle);
    await page.close();
  });

  test('有効なURLまたはIDで正しく遷移し、無効な入力ではエラーを表示する', async ({ page }) => {
    const urlInput = page.getByLabel('イベントURLまたはID');
    const openButton = page.getByRole('button', { name: '開く' });
    const publicUrl = eventInfo.url.split('?')[0];

    // 1. 正常系（フルURL）
    await gotoWithRetry(page, '/home');
    await urlInput.fill(eventInfo.url); // Admin URLを入力
    await openButton.click();
    // Public URLに遷移することを期待
    await page.waitForURL(publicUrl, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(publicUrl);
    await expect(page.getByRole('heading', { name: eventTitle })).toBeVisible();

    // 2. 正常系（IDのみ）
    await gotoWithRetry(page, '/home');
    await urlInput.fill(eventInfo.id);
    await openButton.click();
    await page.waitForURL(new RegExp(`/event/${eventInfo.id}`), { waitUntil: 'networkidle' });
    await expect(page.url()).toContain(`/event/${eventInfo.id}`);
    await expect(page.getByRole('heading', { name: eventTitle })).toBeVisible();

    // 3. 異常系（無効な形式のID）
    await gotoWithRetry(page, '/home');
    await urlInput.fill('short'); // 8文字未満の無効な形式
    await openButton.click();
    // ページが遷移しないことを確認
    await expect(page).toHaveURL('/home');
    // エラーメッセージが表示されることを確認
    const errorMessage = page.locator('p.text-error');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('有効なイベントIDまたはURLを入力してください');
  });
});
