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
      className={`card transition-all ${
        isHighlighted ? 'border-primary/50 bg-primary/5' : ''
      } hover:shadow-md ${className}`}
    >
      {(title || subtitle) && (
        <div className="border-base-200 border-b px-6 py-4">
          {title && <h3 className="text-lg font-bold">{title}</h3>}
          {subtitle && <p className="text-base-content/70 mt-1 text-sm">{subtitle}</p>}
        </div>
      )}

      <div className={noPadding ? '' : 'p-4 sm:p-6'}>{children}</div>

      {footer && <div className="bg-base-200/50 border-base-200 border-t px-6 py-4">{footer}</div>}
    </div>
  );
}
