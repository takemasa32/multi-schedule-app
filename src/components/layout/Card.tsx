import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  footer?: ReactNode;
  isHighlighted?: boolean;
  noPadding?: boolean;
}

export default function Card({
  children,
  title,
  subtitle,
  className = '',
  footer,
  isHighlighted = false,
  noPadding = false,
}: CardProps) {
  return (
    <div
      className={`card ${isHighlighted ? 'border-primary/40 bg-primary/[0.035]' : ''} ${className}`}
    >
      {(title || subtitle) && (
        <div className="border-base-300 border-b px-4 py-5 sm:px-6">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {subtitle && <p className="text-base-content/70 mt-1 text-sm">{subtitle}</p>}
        </div>
      )}

      <div className={noPadding ? '' : 'p-4 sm:p-6'}>{children}</div>

      {footer && (
        <div className="bg-base-200/35 border-base-300 border-t px-4 py-4 sm:px-6">{footer}</div>
      )}
    </div>
  );
}
