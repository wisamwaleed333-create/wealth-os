import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  ChevronLeft,
  CreditCard,
  Landmark,
  Pencil,
  PieChart as PieChartIcon,
  Plus,
  Receipt,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import {
  AssetCategory,
  ExpenseCategory,
  IncomeCategory,
  InvestmentCategory,
  LiabilityCategory,
  NavSection,
  PendingModalAction,
  SmartAlert,
  WealthState,
} from '../types/wealth';
import {
  buildExpenseBreakdown,
  buildIncomeBreakdown,
  buildMonthlyCashFlow,
  buildWealthComposition,
  calculateGoalProgress,
  calculateWealthSummary,
  convertCurrency,
  formatMoney,
} from '../utils/finance';
import {
  ASSET_CATEGORY_LABELS,
  CHART_COLORS,
  CHART_COLORS_DARK,
  CURRENCY_LABELS,
  EXPENSE_CATEGORY_LABELS,
  INCOME_CATEGORY_LABELS,
  INVESTMENT_CATEGORY_LABELS,
  LIABILITY_CATEGORY_LABELS,
} from '../data/labels';
import { AmountText } from './AmountText';
import { CategoryIcon } from './CategoryIcon';
import { EmptyState } from './EmptyState';

interface DashboardViewProps {
  state: WealthState;
  alerts: SmartAlert[];
  isDark?: boolean;
  onNavigate: (section: NavSection) => void;
  onOpenNotifications: () => void;
  onQuickAddIncome: () => void;
  onQuickAddExpense: () => void;
  onTriggerAction: (action: Exclude<PendingModalAction, null>) => void;
  onDeleteTransaction: (type: 'income' | 'expense', id: string) => void;
}

type CategoryTab = 'income' | 'expense' | 'asset' | 'investment' | 'liability';

const CATEGORY_TABS: { id: CategoryTab; label: string }[] = [
  { id: 'income', label: 'فئات الدخل' },
  { id: 'expense', label: 'فئات المصروفات' },
  { id: 'asset', label: 'فئات الأصول' },
  { id: 'investment', label: 'فئات الاستثمارات' },
  { id: 'liability', label: 'فئات الالتزامات' },
];

const INCOME_CHART_COLORS = [
  '#15803D', // Emerald
  '#0B1526', // Deep Navy
  '#C8A24A', // Champagne Gold
  '#0F766E', // Deep Teal
  '#234375', // Slate Navy
  '#7A5E1E', // Antique Gold
];

