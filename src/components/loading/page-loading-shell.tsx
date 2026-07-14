import type { ReactNode } from 'react';

type PageLoadingShellProps = {
  children: ReactNode;
  label: string;
  pageClassName: 'app-page' | 'app-page-narrow';
};

/**
 * ページ単位のスケルトンで共通する読み込み状態を提供する。
 *
 * @param {PageLoadingShellProps} props ローディング表示の設定
 * @returns {JSX.Element} アクセシブルなページローディングコンテナ
 */
export default function PageLoadingShell({
  children,
  label,
  pageClassName,
}: PageLoadingShellProps) {
  return (
    <div className={pageClassName} aria-busy="true" aria-label={label}>
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}
