// 回答状況（集計）エリア用スケルトンUI（DaisyUI公式デザイン参考）
export default function AvailabilitySummarySkeleton() {
  return (
    <div className="p-4">
      <div className="mb-4 flex items-center">
        <span className="skeleton mr-4 h-6 w-32" />
        <span className="skeleton h-6 w-20" />
      </div>
      <div className="flex flex-col gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="skeleton h-4 w-24" />
            <span className="skeleton h-4 w-16" />
            <span className="skeleton h-4 w-16" />
            <span className="skeleton h-4 w-16" />
            <span className="skeleton h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
