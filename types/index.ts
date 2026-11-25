export type CaseStatus =
  | 'pending_field_research'  // قيد الانتظار · بانتظار الزيارة الميدانية
  | 'pending_review'          // بانتظار المراجعة والاعتماد
  | 'needs_revision'          // إعادة للباحث لاستيفاء الملاحظات
  | 'under_review'            // تحت البحث والمراجعة
  | 'active_eligible'         // نشطة ومستحقة
  | 'pending_exception'       // بانتظار اعتماد استثناء (أوراق غير مكتملة مع ثقة الباحث)
  | 'temporarily_suspended'   // موقوفة مؤقتاً
  | 'excluded_current_month'  // مستبعدة من تخصيص هذا الشهر
  | 'closed';                 // مغلقة / زال الاستحقاق / مرفوضة

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

export type HousingCondition = 'owned' | 'rent_stable' | 'rent_unstable' | 'dilapidated_urgent';
export type WorkCapacity = 'none' | 'partial' | 'full';
export type FoodInsecurityLevel = 'secure' | 'moderate' | 'severe';
export type PayoutMethod = 'cash_researcher' | 'e_wallet';

export interface HouseholdMember {
  id: string;
  name: string;
  relation: string; // رب الأسرة، زوجة، ابن، ابنة، أم، أخ
  age: number;
  educationLevel: string; // ابتدائي، إعدادي، ثانوي، جامعي، غير ملتحق
  healthStatus?: string;   // سليم، مريض مزمن، ذوي همم
  workStatus: string;     // لا يعمل، يومية غير منتظمة، عامل
  maritalStatus?: string; // أعزب، متزوج، أرمل، مطلق
  workCapacity?: string;  // قادر على العمل، عاجز كلياً، عاجز جزئياً أو مسن، طفل/قاصر
}

export interface CaseFinancials {
  directIncome: number;           // دخل رسمي/معاش (تكافل وكرامة، تأمينات)
  indirectIncome: number;         // دخل غير مباشر وعمل غير منتظم (يومية، خدمة منازل، حِرف)
  basicExpenses: number;          // مصاريف معيشة وغذاء وفواتير وإيجار
  medicalExpenses: number;        // علاج، غسيل كلى، أدوية شهرية، مستلزمات
  externalAid: number;            // مساعدات خارجية منتظمة من أفراد أو جمعيات أخرى
  netFinancialGap: number;        // الفجوة المالية الفعلية (المصاريف - الدخول)
  estimatedAssistanceNeed: number;// الاحتياج الشهري التقديري المقترح
}

export interface CaseVulnerability {
  hasChronicIllness: boolean;
  chronicIllnessDetails?: string;
  isOrphanHousehold: boolean;     // وجود أيتام
  orphanCount: number;
  dependentsCount: number;        // عدد المعالين
  housingCondition: HousingCondition;
  foodInsecurityLevel: FoodInsecurityLevel;
  workCapacity: WorkCapacity;
  confidenceScore: number;        // نسبة ثقة الباحث (80% - 100%)
  incompleteDocuments: boolean;   // هل الأوراق ناقصة
  exceptionApproved: boolean;     // هل تم اعتماد الاستثناء من الإدارة
  exceptionApprovedBy?: string;
  exceptionReason?: string;
}

export interface MockAttachment {
  id: string;
  title: string;
  category: 'national_id' | 'medical_report' | 'income_proof' | 'housing_contract' | 'field_video' | 'family_records' | 'utility_bill' | 'voice_memo';
  fileName: string;
  fileSize: string;
  uploadDate: string;
  url?: string;
  durationSeconds?: number;
}

export interface DocumentsChecklist {
  nationalIdsAdults: boolean;
  birthCertificatesMinors: boolean;
  insurancePrintOut: boolean;
  utilityReceipt: boolean;
  leaseContractOrRentReceipt: boolean;
  recentMedicalProof: boolean;
  deathOrDivorceCertificates: boolean;
}

