import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Pencil,
  PieChart as PieChartIcon,
  Plus,
  Receipt,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import {
  CategoryBudgetConfig,
  Currency,
  ExpenseCategory,
  ExpenseRecord,
  PendingModalAction,
  WealthSettings,
  WealthState,
} from '../types/wealth';
import {
  CHART_COLORS,
  CHART_COLORS_DARK,
  CURRENCY_SHORT_LABELS,
  EXPENSE_CATEGORY_LABELS,
  PAYMENT_METHODS,
  formatArabicMonthKey,
} from '../data/labels';
import {
  buildExpenseBreakdown,
  convertCurrency,
  formatMoney,
  generateId,
} from '../utils/finance';
import { evaluateCategoryBudgets } from '../utils/alerts';
import { AmountText } from './AmountText';
import { CategoryIcon } from './CategoryIcon';
import { EmptyState } from './EmptyState';
import { Modal } from './Modal';

interface ExpensesViewProps {
  state: WealthState;
  expenses: ExpenseRecord[];
  settings: WealthSettings;
  referenceMonthKey: string;
  isDark?: boolean;
  onAdd: (record: ExpenseRecord) => void;
  onUpdate: (record: ExpenseRecord) => void;
  onDelete: (id: string) => void;
  onSaveCategoryBudget: (category: ExpenseCategory, config: CategoryBudgetConfig) => void;
  pendingAction?: PendingModalAction;
  onActionHandled?: () => void;
}

const EMPTY_FORM = {
  title: '',
  category: 'food' as ExpenseCategory,
  amount: '',
  currency: 'IQD' as Currency,
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: PAYMENT_METHODS[0],
  notes: '',
};

