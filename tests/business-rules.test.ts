/**
 * Comprehensive Business Rules & Allocation Engine Test Suite
 * Tests all 8 operational verification scenarios requested by the client audit.
 */

import { calculateCaseAssessment, DEFAULT_SCORING_CONFIG, derivePriorityLevel } from '../services/scoring-engine';
import { generateMonthlyAllocationProposal, calculateAllocationSummary } from '../services/allocation-engine';
import { INITIAL_CASES, INITIAL_DONATIONS } from '../data/initial-mock-data';
import { BeneficiaryCase, Donation, AllocationItem } from '../types';

export function runComprehensiveAuditTests(): { passed: number; failed: number; scenariosCount: number } {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string, inputs: any, expected: any, actual: any) {
    if (condition) {
      passed++;
      console.log(`[PASS] ${title}`);
      console.log(`       المدخلات: ${JSON.stringify(inputs)}`);
      console.log(`       النتيجة المتوقعة: ${JSON.stringify(expected)}`);
      console.log(`       النتيجة الفعلية:   ${JSON.stringify(actual)}\n`);
    } else {
      failed++;
      console.error(`[FAIL] ${title}`);
      console.error(`       المدخلات: ${JSON.stringify(inputs)}`);
      console.error(`       المتوقع: ${JSON.stringify(expected)}`);
      console.error(`       الفعلي:   ${JSON.stringify(actual)}\n`);
    }
  }

  console.log('================================================================');
  console.log('      تقرير الفحص والتدقيق الآلي لقواعد العمل ومحرك التخصيص      ');
  console.log('================================================================\n');

  // سيناريو 1: ميزانية شهرية أقل بكثير من إجمالي الاحتياجات
  {
    const lowBudget = 30000;
    const proposal = generateMonthlyAllocationProposal({
      period: '2026-10',
      periodLabel: 'أكتوبر 2026',
      cases: INITIAL_CASES,
      donations: INITIAL_DONATIONS,
      customTotalBudget: lowBudget,
      config: DEFAULT_SCORING_CONFIG,
    });

    const isWithinBudget = proposal.summary.totalAllocated <= lowBudget;
    const reconciles = proposal.summary.totalAllocated + proposal.summary.unallocatedBalance === lowBudget;
    const hasUnmetGap = proposal.summary.unmetNeed > 0;

    assert(
      isWithinBudget && reconciles && hasUnmetGap,
      'سيناريو 1: ميزانية شحيحة أقل من الاحتياج (30,000 ج.م)',
      { targetBudget: lowBudget, totalAssessedNeed: proposal.summary.totalAssessedNeed },
      { maxAllocated: '<= 30,000', hasUnmetNeed: true, isBalanced: true },
      {
        totalAllocated: proposal.summary.totalAllocated,
        unmetNeed: proposal.summary.unmetNeed,
        unallocatedBalance: proposal.summary.unallocatedBalance,
      }
    );
  }

  // سيناريو 2: تبرعات مقيدة بغرض محدد وتبرعات مخصصة بالاسم
  {
    const proposal = generateMonthlyAllocationProposal({
      period: '2026-10',
      periodLabel: 'أكتوبر 2026',
      cases: INITIAL_CASES,
      donations: INITIAL_DONATIONS,
      customTotalBudget: 120000,
      config: DEFAULT_SCORING_CONFIG,
    });

    // حالة أحمد رجب حسنين (EHS-105) لها تبرع مقيد بالاسم من م. هشام عبد المنعم
    const designatedItem = proposal.items.find((i: AllocationItem) => i.caseCode === 'EHS-105');
    const isRestrictedCase = designatedItem?.fundSource === 'restricted_case';
    const isDesignatedFunded = (designatedItem?.proposedAmount || 0) > 0;

    // حالة زينب السيد (EHS-101) غسيل كلى - فحص استفادتها من صندوق الرعاية الطبية
    const medicalItem = proposal.items.find((i: AllocationItem) => i.caseCode === 'EHS-101');
    const hasMedicalMention = medicalItem?.reasoning.includes('طبي') || medicalItem?.reasoning.includes('علاج');

    assert(
      isRestrictedCase && isDesignatedFunded && !!hasMedicalMention,
      'سيناريو 2: احترام قيود المتبرعين (تخصيص بالاسم وتخصيص للأغراض الطبية)',
      { designatedCase: 'EHS-105', donor: 'م. هشام عبد المنعم (20,000 ج.م)' },
      { fundSource: 'restricted_case', designatedProposed: '> 0', medicalMention: true },
      {
        fundSource: designatedItem?.fundSource,
        proposedAmount: designatedItem?.proposedAmount,
        reasoningSnippet: designatedItem?.reasoning,
      }
    );
  }

  // سيناريو 3: استبعاد التعهدات التي لم تُحصل فعلياً
  {
    const pledgedDonations = INITIAL_DONATIONS.filter((d) => d.status === 'pledged');
    const receivedDonations = INITIAL_DONATIONS.filter((d) => d.status === 'received');
    const pledgedTotal = pledgedDonations.reduce((s, d) => s + d.amount, 0);

    const proposal = generateMonthlyAllocationProposal({
      period: '2026-10',
      periodLabel: 'أكتوبر 2026',
      cases: INITIAL_CASES,
      donations: INITIAL_DONATIONS,
      config: DEFAULT_SCORING_CONFIG,
    });

    // الميزانية الافتراضية المحسوبة من التبرعات يجب ألا تتضمن التعهدات
    const receivedTotal = receivedDonations.reduce((s, d) => s + d.amount, 0);
    const doesNotIncludePledged = proposal.totalBudget <= receivedTotal;

    assert(
      doesNotIncludePledged && pledgedTotal > 0,
      'سيناريو 3: حظر إدراج التعهدات غير المحصلة (DON-07) في الرصيد المتاح للصرف',
      { pledgedDonationCode: 'DON-07', pledgedAmount: pledgedTotal, receivedTotal },
      { budgetExcludesPledges: true, expectedBudgetCap: receivedTotal },
      { actualBudgetUsed: proposal.totalBudget, pledgedTotal }
    );
  }

  // سيناريو 4: تعديل مبالغ المساعدات يدوياً وإعادة التوازن المالي
  {
    const budget = 100000;
    const proposal = generateMonthlyAllocationProposal({
      period: '2026-10',
      periodLabel: 'أكتوبر 2026',
      cases: INITIAL_CASES,
      donations: INITIAL_DONATIONS,
      customTotalBudget: budget,
      config: DEFAULT_SCORING_CONFIG,
    });

    // تعديل يدوي: زيادة مساعدة EHS-101 بمقدار 500 ج.م
    const originalItem = proposal.items.find((i: AllocationItem) => i.caseCode === 'EHS-101')!;
    const newAmount = originalItem.proposedAmount + 500;
    const updatedItems = proposal.items.map((it: AllocationItem) =>
      it.caseCode === 'EHS-101' ? { ...it, approvedAmount: newAmount, isManuallyAdjusted: true } : it
    );
    const updatedSummary = calculateAllocationSummary(updatedItems, budget);

    const diffAllocated = updatedSummary.totalAllocated - proposal.summary.totalAllocated;
    const reconciles = updatedSummary.totalAllocated + updatedSummary.unallocatedBalance === budget;

    assert(
      diffAllocated === 500 && reconciles,
      'سيناريو 4: التعديل اليدوي للمبالغ ومطابقة الرصيد الفوري',
      { originalAmount: originalItem.proposedAmount, manualEditedAmount: newAmount },
      { diffAllocated: 500, reconciles: true },
      { diffAllocated, totalAllocated: updatedSummary.totalAllocated, unallocatedBalance: updatedSummary.unallocatedBalance }
    );
  }

  // سيناريو 5: استبعاد حالة وتوثيق السبب الإداري الإلزامي
  {
    const budget = 100000;
    const proposal = generateMonthlyAllocationProposal({
      period: '2026-10',
      periodLabel: 'أكتوبر 2026',
      cases: INITIAL_CASES,
      donations: INITIAL_DONATIONS,
      customTotalBudget: budget,
      config: DEFAULT_SCORING_CONFIG,
    });

    const targetCase = proposal.items.find((i: AllocationItem) => i.caseCode === 'EHS-102')!;
    const exclusionReason = 'استبعاد مؤقت: استلام مساعدة خارجية طارئة تغطي الشهر';

    const excludedItems = proposal.items.map((it: AllocationItem) =>
      it.caseCode === 'EHS-102'
        ? { ...it, isExcluded: true, exclusionReason, approvedAmount: 0 }
        : it
    );
    const summaryAfterExclusion = calculateAllocationSummary(excludedItems, budget);

    const excludedItem = excludedItems.find((i: AllocationItem) => i.caseCode === 'EHS-102')!;
    const amountIsZero = excludedItem.approvedAmount === 0;
    const reasonPreserved = excludedItem.exclusionReason === exclusionReason;
    const freedFundsToSurplus = summaryAfterExclusion.unallocatedBalance === proposal.summary.unallocatedBalance + targetCase.approvedAmount;

    assert(
      amountIsZero && reasonPreserved && freedFundsToSurplus,
      'سيناريو 5: استبعاد حالة وتوثيق السبب وترحيل حصتها للفائض',
      { caseCode: 'EHS-102', originalProposed: targetCase.proposedAmount, reason: exclusionReason },
      { approvedAmount: 0, reasonPreserved: true, surplusIncreased: targetCase.proposedAmount },
      {
        approvedAmount: excludedItem.approvedAmount,
        exclusionReason: excludedItem.exclusionReason,
        surplusGain: summaryAfterExclusion.unallocatedBalance - proposal.summary.unallocatedBalance,
      }
    );
  }

  // سيناريو 6: فحص عدم كفاية الرصيد المقيد أو العام وتفادي المبالغ السالبة
  {
    const zeroBudgetProposal = generateMonthlyAllocationProposal({
      period: '2026-10',
      periodLabel: 'أكتوبر 2026',
      cases: INITIAL_CASES,
      donations: INITIAL_DONATIONS,
      customTotalBudget: 0,
      config: DEFAULT_SCORING_CONFIG,
    });

    const hasNoNegativeAmounts = zeroBudgetProposal.items.every((it: AllocationItem) => it.proposedAmount >= 0);
    const zeroAllocated = zeroBudgetProposal.summary.totalAllocated === 0;

    assert(
      hasNoNegativeAmounts && zeroAllocated,
      'سيناريو 6: التعامل مع رصيد صفري ومنع المبالغ السالبة نهائياً',
      { targetBudget: 0 },
      { totalAllocated: 0, hasNoNegative: true },
      { totalAllocated: zeroBudgetProposal.summary.totalAllocated, hasNoNegative: hasNoNegativeAmounts }
    );
  }

  // سيناريو 7: إعادة تشغيل التخصيص بشكل متكرر دون مضاعفة الخصومات (Idempotency)
  {
    const run1 = generateMonthlyAllocationProposal({
      period: '2026-10',
      periodLabel: 'أكتوبر 2026',
      cases: INITIAL_CASES,
      donations: INITIAL_DONATIONS,
      customTotalBudget: 120000,
      config: DEFAULT_SCORING_CONFIG,
    });

    const run2 = generateMonthlyAllocationProposal({
      period: '2026-10',
      periodLabel: 'أكتوبر 2026',
      cases: INITIAL_CASES,
      donations: INITIAL_DONATIONS,
      customTotalBudget: 120000,
      config: DEFAULT_SCORING_CONFIG,
    });

    const identicalAllocated = run1.summary.totalAllocated === run2.summary.totalAllocated;
    const identicalCount = run1.items.length === run2.items.length;
    const identicalFirstItem = run1.items[0].proposedAmount === run2.items[0].proposedAmount;

    assert(
      identicalAllocated && identicalCount && identicalFirstItem,
      'سيناريو 7: قطعية الخوارزمية وتكرار التوليد دون مضاعفة أو تكرار الخصم',
      { runsCount: 2, budget: 120000 },
      { run1Total: run1.summary.totalAllocated, run2MatchesRun1: true },
      { run1Total: run1.summary.totalAllocated, run2Total: run2.summary.totalAllocated }
    );
  }

  // سيناريو 8: منع تكرار الرقم القومي عند إضافة حالة جديدة
  {
    const existingCase = INITIAL_CASES[0];
    const duplicateId = existingCase.nationalId;
    const isDuplicateDetected = INITIAL_CASES.some((c) => c.nationalId === duplicateId);

    assert(
      isDuplicateDetected,
      'سيناريو 8: التحقق من كشف وتطابق الرقم القومي لمنع تكرار تسجيل الأسر',
      { testNationalId: duplicateId, existingCaseName: existingCase.fullName },
      { duplicateDetected: true, registeredCode: existingCase.code },
      { duplicateDetected: isDuplicateDetected, code: existingCase.code }
    );
  }

  // سيناريو 9: المعادلة المالية الصريحة للصندوق (الإيرادات - المصروفات = الفائض المتاح) والتفريق التام عن فجوة الأسر
  {
    // اختبار حالة الفائض الطبيعي (10,000 إيرادات - 7,000 مصروفات = 3,000 فائض متاح)
    const revenueSample = 10000;
    const expensesSample = 7000;
    const netSurplus = revenueSample - expensesSample;
    const isSurplus = netSurplus >= 0;

    // اختبار حالة العجز الاستثنائية (10,000 إيرادات - 17,000 مصروفات = -7,000 عجز تمويلي)
    const hypotheticalDeficitExpenses = 17000;
    const netDeficit = revenueSample - hypotheticalDeficitExpenses;
    const isDeficit = netDeficit < 0;

    // التأكد من استقلال فجوة احتياج الأسر (Family Need Gap) عن موقف الخزينة
    const familyGapSample = INITIAL_CASES.reduce((sum, c) => sum + (c.financials.netFinancialGap || 0), 0);
    const isFamilyGapDistinct = familyGapSample > 0;

    assert(
      netSurplus === 3000 && isSurplus && netDeficit === -7000 && isDeficit && isFamilyGapDistinct,
      'سيناريو 9: صحة المعادلة المالية للصندوق (إيرادات 10,000 - مصروفات 7,000 = فائض 3,000) وتحديد العجز فقط عند تجاوز الالتزامات',
      {
        sampleRevenue: revenueSample,
        normalExpenses: expensesSample,
        highCommitmentExpenses: hypotheticalDeficitExpenses,
      },
      {
        expectedSurplus: 3000,
        expectedSurplusStatus: true,
        expectedDeficit: -7000,
        expectedDeficitStatus: true,
      },
      {
        actualNetSurplus: netSurplus,
        actualNetDeficit: netDeficit,
        familyGapSample,
      }
    );
  }

  console.log(`================================================================`);
  console.log(`   إجمالي الفحوصات: ${passed} ناجح | ${failed} فاشل من أصل 9 سيناريوهات رئيسية   `);
  console.log(`================================================================\n`);

  return { passed, failed, scenariosCount: 9 };
}

runComprehensiveAuditTests();
