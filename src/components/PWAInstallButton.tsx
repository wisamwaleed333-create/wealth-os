import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  MoreVertical,
  PlusSquare,
  QrCode,
  Share,
  Share2,
  Smartphone,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  isLocalhostUrl,
  resolveMobileOpenUrl,
  shouldShowInstallModalOnClick,
} from '../utils/pwa';
import { Modal } from './Modal';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
}) => {
  const { isInstallable, isIOS, isAndroid, installMode, install } =
    usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [customShareUrl, setCustomShareUrl] = useState('');
  const [showCustomUrlInput, setShowCustomUrlInput] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  const mobileUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    return resolveMobileOpenUrl(window.location.href, customShareUrl);
  }, [customShareUrl]);

  const showLocalhostHint = useMemo(
    () => (mobileUrl ? isLocalhostUrl(mobileUrl) : false),
    [mobileUrl]
  );

  useEffect(() => {
    if (!showGuideModal || !mobileUrl) {
      return;
    }

    let cancelled = false;
    setQrError(false);

    QRCode.toDataURL(mobileUrl, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0B1526',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (!cancelled) {
          setQrDataUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [showGuideModal, mobileUrl]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  // Automatically suppress when running inside an already-installed standalone PWA
  if (installMode === 'hidden') {
    return null;
  }

  const handleClick = async () => {
    const isMobile = isIOS || isAndroid;
    if (shouldShowInstallModalOnClick({ installMode, isMobile })) {
      setShowGuideModal(true);
      return;
    }
    await install();
  };

  const handleCopyLink = async () => {
    if (!mobileUrl) {
      return;
    }

    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(mobileUrl);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied && typeof document !== 'undefined') {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = mobileUrl;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        copied = false;
      }
    }

    if (copied) {
      setCopiedLink(true);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedLink(false);
      }, 2200);
    }
  };

  const handleShareApp = async () => {
    if (!mobileUrl) return;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'نظام بناء الثروة',
          text: 'جرّب تطبيق نظام بناء الثروة لإدارة الأموال والأهداف والاستثمارات:',
          url: mobileUrl,
        });
        return;
      } catch {
        // User cancelled or share unavailable — fall back to copy
      }
    }
    await handleCopyLink();
  };

  return (
    <>
      {variant === 'sidebar' ? (
        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-300">تطبيق الهاتف</span>
          <button
            type="button"
            onClick={handleClick}
            data-testid="pwa-install-sidebar-button"
            aria-label="تثبيت التطبيق على الهاتف"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#C8A24A] hover:bg-[#DDBB6A] text-[#0B1526] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            {isInstallable ? (
              <Download className="w-3.5 h-3.5" />
            ) : (
              <Smartphone className="w-3.5 h-3.5" />
            )}
            تثبيت التطبيق
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          data-testid="pwa-install-header-button"
          aria-label="تثبيت التطبيق على الهاتف"
          title="تثبيت التطبيق على الهاتف"
          className="inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-lg border border-[#E2E8F0] dark:border-[#243656] bg-white dark:bg-[#132038] hover:bg-slate-50 dark:hover:bg-[#1A2B4A] hover:border-[#C8A24A] dark:hover:border-[#C8A24A]/60 text-[#0B1526] dark:text-slate-100 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
        >
          {isInstallable ? (
            <Download className="w-4 h-4 text-[#9E7B2C] dark:text-[#DDBB6A]" />
          ) : (
            <Smartphone className="w-4 h-4 text-[#9E7B2C] dark:text-[#DDBB6A]" />
          )}
          <span className="hidden sm:inline">تثبيت التطبيق</span>
        </button>
      )}

      <Modal
        open={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        title="تثبيت ومشاركة نظام بناء الثروة"
        subtitle="امسح الباركود لفتح التطبيق مباشرة على الموبايل وتجربته أو مشاركته بسهولة"
      >
        <div className="space-y-3">
          {/* Mobile QR Code App Launch & Share Card */}
          <div
            data-testid="pwa-qr-card"
            className="p-3.5 rounded-xl bg-gradient-to-br from-[#F8F9FC] to-[#EEF2F8] dark:from-[#132038] dark:to-[#0F1B30] border border-[#DCE3EE] dark:border-[#243656] space-y-2.5"
          >
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-2 text-center sm:text-start w-full">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="w-7 h-7 rounded-lg bg-[#0B1526] dark:bg-[#C8A24A]/20 text-[#DDBB6A] flex items-center justify-center shrink-0">
                    <QrCode className="w-4 h-4" />
                  </span>
                  <h4 className="text-sm font-bold text-[#0B1526] dark:text-slate-100">
                    امسح الباركود لفتح التطبيق وتجربته
                  </h4>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  عند المسح بكاميرا الهاتف يُفتح <strong>نظام بناء الثروة</strong> مباشرة بوضع التطبيق لتجربته فوراً أو تثبيته على الشاشة الرئيسية.
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleShareApp}
                    data-testid="pwa-share-app-button"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B1526] dark:bg-[#C8A24A] hover:bg-[#162744] dark:hover:bg-[#DDBB6A] text-white dark:text-[#0B1526] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>مشاركة التطبيق</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    data-testid="pwa-copy-link-button"
                    aria-label="نسخ رابط مشاركة التطبيق"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B1526] border border-[#DCE1EC] dark:border-[#243656] hover:bg-slate-50 dark:hover:bg-[#162744] text-[#0B1526] dark:text-slate-100 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>تم نسخ الدعوة</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ دعوة التطبيق</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="shrink-0 bg-white p-2 rounded-xl border border-[#E4E8F0] shadow-xs flex items-center justify-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="رمز باركود لفتح ومشاركة نظام بناء الثروة على الموبايل"
                    data-testid="pwa-qr-image"
                    className="w-28 h-28 sm:w-32 sm:h-32 block rounded-md"
                  />
                ) : qrError ? (
                  <div className="w-28 h-28 sm:w-32 sm:h-32 flex flex-col items-center justify-center text-center gap-2 text-slate-500 text-xs px-2">
                    <QrCode className="w-8 h-8 text-slate-400" />
                    <span>تعذر إنشاء الباركود</span>
                  </div>
                ) : (
                  <div
                    aria-label="جاري إنشاء رمز الباركود"
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-md bg-slate-100 animate-pulse flex items-center justify-center"
                  >
                    <QrCode className="w-8 h-8 text-slate-300" />
                  </div>
                )}
              </div>
            </div>

            {showLocalhostHint && (
              <div className="pt-2 border-t border-[#DCE3EE]/70 dark:border-[#243656] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-700 dark:text-amber-300">
                  <span>
                    أنت في وضع المعاينة المحلية؛ للمسح من هاتف خارجي استخدم عنوان الشبكة أو رابط المشاركة.
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCustomUrlInput((v) => !v)}
                    className="font-semibold underline cursor-pointer"
                  >
                    {showCustomUrlInput ? 'إخفاء' : 'تخصيص عنوان الباركود'}
                  </button>
                </div>
                {showCustomUrlInput && (
                  <input
                    type="url"
                    dir="ltr"
                    value={customShareUrl}
                    onChange={(e) => setCustomShareUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 focus:outline-none focus:border-[#C8A24A]"
                  />
                )}
              </div>
            )}
          </div>

          {isInstallable && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
              <div className="text-xs text-emerald-900 dark:text-emerald-200">
                متصفحك يدعم التثبيت المباشر على هذا الجهاز بنقرة واحدة الآن.
              </div>
              <button
                type="button"
                onClick={async () => {
                  const ok = await install();
                  if (ok) setShowGuideModal(false);
                }}
                className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526] text-xs font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                تثبيت الآن
              </button>
            </div>
          )}

          {/* iOS Safari Guide */}
          {(isIOS || !isAndroid) && (
            <div className="p-3.5 rounded-xl bg-[#FAFBFD] dark:bg-[#132038] border border-[#E4E8F0] dark:border-[#1E2E4A] space-y-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#9E7B2C] dark:text-[#DDBB6A]" />
                <h4 className="text-sm font-bold text-[#0B1526] dark:text-slate-100">
                  على أجهزة الآيفون والآيباد (Safari)
                </h4>
              </div>
              <ol className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#0B1526] dark:bg-[#1D3154] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    افتح التطبيق في متصفح <strong>Safari</strong> ثم اضغط على أيقونة{' '}
                    <strong className="inline-flex items-center gap-1 text-[#0B1526] dark:text-slate-100">
                      المشاركة
                      <Share className="w-3.5 h-3.5 inline text-[#9E7B2C] dark:text-[#DDBB6A]" />
                    </strong>{' '}
                    في شريط المتصفح بالأسفل.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#0B1526] dark:bg-[#1D3154] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    مرّر القائمة للأسفل واختر{' '}
                    <strong className="inline-flex items-center gap-1 text-[#0B1526] dark:text-slate-100">
                      إضافة إلى الشاشة الرئيسية
                      <PlusSquare className="w-3.5 h-3.5 inline text-[#9E7B2C] dark:text-[#DDBB6A]" />
                    </strong>
                    .
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#0B1526] dark:bg-[#1D3154] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    اضغط <strong>إضافة (Add)</strong> في الزاوية العلوية ليظهر التطبيق كأيقونة مستقلة على شاشة هاتفك.
                  </span>
                </li>
              </ol>
            </div>
          )}

          {/* Android Chrome / Edge Guide */}
          {!isIOS && (
            <div className="p-3.5 rounded-xl bg-[#FAFBFD] dark:bg-[#132038] border border-[#E4E8F0] dark:border-[#1E2E4A] space-y-2">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-[#9E7B2C] dark:text-[#DDBB6A]" />
                <h4 className="text-sm font-bold text-[#0B1526] dark:text-slate-100">
                  على أجهزة أندرويد (Chrome / Edge)
                </h4>
              </div>
              <ol className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#0B1526] dark:bg-[#1D3154] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    افتح التطبيق في متصفح <strong>Chrome</strong> أو <strong>Edge</strong> واضغط على قائمة المتصفح{' '}
                    <strong className="inline-flex items-center gap-0.5 text-[#0B1526] dark:text-slate-100">
                      <MoreVertical className="w-3.5 h-3.5 inline text-[#9E7B2C] dark:text-[#DDBB6A]" />
                    </strong>{' '}
                    في الأعلى.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#0B1526] dark:bg-[#1D3154] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    اختر <strong>تثبيت التطبيق (Install App)</strong> أو <strong>الإضافة إلى الشاشة الرئيسية</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#0B1526] dark:bg-[#1D3154] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    أكّد التثبيت ليتم تشغيل التطبيق في نافذة مستقلة مع حفظ بياناتك محلياً على جهازك.
                  </span>
                </li>
              </ol>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
            <CheckCircle2 className="w-4 h-4 text-[#15803D] dark:text-emerald-400 shrink-0" />
            <span>بياناتك المالية تبقى محفوظة بأمان محلياً على هاتفك وتعمل حتى بدون إنترنت.</span>
          </div>

          <div className="pt-2 border-t border-[#EEF1F6] dark:border-[#1E2E4A] flex justify-end">
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="px-5 py-2 rounded-lg bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526] text-sm font-semibold hover:bg-[#162744] dark:hover:bg-[#DDBB6A] transition-colors cursor-pointer"
            >
              فهمت، إغلاق
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
