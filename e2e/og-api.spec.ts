import { test, expect } from '@playwright/test';

test.describe('OG画像API', () => {
  test('トップページ用OG画像が生成される', async ({ request }) => {
    const res = await request.get('/api/og?type=home');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/');
    const buf = await res.body();
    expect(buf.byteLength).toBeGreaterThan(1000);
  });

  test('イベント用OG画像が生成される（dateパラメータなし）', async ({ request }) => {
    const title = encodeURIComponent('テストイベント');
    const res = await request.get(`/api/og?type=event&title=${title}`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/');
    const buf = await res.body();
    expect(buf.byteLength).toBeGreaterThan(1000);
  });

  test('type未指定や不正なtypeでもデフォルト画像が返る', async ({ request }) => {
    const res1 = await request.get('/api/og');
    expect(res1.status()).toBe(200);
    expect(res1.headers()['content-type']).toContain('image/');
    const buf1 = await res1.body();
    expect(buf1.byteLength).toBeGreaterThan(1000);

    const res2 = await request.get('/api/og?type=unknown');
    expect(res2.status()).toBe(200);
    expect(res2.headers()['content-type']).toContain('image/');
    const buf2 = await res2.body();
    expect(buf2.byteLength).toBeGreaterThan(1000);
  });
});
