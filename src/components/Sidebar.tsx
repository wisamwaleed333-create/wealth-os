import React, { useState } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  Landmark,
  Briefcase,
  BarChart3,
  Target,
  Bell,
  X,
  ArrowLeftRight,
  Moon,
  RefreshCw,
  Sun,
} from 'lucide-react';
import { Currency, NavSection, WealthSettings } from '../types/wealth';
import { CURRENCY_LABELS, NAV_ITEMS } from '../data/labels';
import { useAppUpdate } from '../hooks/useAppUpdate';
import { formatVersionBadge } from '../utils/appUpdate';
import { ThemeMode } from '../utils/theme';
import { AppVersionModal } from './AppVersionModal';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  settings: WealthSettings;
  onUpdateSettings: (next: Partial<WealthSettings>) => void;
  alertCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

const SECTION_ICONS: Record<NavSection, React.ReactNode> = {
  dashboard: <LayoutDashboard className="w-[18px] h-[18px]" />,
  income: <TrendingUp className="w-[18px] h-[18px]" />,
  expenses: <Receipt className="w-[18px] h-[18px]" />,
  assets: <Landmark className="w-[18px] h-[18px]" />,
  investments: <Briefcase className="w-[18px] h-[18px]" />,
  reports: <BarChart3 className="w-[18px] h-[18px]" />,
  goals: <Target className="w-[18px] h-[18px]" />,
  alerts: <Bell className="w-[18px] h-[18px]" />,
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  settings,
  onUpdateSettings,
  alertCount,
  mobileOpen,
  onCloseMobile,
  theme,
  onToggleTheme,
}) => {
  const [rateDraft, setRateDraft] = useState(String(settings.exchangeRateIQDPerUSD));
  const [editingRate, setEditingRate] = useState(false);
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const { currentVersion, updateAvailable, isChecking } = useAppUpdate();

  const handleSaveRate = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(rateDraft);
    if (Number.isFinite(parsed) && parsed >= 100 && parsed <= 100000) {
      onUpdateSettings({ exchangeRateIQDPerUSD: Math.round(parsed) });
      setEditingRate(false);
    }
  };

  const handleCurrencyChange = (currency: Currency) => {
    onUpdateSettings({ displayCurrency: currency });
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#091222] dark:bg-[#08101E] text-white border-l border-[#1A2944] dark:border-[#16243D]">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C8A24A]/20 to-[#C8A24A]/5 border border-[#C8A24A]/40 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
            <img
              src="/icon.svg"
              alt="شعار نظام بناء الثروة"
              className="w-8 h-8 rounded-lg object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-[15px] text-white leading-tight whitespace-nowrap tracking-tight">
              نظام بناء الثروة
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
              القليل يصنع ثروة كبيرة
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="إغلاق القائمة"
          className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav aria-label="القائمة الرئيسية" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-1.5 text-[10px] font-semibold tracking-wider text-slate-400/80">
          القائمة الرئيسية
        </div>
        {NAV_ITEMS.map((item) => {
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectSection(item.id);
                onCloseMobile();
              }}
              aria-current={active ? 'page' : undefined}
              className={`group relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all text-right cursor-pointer ${
                active
                  ? 'bg-[#162744] text-[#F1D58A] border border-[#C8A24A]/35 shadow-xs font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.06] border border-transparent'
              }`}
            >
              <span
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  active
                    ? 'bg-[#C8A24A]/15 text-[#DDBB6A]'
                    : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                {SECTION_ICONS[item.id]}
              </span>
              <span className="whitespace-nowrap truncate flex-1">{item.label}</span>
              {item.id === 'alerts' && alertCount > 0 && (
                <span className="font-mono tabular-nums px-1.5 py-0.5 rounded-md bg-[#C8A24A] text-[#0B1526] text-[10px] font-bold leading-none">
                  {alertCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Currency & Manual Exchange Rate Control */}
      <div className="p-3.5 m-3 rounded-xl bg-[#101D34] border border-white/10 space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span>عملة العرض</span>
          <span className="text-[#DDBB6A] font-semibold">
            {CURRENCY_LABELS[settings.displayCurrency]}
          </span>
        </div>

        <div
          className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#070F1D] border border-white/5"
          role="group"
          aria-label="اختيار عملة العرض"
        >
          <button
            type="button"
            onClick={() => handleCurrencyChange('IQD')}
            className={`py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer whitespace-nowrap ${
              settings.displayCurrency === 'IQD'
                ? 'bg-[#C8A24A] text-[#0B1526] font-bold shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            دينار عراقي
          </button>
          <button
            type="button"
            onClick={() => handleCurrencyChange('USD')}
            className={`py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer whitespace-nowrap ${
              settings.displayCurrency === 'USD'
                ? 'bg-[#C8A24A] text-[#0B1526] font-bold shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            دولار أمريكي
          </button>
        </div>

        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#C8A24A]" />
              سعر الصرف اليدوي
            </span>
            {!editingRate && (
              <button
                type="button"
                onClick={() => {
                  setRateDraft(String(settings.exchangeRateIQDPerUSD));
                  setEditingRate(true);
                }}
                className="text-[#DDBB6A] hover:underline cursor-pointer font-medium"
              >
                تعديل
              </button>
            )}
          </div>

          {editingRate ? (
            <form onSubmit={handleSaveRate} className="mt-2 flex items-center gap-1.5">
              <input
                type="number"
                min={100}
                max={100000}
                step={10}
                value={rateDraft}
                onChange={(e) => setRateDraft(e.target.value)}
                aria-label="سعر صرف الدولار بالدينار العراقي"
                className="w-full px-2.5 py-1.5 rounded-md bg-[#08101E] border border-white/20 text-xs text-white font-mono tabular-nums focus:outline-none focus:border-[#C8A24A]"
              />
              <button
                type="submit"
                className="px-2.5 py-1.5 rounded-md bg-[#C8A24A] text-[#0B1526] text-xs font-semibold hover:bg-[#DDBB6A] cursor-pointer whitespace-nowrap"
              >
                حفظ
              </button>
            </form>
          ) : (
            <div className="mt-1 text-xs text-slate-200 text-right">
              <span dir="ltr" className="font-mono tabular-nums">1</span> دولار ={' '}
              <span dir="ltr" className="font-mono tabular-nums font-medium">
                {settings.exchangeRateIQDPerUSD.toLocaleString('en-US')}
              </span>{' '}
              دينار
            </div>
          )}
          <p className="mt-1 text-[10px] text-slate-400 leading-relaxed">
            سعر تحويل يدوي للعرض فقط — لا يعتمد على تغذية سوقية حية.
          </p>
        </div>

        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-300">مظهر الواجهة</span>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#070F1D] hover:bg-[#162744] border border-white/10 text-xs font-medium text-[#DDBB6A] transition-colors cursor-pointer whitespace-nowrap"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5" />
                الوضع النهاري
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5" />
                الوضع الليلي
              </>
            )}
          </button>
        </div>

        <PWAInstallButton variant="sidebar" />

        <div
          data-testid="app-version-row"
          className="pt-2 border-t border-white/10 flex items-center justify-between gap-2"
        >
          <span className="text-[11px] text-slate-400">
            الإصدار{' '}
            <span
              data-testid="app-version-badge"
              dir="ltr"
              className="font-mono tabular-nums text-slate-200 font-semibold"
            >
              {formatVersionBadge(currentVersion.version)}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setVersionModalOpen(true)}
            data-testid="open-version-modal-button"
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              updateAvailable
                ? 'bg-[#C8A24A] text-[#0B1526] hover:bg-[#DDBB6A]'
                : 'bg-[#070F1D] hover:bg-[#162744] border border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <RefreshCw
              className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`}
            />
            <span>{updateAvailable ? 'تحديث متاح' : 'التحديثات'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-[264px] shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="القائمة الجانبية"
        >
          <div className="w-[280px] max-w-[85vw] h-full shadow-2xl">
            {sidebarContent}
          </div>
          <button
            type="button"
            aria-label="إغلاق القائمة الجانبية"
            onClick={onCloseMobile}
            className="flex-1 bg-[#070E1A]/60 backdrop-blur-[2px]"
          />
        </div>
      )}

      <AppVersionModal
        open={versionModalOpen}
        onClose={() => setVersionModalOpen(false)}
      />
    </>
  );
};
