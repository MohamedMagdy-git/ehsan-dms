'use client';

import React, { useState } from 'react';
import { sanitizeNumericInput, parseSafeNumber } from '@/lib/number-utils';

export interface AmountInputProps {
  value: number | undefined | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  currency?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  id?: string;
  name?: string;
  className?: string;
  inputClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  allowEmpty?: boolean;
  'aria-label'?: string;
}

export function AmountInput({
  value,
  onChange,
  min = 0,
  max,
  placeholder = '0',
  currency = 'ج.م',
  disabled = false,
  required = false,
  autoFocus = false,
  id,
  name,
  className = '',
  inputClassName = '',
  size = 'md',
  'aria-label': ariaLabel,
}: AmountInputProps) {
  const [prevPropValue, setPrevPropValue] = useState(value);
  // Internal string state allows the user to clear the input with Backspace without instant reversion to 0
  const [textValue, setTextValue] = useState<string>(() => {
    if (value === null || value === undefined) return '';
    return String(value);
  });

  // Adjust textValue during render if parent prop changed externally
  if (value !== prevPropValue) {
    setPrevPropValue(value);
    const numericCurrent = parseSafeNumber(textValue, 0);
    const numericProp = Number.isFinite(value) ? (value as number) : 0;
    if (numericCurrent !== numericProp) {
      setTextValue(numericProp === 0 && textValue === '' ? '' : String(numericProp));
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Sanitize and convert Arabic-Indic numerals (٠-٩) on the fly to standard (0-9)
    const cleaned = sanitizeNumericInput(raw, false);

    if (cleaned === '') {
      setTextValue('');
      onChange(0);
      return;
    }

    let numeric = Number(cleaned);
    if (!Number.isFinite(numeric)) numeric = 0;

    if (max !== undefined && numeric > max) {
      numeric = max;
    }

    setTextValue(String(numeric));
    onChange(numeric);
  };

  const handleBlur = () => {
    if (textValue.trim() === '') {
      const fallback = min !== undefined && min > 0 ? min : 0;
      setTextValue(fallback === 0 ? '0' : String(fallback));
      onChange(fallback);
    } else {
      const numeric = parseSafeNumber(textValue, min || 0);
      if (min !== undefined && numeric < min) {
        setTextValue(String(min));
        onChange(min);
      }
    }
  };

  const sizeClasses = {
    sm: 'text-xs py-1 px-2',
    md: 'text-xs py-2 px-3',
    lg: 'text-sm py-2.5 px-3.5',
  };

  return (
    <div
      className={`relative flex items-center bg-white border border-slate-200 rounded-lg focus-within:border-teal-600 focus-within:ring-1 focus-within:ring-teal-600/20 transition-all ${
        disabled ? 'bg-slate-100 opacity-60 cursor-not-allowed' : ''
      } ${className}`}
      dir="rtl"
    >
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={textValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        id={id}
        name={name}
        aria-label={ariaLabel}
        className={`w-full font-mono tabular-nums text-slate-900 bg-transparent focus:outline-hidden text-right ${sizeClasses[size]} ${inputClassName}`}
      />
      {currency && (
        <span className="text-[11px] font-sans font-medium text-slate-500 pl-3 pr-1 shrink-0 select-none pointer-events-none">
          {currency}
        </span>
      )}
    </div>
  );
}
