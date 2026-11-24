import {
  BeneficiaryCase,
  Donation,
  MonthlyAllocation,
  AllocationItem,
  ScoringRulesConfig,
  AllocationCycleType,
  ExceptionalDistributionMode,
} from '@/types';
import {
  calculateCaseAssessment,
  DEFAULT_SCORING_CONFIG,
  derivePriorityLevel,
  getPriorityLabel,
  checkVisitOverdueStatus,
} from './scoring-engine';

const ARABIC_MONTH_NAMES: Record<string, string> = {
  '01': 'يناير',
  '02': 'فبراير',
  '03': 'مارس',
  '04': 'أبريل',
  '05': 'مايو',
  '06': 'يونيو',
  '07': 'يوليو',
  '08': 'أغسطس',
  '09': 'سبتمبر',
  '10': 'أكتوبر',
  '11': 'نوفمبر',
  '12': 'ديسمبر',
};

export function formatPeriodLabelFromDate(dateOrPeriod?: string, fallback?: string): string {
  if (!dateOrPeriod) return fallback || '';
  const match = dateOrPeriod.match(/^(\d{4})-(\d{2})/);
  if (match) {
    const [, year, month] = match;
    return `${ARABIC_MONTH_NAMES[month] || month} ${year}`;
  }
  return fallback || dateOrPeriod;
}

export function formatAllocationCycleDropdownLabel(
  alloc: MonthlyAllocation,
  fallbackKey?: string
): string {
  const title = (alloc.batchTitle || alloc.periodLabel || fallbackKey || '').trim();
  const typeLabel = alloc.cycleType === 'exceptional' ? 'استثنائية' : 'دورية';
  const statusLabel =
    alloc.status === 'approved'
      ? 'معتمدة'
      : alloc.status === 'closed'
      ? 'مغلقة'
      : 'مسودة';
  return `${title} · ${typeLabel} (${statusLabel})`;
}

export interface AllocationEngineInput {
  id?: string;
  period: string;             // معرف الدورة (مثلاً "2026-10" أو "cycle-...")
  periodLabel: string;        // "أكتوبر 2026"
  batchTitle?: string;        // مسمى دورة الصرف / اسم الدفعة (مثال: كفالات نوفمبر، منحة دخول المدارس)
  cycleType?: AllocationCycleType; // نوع الدورة: شهرية دورية أو استثنائية/موسمية
  periodDate?: string;        // تاريخ الاستحقاق أو الصرف الفعلي (YYYY-MM-DD)
  executionDate?: string;     // تاريخ تنفيذ الصرف المحدد (مثال: 2026-10-25)
  coverageMonths?: number;    // معامل التغطية (1 = شهر واحد، 2 = شهرين مجمعين...)
  strategy?: 'priority_first' | 'proportional'; // خوارزمية التوزيع للدورات الدورية
  exceptionalDistributionMode?: ExceptionalDistributionMode; // نمط توزيع الدورة الاستثنائية
  flatAmountPerCase?: number; // المبلغ الموحد لكل أسرة في الدورات الاستثنائية
  cases: BeneficiaryCase[];
  donations: Donation[];
  customTotalBudget?: number; // ميزانية محددة يدوياً أو يتم احتسابها من التبرعات المتاحة
  config?: ScoringRulesConfig;
  carriedOverFromPreviousPeriod?: {
    previousPeriod: string;
    previousPeriodLabel: string;
    carriedOverAmount: number;
  };
}

export function isCaseEligibleForAllocation(c: BeneficiaryCase): boolean {
  // الحماية الرقابية: عزل الحالات غير المعتمدة تماماً (بانتظار المراجعة، إعادة للاستيفاء، أو بانتظار الزيارة)
  if (
    c.status === 'pending_review' ||
    c.status === 'needs_revision' ||
    c.status === 'pending_field_research' ||
    c.status === 'under_review' ||
    c.status === 'closed' ||
    c.status === 'temporarily_suspended'
  ) {
    return false;
  }
  // الحالات المعتمدة رسمياً للصرف فقط
  if (c.status === 'active_eligible' || c.status === ('active' as unknown as BeneficiaryCase['status'])) return true;
  if (c.status === 'pending_exception' && c.vulnerability.exceptionApproved) return true;
  return false;
}

