import React, { useMemo, useState } from 'react';
import { BarChart3, Briefcase, Coins, Info, Pencil, Percent, Plus, Trash2, TrendingUp } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  Currency,
  InvestmentCategory,
  InvestmentRecord,
  PendingModalAction,
  WealthState,
} from '../types/wealth';
import {
  CHART_COLORS,
  CHART_COLORS_DARK,
  CURRENCY_LABELS,
  CURRENCY_SHORT_LABELS,
  INVESTMENT_CATEGORY_LABELS,
} from '../data/labels';
import {
  buildInvestmentAllocation,
  calculateWealthSummary,
  convertCurrency,
  formatMoney,
  generateId,
} from '../utils/finance';
import { AmountText } from './AmountText';
import { CategoryIcon } from './CategoryIcon';
import { EmptyState } from './EmptyState';
import { Modal } from './Modal';

interface InvestmentsViewProps {
  state: WealthState;
  isDark?: boolean;
  onAdd: (record: InvestmentRecord) => void;
  onUpdate: (record: InvestmentRecord) => void;
  onDelete: (id: string) => void;
  pendingAction?: PendingModalAction;
  onActionHandled?: () => void;
}

const INVESTMENT_CATEGORIES: InvestmentCategory[] = [
  'stocks',
  'real_estate',
  'gold',
  'forex',
  'crypto',
  'projects',
];

