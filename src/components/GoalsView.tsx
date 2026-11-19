import React, { useMemo, useState } from 'react';
import { Award, Coins, Pencil, Plus, PlusCircle, Target, Trash2 } from 'lucide-react';
import { Currency, FinancialGoal, WealthSettings } from '../types/wealth';
import { CURRENCY_SHORT_LABELS } from '../data/labels';
import {
  calculateGoalProgress,
  convertCurrency,
  generateId,
} from '../utils/finance';
import { AmountText } from './AmountText';
import { EmptyState } from './EmptyState';
import { Modal } from './Modal';
import {
  FuturePlannerCalculator,
  FuturePlanGoalDraft,
} from './FuturePlannerCalculator';

interface GoalsViewProps {
  goals: FinancialGoal[];
  settings: WealthSettings;
  isDark?: boolean;
  onAdd: (goal: FinancialGoal) => void;
  onUpdate: (goal: FinancialGoal) => void;
  onDelete: (id: string) => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({
  goals,
  settings,
  isDark = false,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const { displayCurrency, exchangeRateIQDPerUSD } = settings;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    category: 'ادخار واستثمار',
    targetAmount: '',
    currentAmount: '',
    currency: displayCurrency as Currency,
    targetDate: '2027-12-31',
    monthlyContribution: '',
    notes: '',
  });
  const [error, setError] = useState('');

