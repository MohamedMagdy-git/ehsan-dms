'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getPendingSyncQueue, removeSyncQueueItem } from '@/services/offline-storage';
import {
  BeneficiaryCase,
  Donation,
  FieldVisit,
  CaseResearchReport,
  MonthlyAllocation,
  AllocationItem,
  AllocationCycleType,
  ExceptionalDistributionMode,
  ScoringRulesConfig,
  AuditLog,
  AppUserRole,
  UserSessionProfile,
  CaseStatus,
  MockAttachment,
  ShariaDonationCategory,
  ChronicDiseaseConfig,
  CaseNote,
  CaseStudyReport,
  FastTrackDisbursementOrder,
  DocumentsChecklist,
  HousingCondition,
} from '@/types';
import {
  INITIAL_CASES,
  INITIAL_DONATIONS,
  INITIAL_VISITS,
  INITIAL_RESEARCH_REPORTS,
  INITIAL_AUDIT_LOGS,
  DEFAULT_SHARIA_CATEGORIES,
  DEFAULT_CHRONIC_DISEASES,
  INITIAL_FAST_TRACK_ORDERS,
  INITIAL_CASE_NOTES,
  INITIAL_RESEARCHERS,
} from '@/data/initial-mock-data';
import {
  DEFAULT_SCORING_CONFIG,
  calculateCaseAssessment,
  derivePriorityLevel,
  checkVisitOverdueStatus,
} from '@/services/scoring-engine';
import {
  generateMonthlyAllocationProposal,
  calculateAllocationSummary,
  doesDraftAllocationNeedSync,
  reconcileDraftAllocationWithCases,
  formatPeriodLabelFromDate,
} from '@/services/allocation-engine';

export const ROLE_PROFILES: Record<AppUserRole, UserSessionProfile> = {
  admin: {
    role: 'admin',
    name: 'أ. أحمد الجزار',
    title: 'مدير الجمعية والنظام',
    avatarInitial: 'أ',
    badgeLabel: 'مدير النظام',
    defaultTab: 'dashboard',
    allowedTabs: [
      'dashboard',
      'cases',
      'cases-review',
      'research',
      'researcher-profile',
      'donations',
      'fast-track',
      'allocation',
      'donor-portal',
      'reports',
      'settings',
    ],
    description: 'صلاحيات كاملة على الخزينة، التخصيص، الاعتماد، والسجلات الإدارية',
  },
  finance: {
    role: 'finance',
    name: 'أ. محمود صبري',
    title: 'المسؤول المالي وأمين الصندوق',
    avatarInitial: 'م',
    badgeLabel: 'المسؤول المالي',
    defaultTab: 'dashboard',
    allowedTabs: ['dashboard', 'donations', 'fast-track', 'allocation', 'reports'],
    description: 'إدارة حركة الخزينة والتبرعات، تدقيق الميزانية، وتصدير التقارير المالية',
  },
  researcher: {
    role: 'researcher',
    name: 'م. كريم عادل',
    title: 'باحث ميداني معتمد',
    avatarInitial: 'ك',
    badgeLabel: 'باحث ميداني',
    defaultTab: 'research',
    allowedTabs: ['dashboard', 'cases', 'research', 'researcher-profile', 'fast-track'],
    description: 'استقصاء الحالات الميدانية، تحديث المستندات، وتنفيذ الزيارات الدورية',
  },
  donor: {
    role: 'donor',
    name: 'م. أحمد حسام',
    title: 'متبرع ومساهم كريم',
    avatarInitial: 'ح',
    badgeLabel: 'متبرع',
    defaultTab: 'donor-portal',
    allowedTabs: ['donor-portal'],
    description: 'بوابة الشفافية لمتابعة أثر التبرعات والحالات المكفولة بخصوصية تامة',
  },
};

const STORAGE_KEYS = {
  CASES: 'ehsan_cases_v4',
  DONATIONS: 'ehsan_donations_v4',
  VISITS: 'ehsan_visits_v4',
  ALLOCATIONS: 'ehsan_allocations_v4',
  AUDIT: 'ehsan_audit_v4',
  SCORING: 'ehsan_scoring_v4',
  SHARIA_CATEGORIES: 'ehsan_sharia_categories_v1',
  CHRONIC_DISEASES: 'ehsan_chronic_diseases_v1',
  FAST_TRACK_ORDERS: 'ehsan_fast_track_orders_v1',
  CASE_NOTES: 'ehsan_case_notes_v1',
  RESEARCHERS: 'ehsan_researchers_v1',
};

export const DEFAULT_RESEARCHERS: string[] = Array.from(
  new Set([
    ...INITIAL_RESEARCHERS.map((r) => r.name),
    ...INITIAL_CASES.map((c) => c.assignedResearcher),
    'أ. هبة الشامي',
    'أ. وائل فتحي',
    'د. طارق المنشاوي',
    'أ. دينا كمال',
    'م. كريم عادل',
    'أ. مريم القاضي',
  ].filter(Boolean))
);

export type CaseDetailsTab = 'profile' | 'financials' | 'visits' | 'documents' | 'notes';

interface AppContextType {
  // Navigation & State
  activeSection: string;
  setActiveSection: (sec: string) => void;
  selectedCaseId: string | null;
  setSelectedCaseId: (id: string | null) => void;
  selectedCaseTab: CaseDetailsTab;
  setSelectedCaseTab: (tab: CaseDetailsTab) => void;
  openCaseDetails: (caseId: string, defaultTab?: CaseDetailsTab) => void;
  currentUserRole: AppUserRole;
  setCurrentUserRole: (role: AppUserRole) => void;
  currentSessionProfile: UserSessionProfile;
  allSessionProfiles: Record<AppUserRole, UserSessionProfile>;
  activeDonorId: string;
  setActiveDonorId: (id: string) => void;
  currentPeriod: string;
  setCurrentPeriod: (period: string) => void;

  // Editing Case modal target
  editingCase: BeneficiaryCase | null;
  setEditingCase: (c: BeneficiaryCase | null) => void;
  isHydrated: boolean;

  // Permissions
  permissions: {
    canApproveBudget: boolean;
    canEditAllocation: boolean;
    canManageCases: boolean;
    canConfigureSettings: boolean;
    canViewBeneficiaryPII: boolean;
    canViewFinancialTreasury: boolean;
  };

  // Data
  cases: BeneficiaryCase[];
  donations: Donation[];
  visits: FieldVisit[];
  researchReports: CaseResearchReport[];
  allocations: Record<string, MonthlyAllocation>;
  scoringConfig: ScoringRulesConfig;
  auditLogs: AuditLog[];
  shariaCategories: ShariaDonationCategory[];
  chronicDiseases: ChronicDiseaseConfig[];
  fastTrackOrders: FastTrackDisbursementOrder[];
  caseNotes: CaseNote[];
  researchers: string[];

  // New Modal triggers for universal access
  isNewCaseModalOpen: boolean;
  setIsNewCaseModalOpen: (open: boolean) => void;
  isNewDonationModalOpen: boolean;
  setIsNewDonationModalOpen: (open: boolean) => void;
  isFieldSurveyModalOpen: boolean;
  setIsFieldSurveyModalOpen: (open: boolean) => void;
  surveyTargetCaseId: string | null;
  setSurveyTargetCaseId: (id: string | null) => void;
  openFieldSurvey: (caseId?: string) => void;

  // Helpers & Derived
  currentAllocation: MonthlyAllocation | undefined;
  dashboardCycle: MonthlyAllocation | undefined;
  metrics: {
    totalCases: number;
    eligibleCases: number;
    activeEligibleStandardCases: number;
    approvedExceptionCases: number;
    fundedCasesCount: number;
    underInvestigationCases: number;
    temporarilyExcludedCases: number;
    closedCases: number;
    excludedOrClosedCases: number;
    urgentReviewCases: number;
    overdueVisitsCases: number;
    incompleteDocsCases: number;
    receivedDonationsTotal: number;
    unrestrictedDonationsBalance: number;
    restrictedDonationsBalance: number;
    restrictedPurposeBalance: number;
    restrictedCaseBalance: number;
    restrictedPurposeInbound: number;
    restrictedCaseInbound: number;
    restrictedDisbursedTotal: number;
    totalAvailableLiquidity: number;
    pledgedDonationsTotal: number;
    approvedAssistanceTotal: number;
    approvedCyclesCount: number;
    approvedCyclesDisbursedTotal: number;
    fastTrackDeliveredTotal: number;
    fastTrackPendingTotal: number;
    activeFastTrackTotal: number;
    disbursedAssistanceTotal: number;
    unrestrictedAvailableBalance: number;
    totalDisbursedOrAllocated: number;
    netTreasuryBalance: number;
    treasuryStatus: 'surplus' | 'deficit';
    totalFamiliesNeedGap: number;
    isAllocationApproved: boolean;
  };

  // Actions
  addCase: (caseData: Omit<BeneficiaryCase, 'id' | 'code' | 'historicalAssistanceTotal' | 'isVisitOverdue'>) => { success: boolean; error?: string; caseId?: string };
  updateCase: (id: string, updates: Partial<BeneficiaryCase>) => void;
  changeCaseStatus: (id: string, status: CaseStatus, reason?: string) => void;
  approveCaseReview: (id: string, notes?: string) => void;
  returnCaseForRevision: (id: string, revisionReason: string) => void;
  rejectCaseReview: (id: string, rejectionReason: string) => void;
  approveCaseException: (id: string, approvedBy: string, reason: string) => void;
  addCaseAttachment: (caseId: string, attachment: Omit<MockAttachment, 'id'>) => void;
  addDonation: (donationData: Omit<Donation, 'id' | 'allocatedAmount' | 'remainingAmount'>) => void;
  addShariaCategory: (categoryData: Omit<ShariaDonationCategory, 'id'>) => void;
  updateShariaCategory: (id: string, updates: Partial<ShariaDonationCategory>) => void;
  toggleShariaCategory: (id: string) => void;
  addChronicDisease: (diseaseData: Omit<ChronicDiseaseConfig, 'id'>) => void;
  updateChronicDisease: (id: string, updates: Partial<ChronicDiseaseConfig>) => void;
  toggleChronicDisease: (id: string) => void;
  deleteChronicDisease: (id: string) => void;
  addVisit: (visitData: Omit<FieldVisit, 'id'>) => void;
  reassignResearcher: (caseId: string, newResearcher: string, reason?: string) => void;
  generateOrRefreshAllocation: (
    period: string,
    customBudget?: number,
    overrideConfig?: ScoringRulesConfig,
    overrideCases?: BeneficiaryCase[],
    batchOptions?: {
      batchTitle?: string;
      cycleType?: AllocationCycleType;
      periodDate?: string;
      executionDate?: string;
      coverageMonths?: number;
      strategy?: 'priority_first' | 'proportional';
      exceptionalDistributionMode?: ExceptionalDistributionMode;
      flatAmountPerCase?: number;
    }
  ) => MonthlyAllocation;
  createAllocationCycle: (data: {
    batchTitle: string;
    cycleType: AllocationCycleType;
    periodDate: string;
    totalBudget: number;
    coverageMonths?: number;
    allocationStrategy?: 'priority_first' | 'proportional';
    exceptionalDistributionMode?: ExceptionalDistributionMode;
    flatAmountPerCase?: number;
  }) => MonthlyAllocation;
  syncDraftAllocations: (period?: string) => void;
  updateAllocationBatchConfig: (
    period: string,
    updates: {
      batchTitle?: string;
      cycleType?: AllocationCycleType;
      periodDate?: string;
      executionDate?: string;
      coverageMonths?: number;
      allocationStrategy?: 'priority_first' | 'proportional';
      exceptionalDistributionMode?: ExceptionalDistributionMode;
      flatAmountPerCase?: number;
      totalBudget?: number;
    }
  ) => void;
  updateAllocationItem: (period: string, itemId: string, updates: Partial<AllocationItem>) => void;
  toggleExcludeItem: (period: string, itemId: string, isExcluded: boolean, reason?: string) => void;
  approveAllocation: (period: string, approvedBy: string) => void;
  unlockAllocation: (period: string, unlockedBy: string, reason: string) => void;
  issueFastTrackDisbursement: (data: {
    caseId: string;
    shariaCategoryId: string;
    amount: number;
    assignedResearcher: string;
    dueDeadlineDate: string;
    purposeNote: string;
    issuedBy?: string;
  }) => { success: boolean; error?: string; order?: FastTrackDisbursementOrder };
  markFastTrackOrderDelivered: (
    orderId: string,
    deliveryData?: {
      deliveryReceiptNo?: string;
      deliveryMethod?: string;
      deliveryNotes?: string;
    }
  ) => void;
  fastTrackTriggerData: {
    caseId: string;
    suggestedAmount?: number;
    donorName?: string;
    donationNote?: string;
  } | null;
  setFastTrackTriggerData: (
    data: {
      caseId: string;
      suggestedAmount?: number;
      donorName?: string;
      donationNote?: string;
    } | null
  ) => void;
  cancelFastTrackOrder: (orderId: string, reason?: string) => void;
  getRestrictedFundBalances: () => Record<string, { inbound: number; disbursed: number; available: number }>;
  updateScoringConfig: (config: Partial<ScoringRulesConfig>) => void;
  addAuditLog: (action: string, details: string) => void;
  resetToSeedData: () => void;
  addCaseNote: (noteData: {
    caseId: string;
    content: string;
    isPrivate: boolean;
    category?: 'general' | 'followup' | 'warning' | 'urgent';
    authorName?: string;
    authorRole?: string;
  }) => CaseNote;
  deleteCaseNote: (noteId: string) => void;
  addCustomResearcher: (name: string) => string;
  submitCaseStudyReport: (report: CaseStudyReport) => void;

