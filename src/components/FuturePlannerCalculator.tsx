import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChevronDown,
  ChevronUp,
  Info,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { Currency } from '../types/wealth';
import { CURRENCY_LABELS } from '../data/labels';
import { convertCurrency, formatMoney } from '../utils/finance';
import {
  calculateFutureWealth,
  PlannerHorizonYears,
} from '../utils/futurePlanner';
import { AmountText } from './AmountText';

export interface FuturePlanGoalDraft {
  title: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  currency: Currency;
  horizonYears: PlannerHorizonYears;
}

interface FuturePlannerCalculatorProps {
  displayCurrency: Currency;
  exchangeRateIQDPerUSD: number;
  existingGoalSavingsInDisplay: number;
  isDark?: boolean;
  onCreateGoalFromPlan?: (draft: FuturePlanGoalDraft) => void;
}

const RETURN_PRESETS = [
  { label: 'محافظ 5%', value: 5 },
  { label: 'متوازن 8%', value: 8 },
  { label: 'نمو 12%', value: 12 },
  { label: 'جريء 15%', value: 15 },
];

const MONTHLY_PRESETS_IQD = [
  { label: '250 ألف', value: 250_000 },
  { label: '500 ألف', value: 500_000 },
  { label: '1 مليون', value: 1_000_000 },
  { label: '2 مليون', value: 2_000_000 },
];

const MONTHLY_PRESETS_USD = [
  { label: '200 $', value: 200 },
  { label: '500 $', value: 500 },
  { label: '1,000 $', value: 1_000 },
  { label: '2,000 $', value: 2_000 },
];

