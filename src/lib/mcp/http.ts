import 'server-only';
import { OAuthError } from './oauth';

export function oauthResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' },
  });
}

export function oauthError(error: unknown) {
  if (error instanceof OAuthError) {
    const response = oauthResponse({ error: error.code }, error.status);
    if (error.code === 'invalid_client')
      response.headers.set('WWW-Authenticate', 'Basic realm="DaySynth MCP"');
    return response;
  }
  return oauthResponse({ error: 'server_error' }, 500);
}

/** Content-Lengthがなくても読み込み中に上限を検証し、大きな本文を保持しない。 */
export async function readLimitedBody(request: Request, maxBytes: number) {
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes)
    throw new OAuthError('request_too_large', 413);
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new OAuthError('request_too_large', 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

export async function readOAuthForm(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))
    throw new OAuthError('invalid_request');
  const text = await readLimitedBody(request, 16384);
  const params = new URLSearchParams(text);
  if ([...params.keys()].some((key) => params.getAll(key).length !== 1))
    throw new OAuthError('invalid_request');
  return params;
}
