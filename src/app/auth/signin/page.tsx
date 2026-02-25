'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { CircleAlert, CircleUser } from 'lucide-react';
import { normalizeCallbackUrl } from '@/lib/redirect';
import { useState } from 'react';

const errorMessages: Record<string, string> = {
  Callback: '認証に失敗しました。もう一度ログインしてください。',
  OAuthCallback: '認証に失敗しました。もう一度ログインしてください。',
  AccessDenied: 'このアカウントではログインできません。',
  OAuthAccountNotLinked: '同じメールアドレスの別アカウントでログインしてください。',
  Configuration: '認証設定に問題があります。管理者に連絡してください。',
  Default: 'ログインに失敗しました。もう一度お試しください。',
};

const resolveErrorMessage = (error?: string | null) => {
  if (!error) return '';
  return errorMessages[error] ?? errorMessages.Default;
};

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const callbackUrl = normalizeCallbackUrl(searchParams.get('callbackUrl'));
  const errorMessage = resolveErrorMessage(error);
  const [devId, setDevId] = useState('');
  const [devPassword, setDevPassword] = useState('');
  const [devError, setDevError] = useState<string | null>(null);
  const allowDevLoginInProduction = process.env.NEXT_PUBLIC_ALLOW_DEV_LOGIN_IN_PRODUCTION === 'true';
  const isDevLoginEnabled =
    process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true' &&
    (process.env.NODE_ENV !== 'production' || allowDevLoginInProduction);

  const handleBack = () => {
    router.push(callbackUrl);
  };

  const handleSignIn = () => {
    void signIn('google', { callbackUrl });
  };

  const handleDevSignIn = () => {
    setDevError(null);
    if (!devId || !devPassword) {
      setDevError('開発IDと開発パスワードを入力してください。');
      return;
    }
    void signIn('credentials', {
      devId,
      devPassword,
      callbackUrl,
    });
  };

  return (
    <section className="mx-auto w-full max-w-xl space-y-6 px-4 py-10">
      <div className="text-center">
        <div className="bg-base-200 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
          <CircleUser className="text-base-content/70 h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold">ログイン</h1>
        <p className="text-base-content/60 text-sm">Googleアカウントでログインしてください。</p>
      </div>

      {errorMessage && (
        <div className="alert alert-error">
          <CircleAlert className="h-5 w-5" aria-hidden="true" />
          <span className="text-sm">{errorMessage}</span>
        </div>
      )}

      <div className="card bg-base-100 border-base-200 border shadow-sm">
        <div className="card-body space-y-4">
          <button type="button" onClick={handleSignIn} className="btn btn-primary">
            Googleでログイン
          </button>

          {isDevLoginEnabled && (
            <div className="bg-base-200 rounded-lg p-4">
              <h2 className="mb-2 text-sm font-semibold">開発用ログイン</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="form-control">
                  <span className="label-text text-sm">開発ID</span>
                  <input
                    className="input input-bordered"
                    type="text"
                    value={devId}
                    onChange={(event) => setDevId(event.target.value)}
                  />
                </label>
                <label className="form-control">
                  <span className="label-text text-sm">開発パスワード</span>
                  <input
                    className="input input-bordered"
                    type="password"
                    value={devPassword}
                    onChange={(event) => setDevPassword(event.target.value)}
                  />
                </label>
              </div>
              {devError && <p className="mt-2 text-sm text-error">{devError}</p>}
              <button type="button" onClick={handleDevSignIn} className="btn btn-outline mt-3">
                開発用ログインで進む
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <button type="button" onClick={handleBack} className="btn btn-outline">
              元のページに戻る
            </button>
            <Link href="/" className="btn btn-ghost">
              ホームに戻る
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