export function getCaseMonthlyNeedBaseline(c: BeneficiaryCase): {
  monthlyNeed: number;
  usedResearcherRecommendation: boolean;
} {
  const researcherRec =
    typeof c.recommendedMonthlyAmount === 'number' && c.recommendedMonthlyAmount > 0
      ? c.recommendedMonthlyAmount
      : 0;
  if (researcherRec > 0) {
    return { monthlyNeed: researcherRec, usedResearcherRecommendation: true };
  }

  const netGap = Math.max(0, Number(c.financials?.netFinancialGap) || 0);
  if (netGap > 0) {
    return { monthlyNeed: netGap, usedResearcherRecommendation: false };
  }

  const estimatedNeed = Math.max(0, Number(c.financials?.estimatedAssistanceNeed) || 0);
  return { monthlyNeed: estimatedNeed, usedResearcherRecommendation: estimatedNeed > 0 };
}

/**
 * خوارزمية مقترح تخصيص الميزانية الشهرية المتغيرة
 * تعتمد على الاحتياج النسبي، القيود المحددة من المتبرعين، وضمان عدم تجاوز الميزانية المتاحة
 */
export function generateMonthlyAllocationProposal({
  id,
  period,
  periodLabel,
  batchTitle,
  cycleType = 'regular',
  periodDate,
  executionDate,
  coverageMonths = 1,
  strategy = 'priority_first',
  exceptionalDistributionMode = 'flat_per_case',
  flatAmountPerCase,
  cases,
  donations,
  customTotalBudget,
  config = DEFAULT_SCORING_CONFIG,
  carriedOverFromPreviousPeriod,
}: AllocationEngineInput): MonthlyAllocation {
  const effectiveCycleType: AllocationCycleType = cycleType === 'exceptional' ? 'exceptional' : 'regular';
  const coverageMultiplier =
    effectiveCycleType === 'exceptional'
      ? 1
      : coverageMonths && coverageMonths > 0
      ? coverageMonths
      : 1;
  const effectiveMaxCap = config.maxAssistanceCap * coverageMultiplier;
  const effectiveMinFloor = config.minAssistanceFloor * coverageMultiplier;
  const effectivePeriodDate =
    periodDate ||
    executionDate ||
    (/^\d{4}-\d{2}$/.test(period) ? `${period}-15` : new Date().toISOString().split('T')[0]);
  const effectiveExecutionDate = executionDate || effectivePeriodDate;
  const effectivePeriodLabel =
    periodLabel || formatPeriodLabelFromDate(effectivePeriodDate, period);
  const effectiveExceptionalMode: ExceptionalDistributionMode =
    exceptionalDistributionMode === 'split_budget' ? 'split_budget' : 'flat_per_case';
  const effectiveFlatAmount = Math.max(0, Number(flatAmountPerCase) || 0);

  // 1. حساب الرصيد المتاح من الخزينة الموحدة (كافة التبرعات المستلمة فعلياً بدون فصل مقيد/غير مقيد)
  const availableReceivedDonations = donations.filter((d) => d.status === 'received');

  const unifiedTreasuryFunds = availableReceivedDonations.reduce(
    (sum, d) => sum + (d.remainingAmount ?? d.amount),
    0
  );

  // ميزانية الدورة: ممولة بالكامل من الخزينة الموحدة
  const totalBudget = customTotalBudget !== undefined ? customTotalBudget : unifiedTreasuryFunds;
  const unrestrictedBudget = totalBudget;
  const restrictedBudget = 0;

  // 2. تصفية الحالات المؤهلة للدخول في مقترح التوزيع (اقتصار الصرف على الحالات المعتمدة رسمياً فقط)
  const eligibleCases = cases.filter((c) => isCaseEligibleForAllocation(c));

  // 3. تقييم كل حالة وحساب الدرجة والفجوة بناءً على معامل التغطية (شهر واحد / دفعة مجمعة)
  const scoredCases = eligibleCases.map((c) => {
    const assessment = calculateCaseAssessment(c, config);
    const priority = derivePriorityLevel(assessment.totalScore);
    const { monthlyNeed, usedResearcherRecommendation } = getCaseMonthlyNeedBaseline(c);
    return {
      caseItem: c,
      assessment,
      priority,
      score: assessment.totalScore,
      gap: monthlyNeed * coverageMultiplier,
      usedResearcherRecommendation,
    };
  });

  const priorityRanks: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  if (strategy === 'priority_first') {
    // خوارزمية تغطية الحالات الحرجة أولاً: ترتيب بحسب رتبة الأولوية أولاً، ثم درجة الاستحقاق، ثم الفجوة
    scoredCases.sort((a, b) => {
      const rankDiff = (priorityRanks[b.priority] || 0) - (priorityRanks[a.priority] || 0);
      if (rankDiff !== 0) return rankDiff;
      if (b.score !== a.score) return b.score - a.score;
      return b.gap - a.gap;
    });
  } else {
    // ترتيب تنازلي عام حسب الدرجة ثم الفجوة
    scoredCases.sort((a, b) => b.score - a.score || b.gap - a.gap);
  }

  const items: AllocationItem[] = [];
  let remainingBudget = totalBudget;

  // 4. احتساب الأوزان النسبية للميزانية غير المقيدة (للدورة الدورية النسبية) وعدد الأسر النشطة (للدورة الاستثنائية)
  const activeNonOverdueCount = scoredCases.filter(
    (item) => !checkVisitOverdueStatus(item.caseItem.lastVisitDate, config.overdueVisitMonths).isOverdue
  ).length;

  const exceptionalSplitPerFamily =
    effectiveCycleType === 'exceptional' &&
    effectiveExceptionalMode === 'split_budget' &&
    activeNonOverdueCount > 0 &&
    totalBudget > 0
      ? (() => {
          const rawShare = totalBudget / activeNonOverdueCount;
          return rawShare >= 50 ? Math.floor(rawShare / 50) * 50 : Math.floor(rawShare);
        })()
      : 0;

  const totalWeightedNeed = scoredCases.reduce((sum, item) => {
    const vCheck = checkVisitOverdueStatus(item.caseItem.lastVisitDate, config.overdueVisitMonths);
    if (vCheck.isOverdue) return sum;
    const weight = (item.score / 100) * Math.min(item.gap, effectiveMaxCap);
    return sum + weight;
  }, 0);

  // 5. حساب الحصة لكل حالة من الصندوق العام
  for (const { caseItem, priority, score, gap, usedResearcherRecommendation } of scoredCases) {
    let proposedAmount = 0;
    const fundSource: AllocationItem['fundSource'] = 'unrestricted_pool';
    let fundSourceName = 'الخزينة الموحدة';
    const reasons: string[] = [];

    // التحقق الحسابي من تأخر الزيارة الميدانية للأسرة
    const visitStatus = checkVisitOverdueStatus(caseItem.lastVisitDate, config.overdueVisitMonths);
    const isVisitOverdue = visitStatus.isOverdue;

    if (remainingBudget <= 0) {
      reasons.push('لا توجد ميزانية متبقية للصرف بعد تغطية الحالات الأعلى أولوية');
      items.push({
        id: `alloc-item-${caseItem.id}-${period}`,
        caseId: caseItem.id,
        caseCode: caseItem.code,
        caseName: caseItem.fullName,
        priority,
        score,
        financialGap: gap,
        proposedAmount: 0,
        approvedAmount: 0,
        fundSource: 'unrestricted_pool',
        fundSourceName: 'غير مخصص',
        reasoning: reasons.join(' · '),
        isExcluded: false,
        isManuallyAdjusted: false,
        isVisitOverdue,
        overdueMonthsElapsed: visitStatus.monthsElapsed,
      });
      continue;
    }

    if (isVisitOverdue) {
      reasons.push(
        `إيقاف مقترح الصرف رقابياً: تجاوزت مدة الزيارة الميدانية (${visitStatus.monthsElapsed} أشهر مقابل الحد الأقصى المعتمد ${config.overdueVisitMonths} أشهر) - بانتظار تحديث البحث الميداني`
      );
      fundSourceName = 'موقوفة (زيارة متأخرة)';
    } else if (effectiveCycleType === 'exceptional') {
      if (effectiveExceptionalMode === 'flat_per_case') {
        const targetFlat = effectiveFlatAmount > 0 ? effectiveFlatAmount : 1000;
        const share = Math.min(targetFlat, remainingBudget);
        if (share > 0) {
          proposedAmount = share;
          remainingBudget -= share;
          fundSourceName = 'الخزينة الموحدة';
          reasons.push(
            share >= targetFlat
              ? `منحة استثنائية موحدة بقيمة ${share.toLocaleString('en-US')} ج.م لكل أسرة مستحقة`
              : `تخصيص جزئي من المنحة الاستثنائية بقيمة ${share.toLocaleString('en-US')} ج.م وفق الرصيد المتاح`
          );
        }
      } else {
        const share = Math.min(exceptionalSplitPerFamily, remainingBudget);
        if (share > 0) {
          proposedAmount = share;
          remainingBudget -= share;
          fundSourceName = 'الخزينة الموحدة';
          reasons.push(
            `توزيع متساوٍ لميزانية الدورة الاستثنائية (${share.toLocaleString('en-US')} ج.م لكل أسرة من أصل ${activeNonOverdueCount} أسرة مستحقة)`
          );
        }
      }
    } else if (strategy === 'priority_first') {
      // استراتيجية الأولوية أولاً (تغطية كامل العجز للحالات الحرجة أولاً)
      const targetNeed = Math.min(gap, effectiveMaxCap);
      const allocatable = Math.min(targetNeed, remainingBudget);
      let shareRounded = Math.round(allocatable / 50) * 50;

      if (shareRounded < effectiveMinFloor && remainingBudget >= effectiveMinFloor && targetNeed >= effectiveMinFloor) {
        shareRounded = effectiveMinFloor;
      }
      shareRounded = Math.min(shareRounded, gap, effectiveMaxCap, remainingBudget);

      if (shareRounded > 0) {
        proposedAmount = shareRounded;
        remainingBudget -= shareRounded;
        fundSourceName = 'الخزينة الموحدة';

        const capText = coverageMultiplier > 1
          ? `سقف مضاعف ${effectiveMaxCap.toLocaleString('en-US')} ج.م (${coverageMultiplier} أشهر)`
          : `سقف ${effectiveMaxCap.toLocaleString('en-US')} ج.م`;

        const isFullCoverage = shareRounded >= Math.min(gap, effectiveMaxCap);
        if (isFullCoverage) {
          reasons.push(
            priority === 'critical'
              ? `تغطية كاملة لفجوة العجز (${shareRounded.toLocaleString('en-US')} ج.م) كأولوية قصوى (${score}/100) و${capText}`
              : `تغطية كاملة لاحتياج الحالة (${shareRounded.toLocaleString('en-US')} ج.م) ضمن ميزانية الأولوية (${getPriorityLabel(priority)}) و${capText}`
          );
        } else {
          reasons.push(
            `تغطية جزئية بقيمة ${shareRounded.toLocaleString('en-US')} ج.م وفق الرصيد المتبقي للأولوية (${getPriorityLabel(priority)})`
          );
        }
      }
    } else {
      // استراتيجية الصرف بالنسبة والتناسب
      if (totalWeightedNeed > 0 && remainingBudget > 0) {
        const weight = (score / 100) * Math.min(gap, effectiveMaxCap);
        const proportionalShare = (weight / totalWeightedNeed) * unrestrictedBudget;

        let shareRounded = Math.round(proportionalShare / 50) * 50;

        if (shareRounded < effectiveMinFloor && remainingBudget >= effectiveMinFloor) {
          shareRounded = effectiveMinFloor;
        }
        shareRounded = Math.min(
          shareRounded,
          gap,
          effectiveMaxCap,
          remainingBudget
        );

        if (shareRounded > 0) {
          proposedAmount = shareRounded;
          remainingBudget -= shareRounded;
          fundSourceName = 'الخزينة الموحدة';
          const capText = coverageMultiplier > 1
            ? `سقف مضاعف ${effectiveMaxCap.toLocaleString('en-US')} ج.م (${coverageMultiplier} أشهر)`
            : `سقف ${effectiveMaxCap.toLocaleString('en-US')} ج.م`;
          reasons.push(`دعم شهري دوري ${shareRounded.toLocaleString('en-US')} ج.م من الخزينة الموحدة استناداً للأولوية (${score}/100) و${capText}`);
        }
      }
    }

    if (effectiveCycleType === 'regular' && usedResearcherRecommendation && proposedAmount > 0) {
      reasons.unshift(
        `بناءً على توصية الباحث الميداني (${gap.toLocaleString('en-US')} ج.م)`
      );
    }

    if (effectiveCycleType === 'regular' && coverageMultiplier > 1) {
      reasons.unshift(`دفعة مجمعة تغطي ${coverageMultiplier} أشهر`);
    }

    if (reasons.length === 0) {
      reasons.push(`تم احتساب الدعم بناءً على فجوة ${gap.toLocaleString('en-US')} ج.م وأولوية ${priority}`);
    }

    items.push({
      id: `alloc-item-${caseItem.id}-${period}`,
      caseId: caseItem.id,
      caseCode: caseItem.code,
      caseName: caseItem.fullName,
      priority,
      score,
      financialGap: gap,
      proposedAmount,
      approvedAmount: proposedAmount,
      fundSource,
      fundSourceName,
      reasoning: reasons.join(' · '),
      isExcluded: false,
      isManuallyAdjusted: false,
      isVisitOverdue,
      overdueMonthsElapsed: visitStatus.monthsElapsed,
    });
  }

  // الحالات المستبعدة مسبقاً من الشهر
  cases
    .filter((c) => c.status === 'excluded_current_month')
    .forEach((c) => {
      const assessment = calculateCaseAssessment(c, config);
      items.push({
        id: `alloc-item-excluded-${c.id}-${period}`,
        caseId: c.id,
        caseCode: c.code,
        caseName: c.fullName,
        priority: derivePriorityLevel(assessment.totalScore),
        score: assessment.totalScore,
        financialGap: c.financials.netFinancialGap * coverageMultiplier,
        proposedAmount: 0,
        approvedAmount: 0,
        fundSource: 'unrestricted_pool',
        fundSourceName: 'غير مخصص',
        reasoning: 'حالة مستبعدة مؤقتاً من توزيع هذا الشهر بقرار مسبق',
        isExcluded: true,
        exclusionReason: 'استبعاد مؤقت من دورة الصرف الحالية',
        isManuallyAdjusted: false,
      });
    });

  const summary = calculateAllocationSummary(items, totalBudget);

  return {
    id: id || `alloc-${period}`,
    period,
    periodLabel: effectivePeriodLabel,
    batchTitle: batchTitle || effectivePeriodLabel,
    cycleType: effectiveCycleType,
    periodDate: effectivePeriodDate,
    executionDate: effectiveExecutionDate,
    coverageMonths: coverageMultiplier,
    allocationStrategy: strategy || 'priority_first',
    exceptionalDistributionMode:
      effectiveCycleType === 'exceptional' ? effectiveExceptionalMode : undefined,
    flatAmountPerCase:
      effectiveCycleType === 'exceptional' && effectiveExceptionalMode === 'flat_per_case'
        ? effectiveFlatAmount || 1000
        : undefined,
    totalBudget,
    unrestrictedBudget,
    restrictedBudget,
    status: 'draft',
    generatedDate: new Date().toISOString(),
    carriedOverFromPreviousPeriod,
    items,
    summary,
  };
}

