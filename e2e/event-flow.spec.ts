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

async function waitForEventDetail(page: Page) {
  const expectedUrl = eventPublicUrl || eventAdminUrl;
  if (!expectedUrl) {
    throw new Error('イベントURLが初期化されていません');
  }
  const expectedPrefix = eventPublicUrl || expectedUrl;
  await page.waitForURL(
    (url) => {
      const current = url.toString();
      if (current === expectedUrl) return true;
      return current.startsWith(expectedPrefix);
    },
    { timeout: 15000 },
  );
}

async function dumpPageHtml(page: Page, label: string) {
  if (page.isClosed()) {
    console.log(`${label} (ページが既にクローズされています)`);
    return;
  }
  const html = await page.content();
  console.log(label, html);
}

let eventAdminUrl: string;
let eventPublicUrl: string;
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
  test.describe.configure({ timeout: 60_000 });

  test('イベント作成', async ({ page }) => {
    await gotoWithRetry(page, '/create');
    await page.waitForLoadState('networkidle');
    await expect(page.getByLabel('イベントタイトル')).toBeVisible();
    await page.getByLabel('イベントタイトル').fill('E2Eテストイベント');
    await page.getByTestId('event-description-input').fill('E2E自動テスト用イベント');
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
    try {
      await page.waitForURL(/\/event\//, { timeout: 15000 });
      await page.waitForLoadState('networkidle');
    } catch (e) {
      await dumpPageHtml(page, 'DEBUG: イベント作成後の画面HTML');
      throw e;
    }
    eventAdminUrl = page.url();
    expect(eventAdminUrl).toMatch(/\/event\//);
    const adminUrl = new URL(eventAdminUrl);
    adminUrl.searchParams.delete('admin');
    eventPublicUrl = adminUrl.toString();
    expect(eventPublicUrl).toMatch(/\/event\//);
  });

  test('参加者がheatmapで回答', async ({ context }) => {
    const participantPage = await context.newPage();
    await gotoWithRetry(participantPage, eventPublicUrl || eventAdminUrl);
    await participantPage.waitForLoadState('networkidle');
    await expect(participantPage.getByRole('link', { name: /新しく回答する/ })).toBeVisible();
    await participantPage.getByRole('link', { name: /新しく回答する/ }).click();
    await participantPage.waitForURL(/\/input/);
    participantName = `E2E参加者${Date.now()}`;
    await participantPage.getByLabel('お名前').fill(participantName);
    await participantPage.getByLabel('コメント・メモ').fill('E2Eコメント');
    const participantTerms = participantPage.getByLabel('利用規約');
    if (await participantTerms.isVisible()) {
      await participantTerms.check();
    }
    const dateDivs = participantPage.locator('div[data-date-id]');
    await dateDivs.first().click();
    if ((await dateDivs.count()) >= 2) {
      await dateDivs.nth(1).click();
    }
    await expect(dateDivs.first()).toContainText('○');
    if ((await dateDivs.count()) >= 2) {
      await expect(dateDivs.nth(1)).toContainText('○');
    }
    expect(participantPage.url()).toContain('/input');
    const participantTerms2 = participantPage.getByLabel('利用規約');
    if (await participantTerms2.isVisible()) {
      await participantTerms2.check();
    }
    await participantPage.getByRole('button', { name: /回答を送信/ }).click();

    // 回答送信後の画面遷移を待機し、"回答状況の確認・集計に戻る" ボタンがあればクリック
    await waitForEventDetail(participantPage);
    const backToSummaryBtn = participantPage.getByRole('button', {
      name: /回答状況の確認・集計に戻る/,
    });
    if (await backToSummaryBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await backToSummaryBtn.click();
    }

    // "個別" タブが表示されるまで待機
    const individualTab = participantPage
      .locator('[data-testid$="availability-tab-detailed"]')
      .first();
    await expect(individualTab).toBeVisible({ timeout: 15000 });
    await individualTab.click();

    // 新しく追加した参加者が表示されるまで待機
    try {
      await expect(
        participantPage.getByRole('cell', {
          name: new RegExp(participantName),
        }),
      ).toBeVisible({ timeout: 15000 });
    } catch (e) {
      await dumpPageHtml(participantPage, 'DEBUG: 参加者表示失敗 page.content()');
      throw e;
    }
    await participantPage.close();
  });

  test('週表示で別参加者が回答', async ({ page }) => {
    await gotoWithRetry(page, eventAdminUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // 安定化
    await expect(page.getByRole('heading', { name: 'E2Eテストイベント' })).toBeVisible({
      timeout: 10000,
    });
    // 参加者が1人以上いることを検証
    await page.waitForLoadState('networkidle');
    const adminDetailedTab = page.locator('[data-testid$="availability-tab-detailed"]').first();
    await expect(adminDetailedTab).toBeVisible({ timeout: 10000 });
    await adminDetailedTab.click();
    try {
      await expect(page.getByRole('cell', { name: new RegExp(participantName) })).toBeVisible({
        timeout: 10000,
      });
    } catch (e) {
      await dumpPageHtml(page, 'DEBUG: 3件目参加者表示失敗 page.content()');
      throw e;
    }
    try {
      await expect(page.locator('[data-testid$="availability-tab-detailed"]').first()).toBeVisible({
        timeout: 10000,
      });
    } catch (e) {
      await dumpPageHtml(page, 'DEBUG: page.content()');
      throw e;
    }
    await page.locator('[data-testid$="availability-tab-detailed"]').first().click();
    await expect(page.getByRole('cell', { name: new RegExp(participantName) })).toBeVisible({
      timeout: 10000,
    });
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

    // 回答送信後の画面遷移を待機し、"回答状況の確認・集計に戻る" ボタンがあればクリック
    await waitForEventDetail(page);
    const backToSummaryBtn = page.getByRole('button', {
      name: /回答状況の確認・集計に戻る/,
    });
    if (await backToSummaryBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await backToSummaryBtn.click();
    }

    // "個別" タブが表示されるまで待機
    const individualTab = page.locator('[data-testid$="availability-tab-detailed"]').first();
    await expect(individualTab).toBeVisible({ timeout: 15000 });
    await individualTab.click();

    // 新しく追加した参加者が表示されるまで待機
    await expect(page.getByRole('cell', { name: /週表示参加者/ })).toBeVisible({
      timeout: 20000,
    });
  });

  test('既存回答の編集', async ({ page }) => {
    await gotoWithRetry(page, eventAdminUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // 安定化
    await page.getByRole('button', { name: /既存の回答を編集/ }).click();

    const originalParticipantName = await page
      .getByRole('link', { name: '週表示参加者' })
      .textContent();
    const participantNamePrefix = originalParticipantName?.split(' ')[0] || '週表示参加者';
    await page.getByRole('link', { name: new RegExp(`^${participantNamePrefix}`) }).click();
    await page.waitForURL(/\/input\?participant_id=/);
    const newName = `${participantNamePrefix}-編集`;
    await page.getByLabel('お名前').fill(newName);
    const editTermsCheckbox = page.getByLabel('利用規約');
    if (await editTermsCheckbox.isVisible()) {
      await editTermsCheckbox.check();
    }
    await page.getByRole('button', { name: '回答を更新する' }).click();

    // 回答更新後の画面遷移を待機し、"回答状況の確認・集計に戻る" ボタンがあればクリック
    await waitForEventDetail(page);
    const backToSummaryBtn = page.getByRole('button', {
      name: /回答状況の確認・集計に戻る/,
    });
    if (await backToSummaryBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await backToSummaryBtn.click();
    }

    // "個別" タブが表示されるまで待機
    const individualTab = page.locator('[data-testid$="availability-tab-detailed"]').first();
    await expect(individualTab).toBeVisible({ timeout: 15000 });
    await individualTab.click();

    // 編集後の参加者名が表示されるまで待機
    await expect(page.getByRole('cell', { name: new RegExp(newName) })).toBeVisible({
      timeout: 10000,
    });
  });

  test('主催者確定・カレンダー連携', async ({ context }) => {
    const adminPage = await context.newPage();
    await gotoWithRetry(adminPage, eventAdminUrl);
    await adminPage.waitForLoadState('networkidle');

    await expect(adminPage.getByRole('heading', { name: 'みんなの回答状況' })).toBeVisible({
      timeout: 10000,
    });

    // 日程の確定セクションを展開
    const openFinalizeBtn = adminPage.getByRole('button', {
      name: /日程の確定を開く/,
    });
    await expect(openFinalizeBtn).toBeVisible();
    await openFinalizeBtn.click();

    const selectableCell = adminPage.getByRole('button', { name: '人 50%' }).first();
    await expect(selectableCell).toBeVisible();
    await selectableCell.click();

    await expect(adminPage.getByText(/選択中: *1件/)).toBeVisible({
      timeout: 3000,
    });

    const finalizeBtn = adminPage.getByRole('button', {
      name: /選択した日程で確定する|確定する/,
    });
    await expect(finalizeBtn).toBeVisible();
    await finalizeBtn.click();

    const confirmBtn = adminPage.getByRole('button', {
      name: /確定する|現在の確定内容を維持する/,
    });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    await adminPage.waitForLoadState('networkidle');

    const icsLink = adminPage.getByRole('link', { name: /カレンダーに追加/ });

    await expect(icsLink).toBeVisible({ timeout: 10000 });
    const icsHref = await icsLink.getAttribute('href');
    expect(icsHref).toMatch(/\/api\/calendar\/ics\//);
    const googleCalLink = adminPage.getByRole('link', {
      name: /Googleカレンダー/,
    });
    await expect(googleCalLink).toBeVisible();
    const googleHref = await googleCalLink.getAttribute('href');
    expect(googleHref).toMatch(/\/api\/calendar\/.*\?googleCalendar=true/);
    // 2) request フィクスチャを使って GET、リダイレクトを追わない
    const apiResponse = await adminPage.request.get(googleHref!, {
      maxRedirects: 0,
    });
    expect(apiResponse.status()).toBe(307);
    const redirectUrl = apiResponse.headers()['location'];
    expect(redirectUrl).toMatch(/calendar\.google\.com\/calendar\/render\?action=TEMPLATE/);
    await adminPage.close();
  });

  test('主催者が確定解除（全日程の確定をキャンセル）できる', async ({ context }) => {
    const adminPage = await context.newPage();
    await gotoWithRetry(adminPage, eventAdminUrl);
    await adminPage.waitForLoadState('networkidle');
    await expect(adminPage.getByRole('heading', { name: 'みんなの回答状況' })).toBeVisible({
      timeout: 10000,
    });
    // 日程の確定セクションを展開
    const openFinalizeBtn = adminPage.getByRole('button', {
      name: /日程の確定を開く/,
    });
    await expect(openFinalizeBtn).toBeVisible();
    await openFinalizeBtn.click();
    // 既に確定済みのセルをすべてクリックして選択解除
    const selectedCells = await adminPage.locator('td.border-accent').all();
    for (const cell of selectedCells) {
      await cell.click();
    }
    // 「選択中: 0件の日程」表示を確認
    await expect(adminPage.getByText(/選択中: *0件/)).toBeVisible({
      timeout: 3000,
    });
    // 確定ボタンを押す
    const finalizeBtn = adminPage.getByRole('button', {
      name: /確定を解除する|解除する/,
    });
    await expect(finalizeBtn).toBeVisible();
    await finalizeBtn.click();

    await adminPage.waitForLoadState('networkidle');
    // 解除後、確定済み日程のアラートが消えていること（または確定済み日程が0件であること）
    await expect(adminPage.getByText('確定済みの日程があります')).not.toBeVisible({
      timeout: 10000,
    });
    await adminPage.close();
  });

  test('イベント共有ボタンのURLが公開URLと一致する', async ({ page }) => {
    // ページ読み込み前に確実に走らせる
    await page.addInitScript(() => {
      // navigator.share を無効化
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        configurable: true,
      });

      // clipboard.writeText をモックして window._copiedText に書き込む
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: (text: string) => {
            window._copiedText = text;
            return Promise.resolve();
          },
        },
        configurable: true,
      });

      // テスト用変数も初期化
      window._copiedText = '';
    });

    // イベント詳細ページへ遷移
    await gotoWithRetry(page, eventAdminUrl);
    await page.waitForLoadState('networkidle');

    // 共有ボタンをクリック
    const shareBtn = page.getByRole('button', {
      name: /イベントを共有|イベントURLを共有/,
    });
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    // クリップボードにコピーされた内容を取得
    const copied = await page.evaluate(() => window._copiedText);
    expect(copied).toBe(eventPublicUrl);
  });

  // クイック自動延長UIのE2Eテスト
  // 仕様: 日程追加セクションで延長日を選択し、クイック自動延長ボタン→モーダルで追加→完了→重複エラーも検証
  test('クイック自動延長で日程追加・重複バリデーション', async ({ page }) => {
    await gotoWithRetry(page, eventAdminUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 日程追加セクションを展開
    const addSection = page.getByText('日程を追加する', { exact: false });
    await addSection.click();
    // details要素を強制的にopenにする
    await page
      .locator('details')
      .first()
      .evaluate((el) => {
        el.setAttribute('open', '');
      });
    // input#extendToDateがvisibleになるまで明示的に待機
    await page.waitForSelector('input#extendToDate', {
      state: 'visible',
      timeout: 5000,
    });
    const dateInput = page.getByLabel('延長したい最終日');

    // input#extendToDateのmin属性値を取得し、+1日した日付を延長日とする
    const minDate = await dateInput.getAttribute('min');
    if (!minDate) throw new Error('min属性が取得できません');
    const minDateObj = new Date(minDate);
    // まず+1日の日付を入力
    minDateObj.setDate(minDateObj.getDate() + 1);
    const yyyy = minDateObj.getFullYear();
    const mm = String(minDateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(minDateObj.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    await dateInput.fill(dateStr);
    // quickBtnがenabledになるまで待機
    const quickBtn = page.getByRole('button', {
      name: /この日まで自動延長して追加/,
    });
    await expect(quickBtn).toBeEnabled({ timeout: 5000 });

    // クイック自動延長ボタン押下
    await quickBtn.click();

    // モーダルで「追加する」ボタン押下
    await page.getByRole('button', { name: /^追加する$/ }).click();

    // 完了ダイアログの表示
    await expect(page.getByText('日程を追加しました').first()).toBeVisible({
      timeout: 10000,
    });

    // 同じ日程で再度追加し重複バリデーション
    await page.locator('input[type="date"]').first().fill(dateStr);
    // ボタンが無効化されていることを確認（UI上の重複チェックが機能していることを検証）
    await expect(quickBtn).toBeDisabled({ timeout: 5000 });
  });

  test('詳細日程追加フォーム-正常系・重複バリデーション', async ({ page }) => {
    await gotoWithRetry(page, eventAdminUrl);
    await page.waitForLoadState('networkidle');

    // 日程追加セクションを展開
    const addSection2 = page.getByText('日程を追加する', { exact: false });
    await expect(addSection2).toBeVisible();
    await addSection2.click();

    // 日付文字列を生成
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate() + 1).padStart(2, '0'); // 明日
    const dateStr = `${yyyy}-${mm}-${dd}`;
    // 日程追加セクションを展開
    const addSection = page.getByText('詳細な日程追加', { exact: false });
    await expect(addSection).toBeVisible();
    await addSection.click();
    // input[type="date"]がvisibleかつ有効になるまで待機
    await page.waitForSelector('input[type="date"]:not([disabled])', {
      state: 'visible',
      timeout: 5000,
    });
    // 柔軟な日程追加（詳細な日程追加）が閉じている場合は開く
    const detailsSummary = page.locator('summary', {
      hasText: '詳細な日程追加',
    });
    const details = detailsSummary.locator('..'); // 親のdetails要素
    if (!(await details.evaluate((el) => (el as HTMLDetailsElement).open))) {
      await detailsSummary.click({ force: true });
    }
    // details内のvisibleなinputのみを取得しfill
    const visibleStartInput = details.locator('input[aria-label="開始日"]:visible');
    const visibleEndInput = details.locator('input[aria-label="終了日"]:visible');
    await visibleStartInput.fill(dateStr);
    await visibleEndInput.fill(dateStr);
    // aria-labelはUI上のラベルと一致させており、柔軟な文言変更にも追従できるようにしている
    const visibleStartTimeInput = details.locator('input[aria-label="各日の開始時刻"]:visible');
    const visibleEndTimeInput = details.locator('input[aria-label="各日の終了時刻"]:visible');
    await visibleStartTimeInput.fill('09:00');
    await visibleEndTimeInput.fill('10:00');
    // 追加ボタン押下
    await page.getByRole('button', { name: /日程を追加/ }).click();
    // 確認モーダルのOKボタン押下
    await page.getByRole('button', { name: /^追加する$/ }).click();

    // 同じ日程を再度追加し、重複エラーを検証
    await page.getByLabel('開始日', { exact: true }).fill(dateStr);
    await page.getByLabel('終了日', { exact: true }).fill(dateStr);
    await page.getByLabel('各日の開始時刻', { exact: true }).fill('09:00');
    await page.getByLabel('各日の終了時刻', { exact: true }).fill('10:00');
    await page.getByRole('button', { name: /日程を追加/ }).click();
    await page.getByRole('button', { name: /^追加する$/ }).click();
    const duplicateAlert = page.getByTestId('event-date-add-error');
    await expect(duplicateAlert).toBeVisible({ timeout: 5000 });
    await expect(duplicateAlert).toContainText(/重複/);
  });
});
