'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import { useToast } from '@/context/toast-context';
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
} from 'lucide-react';
import { PriorityLevel } from '@/types';
import { exportMonthlyAllocationToExcel } from '@/services/excel-export';
import { MoneyDisplay } from '@/components/common/money-display';
import { AmountInput } from '@/components/common/amount-input';

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
    currentPeriod,
    setCurrentPeriod,
    allocations,
    currentAllocation,
    generateOrRefreshAllocation,
    updateAllocationBatchConfig,
    updateAllocationItem,
    toggleExcludeItem,
    approveAllocation,
    unlockAllocation,
    currentUserRole,
    currentSessionProfile,
    cases,
    permissions,
    setSelectedCaseId,
    metrics,
  } = useApp();

  const actualUnrestricted = metrics?.unrestrictedDonationsBalance ?? 113000;

  const [budgetInput, setBudgetInput] = useState<number>(
    currentAllocation?.totalBudget ?? actualUnrestricted
  );
  const [isCustomBudgetOpen, setIsCustomBudgetOpen] = useState(false);
  const [customBudgetValue, setCustomBudgetValue] = useState<number>(
    currentAllocation?.totalBudget ?? actualUnrestricted
  );

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
  const { toast } = useToast();

  // Sync budget input on period change
  const [prevPeriod, setPrevPeriod] = useState(currentPeriod);
  if (prevPeriod !== currentPeriod) {
    setPrevPeriod(currentPeriod);
    const targetAlloc = allocations[currentPeriod];
    if (targetAlloc?.totalBudget) {
      setBudgetInput(targetAlloc.totalBudget);
    }
  }

  // Case Map for fast lookups
  const caseMap = useMemo(() => new Map(cases.map((c) => [c.id, c])), [cases]);

  const isApproved = currentAllocation?.status === 'approved';
  const currentStrategy = currentAllocation?.allocationStrategy || 'priority_first';

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
    toast.success('تم اعتماد الميزانية الشهرية وقفل الدورة بنجاح');
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
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200/80 shadow-none space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700">
          <Calendar size={14} className="text-slate-400" />
          <span className="text-slate-500">الدورة:</span>
          <select
            value={currentPeriod}
            onChange={(e) => {
              const selected = e.target.value;
              setCurrentPeriod(selected);
              if (!allocations[selected]) {
                generateOrRefreshAllocation(selected);
              }
            }}
            className="bg-transparent font-semibold text-slate-900 focus:outline-hidden cursor-pointer"
          >
            {Object.entries(allocations).map(([key, alloc]) => (
              <option key={key} value={key}>
                {alloc.periodLabel || key}
              </option>
            ))}
          </select>
        </div>
        <p className="text-slate-600 font-semibold text-sm">لسه متعملش مقترح توزيع للدورة دي</p>
        <button
          type="button"
          onClick={() => generateOrRefreshAllocation(currentPeriod, budgetInput)}
          className="px-4 py-2 bg-[#005756] hover:bg-[#004241] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        >
          تجهيز مقترح الميزانية
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 1. Page Header & Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              توزيع ميزانية الشهر وكشوف الصرف
            </h2>
            {currentAllocation.batchTitle && currentAllocation.batchTitle !== currentAllocation.periodLabel && (
              <>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <span className="text-xs font-medium text-slate-600">
                  {currentAllocation.batchTitle}
                </span>
              </>
            )}
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="text-xs font-semibold text-slate-700">
              {isApproved ? 'معتمدة ومقفولة' : 'مسودة للتجهيز'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            دورة {currentAllocation.periodLabel} · تحديد مبالغ الدفعة واعتماد كشف الصرف
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Cycle Dropdown */}
          <div className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-white border border-slate-200/80 text-xs font-medium text-slate-700">
            <Calendar size={14} className="text-slate-400 shrink-0" />
            <span className="text-slate-400 font-medium text-[11px] shrink-0">الدورة:</span>
            <div className="relative flex items-center">
              <select
                value={currentPeriod}
                onChange={(e) => {
                  const selected = e.target.value;
                  setCurrentPeriod(selected);
                  if (!allocations[selected]) {
                    generateOrRefreshAllocation(selected);
                  }
                }}
                aria-label="اختيار الدورة الشهرية"
                className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer text-xs pr-1 pl-5 appearance-none"
              >
                {Object.entries(allocations).map(([key, alloc]) => (
                  <option key={key} value={key}>
                    {alloc.batchTitle ? `${alloc.batchTitle} (${alloc.periodLabel || key})` : (alloc.periodLabel || key)}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Excel Export Button (Secondary White) */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 h-9 bg-white border border-slate-200/80 hover:bg-slate-50 hover:text-[#005756] text-slate-700 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
              className="inline-flex items-center gap-1.5 px-3.5 h-9 bg-white border border-slate-200/80 hover:bg-slate-50 hover:text-[#005756] text-slate-700 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Unlock size={14} className="text-slate-400" />
              <span>فتح استثنائي</span>
            </button>
          )}

          {/* Approve Button (Single Primary Teal CTA) */}
          {!isApproved && currentUserRole === 'admin' && (
            <button
              type="button"
              onClick={() => setShowApprovalDialog(true)}
              className="inline-flex items-center gap-1.5 px-4 h-9 bg-[#005756] hover:bg-[#004241] text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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

      {/* 2. Focused Batch Configuration & Uniform Slate KPI Strip */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-none space-y-5">
        {/* Top: Batch Title, Execution Date, Coverage Months */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pb-4 border-b border-slate-100">
          {/* Field 1: Batch Title */}
          <div className="md:col-span-6 space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Tag size={13} className="text-slate-400" />
              <span>اسم الدفعة</span>
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
                  placeholder="مثال: دفعة أكتوبر ونوفمبر 2026"
                  className="w-full h-10 px-3 py-2 bg-slate-50/60 focus:bg-white border border-slate-200/80 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15 transition-colors"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">مقترحات:</span>
                  {[
                    `دفعة شهري أكتوبر ونوفمبر 2026`,
                    `كفالات ${currentAllocation.periodLabel}`,
                    `دفعة معونة الشتاء 2026`,
                    `منحة شهر رمضان المبارك`,
                  ].map((preset) => (
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
                {currentAllocation.executionDate || `${currentPeriod}-15`}
              </div>
            ) : (
              <input
                type="date"
                value={currentAllocation.executionDate || `${currentPeriod}-15`}
                onChange={(e) =>
                  updateAllocationBatchConfig(currentPeriod, { executionDate: e.target.value })
                }
                className="w-full h-10 px-3 py-2 bg-slate-50/60 focus:bg-white border border-slate-200/80 rounded-xl text-sm font-mono tabular-nums font-medium text-slate-900 focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15 transition-colors cursor-pointer"
              />
            )}
          </div>

          {/* Field 3: Coverage Months */}
          <div className="md:col-span-3 space-y-1.5">
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
          </div>
        </div>

        {/* Financial Numbers Strip (3 Uniform Soft Slate Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Box 1: Available Budget */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-xs font-medium text-slate-500 block">الرصيد المتاح للصرف</span>
            <div className="font-mono tabular-nums">
              <MoneyDisplay amount={currentAllocation.totalBudget} size="xl" variant="neutral" />
            </div>
            <div className="text-[11px] text-slate-400">
              المتاح في الصندوق العام للدورة
            </div>
          </div>

          {/* Box 2: Total Allocated / Disbursed */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-xs font-medium text-slate-500 block">إجمالي المبالغ المقررة</span>
            <div className="font-mono tabular-nums">
              <MoneyDisplay amount={totalAllocated} size="xl" variant="neutral" />
            </div>
            <div className="text-[11px] text-slate-500 tabular-nums">
              تشمل {currentAllocation.summary.fundedCasesCount} أسرة مستحقة
            </div>
          </div>

          {/* Box 3: Unallocated Balance */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-xs font-medium text-slate-500 block">المتبقي بعد التوزيع</span>
            <div className="font-mono tabular-nums">
              <MoneyDisplay
                amount={currentAllocation.summary.unallocatedBalance}
                size="xl"
                variant="neutral"
              />
            </div>
            <div className="text-[11px] text-slate-400">
              يرجع كرصيد متاح للدورة الجاية
            </div>
          </div>
        </div>

        {/* Budget Setting Controls (Draft Mode) */}
        {!isApproved && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-xs font-medium text-slate-500 ml-1">سقف الصرف:</span>
              {[
                { label: 'كامل الصندوق العام', val: actualUnrestricted },
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
            <table className="w-full min-w-[950px] text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-semibold">
                  <th className="py-3.5 px-3 text-center w-10">م</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">الأسرة والكود</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">الرقم القومي</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">الباحث المسؤول</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">الأولوية والتقييم</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">العجز الشهري</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">المبلغ المقرر</th>
                  <th className="py-3.5 px-4">سبب التخصيص</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-500 font-medium">
                      مفيش حالات مطابقة للبحث أو التصفية
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const c = caseMap.get(item.caseId);
                    const isExcluded = item.isExcluded;
                    const priorityMeta = getPriorityMeta(item.priority);

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isExcluded
                            ? 'bg-slate-50/70 text-slate-400'
                            : 'hover:bg-slate-50/70'
                        }`}
                      >
                        {/* Serial */}
                        <td className="py-3.5 px-3 text-center text-slate-400 font-mono tabular-nums">
                          {idx + 1}
                        </td>

                        {/* Code & Full Name */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              onClick={() => setSelectedCaseId(item.caseId)}
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

                        {/* Actions */}
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
                          ) : (
                            <span className="inline-flex items-center justify-center gap-1 text-[11px] text-slate-500 font-medium">
                              <Lock size={12} className="text-slate-400" />
                              <span>معتمد</span>
                            </span>
                          )}
                        </td>
                      </tr>
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
                          onClick={() => setSelectedCaseId(item.caseId)}
                          className="font-semibold text-sm text-slate-900 cursor-pointer hover:text-[#005756] hover:underline"
                        >
                          {item.caseName}
                        </span>
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
                    <span className="text-slate-500 font-medium block mb-1">يخصم من الصندوق العام:</span>
                    <MoneyDisplay
                      amount={currentAllocation.items
                        .filter((i) => !i.isExcluded && i.fundSource === 'unrestricted_pool')
                        .reduce((s, i) => s + i.approvedAmount, 0)}
                      size="md"
                      variant="neutral"
                    />
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200/80">
                    <span className="text-slate-500 font-medium block mb-1">المتبقي للدورة الجاية:</span>
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
    </div>
  );
}
