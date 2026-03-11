'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type FinalizeStatusBannerProps = {
  status: 'saved' | 'cleared';
};

const messageMap: Record<FinalizeStatusBannerProps['status'], string> = {
  saved: '日程の確定内容を更新しました。',
  cleared: '確定済みの日程を解除しました。',
};

/**
 * 日程確定後の完了メッセージを表示するバナー
 * @param {FinalizeStatusBannerProps} props 表示内容
 * @returns {JSX.Element} 完了バナー
 */
export default function FinalizeStatusBanner({ status }: FinalizeStatusBannerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has('finalize_status')) return;
    params.delete('finalize_status');
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return (
    <div role="status" className="alert alert-success mx-auto mb-6 max-w-5xl">
      <span>{messageMap[status]}</span>
    </div>
  );
}