export interface CaseSurveyAnswers {
  schemaVersion: 1;                     // إصدار لقطة الاستمارة (يطابق عمود survey_answers jsonb في Supabase)
  submittedAt?: string;                 // وقت وتاريخ إرسال الاستمارة (س24)
  visitDate?: string;                   // تاريخ النزول الميداني (س24)
  caseName?: string;                    // س1: اسم الحالة (رب الأسرة)
  visitorName?: string;                 // س2: الباحث الميداني المسؤول
  contactPhone?: string;                // س3: رقم هاتف التواصل الأساسي
  secondaryPhone?: string;              // س4: رقم هاتف بديل (اختياري)
  address?: string;                     // س5: العنوان التفصيلي
  referralSource?: string;              // س6: مصدر الترشيح / الإحالة
  priorityLevel?: PriorityLevel;        // س7: درجة الأولوية / الاستعجال
  housingStatus?: string;               // س8: الحالة السكنية ونوع الحيازة
  housingFacilities?: HousingFacilities;// س9: مرافق السكن
  caseSummary?: string;                 // س9: وصف المعاينة الميدانية
  landmarkAddress?: string;             // س10: أقرب علامة مميزة (اختياري)
  basicIncomeSources?: string;          // س12: مصادر الدخل الأساسي
  basicIncomeAmount?: number;           // س12: قيمة الدخل الأساسي الشهري
  additionalIncomeSources?: string;     // س13: مصادر الدخل الإضافي / اليوميات
  additionalIncomeAmount?: number;      // س13: قيمة الدخل الإضافي الشهري
  familyAssets?: string;                // س14: الممتلكات والأصول
  monthlyBasicExpenses?: number;        // س15: المصروفات الأساسية الشهرية
  monthlyDebtsInstallments?: number;    // س16: أقساط الديون الشهرية
  debtsAndObligations?: string;         // س16: تفاصيل الديون والالتزامات
  netFinancialGap?: number;             // س17: صافي الفجوة المالية الشهرية
  financialGapDocumentation?: string;   // س17: توثيق ومبررات الفجوة المالية
  medicalConditionDescription?: string; // س18: الوصف الطبي والأمراض المزمنة
  chronicVerification?: string;         // س19: توثيق الأمراض المزمنة
  stateHealthInsuranceDetails?: string; // س20: التأمين الصحي ونفقة الدولة
  monthlyMedicalCosts?: number;         // س21: تكاليف العلاج الشهرية
  recommendedAssistanceType?: string;   // س23: نوع المساعدة المقترح من الباحث
  recommendedMonthlyAmount?: number;    // س23: المبلغ الشهري المقترح من الباحث
  additionalNotesAndRemarks?: string;   // س23: مبررات وتوصيات الباحث الميداني
  finalConfirmationChecked?: boolean;   // س24: تأكيد المراجعة الختامية والإرسال
}

export interface BeneficiaryCase {
  id: string;
  code: string;                   // كود الحالة مثل: EHS-101
  primaryName: string;            // الاسم الأساسي لرب الأسرة أو العائل
  secondaryName?: string;         // الاسم الثانوي / اسم الشهرة (مثل: أم أحمد / اسم الزوجة)
  fullName: string;               // الاسم المعروض المتوافق مع كافة الواجهات
  nationalId: string;             // الرقم القومي المصري (14 رقم)
  phone: string;
  secondaryPhone?: string;
  payoutMethod?: PayoutMethod;    // طريقة استلام المساعدة: نقدي عبر الباحث افتراضياً أو محفظة إلكترونية
  walletNumber?: string;          // رقم المحفظة الإلكترونية عند اختيار e_wallet
  governorate: string;            // المحافظة
  district: string;               // الحي أو القرية (بولاق، المطرية...)
  address: string;
  assignedResearcher: string;     // الباحث الميداني المسؤول (الاسم المعروض)
  researcherId?: string;          // المعرّف القياسي للباحث (يطابق profiles.researcher_id في Supabase)
  registrationDate: string;
  status: CaseStatus;
  priority: PriorityLevel;
  lastAssessmentDate: string;
  lastVisitDate: string;
  nextVisitDueDate: string;
  isVisitOverdue: boolean;        // أكثر من 6 أشهر بدون زيارة
  householdMembers: HouseholdMember[];
  financials: CaseFinancials;
  vulnerability: CaseVulnerability;
  notes: string;
  historicalAssistanceTotal: number;
  attachments: MockAttachment[];
  documentsChecklist?: DocumentsChecklist;
  housingFacilities?: HousingFacilities;
  referralSource?: string;
  caseSummary?: string;
  researcherRecommendation?: string;
  recommendedAssistanceType?: string;
  recommendedMonthlyAmount?: number;
  researcherJustification?: string;
  adminRevisionNote?: string;
  gpsLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    mapsUrl?: string;
  };
  directionsNote?: string;
  voiceNoteUrl?: string;
  voiceNoteDuration?: number;
  surveyAnswers?: CaseSurveyAnswers; // لقطة منظمة لإجابات الـ 24 سؤالاً (Supabase jsonb: survey_answers)
}

