// グローバルなローディングUI（トップページ用）
export default function Loading() {
  return (
    <div className="bg-base-100 flex min-h-[80vh] flex-col items-center px-2 py-8">
      {/* イベント情報カード */}
      <div className="card mb-8 w-full max-w-2xl p-6 shadow-lg">
        <div className="mb-2 flex flex-row items-start justify-between">
          {/* タイトル */}
          <div className="skeleton mb-2 h-12 w-60" />
          {/* お気に入り・共有ボタン */}
          <div className="flex gap-2">
            <div className="skeleton h-10 w-32 rounded" />
            <div className="skeleton h-10 w-32 rounded" />
          </div>
        </div>
        {/* 説明文 */}
        <div className="skeleton mb-4 h-6 w-80" />
      </div>
      {/* セクション見出し */}
      <div className="mb-4 flex w-full max-w-2xl items-center">
        <div className="border-base-200 flex-grow border-t" />
        <div className="skeleton mx-4 h-6 w-32 rounded" />
        <div className="border-base-200 flex-grow border-t" />
      </div>
      {/* 参加予定入力カード */}
      <div className="card mb-8 w-full max-w-2xl p-6 shadow">
        <div className="skeleton mb-2 h-7 w-56" />
        <div className="skeleton mb-4 h-5 w-72" />
        <div className="mb-2 flex gap-4">
          <div className="skeleton h-12 w-48 rounded" />
          <div className="skeleton h-12 w-56 rounded" />
        </div>
      </div>
      {/* 回答状況カード */}
      <div className="card mb-8 w-full max-w-2xl p-6 shadow">
        <div className="skeleton mb-4 h-7 w-40" />
        {/* タブ切り替え */}
        <div className="mb-4 flex gap-2">
          <div className="skeleton h-8 w-32 rounded" />
          <div className="skeleton h-8 w-32 rounded" />
          <div className="skeleton h-8 w-32 rounded" />
        </div>
        {/* ヒートマップテーブル（横長） */}
        <div className="skeleton h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}
