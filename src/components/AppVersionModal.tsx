import React, { useMemo } from 'react';
import {
  CheckCircle2,
  Globe,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAppUpdate } from '../hooks/useAppUpdate';
import {
  classifyDeploymentOrigin,
  formatVersionBadge,
} from '../utils/appUpdate';
import { Modal } from './Modal';

interface AppVersionModalProps {
  open: boolean;
  onClose: () => void;
}

export const AppVersionModal: React.FC<AppVersionModalProps> = ({
  open,
  onClose,
}) => {
  const {
    currentVersion,
    availableVersion,
    updateAvailable,
    isChecking,
    isUpdating,
    lastCheckedAt,
    checkError,
    swStatus,
    checkForUpdates,
    applyUpdate,
  } = useAppUpdate();

  const originInfo = useMemo(() => {
    if (typeof window === 'undefined') {
      return classifyDeploymentOrigin('');
    }
    return classifyDeploymentOrigin(window.location.href);
  }, [open]);

  const swStatusLabel = (() => {
    switch (swStatus) {
      case 'waiting':
        return 'إصدار جديد جاهز للتفعيل';
      case 'active':
        return 'نشط ومحدّث';
      case 'initializing':
        return 'قيد التهيئة';
      case 'unsupported':
        return 'غير مدعوم في هذا المتصفح';
      case 'error':
        return 'تعذر التفعيل التلقائي';
    }
  })();

  const formattedLastCheck = useMemo(() => {
    if (!lastCheckedAt) return 'لم يُفحص بعد';
    try {
      return new Date(lastCheckedAt).toLocaleTimeString('ar-IQ', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return lastCheckedAt;
    }
  }, [lastCheckedAt]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إصدار التطبيق والتحديثات"
      subtitle="التحقق من أحدث إصدار منشور وتنشيط التحديث بأمان على جميع أجهزتك"
    >
      <div data-testid="app-version-modal" className="space-y-4">
        {/* Status Banner */}
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
            updateAvailable
              ? 'bg-amber-50 dark:bg-amber-950/30 border-[#C8A24A]/60 text-[#0B1526] dark:text-amber-100'
              : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-100'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {updateAvailable ? (
              <Sparkles className="w-5 h-5 text-[#B45309] dark:text-[#DDBB6A] shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            <div className="min-w-0">
              <div className="text-sm font-bold">
                {updateAvailable
                  ? 'يتوفر تحديث جديد للتطبيق'
                  : 'أنت تستخدم أحدث إصدار متاح'}
              </div>
              <div className="text-xs opacity-80 mt-0.5">
                آخر تحقق: {formattedLastCheck}
              </div>
            </div>
          </div>

          {updateAvailable && (
            <button
              type="button"
              onClick={() => void applyUpdate()}
              disabled={isUpdating}
              data-testid="modal-update-now-button"
              className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526] text-xs font-bold hover:bg-[#162744] dark:hover:bg-[#DDBB6A] transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`}
              />
              <span>{isUpdating ? 'جاري التحديث...' : 'تحديث الآن'}</span>
            </button>
          )}
        </div>

        {/* Version Comparison Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="saas-subcard p-3.5 space-y-1">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              الإصدار المثبت حالياً
            </div>
            <div
              data-testid="current-app-version"
              className="text-lg font-bold font-mono tabular-nums text-[#0B1526] dark:text-slate-100"
            >
              {formatVersionBadge(currentVersion.version)}
            </div>
            <div
              dir="ltr"
              className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate text-right"
              title={currentVersion.buildId}
            >
              Build: {currentVersion.buildId}
            </div>
          </div>

          <div className="saas-subcard p-3.5 space-y-1">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              أحدث إصدار متاح على الخادم
            </div>
            <div
              data-testid="available-app-version"
              className={`text-lg font-bold font-mono tabular-nums ${
                updateAvailable
                  ? 'text-[#B45309] dark:text-[#DDBB6A]'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {availableVersion
                ? formatVersionBadge(availableVersion.version)
                : formatVersionBadge(currentVersion.version)}
            </div>
            <div
              dir="ltr"
              className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate text-right"
              title={availableVersion?.buildId || currentVersion.buildId}
            >
              Build: {availableVersion?.buildId || currentVersion.buildId}
            </div>
          </div>
        </div>

        {/* Service Worker & Origin Environment Diagnostics */}
        <div className="saas-subcard p-3.5 space-y-2.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400">
              حالة Service Worker والذاكرة المؤقتة
            </span>
            <span className="font-semibold text-[#0B1526] dark:text-slate-100">
              {swStatusLabel}
            </span>
          </div>

          <div className="pt-2 border-t border-[#E4E8F0] dark:border-[#1E2E4A] space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-[#0B1526] dark:text-slate-100">
              <Globe className="w-3.5 h-3.5 text-[#9E7B2C] dark:text-[#DDBB6A]" />
              <span>
                {originInfo.channel === 'ai_studio_dev'
                  ? 'أنت تستخدم رابط المعاينة التطويري (Dev)'
                  : originInfo.channel === 'ai_studio_shared'
                  ? 'أنت تستخدم رابط الإنتاج المشترك الموحد'
                  : 'رابط التشغيل الحالي'}
              </span>
            </div>

            {originInfo.origin && (
              <div
                dir="ltr"
                className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate text-right"
              >
                {originInfo.origin}
              </div>
            )}

            {originInfo.channel === 'ai_studio_dev' && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                ملاحظة النشر: التعديلات هنا تظهر فوراً على الحاسوب، ولكن لوصولها إلى هواتف Android وiPhone عبر الرابط المشترك{' '}
                <span dir="ltr" className="font-mono underline">
                  {originInfo.canonicalProductionUrl}
                </span>{' '}
                يجب النقر على زر النشر/المشاركة (Share / Publish) في Google AI Studio بعد كل تعديل.
              </p>
            )}
          </div>
        </div>

        {checkError && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300"
          >
            {checkError}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            بياناتك المالية ومعاملاتك محفوظة محلياً بأمان ولا تُمسح عند تحديث التطبيق.
          </span>
        </div>

        <div className="pt-2 border-t border-[#EEF1F6] dark:border-[#1E2E4A] flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => void checkForUpdates(true)}
            disabled={isChecking || isUpdating}
            data-testid="check-updates-button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FAFBFD] dark:bg-[#132038] hover:bg-slate-100 dark:hover:bg-[#1A2B4A] border border-[#DCE1EC] dark:border-[#243656] text-xs font-semibold text-[#0B1526] dark:text-slate-100 transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#9E7B2C] dark:text-[#DDBB6A] ${
                isChecking ? 'animate-spin' : ''
              }`}
            />
            <span>
              {isChecking ? 'جاري التحقق...' : 'التحقق من وجود تحديث'}
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526] text-xs font-semibold hover:bg-[#162744] dark:hover:bg-[#DDBB6A] transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </Modal>
  );
};