export interface CaseResearchReport {
  id: string;
  caseId: string;
  caseCode: string;
  caseName: string;
  researcherName: string;
  researcherId?: string;          // المعرّف القياسي للباحث الميداني
  reportDate: string;
  visitType: 'initial_field' | 'periodic_followup' | 'emergency_check';
  housingNotes: string;
  incomeObservations: string;     // رصد الدخل غير المباشر
  healthObservations: string;
  recommendations: string;
  trustScore: number;             // نسبة الثقة في الواقع الميداني
  documentsStatus: 'complete' | 'incomplete_trusted' | 'incomplete_questionable';
  assessedScore: number;          // درجة التقييم
}

export interface FieldVisit {
  id: string;
  caseId: string;
  caseCode: string;
  caseName: string;
  researcherName: string;
  researcherId?: string;          // المعرّف القياسي للباحث الميداني
  visitDate: string;
  scheduledNextDate: string;
  status: 'completed' | 'scheduled' | 'overdue';
  observations: string;
  recommendedChanges: string;
  attachmentsCount: number;
  voiceNoteUrl?: string;
  gpsLocation?: {
    latitude: number;
    longitude: number;
    mapsUrl?: string;
  };
  checklistSummary?: Record<string, boolean>;
}

export type DonationChannel = 'bank_transfer' | 'instapay' | 'vodafone_cash' | 'cash_hand' | 'cheque';
export type DonationRestriction = 'unrestricted' | 'restricted_purpose' | 'restricted_case';
export type DonationPurpose = 'medical' | 'food' | 'housing_repair' | 'orphan_sponsorship' | 'general_aid';

export type ShariaCategoryColor = 'emerald' | 'purple' | 'rose' | 'teal' | 'amber' | 'cyan' | 'indigo';

export interface ShariaDonationCategory {
  id: string;
  name: string;                   // مثل: زكاة مال، كفالة أيتام، صدقة جارية
  description: string;            // شرح المصرف الشرعي وضوابط توجيهه
  color: ShariaCategoryColor;     // السمة اللونية للشارة
  iconName?: string;
  isActive: boolean;              // متاح للصرف والتحصيل
  isSystemDefault?: boolean;      // تصنيف قياسي معتمد
}

export interface ChronicDiseaseConfig {
  id: string;
  name: string;
  defaultMonthlyCost: number;
  isActive: boolean;
}

export interface Donation {
  id: string;
  donorId: string;
  donorName: string;
  donorReference: string;
  donorPhone?: string;
  amount: number;
  receivedDate: string;
  channel: DonationChannel;
  status: 'received' | 'pledged';
  restrictionType: DonationRestriction;
  designatedPurpose?: DonationPurpose;
  shariaCategoryId?: string;      // المعرف الفريد للمصرف الشرعي الديناميكي
  shariaCategoryName?: string;    // اسم المصرف الشرعي
  designatedCaseId?: string;
  designatedCaseName?: string;
  allocatedAmount: number;
  remainingAmount: number;
  manualReceiptNo?: string;       // رقم الإيصال الدفتري / سند القبض الورقي
  notes?: string;
}

export interface DeliveryProof {
  imageDataUrl: string;           // صورة الإثبات بعد الضغط من جهة المتصفح
  capturedAt: string;             // تاريخ ووقت التسليم تلقائياً
  location?: {
    lat: number;
    lng: number;
  };                              // إحداثيات GPS اختيارية
  deliveryNote?: string;          // ملاحظة سريعة اختيارية عند التسليم
}

