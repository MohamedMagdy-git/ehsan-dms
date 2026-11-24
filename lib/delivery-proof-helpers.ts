import { DeliveryProof } from '@/types';

/**
 * ضغط صورة إثبات التسليم تلقائياً من جهة المتصفح (Client-side Compression)
 * أقصى عرض أو ارتفاع: 1000px وجودة JPEG متوسطة (0.72) لحماية localStorage من الامتلاء.
 */
export async function compressDeliveryProofImage(
  file: File,
  maxDimension = 1000,
  quality = 0.72
): Promise<{ dataUrl: string; approxSizeKb: number }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('يرجى اختيار ملف صورة صالح (JPG أو PNG أو WebP)'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة'));
    reader.onload = () => {
      const rawDataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!rawDataUrl) {
        reject(new Error('تعذر قراءة محتوى الصورة'));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('تعذر معالجة الصورة المختارة'));
      img.onload = () => {
        try {
          let targetWidth = img.naturalWidth || img.width || 800;
          let targetHeight = img.naturalHeight || img.height || 600;

          if (targetWidth > maxDimension || targetHeight > maxDimension) {
            if (targetWidth >= targetHeight) {
              targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
              targetWidth = maxDimension;
            } else {
              targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
              targetHeight = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, targetWidth);
          canvas.height = Math.max(1, targetHeight);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            const fallbackKb = Math.max(1, Math.round((rawDataUrl.length * 0.75) / 1024));
            resolve({ dataUrl: rawDataUrl, approxSizeKb: fallbackKb });
            return;
          }

          // خلفية بيضاء لضمان وضوح الصور الشفافة (PNG) عند تحويلها إلى JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          const approxBytes = Math.round(
            ((compressedDataUrl.length - 'data:image/jpeg;base64,'.length) * 3) / 4
          );
          const approxSizeKb = Math.max(1, Math.round(approxBytes / 1024));

          resolve({
            dataUrl: compressedDataUrl,
            approxSizeKb,
          });
        } catch {
          const fallbackKb = Math.max(1, Math.round((rawDataUrl.length * 0.75) / 1024));
          resolve({ dataUrl: rawDataUrl, approxSizeKb: fallbackKb });
        }
      };

      img.src = rawDataUrl;
    };

    reader.readAsDataURL(file);
  });
}

export function buildGoogleMapsLocationUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export function formatDeliveryTimestamp(isoOrText: string): string {
  if (!isoOrText) return 'غير محدد';
  const parsed = new Date(isoOrText);
  if (Number.isNaN(parsed.getTime())) {
    return isoOrText;
  }
  return new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(parsed);
}

/**
 * صورة إيصال تحويل محفظة إلكترونية تجريبية خفيفة جداً (SVG Data URL)
 * لمعاينة ميزة «موثّق بإثبات» فور فتح النظام دون استهلاك مساحة في localStorage.
 */
const SEED_RECEIPT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="520" viewBox="0 0 720 520">
  <rect width="720" height="520" fill="#f8fafc"/>
  <rect x="44" y="28" width="632" height="464" rx="20" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <rect x="44" y="28" width="632" height="84" rx="20" fill="#005756"/>
  <rect x="44" y="92" width="632" height="20" fill="#005756"/>
  <text x="360" y="68" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="bold" fill="#ffffff">إيصال تحويل محفظة إلكترونية معتمد</text>
  <text x="360" y="96" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#ccfbf1">منظومة إحسان — توثيق صرف المساعدات الشهرية</text>

  <circle cx="360" cy="154" r="24" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
  <path d="M350 154 l7 7 l14 -14" fill="none" stroke="#16a34a" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="360" y="202" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="bold" fill="#0f172a">تم التحويل والاستلام بنجاح</text>
  <text x="360" y="234" text-anchor="middle" font-family="monospace" font-size="28" font-weight="bold" fill="#005756">4,000 EGP</text>

  <line x1="88" y1="258" x2="632" y2="258" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="6,6"/>

  <text x="616" y="294" text-anchor="end" font-family="sans-serif" font-size="15" fill="#64748b">المستفيد:</text>
  <text x="104" y="294" text-anchor="start" font-family="sans-serif" font-size="16" font-weight="bold" fill="#0f172a">أحمد رجب حسنين علي (EHS-105)</text>

  <text x="616" y="332" text-anchor="end" font-family="sans-serif" font-size="15" fill="#64748b">رقم المحفظة المحوّل إليها:</text>
  <text x="104" y="332" text-anchor="start" font-family="monospace" font-size="17" font-weight="bold" fill="#0f172a">01019876542</text>

  <text x="616" y="370" text-anchor="end" font-family="sans-serif" font-size="15" fill="#64748b">الدورة المعتمدة:</text>
  <text x="104" y="370" text-anchor="start" font-family="sans-serif" font-size="15" font-weight="bold" fill="#0f172a">كفالات أكتوبر 2026</text>

  <text x="616" y="408" text-anchor="end" font-family="sans-serif" font-size="15" fill="#64748b">رقم العملية المرجعي:</text>
  <text x="104" y="408" text-anchor="start" font-family="monospace" font-size="15" font-weight="bold" fill="#334155">TXN-20261016-88412</text>

  <text x="616" y="446" text-anchor="end" font-family="sans-serif" font-size="15" fill="#64748b">الباحث الميداني المنفّذ:</text>
  <text x="104" y="446" text-anchor="start" font-family="sans-serif" font-size="15" font-weight="bold" fill="#005756">د. طارق المنشاوي</text>
</svg>`;

export const SEED_DELIVERY_PROOF_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(
  SEED_RECEIPT_SVG
)}`;

export const SEED_CASE_05_CUSTODY_ID = 'cycle-alloc-2026-10-alloc-item-case-05-2026-10';
export const SEED_CASE_05_PERIOD_KEY = '2026-10::case-05';

export const SEED_CASE_05_DELIVERY_PROOF: DeliveryProof = {
  imageDataUrl: SEED_DELIVERY_PROOF_DATA_URL,
  capturedAt: '2026-10-16T14:25:00.000Z',
  location: {
    lat: 30.12861,
    lng: 31.24224,
  },
  deliveryNote:
    'تم تحويل مبلغ الكفالة الشهرية (4,000 ج.م) على محفظة المستحق (01019876542) وتأكيد الاستلام هاتفياً مع الأسرة.',
};

export const INITIAL_SEED_DELIVERED_CUSTODY_IDS: string[] = [SEED_CASE_05_CUSTODY_ID];

export const INITIAL_SEED_DELIVERY_PROOFS: Record<string, DeliveryProof> = {
  [SEED_CASE_05_CUSTODY_ID]: SEED_CASE_05_DELIVERY_PROOF,
  [SEED_CASE_05_PERIOD_KEY]: SEED_CASE_05_DELIVERY_PROOF,
};