/**
 * إعادة حساب ملخص التوزيع بعد أي تعديل أو استبعاد يدوي وفق المعايير المحاسبية المنضبطة (ERP)
 * - فصل الحالات المؤهلة النشطة عن الحالات الموقوفة رقابياً (تأخر الزيارة الميدانية)
 * - احتساب العجز التمويلي على مستوى السطر الفردي (Per-Item Deficit)
 * - حماية الفائض غير المخصص بالخزينة ليكون المرجع الحصري لأي زيادات دون المساس بالحالات الأخرى
 */
export function calculateAllocationSummary(
  items: AllocationItem[],
  totalBudget: number
) {
  let totalAllocated = 0;
  let totalAssessedNeed = 0;
  let unmetNeed = 0;
  let totalOverdueSuspendedNeed = 0;
  let overdueSuspendedCasesCount = 0;
  let eligibleCasesCount = 0;
  let excludedCasesCount = 0;
  let fundedCasesCount = 0;

  items.forEach((item) => {
    if (item.isExcluded) {
      excludedCasesCount++;
      return;
    }

    eligibleCasesCount++;
    const amount = item.approvedAmount || 0;
    totalAllocated += amount;
    if (amount > 0) {
      fundedCasesCount++;
    }

    if (item.isVisitOverdue) {
      // حالة موقوفة رقابياً لتأخر الزيارة الميدانية
      overdueSuspendedCasesCount++;
      const suspendedGap = Math.max(0, item.financialGap - amount);
      totalOverdueSuspendedNeed += suspendedGap;
    } else {
      // حالة مؤهلة ونشطة في دورة الصرف
      totalAssessedNeed += item.financialGap;
      const itemDeficit = Math.max(0, item.financialGap - amount);
      unmetNeed += itemDeficit;
    }
  });

  const unallocatedBalance = Math.max(0, totalBudget - totalAllocated);

  return {
    totalAllocated,
    unallocatedBalance,
    totalAssessedNeed,
    unmetNeed,
    totalOverdueSuspendedNeed,
    overdueSuspendedCasesCount,
    eligibleCasesCount,
    excludedCasesCount,
    fundedCasesCount,
  };
}

