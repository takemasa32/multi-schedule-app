import { authenticateClient, revokeMcpToken } from '@/lib/mcp/oauth';
import { oauthError, oauthResponse, readOAuthForm } from '@/lib/mcp/http';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const params = await readOAuthForm(request);
    const { client } = authenticateClient(params, request.headers.get('authorization'));
    await revokeMcpToken(client.id, params.get('token') ?? '');
    return oauthResponse({});
  } catch (error) {
    return oauthError(error);
  }
}
