export const LEGACY_DRAFT_STORAGE_KEY = 'ehsan_case_study_draft_v1';

export const getDraftStorageKey = (caseId: string | null) =>
  caseId ? `case_study_draft_${caseId}` : 'case_study_draft_general';

export const ENABLE_AI_EXTRACTION_V2 = false; // ميزة التفريغ الآلي بالذكاء الاصطناعي معطلة في الإصدار الأول v1

export const TOTAL_QUESTIONS = 24;

export const ASSISTANCE_TYPE_OPTIONS = [
  {
    id: 'كفالة شهرية',
    label: 'كفالة شهرية',
    desc: 'دعم مالي شهري منتظم لتغطية أساسيات المعيشة',
  },
  {
    id: 'مساعدة علاجية',
    label: 'مساعدة علاجية',
    desc: 'توفير أدوية أو فحوصات أو تدخل طبي',
  },
  {
    id: 'سداد متأخرات إيجار',
    label: 'سداد متأخرات إيجار',
    desc: 'سداد إيجار متراكم لحماية الأسرة من الطرد',
  },
  {
    id: 'دعم غذائي',
    label: 'دعم غذائي',
    desc: 'شنطة غذائية شهرية أو تموين أساسي للأسرة',
  },
  {
    id: 'مساعدة طارئة',
    label: 'مساعدة طارئة',
    desc: 'تدخل سريع لظرف عاجل أو أزمة مؤقتة',
  },
] as const;

// SpeechRecognition polyfill interface
export type IWindow = typeof window & {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
};

export interface AttachmentItem {
  id: string;
  category: 'adultIds' | 'minorCerts' | 'medicalProof' | 'customExtra';
  title: string;
  fileName: string;
  fileSize: string;
  progress: number;
  status: 'uploading' | 'completed';
  customDescription?: string; // بيان أو نوع المستند الإضافي (مثال: وصل كهرباء، عقد إيجار...)
}

export interface SubmittedSummaryData {
  caseName: string;
  gap: number;
  researcher: string;
  membersCount: number;
}
