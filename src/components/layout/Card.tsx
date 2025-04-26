import { ReactNode } from "react";

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
  className = "", 
  footer, 
  isHighlighted = false,
  noPadding = false 
}: CardProps) {
  return (
    <div 
      className={`card transition-all ${
        isHighlighted ? "border-primary/50 bg-primary/5" : ""
      } hover:shadow-md ${className}`}
    >
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-base-200">
          {title && <h3 className="font-bold text-lg">{title}</h3>}
          {subtitle && <p className="text-base-content/70 text-sm mt-1">{subtitle}</p>}
        </div>
      )}
      
      <div className={noPadding ? "" : "p-6"}>
        {children}
      </div>
      
      {footer && (
        <div className="px-6 py-4 bg-base-200/50 border-t border-base-200">
          {footer}
        </div>
      )}
    </div>
  );
}