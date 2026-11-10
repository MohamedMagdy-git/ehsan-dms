/**
 * Utility functions for normalizing, sanitizing, and parsing numerals,
 * supporting Eastern Arabic (٠-٩) and Persian (۰-۹) numerals.
 */

const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Normalizes Eastern Arabic and Persian numerals to standard Western Arabic (0-9) digits.
 */
export function normalizeArabicNumerals(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return '';
  let str = String(input);

  // Replace Arabic-Indic digits
  for (let i = 0; i < 10; i++) {
    str = str.replaceAll(ARABIC_INDIC_DIGITS[i], String(i));
    str = str.replaceAll(PERSIAN_DIGITS[i], String(i));
  }

  return str;
}

/**
 * Sanitizes numeric input: normalizes Arabic numerals, removes all characters
 * except digits (and optionally a single decimal point).
 */
export function sanitizeNumericInput(
  input: string | number | null | undefined,
  allowDecimal = false
): string {
  const normalized = normalizeArabicNumerals(input);
  if (!normalized) return '';

  if (!allowDecimal) {
    // Only digits
    return normalized.replace(/[^\d]/g, '');
  }

  // Allow only digits and at most one decimal point
  let cleaned = normalized.replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  return cleaned;
}

/**
 * Safely parses a string/number input into a number, falling back to a default value if invalid.
 */
export function parseSafeNumber(
  input: string | number | null | undefined,
  fallback = 0
): number {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : fallback;
  }
  const sanitized = sanitizeNumericInput(input, true);
  if (sanitized === '' || sanitized === '.') return fallback;
  const num = Number(sanitized);
  return Number.isFinite(num) ? num : fallback;
}
