// イベント詳細ページ用ローディングUI
export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="skeleton w-56 h-8 mb-4" />
      <div className="skeleton w-80 h-4 mb-2" />
      <div className="skeleton w-64 h-4 mb-2" />
      <div className="skeleton w-40 h-4 mb-6" />
      <div className="skeleton w-full max-w-lg h-32 rounded-lg" />
    </div>
  );
}
