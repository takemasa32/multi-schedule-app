export default function Loading() {
  return (
    <section className="mx-auto w-full max-w-xl space-y-6">
      {/* ページタイトルのスケルトン */}
      <div className="skeleton h-7 w-32" />

      <div className="card bg-base-100 border border-base-200 shadow-sm">
        <div className="card-body space-y-4">
          {/* ユーザー情報カードのスケルトン */}
          <div className="flex items-center gap-4">
            <div className="skeleton h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <div className="skeleton h-3 w-16" />
              <div className="skeleton h-5 w-36" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-5 w-52" />
          </div>

          {/* 操作ボタンのスケルトン */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="skeleton h-8 w-24 rounded" />
            <div className="skeleton h-8 w-28 rounded" />
          </div>
        </div>
      </div>

      {/* お気に入りイベントのスケルトン */}
      <section className="space-y-3">
        <div className="skeleton h-6 w-40" />
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <div className="skeleton h-24 rounded" />
          <div className="skeleton h-24 rounded" />
          <div className="skeleton h-24 rounded" />
        </div>
      </section>

      {/* 閲覧履歴のスケルトン */}
      <section className="space-y-3">
        <div className="skeleton h-6 w-32" />
        <div className="rounded-lg bg-base-200 p-3">
          <div className="space-y-3">
            <div className="skeleton h-5 w-full" />
            <div className="skeleton h-5 w-11/12" />
            <div className="skeleton h-5 w-10/12" />
          </div>
        </div>
      </section>
    </section>
  );
}
