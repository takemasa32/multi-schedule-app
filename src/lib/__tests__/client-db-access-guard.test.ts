import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, 'src');

const walk = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return walk(fullPath);
      }
      return [fullPath];
    }),
  );
  return files.flat();
};

describe('クライアントコンポーネントのDB直接アクセス防止', () => {
  it('use client ファイルは Supabase クライアントを直接 import しない', async () => {
    const allFiles = await walk(sourceRoot);
    const targetFiles = allFiles.filter((file) => /\.(ts|tsx)$/.test(file));
    const violations: string[] = [];

    for (const filePath of targetFiles) {
      const content = await readFile(filePath, 'utf8');
      const hasUseClient = /^\s*['"]use client['"]\s*;?/m.test(content);
      if (!hasUseClient) continue;

      const hasForbiddenImport =
        /from\s+['"]@\/lib\/supabase['"]/.test(content) ||
        /from\s+['"]\.{1,2}\/.*supabase['"]/.test(content) ||
        /from\s+['"]@supabase\/supabase-js['"]/.test(content);
      if (!hasForbiddenImport) continue;

      violations.push(path.relative(projectRoot, filePath));
    }

    expect(violations).toEqual([]);
  });
});
