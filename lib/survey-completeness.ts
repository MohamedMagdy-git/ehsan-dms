import { BeneficiaryCase } from '@/types';

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
 * دالة قياس نسبة اكتمال بيانات البحث الميداني (22 حقل معياري وفق استمارة البحث)
 */
export function calculateFieldSurveyCompleteness(c: BeneficiaryCase): SurveyCompletenessResult {
  const items = [
    { name: 'اسم رب الأسرة', done: Boolean(c.primaryName || c.fullName) },
    { name: 'الرقم القومي (14 رقم)', done: Boolean(c.nationalId && c.nationalId.length >= 14) },
    { name: 'رقم هاتف التواصل', done: Boolean(c.phone && c.phone.length >= 10) },
    { name: 'المحافظة', done: Boolean(c.governorate) },
    { name: 'الحي / المركز', done: Boolean(c.district) },
    { name: 'العنوان ومحل الإقامة التفصيلي', done: Boolean(c.address && c.address.trim().length >= 4) },
    { name: 'علامة مميزة للعنوان', done: Boolean(c.directionsNote && c.directionsNote.trim().length > 0) },
    { name: 'موقع البيت على الخريطة', done: Boolean(c.gpsLocation?.latitude && c.gpsLocation?.longitude) },
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
    { name: 'ملاحظات وتوصية الباحث', done: Boolean(c.notes && c.notes.trim().length >= 15) },
    { name: 'الأوراق المطلوبة (4/4)', done: Boolean(c.attachments && c.attachments.length >= 4) },
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