export const FuturePlannerCalculator: React.FC<FuturePlannerCalculatorProps> = ({
  displayCurrency,
  exchangeRateIQDPerUSD,
  existingGoalSavingsInDisplay,
  isDark = false,
  onCreateGoalFromPlan,
}) => {
  const defaultMonthly = (cur: Currency) => (cur === 'IQD' ? 500_000 : 500);

  const [calcCurrency, setCalcCurrency] = useState<Currency>(displayCurrency);
  const [monthlyInput, setMonthlyInput] = useState<string>(() =>
    String(defaultMonthly(displayCurrency))
  );
  const [initialInput, setInitialInput] = useState<string>('0');
  const [annualReturnRate, setAnnualReturnRate] = useState<number>(10);
  const [horizonYears, setHorizonYears] = useState<PlannerHorizonYears>(10);
  const [showTable, setShowTable] = useState<boolean>(false);

  // Sync local calculator currency with sidebar display currency
  useEffect(() => {
    setCalcCurrency((prev) => {
      if (prev === displayCurrency) return prev;

      const parsedMonthly = Number(monthlyInput);
      if (Number.isFinite(parsedMonthly) && parsedMonthly > 0) {
        const converted = convertCurrency(
          parsedMonthly,
          prev,
          displayCurrency,
          exchangeRateIQDPerUSD
        );
        setMonthlyInput(
          String(
            displayCurrency === 'IQD'
              ? Math.round(converted)
              : Math.round(converted * 100) / 100
          )
        );
      } else {
        setMonthlyInput(String(defaultMonthly(displayCurrency)));
      }

      const parsedInitial = Number(initialInput);
      if (Number.isFinite(parsedInitial) && parsedInitial > 0) {
        const convertedInit = convertCurrency(
          parsedInitial,
          prev,
          displayCurrency,
          exchangeRateIQDPerUSD
        );
        setInitialInput(
          String(
            displayCurrency === 'IQD'
              ? Math.round(convertedInit)
              : Math.round(convertedInit * 100) / 100
          )
        );
      }

      return displayCurrency;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayCurrency, exchangeRateIQDPerUSD]);

  const handleLocalCurrencySwitch = (nextCurrency: Currency) => {
    if (nextCurrency === calcCurrency) return;

    const parsedMonthly = Number(monthlyInput);
    if (Number.isFinite(parsedMonthly) && parsedMonthly > 0) {
      const converted = convertCurrency(
        parsedMonthly,
        calcCurrency,
        nextCurrency,
        exchangeRateIQDPerUSD
      );
      setMonthlyInput(
        String(
          nextCurrency === 'IQD'
            ? Math.round(converted)
            : Math.round(converted * 100) / 100
        )
      );
    } else {
      setMonthlyInput(String(defaultMonthly(nextCurrency)));
    }

    const parsedInitial = Number(initialInput);
    if (Number.isFinite(parsedInitial) && parsedInitial > 0) {
      const convertedInit = convertCurrency(
        parsedInitial,
        calcCurrency,
        nextCurrency,
        exchangeRateIQDPerUSD
      );
      setInitialInput(
        String(
          nextCurrency === 'IQD'
            ? Math.round(convertedInit)
            : Math.round(convertedInit * 100) / 100
        )
      );
    }

    setCalcCurrency(nextCurrency);
  };

  const handleUseExistingGoalSavings = () => {
    if (existingGoalSavingsInDisplay <= 0) return;
    const converted = convertCurrency(
      existingGoalSavingsInDisplay,
      displayCurrency,
      calcCurrency,
      exchangeRateIQDPerUSD
    );
    setInitialInput(
      String(
        calcCurrency === 'IQD'
          ? Math.round(converted)
          : Math.round(converted * 100) / 100
      )
    );
  };

  const numericMonthly = useMemo(() => {
    const val = Number(monthlyInput);
    return Number.isFinite(val) && val >= 0 ? val : 0;
  }, [monthlyInput]);

  const numericInitial = useMemo(() => {
    const val = Number(initialInput);
    return Number.isFinite(val) && val >= 0 ? val : 0;
  }, [initialInput]);

  const result = useMemo(
    () =>
      calculateFutureWealth({
        monthlySavings: numericMonthly,
        annualReturnRatePct: annualReturnRate,
        initialAmount: numericInitial,
        currency: calcCurrency,
        horizonYears,
      }),
    [numericMonthly, annualReturnRate, numericInitial, calcCurrency, horizonYears]
  );

  const monthlyPresets =
    calcCurrency === 'IQD' ? MONTHLY_PRESETS_IQD : MONTHLY_PRESETS_USD;

  const handleConvertPlanToGoal = () => {
    if (!onCreateGoalFromPlan) return;
    const targetMilestone =
      horizonYears === 5 ? result.milestone5Years : result.milestone10Years;
    onCreateGoalFromPlan({
      title: `خطة بناء ثروة (${horizonYears} سنوات)`,
      targetAmount: Math.round(targetMilestone.totalWealth),
      currentAmount: Math.round(numericInitial),
      monthlyContribution: Math.round(numericMonthly),
      currency: calcCurrency,
      horizonYears,
    });
  };

  return (
    <section
      aria-label="حاسبة خطط للمستقبل"
      data-testid="future-planner-section"
      className="saas-card p-6 space-y-6"
    >
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#EEF1F6] dark:border-[#1B2B46]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0B1526] dark:bg-[#162744] border border-[#C8A24A]/30 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-[#DDBB6A]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#0B1526] dark:text-slate-100">
              خطط للمستقبل
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              احسب حجم ثروتك المتوقعة بعد 5 أو 10 سنوات عبر الادخار الشهري المنتظم والعائد الاستثماري المركب
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto shrink-0">
          {/* Horizon Toggle: 5 vs 10 years */}
          <div
            className="inline-flex p-1 rounded-xl bg-[#F1F5F9] dark:bg-[#08101E] border border-[#E2E8F0] dark:border-[#1E2E4A]"
            role="group"
            aria-label="الأفق الزمني للتخطيط"
          >
            <button
              type="button"
              onClick={() => setHorizonYears(5)}
              data-testid="planner-horizon-5y"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                horizonYears === 5
                  ? 'bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526] shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1526] dark:hover:text-white'
              }`}
            >
              5 سنوات
            </button>
            <button
              type="button"
              onClick={() => setHorizonYears(10)}
              data-testid="planner-horizon-10y"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                horizonYears === 10
                  ? 'bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526] shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1526] dark:hover:text-white'
              }`}
            >
              10 سنوات
            </button>
          </div>

          {/* Currency Toggle */}
          <div
            className="inline-flex p-1 rounded-xl bg-[#F1F5F9] dark:bg-[#08101E] border border-[#E2E8F0] dark:border-[#1E2E4A]"
            role="group"
            aria-label="عملة حاسبة خطط للمستقبل"
          >
            <button
              type="button"
              onClick={() => handleLocalCurrencySwitch('IQD')}
              data-testid="planner-currency-iqd"
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
              data-testid="planner-currency-usd"
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
      </div>

      {/* Main Content: Controls + Results/Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Input Controls */}
        <div className="xl:col-span-5 space-y-4">
          {/* Monthly Savings Input */}
          <div className="saas-subcard p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="planner-monthly-savings"
                className="text-xs font-semibold text-[#0B1526] dark:text-slate-200"
              >
                الادخار الشهري المستهدف ({CURRENCY_LABELS[calcCurrency]})
              </label>
              <span className="text-[11px] font-medium text-[#9E7B2C] dark:text-[#DDBB6A]">
                <AmountText amount={numericMonthly} currency={calcCurrency} compact />
              </span>
            </div>

            <input
              id="planner-monthly-savings"
              data-testid="planner-monthly-input"
              type="number"
              min="0"
              step="any"
              value={monthlyInput}
              onChange={(e) => setMonthlyInput(e.target.value)}
              className="saas-input px-3.5 py-2.5 text-sm font-mono tabular-nums"
            />

            <div className="flex flex-wrap items-center gap-1.5">
              {monthlyPresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setMonthlyInput(String(preset.value))}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    numericMonthly === preset.value
                      ? 'bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526]'
                      : 'bg-white dark:bg-[#0D172A] border border-[#DCE1EC] dark:border-[#243656] text-slate-600 dark:text-slate-300 hover:border-[#C8A24A]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Expected Annual Investment Return */}
          <div className="saas-subcard p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="planner-return-range"
                className="text-xs font-semibold text-[#0B1526] dark:text-slate-200"
              >
                العائد الاستثماري السنوي المتوقع
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  aria-label="نسبة العائد الاستثماري السنوي المتوقع"
                  data-testid="planner-return-input"
                  min="0"
                  max="50"
                  step="0.5"
                  value={annualReturnRate}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setAnnualReturnRate(
                      Number.isFinite(v) ? Math.min(50, Math.max(0, v)) : 0
                    );
                  }}
                  className="w-16 px-2 py-1 text-xs font-mono tabular-nums text-center rounded-md border border-[#D4DAE6] dark:border-[#2A3D5F] bg-white dark:bg-[#091222] text-[#15803D] dark:text-emerald-400 font-bold focus:outline-none focus:border-[#C8A24A]"
                />
                <span className="text-xs font-bold text-[#15803D] dark:text-emerald-400">%</span>
              </div>
            </div>

            <input
              id="planner-return-range"
              type="range"
              min="0"
              max="30"
              step="0.5"
              value={Math.min(30, annualReturnRate)}
              onChange={(e) => setAnnualReturnRate(Number(e.target.value))}
              className="w-full accent-[#15803D] dark:accent-emerald-400 cursor-pointer"
            />

            <div className="flex flex-wrap gap-1.5">
              {RETURN_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setAnnualReturnRate(preset.value)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    annualReturnRate === preset.value
                      ? 'bg-[#0B1526] dark:bg-[#C8A24A] text-white dark:text-[#0B1526]'
                      : 'bg-white dark:bg-[#0D172A] border border-[#DCE1EC] dark:border-[#243656] text-slate-600 dark:text-slate-300 hover:border-[#C8A24A]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Starting Capital */}
          <div className="saas-subcard p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="planner-initial-amount"
                className="text-xs font-semibold text-[#0B1526] dark:text-slate-200"
              >
                رصيد بداية الخطة (اختياري)
              </label>
              {existingGoalSavingsInDisplay > 0 && (
                <button
                  type="button"
                  onClick={handleUseExistingGoalSavings}
                  className="text-[11px] font-semibold text-[#9E7B2C] dark:text-[#DDBB6A] hover:underline cursor-pointer"
                >
                  استخدام مدخرات الأهداف الحالية
                </button>
              )}
            </div>
            <input
              id="planner-initial-amount"
              data-testid="planner-initial-input"
              type="number"
              min="0"
              step="any"
              value={initialInput}
              onChange={(e) => setInitialInput(e.target.value)}
              className="saas-input px-3.5 py-2 text-sm font-mono tabular-nums"
            />
          </div>

          {/* Convert Plan CTA */}
          {onCreateGoalFromPlan && (
            <button
              type="button"
              onClick={handleConvertPlanToGoal}
              data-testid="planner-create-goal-btn"
              disabled={numericMonthly <= 0 && numericInitial <= 0}
              className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-[#C8A24A] hover:bg-[#DDBB6A] disabled:opacity-50 disabled:cursor-not-allowed text-[#0B1526] text-xs font-bold transition-colors shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              اعتماد خطة {horizonYears} سنوات كهدف مالي
            </button>
          )}
        </div>

        {/* Results Cards + Chart */}
        <div className="xl:col-span-7 flex flex-col gap-5">
          {/* 5-Year & 10-Year Side-by-Side Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 5-Year Projection */}
            <div
              className={`rounded-2xl p-5 border transition-colors ${
                horizonYears === 5
                  ? 'hero-wealth-surface text-white border-[#C8A24A] shadow-md'
                  : 'saas-subcard text-[#0B1526] dark:text-slate-100'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span
                  className={
                    horizonYears === 5
                      ? 'text-[#DDBB6A] font-semibold'
                      : 'text-slate-500 dark:text-slate-400 font-medium'
                  }
                >
                  الثروة المتوقعة بعد 5 سنوات
                </span>
                <span
                  className={`font-mono tabular-nums text-[11px] ${
                    horizonYears === 5
                      ? 'text-slate-300'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  60 شهراً
                </span>
              </div>

              <div
                data-testid="planner-5y-wealth"
                className="mt-2 text-2xl font-bold tabular-nums"
              >
                <AmountText
                  amount={result.milestone5Years.totalWealth}
                  currency={calcCurrency}
                />
              </div>

              <div
                className={`mt-3 pt-3 border-t text-[11px] space-y-1 ${
                  horizonYears === 5
                    ? 'border-white/15 text-slate-300'
                    : 'border-[#E4E8F0] dark:border-[#1E2E4A] text-slate-500 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>إجمالي الادخار المدفوع</span>
                  <AmountText
                    amount={result.milestone5Years.totalContributed}
                    currency={calcCurrency}
                    className="font-semibold"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>أرباح العائد المركب</span>
                  <span
                    className={`font-semibold ${
                      horizonYears === 5
                        ? 'text-emerald-300'
                        : 'text-[#15803D] dark:text-emerald-400'
                    }`}
                  >
                    <AmountText
                      amount={result.milestone5Years.investmentGrowth}
                      currency={calcCurrency}
                      showSign
                    />
                  </span>
                </div>
              </div>
            </div>

            {/* 10-Year Projection */}
            <div
              className={`rounded-2xl p-5 border transition-colors ${
                horizonYears === 10
                  ? 'hero-wealth-surface text-white border-[#C8A24A] shadow-md'
                  : 'saas-subcard text-[#0B1526] dark:text-slate-100'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span
                  className={
                    horizonYears === 10
                      ? 'text-[#DDBB6A] font-semibold'
                      : 'text-slate-500 dark:text-slate-400 font-medium'
                  }
                >
                  الثروة المتوقعة بعد 10 سنوات
                </span>
                <span
                  className={`font-mono tabular-nums text-[11px] ${
                    horizonYears === 10
                      ? 'text-slate-300'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  120 شهراً
                </span>
              </div>

              <div
                data-testid="planner-10y-wealth"
                className="mt-2 text-2xl font-bold tabular-nums"
              >
                <AmountText
                  amount={result.milestone10Years.totalWealth}
                  currency={calcCurrency}
                />
              </div>

              <div
                className={`mt-3 pt-3 border-t text-[11px] space-y-1 ${
                  horizonYears === 10
                    ? 'border-white/15 text-slate-300'
                    : 'border-[#E4E8F0] dark:border-[#1E2E4A] text-slate-500 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>إجمالي الادخار المدفوع</span>
                  <AmountText
                    amount={result.milestone10Years.totalContributed}
                    currency={calcCurrency}
                    className="font-semibold"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>أرباح العائد المركب</span>
                  <span
                    className={`font-semibold ${
                      horizonYears === 10
                        ? 'text-emerald-300'
                        : 'text-[#15803D] dark:text-emerald-400'
                    }`}
                  >
                    <AmountText
                      amount={result.milestone10Years.investmentGrowth}
                      currency={calcCurrency}
                      showSign
                    />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Trajectory Chart */}
          <div className="flex-1 saas-subcard p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h4 className="text-sm font-bold text-[#0B1526] dark:text-slate-100">
                  مسار نمو الثروة خلال {horizonYears} سنوات
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  تشكل أرباح العائد المركب{' '}
                  <strong className="font-mono tabular-nums text-[#0B1526] dark:text-slate-200">
                    {result.activeMilestone.growthSharePct.toFixed(1)}%
                  </strong>{' '}
                  من ثروتك المتوقعة بنهاية السنة {horizonYears}
                </p>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-600 dark:text-slate-300 shrink-0">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C8A24A]" />
                  إجمالي الثروة
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1D3154] dark:bg-sky-400" />
                  المبلغ المدفوع
                </span>
              </div>
            </div>

            <div className="h-[240px] w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.yearlySeries}>
                  <defs>
                    <linearGradient id="plannerTotalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={isDark ? '#DDBB6A' : '#C8A24A'}
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="95%"
                        stopColor={isDark ? '#DDBB6A' : '#C8A24A'}
                        stopOpacity={0.03}
                      />
                    </linearGradient>
                    <linearGradient id="plannerPrincipalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={isDark ? '#38BDF8' : '#1D3154'}
                        stopOpacity={0.22}
                      />
                      <stop
                        offset="95%"
                        stopColor={isDark ? '#38BDF8' : '#1D3154'}
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
                      name === 'totalWealth'
                        ? 'إجمالي الثروة المتوقعة'
                        : 'إجمالي الادخار التراكمي',
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
                    dataKey="totalWealth"
                    stroke={isDark ? '#DDBB6A' : '#C8A24A'}
                    strokeWidth={2.5}
                    fill="url(#plannerTotalGrad)"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalContributed"
                    stroke={isDark ? '#38BDF8' : '#1D3154'}
                    strokeWidth={2}
                    fill="url(#plannerPrincipalGrad)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Year-by-Year Breakdown Table */}
      <div className="pt-2 border-t border-[#EEF1F6] dark:border-[#1B2B46] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <Info className="w-3.5 h-3.5 text-[#9E7B2C] dark:text-[#DDBB6A] shrink-0" />
            <span>
              تقديرات رياضية تعتمد على التراكم الشهري للعائد المتوقع بافتراض انتظام الإيداع الشهري وثبات العائد.
            </span>
          </p>
          <button
            type="button"
            onClick={() => setShowTable((s) => !s)}
            data-testid="planner-toggle-table"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#132038] hover:bg-slate-200 dark:hover:bg-[#1B2D4D] text-xs font-medium text-[#0B1526] dark:text-slate-200 transition-colors cursor-pointer self-start sm:self-auto shrink-0 whitespace-nowrap"
          >
            {showTable ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                إخفاء الجدول السنوي
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                عرض الجدول السنوي ({horizonYears} سنوات)
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
                  <th className="py-2.5 px-3">إجمالي المبلغ المدفوع</th>
                  <th className="py-2.5 px-3">أرباح العائد المركب</th>
                  <th className="py-2.5 px-3">إجمالي الثروة المتوقعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF1F6] dark:divide-[#1B2B46]">
                {result.yearlySeries
                  .filter((row) => row.year > 0)
                  .map((row) => (
                    <tr
                      key={row.year}
                      className="hover:bg-[#FAFBFD] dark:hover:bg-[#13223C] transition-colors"
                    >
                      <td className="py-2.5 px-3 font-semibold text-[#0B1526] dark:text-slate-100 whitespace-nowrap">
                        {row.yearLabel}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <AmountText amount={row.totalContributed} currency={calcCurrency} />
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#15803D] dark:text-emerald-400 whitespace-nowrap">
                        <AmountText
                          amount={row.investmentGrowth}
                          currency={calcCurrency}
                          showSign
                        />
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#9E7B2C] dark:text-[#DDBB6A] whitespace-nowrap">
                        <AmountText amount={row.totalWealth} currency={calcCurrency} />
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
