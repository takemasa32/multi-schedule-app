import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import PostgresAdapter from '@auth/pg-adapter';
import { Pool } from 'pg';

const createAuthPool = () => {
  const databaseUrl = process.env.SUPABASE_DB_URL;

  if (!databaseUrl) {
    throw new Error('SUPABASE_DB_URL が未設定です。');
  }

  // Auth.jsのテーブルをauthjsスキーマで扱うためsearch_pathを指定する
  return new Pool({ connectionString: databaseUrl, options: '-c search_path=authjs' });
};

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!googleClientId) {
  throw new Error('GOOGLE_CLIENT_ID が未設定です。');
}

if (!googleClientSecret) {
  throw new Error('GOOGLE_CLIENT_SECRET が未設定です。');
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
  ],
  session: {
    strategy: 'database',
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
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
