// 履歴ページ用ローディングUI
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <span className="skeleton mb-4 h-8 w-40" />
      <span className="skeleton mb-2 h-4 w-64" />
      <span className="skeleton mb-2 h-4 w-56" />
      <span className="skeleton h-20 w-80 rounded-lg" />
    </div>
  );
}
