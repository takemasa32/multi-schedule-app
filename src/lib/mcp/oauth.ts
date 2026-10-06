import 'server-only';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { encode, decode } from 'next-auth/jwt';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { authPool } from '@/lib/auth';
import { getMcpConfig, parseScopes } from './config';

export const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
const equal = (left: string, right: string) =>
  timingSafeEqual(Buffer.from(hashToken(left)), Buffer.from(hashToken(right)));
const claimsSchema = z.object({
  sub: z.string().min(1),
  grant_id: z.uuid(),
  client_id: z.string(),
  scope: z.string(),
  iss: z.string(),
  aud: z.string(),
  exp: z.number(),
  kind: z.enum(['code', 'access', 'refresh']),
  redirect_uri: z.string().optional(),
  challenge: z.string().optional(),
});
type Claims = z.infer<typeof claimsSchema>;

export class OAuthError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}

function tokenOptions() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new OAuthError('temporarily_unavailable', 503);
  // Webセッションと異なる暗号鍵を導出し、相互利用を防ぐ。
  return { secret, salt: 'daysynth-mcp-v1' };
}

async function readToken(value: string, kind?: Claims['kind']) {
  const config = getMcpConfig();
  if (!config || !value || value.length > 8192) return null;
  try {
    const claims = claimsSchema.parse(await decode({ token: value, ...tokenOptions() }));
    if (
      (kind && claims.kind !== kind) ||
      claims.iss !== config.issuer ||
      claims.aud !== config.resource ||
      claims.exp <= Date.now() / 1000 ||
      !config.clients.some((client) => client.id === claims.client_id)
    )
      return null;
    parseScopes(claims.scope);
    return claims;
  } catch {
    return null;
  }
}

/** 登録済みの戻り先を検証してからログイン・同意画面に進む。 */
export function validateAuthorization(params: URLSearchParams) {
  const config = getMcpConfig();
  if (!config) throw new OAuthError('temporarily_unavailable', 503);
  const client = config.clients.find((item) => item.id === params.get('client_id'));
  const redirectUri = params.get('redirect_uri') ?? '';
  if (!client || !client.redirectUris.includes(redirectUri))
    throw new OAuthError('invalid_request');
  const challenge = params.get('code_challenge') ?? '';
  if (
    params.get('response_type') !== 'code' ||
    params.get('code_challenge_method') !== 'S256' ||
    !/^[A-Za-z0-9_-]{43}$/.test(challenge) ||
    params.get('resource') !== config.resource
  )
    throw new OAuthError('invalid_request');
  const state = params.get('state') ?? '';
  if (state.length > 2048) throw new OAuthError('invalid_request');
  let scope: string;
  try {
    scope = parseScopes(params.get('scope'));
  } catch {
    throw new OAuthError('invalid_scope');
  }
  return { client, redirectUri, challenge, resource: config.resource, scope, state };
}

/** 既存の認証テーブルに、Webログインとは独立したMCP接続を保存する。 */
export async function issueAuthorizationCode(userId: string, params: URLSearchParams) {
  const request = validateAuthorization(params);
  const config = getMcpConfig()!;
  const grantId = randomUUID();
  const code = await encode({
    ...tokenOptions(),
    maxAge: 300,
    token: {
      sub: userId,
      grant_id: grantId,
      client_id: request.client.id,
      scope: request.scope,
      iss: config.issuer,
      aud: config.resource,
      kind: 'code',
      redirect_uri: request.redirectUri,
      challenge: request.challenge,
    },
  });
  const db = await authPool.connect();
  try {
    await db.query('BEGIN');
    await db.query(
      `DELETE FROM authjs.verification_token WHERE identifier LIKE 'mcp:%' AND expires <= now()`,
    );
    await db.query(
      `DELETE FROM authjs.sessions WHERE "sessionToken" LIKE 'mcp:%' AND expires <= now()`,
    );
    await db.query(
      `INSERT INTO authjs.sessions (id, "userId", "sessionToken", expires)
      VALUES ($1,$2,$3,now() + interval '5 minutes')`,
      [grantId, userId, `mcp:${randomBytes(32).toString('base64url')}`],
    );
    await db.query(
      `INSERT INTO authjs.verification_token (identifier, token, expires)
      VALUES ($1,$2,now() + interval '5 minutes')`,
      [`mcp:code:${grantId}`, hashToken(code)],
    );
    await db.query('COMMIT');
    return code;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    db.release();
  }
}

export function authenticateClient(params: URLSearchParams, authorization: string | null) {
  const config = getMcpConfig();
  if (!config) throw new OAuthError('temporarily_unavailable', 503);
  let id = params.get('client_id') ?? '';
  let secret = params.get('client_secret') ?? '';
  if (authorization) {
    if (!authorization.startsWith('Basic ') || secret) throw new OAuthError('invalid_client', 401);
    try {
      const credentials = Buffer.from(authorization.slice(6), 'base64').toString('utf8');
      const index = credentials.indexOf(':');
      if (index < 0) throw new Error();
      const basicId = decodeURIComponent(credentials.slice(0, index));
      if (id && id !== basicId) throw new Error();
      id = basicId;
      secret = decodeURIComponent(credentials.slice(index + 1));
    } catch {
      throw new OAuthError('invalid_client', 401);
    }
  }
  const client = config.clients.find((item) => item.id === id);
  if (!client || !equal(secret, client.secret)) throw new OAuthError('invalid_client', 401);
  return { client, config };
}

