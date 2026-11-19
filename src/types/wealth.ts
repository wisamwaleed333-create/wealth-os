export type Currency = 'IQD' | 'USD';

export type NavSection =
  | 'dashboard'
  | 'income'
  | 'expenses'
  | 'assets'
  | 'investments'
  | 'reports'
  | 'goals'
  | 'alerts';

export type IncomeCategory =
  | 'salary'
  | 'business'
  | 'freelance'
  | 'rental'
  | 'dividends'
  | 'other';

export type ExpenseCategory =
  | 'housing'
  | 'food'
  | 'transport'
  | 'health'
  | 'education'
  | 'family'
  | 'lifestyle'
  | 'utilities'
  | 'other';

export type AssetCategory =
  | 'cash'
  | 'bank'
  | 'property'
  | 'vehicle'
  | 'valuables'
  | 'other';

export type LiabilityCategory =
  | 'mortgage'
  | 'bank_loan'
  | 'installments'
  | 'credit_card'
  | 'personal_debt'
  | 'other';

export type InvestmentCategory =
  | 'stocks'
  | 'real_estate'
  | 'gold'
  | 'forex'
  | 'crypto'
  | 'projects';

export interface IncomeRecord {
  id: string;
  title: string;
  source: string;
  category: IncomeCategory;
  amount: number;
  currency: Currency;
  date: string; // YYYY-MM-DD
  recurring: boolean;
  notes?: string;
}

export interface ExpenseRecord {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  currency: Currency;
  date: string; // YYYY-MM-DD
  paymentMethod: string;
  notes?: string;
}

export interface AssetRecord {
  id: string;
  name: string;
  category: AssetCategory;
  value: number;
  currency: Currency;
  liquid: boolean;
  updatedAt: string; // YYYY-MM-DD
  notes?: string;
}

export interface LiabilityRecord {
  id: string;
  name: string;
  category: LiabilityCategory;
  remainingAmount: number;
  monthlyPayment: number;
  currency: Currency;
  dueDate: string; // YYYY-MM-DD
  notes?: string;
}

export interface InvestmentRecord {
  id: string;
  name: string;
  category: InvestmentCategory;
  investedAmount: number;
  currentValue: number;
  currency: Currency;
  quantityLabel?: string;
  purchaseDate: string; // YYYY-MM-DD
  notes?: string;
}

export interface FinancialGoal {
  id: string;
  title: string;
  category: string;
  targetAmount: number;
  currentAmount: number;
  currency: Currency;
  targetDate: string; // YYYY-MM-DD
  monthlyContribution: number;
  notes?: string;
}

export interface CategoryBudgetConfig {
  monthlyLimit: number;
  currency: Currency;
  enabled: boolean;
}

export type CategoryBudgetsMap = Partial<Record<ExpenseCategory, CategoryBudgetConfig>>;

export interface BillReminder {
  id: string;
  title: string;
  amount: number;
  currency: Currency;
  dueDate: string; // YYYY-MM-DD
  recurringMonthly: boolean;
  reminderDaysBefore: number;
  category: ExpenseCategory;
  paidForMonth?: string; // YYYY-MM
  notes?: string;
}

export interface NetWorthAlertConfig {
  enabled: boolean;
  dropThresholdPct: number;
  baselineNetWorthIQD: number;
  autoUpdatePeak: boolean;
}

export type AlertSeverity = 'critical' | 'warning' | 'info';

export type SmartAlertType =
  | 'budget_exceeded'
  | 'budget_warning'
  | 'bill_overdue'
  | 'bill_due'
  | 'net_worth_drop';

export interface SmartAlert {
  id: string;
  type: SmartAlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  actionSection: NavSection;
  metricLabel?: string;
  billId?: string;
  category?: ExpenseCategory;
}

export interface WealthSettings {
  displayCurrency: Currency;
  exchangeRateIQDPerUSD: number;
}

export interface WealthState {
  incomes: IncomeRecord[];
  expenses: ExpenseRecord[];
  assets: AssetRecord[];
  liabilities: LiabilityRecord[];
  investments: InvestmentRecord[];
  goals: FinancialGoal[];
  settings: WealthSettings;
  categoryBudgets: CategoryBudgetsMap;
  billReminders: BillReminder[];
  netWorthAlert: NetWorthAlertConfig;
  dismissedAlertIds: string[];
}

export type PendingModalAction =
  | { section: 'income'; mode: 'create'; category?: IncomeCategory }
  | { section: 'income'; mode: 'edit'; recordId: string }
  | { section: 'expenses'; mode: 'create'; category?: ExpenseCategory }
  | { section: 'expenses'; mode: 'edit'; recordId: string }
  | { section: 'assets'; mode: 'create'; tab: 'assets'; category?: AssetCategory }
  | { section: 'assets'; mode: 'create'; tab: 'liabilities'; category?: LiabilityCategory }
  | { section: 'assets'; mode: 'edit'; tab: 'assets' | 'liabilities'; recordId: string }
  | { section: 'investments'; mode: 'create'; category?: InvestmentCategory }
  | { section: 'investments'; mode: 'edit'; recordId: string }
  | null;