export interface AllocationItem {
  id: string;
  caseId: string;
  caseCode: string;
  caseName: string;
  priority: PriorityLevel;
  score: number;                  // درجة الاحتياج من 100
  financialGap: number;           // الفجوة المالية
  proposedAmount: number;         // المبلغ المقترح تلقائياً
  approvedAmount: number;         // المبلغ المعتمد من الإدارة
  fundSource: 'unrestricted_pool' | 'restricted_case' | 'restricted_purpose';
  fundSourceName: string;
  reasoning: string;              // تفسير المقترح
  isExcluded: boolean;
  exclusionReason?: string;
  isManuallyAdjusted: boolean;
  adjustmentReason?: string;
  isVisitOverdue?: boolean;
  overdueMonthsElapsed?: number;
  deliveryProof?: DeliveryProof;  // إثبات التسليم الميداني (إن وجد)
}

export type AllocationCycleType = 'regular' | 'exceptional';
export type ExceptionalDistributionMode = 'flat_per_case' | 'split_budget';

export interface MonthlyAllocation {
  id: string;
  period: string;                 // معرف الدورة (مثلاً 2026-10 أو cycle-...)
  periodLabel: string;            // أكتوبر 2026
  batchTitle?: string;            // مسمى دورة الصرف / اسم الدفعة (مثال: كفالات نوفمبر، منحة دخول المدارس)
  cycleType?: AllocationCycleType; // نوع الدورة: شهرية دورية أو استثنائية/موسمية
  periodDate?: string;            // تاريخ الاستحقاق أو الصرف الفعلي (YYYY-MM-DD)
  executionDate?: string;         // تاريخ تنفيذ الصرف المحدد (مثال: 2026-10-25)
  coverageMonths?: number;        // معامل التغطية (1 = شهر واحد، 2 = شهرين مجمعين...)
  allocationStrategy?: 'priority_first' | 'proportional'; // خوارزمية التوزيع المعتمدة
  exceptionalDistributionMode?: ExceptionalDistributionMode; // نمط توزيع الدورة الاستثنائية
  flatAmountPerCase?: number;     // المبلغ الموحد لكل أسرة في الدورات الاستثنائية
  totalBudget: number;
  unrestrictedBudget: number;
  restrictedBudget: number;
  status: 'draft' | 'approved' | 'closed';
  generatedDate: string;
  approvedDate?: string;
  approvedBy?: string;
  sessionMinutesNumber?: string;  // رقم محضر الجلسة المعتمد
  sessionMinutesDate?: string;    // تاريخ انعقاد الجلسة المعتمد
  treasuryDeduction?: {
    approvedUnrestricted: number;
    approvedRestricted: number;
    totalDeducted: number;
    carriedOverSurplus: number;
    nextPeriod?: string;
    nextPeriodLabel?: string;
  };
  carriedOverFromPreviousPeriod?: {
    previousPeriod: string;
    previousPeriodLabel: string;
    carriedOverAmount: number;
  };
  unlockedDate?: string;
  unlockedBy?: string;
  unlockReason?: string;
  isExceptionallyUnlocked?: boolean;
  items: AllocationItem[];
  summary: {
    totalAllocated: number;
    unallocatedBalance: number;
    totalAssessedNeed: number;
    unmetNeed: number;
    totalOverdueSuspendedNeed?: number;
    overdueSuspendedCasesCount?: number;
    eligibleCasesCount: number;
    excludedCasesCount: number;
    fundedCasesCount: number;
  };
}

export interface AssessmentFactorBreakdown {
  financialGapScore: number;      // 0-35
  medicalUrgencyScore: number;    // 0-25
  orphanDependentsScore: number;  // 0-20
  housingInsecurityScore: number; // 0-10
  workCapacityPenalty: number;    // 0-(-10)
  confidenceMultiplier: number;   // 0.8 - 1.0
  totalScore: number;             // 0-100
  explanation: string[];
}

