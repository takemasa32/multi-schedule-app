'use client';

import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { CircleUser } from 'lucide-react';

export default function AuthButton() {
  const { data: session, status } = useSession();

  const handleSignIn = () => {
    const callbackUrl = typeof window === 'undefined' ? '/' : window.location.href;
    void signIn('google', { callbackUrl });
  };

  if (status === 'loading') {
    return <span className="skeleton h-8 w-10 rounded-full" aria-label="ログイン確認中" />;
  }

  if (session?.user) {
    return (
      <Link
        href="/account"
        className="btn btn-ghost btn-circle btn-sm"
        aria-label="アカウントページへ"
      >
        <CircleUser className="h-5 w-5" aria-hidden="true" />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignIn}
      className="btn btn-ghost btn-sm h-8 min-h-8 w-10 px-0 flex flex-col items-center justify-center gap-0"
      aria-label="ゲストとしてログイン"
    >
      <CircleUser className="h-4 w-4" aria-hidden="true" />
      <span className="text-[9px] uppercase leading-none tracking-wide text-base-content/70">
        guest
      </span>
    </button>
  );
}
