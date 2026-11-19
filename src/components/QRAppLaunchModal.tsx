import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Download,
  MoreVertical,
  PlusSquare,
  Share,
  Smartphone,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { isOpenedFromQR } from '../utils/pwa';
import { Modal } from './Modal';

export const QRAppLaunchModal: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } =
    usePWAInstall();
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return isOpenedFromQR(window.location.search);
  });
  const [showInstallSteps, setShowInstallSteps] = useState(false);

  useEffect(() => {
    if (open && isInstalled) {
      setOpen(false);
    }
  }, [open, isInstalled]);

  const handleClose = () => {
    setOpen(false);
    if (typeof window !== 'undefined' && isOpenedFromQR(window.location.search)) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('open');
        const nextUrl = `${url.pathname}${url.search}${url.hash}`;
        window.history.replaceState({}, '', nextUrl || '/');
      } catch {
        // Ignore history cleanup errors
      }
    }
  };

  const handleInstallAction = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) {
        handleClose();
      }
      return;
    }
    setShowInstallSteps((prev) => !prev);
  };

  if (!open || isInstalled) {
    return null;
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="مرحباً بك في نظام بناء الثروة"
      subtitle="القليل يصنع ثروة كبيرة — جاهز للتجربة الفورية أو التثبيت كأيقونة على هاتفك"
    >
      <div data-testid="qr-app-launch-modal" className="space-y-4">
        {/* App Identity Banner */}
        <div className="p-4 rounded-xl bg-[#0B1526] text-white border border-[#1D3154] flex items-center gap-4">
          <img
            src="/icon.svg"
            alt="شعار نظام بناء الثروة"
            className="w-14 h-14 rounded-2xl shrink-0 bg-[#0B1526] border border-[#C8A24A]/30 p-1"
          />
          <div className="min-w-0 space-y-1">
            <div className="text-base font-bold text-white">نظام بناء الثروة</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              تطبيق شخصي مجاني لإدارة الأموال والأهداف والاستثمارات ويعمل حتى بدون إنترنت.
            </p>
          </div>
        </div>

        {/* Primary Launch & Install Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleClose}
            data-testid="qr-launch-try-now-btn"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#C8A24A] hover:bg-[#DDBB6A] text-[#0B1526] text-sm font-bold transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>تشغيل وتجربة التطبيق</span>
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleInstallAction}
            data-testid="qr-launch-install-btn"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#FAFBFD] dark:bg-[#132038] hover:bg-slate-100 dark:hover:bg-[#1A2B4A] border border-[#DCE1EC] dark:border-[#243656] text-[#0B1526] dark:text-slate-100 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            {isInstallable ? (
              <Download className="w-4 h-4 text-[#9E7B2C] dark:text-[#DDBB6A]" />
            ) : (
              <Smartphone className="w-4 h-4 text-[#9E7B2C] dark:text-[#DDBB6A]" />
            )}
            <span>تثبيت كأيقونة على الهاتف</span>
          </button>
        </div>

        {/* Concise On-Demand Install Steps when browser doesn't trigger native prompt */}
        {showInstallSteps && (
          <div className="p-4 rounded-xl bg-[#FAFBFD] dark:bg-[#132038] border border-[#E4E8F0] dark:border-[#1E2E4A] space-y-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {isIOS || !isAndroid ? (
              <>
                <div className="font-bold text-[#0B1526] dark:text-slate-100">
                  لتثبيت التطبيق على الآيفون (Safari):
                </div>
                <p>
                  1. اضغط على أيقونة <strong>المشاركة</strong>{' '}
                  <Share className="w-3.5 h-3.5 inline text-[#9E7B2C] dark:text-[#DDBB6A]" />{' '}
                  في شريط المتصفح أسفل الشاشة.
                </p>
                <p>
                  2. اختر <strong>إضافة إلى الشاشة الرئيسية</strong>{' '}
                  <PlusSquare className="w-3.5 h-3.5 inline text-[#9E7B2C] dark:text-[#DDBB6A]" />{' '}
                  ثم اضغط <strong>إضافة (Add)</strong>.
                </p>
              </>
            ) : (
              <>
                <div className="font-bold text-[#0B1526] dark:text-slate-100">
                  لتثبيت التطبيق على أندرويد (Chrome):
                </div>
                <p>
                  1. اضغط على قائمة المتصفح{' '}
                  <MoreVertical className="w-3.5 h-3.5 inline text-[#9E7B2C] dark:text-[#DDBB6A]" />{' '}
                  في الأعلى.
                </p>
                <p>
                  2. اختر <strong>تثبيت التطبيق (Install App)</strong> ليفتح كأيقونة مستقلة.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
