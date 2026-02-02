'use client';

import { signIn, signOut, useSession } from 'next-auth/react';

export default function AuthButton() {
  const { data: session, status } = useSession();

  // ログイン/ログアウトの遷移先は現在のページに合わせる
  const handleSignIn = () => {
    const callbackUrl = typeof window === 'undefined' ? '/' : window.location.href;
    void signIn('google', { callbackUrl });
  };

  const handleSignOut = () => {
    const callbackUrl = typeof window === 'undefined' ? '/' : window.location.href;
    void signOut({ callbackUrl });
  };

  if (status === 'loading') {
    return <span className="text-xs text-gray-500">ログイン確認中</span>;
  }

  if (session?.user) {
    return (
      <button onClick={handleSignOut} className="btn btn-ghost btn-sm">
        ログアウト
      </button>
    );
  }

  return (
    <button onClick={handleSignIn} className="btn btn-outline btn-sm">
      ログイン
    </button>
  );
}
