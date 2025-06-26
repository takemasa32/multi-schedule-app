import { test, expect } from '@playwright/test';

test.describe('エラーページ', () => {
  test('存在しないイベントページにアクセスすると404ページが表示される', async ({ page }) => {
    const response = await page.goto('/event/this-is-invalid-id');

    if (response?.status() !== 404) {
      // 404でなかった場合、500エラーページのテキストが表示されているか確認
      await expect(page.getByRole('heading', { name: '予期せぬエラーが発生しました' })).toBeVisible({ timeout: 10000 });
      // このアサーションが通った場合、意図的にテストを失敗させて、500エラーが表示されていることを知らせる
      expect(response?.status(), 'Expected 404 but received 500').toBe(404);
    }

    // 404ページの主要な要素が表示されていることを確認
    await expect(page.getByRole('heading', { name: '404', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'ページが見つかりません', level: 2 })).toBeVisible();
    await expect(page.getByText('お探しのページは存在しないか、移動または削除された可能性があります。')).toBeVisible();
    await expect(page.getByRole('link', { name: 'トップページに戻る' })).toBeVisible();
  });
});