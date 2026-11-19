import { BeneficiaryCase, MockAttachment } from '@/types';

export interface CoreDocumentsStats {
  completed: number;
  total: number;
  percentage: number;
  isComplete: boolean;
  nonVoiceAttachments: MockAttachment[];
  missingDocLabels: string[];
}

export interface SurveyCompletenessResult {
  completedFields: number;
  totalFields: number;
  percentage: number;
  isComplete: boolean;
  statusBadge: {
    label: string;
    variant: 'complete' | 'almost' | 'incomplete';
    badgeClass: string;
    barClass: string;
  };
  missingItems: string[];
}

/**
 * تصفية المرفقات الورقية والمستندات الفعلية واستبعاد التسجيلات الصوتية من عدّ الأوراق
 */
export function getNonVoiceAttachments(attachments?: MockAttachment[]): MockAttachment[] {
  return (attachments || []).filter((a) => {
    const fileLower = (a.fileName || '').toLowerCase();
    return (
      a.category !== 'voice_memo' &&
      !fileLower.endsWith('.webm') &&
      !fileLower.endsWith('.mp3') &&
      !fileLower.endsWith('.wav')
    );
  });
}

/**
 * دالة موحدة لاحتساب نسبة وعدد الأوراق الأساسية (4 بنود معيارية في قائمة التحقق والمرفقات)
 */
export function getCoreDocumentsStats(c: BeneficiaryCase): CoreDocumentsStats {
  const nonVoiceAttachments = getNonVoiceAttachments(c.attachments);

  if (c.documentsChecklist) {
    const checks = [
      {
        label: 'بطاقات الرقم القومي للبالغين',
        done: Boolean(
          c.documentsChecklist.nationalIdsAdults ||
            nonVoiceAttachments.some((a) => a.category === 'national_id')
        ),
      },
      {
        label: 'شهادات ميلاد أفراد الأسرة القصر',
        done: Boolean(
          c.documentsChecklist.birthCertificatesMinors ||
            nonVoiceAttachments.some((a) => a.category === 'family_records')
        ),
      },
      {
        label: 'برنت تأميني / إفادة تكافل وكرامة',
        done: Boolean(
          c.documentsChecklist.insurancePrintOut ||
            nonVoiceAttachments.some((a) => a.category === 'income_proof')
        ),
      },
      {
        label: 'إيصال مرافق حديث (كهرباء أو مياه)',
        done: Boolean(
          c.documentsChecklist.utilityReceipt ||
            nonVoiceAttachments.some((a) => a.category === 'utility_bill')
        ),
      },
    ];

    const completed = checks.filter((item) => item.done).length;
    const missingDocLabels = checks.filter((item) => !item.done).map((item) => item.label);
    const total = 4;

    return {
      completed,
      total,
      percentage: Math.round((completed / total) * 100),
      isComplete: completed === total,
      nonVoiceAttachments,
      missingDocLabels,
    };
  }

  // التوافق الرجعي مع الحالات التي لا تحتوي على قائمة تحقق مهيكلة (اعتماداً على المرفقات غير الصوتية)
  const total = 4;
  const completed = Math.min(total, nonVoiceAttachments.length);

  return {
    completed,
    total,
    percentage: Math.round((completed / total) * 100),
    isComplete: completed === total,
    nonVoiceAttachments,
    missingDocLabels: completed < total ? [`استكمال باقي الأوراق الأساسية (${completed}/4)`] : [],
  };
}

/**
 * دالة قياس نسبة اكتمال بيانات البحث الميداني (22 حقل معياري وفق استمارة البحث)
 */
