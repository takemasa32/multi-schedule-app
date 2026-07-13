import fs from 'node:fs';
import path from 'node:path';

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('非LP画面の視覚契約', () => {
  test('アイブロウは画面種別を示す短い英語に限定する', () => {
    const expectedLabels = new Map([
      ['src/app/create/page.tsx', 'CREATE'],
      ['src/app/account/page.tsx', 'ACCOUNT'],
      ['src/app/history/page.tsx', 'HISTORY'],
      ['src/app/auth/signin/page.tsx', 'SIGN IN'],
      ['src/app/event/[public_id]/input/page.tsx', 'RESPOND'],
      ['src/components/sync/sync-review-page.tsx', 'SYNC'],
      ['src/components/sync/answer-complete-page.tsx', 'COMPLETE'],
    ]);

    expectedLabels.forEach((label, sourcePath) => {
      expect(readSource(sourcePath)).toContain(`>${label}</p>`);
    });

    expect(Array.from(expectedLabels.keys()).map(readSource).join('\n')).not.toMatch(
      />(?:EVENT SETUP|YOUR EVENTS|WELCOME BACK|AVAILABILITY|SYNC REVIEW|SAVED)</,
    );

    expect(readSource('src/components/event-header.tsx')).not.toContain('page-eyebrow');
  });

  test('確定画面で角丸カードと装飾グラデーションを反復しない', () => {
    const finalizeSource = readSource('src/components/event-client/finalize-event-page.tsx');
    const summarySource = readSource('src/components/finalize-event-section.tsx');

    expect(finalizeSource).not.toContain('rounded-2xl');
    expect(summarySource).not.toContain('rounded-2xl');
    expect(finalizeSource).not.toContain('bg-gradient');
  });
});
