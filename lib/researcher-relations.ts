import {
  AuthUser,
  BeneficiaryCase,
  CaseNote,
  CaseResearchReport,
  FastTrackDisbursementOrder,
  FieldVisit,
  ResearcherProfile,
} from '@/types';
import { INITIAL_RESEARCHERS } from '@/data/initial-mock-data';

function normalizeArabicName(value?: string | null): string {
  return (value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^(أ\.|م\.|د\.)\s*/u, '');
}

/**
 * استنتاج المعرّف القياسي للباحث (researcher_id) من المعرّف الصريح أو الاسم المسجل
 * يضمن التوافق الكامل بين البيانات المحلية وسياسات RLS المستقبلية في Supabase
 */
export function resolveResearcherId(
  researcherName?: string | null,
  explicitResearcherId?: string | null
): string | undefined {
  if (explicitResearcherId && explicitResearcherId.trim()) {
    return explicitResearcherId.trim();
  }
  const rawName = (researcherName || '').trim();
  if (!rawName) return undefined;

  const exactMatch = INITIAL_RESEARCHERS.find((r) => r.name.trim() === rawName);
  if (exactMatch) return exactMatch.id;

  const normalizedTarget = normalizeArabicName(rawName);
  const fuzzyMatch = INITIAL_RESEARCHERS.find(
    (r) => normalizeArabicName(r.name) === normalizedTarget
  );
  return fuzzyMatch?.id;
}

export function getResearcherProfileById(
  researcherId?: string | null
): ResearcherProfile | undefined {
  if (!researcherId) return undefined;
  return INITIAL_RESEARCHERS.find((r) => r.id === researcherId);
}

export function normalizeCaseResearcher(c: BeneficiaryCase): BeneficiaryCase {
  const resolvedId = resolveResearcherId(c.assignedResearcher, c.researcherId);
  if (resolvedId && c.researcherId !== resolvedId) {
    return { ...c, researcherId: resolvedId };
  }
  return c;
}

export function normalizeVisitResearcher(v: FieldVisit): FieldVisit {
  const resolvedId = resolveResearcherId(v.researcherName, v.researcherId);
  if (resolvedId && v.researcherId !== resolvedId) {
    return { ...v, researcherId: resolvedId };
  }
  return v;
}

export function normalizeReportResearcher(
  r: CaseResearchReport
): CaseResearchReport {
  const resolvedId = resolveResearcherId(r.researcherName, r.researcherId);
  if (resolvedId && r.researcherId !== resolvedId) {
    return { ...r, researcherId: resolvedId };
  }
  return r;
}

export function normalizeFastTrackResearcher(
  o: FastTrackDisbursementOrder
): FastTrackDisbursementOrder {
  const resolvedId = resolveResearcherId(o.assignedResearcher, o.researcherId);
  if (resolvedId && o.researcherId !== resolvedId) {
    return { ...o, researcherId: resolvedId };
  }
  return o;
}

/**
 * محاكاة سياسة RLS على جدول case_notes:
 * - الملاحظات العامة (isPrivate === false) مرئية للفريق المصرح له بالوصول للحالة.
 * - الملاحظات الخاصة (isPrivate === true) مرئية لصاحبها فقط (auth.uid() = author_user_id).
 */
export function canUserReadCaseNote(note: CaseNote, user: AuthUser): boolean {
  if (!note.isPrivate) return true;

  if (note.authorUserId) {
    return note.authorUserId === user.id;
  }

  if (user.role === 'admin') {
    return note.authorId === 'admin';
  }

  if (user.role === 'researcher') {
    if (note.authorId !== 'researcher') return false;
    const noteResearcherId = resolveResearcherId(note.authorName);
    if (noteResearcherId && user.researcherId) {
      return noteResearcherId === user.researcherId;
    }
    return normalizeArabicName(note.authorName) === normalizeArabicName(user.name);
  }

  return false;
}