export interface ScoringRulesConfig {
  financialGapWeight: number;     // 35%
  medicalUrgencyWeight: number;   // 25%
  orphanDependentsWeight: number; // 20%
  housingConditionWeight: number; // 10%
  workCapacityWeight: number;     // 10%
  overdueVisitMonths: number;     // 6 أشهر
  maxAssistanceCap: number;       // سقف المساعدة الواحدة مثلا 5000 ج.م
  minAssistanceFloor: number;     // الحد الأدنى للمساعدة مثلا 500 ج.م
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details: string;
}

export type AppUserRole = 'admin' | 'finance' | 'researcher' | 'donor';

export type SystemAuthRole = 'admin' | 'researcher';

/**
 * عقد المستخدم المطابق لبنية Supabase Auth + public.profiles
 * يتيح التبديل المستقبلي إلى supabase.auth.getUser() دون تعديل الواجهات
 */
export interface AuthUser {
  id: string;                     // يطابق auth.users.id (UUID في Supabase)
  email: string;                  // يطابق auth.users.email
  name: string;                   // الاسم المعروض
  role: SystemAuthRole;           // يطابق profiles.role / JWT claim
  title: string;                  // المسمى الوظيفي
  badgeLabel: string;             // الوسم المختصر
  avatarInitial: string;          // حرف الأفاتار
  researcherId: string | null;    // يطابق profiles.researcher_id للباحث أو null للإدارة
  assignedDistricts?: string[];   // نطاقات العمل الميداني
}

export interface CustodyDeliveryItem {
  id: string;
  sourceType: 'allocation_cycle' | 'fast_track';
  sourceLabel: string;            // اسم الدورة المعتمدة أو كود الإذن الفوري
  cyclePeriod?: string;
  voucherCode?: string;
  caseId: string;
  caseCode: string;
  caseName: string;
  beneficiaryPhone: string;
  beneficiaryAddress: string;
  district: string;
  payoutMethod?: PayoutMethod;
  walletNumber?: string;
  researcherId?: string;
  assignedResearcher: string;
  amount: number;
  status: 'pending_delivery' | 'delivered';
  issuedDate: string;
  dueDeadlineDate?: string;
  deliveredDate?: string;
  purposeNote?: string;
  fastTrackOrderId?: string;
  deliveryProof?: DeliveryProof;
}

export interface UserSessionProfile {
  role: AppUserRole;
  name: string;
  title: string;
  avatarInitial: string;
  badgeLabel: string;
  defaultTab: string;
  allowedTabs: string[];
  description: string;
}

export interface ResearcherProfile {
  id: string;
  name: string;
  roleTitle: string;            // باحث ميداني معتمد، متطوع أبحاث اجتماعية
  phone: string;
  email: string;
  assignedDistricts: string[];  // أحياء ومناطق التكليف
  joinedDate: string;
  totalVisitsConducted: number;
  activeAssignedCasesCount: number;
  pendingVisitsCount: number;
  completionRate: number;       // نسبة إنجاز الزيارات %
  bio: string;
  status?: 'active' | 'inactive';
}

export interface FastTrackDisbursementOrder {
  id: string;
  voucherCode: string;            // كود الإذن الرسمي مثل FTD-2026-001
  caseId: string;
  caseCode: string;
  caseName: string;
  beneficiaryPrimaryName: string;
  beneficiarySecondaryName?: string;
  beneficiaryNationalId: string;
  beneficiaryPhone: string;
  beneficiaryAddress: string;
  shariaCategoryId: string;       // معرف الصندوق المقيد
  shariaCategoryName: string;     // اسم المصرف الشرعي
  shariaCategoryColor: string;
  amount: number;
  assignedResearcher: string;     // مسؤول التسليم الميداني
  researcherId?: string;          // المعرّف القياسي للباحث الميداني
  issuedDate: string;             // تاريخ إصدار الأمر
  dueDeadlineDate: string;        // أقصى مهلة للتسليم (افتراضياً 7 أيام)
  status: 'pending_delivery' | 'delivered' | 'cancelled';
  deliveredDate?: string;
  deliveryReceiptNo?: string;     // رقم سند الصرف / إيصال الاستلام الورقي
  deliveryMethod?: 'cash_signed' | 'postal_transfer' | 'direct_vendor_payment' | string; // طريقة الاستلام
  deliveryNotes?: string;         // ملاحظات واقعة التسليم الميداني
  purposeNote: string;            // بيان الغرض والظرف الطارئ
  issuedBy: string;               // المسؤول المعتمد
  manualReceiptNo?: string;       // رقم الإيصال الدفتري / سند القبض الورقي
  donationId?: string;            // معرف التبرع المقيد المرتبط
  isRestrictedCaseOrder?: boolean;// صادر تلقائياً بموجب تبرع مقيد لحالة بعينها
  donorName?: string;             // اسم المتبرع المخصص
  deliveryProof?: DeliveryProof;  // إثبات التسليم الميداني
}

