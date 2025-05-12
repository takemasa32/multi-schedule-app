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

test('イベント作成→参加者回答→週表示回答→既存回答編集→主催者確定→カレンダー連携', async ({ page, context }) => {
  // 1. トップページから新規イベント作成ページへ遷移
  await gotoWithRetry(page, '/create');
  await expect(page.getByLabel('イベントタイトル')).toBeVisible();

  // イベントタイトル・説明を入力
  await page.getByLabel('イベントタイトル').fill('E2Eテストイベント');
  await page.getByLabel('説明').fill('E2E自動テスト用イベント');

  // 日程追加
  const dateInputs = await page.locator('input[type="date"]').all();
  if (dateInputs.length >= 2) {
    await dateInputs[0].fill('2099-01-01');
    await dateInputs[1].fill('2099-01-06');
  }
  const timeInputs = await page.locator('input[type="time"]').all();
  if (timeInputs.length >= 2) {
    await timeInputs[0].fill('10:00');
    await timeInputs[1].fill('15:00');
  }

  // 利用規約同意＆イベント作成
  const termsCheckbox = page.getByLabel('利用規約');
  if (await termsCheckbox.isVisible()) {
    await termsCheckbox.check();
  }
  await page.getByRole('button', { name: /イベントを作成/ }).click();

  // 2. イベント詳細ページ遷移・URL取得
  await page.waitForURL(/\/event\//);
  const eventUrl = page.url();
  expect(eventUrl).toMatch(/\/event\//);

  // 3. heatmapモードで参加者回答
  const participantPage = await context.newPage();
  await gotoWithRetry(participantPage, eventUrl.replace('?admin=', '?dummy='));
  await expect(participantPage.getByRole('link', { name: /新しく回答する/ })).toBeVisible();
  await participantPage.getByRole('link', { name: /新しく回答する/ }).click();
  await participantPage.waitForURL(/\/input/);

  await participantPage.getByLabel('お名前').fill('E2E参加者');
  const participantTerms = participantPage.getByLabel('利用規約');
  if (await participantTerms.isVisible()) {
    await participantTerms.check();
  }
  await participantPage.locator('[data-date-id]').first().click();

  // 回答送信前に現在がinputページであることを確認
  expect(participantPage.url()).toContain('/input');
  await participantPage.getByRole('button', { name: /回答を送信/ }).click();
  // 回答送信後にイベントページへ正しく遷移したことを検知
  await participantPage.waitForURL(url => {
    return url.toString().includes('/event/') && !url.toString().includes('/input');
  });
  // イベント詳細ページに戻ったことを確認
  await expect(participantPage.url()).not.toContain('/input');

  const kobetuhyouzi = await page.getByText('個別表示');
  console.log(kobetuhyouzi);
  await page.pause();
  // 「個別」表示に切り替え
  await page.getByText('個別表示').click();
await page.getByText('個別表示').click();

 // 参加者の回答が反映されたことを確認
 await expect(page.getByText('E2E参加者')).toBeVisible();

  await participantPage.close(); // タブを閉じてリソース解放
  // メインページをリロードして情報を最新化
  await page.reload();
  await expect(page.locator('h1')).toBeVisible();
  // 4. 週表示モードで異なる名前で再回答
  await page.getByRole('link', { name: '新しく回答する' }).click();
  await page.waitForURL(/\/input$/);

  await page.getByLabel('お名前').fill('週表示参加者');
  await page.getByRole('button', { name: /曜日ごとの時間帯設定/ }).click();
  // 月曜の最初の時間帯セルをクリック
  await page.locator('td[data-day="月"][data-time-slot]').first().click();
  await page.getByRole('button', { name: '設定を適用する' }).click();

  const terms2 = page.getByLabel('利用規約');
  if (await terms2.isVisible()) {
    await terms2.check();
  }
  await page.getByRole('button', { name: /回答を送信/ }).click();
  await expect(page).toHaveURL(/\/event\//);
  await expect(page.getByText('週表示参加者')).toBeVisible();

  // 5. 既存回答の編集機能をテスト
  await page.getByRole('button', { name: /既存の回答を編集/ }).click();
  await page.getByRole('link', { name: 'E2E参加者' }).click();
  await page.waitForURL(/\/input\?participant_id=/);

  await page.getByLabel('お名前').fill('E2E参加者-編集');
  await page.getByRole('button', { name: '回答を更新する' }).click();
  await expect(page).toHaveURL(/\/event\//);
  await expect(page.getByText('E2E参加者-編集')).toBeVisible();

  // 6. 主催者画面で集計反映・日程確定
  await page.reload();
  await expect(page.getByText('E2E参加者-編集')).toBeVisible();
  const finalizeBtn = page.getByRole('button', { name: /この日程で確定/ });
  await finalizeBtn.click();
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible()) {
    await dialog.getByRole('button', { name: /確定/ }).click();
  }
  await expect(
    page.getByText(/イベント日程が確定しました|確定しました/)
  ).toBeVisible();

  // 7. カレンダー連携（.ics/Googleカレンダー）
  await expect(page.getByRole('link', { name: /カレンダーに追加/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Googleカレンダー/ })).toBeVisible();
});
