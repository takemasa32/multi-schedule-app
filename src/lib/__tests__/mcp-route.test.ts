/** @jest-environment-options {"customExportConditions":["node","node-addons"]} */
import {
  Request as WebRequest,
  Response as WebResponse,
  Headers as WebHeaders,
} from 'next/dist/compiled/@edge-runtime/primitives/fetch';
import { POST, OPTIONS } from '@/app/mcp/route';
import { resolveMcpUser } from '@/lib/mcp/oauth';
import { readMyAnswer, saveMyAnswer } from '@/lib/mcp/services';
import { getMcpConfig } from '@/lib/mcp/config';

jest.mock('@/lib/mcp/oauth', () => ({
  resolveMcpUser: jest.fn(),
  OAuthError: class extends Error {},
}));
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
  getMcpConfig: jest.fn(() => ({
    issuer: 'https://daysynth.example',
    clients: [{ redirectUris: ['https://client.example/callback'] }],
  })),
}));

global.Request = WebRequest;
global.Response = WebResponse;
global.Headers = WebHeaders;
global.Uint8Array = Object.getPrototypeOf(Buffer.prototype).constructor;

const origin = 'https://client.example';
function request(method: string, params?: unknown, token?: string) {
  return new Request('https://daysynth.example/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Origin: origin,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, ...(params ? { params } : {}) }),
  });
}

describe('MCP HTTPの認証とクライアントへの通知', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (resolveMcpUser as jest.Mock).mockResolvedValue(null);
  });
  it.each(['https://daysynth.example', origin])(
    '許可済みOrigin %sでは通常応答とpreflightの両方を許可する',
    async (allowedOrigin) => {
      const incoming = request('tools/list');
      incoming.headers.set('Origin', allowedOrigin);
      const response = await POST(incoming);
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(allowedOrigin);
      const preflight = await OPTIONS(
        new Request('https://daysynth.example/mcp', {
          method: 'OPTIONS',
          headers: { Origin: allowedOrigin },
        }),
      );
      expect(preflight.status).toBe(204);
      expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe(allowedOrigin);
    },
  );
  it('無効設定や設定の読み込み失敗では認証・業務処理を開始しない', async () => {
    (getMcpConfig as jest.Mock).mockReturnValueOnce(null);
    expect((await POST(request('tools/list'))).status).toBe(404);
    (getMcpConfig as jest.Mock).mockImplementationOnce(() => {
      throw new Error('invalid config');
    });
    expect((await POST(request('tools/list'))).status).toBe(500);
    expect(resolveMcpUser).not.toHaveBeenCalled();
    expect(readMyAnswer).not.toHaveBeenCalled();
  });
  it('未認証の接続初期化・ツール一覧を公開し、認証ポリシーを両方の形式で返す', async () => {
    const initialized = await POST(
      request('initialize', {
        protocolVersion: '2025-11-25',
        capabilities: {},
        clientInfo: { name: 'test', version: '1' },
      }),
    );
    expect(initialized.status).toBe(200);
    const list = await POST(request('tools/list'));
    expect(list.status).toBe(200);
    const body = await list.json();
    expect(body.result.tools).toHaveLength(8);
    for (const tool of body.result.tools) {
      expect(tool.securitySchemes).toEqual(tool._meta.securitySchemes);
      expect(tool.securitySchemes[0].type).toBe('oauth2');
    }
    expect(resolveMcpUser).not.toHaveBeenCalled();
    expect(readMyAnswer).not.toHaveBeenCalled();
  });
  it('未認証の業務操作を401で止め、必要なscopeと認証情報を公開する', async () => {
    const response = await POST(request('tools/call', { name: 'save_my_answer', arguments: {} }));
    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toContain('scope="daysynth.write"');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    expect(response.headers.get('Access-Control-Expose-Headers')).toBe('WWW-Authenticate');
    expect(saveMyAnswer).not.toHaveBeenCalled();
  });
  it('無効なトークンは公開情報の取得でも401にする', async () => {
    const response = await POST(request('tools/list', undefined, 'invalid'));
    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toContain('error="invalid_token"');
  });
  it('読み取り権限での更新は403と追加認可要求を返し、保存を呼ばない', async () => {
    (resolveMcpUser as jest.Mock).mockResolvedValue({ userId: 'me', scopes: ['daysynth.read'] });
    const response = await POST(
      request('tools/call', { name: 'update_my_schedule', arguments: {} }, 'read-only'),
    );
    expect(response.status).toBe(403);
    expect(response.headers.get('WWW-Authenticate')).toContain('error="insufficient_scope"');
    expect(response.headers.get('WWW-Authenticate')).toContain('scope="daysynth.write"');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    expect(saveMyAnswer).not.toHaveBeenCalled();
  });
  it('認証済みの取得ではBearerから解決した本人だけをサービスへ渡す', async () => {
    (resolveMcpUser as jest.Mock).mockResolvedValue({ userId: 'me', scopes: ['daysynth.read'] });
    (readMyAnswer as jest.Mock).mockResolvedValue({ answer: null });
    const response = await POST(
      request(
        'tools/call',
        { name: 'get_my_answer', arguments: { public_token: 'AbCdEf123456' } },
        'valid',
      ),
    );
    expect(response.status).toBe(200);
    expect(readMyAnswer).toHaveBeenCalledWith('me', 'AbCdEf123456', undefined);
  });
  it('未登録Originのリクエストは認証や業務処理より先に拒否する', async () => {
    const response = await POST(
      new Request('https://daysynth.example/mcp', {
        method: 'POST',
        headers: { Origin: 'https://attacker.example' },
        body: '{}',
      }),
    );
    expect(response.status).toBe(403);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(resolveMcpUser).not.toHaveBeenCalled();
    expect(
      (
        await OPTIONS(
          new Request('https://daysynth.example/mcp', {
            method: 'OPTIONS',
            headers: { Origin: 'https://attacker.example' },
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await OPTIONS(
          new Request('https://daysynth.example/mcp', {
            method: 'OPTIONS',
            headers: { Origin: origin },
          }),
        )
      ).status,
    ).toBe(204);
  });
});
