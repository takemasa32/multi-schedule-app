'use client';

import { signIn, signOut } from 'next-auth/react';

type AccountActionsProps = {
  isAuthenticated: boolean;
};

export default function AccountActions({ isAuthenticated }: AccountActionsProps) {
  const handleSignIn = () => {
    const callbackUrl = typeof window === 'undefined' ? '/account' : window.location.href;
    void signIn('google', { callbackUrl });
  };

  const handleSignOut = () => {
    const callbackUrl = typeof window === 'undefined' ? '/' : window.location.origin;
    void signOut({ callbackUrl });
  };

  if (isAuthenticated) {
    return (
      <button type="button" onClick={handleSignOut} className="btn btn-outline btn-sm">
        ログアウト
      </button>
    );
  }

  return (
    <button type="button" onClick={handleSignIn} className="btn btn-primary btn-sm">
      Googleでログイン
    </button>
  );
}
