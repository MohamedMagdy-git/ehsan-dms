import { BeneficiaryCase, AssessmentFactorBreakdown, PriorityLevel, ScoringRulesConfig } from '@/types';

export const DEFAULT_SCORING_CONFIG: ScoringRulesConfig = {
  financialGapWeight: 35,
  medicalUrgencyWeight: 25,
  orphanDependentsWeight: 20,
  housingConditionWeight: 10,
  workCapacityWeight: 10,
  overdueVisitMonths: 6,
  maxAssistanceCap: 4500,
  minAssistanceFloor: 500,
};

/**
 * محرك التقييم الحسابي الشفاف
 * يحسب درجة الاحتياج (0-100) ويوضح الأسباب بدقة دون الاعتماد على نماذج لغوية عشوائية
 */
export function calculateCaseAssessment(
  caseItem: BeneficiaryCase,
  config: ScoringRulesConfig = DEFAULT_SCORING_CONFIG
): AssessmentFactorBreakdown {
  const explanation: string[] = [];

  // 1. حساب عجز الدخل والمصروفات (الحد الأقصى 35 نقطة)
  const gap = caseItem.financials.netFinancialGap;
  let financialGapScore = 0;
  if (gap > 4500) {
    financialGapScore = config.financialGapWeight;
    explanation.push(`عجز شهري كبير جداً (${gap.toLocaleString('en-US')} ج.م) يتجاوز 4,500 ج.م شهرياً`);
  } else if (gap > 2500) {
    financialGapScore = Math.round(config.financialGapWeight * 0.75);
    explanation.push(`عجز شهري كبير (${gap.toLocaleString('en-US')} ج.م) بين الدخل والمصروفات`);
  } else if (gap > 1000) {
    financialGapScore = Math.round(config.financialGapWeight * 0.5);
    explanation.push(`عجز شهري متوسط (${gap.toLocaleString('en-US')} ج.م)`);
  } else if (gap > 0) {
    financialGapScore = Math.round(config.financialGapWeight * 0.25);
    explanation.push(`عجز شهري بسيط (${gap.toLocaleString('en-US')} ج.م)`);
  } else {
    financialGapScore = 0;
    explanation.push('الدخل الحالي يغطي المصروفات الأساسية');
  }

  // 2. المحور الطبي والأمراض المزمنة (الحد الأقصى 25 نقطة)
  let medicalUrgencyScore = 0;
  if (caseItem.vulnerability.hasChronicIllness) {
    const medExp = caseItem.financials.medicalExpenses;
    if (medExp > 2000) {
      medicalUrgencyScore = config.medicalUrgencyWeight;
      explanation.push(`حالة صحية حرجة وتكلفة علاج شهرية كبيرة (${medExp.toLocaleString('en-US')} ج.م)`);
    } else if (medExp > 800) {
      medicalUrgencyScore = Math.round(config.medicalUrgencyWeight * 0.7);
      explanation.push(`أمراض مزمنة تحتاج علاج شهري مستمر (${medExp.toLocaleString('en-US')} ج.م)`);
    } else {
      medicalUrgencyScore = Math.round(config.medicalUrgencyWeight * 0.4);
      explanation.push('أمراض مزمنة تحتاج علاج شهري');
    }
  }

  // 3. محور الأيتام وعدد الأفراد (الحد الأقصى 20 نقطة)
  let orphanDependentsScore = 0;
  if (caseItem.vulnerability.isOrphanHousehold) {
    orphanDependentsScore += 12;
    explanation.push(`أسرة أيتام (${caseItem.vulnerability.orphanCount} أيتام)`);
  }
  const depCount = caseItem.vulnerability.dependentsCount;
  if (depCount >= 5) {
    orphanDependentsScore += 8;
    explanation.push(`تتكفل برعاية عدد كبير من الأفراد (${depCount} أفراد)`);
  } else if (depCount >= 3) {
    orphanDependentsScore += 5;
    explanation.push(`تتكفل برعاية ${depCount} أفراد`);
  } else if (depCount > 0) {
    orphanDependentsScore += 2;
  }
  orphanDependentsScore = Math.min(config.orphanDependentsWeight, orphanDependentsScore);

  // 4. ظروف السكن والأمان المعيشي (الحد الأقصى 10 نقاط)
  let housingInsecurityScore = 0;
  switch (caseItem.vulnerability.housingCondition) {
    case 'dilapidated_urgent':
      housingInsecurityScore = config.housingConditionWeight;
      explanation.push('سكن غير آمن أو آيل للسقوط ويحتاج تدخل عاجل');
      break;
    case 'rent_unstable':
      housingInsecurityScore = Math.round(config.housingConditionWeight * 0.7);
      explanation.push('سكن إيجار غير مستقر وعليهم متأخرات إيجار');
      break;
    case 'rent_stable':
      housingInsecurityScore = Math.round(config.housingConditionWeight * 0.3);
      break;
    case 'owned':
      housingInsecurityScore = 0;
      break;
  }

  // 5. القدرة على العمل (خصم إذا كان هناك أفراد قادرين على الشغل)
  let workCapacityPenalty = 0;
  if (caseItem.vulnerability.workCapacity === 'full') {
    workCapacityPenalty = 8;
    explanation.push('يوجد أفراد بالأسرة قادرين على العمل (خصم 8 نقاط)');
  } else if (caseItem.vulnerability.workCapacity === 'partial') {
    workCapacityPenalty = 3;
    explanation.push('عمل يومية غير منتظم (دخل غير ثابت)');
  } else {
    explanation.push('لا يوجد مصدر دخل ثابت (عجز / مرض / أرملة ترعى أطفال)');
  }

  // معامل نسبة ثقة الباحث الميداني
  const confidenceMultiplier = Math.max(0.75, Math.min(1.0, (caseItem.vulnerability.confidenceScore || 100) / 100));
  if (caseItem.vulnerability.confidenceScore < 100) {
    explanation.push(`تم اعتماد تقييم الباحث الميداني (${caseItem.vulnerability.confidenceScore}%) لحين استكمال الأوراق`);
  }

  const rawScore = (financialGapScore + medicalUrgencyScore + orphanDependentsScore + housingInsecurityScore) - workCapacityPenalty;
  const totalScore = Math.max(5, Math.min(100, Math.round(rawScore * confidenceMultiplier)));

  return {
    financialGapScore,
    medicalUrgencyScore,
    orphanDependentsScore,
    housingInsecurityScore,
    workCapacityPenalty,
    confidenceMultiplier,
    totalScore,
    explanation,
  };
}