  // Quick deposit modal
  const [depositGoal, setDepositGoal] = useState<FinancialGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  const totals = useMemo(() => {
    let target = 0;
    let saved = 0;
    for (const g of goals) {
      target += convertCurrency(g.targetAmount, g.currency, displayCurrency, exchangeRateIQDPerUSD);
      saved += convertCurrency(g.currentAmount, g.currency, displayCurrency, exchangeRateIQDPerUSD);
    }
    const overallPct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
    return { target, saved, overallPct };
  }, [goals, displayCurrency, exchangeRateIQDPerUSD]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      title: '',
      category: 'ادخار واستثمار',
      targetAmount: '',
      currentAmount: '0',
      currency: displayCurrency,
      targetDate: '2027-12-31',
      monthlyContribution: '',
      notes: '',
    });
    setError('');
    setModalOpen(true);
  };

  const openModalFromPlan = (draft: FuturePlanGoalDraft) => {
    const targetYear = new Date().getFullYear() + draft.horizonYears;
    const targetDate = `${targetYear}-12-31`;
    setEditingId(null);
    setForm({
      title: draft.title,
      category: 'بناء ثروة واستثمار',
      targetAmount: String(draft.targetAmount),
      currentAmount: String(draft.currentAmount),
      currency: draft.currency,
      targetDate,
      monthlyContribution: String(draft.monthlyContribution),
      notes: `خطة ادخار واستثمار لمدة ${draft.horizonYears} سنوات`,
    });
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (goal: FinancialGoal) => {
    setEditingId(goal.id);
    setForm({
      title: goal.title,
      category: goal.category,
      targetAmount: String(goal.targetAmount),
      currentAmount: String(goal.currentAmount),
      currency: goal.currency,
      targetDate: goal.targetDate,
      monthlyContribution: String(goal.monthlyContribution),
      notes: goal.notes ?? '',
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = Number(form.targetAmount);
    const current = Number(form.currentAmount || 0);
    const monthly = Number(form.monthlyContribution || 0);

    if (!form.title.trim()) {
      setError('يرجى إدخال عنوان الهدف المالي.');
      return;
    }
    if (!Number.isFinite(target) || target <= 0) {
      setError('يرجى إدخال المبلغ المستهدف بشكل صحيح.');
      return;
    }
    if (!Number.isFinite(current) || current < 0) {
      setError('قيمة المبلغ المدّخر غير صالحة.');
      return;
    }

    const payload: FinancialGoal = {
      id: editingId ?? generateId('goal'),
      title: form.title.trim(),
      category: form.category.trim() || 'ادخار',
      targetAmount: target,
      currentAmount: current,
      currency: form.currency,
      targetDate: form.targetDate,
      monthlyContribution: Number.isFinite(monthly) && monthly >= 0 ? monthly : 0,
      notes: form.notes.trim() || undefined,
    };

    if (editingId) {
      onUpdate(payload);
    } else {
      onAdd(payload);
    }
    setModalOpen(false);
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositGoal) return;
    const added = Number(depositAmount);
    if (!Number.isFinite(added) || added <= 0) return;

    onUpdate({
      ...depositGoal,
      currentAmount: depositGoal.currentAmount + added,
    });
    setDepositGoal(null);
    setDepositAmount('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B1526] dark:text-slate-100">الأهداف المالية وخطط الادخار</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            تحديد أهداف الثروة طويلة وقصيرة الأجل ومتابعة التقدم الشهري نحو تحقيقها
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-[#0B1526] dark:bg-[#1B3154] dark:border dark:border-[#2E4B7A] text-white text-sm font-semibold hover:bg-[#162744] dark:hover:bg-[#233F6B] transition-colors shadow-xs cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 text-[#DDBB6A]" />
          إضافة هدف مالي
        </button>
      </div>

      {/* Overall Goals Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="hero-wealth-surface rounded-2xl text-white border border-[#1E3256] p-5 shadow-md">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#DDBB6A]">إجمالي المدخرات المخصصة للأهداف</span>
            <span className="w-8 h-8 rounded-lg bg-white/10 text-[#DDBB6A] flex items-center justify-center shrink-0">
              <Coins className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold">
            <AmountText amount={totals.saved} currency={displayCurrency} />
          </div>
          <div className="mt-1 text-xs text-slate-300">
            من أصل <AmountText amount={totals.target} currency={displayCurrency} compact />
          </div>
        </div>

        <div className="saas-card p-5 transition-colors hover:border-[#C8A24A]/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">نسبة الإنجاز الكلية</span>
            <span className="w-8 h-8 rounded-lg bg-[#F8F2E2] dark:bg-[#231E12] text-[#9E7B2C] dark:text-[#DDBB6A] flex items-center justify-center shrink-0">
              <Target className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold font-mono tabular-nums text-[#0B1526] dark:text-slate-100">
            <span dir="ltr" className="inline-block">
              {totals.overallPct.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-[#182844] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#C8A24A]"
              style={{ width: `${totals.overallPct}%` }}
            />
          </div>
        </div>

        <div className="saas-card p-5 transition-colors hover:border-[#C8A24A]/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">عدد الأهداف النشطة</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[#15803D] dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold font-mono tabular-nums text-[#0B1526] dark:text-slate-100">
            {goals.length}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            مكتمل:{' '}
            {goals.filter((g) => calculateGoalProgress(g).isCompleted).length} أهداف
          </div>
        </div>
      </div>

      {/* Future Wealth Planner Calculator */}
      <FuturePlannerCalculator
        displayCurrency={displayCurrency}
        exchangeRateIQDPerUSD={exchangeRateIQDPerUSD}
        existingGoalSavingsInDisplay={totals.saved}
        isDark={isDark}
        onCreateGoalFromPlan={openModalFromPlan}
      />

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="saas-card">
          <EmptyState
            icon={<Target className="w-5 h-5" />}
            title="لم تقم بإنشاء أي أهداف ادخارية بعد"
            description="أنشئ هدفك المالي الأول أو استخدم حاسبة خطط للمستقبل أعلاه لتحويل خطتك إلى هدف فعلي"
            actionLabel="أنشئ أول هدف مالي"
            onAction={openCreateModal}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {goals.map((goal) => {
            const { percentage, remaining, isCompleted } = calculateGoalProgress(goal);
            return (
              <article
                key={goal.id}
                className="saas-card p-6 flex flex-col justify-between gap-5 transition-colors hover:border-[#C8A24A]/50"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-[#0B1526] dark:text-slate-100">{goal.title}</h3>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {goal.category} · الموعد المستهدف{' '}
                        <span dir="ltr" className="font-mono tabular-nums">
                          {goal.targetDate}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(goal)}
                        aria-label={`تعديل الهدف ${goal.title}`}
                        className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#0B1526] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2B4A] cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(goal.id)}
                        aria-label={`حذف الهدف ${goal.title}`}
                        className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#B91C1C] dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-bold text-[#0B1526] dark:text-slate-100">
                        <AmountText amount={goal.currentAmount} currency={goal.currency} />
                      </span>
                      <span
                        className={`text-sm font-mono tabular-nums font-semibold ${
                          isCompleted
                            ? 'text-[#15803D] dark:text-emerald-400'
                            : 'text-[#9E7B2C] dark:text-[#DDBB6A]'
                        }`}
                      >
                        {percentage.toFixed(1)}%
                      </span>
                    </div>

                    <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-[#182844] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isCompleted ? 'bg-[#15803D] dark:bg-emerald-500' : 'bg-[#C8A24A]'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        المستهدف:{' '}
                        <AmountText amount={goal.targetAmount} currency={goal.currency} />
                      </span>
                      <span>
                        {isCompleted ? (
                          <span className="text-[#15803D] dark:text-emerald-400 font-medium">تم تحقيق الهدف</span>
                        ) : (
                          <>
                            المتبقي:{' '}
                            <AmountText
                              amount={remaining}
                              currency={goal.currency}
                              className="text-[#0B1526] dark:text-slate-100 font-medium"
                            />
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {goal.notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{goal.notes}</p>
                  )}
                </div>

                <div className="pt-4 border-t border-[#EEF1F6] dark:border-[#1B2B46] flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    الادخار الشهري المخطط:{' '}
                    <AmountText
                      amount={goal.monthlyContribution}
                      currency={goal.currency}
                      className="text-[#0B1526] dark:text-slate-100 font-medium"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDepositGoal(goal);
                      setDepositAmount(
                        goal.monthlyContribution > 0 ? String(goal.monthlyContribution) : ''
                      );
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#F8F2E2] dark:bg-[#231E12] text-[#7A5E1E] dark:text-[#DDBB6A] hover:bg-[#EFE2C0] dark:hover:bg-[#312917] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <PlusCircle className="w-4 h-4" />
                    إضافة دفعة ادخار
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add / Edit Goal Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'تعديل الهدف المالي' : 'إضافة هدف مالي جديد'}
        subtitle="حدد المبلغ المستهدف والادخار الشهري المخطط لمتابعة إنجازك"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-xs text-[#B91C1C] dark:text-red-300">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="goal-title" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              عنوان الهدف
            </label>
            <input
              id="goal-title"
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="مثال: صندوق الطوارئ أو شراء عقار"
              className="saas-input px-3.5 py-2.5 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="goal-cat" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                التصنيف
              </label>
              <input
                id="goal-cat"
                type="text"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="أمان مالي / عقار / تعليم"
                className="saas-input px-3.5 py-2.5 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div>
              <label htmlFor="goal-date" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                التاريخ المستهدف
              </label>
              <input
                id="goal-date"
                type="date"
                required
                value={form.targetDate}
                onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
                className="saas-input px-3.5 py-2.5 text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="goal-target" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                المبلغ المستهدف
              </label>
              <input
                id="goal-target"
                type="number"
                step="any"
                min="0"
                required
                value={form.targetAmount}
                onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))}
                className="saas-input px-3.5 py-2.5 text-sm font-mono tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="goal-cur-amt" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                المدّخر حالياً
              </label>
              <input
                id="goal-cur-amt"
                type="number"
                step="any"
                min="0"
                value={form.currentAmount}
                onChange={(e) => setForm((f) => ({ ...f, currentAmount: e.target.value }))}
                className="saas-input px-3.5 py-2.5 text-sm font-mono tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="goal-cur" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                العملة
              </label>
              <select
                id="goal-cur"
                value={form.currency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currency: e.target.value as Currency }))
                }
                className="saas-input px-3.5 py-2.5 text-sm"
              >
                <option value="IQD">دينار عراقي</option>
                <option value="USD">دولار أمريكي</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="goal-monthly" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              الادخار الشهري المخطط
            </label>
            <input
              id="goal-monthly"
              type="number"
              step="any"
              min="0"
              value={form.monthlyContribution}
              onChange={(e) => setForm((f) => ({ ...f, monthlyContribution: e.target.value }))}
              className="saas-input px-3.5 py-2.5 text-sm font-mono tabular-nums"
            />
          </div>

          <div>
            <label htmlFor="goal-notes" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              ملاحظات (اختياري)
            </label>
            <textarea
              id="goal-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="saas-input px-3.5 py-2 text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EEF1F6] dark:border-[#1B2B46]">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#0B1526] dark:hover:text-white cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526] text-sm font-semibold hover:bg-[#162744] dark:hover:bg-[#DDBB6A] cursor-pointer"
            >
              {editingId ? 'حفظ التعديلات' : 'إنشاء الهدف'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Deposit Modal */}
      <Modal
        open={Boolean(depositGoal)}
        onClose={() => setDepositGoal(null)}
        title="إضافة دفعة ادخار"
        subtitle={depositGoal ? depositGoal.title : undefined}
      >
        {depositGoal && (
          <form onSubmit={handleDepositSubmit} className="space-y-4">
            <div className="saas-subcard p-3.5 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
              <span>الرصيد المدّخر حالياً:</span>
              <AmountText
                amount={depositGoal.currentAmount}
                currency={depositGoal.currency}
                className="font-semibold text-[#0B1526] dark:text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="deposit-amt" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                مبلغ الدفعة ({CURRENCY_SHORT_LABELS[depositGoal.currency]})
              </label>
              <input
                id="deposit-amt"
                type="number"
                step="any"
                min="1"
                required
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="saas-input px-3.5 py-2.5 text-sm font-mono tabular-nums"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EEF1F6] dark:border-[#1B2B46]">
              <button
                type="button"
                onClick={() => setDepositGoal(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#0B1526] dark:hover:text-white cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-[#C8A24A] text-[#0B1526] text-sm font-semibold hover:bg-[#DDBB6A] cursor-pointer"
              >
                تأكيد الإيداع
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
