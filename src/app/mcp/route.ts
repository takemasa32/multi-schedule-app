import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { getMcpConfig } from '@/lib/mcp/config';
import { resolveMcpUser } from '@/lib/mcp/oauth';
import { oauthError, oauthResponse, readLimitedBody } from '@/lib/mcp/http';
import { createMcpServer } from '@/lib/mcp/server';
import { getToolScope, mcpChallenge } from '@/lib/mcp/authorization';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAllowedOrigin(config: NonNullable<ReturnType<typeof getMcpConfig>>, origin: string) {
  return (
    origin === config.issuer ||
    config.clients.some((client) =>
      client.redirectUris.some((uri) => new URL(uri).origin === origin),
    )
  );
}

function authenticationError(scope: string, error: 'invalid_token' | 'insufficient_scope') {
  const response = oauthResponse({ error }, error === 'invalid_token' ? 401 : 403);
  response.headers.set('WWW-Authenticate', mcpChallenge(scope, error));
  return response;
}

/** SDKの互換用メタデータを、ChatGPTが参照するトップレベルにも公開する。 */
async function withToolSecurity(response: Response) {
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json'))
    return response;
  const body = await response.json();
  if (Array.isArray(body.result?.tools)) {
    for (const tool of body.result.tools) tool.securitySchemes = tool._meta?.securitySchemes;
  }
  return Response.json(body, { status: response.status, headers: response.headers });
}

async function handle(request: Request) {
  try {
    if (request.method !== 'POST')
      return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    const body = await readLimitedBody(request, 131072);
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return oauthResponse({ error: 'invalid_request' }, 400);
    }
    const message =
      parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as { method?: unknown; params?: { name?: unknown } })
        : null;
    const method = typeof message?.method === 'string' ? message.method : '';
    const name = typeof message?.params?.name === 'string' ? message.params.name : '';
    const toolScope = getToolScope(name);
    const scope = toolScope ?? 'daysynth.read';
    const authorization = request.headers.get('authorization');
    const user = authorization ? await resolveMcpUser(authorization) : null;
    // 接続・ツール定義だけは公開し、業務データへのアクセスには必ず本人認証を要求する。
    const discovery = ['initialize', 'notifications/initialized', 'tools/list', 'ping'].includes(
      method,
    );
    if (!user && (authorization || !discovery)) return authenticationError(scope, 'invalid_token');
    if (user && method === 'tools/call' && toolScope && !user.scopes.includes(scope)) {
      return authenticationError(scope, 'insufficient_scope');
    }
    const server = createMcpServer(user);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    try {
      let response = await transport.handleRequest(request, { parsedBody: parsed });
      if (method === 'tools/list') response = await withToolSecurity(response);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    } finally {
      await server.close();
    }
  } catch (error) {
    return oauthError(error);
  }
}

async function withCors(request: Request) {
  try {
    const config = getMcpConfig();
    if (!config) return oauthResponse({ error: 'not_found' }, 404);
    const origin = request.headers.get('origin');
    if (origin && !isAllowedOrigin(config, origin))
      return oauthResponse({ error: 'forbidden' }, 403);
    const response = await handle(request);
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Expose-Headers', 'WWW-Authenticate');
      response.headers.set('Vary', 'Origin');
    }
    return response;
  } catch (error) {
    return oauthError(error);
  }
}

export const POST = withCors;
export const GET = withCors;
export const DELETE = withCors;

export async function OPTIONS(request: Request) {
  const config = getMcpConfig();
  const origin = request.headers.get('origin');
  const allowed = config && origin && isAllowedOrigin(config, origin);
  if (!allowed) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, GET, DELETE',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, MCP-Protocol-Version',
      'Access-Control-Expose-Headers': 'WWW-Authenticate',
      Vary: 'Origin',
    },
  });
}
