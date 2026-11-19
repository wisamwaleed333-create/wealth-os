import { Currency } from '../types/wealth';

export interface PurchasingPowerInput {
  amount: number;
  currency: Currency;
  annualInflationRatePct: number;
  annualNominalReturnPct: number;
  years: number;
}

export interface PurchasingPowerYearPoint {
  year: number;
  yearLabel: string;
  nominalCash: number;
  realCashPurchasingPower: number;
  realInvestedPurchasingPower: number;
  nominalInvestedValue: number;
  cumulativeInflationPct: number;
  purchasingPowerRetentionPct: number;
}

export interface PurchasingPowerResult {
  input: PurchasingPowerInput;
  yearlySeries: PurchasingPowerYearPoint[];
  finalRealCashValue: number;
  finalRealInvestedValue: number;
  finalNominalInvestedValue: number;
  purchasingPowerLossAmount: number;
  purchasingPowerLossPct: number;
  purchasingPowerRetentionPct: number;
  equivalentFutureCost: number;
  realAnnualReturnPct: number;
  halfLifeYears: number | null;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Calculate how inflation erodes purchasing power over time and compare idle cash
 * against an investment earning a nominal annual return (using exact Fisher math).
 */
export function calculatePurchasingPower(
  rawInput: PurchasingPowerInput
): PurchasingPowerResult {
  const amount = Math.max(0, Number.isFinite(rawInput.amount) ? rawInput.amount : 0);
  const annualInflationRatePct = clamp(rawInput.annualInflationRatePct, 0, 100);
  const annualNominalReturnPct = clamp(rawInput.annualNominalReturnPct, -50, 100);
  const years = Math.round(clamp(rawInput.years, 1, 50));

  const input: PurchasingPowerInput = {
    amount,
    currency: rawInput.currency,
    annualInflationRatePct,
    annualNominalReturnPct,
    years,
  };

  const infRate = annualInflationRatePct / 100;
  const retRate = annualNominalReturnPct / 100;

  const yearlySeries: PurchasingPowerYearPoint[] = [];

  for (let t = 0; t <= years; t += 1) {
    const inflationFactor = Math.pow(1 + infRate, t);
    const returnFactor = Math.pow(1 + retRate, t);

    const nominalCash = amount;
    const realCashPurchasingPower = inflationFactor > 0 ? amount / inflationFactor : amount;
    const nominalInvestedValue = amount * returnFactor;
    const realInvestedPurchasingPower =
      inflationFactor > 0 ? nominalInvestedValue / inflationFactor : nominalInvestedValue;

    const cumulativeInflationPct = (inflationFactor - 1) * 100;
    const purchasingPowerRetentionPct =
      amount > 0 ? (realCashPurchasingPower / amount) * 100 : t === 0 ? 100 : (1 / inflationFactor) * 100;

    yearlySeries.push({
      year: t,
      yearLabel: t === 0 ? 'اليوم' : `سنة ${t}`,
      nominalCash: Math.round(nominalCash * 100) / 100,
      realCashPurchasingPower: Math.round(realCashPurchasingPower * 100) / 100,
      realInvestedPurchasingPower: Math.round(realInvestedPurchasingPower * 100) / 100,
      nominalInvestedValue: Math.round(nominalInvestedValue * 100) / 100,
      cumulativeInflationPct,
      purchasingPowerRetentionPct,
    });
  }

  const finalPoint = yearlySeries[yearlySeries.length - 1];
  const finalRealCashValue = finalPoint.realCashPurchasingPower;
  const finalRealInvestedValue = finalPoint.realInvestedPurchasingPower;
  const finalNominalInvestedValue = finalPoint.nominalInvestedValue;

  const purchasingPowerLossAmount = Math.max(0, amount - finalRealCashValue);
  const purchasingPowerRetentionPct = finalPoint.purchasingPowerRetentionPct;
  const purchasingPowerLossPct =
    amount > 0
      ? (purchasingPowerLossAmount / amount) * 100
      : Math.max(0, 100 - purchasingPowerRetentionPct);

  const equivalentFutureCost = amount * Math.pow(1 + infRate, years);
  const realAnnualReturnPct = (((1 + retRate) / (1 + infRate)) - 1) * 100;
  const halfLifeYears = infRate > 0 ? Math.log(2) / Math.log(1 + infRate) : null;

  return {
    input,
    yearlySeries,
    finalRealCashValue,
    finalRealInvestedValue,
    finalNominalInvestedValue,
    purchasingPowerLossAmount,
    purchasingPowerLossPct,
    purchasingPowerRetentionPct,
    equivalentFutureCost,
    realAnnualReturnPct,
    halfLifeYears,
  };
}
