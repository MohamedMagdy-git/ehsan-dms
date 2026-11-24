import {
  BeneficiaryCase,
  HousingCondition,
  HousingFacilities,
  MockAttachment,
  PriorityLevel,
} from '@/types';

export type SurveySectionId =
  | 'identity'
  | 'housing'
  | 'household'
  | 'financials'
  | 'health'
  | 'documents_recommendation';

export interface SurveySectionDefinition {
  id: SurveySectionId;
  title: string;
  order: number;
}

export const SURVEY_SECTIONS: SurveySectionDefinition[] = [
  { id: 'identity', title: 'أولاً: التعريف والتواصل', order: 1 },
  { id: 'housing', title: 'ثانياً: العنوان والسكن والمعاينة', order: 2 },
  { id: 'household', title: 'ثالثاً: تركيبة وأفراد الأسرة', order: 3 },
  { id: 'financials', title: 'رابعاً: الدخل والمصروفات والالتزامات', order: 4 },
  { id: 'health', title: 'خامساً: الوضع الصحي والعلاج', order: 5 },
  { id: 'documents_recommendation', title: 'سادساً: المستندات وتوصية الباحث والتأكيد', order: 6 },
];

export interface SurveyQuestionAnswerItem {
  number: number; // 1..24
  key: string;
  sectionId: SurveySectionId;
  sectionTitle: string;
  question: string;
  isOptional: boolean;
  /** true إذا تمت الإجابة أو كان السؤال اختيارياً (لضمان اتساق 24/24 مع 100%) */
  isFulfilled: boolean;
  /** true فقط إذا أدخل الباحث قيمة فعلية غير فارغة */
  hasValue: boolean;
  /** true فقط إذا كان السؤال إلزامياً ولم يُجب عليه (يقود فلتر «غير مجاب فقط» وقائمة النواقص) */
  isMissingRequired: boolean;
  answerText: string;
  answerDetail?: string;
  subItems?: string[];
}

export interface CoreDocumentsStats {
  completed: number;
  total: number;
  percentage: number;
  isComplete: boolean;
  nonVoiceAttachments: MockAttachment[];
  missingDocLabels: string[];
  checks: Array<{ label: string; done: boolean }>;
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
  questions: SurveyQuestionAnswerItem[];
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
            nonVoiceAttachments.some(
              (a) => a.category === 'utility_bill' || a.category === 'housing_contract'
            )
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
      checks,
    };
  }

  // التوافق الرجعي مع الحالات التي لا تحتوي على قائمة تحقق مهيكلة (اعتماداً على المرفقات غير الصوتية)
  const total = 4;
  const completed = Math.min(total, nonVoiceAttachments.length);
  const checks = [
    {
      label: 'بطاقات الرقم القومي للبالغين',
      done: nonVoiceAttachments.some((a) => a.category === 'national_id') || completed >= 1,
    },
    {
      label: 'شهادات ميلاد أفراد الأسرة القصر',
      done: nonVoiceAttachments.some((a) => a.category === 'family_records') || completed >= 2,
    },
    {
      label: 'برنت تأميني / إفادة تكافل وكرامة',
      done: nonVoiceAttachments.some((a) => a.category === 'income_proof') || completed >= 3,
    },
    {
      label: 'إيصال مرافق حديث (كهرباء أو مياه)',
      done:
        nonVoiceAttachments.some(
          (a) => a.category === 'utility_bill' || a.category === 'housing_contract'
        ) || completed >= 4,
    },
  ];

  return {
    completed,
    total,
    percentage: Math.round((completed / total) * 100),
    isComplete: completed === total,
    nonVoiceAttachments,
    missingDocLabels: completed < total ? [`استكمال باقي الأوراق الأساسية (${completed}/4)`] : [],
    checks,
  };
}

function formatPriorityLabel(priority?: PriorityLevel): string {
  switch (priority) {
    case 'critical':
      return 'حرجة — تدخل عاجل';
    case 'high':
      return 'عالية';
    case 'medium':
      return 'متوسطة';
    case 'low':
      return 'منخفضة';
    default:
      return '';
  }
}

