import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import PostgresAdapter from '@auth/pg-adapter';
import { Pool } from 'pg';

const createAuthPool = () => {
  const databaseUrl = process.env.SUPABASE_DB_URL;

  if (!databaseUrl) {
    throw new Error('SUPABASE_DB_URL が未設定です。');
  }

  // Auth.jsのテーブルはDBロールのsearch_pathでauthjsを参照する
  return new Pool({ connectionString: databaseUrl });
};

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const devLoginEnabled =
  process.env.ENABLE_DEV_LOGIN === 'true' && process.env.NODE_ENV !== 'production';
const devLoginId = process.env.DEV_LOGIN_ID;
const devLoginPassword = process.env.DEV_LOGIN_PASSWORD;
const allowDevLogin = Boolean(devLoginEnabled && devLoginId && devLoginPassword);
const sessionStrategy = allowDevLogin ? 'jwt' : 'database';

if (!googleClientId) {
  throw new Error('GOOGLE_CLIENT_ID が未設定です。');
}

if (!googleClientSecret) {
  throw new Error('GOOGLE_CLIENT_SECRET が未設定です。');
}

if (devLoginEnabled && (!devLoginId || !devLoginPassword)) {
  console.warn(
    'ENABLE_DEV_LOGIN が有効ですが、DEV_LOGIN_ID または DEV_LOGIN_PASSWORD が未設定です。',
  );
}

export const authPool = createAuthPool();

export const authOptions: NextAuthOptions = {
  adapter: PostgresAdapter(authPool),
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
    ...(allowDevLogin
      ? [
          CredentialsProvider({
            name: '開発用ログイン',
            credentials: {
              devId: { label: '開発ID', type: 'text' },
              devPassword: { label: '開発パスワード', type: 'password' },
            },
            async authorize(credentials) {
              if (!credentials || !devLoginId || !devLoginPassword) return null;
              if (
                credentials.devId === devLoginId &&
                credentials.devPassword === devLoginPassword
              ) {
                const client = await authPool.connect();
                try {
                  const email = `${devLoginId}@local.dev`;
                  const existing = await client.query(
                    'SELECT id, name, email FROM authjs.users WHERE email = $1',
                    [email],
                  );
                  if ((existing.rowCount ?? 0) > 0) {
                    return existing.rows[0];
                  }
                  const created = await client.query(
                    'INSERT INTO authjs.users (name, email, \"emailVerified\") VALUES ($1, $2, now()) RETURNING id, name, email',
                    ['開発ユーザー', email],
                  );
                  return created.rows[0];
                } finally {
                  client.release();
                }
              }
              return null;
            },
          }),
        ]
      : []),
  ],
  session: {
    strategy: sessionStrategy,
  },
  callbacks: {
    session({ session, user, token }) {
      if (session.user) {
        const userId = user?.id ?? (typeof token?.sub === 'string' ? token.sub : undefined);
        if (userId) {
          session.user.id = userId;
        }
      }
      return session;
    },
    redirect({ url, baseUrl }) {
      if (url.startsWith('/')) {
        return url;
      }

      try {
        const targetUrl = new URL(url);
        if (targetUrl.origin === baseUrl) {
          return targetUrl.toString();
        }
      } catch {
        // 無効なURLはベースURLへフォールバック
      }

      return baseUrl;
    },
  },
};

/**
 * サーバー側でセッション情報を取得する
 */
export const getAuthSession = () => getServerSession(authOptions);
