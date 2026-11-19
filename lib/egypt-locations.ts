import governoratesRaw from '@/public/assets/aistudio/governorates_cf13cc76.json';
import citiesRaw from '@/public/assets/aistudio/cities_b3e1a236.json';

interface RawGovernorateRow {
  id: string;
  governorate_name_ar: string;
  governorate_name_en: string;
}

interface RawCityRow {
  id: string;
  governorate_id: string;
  city_name_ar: string;
  city_name_en: string;
}

export interface GovernorateOption {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface CityOption {
  id: string;
  governorateId: string;
  nameAr: string;
  nameEn: string;
}

function extractTableRows<T>(rawExport: unknown): T[] {
  if (!Array.isArray(rawExport)) return [];
  const tableEntry = rawExport.find(
    (item): item is { type?: string; data: T[] } =>
      Boolean(item) &&
      typeof item === 'object' &&
      'data' in item &&
      Array.isArray((item as { data?: unknown }).data)
  );
  return tableEntry?.data ?? [];
}

/**
 * Normalizes Arabic and English text for forgiving search matching:
 * - Strips Arabic diacritics and tatweel
 * - Unifies Alef forms (أ إ آ ٱ -> ا), Alef Maksura (ى -> ي), Teh Marbuta (ة -> ه)
 * - Collapses extra whitespace and lowercases Latin characters
 */
export function normalizeLocationSearch(input: string): string {
  return input
    .trim()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export const EGYPT_GOVERNORATES: GovernorateOption[] = extractTableRows<RawGovernorateRow>(
  governoratesRaw
).map((row) => ({
  id: String(row.id),
  nameAr: row.governorate_name_ar.trim(),
  nameEn: row.governorate_name_en.trim(),
}));

export const EGYPT_CITIES: CityOption[] = extractTableRows<RawCityRow>(citiesRaw).map((row) => ({
  id: String(row.id),
  governorateId: String(row.governorate_id),
  nameAr: row.city_name_ar.trim(),
  nameEn: row.city_name_en.trim(),
}));

export function findGovernorateByName(name: string): GovernorateOption | undefined {
  if (!name.trim()) return undefined;
  const exact = EGYPT_GOVERNORATES.find((g) => g.nameAr === name.trim());
  if (exact) return exact;

  const normalizedTarget = normalizeLocationSearch(name);
  return EGYPT_GOVERNORATES.find(
    (g) =>
      normalizeLocationSearch(g.nameAr) === normalizedTarget ||
      normalizeLocationSearch(g.nameEn) === normalizedTarget
  );
}

export function getCitiesByGovernorateName(governorateName: string): CityOption[] {
  const gov = findGovernorateByName(governorateName);
  if (!gov) return [];
  return EGYPT_CITIES.filter((city) => city.governorateId === gov.id);
}
