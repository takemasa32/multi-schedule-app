import { getMcpConfig, MCP_SCOPES } from '@/lib/mcp/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const config = getMcpConfig();
  if (!config) return Response.json({ error: 'not_found' }, { status: 404 });
  return Response.json(
    {
      resource: config.resource,
      authorization_servers: [config.issuer],
      scopes_supported: MCP_SCOPES,
      bearer_methods_supported: ['header'],
    },
    { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } },
  );
}
