import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import {
  BarChart3,
  Clock,
  Download,
  FileText,
  Pencil,
  Percent,
  PieChart as PieChartIcon,
  ShieldAlert,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { PendingModalAction, WealthState } from '../types/wealth';
import {
  ASSET_CATEGORY_LABELS,
  CURRENCY_LABELS,
  EXPENSE_CATEGORY_LABELS,
  INCOME_CATEGORY_LABELS,
  INVESTMENT_CATEGORY_LABELS,
  LIABILITY_CATEGORY_LABELS,
} from '../data/labels';
import {
  buildExpenseBreakdown,
  buildMonthlyCashFlow,
  calculateWealthSummary,
  convertCurrency,
  formatMoney,
} from '../utils/finance';
import { AmountText } from './AmountText';
import { EmptyState } from './EmptyState';
import { InflationCalculator } from './InflationCalculator';

interface ReportsViewProps {
  state: WealthState;
  isDark?: boolean;
  onClearAllData: () => void;
  onEditRecord: (action: Exclude<PendingModalAction, null>) => void;
  onDeleteRecord: (
    kind: 'income' | 'expense' | 'asset' | 'liability' | 'investment',
    id: string
  ) => void;
}

type LedgerFilter = 'all' | 'income' | 'expense' | 'asset' | 'investment' | 'liability';

const LEDGER_FILTERS: { id: LedgerFilter; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'income', label: 'الإيرادات' },
  { id: 'expense', label: 'المصروفات' },
  { id: 'asset', label: 'الأصول' },
  { id: 'investment', label: 'الاستثمارات' },
  { id: 'liability', label: 'الالتزامات' },
];

