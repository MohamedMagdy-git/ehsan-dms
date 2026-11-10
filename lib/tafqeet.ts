/**
 * دالة تفقيط المبالغ المالية باللغة العربية للجنيه المصري (Tafqeet Egyptian Pounds)
 * تستخدم في كشوف الصرف والإيصالات المالية الرسمية
 */
export function tafqeetEgyptianPounds(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'صفر جنيه مصري';

  const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertGroup(n: number): string {
    const h = Math.floor(n / 100);
    const r = n % 100;
    const parts: string[] = [];

    if (h > 0) {
      parts.push(hundreds[h]);
    }

    if (r > 0) {
      if (r < 10) {
        parts.push(units[r]);
      } else if (r < 20) {
        parts.push(teens[r - 10]);
      } else {
        const u = r % 10;
        const t = Math.floor(r / 10);
        if (u > 0) {
          parts.push(`${units[u]} و${tens[t]}`);
        } else {
          parts.push(tens[t]);
        }
      }
    }

    return parts.join(' و');
  }

  const rounded = Math.round(Math.abs(amount));
  const millions = Math.floor(rounded / 1000000);
  const thousands = Math.floor((rounded % 1000000) / 1000);
  const remainder = rounded % 1000;

  const resultParts: string[] = [];

  if (millions > 0) {
    if (millions === 1) {
      resultParts.push('مليون');
    } else if (millions === 2) {
      resultParts.push('مليونان');
    } else if (millions >= 3 && millions <= 10) {
      resultParts.push(`${units[millions]} ملايين`);
    } else {
      resultParts.push(`${convertGroup(millions)} مليون`);
    }
  }

  if (thousands > 0) {
    if (thousands === 1) {
      resultParts.push('ألف');
    } else if (thousands === 2) {
      resultParts.push('ألفان');
    } else if (thousands >= 3 && thousands <= 10) {
      resultParts.push(`${units[thousands]} آلاف`);
    } else {
      resultParts.push(`${convertGroup(thousands)} ألف`);
    }
  }

  if (remainder > 0) {
    resultParts.push(convertGroup(remainder));
  }

  return `${resultParts.join(' و')} جنيه مصري فقط لا غير`;
}

/**
 * الاسم المتوافق مع باقي شاشات النظام السابقة (Reports & Urgent Vouchers)
 */
export const tafqeetNumberToArabicWords = tafqeetEgyptianPounds;
