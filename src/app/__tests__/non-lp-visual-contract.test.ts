import fs from 'node:fs';
import path from 'node:path';

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('非LP画面の視覚契約', () => {
  test('画面の役割を装飾的な英語ラベルに依存しない', () => {
    const sources = [
      'src/app/create/page.tsx',
      'src/app/account/page.tsx',
      'src/app/history/page.tsx',
      'src/app/auth/signin/page.tsx',
      'src/app/event/[public_id]/input/page.tsx',
      'src/components/event-header.tsx',
      'src/components/sync/sync-review-page.tsx',
      'src/components/sync/answer-complete-page.tsx',
    ].map(readSource);

    expect(sources.join('\n')).not.toMatch(
      />(?:EVENT SETUP|ACCOUNT|YOUR EVENTS|WELCOME BACK|AVAILABILITY|SYNC REVIEW|SAVED)</,
    );
  });

  test('確定画面で角丸カードと装飾グラデーションを反復しない', () => {
    const finalizeSource = readSource('src/components/event-client/finalize-event-page.tsx');
    const summarySource = readSource('src/components/finalize-event-section.tsx');

    expect(finalizeSource).not.toContain('rounded-2xl');
    expect(summarySource).not.toContain('rounded-2xl');
    expect(finalizeSource).not.toContain('bg-gradient');
  });
});
