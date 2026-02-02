import { CircleUser } from 'lucide-react';
import AccountActions from '@/components/auth/account-actions';
import AccountActivity from '@/components/account/account-activity';
import { getAuthSession } from '@/lib/auth';

export default async function AccountPage() {
  const session = await getAuthSession();
  const user = session?.user;
  const displayName = user?.name ?? '未設定';
  const email = user?.email ?? '未設定';
  const imageUrl = user?.image ?? '';

  return (
    <section className="mx-auto w-full max-w-xl space-y-6">
      <h1 className="text-xl font-bold">アカウント</h1>

      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-base-200">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={displayName}
                  className="h-12 w-12 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <CircleUser className="h-6 w-6 text-base-content/70" aria-hidden="true" />
              )}
            </div>
            <div>
              <p className="text-sm text-base-content/60">名前</p>
              <p className="text-base font-semibold">{displayName}</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-base-content/60">メールアドレス</p>
            <p className="text-base">{email}</p>
          </div>

          {!user && (
            <p className="text-sm text-base-content/60">
              アカウント情報を確認するにはログインしてください。
            </p>
          )}

          <div>
            <AccountActions isAuthenticated={Boolean(user)} />
          </div>
        </div>
      </div>

      <AccountActivity />
    </section>
  );
}
