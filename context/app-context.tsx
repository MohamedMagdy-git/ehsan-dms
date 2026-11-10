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
  ScoringRulesConfig,
  AuditLog,
  AppUserRole,
  UserSessionProfile,
  CaseStatus,
  MockAttachment,
  ShariaDonationCategory,
  CaseNote,
  CaseStudyReport,
  FastTrackDisbursementOrder,
} from '@/types';
import {
  INITIAL_CASES,
  INITIAL_DONATIONS,
  INITIAL_VISITS,
  INITIAL_RESEARCH_REPORTS,
  INITIAL_AUDIT_LOGS,
  DEFAULT_SHARIA_CATEGORIES,
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
import { generateMonthlyAllocationProposal, calculateAllocationSummary } from '@/services/allocation-engine';

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

interface AppContextType {
  // Navigation & State
  activeSection: string;
  setActiveSection: (sec: string) => void;
  selectedCaseId: string | null;
  setSelectedCaseId: (id: string | null) => void;
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
  addVisit: (visitData: Omit<FieldVisit, 'id'>) => void;
  reassignResearcher: (caseId: string, newResearcher: string, reason?: string) => void;
  generateOrRefreshAllocation: (
    period: string,
    customBudget?: number,
    overrideConfig?: ScoringRulesConfig,
    overrideCases?: BeneficiaryCase[],
    batchOptions?: {
      batchTitle?: string;
      executionDate?: string;
      coverageMonths?: number;
      strategy?: 'priority_first' | 'proportional';
    }
  ) => MonthlyAllocation;
  updateAllocationBatchConfig: (
    period: string,
    updates: {
      batchTitle?: string;
      executionDate?: string;
      coverageMonths?: number;
      allocationStrategy?: 'priority_first' | 'proportional';
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
  const [editingCase, setEditingCase] = useState<BeneficiaryCase | null>(null);
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
  const [fastTrackOrders, setFastTrackOrders] = useState<FastTrackDisbursementOrder[]>(INITIAL_FAST_TRACK_ORDERS);
  const [caseNotes, setCaseNotes] = useState<CaseNote[]>(INITIAL_CASE_NOTES);
  const [researchers, setResearchers] = useState<string[]>(DEFAULT_RESEARCHERS);
  const [allocations, setAllocations] = useState<Record<string, MonthlyAllocation>>(() => {
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
    octProposal.sessionMinutesNumber = 'محضر رقم 10/2026-إد';
    octProposal.sessionMinutesDate = '2026-10-14';

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
      const savedCases = localStorage.getItem(STORAGE_KEYS.CASES);
      if (savedCases) setCases(JSON.parse(savedCases));

      const savedDonations = localStorage.getItem(STORAGE_KEYS.DONATIONS);
      if (savedDonations) setDonations(JSON.parse(savedDonations));

      const savedCategories = localStorage.getItem(STORAGE_KEYS.SHARIA_CATEGORIES);
      if (savedCategories) {
        try {
          setShariaCategories(JSON.parse(savedCategories));
        } catch (err) {
          console.warn('Failed to parse sharia categories:', err);
        }
      }

      const savedVisits = localStorage.getItem(STORAGE_KEYS.VISITS);
      if (savedVisits) setVisits(JSON.parse(savedVisits));

      const savedScoring = localStorage.getItem(STORAGE_KEYS.SCORING);
      if (savedScoring) setScoringConfig(JSON.parse(savedScoring));

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
            sanitized[k] = {
              ...v,
              totalBudget: budgetVal,
              unrestrictedBudget: budgetVal,
              restrictedBudget: 0,
              items: sanitizedItems,
              summary: calculateAllocationSummary(sanitizedItems, budgetVal),
            };
          }
          setAllocations(sanitized);
        } catch (err) {
          console.warn('Failed to parse saved allocations:', err);
        }
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
      isVisitOverdue: caseData.status === 'pending_field_research' ? true : false,
    };

    setCases((prev) => [newCase, ...prev]);
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
    setCases((prev) =>
      prev.map((c) => {
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
      })
    );
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
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return { ...c, status };
        }
        return c;
      })
    );
    addAuditLog(
      'تغيير حالة المستحق',
      `تغيير حالة المستحق (${id}) إلى ${status}${reason ? ` - السبب: ${reason}` : ''}`
    );
  };

  const approveCaseReview = (id: string, notes?: string) => {
    let caseTitle = id;
    const now = new Date().toISOString().split('T')[0];
    let updatedCasesList: BeneficiaryCase[] = [];

    setCases((prev) => {
      const updated = prev.map((c) => {
        if (c.id === id) {
          caseTitle = `${c.primaryName || c.fullName} (${c.code})`;
          const entry = `[${now}] تم الاعتماد الإداري لبحث الحالة رسمياً بواسطة مدير النظام وإدراجها فوراً ضمن المستحقين المعتمدين للصرف.${notes ? ` [ملاحظة: ${notes}]` : ''}`;
          return {
            ...c,
            status: 'active_eligible' as CaseStatus,
            lastAssessmentDate: now,
            notes: c.notes ? `${entry}\n\n${c.notes}` : entry,
          };
        }
        return c;
      });
      updatedCasesList = updated;
      return updated;
    });

    // مزامنة فورية لمسودة الميزانية الشهرية الحالية
    setAllocations((prevAlloc) => {
      const curAlloc = prevAlloc[currentPeriod];
      if (curAlloc && curAlloc.status === 'draft') {
        const recomputed = generateMonthlyAllocationProposal({
          period: currentPeriod,
          periodLabel: curAlloc.periodLabel,
          batchTitle: curAlloc.batchTitle,
          executionDate: curAlloc.executionDate,
          coverageMonths: curAlloc.coverageMonths || 1,
          strategy: curAlloc.allocationStrategy || 'priority_first',
          cases: updatedCasesList.length > 0 ? updatedCasesList : cases,
          donations,
          customTotalBudget: curAlloc.totalBudget,
          config: scoringConfig,
          carriedOverFromPreviousPeriod: curAlloc.carriedOverFromPreviousPeriod,
        });
        return {
          ...prevAlloc,
          [currentPeriod]: recomputed,
        };
      }
      return prevAlloc;
    });

    addAuditLog('اعتماد رسمي لبحث حالة', `تم اعتماد بحث الحالة (${caseTitle}) رسمياً ونقلها للمستحقين المعتمدين للصرف`);
  };

  const returnCaseForRevision = (id: string, revisionReason: string) => {
    let caseTitle = id;
    const now = new Date().toISOString().split('T')[0];
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          caseTitle = `${c.primaryName || c.fullName} (${c.code})`;
          const entry = `[${now}] إعادة للباحث الميداني (${c.assignedResearcher}) للاستيفاء والتعديل: "${revisionReason}"`;
          return {
            ...c,
            status: 'needs_revision' as CaseStatus,
            notes: c.notes ? `${entry}\n\n${c.notes}` : entry,
          };
        }
        return c;
      })
    );
    addAuditLog('إعادة بحث حالة للاستيفاء', `تمت إعادة الحالة (${caseTitle}) للباحث للاستيفاء والتعديل: ${revisionReason}`);
  };

  const rejectCaseReview = (id: string, rejectionReason: string) => {
    let caseTitle = id;
    const now = new Date().toISOString().split('T')[0];
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          caseTitle = `${c.primaryName || c.fullName} (${c.code})`;
          const entry = `[${now}] استبعاد / عدم اعتماد بحث الحالة بقرار إداري. السبب: "${rejectionReason}"`;
          return {
            ...c,
            status: 'closed' as CaseStatus,
            notes: c.notes ? `${entry}\n\n${c.notes}` : entry,
          };
        }
        return c;
      })
    );
    addAuditLog('استبعاد بحث حالة', `تم استبعاد الحالة (${caseTitle}) بقرار إداري: ${rejectionReason}`);
  };

  const approveCaseException = (id: string, approvedBy: string, reason: string) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            status: 'active_eligible',
            vulnerability: {
              ...c.vulnerability,
              exceptionApproved: true,
              exceptionApprovedBy: approvedBy,
              exceptionReason: reason,
            },
          };
        }
        return c;
      })
    );
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

    setCases((prev) =>
      prev.map((c) => {
        if (c.id === visitData.caseId) {
          return {
            ...c,
            lastVisitDate: visitData.visitDate,
            nextVisitDueDate: visitData.scheduledNextDate,
            isVisitOverdue: false,
          };
        }
        return c;
      })
    );

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
    if (p === '2026-10') return 'أكتوبر 2026';
    if (p === '2026-11') return 'نوفمبر 2026';
    if (p === '2026-12') return 'ديسمبر 2026';
    const parts = p.split('-');
    if (parts.length === 2) {
      const monthNames: Record<string, string> = {
        '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل',
        '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس',
        '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر',
      };
      return `${monthNames[parts[1]] || parts[1]} ${parts[0]}`;
    }
    return p;
  };

  const generateOrRefreshAllocation = (
    period: string,
    customBudget?: number,
    overrideConfig?: ScoringRulesConfig,
    overrideCases?: BeneficiaryCase[],
    batchOptions?: {
      batchTitle?: string;
      executionDate?: string;
      coverageMonths?: number;
      strategy?: 'priority_first' | 'proportional';
    }
  ) => {
    const periodLabel = formatPeriodLabel(period);
    const existing = allocations[period];
    const activeConfig = overrideConfig || scoringConfig;
    const activeCases = overrideCases || cases;

    const proposal = generateMonthlyAllocationProposal({
      period,
      periodLabel,
      batchTitle: batchOptions?.batchTitle || existing?.batchTitle,
      executionDate: batchOptions?.executionDate || existing?.executionDate,
      coverageMonths: batchOptions?.coverageMonths || existing?.coverageMonths || 1,
      strategy: batchOptions?.strategy || existing?.allocationStrategy || 'priority_first',
      cases: activeCases,
      donations,
      customTotalBudget: customBudget !== undefined ? customBudget : existing?.totalBudget,
      config: activeConfig,
      carriedOverFromPreviousPeriod: existing?.carriedOverFromPreviousPeriod,
    });
    setAllocations((prev) => ({ ...prev, [period]: proposal }));
    addAuditLog(
      'توليد مقترح تخصيص شهري',
      `تم توليد مقترح الميزانية لدورة "${proposal.batchTitle || periodLabel}" بميزانية ${proposal.totalBudget.toLocaleString('ar-EG')} ج.م`
    );
    return proposal;
  };

  const updateAllocationBatchConfig = (
    period: string,
    updates: {
      batchTitle?: string;
      executionDate?: string;
      coverageMonths?: number;
      allocationStrategy?: 'priority_first' | 'proportional';
    }
  ) => {
    setAllocations((prev) => {
      const current = prev[period];
      if (!current) return prev;

      const newCoverage = updates.coverageMonths !== undefined ? updates.coverageMonths : (current.coverageMonths || 1);
      const newStrategy = updates.allocationStrategy !== undefined ? updates.allocationStrategy : (current.allocationStrategy || 'priority_first');
      const newTitle = updates.batchTitle !== undefined ? updates.batchTitle : current.batchTitle;
      const newExecDate = updates.executionDate !== undefined ? updates.executionDate : current.executionDate;

      const shouldRecompute =
        current.status === 'draft' &&
        ((updates.coverageMonths !== undefined && updates.coverageMonths !== current.coverageMonths) ||
         (updates.allocationStrategy !== undefined && updates.allocationStrategy !== current.allocationStrategy));

      if (shouldRecompute) {
        const recomputed = generateMonthlyAllocationProposal({
          period,
          periodLabel: current.periodLabel,
          batchTitle: newTitle,
          executionDate: newExecDate,
          coverageMonths: newCoverage,
          strategy: newStrategy,
          cases,
          donations,
          customTotalBudget: current.totalBudget,
          config: scoringConfig,
          carriedOverFromPreviousPeriod: current.carriedOverFromPreviousPeriod,
        });
        return {
          ...prev,
          [period]: recomputed,
        };
      }

      return {
        ...prev,
        [period]: {
          ...current,
          ...(updates.batchTitle !== undefined ? { batchTitle: updates.batchTitle } : {}),
          ...(updates.executionDate !== undefined ? { executionDate: updates.executionDate } : {}),
          ...(updates.coverageMonths !== undefined ? { coverageMonths: updates.coverageMonths } : {}),
          ...(updates.allocationStrategy !== undefined ? { allocationStrategy: updates.allocationStrategy } : {}),
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

    // تحديد الدورة التالية زمنياً
    const sortedPeriods = Object.keys(allocations).sort();
    const currentIndex = sortedPeriods.indexOf(period);
    let nextPeriodKey =
      currentIndex >= 0 && currentIndex < sortedPeriods.length - 1
        ? sortedPeriods[currentIndex + 1]
        : null;

    if (!nextPeriodKey) {
      const parts = period.split('-').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const nextMonth = parts[1] === 12 ? 1 : parts[1] + 1;
        const nextYear = parts[1] === 12 ? parts[0] + 1 : parts[0];
        nextPeriodKey = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
      }
    }
    const nextPeriodLabel = nextPeriodKey ? formatPeriodLabel(nextPeriodKey) : undefined;

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

    // 3. ترحيل الفائض المتبقي من الدورة المعتمدة وتحديث كائن allocations للدورة الحالية واللاحقة
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

      const updatedMap = {
        ...prevAllocations,
        [period]: approvedAllocation,
      };

      if (nextPeriodKey) {
        const carryOverInfo = {
          previousPeriod: period,
          previousPeriodLabel: currentAlloc.periodLabel || formatPeriodLabel(period),
          carriedOverAmount: carriedOverSurplus,
        };

        const nextProposal = generateMonthlyAllocationProposal({
          period: nextPeriodKey,
          periodLabel: nextPeriodLabel || formatPeriodLabel(nextPeriodKey),
          cases,
          donations: updatedDonationsList.length > 0 ? updatedDonationsList : donations,
          customTotalBudget: carriedOverSurplus,
          config: scoringConfig,
          carriedOverFromPreviousPeriod: carryOverInfo,
        });

        updatedMap[nextPeriodKey] = nextProposal;
      }

      return updatedMap;
    });

    // 4. تحديث إجمالي المساعدات التاريخية وتدوين دورة الصرف في خط سير الحالة (Case Timeline)
    const batchTitle = current.batchTitle || current.periodLabel || formatPeriodLabel(period);
    const execDate = current.executionDate || new Date().toISOString().split('T')[0];
    const covMonths = current.coverageMonths || 1;
    const covText = covMonths > 1 ? ` (دفعة مجمعة تغطي ${covMonths} أشهر)` : '';

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
    addAuditLog(
      'اعتماد ميزانية دورة الصرف',
      `تم الاعتماد النهائي لدورة "${batchTitle}" [تاريخ الصرف المقرر: ${execDate}${covText}] بمبلغ إجمالي ${totalDeducted.toLocaleString('ar-EG')} ج.م (صندوق عام: ${approvedUnrestricted.toLocaleString('ar-EG')} ج.م، مقيد: ${approvedRestricted.toLocaleString('ar-EG')} ج.م) بواسطة ${approvedBy}، وتم ترحيل فائض ${carriedOverSurplus.toLocaleString('ar-EG')} ج.م لدورة ${nextPeriodLabel || 'التالية'}`
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
      return {
        ...c,
        priority: newPriority,
        isVisitOverdue: visitCheck.isOverdue,
      };
    });
    setCases(updatedCases);

    // 2. إعادة توليد مقترح التخصيص للدورة النشطة مباشرة بالإعدادات والحالات المحدثة
    const currentAlloc = allocations[currentPeriod];
    if (!currentAlloc || currentAlloc.status !== 'approved') {
      const periodLabel = formatPeriodLabel(currentPeriod);
      const newProposal = generateMonthlyAllocationProposal({
        period: currentPeriod,
        periodLabel,
        cases: updatedCases,
        donations,
        customTotalBudget: currentAlloc?.totalBudget,
        config: mergedConfig,
        carriedOverFromPreviousPeriod: currentAlloc?.carriedOverFromPreviousPeriod,
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
      let targetCaseId = report.caseId;

      if (targetCaseId) {
        setCases((prev) =>
          prev.map((c) => {
            if (c.id === targetCaseId) {
              return {
                ...c,
                primaryName: report.caseName || c.primaryName,
                fullName: report.caseName || c.fullName,
                phone: report.contactPhone || c.phone,
                address: report.address || c.address,
                assignedResearcher: report.visitorName || c.assignedResearcher,
                status: 'pending_review' as CaseStatus,
                priority: report.priorityLevel || c.priority,
                lastVisitDate: report.visitDate || now,
                householdMembers:
                  report.familyMembers && report.familyMembers.length > 0
                    ? report.familyMembers.map((m) => ({
                        id: m.id || `m-${Date.now()}-${m.orderNumber}`,
                        name: m.name,
                        relation: m.relation,
                        age: Number(m.age) || 30,
                        educationLevel: m.educationLevel || 'متوسط',
                        healthStatus: 'سليم',
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
                  estimatedAssistanceNeed: report.netFinancialGap || 0,
                },
                vulnerability: {
                  ...c.vulnerability,
                  hasChronicIllness: Boolean(
                    report.medicalConditionDescription && report.chronicVerification !== 'لا يوجد'
                  ),
                  chronicIllnessDetails: report.medicalConditionDescription,
                  housingCondition: (report.housingStatus as any) || c.vulnerability.housingCondition,
                },
                notes: `${c.notes || ''}\n[بحث حالة ميداني - ${report.visitDate}]: ${report.caseSummary || ''}`.trim(),
              };
            }
            return c;
          })
        );
      } else {
        const newCode = `EHS-${Math.floor(100 + Math.random() * 900)}`;
        targetCaseId = `case-${Date.now()}`;
        const newCase: BeneficiaryCase = {
          id: targetCaseId,
          code: newCode,
          primaryName: report.caseName,
          fullName: report.caseName,
          nationalId: `${Math.floor(28000000000000 + Math.random() * 900000000000)}`,
          phone: report.contactPhone,
          governorate: 'القاهرة',
          district: report.address.split(' ')[0] || 'المنطقة',
          address: report.address,
          assignedResearcher: report.visitorName || 'أ. هبة الشامي',
          registrationDate: now,
          status: 'pending_review' as CaseStatus,
          priority: report.priorityLevel || 'high',
          lastAssessmentDate: now,
          lastVisitDate: report.visitDate || now,
          nextVisitDueDate: now,
          isVisitOverdue: false,
          historicalAssistanceTotal: 0,
          attachments: [],
          householdMembers: (report.familyMembers || []).map((m) => ({
            id: m.id || `m-${Date.now()}-${m.orderNumber}`,
            name: m.name,
            relation: m.relation,
            age: Number(m.age) || 30,
            educationLevel: m.educationLevel || 'متوسط',
            healthStatus: 'سليم',
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
            estimatedAssistanceNeed: report.netFinancialGap || 0,
          },
          vulnerability: {
            hasChronicIllness: Boolean(
              report.medicalConditionDescription && report.chronicVerification !== 'لا يوجد'
            ),
            chronicIllnessDetails: report.medicalConditionDescription,
            isOrphanHousehold: false,
            orphanCount: 0,
            dependentsCount: Math.max(1, (report.familyMembers?.length || 1) - 1),
            housingCondition: (report.housingStatus as any) || 'rent_unstable',
            foodInsecurityLevel: 'moderate',
            workCapacity: 'partial',
            confidenceScore: 95,
            incompleteDocuments: !report.attachments?.nationalIdsAdults,
            exceptionApproved: false,
          },
          notes: `[بحث حالة ميداني]: ${report.caseSummary || ''}\n${report.additionalNotesAndRemarks || ''}`.trim(),
        };

        setCases((prev) => [newCase, ...prev]);
      }

      const newReport: CaseResearchReport = {
        id: `rep-${Date.now()}`,
        caseId: targetCaseId,
        caseCode: report.caseId ? cases.find((c) => c.id === report.caseId)?.code || 'EHS' : 'EHS-NEW',
        caseName: report.caseName,
        researcherName: report.visitorName,
        reportDate: report.visitDate,
        visitType: 'initial_field',
        housingNotes: `${report.housingStatus}: ${report.caseSummary}`,
        incomeObservations:
          report.basicIncomeSources +
          (report.additionalIncomeSources ? ` - ${report.additionalIncomeSources}` : ''),
        healthObservations: report.medicalConditionDescription,
        recommendations: report.additionalNotesAndRemarks || 'يوصى بالمراجعة والاعتماد',
        trustScore: 95,
        documentsStatus: report.attachments?.nationalIdsAdults ? 'complete' : 'incomplete_trusted',
        assessedScore: 85,
      };

      setResearchReports((prev) => [newReport, ...prev]);

      addAuditLog(
        'تسجيل بحث حالة ميداني',
        `تم إرسال استمارة بحث حالة (${report.caseName}) بالحالة: pending_review (بانتظار المراجعة والاعتماد)`
      );
    },
    [cases, addAuditLog]
  );

  const currentAllocation = allocations[currentPeriod];

  // Operational & Treasury Financial metrics
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
    const fundedCasesCount = currentAllocation?.summary.fundedCasesCount ?? eligibleCases;
    const underInvestigationCases = cases.filter((c) => c.status === 'under_review').length;
    const temporarilyExcludedCases = cases.filter((c) => c.status === 'excluded_current_month').length;
    const closedCases = cases.filter((c) => c.status === 'closed').length;
    const excludedOrClosedCases = temporarilyExcludedCases + closedCases;
    const urgentReviewCases = pendingExceptionCases + cases.filter((c) => c.priority === 'critical').length;
    const overdueVisitsCases = cases.filter((c) => c.isVisitOverdue).length;
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

    // Disbursed total from active fast-track orders
    const activeRestrictedOrders = fastTrackOrders.filter((o) => o.status !== 'cancelled');
    const restrictedDisbursedTotal = activeRestrictedOrders.reduce((s, o) => s + o.amount, 0);

    const totalAvailableLiquidity = unrestrictedDonationsBalance + restrictedDonationsBalance;

    const pledgedDonationsTotal = donations
      .filter((d) => d.status === 'pledged')
      .reduce((s, d) => s + d.amount, 0);

    const approvedAssistanceTotal = currentAllocation?.summary.totalAllocated ?? 0;
    const isAllocationApproved = currentAllocation?.status === 'approved';
    const disbursedAssistanceTotal = isAllocationApproved ? approvedAssistanceTotal : 0;
    const totalDisbursedOrAllocated = approvedAssistanceTotal;

    // الرصيد غير المقيد المتاح للتخصيص الحر = التبرعات غير المقيدة - ما تم اعتماده فعلياً من الصندوق العام
    const unrestrictedAssistanceTotal = currentAllocation?.items
      .filter((i) => !i.isExcluded && i.fundSource === 'unrestricted_pool')
      .reduce((sum, i) => sum + i.approvedAmount, 0) ?? 0;
    const unrestrictedAvailableBalance = Math.max(0, unrestrictedDonationsBalance - unrestrictedAssistanceTotal);

    const netTreasuryBalance = receivedDonationsTotal - totalDisbursedOrAllocated;
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
      disbursedAssistanceTotal,
      unrestrictedAvailableBalance,
      totalDisbursedOrAllocated,
      netTreasuryBalance,
      treasuryStatus,
      totalFamiliesNeedGap,
      isAllocationApproved,
    };
  }, [cases, donations, currentAllocation, fastTrackOrders]);

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
        metrics,
        shariaCategories,
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
        addVisit,
        reassignResearcher,
        generateOrRefreshAllocation,
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
