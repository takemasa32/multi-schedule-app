import { test, expect } from '@playwright/test';

test.describe('LINE アプリ内ブラウザ リダイレクト処理', () => {
  test('LINEアプリ内ブラウザでアクセスすると自動リダイレクトされる', async ({ browser }) => {
    const context = await browser.newContext({
      userAgent: 'Line/11.1.0',
    });
    const page = await context.newPage();

    // トップページにアクセス
    const response = await page.goto('/');

    // リダイレクトが発生することを確認
    expect(page.url()).toContain('openExternalBrowser=1');
    expect(response?.status()).toBe(200); // 最終的には200で表示される

    await context.close();
  });

  test('LINE App (デスクトップ版) でもリダイレクトされる', async ({ browser }) => {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 Line App Desktop',
    });
    const page = await context.newPage();

    await page.goto('/event/test-id');
    expect(page.url()).toContain('openExternalBrowser=1');

    await context.close();
  });

  test('通常のブラウザではリダイレクトされない', async ({ page }) => {
    // デフォルトのUser-Agentを使用
    await page.goto('/');

    // リダイレクトが発生しないことを確認
    expect(page.url()).not.toContain('openExternalBrowser=1');
  });

  test('既にopenExternalBrowser=1が付いている場合は重複リダイレクトしない', async ({ browser }) => {
    const context = await browser.newContext({
      userAgent: 'Line/11.1.0',
    });
    const page = await context.newPage();

    // 既にパラメータが付いたURLにアクセス
    const targetUrl = '/?openExternalBrowser=1';
    await page.goto(targetUrl);

    // リダイレクト後のURLを取得
    const finalUrl = page.url();

    // URLが元のURLと一致し、重複リダイレクトが発生していないことを確認
    expect(finalUrl).toContain('/?openExternalBrowser=1');
    expect(finalUrl).not.toContain('openExternalBrowser=1&openExternalBrowser=1');
    expect(page.url()).toContain('openExternalBrowser=1');

    await context.close();
  });

  test('APIルートはリダイレクトされない', async ({ browser }) => {
    const context = await browser.newContext({
      userAgent: 'Line/11.1.0',
    });
    const page = await context.newPage();

    // API ルートにアクセス
    const response = await page.request.get('/api/og');

    // APIレスポンスが正常に返されることを確認
    expect(response.status()).toBe(200);

    await context.close();
  });
});
