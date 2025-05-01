'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * エラーページ
 * アプリケーション内でエラーが発生した場合に表示されるページ
 * クライアントコンポーネントである必要があります
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // エラーをログに記録
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col min-h-[60vh] items-center justify-center py-16 px-4 text-center">
      <div className="max-w-md w-full space-y-8">
        <div className="space-y-4">
          <div className="text-error text-6xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold">予期せぬエラーが発生しました</h2>
          <p className="text-base-content/70">
            申し訳ありません。操作中に問題が発生しました。
            少し時間をおいて再度お試しください。
          </p>
        </div>
        
        <div className="pt-6 space-y-4">
          <button
            onClick={() => reset()}
            className="btn btn-primary inline-flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            もう一度試す
          </button>
          
          <Link href="/" className="btn btn-outline btn-sm mt-2 w-full">
            トップページに戻る
          </Link>
          
          <p className="text-sm text-base-content/60 mt-4">
            問題が解決しない場合は、
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