const EXPENSE_CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[];

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  state,
  expenses,
  settings,
  referenceMonthKey,
  isDark = false,
  onAdd,
  onUpdate,
  onDelete,
  onSaveCategoryBudget,
  pendingAction,
  onActionHandled,
}) => {
  const chartColors = isDark ? CHART_COLORS_DARK : CHART_COLORS;
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const [budgetMonth, setBudgetMonth] = useState(referenceMonthKey);
  const [showAllBudgetCategories, setShowAllBudgetCategories] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    category: 'food' as ExpenseCategory,
    monthlyLimit: '',
    currency: settings.displayCurrency as Currency,
    enabled: true,
  });
  const [budgetError, setBudgetError] = useState('');

  const { displayCurrency, exchangeRateIQDPerUSD } = settings;

  const openCreateModal = React.useCallback(
    (defaultCategory?: ExpenseCategory) => {
      setEditingId(null);
      setForm({
        ...EMPTY_FORM,
        category:
          defaultCategory ?? (categoryFilter === 'all' ? 'food' : categoryFilter),
        currency: displayCurrency,
        date: new Date().toISOString().slice(0, 10),
      });
      setError('');
      setModalOpen(true);
    },
    [categoryFilter, displayCurrency]
  );

  const openEditModal = React.useCallback((record: ExpenseRecord) => {
    setEditingId(record.id);
    setForm({
      title: record.title,
      category: record.category,
      amount: String(record.amount),
      currency: record.currency,
      date: record.date,
      paymentMethod: record.paymentMethod,
      notes: record.notes ?? '',
    });
    setError('');
    setModalOpen(true);
  }, []);

  React.useEffect(() => {
    if (!pendingAction || pendingAction.section !== 'expenses') return;

    if (pendingAction.mode === 'create') {
      openCreateModal(pendingAction.category);
    } else if (pendingAction.mode === 'edit') {
      const target = expenses.find((e) => e.id === pendingAction.recordId);
      if (target) {
        openEditModal(target);
      }
    }
    onActionHandled?.();
  }, [pendingAction, expenses, openCreateModal, openEditModal, onActionHandled]);

  const filtered = useMemo(() => {
    return expenses
      .filter((item) => {
        if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.paymentMethod.toLowerCase().includes(q) ||
          EXPENSE_CATEGORY_LABELS[item.category].toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, categoryFilter, search]);

  const totalDisplayed = useMemo(
    () =>
      filtered.reduce(
        (sum, item) =>
          sum +
          convertCurrency(
            item.amount,
            item.currency,
            displayCurrency,
            exchangeRateIQDPerUSD
          ),
        0
      ),
    [filtered, displayCurrency, exchangeRateIQDPerUSD]
  );

  const categoryTotals = useMemo(() => {
    const map: Record<ExpenseCategory, { total: number; count: number }> = {
      housing: { total: 0, count: 0 },
      food: { total: 0, count: 0 },
      transport: { total: 0, count: 0 },
      utilities: { total: 0, count: 0 },
      health: { total: 0, count: 0 },
      education: { total: 0, count: 0 },
      family: { total: 0, count: 0 },
      lifestyle: { total: 0, count: 0 },
      other: { total: 0, count: 0 },
    };
    for (const item of expenses) {
      map[item.category].count += 1;
      map[item.category].total += convertCurrency(
        item.amount,
        item.currency,
        displayCurrency,
        exchangeRateIQDPerUSD
      );
    }
    return map;
  }, [expenses, displayCurrency, exchangeRateIQDPerUSD]);

  const breakdown = useMemo(() => buildExpenseBreakdown(state), [state]);
  const topCategory = breakdown[0];

  const monthOptions = useMemo(() => {
    const keys = new Set<string>([referenceMonthKey]);
    const [refY, refM] = referenceMonthKey.split('-').map(Number);
    for (let offset = -6; offset <= 3; offset++) {
      const d = new Date(Date.UTC(refY || 2026, (refM || 1) - 1 + offset, 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      keys.add(key);
    }
    for (const exp of expenses) {
      if (exp.date.length >= 7) {
        keys.add(exp.date.slice(0, 7));
      }
    }
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [referenceMonthKey, expenses]);

  const budgetStatuses = useMemo(
    () => evaluateCategoryBudgets(state, budgetMonth),
    [state, budgetMonth]
  );
  const exceededBudgets = budgetStatuses.filter((b) => b.status === 'exceeded');
  const warningBudgets = budgetStatuses.filter((b) => b.status === 'warning');
  const displayedBudgetCards = showAllBudgetCategories
    ? budgetStatuses
    : budgetStatuses.filter((b) => b.enabled || b.spentInDisplay > 0);

  const openBudgetModal = (category: ExpenseCategory) => {
    const existing = state.categoryBudgets[category];
    setBudgetForm({
      category,
      monthlyLimit: existing && existing.monthlyLimit > 0 ? String(existing.monthlyLimit) : '',
      currency: existing?.currency ?? displayCurrency,
      enabled: existing ? existing.enabled : true,
    });
    setBudgetError('');
    setBudgetModalOpen(true);
  };

  const handleBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const limit = Number(budgetForm.monthlyLimit || 0);
    if (budgetForm.enabled && (!Number.isFinite(limit) || limit <= 0)) {
      setBudgetError('يرجى إدخال سقف شهري صحيح أكبر من صفر.');
      return;
    }
    onSaveCategoryBudget(budgetForm.category, {
      monthlyLimit: budgetForm.enabled ? limit : 0,
      currency: budgetForm.currency,
      enabled: budgetForm.enabled,
    });
    setBudgetModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(form.amount);
    if (!form.title.trim()) {
      setError('يرجى إدخال وصف المصروف.');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('يرجى إدخال مبلغ صحيح أكبر من صفر.');
      return;
    }
    if (!form.date) {
      setError('يرجى تحديد التاريخ.');
      return;
    }

    const payload: ExpenseRecord = {
      id: editingId ?? generateId('exp'),
      title: form.title.trim(),
      category: form.category,
      amount: numericAmount,
      currency: form.currency,
      date: form.date,
      paymentMethod: form.paymentMethod,
      notes: form.notes.trim() || undefined,
    };

    if (editingId) {
      onUpdate(payload);
    } else {
      onAdd(payload);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B1526] dark:text-slate-100">إدارة المصروفات والتصنيفات</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            تتبع النفقات اليومية والشهرية، وتعيين سقف ميزانية شهري لكل فئة مع تنبيهات التجاوز
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => openBudgetModal('food')}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-white dark:bg-[#132038] border border-[#D4DAE6] dark:border-[#283B5E] text-[#0B1526] dark:text-slate-100 text-sm font-medium hover:bg-slate-50 dark:hover:bg-[#1A2B4A] transition-colors cursor-pointer whitespace-nowrap"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#9E7B2C] dark:text-[#DDBB6A]" />
            تعيين سقف ميزانية
          </button>
          <button
            type="button"
            onClick={() => openCreateModal()}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-[#0B1526] dark:bg-[#1B3154] text-white dark:border dark:border-[#2E4B7A] text-sm font-semibold hover:bg-[#162744] dark:hover:bg-[#233F6B] transition-colors shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-[#DDBB6A]" />
            تسجيل مصروف جديد
          </button>
        </div>
      </div>

      {/* Budget Overrun Alert Banner */}
      {exceededBudgets.length > 0 && (
        <div
          role="alert"
          data-testid="budget-overrun-banner"
          className="rounded-xl bg-red-50 dark:bg-red-950/35 border border-red-200 dark:border-red-900/60 px-5 py-4 flex items-start gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-[#B91C1C] dark:text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="font-bold text-[#B91C1C] dark:text-red-400 text-sm">
              تنبيه تجاوز سقف الميزانية الشهرية ({exceededBudgets.length} {exceededBudgets.length === 1 ? 'فئة' : 'فئات'})
            </div>
            <p className="text-red-900/80 dark:text-red-200/85 leading-relaxed">
              تجاوزت المصروفات خلال شهر{' '}
              <span className="font-semibold">{formatArabicMonthKey(budgetMonth)}</span>{' '}
              الحد المحدد في:{' '}
              {exceededBudgets
                .map((b) => `${b.label} (${b.utilizationPct.toFixed(0)}%)`)
                .join('، ')}
              .
            </p>
          </div>
        </div>
      )}

      {exceededBudgets.length === 0 && warningBudgets.length > 0 && (
        <div
          role="status"
          className="rounded-xl bg-[#F8F2E2] dark:bg-[#231C0D] border border-[#E7D8B1] dark:border-[#5C471D] px-5 py-3.5 flex items-start gap-3 text-xs text-[#6B531B] dark:text-amber-200"
        >
          <AlertTriangle className="w-4 h-4 text-[#9E7B2C] dark:text-[#DDBB6A] shrink-0 mt-0.5" />
          <span>
            اقتربت من الحد الشهري (85% فأكثر) في:{' '}
            {warningBudgets.map((b) => `${b.label} (${b.utilizationPct.toFixed(0)}%)`).join('، ')}.
          </span>
        </div>
      )}

      {/* Top Row: KPIs + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
          <div className="saas-card p-5 transition-colors hover:border-[#C8A24A]/50">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">إجمالي المصروفات (حسب التصفية)</span>
              <span className="w-8 h-8 rounded-lg bg-[#F8F2E2] dark:bg-[#231C0D] text-[#9E7B2C] dark:text-[#DDBB6A] flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 text-2xl font-bold text-[#0B1526] dark:text-slate-100">
              <AmountText amount={totalDisplayed} currency={displayCurrency} />
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono tabular-nums font-medium text-[#0B1526] dark:text-slate-200">{filtered.length}</span> عملية مسجلة
            </div>
          </div>

          <div className="saas-card p-5 transition-colors hover:border-[#C8A24A]/50">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">أعلى فئة إنفاق</span>
              <span className="w-8 h-8 rounded-lg bg-[#F4F6FA] dark:bg-[#132038] text-[#0B1526] dark:text-[#DDBB6A] flex items-center justify-center shrink-0">
                <Award className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 text-lg font-bold text-[#0B1526] dark:text-slate-100">
              {topCategory ? topCategory.name : '—'}
            </div>
            {topCategory && (
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                <AmountText amount={topCategory.value} currency={displayCurrency} /> ·{' '}
                <span className="font-mono tabular-nums text-[#9E7B2C] dark:text-[#DDBB6A] font-semibold">
                  {topCategory.percentage.toFixed(1)}%
                </span>{' '}
                من الإجمالي
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 saas-card p-5">
          <div className="text-sm font-bold text-[#0B1526] dark:text-slate-100 mb-3">
            توزيع المصروفات حسب الفئة
          </div>
          {breakdown.length === 0 ? (
            <EmptyState
              compact
              icon={<PieChartIcon className="w-5 h-5" />}
              title="لا توجد مصروفات لعرض التوزيع"
              description="سجّل أول مصروف لتظهر نسب الإنفاق لكل فئة هنا"
              actionLabel="تسجيل مصروف"
              onAction={() => openCreateModal()}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="h-[180px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={breakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={74}
                      paddingAngle={2}
                      isAnimationActive={false}
                    >
                      {breakdown.map((slice, idx) => (
                        <Cell
                          key={slice.key}
                          fill={chartColors[idx % chartColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown) => [
                        formatMoney(Number(val ?? 0), displayCurrency),
                        'المبلغ',
                      ]}
                      contentStyle={{
                        backgroundColor: '#0B1526',
                        border: '1px solid #1E3256',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                        direction: 'rtl',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 max-h-[180px] overflow-y-auto">
                {breakdown.map((slice, idx) => (
                  <div
                    key={slice.key}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{
                          backgroundColor: chartColors[idx % chartColors.length],
                        }}
                      />
                      <span className="text-slate-700 dark:text-slate-300 truncate">{slice.name}</span>
                    </div>
                    <span className="font-mono tabular-nums text-[#0B1526] dark:text-slate-100 font-medium shrink-0">
                      {slice.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Money By Expense Category */}
      <section className="saas-card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#0B1526] dark:text-slate-100">إضافة مال حسب فئة المصروفات</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            اضغط على أيقونة (+) بجانب أي فئة لتسجيل مبلغ صرف ضمنها مباشرة
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {EXPENSE_CATEGORIES.map((cat) => {
            const stat = categoryTotals[cat];
            const isSelected = categoryFilter === cat;
            return (
              <div
                key={cat}
                className={`rounded-xl border p-3.5 flex items-center justify-between gap-3 transition-all ${
                  isSelected
                    ? 'border-[#C8A24A] bg-[#F8F2E2]/50 dark:bg-[#231E12]/60 shadow-2xs'
                    : 'border-[#EEF2F7] dark:border-[#172640] bg-[#F8FAFC] dark:bg-[#111E35] hover:bg-white dark:hover:bg-[#162744] hover:border-[#C8A24A]/60'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setCategoryFilter(isSelected ? 'all' : cat)}
                  className="flex items-center gap-3 min-w-0 flex-1 text-right cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#0B1526] dark:bg-[#1A2B4A] text-[#DDBB6A] flex items-center justify-center shrink-0">
                    <CategoryIcon kind="expense" category={cat} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#0B1526] dark:text-slate-100 truncate">
                      {EXPENSE_CATEGORY_LABELS[cat]}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <AmountText
                        amount={stat.total}
                        currency={displayCurrency}
                        className="font-semibold text-slate-700 dark:text-slate-200"
                      />{' '}
                      · <span className="font-mono tabular-nums">{stat.count}</span>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => openCreateModal(cat)}
                  aria-label={`إضافة مال لفئة ${EXPENSE_CATEGORY_LABELS[cat]}`}
                  title={`إضافة مال لفئة ${EXPENSE_CATEGORY_LABELS[cat]}`}
                  className="w-9 h-9 rounded-lg bg-[#C8A24A] text-[#0B1526] hover:bg-[#DDBB6A] flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Monthly Category Budgets Panel */}
      <section className="saas-card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#0B1526] dark:text-slate-100">
              سقوف الميزانية الشهرية حسب الفئة
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              راقب استهلاك كل فئة مقارنةً بالحد الشهري المحدد للشهر المختار
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <label htmlFor="budget-month-picker" className="text-xs text-slate-500 dark:text-slate-400">
              الشهر:
            </label>
            <select
              id="budget-month-picker"
              value={budgetMonth}
              onChange={(e) => setBudgetMonth(e.target.value || referenceMonthKey)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-[#FAFBFD] dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 focus:outline-none focus:border-[#C8A24A]"
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {formatArabicMonthKey(m)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowAllBudgetCategories((v) => !v)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-[#132038] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#1B2D4D] cursor-pointer whitespace-nowrap"
            >
              {showAllBudgetCategories ? 'عرض الفئات المفعّلة فقط' : 'عرض جميع الفئات (9)'}
            </button>
          </div>
        </div>

        {displayedBudgetCards.length === 0 ? (
          <div className="saas-subcard py-8 px-4 text-center space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              لم تقم بتعيين سقوف ميزانية شهرية بعد. حدد سقفاً لأي فئة لتلقي تنبيهات التجاوز تلقائياً.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => openBudgetModal('food')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B1526] dark:bg-[#1B3154] dark:border dark:border-[#2E4B7A] text-white text-xs font-semibold hover:bg-[#162744] dark:hover:bg-[#233F6B] cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#DDBB6A]" />
                تعيين أول سقف ميزانية
              </button>
              <button
                type="button"
                onClick={() => setShowAllBudgetCategories(true)}
                className="px-4 py-2 rounded-lg bg-white dark:bg-[#0D172A] border border-[#D4DAE6] dark:border-[#283B5E] text-xs font-medium text-[#0B1526] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-[#1A2B4A] cursor-pointer"
              >
                استعراض جميع الفئات
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayedBudgetCards.map((b) => {
              const barPct = Math.min(100, b.utilizationPct);
              const barColor =
                b.status === 'exceeded'
                  ? 'bg-[#B91C1C] dark:bg-red-500'
                  : b.status === 'warning'
                  ? 'bg-[#D97706] dark:bg-amber-400'
                  : 'bg-[#0B1526] dark:bg-[#C8A24A]';
              const statusText =
                b.status === 'exceeded'
                  ? `تجاوز الحد بـ ${formatMoney(b.overageInDisplay, displayCurrency)}`
                  : b.status === 'warning'
                  ? 'اقترب من السقف'
                  : b.status === 'ok'
                  ? 'ضمن الميزانية'
                  : 'بدون سقف محدد';
              const statusColor =
                b.status === 'exceeded'
                  ? 'text-[#B91C1C] dark:text-red-400 font-semibold'
                  : b.status === 'warning'
                  ? 'text-[#B45309] dark:text-amber-300 font-semibold'
                  : b.status === 'ok'
                  ? 'text-[#15803D] dark:text-emerald-400'
                  : 'text-slate-400 dark:text-slate-500';

              return (
                <div
                  key={b.category}
                  className={`rounded-xl border p-4 space-y-3 ${
                    b.status === 'exceeded'
                      ? 'border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/25'
                      : 'border-[#E4E8F0] dark:border-[#1E2E4A] bg-[#FAFBFD] dark:bg-[#132038]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-[#0B1526] dark:text-slate-100">{b.label}</div>
                      <div className={`text-xs mt-0.5 ${statusColor}`}>{statusText}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openCreateModal(b.category)}
                        aria-label={`إضافة مصروف لفئة ${b.label}`}
                        title={`إضافة مال لفئة ${b.label}`}
                        className="w-7 h-7 rounded-md bg-[#C8A24A] text-[#0B1526] hover:bg-[#DDBB6A] flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openBudgetModal(b.category)}
                        aria-label={`تعديل سقف ميزانية ${b.label}`}
                        className="text-xs font-medium text-[#9E7B2C] dark:text-[#DDBB6A] hover:underline cursor-pointer"
                      >
                        {b.enabled ? 'تعديل السقف' : 'تعيين سقف'}
                      </button>
                    </div>
                  </div>

                  {b.enabled ? (
                    <>
                      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-[#1E2E4A] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-colors duration-150 ${barColor}`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                        <span>
                          المصروف:{' '}
                          <AmountText
                            amount={b.spentInDisplay}
                            currency={displayCurrency}
                            className="font-semibold text-[#0B1526] dark:text-slate-100"
                          />
                        </span>
                        <span>
                          السقف:{' '}
                          <AmountText
                            amount={b.monthlyLimitInDisplay}
                            currency={displayCurrency}
                          />
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                      المصروف هذا الشهر:{' '}
                      <AmountText
                        amount={b.spentInDisplay}
                        currency={displayCurrency}
                        className="font-semibold text-[#0B1526] dark:text-slate-100"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Filter & Table */}
      <div className="saas-card overflow-hidden">
        <div className="p-4 border-b border-[#EEF1F6] dark:border-[#1B2B46] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالوصف أو طريقة الدفع..."
              aria-label="بحث في المصروفات"
              className="saas-input pr-10 pl-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526]'
                  : 'bg-[#F1F5F9] dark:bg-[#132038] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1B2D4D]'
              }`}
            >
              الكل
            </button>
            {EXPENSE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526]'
                    : 'bg-[#F1F5F9] dark:bg-[#132038] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1B2D4D]'
                }`}
              >
                {EXPENSE_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-5 h-5" />}
            title="لا توجد مصروفات مطابقة للتصفية الحالية"
            description="سجّل مصروفاً جديداً أو اختر فئة أخرى لعرض السجلات"
            actionLabel="تسجيل مصروف"
            onAction={() => openCreateModal()}
          />
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-[#EEF1F6] dark:divide-[#1B2B46]">
              {filtered.map((item) => {
                const converted = convertCurrency(
                  item.amount,
                  item.currency,
                  displayCurrency,
                  exchangeRateIQDPerUSD
                );
                return (
                  <div key={item.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-[#0B1526] dark:text-slate-100">
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {EXPENSE_CATEGORY_LABELS[item.category]} · {item.paymentMethod}
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <div className="text-sm font-bold text-[#0B1526] dark:text-slate-100">
                          <AmountText amount={converted} currency={displayCurrency} />
                        </div>
                        {item.currency !== displayCurrency && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">
                            <AmountText amount={item.amount} currency={item.currency} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span dir="ltr" className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {item.date}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          aria-label={`تعديل المصروف ${item.title}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#132038] text-xs font-medium text-[#0B1526] dark:text-slate-100 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(item.id)}
                          aria-label={`حذف المصروف ${item.title}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/50 text-xs font-medium text-[#B91C1C] dark:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          حذف
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
                    <th className="py-3 px-4">الوصف</th>
                    <th className="py-3 px-4">التصنيف</th>
                    <th className="py-3 px-4">طريقة الدفع</th>
                    <th className="py-3 px-4">التاريخ</th>
                    <th className="py-3 px-4">
                      القيمة ({CURRENCY_SHORT_LABELS[displayCurrency]})
                    </th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF1F6] dark:divide-[#1B2B46] text-sm">
                  {filtered.map((item) => {
                    const converted = convertCurrency(
                      item.amount,
                      item.currency,
                      displayCurrency,
                      exchangeRateIQDPerUSD
                    );
                    return (
                      <tr key={item.id} className="hover:bg-[#FAFBFD] dark:hover:bg-[#13223C] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-[#0B1526] dark:text-slate-100">{item.title}</div>
                          {item.notes && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.notes}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {EXPENSE_CATEGORY_LABELS[item.category]}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {item.paymentMethod}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          <span dir="ltr" className="font-mono tabular-nums">
                            {item.date}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-[#0B1526] dark:text-slate-100 whitespace-nowrap">
                          <AmountText amount={converted} currency={displayCurrency} />
                          {item.currency !== displayCurrency && (
                            <div className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                              <AmountText amount={item.amount} currency={item.currency} />
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              aria-label={`تعديل المصروف ${item.title}`}
                              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#0B1526] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2B4A] transition-colors cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(item.id)}
                              aria-label={`حذف المصروف ${item.title}`}
                              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#B91C1C] dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
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
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'تعديل سجل المصروف' : 'تسجيل مصروف جديد'}
        subtitle="تُحدَّث الرسوم البيانية ومعدل الادخار تلقائياً عند الحفظ"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-xs text-[#B91C1C] dark:text-red-300">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="exp-title" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              وصف المصروف
            </label>
            <input
              id="exp-title"
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="مثال: فاتورة الكهرباء أو مشتريات منزلية"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#C8A24A]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="exp-category" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                التصنيف
              </label>
              <select
                id="exp-category"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value as ExpenseCategory }))
                }
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 focus:outline-none focus:border-[#C8A24A]"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {EXPENSE_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="exp-method" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                طريقة الدفع
              </label>
              <select
                id="exp-method"
                value={form.paymentMethod}
                onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 focus:outline-none focus:border-[#C8A24A]"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="exp-amount" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                المبلغ
              </label>
              <input
                id="exp-amount"
                type="number"
                step="any"
                min="0"
                required
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0"
                className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#C8A24A]"
              />
            </div>

            <div>
              <label htmlFor="exp-currency" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                العملة
              </label>
              <select
                id="exp-currency"
                value={form.currency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currency: e.target.value as Currency }))
                }
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 focus:outline-none focus:border-[#C8A24A]"
              >
                <option value="IQD">دينار عراقي</option>
                <option value="USD">دولار أمريكي</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="exp-date" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              التاريخ
            </label>
            <input
              id="exp-date"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 focus:outline-none focus:border-[#C8A24A]"
            />
          </div>

          <div>
            <label htmlFor="exp-notes" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              ملاحظات (اختياري)
            </label>
            <textarea
              id="exp-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#C8A24A]"
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
              className="px-5 py-2.5 rounded-lg bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526] text-sm font-semibold hover:bg-[#162744] dark:hover:bg-[#DDBB6A] transition-colors cursor-pointer"
            >
              {editingId ? 'حفظ التعديلات' : 'حفظ المصروف'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Monthly Category Budget Modal */}
      <Modal
        open={budgetModalOpen}
        onClose={() => setBudgetModalOpen(false)}
        title="تعيين سقف الميزانية الشهري"
        subtitle="سيتم تنبيهك فور تجاوز مصروفات هذه الفئة للحد المحدد"
      >
        <form onSubmit={handleBudgetSubmit} className="space-y-4">
          {budgetError && (
            <div role="alert" className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-xs text-[#B91C1C] dark:text-red-300">
              {budgetError}
            </div>
          )}

          <div>
            <label htmlFor="budget-cat" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              فئة المصروف
            </label>
            <select
              id="budget-cat"
              value={budgetForm.category}
              onChange={(e) => {
                const cat = e.target.value as ExpenseCategory;
                const existing = state.categoryBudgets[cat];
                setBudgetForm({
                  category: cat,
                  monthlyLimit:
                    existing && existing.monthlyLimit > 0 ? String(existing.monthlyLimit) : '',
                  currency: existing?.currency ?? displayCurrency,
                  enabled: existing ? existing.enabled : true,
                });
              }}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 focus:outline-none focus:border-[#C8A24A]"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {EXPENSE_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={budgetForm.enabled}
              onChange={(e) =>
                setBudgetForm((f) => ({ ...f, enabled: e.target.checked }))
              }
              className="w-4 h-4 accent-[#0B1526] dark:accent-[#C8A24A] rounded"
            />
            تفعيل سقف ميزانية لهذه الفئة
          </label>

          {budgetForm.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="budget-limit" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  السقف الشهري الأقصى
                </label>
                <input
                  id="budget-limit"
                  type="number"
                  step="any"
                  min="1"
                  required
                  value={budgetForm.monthlyLimit}
                  onChange={(e) =>
                    setBudgetForm((f) => ({ ...f, monthlyLimit: e.target.value }))
                  }
                  placeholder="مثال: 500000"
                  className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#C8A24A]"
                />
              </div>
              <div>
                <label htmlFor="budget-cur" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  العملة
                </label>
                <select
                  id="budget-cur"
                  value={budgetForm.currency}
                  onChange={(e) =>
                    setBudgetForm((f) => ({ ...f, currency: e.target.value as Currency }))
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 focus:outline-none focus:border-[#C8A24A]"
                >
                  <option value="IQD">دينار عراقي</option>
                  <option value="USD">دولار أمريكي</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EEF1F6] dark:border-[#1B2B46]">
            <button
              type="button"
              onClick={() => setBudgetModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#0B1526] dark:hover:text-white cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526] text-sm font-semibold hover:bg-[#162744] dark:hover:bg-[#DDBB6A] transition-colors cursor-pointer"
            >
              حفظ سقف الميزانية
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
