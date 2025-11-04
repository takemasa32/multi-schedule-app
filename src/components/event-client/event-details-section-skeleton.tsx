/**
 * イベント詳細セクションのローディング中に表示するスケルトンコンポーネント
 *
 * @module EventDetailsSectionSkeleton
 */
export default function EventDetailsSectionSkeleton() {
  return (
    <div className="space-y-8">
      {/* 回答状況カードのプレースホルダー */}
      <div className="card bg-base-100 border-base-200 border shadow-md">
        <div className="card-body p-0">
          <div className="border-base-200 border-b p-4">
            <span className="skeleton block h-6 w-32" />
          </div>
          <div className="space-y-4 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <span className="skeleton h-32 w-full rounded" />
              <span className="skeleton h-32 w-full rounded" />
            </div>
            <div className="space-y-2">
              <span className="skeleton block h-4 w-2/3" />
              <span className="skeleton block h-4 w-1/2" />
              <span className="skeleton block h-4 w-3/5" />
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="skeleton h-8 w-24 rounded-full" />
              <span className="skeleton h-8 w-24 rounded-full" />
              <span className="skeleton h-8 w-24 rounded-full" />
              <span className="skeleton h-8 w-24 rounded-full" />
            </div>
          </div>
          <div className="border-base-200 border-t px-4 py-4">
            <span className="skeleton block h-10 w-52 rounded" />
          </div>
        </div>
      </div>

      {/* イベント管理カードのプレースホルダー */}
      <div className="card bg-base-100 border-base-200 border shadow-md">
        <div className="card-body">
          <span className="skeleton mb-2 h-6 w-48" />
          <div className="space-y-2">
            <span className="skeleton block h-4 w-full" />
            <span className="skeleton block h-4 w-3/4" />
          </div>
          <div className="mt-6 flex flex-col gap-8 md:flex-row">
            <div className="min-w-0 flex-1 space-y-3">
              <span className="skeleton block h-5 w-40" />
              <span className="skeleton block h-4 w-full" />
              <div className="grid gap-3 md:grid-cols-2">
                <span className="skeleton h-12 w-full rounded" />
                <span className="skeleton h-12 w-full rounded" />
              </div>
              <span className="skeleton block h-10 w-48 rounded" />
            </div>
            <div className="divider md:divider-horizontal my-1 md:my-0" />
            <div className="min-w-0 flex-1 space-y-3">
              <span className="skeleton block h-5 w-44" />
              <span className="skeleton block h-4 w-3/4" />
              <span className="skeleton block h-4 w-2/3" />
              <span className="skeleton block h-10 w-40 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* 閲覧履歴カードのプレースホルダー */}
      <div className="bg-base-200 rounded-lg p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="skeleton block h-5 w-40" />
          <span className="skeleton block h-4 w-24" />
        </div>
        <div className="space-y-2">
          <span className="skeleton block h-5 w-full" />
          <span className="skeleton block h-5 w-11/12" />
          <span className="skeleton block h-5 w-10/12" />
        </div>
      </div>
    </div>
  );
}
