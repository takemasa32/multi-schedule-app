import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '@/lib/mcp/server';
import { readMyAnswer, saveMyAnswer } from '@/lib/mcp/services';

jest.mock('@/lib/mcp/services', () => ({
  McpInputError: class extends Error {},
  readEvent: jest.fn(),
  readMyAnswer: jest.fn(),
  saveMyAnswer: jest.fn(),
  previewMyScheduleUpdate: jest.fn(),
  updateMySchedule: jest.fn(),
}));
jest.mock('@/lib/schedule-service', () => ({ fetchUserScheduleBlocks: jest.fn() }));
jest.mock('@/lib/mcp/config', () => ({
  getMcpConfig: () => ({ issuer: 'https://daysynth.example' }),
}));

describe('MCP SDKの接続と操作', () => {
  beforeEach(() => jest.clearAllMocks());
  async function connect(userId: string, scopes: string[]) {
    const server = createMcpServer({ userId, scopes });
    const client = new Client({ name: 'test', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    return { server, client };
  }
  it('実際のSDKクライアントからツールを列挙して本人の回答を取得できる', async () => {
    const { client, server } = await connect('me', ['daysynth.read']);
    try {
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toContain('get_my_answer');
      expect(
        tools.tools.find((tool) => tool.name === 'get_my_answer')?._meta?.securitySchemes,
      ).toEqual([{ type: 'oauth2', scopes: ['daysynth.read'] }]);
      expect(
        tools.tools.find((tool) => tool.name === 'save_my_answer')?._meta?.securitySchemes,
      ).toEqual([{ type: 'oauth2', scopes: ['daysynth.write'] }]);
      (readMyAnswer as jest.Mock).mockResolvedValue({ answer: null });
      const result = await client.callTool({
        name: 'get_my_answer',
        arguments: { public_token: 'AbCdEf123456' },
      });
      expect(result.isError).not.toBe(true);
      expect(readMyAnswer).toHaveBeenCalledWith('me', 'AbCdEf123456');
    } finally {
      await client.close();
      await server.close();
    }
  });
  it('読み取り専用の接続は回答を変更できない', async () => {
    const { client, server } = await connect('me', ['daysynth.read']);
    try {
      const result = await client.callTool({
        name: 'save_my_answer',
        arguments: {
          public_token: 'AbCdEf123456',
          name: '本人',
          availabilities: [
            { event_date_id: '11111111-1111-4111-8111-111111111111', availability: true },
          ],
        },
      });
      expect(result.isError).toBe(true);
      expect(result._meta?.['mcp/www_authenticate']).toEqual([
        expect.stringContaining('error="insufficient_scope"'),
      ]);
      expect(saveMyAnswer).not.toHaveBeenCalled();
    } finally {
      await client.close();
      await server.close();
    }
  });
  it('未ログインでも定義を取得できるが本人の回答にはアクセスできない', async () => {
    const server = createMcpServer(null);
    const client = new Client({ name: 'anonymous', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    try {
      expect((await client.listTools()).tools).toHaveLength(7);
      const result = await client.callTool({
        name: 'get_my_answer',
        arguments: { public_token: 'AbCdEf123456' },
      });
      expect(result.isError).toBe(true);
      expect(result._meta?.['mcp/www_authenticate']).toEqual([
        expect.stringContaining('error="invalid_token"'),
      ]);
      expect(readMyAnswer).not.toHaveBeenCalled();
    } finally {
      await client.close();
      await server.close();
    }
  });
  it('別ユーザーの接続を同時に使っても本人のIDが混ざらない', async () => {
    const first = await connect('first', ['daysynth.read']);
    const second = await connect('second', ['daysynth.read']);
    try {
      (readMyAnswer as jest.Mock).mockResolvedValue({ answer: null });
      await Promise.all(
        [first, second].map(({ client }) =>
          client.callTool({ name: 'get_my_answer', arguments: { public_token: 'AbCdEf123456' } }),
        ),
      );
      expect(readMyAnswer).toHaveBeenCalledWith('first', 'AbCdEf123456');
      expect(readMyAnswer).toHaveBeenCalledWith('second', 'AbCdEf123456');
    } finally {
      await first.client.close();
      await second.client.close();
      await first.server.close();
      await second.server.close();
    }
  });
  it('任意の参加者IDをツール引数に追加すると保存前に拒否する', async () => {
    const { client, server } = await connect('me', ['daysynth.read', 'daysynth.write']);
    try {
      const result = await client.callTool({
        name: 'save_my_answer',
        arguments: {
          public_token: 'AbCdEf123456',
          name: '本人',
          participant_id: 'other',
          availabilities: [
            { event_date_id: '11111111-1111-4111-8111-111111111111', availability: true },
          ],
        },
      });
      expect(result.isError).toBe(true);
      expect(saveMyAnswer).not.toHaveBeenCalled();
    } finally {
      await client.close();
      await server.close();
    }
  });
});
