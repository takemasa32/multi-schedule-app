/** @jest-environment-options {"customExportConditions":["node","node-addons"]} */
import { createHash } from 'node:crypto';
import { encode, decode } from 'next-auth/jwt';
import { authPool } from '@/lib/auth';
import {
  exchangeToken,
  hashToken,
  issueAuthorizationCode,
  resolveMcpUser,
  revokeMcpToken,
  validateAuthorization,
} from '@/lib/mcp/oauth';

jest.mock('@/lib/auth', () => ({ authPool: { query: jest.fn(), connect: jest.fn() } }));
// jsdomとNodeの配列型を揃え、実際のAuth.js暗号化を検証する。
global.Uint8Array = Object.getPrototypeOf(Buffer.prototype).constructor;
const query = jest.fn();
const release = jest.fn();
const verifier = 'v'.repeat(43);
const challenge = createHash('sha256').update(verifier).digest('base64url');
const authorizationParams = () =>
  new URLSearchParams({
    client_id: 'chat',
    redirect_uri: 'https://client.example/callback',
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    resource: 'https://daysynth.example/mcp',
    scope: 'daysynth.read daysynth.write',
  });
const tokenParams = (code: string) =>
  new URLSearchParams({
    client_id: 'chat',
    client_secret: 's'.repeat(32),
    grant_type: 'authorization_code',
    code,
    code_verifier: verifier,
    redirect_uri: 'https://client.example/callback',
    resource: 'https://daysynth.example/mcp',
  });
const options = { secret: 'test-secret-for-mcp', salt: 'daysynth-mcp-v1' };
const databaseSuccess = async (sql: string) => ({
  rowCount: 1,
  rows:
    sql.startsWith('SELECT expires') || sql.startsWith('UPDATE authjs.sessions')
      ? [{ expires: new Date(Date.now() + 30 * 86400000) }]
      : [],
});

