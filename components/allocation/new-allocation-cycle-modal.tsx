'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { X, Calendar, Tag, Layers, Repeat } from 'lucide-react';
import {
  AllocationCycleType,
  ExceptionalDistributionMode,
  BeneficiaryCase,
  ScoringRulesConfig,
} from '@/types';
import {
  formatPeriodLabelFromDate,
  isCaseEligibleForAllocation,
} from '@/services/allocation-engine';
import { checkVisitOverdueStatus } from '@/services/scoring-engine';
import { AmountInput } from '@/components/common/amount-input';
import { MoneyDisplay } from '@/components/common/money-display';

interface NewAllocationCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  unrestrictedBalance: number;
  cases: BeneficiaryCase[];
  scoringConfig: ScoringRulesConfig;
  onCreateCycle: (data: {
    batchTitle: string;
    cycleType: AllocationCycleType;
    periodDate: string;
    totalBudget: number;
    coverageMonths?: number;
    exceptionalDistributionMode?: ExceptionalDistributionMode;
    flatAmountPerCase?: number;
  }) => void;
}

const EXCEPTIONAL_PRESETS = [
  'منحة دخول المدارس',
  'كسوة العيد',
  'إعانة شتاء طارئة',
  'منحة شهر رمضان المبارك',
];

const FLAT_AMOUNT_PRESETS = [500, 1000, 1500, 2000];

