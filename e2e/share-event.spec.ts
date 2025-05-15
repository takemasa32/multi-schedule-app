import { test, expect } from '@playwright/test';

// イベント詳細ページで「イベントを共有」ボタンのURLが正しいか検証

test.describe('イベント共有機能', () => {
  let eventUrl: string;

  test.beforeAll(async ({ page }) => {
    // 1. テスト用イベントを作成
    await page.goto('/create');
    await page.getByLabel('イベントタイトル').fill('共有テストイベント');
    await page.getByLabel('説明').fill('共有テスト用イベント');
    const dateInputs = await page.locator('input[type="date"]').all();
    if (dateInputs.length >= 2) {
      await dateInputs[0].fill('2099-01-01');
      await dateInputs[1].fill('2099-01-02');
    }
    const timeInputs = await page.locator('input[type="time"]').all();
    if (timeInputs.length >= 2) {
      await timeInputs[0].fill('10:00');
      await timeInputs[1].fill('12:00');
    }
    const termsCheckbox = page.getByLabel('利用規約');
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check();
    }
    await page.getByRole('button', { name: /イベントを作成/ }).click();
    await page.waitForURL(/\/event\//);
    eventUrl = page.url();
  });

  test('共有ボタンのURLが公開URLと一致する', async ({ page }) => {
    await page.goto(eventUrl);
    // 共有ボタンを取得
    const shareBtn = page.getByRole('button', { name: /共有|イベントURLを共有/ });
    await expect(shareBtn).toBeVisible();
    // ボタンのdata-url属性やクリップボードコピー内容を検証
    // クリップボードAPIをモックしてクリック
    await page.evaluate(() => {
      // @ts-ignore
      navigator.clipboard = { writeText: jest.fn() };
    });
    await shareBtn.click();
    // クリップボードにコピーされた内容がeventUrlと一致するか
    // PlaywrightのクリップボードAPIで検証
    const copied = await page.evaluate(() => navigator.clipboard?.writeText.mock.calls[0][0]);
    expect(copied).toBe(eventUrl.replace(/\?admin=.*/, ''));
  });
});
