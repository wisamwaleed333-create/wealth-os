import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateBillReminders,
  evaluateCategoryBudgets,
  evaluateNetWorthAlert,
  generateSmartAlerts,
} from './alerts';
import { SEED_WEALTH_STATE } from '../data/seedData';
import { WealthState } from '../types/wealth';

test('evaluateCategoryBudgets detects ok, warning (>=85%), and exceeded (>100%) spending', () => {
  const statuses = evaluateCategoryBudgets(SEED_WEALTH_STATE, '2026-11');
  const byCategory = new Map(statuses.map((s) => [s.category, s]));

  // Education in 2026-11: $220 * 1500 = 330,000 IQD vs 300,000 IQD limit -> exceeded
  const edu = byCategory.get('education')!;
  assert.equal(edu.status, 'exceeded');
  assert.equal(edu.spentInDisplay, 330000);
  assert.equal(edu.overageInDisplay, 30000);

  // Housing in 2026-11: 950,000 IQD vs 1,000,000 IQD limit -> 95% warning
  const housing = byCategory.get('housing')!;
  assert.equal(housing.status, 'warning');
  assert.equal(housing.remainingInDisplay, 50000);

  // Food in 2026-11: 820,000 IQD vs 1,000,000 IQD limit -> 82% ok
  const food = byCategory.get('food')!;
  assert.equal(food.status, 'ok');
});

test('evaluateBillReminders identifies overdue, due soon, and paid bills accurately', () => {
  const bills = [
    {
      id: 'b1',
      title: 'فاتورة قريبة',
      amount: 100000,
      currency: 'IQD' as const,
      dueDate: '2026-11-19',
      recurringMonthly: true,
      reminderDaysBefore: 5,
      category: 'utilities' as const,
    },
    {
      id: 'b2',
      title: 'فاتورة متأخرة',
      amount: 200000,
      currency: 'IQD' as const,
      dueDate: '2026-11-14',
      recurringMonthly: false,
      reminderDaysBefore: 3,
      category: 'housing' as const,
    },
    {
      id: 'b3',
      title: 'فاتورة مدفوعة',
      amount: 150000,
      currency: 'IQD' as const,
      dueDate: '2026-11-18',
      recurringMonthly: true,
      reminderDaysBefore: 5,
      category: 'food' as const,
      paidForMonth: '2026-11',
    },
  ];

  const evaluated = evaluateBillReminders(bills, '2026-11-17');
  const map = new Map(evaluated.map((e) => [e.bill.id, e]));

  assert.equal(map.get('b1')!.daysUntilDue, 2);
  assert.equal(map.get('b1')!.isDueSoon, true);
  assert.equal(map.get('b1')!.isOverdue, false);

  assert.equal(map.get('b2')!.daysUntilDue, -3);
  assert.equal(map.get('b2')!.isOverdue, true);

  assert.equal(map.get('b3')!.isPaidThisCycle, true);
  assert.equal(map.get('b3')!.isDueSoon, false);
  assert.equal(map.get('b3')!.isOverdue, false);
});

test('evaluateNetWorthAlert triggers only when net worth drops by threshold percentage or more', () => {
  const baseEval = evaluateNetWorthAlert(SEED_WEALTH_STATE);
  assert.equal(baseEval.isTriggered, false);
  assert.equal(baseEval.dropPct, 0);

  // Add a 30,000,000 IQD liability -> ~9.2% drop from 324,780,000 IQD -> triggers 5% threshold
  const droppedState: WealthState = {
    ...SEED_WEALTH_STATE,
    liabilities: [
      ...SEED_WEALTH_STATE.liabilities,
      {
        id: 'lib-test',
        name: 'التزام طارئ',
        category: 'personal_debt',
        remainingAmount: 30000000,
        monthlyPayment: 1000000,
        currency: 'IQD',
        dueDate: '2027-01-01',
      },
    ],
  };

  const dropEval = evaluateNetWorthAlert(droppedState);
  assert.equal(dropEval.isTriggered, true);
  assert.ok(dropEval.dropPct > 9);

  // Raising threshold to 15% prevents trigger
  const higherThreshold: WealthState = {
    ...droppedState,
    netWorthAlert: { ...droppedState.netWorthAlert, dropThresholdPct: 15 },
  };
  assert.equal(evaluateNetWorthAlert(higherThreshold).isTriggered, false);
});

test('generateSmartAlerts orders critical alerts first and respects dismissedAlertIds', () => {
  const alerts = generateSmartAlerts(SEED_WEALTH_STATE, '2026-11-17');
  assert.ok(alerts.length >= 3);
  assert.equal(alerts[0].severity, 'critical');
  assert.ok(alerts.some((a) => a.type === 'budget_exceeded'));
  assert.ok(alerts.some((a) => a.type === 'bill_due'));

  const firstId = alerts[0].id;
  const afterDismiss = generateSmartAlerts(
    { ...SEED_WEALTH_STATE, dismissedAlertIds: [firstId] },
    '2026-11-17'
  );
  assert.equal(afterDismiss.some((a) => a.id === firstId), false);
});