async function deleteGrant(db: PoolClient, claims: Claims) {
  await db.query(
    `DELETE FROM authjs.sessions WHERE id = $1 AND "userId" = $2 AND "sessionToken" LIKE 'mcp:%'`,
    [claims.grant_id, claims.sub],
  );
  await db.query(`DELETE FROM authjs.verification_token WHERE identifier = ANY($1::text[])`, [
    [`mcp:code:${claims.grant_id}`, `mcp:refresh:${claims.grant_id}`],
  ]);
}

/** 認可コード・更新トークンの消費をDBロックで直列化する。 */
export async function exchangeToken(params: URLSearchParams, authorization: string | null) {
  const { client, config } = authenticateClient(params, authorization);
  const grantType = params.get('grant_type');
  if (grantType !== 'authorization_code' && grantType !== 'refresh_token')
    throw new OAuthError('unsupported_grant_type');
  if (params.get('resource') !== config.resource) throw new OAuthError('invalid_target');
  const isCode = grantType === 'authorization_code';
  const credential = params.get(isCode ? 'code' : 'refresh_token') ?? '';
  const claims = await readToken(credential, isCode ? 'code' : 'refresh');
  if (!claims || claims.client_id !== client.id) throw new OAuthError('invalid_grant');
  if (isCode) {
    const verifier = params.get('code_verifier') ?? '';
    if (
      !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) ||
      params.get('redirect_uri') !== claims.redirect_uri ||
      !equal(createHash('sha256').update(verifier).digest('base64url'), claims.challenge ?? '')
    )
      throw new OAuthError('invalid_grant');
  }
  if (params.has('scope') && params.get('scope') !== claims.scope)
    throw new OAuthError('invalid_scope');
  const db = await authPool.connect();
  let committed = false;
  try {
    await db.query('BEGIN');
    const session = await db.query<{ expires: Date }>(
      `SELECT expires FROM authjs.sessions
      WHERE id = $1 AND "userId" = $2 AND "sessionToken" LIKE 'mcp:%' AND expires > now() FOR UPDATE`,
      [claims.grant_id, claims.sub],
    );
    if (!session.rows[0]) throw new OAuthError('invalid_grant');
    const consumed = await db.query(
      `DELETE FROM authjs.verification_token
      WHERE identifier = $1 AND token = $2 AND expires > now() RETURNING token`,
      [`mcp:${isCode ? 'code' : 'refresh'}:${claims.grant_id}`, hashToken(credential)],
    );
    if (!consumed.rowCount) {
      if (isCode) {
        await deleteGrant(db, claims);
        await db.query('COMMIT');
        committed = true;
      }
      throw new OAuthError('invalid_grant');
    }
    const expires = isCode
      ? (
          await db.query<{ expires: Date }>(
            `UPDATE authjs.sessions SET expires = now() + interval '30 days'
          WHERE id = $1 RETURNING expires`,
            [claims.grant_id],
          )
        ).rows[0].expires
      : session.rows[0].expires;
    const remaining = Math.floor((expires.getTime() - Date.now()) / 1000);
    if (remaining <= 0) throw new OAuthError('invalid_grant');
    const token = {
      sub: claims.sub,
      grant_id: claims.grant_id,
      client_id: client.id,
      scope: claims.scope,
      iss: config.issuer,
      aud: config.resource,
    };
    const expiresIn = Math.min(3600, remaining);
    const accessToken = await encode({
      ...tokenOptions(),
      maxAge: expiresIn,
      token: { ...token, kind: 'access' },
    });
    const refreshToken = await encode({
      ...tokenOptions(),
      maxAge: remaining,
      token: { ...token, kind: 'refresh' },
    });
    await db.query(
      `INSERT INTO authjs.verification_token (identifier, token, expires) VALUES ($1,$2,$3)`,
      [`mcp:refresh:${claims.grant_id}`, hashToken(refreshToken), expires],
    );
    await db.query('COMMIT');
    committed = true;
    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope: claims.scope,
    };
  } catch (error) {
    if (!committed) await db.query('ROLLBACK');
    throw error;
  } finally {
    db.release();
  }
}

/** 接続セッションを削除し、発行済みトークンをまとめて失効させる。 */
export async function revokeMcpToken(clientId: string, token: string) {
  const claims = await readToken(token);
  if (!claims || claims.client_id !== clientId) return;
  const db = await authPool.connect();
  try {
    await db.query('BEGIN');
    await deleteGrant(db, claims);
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    db.release();
  }
}

const requestWindows = new Map<string, { start: number; count: number }>();
function checkRateLimit(grantId: string) {
  const now = Date.now();
  for (const [id, window] of requestWindows) {
    if (now - window.start >= 60000) requestWindows.delete(id);
  }
  const window = requestWindows.get(grantId) ?? { start: now, count: 0 };
  if (window.count >= 60 || (!requestWindows.has(grantId) && requestWindows.size >= 10000))
    throw new OAuthError('rate_limit_exceeded', 429);
  window.count++;
  requestWindows.set(grantId, window);
}

/** CookieやGoogleトークンを受け付けず、MCP専用トークンから本人を解決する。 */
export async function resolveMcpUser(authorization: string | null) {
  if (!authorization?.startsWith('Bearer ')) return null;
  const claims = await readToken(authorization.slice(7), 'access');
  if (!claims) return null;
  const session = await authPool.query(
    `SELECT id FROM authjs.sessions
    WHERE id = $1 AND "userId" = $2 AND "sessionToken" LIKE 'mcp:%' AND expires > now()`,
    [claims.grant_id, claims.sub],
  );
  if (!session.rowCount) return null;
  checkRateLimit(claims.grant_id);
  return { userId: claims.sub, scopes: claims.scope.split(' ') };
}
