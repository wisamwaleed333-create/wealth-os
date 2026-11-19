import { Currency } from '../types/wealth';

export type PlannerHorizonYears = 5 | 10;

export interface FutureWealthInput {
  monthlySavings: number;
  annualReturnRatePct: number;
  initialAmount?: number;
  currency: Currency;
  horizonYears: PlannerHorizonYears;
}

export interface FutureWealthYearPoint {
  year: number;
  yearLabel: string;
  totalContributed: number;
  investmentGrowth: number;
  totalWealth: number;
}

export interface HorizonSnapshot {
  years: number;
  totalContributed: number;
  investmentGrowth: number;
  totalWealth: number;
  growthSharePct: number;
}

export interface FutureWealthResult {
  input: Required<FutureWealthInput>;
  milestone5Years: HorizonSnapshot;
  milestone10Years: HorizonSnapshot;
  activeMilestone: HorizonSnapshot;
  yearlySeries: FutureWealthYearPoint[];
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function computeSnapshotAtYears(
  initialAmount: number,
  monthlySavings: number,
  annualReturnRatePct: number,
  years: number
): HorizonSnapshot {
  const months = Math.max(0, Math.round(years * 12));
  const monthlyRate = annualReturnRatePct / 100 / 12;
  const totalContributed = initialAmount + monthlySavings * months;

  let totalWealth = totalContributed;
  if (months > 0 && monthlyRate !== 0) {
    const compoundFactor = Math.pow(1 + monthlyRate, months);
    const futureInitial = initialAmount * compoundFactor;
    const futureContributions =
      monthlySavings * ((compoundFactor - 1) / monthlyRate);
    totalWealth = futureInitial + futureContributions;
  }

  const roundedTotal = Math.round(totalWealth * 100) / 100;
  const roundedContributed = Math.round(totalContributed * 100) / 100;
  const investmentGrowth = Math.round((roundedTotal - roundedContributed) * 100) / 100;
  const growthSharePct =
    roundedTotal > 0 ? Math.max(0, (investmentGrowth / roundedTotal) * 100) : 0;

  return {
    years,
    totalContributed: roundedContributed,
    investmentGrowth,
    totalWealth: roundedTotal,
    growthSharePct,
  };
}

/**
 * Calculate projected future wealth using monthly compounding for both 5-year
 * and 10-year milestones, plus a year-by-year trajectory up to the active horizon.
 */
export function calculateFutureWealth(
  rawInput: FutureWealthInput
): FutureWealthResult {
  const monthlySavings = Math.max(
    0,
    Number.isFinite(rawInput.monthlySavings) ? rawInput.monthlySavings : 0
  );
  const initialAmount = Math.max(
    0,
    Number.isFinite(rawInput.initialAmount ?? 0) ? (rawInput.initialAmount ?? 0) : 0
  );
  const annualReturnRatePct = clamp(rawInput.annualReturnRatePct, 0, 50);
  const horizonYears: PlannerHorizonYears = rawInput.horizonYears === 5 ? 5 : 10;

  const input: Required<FutureWealthInput> = {
    monthlySavings,
    annualReturnRatePct,
    initialAmount,
    currency: rawInput.currency,
    horizonYears,
  };

  const milestone5Years = computeSnapshotAtYears(
    initialAmount,
    monthlySavings,
    annualReturnRatePct,
    5
  );
  const milestone10Years = computeSnapshotAtYears(
    initialAmount,
    monthlySavings,
    annualReturnRatePct,
    10
  );

  const yearlySeries: FutureWealthYearPoint[] = [];
  for (let year = 0; year <= horizonYears; year += 1) {
    const snap = computeSnapshotAtYears(
      initialAmount,
      monthlySavings,
      annualReturnRatePct,
      year
    );
    yearlySeries.push({
      year,
      yearLabel: year === 0 ? 'اليوم' : `سنة ${year}`,
      totalContributed: snap.totalContributed,
      investmentGrowth: snap.investmentGrowth,
      totalWealth: snap.totalWealth,
    });
  }

  return {
    input,
    milestone5Years,
    milestone10Years,
    activeMilestone: horizonYears === 5 ? milestone5Years : milestone10Years,
    yearlySeries,
  };
}
