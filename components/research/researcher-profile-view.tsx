'use client';

import React, { useState, useMemo } from 'react';
import { motion, MotionConfig } from 'motion/react';
import { useApp } from '@/context/app-context';
import { useAuth } from '@/context/auth-context';
import {
  Phone,
  Mail,
  Calendar,
  MapPin,
  Search,
  Eye,
  ClipboardList,
  Users,
  FileText,
  AlertTriangle,
  RotateCcw,
  UserPlus,
  Pencil,
  UserX,
  UserCheck,
} from 'lucide-react';
import { INITIAL_RESEARCHERS, INITIAL_VISITS } from '@/data/initial-mock-data';
import { checkVisitOverdueStatus } from '@/services/scoring-engine';
import { BeneficiaryCase, CaseStatus, ResearcherProfile } from '@/types';
import { CustomSelect } from '@/components/ui/custom-select';
import { useToast } from '@/context/toast-context';
import {
  ResearcherFormModal,
  ResearcherDeactivateModal,
  ResearcherFormPayload,
} from '@/components/research/researcher-form-modal';

type ProfileTab = 'cases' | 'reports';
type CaseQuickFilter = 'all' | 'overdue' | 'revision' | 'first_visit';
type ResearcherStatusFilter = 'all' | 'active' | 'inactive';

interface UnifiedFieldReportEntry {
  id: string;
  caseId: string;
  caseCode: string;
  caseName: string;
  date: string;
  typeLabel: string;
  isUrgentStatus: boolean;
  observations: string;
  recommendation: string;
  attachmentsCount?: number;
  trustScore?: number;
  recommendedMonthlyAmount?: number;
}

function getCaseStatusText(status: CaseStatus, isOverdue: boolean): { label: string; isUrgent: boolean } {
  if (status === 'needs_revision') {
    return { label: 'محتاجة استكمال نواقص', isUrgent: true };
  }
  if (isOverdue) {
    return { label: 'متأخرة عن الزيارة الدورية', isUrgent: true };
  }
  switch (status) {
    case 'pending_field_research':
      return { label: 'بانتظار الزيارة الأولى', isUrgent: false };
    case 'pending_review':
      return { label: 'في انتظار مراجعة الإدارة', isUrgent: false };
    case 'under_review':
      return { label: 'تحت البحث والمراجعة', isUrgent: false };
    case 'active_eligible':
      return { label: 'نشطة ومستحقة', isUrgent: false };
    case 'pending_exception':
      return { label: 'بانتظار اعتماد استثناء', isUrgent: false };
    case 'temporarily_suspended':
      return { label: 'موقوفة مؤقتاً', isUrgent: false };
    case 'excluded_current_month':
      return { label: 'مستبعدة هذا الشهر', isUrgent: false };
    case 'closed':
      return { label: 'ملف مغلق', isUrgent: false };
    default:
      return { label: 'قيد المتابعة', isUrgent: false };
  }
}

function getReportTypeLabel(visitType: 'initial_field' | 'periodic_followup' | 'emergency_check'): string {
  switch (visitType) {
    case 'initial_field':
      return 'بحث ميداني أولي';
    case 'periodic_followup':
      return 'متابعة دورية';
    case 'emergency_check':
      return 'معاينة طارئة';
  }
}

function getAvatarInitial(name: string): string {
  const cleaned = name
    .replace(/^(أ\.|م\.|د\.)\s*/u, '')
    .trim();
  return cleaned.charAt(0) || name.charAt(0) || 'ب';
}

