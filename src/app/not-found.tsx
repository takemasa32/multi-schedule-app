import Link from 'next/link';
import siteConfig from '@/lib/site-config';

export const metadata = {
  title: `ページが見つかりません | ${siteConfig.name.full}`,
  description: `お探しのページは存在しないか、移動または削除された可能性があります。`,
  robots: {
    index: false,
    follow: true
  },
};

/**
 * 404 Not Found ページ
 * アプリケーション全体でリソースが見つからない場合に表示されるページ
 */
export default function NotFound() {
  return (
    <div className="flex flex-col min-h-[60vh] items-center justify-center py-16 px-4 text-center">
      <div className="max-w-md w-full space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-primary">404</h1>
          <h2 className="text-2xl font-semibold">ページが見つかりません</h2>
          <p className="text-base-content/70">
            お探しのページは存在しないか、移動または削除された可能性があります。
            URLが正しく入力されているかご確認ください。
          </p>
        </div>
        
        <div className="pt-6 space-y-4">
          <Link 
            href="/" 
            className="btn btn-primary inline-flex items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
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
          
          <p className="text-sm text-base-content/60">
            もしこのページに何度も遭遇する場合は、
            <Link href="/terms" className="text-primary hover:underline">
              お問い合わせ
            </Link>
            までご連絡ください。
          </p>
        </div>
      </div>
    </div>
  );
}