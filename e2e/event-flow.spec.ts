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

test('イベント作成→参加者回答→週表示回答→既存回答編集→主催者確定→カレンダー連携', async ({ page, context, request }) => {
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

  // ユニークな参加者名を生成
  const participantName = `E2E参加者${Date.now()}`;
  await participantPage.getByLabel('お名前').fill(participantName);
  const participantTerms = participantPage.getByLabel('利用規約');
  if (await participantTerms.isVisible()) {
    await participantTerms.check();
  }

  // “クリックすべき要素” を <div> に限定して取得する
  const dateDivs = participantPage.locator('div[data-date-id]');

  // １番目・２番目をクリック
  await dateDivs.first().click();
  if (await dateDivs.count() >= 2) {
    await dateDivs.nth(1).click();
  }

// クリック後、ちゃんと “○” に変わっているか検証
  await expect(dateDivs.first()).toContainText('○');
  if (await dateDivs.count() >= 2) {
    await expect(dateDivs.nth(1)).toContainText('○');
  }



  // 回答送信前に現在がinputページであることを確認
  expect(participantPage.url()).toContain('/input');
  // 利用規約チェック（送信直前にも念のため）
  const participantTerms2 = participantPage.getByLabel('利用規約');
  if (await participantTerms2.isVisible()) {
    await participantTerms2.check();
  }
  await participantPage.getByRole('button', { name: /回答を送信/ }).click();
  // 「回答状況の確認・集計に戻る」ボタンがあればクリックしてイベント詳細ページに戻る
  const backToSummaryBtn = participantPage.getByRole('button', { name: /回答状況の確認・集計に戻る/ });
  if (await backToSummaryBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await backToSummaryBtn.click();
  }
  await participantPage.waitForLoadState('networkidle');// 切り替わり後の検証

  await page.waitForTimeout(1000); // 念のため少し待機

  // 参加者登録が反映されるまで少し待機し、最新状態を取得
  await participantPage.waitForLoadState('networkidle');// 切り替わり後の検証
  await participantPage.close(); // タブを閉じてリソース解放
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'E2Eテストイベント' })).toBeVisible();

  // 「個別表示」タブをクリック
  await expect(page.getByText('個別')).toBeVisible({ timeout: 5000 });
  await page.getByText('個別').click();


  // await page.pause(); //MARK: 一時停止
  // 参加者の回答が反映されたことを確認
  await expect(page.getByRole('cell', { name: new RegExp(participantName) })).toBeVisible();

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

  // await page.waitForTimeout(1000); // 念のため少し待機
  await page.waitForLoadState('networkidle');// 切り替わり後の検証
  await page.getByRole('button', { name: /回答を送信/ }).click();
  // 「回答状況の確認・集計に戻る」ボタンがあればクリックしてイベント詳細ページに戻る
  if (await backToSummaryBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await backToSummaryBtn.click();
  }

  // 「個別表示」タブをクリックして参加者名が表示されるようにする
  await page.waitForTimeout(1000); // 念のため少し待機
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('個別')).toBeVisible({ timeout: 5000 });
  await page.getByText('個別').click();

  // 個別表示モードで参加者名が表示されていることを確認
  await expect(page.getByRole('cell', { name: new RegExp('週表示参加者') })).toBeVisible();
  // 5. 既存回答の編集機能をテスト
  await page.getByRole('button', { name: /既存の回答を編集/ }).click();

  // 具体的に表示されている参加者名を取得して編集リンクをクリック
  const originalParticipantName = await page.locator('td >> text=/週表示参加者/').first().textContent();
  const participantNamePrefix = originalParticipantName?.split(' ')[0] || '週表示参加者';
  await page.getByRole('link', { name: new RegExp(`^${participantNamePrefix}`) }).click();

  await page.waitForURL(/\/input\?participant_id=/);

  // 名前を編集
  const newName = `${participantNamePrefix}-編集`;
  await page.getByLabel('お名前').fill(newName);
  const editTermsCheckbox = page.getByLabel('利用規約');
  if (await editTermsCheckbox.isVisible()) {
    await editTermsCheckbox.check();
  }

  // 確実に送信できるように十分待機
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: '回答を更新する' }).click();

  // 送信後の状態確認のため長めに待機
  await page.waitForTimeout(1000);
  // inputがURLに含まれていないことを確認

  await page.waitForLoadState('networkidle');
  await expect(page.url()).not.toContain('/input');

  // 「個別表示」タブで編集後の名前が表示されていることの確認は、別ページ（新しいタブ）で行う
  const verifyPage = await context.newPage();
  await gotoWithRetry(verifyPage, eventUrl);
  await verifyPage.waitForLoadState('networkidle');
  await expect(verifyPage.getByText('個別')).toBeVisible({ timeout: 10000 });
  await verifyPage.getByText('個別').click();

  // 編集した名前が表示されていることを確認 (パターンで検索)
  await expect(verifyPage.getByRole('cell', { name: '週表示参加者-編集 この参加者の予定を編集' }).locator('span')).toBeVisible({ timeout: 10000 });
  await verifyPage.close();

  // 6. 主催者画面で集計反映・日程確定・カレンダー連携を新しいウィンドウで実施
  const adminPage = await context.newPage();
  await gotoWithRetry(adminPage, eventUrl);
  await adminPage.waitForLoadState('networkidle');

  // await adminPage.pause(); //MARK: 一時停止

  await expect(adminPage.getByRole('heading', { name: 'みんなの回答状況' })).toBeVisible();
  // 日程マトリクスの最初の選択可能なセルをクリックして選択状態にする
  const selectableCell = await adminPage.locator('td.cursor-pointer').filter({ hasText: /人/ }).first();
  await selectableCell.click();
  // 選択状態が反映されるまで待機
  await expect(adminPage.getByText(/選択中: *1件/)).toBeVisible({ timeout: 3000 });
  // ボタン名を実装に合わせて柔軟に取得
  const finalizeBtn = await adminPage.getByRole('button', { name: /選択した日程で確定する|確定する/ });
  await finalizeBtn.click();


  const confirmBtn = await adminPage.getByRole('button', { name: /確定する|現在の確定内容を維持する/ });
  await confirmBtn.click();

  // ページの再読み込みや状態反映を十分に待つ
  await adminPage.waitForLoadState('networkidle');

  // 「カレンダーに追加」リンクの表示とhref属性を確認
  const icsLink = adminPage.getByRole('link', { name: /カレンダーに追加/ });
  await expect(icsLink).toBeVisible({ timeout: 10000 });
  const icsHref = await icsLink.getAttribute('href');
  expect(icsHref).toMatch(/\/api\/calendar\/ics\//);

// 「Googleカレンダー」リンクの表示とhref属性を確認
const googleCalLink = adminPage.getByRole('link', { name: /Googleカレンダー/ });
await expect(googleCalLink).toBeVisible();
const googleHref = await googleCalLink.getAttribute('href');
expect(googleHref).toMatch(/\/api\/calendar\/.*\?googleCalendar=true/);

// 2) request フィクスチャを使って GET、リダイレクトを追わない
const apiResponse = await request.get(googleHref!, { maxRedirects: 0 });
// Google へのリダイレクトは 307 なのでそれを期待
expect(apiResponse.status()).toBe(307);

// 3) Location ヘッダーに Google カレンダー編集画面 URL が入っていることを確認
const redirectUrl = apiResponse.headers()['location'];
expect(redirectUrl).toMatch(/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/);

await adminPage.close();
});
