import {
  AssetCategory,
  ExpenseCategory,
  IncomeCategory,
  InvestmentCategory,
  LiabilityCategory,
  NavSection,
} from '../types/wealth';

export const NAV_ITEMS: { id: NavSection; label: string; shortLabel: string }[] = [
  { id: 'dashboard', label: 'لوحة التحكم', shortLabel: 'الرئيسية' },
  { id: 'income', label: 'الإيرادات والدخل', shortLabel: 'الإيرادات' },
  { id: 'expenses', label: 'المصروفات', shortLabel: 'المصروفات' },
  { id: 'assets', label: 'الأصول والالتزامات', shortLabel: 'الأصول' },
  { id: 'investments', label: 'الاستثمارات', shortLabel: 'الاستثمارات' },
  { id: 'reports', label: 'التقارير والتحليلات', shortLabel: 'التقارير' },
  { id: 'goals', label: 'الأهداف والادخار', shortLabel: 'الأهداف' },
  { id: 'alerts', label: 'التنبيهات الذكية', shortLabel: 'التنبيهات' },
];

export const INCOME_CATEGORY_LABELS: Record<IncomeCategory, string> = {
  salary: 'راتب شهري',
  business: 'أرباح مشاريع وتجارة',
  freelance: 'عمل حر واستشارات',
  rental: 'عوائد إيجار عقاري',
  dividends: 'توزيعات واستثمارات',
  other: 'مصادر أخرى',
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  housing: 'السكن والإيجار',
  food: 'الطعام والمشتريات',
  transport: 'المواصلات والوقود',
  utilities: 'الكهرباء والإنترنت والخدمات',
  health: 'الصحة والعناية',
  education: 'التعليم والتطوير',
  family: 'الالتزامات العائلية',
  lifestyle: 'الترفيه والسفر',
  other: 'مصروفات أخرى',
};

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  cash: 'نقد سائل',
  bank: 'حسابات بنكية',
  property: 'عقار شخصي',
  vehicle: 'مركبات',
  valuables: 'مقتنيات ثمينة',
  other: 'أصول أخرى',
};

export const LIABILITY_CATEGORY_LABELS: Record<LiabilityCategory, string> = {
  mortgage: 'تمويل عقاري',
  bank_loan: 'قرض بنكي',
  installments: 'أقساط مجدولة',
  credit_card: 'بطاقات ائتمان',
  personal_debt: 'التزامات شخصية',
  other: 'التزامات أخرى',
};

export const INVESTMENT_CATEGORY_LABELS: Record<InvestmentCategory, string> = {
  stocks: 'الأسهم',
  real_estate: 'العقارات',
  gold: 'الذهب',
  forex: 'العملات',
  crypto: 'الأصول الرقمية',
  projects: 'المشاريع',
};

export const PAYMENT_METHODS = [
  'نقدي',
  'بطاقة مصرفية',
  'تحويل بنكي',
  'محفظة إلكترونية (زين كاش / آسيا باي)',
];

export const CHART_COLORS = [
  '#0B1526', // Deep Navy
  '#C8A24A', // Champagne Gold
  '#234375', // Slate Navy
  '#7A5E1E', // Antique Gold
  '#47658E', // Steel Blue
  '#94A3B8', // Cool Silver
  '#15803D', // Emerald
  '#B45309', // Amber
];

export const CHART_COLORS_DARK = [
  '#4F7AC7', // Luminous Slate Blue
  '#DDBB6A', // Warm Champagne Gold
  '#38BDF8', // Sky Blue
  '#C8A24A', // Champagne Gold
  '#7C9CE0', // Soft Indigo Blue
  '#94A3B8', // Cool Silver
  '#22C55E', // Emerald
  '#F59E0B', // Warm Amber
];

export const CURRENCY_LABELS: Record<'IQD' | 'USD', string> = {
  IQD: 'دينار عراقي',
  USD: 'دولار أمريكي',
};

export const CURRENCY_SHORT_LABELS: Record<'IQD' | 'USD', string> = {
  IQD: 'دينار',
  USD: 'دولار',
};

export const ARABIC_MONTHS: Record<string, string> = {
  '01': 'كانون الثاني',
  '02': 'شباط',
  '03': 'آذار',
  '04': 'نيسان',
  '05': 'أيار',
  '06': 'حزيران',
  '07': 'تموز',
  '08': 'آب',
  '09': 'أيلول',
  '10': 'تشرين الأول',
  '11': 'تشرين الثاني',
  '12': 'كانون الأول',
};

export function formatArabicMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const monthName = ARABIC_MONTHS[month] ?? month;
  return `${monthName} ${year}`;
}
