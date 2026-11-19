import React, { useMemo, useState } from 'react';
import { Calculator, Pencil, Plus, Repeat, Search, Trash2, TrendingUp } from 'lucide-react';
import {
  Currency,
  IncomeCategory,
  IncomeRecord,
  PendingModalAction,
  WealthSettings,
} from '../types/wealth';
import {
  CURRENCY_LABELS,
  CURRENCY_SHORT_LABELS,
  INCOME_CATEGORY_LABELS,
} from '../data/labels';
import { convertCurrency, generateId } from '../utils/finance';
import { AmountText } from './AmountText';
import { CategoryIcon } from './CategoryIcon';
import { EmptyState } from './EmptyState';
import { Modal } from './Modal';

interface IncomeViewProps {
  incomes: IncomeRecord[];
  settings: WealthSettings;
  onAdd: (record: IncomeRecord) => void;
  onUpdate: (record: IncomeRecord) => void;
  onDelete: (id: string) => void;
  pendingAction?: PendingModalAction;
  onActionHandled?: () => void;
}

const EMPTY_FORM = {
  title: '',
  source: '',
  category: 'salary' as IncomeCategory,
  amount: '',
  currency: 'IQD' as Currency,
  date: new Date().toISOString().slice(0, 10),
  recurring: false,
  notes: '',
};

const INCOME_CATEGORIES = Object.keys(INCOME_CATEGORY_LABELS) as IncomeCategory[];

