// グローバルなローディングUI（トップページ用）
export default function Loading() {
  return (
    <div className="flex flex-col items-center min-h-[80vh] bg-base-100 px-2 py-8">
      {/* イベント情報カード */}
      <div className="card w-full max-w-2xl shadow-lg p-6 mb-8">
        <div className="flex flex-row items-start justify-between mb-2">
          {/* タイトル */}
          <div className="skeleton h-12 w-60 mb-2" />
          {/* お気に入り・共有ボタン */}
          <div className="flex gap-2">
            <div className="skeleton h-10 w-32 rounded" />
            <div className="skeleton h-10 w-32 rounded" />
          </div>
        </div>
        {/* 説明文 */}
        <div className="skeleton h-6 w-80 mb-4" />
      </div>
      {/* セクション見出し */}
      <div className="w-full max-w-2xl flex items-center mb-4">
        <div className="flex-grow border-t border-base-200" />
        <div className="mx-4 skeleton h-6 w-32 rounded" />
        <div className="flex-grow border-t border-base-200" />
      </div>
      {/* 参加予定入力カード */}
      <div className="card w-full max-w-2xl shadow p-6 mb-8">
        <div className="skeleton h-7 w-56 mb-2" />
        <div className="skeleton h-5 w-72 mb-4" />
        <div className="flex gap-4 mb-2">
          <div className="skeleton h-12 w-48 rounded" />
          <div className="skeleton h-12 w-56 rounded" />
        </div>
      </div>
      {/* 回答状況カード */}
      <div className="card w-full max-w-2xl shadow p-6 mb-8">
        <div className="skeleton h-7 w-40 mb-4" />
        {/* タブ切り替え */}
        <div className="flex gap-2 mb-4">
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
