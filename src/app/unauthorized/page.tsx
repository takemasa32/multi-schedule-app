import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import StatusPage from '@/components/common/status-page';
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
    <StatusPage
      marker={<ShieldAlert className="text-warning mx-auto h-12 w-12" aria-hidden="true" />}
      title="アクセス権限がありません"
      description={
        <p>
          このページを閲覧するための権限がありません。
          正しいリンクやアクセス権限をお持ちでない場合は、
          イベント主催者に連絡して正しいURLを入手してください。
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
          正しいアクセス権限をお持ちの場合は、
          ブラウザのクッキーやキャッシュをクリアしてから再度お試しください。
        </p>
      }
    />
  );
}
