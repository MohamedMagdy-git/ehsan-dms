'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import {
  Calendar,
  Calculator,
  Coins,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  Ban,
  Check,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Landmark,
  X,
  Clock,
  Tag,
  Repeat,
  Search,
  CheckCircle,
  FileText,
  UserCheck,
} from 'lucide-react';
import { exportMonthlyAllocationToExcel } from '@/services/excel-export';
import { getPriorityLabel } from '@/services/scoring-engine';
import { MoneyDisplay } from '@/components/common/money-display';
import { AmountInput } from '@/components/common/amount-input';

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

  const [recalculateSuccess, setRecalculateSuccess] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

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
  };

  const handleConfirmUnlock = () => {
    if (!unlockReasonInput.trim()) {
      setUnlockError('يرجى كتابة سبب فتح التعديل الاستثنائي لتوثيقه رسمياً في سجل الرقابة والتدقيق');
      return;
    }
    const adminName = currentSessionProfile?.name || 'أ. أحمد الجزار (مدير النظام)';
    unlockAllocation(currentPeriod, adminName, unlockReasonInput.trim());
    setShowUnlockDialog(false);
    setUnlockReasonInput('');
    setUnlockError('');
  };

  const handleExportExcel = () => {
    if (!currentAllocation) return;
    try {
      exportMonthlyAllocationToExcel(currentAllocation, cases);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to export excel:', err);
    }
  };

  const handleApplyCustomBudget = () => {
    if (!customBudgetValue || customBudgetValue <= 0) return;
    setBudgetInput(customBudgetValue);
    generateOrRefreshAllocation(currentPeriod, customBudgetValue, undefined, undefined, {
      strategy: currentStrategy,
    });
    setRecalculateSuccess(true);
    setTimeout(() => setRecalculateSuccess(false), 3000);
    setIsCustomBudgetOpen(false);
  };

  const handleResetToAutoProposal = () => {
    generateOrRefreshAllocation(currentPeriod, budgetInput, undefined, undefined, {
      strategy: currentStrategy,
    });
    setRecalculateSuccess(true);
    setTimeout(() => setRecalculateSuccess(false), 3000);
  };

  // Calculations for active items
  const nonExcludedItems = currentAllocation ? currentAllocation.items.filter((i) => !i.isExcluded) : [];
  const activeEligibleItems = currentAllocation ? currentAllocation.items.filter((i) => !i.isExcluded && !i.isVisitOverdue) : [];
  const totalNeed = activeEligibleItems.reduce((sum, item) => sum + item.financialGap, 0);
  const totalAllocated = currentAllocation?.summary?.totalAllocated || 0;
  const coverageRate = totalNeed > 0 ? Math.min(100, Math.round((totalAllocated / totalNeed) * 100)) : 100;

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!currentAllocation) return [];
    return currentAllocation.items.filter((item) => {
      const c = caseMap.get(item.caseId);

      // Search Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = item.caseName.toLowerCase().includes(query);
        const matchesCode = item.caseCode.toLowerCase().includes(query);
        const matchesPhone = c?.phone?.includes(query);
        const matchesNationalId = c?.nationalId?.includes(query);
        if (!matchesName && !matchesCode && !matchesPhone && !matchesNationalId) return false;
      }

      // Priority Filter
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
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
          <Calendar size={14} className="text-teal-700" />
          <span>الدورة:</span>
          <select
            value={currentPeriod}
            onChange={(e) => {
              const selected = e.target.value;
              setCurrentPeriod(selected);
              if (!allocations[selected]) {
                generateOrRefreshAllocation(selected);
              }
            }}
            className="bg-transparent font-bold text-slate-900 focus:outline-hidden cursor-pointer"
          >
            {Object.entries(allocations).map(([key, alloc]) => (
              <option key={key} value={key}>
                {alloc.periodLabel || key}
              </option>
            ))}
          </select>
        </div>
        <p className="text-slate-600 font-semibold text-sm">لم يتم توليد مقترح تخصيص لهذه الدورة بعد</p>
        <button
          onClick={() => generateOrRefreshAllocation(currentPeriod, budgetInput)}
          className="px-4 py-2 bg-[#005756] hover:bg-[#004241] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
        >
          توليد مقترح الميزانية الآن
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Header & Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              توزيع ميزانية الشهر وكشوف الصرف
            </h2>
            {currentAllocation.batchTitle && currentAllocation.batchTitle !== currentAllocation.periodLabel && (
              <span className="px-2.5 py-0.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
                {currentAllocation.batchTitle}
              </span>
            )}
            <span
              className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                isApproved
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {isApproved ? '✓ معتمد ومقفل' : 'مسودة للتجهيز'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            دورة {currentAllocation.periodLabel} · تخصيص مبالغ الدفعة الشهرية وتحديد المعتمد للصرف الفعلي.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Cycle Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-2xs">
            <Calendar size={14} className="text-teal-700 shrink-0" />
            <span className="text-slate-400 font-medium text-[11px]">الدورة:</span>
            <select
              value={currentPeriod}
              onChange={(e) => {
                const selected = e.target.value;
                setCurrentPeriod(selected);
                if (!allocations[selected]) {
                  generateOrRefreshAllocation(selected);
                }
              }}
              className="bg-transparent font-bold text-slate-900 focus:outline-hidden cursor-pointer text-xs"
            >
              {Object.entries(allocations).map(([key, alloc]) => (
                <option key={key} value={key}>
                  {alloc.batchTitle ? `${alloc.batchTitle} (${alloc.periodLabel || key})` : (alloc.periodLabel || key)}
                </option>
              ))}
            </select>
          </div>

          {/* Excel Export Button */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            title="تصدير كشف تخصيص الميزانية الرسمي (.xlsx)"
          >
            <FileSpreadsheet size={15} />
            <span>تصدير إكسل</span>
          </button>

          {/* Unlock Button for Approved cycle (Admin only) */}
          {isApproved && currentUserRole === 'admin' && (
            <button
              onClick={() => {
                setUnlockReasonInput('');
                setUnlockError('');
                setShowUnlockDialog(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Unlock size={15} />
              <span>فتح استثنائي</span>
            </button>
          )}

          {/* Approve Button (Draft mode + Admin role only) */}
          {!isApproved && currentUserRole === 'admin' && (
            <button
              onClick={() => setShowApprovalDialog(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#005756] hover:bg-[#004241] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <CheckCircle2 size={15} />
              <span>{currentAllocation.isExceptionallyUnlocked ? 'إعادة اعتماد الميزانية' : 'اعتماد الميزانية وقفل الدورة'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {recalculateSuccess && (
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center gap-2 text-xs text-teal-900 shadow-2xs">
          <CheckCircle2 size={16} className="text-teal-700 shrink-0" />
          <span>تمت إعادة احتساب وتحديث مقترح الميزانية آلياً بنجاح.</span>
        </div>
      )}

      {exportSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-900 shadow-2xs">
          <Check size={16} className="text-emerald-700 shrink-0" />
          <span>تم تصدير ملف الإكسل الرسمي لكشف الصرف بنجاح.</span>
        </div>
      )}

      {currentAllocation.isExceptionallyUnlocked && !isApproved && (
        <div className="p-4 bg-amber-50/90 border-2 border-amber-400 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-950 text-sm">
                  تنبيه رقابي: تم فتح هذه الميزانية استثنائياً للتعديل بعد الاعتماد
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                  <Unlock size={10} />
                  مسودة مفتوحة
                </span>
              </div>
              <p className="text-amber-900 text-[11px] mt-1">
                <strong>سبب التعديل:</strong> &quot;{currentAllocation.unlockReason}&quot; · فُتحت بواسطة: {currentAllocation.unlockedBy}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Focused Batch Configuration & Liquidity Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        {/* Top: Batch Title, Execution Date, Coverage Months */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start pb-4 border-b border-slate-100">
          {/* Field 1: Batch Title (e.g. دفعة شهري أكتوبر ونوفمبر 2026) */}
          <div className="md:col-span-6 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <Tag size={13} className="text-teal-700" />
              <span>مسمى الدفعة (مثال: دفعة شهري أكتوبر ونوفمبر 2026)</span>
            </label>
            {isApproved ? (
              <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900">
                {currentAllocation.batchTitle || currentAllocation.periodLabel}
              </div>
            ) : (
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={currentAllocation.batchTitle || ''}
                  onChange={(e) => updateAllocationBatchConfig(currentPeriod, { batchTitle: e.target.value })}
                  placeholder="مثال: دفعة شهري أكتوبر ونوفمبر 2026"
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#005756] focus:border-transparent transition"
                />
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] text-slate-400">اقتراحات:</span>
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
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
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
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <Clock size={13} className="text-teal-700" />
              <span>تاريخ تنفيذ الصرف المقرر</span>
            </label>
            {isApproved ? (
              <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900">
                {currentAllocation.executionDate || `${currentPeriod}-15`}
              </div>
            ) : (
              <input
                type="date"
                value={currentAllocation.executionDate || `${currentPeriod}-15`}
                onChange={(e) => updateAllocationBatchConfig(currentPeriod, { executionDate: e.target.value })}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#005756] focus:border-transparent transition cursor-pointer"
              />
            )}
          </div>

          {/* Field 3: Coverage Multiplier */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <Repeat size={13} className="text-teal-700" />
              <span>معامل التغطية الزمني</span>
            </label>
            {isApproved ? (
              <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900">
                {(currentAllocation.coverageMonths || 1) === 1 ? 'شهر واحد (1x)' : `${currentAllocation.coverageMonths} أشهر مجمعة`}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: 1, label: 'شهر (1x)' },
                  { value: 2, label: 'شهرين (2x)' },
                  { value: 3, label: '3 أشهر (3x)' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateAllocationBatchConfig(currentPeriod, { coverageMonths: option.value })}
                    className={`px-2 py-2 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                      (currentAllocation.coverageMonths || 1) === option.value
                        ? 'bg-[#005756] text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Financial Numbers Strip (Clean 3 Boxes) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Box 1: Available Budget */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 block">الميزانية المتاحة بالخزينة</span>
            <div className="text-xl font-black text-slate-900 font-mono">
              <MoneyDisplay amount={currentAllocation.totalBudget} size="xl" variant="neutral" />
            </div>
            <div className="text-[10px] text-slate-400">
              رصيد الصندوق العام المتاح للدورة
            </div>
          </div>

          {/* Box 2: Total Allocated / Disbursed */}
          <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-200/80 space-y-1">
            <span className="text-[11px] font-bold text-teal-800 block">إجمالي المعتمد للصرف (المنصرف)</span>
            <div className="text-xl font-black text-teal-900 font-mono">
              <MoneyDisplay amount={totalAllocated} size="xl" variant="approved" />
            </div>
            <div className="text-[10px] text-teal-700 font-medium">
              يغطي {currentAllocation.summary.fundedCasesCount} أسرة مستحقة معتمدة
            </div>
          </div>

          {/* Box 3: Surplus / Unallocated Balance */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 block">المتبقي بالصندوق</span>
            <div className="text-xl font-black text-slate-900 font-mono">
              <MoneyDisplay amount={currentAllocation.summary.unallocatedBalance} size="xl" variant="neutral" />
            </div>
            <div className="text-[10px] text-slate-400">
              يُرحل كرصيد احتياطي للدورة التالية
            </div>
          </div>
        </div>

        {/* Budget Setting Controls (Draft Mode) */}
        {!isApproved && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-bold text-slate-600 ml-1">تحديد سقف الميزانية:</span>
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
                    setRecalculateSuccess(true);
                    setTimeout(() => setRecalculateSuccess(false), 2500);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    budgetInput === preset.val
                      ? 'bg-[#005756] text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
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
                  className="px-3 py-1.5 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                >
                  مبلغ مخصص...
                </button>
              ) : (
                <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-xl border border-teal-600/50">
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
                  >
                    <Check size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomBudgetOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleResetToAutoProposal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer self-start sm:self-auto"
              title="إعادة احتساب المقترح آلياً وفق الخوارزمية ومسح أي تعديلات يدوية"
            >
              <RefreshCw size={13} />
              <span>إعادة احتساب المقترح آلياً</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Approved Beneficiaries Roster (Clean Focused Table / Mobile Cards) */}
      <div className="space-y-3">
        {/* Search & Priority Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم، كود الحالة (EHS-xxx)، أو الرقم القومي..."
              className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:bg-white focus:border-teal-700 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-slate-500 ml-1">تصفية:</span>
            {[
              { id: 'all', label: `كافة المعتمدين (${currentAllocation.items.length})` },
              { id: 'critical', label: 'الحرجة' },
              { id: 'high', label: 'المرتفعة' },
              { id: 'medium', label: 'المتوسطة' },
              { id: 'overdue', label: 'موقوفة (زيارة متأخرة)' },
              { id: 'excluded', label: 'مستبعدة' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedPriorityFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  selectedPriorityFilter === tab.id
                    ? 'bg-[#005756] text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Table View (>= 1024px) */}
        <div className="hidden lg:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[950px] text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3.5 px-3 text-center w-10">م</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">كود واسم الحالة</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">الرقم القومي</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">الباحث المسؤول</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">الأولوية والدرجة</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">فجوة العجز</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">المبلغ المقرر صرفه</th>
                  <th className="py-3.5 px-4">مبررات التخصيص</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">تحكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                      لا توجد حالات معتمدة مطابقة للبحث أو التصفية
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const c = caseMap.get(item.caseId);
                    const isExcluded = item.isExcluded;

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isExcluded
                            ? 'bg-slate-100/60 text-slate-400'
                            : item.isManuallyAdjusted
                            ? 'bg-amber-50/40 hover:bg-amber-50/60'
                            : 'hover:bg-slate-50/60'
                        }`}
                      >
                        {/* Serial */}
                        <td className="py-3.5 px-3 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>

                        {/* Code & Full Name */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              onClick={() => setSelectedCaseId(item.caseId)}
                              className={`font-bold cursor-pointer hover:underline ${
                                isExcluded ? 'text-slate-500' : 'text-slate-900'
                              }`}
                            >
                              {item.caseName}
                            </span>
                            {item.isVisitOverdue && (
                              <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded text-[10px] font-bold">
                                زيارة متأخرة
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            {item.caseCode} {c?.secondaryName && `· شهرة: ${c.secondaryName}`}
                          </div>
                        </td>

                        {/* National ID */}
                        <td className="py-3.5 px-3 whitespace-nowrap font-mono text-slate-700">
                          {c?.nationalId || 'مرفق بالملف'}
                        </td>

                        {/* Assigned Researcher */}
                        <td className="py-3.5 px-3 whitespace-nowrap font-medium text-slate-700">
                          {c?.assignedResearcher || 'غير محدد'}
                        </td>

                        {/* Priority & Score */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-800">
                              {item.score}/100
                            </span>
                            <span className={`text-[11px] font-bold ${
                              item.priority === 'critical'
                                ? 'text-rose-700'
                                : item.priority === 'high'
                                ? 'text-amber-700'
                                : 'text-slate-600'
                            }`}>
                              ({getPriorityLabel(item.priority)})
                            </span>
                          </div>
                        </td>

                        {/* Gap */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <MoneyDisplay amount={item.financialGap} size="sm" variant="gap" />
                        </td>

                        {/* Approved Amount (Direct Inline Quick Edit) */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {isExcluded ? (
                            <span className="text-xs font-bold text-slate-400 inline-flex items-center gap-1">
                              <MoneyDisplay amount={0} size="sm" variant="muted" />
                              <span>(مستبعد)</span>
                            </span>
                          ) : isApproved || !permissions.canEditAllocation ? (
                            <div className="flex items-center gap-1.5">
                              <MoneyDisplay
                                amount={item.approvedAmount}
                                size="md"
                                variant={isApproved ? 'approved' : 'teal'}
                              />
                              {item.isManuallyAdjusted && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-sans font-bold">
                                  معدل
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
                                  className="w-28 px-2.5 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-[#005756] rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#005756]/20 transition-all shadow-2xs"
                                  title="اكتب المبلغ المقرر صرفه ليُحفظ تلقائياً ويُعاد احتساب الميزانية"
                                />
                                <span className="mr-1.5 text-[11px] font-bold text-slate-500">ج.م</span>
                              </div>
                              {item.isManuallyAdjusted && (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-sans font-bold shrink-0"
                                  title="تم تعديل المبلغ يدوياً"
                                >
                                  معدل
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Reasoning */}
                        <td className="py-3.5 px-4 text-slate-600 text-[11px] leading-relaxed max-w-[280px]">
                          {isExcluded ? (
                            <span className="text-amber-800 font-medium">
                              سبب الاستبعاد: {item.exclusionReason}
                            </span>
                          ) : (
                            item.reasoning
                          )}
                        </td>

                        {/* Actions (تحكم) */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {!isApproved && permissions.canEditAllocation ? (
                            <div className="flex items-center justify-center gap-1.5">
                              {!isExcluded ? (
                                <button
                                  onClick={() => setExcludingItemId(item.id)}
                                  className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition-colors cursor-pointer"
                                  title="استبعاد مؤقت من دورة الصرف الحالية"
                                >
                                  <Ban size={15} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => toggleExcludeItem(currentPeriod, item.id, false)}
                                  className="px-2.5 py-1 text-[11px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg cursor-pointer transition"
                                >
                                  إلغاء الاستبعاد
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-center gap-1 text-[11px] text-emerald-800 font-medium px-2.5 py-1 bg-emerald-50 rounded-md border border-emerald-200">
                              <Lock size={12} className="text-emerald-700" />
                              <span>معتمد</span>
                            </div>
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
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 font-medium text-xs">
              لا توجد حالات معتمدة مطابقة للبحث أو التصفية
            </div>
          ) : (
            filteredItems.map((item) => {
              const c = caseMap.get(item.caseId);
              const isExcluded = item.isExcluded;

              return (
                <div
                  key={item.id}
                  className={`bg-white border rounded-2xl p-4 shadow-xs space-y-3.5 transition-all ${
                    isExcluded
                      ? 'border-slate-200 bg-slate-50/60 opacity-80'
                      : item.isManuallyAdjusted
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-slate-200/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          onClick={() => setSelectedCaseId(item.caseId)}
                          className="font-bold text-sm text-slate-900 cursor-pointer hover:underline"
                        >
                          {item.caseName}
                        </span>
                        {item.isVisitOverdue && (
                          <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded text-[10px] font-bold">
                            زيارة متأخرة
                          </span>
                        )}
                        {item.isManuallyAdjusted && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">
                            معدل يدوياً
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {item.caseCode} · الرقم القومي: {c?.nationalId || 'مرفق'} · الباحث: {c?.assignedResearcher || 'غير محدد'}
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                      item.priority === 'critical'
                        ? 'bg-rose-100 text-rose-800'
                        : item.priority === 'high'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {getPriorityLabel(item.priority)} ({item.score}/100)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-500 block font-medium">فجوة العجز الشهري</span>
                      <div className="text-sm font-black text-rose-700 font-mono mt-0.5">
                        <MoneyDisplay amount={item.financialGap} size="sm" variant="gap" />
                      </div>
                    </div>

                    <div className="p-2.5 bg-teal-50/60 rounded-xl border border-teal-100">
                      <span className="text-[10px] text-teal-800 block font-bold">المبلغ المقرر صرفه</span>
                      <div className="mt-1">
                        {isExcluded ? (
                          <span className="text-slate-400 text-xs font-bold">مستبعد</span>
                        ) : isApproved || !permissions.canEditAllocation ? (
                          <div className="text-sm font-black text-teal-900 font-mono">
                            <MoneyDisplay amount={item.approvedAmount} size="sm" variant="approved" />
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
                              className="w-full px-2 py-1 bg-white border border-slate-300 focus:border-[#005756] rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#005756] shadow-2xs"
                              title="اكتب المبلغ المقرر صرفه"
                            />
                            <span className="text-[11px] font-bold text-teal-900 shrink-0">ج.م</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                    {isExcluded ? (
                      <span className="text-amber-800 font-medium">سبب الاستبعاد: {item.exclusionReason}</span>
                    ) : (
                      item.reasoning
                    )}
                  </div>

                  {!isApproved && permissions.canEditAllocation && (
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                      {!isExcluded ? (
                        <button
                          type="button"
                          onClick={() => setExcludingItemId(item.id)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-bold rounded-xl transition cursor-pointer border border-rose-200"
                          title="استبعاد مؤقت من دورة الشهر"
                        >
                          <Ban size={13} />
                          <span>استبعاد مؤقت من الدفعة</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleExcludeItem(currentPeriod, item.id, false)}
                          className="w-full py-1.5 bg-teal-50 text-teal-800 text-xs font-bold rounded-xl hover:bg-teal-100 transition cursor-pointer border border-teal-200"
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
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-sm">توثيق سبب استبعاد الحالة من دورة الصرف</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              وفقاً للنظام الرقابي، يتطلب استبعاد أي حالة توثيق السبب الإداري:
            </p>
            <textarea
              rows={3}
              value={exclusionReasonInput}
              onChange={(e) => setExclusionReasonInput(e.target.value)}
              placeholder="اكتب سبب الاستبعاد..."
              className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-teal-700"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setExcludingItemId(null)}
                className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmExclusion}
                className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                تأكيد الاستبعاد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Approval Confirmation Modal */}
      {showApprovalDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center gap-2.5 text-[#005756]">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">الاعتماد الرسمي لميزانية المساعدات وقفل الدورة</h3>
                <p className="text-[11px] text-slate-500">توثيق الاعتماد والإقفال المالي النهائي لدورة الصرف</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              أنت على وشك اعتماد كشف صرف المساعدات لدورة <strong>{currentAllocation.batchTitle || currentAllocation.periodLabel}</strong> بمبلغ إجمالي <strong className="tabular-nums font-mono">{currentAllocation.summary.totalAllocated.toLocaleString('ar-EG')} ج.م</strong> لصالح <strong>{currentAllocation.summary.fundedCasesCount} أسرة معتمدة</strong>.
            </p>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
              <span className="font-semibold text-slate-700 block pb-1 border-b border-slate-200">
                الأثر المالي المتوقع على الخزينة:
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 bg-white rounded-xl border border-teal-200 shadow-2xs">
                  <span className="text-teal-900 font-bold block mb-1">يخصم من الصندوق العام:</span>
                  <MoneyDisplay
                    amount={currentAllocation.items
                      .filter((i) => !i.isExcluded && i.fundSource === 'unrestricted_pool')
                      .reduce((s, i) => s + i.approvedAmount, 0)}
                    size="md"
                    variant="teal"
                  />
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-500 font-semibold block mb-1">الفائض المرحل للدورة التالية:</span>
                  <MoneyDisplay
                    amount={currentAllocation.summary.unallocatedBalance}
                    size="md"
                    variant="neutral"
                  />
                </div>
              </div>
              <div className="flex justify-between items-center pt-1 gap-2">
                <span className="text-slate-600 font-medium shrink-0">اسم المسؤول المعتمد:</span>
                <input
                  type="text"
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  className="p-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-900 w-60 focus:outline-hidden focus:ring-1 focus:ring-teal-700"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 text-xs pt-2">
              <button
                onClick={() => setShowApprovalDialog(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
              >
                تراجع
              </button>
              <button
                onClick={handleConfirmApproval}
                className="px-5 py-2 bg-[#005756] hover:bg-[#004241] text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                تأكيد الاعتماد وقفل الدورة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exceptional Unlock Confirmation Modal */}
      {showUnlockDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-amber-300 shadow-2xl">
            <div className="flex items-center gap-2.5 text-amber-700">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Unlock size={22} className="text-amber-800" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  فتح الميزانية المعتمدة للتعديل الاستثنائي
                </h3>
                <p className="text-[11px] text-slate-500">
                  دورة: {currentAllocation.periodLabel} · حوكمة الرقابة المالية
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <ShieldAlert size={15} />
                <span>ضوابط وإجراءات الفتح الاستثنائي:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-900 leading-relaxed pr-1">
                <li>ستعود حالة الدورة فوراً إلى <strong>(مسودة)</strong> لتمكين الإدارة من تعديل المبالغ المعتمدة.</li>
                <li>يتم توثيق اسمك وتاريخ العملية وسبب التعديل بصورة غير قابلة للحذف في <strong>سجل التدقيق والرقابة</strong>.</li>
              </ul>
            </div>

            {unlockError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-semibold">
                {unlockError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                سبب فتح التعديل الاستثنائي <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={unlockReasonInput}
                onChange={(e) => {
                  setUnlockReasonInput(e.target.value);
                  setUnlockError('');
                }}
                placeholder="اكتب بالتفصيل مبررات فتح الميزانية المعتمدة..."
                className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-amber-600 resize-none shadow-2xs"
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
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmUnlock}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Unlock size={14} />
                <span>تأكيد الفتح الاستثنائي للمسودة</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