export function ResearcherProfileView() {
  const { user: authUser } = useAuth();
  const {
    cases,
    visits,
    researchReports,
    scoringConfig,
    setSelectedCaseId,
    openFieldSurvey,
    currentUserRole,
    currentSessionProfile,
    researchers,
    researcherProfiles,
    addResearcher,
    updateResearcher,
    toggleResearcherStatus,
  } = useApp();
  const { toast } = useToast();

  const [adminSelectedResearcherId, setAdminSelectedResearcherId] = useState<string>(
    INITIAL_RESEARCHERS[0]?.id || 'res-01'
  );
  const [statusFilter, setStatusFilter] = useState<ResearcherStatusFilter>('all');
  const [activeTab, setActiveTab] = useState<ProfileTab>('cases');
  const [searchQuery, setSearchQuery] = useState('');
  const [caseFilter, setCaseFilter] = useState<CaseQuickFilter>('all');

  // Modals for Add / Edit / Deactivate Researcher
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingResearcher, setEditingResearcher] = useState<ResearcherProfile | null>(null);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);

  const isResearcherRole = currentUserRole === 'researcher';

  // Build unified researcher roster from persisted researcherProfiles + any dynamic case assignees
  const allResearcherProfiles = useMemo<ResearcherProfile[]>(() => {
    const list: ResearcherProfile[] = researcherProfiles.map((r) => ({
      ...r,
      status: r.status === 'inactive' ? 'inactive' : 'active',
    }));
    const knownNames = new Set(list.map((r) => r.name.trim()));

    const extraNames = Array.from(
      new Set([
        ...researchers,
        ...cases.map((c) => c.assignedResearcher),
        ...(isResearcherRole ? [currentSessionProfile.name] : []),
      ])
    ).filter((name): name is string => Boolean(name && name.trim()));

    extraNames.forEach((rawName, idx) => {
      const normalized = rawName.trim();
      if (!knownNames.has(normalized)) {
        knownNames.add(normalized);
        const derivedDistricts = Array.from(
          new Set(
            cases
              .filter((c) => c.assignedResearcher?.trim() === normalized)
              .map((c) => c.district)
              .filter(Boolean)
          )
        );
        list.push({
          id: `res-dynamic-${idx}`,
          name: normalized,
          roleTitle: 'باحث ميداني معتمد',
          phone: 'غير مسجل',
          email: 'غير مسجل',
          assignedDistricts: derivedDistricts.length > 0 ? derivedDistricts : ['نطاق عام'],
          joinedDate: new Date().toISOString().split('T')[0],
          totalVisitsConducted: 0,
          activeAssignedCasesCount: 0,
          pendingVisitsCount: 0,
          completionRate: 100,
          bio: 'باحث ميداني معتمد لمتابعة الأسر المستحقة وتوثيق الزيارات الدورية في منظومة إحسان.',
          status: 'active',
        });
      }
    });

    return list;
  }, [researcherProfiles, researchers, cases, isResearcherRole, currentSessionProfile.name]);

  const activeResearchersCount = useMemo(
    () => allResearcherProfiles.filter((r) => r.status !== 'inactive').length,
    [allResearcherProfiles]
  );

  const inactiveResearchersCount = useMemo(
    () => allResearcherProfiles.filter((r) => r.status === 'inactive').length,
    [allResearcherProfiles]
  );

  const filteredResearcherOptions = useMemo(() => {
    if (statusFilter === 'active') {
      return allResearcherProfiles.filter((r) => r.status !== 'inactive');
    }
    if (statusFilter === 'inactive') {
      const inactiveList = allResearcherProfiles.filter((r) => r.status === 'inactive');
      return inactiveList.length > 0 ? inactiveList : allResearcherProfiles;
    }
    return allResearcherProfiles;
  }, [allResearcherProfiles, statusFilter]);

  // Role-aware active researcher resolution (no useEffect setState)
  const currentResearcher = useMemo(() => {
    if (isResearcherRole) {
      if (authUser.researcherId) {
        const byId = allResearcherProfiles.find((r) => r.id === authUser.researcherId);
        if (byId) return byId;
      }
      const ownProfile = allResearcherProfiles.find(
        (r) => r.name.trim() === currentSessionProfile.name.trim()
      );
      if (ownProfile) return ownProfile;
    }
    return (
      filteredResearcherOptions.find((r) => r.id === adminSelectedResearcherId) ||
      filteredResearcherOptions[0] ||
      allResearcherProfiles.find((r) => r.id === adminSelectedResearcherId) ||
      allResearcherProfiles[0]
    );
  }, [
    isResearcherRole,
    authUser.researcherId,
    currentSessionProfile.name,
    filteredResearcherOptions,
    allResearcherProfiles,
    adminSelectedResearcherId,
  ]);

  const currentName = currentResearcher?.name?.trim() || '';

  // Helper: check live overdue status against active scoringConfig.overdueVisitMonths
  const isCaseOverdueLive = useMemo(() => {
    const threshold = scoringConfig.overdueVisitMonths;
    return (c: BeneficiaryCase): boolean => {
      if (!c.lastVisitDate || c.status === 'pending_field_research' || c.status === 'closed') {
        return false;
      }
      return checkVisitOverdueStatus(c.lastVisitDate, threshold).isOverdue;
    };
  }, [scoringConfig.overdueVisitMonths]);

  // Live assigned cases for this researcher
  const assignedCases = useMemo(
    () => cases.filter((c) => c.assignedResearcher?.trim() === currentName),
    [cases, currentName]
  );

  const activeAssignedCases = useMemo(
    () => assignedCases.filter((c) => c.status !== 'closed'),
    [assignedCases]
  );

  const overdueCases = useMemo(
    () => activeAssignedCases.filter((c) => isCaseOverdueLive(c)),
    [activeAssignedCases, isCaseOverdueLive]
  );

  const needsRevisionCases = useMemo(
    () => activeAssignedCases.filter((c) => c.status === 'needs_revision'),
    [activeAssignedCases]
  );

  const firstVisitPendingCases = useMemo(
    () =>
      activeAssignedCases.filter(
        (c) =>
          c.status === 'pending_field_research' ||
          (!c.lastVisitDate && c.status !== 'needs_revision' && c.status !== 'pending_review')
      ),
    [activeAssignedCases]
  );

  // Live visits for this researcher
  const researcherVisits = useMemo(
    () => visits.filter((v) => v.researcherName?.trim() === currentName),
    [visits, currentName]
  );

  // Blend historical archive visits with newly logged live visits without double-counting initial records
  const totalVisitsCount = useMemo(() => {
    const baseProfile = INITIAL_RESEARCHERS.find((r) => r.name.trim() === currentName);
    if (!baseProfile) {
      return researcherVisits.length;
    }
    const initialMockVisitsForResearcher = INITIAL_VISITS.filter(
      (v) => v.researcherName.trim() === currentName
    ).length;
    const historicalArchiveBase = Math.max(
      0,
      baseProfile.totalVisitsConducted - initialMockVisitsForResearcher
    );
    return historicalArchiveBase + researcherVisits.length;
  }, [currentName, researcherVisits.length]);

  // Dynamic compliance / commitment rate based on live assigned cases
  const onTimeCasesCount = Math.max(0, activeAssignedCases.length - overdueCases.length);
  const commitmentRate =
    activeAssignedCases.length > 0
      ? Math.round((onTimeCasesCount / activeAssignedCases.length) * 100)
      : currentResearcher?.completionRate ?? 100;

  // Coverage districts: combine profile districts + live districts from assigned cases
  const coverageDistricts = useMemo(() => {
    const set = new Set<string>(currentResearcher?.assignedDistricts || []);
    assignedCases.forEach((c) => {
      if (c.district && c.district.trim()) {
        set.add(c.district.trim());
      }
    });
    return Array.from(set);
  }, [currentResearcher, assignedCases]);

  // Unified chronological feed of field visits, detailed research reports, and case-level recommendations
  const unifiedFieldReports = useMemo<UnifiedFieldReportEntry[]>(() => {
    const entries: UnifiedFieldReportEntry[] = [];
    const matchedReportIds = new Set<string>();
    const representedCaseDates = new Set<string>();

    // 1. Live field visits (enriched with matching detailed report if present on same case & date)
    researcherVisits.forEach((v) => {
      const matchingReport = researchReports.find(
        (r) =>
          r.researcherName?.trim() === currentName &&
          r.caseId === v.caseId &&
          r.reportDate === v.visitDate
      );
      if (matchingReport) {
        matchedReportIds.add(matchingReport.id);
      }
      representedCaseDates.add(`${v.caseId}::${v.visitDate}`);

      entries.push({
        id: `visit-${v.id}`,
        caseId: v.caseId,
        caseCode: v.caseCode,
        caseName: v.caseName,
        date: v.visitDate,
        typeLabel: matchingReport
          ? getReportTypeLabel(matchingReport.visitType)
          : v.status === 'overdue'
          ? 'زيارة متأخرة عن الموعد'
          : 'زيارة ميدانية موثقة',
        isUrgentStatus: v.status === 'overdue',
        observations: v.observations,
        recommendation: matchingReport?.recommendations || v.recommendedChanges,
        attachmentsCount: v.attachmentsCount,
        trustScore: matchingReport?.trustScore,
      });
    });

    // 2. Detailed research reports not already merged into a visit row
    researchReports
      .filter((r) => r.researcherName?.trim() === currentName && !matchedReportIds.has(r.id))
      .forEach((r) => {
        representedCaseDates.add(`${r.caseId}::${r.reportDate}`);
        const combinedFindings = [r.housingNotes, r.incomeObservations, r.healthObservations]
          .filter(Boolean)
          .join(' · ');

        entries.push({
          id: `report-${r.id}`,
          caseId: r.caseId,
          caseCode: r.caseCode,
          caseName: r.caseName,
          date: r.reportDate,
          typeLabel: getReportTypeLabel(r.visitType),
          isUrgentStatus: r.documentsStatus === 'incomplete_questionable',
          observations: combinedFindings || 'تم استيفاء بيانات المعاينة الميدانية.',
          recommendation: r.recommendations,
          trustScore: r.trustScore,
        });
      });

    // 3. Case-level survey recommendations submitted by this researcher (if not already in visits)
    assignedCases.forEach((c) => {
      const recText = c.researcherRecommendation?.trim() || c.researcherJustification?.trim();
      if (!recText) return;
      const key = `${c.id}::${c.lastVisitDate || c.lastAssessmentDate}`;
      if (representedCaseDates.has(key)) return;

      entries.push({
        id: `case-rec-${c.id}`,
        caseId: c.id,
        caseCode: c.code,
        caseName: c.fullName,
        date: c.lastVisitDate || c.lastAssessmentDate || c.registrationDate,
        typeLabel: 'توصية بحث ميداني',
        isUrgentStatus: c.status === 'needs_revision',
        observations: c.caseSummary?.trim() || c.notes?.trim() || 'تم توثيق بيانات الحالة ميدانياً.',
        recommendation: recText,
        attachmentsCount: c.attachments?.length || undefined,
        trustScore: c.vulnerability?.confidenceScore,
        recommendedMonthlyAmount: c.recommendedMonthlyAmount,
      });
    });

    return entries.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [researcherVisits, researchReports, assignedCases, currentName]);

  // Filtered cases for Tab 1
  const filteredCases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return assignedCases.filter((c) => {
      const overdue = isCaseOverdueLive(c);
      if (caseFilter === 'overdue' && !overdue) return false;
      if (caseFilter === 'revision' && c.status !== 'needs_revision') return false;
      if (
        caseFilter === 'first_visit' &&
        !(
          c.status === 'pending_field_research' ||
          (!c.lastVisitDate && c.status !== 'needs_revision' && c.status !== 'pending_review')
        )
      ) {
        return false;
      }
      if (!q) return true;
      return (
        c.fullName.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.secondaryName || '').toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q) ||
        c.governorate.toLowerCase().includes(q)
      );
    });
  }, [assignedCases, caseFilter, searchQuery, isCaseOverdueLive]);

  // Filtered reports for Tab 2
  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return unifiedFieldReports;
    return unifiedFieldReports.filter(
      (entry) =>
        entry.caseName.toLowerCase().includes(q) ||
        entry.caseCode.toLowerCase().includes(q) ||
        entry.observations.toLowerCase().includes(q) ||
        entry.recommendation.toLowerCase().includes(q) ||
        entry.typeLabel.toLowerCase().includes(q)
    );
  }, [unifiedFieldReports, searchQuery]);

  const handleSelectResearcher = (newId: string) => {
    setAdminSelectedResearcherId(newId);
    setSearchQuery('');
    setCaseFilter('all');
  };

  const handleOpenAddModal = () => {
    setEditingResearcher(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = () => {
    if (!currentResearcher) return;
    setEditingResearcher(currentResearcher);
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (payload: ResearcherFormPayload) => {
    if (editingResearcher) {
      updateResearcher(editingResearcher.id, payload);
      toast.success(
        isResearcherRole
          ? 'تم تحديث بيانات ملفك الميداني بنجاح'
          : 'تم تحديث بيانات الباحث بنجاح'
      );
    } else {
      const created = addResearcher(payload);
      setStatusFilter('all');
      setAdminSelectedResearcherId(created.id);
      toast.success(`تم إضافة (${created.name}) لفريق البحث الميداني`);
    }
    setIsFormModalOpen(false);
    setEditingResearcher(null);
  };

  const handleConfirmDeactivate = () => {
    if (!currentResearcher) return;
    toggleResearcherStatus(currentResearcher.id);
    setIsDeactivateModalOpen(false);
    toast.info(`تم إيقاف حساب (${currentResearcher.name}) مؤقتاً مع حفظ كامل سجله التاريخي`);
  };

  const handleReactivate = () => {
    if (!currentResearcher) return;
    toggleResearcherStatus(currentResearcher.id);
    toast.success(`تم إعادة تفعيل حساب (${currentResearcher.name}) لإسناد الحالات الجديدة`);
  };

  if (!currentResearcher) {
    return null;
  }

  const isCurrentInactive = currentResearcher.status === 'inactive';

  return (
    <div className="flex flex-col gap-6 w-full min-w-0">
      {/* Top Context Bar: Researcher Switcher & Archive Filter (Admin) or Personal Context (Researcher) + Primary CTAs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {!isResearcherRole ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-wrap">
            <label
              htmlFor="researcher-profile-selector"
              className="text-xs font-semibold text-slate-600 whitespace-nowrap shrink-0"
            >
              اختار الباحث:
            </label>
            <CustomSelect
              id="researcher-profile-selector"
              value={currentResearcher.id}
              onChange={handleSelectResearcher}
              options={filteredResearcherOptions.map((r) => {
                const count = cases.filter(
                  (c) => c.assignedResearcher?.trim() === r.name.trim() && c.status !== 'closed'
                ).length;
                const inactiveSuffix = r.status === 'inactive' ? ' (موقوف مؤقتاً)' : '';
                return {
                  value: r.id,
                  label: `${r.name}${inactiveSuffix} — ${count} ${count === 1 ? 'حالة' : 'حالات'}`,
                };
              })}
              ariaLabel="اختار الباحث"
              className="w-full sm:w-auto min-w-[250px]"
              triggerClassName="h-10 border-slate-200/80 text-xs font-semibold"
              menuMinWidth={250}
            />

            {/* Calm Segmented Status Filter (Active vs Archive of Inactive Researchers) */}
            <div
              className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/60 self-start sm:self-auto"
              role="group"
              aria-label="تصفية الباحثين حسب حالة الحساب"
            >
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer tabular-nums ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الكل ({allResearcherProfiles.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('active');
                  if (currentResearcher.status === 'inactive') {
                    const firstActive = allResearcherProfiles.find((r) => r.status !== 'inactive');
                    if (firstActive) setAdminSelectedResearcherId(firstActive.id);
                  }
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer tabular-nums ${
                  statusFilter === 'active'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                النشطين ({activeResearchersCount})
              </button>
              {inactiveResearchersCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('inactive');
                    const firstInactive = allResearcherProfiles.find((r) => r.status === 'inactive');
                    if (firstInactive) setAdminSelectedResearcherId(firstInactive.id);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer tabular-nums ${
                    statusFilter === 'inactive'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  أرشيف الموقوفين ({inactiveResearchersCount})
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
            <span className="font-semibold text-slate-800 whitespace-nowrap">ملفي الميداني</span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="truncate">{currentResearcher.roleTitle}</span>
          </div>
        )}

        <div className="flex items-center gap-2.5 shrink-0">
          {!isResearcherRole && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#005756] focus-visible:ring-offset-2"
            >
              <UserPlus size={15} className="text-slate-500 shrink-0" />
              <span>+ إضافة باحث</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => openFieldSurvey()}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-[#005756] hover:bg-[#004746] text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#005756] focus-visible:ring-offset-2"
          >
            <MapPin size={15} className="shrink-0" />
            <span>ابدأ بحث حالة</span>
          </button>
        </div>
      </div>

      {/* Unified Calm Researcher Profile Card + Integrated Flat KPI Strip (Zero Cards-Within-Cards) */}
      <section className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
        {/* Upper Identity & Coverage Area */}
        <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl shrink-0 select-none ${
                isCurrentInactive
                  ? 'bg-slate-200 text-slate-600'
                  : 'bg-[#005756] text-white'
              }`}
              aria-hidden="true"
            >
              {getAvatarInitial(currentResearcher.name)}
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h2 className="text-lg font-bold text-slate-900 leading-tight">
                  {currentResearcher.name}
                </h2>
                <span className="text-slate-300 hidden sm:inline" aria-hidden="true">·</span>
                <span className="text-xs font-medium text-slate-500">
                  {currentResearcher.roleTitle}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                    isCurrentInactive
                      ? 'bg-slate-100 text-slate-600 border-slate-200/80'
                      : 'bg-slate-50 text-slate-600 border-slate-200/70'
                  }`}
                >
                  {isCurrentInactive ? 'حساب موقوف مؤقتاً' : 'باحث نشط'}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                {currentResearcher.bio}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Phone size={13} className="text-slate-400 shrink-0" />
                  <span dir="ltr">{currentResearcher.phone}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <Mail size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate" dir="ltr">{currentResearcher.email}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Calendar size={13} className="text-slate-400 shrink-0" />
                  <span>انضم في {currentResearcher.joinedDate}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Coverage Districts & Researcher Account Management Actions */}
          <div className="lg:max-w-xs lg:text-left pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0 flex flex-col lg:items-end justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 block">
                مناطق التغطية الميدانية
              </span>
              <p className="text-xs font-medium text-slate-700 leading-relaxed">
                {coverageDistricts.join(' · ')}
              </p>
            </div>

            {!isResearcherRole ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Pencil size={13} className="text-slate-400 shrink-0" />
                  <span>تعديل البيانات</span>
                </button>

                {isCurrentInactive ? (
                  <button
                    type="button"
                    onClick={handleReactivate}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#005756] hover:bg-[#004746] text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <UserCheck size={13} className="shrink-0" />
                    <span>إعادة التفعيل</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsDeactivateModalOpen(true)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <UserX size={13} className="text-slate-400 shrink-0" />
                    <span>إيقاف الحساب</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Pencil size={13} className="text-slate-400 shrink-0" />
                  <span>تعديل ملفي الشخصي</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Integrated 4-Column Flat KPI Strip separated by crisp 1px hairline grid */}
        <div className="border-t border-slate-200/80 bg-slate-200/80 grid grid-cols-2 lg:grid-cols-4 gap-px">
          <div className="bg-white p-4 sm:p-5 space-y-1">
            <span className="text-xs font-medium text-slate-500 block">
              إجمالي الزيارات
            </span>
            <span className="text-2xl font-bold tabular-nums text-slate-900 block">
              {totalVisitsCount.toLocaleString('en-US')}
            </span>
            <span className="text-[11px] text-slate-500 tabular-nums block">
              منهم {researcherVisits.length} في السجل الحي
            </span>
          </div>

          <div className="bg-white p-4 sm:p-5 space-y-1">
            <span className="text-xs font-medium text-slate-500 block">
              حالات تحت المتابعة
            </span>
            <span className="text-2xl font-bold tabular-nums text-slate-900 block">
              {activeAssignedCases.length.toLocaleString('en-US')}
            </span>
            <span
              className={`text-[11px] block ${
                needsRevisionCases.length > 0 ? 'text-rose-600 font-medium' : 'text-slate-500'
              }`}
            >
              {needsRevisionCases.length > 0
                ? `${needsRevisionCases.length} محتاجة استكمال نواقص`
                : firstVisitPendingCases.length > 0
                ? `${firstVisitPendingCases.length} بانتظار الزيارة الأولى`
                : 'كل الملفات مستقرة'}
            </span>
          </div>

          <div className="bg-white p-4 sm:p-5 space-y-1">
            <span className="text-xs font-medium text-slate-500 block">
              متأخرة عن الزيارة
            </span>
            <span
              className={`text-2xl font-bold tabular-nums block ${
                overdueCases.length > 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {overdueCases.length.toLocaleString('en-US')}
            </span>
            <span
              className={`text-[11px] block ${
                overdueCases.length > 0 ? 'text-rose-600 font-medium' : 'text-slate-500'
              }`}
            >
              {overdueCases.length > 0
                ? `عدى أكتر من ${scoringConfig.overdueVisitMonths} شهور`
                : `ملتزمة بمهلة ${scoringConfig.overdueVisitMonths} شهور`}
            </span>
          </div>

          <div className="bg-white p-4 sm:p-5 space-y-1">
            <span className="text-xs font-medium text-slate-500 block">
              نسبة الالتزام بالمتابعة
            </span>
            <span className="text-2xl font-bold tabular-nums text-slate-900 block">
              {commitmentRate}%
            </span>
            <span className="text-[11px] text-slate-500 tabular-nums block">
              {activeAssignedCases.length > 0
                ? `${onTimeCasesCount} من ${activeAssignedCases.length} حالة محدثة`
                : 'بناءً على سجل الأداء السابق'}
            </span>
          </div>
        </div>
      </section>

      {/* Full-Width Calm Tabbed Workspace: Assigned Cases & Field Visit Reports */}
      <section className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
        {/* Tabs & Search Header */}
        <div className="px-4 sm:px-6 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <MotionConfig reducedMotion="user">
            <div
              role="tablist"
              aria-label="سجلات عمل الباحث"
              className="relative flex items-center gap-1 overflow-x-auto -mb-px"
            >
              {[
                {
                  id: 'cases' as const,
                  label: 'الحالات المسندة',
                  count: assignedCases.length,
                  icon: Users,
                },
                {
                  id: 'reports' as const,
                  label: 'تقارير الزيارات والتوصيات',
                  count: unifiedFieldReports.length,
                  icon: FileText,
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative min-h-[48px] py-3 px-3.5 text-xs font-semibold transition-colors duration-150 inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#005756] focus-visible:ring-inset ${
                      isActive ? 'text-[#005756]' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon
                      size={15}
                      className={isActive ? 'text-[#005756] shrink-0' : 'text-slate-400 shrink-0'}
                    />
                    <span>{tab.label}</span>
                    <span className="tabular-nums text-[11px] font-medium text-slate-400">
                      ({tab.count})
                    </span>
                    {isActive && (
                      <motion.span
                        layoutId="researcher-profile-tab-indicator"
                        aria-hidden="true"
                        transition={{
                          type: 'spring',
                          stiffness: 420,
                          damping: 36,
                          mass: 0.7,
                        }}
                        className="pointer-events-none absolute bottom-0 inset-x-0 h-[2px] bg-[#005756] rounded-full"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </MotionConfig>

          {/* Calm Search Input */}
          <div className="w-full md:w-72 pb-3 md:pb-0">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === 'cases'
                    ? 'ابحث باسم الحالة، الكود، أو المنطقة...'
                    : 'ابحث في التقارير والتوصيات...'
                }
                aria-label="بحث في سجلات الباحث"
                className="w-full h-9 pr-9 pl-3 bg-slate-50/70 focus:bg-white border border-slate-200/80 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#005756] focus-visible:border-[#005756] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Tab 1: Assigned Cases */}
        {activeTab === 'cases' && (
          <div>
            {/* Quick Segmented Filter Row */}
            {assignedCases.length > 0 && (
              <div className="px-4 sm:px-6 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                <div
                  className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto max-w-full"
                  role="group"
                  aria-label="تصفية الحالات المسندة"
                >
                  {[
                    { id: 'all' as const, label: 'الكل', count: assignedCases.length },
                    { id: 'overdue' as const, label: 'متأخرة', count: overdueCases.length },
                    { id: 'revision' as const, label: 'محتاجة استكمال', count: needsRevisionCases.length },
                    { id: 'first_visit' as const, label: 'زيارة أولى', count: firstVisitPendingCases.length },
                  ].map((f) => {
                    const isSelected = caseFilter === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setCaseFilter(f.id)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                          isSelected
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {f.label} ({f.count})
                      </button>
                    );
                  })}
                </div>

                <span className="text-xs text-slate-500 tabular-nums">
                  معروض {filteredCases.length} من {assignedCases.length} حالة
                </span>
              </div>
            )}

            {filteredCases.length === 0 ? (
              <div className="py-12 px-6 text-center space-y-2.5">
                <Users size={24} className="mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-800">
                  {assignedCases.length === 0
                    ? 'مفيش حالات مسندة للباحث ده حالياً'
                    : 'مفيش حالات مطابقة لبحثك أو الفلتر المختار'}
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  {assignedCases.length === 0
                    ? 'تقدر تبدأ بحث حالة جديدة أو تسند حالات من سجل المستحقين وهتظهر هنا تلقائياً.'
                    : 'جرّب تمسح نص البحث أو ترجع لعرض كل الحالات.'}
                </p>
                {assignedCases.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCaseFilter('all');
                    }}
                    className="inline-flex items-center gap-1.5 mt-1 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-lg transition-colors cursor-pointer"
                  >
                    <RotateCcw size={13} className="text-slate-400" />
                    <span>عرض كل الحالات</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openFieldSurvey()}
                    className="inline-flex items-center gap-1.5 mt-1 px-4 py-2 text-xs font-semibold text-white bg-[#005756] hover:bg-[#004746] rounded-lg transition-colors cursor-pointer"
                  >
                    <MapPin size={14} />
                    <span>ابدأ بحث حالة جديدة</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Full-Width Clean Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-600 font-semibold">
                        <th className="py-3 px-5 whitespace-nowrap">الحالة</th>
                        <th className="py-3 px-4 whitespace-nowrap">المنطقة</th>
                        <th className="py-3 px-4 whitespace-nowrap">وضع الملف</th>
                        <th className="py-3 px-4 whitespace-nowrap">آخر زيارة</th>
                        <th className="py-3 px-4 whitespace-nowrap">الفجوة الشهرية</th>
                        <th className="py-3 px-5 text-left whitespace-nowrap">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCases.map((c) => {
                        const overdue = isCaseOverdueLive(c);
                        const statusInfo = getCaseStatusText(c.status, overdue);
                        const needsFieldAction =
                          overdue ||
                          c.status === 'needs_revision' ||
                          c.status === 'pending_field_research' ||
                          !c.lastVisitDate;

                        return (
                          <tr
                            key={c.id}
                            className="hover:bg-slate-50/60 transition-colors"
                          >
                            <td className="py-3.5 px-5">
                              <button
                                type="button"
                                onClick={() => setSelectedCaseId(c.id)}
                                className="text-right group cursor-pointer focus-visible:outline-hidden focus-visible:underline"
                              >
                                <div className="font-semibold text-slate-900 group-hover:text-[#005756] transition-colors">
                                  {c.fullName}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 tabular-nums">
                                  <span>{c.code}</span>
                                  {c.secondaryName && (
                                    <>
                                      <span className="text-slate-300" aria-hidden="true">·</span>
                                      <span>{c.secondaryName}</span>
                                    </>
                                  )}
                                </div>
                              </button>
                            </td>

                            <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                              <div>{c.district}</div>
                              <div className="text-[11px] text-slate-400">{c.governorate}</div>
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 font-medium ${
                                  statusInfo.isUrgent ? 'text-rose-700 font-semibold' : 'text-slate-700'
                                }`}
                              >
                                {statusInfo.isUrgent && (
                                  <AlertTriangle size={13} className="text-rose-600 shrink-0" />
                                )}
                                <span>{statusInfo.label}</span>
                              </span>
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap tabular-nums">
                              <span className={overdue ? 'text-rose-600 font-semibold' : 'text-slate-600'}>
                                {c.lastVisitDate || 'لم تتم بعد'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap tabular-nums font-semibold text-slate-900">
                              {c.financials.netFinancialGap.toLocaleString('en-US')} ج.م
                            </td>

                            <td className="py-3.5 px-5 whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                {needsFieldAction && (
                                  <button
                                    type="button"
                                    onClick={() => openFieldSurvey(c.id)}
                                    className="inline-flex items-center gap-1.5 h-8 px-3 bg-[#005756] hover:bg-[#004746] text-white rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                                  >
                                    <ClipboardList size={13} className="shrink-0" />
                                    <span>{c.lastVisitDate ? 'تحديث الزيارة' : 'ابدأ البحث'}</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setSelectedCaseId(c.id)}
                                  className="inline-flex items-center gap-1.5 h-8 px-3 bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                                >
                                  <Eye size={13} className="text-slate-400 shrink-0" />
                                  <span>افتح الملف</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Clean Flat List (Zero Nested Cards) */}
                <div className="md:hidden divide-y divide-slate-100">
                  {filteredCases.map((c) => {
                    const overdue = isCaseOverdueLive(c);
                    const statusInfo = getCaseStatusText(c.status, overdue);
                    const needsFieldAction =
                      overdue ||
                      c.status === 'needs_revision' ||
                      c.status === 'pending_field_research' ||
                      !c.lastVisitDate;

                    return (
                      <div key={c.id} className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setSelectedCaseId(c.id)}
                              className="text-right font-bold text-sm text-slate-900 hover:text-[#005756] transition-colors cursor-pointer block truncate max-w-full"
                            >
                              {c.fullName}
                            </button>
                            <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 tabular-nums">
                              <span>{c.code}</span>
                              <span className="text-slate-300" aria-hidden="true">·</span>
                              <span>{c.district}</span>
                            </div>
                          </div>

                          <div className="text-left shrink-0 tabular-nums">
                            <span className="text-xs font-bold text-slate-900 block">
                              {c.financials.netFinancialGap.toLocaleString('en-US')} ج.م
                            </span>
                            <span className="text-[11px] text-slate-400">فجوة شهرية</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <span
                            className={`inline-flex items-center gap-1 font-medium ${
                              statusInfo.isUrgent ? 'text-rose-700 font-semibold' : 'text-slate-600'
                            }`}
                          >
                            {statusInfo.isUrgent && (
                              <AlertTriangle size={12} className="text-rose-600 shrink-0" />
                            )}
                            <span>{statusInfo.label}</span>
                          </span>
                          <span className="text-slate-300" aria-hidden="true">·</span>
                          <span className={`tabular-nums ${overdue ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                            آخر زيارة: {c.lastVisitDate || 'لم تتم بعد'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setSelectedCaseId(c.id)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Eye size={14} className="text-slate-400 shrink-0" />
                            <span>افتح الملف</span>
                          </button>
                          {needsFieldAction && (
                            <button
                              type="button"
                              onClick={() => openFieldSurvey(c.id)}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 bg-[#005756] hover:bg-[#004746] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <ClipboardList size={14} className="shrink-0" />
                              <span>{c.lastVisitDate ? 'تحديث الزيارة' : 'ابدأ البحث'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab 2: Documented Field Visits & Researcher Recommendations */}
        {activeTab === 'reports' && (
          <div>
            {filteredReports.length === 0 ? (
              <div className="py-12 px-6 text-center space-y-2.5">
                <FileText size={24} className="mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-800">
                  {unifiedFieldReports.length === 0
                    ? 'مفيش تقارير زيارات مسجلة للباحث ده لحد دلوقتي'
                    : 'مفيش تقارير مطابقة لبحثك'}
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  {unifiedFieldReports.length === 0
                    ? 'أول ما تتسجل زيارة ميدانية أو بحث حالة باسم الباحث، هيظهر التقرير والتوصية هنا فوراً.'
                    : 'جرّب كلمات بحث تانية أو امسح خانة البحث.'}
                </p>
                {unifiedFieldReports.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="inline-flex items-center gap-1.5 mt-1 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-lg transition-colors cursor-pointer"
                  >
                    <RotateCcw size={13} className="text-slate-400" />
                    <span>مسح البحث</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openFieldSurvey()}
                    className="inline-flex items-center gap-1.5 mt-1 px-4 py-2 text-xs font-semibold text-white bg-[#005756] hover:bg-[#004746] rounded-lg transition-colors cursor-pointer"
                  >
                    <MapPin size={14} />
                    <span>ابدأ بحث حالة</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredReports.map((entry) => (
                  <article
                    key={entry.id}
                    className="p-4 sm:p-6 hover:bg-slate-50/50 transition-colors space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => setSelectedCaseId(entry.caseId)}
                          className="font-bold text-sm text-slate-900 hover:text-[#005756] transition-colors cursor-pointer text-right"
                        >
                          {entry.caseName}
                        </button>
                        <span className="text-slate-300" aria-hidden="true">·</span>
                        <span className="text-xs text-slate-500 tabular-nums">{entry.caseCode}</span>
                        <span className="text-slate-300" aria-hidden="true">·</span>
                        <span
                          className={`text-xs font-medium ${
                            entry.isUrgentStatus ? 'text-rose-700 font-semibold' : 'text-slate-500'
                          }`}
                        >
                          {entry.typeLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-slate-500 tabular-nums">{entry.date}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedCaseId(entry.caseId)}
                          className="inline-flex items-center gap-1.5 h-8 px-3 bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Eye size={13} className="text-slate-400 shrink-0" />
                          <span>ملف الحالة</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-400 block">
                          الرصد الميداني
                        </span>
                        <p className="text-slate-600">{entry.observations}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-400 block">
                          توصية الباحث
                        </span>
                        <p className="text-slate-800 font-medium">{entry.recommendation}</p>
                      </div>
                    </div>

                    {(entry.attachmentsCount || entry.trustScore || entry.recommendedMonthlyAmount) && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-slate-500 tabular-nums">
                        {entry.attachmentsCount ? (
                          <span>مرفقات موثقة: {entry.attachmentsCount}</span>
                        ) : null}
                        {entry.attachmentsCount && (entry.trustScore || entry.recommendedMonthlyAmount) ? (
                          <span className="text-slate-300" aria-hidden="true">·</span>
                        ) : null}
                        {entry.trustScore ? (
                          <span>نسبة ثقة الباحث: {entry.trustScore}%</span>
                        ) : null}
                        {entry.trustScore && entry.recommendedMonthlyAmount ? (
                          <span className="text-slate-300" aria-hidden="true">·</span>
                        ) : null}
                        {entry.recommendedMonthlyAmount ? (
                          <span>
                            المقترح الشهري: {entry.recommendedMonthlyAmount.toLocaleString('en-US')} ج.م
                          </span>
                        ) : null}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Add / Edit Researcher Modal */}
      <ResearcherFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingResearcher(null);
        }}
        editingResearcher={editingResearcher}
        existingNames={allResearcherProfiles.map((r) => r.name)}
        onSubmit={handleFormSubmit}
        mode={isResearcherRole ? 'self-profile' : 'admin'}
      />

      {/* Deactivate Confirmation Modal */}
      <ResearcherDeactivateModal
        isOpen={isDeactivateModalOpen}
        researcher={currentResearcher}
        assignedCasesCount={assignedCases.length}
        visitsCount={totalVisitsCount}
        onClose={() => setIsDeactivateModalOpen(false)}
        onConfirm={handleConfirmDeactivate}
      />
    </div>
  );
}
