import { exchangeToken } from '@/lib/mcp/oauth';
import { oauthError, oauthResponse, readOAuthForm } from '@/lib/mcp/http';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    return oauthResponse(
      await exchangeToken(await readOAuthForm(request), request.headers.get('authorization')),
    );
  } catch (error) {
    return oauthError(error);
  }
}
