import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  Pencil,
  Plus,
  RotateCcw,
  ShieldAlert,
  Trash2,
  TrendingDown,
} from 'lucide-react';
import {
  BillReminder,
  Currency,
  ExpenseCategory,
  NavSection,
  NetWorthAlertConfig,
  SmartAlert,
  WealthState,
} from '../types/wealth';
import { CURRENCY_SHORT_LABELS, EXPENSE_CATEGORY_LABELS } from '../data/labels';
import {
  evaluateBillReminders,
  evaluateCategoryBudgets,
  evaluateNetWorthAlert,
} from '../utils/alerts';
import { convertCurrency, generateId } from '../utils/finance';
import { AmountText } from './AmountText';
import { EmptyState } from './EmptyState';
import { Modal } from './Modal';

interface AlertsViewProps {
  state: WealthState;
  alerts: SmartAlert[];
  referenceDateStr: string;
  onAddBill: (bill: BillReminder) => void;
  onUpdateBill: (bill: BillReminder) => void;
  onDeleteBill: (id: string) => void;
  onMarkBillPaid: (billId: string) => void;
  onUpdateNetWorthAlert: (next: Partial<NetWorthAlertConfig>) => void;
  onDismissAlert: (alertId: string) => void;
  onRestoreDismissed: () => void;
  onNavigate: (section: NavSection) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  state,
  alerts,
  referenceDateStr,
  onAddBill,
  onUpdateBill,
  onDeleteBill,
  onMarkBillPaid,
  onUpdateNetWorthAlert,
  onDismissAlert,
  onRestoreDismissed,
  onNavigate,
}) => {
  const { displayCurrency, exchangeRateIQDPerUSD } = state.settings;
  const currentMonthKey = referenceDateStr.slice(0, 7);

  const evaluatedBills = useMemo(
    () => evaluateBillReminders(state.billReminders, referenceDateStr),
    [state.billReminders, referenceDateStr]
  );

  const nwEval = useMemo(() => evaluateNetWorthAlert(state), [state]);
  const budgetStatuses = useMemo(
    () => evaluateCategoryBudgets(state, currentMonthKey),
    [state, currentMonthKey]
  );
  const exceededBudgetsCount = budgetStatuses.filter((b) => b.status === 'exceeded').length;
  const dueBillsCount = evaluatedBills.filter((b) => b.isDueSoon || b.isOverdue).length;

  // Net worth threshold form state
  const [thresholdInput, setThresholdInput] = useState(
    String(state.netWorthAlert.dropThresholdPct)
  );
  const [thresholdSavedMsg, setThresholdSavedMsg] = useState(false);

  // Bill modal state
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [billError, setBillError] = useState('');
  const [billForm, setBillForm] = useState({
    title: '',
    amount: '',
    currency: displayCurrency as Currency,
    dueDate: referenceDateStr,
    recurringMonthly: true,
    reminderDaysBefore: '5',
    category: 'utilities' as ExpenseCategory,
    notes: '',
  });

  const openCreateBill = () => {
    setEditingBillId(null);
    setBillForm({
      title: '',
      amount: '',
      currency: displayCurrency,
      dueDate: referenceDateStr,
      recurringMonthly: true,
      reminderDaysBefore: '5',
      category: 'utilities',
      notes: '',
    });
    setBillError('');
    setBillModalOpen(true);
  };

  const openEditBill = (bill: BillReminder) => {
    setEditingBillId(bill.id);
    setBillForm({
      title: bill.title,
      amount: String(bill.amount),
      currency: bill.currency,
      dueDate: bill.dueDate,
      recurringMonthly: bill.recurringMonthly,
      reminderDaysBefore: String(bill.reminderDaysBefore),
      category: bill.category,
      notes: bill.notes ?? '',
    });
    setBillError('');
    setBillModalOpen(true);
  };

  const handleBillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(billForm.amount);
    const leadDays = Number(billForm.reminderDaysBefore);

    if (!billForm.title.trim()) {
      setBillError('يرجى إدخال اسم الفاتورة أو الالتزام.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setBillError('يرجى إدخال مبلغ صحيح أكبر من صفر.');
      return;
    }
    if (!Number.isFinite(leadDays) || leadDays < 0 || leadDays > 30) {
      setBillError('أيام التذكير المسبق يجب أن تكون بين 0 و 30 يوماً.');
      return;
    }

    const existing = editingBillId
      ? state.billReminders.find((b) => b.id === editingBillId)
      : undefined;

    const payload: BillReminder = {
      id: editingBillId ?? generateId('bill'),
      title: billForm.title.trim(),
      amount,
      currency: billForm.currency,
      dueDate: billForm.dueDate,
      recurringMonthly: billForm.recurringMonthly,
      reminderDaysBefore: Math.round(leadDays),
      category: billForm.category,
      paidForMonth: existing?.paidForMonth,
      notes: billForm.notes.trim() || undefined,
    };

    if (editingBillId) {
      onUpdateBill(payload);
    } else {
      onAddBill(payload);
    }
    setBillModalOpen(false);
  };

  const handleSaveNetWorthThreshold = (e: React.FormEvent) => {
    e.preventDefault();
    const pct = Number(thresholdInput);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return;
    onUpdateNetWorthAlert({ dropThresholdPct: pct });
    setThresholdSavedMsg(true);
    setTimeout(() => setThresholdSavedMsg(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B1526] dark:text-slate-100">نظام التنبيهات الذكية</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            مراقبة سقوف الميزانيات الشهرية، مواعيد استحقاق الفواتير، وانخفاض صافي الثروة
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateBill}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-[#0B1526] dark:bg-[#1B3154] dark:border dark:border-[#2E4B7A] text-white text-sm font-semibold hover:bg-[#162744] dark:hover:bg-[#233F6B] transition-colors shadow-xs cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 text-[#DDBB6A]" />
          إضافة تذكير فاتورة
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="hero-wealth-surface rounded-2xl text-white border border-[#1E3256] p-5 shadow-md">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#DDBB6A]">التنبيهات النشطة حالياً</span>
            <span className="w-8 h-8 rounded-lg bg-white/10 text-[#DDBB6A] flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold font-mono tabular-nums">{alerts.length}</div>
          <div className="mt-1 text-xs text-slate-300">
            {alerts.filter((a) => a.severity === 'critical').length} تنبيهات عاجلة
          </div>
        </div>

        <div className="saas-card p-5 transition-colors hover:border-[#C8A24A]/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">فواتير مستحقة قريباً / متأخرة</span>
            <span className="w-8 h-8 rounded-lg bg-[#F8F2E2] dark:bg-[#231E12] text-[#9E7B2C] dark:text-[#DDBB6A] flex items-center justify-center shrink-0">
              <CalendarClock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold font-mono tabular-nums text-[#0B1526] dark:text-slate-100">
            {dueBillsCount}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            من إجمالي {state.billReminders.length} تذكيرات مجدولة
          </div>
        </div>

        <div className="saas-card p-5 transition-colors hover:border-[#C8A24A]/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">ميزانيات متجاوزة هذا الشهر</span>
            <span className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-[#B91C1C] dark:text-red-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div
            className={`mt-3 text-2xl font-bold font-mono tabular-nums ${
              exceededBudgetsCount > 0
                ? 'text-[#B91C1C] dark:text-red-400'
                : 'text-[#15803D] dark:text-emerald-400'
            }`}
          >
            {exceededBudgetsCount}
          </div>
          <button
            type="button"
            onClick={() => onNavigate('expenses')}
            className="mt-1 text-xs text-[#9E7B2C] dark:text-[#DDBB6A] hover:underline cursor-pointer"
          >
            تعديل سقوف المصروفات
          </button>
        </div>

        <div className="saas-card p-5 transition-colors hover:border-[#C8A24A]/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">حماية صافي الثروة</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[#15803D] dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <div
            className={`mt-3 text-lg font-bold ${
              nwEval.isTriggered
                ? 'text-[#B91C1C] dark:text-red-400'
                : nwEval.enabled
                ? 'text-[#15803D] dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {nwEval.isTriggered
              ? `انخفاض ${nwEval.dropPct.toFixed(1)}%`
              : nwEval.enabled
              ? `مفعّلة (حد ${nwEval.thresholdPct}%)`
              : 'متوقفة'}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">مقارنة بالمرجع المحدد</div>
        </div>
      </div>

      {/* Active Alerts Section */}
      <section className="saas-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#0B1526] dark:text-slate-100">التنبيهات النشطة</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              تُحدَّث تلقائياً عند تغيير المصروفات، الفواتير، الأصول، أو الالتزامات
            </p>
          </div>
          {state.dismissedAlertIds.length > 0 && (
            <button
              type="button"
              onClick={onRestoreDismissed}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9E7B2C] dark:text-[#DDBB6A] hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              استعادة المتجاهَلة ({state.dismissedAlertIds.length})
            </button>
          )}
        </div>

        {alerts.length === 0 ? (
          <EmptyState
            compact
            icon={<CheckCircle2 className="w-5 h-5" />}
            title="لا توجد تنبيهات نشطة حالياً"
            description="جميع الميزانيات والفواتير وصافي الثروة ضمن الحدود الآمنة"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {alerts.map((alert) => {
              const isCritical = alert.severity === 'critical';
              const isWarning = alert.severity === 'warning';
              return (
                <article
                  key={alert.id}
                  className={`rounded-xl border p-4 flex flex-col justify-between gap-3 ${
                    isCritical
                      ? 'bg-red-50/70 dark:bg-red-950/35 border-red-200 dark:border-red-900/60'
                      : isWarning
                      ? 'bg-[#F8F2E2]/80 dark:bg-[#231D11] border-[#E7D8B1] dark:border-[#4A3B19]'
                      : 'bg-[#FAFBFD] dark:bg-[#132038] border-[#E4E8F0] dark:border-[#1E2E4A]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {alert.type === 'net_worth_drop' ? (
                          <TrendingDown className="w-4 h-4 text-[#B91C1C] dark:text-red-400" />
                        ) : isCritical ? (
                          <AlertTriangle className="w-4 h-4 text-[#B91C1C] dark:text-red-400" />
                        ) : isWarning ? (
                          <CalendarClock className="w-4 h-4 text-[#9E7B2C] dark:text-[#DDBB6A]" />
                        ) : (
                          <Bell className="w-4 h-4 text-[#0B1526] dark:text-slate-200" />
                        )}
                        <span
                          className={`text-xs font-semibold ${
                            isCritical
                              ? 'text-[#B91C1C] dark:text-red-400'
                              : isWarning
                              ? 'text-[#9E7B2C] dark:text-[#DDBB6A]'
                              : 'text-[#0B1526] dark:text-slate-200'
                          }`}
                        >
                          {isCritical ? 'عاجل' : isWarning ? 'تحذير' : 'تذكير'}
                        </span>
                        {alert.metricLabel && (
                          <>
                            <span aria-hidden="true" className="text-slate-400 dark:text-slate-500">
                              ·
                            </span>
                            <span dir="ltr" className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                              {alert.metricLabel}
                            </span>
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onDismissAlert(alert.id)}
                        className="text-xs text-slate-500 dark:text-slate-400 hover:text-[#0B1526] dark:hover:text-white cursor-pointer"
                      >
                        تجاهل
                      </button>
                    </div>
                    <h4 className="text-sm font-bold text-[#0B1526] dark:text-slate-100">{alert.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{alert.message}</p>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    {alert.billId && (
                      <button
                        type="button"
                        onClick={() => onMarkBillPaid(alert.billId!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B1526] dark:bg-[#1B3154] dark:border dark:border-[#2E4B7A] text-white text-xs font-semibold hover:bg-[#162744] dark:hover:bg-[#233F6B] cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#DDBB6A]" />
                        تسجيل كمدفوعة
                      </button>
                    )}
                    {alert.actionSection !== 'alerts' && (
                      <button
                        type="button"
                        onClick={() => onNavigate(alert.actionSection)}
                        className="text-xs font-semibold text-[#9E7B2C] dark:text-[#DDBB6A] hover:underline cursor-pointer"
                      >
                        معاينة القسم
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Net Worth Drop Alert Configuration */}
      <section className="saas-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#EEF1F6] dark:border-[#1B2B46]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0B1526] dark:bg-[#1A2B4A] text-[#DDBB6A] flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0B1526] dark:text-slate-100">
                تنبيه انخفاض صافي الثروة بنسبة مخصصة
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                يرسل تنبيهاً فورياً عند انخفاض صافي ثروتك الإجمالي عن المرجع المحدد بالنسبة التي تختارها
              </p>
            </div>
          </div>

          <label className="inline-flex items-center gap-2.5 cursor-pointer text-sm font-medium text-[#0B1526] dark:text-slate-100 shrink-0">
            <input
              type="checkbox"
              checked={state.netWorthAlert.enabled}
              onChange={(e) =>
                onUpdateNetWorthAlert({ enabled: e.target.checked })
              }
              className="w-4 h-4 accent-[#0B1526] dark:accent-[#C8A24A] rounded"
            />
            تفعيل مراقبة صافي الثروة
          </label>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 items-end">
          <div className="lg:col-span-4 space-y-1.5">
            <div className="text-xs text-slate-500 dark:text-slate-400">صافي الثروة المرجعي (الذروة / المرجع)</div>
            <div className="text-lg font-bold text-[#0B1526] dark:text-slate-100">
              <AmountText
                amount={nwEval.baselineNetWorthDisplay}
                currency={displayCurrency}
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              القيمة الحالية:{' '}
              <AmountText
                amount={nwEval.currentNetWorthDisplay}
                currency={displayCurrency}
                className="font-semibold text-[#0B1526] dark:text-slate-100"
              />
            </div>
          </div>

          <form
            onSubmit={handleSaveNetWorthThreshold}
            className="lg:col-span-5 flex flex-wrap items-end gap-3"
          >
            <div className="flex-1 min-w-[160px]">
              <label
                htmlFor="nw-drop-pct"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                نسبة الانخفاض للتنبيه (%)
              </label>
              <input
                id="nw-drop-pct"
                type="number"
                min="0.5"
                max="100"
                step="0.5"
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                className="saas-input px-3.5 py-2 text-sm font-mono tabular-nums"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#0B1526] dark:bg-[#1B3154] dark:border dark:border-[#2E4B7A] text-white text-xs font-semibold hover:bg-[#162744] dark:hover:bg-[#233F6B] cursor-pointer whitespace-nowrap"
            >
              حفظ النسبة
            </button>
            {thresholdSavedMsg && (
              <span className="text-xs font-medium text-[#15803D] dark:text-emerald-400">تم الحفظ</span>
            )}
          </form>

          <div className="lg:col-span-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={() =>
                onUpdateNetWorthAlert({
                  baselineNetWorthIQD: Math.max(0, nwEval.currentNetWorthIQD),
                })
              }
              className="px-3.5 py-2 rounded-lg bg-[#F8F2E2] dark:bg-[#231E12] text-[#7A5E1E] dark:text-[#DDBB6A] hover:bg-[#EFE2C0] dark:hover:bg-[#312917] text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              تعيين صافي الثروة الحالي كمرجع
            </button>
            <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={state.netWorthAlert.autoUpdatePeak}
                onChange={(e) =>
                  onUpdateNetWorthAlert({ autoUpdatePeak: e.target.checked })
                }
                className="w-3.5 h-3.5 accent-[#0B1526] dark:accent-[#C8A24A] rounded"
              />
              تحديث المرجع تلقائياً عند ارتفاع الثروة
            </label>
          </div>
        </div>
      </section>

      {/* Bill Payment Reminders Table */}
      <section className="saas-card overflow-hidden">
        <div className="p-5 border-b border-[#EEF1F6] dark:border-[#1B2B46] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#0B1526] dark:text-slate-100">
              تذكيرات الفواتير والمدفوعات القادمة
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              إدارة مواعيد الاستحقاق الشهرية والمرة الواحدة مع إمكانية التأشير كمدفوعة
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateBill}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#F1F5F9] dark:bg-[#132038] hover:bg-slate-200 dark:hover:bg-[#1B2D4D] text-xs font-semibold text-[#0B1526] dark:text-slate-100 cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            فاتورة جديدة
          </button>
        </div>

        {evaluatedBills.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="w-5 h-5" />}
            title="لا توجد فواتير أو تذكيرات دفع مجدولة"
            description="أضف فواتيرك الشهرية أو التزاماتك المتكررة لتصلك تنبيهات قبل موعد الاستحقاق"
            actionLabel="إضافة أول تذكير فاتورة"
            onAction={openCreateBill}
          />
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-[#EEF1F6] dark:divide-[#1B2B46]">
              {evaluatedBills.map((item) => {
                const amountDisplay = convertCurrency(
                  item.bill.amount,
                  item.bill.currency,
                  displayCurrency,
                  exchangeRateIQDPerUSD
                );

                let statusText = `بعد ${item.daysUntilDue} يوم`;
                let statusClass = 'text-slate-600 dark:text-slate-300';
                if (item.isPaidThisCycle) {
                  statusText = 'مدفوعة لهذا الشهر';
                  statusClass = 'text-[#15803D] dark:text-emerald-400 font-medium';
                } else if (item.isOverdue) {
                  statusText = `متأخرة ${Math.abs(item.daysUntilDue)} يوم`;
                  statusClass = 'text-[#B91C1C] dark:text-red-400 font-semibold';
                } else if (item.daysUntilDue === 0) {
                  statusText = 'مستحقة اليوم';
                  statusClass = 'text-[#B91C1C] dark:text-red-400 font-semibold';
                } else if (item.isDueSoon) {
                  statusText = `قريبة (خلال ${item.daysUntilDue} أيام)`;
                  statusClass = 'text-[#9E7B2C] dark:text-[#DDBB6A] font-semibold';
                }

                return (
                  <div key={item.bill.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-[#0B1526] dark:text-slate-100">
                          {item.bill.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {EXPENSE_CATEGORY_LABELS[item.bill.category]} ·{' '}
                          <span className={statusClass}>{statusText}</span>
                        </div>
                      </div>
                      <div className="text-left shrink-0 text-sm font-bold text-[#0B1526] dark:text-slate-100">
                        <AmountText amount={amountDisplay} currency={displayCurrency} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span dir="ltr" className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {item.effectiveDueDate}
                      </span>
                      <div className="flex items-center gap-2">
                        {!item.isPaidThisCycle && (
                          <button
                            type="button"
                            onClick={() => onMarkBillPaid(item.bill.id)}
                            aria-label={`تسجيل دفع ${item.bill.title}`}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-[#15803D] dark:text-emerald-400 text-xs font-semibold cursor-pointer"
                          >
                            تم الدفع
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditBill(item.bill)}
                          aria-label={`تعديل الفاتورة ${item.bill.title}`}
                          className="p-2 rounded-lg bg-slate-100 dark:bg-[#132038] text-[#0B1526] dark:text-slate-100 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteBill(item.bill.id)}
                          aria-label={`حذف الفاتورة ${item.bill.title}`}
                          className="p-2 rounded-lg bg-red-50 dark:bg-red-950/50 text-[#B91C1C] dark:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-[#EEF1F6] dark:border-[#1B2B46] bg-[#F8FAFC] dark:bg-[#111E35] text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">الفاتورة / الالتزام</th>
                    <th className="py-3 px-4">تاريخ الاستحقاق</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4">
                      المبلغ ({CURRENCY_SHORT_LABELS[displayCurrency]})
                    </th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF1F6] dark:divide-[#1B2B46] text-sm">
                  {evaluatedBills.map((item) => {
                    const amountDisplay = convertCurrency(
                      item.bill.amount,
                      item.bill.currency,
                      displayCurrency,
                      exchangeRateIQDPerUSD
                    );

                    let statusText = `بعد ${item.daysUntilDue} يوم`;
                    let statusClass = 'text-slate-600 dark:text-slate-300';
                    if (item.isPaidThisCycle) {
                      statusText = 'مدفوعة لهذا الشهر';
                      statusClass = 'text-[#15803D] dark:text-emerald-400 font-medium';
                    } else if (item.isOverdue) {
                      statusText = `متأخرة ${Math.abs(item.daysUntilDue)} يوم`;
                      statusClass = 'text-[#B91C1C] dark:text-red-400 font-semibold';
                    } else if (item.daysUntilDue === 0) {
                      statusText = 'مستحقة اليوم';
                      statusClass = 'text-[#B91C1C] dark:text-red-400 font-semibold';
                    } else if (item.isDueSoon) {
                      statusText = `قريبة (خلال ${item.daysUntilDue} أيام)`;
                      statusClass = 'text-[#9E7B2C] dark:text-[#DDBB6A] font-semibold';
                    }

                    return (
                      <tr key={item.bill.id} className="hover:bg-[#FAFBFD] dark:hover:bg-[#13223C] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-[#0B1526] dark:text-slate-100">{item.bill.title}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {EXPENSE_CATEGORY_LABELS[item.bill.category]} ·{' '}
                            {item.bill.recurringMonthly ? 'متكررة شهرياً' : 'دفعة واحدة'} · تذكير قبل{' '}
                            {item.bill.reminderDaysBefore} أيام
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          <span dir="ltr" className="font-mono tabular-nums">
                            {item.effectiveDueDate}
                          </span>
                        </td>
                        <td className={`py-3.5 px-4 text-xs whitespace-nowrap ${statusClass}`}>
                          {statusText}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-[#0B1526] dark:text-slate-100 whitespace-nowrap">
                          <AmountText amount={amountDisplay} currency={displayCurrency} />
                          {item.bill.currency !== displayCurrency && (
                            <div className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                              <AmountText amount={item.bill.amount} currency={item.bill.currency} />
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1">
                            {!item.isPaidThisCycle && (
                              <button
                                type="button"
                                onClick={() => onMarkBillPaid(item.bill.id)}
                                aria-label={`تسجيل دفع ${item.bill.title}`}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-[#15803D] dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs font-semibold cursor-pointer whitespace-nowrap ml-1"
                              >
                                تم الدفع
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditBill(item.bill)}
                              aria-label={`تعديل الفاتورة ${item.bill.title}`}
                              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#0B1526] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2B4A] cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteBill(item.bill.id)}
                              aria-label={`حذف الفاتورة ${item.bill.title}`}
                              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#B91C1C] dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Add / Edit Bill Modal */}
      <Modal
        open={billModalOpen}
        onClose={() => setBillModalOpen(false)}
        title={editingBillId ? 'تعديل تذكير الفاتورة' : 'إضافة تذكير فاتورة جديد'}
        subtitle="سيتم تنبيهك تلقائياً قبل موعد الاستحقاق بعدد الأيام المحدد"
      >
        <form onSubmit={handleBillSubmit} className="space-y-4">
          {billError && (
            <div role="alert" className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-xs text-[#B91C1C] dark:text-red-300">
              {billError}
            </div>
          )}

          <div>
            <label htmlFor="bill-title" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              اسم الفاتورة أو الدفعة
            </label>
            <input
              id="bill-title"
              type="text"
              required
              value={billForm.title}
              onChange={(e) => setBillForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="مثال: اشتراك الإنترنت أو إيجار السكن"
              className="saas-input px-3.5 py-2.5 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="bill-amt" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                المبلغ المتوقع
              </label>
              <input
                id="bill-amt"
                type="number"
                step="any"
                min="0"
                required
                value={billForm.amount}
                onChange={(e) => setBillForm((f) => ({ ...f, amount: e.target.value }))}
                className="saas-input px-3.5 py-2.5 text-sm font-mono tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="bill-cur" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                العملة
              </label>
              <select
                id="bill-cur"
                value={billForm.currency}
                onChange={(e) =>
                  setBillForm((f) => ({ ...f, currency: e.target.value as Currency }))
                }
                className="saas-input px-3.5 py-2.5 text-sm"
              >
                <option value="IQD">دينار عراقي</option>
                <option value="USD">دولار أمريكي</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="bill-due" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                تاريخ الاستحقاق
              </label>
              <input
                id="bill-due"
                type="date"
                required
                value={billForm.dueDate}
                onChange={(e) => setBillForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="saas-input px-3.5 py-2.5 text-sm font-mono"
              />
            </div>
            <div>
              <label htmlFor="bill-lead" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                التذكير قبل الاستحقاق (بالأيام)
              </label>
              <input
                id="bill-lead"
                type="number"
                min="0"
                max="30"
                required
                value={billForm.reminderDaysBefore}
                onChange={(e) =>
                  setBillForm((f) => ({ ...f, reminderDaysBefore: e.target.value }))
                }
                className="saas-input px-3.5 py-2.5 text-sm font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label htmlFor="bill-cat" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                التصنيف
              </label>
              <select
                id="bill-cat"
                value={billForm.category}
                onChange={(e) =>
                  setBillForm((f) => ({
                    ...f,
                    category: e.target.value as ExpenseCategory,
                  }))
                }
                className="saas-input px-3.5 py-2.5 text-sm"
              >
                {(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {EXPENSE_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2.5 pt-5 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={billForm.recurringMonthly}
                onChange={(e) =>
                  setBillForm((f) => ({ ...f, recurringMonthly: e.target.checked }))
                }
                className="w-4 h-4 accent-[#0B1526] dark:accent-[#C8A24A] rounded"
              />
              فاتورة شهرية متكررة
            </label>
          </div>

          <div>
            <label htmlFor="bill-notes" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              ملاحظات (اختياري)
            </label>
            <textarea
              id="bill-notes"
              rows={2}
              value={billForm.notes}
              onChange={(e) => setBillForm((f) => ({ ...f, notes: e.target.value }))}
              className="saas-input px-3.5 py-2 text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EEF1F6] dark:border-[#1B2B46]">
            <button
              type="button"
              onClick={() => setBillModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#0B1526] dark:hover:text-white cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526] text-sm font-semibold hover:bg-[#162744] dark:hover:bg-[#DDBB6A] cursor-pointer"
            >
              {editingBillId ? 'حفظ التعديلات' : 'حفظ التذكير'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
