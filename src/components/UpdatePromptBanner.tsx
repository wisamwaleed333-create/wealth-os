import React from 'react';
import { RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useAppUpdate } from '../hooks/useAppUpdate';
import { formatVersionBadge } from '../utils/appUpdate';

export const UpdatePromptBanner: React.FC = () => {
  const {
    currentVersion,
    availableVersion,
    updateAvailable,
    isUpdating,
    dismissedBanner,
    dismissBanner,
    applyUpdate,
  } = useAppUpdate();

  if (!updateAvailable || dismissedBanner) {
    return null;
  }

  const currentBadge = formatVersionBadge(currentVersion.version);
  const nextBadge = availableVersion
    ? formatVersionBadge(availableVersion.version)
    : currentBadge;

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-labelledby="pwa-update-title"
      data-testid="pwa-update-banner"
      dir="rtl"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[390px] lg:right-[288px] z-50 rounded-2xl bg-[#0B1526] dark:bg-[#0E1729] text-white border border-[#C8A24A]/60 shadow-2xl p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#C8A24A]/20 border border-[#C8A24A]/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-[#DDBB6A]" />
          </div>
          <div className="min-w-0">
            <h3
              id="pwa-update-title"
              className="text-sm font-bold text-white leading-snug"
            >
              يتوفر تحديث جديد
            </h3>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              الإصدار المتاح{' '}
              <span dir="ltr" className="font-mono tabular-nums text-[#DDBB6A] font-semibold">
                {nextBadge}
              </span>
              {nextBadge !== currentBadge && (
                <>
                  {' '}
                  · الحالي{' '}
                  <span dir="ltr" className="font-mono tabular-nums text-slate-400">
                    {currentBadge}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={dismissBanner}
          aria-label="تأجيل إشعار التحديث"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-emerald-300/90 bg-emerald-950/40 border border-emerald-500/20 rounded-lg px-2.5 py-1.5">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        <span>تُحدَّث ملفات التطبيق فقط مع الحفاظ الكامل على بياناتك المالية.</span>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={dismissBanner}
          disabled={isUpdating}
          className="px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
        >
          لاحقاً
        </button>
        <button
          type="button"
          onClick={() => void applyUpdate()}
          disabled={isUpdating}
          data-testid="pwa-update-now-button"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#C8A24A] hover:bg-[#DDBB6A] text-[#0B1526] text-xs font-bold transition-colors cursor-pointer disabled:opacity-70"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`}
          />
          <span>{isUpdating ? 'جاري التحديث...' : 'تحديث الآن'}</span>
        </button>
      </div>
    </div>
  );
};
