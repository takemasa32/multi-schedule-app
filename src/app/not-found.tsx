import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import StatusPage from '@/components/common/status-page';
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
    <StatusPage
      marker={<p className="page-eyebrow">404</p>}
      title="ページが見つかりません"
      description={
        <p>
          お探しのページは存在しないか、移動または削除された可能性があります。
          URLが正しく入力されているかご確認ください。
        </p>
      }
      actions={
        <Link href="/" className="btn btn-primary">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          トップページに戻る
        </Link>
      }
    />
  );
}
