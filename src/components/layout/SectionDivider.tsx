import { ReactNode } from 'react';

interface SectionDividerProps {
  title: string;
  icon?: ReactNode;
  className?: string;
}

export default function SectionDivider({ title, icon, className = '' }: SectionDividerProps) {
  return (
    <div className={`my-8 flex items-center ${className}`}>
      <div className="bg-base-300 h-px flex-grow"></div>
      <div className="text-base-content/80 flex items-center px-4 font-medium">
        {icon && <span className="mr-2">{icon}</span>}
        {title}
      </div>
      <div className="bg-base-300 h-px flex-grow"></div>
    </div>
  );
}
