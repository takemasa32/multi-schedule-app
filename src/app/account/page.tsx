import { CircleUser } from 'lucide-react';
import type { Metadata } from 'next';
import AccountActions from '@/components/auth/account-actions';
import AccountActivity from '@/components/account/account-activity';
import AccountDeleteSection from '@/components/account/account-delete-section';
import AccountPageTour from '@/components/account/account-page-tour';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { getAuthSession } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'アカウント',
};

export default async function AccountPage() {
  const session = await getAuthSession();
  const user = session?.user;
  const displayName = user?.name ?? '未設定';
  const email = user?.email ?? '未設定';
  const imageUrl = user?.image ?? '';

  return (
    <section className="mx-auto w-full max-w-xl space-y-6">
      <Breadcrumbs items={[{ label: 'アカウント' }]} />
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">アカウント</h1>
        <AccountPageTour initialIsAuthenticated={Boolean(user)} />
      </div>

      <div
        className="card bg-base-100 border-base-200 border shadow-sm"
        data-tour-id="account-profile-card"
      >
        <div className="card-body space-y-4">
          <div className="flex items-center gap-4">
            <div className="bg-base-200 flex h-12 w-12 items-center justify-center rounded-full">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={displayName}
                  className="h-12 w-12 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <CircleUser className="text-base-content/70 h-6 w-6" aria-hidden="true" />
              )}
            </div>
            <div>
              <p className="text-base-content/60 text-sm">名前</p>
              <p className="text-base font-semibold">{displayName}</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-base-content/60 text-sm">メールアドレス</p>
            <p className="text-base">{email}</p>
          </div>

          {!user && (
            <p className="text-base-content/60 text-sm">
              アカウント情報を確認するにはログインしてください。
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <AccountActions isAuthenticated={Boolean(user)} />
            <AccountDeleteSection />
          </div>
        </div>
      </div>

      <AccountActivity isAuthenticated={Boolean(user)} />
    </section>
  );
}
