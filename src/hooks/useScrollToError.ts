import { useEffect } from 'react';

/**
 * エラー表示位置へ自動でスクロールするカスタムフック
 * @param error エラー文字列、nullの場合はスクロールしない
 * @param ref スクロール対象の要素ref
 */
export default function useScrollToError(
  error: string | null,
  ref: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (error && ref.current && typeof ref.current.scrollIntoView === 'function') {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error, ref]);
}
