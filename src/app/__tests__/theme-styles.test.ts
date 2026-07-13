import fs from 'node:fs';
import path from 'node:path';

describe('DaySynthテーマ定義', () => {
  const globalsCss = fs.readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8');

  test('lightとdarkの両テーマに状態色を定義する', () => {
    expect(globalsCss).toContain("name: 'light'");
    expect(globalsCss).toContain("name: 'dark'");
    expect(globalsCss.match(/--color-info:/g)).toHaveLength(2);
    expect(globalsCss.match(/--color-success:/g)).toHaveLength(2);
    expect(globalsCss.match(/--color-warning:/g)).toHaveLength(2);
    expect(globalsCss.match(/--color-error:/g)).toHaveLength(2);
  });

  test('用途限定のLP・操作UIスタイルをglobals.cssへ置かない', () => {
    expect(globalsCss).not.toContain('.hero-illustration-dark');
    expect(globalsCss).not.toContain('.drag-surface');
    expect(globalsCss).not.toContain('.participant-toggle');
  });

  test('アイコン単独ボタンでDaisyUIの余白による縮小を防ぐ', () => {
    expect(globalsCss).toContain('.btn.btn-icon');
    expect(globalsCss).toContain('padding-inline: 0');
    expect(globalsCss).toContain('flex-shrink: 0');
  });
});
