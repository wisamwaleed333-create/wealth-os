import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePurchasingPower } from './inflation.ts';

test('calculatePurchasingPower computes accurate inflation erosion for idle cash', () => {
  const res = calculatePurchasingPower({
    amount: 10_000_000,
    currency: 'IQD',
    annualInflationRatePct: 10,
    annualNominalReturnPct: 0,
    years: 2,
  });

  // 10,000,000 / 1.1^2 = 8,264,462.81
  assert.ok(Math.abs(res.finalRealCashValue - 8_264_462.81) < 1);
  assert.ok(Math.abs(res.purchasingPowerLossAmount - 1_735_537.19) < 1);
  assert.ok(Math.abs(res.purchasingPowerLossPct - 17.355) < 0.05);
  assert.ok(Math.abs(res.equivalentFutureCost - 12_100_000) < 1);
  assert.equal(res.yearlySeries.length, 3);
  assert.equal(res.yearlySeries[0].realCashPurchasingPower, 10_000_000);
});

test('calculatePurchasingPower applies exact Fisher equation when nominal return matches or beats inflation', () => {
  const matched = calculatePurchasingPower({
    amount: 10_000,
    currency: 'USD',
    annualInflationRatePct: 5,
    annualNominalReturnPct: 5,
    years: 10,
  });

  assert.ok(Math.abs(matched.finalRealInvestedValue - 10_000) < 0.01);
  assert.ok(Math.abs(matched.realAnnualReturnPct) < 0.001);

  const beating = calculatePurchasingPower({
    amount: 10_000,
    currency: 'USD',
    annualInflationRatePct: 4,
    annualNominalReturnPct: 9.2,
    years: 5,
  });

  // (1.092 / 1.04) - 1 = 5% exact real return
  assert.ok(Math.abs(beating.realAnnualReturnPct - 5) < 0.01);
  assert.ok(beating.finalRealInvestedValue > 12_700);
});

test('calculatePurchasingPower handles zero inflation and computes half-life correctly', () => {
  const zeroInf = calculatePurchasingPower({
    amount: 5_000_000,
    currency: 'IQD',
    annualInflationRatePct: 0,
    annualNominalReturnPct: 0,
    years: 10,
  });

  assert.equal(zeroInf.finalRealCashValue, 5_000_000);
  assert.equal(zeroInf.purchasingPowerLossAmount, 0);
  assert.equal(zeroInf.halfLifeYears, null);

  const tenPct = calculatePurchasingPower({
    amount: 5_000_000,
    currency: 'IQD',
    annualInflationRatePct: 10,
    annualNominalReturnPct: 0,
    years: 10,
  });

  // Rule of 72 / exact log(2)/log(1.1) ≈ 7.2725 years
  assert.ok(tenPct.halfLifeYears !== null && Math.abs(tenPct.halfLifeYears - 7.2725) < 0.01);
});