const INCOME_CHART_COLORS_DARK = [
  '#22C55E', // Emerald
  '#4F7AC7', // Luminous Slate Blue
  '#DDBB6A', // Warm Champagne Gold
  '#14B8A6', // Bright Teal
  '#60A5FA', // Soft Sky Blue
  '#B8923A', // Warm Gold
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  state,
  alerts,
  isDark = false,
  onNavigate,
  onOpenNotifications,
  onQuickAddIncome,
  onQuickAddExpense,
  onTriggerAction,
  onDeleteTransaction,
}) => {
  const chartColors = isDark ? CHART_COLORS_DARK : CHART_COLORS;
  const incomeColors = isDark ? INCOME_CHART_COLORS_DARK : INCOME_CHART_COLORS;
  const { displayCurrency, exchangeRateIQDPerUSD } = state.settings;
  const summary = calculateWealthSummary(state);
  const monthlyCashFlow = buildMonthlyCashFlow(state);
  const wealthComposition = buildWealthComposition(state);
  const incomeBreakdown = useMemo(() => buildIncomeBreakdown(state), [state]);
  const expenseBreakdown = useMemo(() => buildExpenseBreakdown(state), [state]);

  const [categoryTab, setCategoryTab] = useState<CategoryTab>('income');
  const [showAllRecent, setShowAllRecent] = useState(false);

  const allTransactions = useMemo(
    () =>
      [
        ...state.incomes.map((inc) => ({
          id: inc.id,
          type: 'income' as const,
          title: inc.title,
          categoryLabel: INCOME_CATEGORY_LABELS[inc.category],
          date: inc.date,
          amount: convertCurrency(
            inc.amount,
            inc.currency,
            displayCurrency,
            exchangeRateIQDPerUSD
          ),
          originalAmount: inc.amount,
          originalCurrency: inc.currency,
        })),
        ...state.expenses.map((exp) => ({
          id: exp.id,
          type: 'expense' as const,
          title: exp.title,
          categoryLabel: EXPENSE_CATEGORY_LABELS[exp.category],
          date: exp.date,
          amount: convertCurrency(
            exp.amount,
            exp.currency,
            displayCurrency,
            exchangeRateIQDPerUSD
          ),
          originalAmount: exp.amount,
          originalCurrency: exp.currency,
        })),
      ].sort((a, b) => b.date.localeCompare(a.date)),
    [state.incomes, state.expenses, displayCurrency, exchangeRateIQDPerUSD]
  );

  const recentTransactions = showAllRecent
    ? allTransactions
    : allTransactions.slice(0, 8);

  const categoryCards = useMemo(() => {
    if (categoryTab === 'income') {
      return (Object.keys(INCOME_CATEGORY_LABELS) as IncomeCategory[]).map((cat) => {
        const items = state.incomes.filter((i) => i.category === cat);
        const total = items.reduce(
          (sum, item) =>
            sum + convertCurrency(item.amount, item.currency, displayCurrency, exchangeRateIQDPerUSD),
          0
        );
        return {
          key: cat,
          kind: 'income' as const,
          label: INCOME_CATEGORY_LABELS[cat],
          total,
          count: items.length,
          onAdd: () =>
            onTriggerAction({ section: 'income', mode: 'create', category: cat }),
        };
      });
    }

    if (categoryTab === 'expense') {
      return (Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => {
        const items = state.expenses.filter((e) => e.category === cat);
        const total = items.reduce(
          (sum, item) =>
            sum + convertCurrency(item.amount, item.currency, displayCurrency, exchangeRateIQDPerUSD),
          0
        );
        return {
          key: cat,
          kind: 'expense' as const,
          label: EXPENSE_CATEGORY_LABELS[cat],
          total,
          count: items.length,
          onAdd: () =>
            onTriggerAction({ section: 'expenses', mode: 'create', category: cat }),
        };
      });
    }

    if (categoryTab === 'asset') {
      return (Object.keys(ASSET_CATEGORY_LABELS) as AssetCategory[]).map((cat) => {
        const items = state.assets.filter((a) => a.category === cat);
        const total = items.reduce(
          (sum, item) =>
            sum + convertCurrency(item.value, item.currency, displayCurrency, exchangeRateIQDPerUSD),
          0
        );
        return {
          key: cat,
          kind: 'asset' as const,
          label: ASSET_CATEGORY_LABELS[cat],
          total,
          count: items.length,
          onAdd: () =>
            onTriggerAction({
              section: 'assets',
              mode: 'create',
              tab: 'assets',
              category: cat,
            }),
        };
      });
    }

    if (categoryTab === 'investment') {
      return (Object.keys(INVESTMENT_CATEGORY_LABELS) as InvestmentCategory[]).map((cat) => {
        const items = state.investments.filter((inv) => inv.category === cat);
        const total = items.reduce(
          (sum, item) =>
            sum +
            convertCurrency(
              item.currentValue,
              item.currency,
              displayCurrency,
              exchangeRateIQDPerUSD
            ),
          0
        );
        return {
          key: cat,
          kind: 'investment' as const,
          label: INVESTMENT_CATEGORY_LABELS[cat],
          total,
          count: items.length,
          onAdd: () =>
            onTriggerAction({ section: 'investments', mode: 'create', category: cat }),
        };
      });
    }

    return (Object.keys(LIABILITY_CATEGORY_LABELS) as LiabilityCategory[]).map((cat) => {
      const items = state.liabilities.filter((l) => l.category === cat);
      const total = items.reduce(
        (sum, item) =>
          sum +
          convertCurrency(
            item.remainingAmount,
            item.currency,
            displayCurrency,
            exchangeRateIQDPerUSD
          ),
        0
      );
      return {
        key: cat,
        kind: 'liability' as const,
        label: LIABILITY_CATEGORY_LABELS[cat],
        total,
        count: items.length,
        onAdd: () =>
          onTriggerAction({
            section: 'assets',
            mode: 'create',
            tab: 'liabilities',
            category: cat,
          }),
      };
    });
  }, [
    categoryTab,
    state.incomes,
    state.expenses,
    state.assets,
    state.investments,
    state.liabilities,
    displayCurrency,
    exchangeRateIQDPerUSD,
    onTriggerAction,
  ]);

  const topGoals = state.goals.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Executive Net Worth Hero Banner */}
      <section className="hero-wealth-surface rounded-2xl text-white p-6 md:p-8 border border-[#1E3256] shadow-lg">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="space-y-4 min-w-0">
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-[#DDBB6A] tracking-wide">
                صافي الثروة الإجمالي · يُحسب تلقائياً من الأصول والاستثمارات والالتزامات
              </div>
              <div
                data-testid="net-worth-value"
                className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-white leading-tight"
              >
                <AmountText amount={summary.netWorth} currency={displayCurrency} />
              </div>
            </div>

            <div className="grid grid-cols-3 sm:inline-grid w-full sm:w-auto gap-2 sm:gap-0 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 sm:px-4 sm:py-3 text-xs">
              <div className="pl-2 sm:pl-4 border-l border-white/10 min-w-0">
                <div className="text-[11px] text-slate-400 truncate">المعادل التقريبي</div>
                <div className="mt-0.5 font-semibold text-[#E6C97A] truncate">
                  <AmountText
                    amount={convertCurrency(
                      summary.netWorth,
                      displayCurrency,
                      displayCurrency === 'IQD' ? 'USD' : 'IQD',
                      exchangeRateIQDPerUSD
                    )}
                    currency={displayCurrency === 'IQD' ? 'USD' : 'IQD'}
                  />
                </div>
              </div>
              <div className="px-2 sm:px-4 border-l border-white/10 min-w-0">
                <div className="text-[11px] text-slate-400 truncate">نسبة السيولة</div>
                <div className="mt-0.5 font-mono tabular-nums font-semibold text-white">
                  {summary.totalAssets > 0
                    ? ((summary.totalLiquidAssets / summary.totalAssets) * 100).toFixed(1)
                    : '0.0'}
                  %
                </div>
              </div>
              <div className="pr-2 sm:pr-4 min-w-0">
                <div className="text-[11px] text-slate-400 truncate">معدل الادخار</div>
                <div className="mt-0.5 font-mono tabular-nums font-semibold text-emerald-400">
                  {summary.savingsRatePct.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onQuickAddIncome}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#C8A24A] text-[#0B1526] text-sm font-bold hover:bg-[#DDBB6A] transition-colors shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              تسجيل إيراد
            </button>
            <button
              type="button"
              onClick={onQuickAddExpense}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white/10 text-white border border-white/15 text-sm font-semibold hover:bg-white/15 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              تسجيل مصروف
            </button>
          </div>
        </div>
      </section>

      {/* Active Smart Alerts Strip */}
      {alerts.length > 0 && (
        <section
          aria-label="تنبيهات مالية نشطة"
          className="rounded-xl bg-[#F8F2E2] dark:bg-[#231C0D] border border-[#E7D8B1] dark:border-[#5C471D] px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#C8A24A]/20 text-[#9E7B2C] dark:text-[#DDBB6A] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="text-xs text-[#0B1526] dark:text-amber-100 leading-relaxed">
              <span className="font-bold">{alerts[0].title}:</span>{' '}
              <span className="text-slate-700 dark:text-amber-200/85">{alerts[0].message}</span>
              {alerts.length > 1 && (
                <span className="text-[#7A5E1E] dark:text-[#DDBB6A] font-semibold">
                  {' '}
                  (+{alerts.length - 1} تنبيهات أخرى)
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenNotifications}
            className="text-xs font-bold text-[#0B1526] dark:text-[#DDBB6A] hover:text-[#9E7B2C] dark:hover:text-amber-200 underline shrink-0 self-end sm:self-center cursor-pointer whitespace-nowrap"
          >
            عرض التنبيهات ({alerts.length})
          </button>
        </section>
      )}

      {/* 4 Primary KPI Cards */}
      <section aria-label="المؤشرات المالية الرئيسية" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="saas-card p-5 flex flex-col justify-between transition-colors hover:border-[#C8A24A]/50">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-[#F4F6FA] dark:bg-[#132038] text-[#0B1526] dark:text-[#DDBB6A] flex items-center justify-center shrink-0">
                <Landmark className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">إجمالي الأصول</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('assets')}
              className="text-xs font-medium text-[#9E7B2C] dark:text-[#DDBB6A] hover:underline cursor-pointer shrink-0"
            >
              التفاصيل
            </button>
          </div>
          <div className="mt-3.5 text-xl sm:text-[22px] font-bold text-[#0B1526] dark:text-slate-100">
            <AmountText amount={summary.totalAssets} currency={displayCurrency} />
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            شاملة المحفظة الاستثمارية (<AmountText amount={summary.totalInvestmentsValue} currency={displayCurrency} compact />)
          </div>
        </div>

        <div className="saas-card p-5 flex flex-col justify-between transition-colors hover:border-[#C8A24A]/50">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-[#B91C1C] dark:text-red-400 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">إجمالي الالتزامات</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('assets')}
              className="text-xs font-medium text-[#9E7B2C] dark:text-[#DDBB6A] hover:underline cursor-pointer shrink-0"
            >
              إدارة الديون
            </button>
          </div>
          <div className="mt-3.5 text-xl sm:text-[22px] font-bold text-[#B91C1C] dark:text-red-400">
            <AmountText amount={summary.totalLiabilities} currency={displayCurrency} />
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            نسبة الدين للأصول:{' '}
            <span className="font-mono tabular-nums text-[#0B1526] dark:text-slate-100 font-semibold">
              {summary.debtToAssetRatioPct.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="saas-card p-5 flex flex-col justify-between transition-colors hover:border-[#C8A24A]/50">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[#15803D] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">إجمالي الإيرادات المسجلة</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('income')}
              className="text-xs font-medium text-[#9E7B2C] dark:text-[#DDBB6A] hover:underline cursor-pointer shrink-0"
            >
              السجل
            </button>
          </div>
          <div className="mt-3.5 text-xl sm:text-[22px] font-bold text-[#15803D] dark:text-emerald-400">
            <AmountText amount={summary.totalIncome} currency={displayCurrency} />
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono tabular-nums font-medium text-[#0B1526] dark:text-slate-200">{state.incomes.length}</span> عملية دخل مسجلة
          </div>
        </div>

        <div className="saas-card p-5 flex flex-col justify-between transition-colors hover:border-[#C8A24A]/50">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-[#F8F2E2] dark:bg-[#231C0D] text-[#9E7B2C] dark:text-[#DDBB6A] flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">إجمالي المصروفات المسجلة</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('expenses')}
              className="text-xs font-medium text-[#9E7B2C] dark:text-[#DDBB6A] hover:underline cursor-pointer shrink-0"
            >
              السجل
            </button>
          </div>
          <div className="mt-3.5 text-xl sm:text-[22px] font-bold text-[#0B1526] dark:text-slate-100">
            <AmountText amount={summary.totalExpenses} currency={displayCurrency} />
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            صافي الفائض:{' '}
            <AmountText
              amount={summary.netCashFlow}
              currency={displayCurrency}
              compact
              showSign
              className={
                summary.netCashFlow >= 0
                  ? 'text-[#15803D] dark:text-emerald-400 font-semibold'
                  : 'text-[#B91C1C] dark:text-red-400 font-semibold'
              }
            />
          </div>
        </div>
      </section>

      {/* Quick Add Money By Category */}
      <section
        aria-label="إضافة المال حسب الفئة"
        className="saas-card p-5 sm:p-6 space-y-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#0B1526] dark:text-slate-100">إضافة مال لكل فئة</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              اضغط على أيقونة الإضافة (+) بجانب أي فئة لتسجيل مبلغ جديد مباشرة ضمنها
            </p>
          </div>

          <div
            className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#F1F5F9] dark:bg-[#08101E] border border-[#E2E8F0] dark:border-[#1E2E4A]"
            role="tablist"
            aria-label="أقسام الفئات"
          >
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={categoryTab === tab.id}
                onClick={() => setCategoryTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  categoryTab === tab.id
                    ? 'bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526] shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1526] dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categoryCards.map((item) => (
            <div
              key={`${item.kind}-${item.key}`}
              className="saas-subcard hover:bg-white dark:hover:bg-[#162744] hover:border-[#C8A24A]/60 p-3.5 flex items-center justify-between gap-3 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#0B1526] dark:bg-[#1B2E4E] text-[#DDBB6A] flex items-center justify-center shrink-0 shadow-2xs">
                  <CategoryIcon kind={item.kind} category={item.key} className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#0B1526] dark:text-slate-100 truncate">
                    {item.label}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <AmountText
                      amount={item.total}
                      currency={displayCurrency}
                      className="font-semibold text-slate-700 dark:text-slate-200"
                    />
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{item.count}</span>
                    <span>عمليات</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={item.onAdd}
                aria-label={`إضافة مال لفئة ${item.label}`}
                title={`إضافة مال لفئة ${item.label}`}
                data-testid={`dashboard-add-cat-${item.kind}-${item.key}`}
                className="w-9 h-9 rounded-lg bg-[#C8A24A] text-[#0B1526] hover:bg-[#DDBB6A] flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Main Charts Row */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Monthly Cash Flow Bar Chart */}
        <div className="xl:col-span-7 saas-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-base font-bold text-[#0B1526] dark:text-slate-100">
                التدفق النقدي الشهري
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                مقارنة الإيرادات بالمصروفات حسب الشهر بعملة {CURRENCY_LABELS[displayCurrency]}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#0B1526] dark:bg-[#4F7AC7]" />
                الإيرادات
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#C8A24A]" />
                المصروفات
              </span>
            </div>
          </div>

          {monthlyCashFlow.length === 0 ? (
            <EmptyState
              compact
              icon={<BarChart3 className="w-5 h-5" />}
              title="لا توجد بيانات تدفق نقدي مسجلة بعد"
              description="سجّل أول إيراد أو مصروف لتظهر المقارنة الشهرية هنا تلقائياً"
              actionLabel="تسجيل أول إيراد"
              onAction={onQuickAddIncome}
            />
          ) : (
            <div className="h-[270px] w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyCashFlow} barGap={6}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? '#1E2E4A' : '#EEF1F6'}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    reversed
                    tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 12 }}
                    axisLine={{ stroke: isDark ? '#1E2E4A' : '#E4E8F0' }}
                    tickLine={false}
                  />
                  <YAxis
                    orientation="right"
                    tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => formatMoney(v, displayCurrency, true)}
                    width={76}
                  />
                  <Tooltip
                    formatter={(value: unknown, name: unknown) => [
                      formatMoney(Number(value ?? 0), displayCurrency),
                      name === 'income' ? 'الإيرادات' : 'المصروفات',
                    ]}
                    contentStyle={{
                      backgroundColor: '#0B1526',
                      border: '1px solid #1E3256',
                      borderRadius: '10px',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      direction: 'rtl',
                    }}
                    itemStyle={{ color: '#F8FAFC' }}
                  />
                  <Bar
                    dataKey="income"
                    fill={isDark ? '#4F7AC7' : '#0B1526'}
                    radius={[5, 5, 0, 0]}
                    maxBarSize={32}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="expenses"
                    fill="#C8A24A"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={32}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Wealth Composition Donut */}
        <div className="xl:col-span-5 saas-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#0B1526] dark:text-slate-100">
                توزيع الأصول والثروة
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                الأوزان النسبية لمكونات الأصول والاستثمارات
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('investments')}
              className="text-xs font-medium text-[#9E7B2C] dark:text-[#DDBB6A] hover:underline cursor-pointer"
            >
              المحفظة
            </button>
          </div>

          {wealthComposition.length === 0 ? (
            <EmptyState
              compact
              icon={<PieChartIcon className="w-5 h-5" />}
              title="لم تُسجَّل أصول أو استثمارات بعد"
              description="أضف رصيداً نقدياً أو استثماراً لمتابعة توزيع محفظتك"
              actionLabel="إضافة أصل"
              onAction={() => onTriggerAction({ section: 'assets', mode: 'create', tab: 'assets' })}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center flex-1">
              <div className="h-[220px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={wealthComposition}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={86}
                      paddingAngle={2}
                      isAnimationActive={false}
                    >
                      {wealthComposition.map((entry, idx) => (
                        <Cell
                          key={entry.key}
                          fill={chartColors[idx % chartColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: unknown) => [
                        formatMoney(Number(value ?? 0), displayCurrency),
                        'القيمة',
                      ]}
                      contentStyle={{
                        backgroundColor: '#0B1526',
                        border: '1px solid #1E3256',
                        borderRadius: '8px',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        direction: 'rtl',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pl-1">
                {wealthComposition.slice(0, 6).map((slice, idx) => (
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
      </section>

      {/* Income & Expense Distribution Charts Row (Recharts) */}
      <section
        aria-label="توزيع الدخل والمصروفات حسب الفئة"
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Income Distribution Donut */}
        <div
          data-testid="dashboard-income-chart"
          className="saas-card p-6 flex flex-col"
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-[#0B1526] dark:text-slate-100">
                توزيع الإيرادات حسب الفئة
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                مصادر الدخل المسجلة بعملة {CURRENCY_LABELS[displayCurrency]}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('income')}
              className="text-xs font-medium text-[#9E7B2C] dark:text-[#DDBB6A] hover:underline cursor-pointer shrink-0"
            >
              التفاصيل
            </button>
          </div>

          {incomeBreakdown.length === 0 ? (
            <EmptyState
              compact
              icon={<TrendingUp className="w-5 h-5" />}
              title="لا توجد إيرادات مسجلة"
              description="أضف مصادر دخلك لعرض نسب المساهمة لكل فئة"
              actionLabel="تسجيل إيراد"
              onAction={onQuickAddIncome}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center flex-1">
              <div className="h-[220px] w-full min-w-0" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incomeBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={84}
                      paddingAngle={2}
                      isAnimationActive={false}
                    >
                      {incomeBreakdown.map((entry, idx) => (
                        <Cell
                          key={entry.key}
                          fill={incomeColors[idx % incomeColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: unknown, name: unknown) => [
                        formatMoney(Number(value ?? 0), displayCurrency),
                        String(name ?? 'الإيراد'),
                      ]}
                      contentStyle={{
                        backgroundColor: '#0B1526',
                        border: '1px solid #1E3256',
                        borderRadius: '8px',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        direction: 'rtl',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pl-1">
                {incomeBreakdown.map((slice, idx) => (
                  <div
                    key={slice.key}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{
                          backgroundColor:
                            incomeColors[idx % incomeColors.length],
                        }}
                      />
                      <span className="text-slate-700 dark:text-slate-300 truncate">{slice.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <AmountText
                        amount={slice.value}
                        currency={displayCurrency}
                        compact
                        className="text-slate-500 dark:text-slate-400"
                      />
                      <span className="font-mono tabular-nums text-[#15803D] dark:text-emerald-400 font-semibold">
                        {slice.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Expense Distribution Donut */}
        <div
          data-testid="dashboard-expense-chart"
          className="saas-card p-6 flex flex-col"
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-[#0B1526] dark:text-slate-100">
                توزيع المصروفات حسب الفئة
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                أوزان فئات الإنفاق بعملة {CURRENCY_LABELS[displayCurrency]}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('expenses')}
              className="text-xs font-medium text-[#9E7B2C] dark:text-[#DDBB6A] hover:underline cursor-pointer shrink-0"
            >
              التفاصيل
            </button>
          </div>

          {expenseBreakdown.length === 0 ? (
            <EmptyState
              compact
              icon={<Receipt className="w-5 h-5" />}
              title="لا توجد مصروفات مسجلة"
              description="سجّل مصروفاتك لتحليل أبرز أبواب الإنفاق الشهري"
              actionLabel="تسجيل مصروف"
              onAction={onQuickAddExpense}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center flex-1">
              <div className="h-[220px] w-full min-w-0" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={84}
                      paddingAngle={2}
                      isAnimationActive={false}
                    >
                      {expenseBreakdown.map((entry, idx) => (
                        <Cell
                          key={entry.key}
                          fill={chartColors[idx % chartColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: unknown, name: unknown) => [
                        formatMoney(Number(value ?? 0), displayCurrency),
                        String(name ?? 'المصروف'),
                      ]}
                      contentStyle={{
                        backgroundColor: '#0B1526',
                        border: '1px solid #1E3256',
                        borderRadius: '8px',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        direction: 'rtl',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pl-1">
                {expenseBreakdown.map((slice, idx) => (
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
                    <div className="flex items-center gap-2 shrink-0">
                      <AmountText
                        amount={slice.value}
                        currency={displayCurrency}
                        compact
                        className="text-slate-500 dark:text-slate-400"
                      />
                      <span className="font-mono tabular-nums text-[#0B1526] dark:text-slate-100 font-semibold">
                        {slice.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Bottom Row: Recent Transactions & Top Financial Goals */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Recent Transactions with Edit & Delete */}
        <div className="xl:col-span-7 saas-card p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-[#0B1526] dark:text-slate-100">أحدث المعاملات المالية</h2>
              {allTransactions.length > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  يمكنك تعديل أو حذف أي عملية مالية مباشرة من هنا
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {allTransactions.length > 8 && (
                <button
                  type="button"
                  onClick={() => setShowAllRecent((v) => !v)}
                  className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-[#0B1526] dark:hover:text-white cursor-pointer"
                >
                  {showAllRecent ? 'عرض أحدث 8' : `عرض الكل (${allTransactions.length})`}
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigate('reports')}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#9E7B2C] dark:text-[#DDBB6A] hover:underline cursor-pointer"
              >
                عرض التقارير
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {recentTransactions.length === 0 ? (
            <EmptyState
              compact
              icon={<Receipt className="w-5 h-5" />}
              title="لا توجد معاملات مسجلة حالياً"
              description="ابدأ بتسجيل إيراد أو مصروف وسيظهر سجل عملياتك هنا فوراً"
              actionLabel="تسجيل معاملة جديدة"
              onAction={onQuickAddIncome}
            />
          ) : (
            <div className="divide-y divide-[#EEF1F6] dark:divide-[#1B2B46]">
              {recentTransactions.map((tx) => (
                <div
                  key={`${tx.type}-${tx.id}`}
                  className="py-3.5 px-2 -mx-2 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-[#111E35] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        tx.type === 'income'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-[#15803D] dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-[#132038] text-[#0B1526] dark:text-slate-200'
                      }`}
                    >
                      {tx.type === 'income' ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#0B1526] dark:text-slate-100 truncate">
                        {tx.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span>{tx.categoryLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span dir="ltr" className="font-mono tabular-nums">
                          {tx.date}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pr-12 sm:pr-0">
                    <div className="text-right sm:text-left">
                      <div
                        className={`text-sm font-semibold ${
                          tx.type === 'income'
                            ? 'text-[#15803D] dark:text-emerald-400'
                            : 'text-[#0B1526] dark:text-slate-100'
                        }`}
                      >
                        <AmountText
                          amount={tx.type === 'income' ? tx.amount : -tx.amount}
                          currency={displayCurrency}
                          showSign
                        />
                      </div>
                      {tx.originalCurrency !== displayCurrency && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          <AmountText
                            amount={tx.originalAmount}
                            currency={tx.originalCurrency}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 sm:border-r sm:border-[#EEF1F6] dark:sm:border-[#1B2B46] sm:pr-2">
                      <button
                        type="button"
                        onClick={() =>
                          onTriggerAction({
                            section: tx.type === 'income' ? 'income' : 'expenses',
                            mode: 'edit',
                            recordId: tx.id,
                          })
                        }
                        aria-label={`تعديل العملية ${tx.title}`}
                        title="تعديل العملية"
                        className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#0B1526] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2B4A] transition-colors cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTransaction(tx.type, tx.id)}
                        aria-label={`حذف العملية ${tx.title}`}
                        title="حذف العملية"
                        className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#B91C1C] dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Goals Snapshot */}
        <div className="xl:col-span-5 saas-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#0B1526] dark:text-slate-100">تقدم الأهداف المالية</h2>
            <button
              type="button"
              onClick={() => onNavigate('goals')}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#9E7B2C] dark:text-[#DDBB6A] hover:underline cursor-pointer"
            >
              كل الأهداف
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {topGoals.length === 0 ? (
            <EmptyState
              compact
              icon={<Target className="w-5 h-5" />}
              title="لم تقم بإضافة أهداف مالية بعد"
              description="حدّد هدفاً ادخارياً أو خطط لمستقبلك خلال 5 أو 10 سنوات"
              actionLabel="الانتقال للأهداف"
              onAction={() => onNavigate('goals')}
            />
          ) : (
            <div className="space-y-5">
              {topGoals.map((goal) => {
                const { percentage } = calculateGoalProgress(goal);
                return (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#0B1526] dark:text-slate-100 truncate">
                          {goal.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {goal.category} · المستهدف{' '}
                          <span dir="ltr" className="font-mono tabular-nums">
                            {goal.targetDate}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono tabular-nums font-semibold text-[#9E7B2C] dark:text-[#DDBB6A] shrink-0">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-[#182844] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#C8A24A] transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        المدّخر:{' '}
                        <AmountText
                          amount={goal.currentAmount}
                          currency={goal.currency}
                          className="text-[#0B1526] dark:text-slate-100 font-medium"
                        />
                      </span>
                      <span>
                        الهدف:{' '}
                        <AmountText
                          amount={goal.targetAmount}
                          currency={goal.currency}
                        />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
