import React, { useMemo, useState } from 'react';
import { Briefcase, CheckCircle2, CreditCard, Landmark, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import {
  AssetCategory,
  AssetRecord,
  Currency,
  LiabilityCategory,
  LiabilityRecord,
  PendingModalAction,
  WealthState,
} from '../types/wealth';
import {
  ASSET_CATEGORY_LABELS,
  CURRENCY_SHORT_LABELS,
  LIABILITY_CATEGORY_LABELS,
} from '../data/labels';
import {
  calculateWealthSummary,
  convertCurrency,
  generateId,
} from '../utils/finance';
import { AmountText } from './AmountText';
import { CategoryIcon } from './CategoryIcon';
import { EmptyState } from './EmptyState';
import { Modal } from './Modal';

interface AssetsLiabilitiesViewProps {
  state: WealthState;
  onAddAsset: (record: AssetRecord) => void;
  onUpdateAsset: (record: AssetRecord) => void;
  onDeleteAsset: (id: string) => void;
  onAddLiability: (record: LiabilityRecord) => void;
  onUpdateLiability: (record: LiabilityRecord) => void;
  onDeleteLiability: (id: string) => void;
  pendingAction?: PendingModalAction;
  onActionHandled?: () => void;
}

const ASSET_CATEGORIES = Object.keys(ASSET_CATEGORY_LABELS) as AssetCategory[];
const LIABILITY_CATEGORIES = Object.keys(LIABILITY_CATEGORY_LABELS) as LiabilityCategory[];

export const AssetsLiabilitiesView: React.FC<AssetsLiabilitiesViewProps> = ({
  state,
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
  onAddLiability,
  onUpdateLiability,
  onDeleteLiability,
  pendingAction,
  onActionHandled,
}) => {
  const { displayCurrency, exchangeRateIQDPerUSD } = state.settings;
  const summary = calculateWealthSummary(state);

  const [activeTab, setActiveTab] = useState<'assets' | 'liabilities'>('assets');

  // Asset modal state
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [assetForm, setAssetForm] = useState({
    name: '',
    category: 'bank' as AssetCategory,
    value: '',
    currency: displayCurrency as Currency,
    liquid: true,
    updatedAt: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [assetError, setAssetError] = useState('');

  // Liability modal state
  const [liabilityModalOpen, setLiabilityModalOpen] = useState(false);
  const [editingLiabilityId, setEditingLiabilityId] = useState<string | null>(null);
  const [liabilityForm, setLiabilityForm] = useState({
    name: '',
    category: 'bank_loan' as LiabilityCategory,
    remainingAmount: '',
    monthlyPayment: '',
    currency: displayCurrency as Currency,
    dueDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [liabilityError, setLiabilityError] = useState('');

  const openCreateAsset = React.useCallback(
    (defaultCategory?: AssetCategory) => {
      const cat = defaultCategory ?? 'bank';
      setActiveTab('assets');
      setEditingAssetId(null);
      setAssetForm({
        name: '',
        category: cat,
        value: '',
        currency: displayCurrency,
        liquid: cat === 'cash' || cat === 'bank',
        updatedAt: new Date().toISOString().slice(0, 10),
        notes: '',
      });
      setAssetError('');
      setAssetModalOpen(true);
    },
    [displayCurrency]
  );

  const openEditAsset = React.useCallback((record: AssetRecord) => {
    setActiveTab('assets');
    setEditingAssetId(record.id);
    setAssetForm({
      name: record.name,
      category: record.category,
      value: String(record.value),
      currency: record.currency,
      liquid: record.liquid,
      updatedAt: record.updatedAt,
      notes: record.notes ?? '',
    });
    setAssetError('');
    setAssetModalOpen(true);
  }, []);

  const openCreateLiability = React.useCallback(
    (defaultCategory?: LiabilityCategory) => {
      setActiveTab('liabilities');
      setEditingLiabilityId(null);
      setLiabilityForm({
        name: '',
        category: defaultCategory ?? 'bank_loan',
        remainingAmount: '',
        monthlyPayment: '',
        currency: displayCurrency,
        dueDate: new Date().toISOString().slice(0, 10),
        notes: '',
      });
      setLiabilityError('');
      setLiabilityModalOpen(true);
    },
    [displayCurrency]
  );

  const openEditLiability = React.useCallback((record: LiabilityRecord) => {
    setActiveTab('liabilities');
    setEditingLiabilityId(record.id);
    setLiabilityForm({
      name: record.name,
      category: record.category,
      remainingAmount: String(record.remainingAmount),
      monthlyPayment: String(record.monthlyPayment),
      currency: record.currency,
      dueDate: record.dueDate,
      notes: record.notes ?? '',
    });
    setLiabilityError('');
    setLiabilityModalOpen(true);
  }, []);

  React.useEffect(() => {
    if (!pendingAction || pendingAction.section !== 'assets') return;

    if (pendingAction.mode === 'create') {
      if (pendingAction.tab === 'assets') {
        openCreateAsset(pendingAction.category);
      } else {
        openCreateLiability(pendingAction.category);
      }
    } else if (pendingAction.mode === 'edit') {
      if (pendingAction.tab === 'assets') {
        const target = state.assets.find((a) => a.id === pendingAction.recordId);
        if (target) openEditAsset(target);
      } else {
        const target = state.liabilities.find((l) => l.id === pendingAction.recordId);
        if (target) openEditLiability(target);
      }
    }
    onActionHandled?.();
  }, [
    pendingAction,
    state.assets,
    state.liabilities,
    openCreateAsset,
    openEditAsset,
    openCreateLiability,
    openEditLiability,
    onActionHandled,
  ]);

  const assetCategoryTotals = useMemo(() => {
    const map: Record<AssetCategory, { total: number; count: number }> = {
      cash: { total: 0, count: 0 },
      bank: { total: 0, count: 0 },
      property: { total: 0, count: 0 },
      vehicle: { total: 0, count: 0 },
      valuables: { total: 0, count: 0 },
      other: { total: 0, count: 0 },
    };
    for (const item of state.assets) {
      map[item.category].count += 1;
      map[item.category].total += convertCurrency(
        item.value,
        item.currency,
        displayCurrency,
        exchangeRateIQDPerUSD
      );
    }
    return map;
  }, [state.assets, displayCurrency, exchangeRateIQDPerUSD]);

  const liabilityCategoryTotals = useMemo(() => {
    const map: Record<LiabilityCategory, { total: number; count: number }> = {
      mortgage: { total: 0, count: 0 },
      bank_loan: { total: 0, count: 0 },
      installments: { total: 0, count: 0 },
      credit_card: { total: 0, count: 0 },
      personal_debt: { total: 0, count: 0 },
      other: { total: 0, count: 0 },
    };
    for (const item of state.liabilities) {
      map[item.category].count += 1;
      map[item.category].total += convertCurrency(
        item.remainingAmount,
        item.currency,
        displayCurrency,
        exchangeRateIQDPerUSD
      );
    }
    return map;
  }, [state.liabilities, displayCurrency, exchangeRateIQDPerUSD]);

  const handleAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericVal = Number(assetForm.value);
    if (!assetForm.name.trim()) {
      setAssetError('يرجى إدخال اسم الأصل.');
      return;
    }
    if (!Number.isFinite(numericVal) || numericVal <= 0) {
      setAssetError('يرجى إدخال قيمة صحيحة أكبر من صفر.');
      return;
    }

    const payload: AssetRecord = {
      id: editingAssetId ?? generateId('ast'),
      name: assetForm.name.trim(),
      category: assetForm.category,
      value: numericVal,
      currency: assetForm.currency,
      liquid: assetForm.liquid,
      updatedAt: assetForm.updatedAt,
      notes: assetForm.notes.trim() || undefined,
    };

    if (editingAssetId) {
      onUpdateAsset(payload);
    } else {
      onAddAsset(payload);
    }
    setAssetModalOpen(false);
  };

  const handleLiabilitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const remaining = Number(liabilityForm.remainingAmount);
    const monthly = Number(liabilityForm.monthlyPayment || 0);
    if (!liabilityForm.name.trim()) {
      setLiabilityError('يرجى إدخال اسم الالتزام أو القرض.');
      return;
    }
    if (!Number.isFinite(remaining) || remaining <= 0) {
      setLiabilityError('يرجى إدخال الرصيد المتبقي بشكل صحيح.');
      return;
    }
    if (!Number.isFinite(monthly) || monthly < 0) {
      setLiabilityError('قيمة القسط الشهري غير صالحة.');
      return;
    }

    const payload: LiabilityRecord = {
      id: editingLiabilityId ?? generateId('lib'),
      name: liabilityForm.name.trim(),
      category: liabilityForm.category,
      remainingAmount: remaining,
      monthlyPayment: monthly,
      currency: liabilityForm.currency,
      dueDate: liabilityForm.dueDate,
      notes: liabilityForm.notes.trim() || undefined,
    };

    if (editingLiabilityId) {
      onUpdateLiability(payload);
    } else {
      onAddLiability(payload);
    }
    setLiabilityModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B1526] dark:text-slate-100">الميزانية الشخصية: الأصول والالتزامات</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            تقييم الحسابات النقدية، الممتلكات العينية، والقروض لحساب صافي الثروة بدقة
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => openCreateAsset()}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#0B1526] dark:bg-[#1B3154] dark:border dark:border-[#2E4B7A] text-white text-sm font-semibold hover:bg-[#162744] dark:hover:bg-[#233F6B] transition-colors shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-[#DDBB6A]" />
            إضافة أصل
          </button>
          <button
            type="button"
            onClick={() => openCreateLiability()}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white dark:bg-[#132038] border border-[#D4DAE6] dark:border-[#283B5E] text-[#0B1526] dark:text-slate-100 text-sm font-medium hover:bg-slate-50 dark:hover:bg-[#1A2B4A] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 text-[#B91C1C] dark:text-red-400" />
            إضافة التزام
          </button>
        </div>
      </div>

      {/* Balance Sheet Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="saas-card p-5 transition-colors hover:border-[#C8A24A]/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">الأصول النقدية والعينية</span>
            <span className="w-8 h-8 rounded-lg bg-[#F4F6FA] dark:bg-[#132038] text-[#0B1526] dark:text-[#DDBB6A] flex items-center justify-center shrink-0">
              <Landmark className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-xl font-bold text-[#0B1526] dark:text-slate-100">
            <AmountText amount={summary.totalNonInvestmentAssets} currency={displayCurrency} />
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            منها سيولة فورية: <AmountText amount={summary.totalLiquidAssets} currency={displayCurrency} compact />
          </div>
        </div>

        <div className="saas-card p-5 transition-colors hover:border-[#C8A24A]/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">قيمة المحفظة الاستثمارية</span>
            <span className="w-8 h-8 rounded-lg bg-[#F8F2E2] dark:bg-[#231C0D] text-[#9E7B2C] dark:text-[#DDBB6A] flex items-center justify-center shrink-0">
              <Briefcase className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-xl font-bold text-[#9E7B2C] dark:text-[#DDBB6A]">
            <AmountText amount={summary.totalInvestmentsValue} currency={displayCurrency} />
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            تُضاف تلقائياً لإجمالي الأصول
          </div>
        </div>

        <div className="saas-card p-5 transition-colors hover:border-[#C8A24A]/50">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">إجمالي الالتزامات والديون</span>
            <span className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-[#B91C1C] dark:text-red-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-xl font-bold text-[#B91C1C] dark:text-red-400">
            <AmountText amount={summary.totalLiabilities} currency={displayCurrency} />
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            نسبة الدين للأصول:{' '}
            <span className="font-mono tabular-nums font-semibold text-[#0B1526] dark:text-slate-100">
              {summary.debtToAssetRatioPct.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="hero-wealth-surface rounded-2xl text-white border border-[#1E3256] p-5 shadow-md">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#DDBB6A]">صافي الثروة (الأصول - الالتزامات)</span>
            <span className="w-8 h-8 rounded-lg bg-white/10 text-[#DDBB6A] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-xl font-bold text-white">
            <AmountText amount={summary.netWorth} currency={displayCurrency} />
          </div>
          <div className="mt-1 text-xs text-slate-300">
            إجمالي الأصول: <AmountText amount={summary.totalAssets} currency={displayCurrency} compact />
          </div>
        </div>
      </div>

      {/* Category Quick Add Section */}
      <section className="saas-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-[#0B1526] dark:text-slate-100">
              {activeTab === 'assets'
                ? 'إضافة مال أو أصل حسب الفئة'
                : 'إضافة التزام مالي حسب الفئة'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              اضغط على أيقونة (+) بجانب أي فئة لتسجيل قيمة جديدة ضمنها مباشرة
            </p>
          </div>
        </div>

        {activeTab === 'assets' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ASSET_CATEGORIES.map((cat) => {
              const stat = assetCategoryTotals[cat];
              return (
                <div
                  key={cat}
                  className="saas-subcard hover:bg-white dark:hover:bg-[#162744] hover:border-[#C8A24A]/60 p-3.5 flex items-center justify-between gap-3 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#0B1526] dark:bg-[#1A2B4A] text-[#DDBB6A] flex items-center justify-center shrink-0">
                      <CategoryIcon kind="asset" category={cat} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#0B1526] dark:text-slate-100 truncate">
                        {ASSET_CATEGORY_LABELS[cat]}
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
                  </div>
                  <button
                    type="button"
                    onClick={() => openCreateAsset(cat)}
                    aria-label={`إضافة مال لفئة ${ASSET_CATEGORY_LABELS[cat]}`}
                    title={`إضافة مال لفئة ${ASSET_CATEGORY_LABELS[cat]}`}
                    className="w-9 h-9 rounded-lg bg-[#C8A24A] text-[#0B1526] hover:bg-[#DDBB6A] flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {LIABILITY_CATEGORIES.map((cat) => {
              const stat = liabilityCategoryTotals[cat];
              return (
                <div
                  key={cat}
                  className="saas-subcard hover:bg-white dark:hover:bg-[#162744] hover:border-[#C8A24A]/60 p-3.5 flex items-center justify-between gap-3 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#0B1526] dark:bg-[#1A2B4A] text-[#DDBB6A] flex items-center justify-center shrink-0">
                      <CategoryIcon kind="liability" category={cat} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#0B1526] dark:text-slate-100 truncate">
                        {LIABILITY_CATEGORY_LABELS[cat]}
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
                  </div>
                  <button
                    type="button"
                    onClick={() => openCreateLiability(cat)}
                    aria-label={`إضافة مال لفئة ${LIABILITY_CATEGORY_LABELS[cat]}`}
                    title={`إضافة التزام لفئة ${LIABILITY_CATEGORY_LABELS[cat]}`}
                    className="w-9 h-9 rounded-lg bg-[#C8A24A] text-[#0B1526] hover:bg-[#DDBB6A] flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Tabbed Table Card */}
      <div className="saas-card overflow-hidden">
        <div className="p-4 border-b border-[#EEF1F6] dark:border-[#1B2B46] flex items-center justify-between gap-4">
          <div className="inline-flex p-1 rounded-lg bg-slate-100 dark:bg-[#132038]" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'assets'}
              onClick={() => setActiveTab('assets')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'assets'
                  ? 'bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526]'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1526] dark:hover:text-white'
              }`}
            >
              الأصول ({state.assets.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'liabilities'}
              onClick={() => setActiveTab('liabilities')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'liabilities'
                  ? 'bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526]'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1526] dark:hover:text-white'
              }`}
            >
              الالتزامات والديون ({state.liabilities.length})
            </button>
          </div>
        </div>

        {activeTab === 'assets' ? (
          state.assets.length === 0 ? (
            <EmptyState
              icon={<Landmark className="w-5 h-5" />}
              title="لا توجد أصول شخصية مسجلة بعد"
              description="أضف حساباتك النقدية والبنكية وممتلكاتك لاحتساب صافي ثروتك"
              actionLabel="إضافة أول أصل"
              onAction={() => openCreateAsset()}
            />
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-[#EEF1F6] dark:divide-[#1B2B46]">
                {state.assets.map((asset) => {
                  const converted = convertCurrency(
                    asset.value,
                    asset.currency,
                    displayCurrency,
                    exchangeRateIQDPerUSD
                  );
                  return (
                    <div key={asset.id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-[#0B1526] dark:text-slate-100">
                            {asset.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {ASSET_CATEGORY_LABELS[asset.category]} ·{' '}
                            {asset.liquid ? 'أصل سائل' : 'أصل ثابت'}
                          </div>
                        </div>
                        <div className="text-left shrink-0">
                          <div className="text-sm font-bold text-[#0B1526] dark:text-slate-100">
                            <AmountText amount={converted} currency={displayCurrency} />
                          </div>
                          {asset.currency !== displayCurrency && (
                            <div className="text-[11px] text-slate-400 dark:text-slate-500">
                              <AmountText amount={asset.value} currency={asset.currency} />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span dir="ltr" className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          {asset.updatedAt}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditAsset(asset)}
                            aria-label={`تعديل الأصل ${asset.name}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#132038] text-xs font-medium text-[#0B1526] dark:text-slate-100 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteAsset(asset.id)}
                            aria-label={`حذف الأصل ${asset.name}`}
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
                      <th className="py-3 px-4">اسم الأصل</th>
                      <th className="py-3 px-4">التصنيف</th>
                      <th className="py-3 px-4">السيولة</th>
                      <th className="py-3 px-4">آخر تحديث</th>
                      <th className="py-3 px-4">
                        القيمة ({CURRENCY_SHORT_LABELS[displayCurrency]})
                      </th>
                      <th className="py-3 px-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF1F6] dark:divide-[#1B2B46] text-sm">
                    {state.assets.map((asset) => {
                      const converted = convertCurrency(
                        asset.value,
                        asset.currency,
                        displayCurrency,
                        exchangeRateIQDPerUSD
                      );
                      return (
                        <tr key={asset.id} className="hover:bg-[#FAFBFD] dark:hover:bg-[#13223C] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-[#0B1526] dark:text-slate-100">{asset.name}</div>
                            {asset.notes && (
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{asset.notes}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {ASSET_CATEGORY_LABELS[asset.category]}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {asset.liquid ? 'أصل سائل' : 'أصل ثابت'}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            <span dir="ltr" className="font-mono tabular-nums">
                              {asset.updatedAt}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold text-[#0B1526] dark:text-slate-100 whitespace-nowrap">
                            <AmountText amount={converted} currency={displayCurrency} />
                            {asset.currency !== displayCurrency && (
                              <div className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                                <AmountText amount={asset.value} currency={asset.currency} />
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditAsset(asset)}
                                aria-label={`تعديل الأصل ${asset.name}`}
                                className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#0B1526] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2B4A] cursor-pointer"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteAsset(asset.id)}
                                aria-label={`حذف الأصل ${asset.name}`}
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
          )
        ) : state.liabilities.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="w-5 h-5" />}
            title="لا توجد التزامات أو ديون مسجلة"
            description="وضع مالي ممتاز! يمكنك إضافة أي قرض أو قسط مستقبلي لمتابعته هنا"
            actionLabel="إضافة التزام"
            onAction={() => openCreateLiability()}
          />
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-[#EEF1F6] dark:divide-[#1A2844]">
              {state.liabilities.map((lib) => {
                const remainingConverted = convertCurrency(
                  lib.remainingAmount,
                  lib.currency,
                  displayCurrency,
                  exchangeRateIQDPerUSD
                );
                return (
                  <div key={lib.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-[#0B1526] dark:text-slate-100">
                          {lib.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {LIABILITY_CATEGORY_LABELS[lib.category]} · قسط{' '}
                          <AmountText amount={lib.monthlyPayment} currency={lib.currency} />
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <div className="text-sm font-bold text-[#B91C1C] dark:text-red-400">
                          <AmountText amount={remainingConverted} currency={displayCurrency} />
                        </div>
                        {lib.currency !== displayCurrency && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">
                            <AmountText amount={lib.remainingAmount} currency={lib.currency} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span dir="ltr" className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {lib.dueDate}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditLiability(lib)}
                          aria-label={`تعديل الالتزام ${lib.name}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#132038] text-xs font-medium text-[#0B1526] dark:text-slate-100 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteLiability(lib.id)}
                          aria-label={`حذف الالتزام ${lib.name}`}
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
                  <tr className="border-b border-[#EEF1F6] dark:border-[#1E2E4A] bg-[#F8FAFC] dark:bg-[#111E35] text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">الالتزام / الدين</th>
                    <th className="py-3 px-4">التصنيف</th>
                    <th className="py-3 px-4">القسط الشهري</th>
                    <th className="py-3 px-4">تاريخ الاستحقاق</th>
                    <th className="py-3 px-4">
                      الرصيد المتبقي ({CURRENCY_SHORT_LABELS[displayCurrency]})
                    </th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF1F6] dark:divide-[#1A2844] text-sm">
                  {state.liabilities.map((lib) => {
                    const remainingConverted = convertCurrency(
                      lib.remainingAmount,
                      lib.currency,
                      displayCurrency,
                      exchangeRateIQDPerUSD
                    );
                    return (
                      <tr key={lib.id} className="hover:bg-[#FAFBFD] dark:hover:bg-[#121F36] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-[#0B1526] dark:text-slate-100">{lib.name}</div>
                          {lib.notes && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{lib.notes}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {LIABILITY_CATEGORY_LABELS[lib.category]}
                        </td>
                        <td className="py-3.5 px-4 text-right text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          <AmountText amount={lib.monthlyPayment} currency={lib.currency} />
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          <span dir="ltr" className="font-mono tabular-nums">
                            {lib.dueDate}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-[#B91C1C] dark:text-red-400 whitespace-nowrap">
                          <AmountText amount={remainingConverted} currency={displayCurrency} />
                          {lib.currency !== displayCurrency && (
                            <div className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                              <AmountText amount={lib.remainingAmount} currency={lib.currency} />
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditLiability(lib)}
                              aria-label={`تعديل الالتزام ${lib.name}`}
                              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-[#0B1526] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2B4A] cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteLiability(lib.id)}
                              aria-label={`حذف الالتزام ${lib.name}`}
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

      {/* Asset Modal */}
      <Modal
        open={assetModalOpen}
        onClose={() => setAssetModalOpen(false)}
        title={editingAssetId ? 'تعديل بيانات الأصل' : 'إضافة أصل جديد'}
        subtitle="يُحتسب الأصل تلقائياً ضمن إجمالي الأصول وصافي الثروة"
      >
        <form onSubmit={handleAssetSubmit} className="space-y-4">
          {assetError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-xs text-[#B91C1C] dark:text-red-300"
            >
              {assetError}
            </div>
          )}
          <div>
            <label htmlFor="ast-name" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              اسم الأصل
            </label>
            <input
              id="ast-name"
              type="text"
              required
              value={assetForm.name}
              onChange={(e) => setAssetForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثال: حساب توفير بنكي أو عقار شخصي"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#C8A24A]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ast-cat" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                التصنيف
              </label>
              <select
                id="ast-cat"
                value={assetForm.category}
                onChange={(e) =>
                  setAssetForm((f) => ({ ...f, category: e.target.value as AssetCategory }))
                }
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 focus:outline-none focus:border-[#C8A24A]"
              >
                {ASSET_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {ASSET_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ast-date" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                تاريخ التقييم
              </label>
              <input
                id="ast-date"
                type="date"
                required
                value={assetForm.updatedAt}
                onChange={(e) => setAssetForm((f) => ({ ...f, updatedAt: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 focus:outline-none focus:border-[#C8A24A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="ast-val" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                القيمة التقديرية الحالية
              </label>
              <input
                id="ast-val"
                type="number"
                step="any"
                min="0"
                required
                value={assetForm.value}
                onChange={(e) => setAssetForm((f) => ({ ...f, value: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 focus:outline-none focus:border-[#C8A24A]"
              />
            </div>
            <div>
              <label htmlFor="ast-cur" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                العملة
              </label>
              <select
                id="ast-cur"
                value={assetForm.currency}
                onChange={(e) =>
                  setAssetForm((f) => ({ ...f, currency: e.target.value as Currency }))
                }
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 focus:outline-none focus:border-[#C8A24A]"
              >
                <option value="IQD">دينار عراقي</option>
                <option value="USD">دولار أمريكي</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={assetForm.liquid}
              onChange={(e) => setAssetForm((f) => ({ ...f, liquid: e.target.checked }))}
              className="w-4 h-4 accent-[#0B1526] dark:accent-[#C8A24A] rounded"
            />
            أصل سائل (نقد أو رصيد بنكي متاح فوراً للطوارئ)
          </label>

          <div>
            <label htmlFor="ast-notes" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              ملاحظات (اختياري)
            </label>
            <textarea
              id="ast-notes"
              rows={2}
              value={assetForm.notes}
              onChange={(e) => setAssetForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#C8A24A]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EEF1F6] dark:border-[#1E2E4A]">
            <button
              type="button"
              onClick={() => setAssetModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-[#0B1526] dark:hover:text-slate-200 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526] text-sm font-semibold hover:bg-[#162744] dark:hover:bg-[#DDBB6A] cursor-pointer transition-colors"
            >
              {editingAssetId ? 'حفظ التعديلات' : 'إضافة الأصل'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Liability Modal */}
      <Modal
        open={liabilityModalOpen}
        onClose={() => setLiabilityModalOpen(false)}
        title={editingLiabilityId ? 'تعديل الالتزام' : 'إضافة التزام أو دين جديد'}
        subtitle="يُخصم الرصيد المتبقي تلقائياً عند حساب صافي الثروة"
      >
        <form onSubmit={handleLiabilitySubmit} className="space-y-4">
          {liabilityError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-xs text-[#B91C1C] dark:text-red-300"
            >
              {liabilityError}
            </div>
          )}
          <div>
            <label htmlFor="lib-name" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              اسم الالتزام أو الجهة الدائنة
            </label>
            <input
              id="lib-name"
              type="text"
              required
              value={liabilityForm.name}
              onChange={(e) => setLiabilityForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثال: قرض سكني أو أقساط سيارة"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#C8A24A]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="lib-cat" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                التصنيف
              </label>
              <select
                id="lib-cat"
                value={liabilityForm.category}
                onChange={(e) =>
                  setLiabilityForm((f) => ({
                    ...f,
                    category: e.target.value as LiabilityCategory,
                  }))
                }
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 focus:outline-none focus:border-[#C8A24A]"
              >
                {LIABILITY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {LIABILITY_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="lib-due" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                تاريخ السداد المستهدف
              </label>
              <input
                id="lib-due"
                type="date"
                required
                value={liabilityForm.dueDate}
                onChange={(e) => setLiabilityForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 focus:outline-none focus:border-[#C8A24A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="lib-rem" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                الرصيد المتبقي
              </label>
              <input
                id="lib-rem"
                type="number"
                step="any"
                min="0"
                required
                value={liabilityForm.remainingAmount}
                onChange={(e) =>
                  setLiabilityForm((f) => ({ ...f, remainingAmount: e.target.value }))
                }
                className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 focus:outline-none focus:border-[#C8A24A]"
              />
            </div>
            <div>
              <label htmlFor="lib-monthly" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                القسط الشهري
              </label>
              <input
                id="lib-monthly"
                type="number"
                step="any"
                min="0"
                value={liabilityForm.monthlyPayment}
                onChange={(e) =>
                  setLiabilityForm((f) => ({ ...f, monthlyPayment: e.target.value }))
                }
                className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 focus:outline-none focus:border-[#C8A24A]"
              />
            </div>
            <div>
              <label htmlFor="lib-cur" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                العملة
              </label>
              <select
                id="lib-cur"
                value={liabilityForm.currency}
                onChange={(e) =>
                  setLiabilityForm((f) => ({ ...f, currency: e.target.value as Currency }))
                }
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 focus:outline-none focus:border-[#C8A24A]"
              >
                <option value="IQD">دينار عراقي</option>
                <option value="USD">دولار أمريكي</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="lib-notes" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              ملاحظات (اختياري)
            </label>
            <textarea
              id="lib-notes"
              rows={2}
              value={liabilityForm.notes}
              onChange={(e) => setLiabilityForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#0A1323] text-[#0B1526] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#C8A24A]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EEF1F6] dark:border-[#1E2E4A]">
            <button
              type="button"
              onClick={() => setLiabilityModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-[#0B1526] dark:hover:text-slate-200 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526] text-sm font-semibold hover:bg-[#162744] dark:hover:bg-[#DDBB6A] cursor-pointer transition-colors"
            >
              {editingLiabilityId ? 'حفظ التعديلات' : 'إضافة الالتزام'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
