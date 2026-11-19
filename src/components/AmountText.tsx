import React from 'react';
import { Currency } from '../types/wealth';

interface AmountTextProps {
  amount: number;
  currency: Currency;
  compact?: boolean;
  className?: string;
  showSign?: boolean;
}

export const AmountText: React.FC<AmountTextProps> = ({
  amount,
  currency,
  compact = false,
  className = '',
  showSign = false,
}) => {
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  const sign = isNegative ? '-' : showSign && amount > 0 ? '+' : '';

  let numStr: string;
  let unit: string;

  if (currency === 'USD') {
    if (compact && absVal >= 1_000_000_000) {
      numStr = `${sign}${(absVal / 1_000_000_000).toFixed(2)}`;
      unit = 'مليار دولار';
    } else if (compact && absVal >= 1_000_000) {
      numStr = `${sign}${(absVal / 1_000_000).toFixed(2)}`;
      unit = 'مليون دولار';
    } else if (compact && absVal >= 1_000) {
      numStr = `${sign}${(absVal / 1_000).toFixed(1)}`;
      unit = 'ألف دولار';
    } else {
      const formatted = absVal.toLocaleString('en-US', {
        minimumFractionDigits: absVal % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      });
      numStr = `${sign}${formatted}`;
      unit = 'دولار';
    }
  } else if (compact && absVal >= 1_000_000_000) {
    numStr = `${sign}${(absVal / 1_000_000_000).toFixed(2)}`;
    unit = 'مليار د.ع';
  } else if (compact && absVal >= 1_000_000) {
    numStr = `${sign}${(absVal / 1_000_000).toFixed(2)}`;
    unit = 'مليون د.ع';
  } else {
    numStr = `${sign}${Math.round(absVal).toLocaleString('en-US')}`;
    unit = 'د.ع';
  }

  return (
    <span className={`inline-flex items-baseline gap-1.5 whitespace-nowrap ${className}`}>
      <span dir="ltr" className="font-mono tabular-nums">
        {numStr}
      </span>
      <span className="font-sans text-[0.72em] font-medium opacity-85">{unit}</span>
    </span>
  );
};
