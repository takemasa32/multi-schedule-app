/**
 * 回答入力ページのレイアウトを維持するローディング表示
 *
 * @returns {JSX.Element} 回答フォームのスケルトン
 */
export default function Loading() {
  return (
    <PageLoadingShell pageClassName="app-page-narrow" label="回答画面を読み込んでいます">
      <header className="page-header" aria-hidden="true">
        <div className="skeleton mb-3 h-3 w-20" />
        <div className="skeleton h-8 w-44 max-w-full" />
        <div className="skeleton mt-3 h-4 w-72 max-w-full" />
      </header>
      <div className="surface space-y-6 p-4 sm:p-6" aria-hidden="true">
        <div className="border-base-300 space-y-3 border-b pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="skeleton h-6 w-36 max-w-full" />
            <div className="skeleton h-4 w-10" />
          </div>
          <div className="skeleton h-1.5 w-full rounded-full" />
        </div>
        <div className="space-y-2">
          <div className="skeleton h-4 w-28" />
          <div className="skeleton h-12 w-full" />
        </div>
        <div className="flex justify-end">
          <div className="skeleton h-11 w-28 rounded-lg" />
        </div>
      </div>
    </PageLoadingShell>
  );
}
import PageLoadingShell from '@/components/loading/page-loading-shell';