export const InvestmentsView: React.FC<InvestmentsViewProps> = ({
  state,
  isDark = false,
  onAdd,
  onUpdate,
  onDelete,
  pendingAction,
  onActionHandled,
}) => {
  const { displayCurrency, exchangeRateIQDPerUSD } = state.settings;
  const chartColors = isDark ? CHART_COLORS_DARK : CHART_COLORS;
  const summary = calculateWealthSummary(state);
  const allocation = useMemo(() => buildInvestmentAllocation(state), [state]);

  const [categoryFilter, setCategoryFilter] = useState<InvestmentCategory | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    category: 'gold' as InvestmentCategory,
    investedAmount: '',
    currentValue: '',
    currency: displayCurrency as Currency,
    quantityLabel: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [error, setError] = useState('');

  const openCreateModal = React.useCallback(
    (defaultCategory?: InvestmentCategory) => {
      setEditingId(null);
      setForm({
        name: '',
        category:
          defaultCategory ?? (categoryFilter === 'all' ? 'gold' : categoryFilter),
        investedAmount: '',
        currentValue: '',
        currency: displayCurrency,
        quantityLabel: '',
        purchaseDate: new Date().toISOString().slice(0, 10),
        notes: '',
      });
      setError('');
      setModalOpen(true);
    },
    [categoryFilter, displayCurrency]
  );

  const openEditModal = React.useCallback((record: InvestmentRecord) => {
    setEditingId(record.id);
    setForm({
      name: record.name,
      category: record.category,
      investedAmount: String(record.investedAmount),
      currentValue: String(record.currentValue),
      currency: record.currency,
      quantityLabel: record.quantityLabel ?? '',
      purchaseDate: record.purchaseDate,
      notes: record.notes ?? '',
    });
    setError('');
    setModalOpen(true);
  }, []);

  React.useEffect(() => {
    if (!pendingAction || pendingAction.section !== 'investments') return;

    if (pendingAction.mode === 'create') {
      openCreateModal(pendingAction.category);
    } else if (pendingAction.mode === 'edit') {
      const target = state.investments.find((i) => i.id === pendingAction.recordId);
      if (target) {
        openEditModal(target);
      }
    }
    onActionHandled?.();
  }, [
    pendingAction,
    state.investments,
    openCreateModal,
    openEditModal,
    onActionHandled,
  ]);

  const filtered = useMemo(() => {
    return state.investments.filter(
      (item) => categoryFilter === 'all' || item.category === categoryFilter
    );
  }, [state.investments, categoryFilter]);

  const categoryTotals = useMemo(() => {
    const map: Record<InvestmentCategory, { total: number; count: number }> = {
      stocks: { total: 0, count: 0 },
      real_estate: { total: 0, count: 0 },
      gold: { total: 0, count: 0 },
      forex: { total: 0, count: 0 },
      crypto: { total: 0, count: 0 },
      projects: { total: 0, count: 0 },
    };
    for (const item of state.investments) {
      map[item.category].count += 1;
      map[item.category].total += convertCurrency(
        item.currentValue,
        item.currency,
        displayCurrency,
        exchangeRateIQDPerUSD
      );
    }
    return map;
  }, [state.investments, displayCurrency, exchangeRateIQDPerUSD]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = Number(form.investedAmount);
    const val = Number(form.currentValue);
    if (!form.name.trim()) {
      setError('يرجى إدخال اسم الاستثمار.');
      return;
    }
    if (!Number.isFinite(cost) || cost <= 0) {
      setError('يرجى إدخال رأس المال المستثمر بشكل صحيح.');
      return;
    }
    if (!Number.isFinite(val) || val < 0) {
      setError('يرجى إدخال القيمة الحالية التقديرية بشكل صحيح.');
      return;
    }

    const payload: InvestmentRecord = {
      id: editingId ?? generateId('inv'),
      name: form.name.trim(),
      category: form.category,
      investedAmount: cost,
      currentValue: val,
      currency: form.currency,
      quantityLabel: form.quantityLabel.trim() || undefined,
      purchaseDate: form.purchaseDate,
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B1526] dark:text-slate-100">المحفظة الاستثمارية</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            متابعة الأسهم، العقارات، الذهب، العملات، الأصول الرقمية، والمشاريع الخاصة
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreateModal()}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-[#0B1526] dark:bg-[#1B3154] dark:border dark:border-[#2E4B7A] text-white text-sm font-semibold hover:bg-[#162744] dark:hover:bg-[#233F6B] transition-colors shadow-xs cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 text-[#DDBB6A]" />
          إضافة استثمار جديد
        </button>
      </div>

      {/* Honest Manual Valuation Notice */}
      <div className="rounded-xl bg-[#F8F2E2] dark:bg-[#221D11] border border-[#E7D8B1] dark:border-[#4A3B19] px-4 py-3 flex items-start gap-3 text-xs text-[#6B531B] dark:text-[#E7CF93]">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#9E7B2C] dark:text-[#DDBB6A]" />
        <p className="leading-relaxed">
          تعتمد جميع التقييمات في هذه النسخة على القيم التي تدخلها وتحدّثها يدوياً دون ربط بأسعار سوقية حية أو تكاملات خارجية، لضمان دقة أرقامك الشخصية وخصوصية بياناتك المحفوظة محلياً.
        </p>
      </div>

      {/* Portfolio KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="hero-wealth-surface rounded-2xl text-white border border-[#1E3256] p-5 shadow-md">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#DDBB6A]">القيمة الحالية للمحفظة</span>
            <span className="w-8 h-8 rounded-lg bg-white/10 text-[#DDBB6A] flex items-center justify-center shrink-0">
              <Briefcase className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold">
            <AmountText amount={summary.totalInvestmentsValue} currency={displayCurrency} />
          </div>
          <div className="mt-1 text-xs text-slate-300">
            <span className="font-mono tabular-nums font-semibold">{state.investments.length}</span> أصول استثمارية مسجلة
          </div>
        </div>

        <div className="saas-card p-5 transition-colors hover:border-[#C8A24A]/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">إجمالي رأس المال المستثمر</span>
            <span className="w-8 h-8 rounded-lg bg-[#F4F6FA] dark:bg-[#132038] text-[#0B1526] dark:text-[#DDBB6A] flex items-center justify-center shrink-0">
              <Coins className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-[#0B1526] dark:text-slate-100">
            <AmountText amount={summary.totalInvestmentsCost} currency={displayCurrency} />
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">تكلفة الاستحواذ الإجمالية</div>
        </div>

        <div className="saas-card p-5 transition-colors hover:border-[#C8A24A]/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">صافي الربح / الخسارة التقديرية</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[#15803D] dark:text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div
            className={`mt-3 text-2xl font-bold ${
              summary.investmentsGainLoss >= 0
                ? 'text-[#15803D] dark:text-emerald-400'
                : 'text-[#B91C1C] dark:text-red-400'
            }`}
          >
            <AmountText
              amount={summary.investmentsGainLoss}
              currency={displayCurrency}
              showSign
            />
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">فرق التقييم عن التكلفة</div>
        </div>

        <div className="saas-card p-5 transition-colors hover:border-[#C8A24A]/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">العائد الإجمالي على الاستثمار</span>
            <span className="w-8 h-8 rounded-lg bg-[#F8F2E2] dark:bg-[#231C0D] text-[#9E7B2C] dark:text-[#DDBB6A] flex items-center justify-center shrink-0">
              <Percent className="w-4 h-4" />
            </span>
          </div>
          <div
            className={`mt-3 text-2xl font-bold font-mono tabular-nums ${
              summary.investmentsReturnPct >= 0
                ? 'text-[#15803D] dark:text-emerald-400'
                : 'text-[#B91C1C] dark:text-red-400'
            }`}
          >
            <span dir="ltr" className="inline-block">
              {summary.investmentsReturnPct >= 0 ? '+' : ''}
              {summary.investmentsReturnPct.toFixed(1)}%
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">نسبة النمو التراكمي</div>
        </div>
      </div>

      {/* Quick Add Money By Investment Category */}
      <section className="saas-card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#0B1526] dark:text-slate-100">إضافة مال حسب فئة الاستثمار</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            اضغط على أيقونة (+) بجانب أي فئة لتسجيل استثمار جديد ضمنها مباشرة
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {INVESTMENT_CATEGORIES.map((cat) => {
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
                    <CategoryIcon kind="investment" category={cat} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#0B1526] dark:text-slate-100 truncate">
                      {INVESTMENT_CATEGORY_LABELS[cat]}
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
                  aria-label={`إضافة مال لفئة ${INVESTMENT_CATEGORY_LABELS[cat]}`}
                  title={`إضافة مال لفئة ${INVESTMENT_CATEGORY_LABELS[cat]}`}
                  className="w-9 h-9 rounded-lg bg-[#C8A24A] text-[#0B1526] hover:bg-[#DDBB6A] flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Allocation Bar Chart */}
      <div className="saas-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-[#0B1526] dark:text-slate-100">توزيع المحفظة حسب فئة الاستثمار</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              القيمة الحالية لكل فئة بعملة {CURRENCY_LABELS[displayCurrency]}
            </p>
          </div>
        </div>

        {allocation.length === 0 ? (
          <EmptyState
            compact
            icon={<BarChart3 className="w-5 h-5" />}
            title="لا توجد استثمارات لعرض التوزيع"
            description="أضف استثماراً في الذهب أو الأسهم أو العقارات لعرض الأوزان النسبية"
            actionLabel="إضافة استثمار"
            onAction={() => openCreateModal()}
          />
        ) : (
          <div className="h-[230px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={allocation} layout="vertical" margin={{ left: 20, right: 10 }}>
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
                  tick={{ fill: isDark ? '#E2E8F0' : '#0B1526', fontSize: 12, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  width={100}
                />
                <Tooltip
                  formatter={(value: unknown) => [
                    formatMoney(Number(value ?? 0), displayCurrency),
                    'القيمة الحالية',
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
                  radius={[6, 0, 0, 6]}
                  maxBarSize={24}
                  isAnimationActive={false}
                >
                  {allocation.map((entry, idx) => (
                    <Cell
                      key={entry.key}
                      fill={chartColors[idx % chartColors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Category Filter + Holdings Table */}
      <div className="saas-card overflow-hidden">
        <div className="p-4 border-b border-[#EEF1F6] dark:border-[#1B2B46] flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526]'
                : 'bg-[#F1F5F9] dark:bg-[#132038] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1B2D4D]'
            }`}
          >
            جميع الفئات ({state.investments.length})
          </button>
          {INVESTMENT_CATEGORIES.map((cat) => {
            const count = state.investments.filter((i) => i.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526]'
                    : 'bg-[#F1F5F9] dark:bg-[#132038] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1B2D4D]'
                }`}
              >
                {INVESTMENT_CATEGORY_LABELS[cat]} ({count})
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="w-5 h-5" />}
            title="لا توجد استثمارات مسجلة في هذه الفئة"
            description="أضف أصلًا استثماريًا جديدًا لمتابعة رأس المال والعائد التراكمي"
            actionLabel="إضافة استثمار"
            onAction={() => openCreateModal()}
          />
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-[#EEF1F6] dark:divide-[#1B2B46]">
              {filtered.map((item) => {
                const costConverted = convertCurrency(
                  item.investedAmount,
                  item.currency,
                  displayCurrency,
                  exchangeRateIQDPerUSD
                );
                const valConverted = convertCurrency(
                  item.currentValue,
                  item.currency,
                  displayCurrency,
                  exchangeRateIQDPerUSD
                );
                const gain = valConverted - costConverted;
                const pct = costConverted > 0 ? (gain / costConverted) * 100 : 0;

                return (
                  <div key={item.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-[#0B1526] dark:text-slate-100">
                          {item.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {INVESTMENT_CATEGORY_LABELS[item.category]}
                          {item.quantityLabel ? ` · ${item.quantityLabel}` : ''}
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <div className="text-sm font-bold text-[#0B1526] dark:text-slate-100">
                          <AmountText amount={valConverted} currency={displayCurrency} />
                        </div>
                        <div
                          className={`text-xs font-semibold ${
                            gain >= 0
                              ? 'text-[#15803D] dark:text-emerald-400'
                              : 'text-[#B91C1C] dark:text-red-400'
                          }`}
                        >
                          <AmountText amount={gain} currency={displayCurrency} showSign compact /> (
                          <span dir="ltr">
                            {pct >= 0 ? '+' : ''}
                            {pct.toFixed(1)}%
                          </span>
                          )
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span dir="ltr" className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {item.purchaseDate}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          aria-label={`تعديل الاستثمار ${item.name}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#132038] text-xs font-medium text-[#0B1526] dark:text-slate-100 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(item.id)}
                          aria-label={`حذف الاستثمار ${item.name}`}
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
                    <th className="py-3 px-4">الأصل الاستثماري</th>
                    <th className="py-3 px-4">الفئة</th>
                    <th className="py-3 px-4">التكلفة</th>
                    <th className="py-3 px-4">
                      القيمة الحالية ({CURRENCY_SHORT_LABELS[displayCurrency]})
                    </th>
                    <th className="py-3 px-4">الأداء / العائد</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF1F6] dark:divide-[#1B2B46] text-sm">
                  {filtered.map((item) => {
                    const costConverted = convertCurrency(
                      item.investedAmount,
                      item.currency,
                      displayCurrency,
                      exchangeRateIQDPerUSD
                    );
                    const valConverted = convertCurrency(
                      item.currentValue,
                      item.currency,
                      displayCurrency,
                      exchangeRateIQDPerUSD
                    );
                    const gain = valConverted - costConverted;
                    const pct = costConverted > 0 ? (gain / costConverted) * 100 : 0;

                    return (
                      <tr key={item.id} className="hover:bg-[#FAFBFD] dark:hover:bg-[#13223C] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-[#0B1526] dark:text-slate-100">{item.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.quantityLabel ? `${item.quantityLabel} · ` : ''}
                            تاريخ الشراء:{' '}
                            <span dir="ltr" className="font-mono tabular-nums">
                              {item.purchaseDate}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {INVESTMENT_CATEGORY_LABELS[item.category]}
                        </td>
                        <td className="py-3.5 px-4 text-right text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          <AmountText amount={costConverted} currency={displayCurrency} />
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-[#0B1526] dark:text-slate-100 whitespace-nowrap">
                          <AmountText amount={valConverted} currency={displayCurrency} />
                          {item.currency !== displayCurrency && (
                            <div className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                              <AmountText amount={item.currentValue} currency={item.currency} />
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div
                            className={`text-xs font-semibold ${
                              gain >= 0
                                ? 'text-[#15803D] dark:text-emerald-400'
                                : 'text-[#B91C1C] dark:text-red-400'
                            }`}
                          >
                            <AmountText amount={gain} currency={displayCurrency} showSign />
                          </div>
                          <div
                            className={`text-[11px] font-mono tabular-nums ${
                              pct >= 0
                                ? 'text-[#15803D] dark:text-emerald-400'
                                : 'text-[#B91C1C] dark:text-red-400'
                            }`}
                          >
                            <span dir="ltr" className="inline-block">
                              {pct >= 0 ? '+' : ''}
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              aria-label={`تعديل الاستثمار ${item.name}`}
                              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#0B1526] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2B4A] cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(item.id)}
                              aria-label={`حذف الاستثمار ${item.name}`}
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
      </div>

      {/* Add / Edit Investment Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'تحديث بيانات الاستثمار' : 'إضافة استثمار جديد'}
        subtitle="أدخل تكلفة الشراء والقيمة التقديرية الحالية لحساب العائد وصافي الثروة"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-xs text-[#B91C1C] dark:text-red-300">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="inv-name" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              اسم الاستثمار
            </label>
            <input
              id="inv-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثال: سبائك ذهب عيار 24 أو حصة في مشروع"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#C8A24A]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="inv-cat" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                فئة الاستثمار
              </label>
              <select
                id="inv-cat"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value as InvestmentCategory }))
                }
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 focus:outline-none focus:border-[#C8A24A]"
              >
                {INVESTMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {INVESTMENT_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="inv-qty" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                الكمية / الوصف المختصر (اختياري)
              </label>
              <input
                id="inv-qty"
                type="text"
                value={form.quantityLabel}
                onChange={(e) => setForm((f) => ({ ...f, quantityLabel: e.target.value }))}
                placeholder="مثال: 100 غرام أو 50 سهم"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#C8A24A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="inv-cost" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                رأس المال المستثمر
              </label>
              <input
                id="inv-cost"
                type="number"
                step="any"
                min="0"
                required
                value={form.investedAmount}
                onChange={(e) => setForm((f) => ({ ...f, investedAmount: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 focus:outline-none focus:border-[#C8A24A]"
              />
            </div>
            <div>
              <label htmlFor="inv-val" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                القيمة الحالية (يدوياً)
              </label>
              <input
                id="inv-val"
                type="number"
                step="any"
                min="0"
                required
                value={form.currentValue}
                onChange={(e) => setForm((f) => ({ ...f, currentValue: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 focus:outline-none focus:border-[#C8A24A]"
              />
            </div>
            <div>
              <label htmlFor="inv-cur" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                العملة
              </label>
              <select
                id="inv-cur"
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
            <label htmlFor="inv-date" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              تاريخ الاستحواذ / التقييم
            </label>
            <input
              id="inv-date"
              type="date"
              required
              value={form.purchaseDate}
              onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
              className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 focus:outline-none focus:border-[#C8A24A]"
            />
          </div>

          <div>
            <label htmlFor="inv-notes" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              ملاحظات (اختياري)
            </label>
            <textarea
              id="inv-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 focus:outline-none focus:border-[#C8A24A]"
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
              {editingId ? 'حفظ التعديلات' : 'إضافة الاستثمار'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
