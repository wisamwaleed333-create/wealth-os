import {
  Currency,
  ExpenseCategory,
  FinancialGoal,
  IncomeCategory,
  InvestmentCategory,
  WealthSettings,
  WealthState,
} from '../types/wealth';
import {
  ARABIC_MONTHS,
  EXPENSE_CATEGORY_LABELS,
  INCOME_CATEGORY_LABELS,
  INVESTMENT_CATEGORY_LABELS,
} from '../data/labels';

export const STORAGE_KEY = 'wealth_os_state_v2';

/**
 * Convert an amount from one currency to the target currency using the manual exchange rate.
 */
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  exchangeRateIQDPerUSD: number
): number {
  const safeRate = exchangeRateIQDPerUSD > 0 ? exchangeRateIQDPerUSD : 1500;
  if (from === to) return amount;
  if (from === 'USD' && to === 'IQD') return amount * safeRate;
  return amount / safeRate;
}

/**
 * Format currency value cleanly with tabular-friendly digits and Arabic currency unit.
 */
export function formatMoney(amount: number, currency: Currency, compact = false): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  const sign = isNegative ? '-' : '';
  const unit = currency === 'IQD' ? 'د.ع' : 'دولار';

  if (compact) {
    if (absVal >= 1_000_000_000) {
      return `${sign}${(absVal / 1_000_000_000).toFixed(1)} مليار`;
    }
    if (absVal >= 1_000_000) {
      return `${sign}${(absVal / 1_000_000).toFixed(1)} مليون`;
    }
    if (absVal >= 1_000) {
      return currency === 'USD'
        ? `${sign}${(absVal / 1_000).toFixed(1)} ألف`
        : `${sign}${(absVal / 1_000).toFixed(0)} ألف`;
    }
    return `${sign}${Math.round(absVal)} ${unit}`;
  }

  if (currency === 'IQD') {
    const formatted = Math.round(absVal).toLocaleString('en-US');
    return `${sign}${formatted} ${unit}`;
  }

  const formatted = absVal.toLocaleString('en-US', {
    minimumFractionDigits: absVal % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${formatted} ${unit}`;
}

export interface WealthSummary {
  totalNonInvestmentAssets: number;
  totalInvestmentsValue: number;
  totalInvestmentsCost: number;
  investmentsGainLoss: number;
  investmentsReturnPct: number;
  totalAssets: number; // non-investment assets + investments current value
  totalLiquidAssets: number;
  totalLiabilities: number;
  netWorth: number; // totalAssets - totalLiabilities
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  savingsRatePct: number;
  debtToAssetRatioPct: number;
  monthlyAvgExpenses: number;
  emergencyRunwayMonths: number;
}

/**
 * Compute complete financial overview in the active display currency.
 */
export function calculateWealthSummary(state: WealthState): WealthSummary {
  const { displayCurrency, exchangeRateIQDPerUSD } = state.settings;
  const toDisplay = (val: number, cur: Currency) =>
    convertCurrency(val, cur, displayCurrency, exchangeRateIQDPerUSD);

  const totalNonInvestmentAssets = state.assets.reduce(
    (sum, item) => sum + toDisplay(item.value, item.currency),
    0
  );

  const totalLiquidAssets = state.assets
    .filter((a) => a.liquid)
    .reduce((sum, item) => sum + toDisplay(item.value, item.currency), 0);

  const totalInvestmentsValue = state.investments.reduce(
    (sum, item) => sum + toDisplay(item.currentValue, item.currency),
    0
  );

  const totalInvestmentsCost = state.investments.reduce(
    (sum, item) => sum + toDisplay(item.investedAmount, item.currency),
    0
  );

  const investmentsGainLoss = totalInvestmentsValue - totalInvestmentsCost;
  const investmentsReturnPct =
    totalInvestmentsCost > 0 ? (investmentsGainLoss / totalInvestmentsCost) * 100 : 0;

  const totalAssets = totalNonInvestmentAssets + totalInvestmentsValue;

  const totalLiabilities = state.liabilities.reduce(
    (sum, item) => sum + toDisplay(item.remainingAmount, item.currency),
    0
  );

  const netWorth = totalAssets - totalLiabilities;

  const totalIncome = state.incomes.reduce(
    (sum, item) => sum + toDisplay(item.amount, item.currency),
    0
  );

  const totalExpenses = state.expenses.reduce(
    (sum, item) => sum + toDisplay(item.amount, item.currency),
    0
  );

  const netCashFlow = totalIncome - totalExpenses;
  const savingsRatePct = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;
  const debtToAssetRatioPct = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

  const uniqueExpenseMonths = new Set(state.expenses.map((e) => e.date.slice(0, 7))).size;
  const monthlyAvgExpenses =
    uniqueExpenseMonths > 0 ? totalExpenses / uniqueExpenseMonths : 0;
  const emergencyRunwayMonths =
    monthlyAvgExpenses > 0 ? totalLiquidAssets / monthlyAvgExpenses : 0;

  return {
    totalNonInvestmentAssets,
    totalInvestmentsValue,
    totalInvestmentsCost,
    investmentsGainLoss,
    investmentsReturnPct,
    totalAssets,
    totalLiquidAssets,
    totalLiabilities,
    netWorth,
    totalIncome,
    totalExpenses,
    netCashFlow,
    savingsRatePct,
    debtToAssetRatioPct,
    monthlyAvgExpenses,
    emergencyRunwayMonths,
  };
}

export interface MonthlyCashFlowPoint {
  monthKey: string; // YYYY-MM
  label: string;
  income: number;
  expenses: number;
  net: number;
}

/**
 * Group incomes and expenses by YYYY-MM sorted chronologically.
 */
export function buildMonthlyCashFlow(state: WealthState): MonthlyCashFlowPoint[] {
  const { displayCurrency, exchangeRateIQDPerUSD } = state.settings;
  const map = new Map<string, { income: number; expenses: number }>();

  for (const inc of state.incomes) {
    const key = inc.date.slice(0, 7);
    const current = map.get(key) ?? { income: 0, expenses: 0 };
    current.income += convertCurrency(inc.amount, inc.currency, displayCurrency, exchangeRateIQDPerUSD);
    map.set(key, current);
  }

  for (const exp of state.expenses) {
    const key = exp.date.slice(0, 7);
    const current = map.get(key) ?? { income: 0, expenses: 0 };
    current.expenses += convertCurrency(exp.amount, exp.currency, displayCurrency, exchangeRateIQDPerUSD);
    map.set(key, current);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, vals]) => {
      const [year, month] = monthKey.split('-');
      const monthName = ARABIC_MONTHS[month] ?? month;
      return {
        monthKey,
        label: `${monthName} ${year}`,
        income: Math.round(vals.income),
        expenses: Math.round(vals.expenses),
        net: Math.round(vals.income - vals.expenses),
      };
    });
}

export interface CategorySlice {
  key: string;
  name: string;
  value: number;
  percentage: number;
}

export function buildExpenseBreakdown(state: WealthState): CategorySlice[] {
  const { displayCurrency, exchangeRateIQDPerUSD } = state.settings;
  const totals = new Map<ExpenseCategory, number>();

  for (const exp of state.expenses) {
    const val = convertCurrency(exp.amount, exp.currency, displayCurrency, exchangeRateIQDPerUSD);
    totals.set(exp.category, (totals.get(exp.category) ?? 0) + val);
  }

  const grandTotal = Array.from(totals.values()).reduce((s, v) => s + v, 0);

  return Array.from(totals.entries())
    .map(([key, value]) => ({
      key,
      name: EXPENSE_CATEGORY_LABELS[key],
      value: Math.round(value),
      percentage: grandTotal > 0 ? (value / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

export function buildIncomeBreakdown(state: WealthState): CategorySlice[] {
  const { displayCurrency, exchangeRateIQDPerUSD } = state.settings;
  const totals = new Map<IncomeCategory, number>();

  for (const inc of state.incomes) {
    const val = convertCurrency(inc.amount, inc.currency, displayCurrency, exchangeRateIQDPerUSD);
    totals.set(inc.category, (totals.get(inc.category) ?? 0) + val);
  }

  const grandTotal = Array.from(totals.values()).reduce((s, v) => s + v, 0);

  return Array.from(totals.entries())
    .map(([key, value]) => ({
      key,
      name: INCOME_CATEGORY_LABELS[key],
      value: Math.round(value),
      percentage: grandTotal > 0 ? (value / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

export function buildInvestmentAllocation(state: WealthState): CategorySlice[] {
  const { displayCurrency, exchangeRateIQDPerUSD } = state.settings;
  const totals = new Map<InvestmentCategory, number>();

  for (const inv of state.investments) {
    const val = convertCurrency(
      inv.currentValue,
      inv.currency,
      displayCurrency,
      exchangeRateIQDPerUSD
    );
    totals.set(inv.category, (totals.get(inv.category) ?? 0) + val);
  }

  const grandTotal = Array.from(totals.values()).reduce((s, v) => s + v, 0);

  return Array.from(totals.entries())
    .map(([key, value]) => ({
      key,
      name: INVESTMENT_CATEGORY_LABELS[key],
      value: Math.round(value),
      percentage: grandTotal > 0 ? (value / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

export function buildWealthComposition(state: WealthState): CategorySlice[] {
  const summary = calculateWealthSummary(state);
  const { displayCurrency, exchangeRateIQDPerUSD } = state.settings;

  const liquidVal = summary.totalLiquidAssets;
  const nonLiquidPersonalAssets = Math.max(
    0,
    summary.totalNonInvestmentAssets - summary.totalLiquidAssets
  );

  const invAlloc = buildInvestmentAllocation(state);
  const slices: { key: string; name: string; value: number }[] = [];

  if (liquidVal > 0) {
    slices.push({ key: 'liquid', name: 'النقد والحسابات البنكية', value: Math.round(liquidVal) });
  }
  if (nonLiquidPersonalAssets > 0) {
    slices.push({
      key: 'personal_assets',
      name: 'الأصول العينية الشخصية',
      value: Math.round(nonLiquidPersonalAssets),
    });
  }
  for (const inv of invAlloc) {
    slices.push({ key: `inv_${inv.key}`, name: `استثمار: ${inv.name}`, value: inv.value });
  }

  const total = slices.reduce((s, x) => s + x.value, 0);
  // Keep reference to settings to avoid unused warnings if refactored
  void displayCurrency;
  void exchangeRateIQDPerUSD;

  return slices
    .map((s) => ({
      ...s,
      percentage: total > 0 ? (s.value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

export function calculateGoalProgress(goal: FinancialGoal): {
  percentage: number;
  remaining: number;
  isCompleted: boolean;
} {
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const rawPct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  const percentage = Math.min(100, Math.max(0, rawPct));
  return {
    percentage,
    remaining,
    isCompleted: goal.currentAmount >= goal.targetAmount && goal.targetAmount > 0,
  };
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function calculateNetWorthIQD(state: WealthState): number {
  const rate = state.settings.exchangeRateIQDPerUSD > 0 ? state.settings.exchangeRateIQDPerUSD : 1500;
  const toIQD = (val: number, cur: Currency) => convertCurrency(val, cur, 'IQD', rate);

  const nonInvAssets = state.assets.reduce((s, a) => s + toIQD(a.value, a.currency), 0);
  const invAssets = state.investments.reduce((s, i) => s + toIQD(i.currentValue, i.currency), 0);
  const liabilities = state.liabilities.reduce(
    (s, l) => s + toIQD(l.remainingAmount, l.currency),
    0
  );
  return nonInvAssets + invAssets - liabilities;
}

export function loadWealthState(fallback: WealthState): WealthState {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<WealthState>;
    if (!parsed || typeof parsed !== 'object') return fallback;
    return {
      incomes: Array.isArray(parsed.incomes) ? parsed.incomes : fallback.incomes,
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : fallback.expenses,
      assets: Array.isArray(parsed.assets) ? parsed.assets : fallback.assets,
      liabilities: Array.isArray(parsed.liabilities) ? parsed.liabilities : fallback.liabilities,
      investments: Array.isArray(parsed.investments) ? parsed.investments : fallback.investments,
      goals: Array.isArray(parsed.goals) ? parsed.goals : fallback.goals,
      categoryBudgets:
        parsed.categoryBudgets && typeof parsed.categoryBudgets === 'object'
          ? parsed.categoryBudgets
          : fallback.categoryBudgets,
      billReminders: Array.isArray(parsed.billReminders)
        ? parsed.billReminders
        : fallback.billReminders,
      netWorthAlert:
        parsed.netWorthAlert && typeof parsed.netWorthAlert === 'object'
          ? {
              enabled:
                typeof parsed.netWorthAlert.enabled === 'boolean'
                  ? parsed.netWorthAlert.enabled
                  : fallback.netWorthAlert.enabled,
              dropThresholdPct:
                typeof parsed.netWorthAlert.dropThresholdPct === 'number' &&
                parsed.netWorthAlert.dropThresholdPct > 0
                  ? parsed.netWorthAlert.dropThresholdPct
                  : fallback.netWorthAlert.dropThresholdPct,
              baselineNetWorthIQD:
                typeof parsed.netWorthAlert.baselineNetWorthIQD === 'number'
                  ? parsed.netWorthAlert.baselineNetWorthIQD
                  : fallback.netWorthAlert.baselineNetWorthIQD,
              autoUpdatePeak:
                typeof parsed.netWorthAlert.autoUpdatePeak === 'boolean'
                  ? parsed.netWorthAlert.autoUpdatePeak
                  : fallback.netWorthAlert.autoUpdatePeak,
            }
          : fallback.netWorthAlert,
      dismissedAlertIds: Array.isArray(parsed.dismissedAlertIds)
        ? parsed.dismissedAlertIds
        : fallback.dismissedAlertIds,
      settings: {
        displayCurrency:
          parsed.settings?.displayCurrency === 'USD' ? 'USD' : 'IQD',
        exchangeRateIQDPerUSD:
          typeof parsed.settings?.exchangeRateIQDPerUSD === 'number' &&
          parsed.settings.exchangeRateIQDPerUSD > 0
            ? parsed.settings.exchangeRateIQDPerUSD
            : fallback.settings.exchangeRateIQDPerUSD,
      } satisfies WealthSettings,
    };
  } catch {
    return fallback;
  }
}

export function saveWealthState(state: WealthState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors gracefully
  }
}
