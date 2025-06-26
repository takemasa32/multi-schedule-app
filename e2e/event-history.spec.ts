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

async function createEvent(page: Page, title: string): Promise<string> {
    await gotoWithRetry(page, '/create');
    await page.waitForLoadState('networkidle');
    await expect(page.getByLabel('イベントタイトル')).toBeVisible();
    await page.getByLabel('イベントタイトル').fill(title);
    await page.getByLabel('説明').fill(`${title}のE2E自動テスト用イベント`);
    
    const dateInputs = await page.locator('input[type="date"]').all();
    if (dateInputs.length >= 2) {
      await dateInputs[0].fill('2099-03-01');
      await dateInputs[1].fill('2099-03-05');
    }
    const timeInputs = await page.locator('input[type="time"]').all();
    if (timeInputs.length >= 2) {
      await timeInputs[0].fill('12:00');
      await timeInputs[1].fill('18:00');
    }

    const termsCheckbox = page.getByLabel('利用規約');
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check();
    }

    await page.getByRole('button', { name: /イベントを作成/ }).click();
    await page.waitForURL(/\/event\//, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    
    return page.url();
}

test.describe.serial('最近アクセス履歴機能', () => {
  const eventTitle1 = `履歴テストイベント1-${Date.now()}`;
  const eventTitle2 = `履歴テストイベント2-${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    // テスト前に履歴をクリア
    const page = await browser.newPage();
    await gotoWithRetry(page, '/home');
    await page.evaluate(() => localStorage.removeItem('eventHistory'));
    await page.close();
  });

  test('訪問したイベントが履歴に正しく追加され、表示される', async ({ page }) => {
    // 1. 最初のイベントを作成して訪問
    await createEvent(page, eventTitle1);
    await gotoWithRetry(page, '/home');

    // 2. ホーム画面で履歴を確認 (1件目)
    const historyList = page.locator('div.bg-base-200 > ul');
    await expect(historyList).toBeVisible();
    const firstItem = historyList.locator('li').first();
    await expect(firstItem).toContainText(eventTitle1);

    // 3. 二つ目のイベントを作成して訪問
    await createEvent(page, eventTitle2);
    await gotoWithRetry(page, '/home');

    // 4. ホーム画面で履歴を確認 (2件、新しい順)
    await expect(historyList).toBeVisible();
    const listItems = await historyList.locator('li').all();
    expect(listItems.length).toBeGreaterThanOrEqual(2);
    
    // 1番目に新しいイベントが表示される
    await expect(listItems[0]).toContainText(eventTitle2);
    // 2番目に古いイベントが表示される
    await expect(listItems[1]).toContainText(eventTitle1);
  });
});