  // PWA Offline Sync Engine
  isSyncing: boolean;
  syncSuccessMessage: string | null;
  setSyncSuccessMessage: (msg: string | null) => void;
  triggerSync: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedCaseTab, setSelectedCaseTab] = useState<CaseDetailsTab>('profile');
  const [editingCase, setEditingCase] = useState<BeneficiaryCase | null>(null);

  const openCaseDetails = useCallback((caseId: string, defaultTab: CaseDetailsTab = 'profile') => {
    setSelectedCaseTab(defaultTab);
    setSelectedCaseId(caseId);
  }, []);
  const [currentUserRole, setCurrentUserRole] = useState<AppUserRole>('admin');
  const [activeDonorId, setActiveDonorId] = useState<string>('donor-ahmed-hossam');
  const [currentPeriod, setCurrentPeriod] = useState<string>('2026-10');
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState<boolean>(false);
  const [isNewDonationModalOpen, setIsNewDonationModalOpen] = useState<boolean>(false);
  const [isFieldSurveyModalOpen, setIsFieldSurveyModalOpen] = useState<boolean>(false);
  const [surveyTargetCaseId, setSurveyTargetCaseId] = useState<string | null>(null);
  const [fastTrackTriggerData, setFastTrackTriggerData] = useState<{
    caseId: string;
    suggestedAmount?: number;
    donorName?: string;
    donationNote?: string;
  } | null>(null);

  // Offline Sync States
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  const openFieldSurvey = (caseId?: string) => {
    setSurveyTargetCaseId(caseId || null);
    setIsFieldSurveyModalOpen(true);
  };

  // Consistent initial state between SSR and Client
  const [cases, setCases] = useState<BeneficiaryCase[]>(INITIAL_CASES);
  const [donations, setDonations] = useState<Donation[]>(INITIAL_DONATIONS);
  const [visits, setVisits] = useState<FieldVisit[]>(INITIAL_VISITS);
  const [researchReports, setResearchReports] = useState<CaseResearchReport[]>(INITIAL_RESEARCH_REPORTS);
  const [scoringConfig, setScoringConfig] = useState<ScoringRulesConfig>(DEFAULT_SCORING_CONFIG);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [shariaCategories, setShariaCategories] = useState<ShariaDonationCategory[]>(DEFAULT_SHARIA_CATEGORIES);
  const [chronicDiseases, setChronicDiseases] = useState<ChronicDiseaseConfig[]>(DEFAULT_CHRONIC_DISEASES);
  const [fastTrackOrders, setFastTrackOrders] = useState<FastTrackDisbursementOrder[]>(INITIAL_FAST_TRACK_ORDERS);
  const [caseNotes, setCaseNotes] = useState<CaseNote[]>(INITIAL_CASE_NOTES);
  const [researchers, setResearchers] = useState<string[]>(DEFAULT_RESEARCHERS);
  const [allocations, setAllocations] = useState<Record<string, MonthlyAllocation>>(() => {
    const octProposal = generateMonthlyAllocationProposal({
      period: '2026-10',
      periodLabel: 'أكتوبر 2026',
      batchTitle: 'كفالات أكتوبر 2026',
      cycleType: 'regular',
      periodDate: '2026-10-15',
      executionDate: '2026-10-15',
      coverageMonths: 1,
      cases: INITIAL_CASES,
      donations: INITIAL_DONATIONS,
      config: DEFAULT_SCORING_CONFIG,
    });
    octProposal.sessionMinutesNumber = 'محضر رقم 10/2026-إد';
    octProposal.sessionMinutesDate = '2026-10-14';

    const novProposal = generateMonthlyAllocationProposal({
      period: '2026-11',
      periodLabel: 'نوفمبر 2026',
      batchTitle: 'كفالات نوفمبر 2026',
      cycleType: 'regular',
      periodDate: '2026-11-15',
      executionDate: '2026-11-15',
      coverageMonths: 1,
      cases: INITIAL_CASES,
      donations: INITIAL_DONATIONS,
      config: DEFAULT_SCORING_CONFIG,
    });
    novProposal.sessionMinutesNumber = 'محضر رقم 11/2026-إد';
    novProposal.sessionMinutesDate = '2026-11-14';

    return {
      '2026-10': octProposal,
      '2026-11': novProposal,
    };
  });
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Restore persisted state after initial client mount to prevent SSR hydration mismatch
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      let hydratedCases: BeneficiaryCase[] = INITIAL_CASES;
      let hydratedDonations: Donation[] = INITIAL_DONATIONS;
      let hydratedScoring: ScoringRulesConfig = DEFAULT_SCORING_CONFIG;

      const savedCases = localStorage.getItem(STORAGE_KEYS.CASES);
      if (savedCases) {
        const parsedCases = JSON.parse(savedCases);
        if (Array.isArray(parsedCases)) {
          hydratedCases = parsedCases.map((c: BeneficiaryCase) =>
            !c.lastVisitDate || c.status === 'pending_field_research'
              ? { ...c, isVisitOverdue: false }
              : c
          );
          setCases(hydratedCases);
        }
      }

      const savedDonations = localStorage.getItem(STORAGE_KEYS.DONATIONS);
      if (savedDonations) {
        hydratedDonations = JSON.parse(savedDonations);
        setDonations(hydratedDonations);
      }

      const savedCategories = localStorage.getItem(STORAGE_KEYS.SHARIA_CATEGORIES);
      if (savedCategories) {
        try {
          setShariaCategories(JSON.parse(savedCategories));
        } catch (err) {
          console.warn('Failed to parse sharia categories:', err);
        }
      }

      const savedChronicDiseases = localStorage.getItem(STORAGE_KEYS.CHRONIC_DISEASES);
      if (savedChronicDiseases) {
        try {
          const parsed = JSON.parse(savedChronicDiseases);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setChronicDiseases(parsed);
          }
        } catch (err) {
          console.warn('Failed to parse chronic diseases:', err);
        }
      }

      const savedVisits = localStorage.getItem(STORAGE_KEYS.VISITS);
      if (savedVisits) setVisits(JSON.parse(savedVisits));

      const savedScoring = localStorage.getItem(STORAGE_KEYS.SCORING);
      if (savedScoring) {
        hydratedScoring = JSON.parse(savedScoring);
        setScoringConfig(hydratedScoring);
      }

      const savedAudit = localStorage.getItem(STORAGE_KEYS.AUDIT);
      if (savedAudit) {
        try {
          const parsed = JSON.parse(savedAudit);
          if (Array.isArray(parsed)) {
            const seenAuditIds = new Set<string>();
            const sanitizedAudit = parsed.map((log: AuditLog, idx: number) => {
              let uniqueId = log.id;
              if (!uniqueId || seenAuditIds.has(uniqueId)) {
                uniqueId = `${uniqueId || 'audit'}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
              }
              seenAuditIds.add(uniqueId);
              return { ...log, id: uniqueId };
            });
            setAuditLogs(sanitizedAudit);
          }
        } catch (e) {
          console.warn('Failed to parse audit logs from storage:', e);
        }
      }

      const savedAllocations = localStorage.getItem(STORAGE_KEYS.ALLOCATIONS);
      if (savedAllocations) {
        try {
          const parsed = JSON.parse(savedAllocations);
          const sanitized: Record<string, MonthlyAllocation> = {};
          for (const [k, v] of Object.entries(parsed as Record<string, MonthlyAllocation>)) {
            // Ensure draft allocations strictly route 100% through unrestricted_pool
            const sanitizedItems = (v.items || []).map((item) => {
              if (v.status === 'draft') {
                return {
                  ...item,
                  fundSource: 'unrestricted_pool' as const,
                  fundSourceName: item.fundSourceName?.includes('موقوفة') ? item.fundSourceName : 'الصندوق العام (غير مقيد)',
                };
              }
              return item;
            });
            const budgetVal = v.totalBudget === 188000 ? 113000 : v.totalBudget;
            const inferredDate =
              v.periodDate ||
              v.executionDate ||
              (/^\d{4}-\d{2}$/.test(k) ? `${k}-15` : new Date().toISOString().split('T')[0]);
            const normalizedAlloc: MonthlyAllocation = {
              ...v,
              cycleType: v.cycleType || 'regular',
              periodDate: inferredDate,
              executionDate: v.executionDate || inferredDate,
              periodLabel: v.periodLabel || formatPeriodLabelFromDate(inferredDate, k),
              batchTitle: v.batchTitle || v.periodLabel || formatPeriodLabelFromDate(inferredDate, k),
              totalBudget: budgetVal,
              unrestrictedBudget: budgetVal,
              restrictedBudget: 0,
              items: sanitizedItems,
              summary: calculateAllocationSummary(sanitizedItems, budgetVal),
            };

            // Auto-heal open draft cycles so previously approved eligible cases appear immediately
            sanitized[k] =
              normalizedAlloc.status === 'draft' &&
              doesDraftAllocationNeedSync(normalizedAlloc, hydratedCases, hydratedScoring)
                ? reconcileDraftAllocationWithCases(
                    normalizedAlloc,
                    hydratedCases,
                    hydratedDonations,
                    hydratedScoring
                  )
                : normalizedAlloc;
          }
          setAllocations(sanitized);
        } catch (err) {
          console.warn('Failed to parse saved allocations:', err);
        }
      } else if (savedCases) {
        // If cases were persisted without allocations, sync initial open drafts against hydrated cases
        setAllocations((prev) => {
          const updated: Record<string, MonthlyAllocation> = {};
          for (const [k, alloc] of Object.entries(prev)) {
            updated[k] =
              alloc.status === 'draft' &&
              doesDraftAllocationNeedSync(alloc, hydratedCases, hydratedScoring)
                ? reconcileDraftAllocationWithCases(
                    alloc,
                    hydratedCases,
                    hydratedDonations,
                    hydratedScoring
                  )
                : alloc;
          }
          return updated;
        });
      }

      const savedFastTrack = localStorage.getItem(STORAGE_KEYS.FAST_TRACK_ORDERS);
      if (savedFastTrack) {
        try {
          const parsed = JSON.parse(savedFastTrack);
          if (Array.isArray(parsed)) {
            const hasCase05Order = parsed.some((o: FastTrackDisbursementOrder) => o.caseId === 'case-05');
            if (!hasCase05Order) {
              const defaultCase05Order = INITIAL_FAST_TRACK_ORDERS.find((o) => o.caseId === 'case-05');
              if (defaultCase05Order) parsed.push(defaultCase05Order);
            }
            setFastTrackOrders(parsed);
          }
        } catch (err) {
          console.warn('Failed to parse fast-track orders:', err);
        }
      }

      const savedNotes = localStorage.getItem(STORAGE_KEYS.CASE_NOTES);
      if (savedNotes) {
        try {
          const parsed = JSON.parse(savedNotes);
          if (Array.isArray(parsed)) {
            setCaseNotes(parsed);
          }
        } catch (err) {
          console.warn('Failed to parse case notes:', err);
        }
      }

      const savedResearchers = localStorage.getItem(STORAGE_KEYS.RESEARCHERS);
      if (savedResearchers) {
        try {
          const parsed = JSON.parse(savedResearchers);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setResearchers(Array.from(new Set([...DEFAULT_RESEARCHERS, ...parsed].filter(Boolean))));
          }
        } catch (err) {
          console.warn('Failed to parse researchers:', err);
        }
      }
    } catch (e) {
      console.warn('Failed to restore from localStorage:', e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Persist state to localStorage only after hydration is complete
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(cases));
    } catch (e) {
      console.warn('Failed to save cases to localStorage:', e);
    }
  }, [cases, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.DONATIONS, JSON.stringify(donations));
    } catch (e) {
      console.warn('Failed to save donations to localStorage:', e);
    }
  }, [donations, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.VISITS, JSON.stringify(visits));
    } catch (e) {
      console.warn('Failed to save visits to localStorage:', e);
    }
  }, [visits, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.ALLOCATIONS, JSON.stringify(allocations));
    } catch (e) {
      console.warn('Failed to save allocations to localStorage:', e);
    }
  }, [allocations, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(auditLogs));
    } catch (e) {
      console.warn('Failed to save audit logs to localStorage:', e);
    }
  }, [auditLogs, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.SCORING, JSON.stringify(scoringConfig));
    } catch (e) {
      console.warn('Failed to save scoring config to localStorage:', e);
    }
  }, [scoringConfig, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.SHARIA_CATEGORIES, JSON.stringify(shariaCategories));
    } catch (e) {
      console.warn('Failed to save sharia categories to localStorage:', e);
    }
  }, [shariaCategories, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.CHRONIC_DISEASES, JSON.stringify(chronicDiseases));
    } catch (e) {
      console.warn('Failed to save chronic diseases to localStorage:', e);
    }
  }, [chronicDiseases, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.FAST_TRACK_ORDERS, JSON.stringify(fastTrackOrders));
    } catch (e) {
      console.warn('Failed to save fast track orders to localStorage:', e);
    }
  }, [fastTrackOrders, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.CASE_NOTES, JSON.stringify(caseNotes));
    } catch (e) {
      console.warn('Failed to save case notes to localStorage:', e);
    }
  }, [caseNotes, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.RESEARCHERS, JSON.stringify(researchers));
    } catch (e) {
      console.warn('Failed to save researchers to localStorage:', e);
    }
  }, [researchers, isHydrated]);

  const resetToSeedData = () => {
    setCases(INITIAL_CASES);
    setDonations(INITIAL_DONATIONS);
    setVisits(INITIAL_VISITS);
    setResearchReports(INITIAL_RESEARCH_REPORTS);
    setScoringConfig(DEFAULT_SCORING_CONFIG);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setShariaCategories(DEFAULT_SHARIA_CATEGORIES);
    setChronicDiseases(DEFAULT_CHRONIC_DISEASES);
    setFastTrackOrders(INITIAL_FAST_TRACK_ORDERS);
    setCaseNotes(INITIAL_CASE_NOTES);
    setResearchers(DEFAULT_RESEARCHERS);

    const octProposal = generateMonthlyAllocationProposal({
      period: '2026-10',
      periodLabel: 'أكتوبر 2026',
      batchTitle: 'كفالات أكتوبر 2026',
      executionDate: '2026-10-15',
      coverageMonths: 1,
      cases: INITIAL_CASES,
      donations: INITIAL_DONATIONS,
      config: DEFAULT_SCORING_CONFIG,
    });
    const novProposal = generateMonthlyAllocationProposal({
      period: '2026-11',
      periodLabel: 'نوفمبر 2026',
      batchTitle: 'كفالات نوفمبر 2026',
      executionDate: '2026-11-15',
      coverageMonths: 1,
      cases: INITIAL_CASES,
      donations: INITIAL_DONATIONS,
      config: DEFAULT_SCORING_CONFIG,
    });
    setAllocations({
      '2026-10': octProposal,
      '2026-11': novProposal,
    });

    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.CASES);
      localStorage.removeItem(STORAGE_KEYS.DONATIONS);
      localStorage.removeItem(STORAGE_KEYS.VISITS);
      localStorage.removeItem(STORAGE_KEYS.ALLOCATIONS);
      localStorage.removeItem(STORAGE_KEYS.AUDIT);
      localStorage.removeItem(STORAGE_KEYS.SCORING);
      localStorage.removeItem(STORAGE_KEYS.SHARIA_CATEGORIES);
      localStorage.removeItem(STORAGE_KEYS.CHRONIC_DISEASES);
      localStorage.removeItem(STORAGE_KEYS.FAST_TRACK_ORDERS);
      localStorage.removeItem(STORAGE_KEYS.CASE_NOTES);
      localStorage.removeItem(STORAGE_KEYS.RESEARCHERS);
    }
  };

  const addAuditLog = useCallback((action: string, details: string) => {
    const profile = ROLE_PROFILES[currentUserRole];
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newLog: AuditLog = {
      id: `audit-${uniqueSuffix}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      action,
      user: profile ? `${profile.name} (${profile.badgeLabel})` : 'مستخدم النظام',
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  }, [currentUserRole]);

  // دالة مزامنة حتمية لجميع المسودات المفتوحة (draft) مع الحفاظ على التعديلات والاستبعادات اليدوية
  const syncDraftAllocationsWithCases = useCallback(
    (
      nextCases: BeneficiaryCase[],
      overrideConfig?: ScoringRulesConfig,
      targetPeriod?: string
    ) => {
      const effectiveConfig = overrideConfig || scoringConfig;
      setAllocations((prevAlloc) => {
        let hasAnyChange = false;
        const nextAllocMap: Record<string, MonthlyAllocation> = { ...prevAlloc };

        for (const [periodKey, alloc] of Object.entries(prevAlloc)) {
          if (targetPeriod && periodKey !== targetPeriod) continue;
          if (!alloc || alloc.status !== 'draft') continue;

          const reconciled = reconcileDraftAllocationWithCases(
            alloc,
            nextCases,
            donations,
            effectiveConfig
          );
          nextAllocMap[periodKey] = reconciled;
          hasAnyChange = true;
        }

        return hasAnyChange ? nextAllocMap : prevAlloc;
      });
    },
    [donations, scoringConfig]
  );

  const syncDraftAllocations = useCallback(
    (period?: string) => {
      syncDraftAllocationsWithCases(cases, scoringConfig, period);
    },
    [cases, scoringConfig, syncDraftAllocationsWithCases]
  );

  const addCase = (
    caseData: Omit<BeneficiaryCase, 'id' | 'code' | 'historicalAssistanceTotal' | 'isVisitOverdue'>
  ) => {
    const duplicate = cases.find((c) => c.nationalId === caseData.nationalId);
    if (duplicate) {
      return {
        success: false,
        error: `الرقم القومي مسجل مسبقاً للحالة (${duplicate.fullName} - كود ${duplicate.code})`,
      };
    }

    const primary = (caseData.primaryName || caseData.fullName || '').trim();
    const secondary = caseData.secondaryName?.trim() || undefined;
    const nextNumber = cases.length + 101;
    const newCase: BeneficiaryCase = {
      ...caseData,
      primaryName: primary,
      secondaryName: secondary,
      fullName: primary,
      id: `case-${Date.now()}`,
      code: `EHS-${nextNumber}`,
      historicalAssistanceTotal: 0,
      isVisitOverdue: false,
    };

    const nextCases = [newCase, ...cases];
    setCases(nextCases);
    if (newCase.status === 'active_eligible' || newCase.status === 'excluded_current_month') {
      syncDraftAllocationsWithCases(nextCases);
    }

    if (newCase.status === 'pending_field_research') {
      addAuditLog(
        'قيد طلب مساعدة جديد',
        `تم قيد طلب المستحق ${newCase.fullName} (${newCase.code}) وإدراجه بقائمة الانتظار بانتظار الزيارة الميدانية`
      );
    } else {
      addAuditLog('تسجيل حالة جديدة', `تم تسجيل المستحق ${newCase.fullName} بكود ${newCase.code}`);
    }
    return { success: true, caseId: newCase.id };
  };

  const updateCase = (id: string, updates: Partial<BeneficiaryCase>) => {
    let updatedCaseName = id;
    const nextCases = cases.map((c) => {
      if (c.id === id) {
        const merged: BeneficiaryCase = { ...c, ...updates };
        if (updates.primaryName) {
          merged.primaryName = updates.primaryName.trim();
          merged.fullName = merged.primaryName;
        }
        if (updates.secondaryName !== undefined) {
          merged.secondaryName = updates.secondaryName.trim() || undefined;
        }
        const assessment = calculateCaseAssessment(merged, scoringConfig);
        updatedCaseName = `${merged.fullName} (${merged.code})`;
        return {
          ...merged,
          priorityScore: assessment.totalScore,
          priority: derivePriorityLevel(assessment.totalScore),
          assessmentFactors: assessment,
        };
      }
      return c;
    });
    setCases(nextCases);
    syncDraftAllocationsWithCases(nextCases);
    addAuditLog('تحديث بيانات حالة', `تم تحديث وتعديل بيانات الحالة: ${updatedCaseName}`);
  };

  const addShariaCategory = (categoryData: Omit<ShariaDonationCategory, 'id'>) => {
    const newCat: ShariaDonationCategory = {
      ...categoryData,
      id: `sharia-${Date.now()}`,
    };
    setShariaCategories((prev) => [...prev, newCat]);
    addAuditLog('إضافة مصرف شرعي', `تمت إضافة المصرف الشرعي: ${newCat.name}`);
  };

  const updateShariaCategory = (id: string, updates: Partial<ShariaDonationCategory>) => {
    setShariaCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, ...updates } : cat))
    );
    addAuditLog('تعديل مصرف شرعي', `تم تحديث بيانات المصرف الشرعي (${id})`);
  };

  const toggleShariaCategory = (id: string) => {
    let catName = id;
    let nextState = false;
    setShariaCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === id) {
          catName = cat.name;
          nextState = !cat.isActive;
          return { ...cat, isActive: !cat.isActive };
        }
        return cat;
      })
    );
    addAuditLog('تغيير حالة مصرف شرعي', `${nextState ? 'تفعيل' : 'إيقاف'} المصرف الشرعي: ${catName}`);
  };

  const addChronicDisease = (diseaseData: Omit<ChronicDiseaseConfig, 'id'>) => {
    const newDisease: ChronicDiseaseConfig = {
      ...diseaseData,
      id: `cd-${Date.now()}`,
    };
    setChronicDiseases((prev) => [...prev, newDisease]);
    addAuditLog(
      'إضافة مرض مزمن للإعدادات',
      `إدراج (${newDisease.name}) بمتوسط تكلفة ${newDisease.defaultMonthlyCost} ج.م شهرياً`
    );
  };

  const updateChronicDisease = (id: string, updates: Partial<ChronicDiseaseConfig>) => {
    setChronicDiseases((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
    addAuditLog('تحديث بيانات مرض مزمن', `تم تحديث تكلفة أو مسمى المرض المزمن (${id})`);
  };

  const toggleChronicDisease = (id: string) => {
    let diseaseName = id;
    let nextState = false;
    setChronicDiseases((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          diseaseName = d.name;
          nextState = !d.isActive;
          return { ...d, isActive: !d.isActive };
        }
        return d;
      })
    );
    addAuditLog('تغيير حالة مرض مزمن', `${nextState ? 'تفعيل' : 'إيقاف'} المرض المزمن: ${diseaseName}`);
  };

  const deleteChronicDisease = (id: string) => {
    const target = chronicDiseases.find((d) => d.id === id);
    setChronicDiseases((prev) => prev.filter((d) => d.id !== id));
    if (target) {
      addAuditLog('حذف مرض مزمن', `تم حذف (${target.name}) من قائمة الأمراض المزمنة`);
    }
  };

  const addCaseAttachment = (caseId: string, attachment: Omit<MockAttachment, 'id'>) => {
    const newAtt: MockAttachment = {
      ...attachment,
      id: `att-${Date.now()}`,
    };
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          return {
            ...c,
            attachments: [...c.attachments, newAtt],
          };
        }
        return c;
      })
    );
    addAuditLog('إرفاق مستند للحالة', `تم حفظ المرفق "${attachment.title}" لملف الحالة (${caseId})`);
  };

  const changeCaseStatus = (id: string, status: CaseStatus, reason?: string) => {
    const nextCases = cases.map((c) => (c.id === id ? { ...c, status } : c));
    setCases(nextCases);
    syncDraftAllocationsWithCases(nextCases);
    addAuditLog(
      'تغيير حالة المستحق',
      `تغيير حالة المستحق (${id}) إلى ${status}${reason ? ` - السبب: ${reason}` : ''}`
    );
  };

  const approveCaseReview = (id: string, notes?: string) => {
    let caseTitle = id;
    const now = new Date().toISOString().split('T')[0];

    const nextCases = cases.map((c) => {
      if (c.id === id) {
        caseTitle = `${c.primaryName || c.fullName} (${c.code})`;
        const entry = `[${now}] تم الاعتماد الإداري لبحث الحالة رسمياً بواسطة مدير النظام وإدراجها فوراً ضمن المستحقين المعتمدين للصرف.${notes ? ` [ملاحظة: ${notes}]` : ''}`;
        return {
          ...c,
          status: 'active_eligible' as CaseStatus,
          adminRevisionNote: undefined,
          lastAssessmentDate: now,
          lastVisitDate: c.lastVisitDate || c.lastAssessmentDate || now,
          isVisitOverdue: false,
          notes: c.notes ? `${entry}\n\n${c.notes}` : entry,
        };
      }
      return c;
    });

    setCases(nextCases);
    // مزامنة فورية وحتمية لجميع مسودات الميزانية المفتوحة (الحالية والمستقبلية) مع الحفاظ على التعديلات اليدوية
    syncDraftAllocationsWithCases(nextCases);

    addAuditLog('اعتماد رسمي لبحث حالة', `تم اعتماد بحث الحالة (${caseTitle}) رسمياً ونقلها للمستحقين المعتمدين للصرف`);
  };

  const returnCaseForRevision = (id: string, revisionReason: string) => {
    let caseTitle = id;
    const now = new Date().toISOString().split('T')[0];
    const cleanReason = revisionReason.trim();
    const nextCases = cases.map((c) => {
      if (c.id === id) {
        caseTitle = `${c.primaryName || c.fullName} (${c.code})`;
        const entry = `[${now}] إعادة للباحث الميداني (${c.assignedResearcher}) للاستيفاء والتعديل: "${cleanReason}"`;
        return {
          ...c,
          status: 'needs_revision' as CaseStatus,
          adminRevisionNote: cleanReason,
          notes: c.notes ? `${entry}\n\n${c.notes}` : entry,
        };
      }
      return c;
    });
    setCases(nextCases);
    syncDraftAllocationsWithCases(nextCases);
    addAuditLog('إعادة بحث حالة للاستيفاء', `تمت إعادة الحالة (${caseTitle}) للباحث للاستيفاء والتعديل: ${cleanReason}`);
  };

  const rejectCaseReview = (id: string, rejectionReason: string) => {
    let caseTitle = id;
    const now = new Date().toISOString().split('T')[0];
    const nextCases = cases.map((c) => {
      if (c.id === id) {
        caseTitle = `${c.primaryName || c.fullName} (${c.code})`;
        const entry = `[${now}] استبعاد / عدم اعتماد بحث الحالة بقرار إداري. السبب: "${rejectionReason}"`;
        return {
          ...c,
          status: 'closed' as CaseStatus,
          adminRevisionNote: undefined,
          notes: c.notes ? `${entry}\n\n${c.notes}` : entry,
        };
      }
      return c;
    });
    setCases(nextCases);
    syncDraftAllocationsWithCases(nextCases);
    addAuditLog('استبعاد بحث حالة', `تم استبعاد الحالة (${caseTitle}) بقرار إداري: ${rejectionReason}`);
  };

  const approveCaseException = (id: string, approvedBy: string, reason: string) => {
    const now = new Date().toISOString().split('T')[0];
    const nextCases = cases.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          status: 'active_eligible' as CaseStatus,
          lastVisitDate: c.lastVisitDate || c.lastAssessmentDate || now,
          isVisitOverdue: false,
          vulnerability: {
            ...c.vulnerability,
            exceptionApproved: true,
            exceptionApprovedBy: approvedBy,
            exceptionReason: reason,
          },
        };
      }
      return c;
    });
    setCases(nextCases);
    syncDraftAllocationsWithCases(nextCases);
    addAuditLog('اعتماد استثناء إداري', `تم اعتماد الحالة (${id}) كاستثناء إنساني بواسطة ${approvedBy}: ${reason}`);
  };

  const addDonation = (donationData: Omit<Donation, 'id' | 'allocatedAmount' | 'remainingAmount'>) => {
    const nextIndex = donations.length + 1;
    let shariaName = donationData.shariaCategoryName;
    if (!shariaName && donationData.shariaCategoryId) {
      const foundCat = shariaCategories.find((c) => c.id === donationData.shariaCategoryId);
      if (foundCat) shariaName = foundCat.name;
    }

    const isRestrictedCase =
      donationData.restrictionType === 'restricted_case' && !!donationData.designatedCaseId;
    const isReceived = donationData.status === 'received';
    const newDonationId = `don-${Date.now()}`;

    const newDonation: Donation = {
      ...donationData,
      shariaCategoryName: shariaName,
      id: newDonationId,
      donorReference: `DON-${nextIndex.toString().padStart(2, '0')}`,
      allocatedAmount: isRestrictedCase && isReceived ? donationData.amount : 0,
      remainingAmount: isRestrictedCase && isReceived ? 0 : donationData.amount,
    };
    setDonations((prev) => [newDonation, ...prev]);

    // إذا كان التبرع مقيداً لحالة محددة ومستلماً، يتم فوراً إصدار إذن صرف فوري معلق مخصص للحالة
    if (isRestrictedCase && isReceived && donationData.designatedCaseId) {
      const targetCase = cases.find((c) => c.id === donationData.designatedCaseId);
      if (targetCase) {
        const nextVoucherNum = fastTrackOrders.length + 1;
        const voucherCode = `FTD-2026-${String(nextVoucherNum).padStart(3, '0')}`;
        const todayStr = donationData.receivedDate || new Date().toISOString().split('T')[0];

        // احتساب مهلة أسبوع للتسليم
        const dueObj = new Date(todayStr);
        dueObj.setDate(dueObj.getDate() + 7);
        const dueDeadlineStr = dueObj.toISOString().split('T')[0];

        const catObj = shariaCategories.find((c) => c.id === donationData.shariaCategoryId);

        const autoOrder: FastTrackDisbursementOrder = {
          id: `fto-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          voucherCode,
          caseId: targetCase.id,
          caseCode: targetCase.code,
          caseName: targetCase.primaryName || targetCase.fullName,
          beneficiaryPrimaryName: targetCase.primaryName || targetCase.fullName,
          beneficiarySecondaryName: targetCase.secondaryName,
          beneficiaryNationalId: targetCase.nationalId,
          beneficiaryPhone: targetCase.phone,
          beneficiaryAddress: `${targetCase.governorate} - ${targetCase.district} - ${targetCase.address}`,
          shariaCategoryId: donationData.shariaCategoryId || 'sharia-03',
          shariaCategoryName: shariaName || 'تبرع مقيد لحالة خاصة',
          shariaCategoryColor: catObj?.color || 'teal',
          amount: donationData.amount,
          assignedResearcher: targetCase.assignedResearcher || 'أ. وائل فتحي',
          issuedDate: todayStr,
          dueDeadlineDate: dueDeadlineStr,
          status: 'pending_delivery',
          purposeNote:
            donationData.notes ||
            `تبرع مقيد بالاسم للحالة (${targetCase.code}) من المتبرع (${donationData.donorName}) بموجب إيصال دفتري ${donationData.manualReceiptNo || 'ورقي'}`,
          issuedBy: 'النظام الآلي (بموجب تبرع مقيد بالاسم)',
          manualReceiptNo: donationData.manualReceiptNo,
          donationId: newDonationId,
          isRestrictedCaseOrder: true,
          donorName: donationData.donorName,
        };

        setFastTrackOrders((prev) => [autoOrder, ...prev]);

        // توثيق القيد في السجل المالي للحالة
        const receiptRef = donationData.manualReceiptNo ? ` (سند قبض: ${donationData.manualReceiptNo})` : '';
        const timelineEntry = `[${todayStr}] تم تخصيص تبرع مقيد بالاسم بمبلغ ${donationData.amount.toLocaleString('ar-EG')} ج.م من المتبرع (${donationData.donorName})${receiptRef} وإصدار إذن صرف فوري برقم (${voucherCode}) قيد التسليم بواسطة الباحث (${autoOrder.assignedResearcher})`;

        setCases((prevCases) =>
          prevCases.map((c) => {
            if (c.id === targetCase.id) {
              return {
                ...c,
                historicalAssistanceTotal: (c.historicalAssistanceTotal ?? 0) + donationData.amount,
                notes: c.notes ? `${timelineEntry}\n${c.notes}` : timelineEntry,
              };
            }
            return c;
          })
        );

        addAuditLog(
          'توليد إذن صرف مقيد تلقائياً',
          `تم إنشاء إذن صرف فوري (${voucherCode}) بمبلغ ${donationData.amount.toLocaleString('ar-EG')} ج.م للحالة (${targetCase.fullName}) تنفيذاً لقيد المتبرع (${donationData.donorName}) بموجب إيصال دفتري (${donationData.manualReceiptNo || '-'})`
        );
      }
    }

    const manualReceiptSuffix = newDonation.manualReceiptNo
      ? ` [سند ورقي: ${newDonation.manualReceiptNo}]`
      : '';
    const caseSuffix = newDonation.designatedCaseName
      ? ` مخصص للحالة (${newDonation.designatedCaseName})`
      : '';
    addAuditLog(
      'تسجيل تبرع جديد',
      `تسجيل تبرع بقيمة ${newDonation.amount.toLocaleString('ar-EG')} ج.م من ${newDonation.donorName} (${newDonation.restrictionType})${caseSuffix}${manualReceiptSuffix}`
    );
  };

  const addVisit = (visitData: Omit<FieldVisit, 'id'>) => {
    const newVisit: FieldVisit = {
      ...visitData,
      id: `visit-${Date.now()}`,
    };
    setVisits((prev) => [newVisit, ...prev]);

    const nextCases = cases.map((c) => {
      if (c.id === visitData.caseId) {
        return {
          ...c,
          lastVisitDate: visitData.visitDate,
          nextVisitDueDate: visitData.scheduledNextDate,
          isVisitOverdue: false,
        };
      }
      return c;
    });
    setCases(nextCases);
    syncDraftAllocationsWithCases(nextCases);

    addAuditLog('تسجيل زيارة ميدانية', `توثيق زيارة ميدانية للحالة ${visitData.caseName} بواسطة ${visitData.researcherName}`);
  };

  const reassignResearcher = (caseId: string, newResearcher: string, reason?: string) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          return { ...c, assignedResearcher: newResearcher };
        }
        return c;
      })
    );
    addAuditLog(
      'إعادة تعيين باحث ميداني',
      `تكليف الباحث ${newResearcher} بمسؤولية الحالة (${caseId})${reason ? ` - ${reason}` : ''}`
    );
  };

  // ----------------------------------------------------
  const syncActionsRef = useRef({ updateCase, addVisit, addCase, addAuditLog });
  useEffect(() => {
    syncActionsRef.current = { updateCase, addVisit, addCase, addAuditLog };
  });

  const triggerSync = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.onLine || isSyncing) return;
    try {
      setIsSyncing(true);
      const queue = await getPendingSyncQueue();
      if (!queue || queue.length === 0) {
        setIsSyncing(false);
        return;
      }

      const {
        updateCase: doUpdateCase,
        addVisit: doAddVisit,
        addCase: doAddCase,
        addAuditLog: doAddAuditLog,
      } = syncActionsRef.current;

      let syncedCount = 0;
      for (const item of queue) {
        try {
          if (item.surveyMode === 'update_existing' && item.caseId) {
            if (item.payload.caseUpdates) {
              doUpdateCase(item.caseId, item.payload.caseUpdates);
            }
            if (item.payload.visitRecord) {
              doAddVisit(item.payload.visitRecord);
            }
          } else if (item.surveyMode === 'new_case' && item.payload.newCaseData) {
            const res = doAddCase(item.payload.newCaseData);
            if (res.success && res.caseId && item.payload.visitRecord) {
              doAddVisit({
                ...item.payload.visitRecord,
                caseId: res.caseId,
              });
            }
          }
          await removeSyncQueueItem(item.id);
          syncedCount++;
        } catch (itemErr) {
          console.error('Failed to sync item:', item.id, itemErr);
        }
      }

      window.dispatchEvent(new Event('ehsan_sync_queue_updated'));

      if (syncedCount > 0) {
        const msg = `تمت مزامنة (${syncedCount}) استمارات بحث ميداني تلقائياً وتحديث النظام`;
        setSyncSuccessMessage(msg);
        doAddAuditLog('مزامنة تلقائية PWA', `تمت مزامنة ${syncedCount} استمارات بحث ميداني تلقائياً بعد استعادة الاتصال`);
        setTimeout(() => setSyncSuccessMessage(null), 6000);
      }
    } catch (err) {
      console.error('Auto sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // Listen to window online event to trigger background sync automatically
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setTimeout(() => {
        triggerSync();
      }, 1500);
    };

    window.addEventListener('online', handleOnline);

    // Initial check on mount
    if (navigator.onLine) {
      setTimeout(() => {
        triggerSync();
      }, 2500);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [triggerSync]);

  const formatPeriodLabel = (p: string) => {
    return formatPeriodLabelFromDate(p, p);
  };

  const generateOrRefreshAllocation = (
    period: string,
    customBudget?: number,
    overrideConfig?: ScoringRulesConfig,
    overrideCases?: BeneficiaryCase[],
    batchOptions?: {
      batchTitle?: string;
      cycleType?: AllocationCycleType;
      periodDate?: string;
      executionDate?: string;
      coverageMonths?: number;
      strategy?: 'priority_first' | 'proportional';
      exceptionalDistributionMode?: ExceptionalDistributionMode;
      flatAmountPerCase?: number;
    }
  ) => {
    const existing = allocations[period];
    const resolvedDate =
      batchOptions?.periodDate ||
      batchOptions?.executionDate ||
      existing?.periodDate ||
      existing?.executionDate ||
      (/^\d{4}-\d{2}$/.test(period) ? `${period}-15` : new Date().toISOString().split('T')[0]);
    const periodLabel = existing?.periodLabel || formatPeriodLabelFromDate(resolvedDate, period);
    const activeConfig = overrideConfig || scoringConfig;
    const activeCases = overrideCases || cases;

    const proposal = generateMonthlyAllocationProposal({
      id: existing?.id,
      period,
      periodLabel,
      batchTitle: batchOptions?.batchTitle || existing?.batchTitle,
      cycleType: batchOptions?.cycleType || existing?.cycleType || 'regular',
      periodDate: resolvedDate,
      executionDate: batchOptions?.executionDate || resolvedDate,
      coverageMonths: batchOptions?.coverageMonths || existing?.coverageMonths || 1,
      strategy: batchOptions?.strategy || existing?.allocationStrategy || 'priority_first',
      exceptionalDistributionMode:
        batchOptions?.exceptionalDistributionMode || existing?.exceptionalDistributionMode,
      flatAmountPerCase:
        batchOptions?.flatAmountPerCase !== undefined
          ? batchOptions.flatAmountPerCase
          : existing?.flatAmountPerCase,
      cases: activeCases,
      donations,
      customTotalBudget: customBudget !== undefined ? customBudget : existing?.totalBudget,
      config: activeConfig,
      carriedOverFromPreviousPeriod: existing?.carriedOverFromPreviousPeriod,
    });

    const enrichedProposal: MonthlyAllocation = {
      ...proposal,
      sessionMinutesNumber: existing?.sessionMinutesNumber,
      sessionMinutesDate: existing?.sessionMinutesDate,
      unlockedDate: existing?.unlockedDate,
      unlockedBy: existing?.unlockedBy,
      unlockReason: existing?.unlockReason,
      isExceptionallyUnlocked: existing?.isExceptionallyUnlocked,
    };

    setAllocations((prev) => ({ ...prev, [period]: enrichedProposal }));
    addAuditLog(
      'توليد مقترح تخصيص للصرف',
      `تم إعادة توليد مقترح الميزانية لدورة "${enrichedProposal.batchTitle || periodLabel}" بميزانية ${enrichedProposal.totalBudget.toLocaleString('ar-EG')} ج.م`
    );
    return enrichedProposal;
  };

  const createAllocationCycle = (data: {
    batchTitle: string;
    cycleType: AllocationCycleType;
    periodDate: string;
    totalBudget: number;
    coverageMonths?: number;
    allocationStrategy?: 'priority_first' | 'proportional';
    exceptionalDistributionMode?: ExceptionalDistributionMode;
    flatAmountPerCase?: number;
  }): MonthlyAllocation => {
    const cycleKey = `cycle-${Date.now()}`;
    const safeDate = data.periodDate || new Date().toISOString().split('T')[0];
    const cleanTitle = data.batchTitle.trim() || `دورة صرف ${formatPeriodLabelFromDate(safeDate, safeDate)}`;
    const periodLabel = formatPeriodLabelFromDate(safeDate, cleanTitle);
    const yearMatch = safeDate.match(/^(\d{4})/);
    const yearStr = yearMatch ? yearMatch[1] : String(new Date().getFullYear());
    const seqNum = Object.keys(allocations).length + 1;

    const proposal = generateMonthlyAllocationProposal({
      id: `alloc-${cycleKey}`,
      period: cycleKey,
      periodLabel,
      batchTitle: cleanTitle,
      cycleType: data.cycleType,
      periodDate: safeDate,
      executionDate: safeDate,
      coverageMonths: data.cycleType === 'exceptional' ? 1 : data.coverageMonths || 1,
      strategy: data.allocationStrategy || 'priority_first',
      exceptionalDistributionMode:
        data.cycleType === 'exceptional'
          ? data.exceptionalDistributionMode || 'flat_per_case'
          : undefined,
      flatAmountPerCase:
        data.cycleType === 'exceptional' &&
        (data.exceptionalDistributionMode || 'flat_per_case') === 'flat_per_case'
          ? data.flatAmountPerCase
          : undefined,
      cases,
      donations,
      customTotalBudget: data.totalBudget,
      config: scoringConfig,
    });

    const newCycle: MonthlyAllocation = {
      ...proposal,
      sessionMinutesNumber: `محضر رقم ${String(seqNum).padStart(2, '0')}/${yearStr}-إد`,
      sessionMinutesDate: safeDate,
    };

    setAllocations((prev) => ({
      ...prev,
      [cycleKey]: newCycle,
    }));

    addAuditLog(
      'فتح دورة صرف جديدة',
      `تم فتح دورة صرف ${data.cycleType === 'exceptional' ? 'استثنائية/موسمية' : 'شهرية دورية'} بعنوان "${cleanTitle}" بتاريخ ${safeDate} وبميزانية ${newCycle.totalBudget.toLocaleString('ar-EG')} ج.م`
    );

    return newCycle;
  };

  const updateAllocationBatchConfig = (
    period: string,
    updates: {
      batchTitle?: string;
      cycleType?: AllocationCycleType;
      periodDate?: string;
      executionDate?: string;
      coverageMonths?: number;
      allocationStrategy?: 'priority_first' | 'proportional';
      exceptionalDistributionMode?: ExceptionalDistributionMode;
      flatAmountPerCase?: number;
      totalBudget?: number;
    }
  ) => {
    setAllocations((prev) => {
      const current = prev[period];
      if (!current) return prev;

      const newCycleType: AllocationCycleType =
        updates.cycleType !== undefined ? updates.cycleType : current.cycleType || 'regular';
      const newCoverage =
        newCycleType === 'exceptional'
          ? 1
          : updates.coverageMonths !== undefined
          ? updates.coverageMonths
          : current.coverageMonths || 1;
      const newStrategy =
        updates.allocationStrategy !== undefined
          ? updates.allocationStrategy
          : current.allocationStrategy || 'priority_first';
      const newTitle = updates.batchTitle !== undefined ? updates.batchTitle : current.batchTitle;
      const newDate =
        updates.periodDate !== undefined
          ? updates.periodDate
          : updates.executionDate !== undefined
          ? updates.executionDate
          : current.periodDate || current.executionDate;
      const newPeriodLabel =
        updates.periodDate !== undefined || updates.executionDate !== undefined
          ? formatPeriodLabelFromDate(newDate, current.periodLabel)
          : current.periodLabel;
      const newExceptionalMode: ExceptionalDistributionMode =
        updates.exceptionalDistributionMode !== undefined
          ? updates.exceptionalDistributionMode
          : current.exceptionalDistributionMode || 'flat_per_case';
      const newFlatAmount =
        updates.flatAmountPerCase !== undefined
          ? updates.flatAmountPerCase
          : current.flatAmountPerCase;
      const newTotalBudget =
        updates.totalBudget !== undefined ? updates.totalBudget : current.totalBudget;

      const shouldRecompute =
        current.status === 'draft' &&
        ((updates.cycleType !== undefined && updates.cycleType !== (current.cycleType || 'regular')) ||
          (updates.coverageMonths !== undefined && updates.coverageMonths !== current.coverageMonths) ||
          (updates.allocationStrategy !== undefined && updates.allocationStrategy !== current.allocationStrategy) ||
          (updates.exceptionalDistributionMode !== undefined &&
            updates.exceptionalDistributionMode !== current.exceptionalDistributionMode) ||
          (updates.flatAmountPerCase !== undefined &&
            updates.flatAmountPerCase !== current.flatAmountPerCase) ||
          (updates.totalBudget !== undefined && updates.totalBudget !== current.totalBudget));

      if (shouldRecompute) {
        const recomputed = generateMonthlyAllocationProposal({
          id: current.id,
          period,
          periodLabel: newPeriodLabel,
          batchTitle: newTitle,
          cycleType: newCycleType,
          periodDate: newDate,
          executionDate: newDate,
          coverageMonths: newCoverage,
          strategy: newStrategy,
          exceptionalDistributionMode: newExceptionalMode,
          flatAmountPerCase: newFlatAmount,
          cases,
          donations,
          customTotalBudget: newTotalBudget,
          config: scoringConfig,
          carriedOverFromPreviousPeriod: current.carriedOverFromPreviousPeriod,
        });
        return {
          ...prev,
          [period]: {
            ...recomputed,
            sessionMinutesNumber: current.sessionMinutesNumber,
            sessionMinutesDate: current.sessionMinutesDate,
            unlockedDate: current.unlockedDate,
            unlockedBy: current.unlockedBy,
            unlockReason: current.unlockReason,
            isExceptionallyUnlocked: current.isExceptionallyUnlocked,
          },
        };
      }

      return {
        ...prev,
        [period]: {
          ...current,
          periodLabel: newPeriodLabel,
          ...(updates.batchTitle !== undefined ? { batchTitle: updates.batchTitle } : {}),
          ...(updates.cycleType !== undefined ? { cycleType: newCycleType } : {}),
          ...(newDate !== undefined ? { periodDate: newDate, executionDate: newDate } : {}),
          ...(updates.coverageMonths !== undefined ? { coverageMonths: newCoverage } : {}),
          ...(updates.allocationStrategy !== undefined ? { allocationStrategy: newStrategy } : {}),
          ...(updates.exceptionalDistributionMode !== undefined
            ? { exceptionalDistributionMode: newExceptionalMode }
            : {}),
          ...(updates.flatAmountPerCase !== undefined ? { flatAmountPerCase: newFlatAmount } : {}),
        },
      };
    });
  };

  const updateAllocationItem = (period: string, itemId: string, updates: Partial<AllocationItem>) => {
    setAllocations((prev) => {
      const current = prev[period];
      if (!current) return prev;

      const updatedItems = current.items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            ...updates,
            isManuallyAdjusted: true,
          };
        }
        return item;
      });

      const newSummary = calculateAllocationSummary(updatedItems, current.totalBudget);
      return {
        ...prev,
        [period]: {
          ...current,
          items: updatedItems,
          summary: newSummary,
        },
      };
    });
  };

  const toggleExcludeItem = (period: string, itemId: string, isExcluded: boolean, reason?: string) => {
    setAllocations((prev) => {
      const current = prev[period];
      if (!current) return prev;

      const updatedItems = current.items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            isExcluded,
            exclusionReason: reason || (isExcluded ? 'تم الاستبعاد بقرار إداري' : undefined),
            approvedAmount: isExcluded ? 0 : item.proposedAmount,
          };
        }
        return item;
      });

      const newSummary = calculateAllocationSummary(updatedItems, current.totalBudget);
      return {
        ...prev,
        [period]: {
          ...current,
          items: updatedItems,
          summary: newSummary,
        },
      };
    });
    addAuditLog(
      'تعديل استحقاق في التخصيص',
      `${isExcluded ? 'استبعاد' : 'إعادة إدراج'} الحالة (${itemId}) في دورة ${period}`
    );
  };

  const approveAllocation = (period: string, approvedBy: string) => {
    const current = allocations[period];
    if (!current || current.status === 'approved') return;

    const nonExcludedItems = current.items.filter((item) => !item.isExcluded);

    // 1. حساب إجمالي المبالغ المعتمدة مقسمة حسب مصدر التمويل
    const approvedUnrestricted = nonExcludedItems
      .filter((item) => item.fundSource === 'unrestricted_pool')
      .reduce((sum, item) => sum + item.approvedAmount, 0);

    const approvedRestricted = nonExcludedItems
      .filter((item) => item.fundSource !== 'unrestricted_pool')
      .reduce((sum, item) => sum + item.approvedAmount, 0);

    const totalDeducted = approvedUnrestricted + approvedRestricted;
    const carriedOverSurplus = current.summary.unallocatedBalance;
    const isExceptionalCycle = current.cycleType === 'exceptional';

    // تحديد الدورة الشهرية التالية فقط للدورات الدورية (regular) بناءً على periodDate / executionDate
    // أما الدورات الاستثنائية فتُغلق وتُعتمد بشكل مستقل دون توليد شهر تالي وهمي
    let nextPeriodKey: string | null = null;
    let nextPeriodLabel: string | undefined = undefined;
    let shouldCreateNextMonthDraft = false;

    if (!isExceptionalCycle) {
      const dateRef = current.periodDate || current.executionDate || period;
      const ymMatch = dateRef.match(/^(\d{4})-(\d{2})/);
      if (ymMatch) {
        const yearNum = Number(ymMatch[1]);
        const monthNum = Number(ymMatch[2]);
        if (!isNaN(yearNum) && !isNaN(monthNum)) {
          const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
          const nextYear = monthNum === 12 ? yearNum + 1 : yearNum;
          const nextCalendarYM = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;

          // التحقق هل توجد بالفعل مسودة دورية مفتوحة للشهر التالي
          const existingNextDraftEntry = Object.entries(allocations).find(([key, alloc]) => {
            if (key === period) return false;
            if (alloc.status !== 'draft') return false;
            if ((alloc.cycleType || 'regular') !== 'regular') return false;
            const allocDate = alloc.periodDate || alloc.executionDate || key;
            return key === nextCalendarYM || allocDate.startsWith(nextCalendarYM);
          });

          if (existingNextDraftEntry) {
            nextPeriodKey = existingNextDraftEntry[0];
            nextPeriodLabel =
              existingNextDraftEntry[1].batchTitle || existingNextDraftEntry[1].periodLabel;
            shouldCreateNextMonthDraft = false;
          } else if (!allocations[nextCalendarYM]) {
            nextPeriodKey = nextCalendarYM;
            nextPeriodLabel = formatPeriodLabel(nextCalendarYM);
            shouldCreateNextMonthDraft = true;
          }
        }
      }
    }

    // 2. خصم هذه المبالغ رسمياً من الأرصدة المتاحة في الخزينة وتحديث سجلات التبرعات
    let updatedDonationsList: Donation[] = [];
    setDonations((prevDonations) => {
      let remainingUnrestrictedToDeduct = approvedUnrestricted;
      const updated = prevDonations.map((d) => ({ ...d }));

      // أ) خصم التبرعات المقيدة بالاسم للحالات المحددة
      for (const item of nonExcludedItems) {
        if (item.approvedAmount <= 0) continue;

        if (item.fundSource === 'restricted_case') {
          const targetDon = updated.find(
            (d) =>
              d.restrictionType === 'restricted_case' &&
              d.designatedCaseId === item.caseId &&
              (d.remainingAmount ?? d.amount) > 0
          );
          if (targetDon) {
            const currentRem = targetDon.remainingAmount ?? targetDon.amount;
            const deduct = Math.min(item.approvedAmount, currentRem);
            targetDon.allocatedAmount = (targetDon.allocatedAmount || 0) + deduct;
            targetDon.remainingAmount = Math.max(0, currentRem - deduct);
          }
        } else if (item.fundSource === 'restricted_purpose') {
          let needToDeduct = item.approvedAmount;
          for (const targetDon of updated) {
            if (needToDeduct <= 0) break;
            if (
              targetDon.restrictionType === 'restricted_purpose' &&
              (targetDon.remainingAmount ?? targetDon.amount) > 0
            ) {
              const currentRem = targetDon.remainingAmount ?? targetDon.amount;
              const deduct = Math.min(needToDeduct, currentRem);
              targetDon.allocatedAmount = (targetDon.allocatedAmount || 0) + deduct;
              targetDon.remainingAmount = Math.max(0, currentRem - deduct);
              needToDeduct -= deduct;
            }
          }
        }
      }

      // ب) خصم المبالغ المعتمدة من الصندوق العام غير المقيد
      for (const targetDon of updated) {
        if (remainingUnrestrictedToDeduct <= 0) break;
        if (
          targetDon.status === 'received' &&
          targetDon.restrictionType === 'unrestricted' &&
          (targetDon.remainingAmount ?? targetDon.amount) > 0
        ) {
          const currentRem = targetDon.remainingAmount ?? targetDon.amount;
          const deduct = Math.min(remainingUnrestrictedToDeduct, currentRem);
          targetDon.allocatedAmount = (targetDon.allocatedAmount || 0) + deduct;
          targetDon.remainingAmount = Math.max(0, currentRem - deduct);
          remainingUnrestrictedToDeduct -= deduct;
        }
      }

      updatedDonationsList = updated;
      return updated;
    });

    // 3. ترحيل الفائض المتبقي من الدورة المعتمدة وتحديث كائن allocations للدورة الحالية واللاحقة (للدورية فقط)
    setAllocations((prevAllocations) => {
      const currentAlloc = prevAllocations[period] || current;

      const approvedAllocation: MonthlyAllocation = {
        ...currentAlloc,
        status: 'approved',
        approvedDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
        approvedBy,
        treasuryDeduction: {
          approvedUnrestricted,
          approvedRestricted,
          totalDeducted,
          carriedOverSurplus,
          nextPeriod: nextPeriodKey || undefined,
          nextPeriodLabel,
        },
      };

      const updatedMap: Record<string, MonthlyAllocation> = {
        ...prevAllocations,
        [period]: approvedAllocation,
      };

      if (!isExceptionalCycle && nextPeriodKey) {
        const carryOverInfo = {
          previousPeriod: period,
          previousPeriodLabel:
            currentAlloc.batchTitle || currentAlloc.periodLabel || formatPeriodLabel(period),
          carriedOverAmount: carriedOverSurplus,
        };

        if (shouldCreateNextMonthDraft) {
          const nextLabel = nextPeriodLabel || formatPeriodLabel(nextPeriodKey);
          const nextProposal = generateMonthlyAllocationProposal({
            period: nextPeriodKey,
            periodLabel: nextLabel,
            batchTitle: `كفالات ${nextLabel}`,
            cycleType: 'regular',
            periodDate: `${nextPeriodKey}-15`,
            executionDate: `${nextPeriodKey}-15`,
            cases,
            donations: updatedDonationsList.length > 0 ? updatedDonationsList : donations,
            customTotalBudget: carriedOverSurplus,
            config: scoringConfig,
            carriedOverFromPreviousPeriod: carryOverInfo,
          });
          updatedMap[nextPeriodKey] = nextProposal;
        } else if (updatedMap[nextPeriodKey] && updatedMap[nextPeriodKey].status === 'draft') {
          const existingNext = updatedMap[nextPeriodKey];
          updatedMap[nextPeriodKey] = reconcileDraftAllocationWithCases(
            {
              ...existingNext,
              carriedOverFromPreviousPeriod: carryOverInfo,
            },
            cases,
            updatedDonationsList.length > 0 ? updatedDonationsList : donations,
            scoringConfig
          );
        }
      }

      return updatedMap;
    });

    // 4. تحديث إجمالي المساعدات التاريخية وتدوين دورة الصرف في خط سير الحالة (Case Timeline)
    const batchTitle = current.batchTitle || current.periodLabel || formatPeriodLabel(period);
    const execDate =
      current.periodDate || current.executionDate || new Date().toISOString().split('T')[0];
    const covMonths = current.coverageMonths || 1;
    const covText =
      isExceptionalCycle
        ? ' (دورة استثنائية)'
        : covMonths > 1
        ? ` (دفعة مجمعة تغطي ${covMonths} أشهر)`
        : '';

    setCases((prevCases) =>
      prevCases.map((c) => {
        const item = nonExcludedItems.find((i) => i.caseId === c.id);
        if (item && item.approvedAmount > 0) {
          const adjNote = item.isManuallyAdjusted && item.adjustmentReason ? ` [ملاحظة تعديل: ${item.adjustmentReason}]` : '';
          const timelineEntry = `[${execDate}] تم اعتماد وصرف دورة: ${batchTitle}${covText} بمبلغ ${item.approvedAmount.toLocaleString('ar-EG')} ج.م (${item.fundSourceName})${adjNote}`;
          const updatedNotes = c.notes ? `${timelineEntry}\n${c.notes}` : timelineEntry;
          return {
            ...c,
            historicalAssistanceTotal: (c.historicalAssistanceTotal || 0) + item.approvedAmount,
            notes: updatedNotes,
          };
        }
        return c;
      })
    );

    // 5. توثيق حركة الاعتماد والخصم في سجل الرقابة والتدقيق
    const surplusAuditNote = isExceptionalCycle
      ? `وبقي فائض ${carriedOverSurplus.toLocaleString('ar-EG')} ج.م ضمن رصيد الصندوق العام`
      : `وتم ترحيل فائض ${carriedOverSurplus.toLocaleString('ar-EG')} ج.م لدورة ${nextPeriodLabel || 'الشهر التالي'}`;

    addAuditLog(
      'اعتماد ميزانية دورة الصرف',
      `تم الاعتماد النهائي لدورة "${batchTitle}" [تاريخ الصرف المقرر: ${execDate}${covText}] بمبلغ إجمالي ${totalDeducted.toLocaleString('ar-EG')} ج.م (صندوق عام: ${approvedUnrestricted.toLocaleString('ar-EG')} ج.م، مقيد: ${approvedRestricted.toLocaleString('ar-EG')} ج.م) بواسطة ${approvedBy}، ${surplusAuditNote}`
    );
  };

  const unlockAllocation = (period: string, unlockedBy: string, reason: string) => {
    const current = allocations[period];
    if (!current || current.status !== 'approved') return;

    const nonExcludedItems = current.items.filter((item) => !item.isExcluded);

    // 1. إعادة المبالغ المخصومة إلى الخزينة وسجلات التبرعات (Reverse treasury deduction)
    if (current.treasuryDeduction) {
      const { approvedUnrestricted } = current.treasuryDeduction;

      setDonations((prevDonations) => {
        let remainingUnrestrictedToRestore = approvedUnrestricted;
        const updated = prevDonations.map((d) => ({ ...d }));

        // أ) إعادة التبرعات المقيدة بالاسم للحالات المحددة
        for (const item of nonExcludedItems) {
          if (item.approvedAmount <= 0) continue;

          if (item.fundSource === 'restricted_case') {
            const targetDon = updated.find(
              (d) =>
                d.restrictionType === 'restricted_case' &&
                d.designatedCaseId === item.caseId
            );
            if (targetDon) {
              const restore = Math.min(item.approvedAmount, targetDon.allocatedAmount || 0);
              targetDon.allocatedAmount = Math.max(0, (targetDon.allocatedAmount || 0) - restore);
              targetDon.remainingAmount = (targetDon.remainingAmount ?? 0) + restore;
            }
          } else if (item.fundSource === 'restricted_purpose') {
            let needToRestore = item.approvedAmount;
            for (const targetDon of updated) {
              if (needToRestore <= 0) break;
              if (targetDon.restrictionType === 'restricted_purpose' && (targetDon.allocatedAmount || 0) > 0) {
                const restore = Math.min(needToRestore, targetDon.allocatedAmount || 0);
                targetDon.allocatedAmount = Math.max(0, (targetDon.allocatedAmount || 0) - restore);
                targetDon.remainingAmount = (targetDon.remainingAmount ?? 0) + restore;
                needToRestore -= restore;
              }
            }
          }
        }

        // ب) إعادة المبالغ للصندوق العام غير المقيد
        for (const targetDon of updated) {
          if (remainingUnrestrictedToRestore <= 0) break;
          if (targetDon.status === 'received' && targetDon.restrictionType === 'unrestricted' && (targetDon.allocatedAmount || 0) > 0) {
            const restore = Math.min(remainingUnrestrictedToRestore, targetDon.allocatedAmount || 0);
            targetDon.allocatedAmount = Math.max(0, (targetDon.allocatedAmount || 0) - restore);
            targetDon.remainingAmount = (targetDon.remainingAmount ?? 0) + restore;
            remainingUnrestrictedToRestore -= restore;
          }
        }

        return updated;
      });

      // 2. خصم المساعدات التاريخية المضافة عند الاعتماد
      setCases((prevCases) =>
        prevCases.map((c) => {
          const item = nonExcludedItems.find((i) => i.caseId === c.id);
          if (item && item.approvedAmount > 0) {
            return {
              ...c,
              historicalAssistanceTotal: Math.max(0, (c.historicalAssistanceTotal || 0) - item.approvedAmount),
            };
          }
          return c;
        })
      );
    }

    // 3. تحويل حالة الدورة إلى مسودة draft مع توثيق بيانات الفتح الاستثنائي
    const unlockTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
    setAllocations((prevAllocations) => {
      const currentAlloc = prevAllocations[period] || current;
      return {
        ...prevAllocations,
        [period]: {
          ...currentAlloc,
          status: 'draft',
          isExceptionallyUnlocked: true,
          unlockedDate: unlockTimestamp,
          unlockedBy,
          unlockReason: reason,
          treasuryDeduction: undefined,
        },
      };
    });

    // 4. توثيق العملية في سجل التدقيق والرقابة
    addAuditLog(
      'فتح استثنائي للميزانية المعتمدة',
      `تم فتح الميزانية المعتمدة لدورة ${current.periodLabel || period} للتعديل الاستثنائي بواسطة ${unlockedBy}. سبب التعديل: "${reason}". تم إلغاء قفل الخزينة مؤقتاً وعادت الدورة لوضع المسودة.`
    );
  };

  const updateScoringConfig = (config: Partial<ScoringRulesConfig>) => {
    const mergedConfig: ScoringRulesConfig = { ...scoringConfig, ...config };
    setScoringConfig(mergedConfig);

    // 1. إعادة احتساب درجات الأولوية وحالة الزيارة الميدانية لكافة الحالات فورياً
    const updatedCases = cases.map((c) => {
      const assessment = calculateCaseAssessment(c, mergedConfig);
      const newPriority = derivePriorityLevel(assessment.totalScore);
      const visitCheck = checkVisitOverdueStatus(c.lastVisitDate, mergedConfig.overdueVisitMonths);
      const isPendingFirstVisit = !c.lastVisitDate || c.status === 'pending_field_research';
      return {
        ...c,
        priority: newPriority,
        isVisitOverdue: isPendingFirstVisit ? false : visitCheck.isOverdue,
      };
    });
    setCases(updatedCases);

    // 2. مزامنة جميع مسودات التخصيص المفتوحة (draft) بالإعدادات والحالات المحدثة مع الحفاظ على التعديلات اليدوية
    syncDraftAllocationsWithCases(updatedCases, mergedConfig);
    if (Object.keys(allocations).length === 0) {
      const periodLabel = formatPeriodLabel(currentPeriod);
      const newProposal = generateMonthlyAllocationProposal({
        period: currentPeriod,
        periodLabel,
        cases: updatedCases,
        donations,
        config: mergedConfig,
      });

      setAllocations((prev) => ({
        ...prev,
        [currentPeriod]: newProposal,
      }));
    }

    addAuditLog(
      'تحديث أوزان وقواعد التقييم',
      `تم تحديث الضوابط (سقف المساعدة: ${mergedConfig.maxAssistanceCap.toLocaleString('ar-EG')} ج.م، مهلة الزيارة: ${mergedConfig.overdueVisitMonths} أشهر، الحد الأدنى: ${mergedConfig.minAssistanceFloor.toLocaleString('ar-EG')} ج.م) وتحديث درجات الاستحقاق والمقترح آلياً`
    );
  };

  const getRestrictedFundBalances = (): Record<string, { inbound: number; disbursed: number; available: number }> => {
    const balances: Record<string, { inbound: number; disbursed: number; available: number }> = {};

    shariaCategories.forEach((cat) => {
      // Inbound: ONLY received donations with restrictionType === 'restricted_purpose' for this sharia category!
      // This strictly isolates general unrestricted funds and case-specific restricted funds.
      const inbound = donations
        .filter(
          (d) =>
            d.status === 'received' &&
            d.restrictionType === 'restricted_purpose' &&
            d.shariaCategoryId === cat.id
        )
        .reduce((sum, d) => sum + d.amount, 0);

      // Disbursed: fastTrackOrders issued from purpose pools for this category (excluding case-specific orders)
      const disbursed = fastTrackOrders
        .filter((o) => o.shariaCategoryId === cat.id && o.status !== 'cancelled' && !o.isRestrictedCaseOrder)
        .reduce((sum, o) => sum + o.amount, 0);

      balances[cat.id] = {
        inbound,
        disbursed,
        available: Math.max(0, inbound - disbursed),
      };
    });

    return balances;
  };

  const issueFastTrackDisbursement = (data: {
    caseId: string;
    shariaCategoryId: string;
    amount: number;
    assignedResearcher: string;
    dueDeadlineDate: string;
    purposeNote: string;
    issuedBy?: string;
  }): { success: boolean; error?: string; order?: FastTrackDisbursementOrder } => {
    const targetCase = cases.find((c) => c.id === data.caseId);
    if (!targetCase) {
      return { success: false, error: 'تعذر العثور على ملف الحالة المستفيدة' };
    }

    const category = shariaCategories.find((cat) => cat.id === data.shariaCategoryId);
    const balances = getRestrictedFundBalances();
    const fundBalance = balances[data.shariaCategoryId]?.available ?? 0;

    if (data.amount <= 0) {
      return { success: false, error: 'يجب أن يكون مبلغ الصرف أكبر من صفر' };
    }

    if (data.amount > fundBalance) {
      return {
        success: false,
        error: `الرصيد المتاح في ${category?.name || 'الصندوق'} (${fundBalance.toLocaleString('ar-EG')} ج.م) لا يكفي لتغطية مبلغ الصرف المطلوب (${data.amount.toLocaleString('ar-EG')} ج.م)`,
      };
    }

    const currentProfile = ROLE_PROFILES[currentUserRole];
    const issuer = data.issuedBy || (currentProfile ? `${currentProfile.name} (${currentProfile.badgeLabel})` : 'إدارة الجمعية');

    const nextVoucherNum = fastTrackOrders.length + 1;
    const voucherCode = `FTD-2026-${String(nextVoucherNum).padStart(3, '0')}`;

    const newOrder: FastTrackDisbursementOrder = {
      id: `fto-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      voucherCode,
      caseId: targetCase.id,
      caseCode: targetCase.code,
      caseName: targetCase.primaryName || targetCase.fullName,
      beneficiaryPrimaryName: targetCase.primaryName || targetCase.fullName,
      beneficiarySecondaryName: targetCase.secondaryName,
      beneficiaryNationalId: targetCase.nationalId,
      beneficiaryPhone: targetCase.phone,
      beneficiaryAddress: `${targetCase.governorate} - ${targetCase.district} - ${targetCase.address}`,
      shariaCategoryId: data.shariaCategoryId,
      shariaCategoryName: category?.name || 'مصرف شرعي مقيد',
      shariaCategoryColor: category?.color || 'teal',
      amount: data.amount,
      assignedResearcher: data.assignedResearcher,
      issuedDate: new Date().toISOString().split('T')[0],
      dueDeadlineDate: data.dueDeadlineDate,
      status: 'pending_delivery',
      purposeNote: data.purposeNote,
      issuedBy: issuer,
      isRestrictedCaseOrder: false,
    };

    setFastTrackOrders((prev) => [newOrder, ...prev]);

    setCases((prev) =>
      prev.map((c) =>
        c.id === targetCase.id
          ? {
              ...c,
              historicalAssistanceTotal: (c.historicalAssistanceTotal ?? 0) + data.amount,
            }
          : c
      )
    );

    setDonations((prev) => {
      let remToDeduct = data.amount;
      return prev.map((d) => {
        const isMatch =
          d.status === 'received' &&
          d.restrictionType === 'restricted_purpose' &&
          d.shariaCategoryId === data.shariaCategoryId;
        if (isMatch && remToDeduct > 0 && (d.remainingAmount ?? d.amount) > 0) {
          const curRem = d.remainingAmount ?? d.amount;
          const deduction = Math.min(curRem, remToDeduct);
          remToDeduct -= deduction;
          return {
            ...d,
            allocatedAmount: (d.allocatedAmount ?? 0) + deduction,
            remainingAmount: curRem - deduction,
          };
        }
        return d;
      });
    });

    addAuditLog(
      'إصدار إذن صرف فوري مقيد',
      `تم إصدار إذن صرف فوري رقم (${voucherCode}) بمبلغ ${data.amount.toLocaleString('ar-EG')} ج.م للحالة: ${newOrder.beneficiaryPrimaryName}${newOrder.beneficiarySecondaryName ? ` (${newOrder.beneficiarySecondaryName})` : ''} من حساب ${newOrder.shariaCategoryName} ومكلف بالصرف الباحث: ${data.assignedResearcher} بمهلة أقصاها ${data.dueDeadlineDate}`
    );

    return { success: true, order: newOrder };
  };

  const markFastTrackOrderDelivered = (
    orderId: string,
    deliveryData?: {
      deliveryReceiptNo?: string;
      deliveryMethod?: string;
      deliveryNotes?: string;
    }
  ) => {
    const today = new Date().toISOString().split('T')[0];
    let updatedOrder: FastTrackDisbursementOrder | undefined;

    setFastTrackOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          updatedOrder = {
            ...o,
            status: 'delivered',
            deliveredDate: today,
            deliveryReceiptNo: deliveryData?.deliveryReceiptNo?.trim() || o.deliveryReceiptNo,
            deliveryMethod: deliveryData?.deliveryMethod || o.deliveryMethod || 'cash_signed',
            deliveryNotes: deliveryData?.deliveryNotes?.trim() || o.deliveryNotes,
          };
          return updatedOrder;
        }
        return o;
      })
    );

    if (updatedOrder) {
      const orderObj = updatedOrder as FastTrackDisbursementOrder;
      const methodLabel =
        orderObj.deliveryMethod === 'postal_transfer'
          ? 'حوالة بريدية رسمية'
          : orderObj.deliveryMethod === 'direct_vendor_payment'
          ? 'سداد مباشر لفاتورة علاج أو دائن'
          : 'نقداً باليد بموجب إيصال موقع ومبصوم';

      const receiptRef = orderObj.deliveryReceiptNo
        ? ` (سند استلام رقم: ${orderObj.deliveryReceiptNo})`
        : '';
      const notesRef = orderObj.deliveryNotes ? ` [ملاحظات: ${orderObj.deliveryNotes}]` : '';

      // إثبات الصرف في السجل التاريخي للحالة (Case History / Timeline Entry)
      const timelineEntry = `[${today}] تم تسليم مساعدة مالية فورية بقيمة ${orderObj.amount.toLocaleString('ar-EG')} ج.م (إذن صرف رقم ${orderObj.voucherCode}) والمقيدة من حساب ${orderObj.shariaCategoryName} - طريقة الاستلام: ${methodLabel}${receiptRef}${notesRef}`;

      setCases((prevCases) =>
        prevCases.map((c) => {
          if (c.id === orderObj.caseId) {
            return {
              ...c,
              notes: c.notes ? `${timelineEntry}\n${c.notes}` : timelineEntry,
            };
          }
          return c;
        })
      );

      addAuditLog(
        'تأكيد تسليم مساعدة فورية',
        `تم تأكيد تسليم إذن الصرف (${orderObj.voucherCode}) بمبلغ ${orderObj.amount.toLocaleString('ar-EG')} ج.م للحالة ${orderObj.beneficiaryPrimaryName} بواسطة الباحث ${orderObj.assignedResearcher} - طريقة الاستلام: ${methodLabel}${receiptRef}${notesRef}`
      );
    }
  };

  const cancelFastTrackOrder = (orderId: string, reason?: string) => {
    const order = fastTrackOrders.find((o) => o.id === orderId);
    if (!order || order.status === 'cancelled') return;

    setFastTrackOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'cancelled' } : o))
    );

    setCases((prev) =>
      prev.map((c) =>
        c.id === order.caseId
          ? {
              ...c,
              historicalAssistanceTotal: Math.max(0, (c.historicalAssistanceTotal ?? 0) - order.amount),
            }
          : c
      )
    );

    setDonations((prev) => {
      if (order.donationId) {
        return prev.map((d) => {
          if (d.id === order.donationId) {
            return {
              ...d,
              allocatedAmount: Math.max(0, (d.allocatedAmount ?? 0) - order.amount),
              remainingAmount: (d.remainingAmount ?? 0) + order.amount,
            };
          }
          return d;
        });
      }

      let remToRestore = order.amount;
      return prev.map((d) => {
        if (
          d.restrictionType === 'restricted_purpose' &&
          d.shariaCategoryId === order.shariaCategoryId &&
          remToRestore > 0 &&
          (d.allocatedAmount ?? 0) > 0
        ) {
          const restore = Math.min(d.allocatedAmount ?? 0, remToRestore);
          remToRestore -= restore;
          return {
            ...d,
            allocatedAmount: (d.allocatedAmount ?? 0) - restore,
            remainingAmount: (d.remainingAmount ?? 0) + restore,
          };
        }
        return d;
      });
    });

    addAuditLog(
      'إلغاء إذن صرف فوري',
      `تم إلغاء إذن الصرف رقم (${order.voucherCode}) بمبلغ ${order.amount.toLocaleString('ar-EG')} ج.م للحالة ${order.beneficiaryPrimaryName}. السبب: ${reason || 'إلغاء إداري واسترداد الرصيد للصندوق'}`
    );
  };

  const addCaseNote = useCallback(
    (noteData: {
      caseId: string;
      content: string;
      isPrivate: boolean;
      category?: 'general' | 'followup' | 'warning' | 'urgent';
      authorName?: string;
      authorRole?: string;
    }) => {
      const now = new Date();
      const dateFormatted = new Intl.DateTimeFormat('ar-EG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      }).format(now);

      const profile = ROLE_PROFILES[currentUserRole];
      const newNote: CaseNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        caseId: noteData.caseId,
        authorName: noteData.authorName || profile?.name || 'مستخدم النظام',
        authorRole: noteData.authorRole || profile?.title || profile?.badgeLabel || 'عضو الفريق',
        authorId: currentUserRole,
        isPrivate: noteData.isPrivate,
        content: noteData.content.trim(),
        createdAt: dateFormatted,
        timestamp: Date.now(),
        category: noteData.category || 'general',
      };

      setCaseNotes((prev) => [newNote, ...prev]);

      addAuditLog(
        'إضافة ملاحظة على حالة',
        `تم تسجيل ملاحظة (${noteData.isPrivate ? 'خاصة بي' : 'عامة للفريق'}) للحالة (${noteData.caseId})`
      );

      return newNote;
    },
    [currentUserRole, addAuditLog]
  );

  const deleteCaseNote = useCallback((noteId: string) => {
    setCaseNotes((prev) => prev.filter((n) => n.id !== noteId));
    addAuditLog('حذف ملاحظة حالة', `تم حذف الملاحظة رقم (${noteId})`);
  }, [addAuditLog]);

  const addCustomResearcher = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return '';
      setResearchers((prev) => {
        if (prev.includes(trimmed)) return prev;
        return [...prev, trimmed];
      });
      addAuditLog('إضافة باحث ميداني', `إدراج (${trimmed}) في قائمة الباحثين المعتمدين`);
      return trimmed;
    },
    [addAuditLog]
  );

  const submitCaseStudyReport = useCallback(
    (report: CaseStudyReport) => {
      const now = new Date().toISOString().split('T')[0];
      const visitDateValue = report.visitDate || now;
      const nextDueObj = new Date(visitDateValue);
      nextDueObj.setMonth(nextDueObj.getMonth() + 6);
      const nextDueDateStr = Number.isNaN(nextDueObj.getTime())
        ? now
        : nextDueObj.toISOString().split('T')[0];

      const mapHousingStatusToCondition = (status: string): HousingCondition => {
        if (status === 'owned' || status.includes('ملك')) return 'owned';
        if (status === 'rent_stable' || status.includes('قديم') || status.includes('شبه مستقر')) {
          return 'rent_stable';
        }
        if (status === 'dilapidated_urgent' || status.includes('آيل للسقوط') || status.includes('غير لائق')) {
          return 'dilapidated_urgent';
        }
        return 'rent_unstable';
      };

      let targetCaseId = report.caseId;
      const existingTargetCase = targetCaseId
        ? cases.find((c) => c.id === targetCaseId)
        : undefined;

      const coreChecklist: DocumentsChecklist = {
        nationalIdsAdults: Boolean(report.attachments?.nationalIdsAdults),
        birthCertificatesMinors: Boolean(report.attachments?.birthCertificatesMinors),
        insurancePrintOut: Boolean(report.attachments?.insurancePrintOut),
        utilityReceipt: Boolean(report.attachments?.utilityReceipt),
        leaseContractOrRentReceipt: Boolean(report.attachments?.leaseContractOrRentReceipt),
        recentMedicalProof: Boolean(report.attachments?.recentMedicalProof),
        deathOrDivorceCertificates: Boolean(report.attachments?.deathOrDivorceCertificates),
      };

      const isIncompleteCoreDocs =
        !coreChecklist.nationalIdsAdults ||
        !coreChecklist.birthCertificatesMinors ||
        !coreChecklist.insurancePrintOut ||
        !coreChecklist.utilityReceipt;

      const mappedAttachments: MockAttachment[] = (report.attachments?.uploadedFiles || []).map((f) => ({
        id: f.id,
        title: f.title,
        category:
          f.category === 'voiceRecording'
            ? 'voice_memo'
            : f.category === 'adultIds' || f.category === 'national_id'
            ? 'national_id'
            : f.category === 'minorCerts' || f.category === 'family_records'
            ? 'family_records'
            : f.category === 'medicalProof' || f.category === 'medical_report'
            ? 'medical_report'
            : f.category === 'income_proof'
            ? 'income_proof'
            : f.category === 'utility_bill'
            ? 'utility_bill'
            : 'housing_contract',
        fileName: f.fileName,
        fileSize: f.category === 'voiceRecording' ? '320 KB' : '1.4 MB',
        uploadDate: visitDateValue,
        url: f.url,
        durationSeconds: f.durationSeconds,
      }));

      const nonVoiceAttachmentsCount = mappedAttachments.filter((a) => a.category !== 'voice_memo').length;
      const mappedHousingCondition = mapHousingStatusToCondition(String(report.housingStatus || ''));
      const cleanCaseSummary = (report.caseSummary || '').trim();
      const cleanRecommendation = (report.additionalNotesAndRemarks || '').trim();
      const recMetaParts: string[] = [];
      if (report.recommendedAssistanceType?.trim()) {
        recMetaParts.push(`نوع المساعدة: ${report.recommendedAssistanceType.trim()}`);
      }
      if (typeof report.recommendedMonthlyAmount === 'number') {
        recMetaParts.push(
          `المبلغ المقترح: ${report.recommendedMonthlyAmount.toLocaleString('ar-EG')} ج.م/شهرياً`
        );
      }
      const recMetaHeader = recMetaParts.join(' · ');
      const combinedRecommendation = recMetaHeader
        ? cleanRecommendation
          ? `${recMetaHeader}\n${cleanRecommendation}`
          : recMetaHeader
        : cleanRecommendation;
      const researcherLabel = report.visitorName || 'أ. هبة الشامي';

      const auditStepLog =
        existingTargetCase?.status === 'needs_revision'
          ? `[${visitDateValue}] استكمال وإرسال نواقص البحث الميداني بواسطة (${researcherLabel}) وإعادة إحالة الملف للمراجعة.`
          : `[${visitDateValue}] إتمام وإرسال استمارة البحث الميداني بواسطة (${researcherLabel}) بانتظار الاعتماد الإداري.`;

      let resolvedCaseCode = existingTargetCase?.code || 'EHS-NEW';

      if (targetCaseId) {
        setCases((prev) =>
          prev.map((c) => {
            if (c.id === targetCaseId) {
              const mergedAttachments =
                mappedAttachments.length > 0
                  ? [
                      ...mappedAttachments,
                      ...(c.attachments || []).filter(
                        (existing) => !mappedAttachments.some((m) => m.fileName === existing.fileName)
                      ),
                    ]
                  : c.attachments;

              return {
                ...c,
                primaryName: report.caseName || c.primaryName,
                fullName: report.caseName || c.fullName,
                phone: report.contactPhone || c.phone,
                secondaryPhone: report.secondaryPhone ?? c.secondaryPhone,
                address: report.address || c.address,
                directionsNote:
                  report.landmarkAddress !== undefined
                    ? report.landmarkAddress.trim() || undefined
                    : c.directionsNote,
                gpsLocation: report.gpsLocation || c.gpsLocation,
                referralSource: report.referralSource || c.referralSource,
                caseSummary: cleanCaseSummary || c.caseSummary,
                researcherRecommendation: combinedRecommendation || c.researcherRecommendation,
                recommendedAssistanceType:
                  report.recommendedAssistanceType?.trim() || c.recommendedAssistanceType,
                recommendedMonthlyAmount:
                  typeof report.recommendedMonthlyAmount === 'number'
                    ? report.recommendedMonthlyAmount
                    : c.recommendedMonthlyAmount,
                researcherJustification: cleanRecommendation || c.researcherJustification,
                adminRevisionNote: undefined,
                housingFacilities: report.housingFacilities || c.housingFacilities,
                assignedResearcher: researcherLabel || c.assignedResearcher,
                status: 'pending_review' as CaseStatus,
                priority: report.priorityLevel || c.priority,
                lastAssessmentDate: visitDateValue,
                lastVisitDate: visitDateValue,
                nextVisitDueDate: nextDueDateStr,
                isVisitOverdue: false,
                voiceNoteUrl: report.voiceNoteUrl || c.voiceNoteUrl,
                voiceNoteDuration: report.voiceNoteDuration || c.voiceNoteDuration,
                attachments: mergedAttachments,
                documentsChecklist: coreChecklist,
                householdMembers:
                  report.familyMembers && report.familyMembers.length > 0
                    ? report.familyMembers.map((m) => ({
                        id: m.id || `m-${Date.now()}-${m.orderNumber}`,
                        name: m.name,
                        relation: m.relation,
                        age: Number(m.age) || 30,
                        educationLevel: m.educationLevel || 'متوسط',
                        healthStatus: m.chronicIllness?.conditionName
                          ? `مريض مزمن (${m.chronicIllness.conditionName})`
                          : 'سليم',
                        workStatus: m.currentJob || 'لا يعمل',
                        maritalStatus: m.maritalStatus,
                        workCapacity: m.workCapacity,
                      }))
                    : c.householdMembers,
                financials: {
                  ...c.financials,
                  directIncome: report.basicIncomeAmount || 0,
                  indirectIncome: report.additionalIncomeAmount || 0,
                  basicExpenses: report.monthlyBasicExpenses || 0,
                  medicalExpenses: report.monthlyMedicalCosts || 0,
                  netFinancialGap: report.netFinancialGap || 0,
                  estimatedAssistanceNeed:
                    typeof report.recommendedMonthlyAmount === 'number'
                      ? report.recommendedMonthlyAmount
                      : report.netFinancialGap || 0,
                },
                vulnerability: {
                  ...c.vulnerability,
                  hasChronicIllness: Boolean(
                    report.medicalConditionDescription && report.chronicVerification !== 'لا يوجد'
                  ),
                  chronicIllnessDetails: report.medicalConditionDescription,
                  housingCondition: mappedHousingCondition,
                  incompleteDocuments: isIncompleteCoreDocs,
                },
                notes: c.notes ? `${auditStepLog}\n\n${c.notes}`.trim() : auditStepLog,
              };
            }
            return c;
          })
        );
      } else {
        const newCode = `EHS-${Math.floor(100 + Math.random() * 900)}`;
        resolvedCaseCode = newCode;
        targetCaseId = `case-${Date.now()}`;
        const newCase: BeneficiaryCase = {
          id: targetCaseId,
          code: newCode,
          primaryName: report.caseName,
          fullName: report.caseName,
          nationalId: `${Math.floor(28000000000000 + Math.random() * 900000000000)}`,
          phone: report.contactPhone,
          secondaryPhone: report.secondaryPhone,
          governorate: 'القاهرة',
          district: report.address.split(' ')[0] || 'المنطقة',
          address: report.address,
          directionsNote: report.landmarkAddress?.trim() || undefined,
          gpsLocation: report.gpsLocation,
          referralSource: report.referralSource,
          caseSummary: cleanCaseSummary || undefined,
          researcherRecommendation: combinedRecommendation || undefined,
          recommendedAssistanceType: report.recommendedAssistanceType?.trim() || undefined,
          recommendedMonthlyAmount:
            typeof report.recommendedMonthlyAmount === 'number'
              ? report.recommendedMonthlyAmount
              : undefined,
          researcherJustification: cleanRecommendation || undefined,
          housingFacilities: report.housingFacilities,
          assignedResearcher: researcherLabel,
          registrationDate: now,
          status: 'pending_review' as CaseStatus,
          priority: report.priorityLevel || 'high',
          lastAssessmentDate: visitDateValue,
          lastVisitDate: visitDateValue,
          nextVisitDueDate: nextDueDateStr,
          isVisitOverdue: false,
          historicalAssistanceTotal: 0,
          voiceNoteUrl: report.voiceNoteUrl,
          voiceNoteDuration: report.voiceNoteDuration,
          attachments: mappedAttachments,
          documentsChecklist: coreChecklist,
          householdMembers: (report.familyMembers || []).map((m) => ({
            id: m.id || `m-${Date.now()}-${m.orderNumber}`,
            name: m.name,
            relation: m.relation,
            age: Number(m.age) || 30,
            educationLevel: m.educationLevel || 'متوسط',
            healthStatus: m.chronicIllness?.conditionName
              ? `مريض مزمن (${m.chronicIllness.conditionName})`
              : 'سليم',
            workStatus: m.currentJob || 'لا يعمل',
            maritalStatus: m.maritalStatus,
            workCapacity: m.workCapacity,
          })),
          financials: {
            directIncome: report.basicIncomeAmount || 0,
            indirectIncome: report.additionalIncomeAmount || 0,
            basicExpenses: report.monthlyBasicExpenses || 0,
            medicalExpenses: report.monthlyMedicalCosts || 0,
            externalAid: 0,
            netFinancialGap: report.netFinancialGap || 0,
            estimatedAssistanceNeed:
              typeof report.recommendedMonthlyAmount === 'number'
                ? report.recommendedMonthlyAmount
                : report.netFinancialGap || 0,
          },
          vulnerability: {
            hasChronicIllness: Boolean(
              report.medicalConditionDescription && report.chronicVerification !== 'لا يوجد'
            ),
            chronicIllnessDetails: report.medicalConditionDescription,
            isOrphanHousehold: false,
            orphanCount: 0,
            dependentsCount: Math.max(1, (report.familyMembers?.length || 1) - 1),
            housingCondition: mappedHousingCondition,
            foodInsecurityLevel: 'moderate',
            workCapacity: 'partial',
            confidenceScore: 95,
            incompleteDocuments: isIncompleteCoreDocs,
            exceptionApproved: false,
          },
          notes: auditStepLog,
        };

        setCases((prev) => [newCase, ...prev]);
      }

      const cleanObservations =
        cleanCaseSummary || 'تم إتمام البحث الميداني والمعاينة على الطبيعة.';
      const cleanRecommendedChanges = report.executiveSummary
        ? report.executiveSummary.justificationText
        : combinedRecommendation || 'يوصى بمراجعة الملف واعتماد الاستحقاق المناسب.';

      const newReport: CaseResearchReport = {
        id: `rep-${Date.now()}`,
        caseId: targetCaseId,
        caseCode: resolvedCaseCode,
        caseName: report.caseName,
        researcherName: researcherLabel,
        reportDate: visitDateValue,
        visitType: 'initial_field',
        housingNotes: `${report.housingStatus}: ${cleanObservations}`,
        incomeObservations:
          report.basicIncomeSources +
          (report.additionalIncomeSources ? ` - ${report.additionalIncomeSources}` : ''),
        healthObservations: report.medicalConditionDescription,
        recommendations: cleanRecommendedChanges,
        trustScore: 95,
        documentsStatus: isIncompleteCoreDocs ? 'incomplete_trusted' : 'complete',
        assessedScore: 85,
      };

      setResearchReports((prev) => [newReport, ...prev]);

      // تحديث سجل الزيارة لنفس الدورة (أو إنشاء زيارة جديدة إذا لم تُسجل زيارة سابقة لهذه الدورة)
      const visitPayload: Omit<FieldVisit, 'id'> = {
        caseId: targetCaseId,
        caseCode: resolvedCaseCode,
        caseName: report.caseName,
        researcherName: researcherLabel,
        visitDate: visitDateValue,
        scheduledNextDate: nextDueDateStr,
        status: 'completed',
        observations: cleanObservations,
        recommendedChanges: cleanRecommendedChanges,
        attachmentsCount: nonVoiceAttachmentsCount,
        voiceNoteUrl: report.voiceNoteUrl,
        gpsLocation: report.gpsLocation
          ? {
              latitude: report.gpsLocation.latitude,
              longitude: report.gpsLocation.longitude,
              mapsUrl: report.gpsLocation.mapsUrl,
            }
          : undefined,
        checklistSummary: { ...coreChecklist },
      };

      setVisits((prev) => {
        const isCurrentCycleRevision =
          existingTargetCase?.status === 'needs_revision' ||
          existingTargetCase?.status === 'pending_review';
        const existingIndex = prev.findIndex(
          (v) =>
            v.caseId === targetCaseId &&
            (isCurrentCycleRevision || v.visitDate === visitDateValue)
        );

        if (existingIndex !== -1) {
          return prev.map((v, idx) =>
            idx === existingIndex ? { ...v, ...visitPayload } : v
          );
        }

        return [
          {
            ...visitPayload,
            id: `visit-${Date.now()}`,
          },
          ...prev,
        ];
      });

      addAuditLog(
        'تسجيل بحث حالة ميداني',
        `تم إرسال استمارة بحث حالة (${report.caseName}) بالحالة: pending_review (بانتظار المراجعة والاعتماد)`
      );
    },
    [cases, addAuditLog]
  );

  // مرجع الدورة المستقلة للرئيسية وبوابة المتبرعين (معزول تماماً عن اختيار شاشة توزيع الميزانية أو التقارير):
  // يعتمد أحدث دورة معتمدة/مغلقة، ولا يعود لمسودة إلا إذا لم تُعتمد أي دورة على النظام بعد.
  const dashboardCycle = useMemo<MonthlyAllocation | undefined>(() => {
    const allCycles = Object.values(allocations);
    if (allCycles.length === 0) return undefined;

    const getSortKey = (a: MonthlyAllocation) =>
      a.periodDate || a.executionDate || (a.approvedDate ? a.approvedDate.split(' ')[0] : '') || a.period;

    const approvedOrClosed = allCycles.filter(
      (a) => a.status === 'approved' || a.status === 'closed'
    );

    if (approvedOrClosed.length > 0) {
      return [...approvedOrClosed].sort((a, b) => {
        const byDate = getSortKey(b).localeCompare(getSortKey(a));
        if (byDate !== 0) return byDate;
        return (b.approvedDate || '').localeCompare(a.approvedDate || '');
      })[0];
    }

    // في حالة عدم اعتماد أي دورة بعد: اختيار أقرب دورة دورية مفتوحة أو أول دورة متاحة
    const regularDrafts = allCycles.filter((a) => (a.cycleType || 'regular') === 'regular');
    const pool = regularDrafts.length > 0 ? regularDrafts : allCycles;
    return [...pool].sort((a, b) => getSortKey(a).localeCompare(getSortKey(b)))[0];
  }, [allocations]);

  const currentAllocation = dashboardCycle;

  // Operational & Treasury Financial metrics (معزولة تماماً عن مسودات شاشة التخصيص)
  const metrics = useMemo(() => {
    const totalCases = cases.length;
    const activeEligibleStandardCases = cases.filter((c) => c.status === 'active_eligible').length;
    const approvedExceptionCases = cases.filter(
      (c) => c.status === 'pending_exception' && c.vulnerability?.exceptionApproved
    ).length;
    const pendingExceptionCases = cases.filter(
      (c) => c.status === 'pending_exception' && !c.vulnerability?.exceptionApproved
    ).length;
    const eligibleCases = activeEligibleStandardCases + approvedExceptionCases;
    const fundedCasesCount = dashboardCycle?.summary.fundedCasesCount ?? eligibleCases;
    const underInvestigationCases = cases.filter((c) => c.status === 'under_review').length;
    const temporarilyExcludedCases = cases.filter((c) => c.status === 'excluded_current_month').length;
    const closedCases = cases.filter((c) => c.status === 'closed').length;
    const excludedOrClosedCases = temporarilyExcludedCases + closedCases;
    const urgentReviewCases = pendingExceptionCases + cases.filter((c) => c.priority === 'critical').length;
    const overdueVisitsCases = cases.filter(
      (c) => c.isVisitOverdue && Boolean(c.lastVisitDate) && c.status !== 'pending_field_research'
    ).length;
    const incompleteDocsCases = cases.filter((c) => c.vulnerability.incompleteDocuments).length;

    const receivedDonations = donations.filter((d) => d.status === 'received');
    const receivedDonationsTotal = receivedDonations.reduce((s, d) => s + d.amount, 0);

    const unrestrictedDonationsBalance = receivedDonations
      .filter((d) => d.restrictionType === 'unrestricted')
      .reduce((s, d) => s + (d.remainingAmount ?? d.amount), 0);

    // Purpose-restricted inbound & remaining balance
    const restrictedPurposeDonations = receivedDonations.filter((d) => d.restrictionType === 'restricted_purpose');
    const restrictedPurposeInbound = restrictedPurposeDonations.reduce((s, d) => s + d.amount, 0);
    const restrictedPurposeBalance = restrictedPurposeDonations.reduce((s, d) => s + (d.remainingAmount ?? d.amount), 0);

    // Case-restricted inbound & remaining balance
    const restrictedCaseDonations = receivedDonations.filter((d) => d.restrictionType === 'restricted_case');
    const restrictedCaseInbound = restrictedCaseDonations.reduce((s, d) => s + d.amount, 0);
    const restrictedCaseBalance = restrictedCaseDonations.reduce((s, d) => s + (d.remainingAmount ?? d.amount), 0);

    // Total restricted balance (sum of purpose + case)
    const restrictedDonationsBalance = restrictedPurposeBalance + restrictedCaseBalance;

    // الصرف الفوري: فصل المُسلّم فعلياً عن العهدة قيد التسليم مع خصم الاثنين (غير الملغاة) من الخزينة
    const activeRestrictedOrders = fastTrackOrders.filter((o) => o.status !== 'cancelled');
    const fastTrackDeliveredTotal = activeRestrictedOrders
      .filter((o) => o.status === 'delivered')
      .reduce((s, o) => s + o.amount, 0);
    const fastTrackPendingTotal = activeRestrictedOrders
      .filter((o) => o.status === 'pending_delivery')
      .reduce((s, o) => s + o.amount, 0);
    const activeFastTrackTotal = fastTrackDeliveredTotal + fastTrackPendingTotal;
    const restrictedDisbursedTotal = activeFastTrackTotal;

    const totalAvailableLiquidity = unrestrictedDonationsBalance + restrictedDonationsBalance;

    const pledgedDonationsTotal = donations
      .filter((d) => d.status === 'pledged')
      .reduce((s, d) => s + d.amount, 0);

    // إجمالي كافة الدورات المعتمدة والمغلقة فعلياً (دون أي تأثر بالمسودات تحت الإعداد)
    const approvedCyclesList = Object.values(allocations).filter(
      (a) => a.status === 'approved' || a.status === 'closed'
    );
    const approvedCyclesCount = approvedCyclesList.length;
    const approvedCyclesDisbursedTotal = approvedCyclesList.reduce(
      (sum, a) => sum + (a.summary?.totalAllocated ?? 0),
      0
    );

    // بطاقة الدورة الرئيسية (أحدث دورة معتمدة أو أول دورة جاهزة للاعتماد)
    const approvedAssistanceTotal = dashboardCycle?.summary.totalAllocated ?? 0;
    const isAllocationApproved =
      dashboardCycle?.status === 'approved' || dashboardCycle?.status === 'closed';

    // تم صرفه فعلياً = مجموع جميع الدورات المعتمدة/المغلقة + إجمالي أوامر الصرف الفوري الفعالة (مُسلّم + بعهدة الباحث)
    const disbursedAssistanceTotal = approvedCyclesDisbursedTotal + activeFastTrackTotal;
    const totalDisbursedOrAllocated = disbursedAssistanceTotal;

    // الرصيد غير المقيد المتاح حالياً (تم خصم الدورات المعتمدة منه مسبقاً في remainingAmount)
    const unrestrictedAvailableBalance = Math.max(0, unrestrictedDonationsBalance);

    // المتبقي في الخزنة = إجمالي التبرعات المتاحة - إجمالي كافة المصروفات المعتمدة والمنفذة فعلياً
    const netTreasuryBalance = receivedDonationsTotal - disbursedAssistanceTotal;
    const treasuryStatus: 'surplus' | 'deficit' = netTreasuryBalance >= 0 ? 'surplus' : 'deficit';

    const totalFamiliesNeedGap = cases
      .filter((c) => c.status === 'active_eligible' || (c.status === 'pending_exception' && c.vulnerability?.exceptionApproved))
      .reduce((sum, c) => sum + (c.financials.netFinancialGap || 0), 0);

    return {
      totalCases,
      eligibleCases,
      activeEligibleStandardCases,
      approvedExceptionCases,
      fundedCasesCount,
      underInvestigationCases,
      temporarilyExcludedCases,
      closedCases,
      excludedOrClosedCases,
      urgentReviewCases,
      overdueVisitsCases,
      incompleteDocsCases,
      receivedDonationsTotal,
      unrestrictedDonationsBalance,
      restrictedDonationsBalance,
      restrictedPurposeBalance,
      restrictedCaseBalance,
      restrictedPurposeInbound,
      restrictedCaseInbound,
      restrictedDisbursedTotal,
      totalAvailableLiquidity,
      pledgedDonationsTotal,
      approvedAssistanceTotal,
      approvedCyclesCount,
      approvedCyclesDisbursedTotal,
      fastTrackDeliveredTotal,
      fastTrackPendingTotal,
      activeFastTrackTotal,
      disbursedAssistanceTotal,
      unrestrictedAvailableBalance,
      totalDisbursedOrAllocated,
      netTreasuryBalance,
      treasuryStatus,
      totalFamiliesNeedGap,
      isAllocationApproved,
    };
  }, [cases, donations, allocations, dashboardCycle, fastTrackOrders]);

  // Role permissions
  const permissions = useMemo(() => {
    return {
      canApproveBudget: currentUserRole === 'admin',
      canEditAllocation: currentUserRole === 'admin' || currentUserRole === 'finance',
      canManageCases: currentUserRole === 'admin' || currentUserRole === 'researcher',
      canConfigureSettings: currentUserRole === 'admin',
      canViewBeneficiaryPII: currentUserRole === 'admin' || currentUserRole === 'researcher',
      canViewFinancialTreasury: currentUserRole === 'admin' || currentUserRole === 'finance',
    };
  }, [currentUserRole]);

  const currentSessionProfile = useMemo(() => {
    return ROLE_PROFILES[currentUserRole] || ROLE_PROFILES.admin;
  }, [currentUserRole]);

  const handleSetCurrentUserRole = (role: AppUserRole) => {
    setCurrentUserRole(role);
    const profile = ROLE_PROFILES[role];
    if (profile && !profile.allowedTabs.includes(activeSection)) {
      setActiveSection(profile.defaultTab);
    }
  };

  return (
    <AppContext.Provider
      value={{
        activeSection,
        setActiveSection,
        selectedCaseId,
        setSelectedCaseId,
        selectedCaseTab,
        setSelectedCaseTab,
        openCaseDetails,
        editingCase,
        setEditingCase,
        isNewCaseModalOpen,
        setIsNewCaseModalOpen,
        isNewDonationModalOpen,
        setIsNewDonationModalOpen,
        isFieldSurveyModalOpen,
        setIsFieldSurveyModalOpen,
        surveyTargetCaseId,
        setSurveyTargetCaseId,
        openFieldSurvey,
        isHydrated,
        currentUserRole,
        setCurrentUserRole: handleSetCurrentUserRole,
        currentSessionProfile,
        allSessionProfiles: ROLE_PROFILES,
        activeDonorId,
        setActiveDonorId,
        currentPeriod,
        setCurrentPeriod,
        permissions,
        cases,
        donations,
        visits,
        researchReports,
        allocations,
        scoringConfig,
        auditLogs,
        currentAllocation,
        dashboardCycle,
        metrics,
        shariaCategories,
        chronicDiseases,
        fastTrackOrders,
        caseNotes,
        researchers,
        addCaseNote,
        deleteCaseNote,
        addCustomResearcher,
        submitCaseStudyReport,
        addCase,
        updateCase,
        changeCaseStatus,
        approveCaseReview,
        returnCaseForRevision,
        rejectCaseReview,
        approveCaseException,
        addCaseAttachment,
        addDonation,
        addShariaCategory,
        updateShariaCategory,
        toggleShariaCategory,
        addChronicDisease,
        updateChronicDisease,
        toggleChronicDisease,
        deleteChronicDisease,
        addVisit,
        reassignResearcher,
        generateOrRefreshAllocation,
        createAllocationCycle,
        syncDraftAllocations,
        updateAllocationBatchConfig,
        updateAllocationItem,
        toggleExcludeItem,
        approveAllocation,
        unlockAllocation,
        issueFastTrackDisbursement,
        markFastTrackOrderDelivered,
        cancelFastTrackOrder,
        fastTrackTriggerData,
        setFastTrackTriggerData,
        getRestrictedFundBalances,
        updateScoringConfig,
        addAuditLog,
        resetToSeedData,
        isSyncing,
        syncSuccessMessage,
        setSyncSuccessMessage,
        triggerSync,
      }}
    >
      {syncSuccessMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-80 bg-emerald-800 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-4 border border-emerald-600"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{syncSuccessMessage}</span>
          <button
            type="button"
            onClick={() => setSyncSuccessMessage(null)}
            className="mr-2 text-emerald-200 hover:text-white text-xs font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
