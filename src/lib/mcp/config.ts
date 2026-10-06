import 'server-only';
import { z } from 'zod';

const clientSchema = z
  .object({
    id: z.string().min(1).max(200),
    name: z.string().min(1).max(100),
    secret: z.string().min(32).max(512),
    redirectUris: z.array(z.url()).min(1).max(10),
  })
  .strict();

/** MCPは事前登録した機密クライアントにだけ公開する。設定がなければ無効にする。 */
export function getMcpConfig() {
  if (!process.env.MCP_CLIENTS) return null;
  const clients = z.array(clientSchema).min(1).max(20).parse(JSON.parse(process.env.MCP_CLIENTS));
  const issuer = new URL(process.env.NEXTAUTH_URL ?? '');
  if (
    issuer.protocol !== 'https:' &&
    !(process.env.NODE_ENV !== 'production' && issuer.hostname === 'localhost')
  ) {
    throw new Error('MCPの公開URLにはHTTPSが必要です');
  }
  if (
    clients.some((client) =>
      client.redirectUris.some((uri) => {
        const url = new URL(uri);
        return (
          url.hash ||
          url.username ||
          url.password ||
          (url.protocol !== 'https:' &&
            !(
              process.env.NODE_ENV !== 'production' &&
              ['localhost', '127.0.0.1'].includes(url.hostname) &&
              url.protocol === 'http:'
            ))
        );
      }),
    ) ||
    new Set(clients.map((client) => client.id)).size !== clients.length
  ) {
    throw new Error('MCPクライアント設定が不正です');
  }
  return { issuer: issuer.origin, resource: `${issuer.origin}/mcp`, clients };
}

export const MCP_SCOPES = ['daysynth.read', 'daysynth.write'] as const;

export function parseScopes(value: string | null) {
  const scopes = [...new Set((value ?? 'daysynth.read').split(' ').filter(Boolean))];
  if (!scopes.length || scopes.some((scope) => !MCP_SCOPES.some((allowed) => allowed === scope))) {
    throw new Error('invalid_scope');
  }
  return scopes.join(' ');
}