export function NewAllocationCycleModal({
  isOpen,
  onClose,
  unrestrictedBalance,
  cases,
  scoringConfig,
  onCreateCycle,
}: NewAllocationCycleModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const todayISO = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [cycleType, setCycleType] = useState<AllocationCycleType>('exceptional');
  const [periodDate, setPeriodDate] = useState<string>(todayISO);
  const [batchTitle, setBatchTitle] = useState<string>('منحة دخول المدارس');
  const [hasCustomTitle, setHasCustomTitle] = useState<boolean>(false);

  // Regular cycle options
  const [regularBudget, setRegularBudget] = useState<number>(unrestrictedBalance);
  const [coverageMonths, setCoverageMonths] = useState<number>(1);

  // Exceptional cycle options
  const [exceptionalMode, setExceptionalMode] =
    useState<ExceptionalDistributionMode>('flat_per_case');
  const [flatAmountPerCase, setFlatAmountPerCase] = useState<number>(1000);
  const [splitBudgetAmount, setSplitBudgetAmount] = useState<number>(
    Math.min(30000, unrestrictedBalance > 0 ? unrestrictedBalance : 30000)
  );
  const [titleError, setTitleError] = useState<string>('');

  // Reset sensible defaults when modal transitions from closed to open
  const [wasOpen, setWasOpen] = useState<boolean>(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setCycleType('exceptional');
      setPeriodDate(todayISO);
      setBatchTitle('منحة دخول المدارس');
      setHasCustomTitle(false);
      setRegularBudget(unrestrictedBalance);
      setCoverageMonths(1);
      setExceptionalMode('flat_per_case');
      setFlatAmountPerCase(1000);
      setSplitBudgetAmount(Math.min(30000, unrestrictedBalance > 0 ? unrestrictedBalance : 30000));
      setTitleError('');
    }
  }

  // Count currently eligible non-overdue families for live preview
  const { activeEligibleCount, overdueCount } = useMemo(() => {
    let active = 0;
    let overdue = 0;
    cases.forEach((c) => {
      if (!isCaseEligibleForAllocation(c)) return;
      const vCheck = checkVisitOverdueStatus(c.lastVisitDate, scoringConfig.overdueVisitMonths);
      if (vCheck.isOverdue) {
        overdue++;
      } else {
        active++;
      }
    });
    return { activeEligibleCount: active, overdueCount: overdue };
  }, [cases, scoringConfig.overdueVisitMonths]);

  const handleCycleTypeSwitch = (nextType: AllocationCycleType) => {
    setCycleType(nextType);
    setTitleError('');
    if (!hasCustomTitle) {
      if (nextType === 'regular') {
        const label = formatPeriodLabelFromDate(periodDate, periodDate);
        setBatchTitle(`كفالات ${label}`);
      } else {
        setBatchTitle('منحة دخول المدارس');
      }
    }
  };

  const handleDateChange = (nextDate: string) => {
    setPeriodDate(nextDate);
    if (!hasCustomTitle && cycleType === 'regular') {
      const label = formatPeriodLabelFromDate(nextDate, nextDate);
      setBatchTitle(`كفالات ${label}`);
    }
  };

  // Live preview figures
  const estimatedCycleBudget = useMemo(() => {
    if (cycleType === 'regular') {
      return Math.max(0, regularBudget);
    }
    if (exceptionalMode === 'flat_per_case') {
      return Math.max(0, flatAmountPerCase) * activeEligibleCount;
    }
    return Math.max(0, splitBudgetAmount);
  }, [cycleType, regularBudget, exceptionalMode, flatAmountPerCase, activeEligibleCount, splitBudgetAmount]);

  const estimatedPerFamilySplit = useMemo(() => {
    if (activeEligibleCount <= 0 || splitBudgetAmount <= 0) return 0;
    const raw = splitBudgetAmount / activeEligibleCount;
    return raw >= 50 ? Math.floor(raw / 50) * 50 : Math.floor(raw);
  }, [activeEligibleCount, splitBudgetAmount]);

  const exceedsGeneralPool =
    unrestrictedBalance > 0 && estimatedCycleBudget > unrestrictedBalance;

  const regularPresets = useMemo(() => {
    const monthLabel = formatPeriodLabelFromDate(periodDate, 'الشهر الحالي');
    return [`كفالات ${monthLabel}`, `دفعة مجمعة ${monthLabel}`, `دعم شهري - ${monthLabel}`];
  }, [periodDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = batchTitle.trim();
    if (!trimmedTitle) {
      setTitleError('اكتب اسم واضح للدورة عشان يظهر في الكشوف والمحاضر');
      return;
    }

    if (cycleType === 'exceptional' && exceptionalMode === 'flat_per_case' && flatAmountPerCase <= 0) {
      setTitleError('حدد مبلغ المنحة لكل أسرة (أكبر من صفر)');
      return;
    }

    if (cycleType === 'exceptional' && exceptionalMode === 'split_budget' && splitBudgetAmount <= 0) {
      setTitleError('حدد ميزانية الدورة الاستثنائية (أكبر من صفر)');
      return;
    }

    const resolvedBudget =
      cycleType === 'regular'
        ? Math.max(0, regularBudget)
        : exceptionalMode === 'flat_per_case'
        ? Math.max(flatAmountPerCase * Math.max(activeEligibleCount, 1), flatAmountPerCase)
        : Math.max(0, splitBudgetAmount);

    onCreateCycle({
      batchTitle: trimmedTitle,
      cycleType,
      periodDate: periodDate || todayISO,
      totalBudget: resolvedBudget,
      coverageMonths: cycleType === 'regular' ? coverageMonths : 1,
      exceptionalDistributionMode: cycleType === 'exceptional' ? exceptionalMode : undefined,
      flatAmountPerCase:
        cycleType === 'exceptional' && exceptionalMode === 'flat_per_case'
          ? flatAmountPerCase
          : undefined,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-cycle-modal-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
          />

          {/* Modal Surface */}
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: 'easeOut' }}
            className="relative z-10 bg-white rounded-2xl max-w-xl w-full border border-slate-200/80 shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between shrink-0">
              <div>
                <h3
                  id="new-cycle-modal-title"
                  className="font-bold text-slate-900 text-base sm:text-lg tracking-tight"
                >
                  فتح دورة صرف جديدة
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  افتح دورة كفالة شهرية أو منحة استثنائية مستقلة بكشفها ومحضرها
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                aria-label="إغلاق النافذة"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5">
              {/* 1. Cycle Type Segmented Control */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Layers size={13} className="text-slate-400" />
                  <span>نوع دورة الصرف</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => handleCycleTypeSwitch('regular')}
                    className={`py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                      cycleType === 'regular'
                        ? 'bg-white text-[#005756] shadow-xs border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    دورة شهرية دورية
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCycleTypeSwitch('exceptional')}
                    className={`py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                      cycleType === 'exceptional'
                        ? 'bg-white text-[#005756] shadow-xs border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    دورة استثنائية / موسمية
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  {cycleType === 'regular'
                    ? 'بتتحسب بناءً على الفجوة المالية وتوصية الباحث الميداني وترتيب الأولويات.'
                    : 'منحة مستقلة (مدارس، أعياد، شتاء، طوارئ) بمبلغ موحد أو ميزانية محددة وبتتقفل لوحدها.'}
                </p>
              </div>

              {/* 2. Free Cycle Title + Execution Date */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-7 space-y-1.5">
                  <label
                    htmlFor="new-cycle-title"
                    className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                  >
                    <Tag size={13} className="text-slate-400" />
                    <span>
                      اسم الدورة <span className="text-rose-600">*</span>
                    </span>
                  </label>
                  <input
                    id="new-cycle-title"
                    type="text"
                    value={batchTitle}
                    onChange={(e) => {
                      setBatchTitle(e.target.value);
                      setHasCustomTitle(true);
                      if (titleError) setTitleError('');
                    }}
                    placeholder={
                      cycleType === 'regular'
                        ? 'مثال: كفالات شهر ديسمبر 2026'
                        : 'مثال: منحة دخول المدارس أو كسوة العيد'
                    }
                    className="w-full h-10 px-3 bg-slate-50/60 focus:bg-white border border-slate-200/80 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15 transition-colors"
                  />
                </div>

                <div className="sm:col-span-5 space-y-1.5">
                  <label
                    htmlFor="new-cycle-date"
                    className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                  >
                    <Calendar size={13} className="text-slate-400" />
                    <span>موعد الصرف المقرر</span>
                  </label>
                  <input
                    id="new-cycle-date"
                    type="date"
                    value={periodDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50/60 focus:bg-white border border-slate-200/80 rounded-xl text-sm font-mono tabular-nums font-medium text-slate-900 focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15 transition-colors cursor-pointer"
                  />
                </div>
              </div>

              {/* Quick Title Presets */}
              <div className="flex flex-wrap items-center gap-1.5 -mt-2">
                <span className="text-[11px] text-slate-400">مقترحات سريعة:</span>
                {(cycleType === 'exceptional' ? EXCEPTIONAL_PRESETS : regularPresets).map(
                  (preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setBatchTitle(preset);
                        setHasCustomTitle(true);
                        if (titleError) setTitleError('');
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                        batchTitle === preset
                          ? 'bg-[#005756] text-white border-[#005756]'
                          : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200/80'
                      }`}
                    >
                      {preset}
                    </button>
                  )
                )}
              </div>

              {/* 3. Distribution Settings based on Cycle Type */}
              {cycleType === 'regular' ? (
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-2 border-t border-slate-100">
                  <div className="sm:col-span-7 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      سقف ميزانية الدورة
                    </label>
                    <AmountInput
                      value={regularBudget}
                      onChange={(val) => setRegularBudget(val)}
                      size="md"
                    />
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {[
                        { label: 'كامل الرصيد المتاح', val: unrestrictedBalance },
                        { label: '50 ألف', val: 50000 },
                        { label: '100 ألف', val: 100000 },
                      ].map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setRegularBudget(p.val)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                            regularBudget === p.val
                              ? 'bg-[#005756] text-white border-[#005756]'
                              : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200/80'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-5 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Repeat size={13} className="text-slate-400" />
                      <span>عدد شهور التغطية</span>
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { value: 1, label: 'شهر' },
                        { value: 2, label: 'شهرين' },
                        { value: 3, label: '3 شهور' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setCoverageMonths(opt.value)}
                          className={`h-10 px-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                            coverageMonths === opt.value
                              ? 'bg-[#005756] text-white border-[#005756]'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 block">
                      طريقة حساب المنحة الاستثنائية
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
                      <button
                        type="button"
                        onClick={() => setExceptionalMode('flat_per_case')}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          exceptionalMode === 'flat_per_case'
                            ? 'bg-white text-[#005756] shadow-xs border border-slate-200/80'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        مبلغ موحد لكل أسرة
                      </button>
                      <button
                        type="button"
                        onClick={() => setExceptionalMode('split_budget')}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          exceptionalMode === 'split_budget'
                            ? 'bg-white text-[#005756] shadow-xs border border-slate-200/80'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        توزيع ميزانية محددة
                      </button>
                    </div>
                  </div>

                  {exceptionalMode === 'flat_per_case' ? (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 block">
                        قيمة المنحة الموحدة لكل أسرة مستحقة
                      </label>
                      <AmountInput
                        value={flatAmountPerCase}
                        onChange={(val) => {
                          setFlatAmountPerCase(val);
                          if (titleError) setTitleError('');
                        }}
                        size="md"
                      />
                      <div className="flex flex-wrap items-center gap-1.5">
                        {FLAT_AMOUNT_PRESETS.map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => setFlatAmountPerCase(amount)}
                            className={`text-[11px] px-2.5 py-1 rounded-lg border font-mono tabular-nums transition-colors cursor-pointer ${
                              flatAmountPerCase === amount
                                ? 'bg-[#005756] text-white border-[#005756]'
                                : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200/80'
                            }`}
                          >
                            {amount.toLocaleString('en-US')} ج.م
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 block">
                        إجمالي الميزانية المخصصة للمنحة
                      </label>
                      <AmountInput
                        value={splitBudgetAmount}
                        onChange={(val) => {
                          setSplitBudgetAmount(val);
                          if (titleError) setTitleError('');
                        }}
                        size="md"
                      />
                      <p className="text-[11px] text-slate-500 tabular-nums">
                        النصيب التقديري لكل أسرة:{' '}
                        <strong className="text-slate-800 font-mono">
                          {estimatedPerFamilySplit.toLocaleString('ar-EG')} ج.م
                        </strong>{' '}
                        (مقرّب لأقرب 50 ج.م على {activeEligibleCount} أسرة نشطة)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 4. Clean Single-Surface Live Preview */}
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-600 font-medium">الأسر المستحقة الجاهزة للصرف:</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {activeEligibleCount} أسرة نشطة
                    {overdueCount > 0 ? ` · (${overdueCount} موقوفة لتأخر الزيارة)` : ''}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2 border-t border-slate-200/70">
                  <span className="text-slate-600 font-medium">
                    {cycleType === 'exceptional' && exceptionalMode === 'flat_per_case'
                      ? 'إجمالي ميزانية الدورة المحسوبة:'
                      : 'ميزانية الدورة المحددة:'}
                  </span>
                  <div className="font-mono tabular-nums">
                    <MoneyDisplay amount={estimatedCycleBudget} size="md" variant="neutral" />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span>المتاح حالياً بالخزينة الموحدة:</span>
                  <span className="font-mono tabular-nums font-medium text-slate-700">
                    {unrestrictedBalance.toLocaleString('ar-EG')} ج.م
                  </span>
                </div>
                {exceedsGeneralPool && (
                  <p className="text-[11px] text-rose-600 font-medium pt-1">
                    تنبيه: الميزانية المحددة أكبر من الرصيد المتاح حالياً في الخزينة الموحدة، تقدر تكمل التجهيز كمسودة وتعدّل المبالغ قبل الاعتماد.
                  </p>
                )}
              </div>

              {titleError && (
                <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                  {titleError}
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 h-10 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200/80 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 h-10 bg-[#005756] hover:bg-[#004241] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  فتح الدورة وتجهيز الكشف
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
