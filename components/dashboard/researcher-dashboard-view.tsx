'use client';

import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '@/context/auth-context';
import { useApp } from '@/context/app-context';
import { useScopedData } from '@/hooks/use-scoped-data';
import { BeneficiaryCase } from '@/types';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FilePlus2,
  MapPin,
  Navigation,
  Phone,
  UserPlus,
  Wallet,
} from 'lucide-react';

interface ResearcherDashboardViewProps {
  onOpenNewCase: () => void;
}

type QueueTab = 'today' | 'all';

type FieldQueueKind = 'needs_revision' | 'overdue' | 'pending_initial' | 'other';

interface FieldQueueEntry {
  caseItem: BeneficiaryCase;
  kind: FieldQueueKind;
  priorityRank: number;
}

function getShortGreetingName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && /^(د\.|أ\.|م\.)$/u.test(parts[0])) {
    return `${parts[0]} ${parts[1]}`;
  }
  return parts[0] || fullName;
}

function getSafeMapsUrl(caseItem: BeneficiaryCase): string | null {
  const gps = caseItem.gpsLocation;
  if (!gps) return null;

  if (gps.mapsUrl) {
    try {
      const parsed = new URL(gps.mapsUrl);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.toString();
      }
    } catch {
      return null;
    }
  }

  if (
    typeof gps.latitude === 'number' &&
    typeof gps.longitude === 'number' &&
    Number.isFinite(gps.latitude) &&
    Number.isFinite(gps.longitude)
  ) {
    return `https://www.google.com/maps?q=${encodeURIComponent(
      `${gps.latitude},${gps.longitude}`
    )}`;
  }

  return null;
}

function getSanitizedTelHref(phone?: string): string | null {
  const cleaned = (phone || '').replace(/[^\d+]/g, '');
  return cleaned ? `tel:${cleaned}` : null;
}

function classifyCaseQueueKind(c: BeneficiaryCase): FieldQueueEntry {
  if (c.status === 'needs_revision') {
    return { caseItem: c, kind: 'needs_revision', priorityRank: 1 };
  }
  if (
    c.isVisitOverdue &&
    Boolean(c.lastVisitDate) &&
    c.status !== 'pending_field_research' &&
    c.status !== 'closed'
  ) {
    return { caseItem: c, kind: 'overdue', priorityRank: 2 };
  }
  if (c.status === 'pending_field_research') {
    return { caseItem: c, kind: 'pending_initial', priorityRank: 3 };
  }
  return { caseItem: c, kind: 'other', priorityRank: 4 };
}

function getStatusBadgeMeta(c: BeneficiaryCase, kind: FieldQueueKind): {
  label: string;
  isAlert: boolean;
} {
  if (kind === 'needs_revision') {
    return { label: 'تحتاج استيفاء', isAlert: true };
  }
  if (kind === 'overdue') {
    return { label: 'زيارة متأخرة', isAlert: true };
  }
  if (kind === 'pending_initial') {
    return { label: 'بانتظار الزيارة الأولى', isAlert: false };
  }
  if (c.status === 'pending_review') {
    return { label: 'بانتظار الاعتماد', isAlert: false };
  }
  if (c.status === 'active_eligible') {
    return { label: 'معتمدة ومستحقة', isAlert: false };
  }
  if (c.status === 'excluded_current_month') {
    return { label: 'مؤجلة هذا الشهر', isAlert: false };
  }
  if (c.status === 'temporarily_suspended') {
    return { label: 'موقوفة مؤقتاً', isAlert: false };
  }
  if (c.status === 'closed') {
    return { label: 'ملف مغلق', isAlert: false };
  }
  return { label: 'قيد المتابعة', isAlert: false };
}