/**
 * التحقق مما إذا كانت مسودة دورة الصرف بحاجة إلى مزامنة مع سجل الحالات الحالي
 * (مثلاً: اعتماد حالة جديدة لم تدخل المسودة بعد، إغلاق حالة قائمة، أو تغيّر حالة تأخر الزيارة أو توصية الباحث)
 */
export function doesDraftAllocationNeedSync(
  draft: MonthlyAllocation | undefined,
  cases: BeneficiaryCase[],
  config: ScoringRulesConfig = DEFAULT_SCORING_CONFIG
): boolean {
  if (!draft || draft.status !== 'draft') return false;

  const expectedCaseIds = new Set<string>();
  const caseById = new Map<string, BeneficiaryCase>();

  cases.forEach((c) => {
    caseById.set(c.id, c);
    if (isCaseEligibleForAllocation(c) || c.status === 'excluded_current_month') {
      expectedCaseIds.add(c.id);
    }
  });

  const existingCaseIds = new Set(draft.items.map((i) => i.caseId));

  // 1. حالة مؤهلة جديدة لم تدخل المسودة بعد
  for (const id of expectedCaseIds) {
    if (!existingCaseIds.has(id)) return true;
  }

  // 2. حالة موجودة في المسودة لم تعد مؤهلة (أُغلقت/أُوقفت/أُعيدت للاستيفاء)
  for (const id of existingCaseIds) {
    if (!expectedCaseIds.has(id)) return true;
  }

  // 3. تغيّر حالة تأخر الزيارة أو فجوة الاحتياج الأساسية لحالة غير معدّلة يدوياً
  const coverageMultiplier =
    draft.cycleType === 'exceptional'
      ? 1
      : draft.coverageMonths && draft.coverageMonths > 0
      ? draft.coverageMonths
      : 1;
  for (const item of draft.items) {
    const liveCase = caseById.get(item.caseId);
    if (!liveCase) return true;

    if (liveCase.status === 'excluded_current_month') {
      continue;
    }

    const liveOverdue = checkVisitOverdueStatus(
      liveCase.lastVisitDate,
      config.overdueVisitMonths
    ).isOverdue;
    if (Boolean(item.isVisitOverdue) !== liveOverdue) return true;

    const { monthlyNeed } = getCaseMonthlyNeedBaseline(liveCase);
    const expectedGap = monthlyNeed * coverageMultiplier;
    if (!item.isManuallyAdjusted && !item.isExcluded && item.financialGap !== expectedGap) {
      return true;
    }
  }

  return false;
}

