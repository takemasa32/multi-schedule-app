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
let participantName: string;

// Playwrightのテストでwindow.navigator.clipboardをモックするための型定義
declare global {
  interface Window {
    /** Playwright の addInitScript で設定するカスタムプロパティ */
    _copiedText: string;
  }
}

// 直列でE2Eフローを分割

test.describe.serial('イベントE2Eフロー', () => {
  test('イベント作成', async ({ page }) => {
    await gotoWithRetry(page, '/create');
    await expect(page.getByLabel('イベントタイトル')).toBeVisible();
    await page.getByLabel('イベントタイトル').fill('E2Eテストイベント');
    await page.getByLabel('説明').fill('E2E自動テスト用イベント');
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
    const termsCheckbox = page.getByLabel('利用規約');
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check();
    }
    await page.getByRole('button', { name: /イベントを作成/ }).click();
    await page.waitForURL(/\/event\//);
    eventUrl = page.url();
    expect(eventUrl).toMatch(/\/event\//);
  });

  test('参加者がheatmapで回答', async ({ context }) => {
    const participantPage = await context.newPage();
    await gotoWithRetry(participantPage, eventUrl.replace('?admin=', '?dummy='));
    await expect(participantPage.getByRole('link', { name: /新しく回答する/ })).toBeVisible();
    await participantPage.getByRole('link', { name: /新しく回答する/ }).click();
    await participantPage.waitForURL(/\/input/);
    participantName = `E2E参加者${Date.now()}`;
    await participantPage.getByLabel('お名前').fill(participantName);
    const participantTerms = participantPage.getByLabel('利用規約');
    if (await participantTerms.isVisible()) {
      await participantTerms.check();
    }
    const dateDivs = participantPage.locator('div[data-date-id]');
    await dateDivs.first().click();
    if (await dateDivs.count() >= 2) {
      await dateDivs.nth(1).click();
    }
    await expect(dateDivs.first()).toContainText('○');
    if (await dateDivs.count() >= 2) {
      await expect(dateDivs.nth(1)).toContainText('○');
    }
    expect(participantPage.url()).toContain('/input');
    const participantTerms2 = participantPage.getByLabel('利用規約');
    if (await participantTerms2.isVisible()) {
      await participantTerms2.check();
    }
    await participantPage.getByRole('button', { name: /回答を送信/ }).click();
    const backToSummaryBtn = participantPage.getByRole('button', { name: /回答状況の確認・集計に戻る/ });
    if (await backToSummaryBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backToSummaryBtn.click();
    }
    await participantPage.waitForLoadState('networkidle');

    await participantPage.waitForTimeout(1000);
    await participantPage.waitForLoadState('networkidle');
    await expect(participantPage.getByText('個別')).toBeVisible({ timeout: 10000 });
    await participantPage.getByText('個別').click();
    // 参加者が1人以上表示されていることを検証
    try {
      await expect(participantPage.getByRole('cell', { name: new RegExp(participantName) })).toBeVisible({ timeout: 10000 });
     } catch (e) {
      const html = await participantPage.content();
      console.log('DEBUG: 参加者表示失敗 page.content()', html);
      throw e;
    }
    await participantPage.close();
  });

  test('週表示で別参加者が回答', async ({ page }) => {
    await gotoWithRetry(page, eventUrl); // 明示的にイベント詳細ページへ遷移
    await page.waitForTimeout(1000); // 安定化
    await expect(page.getByRole('heading', { name: 'E2Eテストイベント' })).toBeVisible({ timeout: 10000 });
    // 参加者が1人以上いることを検証
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('個別')).toBeVisible({ timeout: 10000 });
    await page.getByText('個別').click();
    try {
      await expect(page.getByRole('cell', { name: new RegExp(participantName) })).toBeVisible({ timeout: 10000 });
    } catch (e) {
      const html = await page.content();
      console.log('DEBUG: 3件目参加者表示失敗 page.content()', html);
      throw e;
    }
    try {
      await expect(page.getByText('個別')).toBeVisible({ timeout: 10000 });
    } catch (e) {
      const html = await page.content();
      console.log('DEBUG: page.content()', html);
      throw e;
    }
    await page.getByText('個別').click();
    await expect(page.getByRole('cell', { name: new RegExp(participantName) })).toBeVisible({ timeout: 10000 });
    await page.reload();
    await page.getByRole('link', { name: '新しく回答する' }).click();
    await page.waitForURL(/\/input$/);
    await page.getByLabel('お名前').fill('週表示参加者');
    await page.getByRole('button', { name: /曜日ごとの時間帯設定/ }).click();
    await page.locator('td[data-day="月"][data-time-slot]').first().click();
    await page.getByRole('button', { name: '設定を適用する' }).click();
    const terms2 = page.getByLabel('利用規約');
    if (await terms2.isVisible()) {
      await terms2.check();
    }
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /回答を送信/ }).click();
    const backToSummaryBtn = page.getByRole('button', { name: /回答状況の確認・集計に戻る/ });
    if (await backToSummaryBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backToSummaryBtn.click();
    }
    await page.waitForTimeout(1000);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('個別')).toBeVisible({ timeout: 10000 });
    await page.getByText('個別').click();
    await expect(page.getByRole('cell', { name: new RegExp('週表示参加者') })).toBeVisible({ timeout: 10000 });
  });

  test('既存回答の編集', async ({ page, context }) => {
    await gotoWithRetry(page, eventUrl); // 明示的にイベント詳細ページへ遷移
    await page.waitForTimeout(1000); // 安定化
    await page.getByRole('button', { name: /既存の回答を編集/ }).click();

    const originalParticipantName = await page.getByRole('link', { name: '週表示参加者' }).textContent();
    const participantNamePrefix = originalParticipantName?.split(' ')[0] || '週表示参加者';
    await page.getByRole('link', { name: new RegExp(`^${participantNamePrefix}`) }).click();
    await page.waitForURL(/\/input\?participant_id=/);
    const newName = `${participantNamePrefix}-編集`;
    await page.getByLabel('お名前').fill(newName);
    const editTermsCheckbox = page.getByLabel('利用規約');
    if (await editTermsCheckbox.isVisible()) {
      await editTermsCheckbox.check();
    }
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: '回答を更新する' }).click();
    const backToSummaryBtn = page.getByRole('button', { name: /回答状況の確認・集計に戻る/ });
    if (await backToSummaryBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backToSummaryBtn.click();
    }
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await expect(page.url()).not.toContain('/input');
    const verifyPage = await context.newPage();
    await gotoWithRetry(verifyPage, eventUrl);
    await verifyPage.waitForLoadState('networkidle');
    await expect(verifyPage.getByText('個別')).toBeVisible({ timeout: 10000 });
    await verifyPage.getByText('個別').click();
    await expect(verifyPage.getByRole('cell', { name: '週表示参加者-編集 この参加者の予定を編集' }).locator('span')).toBeVisible({ timeout: 10000 });
    await verifyPage.close();
  });

  test('主催者確定・カレンダー連携', async ({ context }) => {
    const adminPage = await context.newPage();
    await gotoWithRetry(adminPage, eventUrl);
    await adminPage.waitForLoadState('networkidle');
    await expect(adminPage.getByRole('heading', { name: 'みんなの回答状況' })).toBeVisible();
    // 日程の確定セクションを展開
    const openFinalizeBtn = await adminPage.getByRole('button', { name: /日程の確定を開く/ });
    await openFinalizeBtn.click();
    const selectableCell = await adminPage.getByRole('button', { name: '人 50%' }).first();

    await selectableCell.click();
    await expect(adminPage.getByText(/選択中: *1件/)).toBeVisible({ timeout: 3000 });
    const finalizeBtn = await adminPage.getByRole('button', { name: /選択した日程で確定する|確定する/ });
    await finalizeBtn.click();
    const confirmBtn = await adminPage.getByRole('button', { name: /確定する|現在の確定内容を維持する/ });
    await confirmBtn.click();
    await adminPage.waitForLoadState('networkidle');
    const icsLink = adminPage.getByRole('link', { name: /カレンダーに追加/ });

    await expect(icsLink).toBeVisible({ timeout: 10000 });
    const icsHref = await icsLink.getAttribute('href');
    expect(icsHref).toMatch(/\/api\/calendar\/ics\//);
    const googleCalLink = adminPage.getByRole('link', { name: /Googleカレンダー/ });
    await expect(googleCalLink).toBeVisible();
    const googleHref = await googleCalLink.getAttribute('href');
    expect(googleHref).toMatch(/\/api\/calendar\/.*\?googleCalendar=true/);
    // 2) request フィクスチャを使って GET、リダイレクトを追わない
    const apiResponse = await adminPage.request.get(googleHref!, { maxRedirects: 0 });
    expect(apiResponse.status()).toBe(307);
    const redirectUrl = apiResponse.headers()['location'];
    expect(redirectUrl).toMatch(/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/);
    await adminPage.close();
  });

  test('主催者が確定解除（全日程の確定をキャンセル）できる', async ({ context }) => {
    const adminPage = await context.newPage();
    await gotoWithRetry(adminPage, eventUrl);
    await adminPage.waitForLoadState('networkidle');
    await expect(adminPage.getByRole('heading', { name: 'みんなの回答状況' })).toBeVisible();
    // 日程の確定セクションを展開
    const openFinalizeBtn = await adminPage.getByRole('button', { name: /日程の確定を開く/ });
    await openFinalizeBtn.click();
    // 既に確定済みのセルをすべてクリックして選択解除
    const selectedCells = await adminPage.locator('td.border-accent').all();
    for (const cell of selectedCells) {
      await cell.click();
    }
    // 「選択中: 0件の日程」表示を確認
    await expect(adminPage.getByText(/選択中: *0件/)).toBeVisible({ timeout: 3000 });
    // 確定ボタンを押す
    const finalizeBtn = await adminPage.getByRole('button', { name: /確定を解除する|解除する/ });
    await finalizeBtn.click();

    // // 「確定を解除する」ボタンを押す
    // const confirmBtn = await adminPage.getByRole('button', { name: /確定を解除する/ });
    // await confirmBtn.click();
    await adminPage.waitForLoadState('networkidle');
    // 解除後、確定済み日程のアラートが消えていること（または確定済み日程が0件であること）
    await expect(adminPage.getByText('確定済みの日程があります')).not.toBeVisible();
    await adminPage.close();
  });

  test('イベント共有ボタンのURLが公開URLと一致する', async ({ page }) => {
    // ページ読み込み前に確実に走らせる
    await page.addInitScript(() => {
      // navigator.share を無効化
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        configurable: true
      });

      // clipboard.writeText をモックして window._copiedText に書き込む
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: (text: string) => {
            window._copiedText = text;
            return Promise.resolve();
          }
        },
        configurable: true
      });

      // テスト用変数も初期化
      window._copiedText = '';
    });

    // イベント詳細ページへ遷移
    await gotoWithRetry(page, eventUrl);

    // 共有ボタンをクリック
    const shareBtn = page.getByRole('button', { name: /共有|イベントURLを共有/ });
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    // クリップボードにコピーされた内容を取得
    const copied = await page.evaluate(() => window._copiedText);
    const expectedUrl = eventUrl.replace(/\?admin=.*/, '');

    expect(copied).toBe(expectedUrl);
  });

});