export function calculateFieldSurveyCompleteness(c: BeneficiaryCase): SurveyCompletenessResult {
  const coreDocs = getCoreDocumentsStats(c);

  const items = [
    { name: 'اسم رب الأسرة', done: Boolean(c.primaryName || c.fullName) },
    { name: 'الرقم القومي (14 رقم)', done: Boolean(c.nationalId && c.nationalId.length >= 14) },
    { name: 'رقم هاتف التواصل', done: Boolean(c.phone && c.phone.length >= 10) },
    { name: 'المحافظة', done: Boolean(c.governorate) },
    { name: 'الحي / المركز', done: Boolean(c.district) },
    { name: 'العنوان ومحل الإقامة التفصيلي', done: Boolean(c.address && c.address.trim().length >= 4) },
    { name: 'علامة مميزة للعنوان', done: Boolean(c.directionsNote && c.directionsNote.trim().length > 0) },
    {
      name: 'موقع البيت على الخريطة',
      done:
        typeof c.gpsLocation?.latitude === 'number' &&
        typeof c.gpsLocation?.longitude === 'number' &&
        !Number.isNaN(c.gpsLocation.latitude) &&
        !Number.isNaN(c.gpsLocation.longitude),
    },
    { name: 'اسم الباحث الميداني المسؤول', done: Boolean(c.assignedResearcher) },
    { name: 'تاريخ النزول الميداني', done: Boolean(c.lastVisitDate || c.registrationDate) },
    { name: 'الحالة السكنية ونوع الحيازة', done: Boolean(c.vulnerability?.housingCondition) },
    { name: 'قيد أفراد الأسرة المقيمين', done: Boolean(c.householdMembers && c.householdMembers.length > 0) },
    {
      name: 'تفاصيل أفراد الأسرة (الصلة، السن، العمل)',
      done: Boolean(
        c.householdMembers &&
          c.householdMembers.length > 0 &&
          c.householdMembers.every((m) => m.relation && m.age > 0 && m.workStatus)
      ),
    },
    { name: 'مستوى الأمن الغذائي', done: Boolean(c.vulnerability?.foodInsecurityLevel) },
    { name: 'الحالة الصحية والأمراض المزمنة', done: c.vulnerability?.hasChronicIllness !== undefined },
    { name: 'الدخل الشهري الرسمي (معاشات)', done: typeof c.financials?.directIncome === 'number' },
    { name: 'الدخل غير المنتظم / اليوميات', done: typeof c.financials?.indirectIncome === 'number' },
    { name: 'المصروفات والالتزامات الأساسية', done: (c.financials?.basicExpenses || 0) > 0 },
    { name: 'تكاليف العلاج الشهرية', done: typeof c.financials?.medicalExpenses === 'number' },
    { name: 'حساب العجز الشهري', done: (c.financials?.netFinancialGap || 0) > 0 },
    {
      name: 'ملاحظات وتوصية الباحث',
      done: Boolean(
        (c.researcherRecommendation && c.researcherRecommendation.trim().length >= 5) ||
          (c.caseSummary && c.caseSummary.trim().length >= 10) ||
          (c.notes && c.notes.trim().length >= 15)
      ),
    },
    {
      name: `الأوراق الأساسية المطلوبة (${coreDocs.completed}/4)`,
      done: coreDocs.isComplete,
    },
  ];

  const totalFields = 22;
  const completedFields = items.filter((i) => i.done).length;
  const percentage = Math.round((completedFields / totalFields) * 100);
  const isComplete = percentage === 100;

  const missingItems = items.filter((i) => !i.done).map((i) => i.name);

  let statusBadge: SurveyCompletenessResult['statusBadge'];
  if (percentage === 100) {
    statusBadge = {
      label: 'مكتملة',
      variant: 'complete',
      badgeClass: 'text-slate-700 font-semibold',
      barClass: 'bg-[#005756]',
    };
  } else if (percentage >= 80) {
    statusBadge = {
      label: 'قربت تكتمل',
      variant: 'almost',
      badgeClass: 'text-slate-600 font-medium',
      barClass: 'bg-slate-500',
    };
  } else {
    statusBadge = {
      label: 'ناقصة بيانات',
      variant: 'incomplete',
      badgeClass: 'text-slate-500 font-medium',
      barClass: 'bg-slate-400',
    };
  }

  return {
    completedFields,
    totalFields,
    percentage,
    isComplete,
    statusBadge,
    missingItems,
  };
}

