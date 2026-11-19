import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#070E1A]/60 dark:bg-[#02060E]/80 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0D172A] border border-[#E2E8F0] dark:border-[#1E2E4A] ring-1 ring-black/5 dark:ring-white/5 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between gap-4 px-6 py-4.5 shrink-0 border-b border-[#ECEFF5] dark:border-[#1B2B46] bg-[#F8FAFC] dark:bg-[#111E35]">
          <div className="min-w-0">
            <h2 id="modal-title" className="text-base sm:text-lg font-bold text-[#0B1526] dark:text-slate-100 leading-snug">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400 hover:text-[#0B1526] dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-[#1B2D4D] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 sm:p-6 overflow-y-auto text-[#0B1526] dark:text-slate-100">{children}</div>
      </div>
    </div>,
    document.body
  );
};
