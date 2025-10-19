import Link from 'next/link';
import siteConfig from '@/lib/site-config';

export const metadata = {
  title: `アクセス権限エラー | ${siteConfig.name.full}`,
  description: `このページにアクセスする権限がありません。`,
  robots: {
    index: false,
    follow: true,
  },
};

/**
 * 権限エラーページ (401/403)
 * ユーザーが権限のないリソースにアクセスしようとした場合に表示
 */
export default function Unauthorized() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-4">
          <div className="text-warning text-6xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto h-24 w-24"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m0 0v2m0-2h2m-2 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold">アクセス権限がありません</h2>
          <p className="text-base-content/70">
            このページを閲覧するための権限がありません。
            正しいリンクやアクセス権限をお持ちでない場合は、
            イベント主催者に連絡して正しいURLを入手してください。
          </p>
        </div>

        <div className="space-y-4 pt-6">
          <Link href="/" className="btn btn-primary inline-flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mr-2 h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            トップページに戻る
          </Link>

          <p className="text-base-content/60 mt-4 text-sm">
            正しいアクセス権限をお持ちの場合は、
            ブラウザのクッキーやキャッシュをクリアしてから再度お試しください。
          </p>
        </div>
      </div>
    </div>
  );
}
