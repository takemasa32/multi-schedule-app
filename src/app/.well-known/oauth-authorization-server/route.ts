import { getMcpConfig, MCP_SCOPES } from '@/lib/mcp/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = getMcpConfig();
  if (!config) return Response.json({ error: 'not_found' }, { status: 404 });
  return Response.json(
    {
      issuer: config.issuer,
      authorization_endpoint: `${config.issuer}/oauth/authorize`,
      token_endpoint: `${config.issuer}/oauth/token`,
      revocation_endpoint: `${config.issuer}/oauth/revoke`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
      code_challenge_methods_supported: ['S256'],
      scopes_supported: MCP_SCOPES,
    },
    { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } },
  );
}
