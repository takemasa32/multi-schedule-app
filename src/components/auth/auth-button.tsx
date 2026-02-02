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
    return <span className="skeleton h-8 w-20 rounded-full" aria-label="ログイン確認中" />;
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
      className="btn btn-outline btn-sm"
    >
      ログイン
    </button>
  );
}
