import fs from 'node:fs';
import path from 'node:path';

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('ローディングと鮮度の契約', () => {
  test('イベント表示はアクセス時刻更新を待たず、最新データ取得を永続キャッシュしない', () => {
    const pageSource = readSource('src/app/event/[public_id]/page.tsx');
    const actionSource = readSource('src/lib/actions.ts');

    expect(pageSource).toContain('deferEventLastAccessedTouch(public_id);');
    expect(pageSource).not.toContain('await touchEventLastAccessedIfStale(public_id);\n  } catch');
    expect(actionSource).toContain('const getCachedEvent = cache(fetchEventByPublicToken);');
    expect(actionSource).not.toMatch(/unstable_cache|['"]use cache['"]/);
  });

  test('イベント用スケルトンは実画面と同じコンテナを使い、読み込み状態を通知する', () => {
    const loadingSource = readSource('src/app/event/[public_id]/loading.tsx');

    expect(loadingSource).toContain('pageClassName="app-page"');
    expect(loadingSource).toContain('<EventDetailsSectionSkeleton />');
  });

  test.each([
    ['input', 'app-page-narrow'],
    ['finalize', 'app-page'],
  ])('%s 画面に実レイアウトと対応する専用スケルトンがある', (segment, pageClass) => {
    const loadingSource = readSource(`src/app/event/[public_id]/${segment}/loading.tsx`);

    expect(loadingSource).toContain(`pageClassName="${pageClass}"`);
  });

  test('表示に不要なアクセス記録は各イベント画面でレスポンス後に実行する', () => {
    ['', 'input/', 'finalize/'].forEach((segment) => {
      const pageSource = readSource(`src/app/event/[public_id]/${segment}page.tsx`);
      expect(pageSource).toContain('deferEventLastAccessedTouch(');
      expect(pageSource).not.toContain('touchEventLastAccessedIfStale(');
    });
  });

  test('静的に描画できる作成・履歴ページを強制動的化しない', () => {
    expect(readSource('src/app/create/page.tsx')).not.toContain("dynamic = 'force-dynamic'");
    expect(readSource('src/app/history/page.tsx')).not.toContain("dynamic = 'force-dynamic'");
  });

  test.each(['', 'history/', 'privacy/', 'terms/', 'unauthorized/'])(
    '即時描画できる %s ページにルートスケルトンを置かない',
    (segment) => {
      expect(fs.existsSync(path.join(process.cwd(), `src/app/${segment}loading.tsx`))).toBe(false);
    },
  );
});
