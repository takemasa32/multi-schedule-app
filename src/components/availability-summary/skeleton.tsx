// 回答状況（集計）エリア用スケルトンUI（DaisyUI公式デザイン参考）
export default function AvailabilitySummarySkeleton() {
  return (
    <div className="p-4">
      <div className="flex items-center mb-4">
        <span className="skeleton w-32 h-6 mr-4" />
        <span className="skeleton w-20 h-6" />
      </div>
      <div className="flex flex-col gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span className="skeleton w-24 h-4" />
            <span className="skeleton w-16 h-4" />
            <span className="skeleton w-16 h-4" />
            <span className="skeleton w-16 h-4" />
            <span className="skeleton w-16 h-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
