import React, { useEffect } from 'react';
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  TrendingDown,
  X,
} from 'lucide-react';
import { NavSection, SmartAlert } from '../types/wealth';

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  alerts: SmartAlert[];
  dismissedCount: number;
  onDismissAlert: (alertId: string) => void;
  onRestoreDismissed: () => void;
  onMarkBillPaid: (billId: string) => void;
  onNavigate: (section: NavSection) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  open,
  onClose,
  alerts,
  dismissedCount,
  onDismissAlert,
  onRestoreDismissed,
  onMarkBillPaid,
  onNavigate,
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const getSeverityStyle = (alert: SmartAlert) => {
    if (alert.severity === 'critical') {
      return {
        box: 'bg-red-50/70 dark:bg-red-950/35 border-red-200 dark:border-red-900/60',
        label: 'تنبيه عاجل',
        labelColor: 'text-[#B91C1C] dark:text-red-400',
        icon:
          alert.type === 'net_worth_drop' ? (
            <TrendingDown className="w-4 h-4 text-[#B91C1C] dark:text-red-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-[#B91C1C] dark:text-red-400" />
          ),
      };
    }
    if (alert.severity === 'warning') {
      return {
        box: 'bg-[#F8F2E2]/80 dark:bg-[#231C0D] border-[#E7D8B1] dark:border-[#5C471D]',
        label: 'تحذير',
        labelColor: 'text-[#9E7B2C] dark:text-[#DDBB6A]',
        icon: <CalendarClock className="w-4 h-4 text-[#9E7B2C] dark:text-[#DDBB6A]" />,
      };
    }
    return {
      box: 'bg-[#FAFBFD] dark:bg-[#132038] border-[#E4E8F0] dark:border-[#1E2E4A]',
      label: 'تذكير',
      labelColor: 'text-[#0B1526] dark:text-slate-100',
      icon: <Bell className="w-4 h-4 text-[#0B1526] dark:text-[#DDBB6A]" />,
    };
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-start bg-[#070E1A]/60 dark:bg-[#02060E]/80 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="مركز التنبيهات الذكية"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md h-full bg-white dark:bg-[#0D172A] border-l border-[#E2E8F0] dark:border-[#1E2E4A] shadow-2xl flex flex-col">
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-white/10 hero-wealth-surface text-white flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white">مركز التنبيهات الذكية</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {alerts.length > 0
                ? `${alerts.length} تنبيهات نشطة تتطلب انتباهك`
                : 'لا توجد تنبيهات نشطة حالياً'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق مركز التنبيهات"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {alerts.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-[#15803D] dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-[#0B1526] dark:text-slate-100">
                وضعك المالي مستقر
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                لا توجد تجاوزات في الميزانيات أو فواتير مستحقة قريباً أو انخفاض في صافي الثروة.
              </p>
            </div>
          ) : (
            alerts.map((alert) => {
              const style = getSeverityStyle(alert);
              return (
                <article
                  key={alert.id}
                  className={`rounded-xl border p-4 space-y-2.5 ${style.box}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0">{style.icon}</span>
                      <span className={`text-xs font-semibold ${style.labelColor}`}>
                        {style.label}
                      </span>
                      {alert.metricLabel && (
                        <>
                          <span aria-hidden="true" className="text-slate-400 dark:text-slate-500">
                            ·
                          </span>
                          <span dir="ltr" className="text-xs font-mono tabular-nums font-semibold text-[#0B1526] dark:text-slate-100">
                            {alert.metricLabel}
                          </span>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onDismissAlert(alert.id)}
                      aria-label={`تجاهل تنبيه ${alert.title}`}
                      className="text-xs text-slate-500 dark:text-slate-400 hover:text-[#0B1526] dark:hover:text-white cursor-pointer shrink-0"
                    >
                      تجاهل
                    </button>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[#0B1526] dark:text-slate-100">{alert.title}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {alert.message}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    {alert.billId && (
                      <button
                        type="button"
                        onClick={() => onMarkBillPaid(alert.billId!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B1526] dark:bg-[#1B3154] text-white dark:border dark:border-[#2E4B7A] text-xs font-semibold hover:bg-[#162744] dark:hover:bg-[#233F6B] cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#DDBB6A]" />
                        تسجيل كمدفوعة
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate(alert.actionSection);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#9E7B2C] dark:text-[#DDBB6A] hover:underline cursor-pointer"
                    >
                      فتح القسم
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#EEF1F6] dark:border-[#1B2B46] bg-[#FAFBFD] dark:bg-[#111E35] space-y-2">
          {dismissedCount > 0 && (
            <button
              type="button"
              onClick={onRestoreDismissed}
              className="w-full py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-[#0B1526] dark:hover:text-white cursor-pointer"
            >
              إظهار التنبيهات المتجاهَلة ({dismissedCount})
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onNavigate('alerts');
              onClose();
            }}
            className="w-full py-2.5 px-4 rounded-lg bg-[#0B1526] dark:bg-[#1B3154] text-white dark:border dark:border-[#2E4B7A] text-sm font-semibold hover:bg-[#162744] dark:hover:bg-[#233F6B] transition-colors cursor-pointer"
          >
            إدارة قواعد التنبيهات والفواتير
          </button>
        </div>
      </div>
    </div>
  );
};
