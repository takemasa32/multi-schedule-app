'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function SyncWarningBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has('sync_warning')) return;
    params.delete('sync_warning');
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return (
    <div role="status" className="alert alert-warning mx-auto mb-6 max-w-5xl">
      <span>
        回答は保存されましたが、一部の同期処理に失敗しました。時間をおいて再度お試しください。
      </span>
    </div>
  );
}