/**
 * مزامنة حتمية لمسودة دورة صرف مع سجل الحالات الحالي:
 * - تدرج الحالات المعتمدة حديثاً وتزيل غير المؤهلة
 * - تحافظ بالكامل على التعديلات اليدوية (isManuallyAdjusted) والاستبعادات اليدوية (isExcluded)
 * - تدعم الدورات الدورية والاستثنائية دون المساس بالدورات المعتمدة أو المغلقة مطلقاً
 */
export function reconcileDraftAllocationWithCases(
  existingDraft: MonthlyAllocation,
  cases: BeneficiaryCase[],
  donations: Donation[],
  config: ScoringRulesConfig = DEFAULT_SCORING_CONFIG
): MonthlyAllocation {
  if (existingDraft.status !== 'draft') {
    return existingDraft;
  }

  const freshProposal = generateMonthlyAllocationProposal({
    id: existingDraft.id,
    period: existingDraft.period,
    periodLabel: existingDraft.periodLabel,
    batchTitle: existingDraft.batchTitle,
    cycleType: existingDraft.cycleType || 'regular',
    periodDate: existingDraft.periodDate || existingDraft.executionDate,
    executionDate: existingDraft.executionDate || existingDraft.periodDate,
    coverageMonths: existingDraft.coverageMonths || 1,
    strategy: existingDraft.allocationStrategy || 'priority_first',
    exceptionalDistributionMode: existingDraft.exceptionalDistributionMode,
    flatAmountPerCase: existingDraft.flatAmountPerCase,
    cases,
    donations,
    customTotalBudget: existingDraft.totalBudget,
    config,
    carriedOverFromPreviousPeriod: existingDraft.carriedOverFromPreviousPeriod,
  });

  const previousByCaseId = new Map<string, AllocationItem>(
    existingDraft.items.map((item) => [item.caseId, item])
  );

  const mergedItems: AllocationItem[] = freshProposal.items.map((freshItem) => {
    const prev = previousByCaseId.get(freshItem.caseId);
    if (!prev) {
      return freshItem;
    }

    const preserveManualExclusion = prev.isExcluded && !freshItem.isExcluded;
    const preserveManualAmount = prev.isManuallyAdjusted && !preserveManualExclusion;

    if (preserveManualExclusion) {
      return {
        ...freshItem,
        isExcluded: true,
        exclusionReason: prev.exclusionReason || 'تم الاستبعاد بقرار إداري',
        approvedAmount: 0,
        isManuallyAdjusted: prev.isManuallyAdjusted,
        adjustmentReason: prev.adjustmentReason,
      };
    }

    if (preserveManualAmount) {
      return {
        ...freshItem,
        approvedAmount: prev.approvedAmount,
        isManuallyAdjusted: true,
        adjustmentReason: prev.adjustmentReason,
      };
    }

    return freshItem;
  });

  const reconciledSummary = calculateAllocationSummary(mergedItems, existingDraft.totalBudget);

  return {
    ...freshProposal,
    sessionMinutesNumber: existingDraft.sessionMinutesNumber,
    sessionMinutesDate: existingDraft.sessionMinutesDate,
    unlockedDate: existingDraft.unlockedDate,
    unlockedBy: existingDraft.unlockedBy,
    unlockReason: existingDraft.unlockReason,
    isExceptionallyUnlocked: existingDraft.isExceptionallyUnlocked,
    items: mergedItems,
    summary: reconciledSummary,
  };
}