describe('MCP OAuth（既存認証テーブル）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXTAUTH_URL = 'https://daysynth.example';
    process.env.NEXTAUTH_SECRET = options.secret;
    process.env.MCP_CLIENTS = JSON.stringify([
      {
        id: 'chat',
        name: 'Chat',
        secret: 's'.repeat(32),
        redirectUris: ['https://client.example/callback'],
      },
    ]);
    (authPool.connect as jest.Mock).mockResolvedValue({ query, release });
    query.mockImplementation(databaseSuccess);
    (authPool.query as jest.Mock).mockResolvedValue({ rows: [{ id: 'session' }], rowCount: 1 });
  });
  afterAll(() => {
    delete process.env.MCP_CLIENTS;
    delete process.env.NEXTAUTH_URL;
    delete process.env.NEXTAUTH_SECRET;
  });

  it('登録外の戻り先とPKCEなしを拒否する', () => {
    const params = authorizationParams();
    expect(validateAuthorization(params).scope).toBe('daysynth.read daysynth.write');
    params.set('redirect_uri', 'https://attacker.example');
    expect(() => validateAuthorization(params)).toThrow('invalid_request');
    params.set('redirect_uri', 'https://client.example/callback');
    params.delete('code_challenge');
    expect(() => validateAuthorization(params)).toThrow('invalid_request');
  });
  it('Webセッションから独立した接続とコードのハッシュを既存テーブルへ保存する', async () => {
    const code = await issueAuthorizationCode('me', authorizationParams());
    const claims = await decode({ ...options, token: code });
    expect(claims).toMatchObject({ sub: 'me', kind: 'code' });
    await expect(decode({ secret: options.secret, token: code })).rejects.toThrow();
    const session = query.mock.calls.find(([sql]) => sql.startsWith('INSERT INTO authjs.sessions'));
    expect(session[1][2]).toMatch(/^mcp:/);
    expect(session[1][2]).not.toBe(code);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO authjs.verification_token'),
      [`mcp:code:${claims!.grant_id}`, hashToken(code)],
    );
  });
  it('正しいPKCEでコードを消費し、暗号化された専用トークンを発行する', async () => {
    const code = await issueAuthorizationCode('me', authorizationParams());
    const result = await exchangeToken(tokenParams(code), null);
    expect(result.expires_in).toBe(3600);
    expect(await resolveMcpUser(`Bearer ${result.access_token}`)).toEqual({
      userId: 'me',
      scopes: ['daysynth.read', 'daysynth.write'],
    });
    expect(await resolveMcpUser(`Bearer ${result.refresh_token}`)).toBeNull();
    expect(await resolveMcpUser(`Bearer ${code}`)).toBeNull();
    expect(query).toHaveBeenCalledWith(expect.stringContaining('RETURNING token'), [
      expect.stringMatching(/^mcp:code:/),
      hashToken(code),
    ]);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO authjs.verification_token'),
      [expect.stringMatching(/^mcp:refresh:/), hashToken(result.refresh_token), expect.any(Date)],
    );
  });
  it.each(['wrong-verifier', 'wrong-redirect', 'expired', 'tampered'])(
    '%sではトークンを発行しない',
    async (scenario) => {
      let code = await issueAuthorizationCode('me', authorizationParams());
      if (scenario === 'expired')
        code = await encode({
          ...options,
          token: (await decode({ ...options, token: code }))!,
          maxAge: -1,
        });
      if (scenario === 'tampered') code = `${code.slice(0, -5)}xxxxx`;
      const params = tokenParams(code);
      if (scenario === 'wrong-verifier') params.set('code_verifier', 'x'.repeat(43));
      if (scenario === 'wrong-redirect') params.set('redirect_uri', 'https://attacker.example');
      query.mockClear();
      await expect(exchangeToken(params, null)).rejects.toThrow('invalid_grant');
      expect(query).not.toHaveBeenCalled();
    },
  );
  it('コードの再使用で接続を失効させる', async () => {
    const code = await issueAuthorizationCode('me', authorizationParams());
    query.mockImplementation(async (sql: string) =>
      sql.includes('RETURNING token') ? { rows: [], rowCount: 0 } : databaseSuccess(sql),
    );
    await expect(exchangeToken(tokenParams(code), null)).rejects.toThrow('invalid_grant');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM authjs.sessions WHERE id'),
      expect.any(Array),
    );
    expect(query).toHaveBeenCalledWith('COMMIT');
    expect(query).not.toHaveBeenCalledWith('ROLLBACK');
  });
  it('更新トークンを一回だけ消費し、有効期間を延長しない', async () => {
    const first = await exchangeToken(
      tokenParams(await issueAuthorizationCode('me', authorizationParams())),
      null,
    );
    const params = tokenParams('');
    params.set('grant_type', 'refresh_token');
    params.set('refresh_token', first.refresh_token);
    query.mockClear();
    const next = await exchangeToken(params, null);
    expect(next.refresh_token).not.toBe(first.refresh_token);
    expect(query.mock.calls.some(([sql]) => sql.startsWith('UPDATE authjs.sessions'))).toBe(false);
    query.mockImplementation(async (sql: string) =>
      sql.includes('RETURNING token') ? { rows: [], rowCount: 0 } : databaseSuccess(sql),
    );
    await expect(exchangeToken(params, null)).rejects.toThrow('invalid_grant');
    expect(query).toHaveBeenCalledWith('ROLLBACK');
  });
  it('失効した接続・Webトークン・Googleトークンは受け付けない', async () => {
    const result = await exchangeToken(
      tokenParams(await issueAuthorizationCode('me', authorizationParams())),
      null,
    );
    await revokeMcpToken('chat', result.refresh_token);
    (authPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
    expect(await resolveMcpUser(`Bearer ${result.access_token}`)).toBeNull();
    expect(await resolveMcpUser('Bearer google-token')).toBeNull();
    const web = await encode({ secret: options.secret, token: { sub: 'me' } });
    expect(await resolveMcpUser(`Bearer ${web}`)).toBeNull();
  });
  it('クライアントシークレットとresourceを検証する', async () => {
    const params = tokenParams('invalid');
    params.set('client_secret', 'wrong');
    await expect(exchangeToken(params, null)).rejects.toThrow('invalid_client');
    params.set('client_secret', 's'.repeat(32));
    params.set('resource', 'https://other.example/mcp');
    await expect(exchangeToken(params, null)).rejects.toThrow('invalid_target');
    expect(authPool.connect).not.toHaveBeenCalled();
  });
  it('他クライアントによる失効と接続あたりの呼び出し上限を守る', async () => {
    const result = await exchangeToken(
      tokenParams(await issueAuthorizationCode('me', authorizationParams())),
      null,
    );
    query.mockClear();
    await revokeMcpToken('other', result.access_token);
    expect(query).not.toHaveBeenCalled();
    for (let i = 0; i < 60; i++) await resolveMcpUser(`Bearer ${result.access_token}`);
    await expect(resolveMcpUser(`Bearer ${result.access_token}`)).rejects.toThrow(
      'rate_limit_exceeded',
    );
  });
});
