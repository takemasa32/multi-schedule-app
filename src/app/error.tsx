'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import StatusPage from '@/components/common/status-page';

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
    <StatusPage
      marker={<AlertTriangle className="text-error mx-auto h-12 w-12" aria-hidden="true" />}
      title="予期せぬエラーが発生しました"
      description={
        <p>申し訳ありません。操作中に問題が発生しました。 少し時間をおいて再度お試しください。</p>
      }
      actions={
        <>
          <button onClick={() => reset()} className="btn btn-primary">
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
            もう一度試す
          </button>
          <Link href="/" className="btn btn-outline">
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            トップページに戻る
          </Link>
        </>
      }
      support={
        <p>
          問題が解決しない場合は、
          <Link href="/terms" className="text-primary hover:underline">
            お問い合わせ
          </Link>
          までご連絡ください。
        </p>
      }
    />
  );
}
