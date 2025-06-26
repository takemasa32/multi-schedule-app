import { test, expect } from "@playwright/test";

test.describe("テーマ切り替え機能", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("body");
  });

  test("should switch theme attribute between daysynth, dark, and light", async ({ page }) => {
    const themeSwitcher = page.locator('[aria-label="テーマ切り替え"]');
    const html = page.locator("html");

    // 1. 初期状態（daysynthテーマ）の確認
    // next-themesがマウントされると、デフォルトの'daysynth'が設定される
    await expect(html).toHaveAttribute("data-theme", "daysynth", { timeout: 10000 });

    // 2. ダークモードへの切り替え
    await themeSwitcher.click();
    await expect(html).toHaveAttribute("data-theme", "dark");

    // 3. ライトモードへの再切り替え
    await themeSwitcher.click();
    // ThemeSwitcherは'light'と'dark'をトグルするため、次は'light'になる
    await expect(html).toHaveAttribute("data-theme", "light");
  });
});
