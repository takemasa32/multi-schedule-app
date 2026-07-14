import EventDetailsSectionSkeleton from '@/components/event-client/event-details-section-skeleton';

/**
 * イベント詳細ページの初期表示と同じ幅・余白を維持するローディング表示
 *
 * @returns {JSX.Element} イベント詳細ページのスケルトン
 */
export default function Loading() {
  return (
    <div className="app-page" aria-busy="true" aria-label="イベントを読み込んでいます">
      <div className="pb-12">
        <section className="surface mb-8 overflow-hidden">
          <div className="space-y-4 p-5 sm:p-6">
            <div className="skeleton h-6 w-44 max-w-full" />
            <div className="skeleton h-4 w-72 max-w-full" />
            <div className="flex flex-wrap gap-3">
              <div className="skeleton h-12 w-36 rounded-lg" />
              <div className="skeleton h-12 w-40 rounded-lg" />
            </div>
          </div>
        </section>

        <EventDetailsSectionSkeleton />
        <span className="sr-only">イベント情報を読み込んでいます</span>
      </div>
    </div>
  );
}
