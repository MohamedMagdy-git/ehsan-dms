import {
  BeneficiaryCase,
  Donation,
  MonthlyAllocation,
  AllocationItem,
  ScoringRulesConfig,
} from '@/types';
import {
  calculateCaseAssessment,
  DEFAULT_SCORING_CONFIG,
  derivePriorityLevel,
  getPriorityLabel,
  checkVisitOverdueStatus,
} from './scoring-engine';

export interface AllocationEngineInput {
  period: string;             // "2026-10"
  periodLabel: string;        // "أكتوبر 2026"
  batchTitle?: string;        // مسمى دورة الصرف / اسم الدفعة (مثال: كفالات نوفمبر، دفعة معونة الشتاء)
  executionDate?: string;     // تاريخ تنفيذ الصرف المحدد (مثال: 2026-10-25)
  coverageMonths?: number;    // معامل التغطية (1 = شهر واحد، 2 = شهرين مجمعين...)
  strategy?: 'priority_first' | 'proportional'; // خوارزمية التوزيع: الأولوية أولاً (تغطية 100% للحالات الحرجة أولاً) أو نسبية
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

/**
 * خوارزمية مقترح تخصيص الميزانية الشهرية المتغيرة
 * تعتمد على الاحتياج النسبي، القيود المحددة من المتبرعين، وضمان عدم تجاوز الميزانية المتاحة
 */
export function generateMonthlyAllocationProposal({
  period,
  periodLabel,
  batchTitle,
  executionDate,
  coverageMonths = 1,
  strategy = 'priority_first',
  cases,
  donations,
  customTotalBudget,
  config = DEFAULT_SCORING_CONFIG,
  carriedOverFromPreviousPeriod,
}: AllocationEngineInput): MonthlyAllocation {
  const coverageMultiplier = coverageMonths && coverageMonths > 0 ? coverageMonths : 1;
  const effectiveMaxCap = config.maxAssistanceCap * coverageMultiplier;
  const effectiveMinFloor = config.minAssistanceFloor * coverageMultiplier;

  // 1. حساب الأرصدة المتاحة من التبرعات المحصلة
  const availableReceivedDonations = donations.filter((d) => d.status === 'received');

  // الصندوق العام (غير المقيد): المخصص حصرياً للميزانية الشهرية الدورية
  const unrestrictedFunds = availableReceivedDonations
    .filter((d) => d.restrictionType === 'unrestricted')
    .reduce((sum, d) => sum + (d.remainingAmount ?? d.amount), 0);

  // ميزانية الدورة الشهرية: ممولة حصرياً وافتراضياً من الصندوق العام غير المقيد
  // لحماية الصناديق المقيدة لمسار الصرف الفوري فقط
  const totalBudget = customTotalBudget !== undefined ? customTotalBudget : unrestrictedFunds;
  const unrestrictedBudget = totalBudget;
  const restrictedBudget = 0;

  // 2. تصفية الحالات المؤهلة للدخول في مقترح التوزيع (اقتصار الصرف على الحالات المعتمدة رسمياً فقط)
  const eligibleCases = cases.filter((c) => {
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
    if (c.status === 'active_eligible' || c.status === ('active' as any)) return true;
    if (c.status === 'pending_exception' && c.vulnerability.exceptionApproved) return true;
    return false;
  });

  // 3. تقييم كل حالة وحساب الدرجة والفجوة بناءً على معامل التغطية (شهر واحد / دفعة مجمعة)
  const scoredCases = eligibleCases.map((c) => {
    const assessment = calculateCaseAssessment(c, config);
    const priority = derivePriorityLevel(assessment.totalScore);
    const monthlyGap = Math.max(0, c.financials.netFinancialGap);
    return {
      caseItem: c,
      assessment,
      priority,
      score: assessment.totalScore,
      gap: monthlyGap * coverageMultiplier,
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

  // 4. احتساب الأوزان النسبية للميزانية غير المقيدة (في حال التوزيع النسبي)
  const totalWeightedNeed = scoredCases.reduce((sum, item) => {
    const vCheck = checkVisitOverdueStatus(item.caseItem.lastVisitDate, config.overdueVisitMonths);
    if (vCheck.isOverdue) return sum;
    const weight = (item.score / 100) * Math.min(item.gap, effectiveMaxCap);
    return sum + weight;
  }, 0);

  // 5. حساب الحصة الشهرية الدورية لكل حالة من الصندوق العام
  for (const { caseItem, assessment, priority, score, gap } of scoredCases) {
    let proposedAmount = 0;
    const fundSource: AllocationItem['fundSource'] = 'unrestricted_pool';
    let fundSourceName = 'الصندوق العام (غير مقيد)';
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
        fundSourceName = 'الصندوق العام (غير مقيد)';

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
          fundSourceName = 'الصندوق العام (غير مقيد)';
          const capText = coverageMultiplier > 1
            ? `سقف مضاعف ${effectiveMaxCap.toLocaleString('en-US')} ج.م (${coverageMultiplier} أشهر)`
            : `سقف ${effectiveMaxCap.toLocaleString('en-US')} ج.م`;
          reasons.push(`دعم شهري دوري ${shareRounded.toLocaleString('en-US')} ج.م من الصندوق العام استناداً للأولوية (${score}/100) و${capText}`);
        }
      }
    }

    if (coverageMultiplier > 1) {
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
    id: `alloc-${period}`,
    period,
    periodLabel,
    batchTitle: batchTitle || periodLabel,
    executionDate: executionDate || (period ? `${period}-15` : new Date().toISOString().split('T')[0]),
    coverageMonths: coverageMultiplier,
    allocationStrategy: strategy || 'priority_first',
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