function formatHousingConditionLabel(raw?: HousingCondition | string): string {
  if (!raw) return '';
  switch (raw) {
    case 'owned':
      return 'سكن ملك';
    case 'rent_stable':
      return 'إيجار قديم / شبه مستقر';
    case 'rent_unstable':
      return 'إيجار جديد / غير مستقر';
    case 'dilapidated_urgent':
      return 'مأوى غير لائق / آيل للسقوط';
    default:
      return raw;
  }
}

function formatHousingFacilities(facilities?: HousingFacilities): string[] {
  if (!facilities) return [];
  const items: string[] = [];

  const roofMap: Record<HousingFacilities['roofType'], string> = {
    concrete: 'السقف: خرساني سليم',
    wood_straw: 'السقف: خشب / بوص',
    damaged: 'السقف: متهالك ويحتاج ترميم',
  };
  const waterMap: Record<HousingFacilities['waterConnection'], string> = {
    independent: 'المياه: وصلة مستقلة',
    shared: 'المياه: مشتركة',
    none: 'المياه: غير متوفرة داخل السكن',
  };
  const elecMap: Record<HousingFacilities['electricityMeter'], string> = {
    formal: 'الكهرباء: عداد رسمي',
    code_meter: 'الكهرباء: عداد كودي / ممارسة',
    none: 'الكهرباء: غير متوفرة',
  };

  if (facilities.roofType) items.push(roofMap[facilities.roofType]);
  if (facilities.waterConnection) items.push(waterMap[facilities.waterConnection]);
  if (facilities.electricityMeter) items.push(elecMap[facilities.electricityMeter]);
  items.push(`حمام مستقل: ${facilities.hasPrivateBathroom ? 'نعم' : 'لا'}`);
  if (facilities.basicAppliancesAvailable && facilities.basicAppliancesAvailable.length > 0) {
    items.push(`الأجهزة المتوفرة: ${facilities.basicAppliancesAvailable.join('، ')}`);
  }

  return items;
}

function getSectionTitle(sectionId: SurveySectionId): string {
  return SURVEY_SECTIONS.find((s) => s.id === sectionId)?.title || '';
}

interface QuestionSpec {
  number: number;
  key: string;
  sectionId: SurveySectionId;
  question: string;
  isOptional?: boolean;
  resolve: (
    c: BeneficiaryCase,
    coreDocs: CoreDocumentsStats
  ) => {
    hasValue: boolean;
    answerText: string;
    answerDetail?: string;
    subItems?: string[];
  };
}

/**
 * مصدر الحقيقة الوحيد (Single Source of Truth) لأسئلة استمارة البحث الميداني الـ 24.
 * يُستخدم لتوليد عرض الأسئلة والإجابات الكامل ولحساب نسبة اكتمال الاستمارة والنواقص في كافة الشاشات.
 */
