import { ReactNode } from "react";

interface SectionDividerProps {
  title: string;
  icon?: ReactNode;
  className?: string;
}

export default function SectionDivider({ title, icon, className = "" }: SectionDividerProps) {
  return (
    <div className={`flex items-center my-8 ${className}`}>
      <div className="h-px bg-base-300 flex-grow"></div>
      <div className="flex items-center px-4 font-medium text-base-content/80">
        {icon && <span className="mr-2">{icon}</span>}
        {title}
      </div>
      <div className="h-px bg-base-300 flex-grow"></div>
    </div>
  );
}