export function derivePriorityLevel(score: number): PriorityLevel {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

export function getPriorityLabel(priority: PriorityLevel): string {
  switch (priority) {
    case 'critical': return 'أولوية قصوى / حالة حرجة';
    case 'high': return 'أولوية عالية';
    case 'medium': return 'أولوية متوسطة';
    case 'low': return 'أولوية عادية';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending_field_research': return 'قائمة الانتظار · تحتاج بحث ميداني';
    case 'pending_review': return 'بانتظار المراجعة';
    case 'needs_revision': return 'تحتاج استكمال بيانات';
    case 'active_eligible':
    case 'active': return 'معتمدة للصرف';
    case 'under_review': return 'تحت المراجعة';
    case 'pending_exception': return 'بانتظار موافقة استثنائية';
    case 'temporarily_suspended': return 'موقوفة مؤقتاً';
    case 'excluded_current_month': return 'مستبعدة من صرف هذا الشهر';
    case 'closed': return 'ملف مغلق';
    default: return status;
  }
}

/**
 * التحقق الحسابي الديناميكي من تأخر الزيارة الميدانية
 * يقارن تاريخ آخر زيارة مع التاريخ المرجعي وفق الحد الأقصى المعتمد في الإعدادات
 */
export function checkVisitOverdueStatus(
  lastVisitDate?: string,
  maxMonths: number = 6,
  referenceDateStr: string = '2026-10-18'
): { isOverdue: boolean; monthsElapsed: number; daysOverdue: number } {
  if (!lastVisitDate) {
    return { isOverdue: false, monthsElapsed: 0, daysOverdue: 0 };
  }

  const visit = new Date(lastVisitDate);
  const ref = new Date(referenceDateStr);

  if (isNaN(visit.getTime()) || isNaN(ref.getTime())) {
    return { isOverdue: false, monthsElapsed: 0, daysOverdue: 0 };
  }

  const diffTime = ref.getTime() - visit.getTime();
  const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  const monthsElapsed = Math.round((diffDays / 30.4375) * 10) / 10;
  
  const isOverdue = monthsElapsed > maxMonths;
  const daysOverdue = isOverdue ? Math.max(0, Math.floor(diffDays - (maxMonths * 30.4375))) : 0;

  return { isOverdue, monthsElapsed, daysOverdue };
}

