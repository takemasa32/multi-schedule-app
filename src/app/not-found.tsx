import Link from 'next/link';
import siteConfig from '@/lib/site-config';

export const metadata = {
  title: `ページが見つかりません | ${siteConfig.name.full}`,
  description: `お探しのページは存在しないか、移動または削除された可能性があります。`,
  robots: {
    index: false,
    follow: true,
  },
};

/**
 * 404 Not Found ページ
 * アプリケーション全体でリソースが見つからない場合に表示されるページ
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-4">
          <h1 className="text-primary text-6xl font-bold">404</h1>
          <h2 className="text-2xl font-semibold">ページが見つかりません</h2>
          <p className="text-base-content/70">
            お探しのページは存在しないか、移動または削除された可能性があります。
            URLが正しく入力されているかご確認ください。
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
        </div>
      </div>
    </div>
  );
}