const FIELD_SURVEY_QUESTION_SPECS: QuestionSpec[] = [
  // ==========================================
  // أولاً: التعريف والتواصل (س1 - س4)
  // ==========================================
  {
    number: 1,
    key: 'q01_case_name',
    sectionId: 'identity',
    question: 'اسم الحالة (رب الأسرة)',
    resolve: (c) => {
      const val = (c.surveyAnswers?.caseName || c.primaryName || c.fullName || '').trim();
      const secondary = c.secondaryName?.trim();
      return {
        hasValue: val.length > 0,
        answerText: val,
        answerDetail: secondary ? `اسم الشهرة: ${secondary}` : undefined,
      };
    },
  },
  {
    number: 2,
    key: 'q02_visitor_name',
    sectionId: 'identity',
    question: 'الباحث الميداني المسؤول',
    resolve: (c) => {
      const val = (c.surveyAnswers?.visitorName || c.assignedResearcher || '').trim();
      return {
        hasValue: val.length > 0,
        answerText: val,
      };
    },
  },
  {
    number: 3,
    key: 'q03_contact_phone',
    sectionId: 'identity',
    question: 'رقم هاتف التواصل الأساسي',
    resolve: (c) => {
      const val = (c.surveyAnswers?.contactPhone || c.phone || '').trim();
      return {
        hasValue: val.length >= 10,
        answerText: val,
      };
    },
  },
  {
    number: 4,
    key: 'q04_secondary_phone',
    sectionId: 'identity',
    question: 'رقم هاتف بديل',
    isOptional: true,
    resolve: (c) => {
      const val = (c.surveyAnswers?.secondaryPhone ?? c.secondaryPhone ?? '').trim();
      return {
        hasValue: val.length > 0,
        answerText: val,
      };
    },
  },

  // ==========================================
  // ثانياً: العنوان والسكن والمعاينة (س5 - س10)
  // ==========================================
  {
    number: 5,
    key: 'q05_address_gps',
    sectionId: 'housing',
    question: 'العنوان التفصيلي والموقع الجغرافي',
    resolve: (c) => {
      const rawAddress = (c.surveyAnswers?.address || c.address || '').trim();
      const areaPrefix = [c.governorate, c.district].filter(Boolean).join(' · ');
      const fullAddress =
        rawAddress && areaPrefix && !rawAddress.includes(c.district || '')
          ? `${areaPrefix} — ${rawAddress}`
          : rawAddress;
      const hasGps =
        typeof c.gpsLocation?.latitude === 'number' &&
        typeof c.gpsLocation?.longitude === 'number' &&
        !Number.isNaN(c.gpsLocation.latitude) &&
        !Number.isNaN(c.gpsLocation.longitude);
      return {
        hasValue: rawAddress.length >= 4,
        answerText: fullAddress,
        answerDetail: hasGps
          ? `إحداثيات GPS موثّقة (${c.gpsLocation!.latitude.toFixed(4)}, ${c.gpsLocation!.longitude.toFixed(4)})`
          : 'لم تُسجّل إحداثيات GPS في الزيارة',
      };
    },
  },
  {
    number: 6,
    key: 'q06_referral_source',
    sectionId: 'housing',
    question: 'مصدر الترشيح / الإحالة',
    resolve: (c) => {
      const val = (c.surveyAnswers?.referralSource || c.referralSource || '').trim();
      return {
        hasValue: val.length > 0,
        answerText: val,
      };
    },
  },
  {
    number: 7,
    key: 'q07_priority_level',
    sectionId: 'housing',
    question: 'درجة الأولوية / الاستعجال',
    resolve: (c) => {
      const raw = c.surveyAnswers?.priorityLevel || c.priority;
      const label = formatPriorityLabel(raw);
      return {
        hasValue: label.length > 0,
        answerText: label,
      };
    },
  },
  {
    number: 8,
    key: 'q08_housing_status',
    sectionId: 'housing',
    question: 'الحالة السكنية ونوع الحيازة',
    resolve: (c) => {
      const val = formatHousingConditionLabel(
        c.surveyAnswers?.housingStatus || c.vulnerability?.housingCondition
      );
      return {
        hasValue: val.length > 0,
        answerText: val,
      };
    },
  },
  {
    number: 9,
    key: 'q09_housing_facilities_summary',
    sectionId: 'housing',
    question: 'مرافق السكن ووصف المعاينة الميدانية',
    resolve: (c) => {
      const summary = (c.surveyAnswers?.caseSummary || c.caseSummary || '').trim();
      const facilities = c.surveyAnswers?.housingFacilities || c.housingFacilities;
      const facilityItems = formatHousingFacilities(facilities);
      const hasVal = summary.length >= 5 || facilityItems.length > 0;
      return {
        hasValue: hasVal,
        answerText: summary || (facilityItems.length > 0 ? 'تم توثيق مرافق السكن' : ''),
        subItems: facilityItems.length > 0 ? facilityItems : undefined,
      };
    },
  },
  {
    number: 10,
    key: 'q10_landmark_address',
    sectionId: 'housing',
    question: 'أقرب علامة مميزة للسكن',
    isOptional: true,
    resolve: (c) => {
      const val = (c.surveyAnswers?.landmarkAddress ?? c.directionsNote ?? '').trim();
      return {
        hasValue: val.length > 0,
        answerText: val,
      };
    },
  },

  // ==========================================
  // ثالثاً: تركيبة وأفراد الأسرة (س11)
  // ==========================================
  {
    number: 11,
    key: 'q11_family_members',
    sectionId: 'household',
    question: 'حصر أفراد الأسرة المقيمين',
    resolve: (c) => {
      const members = c.householdMembers || [];
      const hasVal = members.length > 0;
      return {
        hasValue: hasVal,
        answerText: hasVal ? `${members.length} أفراد مسجلين في الاستمارة` : '',
        subItems: members.map((m, idx) => {
          const parts = [
            m.name || `فرد ${idx + 1}`,
            m.relation,
            m.age ? `${m.age} سنة` : '',
            m.educationLevel || '',
            m.workStatus || '',
          ].filter(Boolean);
          return parts.join(' · ');
        }),
      };
    },
  },

  // ==========================================
  // رابعاً: الدخل والمصروفات والالتزامات (س12 - س17)
  // ==========================================
  {
    number: 12,
    key: 'q12_basic_income',
    sectionId: 'financials',
    question: 'الدخل الشهري الأساسي ومصدره',
    resolve: (c) => {
      const amount =
        typeof c.surveyAnswers?.basicIncomeAmount === 'number'
          ? c.surveyAnswers.basicIncomeAmount
          : c.financials?.directIncome;
      const sources = (c.surveyAnswers?.basicIncomeSources || '').trim();
      const hasVal = typeof amount === 'number' && !Number.isNaN(amount);
      return {
        hasValue: hasVal,
        answerText: hasVal ? `${amount.toLocaleString('ar-EG')} ج.م / شهرياً` : '',
        answerDetail: sources ? `المصدر: ${sources}` : undefined,
      };
    },
  },
  {
    number: 13,
    key: 'q13_additional_income',
    sectionId: 'financials',
    question: 'الدخل الإضافي / اليوميات ومصدره',
    resolve: (c) => {
      const amount =
        typeof c.surveyAnswers?.additionalIncomeAmount === 'number'
          ? c.surveyAnswers.additionalIncomeAmount
          : c.financials?.indirectIncome;
      const sources = (c.surveyAnswers?.additionalIncomeSources || '').trim();
      const hasVal = typeof amount === 'number' && !Number.isNaN(amount);
      return {
        hasValue: hasVal,
        answerText: hasVal
          ? amount === 0
            ? '0 ج.م (لا يوجد دخل إضافي)'
            : `${amount.toLocaleString('ar-EG')} ج.م / شهرياً`
          : '',
        answerDetail: sources ? `المصدر: ${sources}` : undefined,
      };
    },
  },
  {
    number: 14,
    key: 'q14_family_assets',
    sectionId: 'financials',
    question: 'الممتلكات والأصول',
    resolve: (c) => {
      const val = (c.surveyAnswers?.familyAssets || '').trim();
      return {
        hasValue: val.length > 0,
        answerText: val,
      };
    },
  },
  {
    number: 15,
    key: 'q15_basic_expenses',
    sectionId: 'financials',
    question: 'المصروفات الأساسية الشهرية',
    resolve: (c) => {
      const amount =
        typeof c.surveyAnswers?.monthlyBasicExpenses === 'number'
          ? c.surveyAnswers.monthlyBasicExpenses
          : c.financials?.basicExpenses;
      const hasVal = typeof amount === 'number' && !Number.isNaN(amount) && amount > 0;
      return {
        hasValue: hasVal,
        answerText: hasVal ? `${amount.toLocaleString('ar-EG')} ج.م / شهرياً` : '',
        answerDetail: hasVal ? 'تشمل المعيشة والغذاء والإيجار والفواتير الأساسية' : undefined,
      };
    },
  },
  {
    number: 16,
    key: 'q16_debts_installments',
    sectionId: 'financials',
    question: 'الديون والأقساط الشهرية',
    resolve: (c) => {
      const amount = c.surveyAnswers?.monthlyDebtsInstallments;
      const details = (c.surveyAnswers?.debtsAndObligations || '').trim();
      const hasAmount = typeof amount === 'number' && !Number.isNaN(amount);
      const hasVal = hasAmount || details.length > 0;
      return {
        hasValue: hasVal,
        answerText: hasAmount
          ? amount === 0
            ? '0 ج.م (لا توجد أقساط شهرية)'
            : `${amount.toLocaleString('ar-EG')} ج.م / شهرياً`
          : details,
        answerDetail: hasAmount && details ? details : undefined,
      };
    },
  },
  {
    number: 17,
    key: 'q17_net_financial_gap',
    sectionId: 'financials',
    question: 'صافي الفجوة المالية الشهرية',
    resolve: (c) => {
      const gap =
        typeof c.surveyAnswers?.netFinancialGap === 'number'
          ? c.surveyAnswers.netFinancialGap
          : c.financials?.netFinancialGap;
      const doc = (c.surveyAnswers?.financialGapDocumentation || '').trim();
      const hasVal = typeof gap === 'number' && !Number.isNaN(gap);
      return {
        hasValue: hasVal,
        answerText: hasVal ? `${gap.toLocaleString('ar-EG')} ج.م / شهرياً` : '',
        answerDetail: doc || undefined,
      };
    },
  },

  // ==========================================
  // خامساً: الوضع الصحي والعلاج (س18 - س21)
  // ==========================================
  {
    number: 18,
    key: 'q18_medical_condition',
    sectionId: 'health',
    question: 'الوصف الطبي والأمراض المزمنة',
    resolve: (c) => {
      const desc = (
        c.surveyAnswers?.medicalConditionDescription ||
        c.vulnerability?.chronicIllnessDetails ||
        ''
      ).trim();
      if (desc.length > 0) {
        return { hasValue: true, answerText: desc };
      }
      if (c.vulnerability?.hasChronicIllness === false) {
        return { hasValue: true, answerText: 'لا توجد أمراض مزمنة مسجلة بالأسرة' };
      }
      return { hasValue: false, answerText: '' };
    },
  },
  {
    number: 19,
    key: 'q19_chronic_verification',
    sectionId: 'health',
    question: 'توثيق الأمراض المزمنة',
    resolve: (c) => {
      const val = (c.surveyAnswers?.chronicVerification || '').trim();
      if (val.length > 0) {
        return { hasValue: true, answerText: val };
      }
      if (c.vulnerability?.hasChronicIllness === false) {
        return { hasValue: true, answerText: 'لا ينطبق (لا توجد أمراض مزمنة)' };
      }
      return { hasValue: false, answerText: '' };
    },
  },
  {
    number: 20,
    key: 'q20_health_insurance',
    sectionId: 'health',
    question: 'التأمين الصحي ونفقة الدولة',
    resolve: (c) => {
      const val = (c.surveyAnswers?.stateHealthInsuranceDetails || '').trim();
      return {
        hasValue: val.length > 0,
        answerText: val,
      };
    },
  },
  {
    number: 21,
    key: 'q21_medical_costs',
    sectionId: 'health',
    question: 'تكاليف العلاج الشهرية',
    resolve: (c) => {
      const cost =
        typeof c.surveyAnswers?.monthlyMedicalCosts === 'number'
          ? c.surveyAnswers.monthlyMedicalCosts
          : c.financials?.medicalExpenses;
      const hasVal = typeof cost === 'number' && !Number.isNaN(cost);
      return {
        hasValue: hasVal,
        answerText: hasVal
          ? cost === 0
            ? '0 ج.م (لا توجد تكاليف علاجية دورية)'
            : `${cost.toLocaleString('ar-EG')} ج.م / شهرياً`
          : '',
      };
    },
  },

  // ==========================================
  // سادساً: المستندات وتوصية الباحث والتأكيد (س22 - س24)
  // ==========================================
  {
    number: 22,
    key: 'q22_documents_checklist',
    sectionId: 'documents_recommendation',
    question: 'قائمة التحقق الرسمية والأوراق المرفقة',
    resolve: (_c, coreDocs) => {
      return {
        hasValue: coreDocs.isComplete,
        answerText: `${coreDocs.completed} من ${coreDocs.total} أوراق أساسية (${coreDocs.percentage}%)`,
        answerDetail:
          coreDocs.nonVoiceAttachments.length > 0
            ? `إجمالي المرفقات الورقية المرفوعة: ${coreDocs.nonVoiceAttachments.length}`
            : undefined,
        subItems: coreDocs.checks.map(
          (ch) => `${ch.done ? '✓' : '×'} ${ch.label}`
        ),
      };
    },
  },
  {
    number: 23,
    key: 'q23_researcher_recommendation',
    sectionId: 'documents_recommendation',
    question: 'توصية الباحث الميداني المستقلة',
    resolve: (c) => {
      const assistType = (
        c.surveyAnswers?.recommendedAssistanceType ||
        c.recommendedAssistanceType ||
        ''
      ).trim();
      const amount =
        typeof c.surveyAnswers?.recommendedMonthlyAmount === 'number'
          ? c.surveyAnswers.recommendedMonthlyAmount
          : c.recommendedMonthlyAmount;
      const remarks = (
        c.surveyAnswers?.additionalNotesAndRemarks ||
        c.researcherJustification ||
        c.researcherRecommendation ||
        ''
      ).trim();

      const headerParts: string[] = [];
      if (assistType) headerParts.push(`نوع الدعم: ${assistType}`);
      if (typeof amount === 'number' && amount > 0) {
        headerParts.push(`المبلغ المقترح: ${amount.toLocaleString('ar-EG')} ج.م/شهرياً`);
      }

      const hasVal = headerParts.length > 0 || remarks.length >= 5;
      return {
        hasValue: hasVal,
        answerText: headerParts.length > 0 ? headerParts.join(' · ') : remarks,
        answerDetail: headerParts.length > 0 && remarks ? remarks : undefined,
      };
    },
  },
  {
    number: 24,
    key: 'q24_final_confirmation',
    sectionId: 'documents_recommendation',
    question: 'المراجعة الختامية وتأكيد الإرسال الميداني',
    resolve: (c) => {
      const visitDate = (
        c.surveyAnswers?.visitDate ||
        c.lastVisitDate ||
        c.lastAssessmentDate ||
        ''
      ).trim();
      const confirmed =
        c.surveyAnswers?.finalConfirmationChecked === true ||
        (visitDate.length > 0 && c.status !== 'pending_field_research');
      return {
        hasValue: confirmed,
        answerText: confirmed
          ? `تم تأكيد المراجعة الميدانية والإرسال${visitDate ? ` بتاريخ ${visitDate}` : ''}`
          : '',
      };
    },
  },
];

