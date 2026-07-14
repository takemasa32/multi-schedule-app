import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import StatusPage from '@/components/common/status-page';
import siteConfig from '@/lib/site-config';

export const metadata = {
  title: `サーバーエラー | ${siteConfig.name.full}`,
  description: `予期しないサーバーエラーが発生しました。時間をおいてもう一度お試しください。`,
  robots: {
    index: false,
    follow: true,
  },
};

/**
 * 500 サーバーエラーページ
 * サーバーサイドで未処理のエラーが発生した場合に表示されるフォールバックページ
 */
export default function ServerError() {
  return (
    <StatusPage
      marker={<p className="page-eyebrow text-error">500</p>}
      title="サーバーエラーが発生しました"
      description={
        <p>
          申し訳ありません。サーバーで問題が発生しました。 時間をおいて再度お試しください。
          しばらく経っても解決しない場合は、運営者にお問い合わせください。
        </p>
      }
      actions={
        <Link href="/" className="btn btn-primary">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          トップページに戻る
        </Link>
      }
      support={
        <p>
          もしこのページに何度も遭遇する場合は、
          <Link href="/terms" className="text-primary hover:underline">
            お問い合わせ
          </Link>
          までご連絡ください。
        </p>
      }
    />
  );
}