export const IncomeView: React.FC<IncomeViewProps> = ({
  incomes,
  settings,
  onAdd,
  onUpdate,
  onDelete,
  pendingAction,
  onActionHandled,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<IncomeCategory | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const { displayCurrency, exchangeRateIQDPerUSD } = settings;

  const openCreateModal = React.useCallback(
    (defaultCategory?: IncomeCategory) => {
      setEditingId(null);
      setForm({
        ...EMPTY_FORM,
        category:
          defaultCategory ?? (categoryFilter === 'all' ? 'salary' : categoryFilter),
        currency: displayCurrency,
        date: new Date().toISOString().slice(0, 10),
      });
      setError('');
      setModalOpen(true);
    },
    [categoryFilter, displayCurrency]
  );

  const openEditModal = React.useCallback((record: IncomeRecord) => {
    setEditingId(record.id);
    setForm({
      title: record.title,
      source: record.source,
      category: record.category,
      amount: String(record.amount),
      currency: record.currency,
      date: record.date,
      recurring: record.recurring,
      notes: record.notes ?? '',
    });
    setError('');
    setModalOpen(true);
  }, []);

  React.useEffect(() => {
    if (!pendingAction || pendingAction.section !== 'income') return;

    if (pendingAction.mode === 'create') {
      openCreateModal(pendingAction.category);
    } else if (pendingAction.mode === 'edit') {
      const target = incomes.find((i) => i.id === pendingAction.recordId);
      if (target) {
        openEditModal(target);
      }
    }
    onActionHandled?.();
  }, [pendingAction, incomes, openCreateModal, openEditModal, onActionHandled]);

  const filtered = useMemo(() => {
    return incomes
      .filter((item) => {
        if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.source.toLowerCase().includes(q) ||
          INCOME_CATEGORY_LABELS[item.category].toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [incomes, categoryFilter, search]);

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

  const recurringTotal = useMemo(
    () =>
      incomes
        .filter((i) => i.recurring)
        .reduce(
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
    [incomes, displayCurrency, exchangeRateIQDPerUSD]
  );

  const categoryTotals = useMemo(() => {
    const map: Record<IncomeCategory, { total: number; count: number }> = {
      salary: { total: 0, count: 0 },
      business: { total: 0, count: 0 },
      freelance: { total: 0, count: 0 },
      rental: { total: 0, count: 0 },
      dividends: { total: 0, count: 0 },
      other: { total: 0, count: 0 },
    };
    for (const item of incomes) {
      map[item.category].count += 1;
      map[item.category].total += convertCurrency(
        item.amount,
        item.currency,
        displayCurrency,
        exchangeRateIQDPerUSD
      );
    }
    return map;
  }, [incomes, displayCurrency, exchangeRateIQDPerUSD]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(form.amount);
    if (!form.title.trim()) {
      setError('يرجى إدخال وصف الإيراد.');
      return;
    }
    if (!form.source.trim()) {
      setError('يرجى إدخال مصدر الدخل.');
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

    const payload: IncomeRecord = {
      id: editingId ?? generateId('inc'),
      title: form.title.trim(),
      source: form.source.trim(),
      category: form.category,
      amount: numericAmount,
      currency: form.currency,
      date: form.date,
      recurring: form.recurring,
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
      {/* Header Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B1526] dark:text-slate-100">إدارة الإيرادات ومصادر الدخل</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            توثيق الرواتب، الأرباح التجارية، الإيجارات، والاستشارات بالدينار أو الدولار
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreateModal()}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-[#0B1526] dark:bg-[#1B3154] text-white dark:border dark:border-[#2E4B7A] text-sm font-semibold hover:bg-[#162744] dark:hover:bg-[#233F6B] transition-colors shadow-xs cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 text-[#DDBB6A]" />
          إضافة إيراد جديد
        </button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="saas-card p-5 transition-colors hover:border-[#C8A24A]/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">إجمالي الإيرادات (حسب التصفية)</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[#15803D] dark:text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-[#15803D] dark:text-emerald-400">
            <AmountText amount={totalDisplayed} currency={displayCurrency} />
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono tabular-nums font-medium text-[#0B1526] dark:text-slate-200">{filtered.length}</span> عملية مسجلة
          </div>
        </div>

        <div className="saas-card p-5 transition-colors hover:border-[#C8A24A]/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">الدخل المتكرر / الدوري</span>
            <span className="w-8 h-8 rounded-lg bg-[#F4F6FA] dark:bg-[#132038] text-[#0B1526] dark:text-[#DDBB6A] flex items-center justify-center shrink-0">
              <Repeat className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-[#0B1526] dark:text-slate-100">
            <AmountText amount={recurringTotal} currency={displayCurrency} />
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            من <span className="font-mono tabular-nums font-medium">{incomes.filter((i) => i.recurring).length}</span> عمليات متكررة
          </div>
        </div>

        <div className="saas-card p-5 transition-colors hover:border-[#C8A24A]/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">متوسط قيمة العملية</span>
            <span className="w-8 h-8 rounded-lg bg-[#F8F2E2] dark:bg-[#231C0D] text-[#9E7B2C] dark:text-[#DDBB6A] flex items-center justify-center shrink-0">
              <Calculator className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-[#0B1526] dark:text-slate-100">
            <AmountText
              amount={filtered.length > 0 ? totalDisplayed / filtered.length : 0}
              currency={displayCurrency}
            />
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            محوّل لعملة {CURRENCY_LABELS[displayCurrency]}
          </div>
        </div>
      </div>

      {/* Quick Add Money By Income Category */}
      <section className="saas-card p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#0B1526] dark:text-slate-100">إضافة مال حسب فئة الدخل</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            اضغط على أيقونة (+) بجانب الفئة لإضافة إيراد جديد ضمنها مباشرة
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {INCOME_CATEGORIES.map((cat) => {
            const stat = categoryTotals[cat];
            const isSelected = categoryFilter === cat;
            return (
              <div
                key={cat}
                className={`rounded-xl border p-3.5 flex items-center justify-between gap-3 transition-all ${
                  isSelected
                    ? 'border-[#C8A24A] bg-[#F8F2E2]/50 dark:bg-[#241D0E]/75 shadow-2xs'
                    : 'border-[#EEF2F7] dark:border-[#172640] bg-[#F8FAFC] dark:bg-[#111E35] hover:bg-white dark:hover:bg-[#162744] hover:border-[#C8A24A]/60'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setCategoryFilter(isSelected ? 'all' : cat)}
                  className="flex items-center gap-3 min-w-0 flex-1 text-right cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#0B1526] dark:bg-[#1B2E4E] text-[#DDBB6A] flex items-center justify-center shrink-0">
                    <CategoryIcon kind="income" category={cat} className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#0B1526] dark:text-slate-100 truncate">
                      {INCOME_CATEGORY_LABELS[cat]}
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
                  aria-label={`إضافة مال لفئة ${INCOME_CATEGORY_LABELS[cat]}`}
                  title={`إضافة مال لفئة ${INCOME_CATEGORY_LABELS[cat]}`}
                  className="w-9 h-9 rounded-lg bg-[#C8A24A] text-[#0B1526] hover:bg-[#DDBB6A] flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Filters & Search */}
      <div className="saas-card overflow-hidden">
        <div className="p-4 border-b border-[#EEF1F6] dark:border-[#1B2B46] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالوصف أو مصدر الدخل..."
              aria-label="بحث في الإيرادات"
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
            {INCOME_CATEGORIES.map((cat) => (
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
                {INCOME_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Empty or Responsive List/Table */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={<TrendingUp className="w-5 h-5" />}
            title="لا توجد إيرادات مطابقة"
            description="سجّل مصدر دخل جديد أو غيّر معايير البحث والتصفية"
            actionLabel="إضافة أول إيراد"
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
                          {item.source} · {INCOME_CATEGORY_LABELS[item.category]}
                          {item.recurring && ' · دوري'}
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <div className="text-sm font-bold text-[#15803D] dark:text-emerald-400">
                          <AmountText amount={converted} currency={displayCurrency} showSign />
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
                          aria-label={`تعديل الإيراد ${item.title}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#182844] text-xs font-medium text-[#0B1526] dark:text-slate-100 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(item.id)}
                          aria-label={`حذف الإيراد ${item.title}`}
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
                    <th className="py-3 px-4">الإيراد والمصدر</th>
                    <th className="py-3 px-4">التصنيف</th>
                    <th className="py-3 px-4">التاريخ</th>
                    <th className="py-3 px-4">المبلغ الأصلي</th>
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
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.source}
                            {item.recurring && ' · دخل دوري'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {INCOME_CATEGORY_LABELS[item.category]}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          <span dir="ltr" className="font-mono tabular-nums">
                            {item.date}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          <AmountText amount={item.amount} currency={item.currency} />
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-[#15803D] dark:text-emerald-400 whitespace-nowrap">
                          <AmountText amount={converted} currency={displayCurrency} showSign />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              aria-label={`تعديل الإيراد ${item.title}`}
                              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#0B1526] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2B4A] transition-colors cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(item.id)}
                              aria-label={`حذف الإيراد ${item.title}`}
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
        title={editingId ? 'تعديل سجل الإيراد' : 'إضافة إيراد جديد'}
        subtitle="سيتم تحديث التدفق النقدي والتقارير تلقائياً فور الحفظ"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-[#B91C1C] dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="inc-title" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              عنوان الإيراد
            </label>
            <input
              id="inc-title"
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="مثال: الراتب الشهري أو أرباح مشروع"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#C8A24A]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="inc-source" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                مصدر الدخل
              </label>
              <input
                id="inc-source"
                type="text"
                required
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                placeholder="مثال: اسم الشركة أو العقار"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#C8A24A]"
              />
            </div>

            <div>
              <label htmlFor="inc-category" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                التصنيف
              </label>
              <select
                id="inc-category"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value as IncomeCategory }))
                }
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 focus:outline-none focus:border-[#C8A24A]"
              >
                {INCOME_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {INCOME_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="inc-amount" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                المبلغ
              </label>
              <input
                id="inc-amount"
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
              <label htmlFor="inc-currency" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                العملة
              </label>
              <select
                id="inc-currency"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label htmlFor="inc-date" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                التاريخ
              </label>
              <input
                id="inc-date"
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 focus:outline-none focus:border-[#C8A24A]"
              />
            </div>

            <label className="flex items-center gap-2.5 pt-5 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.recurring}
                onChange={(e) => setForm((f) => ({ ...f, recurring: e.target.checked }))}
                className="w-4 h-4 accent-[#0B1526] dark:accent-[#C8A24A] rounded"
              />
              دخل دوري متكرر
            </label>
          </div>

          <div>
            <label htmlFor="inc-notes" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              ملاحظات (اختياري)
            </label>
            <textarea
              id="inc-notes"
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
              className="px-5 py-2.5 rounded-lg bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526] text-sm font-semibold hover:bg-[#162744] dark:hover:bg-[#DDBB6A] transition-colors cursor-pointer"
            >
              {editingId ? 'حفظ التعديلات' : 'إضافة الإيراد'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