export const FIELD_SURVEY_TOTAL_QUESTIONS = FIELD_SURVEY_QUESTION_SPECS.length; // 24

/**
 * استخراج قائمة الأسئلة الـ 24 كاملة بإجاباتها المنسقة وحالة كل سؤال
 */
export function getFieldSurveyQuestionAnswers(c: BeneficiaryCase): SurveyQuestionAnswerItem[] {
  const coreDocs = getCoreDocumentsStats(c);

  return FIELD_SURVEY_QUESTION_SPECS.map((spec) => {
    const resolved = spec.resolve(c, coreDocs);
    const isOptional = Boolean(spec.isOptional);
    const hasValue = resolved.hasValue;
    // الأسئلة الاختيارية تُحتسب مستوفاة حتى لو تُركت فارغة منعاً للتناقض البصري (مثل 22/24 مع 100%)
    const isFulfilled = isOptional ? true : hasValue;
    const isMissingRequired = !isOptional && !hasValue;

    return {
      number: spec.number,
      key: spec.key,
      sectionId: spec.sectionId,
      sectionTitle: getSectionTitle(spec.sectionId),
      question: spec.question,
      isOptional,
      isFulfilled,
      hasValue,
      isMissingRequired,
      answerText: hasValue
        ? resolved.answerText
        : isOptional
        ? 'لم يُضف (اختياري)'
        : 'غير مجاب',
      answerDetail: resolved.answerDetail,
      subItems: resolved.subItems,
    };
  });
}

/**
 * دالة قياس نسبة اكتمال بيانات البحث الميداني (24 سؤالاً قياسياً من مصدر الحقيقة الموحد)
 */
export function calculateFieldSurveyCompleteness(c: BeneficiaryCase): SurveyCompletenessResult {
  const questions = getFieldSurveyQuestionAnswers(c);
  const totalFields = FIELD_SURVEY_TOTAL_QUESTIONS;
  const completedFields = questions.filter((q) => q.isFulfilled).length;
  const percentage = Math.round((completedFields / totalFields) * 100);
  const isComplete = completedFields === totalFields;

  const missingItems = questions
    .filter((q) => q.isMissingRequired)
    .map((q) => `س${q.number}: ${q.question}`);

  let statusBadge: SurveyCompletenessResult['statusBadge'];
  if (isComplete) {
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
    questions,
  };
}
