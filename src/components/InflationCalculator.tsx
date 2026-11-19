import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Currency } from '../types/wealth';
import { CURRENCY_LABELS } from '../data/labels';
import { convertCurrency, formatMoney } from '../utils/finance';
import { calculatePurchasingPower } from '../utils/inflation';
import { AmountText } from './AmountText';

interface InflationCalculatorProps {
  displayCurrency: Currency;
  exchangeRateIQDPerUSD: number;
  netWorthInDisplay: number;
  liquidAssetsInDisplay: number;
  investmentsInDisplay: number;
  isDark?: boolean;
}

const INFLATION_PRESETS = [
  { label: 'منخفض 2.5%', value: 2.5 },
  { label: 'متوسط 5%', value: 5 },
  { label: 'مرتفع 10%', value: 10 },
  { label: 'حاد 18%', value: 18 },
];

const YEAR_PRESETS = [5, 10, 15, 20];

export const InflationCalculator: React.FC<InflationCalculatorProps> = ({
  displayCurrency,
  exchangeRateIQDPerUSD,
  netWorthInDisplay,
  liquidAssetsInDisplay,
  investmentsInDisplay,
  isDark = false,
}) => {
  const defaultAmount = (cur: Currency) => (cur === 'IQD' ? 15_000_000 : 10_000);

  const [calcCurrency, setCalcCurrency] = useState<Currency>(displayCurrency);
  const [amountInput, setAmountInput] = useState<string>(() =>
    String(
      netWorthInDisplay > 0
        ? Math.round(netWorthInDisplay)
        : defaultAmount(displayCurrency)
    )
  );
  const [inflationRate, setInflationRate] = useState<number>(6);
  const [returnRate, setReturnRate] = useState<number>(8);
  const [years, setYears] = useState<number>(10);
  const [showTable, setShowTable] = useState<boolean>(false);

  // Sync currency when user switches global display currency in sidebar
  useEffect(() => {
    setCalcCurrency((prev) => {
      if (prev === displayCurrency) return prev;
      const numeric = Number(amountInput);
      if (Number.isFinite(numeric) && numeric > 0) {
        const converted = convertCurrency(
          numeric,
          prev,
          displayCurrency,
          exchangeRateIQDPerUSD
        );
        setAmountInput(String(displayCurrency === 'IQD' ? Math.round(converted) : Math.round(converted * 100) / 100));
      } else {
        setAmountInput(String(defaultAmount(displayCurrency)));
      }
      return displayCurrency;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayCurrency, exchangeRateIQDPerUSD]);

  const handleLocalCurrencySwitch = (nextCurrency: Currency) => {
    if (nextCurrency === calcCurrency) return;
    const numeric = Number(amountInput);
    if (Number.isFinite(numeric) && numeric > 0) {
      const converted = convertCurrency(
        numeric,
        calcCurrency,
        nextCurrency,
        exchangeRateIQDPerUSD
      );
      setAmountInput(
        String(
          nextCurrency === 'IQD'
            ? Math.round(converted)
            : Math.round(converted * 100) / 100
        )
      );
    } else {
      setAmountInput(String(defaultAmount(nextCurrency)));
    }
    setCalcCurrency(nextCurrency);
  };

  const applyWealthPreset = (amountInDisplay: number) => {
    if (amountInDisplay <= 0) return;
    const targetVal = convertCurrency(
      amountInDisplay,
      displayCurrency,
      calcCurrency,
      exchangeRateIQDPerUSD
    );
    setAmountInput(
      String(
        calcCurrency === 'IQD'
          ? Math.round(targetVal)
          : Math.round(targetVal * 100) / 100
      )
    );
  };

  const numericAmount = useMemo(() => {
    const parsed = Number(amountInput);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }, [amountInput]);

  const result = useMemo(
    () =>
      calculatePurchasingPower({
        amount: numericAmount,
        currency: calcCurrency,
        annualInflationRatePct: inflationRate,
        annualNominalReturnPct: returnRate,
        years,
      }),
    [numericAmount, calcCurrency, inflationRate, returnRate, years]
  );

  const milestoneRows = useMemo(() => {
    if (result.yearlySeries.length <= 11) {
      return result.yearlySeries.filter((p) => p.year > 0);
    }
    return result.yearlySeries.filter(
      (p) => p.year === 1 || p.year % 5 === 0 || p.year === result.input.years
    );
  }, [result]);

  const hasPortfolioPresets =
    netWorthInDisplay > 0 || liquidAssetsInDisplay > 0 || investmentsInDisplay > 0;

  return (
    <section
      aria-label="حاسبة القوة الشرائية وتأثير التضخم"
      data-testid="inflation-calculator-section"
      className="saas-card p-6 space-y-6"
    >
      {/* Header & Currency Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#EEF1F6] dark:border-[#1B2B46]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0B1526] dark:bg-[#162744] border border-[#C8A24A]/30 flex items-center justify-center shrink-0">
            <Calculator className="w-5 h-5 text-[#DDBB6A]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#0B1526] dark:text-slate-100">
              حاسبة القوة الشرائية وتأثير التضخم
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              قياس تآكل القوة الشرائية للدينار العراقي أو الدولار بمرور الوقت ومقارنة النقد الساكن بالعائد الاستثماري
            </p>
          </div>
        </div>

        <div
          className="inline-flex p-1 rounded-xl bg-[#F1F5F9] dark:bg-[#08101E] border border-[#E2E8F0] dark:border-[#1E2E4A] self-start lg:self-auto shrink-0"
          role="group"
          aria-label="عملة حاسبة القوة الشرائية"
        >
          <button
            type="button"
            onClick={() => handleLocalCurrencySwitch('IQD')}
            data-testid="inflation-currency-iqd"
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              calcCurrency === 'IQD'
                ? 'bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526] shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1526] dark:hover:text-white'
            }`}
          >
            دينار عراقي (IQD)
          </button>
          <button
            type="button"
            onClick={() => handleLocalCurrencySwitch('USD')}
            data-testid="inflation-currency-usd"
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              calcCurrency === 'USD'
                ? 'bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526] shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1526] dark:hover:text-white'
            }`}
          >
            دولار أمريكي (USD)
          </button>
        </div>
      </div>

      {/* Controls + Chart Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Interactive Controls */}
        <div className="xl:col-span-5 space-y-5">
          {/* Amount Input */}
          <div className="saas-subcard p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="inflation-amount"
                className="text-xs font-semibold text-[#0B1526] dark:text-slate-200"
              >
                المبلغ المدّخر أو المستثمر ({CURRENCY_LABELS[calcCurrency]})
              </label>
              <span className="text-[11px] font-medium text-[#9E7B2C] dark:text-[#DDBB6A]">
                <AmountText amount={numericAmount} currency={calcCurrency} compact />
              </span>
            </div>

            <input
              id="inflation-amount"
              data-testid="inflation-amount-input"
              type="number"
              min="0"
              step="any"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="saas-input px-3.5 py-2.5 text-sm font-mono tabular-nums"
            />

            {hasPortfolioPresets && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">تعبئة من محفظتك:</span>
                {netWorthInDisplay > 0 && (
                  <button
                    type="button"
                    onClick={() => applyWealthPreset(netWorthInDisplay)}
                    className="px-2 py-1 rounded-md bg-white dark:bg-[#0D172A] border border-[#DCE1EC] dark:border-[#243656] text-[11px] font-medium text-[#0B1526] dark:text-slate-200 hover:border-[#C8A24A] cursor-pointer"
                  >
                    صافي الثروة
                  </button>
                )}
                {liquidAssetsInDisplay > 0 && (
                  <button
                    type="button"
                    onClick={() => applyWealthPreset(liquidAssetsInDisplay)}
                    className="px-2 py-1 rounded-md bg-white dark:bg-[#0D172A] border border-[#DCE1EC] dark:border-[#243656] text-[11px] font-medium text-[#0B1526] dark:text-slate-200 hover:border-[#C8A24A] cursor-pointer"
                  >
                    السيولة النقدية
                  </button>
                )}
                {investmentsInDisplay > 0 && (
                  <button
                    type="button"
                    onClick={() => applyWealthPreset(investmentsInDisplay)}
                    className="px-2 py-1 rounded-md bg-white dark:bg-[#0D172A] border border-[#DCE1EC] dark:border-[#243656] text-[11px] font-medium text-[#0B1526] dark:text-slate-200 hover:border-[#C8A24A] cursor-pointer"
                  >
                    الاستثمارات
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Inflation Rate Control */}
          <div className="saas-subcard p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="inflation-rate-range"
                className="text-xs font-semibold text-[#0B1526] dark:text-slate-200"
              >
                معدل التضخم السنوي المتوقع
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  aria-label="نسبة التضخم السنوي"
                  data-testid="inflation-rate-input"
                  min="0"
                  max="50"
                  step="0.5"
                  value={inflationRate}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setInflationRate(Number.isFinite(v) ? Math.min(50, Math.max(0, v)) : 0);
                  }}
                  className="w-16 px-2 py-1 text-xs font-mono tabular-nums text-center rounded-md border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#091222] text-[#B91C1C] dark:text-red-400 font-bold focus:outline-none focus:border-[#C8A24A]"
                />
                <span className="text-xs font-bold text-[#B91C1C] dark:text-red-400">%</span>
              </div>
            </div>
            <input
              id="inflation-rate-range"
              type="range"
              min="0"
              max="30"
              step="0.5"
              value={Math.min(30, inflationRate)}
              onChange={(e) => setInflationRate(Number(e.target.value))}
              className="w-full accent-[#B91C1C] dark:accent-red-400 cursor-pointer"
            />
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {INFLATION_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setInflationRate(preset.value)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    inflationRate === preset.value
                      ? 'bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526]'
                      : 'bg-white dark:bg-[#0D172A] border border-[#DCE1EC] dark:border-[#243656] text-slate-600 dark:text-slate-300 hover:border-[#C8A24A]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Horizon & Return Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
            <div className="saas-subcard p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="inflation-years-range"
                  className="text-xs font-semibold text-[#0B1526] dark:text-slate-200"
                >
                  المدة الزمنية
                </label>
                <span
                  data-testid="inflation-years-value"
                  className="text-xs font-bold font-mono tabular-nums text-[#0B1526] dark:text-[#DDBB6A]"
                >
                  {years} {years <= 10 ? 'سنوات' : 'سنة'}
                </span>
              </div>
              <input
                id="inflation-years-range"
                type="range"
                min="1"
                max="30"
                step="1"
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full accent-[#0B1526] dark:accent-[#C8A24A] cursor-pointer"
              />
              <div className="flex flex-wrap gap-1.5">
                {YEAR_PRESETS.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setYears(yr)}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                      years === yr
                        ? 'bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526]'
                        : 'bg-white dark:bg-[#0D172A] border border-[#DCE1EC] dark:border-[#243656] text-slate-600 dark:text-slate-300 hover:border-[#C8A24A]'
                    }`}
                  >
                    {yr} {yr <= 10 ? 'سنوات' : 'سنة'}
                  </button>
                ))}
              </div>
            </div>

            <div className="saas-subcard p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="inflation-return-range"
                  className="text-xs font-semibold text-[#0B1526] dark:text-slate-200"
                >
                  عائد الاستثمار السنوي للمقارنة
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    aria-label="نسبة عائد الاستثمار السنوي"
                    data-testid="inflation-return-input"
                    min="0"
                    max="40"
                    step="0.5"
                    value={returnRate}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setReturnRate(Number.isFinite(v) ? Math.min(40, Math.max(0, v)) : 0);
                    }}
                    className="w-16 px-2 py-1 text-xs font-mono tabular-nums text-center rounded-md border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#091222] text-[#15803D] dark:text-emerald-400 font-bold focus:outline-none focus:border-[#C8A24A]"
                  />
                  <span className="text-xs font-bold text-[#15803D] dark:text-emerald-400">%</span>
                </div>
              </div>
              <input
                id="inflation-return-range"
                type="range"
                min="0"
                max="25"
                step="0.5"
                value={Math.min(25, returnRate)}
                onChange={(e) => setReturnRate(Number(e.target.value))}
                className="w-full accent-[#15803D] dark:accent-emerald-400 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                يوضح أثر استثمار المبلغ بعائد سنوي مقارنة ببقائه نقداً دون عائد
              </p>
            </div>
          </div>
        </div>

        {/* Results KPIs + Comparison Chart */}
        <div className="xl:col-span-7 flex flex-col gap-5">
          {/* 4 Result Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="saas-subcard p-4">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>القوة الشرائية للنقد بعد {years} {years <= 10 ? 'سنوات' : 'سنة'}</span>
                <TrendingDown className="w-4 h-4 text-[#B91C1C] dark:text-red-400 shrink-0" />
              </div>
              <div
                data-testid="inflation-final-real-cash"
                className="mt-1.5 text-xl font-bold text-[#0B1526] dark:text-slate-100"
              >
                <AmountText amount={result.finalRealCashValue} currency={calcCurrency} />
              </div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                يحتفظ النقد بـ{' '}
                <span className="font-mono font-semibold text-[#0B1526] dark:text-slate-200 tabular-nums">
                  {result.purchasingPowerRetentionPct.toFixed(1)}%
                </span>{' '}
                فقط من قوته الشرائية الحالية
              </div>
            </div>

            <div className="rounded-xl bg-red-50/70 dark:bg-red-950/30 border border-red-200/80 dark:border-red-900/50 p-4">
              <div className="flex items-center justify-between gap-2 text-xs text-[#991B1B] dark:text-red-300">
                <span>الخسارة الحقيقية بفعل التضخم</span>
                <span dir="ltr" className="font-mono font-bold tabular-nums">
                  -{result.purchasingPowerLossPct.toFixed(1)}%
                </span>
              </div>
              <div
                data-testid="inflation-loss-amount"
                className="mt-1.5 text-xl font-bold text-[#B91C1C] dark:text-red-400"
              >
                <AmountText
                  amount={-result.purchasingPowerLossAmount}
                  currency={calcCurrency}
                  showSign
                />
              </div>
              <div className="mt-1 text-[11px] text-[#7F1D1D] dark:text-red-300/80">
                {result.halfLifeYears !== null
                  ? `تتآكل القوة الشرائية للنصف خلال ${result.halfLifeYears.toFixed(1)} سنة`
                  : 'التضخم 0% — لا يوجد تآكل في القوة الشرائية'}
              </div>
            </div>

            <div className="rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 p-4">
              <div className="flex items-center justify-between gap-2 text-xs text-[#166534] dark:text-emerald-300">
                <span>القوة الشرائية مع الاستثمار ({returnRate}%)</span>
                <TrendingUp className="w-4 h-4 text-[#15803D] dark:text-emerald-400 shrink-0" />
              </div>
              <div
                data-testid="inflation-final-real-invested"
                className="mt-1.5 text-xl font-bold text-[#15803D] dark:text-emerald-400"
              >
                <AmountText amount={result.finalRealInvestedValue} currency={calcCurrency} />
              </div>
              <div className="mt-1 text-[11px] text-[#14532D] dark:text-emerald-300/80">
                العائد الحقيقي الصافي بعد التضخم:{' '}
                <span dir="ltr" className="font-mono font-bold tabular-nums">
                  {result.realAnnualReturnPct >= 0 ? '+' : ''}
                  {result.realAnnualReturnPct.toFixed(2)}%
                </span>{' '}
                سنوياً
              </div>
            </div>

            <div className="saas-subcard p-4">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>المبلغ المطلوب مستقبلاً لنفس القدرة الشرائية</span>
                <ShieldCheck className="w-4 h-4 text-[#9E7B2C] dark:text-[#DDBB6A] shrink-0" />
              </div>
              <div
                data-testid="inflation-equivalent-cost"
                className="mt-1.5 text-xl font-bold text-[#9E7B2C] dark:text-[#DDBB6A]"
              >
                <AmountText amount={result.equivalentFutureCost} currency={calcCurrency} />
              </div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                ما تشتريه اليوم بـ{' '}
                <AmountText amount={numericAmount} currency={calcCurrency} compact /> سيتطلب هذا المبلغ بعد{' '}
                {years} {years <= 10 ? 'سنوات' : 'سنة'}
              </div>
            </div>
          </div>

          {/* Chart Card */}
          <div className="flex-1 saas-subcard p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h4 className="text-sm font-bold text-[#0B1526] dark:text-slate-100">
                  مسار القوة الشرائية الحقيقية بمرور الزمن
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  مقارنة القيمة الحقيقية المقوّمة بأسعار اليوم (خط مرجعي: المبلغ الأولي)
                </p>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#15803D] dark:bg-emerald-400" />
                  مع الاستثمار
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] dark:bg-red-400" />
                  نقد دون استثمار
                </span>
              </div>
            </div>

            <div className="h-[250px] w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.yearlySeries}>
                  <defs>
                    <linearGradient id="realInvestedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={isDark ? '#34D399' : '#15803D'}
                        stopOpacity={0.28}
                      />
                      <stop
                        offset="95%"
                        stopColor={isDark ? '#34D399' : '#15803D'}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                    <linearGradient id="realCashGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={isDark ? '#F87171' : '#DC2626'}
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="95%"
                        stopColor={isDark ? '#F87171' : '#DC2626'}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? '#1E2E4A' : '#E2E8F0'}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="yearLabel"
                    reversed
                    tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                    axisLine={{ stroke: isDark ? '#1E2E4A' : '#CBD5E1' }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    orientation="right"
                    tick={{ fill: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => formatMoney(v, calcCurrency, true)}
                    width={86}
                  />
                  <Tooltip
                    formatter={(value: unknown, name: unknown) => [
                      formatMoney(Number(value ?? 0), calcCurrency),
                      name === 'realInvestedPurchasingPower'
                        ? 'القوة الشرائية مع الاستثمار'
                        : 'القوة الشرائية للنقد الساكن',
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
                  {numericAmount > 0 && (
                    <ReferenceLine
                      y={numericAmount}
                      stroke={isDark ? '#DDBB6A' : '#9E7B2C'}
                      strokeDasharray="4 4"
                      strokeOpacity={0.75}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="realInvestedPurchasingPower"
                    stroke={isDark ? '#34D399' : '#15803D'}
                    strokeWidth={2.5}
                    fill="url(#realInvestedGrad)"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="realCashPurchasingPower"
                    stroke={isDark ? '#F87171' : '#DC2626'}
                    strokeWidth={2.5}
                    fill="url(#realCashGrad)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Year-by-Year Milestone Table + Disclaimer */}
      <div className="pt-2 border-t border-[#EEF1F6] dark:border-[#1B2B46] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <Info className="w-3.5 h-3.5 text-[#9E7B2C] dark:text-[#DDBB6A] shrink-0" />
            <span>
              تقديرات رياضية تعتمد على معدلات التضخم والعائد السنوي المدخلة يدوياً لأغراض التخطيط المالي، ولا تعتمد على مؤشرات تضخم حية.
            </span>
          </p>
          <button
            type="button"
            onClick={() => setShowTable((s) => !s)}
            data-testid="inflation-toggle-table"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#132038] hover:bg-slate-200 dark:hover:bg-[#1B2D4D] text-xs font-medium text-[#0B1526] dark:text-slate-200 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
          >
            {showTable ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                إخفاء الجدول الزمني
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                عرض الجدول الزمني ({milestoneRows.length} محطات)
              </>
            )}
          </button>
        </div>

        {showTable && (
          <div className="overflow-x-auto rounded-lg border border-[#E4E8F0] dark:border-[#1E2E4A]">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] dark:bg-[#111E35] border-b border-[#E4E8F0] dark:border-[#1E2E4A] text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-3">السنة</th>
                  <th className="py-2.5 px-3">القيمة الاسمية للنقد</th>
                  <th className="py-2.5 px-3">القوة الشرائية للنقد</th>
                  <th className="py-2.5 px-3">نسبة الاحتفاظ بالقيمة</th>
                  <th className="py-2.5 px-3">القوة الشرائية مع الاستثمار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF1F6] dark:divide-[#1B2B46]">
                {milestoneRows.map((row) => (
                  <tr
                    key={row.year}
                    className="hover:bg-[#FAFBFD] dark:hover:bg-[#13223C] transition-colors"
                  >
                    <td className="py-2.5 px-3 font-semibold text-[#0B1526] dark:text-slate-100 whitespace-nowrap">
                      {row.yearLabel}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      <AmountText amount={row.nominalCash} currency={calcCurrency} />
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[#B91C1C] dark:text-red-400 whitespace-nowrap">
                      <AmountText amount={row.realCashPurchasingPower} currency={calcCurrency} />
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {row.purchasingPowerRetentionPct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[#15803D] dark:text-emerald-400 whitespace-nowrap">
                      <AmountText amount={row.realInvestedPurchasingPower} currency={calcCurrency} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
