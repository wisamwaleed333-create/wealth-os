import React from 'react';
import {
  Banknote,
  BarChart3,
  Briefcase,
  Building2,
  Car,
  CircleDollarSign,
  Coins,
  CreditCard,
  FolderKanban,
  Gem,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  Plane,
  Receipt,
  Store,
  TrendingUp,
  Users,
  Utensils,
  Wallet,
  Zap,
} from 'lucide-react';
import {
  AssetCategory,
  ExpenseCategory,
  IncomeCategory,
  InvestmentCategory,
  LiabilityCategory,
} from '../types/wealth';

interface CategoryIconProps {
  kind: 'income' | 'expense' | 'asset' | 'liability' | 'investment';
  category: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  kind,
  category,
  className = 'w-4 h-4',
}) => {
  if (kind === 'income') {
    switch (category as IncomeCategory) {
      case 'salary':
        return <Briefcase className={className} />;
      case 'business':
        return <Store className={className} />;
      case 'freelance':
        return <Laptop className={className} />;
      case 'rental':
        return <Building2 className={className} />;
      case 'dividends':
        return <TrendingUp className={className} />;
      default:
        return <CircleDollarSign className={className} />;
    }
  }

  if (kind === 'expense') {
    switch (category as ExpenseCategory) {
      case 'housing':
        return <Home className={className} />;
      case 'food':
        return <Utensils className={className} />;
      case 'transport':
        return <Car className={className} />;
      case 'utilities':
        return <Zap className={className} />;
      case 'health':
        return <HeartPulse className={className} />;
      case 'education':
        return <GraduationCap className={className} />;
      case 'family':
        return <Users className={className} />;
      case 'lifestyle':
        return <Plane className={className} />;
      default:
        return <Receipt className={className} />;
    }
  }

  if (kind === 'asset') {
    switch (category as AssetCategory) {
      case 'cash':
        return <Banknote className={className} />;
      case 'bank':
        return <Landmark className={className} />;
      case 'property':
        return <Building2 className={className} />;
      case 'vehicle':
        return <Car className={className} />;
      case 'valuables':
        return <Gem className={className} />;
      default:
        return <Wallet className={className} />;
    }
  }

  if (kind === 'liability') {
    switch (category as LiabilityCategory) {
      case 'mortgage':
        return <Home className={className} />;
      case 'bank_loan':
        return <Landmark className={className} />;
      case 'installments':
        return <Receipt className={className} />;
      case 'credit_card':
        return <CreditCard className={className} />;
      case 'personal_debt':
        return <Users className={className} />;
      default:
        return <Wallet className={className} />;
    }
  }

  switch (category as InvestmentCategory) {
    case 'stocks':
      return <BarChart3 className={className} />;
    case 'real_estate':
      return <Building2 className={className} />;
    case 'gold':
      return <Coins className={className} />;
    case 'forex':
      return <CircleDollarSign className={className} />;
    case 'crypto':
      return <TrendingUp className={className} />;
    default:
      return <FolderKanban className={className} />;
  }
};
