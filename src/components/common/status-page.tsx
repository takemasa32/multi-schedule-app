import type { ReactNode } from 'react';

type StatusPageProps = {
  marker?: ReactNode;
  title: string;
  description: ReactNode;
  actions: ReactNode;
  support?: ReactNode;
};

/**
 * エラーや権限不足など、処理を継続できない状態を共通レイアウトで表示する
 * @param {StatusPageProps} props 状態説明と復帰操作
 * @returns {JSX.Element} 状態ページ
 */
export default function StatusPage({
  marker,
  title,
  description,
  actions,
  support,
}: StatusPageProps) {
  return (
    <main className="status-page">
      <section className="status-panel space-y-8" aria-labelledby="status-page-title">
        <div className="space-y-4">
          {marker}
          <h1 id="status-page-title" className="text-2xl font-semibold">
            {title}
          </h1>
          <div className="text-base-content/70">{description}</div>
        </div>

        <div className="border-base-300 space-y-4 border-t pt-6">
          <div className="flex flex-col items-stretch justify-center gap-2 sm:flex-row">
            {actions}
          </div>
          {support && <div className="text-base-content/60 text-sm">{support}</div>}
        </div>
      </section>
    </main>
  );
}