export interface CaseNote {
  id: string;
  caseId: string;
  authorName: string;
  authorRole: string;
  authorId?: string;
  authorUserId?: string;          // يطابق AuthUser.id / Supabase auth.uid() لعزل الملاحظات الخاصة
  isPrivate: boolean; // true = خاصة بي (Private), false = عامة للفريق (Public)
  content: string;
  createdAt: string;
  timestamp: number;
  category?: 'general' | 'followup' | 'warning' | 'urgent';
}

// ==========================================
// نموذج تقرير بحث حالة (Case Study Report - PDF Schema)
// Supabase Ready Data Types & Schema
// ==========================================

export interface CaseStudyFamilyMember {
  id: string;
  orderNumber: number;            // م (رقم المسلسل)
  name: string;                   // الاسم
  relation: string;               // صلة القرابة بالنسبة للحالة المستهدفة بالبحث (رب الأسرة، زوجة، ابن، ابنة، أم، أب، أخ...)
  maritalStatus: string;          // الحالة الاجتماعية (أعزب، متزوج، أرمل، مطلق، مهجور)
  age: number | string;           // الحالة العمرية والسن
  educationLevel: string;         // الحالة الدراسية (أمية، ابتدائي، إعدادي، ثانوي، جامعي، غير ملتحق)
  workCapacity: string;           // القدرة على العمل (قادر على العمل، عاجز كلياً، عاجز جزئياً/مسن، طفل/قاصر)
  currentJob: string;             // العمل (لا يعمل، عامل يومية، موظف، حرفي...)
  isPrimaryCaregiver?: boolean;   // المتكفل الفعلي بالإنفاق / الرعاية
  chronicIllness?: {
    diseaseId?: string;           // معرف المرض المزمن من الإعدادات أو '__other__'
    conditionName: string;        // مسمى المرض / العجز
    monthlyCost: number;          // التكلفة الشهرية للعلاج والدواء (ج.م)
    isCoveredByStateInsurance: boolean; // هل مشمول بتأمين صحي أو علاج على نفقة الدولة
  };
}

export interface HousingFacilities {
  roofType: 'concrete' | 'wood_straw' | 'damaged';
  waterConnection: 'independent' | 'shared' | 'none';
  electricityMeter: 'formal' | 'code_meter' | 'none';
  hasPrivateBathroom: boolean;
  basicAppliancesAvailable: string[]; // ['ثلاجة', 'غسالة', 'بوتاجاز', 'أسرّة كافية']
}

export interface CaseStudyReport {
  id: string;
  caseId?: string;                // كود الحالة المرتبطة (إن وجد)
  
  // الخطوة 1: البيانات التعريفية والتواصل
  caseName: string;               // اسم الحالة
  visitorName: string;            // مسؤول الحالة / الزائر (الباحث الميداني)
  visitDate: string;              // تاريخ الزيارة
  address: string;                // العنوان ومحل الإقامة
  contactPhone: string;           // أرقام التواصل
  secondaryPhone?: string;        // هاتف إضافي
  referralSource: string;         // طريقة وصول الحالة (ترشيح من متطوع، التقدم بمقر الجمعية، نزول ميداني، إحالة جهة)
  priorityLevel: PriorityLevel;   // تصنيف أولوية الحالة (حرجة، عالية، متوسطة، منخفضة)
  
