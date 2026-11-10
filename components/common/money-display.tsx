'use client';

import React from 'react';

export type MoneyDisplaySize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type MoneyDisplayVariant = 'neutral' | 'approved' | 'gap' | 'muted' | 'rose' | 'teal';

export interface MoneyDisplayProps {
  amount: number | null | undefined;
  size?: MoneyDisplaySize;
  variant?: MoneyDisplayVariant;
  className?: string;
  numberClassName?: string;
  currencyClassName?: string;
  showCurrency?: boolean;
  currencyText?: string;
  locale?: string;
}

export function MoneyDisplay({
  amount = 0,
  size = 'md',
  variant = 'neutral',
  className = '',
  numberClassName = '',
  currencyClassName = '',
  showCurrency = true,
  currencyText = 'ج.م',
  locale = 'en-US',
}: MoneyDisplayProps) {
  const safeAmount = Number.isFinite(amount) ? (amount as number) : 0;
  // Ensure consistent digit rendering across Node SSR and client browser
  const effectiveLocale = locale === 'ar-EG' ? 'en-US' : locale;
  const formattedNumber = safeAmount.toLocaleString(effectiveLocale);

  // Size mappings
  const sizeStyles: Record<MoneyDisplaySize, { number: string; currency: string }> = {
    xs: {
      number: 'text-xs',
      currency: 'text-[10px]',
    },
    sm: {
      number: 'text-sm',
      currency: 'text-[11px]',
    },
    md: {
      number: 'text-base',
      currency: 'text-xs',
    },
    lg: {
      number: 'text-xl',
      currency: 'text-xs',
    },
    xl: {
      number: 'text-2xl',
      currency: 'text-sm',
    },
  };

  // Color variant mappings
  const variantStyles: Record<MoneyDisplayVariant, string> = {
    neutral: 'text-slate-900',
    approved: 'text-emerald-700',
    gap: 'text-amber-700',
    muted: 'text-slate-500',
    rose: 'text-rose-700',
    teal: 'text-[#005756]',
  };

  const currentSize = sizeStyles[size] || sizeStyles.md;
  const currentVariant = variantStyles[variant] || variantStyles.neutral;

  return (
    <span
      className={`inline-flex items-baseline gap-1 font-sans tabular-nums select-all ${className}`}
      dir="rtl"
    >
      <span
        suppressHydrationWarning
        className={`font-bold tracking-tight ${currentSize.number} ${currentVariant} ${numberClassName}`}
      >
        {formattedNumber}
      </span>
      {showCurrency && (
        <span
          className={`font-normal text-slate-500/90 shrink-0 ${currentSize.currency} ${currencyClassName}`}
        >
          {currencyText}
        </span>
      )}
    </span>
  );
}

/**
 * Helper function for string formatting when JSX component cannot be used (e.g. tooltips or logs)
 */
export function formatCurrencyString(
  amount: number | null | undefined,
  currency = 'ج.م',
  locale = 'en-US'
): string {
  const safe = Number.isFinite(amount) ? (amount as number) : 0;
  const effectiveLocale = locale === 'ar-EG' ? 'en-US' : locale;
  return `${safe.toLocaleString(effectiveLocale)} ${currency}`;
}