export function ResearcherDashboardView({
  onOpenNewCase,
}: ResearcherDashboardViewProps) {
  const { user } = useAuth();
  const { setActiveSection, openFieldSurvey, openCaseDetails } = useApp();
  const { scopedCases, researcherMetrics } = useScopedData();
  const prefersReducedMotion = useReducedMotion();

  const [activeTab, setActiveTab] = useState<QueueTab>('today');

  const shortName = getShortGreetingName(user.name);
  const urgentCount =
    researcherMetrics.needsRevisionCount + researcherMetrics.overdueVisitsCount;

  const { todayQueue, allSortedCases } = useMemo(() => {
    const classified = scopedCases.map(classifyCaseQueueKind);
    const sorted = [...classified].sort((a, b) => {
      if (a.priorityRank !== b.priorityRank) {
        return a.priorityRank - b.priorityRank;
      }
      return (a.caseItem.registrationDate || '').localeCompare(
        b.caseItem.registrationDate || ''
      );
    });

    const actionableToday = sorted.filter((entry) => entry.priorityRank <= 3);
    return {
      todayQueue: actionableToday,
      allSortedCases: sorted,
    };
  }, [scopedCases]);

  const displayedEntries = activeTab === 'today' ? todayQueue : allSortedCases;

  const sectionTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: 'easeOut' as const };

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={sectionTransition}
      className="space-y-4 sm:space-y-5 w-full min-w-0"
    >
      {/* 1. ترويسة الترحيب الميدانية */}
      <section className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                أهلاً {shortName}
              </h1>
              {urgentCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 whitespace-nowrap">
                  <AlertCircle size={12} className="shrink-0" aria-hidden="true" />
                  <span>
                    {urgentCount === 1
                      ? 'حالة واحدة محتاجة متابعة عاجلة'
                      : `${urgentCount} حالات محتاجة متابعة عاجلة`}
                  </span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5 min-w-0">
              <MapPin
                size={14}
                className="text-slate-400 shrink-0"
                aria-hidden="true"
              />
              <span className="truncate">
                نطاق التغطية:{' '}
                {user.assignedDistricts && user.assignedDistricts.length > 0
                  ? user.assignedDistricts.join(' • ')
                  : 'المناطق المسندة إليك'}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-500 shrink-0 hidden sm:block">
            إجمالي حالاتك المسندة:{' '}
            <span className="font-semibold text-slate-800 tabular-nums">
              {researcherMetrics.totalAssignedCases}
            </span>
          </div>
        </div>
      </section>

      {/* 2. بطاقات المؤشرات الميدانية (4 KPI Cards) */}
      <section
        aria-label="المؤشرات الميدانية"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {/* KPI 1: حالات بانتظار الزيارة */}
        <button
          type="button"
          onClick={() => setActiveTab('today')}
          className="text-right bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-4 transition-colors cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#005756]/30 min-w-0"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 truncate">
              بانتظار الزيارة
            </span>
            {urgentCount > 0 ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 whitespace-nowrap shrink-0">
                {researcherMetrics.needsRevisionCount > 0
                  ? `${researcherMetrics.needsRevisionCount} استيفاء`
                  : `${researcherMetrics.overdueVisitsCount} متأخرة`}
              </span>
            ) : (
              <ClipboardCheck
                size={16}
                className="text-slate-400 shrink-0"
                aria-hidden="true"
              />
            )}
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-[26px] font-bold text-slate-900 tabular-nums leading-none">
              {researcherMetrics.awaitingVisitCount}
            </span>
            <span className="text-[11px] text-slate-500">حالة</span>
          </div>
        </button>

        {/* KPI 2: بانتظار اعتماد الإدارة */}
        <button
          type="button"
          onClick={() => setActiveSection('research')}
          className="text-right bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-4 transition-colors cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#005756]/30 min-w-0"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 truncate">
              بانتظار اعتماد الإدارة
            </span>
            <Clock
              size={16}
              className="text-slate-400 shrink-0"
              aria-hidden="true"
            />
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-[26px] font-bold text-slate-900 tabular-nums leading-none">
              {researcherMetrics.pendingApprovalCount}
            </span>
            <span className="text-[11px] text-slate-500">بحث</span>
          </div>
        </button>

        {/* KPI 3: معتمدة وجاهزة للتسليم */}
        <button
          type="button"
          onClick={() => setActiveSection('my-custody')}
          className="text-right bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-4 transition-colors cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#005756]/30 min-w-0"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 truncate">
              معتمدة للتسليم
            </span>
            <CheckCircle2
              size={16}
              className="text-slate-400 shrink-0"
              aria-hidden="true"
            />
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-[26px] font-bold text-slate-900 tabular-nums leading-none">
              {researcherMetrics.approvedReadyForDeliveryCount}
            </span>
            <span className="text-[11px] text-slate-500">مستحق</span>
          </div>
        </button>

        {/* KPI 4: إجمالي عهدتي الحالية */}
        <button
          type="button"
          onClick={() => setActiveSection('my-custody')}
          className="text-right bg-white border border-slate-200/80 hover:border-[#005756]/40 rounded-2xl p-4 transition-colors cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#005756]/30 min-w-0"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 truncate">
              إجمالي عهدتي الحالية
            </span>
            <Wallet
              size={16}
              className="text-slate-400 shrink-0"
              aria-hidden="true"
            />
          </div>
          <div className="mt-2.5 flex items-baseline gap-1 min-w-0">
            <span className="text-xl sm:text-2xl font-bold text-[#005756] tabular-nums leading-none truncate">
              {researcherMetrics.totalActiveCustodyAmount.toLocaleString('ar-EG')}
            </span>
            <span className="text-[11px] font-medium text-slate-500 shrink-0">
              ج.م
            </span>
          </div>
        </button>
      </section>

      {/* 3. شريط الإجراءات الميدانية السريعة */}
      <section
        aria-label="إجراءات ميدانية سريعة"
        className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5"
      >
        <button
          type="button"
          onClick={() => openFieldSurvey()}
          className="inline-flex items-center justify-center gap-2 h-11 sm:h-10 px-4 text-xs sm:text-sm font-semibold text-white bg-[#005756] hover:bg-[#004241] active:scale-[0.99] rounded-xl transition-all cursor-pointer"
        >
          <FilePlus2 size={17} className="shrink-0" aria-hidden="true" />
          <span className="whitespace-nowrap">ابدأ استمارة بحث ميداني</span>
        </button>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenNewCase}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-3 sm:px-4 text-xs sm:text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 active:scale-[0.99] border border-slate-200 rounded-xl transition-all cursor-pointer min-w-0"
          >
            <UserPlus
              size={16}
              className="text-slate-400 shrink-0"
              aria-hidden="true"
            />
            <span className="truncate">تسجيل حالة جديدة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('my-custody')}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-3 sm:px-4 text-xs sm:text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 active:scale-[0.99] border border-slate-200 rounded-xl transition-all cursor-pointer min-w-0"
          >
            <Wallet
              size={16}
              className="text-slate-400 shrink-0"
              aria-hidden="true"
            />
            <span className="truncate">فتح كشف عهدتي</span>
          </button>
        </div>
      </section>

      {/* 4. قائمة مهام اليوم الميدانية (Zero Cards-Within-Cards) */}
      <section className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
        {/* رأس القائمة مع التبديل الهادئ بين مهام اليوم وكل الحالات */}
        <div className="px-4 py-3.5 sm:px-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              مهام اليوم الميدانية
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              مرتبة تلقائياً بالأولوية: استيفاء الملاحظات ثم الزيارات المتأخرة فالحالات الجديدة
            </p>
          </div>

          <div
            role="tablist"
            aria-label="تصفية قائمة المهام"
            className="grid grid-cols-2 sm:inline-grid p-1 bg-slate-100/90 border border-slate-200/80 rounded-xl shrink-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'today'}
              onClick={() => setActiveTab('today')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'today'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              مهام اليوم ({todayQueue.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'all'}
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              كل حالاتي ({allSortedCases.length})
            </button>
          </div>
        </div>

        {/* صفوف القائمة المسطحة */}
        {displayedEntries.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={22} aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              {activeTab === 'today'
                ? 'كل زياراتك الميدانية محدثة حالياً'
                : 'مفيش حالات مسندة إليك حالياً'}
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              {activeTab === 'today'
                ? 'مفيش حالات متأخرة أو معادة للاستيفاء النهارده. تقدر تراجع كل حالاتك المسندة أو تسجل حالة جديدة.'
                : 'أول ما يتم إسناد حالات جديدة أو تسجل حالة بنفسك هتظهر هنا فوراً.'}
            </p>
            {activeTab === 'today' && allSortedCases.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className="mt-4 inline-flex items-center justify-center h-9 px-4 text-xs font-semibold text-[#005756] bg-[#005756]/10 hover:bg-[#005756]/15 rounded-xl transition-colors cursor-pointer"
              >
                عرض كل حالاتي المسندة ({allSortedCases.length})
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-200/80">
            {displayedEntries.map(({ caseItem, kind }) => {
              const badge = getStatusBadgeMeta(caseItem, kind);
              const telHref = getSanitizedTelHref(caseItem.phone);
              const mapsUrl = getSafeMapsUrl(caseItem);
              const displayName = caseItem.primaryName || caseItem.fullName;

              return (
                <li
                  key={caseItem.id}
                  className="px-4 py-3.5 sm:px-5 sm:py-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* معلومات الحالة */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openCaseDetails(caseItem.id)}
                          className="text-sm font-semibold text-slate-900 hover:text-[#005756] transition-colors text-right cursor-pointer truncate max-w-full"
                        >
                          {displayName}
                        </button>
                        <span className="text-[11px] font-medium text-slate-400 tabular-nums shrink-0">
                          {caseItem.code}
                        </span>
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                            badge.isAlert
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {badge.label}
                        </span>
                      </div>

                      {/* الحي والعنوان بأيقونة محايدة */}
                      <div className="flex items-start gap-1.5 text-xs text-slate-500 min-w-0">
                        <MapPin
                          size={14}
                          className="text-slate-400 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <span className="line-clamp-2 sm:truncate">
                          {caseItem.district}
                          {caseItem.address ? ` — ${caseItem.address}` : ''}
                        </span>
                      </div>

                      {/* ملاحظة الإدارة عند الإعادة للاستيفاء (خط جانبي نظيف بدون كرت داخلي) */}
                      {kind === 'needs_revision' &&
                        caseItem.adminRevisionNote && (
                          <p className="text-xs text-slate-700 border-r-2 border-rose-300 pr-2.5 mt-1.5 leading-relaxed">
                            <span className="font-semibold text-rose-700">
                              ملاحظة الإدارة:{' '}
                            </span>
                            {caseItem.adminRevisionNote}
                          </p>
                        )}
                    </div>

                    {/* أدوات التواصل والتنفيذ */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0 shrink-0">
                      <div className="flex items-center gap-1">
                        {telHref && (
                          <a
                            href={telHref}
                            title={`اتصال بـ ${displayName}`}
                            aria-label={`اتصال هاتفي بالحالة ${displayName}`}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#005756] hover:bg-slate-100/80 transition-colors"
                          >
                            <Phone size={17} aria-hidden="true" />
                          </a>
                        )}

                        {mapsUrl && (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="فتح موقع الحالة على الخريطة"
                            aria-label={`فتح موقع الحالة ${displayName} على الخريطة`}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#005756] hover:bg-slate-100/80 transition-colors"
                          >
                            <Navigation size={17} aria-hidden="true" />
                          </a>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => openFieldSurvey(caseItem.id)}
                        className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-[#005756] bg-[#005756]/10 hover:bg-[#005756] hover:text-white rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <ClipboardCheck
                          size={15}
                          className="shrink-0"
                          aria-hidden="true"
                        />
                        <span>
                          {kind === 'needs_revision'
                            ? 'استكمال الملاحظات'
                            : 'تسجيل الزيارة'}
                        </span>
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </motion.div>
  );
}
