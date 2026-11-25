'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useApp } from '@/context/app-context';
import { useToast } from '@/context/toast-context';
import {
  doesDraftAllocationNeedSync,
  formatAllocationCycleDropdownLabel,
} from '@/services/allocation-engine';
import {
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  Ban,
  Check,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  X,
  Clock,
  Tag,
  Repeat,
  Search,
  ChevronDown,
  Plus,
  Layers,
  History,
  MessageSquareText,
  ArrowLeft,
  FileCheck2,
} from 'lucide-react';
import { PriorityLevel, CaseNote } from '@/types';
import { exportMonthlyAllocationToExcel } from '@/services/excel-export';
import { MoneyDisplay } from '@/components/common/money-display';
import { AmountInput } from '@/components/common/amount-input';
import { NewAllocationCycleModal } from '@/components/allocation/new-allocation-cycle-modal';
import { CustomSelect } from '@/components/ui/custom-select';
import { getEffectivePayoutMethod } from '@/lib/payout-helpers';
import {
  DeliveryProofPreviewModal,
  DeliveryProofPreviewTarget,
} from '@/components/custody/delivery-proof-modal';

const getPriorityMeta = (priority: PriorityLevel): { label: string; className: string } => {
  switch (priority) {
    case 'critical':
      return { label: 'حالة حرجة', className: 'text-rose-600 font-semibold' };
    case 'high':
      return { label: 'أولوية عالية', className: 'text-slate-700 font-medium' };
    case 'medium':
      return { label: 'أولوية متوسطة', className: 'text-slate-600 font-medium' };
    case 'low':
      return { label: 'أولوية عادية', className: 'text-slate-500 font-normal' };
  }
};

