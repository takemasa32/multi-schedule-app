/** @jest-environment-options {"customExportConditions":["node","node-addons"]} */
import { readLimitedBody } from '@/lib/mcp/http';

jest.mock('@/lib/auth', () => ({ authPool: {} }));

describe('MCPの本文サイズ制限', () => {
  function request(chunks: string[], cancel = jest.fn()) {
    return {
      headers: { get: () => null },
      body: new ReadableStream({
        start(controller) {
          for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
          controller.close();
        },
        cancel,
      }),
    } as unknown as Request;
  }
  it('分割されたUTF-8本文を読む', async () => {
    expect(await readLimitedBody(request(['日本語', 'の本文']), 100)).toBe('日本語の本文');
  });
  it('Content-Lengthがなくてもバイト数の上限を超えた時点で拒否する', async () => {
    await expect(
      readLimitedBody(request(['a'.repeat(8), '日本語', 'x']), 12),
    ).rejects.toMatchObject({ code: 'request_too_large', status: 413 });
  });
});