  // الخطوة 2: تقييم السكن والبيئة المحيطة
  housingStatus: HousingCondition | string; // الحالة السكنية (ملك، إيجار مستقر، إيجار غير مستقر، آيل للسقوط...)
  caseSummary: string;            // مختصر وصف الحالة والبيئة السكنية
  landmarkAddress?: string;       // علامة مميزة لموقع السكن
  gpsLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    mapsUrl?: string;
  };
  housingFacilities?: HousingFacilities; // مرافق السكن والأجهزة الأساسية
  
  // الخطوة 3: أفراد الأسرة ومصادر الدخل
  familyMembers: CaseStudyFamilyMember[]; // جدول أفراد الأسرة (PDF Page 2)
  basicIncomeSources: string;     // مصادر الدخل الأساسية لكامل أفراد الأسرة
  basicIncomeAmount: number;      // إجمالي الدخل الأساسي الشهري
  additionalIncomeSources: string;// مصادر دخل إضافية (أعمال يومية غير منتظمة)
  additionalIncomeAmount: number; // إجمالي الدخل الإضافي الشهري
  familyAssets: string;           // أملاك الأسرة (أجهزة، مركبة عمل، دابة، أرض/محل، لا يوجد)
  
  // الخطوة 4: الالتزامات المالية واحتساب الفجوة
  debtsAndObligations: string;    // توثيق الالتزامات والديون
  monthlyBasicExpenses: number;   // المصروفات الشهرية المعيشية الأساسية (إيجار، طعام، فواتير)
  monthlyDebtsInstallments: number; // أقساط الديون الشهرية
  netFinancialGap: number;        // الفجوة المالية المحسوبة تلقائياً
  financialGapDocumentation: string; // توثيق الفجوة المالية والمبررات
  
  // الخطوة 5: الحالة الصحية والاحتياج الطبي
  medicalConditionDescription: string; // توصيف الحالات المرضية
  chronicVerification: string;    // التأكد من صحة واستمرار المرض (مؤكد بتقارير حديثة، عجز كلي، عجز جزئي، لا يوجد)
  monthlyMedicalCosts: number;    // تكاليف العلاج والفحوصات الدورية
  stateHealthInsuranceDetails: string; // تفاصيل التأمين أو العلاج على نفقة الدولة
  
  // الخطوة 6: المرفقات وقائمة التحقق (Checklist & Documents)
  attachments: {
    nationalIdsAdults: boolean;   // بطاقات وش وضهر سارية لكامل البالغين في أفراد الأسرة
    birthCertificatesMinors: boolean; // شهادات ميلاد لكامل أفراد الأسرة القصر
    deathOrDivorceCertificates: boolean; // شهادات الوفاة / قسيمة الطلاق
    recentMedicalProof: boolean;  // إثباتات حديثة للحالة المرضية
    insurancePrintOut?: boolean;  // برنت تأميني / إفادة تكافل وكرامة
    utilityReceipt?: boolean;     // إيصال مرافق حديث (كهرباء أو مياه)
    leaseContractOrRentReceipt?: boolean; // عقد إيجار / إيصال سداد
    uploadedFiles?: Array<{
      id: string;
      title: string;
      category: string;
      fileName: string;
      progress: number;
      status: 'uploading' | 'completed';
      url?: string;
      durationSeconds?: number;
    }>;
  };
  
  recommendedAssistanceType?: string;
  recommendedMonthlyAmount?: number;
  additionalNotesAndRemarks?: string; // ملاحظات وتفاصيل إضافية (أسفل صفحة 2 من نموذج PDF)
  voiceNoteUrl?: string;              // رابط التسجيل الصوتي للملاحظات الميدانية للباحث
  voiceNoteDuration?: number;         // مدة التسجيل الصوتي بالثواني
  executiveSummary?: CaseExecutiveSummary; // ملخص إداري تنفيذي مستنتج بالذكاء الاصطناعي
  status: 'pending_review' | CaseStatus; // حالة الاستمارة (بانتظار المراجعة والاعتماد)
  createdAt: string;
  updatedAt: string;
}

export interface CaseExecutiveSummary {
  recommendedDecision: 'high_priority' | 'medium_priority' | 'ineligible';
  justificationText: string; // سطرين يوضحان مبرر القرار والفجوة
  checklistAlerts: string[]; // أي نواقص مستندات تم استنتاجها من التسجيل
}


