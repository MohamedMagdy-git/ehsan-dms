import { BeneficiaryCase, PayoutMethod } from '@/types';

export function getEffectivePayoutMethod(payoutMethod?: PayoutMethod): PayoutMethod {
  return payoutMethod === 'e_wallet' ? 'e_wallet' : 'cash_researcher';
}

export function getPayoutMethodLabel(payoutMethod?: PayoutMethod): string {
  return getEffectivePayoutMethod(payoutMethod) === 'e_wallet'
    ? 'محفظة إلكترونية'
    : 'نقدي عبر الباحث';
}

export function normalizeWalletDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11);
}

export function isValidEgyptianWalletNumber(value: string): boolean {
  return /^01[0125]\d{8}$/.test(value.trim());
}

/**
 * الملاحظة الافتراضية لخانة «ملاحظات التسليم» في كشوف الصرف الميداني:
 * - تبدأ فارغة تماماً للحالات النقدية (بدون معادلة التخصيص الآلية)
 * - أو تحتوي فقط على رقم المحفظة الإلكترونية إن وجد
 */
export function getDefaultDeliveryNote(
  caseObj?: Pick<BeneficiaryCase, 'payoutMethod' | 'walletNumber'>
): string {
  if (
    caseObj?.payoutMethod === 'e_wallet' &&
    caseObj.walletNumber &&
    caseObj.walletNumber.trim()
  ) {
    return `محفظة إلكترونية: ${caseObj.walletNumber.trim()}`;
  }
  return '';
}

/**
 * نسخ نص إلى الحافظة مع بديل آمن لبيئات الـ iFrame والموبايل
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }

  try {
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    }
  } catch {
    return false;
  }

  return false;
}
