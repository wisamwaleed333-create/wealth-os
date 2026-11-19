import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExpenseBreakdown,
  buildIncomeBreakdown,
  buildInvestmentAllocation,
  buildMonthlyCashFlow,
  calculateGoalProgress,
  calculateWealthSummary,
  convertCurrency,
  formatMoney,
} from './finance';
import { EMPTY_WEALTH_STATE, SEED_WEALTH_STATE } from '../data/seedData';
import { WealthState } from '../types/wealth';

test('convertCurrency converts accurately between IQD and USD', () => {
  assert.equal(convertCurrency(100, 'USD', 'IQD', 1500), 150000);
  assert.equal(convertCurrency(300000, 'IQD', 'USD', 1500), 200);
  assert.equal(convertCurrency(50000, 'IQD', 'IQD', 1500), 50000);
  assert.equal(convertCurrency(250, 'USD', 'USD', 1500), 250);
});

test('calculateWealthSummary computes net worth, assets, liabilities, and ROI accurately', () => {
  const sample: WealthState = {
    settings: { displayCurrency: 'IQD', exchangeRateIQDPerUSD: 1500 },
    categoryBudgets: {},
    billReminders: [],
    netWorthAlert: {
      enabled: false,
      dropThresholdPct: 5,
      baselineNetWorthIQD: 0,
      autoUpdatePeak: true,
    },
    dismissedAlertIds: [],
    incomes: [
      {
        id: '1',
        title: 'راتب',
        source: 'شركة',
        category: 'salary',
        amount: 3000000,
        currency: 'IQD',
        date: '2026-11-01',
        recurring: true,
      },
      {
        id: '2',
        title: 'استشارة',
        source: 'عميل',
        category: 'freelance',
        amount: 1000,
        currency: 'USD',
        date: '2026-11-10',
        recurring: false,
      },
    ],
    expenses: [
      {
        id: 'e1',
        title: 'سكن',
        category: 'housing',
        amount: 1500000,
        currency: 'IQD',
        date: '2026-11-02',
        paymentMethod: 'نقدي',
      },
    ],
    assets: [
      {
        id: 'a1',
        name: 'بنك',
        category: 'bank',
        value: 10000000,
        currency: 'IQD',
        liquid: true,
        updatedAt: '2026-11-01',
      },
    ],
    liabilities: [
      {
        id: 'l1',
        name: 'قرض',
        category: 'bank_loan',
        remainingAmount: 2000,
        monthlyPayment: 200,
        currency: 'USD',
        dueDate: '2027-01-01',
      },
    ],
    investments: [
      {
        id: 'inv1',
        name: 'ذهب',
        category: 'gold',
        investedAmount: 4000,
        currentValue: 5000,
        currency: 'USD',
        purchaseDate: '2025-01-01',
      },
    ],
    goals: [],
  };

  const summary = calculateWealthSummary(sample);
  // Income: 3,000,000 + 1,000*1500 = 4,500,000 IQD
  assert.equal(summary.totalIncome, 4500000);
  // Expenses: 1,500,000 IQD
  assert.equal(summary.totalExpenses, 1500000);
  // Net Cash Flow: 3,000,000 IQD
  assert.equal(summary.netCashFlow, 3000000);
  // Savings rate: 3M / 4.5M = 66.666...%
  assert.ok(Math.abs(summary.savingsRatePct - 66.6667) < 0.01);
  // Investments value: 5,000 * 1500 = 7,500,000 IQD; Cost = 6,000,000; ROI = 25%
  assert.equal(summary.totalInvestmentsValue, 7500000);
  assert.equal(summary.investmentsGainLoss, 1500000);
  assert.equal(summary.investmentsReturnPct, 25);
  // Total Assets: 10,000,000 + 7,500,000 = 17,500,000 IQD
  assert.equal(summary.totalAssets, 17500000);
  // Total Liabilities: 2,000 * 1500 = 3,000,000 IQD
  assert.equal(summary.totalLiabilities, 3000000);
  // Net Worth: 17,500,000 - 3,000,000 = 14,500,000 IQD
  assert.equal(summary.netWorth, 14500000);
});

test('buildMonthlyCashFlow groups and sorts months chronologically', () => {
  const series = buildMonthlyCashFlow(SEED_WEALTH_STATE);
  assert.equal(series.length, 4);
  assert.equal(series[0].monthKey, '2026-08');
  assert.equal(series[series.length - 1].monthKey, '2026-11');
  for (const pt of series) {
    assert.equal(pt.net, pt.income - pt.expenses);
  }
});

test('buildExpenseBreakdown and buildInvestmentAllocation percentages sum to ~100%', () => {
  const expSlices = buildExpenseBreakdown(SEED_WEALTH_STATE);
  const expSum = expSlices.reduce((s, x) => s + x.percentage, 0);
  assert.ok(Math.abs(expSum - 100) < 0.01);

  const invSlices = buildInvestmentAllocation(SEED_WEALTH_STATE);
  assert.equal(invSlices.length, 6); // All 6 asset classes present in seed data
  const invSum = invSlices.reduce((s, x) => s + x.percentage, 0);
  assert.ok(Math.abs(invSum - 100) < 0.01);

  const incSlices = buildIncomeBreakdown(SEED_WEALTH_STATE);
  assert.ok(incSlices.length > 0);
  const incSum = incSlices.reduce((s, x) => s + x.percentage, 0);
  assert.ok(Math.abs(incSum - 100) < 0.01);
  assert.deepEqual(buildIncomeBreakdown(EMPTY_WEALTH_STATE), []);
});

test('calculateGoalProgress caps percentage at 100% and computes remaining accurately', () => {
  const partial = calculateGoalProgress({
    id: 'g1',
    title: 'هدف',
    category: 'ادخار',
    targetAmount: 10000,
    currentAmount: 4500,
    currency: 'USD',
    targetDate: '2027-01-01',
    monthlyContribution: 500,
  });
  assert.equal(partial.percentage, 45);
  assert.equal(partial.remaining, 5500);
  assert.equal(partial.isCompleted, false);

  const done = calculateGoalProgress({
    id: 'g2',
    title: 'مكتمل',
    category: 'ادخار',
    targetAmount: 10000,
    currentAmount: 12000,
    currency: 'USD',
    targetDate: '2027-01-01',
    monthlyContribution: 500,
  });
  assert.equal(done.percentage, 100);
  assert.equal(done.remaining, 0);
  assert.equal(done.isCompleted, true);
});

test('formatMoney formats IQD and USD cleanly in Arabic', () => {
  assert.equal(formatMoney(1500000, 'IQD'), '1,500,000 د.ع');
  assert.equal(formatMoney(-2500, 'USD'), '-2,500 دولار');
  assert.equal(formatMoney(1250.5, 'USD'), '1,250.50 دولار');
});
