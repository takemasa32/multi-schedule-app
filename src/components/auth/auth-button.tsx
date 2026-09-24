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
    return <span className="skeleton h-10 w-10 rounded-full" aria-label="ログイン確認中" />;
  }

  if (session?.user) {
    return (
      <Link
        href="/account"
        className="btn btn-icon btn-ghost btn-circle"
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
      className="btn btn-ghost btn-sm min-h-10 gap-1 px-2"
      aria-label="Googleでログイン"
    >
      <CircleUser className="h-5 w-5" aria-hidden="true" />
      <span>ログイン</span>
    </button>
  );
}
