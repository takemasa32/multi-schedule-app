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

const authPool = createAuthPool();

export const authOptions: NextAuthOptions = {
  adapter: PostgresAdapter(authPool),
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
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
  },
};

/**
 * サーバー側でセッション情報を取得する
 */
export const getAuthSession = () => getServerSession(authOptions);
