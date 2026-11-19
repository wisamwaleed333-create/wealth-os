import {
  AlertSeverity,
  BillReminder,
  Currency,
  ExpenseCategory,
  SmartAlert,
  WealthState,
} from '../types/wealth';
import { EXPENSE_CATEGORY_LABELS } from '../data/labels';
import {
  calculateNetWorthIQD,
  convertCurrency,
  formatMoney,
} from './finance';

export type BudgetHealthStatus = 'unset' | 'ok' | 'warning' | 'exceeded';

export interface CategoryBudgetStatus {
  category: ExpenseCategory;
  label: string;
  enabled: boolean;
  budgetCurrency: Currency;
  monthlyLimitInBudgetCurrency: number;
  monthlyLimitInDisplay: number;
  spentInDisplay: number;
  remainingInDisplay: number;
  overageInDisplay: number;
  utilizationPct: number;
  status: BudgetHealthStatus;
}

const ALL_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'housing',
  'food',
  'utilities',
  'transport',
  'health',
  'education',
  'family',
  'lifestyle',
  'other',
];

/**
 * Evaluate monthly expense budget limits against actual spending for a given YYYY-MM month.
 */
export function evaluateCategoryBudgets(
  state: WealthState,
  monthKey: string
): CategoryBudgetStatus[] {
  const { displayCurrency, exchangeRateIQDPerUSD } = state.settings;
  const spentMap = new Map<ExpenseCategory, number>();

  for (const exp of state.expenses) {
    if (!exp.date.startsWith(monthKey)) continue;
    const amt = convertCurrency(
      exp.amount,
      exp.currency,
      displayCurrency,
      exchangeRateIQDPerUSD
    );
    spentMap.set(exp.category, (spentMap.get(exp.category) ?? 0) + amt);
  }

  return ALL_EXPENSE_CATEGORIES.map((category) => {
    const config = state.categoryBudgets[category];
    const spentInDisplay = spentMap.get(category) ?? 0;

    if (!config || !config.enabled || config.monthlyLimit <= 0) {
      return {
        category,
        label: EXPENSE_CATEGORY_LABELS[category],
        enabled: false,
        budgetCurrency: config?.currency ?? displayCurrency,
        monthlyLimitInBudgetCurrency: config?.monthlyLimit ?? 0,
        monthlyLimitInDisplay: 0,
        spentInDisplay,
        remainingInDisplay: 0,
        overageInDisplay: 0,
        utilizationPct: 0,
        status: 'unset' as const,
      };
    }

    const limitInDisplay = convertCurrency(
      config.monthlyLimit,
      config.currency,
      displayCurrency,
      exchangeRateIQDPerUSD
    );

    const utilizationPct = limitInDisplay > 0 ? (spentInDisplay / limitInDisplay) * 100 : 0;
    const remainingInDisplay = Math.max(0, limitInDisplay - spentInDisplay);
    const overageInDisplay = Math.max(0, spentInDisplay - limitInDisplay);

    let status: BudgetHealthStatus = 'ok';
    if (spentInDisplay > limitInDisplay) {
      status = 'exceeded';
    } else if (utilizationPct >= 85) {
      status = 'warning';
    }

    return {
      category,
      label: EXPENSE_CATEGORY_LABELS[category],
      enabled: true,
      budgetCurrency: config.currency,
      monthlyLimitInBudgetCurrency: config.monthlyLimit,
      monthlyLimitInDisplay: limitInDisplay,
      spentInDisplay,
      remainingInDisplay,
      overageInDisplay,
      utilizationPct,
      status,
    };
  });
}

export interface EvaluatedBillReminder {
  bill: BillReminder;
  effectiveDueDate: string; // YYYY-MM-DD
  daysUntilDue: number;
  isPaidThisCycle: boolean;
  isOverdue: boolean;
  isDueSoon: boolean;
}

function parseISODateUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1));
}

function formatISODateUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Evaluate upcoming and overdue bill reminders relative to referenceDateStr (YYYY-MM-DD).
 */
