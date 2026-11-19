import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFutureWealth } from './futurePlanner.ts';

test('calculateFutureWealth computes exact linear sum when annual return is 0%', () => {
  const res = calculateFutureWealth({
    monthlySavings: 500_000,
    annualReturnRatePct: 0,
    initialAmount: 1_000_000,
    currency: 'IQD',
    horizonYears: 10,
  });

  // 5 years = 60 months: 1,000,000 + 60 * 500,000 = 31,000,000
  assert.equal(res.milestone5Years.totalContributed, 31_000_000);
  assert.equal(res.milestone5Years.totalWealth, 31_000_000);
  assert.equal(res.milestone5Years.investmentGrowth, 0);

  // 10 years = 120 months: 1,000,000 + 120 * 500,000 = 61,000,000
  assert.equal(res.milestone10Years.totalContributed, 61_000_000);
  assert.equal(res.milestone10Years.totalWealth, 61_000_000);
  assert.equal(res.milestone10Years.investmentGrowth, 0);
  assert.equal(res.yearlySeries.length, 11);
});

test('calculateFutureWealth applies monthly compounding accurately for 5 and 10 years', () => {
  const res = calculateFutureWealth({
    monthlySavings: 1000,
    annualReturnRatePct: 12, // 1% monthly
    initialAmount: 0,
    currency: 'USD',
    horizonYears: 5,
  });

  // FV(60) = 1000 * ((1.01^60 - 1) / 0.01) = 81669.67
  assert.equal(res.milestone5Years.totalContributed, 60_000);
  assert.ok(Math.abs(res.milestone5Years.totalWealth - 81_669.67) < 0.05);
  assert.ok(res.milestone5Years.investmentGrowth > 21_600);

  // FV(120) = 1000 * ((1.01^120 - 1) / 0.01) = 230038.69
  assert.equal(res.milestone10Years.totalContributed, 120_000);
  assert.ok(Math.abs(res.milestone10Years.totalWealth - 230_038.69) < 0.05);
  assert.ok(res.milestone10Years.growthSharePct > 45);
  assert.equal(res.yearlySeries.length, 6);
  assert.equal(res.activeMilestone.years, 5);
});

test('calculateFutureWealth clamps negative or invalid inputs safely', () => {
  const res = calculateFutureWealth({
    monthlySavings: -500,
    annualReturnRatePct: 120,
    initialAmount: -100,
    currency: 'IQD',
    horizonYears: 10,
  });

  assert.equal(res.input.monthlySavings, 0);
  assert.equal(res.input.initialAmount, 0);
  assert.equal(res.input.annualReturnRatePct, 50);
  assert.equal(res.milestone10Years.totalWealth, 0);
  assert.equal(res.yearlySeries[0]?.yearLabel, 'اليوم');
  assert.equal(res.yearlySeries[10]?.yearLabel, 'سنة 10');
});
