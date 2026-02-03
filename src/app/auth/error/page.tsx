'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { CircleAlert } from 'lucide-react';
import { normalizeCallbackUrl } from '@/lib/redirect';

const errorMessages: Record<string, string> = {
  Callback: '認証に失敗しました。もう一度ログインしてください。',
  OAuthCallback: '認証に失敗しました。もう一度ログインしてください。',
  AccessDenied: 'このアカウントではログインできません。',
  OAuthAccountNotLinked: '同じメールアドレスの別アカウントでログインしてください。',
  Configuration: '認証設定に問題があります。管理者に連絡してください。',
  Default: 'ログインに失敗しました。もう一度お試しください。',
};

const resolveErrorMessage = (error?: string | null) => {
  if (!error) return errorMessages.Default;
  return errorMessages[error] ?? errorMessages.Default;
};

export default function AuthErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const callbackUrl = normalizeCallbackUrl(searchParams.get('callbackUrl'));
  const errorMessage = resolveErrorMessage(error);

  const handleBack = () => {
    router.push(callbackUrl);
  };

  const handleSignIn = () => {
    void signIn('google', { callbackUrl });
  };

  return (
    <section className="mx-auto w-full max-w-xl space-y-6 px-4 py-10">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-500">
          <CircleAlert className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold">認証エラー</h1>
        <p className="text-base-content/60 text-sm">ログイン処理で問題が発生しました。</p>
      </div>

      <div className="alert alert-error">
        <CircleAlert className="h-5 w-5" aria-hidden="true" />
        <span className="text-sm">{errorMessage}</span>
      </div>

      <div className="card bg-base-100 border-base-200 border shadow-sm">
        <div className="card-body space-y-4">
          <button type="button" onClick={handleSignIn} className="btn btn-primary">
            Googleで再ログイン
          </button>

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