export function evaluateBillReminders(
  bills: BillReminder[],
  referenceDateStr: string
): EvaluatedBillReminder[] {
  const refDate = parseISODateUTC(referenceDateStr);
  const currentMonthKey = referenceDateStr.slice(0, 7);

  return bills
    .map((bill) => {
      let effectiveDue = parseISODateUTC(bill.dueDate);

      // For recurring monthly bills whose base dueDate was in an earlier month,
      // project onto the reference month (clamped to valid day of month) if not yet paid or for this cycle.
      if (bill.recurringMonthly && bill.dueDate.slice(0, 7) < currentMonthKey) {
        const refYear = refDate.getUTCFullYear();
        const refMonth = refDate.getUTCMonth();
        const originalDay = effectiveDue.getUTCDate();
        const lastDayOfRefMonth = new Date(Date.UTC(refYear, refMonth + 1, 0)).getUTCDate();
        effectiveDue = new Date(
          Date.UTC(refYear, refMonth, Math.min(originalDay, lastDayOfRefMonth))
        );
      }

      const effectiveDueDate = formatISODateUTC(effectiveDue);
      const dueMonthKey = effectiveDueDate.slice(0, 7);
      const isPaidThisCycle = bill.paidForMonth === dueMonthKey;

      const diffMs = effectiveDue.getTime() - refDate.getTime();
      const daysUntilDue = Math.round(diffMs / (1000 * 60 * 60 * 24));

      const isOverdue = !isPaidThisCycle && daysUntilDue < 0;
      const isDueSoon =
        !isPaidThisCycle && daysUntilDue >= 0 && daysUntilDue <= bill.reminderDaysBefore;

      return {
        bill,
        effectiveDueDate,
        daysUntilDue,
        isPaidThisCycle,
        isOverdue,
        isDueSoon,
      };
    })
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

export interface NetWorthAlertEvaluation {
  enabled: boolean;
  thresholdPct: number;
  currentNetWorthIQD: number;
  baselineNetWorthIQD: number;
  currentNetWorthDisplay: number;
  baselineNetWorthDisplay: number;
  dropAmountDisplay: number;
  dropPct: number;
  isTriggered: boolean;
}

/**
 * Evaluate whether net worth has dropped below the baseline by at least dropThresholdPct.
 */
export function evaluateNetWorthAlert(state: WealthState): NetWorthAlertEvaluation {
  const { displayCurrency, exchangeRateIQDPerUSD } = state.settings;
  const config = state.netWorthAlert;
  const currentNetWorthIQD = calculateNetWorthIQD(state);
  const baselineIQD = config.baselineNetWorthIQD;

  const dropIQD = Math.max(0, baselineIQD - currentNetWorthIQD);
  const dropPct = baselineIQD > 0 ? (dropIQD / baselineIQD) * 100 : 0;

  const isTriggered =
    config.enabled &&
    baselineIQD > 0 &&
    config.dropThresholdPct > 0 &&
    dropPct >= config.dropThresholdPct;

  return {
    enabled: config.enabled,
    thresholdPct: config.dropThresholdPct,
    currentNetWorthIQD,
    baselineNetWorthIQD: baselineIQD,
    currentNetWorthDisplay: convertCurrency(
      currentNetWorthIQD,
      'IQD',
      displayCurrency,
      exchangeRateIQDPerUSD
    ),
    baselineNetWorthDisplay: convertCurrency(
      baselineIQD,
      'IQD',
      displayCurrency,
      exchangeRateIQDPerUSD
    ),
    dropAmountDisplay: convertCurrency(
      dropIQD,
      'IQD',
      displayCurrency,
      exchangeRateIQDPerUSD
    ),
    dropPct,
    isTriggered,
  };
}

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

/**
 * Generate all active smart alerts (budgets, bill reminders, net worth drop),
 * excluding alerts dismissed by the user.
 */
export function generateSmartAlerts(
  state: WealthState,
  referenceDateStr: string
): SmartAlert[] {
  const monthKey = referenceDateStr.slice(0, 7);
  const { displayCurrency, exchangeRateIQDPerUSD } = state.settings;
  const dismissed = new Set(state.dismissedAlertIds);
  const alerts: SmartAlert[] = [];

  // 1. Net worth drop alert
  const nwEval = evaluateNetWorthAlert(state);
  if (nwEval.isTriggered) {
    const id = `nw-drop-${Math.floor(nwEval.dropPct)}`;
    if (!dismissed.has(id)) {
      alerts.push({
        id,
        type: 'net_worth_drop',
        severity: 'critical',
        title: `انخفاض صافي الثروة بنسبة ${nwEval.dropPct.toFixed(1)}%`,
        message: `انخفض صافي ثروتك بمقدار ${formatMoney(nwEval.dropAmountDisplay, displayCurrency)} عن المرجع المحدد (${formatMoney(nwEval.baselineNetWorthDisplay, displayCurrency)})، متجاوزاً حد التنبيه (${nwEval.thresholdPct}%).`,
        actionSection: 'assets',
        metricLabel: `-${nwEval.dropPct.toFixed(1)}%`,
      });
    }
  }

  // 2. Category monthly budget alerts
  const budgetStatuses = evaluateCategoryBudgets(state, monthKey);
  for (const b of budgetStatuses) {
    if (b.status === 'exceeded') {
      const id = `budget-exceeded-${monthKey}-${b.category}`;
      if (!dismissed.has(id)) {
        alerts.push({
          id,
          type: 'budget_exceeded',
          severity: 'critical',
          title: `تجاوز سقف ميزانية "${b.label}"`,
          message: `بلغ الإنفاق ${formatMoney(b.spentInDisplay, displayCurrency)} متجاوزاً السقف الشهري (${formatMoney(b.monthlyLimitInDisplay, displayCurrency)}) بمقدار ${formatMoney(b.overageInDisplay, displayCurrency)}.`,
          actionSection: 'expenses',
          metricLabel: `${b.utilizationPct.toFixed(0)}%`,
          category: b.category,
        });
      }
    } else if (b.status === 'warning') {
      const id = `budget-warning-${monthKey}-${b.category}`;
      if (!dismissed.has(id)) {
        alerts.push({
          id,
          type: 'budget_warning',
          severity: 'warning',
          title: `اقتراب من سقف ميزانية "${b.label}"`,
          message: `تم استهلاك ${b.utilizationPct.toFixed(0)}% من السقف الشهري. المتبقي ${formatMoney(b.remainingInDisplay, displayCurrency)}.`,
          actionSection: 'expenses',
          metricLabel: `${b.utilizationPct.toFixed(0)}%`,
          category: b.category,
        });
      }
    }
  }

  // 3. Bill payment reminders
  const evaluatedBills = evaluateBillReminders(state.billReminders, referenceDateStr);
  for (const item of evaluatedBills) {
    const amountInDisplay = convertCurrency(
      item.bill.amount,
      item.bill.currency,
      displayCurrency,
      exchangeRateIQDPerUSD
    );

    if (item.isOverdue) {
      const id = `bill-overdue-${item.bill.id}-${item.effectiveDueDate}`;
      if (!dismissed.has(id)) {
        alerts.push({
          id,
          type: 'bill_overdue',
          severity: 'critical',
          title: `فاتورة متأخرة: ${item.bill.title}`,
          message: `تجاوز موعد استحقاقها (${item.effectiveDueDate}) بـ ${Math.abs(item.daysUntilDue)} أيام. المبلغ: ${formatMoney(amountInDisplay, displayCurrency)}.`,
          actionSection: 'alerts',
          metricLabel: `متأخر ${Math.abs(item.daysUntilDue)} يوم`,
          billId: item.bill.id,
        });
      }
    } else if (item.isDueSoon) {
      const id = `bill-due-${item.bill.id}-${item.effectiveDueDate}`;
      if (!dismissed.has(id)) {
        const dayText =
          item.daysUntilDue === 0
            ? 'مستحقة اليوم'
            : item.daysUntilDue === 1
            ? 'مستحقة غداً'
            : `مستحقة خلال ${item.daysUntilDue} أيام`;
        alerts.push({
          id,
          type: 'bill_due',
          severity: item.daysUntilDue <= 2 ? 'warning' : 'info',
          title: `تذكير دفع: ${item.bill.title}`,
          message: `${dayText} (${item.effectiveDueDate}) بمبلغ ${formatMoney(amountInDisplay, displayCurrency)}.`,
          actionSection: 'alerts',
          metricLabel: dayText,
          billId: item.bill.id,
        });
      }
    }
  }

  return alerts.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
