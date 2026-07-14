/**
 * 日程確定ページのレイアウトを維持するローディング表示
 *
 * @returns {JSX.Element} 日程確定画面のスケルトン
 */
export default function Loading() {
  return (
    <div className="app-page" aria-busy="true" aria-label="日程確定画面を読み込んでいます">
      <div className="page-header" aria-hidden="true">
        <div className="skeleton h-4 w-40" />
      </div>
      <section className="surface space-y-5 p-5 sm:p-6" aria-hidden="true">
        <div className="skeleton h-8 w-48 max-w-full" />
        <div className="skeleton h-4 w-80 max-w-full" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="skeleton h-24 w-full rounded-lg" />
          <div className="skeleton h-24 w-full rounded-lg" />
        </div>
        <div className="flex justify-end">
          <div className="skeleton h-11 w-36 rounded-lg" />
        </div>
      </section>
      <span className="sr-only">日程確定画面を読み込んでいます</span>
    </div>
  );
}
