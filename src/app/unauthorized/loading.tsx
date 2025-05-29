// 未認可ページ用ローディングUI
export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <span className="skeleton w-32 h-8 mb-4" />
      <span className="skeleton w-64 h-4 mb-2" />
      <span className="skeleton w-56 h-4 mb-2" />
    </div>
  );
}