export const ReportsView: React.FC<ReportsViewProps> = ({
  state,
  isDark = false,
  onClearAllData,
  onEditRecord,
  onDeleteRecord,
}) => {
  const { displayCurrency, exchangeRateIQDPerUSD } = state.settings;
  const summary = useMemo(() => calculateWealthSummary(state), [state]);
  const monthlyCashFlow = useMemo(() => buildMonthlyCashFlow(state), [state]);
  const expenseBreakdown = useMemo(() => buildExpenseBreakdown(state), [state]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('all');

  const unifiedLedger = useMemo(() => {
    const rows: {
      id: string;
      kind: 'income' | 'expense' | 'asset' | 'investment' | 'liability';
      kindLabel: string;
      title: string;
      categoryLabel: string;
      date: string;
      amountInDisplay: number;
      showSign: boolean;
      signValue: number;
      editAction: Exclude<PendingModalAction, null>;
    }[] = [
      ...state.incomes.map((inc) => {
        const val = convertCurrency(
          inc.amount,
          inc.currency,
          displayCurrency,
          exchangeRateIQDPerUSD
        );
        return {
          id: inc.id,
          kind: 'income' as const,
          kindLabel: 'إيراد',
          title: inc.title,
          categoryLabel: INCOME_CATEGORY_LABELS[inc.category],
          date: inc.date,
          amountInDisplay: val,
          showSign: true,
          signValue: val,
          editAction: { section: 'income' as const, mode: 'edit' as const, recordId: inc.id },
        };
      }),
      ...state.expenses.map((exp) => {
        const val = convertCurrency(
          exp.amount,
          exp.currency,
          displayCurrency,
          exchangeRateIQDPerUSD
        );
        return {
          id: exp.id,
          kind: 'expense' as const,
          kindLabel: 'مصروف',
          title: exp.title,
          categoryLabel: EXPENSE_CATEGORY_LABELS[exp.category],
          date: exp.date,
          amountInDisplay: val,
          showSign: true,
          signValue: -val,
          editAction: {
            section: 'expenses' as const,
            mode: 'edit' as const,
            recordId: exp.id,
          },
        };
      }),
      ...state.assets.map((ast) => {
        const val = convertCurrency(
          ast.value,
          ast.currency,
          displayCurrency,
          exchangeRateIQDPerUSD
        );
        return {
          id: ast.id,
          kind: 'asset' as const,
          kindLabel: 'أصل',
          title: ast.name,
          categoryLabel: ASSET_CATEGORY_LABELS[ast.category],
          date: ast.updatedAt,
          amountInDisplay: val,
          showSign: false,
          signValue: val,
          editAction: {
            section: 'assets' as const,
            mode: 'edit' as const,
            tab: 'assets' as const,
            recordId: ast.id,
          },
        };
      }),
      ...state.investments.map((inv) => {
        const val = convertCurrency(
          inv.currentValue,
          inv.currency,
          displayCurrency,
          exchangeRateIQDPerUSD
        );
        return {
          id: inv.id,
          kind: 'investment' as const,
          kindLabel: 'استثمار',
          title: inv.name,
          categoryLabel: INVESTMENT_CATEGORY_LABELS[inv.category],
          date: inv.purchaseDate,
          amountInDisplay: val,
          showSign: false,
          signValue: val,
          editAction: {
            section: 'investments' as const,
            mode: 'edit' as const,
            recordId: inv.id,
          },
        };
      }),
      ...state.liabilities.map((lib) => {
        const val = convertCurrency(
          lib.remainingAmount,
          lib.currency,
          displayCurrency,
          exchangeRateIQDPerUSD
        );
        return {
          id: lib.id,
          kind: 'liability' as const,
          kindLabel: 'التزام',
          title: lib.name,
          categoryLabel: LIABILITY_CATEGORY_LABELS[lib.category],
          date: lib.dueDate,
          amountInDisplay: val,
          showSign: true,
          signValue: -val,
          editAction: {
            section: 'assets' as const,
            mode: 'edit' as const,
            tab: 'liabilities' as const,
            recordId: lib.id,
          },
        };
      }),
    ];

    return rows
      .filter((r) => ledgerFilter === 'all' || r.kind === ledgerFilter)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [
    state.incomes,
    state.expenses,
    state.assets,
    state.investments,
    state.liabilities,
    displayCurrency,
    exchangeRateIQDPerUSD,
    ledgerFilter,
  ]);

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wealth-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B1526] dark:text-slate-100">التقارير والتحليلات المالية</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            مؤشرات الكفاءة المالية، اتجاه صافي التدفق النقدي، وإدارة النسخ الاحتياطي المحلي
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportJSON}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#0B1526] dark:bg-[#1B3154] dark:border dark:border-[#2E4B7A] text-white text-sm font-semibold hover:bg-[#162744] dark:hover:bg-[#233F6B] transition-colors shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4 text-[#DDBB6A]" />
            تصدير نسخة احتياطية
          </button>
        </div>
      </div>

      {/* Financial Health KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="saas-card p-5 transition-colors hover:border-[#C8A24A]/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">معدل الادخار الصافي</span>
            <span className="w-8 h-8 rounded-lg bg-[#F8F2E2] dark:bg-[#231E12] text-[#9E7B2C] dark:text-[#DDBB6A] flex items-center justify-center shrink-0">
              <Percent className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold font-mono tabular-nums text-[#0B1526] dark:text-slate-100">
            {summary.savingsRatePct.toFixed(1)}%
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {summary.savingsRatePct >= 25
              ? 'أداء ادخاري قوي ومتوازن'
              : summary.savingsRatePct >= 10
              ? 'معدل ادخار متوسط قابل للتحسين'
              : 'معدل ادخار منخفض — راجع المصروفات'}
          </div>
        </div>

        <div className="saas-card p-5 transition-colors hover:border-[#C8A24A]/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">نسبة الالتزامات إلى الأصول</span>
            <span className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-[#B91C1C] dark:text-red-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold font-mono tabular-nums text-[#0B1526] dark:text-slate-100">
            {summary.debtToAssetRatioPct.toFixed(1)}%
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {summary.debtToAssetRatioPct <= 30
              ? 'مستوى مديونية منخفض وآمن'
              : 'مديونية متوسطة تستدعي خطة سداد'}
          </div>
        </div>

        <div className="saas-card p-5 transition-colors hover:border-[#C8A24A]/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">تغطية السيولة للطوارئ</span>
            <span className="w-8 h-8 rounded-lg bg-[#F4F6FA] dark:bg-[#132038] text-[#0B1526] dark:text-[#DDBB6A] flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-[#0B1526] dark:text-slate-100">
            <span className="font-mono tabular-nums">
              {summary.emergencyRunwayMonths.toFixed(1)}
            </span>{' '}
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">شهر</span>
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            بناءً على متوسط صرف شهري{' '}
            <AmountText amount={summary.monthlyAvgExpenses} currency={displayCurrency} compact />
          </div>
        </div>

        <div className="saas-card p-5 transition-colors hover:border-[#C8A24A]/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">صافي الفائض النقدي</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[#15803D] dark:text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div
            className={`mt-3 text-2xl font-bold ${
              summary.netCashFlow >= 0
                ? 'text-[#15803D] dark:text-emerald-400'
                : 'text-[#B91C1C] dark:text-red-400'
            }`}
          >
            <AmountText amount={summary.netCashFlow} currency={displayCurrency} showSign />
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">إجمالي الدخل مطروحاً منه المصروفات</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Net Savings Trend Area Chart */}
        <div className="xl:col-span-7 saas-card p-6">
          <h3 className="text-base font-bold text-[#0B1526] dark:text-slate-100">
            تطور صافي الفائض الشهري
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-5">
            الفرق الشهري بين إجمالي الإيرادات والمصروفات بعملة {CURRENCY_LABELS[displayCurrency]}
          </p>

          {monthlyCashFlow.length === 0 ? (
            <EmptyState
              compact
              icon={<BarChart3 className="w-5 h-5" />}
              title="لا توجد بيانات كافية للرسم البياني"
              description="أضف عمليات دخل ومصروفات ليتم احتساب تطور الفائض الشهري تلقائياً"
            />
          ) : (
            <div className="h-[260px] w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyCashFlow}>
                  <defs>
                    <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C8A24A" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#C8A24A" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
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
                    width={84}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [
                      formatMoney(Number(value ?? 0), displayCurrency),
                      'صافي الفائض',
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
                  <Area
                    type="monotone"
                    dataKey="net"
                    stroke="#C8A24A"
                    strokeWidth={2.5}
                    fill="url(#goldFill)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top Expense Categories Bar Chart */}
        <div className="xl:col-span-5 saas-card p-6">
          <h3 className="text-base font-bold text-[#0B1526] dark:text-slate-100">
            أعلى بنود المصروفات
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-5">
            ترتيب فئات الإنفاق من الأعلى إلى الأقل
          </p>

          {expenseBreakdown.length === 0 ? (
            <EmptyState
              compact
              icon={<PieChartIcon className="w-5 h-5" />}
              title="لا توجد مصروفات مسجلة"
              description="سجّل مصروفاتك لعرض ترتيب أعلى فئات الإنفاق بصرياً"
            />
          ) : (
            <div className="h-[260px] w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseBreakdown.slice(0, 6)} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? '#1E2E4A' : '#EEF1F6'}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    reversed
                    tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                    tickFormatter={(v: number) => formatMoney(v, displayCurrency, true)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    orientation="right"
                    dataKey="name"
                    tick={{ fill: isDark ? '#E2E8F0' : '#0B1526', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [
                      formatMoney(Number(value ?? 0), displayCurrency),
                      'الإنفاق',
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
                  <Bar
                    dataKey="value"
                    fill={isDark ? '#4F7AC7' : '#0B1526'}
                    radius={[5, 0, 0, 5]}
                    maxBarSize={20}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Purchasing Power & Inflation Calculator */}
      <InflationCalculator
        displayCurrency={displayCurrency}
        exchangeRateIQDPerUSD={exchangeRateIQDPerUSD}
        netWorthInDisplay={summary.netWorth}
        liquidAssetsInDisplay={summary.totalLiquidAssets}
        investmentsInDisplay={summary.totalInvestmentsValue}
        isDark={isDark}
      />

      {/* Unified Financial Operations Ledger (Edit & Delete Any Financial Record) */}
      <section className="saas-card overflow-hidden">
        <div className="p-5 border-b border-[#EEF1F6] dark:border-[#1B2B46] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#0B1526] dark:text-slate-100">
              سجل العمليات المالية الشامل ({unifiedLedger.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              يمكنك تعديل أو حذف أي عملية مالية مسجلة في النظام من هنا
            </p>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {LEDGER_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setLedgerFilter(f.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  ledgerFilter === f.id
                    ? 'bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526]'
                    : 'bg-[#F1F5F9] dark:bg-[#132038] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1B2D4D]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {unifiedLedger.length === 0 ? (
          <EmptyState
            compact
            icon={<FileText className="w-5 h-5" />}
            title="لا توجد عمليات مالية مسجلة ضمن هذا التصنيف حالياً"
            description="ستظهر هنا جميع سجلات الإيرادات والمصروفات والأصول والاستثمارات والالتزامات فور إضافتها"
          />
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-[#EEF1F6] dark:divide-[#1B2B46]">
              {unifiedLedger.map((row) => (
                <div key={`${row.kind}-${row.id}`} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-[#0B1526] dark:text-slate-100">{row.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {row.kindLabel} · {row.categoryLabel}
                      </div>
                    </div>
                    <div
                      className={`text-sm font-bold shrink-0 ${
                        row.kind === 'income'
                          ? 'text-[#15803D] dark:text-emerald-400'
                          : row.kind === 'liability'
                          ? 'text-[#B91C1C] dark:text-red-400'
                          : 'text-[#0B1526] dark:text-slate-100'
                      }`}
                    >
                      <AmountText
                        amount={row.showSign ? row.signValue : row.amountInDisplay}
                        currency={displayCurrency}
                        showSign={row.showSign}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span dir="ltr" className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      {row.date}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditRecord(row.editAction)}
                        aria-label={`تعديل ${row.title}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#132038] text-xs font-medium text-[#0B1526] dark:text-slate-100 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteRecord(row.kind, row.id)}
                        aria-label={`حذف ${row.title}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/50 text-xs font-medium text-[#B91C1C] dark:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-[#EEF1F6] dark:border-[#1B2B46] bg-[#F8FAFC] dark:bg-[#111E35] text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">العملية / البند</th>
                    <th className="py-3 px-4">النوع</th>
                    <th className="py-3 px-4">الفئة</th>
                    <th className="py-3 px-4">التاريخ</th>
                    <th className="py-3 px-4">المبلغ</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF1F6] dark:divide-[#1B2B46] text-sm">
                  {unifiedLedger.map((row) => (
                    <tr key={`${row.kind}-${row.id}`} className="hover:bg-[#FAFBFD] dark:hover:bg-[#13223C] transition-colors">
                      <td className="py-3.5 px-4 font-medium text-[#0B1526] dark:text-slate-100">{row.title}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {row.kindLabel}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {row.categoryLabel}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <span dir="ltr" className="font-mono tabular-nums">
                          {row.date}
                        </span>
                      </td>
                      <td
                        className={`py-3.5 px-4 font-semibold whitespace-nowrap ${
                          row.kind === 'income'
                            ? 'text-[#15803D] dark:text-emerald-400'
                            : row.kind === 'liability'
                            ? 'text-[#B91C1C] dark:text-red-400'
                            : 'text-[#0B1526] dark:text-slate-100'
                        }`}
                      >
                        <AmountText
                          amount={row.showSign ? row.signValue : row.amountInDisplay}
                          currency={displayCurrency}
                          showSign={row.showSign}
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditRecord(row.editAction)}
                            aria-label={`تعديل ${row.title}`}
                            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#0B1526] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2B4A] cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteRecord(row.kind, row.id)}
                            aria-label={`حذف ${row.title}`}
                            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#B91C1C] dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Balance Sheet Summary Table & Local Data Controls */}
      <div className="saas-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#EEF1F6] dark:border-[#1B2B46]">
          <div>
            <h3 className="text-base font-bold text-[#0B1526] dark:text-slate-100">ملخص المركز المالي الشامل</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              يُحفظ سجل بياناتك تلقائياً في المتصفح محلياً دون إرسال لأي خادم خارجي
            </p>
          </div>

          {!confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-200 dark:border-red-900/60 text-xs font-medium text-[#B91C1C] dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer whitespace-nowrap self-start"
            >
              <Trash2 className="w-3.5 h-3.5" />
              تصفير جميع البيانات
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#B91C1C] dark:text-red-400 font-medium">تأكيد مسح كل السجلات؟</span>
              <button
                type="button"
                onClick={() => {
                  onClearAllData();
                  setConfirmClear(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#B91C1C] text-white text-xs font-semibold cursor-pointer"
              >
                نعم، امسح الكل
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#132038] text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer"
              >
                تراجع
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 text-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-[#F1F4F9] dark:border-[#1B2B46]">
              <span className="text-slate-600 dark:text-slate-300">الأصول النقدية والعينية</span>
              <AmountText
                amount={summary.totalNonInvestmentAssets}
                currency={displayCurrency}
                className="font-semibold text-[#0B1526] dark:text-slate-100"
              />
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#F1F4F9] dark:border-[#1B2B46]">
              <span className="text-slate-600 dark:text-slate-300">المحفظة الاستثمارية (القيمة الحالية)</span>
              <AmountText
                amount={summary.totalInvestmentsValue}
                currency={displayCurrency}
                className="font-semibold text-[#0B1526] dark:text-slate-100"
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="font-semibold text-[#0B1526] dark:text-slate-100">إجمالي الأصول</span>
              <AmountText
                amount={summary.totalAssets}
                currency={displayCurrency}
                className="font-bold text-[#0B1526] dark:text-slate-100"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-[#F1F4F9] dark:border-[#1B2B46]">
              <span className="text-slate-600 dark:text-slate-300">إجمالي الالتزامات والديون</span>
              <AmountText
                amount={summary.totalLiabilities}
                currency={displayCurrency}
                className="font-semibold text-[#B91C1C] dark:text-red-400"
              />
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[#F1F4F9] dark:border-[#1B2B46]">
              <span className="text-slate-600 dark:text-slate-300">الأرباح الاستثمارية غير المحققة</span>
              <AmountText
                amount={summary.investmentsGainLoss}
                currency={displayCurrency}
                showSign
                className={
                  summary.investmentsGainLoss >= 0
                    ? 'font-semibold text-[#15803D] dark:text-emerald-400'
                    : 'font-semibold text-[#B91C1C] dark:text-red-400'
                }
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="font-bold text-[#0B1526] dark:text-slate-100">صافي الثروة النهائي</span>
              <AmountText
                amount={summary.netWorth}
                currency={displayCurrency}
                className="font-bold text-[#9E7B2C] dark:text-[#DDBB6A] text-base"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
