'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

type WeekNavigationBarProps = {
  periodLabel: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  periodPrefix?: string;
  trailingNote?: string;
  hidePageIndicator?: boolean;
};

/**
 * 週単位ページングの共通ナビゲーションバー
 */
export default function WeekNavigationBar({
  periodLabel,
  currentPage,
  totalPages,
  onPageChange,
  periodPrefix = '表示期間:',
  trailingNote,
  hidePageIndicator = false,
}: WeekNavigationBarProps) {
  const safeTotalPages = Math.max(totalPages, 1);
  const canGoPrev = currentPage > 0;
  const canGoNext = currentPage < safeTotalPages - 1;

  return (
    <div className="bg-base-200 rounded-lg p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {periodPrefix} {periodLabel}
          </p>
          {trailingNote && <p className="text-base-content/70 mt-1 text-xs">{trailingNote}</p>}
        </div>
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => onPageChange(Math.max(0, currentPage - 1))}
            disabled={!canGoPrev}
            aria-label="前の週へ移動"
          >
            <ChevronLeft size={16} />
            前の週
          </button>
          {!hidePageIndicator && (
            <span className="bg-base-100 min-w-20 rounded-md px-2 py-1 text-center text-xs font-medium">
              {currentPage + 1} / {safeTotalPages}
            </span>
          )}
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => onPageChange(Math.min(safeTotalPages - 1, currentPage + 1))}
            disabled={!canGoNext}
            aria-label="次の週へ移動"
          >
            次の週
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
