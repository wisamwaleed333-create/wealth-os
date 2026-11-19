import React from 'react';
import { Plus } from 'lucide-react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'py-7 px-4' : 'py-11 px-5'
      }`}
    >
      <div className="w-11 h-11 rounded-xl bg-[#F4F6FA] dark:bg-[#132038] border border-[#E2E8F0] dark:border-[#243656] text-[#9E7B2C] dark:text-[#DDBB6A] flex items-center justify-center mb-3 shadow-2xs">
        {icon}
      </div>
      <div className="text-sm font-bold text-[#0B1526] dark:text-slate-100">
        {title}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0B1526] dark:bg-[#C8A24A] hover:bg-[#162744] dark:hover:bg-[#DDBB6A] text-white dark:text-[#0B1526] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          {actionLabel}
        </button>
      )}
    </div>
  );
};