export function AllocationView() {
  const {
    allocations,
    generateOrRefreshAllocation,
    createAllocationCycle,
    syncDraftAllocations,
    updateAllocationBatchConfig,
    updateAllocationItem,
    toggleExcludeItem,
    approveAllocation,
    unlockAllocation,
    currentUserRole,
    currentSessionProfile,
    cases,
    caseNotes,
    scoringConfig,
    permissions,
    openCaseDetails,
    metrics,
    getDeliveryProof,
    deliveredCustodyIds,
  } = useApp();

  // عزل اختيار الدورة محلياً داخل شاشة توزيع الميزانية (Local State) لمنع تسريب الفلتر للصفحة الرئيسية
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    const entries = Object.entries(allocations);
    if (entries.length === 0) return '2026-10';
    const drafts = entries.filter(([, a]) => a.status === 'draft');
    if (drafts.length > 0) {
      return [...drafts].sort(([, a], [, b]) =>
        (a.periodDate || a.executionDate || a.period).localeCompare(
          b.periodDate || b.executionDate || b.period
        )
      )[0][0];
    }
    return [...entries].sort(([, a], [, b]) =>
      (b.periodDate || b.executionDate || b.period).localeCompare(
        a.periodDate || a.executionDate || a.period
      )
    )[0][0];
  });

  const currentPeriod = allocations[selectedPeriod]
    ? selectedPeriod
    : Object.keys(allocations)[0] || selectedPeriod;
  const setCurrentPeriod = setSelectedPeriod;
  const currentAllocation = allocations[currentPeriod];

  const prefersReducedMotion = useReducedMotion();
  const actualUnrestricted = Math.max(0, metrics?.netTreasuryBalance ?? 0);

  const [budgetInput, setBudgetInput] = useState<number>(
    currentAllocation?.totalBudget ?? actualUnrestricted
  );
  const [isCustomBudgetOpen, setIsCustomBudgetOpen] = useState(false);
  const [customBudgetValue, setCustomBudgetValue] = useState<number>(
    currentAllocation?.totalBudget ?? actualUnrestricted
  );
  const [isNewCycleModalOpen, setIsNewCycleModalOpen] = useState(false);
  const [isBatchConfigExpanded, setIsBatchConfigExpanded] = useState(false);
  const [expandedCaseIds, setExpandedCaseIds] = useState<Record<string, boolean>>({});

  const [excludingItemId, setExcludingItemId] = useState<string | null>(null);
  const [exclusionReasonInput, setExclusionReasonInput] = useState<string>('');

  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approverName, setApproverName] = useState('أ. أحمد الجزار (رئيس المبادرة)');

  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [unlockReasonInput, setUnlockReasonInput] = useState('');
  const [unlockError, setUnlockError] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('all');
  const [previewProofTarget, setPreviewProofTarget] = useState<DeliveryProofPreviewTarget | null>(null);
  const { toast } = useToast();

  // Sync budget input on period or budget change
  const [prevPeriod, setPrevPeriod] = useState(currentPeriod);
  const [prevTotalBudget, setPrevTotalBudget] = useState(currentAllocation?.totalBudget);
  if (prevPeriod !== currentPeriod || prevTotalBudget !== currentAllocation?.totalBudget) {
    setPrevPeriod(currentPeriod);
    setPrevTotalBudget(currentAllocation?.totalBudget);
    const targetAlloc = allocations[currentPeriod];
    if (targetAlloc?.totalBudget !== undefined) {
      setBudgetInput(targetAlloc.totalBudget);
    }
  }

  // Case Map for fast O(1) lookups
  const caseMap = useMemo(() => new Map(cases.map((c) => [c.id, c])), [cases]);

  // O(1) map: previous approved disbursements per case (from all approved cycles)
  const approvedHistoryByCaseId = useMemo(() => {
    const map = new Map<
      string,
      Array<{
        id: string;
        batchTitle: string;
        date: string;
        amount: number;
        cycleType: 'regular' | 'exceptional';
      }>
    >();

    Object.values(allocations).forEach((alloc) => {
      if (alloc.status !== 'approved') return;
      const date =
        alloc.periodDate ||
        alloc.executionDate ||
        (alloc.approvedDate ? alloc.approvedDate.split(' ')[0] : alloc.period);
      const batchTitle = alloc.batchTitle || alloc.periodLabel || alloc.period;
      const cycleType = alloc.cycleType === 'exceptional' ? 'exceptional' : 'regular';

      (alloc.items || []).forEach((item) => {
        if (item.isExcluded || item.approvedAmount <= 0) return;
        const list = map.get(item.caseId) || [];
        list.push({
          id: `${alloc.id}-${item.id}`,
          batchTitle,
          date,
          amount: item.approvedAmount,
          cycleType,
        });
        map.set(item.caseId, list);
      });
    });

    map.forEach((list) => {
      list.sort((a, b) => b.date.localeCompare(a.date));
    });

    return map;
  }, [allocations]);

  // O(1) map: accessible notes count & latest note per case (matching BeneficiaryNotes privacy rules)
  const notesSummaryByCaseId = useMemo(() => {
    const map = new Map<string, { count: number; latestNote?: CaseNote }>();
    const profileName = currentSessionProfile?.name;

    const sortedNotes = [...caseNotes].sort(
      (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
    );

    sortedNotes.forEach((note) => {
      const isAuthor = note.authorId === currentUserRole || note.authorName === profileName;
      const canView = !note.isPrivate || isAuthor || currentUserRole === 'admin';
      if (!canView) return;

      const existing = map.get(note.caseId);
      if (!existing) {
        map.set(note.caseId, { count: 1, latestNote: note });
      } else {
        existing.count += 1;
      }
    });

    return map;
  }, [caseNotes, currentUserRole, currentSessionProfile?.name]);

  const toggleExpandCase = (caseId: string) => {
    setExpandedCaseIds((prev) => ({
      ...prev,
      [caseId]: !prev[caseId],
    }));
  };

  const collapseTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.18, ease: 'easeOut' as const };

  const isApproved = currentAllocation?.status === 'approved';
  const isExceptionalCycle = currentAllocation?.cycleType === 'exceptional';
  const currentStrategy = currentAllocation?.allocationStrategy || 'priority_first';
  const resolvedExecutionDate =
    currentAllocation?.periodDate ||
    currentAllocation?.executionDate ||
    new Date().toISOString().split('T')[0];

  const coverageSummaryLabel = isExceptionalCycle
    ? currentAllocation?.exceptionalDistributionMode === 'split_budget'
      ? 'تقسيم الميزانية'
      : `مبلغ موحد (${(currentAllocation?.flatAmountPerCase ?? 1000).toLocaleString('ar-EG')} ج.م)`
    : (currentAllocation?.coverageMonths || 1) === 1
    ? 'شهر واحد'
    : currentAllocation?.coverageMonths === 2
    ? 'شهرين'
    : `${currentAllocation?.coverageMonths} شهور`;

  // Auto-healing: ensure any open draft period immediately reflects newly approved/updated eligible cases
  const needsDraftAutoSync = Boolean(
    currentAllocation &&
      currentAllocation.status === 'draft' &&
      doesDraftAllocationNeedSync(currentAllocation, cases, scoringConfig)
  );

  useEffect(() => {
    if (needsDraftAutoSync) {
      syncDraftAllocations(currentPeriod);
    }
  }, [needsDraftAutoSync, currentPeriod, syncDraftAllocations]);

  const handleConfirmExclusion = () => {
    if (!excludingItemId) return;
    toggleExcludeItem(
      currentPeriod,
      excludingItemId,
      true,
      exclusionReasonInput.trim() || 'استبعاد مؤقت من دورة الصرف الحالية'
    );
    setExcludingItemId(null);
    setExclusionReasonInput('');
  };

  const handleConfirmApproval = () => {
    approveAllocation(currentPeriod, approverName);
    setShowApprovalDialog(false);
    toast.success(
      isExceptionalCycle
        ? 'تم اعتماد الدورة الاستثنائية وقفل الكشف بنجاح'
        : 'تم اعتماد الميزانية وقفل الدورة بنجاح'
    );
  };

  const handleConfirmUnlock = () => {
    if (!unlockReasonInput.trim()) {
      setUnlockError('اكتب سبب فتح التعديل عشان يتسجل في سجل المراجعة');
      return;
    }
    const adminName = currentSessionProfile?.name || 'أ. أحمد الجزار (مدير النظام)';
    unlockAllocation(currentPeriod, adminName, unlockReasonInput.trim());
    setShowUnlockDialog(false);
    setUnlockReasonInput('');
    setUnlockError('');
    toast.info('تم فتح الدورة استثنائياً للتعديل');
  };

  const handleExportExcel = () => {
    if (!currentAllocation) return;
    try {
      exportMonthlyAllocationToExcel(currentAllocation, cases);
      toast.success('تم تصدير ملف الإكسل لكشف الصرف بنجاح');
    } catch (err) {
      console.error('Failed to export excel:', err);
      toast.error('تعذر تصدير ملف الإكسل، يرجى المحاولة مرة أخرى');
    }
  };

  const handleApplyCustomBudget = () => {
    if (!customBudgetValue || customBudgetValue <= 0) return;
    setBudgetInput(customBudgetValue);
    generateOrRefreshAllocation(currentPeriod, customBudgetValue, undefined, undefined, {
      strategy: currentStrategy,
    });
    toast.success('تمت إعادة توزيع مقترح الميزانية تلقائياً');
    setIsCustomBudgetOpen(false);
  };

  const handleResetToAutoProposal = () => {
    generateOrRefreshAllocation(currentPeriod, budgetInput, undefined, undefined, {
      strategy: currentStrategy,
    });
    toast.success('تمت إعادة توزيع مقترح الميزانية تلقائياً');
  };

  const totalAllocated = currentAllocation?.summary?.totalAllocated || 0;

  // ملخص متابعة التسليم الميداني للدفعة المعتمدة
  const deliveryProgressSummary = useMemo(() => {
    if (!currentAllocation) {
      return {
        totalEligibleCount: 0,
        deliveredCount: 0,
        documentedCount: 0,
        deliveredAmount: 0,
        percentage: 0,
      };
    }
    const eligibleItems = currentAllocation.items.filter(
      (i) => !i.isExcluded && i.approvedAmount > 0
    );
    let deliveredCount = 0;
    let documentedCount = 0;
    let deliveredAmount = 0;

    eligibleItems.forEach((item) => {
      const custodyItemId = `cycle-${currentAllocation.id}-${item.id}`;
      const proof =
        getDeliveryProof(item.caseId, currentAllocation.period, custodyItemId) ||
        item.deliveryProof;
      const isDelivered =
        deliveredCustodyIds.includes(custodyItemId) || Boolean(proof);
      if (isDelivered) {
        deliveredCount += 1;
        deliveredAmount += item.approvedAmount;
      }
      if (proof) {
        documentedCount += 1;
      }
    });

    const totalEligibleCount = eligibleItems.length;
    const percentage =
      totalEligibleCount > 0
        ? Math.round((deliveredCount / totalEligibleCount) * 100)
        : 0;

    return {
      totalEligibleCount,
      deliveredCount,
      documentedCount,
      deliveredAmount,
      percentage,
    };
  }, [currentAllocation, getDeliveryProof, deliveredCustodyIds]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!currentAllocation) return [];
    return currentAllocation.items.filter((item) => {
      const c = caseMap.get(item.caseId);

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = item.caseName.toLowerCase().includes(query);
        const matchesCode = item.caseCode.toLowerCase().includes(query);
        const matchesPhone = c?.phone?.includes(query);
        const matchesNationalId = c?.nationalId?.includes(query);
        if (!matchesName && !matchesCode && !matchesPhone && !matchesNationalId) return false;
      }

      if (selectedPriorityFilter !== 'all') {
        if (selectedPriorityFilter === 'excluded') return item.isExcluded;
        if (selectedPriorityFilter === 'overdue') return item.isVisitOverdue;
        return item.priority === selectedPriorityFilter;
      }

      return true;
    });
  }, [currentAllocation, searchQuery, selectedPriorityFilter, caseMap]);

  if (!currentAllocation) {
    return (
      <>
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200/80 shadow-none space-y-4">
          <div className="inline-block w-full max-w-xs">
            <CustomSelect
              size="sm"
              value={currentPeriod}
              onChange={(selected) => {
                setCurrentPeriod(selected);
                if (!allocations[selected]) {
                  generateOrRefreshAllocation(selected);
                } else if (allocations[selected].status === 'draft') {
                  syncDraftAllocations(selected);
                }
              }}
              options={Object.entries(allocations).map(([key, alloc]) => ({
                value: key,
                label: formatAllocationCycleDropdownLabel(alloc, key),
              }))}
              prefix={
                <>
                  <Calendar size={14} className="text-slate-400" />
                  <span className="text-slate-500 font-medium">الدورة:</span>
                </>
              }
              ariaLabel="اختيار دورة الصرف"
              triggerClassName="bg-slate-50 border-slate-200/80 font-semibold"
            />
          </div>
          <p className="text-slate-600 font-semibold text-sm">لسه متعملش مقترح توزيع للدورة دي</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {permissions.canEditAllocation && (
              <button
                type="button"
                onClick={() => setIsNewCycleModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200/80 hover:bg-slate-50 hover:text-[#005756] text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>فتح دورة صرف جديدة</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => generateOrRefreshAllocation(currentPeriod, budgetInput)}
              className="px-4 py-2 bg-[#005756] hover:bg-[#004241] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              تجهيز مقترح الميزانية
            </button>
          </div>
        </div>
        <NewAllocationCycleModal
          isOpen={isNewCycleModalOpen}
          onClose={() => setIsNewCycleModalOpen(false)}
          unrestrictedBalance={actualUnrestricted}
          cases={cases}
          scoringConfig={scoringConfig}
          onCreateCycle={(data) => {
            const created = createAllocationCycle(data);
            setBudgetInput(created.totalBudget);
            toast.success(`تم فتح دورة «${created.batchTitle}» وتجهيز كشف الصرف`);
          }}
        />
      </>
    );
  }

  return (
    <div className="space-y-5">
      {/* 1. Page Header & Action Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              توزيع الميزانية وكشوف الصرف
            </h2>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="text-xs font-semibold text-[#005756]">
              {isExceptionalCycle ? 'دورة استثنائية / موسمية' : 'دورة شهرية دورية'}
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="text-xs font-semibold text-slate-700">
              {isApproved ? 'معتمدة ومقفولة' : 'مسودة للتجهيز'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {currentAllocation.batchTitle || currentAllocation.periodLabel} · تحديد مبالغ الدفعة واعتماد كشف الصرف
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
          {/* Cycle Dropdown */}
          <CustomSelect
            size="sm"
            value={currentPeriod}
            onChange={(selected) => {
              setCurrentPeriod(selected);
              if (!allocations[selected]) {
                generateOrRefreshAllocation(selected);
              } else if (allocations[selected].status === 'draft') {
                syncDraftAllocations(selected);
              }
            }}
            options={Object.entries(allocations).map(([key, alloc]) => ({
              value: key,
              label: formatAllocationCycleDropdownLabel(alloc, key),
            }))}
            prefix={
              <>
                <Calendar size={14} className="text-slate-400 shrink-0" />
                <span className="text-slate-400 font-medium text-[11px] shrink-0">الدورة:</span>
              </>
            }
            ariaLabel="اختيار دورة الصرف"
            className="w-full sm:w-auto max-w-full"
            triggerClassName="border-slate-200/80 font-semibold w-full sm:max-w-[350px]"
            menuMinWidth={260}
          />

          <div className="flex items-center gap-2">
            {/* Open New Disbursement Cycle (Secondary White Calm CTA) */}
            {permissions.canEditAllocation && (
              <button
                type="button"
                onClick={() => setIsNewCycleModalOpen(true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 h-9 bg-white border border-slate-200/80 hover:bg-slate-50 hover:border-[#005756]/40 hover:text-[#005756] text-slate-700 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="فتح دورة صرف شهرية أو منحة استثنائية جديدة"
              >
                <Plus size={14} className="text-[#005756]" />
                <span>فتح دورة صرف جديدة</span>
              </button>
            )}

            {/* Excel Export Button (Secondary White) */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 h-9 bg-white border border-slate-200/80 hover:bg-slate-50 hover:text-[#005756] text-slate-700 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="تصدير كشف الصرف بصيغة إكسل"
            >
              <FileSpreadsheet size={15} className="text-slate-400" />
              <span>تصدير إكسل</span>
            </button>

            {/* Unlock Button for Approved cycle (Secondary White) */}
            {isApproved && currentUserRole === 'admin' && (
              <button
                type="button"
                onClick={() => {
                  setUnlockReasonInput('');
                  setUnlockError('');
                  setShowUnlockDialog(true);
                }}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 h-9 bg-white border border-slate-200/80 hover:bg-slate-50 hover:text-[#005756] text-slate-700 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Unlock size={14} className="text-slate-400" />
                <span>فتح استثنائي</span>
              </button>
            )}
          </div>

          {/* Approve Button on Desktop/Tablet (Single Primary Teal CTA) */}
          {!isApproved && currentUserRole === 'admin' && (
            <button
              type="button"
              onClick={() => setShowApprovalDialog(true)}
              className="hidden sm:inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-[#005756] hover:bg-[#004241] text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <CheckCircle2 size={15} />
              <span>
                {currentAllocation.isExceptionallyUnlocked
                  ? 'إعادة اعتماد الميزانية'
                  : 'اعتماد الميزانية وقفل الدورة'}
              </span>
            </button>
          )}
        </div>
      </div>

      {currentAllocation.isExceptionallyUnlocked && !isApproved && (
        <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
          <div className="flex items-start sm:items-center gap-2.5">
            <ShieldAlert size={16} className="text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-semibold text-slate-800">
                الدورة مفتوحة استثنائياً للتعديل بعد الاعتماد
              </p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                سبب التعديل: &quot;{currentAllocation.unlockReason}&quot; · اتفتحت بواسطة: {currentAllocation.unlockedBy}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Compact Financial Bento First & Collapsible Batch Configuration */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 sm:p-5 shadow-none space-y-4">
        {/* Financial Numbers Strip (Compact Bento on Mobile, 3 Columns on Desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
          {/* Box 1: Available Budget */}
          <div className="order-2 sm:order-1 col-span-1 p-3 sm:p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 block">
              {isExceptionalCycle ? 'ميزانية الدورة الاستثنائية' : 'الرصيد المتاح للصرف'}
            </span>
            <div className="font-mono tabular-nums">
              <MoneyDisplay amount={currentAllocation.totalBudget} size="xl" variant="neutral" />
            </div>
            <div className="text-[11px] text-slate-400 hidden sm:block">
              {isExceptionalCycle
                ? 'سقف الصرف المخصص لهذه المنحة'
                : 'المتاح في الخزينة الموحدة للدورة'}
            </div>
          </div>

          {/* Box 2: Total Allocated / Disbursed (Full-Width Primary Row on Mobile) */}
          <div className="order-1 sm:order-2 col-span-2 sm:col-span-1 p-3.5 sm:p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 flex sm:block items-center justify-between gap-3 sm:space-y-1">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-xs font-medium text-slate-500 block">إجمالي المبالغ المقررة</span>
              <div className="font-mono tabular-nums">
                <MoneyDisplay amount={totalAllocated} size="xl" variant="neutral" />
              </div>
            </div>
            <div className="text-[11px] text-slate-600 sm:text-slate-500 tabular-nums bg-white sm:bg-transparent px-2.5 py-1 sm:p-0 rounded-lg border border-slate-200/70 sm:border-none shrink-0">
              تشمل {currentAllocation.summary.fundedCasesCount} أسرة مستحقة
            </div>
          </div>

          {/* Box 3: Unallocated Balance */}
          <div className="order-3 sm:order-3 col-span-1 p-3 sm:p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 block">المتبقي بعد التوزيع</span>
            <div className="font-mono tabular-nums">
              <MoneyDisplay
                amount={currentAllocation.summary.unallocatedBalance}
                size="xl"
                variant="neutral"
              />
            </div>
            <div className="text-[11px] text-slate-400 hidden sm:block">
              {isExceptionalCycle
                ? 'يفضل ضمن رصيد الخزينة الموحدة'
                : 'يرجع كرصيد متاح للدورة الجاية'}
            </div>
          </div>
        </div>

        {/* Field Delivery Progress Strip (Approved Cycles) */}
        {isApproved && deliveryProgressSummary.totalEligibleCount > 0 && (
          <div className="pt-3.5 border-t border-slate-100 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-800">
                  متابعة التسليم الميداني للدفعة:
                </span>
                <span className="font-semibold text-[#005756] tabular-nums">
                  تم تسليم {deliveryProgressSummary.deliveredCount} من{' '}
                  {deliveryProgressSummary.totalEligibleCount} حالة ({deliveryProgressSummary.percentage}%)
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 tabular-nums flex-wrap">
                <span>
                  منصرف فعلياً:{' '}
                  <strong className="font-mono font-semibold text-slate-800">
                    {deliveryProgressSummary.deliveredAmount.toLocaleString('ar-EG')} ج.م
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  موثّق بإثبات:{' '}
                  <strong className="font-mono font-semibold text-[#005756]">
                    {deliveryProgressSummary.documentedCount} حالة
                  </strong>
                </span>
              </div>
            </div>
            <div
              className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={deliveryProgressSummary.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="نسبة إنجاز التسليم الميداني للدفعة"
            >
              <div
                className="h-full bg-[#005756] rounded-full transition-all duration-300"
                style={{ width: `${deliveryProgressSummary.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Mobile Collapsible Summary Toggle for Cycle Settings */}
        <button
          type="button"
          onClick={() => setIsBatchConfigExpanded((prev) => !prev)}
          aria-expanded={isBatchConfigExpanded}
          className="md:hidden w-full px-3.5 py-2.5 bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/80 rounded-xl flex items-center justify-between gap-2 text-right transition-colors cursor-pointer"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <Tag size={13} className="text-[#005756] shrink-0" />
              <span>إعدادات الدورة وسقف الصرف</span>
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-0.5 tabular-nums">
              {currentAllocation.batchTitle || currentAllocation.periodLabel} · {resolvedExecutionDate} · {coverageSummaryLabel}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200/80 text-[11px] font-semibold text-[#005756] shrink-0">
            <span>{isBatchConfigExpanded ? 'إخفاء' : isApproved ? 'التفاصيل' : 'تعديل'}</span>
            <ChevronDown
              size={13}
              className={`transition-transform duration-200 ${
                isBatchConfigExpanded ? 'rotate-180' : ''
              }`}
            />
          </span>
        </button>

        {/* Batch Configuration & Budget Cap Controls (Collapsed by Default on Mobile, Visible on Desktop) */}
        <div
          className={`${
            isBatchConfigExpanded ? 'block' : 'hidden md:block'
          } space-y-4 pt-3.5 border-t border-slate-100`}
        >
          {/* Batch Title, Execution Date, Coverage / Exceptional Mode */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            {/* Field 1: Batch Title */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Tag size={13} className="text-slate-400" />
                <span>اسم الدورة / الدفعة</span>
              </label>
              {isApproved ? (
                <div className="h-10 px-3 py-2 bg-slate-50/80 border border-slate-200/80 rounded-xl text-sm font-medium text-slate-900 flex items-center">
                  {currentAllocation.batchTitle || currentAllocation.periodLabel}
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={currentAllocation.batchTitle || ''}
                    onChange={(e) =>
                      updateAllocationBatchConfig(currentPeriod, { batchTitle: e.target.value })
                    }
                    placeholder="مثال: كفالات نوفمبر 2026 أو منحة دخول المدارس"
                    className="w-full h-10 px-3 py-2 bg-slate-50/60 focus:bg-white border border-slate-200/80 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15 transition-colors"
                  />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">مقترحات:</span>
                    {(isExceptionalCycle
                      ? [
                          'منحة دخول المدارس',
                          'كسوة العيد',
                          'إعانة شتاء طارئة',
                          'منحة شهر رمضان المبارك',
                        ]
                      : [
                          `كفالات ${currentAllocation.periodLabel}`,
                          `دفعة مجمعة ${currentAllocation.periodLabel}`,
                          'إعانة شتاء طارئة',
                        ]
                    ).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => updateAllocationBatchConfig(currentPeriod, { batchTitle: preset })}
                        className="text-[11px] px-2.5 py-0.5 rounded-lg bg-white border border-slate-200/80 hover:bg-slate-50 hover:text-[#005756] text-slate-600 transition-colors cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Field 2: Execution Date */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Clock size={13} className="text-slate-400" />
                <span>موعد الصرف المقرر</span>
              </label>
              {isApproved ? (
                <div className="h-10 px-3 py-2 bg-slate-50/80 border border-slate-200/80 rounded-xl text-sm font-mono tabular-nums font-medium text-slate-900 flex items-center">
                  {resolvedExecutionDate}
                </div>
              ) : (
                <input
                  type="date"
                  value={resolvedExecutionDate}
                  onChange={(e) =>
                    updateAllocationBatchConfig(currentPeriod, {
                      periodDate: e.target.value,
                      executionDate: e.target.value,
                    })
                  }
                  className="w-full h-10 px-3 py-2 bg-slate-50/60 focus:bg-white border border-slate-200/80 rounded-xl text-sm font-mono tabular-nums font-medium text-slate-900 focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15 transition-colors cursor-pointer"
                />
              )}
            </div>

            {/* Field 3: Coverage Months (Regular) OR Distribution Mode (Exceptional) */}
            <div className="md:col-span-4 space-y-1.5">
              {isExceptionalCycle ? (
                <>
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Layers size={13} className="text-slate-400" />
                    <span>نظام المنحة الاستثنائية</span>
                  </label>
                  {isApproved ? (
                    <div className="h-10 px-3 py-2 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 flex items-center justify-between gap-2">
                      <span>
                        {currentAllocation.exceptionalDistributionMode === 'split_budget'
                          ? 'توزيع ميزانية محددة بالتساوي'
                          : 'مبلغ موحد لكل أسرة'}
                      </span>
                      {currentAllocation.exceptionalDistributionMode !== 'split_budget' &&
                        currentAllocation.flatAmountPerCase && (
                          <span className="font-mono tabular-nums text-[#005756]">
                            {currentAllocation.flatAmountPerCase.toLocaleString('ar-EG')} ج.م
                          </span>
                        )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateAllocationBatchConfig(currentPeriod, {
                              exceptionalDistributionMode: 'flat_per_case',
                              flatAmountPerCase: currentAllocation.flatAmountPerCase || 1000,
                            })
                          }
                          className={`h-10 px-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center border whitespace-nowrap ${
                            (currentAllocation.exceptionalDistributionMode || 'flat_per_case') ===
                            'flat_per_case'
                              ? 'bg-[#005756] text-white border-[#005756]'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80'
                          }`}
                        >
                          مبلغ موحد للأسرة
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateAllocationBatchConfig(currentPeriod, {
                              exceptionalDistributionMode: 'split_budget',
                            })
                          }
                          className={`h-10 px-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center border whitespace-nowrap ${
                            currentAllocation.exceptionalDistributionMode === 'split_budget'
                              ? 'bg-[#005756] text-white border-[#005756]'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80'
                          }`}
                        >
                          تقسيم الميزانية
                        </button>
                      </div>
                      {(currentAllocation.exceptionalDistributionMode || 'flat_per_case') ===
                        'flat_per_case' && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 shrink-0">قيمة المنحة:</span>
                          <input
                            type="number"
                            min={50}
                            step={50}
                            value={currentAllocation.flatAmountPerCase ?? 1000}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              const activeCount = Math.max(
                                1,
                                currentAllocation.items.filter((i) => !i.isExcluded && !i.isVisitOverdue)
                                  .length
                              );
                              updateAllocationBatchConfig(currentPeriod, {
                                flatAmountPerCase: val,
                                totalBudget: val * activeCount,
                              });
                            }}
                            className="w-28 h-8 px-2.5 bg-slate-50/60 focus:bg-white border border-slate-200/80 rounded-lg text-xs font-mono tabular-nums font-semibold text-slate-900 focus:outline-hidden focus:border-[#005756]"
                          />
                          <span className="text-[11px] text-slate-500">ج.م / أسرة</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Repeat size={13} className="text-slate-400" />
                    <span>عدد شهور الصرف</span>
                  </label>
                  {isApproved ? (
                    <div className="h-10 px-3 py-2 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 flex items-center">
                      {(currentAllocation.coverageMonths || 1) === 1
                        ? 'شهر واحد'
                        : currentAllocation.coverageMonths === 2
                        ? 'شهرين'
                        : `${currentAllocation.coverageMonths} شهور`}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { value: 1, label: 'شهر واحد' },
                        { value: 2, label: 'شهرين' },
                        { value: 3, label: '3 شهور' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            updateAllocationBatchConfig(currentPeriod, { coverageMonths: option.value })
                          }
                          className={`h-10 px-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center border whitespace-nowrap ${
                            (currentAllocation.coverageMonths || 1) === option.value
                              ? 'bg-[#005756] text-white border-[#005756]'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Budget Setting Controls (Draft Mode) */}
          {!isApproved && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-xs font-medium text-slate-500 ml-1">سقف الصرف:</span>
                {[
                  { label: 'كامل الرصيد المتاح', val: actualUnrestricted },
                  { label: '50 ألف', val: 50000 },
                  { label: '100 ألف', val: 100000 },
                  { label: '150 ألف', val: 150000 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setBudgetInput(preset.val);
                      generateOrRefreshAllocation(currentPeriod, preset.val, undefined, undefined, {
                        strategy: currentStrategy,
                      });
                      toast.success('تمت إعادة توزيع مقترح الميزانية تلقائياً');
                    }}
                    className={`px-3 py-1.5 rounded-xl font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                      budgetInput === preset.val
                        ? 'bg-[#005756] text-white border-[#005756]'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}

                {!isCustomBudgetOpen ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomBudgetOpen(true);
                      setCustomBudgetValue(budgetInput);
                    }}
                    className="px-3 py-1.5 rounded-xl font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    مبلغ تاني...
                  </button>
                ) : (
                  <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-xl border border-[#005756]/40">
                    <div className="w-24">
                      <AmountInput
                        value={customBudgetValue}
                        onChange={(v) => setCustomBudgetValue(v)}
                        size="sm"
                        currency=""
                        autoFocus
                        className="border-none bg-transparent"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyCustomBudget}
                      className="p-1.5 rounded-lg bg-[#005756] text-white cursor-pointer"
                      aria-label="تطبيق المبلغ"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCustomBudgetOpen(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                      aria-label="إلغاء"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleResetToAutoProposal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 hover:text-[#005756] text-slate-700 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto whitespace-nowrap"
                title="إعادة توزيع المقترح تلقائياً ومسح التعديلات اليدوية"
              >
                <RefreshCw size={13} className="text-slate-400" />
                <span>إعادة التوزيع التلقائي</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile Primary Approve Action (Positioned After Reviewing Financial Totals) */}
        {!isApproved && currentUserRole === 'admin' && (
          <button
            type="button"
            onClick={() => setShowApprovalDialog(true)}
            className="sm:hidden w-full h-10 bg-[#005756] hover:bg-[#004241] text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 size={15} />
            <span>
              {currentAllocation.isExceptionallyUnlocked
                ? 'إعادة اعتماد الميزانية'
                : 'اعتماد الميزانية وقفل الدورة'}
            </span>
          </button>
        )}
      </div>

      {/* 3. Disbursement Roster (Clean Focused Table / Mobile Cards) */}
      <div className="space-y-3">
        {/* Search & Priority Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-none">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="دوّر بالاسم، الكود، أو الرقم القومي..."
              className="w-full h-9 pl-8 pr-9 bg-slate-50/60 focus:bg-white border border-slate-200/80 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="مسح البحث"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-xs font-medium text-slate-500 ml-1">تصفية:</span>
            {[
              { id: 'all', label: `الكل (${currentAllocation.items.length})` },
              { id: 'critical', label: 'حرجة' },
              { id: 'high', label: 'عالية' },
              { id: 'medium', label: 'متوسطة' },
              { id: 'overdue', label: 'زيارة متأخرة' },
              { id: 'excluded', label: 'مستبعدة' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedPriorityFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold border transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                  selectedPriorityFilter === tab.id
                    ? 'bg-[#005756] text-white border-[#005756]'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Table View (>= 1024px) */}
        <div className="hidden lg:block bg-white rounded-xl border border-slate-200/80 shadow-none overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[980px] text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold">
                  <th className="py-3.5 px-2 text-center w-9" aria-label="توسيع التفاصيل" />
                  <th className="py-3.5 px-2 text-center w-9">م</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">الأسرة والكود</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">الرقم القومي</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">الباحث المسؤول</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">الأولوية والتقييم</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">العجز الشهري</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">المبلغ المقرر</th>
                  <th className="py-3.5 px-4">سبب التخصيص</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">
                    {isApproved ? 'حالة التسليم الميداني' : 'إجراءات'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-500 font-medium">
                      مفيش حالات مطابقة للبحث أو التصفية
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const c = caseMap.get(item.caseId);
                    const isExcluded = item.isExcluded;
                    const priorityMeta = getPriorityMeta(item.priority);
                    const isExpanded = Boolean(expandedCaseIds[item.caseId]);
                    const historyList = approvedHistoryByCaseId.get(item.caseId) || [];
                    const totalApprovedHistory = historyList.reduce((s, h) => s + h.amount, 0);
                    const notesInfo = notesSummaryByCaseId.get(item.caseId) || {
                      count: 0,
                      latestNote: undefined,
                    };
                    const custodyItemId = `cycle-${currentAllocation.id}-${item.id}`;
                    const proof =
                      getDeliveryProof(item.caseId, currentAllocation.period, custodyItemId) ||
                      item.deliveryProof;
                    const isDelivered =
                      deliveredCustodyIds.includes(custodyItemId) || Boolean(proof);

                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          className={`transition-colors ${
                            isExcluded
                              ? 'bg-slate-50/70 text-slate-400'
                              : isExpanded
                              ? 'bg-slate-50/60'
                              : 'hover:bg-slate-50/70'
                          }`}
                        >
                          {/* Expand Toggle */}
                          <td className="py-3.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => toggleExpandCase(item.caseId)}
                              aria-expanded={isExpanded}
                              aria-label={
                                isExpanded
                                  ? `طي سجل وملاحظات ${item.caseName}`
                                  : `عرض سجل الصرف والملاحظات لـ ${item.caseName}`
                              }
                              title="السجل المالي السابق والملاحظات"
                              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                isExpanded
                                  ? 'text-[#005756] bg-[#005756]/10'
                                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <ChevronDown
                                size={15}
                                className={`transition-transform duration-150 ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                          </td>

                          {/* Serial */}
                          <td className="py-3.5 px-2 text-center text-slate-400 font-mono tabular-nums">
                            {idx + 1}
                          </td>

                          {/* Code & Full Name */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span
                                onClick={() => openCaseDetails(item.caseId, 'profile')}
                                className={`font-semibold cursor-pointer hover:text-[#005756] hover:underline ${
                                  isExcluded ? 'text-slate-500' : 'text-slate-900'
                                }`}
                              >
                                {item.caseName}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono tabular-nums">{item.caseCode}</span>
                              {c?.secondaryName && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>{c.secondaryName}</span>
                                </>
                              )}
                              {item.isVisitOverdue && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-rose-600 font-medium">زيارة متأخرة</span>
                                </>
                              )}
                            </div>
                          </td>

                          {/* National ID */}
                          <td className="py-3.5 px-3 whitespace-nowrap font-mono tabular-nums text-slate-700">
                            {c?.nationalId || 'مرفق بالملف'}
                          </td>

                          {/* Assigned Researcher */}
                          <td className="py-3.5 px-3 whitespace-nowrap font-medium text-slate-700">
                            {c?.assignedResearcher || 'مش متحدد'}
                          </td>

                          {/* Priority & Score */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono tabular-nums font-semibold text-slate-700">
                                {item.score}/100
                              </span>
                              <span className="text-slate-300" aria-hidden="true">·</span>
                              <span className={`text-[11px] ${priorityMeta.className}`}>
                                {priorityMeta.label}
                              </span>
                            </div>
                          </td>

                          {/* Gap */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <MoneyDisplay
                              amount={item.financialGap}
                              size="sm"
                              variant={isExcluded ? 'muted' : 'neutral'}
                            />
                          </td>

                          {/* Approved Amount */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {isExcluded ? (
                              <span className="text-xs font-medium text-slate-400 inline-flex items-center gap-1.5">
                                <MoneyDisplay amount={0} size="sm" variant="muted" />
                                <span>· مستبعد</span>
                              </span>
                            ) : isApproved || !permissions.canEditAllocation ? (
                              <div className="flex items-center gap-1.5">
                                <MoneyDisplay amount={item.approvedAmount} size="md" variant="neutral" />
                                {item.isManuallyAdjusted && (
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    · معدّل
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <div className="flex items-center">
                                  <input
                                    type="number"
                                    min={0}
                                    step={50}
                                    value={item.approvedAmount === 0 ? '' : item.approvedAmount}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = Math.max(0, Number(e.target.value) || 0);
                                      updateAllocationItem(currentPeriod, item.id, {
                                        approvedAmount: val,
                                        isManuallyAdjusted: true,
                                      });
                                    }}
                                    className="w-24 px-2.5 py-1.5 bg-slate-50/80 hover:bg-white focus:bg-white border border-slate-200/80 focus:border-[#005756] rounded-lg text-xs font-mono tabular-nums font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#005756]/15 transition-colors"
                                    title="اكتب المبلغ المقرر صرفه ليُحفظ تلقائياً"
                                  />
                                  <span className="mr-1.5 text-[11px] font-medium text-slate-500">ج.م</span>
                                </div>
                                {item.isManuallyAdjusted && (
                                  <span
                                    className="text-[11px] text-slate-500 font-medium shrink-0"
                                    title="تم تعديل المبلغ يدوياً"
                                  >
                                    معدّل
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Reasoning */}
                          <td className="py-3.5 px-4 text-slate-600 text-[11px] leading-relaxed max-w-[280px]">
                            {isExcluded ? (
                              <span className="text-slate-500 font-medium">
                                سبب الاستبعاد: {item.exclusionReason}
                              </span>
                            ) : (
                              item.reasoning
                            )}
                          </td>

                          {/* Actions / Field Delivery Status */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {!isApproved && permissions.canEditAllocation ? (
                              <div className="flex items-center justify-center gap-1.5">
                                {!isExcluded ? (
                                  <button
                                    type="button"
                                    onClick={() => setExcludingItemId(item.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50/70 rounded-lg transition-colors cursor-pointer"
                                    title="استبعاد مؤقت من الدفعة"
                                  >
                                    <Ban size={15} />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => toggleExcludeItem(currentPeriod, item.id, false)}
                                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200/80 hover:border-[#005756]/40 hover:text-[#005756] rounded-lg cursor-pointer transition-colors"
                                  >
                                    إلغاء الاستبعاد
                                  </button>
                                )}
                              </div>
                            ) : isExcluded || item.approvedAmount <= 0 ? (
                              <span className="inline-flex items-center justify-center gap-1 text-[11px] text-slate-400 font-medium">
                                <span>مستبعد من الصرف</span>
                              </span>
                            ) : isApproved ? (
                              proof ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewProofTarget({
                                      caseName: item.caseName,
                                      caseCode: item.caseCode,
                                      amount: item.approvedAmount,
                                      batchTitle:
                                        currentAllocation.batchTitle ||
                                        currentAllocation.periodLabel ||
                                        currentPeriod,
                                      researcherName: c?.assignedResearcher,
                                      payoutMethod: c
                                        ? getEffectivePayoutMethod(c.payoutMethod)
                                        : undefined,
                                      walletNumber: c?.walletNumber,
                                      proof,
                                    })
                                  }
                                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-[#005756]/8 hover:bg-[#005756]/15 text-[#005756] border border-[#005756]/25 text-[11px] font-bold transition-colors cursor-pointer"
                                  title="اضغط لمعاينة صورة وتفاصيل إثبات التسليم"
                                >
                                  <FileCheck2 size={12} className="shrink-0" />
                                  <span>موثّق بإثبات</span>
                                </button>
                              ) : isDelivered ? (
                                <span className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-slate-200/70 text-slate-700 border border-slate-300/80 text-[11px] font-semibold">
                                  <CheckCircle2 size={12} className="text-slate-700 shrink-0" />
                                  <span>تم التسليم</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200/80 text-[11px] font-medium">
                                  <Clock size={11} className="text-slate-400 shrink-0" />
                                  <span>بانتظار التسليم</span>
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center justify-center gap-1 text-[11px] text-slate-500 font-medium">
                                <Lock size={12} className="text-slate-400" />
                                <span>معتمد</span>
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* Expandable Decision-Support Row (Calm UI, Zero Cards-Within-Cards) */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <tr className="bg-slate-50/70">
                              <td colSpan={10} className="p-0 border-t border-slate-200/70">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={collapseTransition}
                                  className="overflow-hidden"
                                >
                                  <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-200/80">
                                    {/* Section 1: Previous Approved Disbursement History */}
                                    <div className="pb-3 md:pb-0 md:pl-6 space-y-2.5">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                                          <History size={14} className="text-slate-400 shrink-0" />
                                          <span>سجل الصرف المالي السابق</span>
                                          {historyList.length > 0 && (
                                            <span className="text-[11px] font-normal text-slate-500 tabular-nums">
                                              ({historyList.length} دورات معتمدة ·{' '}
                                              {totalApprovedHistory.toLocaleString('ar-EG')} ج.م)
                                            </span>
                                          )}
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => openCaseDetails(item.caseId, 'financials')}
                                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#005756] hover:underline cursor-pointer shrink-0"
                                        >
                                          <span>كشف الحساب</span>
                                          <ArrowLeft size={12} />
                                        </button>
                                      </div>

                                      {historyList.length > 0 ? (
                                        <div className="divide-y divide-slate-200/60">
                                          {historyList.slice(0, 4).map((entry) => (
                                            <div
                                              key={entry.id}
                                              className="py-1.5 flex items-center justify-between gap-3 text-[11px]"
                                            >
                                              <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="font-medium text-slate-800 truncate">
                                                  {entry.batchTitle}
                                                </span>
                                                {entry.cycleType === 'exceptional' && (
                                                  <span className="text-[10px] text-slate-500 shrink-0">
                                                    · استثنائية
                                                  </span>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-3 shrink-0">
                                                <span className="font-mono tabular-nums text-slate-500">
                                                  {entry.date}
                                                </span>
                                                <MoneyDisplay
                                                  amount={entry.amount}
                                                  size="sm"
                                                  variant="neutral"
                                                />
                                              </div>
                                            </div>
                                          ))}
                                          {historyList.length > 4 && (
                                            <div className="pt-1.5 text-[11px] text-slate-500">
                                              + {historyList.length - 4} دورات سابقة أخرى في كشف الحساب
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="text-[11px] text-slate-500 leading-relaxed space-y-1">
                                          <p>لسه مفيش دورات معتمدة منصرفة للحالة في السجل الحالي.</p>
                                          {c && c.historicalAssistanceTotal > 0 && (
                                            <p className="text-slate-600 font-medium tabular-nums">
                                              إجمالي المساعدات التاريخية المسجلة بالملف:{' '}
                                              <span className="font-mono font-semibold text-slate-800">
                                                {c.historicalAssistanceTotal.toLocaleString('ar-EG')} ج.م
                                              </span>
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Section 2: Quick Notes Summary & Deep-Link */}
                                    <div className="pt-3 md:pt-0 md:pr-6 flex flex-col justify-between gap-2.5">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                                          <MessageSquareText
                                            size={14}
                                            className="text-slate-400 shrink-0"
                                          />
                                          <span>الملاحظات السريعة</span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => openCaseDetails(item.caseId, 'notes')}
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200/80 hover:border-[#005756]/40 hover:text-[#005756] text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer shrink-0 tabular-nums"
                                        >
                                          <span>الملاحظات ({notesInfo.count})</span>
                                          <ArrowLeft size={12} />
                                        </button>
                                      </div>

                                      {notesInfo.latestNote ? (
                                        <div className="space-y-1.5">
                                          <p className="text-xs text-slate-700 font-medium line-clamp-1">
                                            {notesInfo.latestNote.content}
                                          </p>
                                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="font-mono tabular-nums">
                                                {notesInfo.latestNote.createdAt}
                                              </span>
                                              <span aria-hidden="true">·</span>
                                              <span>{notesInfo.latestNote.authorName}</span>
                                              {notesInfo.latestNote.isPrivate && (
                                                <>
                                                  <span aria-hidden="true">·</span>
                                                  <span>خاصة بيا</span>
                                                </>
                                              )}
                                              {notesInfo.latestNote.category === 'urgent' && (
                                                <>
                                                  <span aria-hidden="true">·</span>
                                                  <span className="text-rose-600 font-semibold">
                                                    عاجل
                                                  </span>
                                                </>
                                              )}
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => openCaseDetails(item.caseId, 'notes')}
                                              className="text-[#005756] font-semibold hover:underline cursor-pointer inline-flex items-center gap-1"
                                            >
                                              <span>عرض الملاحظات بالكامل</span>
                                              <ArrowLeft size={11} />
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                                          <span>مفيش ملاحظات مسجلة على الحالة لسه.</span>
                                          <button
                                            type="button"
                                            onClick={() => openCaseDetails(item.caseId, 'notes')}
                                            className="text-[#005756] font-semibold hover:underline cursor-pointer inline-flex items-center gap-1 shrink-0"
                                          >
                                            <span>إضافة ملاحظة</span>
                                            <ArrowLeft size={11} />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile & Tablet Card View (< 1024px) */}
        <div className="lg:hidden space-y-3">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200/80 text-slate-500 font-medium text-xs">
              مفيش حالات مطابقة للبحث أو التصفية
            </div>
          ) : (
            filteredItems.map((item) => {
              const c = caseMap.get(item.caseId);
              const isExcluded = item.isExcluded;
              const priorityMeta = getPriorityMeta(item.priority);
              const isExpanded = Boolean(expandedCaseIds[item.caseId]);
              const historyList = approvedHistoryByCaseId.get(item.caseId) || [];
              const notesInfo = notesSummaryByCaseId.get(item.caseId) || {
                count: 0,
                latestNote: undefined,
              };
              const custodyItemId = `cycle-${currentAllocation.id}-${item.id}`;
              const proof =
                getDeliveryProof(item.caseId, currentAllocation.period, custodyItemId) ||
                item.deliveryProof;
              const isDelivered =
                deliveredCustodyIds.includes(custodyItemId) || Boolean(proof);

              return (
                <div
                  key={item.id}
                  className={`bg-white border border-slate-200/80 rounded-xl p-4 shadow-none space-y-3 transition-colors ${
                    isExcluded ? 'bg-slate-50/70 opacity-80' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          onClick={() => openCaseDetails(item.caseId, 'profile')}
                          className="font-semibold text-sm text-slate-900 cursor-pointer hover:text-[#005756] hover:underline"
                        >
                          {item.caseName}
                        </span>
                        {isApproved && !isExcluded && item.approvedAmount > 0 && (
                          proof ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewProofTarget({
                                  caseName: item.caseName,
                                  caseCode: item.caseCode,
                                  amount: item.approvedAmount,
                                  batchTitle:
                                    currentAllocation.batchTitle ||
                                    currentAllocation.periodLabel ||
                                    currentPeriod,
                                  researcherName: c?.assignedResearcher,
                                  payoutMethod: c
                                    ? getEffectivePayoutMethod(c.payoutMethod)
                                    : undefined,
                                  walletNumber: c?.walletNumber,
                                  proof,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#005756]/8 hover:bg-[#005756]/15 text-[#005756] border border-[#005756]/25 text-[10px] font-bold transition-colors cursor-pointer"
                              title="اضغط لمعاينة صورة وتفاصيل إثبات التسليم"
                            >
                              <FileCheck2 size={11} className="shrink-0" />
                              <span>موثّق بإثبات</span>
                            </button>
                          ) : isDelivered ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 border border-slate-300/80 text-[10px] font-semibold">
                              <CheckCircle2 size={10} className="text-slate-700 shrink-0" />
                              <span>تم التسليم</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/80 text-[10px] font-medium">
                              <Clock size={10} className="text-slate-400 shrink-0" />
                              <span>بانتظار التسليم</span>
                            </span>
                          )
                        )}
                        {item.isVisitOverdue && (
                          <span className="text-rose-600 text-[11px] font-medium">
                            · زيارة متأخرة
                          </span>
                        )}
                        {item.isManuallyAdjusted && (
                          <span className="text-slate-500 text-[11px] font-medium">
                            · معدّل يدوياً
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono tabular-nums">{item.caseCode}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          الرقم القومي:{' '}
                          <span className="font-mono tabular-nums">{c?.nationalId || 'مرفق'}</span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>الباحث: {c?.assignedResearcher || 'مش متحدد'}</span>
                      </div>
                    </div>

                    <div className="text-left shrink-0 text-[11px]">
                      <span className={priorityMeta.className}>{priorityMeta.label}</span>
                      <span className="block font-mono tabular-nums text-slate-500 mt-0.5">
                        {item.score}/100
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/70">
                      <span className="text-[11px] text-slate-500 block font-medium">
                        العجز الشهري
                      </span>
                      <div className="mt-0.5 font-mono tabular-nums">
                        <MoneyDisplay
                          amount={item.financialGap}
                          size="sm"
                          variant={isExcluded ? 'muted' : 'neutral'}
                        />
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/70">
                      <span className="text-[11px] text-slate-500 block font-medium">
                        المبلغ المقرر
                      </span>
                      <div className="mt-1">
                        {isExcluded ? (
                          <span className="text-slate-400 text-xs font-medium">مستبعد</span>
                        ) : isApproved || !permissions.canEditAllocation ? (
                          <div className="font-mono tabular-nums">
                            <MoneyDisplay amount={item.approvedAmount} size="sm" variant="neutral" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              step={50}
                              value={item.approvedAmount === 0 ? '' : item.approvedAmount}
                              placeholder="0"
                              onChange={(e) => {
                                const val = Math.max(0, Number(e.target.value) || 0);
                                updateAllocationItem(currentPeriod, item.id, {
                                  approvedAmount: val,
                                  isManuallyAdjusted: true,
                                });
                              }}
                              className="w-full px-2 py-1 bg-white border border-slate-200/80 focus:border-[#005756] rounded-lg text-xs font-mono tabular-nums font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#005756]/15"
                              title="اكتب المبلغ المقرر صرفه"
                            />
                            <span className="text-[11px] font-medium text-slate-500 shrink-0">
                              ج.م
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                    {isExcluded ? (
                      <span className="text-slate-500 font-medium">
                        سبب الاستبعاد: {item.exclusionReason}
                      </span>
                    ) : (
                      item.reasoning
                    )}
                  </div>

                  {/* Mobile Expandable Toggle: Previous Disbursements & Quick Notes */}
                  <div className="border-t border-slate-100 pt-2.5">
                    <button
                      type="button"
                      onClick={() => toggleExpandCase(item.caseId)}
                      aria-expanded={isExpanded}
                      className="w-full flex items-center justify-between gap-2 text-xs font-semibold text-slate-700 hover:text-[#005756] transition-colors cursor-pointer"
                    >
                      <span className="inline-flex items-center gap-1.5 tabular-nums">
                        <History size={13} className="text-slate-400" />
                        <span>السجل السابق والملاحظات ({notesInfo.count})</span>
                      </span>
                      <ChevronDown
                        size={15}
                        className={`text-slate-400 transition-transform duration-150 ${
                          isExpanded ? 'rotate-180 text-[#005756]' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={collapseTransition}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 text-xs">
                            {/* Previous Disbursements */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-slate-700">
                                  سجل الصرف السابق (الدورات المعتمدة)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openCaseDetails(item.caseId, 'financials')}
                                  className="text-[#005756] font-semibold inline-flex items-center gap-0.5 cursor-pointer"
                                >
                                  <span>كشف الحساب</span>
                                  <ArrowLeft size={11} />
                                </button>
                              </div>
                              {historyList.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                  {historyList.slice(0, 3).map((entry) => (
                                    <div
                                      key={entry.id}
                                      className="py-1.5 flex items-center justify-between gap-2 text-[11px]"
                                    >
                                      <span className="text-slate-700 font-medium truncate">
                                        {entry.batchTitle}
                                      </span>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="font-mono tabular-nums text-slate-400">
                                          {entry.date}
                                        </span>
                                        <MoneyDisplay
                                          amount={entry.amount}
                                          size="sm"
                                          variant="neutral"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-slate-500">
                                  لسه مفيش دورات معتمدة منصرفة في السجل الحالي
                                  {c && c.historicalAssistanceTotal > 0
                                    ? ` · الصرف التاريخي بالملف: ${c.historicalAssistanceTotal.toLocaleString('ar-EG')} ج.م`
                                    : ''}
                                </p>
                              )}
                            </div>

                            {/* Quick Notes Deep-Link */}
                            <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-semibold text-slate-700 inline-flex items-center gap-1">
                                  <MessageSquareText size={12} className="text-slate-400" />
                                  <span>الملاحظات السريعة</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openCaseDetails(item.caseId, 'notes')}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#005756] hover:underline cursor-pointer tabular-nums"
                                >
                                  <span>عرض الملاحظات ({notesInfo.count})</span>
                                  <ArrowLeft size={11} />
                                </button>
                              </div>
                              {notesInfo.latestNote ? (
                                <div className="space-y-0.5">
                                  <p className="text-[11px] text-slate-700 line-clamp-1">
                                    {notesInfo.latestNote.content}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-mono tabular-nums">
                                    {notesInfo.latestNote.createdAt} · {notesInfo.latestNote.authorName}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-[11px] text-slate-500">
                                  مفيش ملاحظات مسجلة على الحالة لسه.
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {!isApproved && permissions.canEditAllocation && (
                    <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-slate-100">
                      {!isExcluded ? (
                        <button
                          type="button"
                          onClick={() => setExcludingItemId(item.id)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-rose-600 bg-white hover:bg-rose-50/70 text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-rose-200/80"
                          title="استبعاد مؤقت من الدفعة"
                        >
                          <Ban size={13} />
                          <span>استبعاد مؤقت من الدفعة</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleExcludeItem(currentPeriod, item.id, false)}
                          className="w-full py-1.5 bg-white text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 hover:text-[#005756] transition-colors cursor-pointer border border-slate-200/80"
                        >
                          إلغاء الاستبعاد
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modals */}

      {/* Exclusion Reason Modal */}
      {excludingItemId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">سبب الاستبعاد من الصرف</h3>
                <p className="text-xs text-slate-500 mt-1">توثيق سبب الاستبعاد المؤقت من الدفعة الحالية</p>
              </div>
              <button
                type="button"
                onClick={() => setExcludingItemId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                aria-label="إغلاق"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                rows={3}
                value={exclusionReasonInput}
                onChange={(e) => setExclusionReasonInput(e.target.value)}
                placeholder="اكتب سبب الاستبعاد بشكل واضح..."
                className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15"
              />
              <div className="flex justify-end gap-2 text-xs pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setExcludingItemId(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmExclusion}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  تأكيد الاستبعاد
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Approval Confirmation Modal */}
      {showApprovalDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-800">اعتماد الميزانية وقفل الدورة</h3>
                <p className="text-xs text-slate-500 mt-1">مراجعة المبالغ وتأكيد الاعتماد النهائي</p>
              </div>
              <button
                type="button"
                onClick={() => setShowApprovalDialog(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                aria-label="إغلاق"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                أنت على وشك اعتماد كشف الصرف لدورة{' '}
                <strong>{currentAllocation.batchTitle || currentAllocation.periodLabel}</strong>{' '}
                بإجمالي{' '}
                <strong className="tabular-nums font-mono">
                  {currentAllocation.summary.totalAllocated.toLocaleString('ar-EG')} ج.م
                </strong>{' '}
                لـ <strong>{currentAllocation.summary.fundedCasesCount} أسرة</strong>.
              </p>
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs space-y-3">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5 pb-1.5 border-b border-slate-200/80">
                  <ShieldCheck size={15} className="text-slate-400" />
                  <span>ملخص الصرف والرصيد:</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200/80">
                    <span className="text-slate-500 font-medium block mb-1">يُخصم من الخزينة الموحدة:</span>
                    <MoneyDisplay
                      amount={currentAllocation.summary.totalAllocated}
                      size="md"
                      variant="neutral"
                    />
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200/80">
                    <span className="text-slate-500 font-medium block mb-1">
                      {isExceptionalCycle ? 'المتبقي بالخزينة الموحدة:' : 'المتبقي للدورة الجاية:'}
                    </span>
                    <MoneyDisplay
                      amount={currentAllocation.summary.unallocatedBalance}
                      size="md"
                      variant="neutral"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1 gap-2">
                  <span className="text-slate-700 font-semibold shrink-0">اسم المسؤول المعتمد:</span>
                  <input
                    type="text"
                    value={approverName}
                    onChange={(e) => setApproverName(e.target.value)}
                    className="p-1.5 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-slate-900 w-60 focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 text-xs pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowApprovalDialog(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApproval}
                  className="px-5 py-2 bg-[#005756] hover:bg-[#004241] text-white font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  تأكيد الاعتماد وقفل الدورة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exceptional Unlock Confirmation Modal */}
      {showUnlockDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-800">
                  فتح الدورة المعتمدة للتعديل
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  دورة: {currentAllocation.periodLabel} · سجل المراجعة
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUnlockDialog(false);
                  setUnlockReasonInput('');
                  setUnlockError('');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                aria-label="إغلاق"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-[11px] text-slate-500 bg-slate-50 rounded-xl border border-slate-200/80 px-3.5 py-2.5 leading-relaxed">
                أول ما تفتح التعديل، الدورة هترجع لحالة (مسودة) عشان تقدر تعدل المبالغ، وهيتسجل اسمك وسبب التعديل في سجل المراجعة.
              </p>

              {unlockError && (
                <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium">
                  {unlockError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <ShieldAlert size={14} className="text-slate-400" />
                  <span>سبب فتح التعديل <span className="text-rose-500">*</span></span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={unlockReasonInput}
                  onChange={(e) => {
                    setUnlockReasonInput(e.target.value);
                    setUnlockError('');
                  }}
                  placeholder="اكتب سبب فتح الميزانية للتعديل..."
                  className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 text-xs pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowUnlockDialog(false);
                    setUnlockReasonInput('');
                    setUnlockError('');
                  }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUnlock}
                  className="px-5 py-2 bg-[#005756] hover:bg-[#004241] text-white font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Unlock size={14} />
                  <span>تأكيد فتح التعديل</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Disbursement Cycle Modal */}
      <NewAllocationCycleModal
        isOpen={isNewCycleModalOpen}
        onClose={() => setIsNewCycleModalOpen(false)}
        unrestrictedBalance={actualUnrestricted}
        cases={cases}
        scoringConfig={scoringConfig}
        onCreateCycle={(data) => {
          const created = createAllocationCycle(data);
          setCurrentPeriod(created.period);
          setBudgetInput(created.totalBudget);
          toast.success(`تم فتح دورة «${created.batchTitle}» وتجهيز كشف الصرف`);
        }}
      />

      {/* Delivery Proof Preview Modal */}
      <DeliveryProofPreviewModal
        target={previewProofTarget}
        onClose={() => setPreviewProofTarget(null)}
      />
    </div>
  );
}
