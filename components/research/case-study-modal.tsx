'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { useApp } from '@/context/app-context';
import { useToast } from '@/context/toast-context';
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  UploadCloud,
  User,
  Phone,
  Calendar,
  Home,
  Users,
  Wallet,
  Activity,
  FileCheck,
  Plus,
  Trash2,
  Sparkles,
  ShieldCheck,
  Building,
  Check,
  Mic,
  MicOff,
  MapPin,
  TrendingUp,
  Camera,
  FileText,
  HeartHandshake,
  Eye,
  Square,
  Play,
  Pause,
  Loader2,
  RotateCcw,
  Volume2,
  AlertTriangle,
  Save,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  CaseStudyReport,
  CaseStudyFamilyMember,
  PriorityLevel,
  HousingFacilities,
  CaseExecutiveSummary,
} from '@/types';
import { ResearcherSelect } from '@/components/cases/researcher-select';
import { ResearcherVoicePlayer } from '@/components/common/researcher-voice-player';
import { CustomSelect, CustomSelectOption } from '@/components/ui/custom-select';

const LEGACY_DRAFT_STORAGE_KEY = 'ehsan_case_study_draft_v1';
const getDraftStorageKey = (caseId: string | null) =>
  caseId ? `case_study_draft_${caseId}` : 'case_study_draft_general';
const ENABLE_AI_EXTRACTION_V2 = false; // ميزة التفريغ الآلي بالذكاء الاصطناعي معطلة في الإصدار الأول v1

const ASSISTANCE_TYPE_OPTIONS = [
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
type IWindow = typeof window & {
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

export function CaseStudyModal() {
  const { user: authUser } = useAuth();
  const isResearcherPOV = authUser.role === 'researcher';
  const {
    isFieldSurveyModalOpen,
    setIsFieldSurveyModalOpen,
    surveyTargetCaseId,
    cases,
    chronicDiseases,
    submitCaseStudyReport,
    currentSessionProfile,
    setActiveSection,
  } = useApp();

  const { showToast: triggerToast, toast } = useToast();

  // Wizard Step: Single atomic questions (1 to 24)
  const [currentQuestion, setCurrentQuestion] = useState<number>(1);
  const totalQuestions = 24;

  const showToast = useCallback(
    (message: string) => {
      const isPositive =
        message.startsWith('تم') || message.startsWith('✨');
      triggerToast({
        title: message,
        variant: isPositive ? 'success' : 'info',
      });
    },
    [triggerToast]
  );

  // Completion / Success state
  const [isSuccessSubmitted, setIsSuccessSubmitted] = useState(false);
  const [submittedSummary, setSubmittedSummary] = useState<{
    caseName: string;
    gap: number;
    researcher: string;
    membersCount: number;
  } | null>(null);

  // Draft & close-confirmation state
  const [hasDraftAvailable, setHasDraftAvailable] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const isDraftInitializedRef = useRef(false);

  // ----------------------------------------------------
  // Form State Fields
  // ----------------------------------------------------
  const [caseName, setCaseName] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [contactPhone, setContactPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [referralSource, setReferralSource] = useState('ترشيح من متطوع / باحث ميداني');
  const [otherReferralSource, setOtherReferralSource] = useState('');
  const [priorityLevel, setPriorityLevel] = useState<PriorityLevel>('high');
  const [housingStatus, setHousingStatus] = useState<string>('إيجار غير مستقر / مهدد بالإخلاء');
  const [caseSummary, setCaseSummary] = useState('');
  const [landmarkAddress, setLandmarkAddress] = useState('');
  const [adminRevisionNote, setAdminRevisionNote] = useState<string | null>(null);
  const [isRevisionBannerExpanded, setIsRevisionBannerExpanded] = useState(true);

  // مرافق السكن والأجهزة الأساسية
  const [roofType, setRoofType] = useState<'concrete' | 'wood_straw' | 'damaged'>('wood_straw');
  const [waterConnection, setWaterConnection] = useState<'independent' | 'shared' | 'none'>('shared');
  const [electricityMeter, setElectricityMeter] = useState<'formal' | 'code_meter' | 'none'>('code_meter');
  const [hasPrivateBathroom, setHasPrivateBathroom] = useState<boolean>(true);
  const [basicAppliances, setBasicAppliances] = useState<string[]>(['غسالة', 'بوتاجاز']);

  // 1. أفراد الأسرة بنظام البطاقة الفردية (Member Sub-flow)
  const [familyMembers, setFamilyMembers] = useState<CaseStudyFamilyMember[]>([
    {
      id: 'mem-init-1',
      orderNumber: 1,
      name: '',
      relation: 'نفس الحالة (صاحب الملف الأساسي)',
      maritalStatus: 'متزوج',
      age: 46,
      educationLevel: 'ابتدائي',
      workCapacity: 'عاجز جزئياً أو مسن',
      currentJob: 'عمالة يومية غير منتظمة',
      isPrimaryCaregiver: true,
      chronicIllness: {
        conditionName: 'انزلاق غضروفي وخشونة ركبتين',
        monthlyCost: 350,
        isCoveredByStateInsurance: false,
      },
    },
    {
      id: 'mem-init-2',
      orderNumber: 2,
      name: '',
      relation: 'الزوج / الزوجة',
      maritalStatus: 'متزوج',
      age: 41,
      educationLevel: 'أمية',
      workCapacity: 'قادر على العمل',
      currentJob: 'ربة منزل',
      isPrimaryCaregiver: false,
    },
  ]);
  const [activeMemberIndex, setActiveMemberIndex] = useState<number>(0);

  // Income
  const [basicIncomeAmount, setBasicIncomeAmount] = useState<number>(650);
  const [basicIncomeSources, setBasicIncomeSources] = useState('معاش تكافل وكرامة');
  const [additionalIncomeAmount, setAdditionalIncomeAmount] = useState<number>(400);
  const [additionalIncomeSources, setAdditionalIncomeSources] = useState<string>('يوميات غير منتظمة');
  const [familyAssets, setFamilyAssets] = useState<string>('لا توجد أي أملاك مسجلة');

  // Expenses & Debts
  const [monthlyBasicExpenses, setMonthlyBasicExpenses] = useState<number>(2500);
  const [monthlyDebtsInstallments, setMonthlyDebtsInstallments] = useState<number>(600);
  const [debtsAndObligations, setDebtsAndObligations] = useState(
    'ديون بقالة ومتأخرات إيجار شهرين لصاحب العقار'
  );

  // Health & Medical
  const [medicalConditionDescription, setMedicalConditionDescription] = useState(
    'رب الأسرة يعاني من انزلاق غضروفي حاد وخشونة بالركبتين تعيقه عن العمل المنتظم'
  );
  const [chronicVerification, setChronicVerification] = useState(
    'مؤكد بتقارير وفحوصات طبية حديثة'
  );
  // 2. سؤال التأمين الصحي ونفقة الدولة
  const [stateHealthInsurance, setStateHealthInsurance] = useState<string>(
    'غير مشمول بأي تأمين صحي'
  );
  const [monthlyMedicalCosts, setMonthlyMedicalCosts] = useState<number>(450);

  // 3 & 5. المرفقات الثبوتية والمستندات الإضافية المرنة
  const [uploadedDocs, setUploadedDocs] = useState<AttachmentItem[]>([
    {
      id: 'doc-1',
      category: 'adultIds',
      title: 'بطاقات سارية لكامل البالغين (وش وضهر)',
      fileName: 'national-ids.jpg',
      fileSize: '1.8 MB',
      progress: 100,
      status: 'completed',
    },
    {
      id: 'doc-2',
      category: 'minorCerts',
      title: 'شهادات ميلاد أفراد الأسرة القصر',
      fileName: 'birth-certificates.pdf',
      fileSize: '950 KB',
      progress: 100,
      status: 'completed',
    },
  ]);

  // قائمة التحقق الرسمية للمستندات والثبوتيات (Official Checklist)
  const [checklist, setChecklist] = useState({
    nationalIdsAdults: true,
    birthCertificatesMinors: true,
    insurancePrintOut: true,
    utilityReceipt: true,
    leaseContractOrRentReceipt: false,
    recentMedicalProof: true,
    deathOrDivorceCertificates: false,
  });

  const [recommendedAssistanceType, setRecommendedAssistanceType] = useState<string>('كفالة شهرية');
  const [recommendedAmountOverride, setRecommendedAmountOverride] = useState<number | null>(null);
  const [additionalNotesAndRemarks, setAdditionalNotesAndRemarks] = useState('');

  // New Custom Document dialog / quick input
  const [isAddingCustomDoc, setIsAddingCustomDoc] = useState(false);
  const [customDocTitle, setCustomDocTitle] = useState('');
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const extraFileInputRef = useRef<HTMLInputElement>(null);

  // Financial calculations
  const totalIncome = (Number(basicIncomeAmount) || 0) + (Number(additionalIncomeAmount) || 0);
  const totalObligations =
    (Number(monthlyBasicExpenses) || 0) +
    (Number(monthlyDebtsInstallments) || 0) +
    (Number(monthlyMedicalCosts) || 0);
  const netFinancialGap = Math.max(0, totalObligations - totalIncome);
  const effectiveRecommendedAmount =
    recommendedAmountOverride !== null ? recommendedAmountOverride : netFinancialGap;

  // ----------------------------------------------------
  // Full Voice Recording & AI Auto-fill (MediaRecorder)
  // ----------------------------------------------------
  const [isFullAudioRecording, setIsFullAudioRecording] = useState(false);
  const [fullAudioDuration, setFullAudioDuration] = useState(0);
  const [fullAudioBlob, setFullAudioBlob] = useState<Blob | null>(null);
  const [fullAudioUrl, setFullAudioUrl] = useState<string | null>(null);
  const [isExtractingWithAI, setIsExtractingWithAI] = useState(false);
  const [isVoiceExtractionSuccess, setIsVoiceExtractionSuccess] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [executiveSummary, setExecutiveSummary] = useState<CaseExecutiveSummary | null>(null);
  const [voiceSessionTranscript, setVoiceSessionTranscript] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRecognitionRef = useRef<any>(null);

  // ----------------------------------------------------
  // Voice Dictation (Speech to Text)
  // ----------------------------------------------------
  const [isListening, setIsListening] = useState(false);
  const [activeVoiceField, setActiveVoiceField] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const toggleVoiceDictation = (
    fieldKey: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (isListening && activeVoiceField === fieldKey) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      setActiveVoiceField(null);
      return;
    }

    const win = typeof window !== 'undefined' ? (window as IWindow) : null;
    const SpeechRecognitionClass = win?.SpeechRecognition || win?.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      showToast('الإملاء الصوتي غير مدعوم في متصفحك، يمكنك استخدام لوحة المفاتيح');
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'ar-EG';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setActiveVoiceField(fieldKey);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }
        if (transcript.trim()) {
          setter((prev) => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setActiveVoiceField(null);
      };

      recognition.onend = () => {
        setIsListening(false);
        setActiveVoiceField(null);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      setIsListening(false);
      setActiveVoiceField(null);
      showToast('تعذر تشغيل الميكروفون، يرجى السماح بالوصول في الإعدادات');
    }
  };

  // Helper format seconds to mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start Full Audio Recording (MediaRecorder API)
  const startFullAudioRecording = async () => {
    if (isFullAudioRecording) return;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('المتصفح لا يدعم تسجيل الصوت عبر الميكروفون المباشر');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let options: MediaRecorderOptions = {};
      if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options = { mimeType: 'audio/webm;codecs=opus' };
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          options = { mimeType: 'audio/webm' };
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options = { mimeType: 'audio/mp4' };
        }
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mime = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });
        setFullAudioBlob(audioBlob);
        if (fullAudioUrl && fullAudioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(fullAudioUrl);
        }
        const newUrl = URL.createObjectURL(audioBlob);
        setFullAudioUrl(newUrl);

        // Convert to Data URL for persistence across views/modals
        try {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              setFullAudioUrl(reader.result);
            }
          };
          reader.readAsDataURL(audioBlob);
        } catch {
          // fallback to object URL
        }

        // Automatically attach as تسجيل_صوتي_للباحث.webm in case attachments
        const audioSizeMb = ((audioBlob.size || 240000) / (1024 * 1024)).toFixed(2);
        setUploadedDocs((prev) => [
          {
            id: 'doc-voice-memo',
            category: 'voiceRecording' as any,
            title: 'ملاحظات الباحث الصوتية عن الزيارة',
            fileName: 'تسجيل_صوتي_للباحث.webm',
            fileSize: `${audioSizeMb} MB`,
            progress: 100,
            status: 'completed' as const,
            customDescription: 'تم حفظ التسجيل وجاهز للمراجعة',
          },
          ...prev.filter(
            (item) => (item.category as string) !== 'voiceRecording' && item.id !== 'doc-voice-memo'
          ),
        ]);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.start(250);
      setIsFullAudioRecording(true);
      setFullAudioDuration(0);
      setIsVoiceExtractionSuccess(false);
      setVoiceSessionTranscript('');

      // Also start live browser speech recognition in background if supported
      const win = typeof window !== 'undefined' ? (window as IWindow) : null;
      const SpeechRecognitionClass = win?.SpeechRecognition || win?.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        try {
          const recognition = new SpeechRecognitionClass();
          recognition.lang = 'ar-EG';
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.onresult = (event: any) => {
            let text = '';
            for (let i = 0; i < event.results.length; i++) {
              text += event.results[i][0].transcript + ' ';
            }
            if (text.trim()) {
              setVoiceSessionTranscript(text.trim());
            }
          };
          recognition.start();
          sessionRecognitionRef.current = recognition;
        } catch {
          // ignore
        }
      }

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setFullAudioDuration((prev) => prev + 1);
      }, 1000);

      showToast('🎙️ بدأ التسجيل... سجل بصوتك أي ملاحظة مش مكتوبة عن الزيارة');
    } catch (err: any) {
      console.error('Error starting media recording:', err);
      showToast('يرجى السماح بالوصول إلى الميكروفون لبدء التسجيل الصوتي');
    }
  };

  // Stop Full Audio Recording
  const stopFullAudioRecording = () => {
    if (!isFullAudioRecording && !mediaRecorderRef.current) return;
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } catch (err) {
      console.error('Error stopping recorder:', err);
    }

    if (sessionRecognitionRef.current) {
      try {
        sessionRecognitionRef.current.stop();
      } catch {
        // ignore
      }
      sessionRecognitionRef.current = null;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsFullAudioRecording(false);
    showToast('تم حفظ التسجيل وجاهز للمراجعة (تسجيل_صوتي_للباحث.webm)');
  };

  // Delete Recorded Audio Memo
  const deleteFullAudioRecording = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setIsPlayingAudio(false);
    if (fullAudioUrl && fullAudioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(fullAudioUrl);
    }
    setFullAudioBlob(null);
    setFullAudioUrl(null);
    setFullAudioDuration(0);
    setUploadedDocs((prev) =>
      prev.filter(
        (item) => (item.category as string) !== 'voiceRecording' && item.id !== 'doc-voice-memo'
      )
    );
    showToast('تم مسح الريكورد الصوتي، تقدر تسجل من جديد في أي وقت');
  };

  // Toggle playback of recorded audio
  const togglePlayRecordedAudio = () => {
    if (!audioPlayerRef.current || !fullAudioUrl) return;
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current
        .play()
        .then(() => setIsPlayingAudio(true))
        .catch((e) => console.error(e));
    }
  };

  // AI Voice-to-Form Extraction Handler
  const handleAIVoiceExtraction = async () => {
    if (!fullAudioBlob && !caseSummary && !voiceSessionTranscript) {
      showToast('يرجى تسجيل مقطع صوتي أولاً لتفريغه وتعبئة الاستمارة آلياً');
      return;
    }

    setIsExtractingWithAI(true);
    try {
      const formData = new FormData();
      if (fullAudioBlob) {
        formData.append('audio', fullAudioBlob, 'case-interview.webm');
      }
      const textToSend = voiceSessionTranscript.trim() || caseSummary.trim();
      if (textToSend) {
        formData.append('transcribedText', textToSend);
      }

      const response = await fetch('/api/research/voice-extract', {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get('content-type') || '';
      let result: any;
      if (contentType.includes('application/json')) {
        result = await response.json();
      } else {
        throw new Error(
          response.status === 504 || response.status === 502
            ? 'استغرقت معالجة التسجيل وقتاً أطول من المتوقع، يرجى إعادة المحاولة'
            : `تعذر الاتصال بخدمة التحليل الذكي (${response.status})`
        );
      }

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'تعذر استخراج البيانات من الصوت');
      }

      const d = result.extractedData;

      // Populate form states
      if (d.caseName) setCaseName(d.caseName);
      if (d.visitorName) setVisitorName(d.visitorName);
      if (d.contactPhone) setContactPhone(d.contactPhone);
      if (d.secondaryPhone) setSecondaryPhone(d.secondaryPhone);
      if (d.address) setAddress(d.address);
      if (d.landmarkAddress) setLandmarkAddress(d.landmarkAddress);
      if (d.referralSource) setReferralSource(d.referralSource);
      if (d.priorityLevel) setPriorityLevel(d.priorityLevel as PriorityLevel);
      if (d.housingStatus) setHousingStatus(d.housingStatus);
      if (d.caseSummary) setCaseSummary(d.caseSummary);

      // Housing facilities
      if (d.housingFacilities) {
        if (d.housingFacilities.roofType) setRoofType(d.housingFacilities.roofType);
        if (d.housingFacilities.waterConnection) setWaterConnection(d.housingFacilities.waterConnection);
        if (d.housingFacilities.electricityMeter) setElectricityMeter(d.housingFacilities.electricityMeter);
        if (d.housingFacilities.hasPrivateBathroom !== undefined) {
          setHasPrivateBathroom(Boolean(d.housingFacilities.hasPrivateBathroom));
        }
        if (Array.isArray(d.housingFacilities.basicAppliancesAvailable)) {
          setBasicAppliances(d.housingFacilities.basicAppliancesAvailable);
        }
      }

      // Family members
      if (Array.isArray(d.familyMembers) && d.familyMembers.length > 0) {
        setFamilyMembers(
          d.familyMembers.map((m: any, idx: number) => ({
            id: `mem-${Date.now()}-${idx + 1}`,
            orderNumber: idx + 1,
            name: m.name || '',
            relation: m.relation || (idx === 0 ? 'نفس الحالة (صاحب الملف الأساسي)' : 'الابن / الابنة'),
            maritalStatus: m.maritalStatus || 'متزوج',
            age: Number(m.age) || 30,
            educationLevel: m.educationLevel || 'متوسط',
            workCapacity: m.workCapacity || 'قادر على العمل',
            currentJob: m.currentJob || 'لا يعمل',
            isPrimaryCaregiver: Boolean(m.isPrimaryCaregiver),
            chronicIllness: m.chronicIllness?.conditionName
              ? {
                  conditionName: m.chronicIllness.conditionName,
                  monthlyCost: Number(m.chronicIllness.monthlyCost) || 0,
                  isCoveredByStateInsurance: Boolean(m.chronicIllness.isCoveredByStateInsurance),
                }
              : undefined,
          }))
        );
      }

      // Financials
      if (d.basicIncomeAmount !== undefined) setBasicIncomeAmount(Number(d.basicIncomeAmount) || 0);
      if (d.basicIncomeSources) setBasicIncomeSources(d.basicIncomeSources);
      if (d.additionalIncomeAmount !== undefined) setAdditionalIncomeAmount(Number(d.additionalIncomeAmount) || 0);
      if (d.additionalIncomeSources) setAdditionalIncomeSources(d.additionalIncomeSources);
      if (d.familyAssets) setFamilyAssets(d.familyAssets);
      if (d.monthlyBasicExpenses !== undefined) setMonthlyBasicExpenses(Number(d.monthlyBasicExpenses) || 0);
      if (d.monthlyDebtsInstallments !== undefined) setMonthlyDebtsInstallments(Number(d.monthlyDebtsInstallments) || 0);
      if (d.debtsAndObligations) setDebtsAndObligations(d.debtsAndObligations);

      // Health
      if (d.medicalConditionDescription) setMedicalConditionDescription(d.medicalConditionDescription);
      if (d.chronicVerification) setChronicVerification(d.chronicVerification);
      if (d.monthlyMedicalCosts !== undefined) setMonthlyMedicalCosts(Number(d.monthlyMedicalCosts) || 0);
      if (d.stateHealthInsurance) setStateHealthInsurance(d.stateHealthInsurance);

      // Checklist
      if (d.checklist) {
        setChecklist((prev) => ({
          ...prev,
          ...d.checklist,
        }));
      }

      if (d.additionalNotesAndRemarks) setAdditionalNotesAndRemarks(d.additionalNotesAndRemarks);

      // Executive Summary
      if (d.executiveSummary) {
        setExecutiveSummary(d.executiveSummary);
      }

      // Attach raw audio recording to uploadedDocs
      if (fullAudioBlob) {
        const audioDocId = `audio-rec-${Date.now()}`;
        const audioSizeMb = ((fullAudioBlob.size || 250000) / (1024 * 1024)).toFixed(2);
        setUploadedDocs((prev) => [
          {
            id: audioDocId,
            category: 'voiceRecording' as any,
            title: 'تسجيل صوتي كامل لجلسة البحث الميداني',
            fileName: `field-voice-survey-${Date.now()}.webm`,
            fileSize: `${audioSizeMb} MB`,
            progress: 100,
            status: 'completed',
            customDescription: fullAudioUrl ? 'مقطع صوتي محفوظ للاستماع الإداري' : 'ملف صوتي خام',
          },
          ...prev.filter((item) => (item.category as string) !== 'voiceRecording'),
        ]);
      }

      setIsVoiceExtractionSuccess(true);
      showToast('✨ تم تفريغ وتعبئة كافة بنود الاستمارة والـ Checklist والملخص الإداري بنجاح!');
    } catch (err: any) {
      console.error('Error in AI extraction:', err);
      showToast(err?.message || 'تعذر استخراج البيانات من التسجيل الصوتي، يرجى المحاولة مرة أخرى');
    } finally {
      setIsExtractingWithAI(false);
    }
  };

  // Clean up media streams and intervals on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // GPS Geolocation Handler
  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      showToast('خاصية تحديد الموقع الجغرافي غير مدعومة في المتصفح');
      return;
    }
    setIsCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLocation({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
        setIsCapturingGps(false);
        showToast('تم تحديد موقع البيت بنجاح');
      },
      () => {
        setIsCapturingGps(false);
        showToast('يرجى تشغيل الـ GPS لتحديد موقع البيت');
      },
      { timeout: 8000 }
    );
  };

  // Refs to prevent stale closures & avoid re-initializing on visitorName/cases updates
  const casesRef = useRef(cases);
  const profileNameRef = useRef(currentSessionProfile.name);
  const authUserRef = useRef(authUser);
  useEffect(() => {
    casesRef.current = cases;
  }, [cases]);
  useEffect(() => {
    profileNameRef.current = currentSessionProfile.name;
  }, [currentSessionProfile.name]);
  useEffect(() => {
    authUserRef.current = authUser;
  }, [authUser]);

  const resetFormToDefaults = useCallback(() => {
    setCurrentQuestion(1);
    setActiveMemberIndex(0);
    setCaseName('');
    setVisitorName(
      authUserRef.current.role === 'researcher'
        ? authUserRef.current.name
        : profileNameRef.current || 'أ. هبة الشامي'
    );
    setVisitDate(new Date().toISOString().split('T')[0]);
    setContactPhone('');
    setSecondaryPhone('');
    setAddress('');
    setGpsLocation(null);
    setReferralSource('ترشيح من متطوع / باحث ميداني');
    setOtherReferralSource('');
    setPriorityLevel('high');
    setHousingStatus('إيجار غير مستقر / مهدد بالإخلاء');
    setCaseSummary('');
    setLandmarkAddress('');
    setRoofType('wood_straw');
    setWaterConnection('shared');
    setElectricityMeter('code_meter');
    setHasPrivateBathroom(true);
    setBasicAppliances(['غسالة', 'بوتاجاز']);
    setFamilyMembers([
      {
        id: 'mem-init-1',
        orderNumber: 1,
        name: '',
        relation: 'نفس الحالة (صاحب الملف الأساسي)',
        maritalStatus: 'متزوج',
        age: 46,
        educationLevel: 'ابتدائي',
        workCapacity: 'عاجز جزئياً أو مسن',
        currentJob: 'عمالة يومية غير منتظمة',
        isPrimaryCaregiver: true,
        chronicIllness: {
          diseaseId: 'cd-disc-joints',
          conditionName: 'انزلاق غضروفي وخشونة المفاصل',
          monthlyCost: 400,
          isCoveredByStateInsurance: false,
        },
      },
      {
        id: 'mem-init-2',
        orderNumber: 2,
        name: '',
        relation: 'الزوج / الزوجة',
        maritalStatus: 'متزوج',
        age: 41,
        educationLevel: 'أمية',
        workCapacity: 'ربة منزل',
        currentJob: 'ربة منزل',
        isPrimaryCaregiver: false,
      },
    ]);
    setBasicIncomeAmount(650);
    setBasicIncomeSources('معاش تكافل وكرامة');
    setAdditionalIncomeAmount(400);
    setAdditionalIncomeSources('يوميات غير منتظمة');
    setFamilyAssets('لا توجد أي أملاك مسجلة');
    setMonthlyBasicExpenses(2500);
    setMonthlyDebtsInstallments(600);
    setDebtsAndObligations('ديون بقالة ومتأخرات إيجار شهرين لصاحب العقار');
    setMedicalConditionDescription(
      'رب الأسرة يعاني من انزلاق غضروفي حاد وخشونة بالركبتين تعيقه عن العمل المنتظم'
    );
    setChronicVerification('مؤكد بتقارير وفحوصات طبية حديثة');
    setStateHealthInsurance('غير مشمول بأي تأمين صحي');
    setMonthlyMedicalCosts(450);
    setUploadedDocs([
      {
        id: 'doc-1',
        category: 'adultIds',
        title: 'بطاقات سارية لكامل البالغين (وش وضهر)',
        fileName: 'national-ids.jpg',
        fileSize: '1.8 MB',
        progress: 100,
        status: 'completed',
      },
      {
        id: 'doc-2',
        category: 'minorCerts',
        title: 'شهادات ميلاد أفراد الأسرة القصر',
        fileName: 'birth-certificates.pdf',
        fileSize: '950 KB',
        progress: 100,
        status: 'completed',
      },
    ]);
    setChecklist({
      nationalIdsAdults: true,
      birthCertificatesMinors: true,
      insurancePrintOut: true,
      utilityReceipt: true,
      leaseContractOrRentReceipt: false,
      recentMedicalProof: true,
      deathOrDivorceCertificates: false,
    });
    setRecommendedAssistanceType('كفالة شهرية');
    setRecommendedAmountOverride(null);
    setAdditionalNotesAndRemarks('');
    setAdminRevisionNote(null);
    setIsRevisionBannerExpanded(true);
    setExecutiveSummary(null);
    setHasDraftAvailable(false);
    setLastSavedTime(null);
    setFullAudioUrl(null);
    setFullAudioDuration(0);
    setIsPlayingAudio(false);
  }, []);

  // ----------------------------------------------------
  // Load target case data if modal was opened for an existing case (fresh session)
  // ----------------------------------------------------
  const loadTargetCase = useCallback((caseId: string) => {
    const target = casesRef.current.find((c) => c.id === caseId);
    if (!target) return;

    setCaseName(target.primaryName || target.fullName || '');
    setVisitorName(
      authUserRef.current.role === 'researcher'
        ? authUserRef.current.name
        : target.assignedResearcher || profileNameRef.current || 'أ. هبة الشامي'
    );
    setContactPhone(target.phone || '');
    setSecondaryPhone(target.secondaryPhone || '');

    const gov = target.governorate || 'القاهرة';
    const dist = target.district || 'بولاق الدكرور';
    setAddress(
      target.address && target.address.startsWith(gov)
        ? target.address
        : `${gov} - ${dist} - ${target.address || ''}`
    );
    setLandmarkAddress(target.directionsNote || '');

    if (
      typeof target.gpsLocation?.latitude === 'number' &&
      typeof target.gpsLocation?.longitude === 'number'
    ) {
      setGpsLocation({
        lat: target.gpsLocation.latitude,
        lng: target.gpsLocation.longitude,
      });
    }

    if (target.referralSource) {
      if (target.referralSource.startsWith('أخرى:')) {
        setReferralSource('أخرى (مصدر آخر)');
        setOtherReferralSource(target.referralSource.replace(/^أخرى:\s*/, ''));
      } else {
        setReferralSource(target.referralSource);
      }
    }

    setPriorityLevel(target.priority || 'high');

    if (target.vulnerability?.housingCondition) {
      const cond = target.vulnerability.housingCondition;
      if (cond === 'owned') {
        setHousingStatus('ملك للأسرة / ورثة');
      } else if (cond === 'rent_stable') {
        setHousingStatus('إيجار قديم أو شبه مستقر');
      } else if (cond === 'dilapidated_urgent') {
        setHousingStatus('مأوى غير لائق / آيل للسقوط');
      } else {
        setHousingStatus('إيجار غير مستقر / مهدد بالإخلاء');
      }
    }

    if (target.housingFacilities) {
      setRoofType(target.housingFacilities.roofType);
      setWaterConnection(target.housingFacilities.waterConnection);
      setElectricityMeter(target.housingFacilities.electricityMeter);
      setHasPrivateBathroom(target.housingFacilities.hasPrivateBathroom);
      setBasicAppliances(target.housingFacilities.basicAppliancesAvailable || []);
    }

    if (target.householdMembers && target.householdMembers.length > 0) {
      setFamilyMembers(
        target.householdMembers.map((m, idx) => ({
          id: m.id || `mem-${idx}`,
          orderNumber: idx + 1,
          name: m.name || '',
          relation: m.relation || 'الابن / الابنة',
          maritalStatus: m.maritalStatus || 'أعزب',
          age: m.age || 20,
          educationLevel: m.educationLevel || 'إعدادي',
          workCapacity: m.workCapacity || 'قادر على العمل',
          currentJob: m.workStatus || 'لا يعمل',
        }))
      );
    }

    if (target.financials) {
      setBasicIncomeAmount(target.financials.directIncome || 0);
      setAdditionalIncomeAmount(target.financials.indirectIncome || 0);
      setMonthlyBasicExpenses(target.financials.basicExpenses || 0);
      setMonthlyMedicalCosts(target.financials.medicalExpenses || 0);
    }

    if (target.vulnerability?.chronicIllnessDetails) {
      setMedicalConditionDescription(target.vulnerability.chronicIllnessDetails);
    }

    if (target.documentsChecklist) {
      setChecklist(target.documentsChecklist);
    } else if (target.attachments && target.attachments.length > 0) {
      const nonVoice = target.attachments.filter((a) => a.category !== 'voice_memo');
      setChecklist((prev) => ({
        ...prev,
        nationalIdsAdults: nonVoice.some((a) => a.category === 'national_id') || prev.nationalIdsAdults,
        birthCertificatesMinors: nonVoice.some((a) => a.category === 'family_records') || prev.birthCertificatesMinors,
        insurancePrintOut: nonVoice.some((a) => a.category === 'income_proof') || prev.insurancePrintOut,
        utilityReceipt: nonVoice.some((a) => a.category === 'utility_bill' || a.category === 'housing_contract') || prev.utilityReceipt,
        recentMedicalProof: nonVoice.some((a) => a.category === 'medical_report') || prev.recentMedicalProof,
      }));
    }

    if (target.attachments && target.attachments.length > 0) {
      const restoredDocs: AttachmentItem[] = target.attachments
        .filter((a) => a.category !== 'voice_memo')
        .map((a) => ({
          id: a.id,
          category:
            a.category === 'national_id'
              ? 'adultIds'
              : a.category === 'family_records'
              ? 'minorCerts'
              : a.category === 'medical_report'
              ? 'medicalProof'
              : 'customExtra',
          title: a.title,
          fileName: a.fileName,
          fileSize: a.fileSize || '1.2 MB',
          progress: 100,
          status: 'completed',
        }));
      if (restoredDocs.length > 0) {
        setUploadedDocs(restoredDocs);
      }
    }

    if (target.voiceNoteUrl) {
      setFullAudioUrl(target.voiceNoteUrl);
      if (target.voiceNoteDuration) {
        setFullAudioDuration(target.voiceNoteDuration);
      }
    }

    setCaseSummary(target.caseSummary || '');
    setRecommendedAssistanceType(target.recommendedAssistanceType || 'كفالة شهرية');
    setRecommendedAmountOverride(
      typeof target.recommendedMonthlyAmount === 'number'
        ? target.recommendedMonthlyAmount
        : null
    );
    setAdditionalNotesAndRemarks(
      target.researcherJustification ||
        (!target.recommendedAssistanceType && target.researcherRecommendation
          ? target.researcherRecommendation
          : '')
    );

    if (target.status === 'needs_revision') {
      const revisionText =
        target.adminRevisionNote?.trim() ||
        (target.notes ? target.notes.split('\n\n')[0].trim() : '');
      setAdminRevisionNote(revisionText || null);
      setIsRevisionBannerExpanded(true);
    } else {
      setAdminRevisionNote(null);
    }
  }, []);

  const applyDraftObject = useCallback((d: any) => {
    if (d.caseName !== undefined) setCaseName(d.caseName);
    if (d.visitorName !== undefined) setVisitorName(d.visitorName);
    if (d.visitDate !== undefined) setVisitDate(d.visitDate);
    if (d.contactPhone !== undefined) setContactPhone(d.contactPhone);
    if (d.secondaryPhone !== undefined) setSecondaryPhone(d.secondaryPhone);
    if (d.address !== undefined) setAddress(d.address);
    if (d.gpsLocation !== undefined) setGpsLocation(d.gpsLocation);
    if (d.referralSource !== undefined) setReferralSource(d.referralSource);
    if (d.otherReferralSource !== undefined) setOtherReferralSource(d.otherReferralSource);
    if (d.priorityLevel !== undefined) setPriorityLevel(d.priorityLevel);
    if (d.housingStatus !== undefined) setHousingStatus(d.housingStatus);
    if (d.caseSummary !== undefined) setCaseSummary(d.caseSummary);
    if (d.landmarkAddress !== undefined) setLandmarkAddress(d.landmarkAddress);
    if (d.roofType !== undefined) setRoofType(d.roofType);
    if (d.waterConnection !== undefined) setWaterConnection(d.waterConnection);
    if (d.electricityMeter !== undefined) setElectricityMeter(d.electricityMeter);
    if (d.hasPrivateBathroom !== undefined) setHasPrivateBathroom(d.hasPrivateBathroom);
    if (Array.isArray(d.basicAppliances)) setBasicAppliances(d.basicAppliances);
    if (d.checklist) setChecklist((prev) => ({ ...prev, ...d.checklist }));
    if (Array.isArray(d.familyMembers) && d.familyMembers.length > 0) setFamilyMembers(d.familyMembers);
    if (d.activeMemberIndex !== undefined) setActiveMemberIndex(d.activeMemberIndex);
    if (d.basicIncomeAmount !== undefined) setBasicIncomeAmount(d.basicIncomeAmount);
    if (d.basicIncomeSources !== undefined) setBasicIncomeSources(d.basicIncomeSources);
    if (d.additionalIncomeAmount !== undefined) setAdditionalIncomeAmount(d.additionalIncomeAmount);
    if (d.additionalIncomeSources !== undefined) setAdditionalIncomeSources(d.additionalIncomeSources);
    if (d.familyAssets !== undefined) setFamilyAssets(d.familyAssets);
    if (d.monthlyBasicExpenses !== undefined) setMonthlyBasicExpenses(d.monthlyBasicExpenses);
    if (d.monthlyDebtsInstallments !== undefined) setMonthlyDebtsInstallments(d.monthlyDebtsInstallments);
    if (d.debtsAndObligations !== undefined) setDebtsAndObligations(d.debtsAndObligations);
    if (d.medicalConditionDescription !== undefined) setMedicalConditionDescription(d.medicalConditionDescription);
    if (d.chronicVerification !== undefined) setChronicVerification(d.chronicVerification);
    if (d.stateHealthInsurance !== undefined) setStateHealthInsurance(d.stateHealthInsurance);
    if (d.monthlyMedicalCosts !== undefined) setMonthlyMedicalCosts(d.monthlyMedicalCosts);
    if (Array.isArray(d.uploadedDocs)) setUploadedDocs(d.uploadedDocs);
    if (d.recommendedAssistanceType !== undefined) setRecommendedAssistanceType(d.recommendedAssistanceType);
    if (d.recommendedAmountOverride !== undefined) setRecommendedAmountOverride(d.recommendedAmountOverride);
    if (d.additionalNotesAndRemarks !== undefined) setAdditionalNotesAndRemarks(d.additionalNotesAndRemarks);
    if (d.executiveSummary !== undefined) setExecutiveSummary(d.executiveSummary);
    if (typeof d.currentQuestion === 'number' && d.currentQuestion >= 1 && d.currentQuestion <= 24) {
      setCurrentQuestion(d.currentQuestion);
    }
    setLastSavedTime(
      d.savedAt
        ? new Date(d.savedAt).toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : null
    );
  }, []);

  // Build current draft snapshot (kept fresh via ref for flush on visibilitychange / pagehide / close)
  const buildDraftPayload = useCallback(
    () => ({
      savedAt: new Date().toISOString(),
      caseId: surveyTargetCaseId || 'general',
      currentQuestion,
      activeMemberIndex,
      caseName,
      visitorName,
      visitDate,
      contactPhone,
      secondaryPhone,
      address,
      gpsLocation,
      referralSource,
      otherReferralSource,
      priorityLevel,
      housingStatus,
      caseSummary,
      landmarkAddress,
      roofType,
      waterConnection,
      electricityMeter,
      hasPrivateBathroom,
      basicAppliances,
      checklist,
      familyMembers,
      basicIncomeAmount,
      basicIncomeSources,
      additionalIncomeAmount,
      additionalIncomeSources,
      familyAssets,
      monthlyBasicExpenses,
      monthlyDebtsInstallments,
      debtsAndObligations,
      medicalConditionDescription,
      chronicVerification,
      stateHealthInsurance,
      monthlyMedicalCosts,
      uploadedDocs,
      recommendedAssistanceType,
      recommendedAmountOverride,
      additionalNotesAndRemarks,
      executiveSummary,
    }),
    [
      surveyTargetCaseId,
      currentQuestion,
      activeMemberIndex,
      caseName,
      visitorName,
      visitDate,
      contactPhone,
      secondaryPhone,
      address,
      gpsLocation,
      referralSource,
      otherReferralSource,
      priorityLevel,
      housingStatus,
      caseSummary,
      landmarkAddress,
      roofType,
      waterConnection,
      electricityMeter,
      hasPrivateBathroom,
      basicAppliances,
      checklist,
      familyMembers,
      basicIncomeAmount,
      basicIncomeSources,
      additionalIncomeAmount,
      additionalIncomeSources,
      familyAssets,
      monthlyBasicExpenses,
      monthlyDebtsInstallments,
      debtsAndObligations,
      medicalConditionDescription,
      chronicVerification,
      stateHealthInsurance,
      monthlyMedicalCosts,
      uploadedDocs,
      recommendedAssistanceType,
      recommendedAmountOverride,
      additionalNotesAndRemarks,
      executiveSummary,
    ]
  );

  const saveDraftNow = useCallback(() => {
    if (!isFieldSurveyModalOpen || isSuccessSubmitted || !isDraftInitializedRef.current) return;
    try {
      const key = getDraftStorageKey(surveyTargetCaseId);
      localStorage.setItem(key, JSON.stringify(buildDraftPayload()));
      setLastSavedTime(
        new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [isFieldSurveyModalOpen, isSuccessSubmitted, surveyTargetCaseId, buildDraftPayload]);

  const saveDraftNowRef = useRef(saveDraftNow);
  useEffect(() => {
    saveDraftNowRef.current = saveDraftNow;
  }, [saveDraftNow]);

  // Initialize modal state ONLY when modal opens or surveyTargetCaseId changes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isFieldSurveyModalOpen) {
      isDraftInitializedRef.current = false;
      setIsSuccessSubmitted(false);
      setSubmittedSummary(null);
      setShowCloseConfirm(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      return;
    }

    isDraftInitializedRef.current = false;
    setShowCloseConfirm(false);

    const draftKey = getDraftStorageKey(surveyTargetCaseId);
    let restored = false;

    try {
      const savedDraft =
        localStorage.getItem(draftKey) ||
        (!surveyTargetCaseId ? localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY) : null);

      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && typeof parsed === 'object') {
          resetFormToDefaults();
          applyDraftObject(parsed);
          restored = true;
          const resumedStep = Number(parsed.currentQuestion) || 1;
          toast.info(`تم استرجاع مسودة البحث الميداني تلقائياً (الخطوة ${resumedStep} من ${totalQuestions})`);
        }
      }
    } catch {
      // ignore parse failures and fallback to fresh load
    }

    if (!restored) {
      resetFormToDefaults();
      if (surveyTargetCaseId) {
        loadTargetCase(surveyTargetCaseId);
      }
    } else if (surveyTargetCaseId) {
      const target = casesRef.current.find((c) => c.id === surveyTargetCaseId);
      if (target?.status === 'needs_revision') {
        const revisionText =
          target.adminRevisionNote?.trim() ||
          (target.notes ? target.notes.split('\n\n')[0].trim() : '');
        setAdminRevisionNote(revisionText || null);
        setIsRevisionBannerExpanded(true);
      } else {
        setAdminRevisionNote(null);
      }
    }

    // Mark initialized on next tick after React commits restored state
    const rafId = window.requestAnimationFrame(() => {
      isDraftInitializedRef.current = true;
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [isFieldSurveyModalOpen, surveyTargetCaseId, resetFormToDefaults, applyDraftObject, loadTargetCase, toast, totalQuestions]);

  // Keep handleRestoreDraft / handleDiscardDraft compatible if triggered
  const handleRestoreDraft = () => {
    try {
      const saved =
        localStorage.getItem(getDraftStorageKey(surveyTargetCaseId)) ||
        (!surveyTargetCaseId ? localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY) : null);
      if (!saved) return;
      const d = JSON.parse(saved);
      applyDraftObject(d);
      setHasDraftAvailable(false);
      showToast('تم استرجاع مسودة بحث الحالة بنجاح');
    } catch {
      setHasDraftAvailable(false);
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(getDraftStorageKey(surveyTargetCaseId));
    if (!surveyTargetCaseId) {
      localStorage.removeItem(LEGACY_DRAFT_STORAGE_KEY);
    }
    setHasDraftAvailable(false);
  };

  // Immediate Auto-Save Draft on every field or step change (Zero Data Loss)
  useEffect(() => {
    if (!isFieldSurveyModalOpen || isSuccessSubmitted || !isDraftInitializedRef.current) return;
    saveDraftNow();
  }, [isFieldSurveyModalOpen, isSuccessSubmitted, saveDraftNow]);

  // Flush draft immediately on tab switch / pagehide / blur WITHOUT EVER closing the modal
  useEffect(() => {
    if (!isFieldSurveyModalOpen || isSuccessSubmitted) return;

    const handleVisibilityOrHide = () => {
      if (document.visibilityState === 'hidden') {
        saveDraftNowRef.current();
      }
    };
    const handlePageHideOrBlur = () => {
      saveDraftNowRef.current();
    };
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        saveDraftNowRef.current();
        setShowCloseConfirm((prev) => !prev);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrHide);
    window.addEventListener('pagehide', handlePageHideOrBlur);
    window.addEventListener('blur', handlePageHideOrBlur);
    window.addEventListener('keydown', handleEscapeKey, true);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrHide);
      window.removeEventListener('pagehide', handlePageHideOrBlur);
      window.removeEventListener('blur', handlePageHideOrBlur);
      window.removeEventListener('keydown', handleEscapeKey, true);
    };
  }, [isFieldSurveyModalOpen, isSuccessSubmitted]);

  const handleRequestClose = () => {
    if (isSuccessSubmitted) {
      setIsFieldSurveyModalOpen(false);
      return;
    }
    saveDraftNow();
    setShowCloseConfirm(true);
  };

  const handleConfirmSaveAndClose = () => {
    saveDraftNow();
    setShowCloseConfirm(false);
    toast.info(`تم حفظ مسودة البحث في الخطوة ${currentQuestion} بنجاح`);
    setIsFieldSurveyModalOpen(false);
  };

  const handleDiscardDraftAndClose = () => {
    localStorage.removeItem(getDraftStorageKey(surveyTargetCaseId));
    if (!surveyTargetCaseId) {
      localStorage.removeItem(LEGACY_DRAFT_STORAGE_KEY);
    }
    setShowCloseConfirm(false);
    isDraftInitializedRef.current = false;
    setIsFieldSurveyModalOpen(false);
  };

  // Family Member handlers
  const currentMember = familyMembers[activeMemberIndex] || familyMembers[0];

  const updateCurrentMember = (field: keyof CaseStudyFamilyMember, value: any) => {
    setFamilyMembers((prev) =>
      prev.map((m, idx) => (idx === activeMemberIndex ? { ...m, [field]: value } : m))
    );
  };

  const handleAddNewMember = () => {
    const newIdx = familyMembers.length;
    const newMember: CaseStudyFamilyMember = {
      id: `mem-${Date.now()}-${newIdx + 1}`,
      orderNumber: newIdx + 1,
      name: '',
      relation: 'الابن / الابنة',
      maritalStatus: 'أعزب',
      age: 14,
      educationLevel: 'إعدادي',
      workCapacity: 'طفل / قاصر',
      currentJob: 'طالب',
      isPrimaryCaregiver: false,
    };
    setFamilyMembers((prev) => [...prev, newMember]);
    setActiveMemberIndex(newIdx);
    showToast(`تم فتح بطاقة الفرد (${newIdx + 1})، يرجى إدخال بياناته`);
  };

  const handleRemoveMember = (idx: number) => {
    if (familyMembers.length <= 1) {
      showToast('يجب تسجيل فرد واحد على الأقل في الأسرة (رب الأسرة).');
      return;
    }
    setFamilyMembers((prev) => prev.filter((_, i) => i !== idx));
    setActiveMemberIndex((prev) => Math.max(0, prev - 1));
  };

  // Validation per question
  const isQuestionAnswered = (qIndex: number): boolean => {
    switch (qIndex) {
      case 1:
        return caseName.trim().length > 0;
      case 2:
        return isResearcherPOV ? authUser.name.trim().length > 0 : visitorName.trim().length > 0;
      case 3:
        return contactPhone.trim().length > 0;
      case 4:
        return true; // Secondary phone optional
      case 5:
        return address.trim().length > 0;
      case 6:
        if (referralSource === 'أخرى (مصدر آخر)') {
          return otherReferralSource.trim().length > 0;
        }
        return referralSource.trim().length > 0;
      case 7:
        return priorityLevel.trim().length > 0;
      case 8:
        return housingStatus.trim().length > 0;
      case 9:
        return caseSummary.trim().length > 0;
      case 10:
        return true; // Landmark optional
      case 11:
        // Family Member sub-flow: check current member
        return currentMember?.name?.trim().length > 0 || caseName.trim().length > 0;
      case 12:
        return basicIncomeAmount >= 0;
      case 13:
        return additionalIncomeAmount >= 0;
      case 14:
        return familyAssets.trim().length > 0;
      case 15:
        return monthlyBasicExpenses > 0;
      case 16:
        return debtsAndObligations.trim().length > 0 || monthlyDebtsInstallments >= 0;
      case 17:
        return true; // Gap review
      case 18:
        return medicalConditionDescription.trim().length > 0;
      case 19:
        return chronicVerification.trim().length > 0;
      case 20:
        return stateHealthInsurance.trim().length > 0;
      case 21:
        return monthlyMedicalCosts >= 0;
      case 22:
        return uploadedDocs.length > 0; // Attachments
      case 23:
        return recommendedAssistanceType.trim().length > 0 && effectiveRecommendedAmount >= 0;
      case 24:
        return true; // Final review slide
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!isQuestionAnswered(currentQuestion)) {
      showToast('يرجى إدخال البيانات أو كتابة ملاحظة للمتابعة');
      return;
    }
    if (currentQuestion < totalQuestions) {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 1) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    if (!isQuestionAnswered(currentQuestion)) {
      showToast('يرجى إدخال البيانات أو استخدام المايك للمتابعة');
      return;
    }
    if (currentQuestion < totalQuestions) {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  // 3 & 5. Camera capture and Flexible Attachments Handlers
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    category: AttachmentItem['category'],
    defaultTitle: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newDocId = `doc-${Date.now()}`;
    const newDoc: AttachmentItem = {
      id: newDocId,
      category,
      title: customDocTitle.trim() || defaultTitle,
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      progress: 0,
      status: 'uploading',
      customDescription: customDocTitle.trim() || undefined,
    };

    setUploadedDocs((prev) => [newDoc, ...prev]);
    setIsAddingCustomDoc(false);
    setCustomDocTitle('');
    e.target.value = '';

    setTimeout(() => {
      setUploadedDocs((prev) =>
        prev.map((d) => (d.id === newDocId ? { ...d, progress: 50 } : d))
      );
    }, 350);

    setTimeout(() => {
      setUploadedDocs((prev) =>
        prev.map((d) =>
          d.id === newDocId ? { ...d, progress: 100, status: 'completed' } : d
        )
      );
      showToast(`تم رفع المستند (${newDoc.title}) بنجاح`);
    }, 750);
  };

  const handleSimulateDirectUpload = (category: AttachmentItem['category'], title: string) => {
    const newDocId = `doc-${Date.now()}`;
    const newDoc: AttachmentItem = {
      id: newDocId,
      category,
      title: customDocTitle.trim() || title,
      fileName: `capture-${Date.now().toString().slice(-4)}.jpg`,
      fileSize: '1.2 MB',
      progress: 0,
      status: 'uploading',
      customDescription: customDocTitle.trim() || undefined,
    };

    setUploadedDocs((prev) => [newDoc, ...prev]);
    setIsAddingCustomDoc(false);
    setCustomDocTitle('');

    setTimeout(() => {
      setUploadedDocs((prev) =>
        prev.map((d) => (d.id === newDocId ? { ...d, progress: 50 } : d))
      );
    }, 350);

    setTimeout(() => {
      setUploadedDocs((prev) =>
        prev.map((d) =>
          d.id === newDocId ? { ...d, progress: 100, status: 'completed' } : d
        )
      );
      showToast(`تم حفظ وتوثيق المرفق (${newDoc.title}) بنجاح`);
    }, 750);
  };

  const handleRemoveDoc = (id: string) => {
    setUploadedDocs((prev) => prev.filter((d) => d.id !== id));
  };

  // Final Submit
  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!caseName.trim()) {
      setCurrentQuestion(1);
      showToast('يرجى إدخال اسم الحالة لإتمام بحث الحالة');
      return;
    }

    const finalReferralSource =
      referralSource === 'أخرى (مصدر آخر)'
        ? `أخرى: ${otherReferralSource.trim()}`
        : referralSource;

    const effectiveVisitorName = isResearcherPOV
      ? authUser.name
      : visitorName || 'أ. هبة الشامي';

    const reportPayload: CaseStudyReport = {
      id: `csr-${Date.now()}`,
      caseId: surveyTargetCaseId || undefined,
      caseName: caseName.trim(),
      visitorName: effectiveVisitorName,
      visitDate,
      contactPhone: contactPhone.trim(),
      secondaryPhone: secondaryPhone.trim() || undefined,
      address: address.trim(),
      referralSource: finalReferralSource,
      priorityLevel,
      housingStatus,
      caseSummary: caseSummary.trim(),
      landmarkAddress: landmarkAddress.trim() || undefined,
      gpsLocation: gpsLocation
        ? {
            latitude: gpsLocation.lat,
            longitude: gpsLocation.lng,
            mapsUrl: `https://www.google.com/maps?q=${gpsLocation.lat},${gpsLocation.lng}`,
          }
        : undefined,
      housingFacilities: {
        roofType,
        waterConnection,
        electricityMeter,
        hasPrivateBathroom,
        basicAppliancesAvailable: basicAppliances,
      },
      familyMembers,
      basicIncomeSources,
      basicIncomeAmount: Number(basicIncomeAmount) || 0,
      additionalIncomeSources: additionalIncomeSources || 'يوميات غير منتظمة',
      additionalIncomeAmount: Number(additionalIncomeAmount) || 0,
      familyAssets,
      monthlyBasicExpenses: Number(monthlyBasicExpenses) || 0,
      monthlyDebtsInstallments: Number(monthlyDebtsInstallments) || 0,
      debtsAndObligations,
      netFinancialGap,
      financialGapDocumentation: `إجمالي العجز الشهري المقدر: ${netFinancialGap} ج.م`,
      medicalConditionDescription,
      chronicVerification,
      monthlyMedicalCosts: Number(monthlyMedicalCosts) || 0,
      stateHealthInsuranceDetails: stateHealthInsurance,
      attachments: {
        nationalIdsAdults: checklist.nationalIdsAdults,
        birthCertificatesMinors: checklist.birthCertificatesMinors,
        deathOrDivorceCertificates: checklist.deathOrDivorceCertificates,
        recentMedicalProof: checklist.recentMedicalProof,
        insurancePrintOut: checklist.insurancePrintOut,
        utilityReceipt: checklist.utilityReceipt,
        leaseContractOrRentReceipt: checklist.leaseContractOrRentReceipt,
        uploadedFiles: uploadedDocs.map((d) => ({
          id: d.id,
          title: d.customDescription ? `${d.title} - ${d.customDescription}` : d.title,
          category: d.category,
          fileName: d.fileName,
          progress: d.progress,
          status: d.status,
          url: (d.category as string) === 'voiceRecording' ? fullAudioUrl || undefined : undefined,
          durationSeconds:
            (d.category as string) === 'voiceRecording' ? fullAudioDuration || 15 : undefined,
        })),
      },
      recommendedAssistanceType: recommendedAssistanceType.trim(),
      recommendedMonthlyAmount: Number(effectiveRecommendedAmount) || 0,
      additionalNotesAndRemarks: additionalNotesAndRemarks.trim(),
      voiceNoteUrl: fullAudioUrl || undefined,
      voiceNoteDuration: fullAudioDuration || undefined,
      executiveSummary: executiveSummary || undefined,
      status: 'pending_review',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    submitCaseStudyReport(reportPayload);
    localStorage.removeItem(getDraftStorageKey(surveyTargetCaseId));
    if (!surveyTargetCaseId) {
      localStorage.removeItem(LEGACY_DRAFT_STORAGE_KEY);
    }
    toast.success('تم إرسال تقرير البحث الميداني للمراجعة والاعتماد بنجاح');

    setSubmittedSummary({
      caseName: caseName.trim(),
      gap: netFinancialGap,
      researcher: effectiveVisitorName,
      membersCount: familyMembers.length,
    });
    setIsSuccessSubmitted(true);
  };

  if (!isFieldSurveyModalOpen) return null;

  const completionPercentage = Math.round((currentQuestion / totalQuestions) * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-0 sm:p-4 select-none"
      dir="rtl"
      onClick={(e) => {
        // Disable auto-dismiss on backdrop click (Zero Data Loss)
        e.stopPropagation();
      }}
    >
      {/* Hidden File / Camera Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileUpload(e, 'customExtra', 'صورة مستند من الكاميرا')}
      />
      <input
        ref={extraFileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => handleFileUpload(e, 'customExtra', 'مستند إضافي مرفوع')}
      />

      {/* STRICT ZERO-SCROLL MOBILE CONTAINER */}
      <div
        className="relative w-full max-w-md h-[100dvh] sm:h-[90vh] sm:max-h-[820px] bg-white sm:rounded-2xl shadow-xl overflow-hidden flex flex-col justify-between border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* ==================================================== */}
        {/* 1. HEADER (Fixed height, shrink-0)                    */}
        {/* ==================================================== */}
        <div className="bg-white shrink-0 border-b border-slate-200">
          {/* Clean Soft-Gray Modal Header */}
          <div className="bg-slate-50 text-slate-800 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 leading-tight">
                تقرير بحث حالة
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-[#005756]" />
                <span>متصل · حفظ تلقائي</span>
                {lastSavedTime && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="text-[#005756] font-medium">حُفظ {lastSavedTime}</span>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleRequestClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              title="إغلاق"
              aria-label="إغلاق"
            >
              <X size={20} />
            </button>
          </div>

          {/* Draft Restored Bar */}
          {hasDraftAvailable && (
            <div className="px-5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700">
              <span className="text-[11px] font-semibold">
                توجد مسودة سابقة {lastSavedTime ? `(${lastSavedTime})` : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRestoreDraft}
                  className="px-2.5 py-1 bg-[#005756] hover:bg-[#004342] text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                >
                  استرجاع
                </button>
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="text-slate-500 hover:text-slate-800 text-[10px] font-medium cursor-pointer"
                >
                  تجاهل
                </button>
              </div>
            </div>
          )}

          {/* Read-only Admin Revision Notice Banner */}
          {!isSuccessSubmitted && adminRevisionNote && (
            <div className="px-5 py-2.5 bg-amber-50/70 border-b border-amber-200/80 text-right">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <AlertTriangle size={14} className="text-amber-700 shrink-0" />
                  <span className="text-xs font-bold text-amber-950 truncate">
                    مطلوب استكمال من الإدارة
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRevisionBannerExpanded((prev) => !prev)}
                  className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-0.5 shrink-0 cursor-pointer"
                >
                  <span>{isRevisionBannerExpanded ? 'إخفاء' : 'عرض التفاصيل'}</span>
                  {isRevisionBannerExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>
              {isRevisionBannerExpanded && (
                <p className="mt-1.5 text-[11px] text-amber-900/90 leading-relaxed whitespace-pre-line max-h-20 overflow-y-auto pr-0.5">
                  {adminRevisionNote}
                </p>
              )}
            </div>
          )}

          {/* Clean Progress Bar */}
          <div className="px-5 pt-3 pb-2.5 bg-white">
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
              <div
                className="bg-[#005756] h-full rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mt-2">
              <span className="text-slate-700">
                سؤال {currentQuestion} من {totalQuestions}
              </span>
              <span className="text-[#005756] font-mono bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                {completionPercentage}%
              </span>
            </div>
          </div>

          {/* Hidden Audio Player for Previewing Voice Recording */}
          <audio
            ref={audioPlayerRef}
            src={fullAudioUrl || undefined}
            onEnded={() => setIsPlayingAudio(false)}
            className="hidden"
          />

          {/* ==================================================== */}
          {/* FIELD VOICE MEMO RECORDING BAR (v1 Scope)            */}
          {/* ==================================================== */}
          {!isSuccessSubmitted && (
            <div className="border-t border-slate-200 bg-slate-50 text-slate-800">
              {/* State 1: Idle (Not recording, no audio yet) */}
              {!isFullAudioRecording && !fullAudioUrl && (
                <div className="px-5 py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                      <Mic size={16} />
                    </div>
                    <div className="leading-tight min-w-0">
                      <span className="font-bold text-xs text-slate-800 block truncate">
                        ملاحظات الزيارة الصوتية
                      </span>
                      <span className="text-[10px] text-slate-500 truncate block">
                        سجّل ملخص سريع يساعد في تقييم الحالة
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={startFullAudioRecording}
                    className="px-3 py-1.5 bg-[#005756] hover:bg-[#004342] active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Mic size={14} />
                    <span>ابدأ التسجيل</span>
                  </button>
                </div>
              )}

              {/* State 2: Actively Recording */}
              {isFullAudioRecording && (
                <div className="px-5 py-2.5 bg-rose-50 flex items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                      <Mic size={16} />
                    </div>
                    <div className="leading-tight">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                        <span className="font-bold text-xs text-rose-900">جاري التسجيل...</span>
                        <span className="font-mono text-xs font-bold text-rose-700 bg-white px-1.5 py-0.5 rounded border border-rose-200">
                          {formatDuration(fullAudioDuration)}
                        </span>
                      </div>
                      <span className="text-[10px] text-rose-700 block">
                        سجّل بصوتك أي ملاحظات إضافية عن وضع الأسرة
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={stopFullAudioRecording}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Square size={12} className="fill-white" />
                    <span>إيقاف وحفظ</span>
                  </button>
                </div>
              )}

              {/* State 3: Recorded Audio Saved & Ready for Review */}
              {!isFullAudioRecording && fullAudioUrl && (
                <div className="px-5 py-2.5 bg-slate-50 flex items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-2 truncate">
                    <button
                      type="button"
                      onClick={togglePlayRecordedAudio}
                      className="px-2.5 py-1.5 rounded-xl bg-[#005756] hover:bg-[#004342] text-white flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors text-xs font-bold"
                      title={isPlayingAudio ? 'إيقاف مؤقت' : 'استمع للتسجيل'}
                    >
                      {isPlayingAudio ? <Pause size={13} /> : <Play size={13} className="mr-0.5" />}
                      <span>{isPlayingAudio ? 'إيقاف مؤقت' : 'تشغيل التسجيل'}</span>
                    </button>
                    <div className="leading-tight truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-800">
                          تم حفظ التسجيل
                        </span>
                        <span className="text-[10px] font-mono text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                          {formatDuration(fullAudioDuration || 12)}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono truncate block">
                        تسجيل_صوتي_للباحث.webm
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {ENABLE_AI_EXTRACTION_V2 && (
                      <button
                        type="button"
                        onClick={handleAIVoiceExtraction}
                        disabled={isExtractingWithAI}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-[#005756] hover:bg-[#004342] text-white"
                      >
                        <Sparkles size={13} />
                        <span>تفريغ وتعبئة الاستمارة آلياً</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={startFullAudioRecording}
                      className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                      title="إعادة التسجيل"
                    >
                      <RotateCcw size={12} />
                      <span className="hidden sm:inline">إعادة تسجيل</span>
                    </button>

                    <button
                      type="button"
                      onClick={deleteFullAudioRecording}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                      title="حذف التسجيل"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ==================================================== */}
        {/* 2. CENTER BODY (Single Question Flow)                 */}
        {/* ==================================================== */}
        <div className="flex-1 min-h-0 flex flex-col px-4 sm:px-6 py-3 overflow-y-auto overscroll-contain">
          {isSuccessSubmitted ? (
            /* Success Screen */
            <div className="text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={36} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900">
                  تم اعتماد استمارة «بحث حالة» بنجاح!
                </h3>

                {/* Calm UI Gratitude & Dua Card for Field Researcher */}
                <div className="px-4 py-3 bg-teal-50/60 border border-teal-200/70 rounded-2xl text-center">
                  <p className="text-xs sm:text-sm font-semibold text-teal-900 leading-relaxed flex items-center justify-center gap-2">
                    <HeartHandshake size={16} className="text-[#005756] shrink-0" />
                    <span>
                      جزاك الله خيراً{' '}
                      <span className="font-bold text-[#005756]">
                        {submittedSummary?.researcher || visitorName || 'أ. هبة الشامي'}
                      </span>{' '}
                      على جهدك الميداني المبارك، كُتب سعيك في ميزان حسناتك.
                    </span>
                  </p>
                </div>

                <p className="text-xs text-slate-600">
                  أُحيلت الحالة إلى وضع «قيد المراجعة» للاعتماد المالي والإداري
                </p>
              </div>

              {submittedSummary && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-right space-y-2 shadow-2xs">
                  <div className="flex justify-between items-center text-xs border-b border-slate-200/60 pb-2">
                    <span className="text-slate-500">اسم الحالة:</span>
                    <span className="font-bold text-slate-800">{submittedSummary.caseName}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-b border-slate-200/60 pb-2">
                    <span className="text-slate-500">أفراد الأسرة:</span>
                    <span className="font-bold text-slate-800">{submittedSummary.membersCount} أفراد</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-b border-slate-200/60 pb-2">
                    <span className="text-slate-500">الباحث المسؤول:</span>
                    <span className="font-semibold text-slate-700">{submittedSummary.researcher}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">صافي الفجوة الشهرية:</span>
                    <span className="font-black text-teal-800 text-sm">
                      {submittedSummary.gap.toLocaleString('ar-EG')} ج.م
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsFieldSurveyModalOpen(false);
                  setActiveSection(isResearcherPOV ? 'research' : 'cases');
                }}
                className="w-full py-3.5 bg-[#005756] hover:bg-[#004241] text-white rounded-2xl font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                {isResearcherPOV ? 'العودة إلى حالاتي وزياراتي' : 'الانتقال لجدول الحالات والمراجعة'}
              </button>
            </div>
          ) : (
            <div
              className={`space-y-3.5 animate-in fade-in duration-200 ${
                currentQuestion === 22
                  ? 'flex-1 flex flex-col min-h-0'
                  : currentQuestion >= 23
                  ? 'w-full pb-6'
                  : 'my-auto'
              }`}
            >
              
              {/* Q1: Case Name */}
              {currentQuestion === 1 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                      <User size={15} />
                      <span>البيانات التعريفية</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      ما هو اسم الحالة (رب الأسرة)؟
                    </h2>
                    <p className="text-xs text-slate-500">
                      الاسم الرباعي الرسمي للمستفيد الأساسي كما هو بالبطاقة.
                    </p>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      value={caseName}
                      onChange={(e) => setCaseName(e.target.value)}
                      placeholder="مثال: يحيى سعيد محمود حسن"
                      className="w-full p-4 pl-12 text-sm sm:text-base font-bold bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-slate-900 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => toggleVoiceDictation('caseName', setCaseName)}
                      className={`absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all cursor-pointer ${
                        isListening && activeVoiceField === 'caseName'
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-slate-200/80 hover:bg-teal-100 text-slate-700'
                      }`}
                      title="تحدث بالصوت"
                    >
                      {isListening && activeVoiceField === 'caseName' ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Q2: Researcher */}
              {currentQuestion === 2 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-[#005756] flex items-center gap-1.5">
                      <ShieldCheck size={15} />
                      <span>التكليف الميداني</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      {isResearcherPOV ? 'تأكيد اسم الباحث الميداني' : 'من هو الباحث الميداني المسؤول؟'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {isResearcherPOV
                        ? 'الاستمارة بتتسجل تلقائياً باسم حسابك الميداني النشط عشان تترفع للمراجعة باسمك.'
                        : 'اختر الباحث المكلف بالنزول أو أضف باحثاً جديداً.'}
                    </p>
                  </div>

                  {isResearcherPOV ? (
                    <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-500">
                          الباحث الميداني المسؤول
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          تلقائي من الحساب
                        </span>
                      </div>
                      <p className="text-base font-bold text-slate-900">{authUser.name}</p>
                      {authUser.assignedDistricts && authUser.assignedDistricts.length > 0 && (
                        <p className="text-xs text-slate-500">
                          نطاق التغطية: {authUser.assignedDistricts.join(' · ')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-2 bg-slate-50 rounded-2xl border border-slate-200">
                      <ResearcherSelect
                        value={visitorName}
                        onChange={(val) => setVisitorName(val)}
                        label="الباحث الميداني المسؤول"
                        required
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Q3: Primary Phone */}
              {currentQuestion === 3 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                      <Phone size={15} />
                      <span>أرقام التواصل</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      ما هو رقم هاتف التواصل الأساسي؟
                    </h2>
                    <p className="text-xs text-slate-500">
                      رقم محمول نشط للتواصل الميداني.
                    </p>
                  </div>

                  <input
                    type="tel"
                    autoFocus
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    dir="ltr"
                    className="w-full p-4 text-center text-lg sm:text-xl font-mono font-bold bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-slate-900 shadow-xs tracking-wider"
                  />
                </div>
              )}

              {/* Q4: Secondary Phone */}
              {currentQuestion === 4 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                      <Phone size={15} />
                      <span>هاتف بديل (اختياري)</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      هل يوجد رقم هاتف بديل؟
                    </h2>
                    <p className="text-xs text-slate-500">
                      يمكنك تركه فارغاً والضغط على [التالي].
                    </p>
                  </div>

                  <input
                    type="tel"
                    autoFocus
                    value={secondaryPhone}
                    onChange={(e) => setSecondaryPhone(e.target.value)}
                    placeholder="01xxxxxxxxx (اختياري)"
                    dir="ltr"
                    className="w-full p-4 text-center text-base sm:text-lg font-mono font-medium bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-slate-900 shadow-xs tracking-wider"
                  />
                </div>
              )}

              {/* Q5: Address & Geolocation */}
              {currentQuestion === 5 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                      <Building size={15} />
                      <span>محل الإقامة والموقع</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      ما هو العنوان ومحل الإقامة التفصيلي؟
                    </h2>
                    <p className="text-xs text-slate-500">
                      المحافظة - الحي - الشارع - رقم العقار أو وصف دقيق.
                    </p>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="مثال: الجيزة - بولاق الدكرور - شارع جمال عبد الناصر..."
                      className="w-full p-3.5 pl-12 text-xs sm:text-sm font-semibold bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-slate-900 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => toggleVoiceDictation('address', setAddress)}
                      className={`absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all cursor-pointer ${
                        isListening && activeVoiceField === 'address'
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-slate-200/80 hover:bg-teal-100 text-slate-700'
                      }`}
                      title="تحدث بالصوت"
                    >
                      {isListening && activeVoiceField === 'address' ? <MicOff size={15} /> : <Mic size={15} />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCaptureGps}
                    disabled={isCapturingGps}
                    className="w-full py-2.5 px-3 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-xl text-teal-900 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <MapPin size={15} className="text-teal-700 shrink-0" />
                    <span>
                      {gpsLocation
                        ? `تم تثبيت الإحداثيات (${gpsLocation.lat}, ${gpsLocation.lng})`
                        : isCapturingGps
                        ? 'جاري تحديد موقع البيت (GPS)...'
                        : 'تحديد موقع البيت (GPS)'}
                    </span>
                  </button>
                </div>
              )}

              {/* Q6: Referral Source */}
              {currentQuestion === 6 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                      <Sparkles size={15} />
                      <span>قناة الوصول</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      كيف وصلت الحالة إلى الجمعية؟
                    </h2>
                  </div>

                  <div className="space-y-2">
                    {[
                      'ترشيح من متطوع / باحث ميداني',
                      'التقدم بمقر الجمعية',
                      'مسح وبحث ميداني دوري',
                      'إحالة من جهة أو مؤسسة شريكة',
                      'أخرى (مصدر آخر)',
                    ].map((src) => {
                      const isSelected = referralSource === src;
                      return (
                        <button
                          key={src}
                          type="button"
                          onClick={() => {
                            setReferralSource(src);
                            if (src !== 'أخرى (مصدر آخر)') {
                              setTimeout(handleNext, 150);
                            }
                          }}
                          className={`w-full p-3.5 rounded-2xl border-2 text-right text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-teal-50 border-teal-700 text-teal-950 ring-1 ring-teal-700 shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span>{src}</span>
                          <span
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? 'border-[#005756] bg-[#005756] text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} className="text-white" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {referralSource === 'أخرى (مصدر آخر)' && (
                    <div className="pt-1 space-y-1.5 animate-in fade-in duration-150">
                      <label className="text-xs font-bold text-slate-700 block">
                        توضيح مصدر الوصول <span className="text-rose-600">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          autoFocus
                          value={otherReferralSource}
                          onChange={(e) => setOtherReferralSource(e.target.value)}
                          placeholder="اكتب مصدر وصول الحالة (مثال: ترشيح إمام مسجد / جيران / مستشفى)..."
                          className="w-full h-11 px-3.5 pl-12 text-xs sm:text-sm font-semibold bg-white border-2 border-[#005756] rounded-xl focus:outline-hidden text-slate-900 shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={() => toggleVoiceDictation('otherReferral', setOtherReferralSource)}
                          className={`absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all cursor-pointer ${
                            isListening && activeVoiceField === 'otherReferral'
                              ? 'bg-rose-600 text-white animate-pulse'
                              : 'bg-slate-100 hover:bg-teal-100 text-slate-700'
                          }`}
                          title="إملاء مصدر الوصول صوتياً"
                        >
                          {isListening && activeVoiceField === 'otherReferral' ? <MicOff size={15} /> : <Mic size={15} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Q7: Priority Level */}
              {currentQuestion === 7 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                      <Activity size={15} />
                      <span>تقييم الأولوية</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      ما هو تصنيف أولوية الحالة من واقع المعاينة؟
                    </h2>
                  </div>

                  <div className="space-y-2">
                    {[
                      {
                        level: 'critical' as PriorityLevel,
                        label: 'أولوية حرجة (تدخل عاجل)',
                        badge: 'bg-rose-50 text-rose-900 border-rose-500 ring-1 ring-rose-500',
                        activeDot: 'border-rose-700 bg-rose-700',
                      },
                      {
                        level: 'high' as PriorityLevel,
                        label: 'أولوية عالية (استحقاق مؤكد)',
                        badge: 'bg-amber-50 text-amber-900 border-amber-500 ring-1 ring-amber-500',
                        activeDot: 'border-amber-700 bg-amber-700',
                      },
                      {
                        level: 'medium' as PriorityLevel,
                        label: 'أولوية متوسطة (دعم جزئي)',
                        badge: 'bg-teal-50 text-teal-950 border-[#005756] ring-1 ring-[#005756]',
                        activeDot: 'border-[#005756] bg-[#005756]',
                      },
                      {
                        level: 'low' as PriorityLevel,
                        label: 'أولوية منخفضة / معونة موسمية',
                        badge: 'bg-slate-100 text-slate-900 border-slate-500 ring-1 ring-slate-500',
                        activeDot: 'border-slate-700 bg-slate-700',
                      },
                    ].map((item) => {
                      const isSelected = priorityLevel === item.level;
                      return (
                        <button
                          key={item.level}
                          type="button"
                          onClick={() => {
                            setPriorityLevel(item.level);
                            setTimeout(handleNext, 150);
                          }}
                          className={`w-full p-3.5 rounded-2xl border-2 text-right transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? `${item.badge} shadow-xs`
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-xs sm:text-sm font-black">{item.label}</span>
                          <span
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected ? item.activeDot : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} className="text-white" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Q8: Housing Status */}
              {currentQuestion === 8 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                      <Home size={15} />
                      <span>تقييم السكن</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      ما هي الحالة السكنية للأسرة؟
                    </h2>
                  </div>

                  <div className="space-y-2">
                    {[
                      { title: 'إيجار غير مستقر / مهدد بالإخلاء', desc: 'تراكم إيجارات وإنذار بالطرد' },
                      { title: 'إيجار قديم أو شبه مستقر', desc: 'إيجار ثابت بقيمة منخفضة' },
                      { title: 'ملك للأسرة / ورثة', desc: 'سكن ملك ولكن بحاجة لترميم ومرافق' },
                      { title: 'غرفة مشتركة / سكن مؤقت', desc: 'منافع مشتركة مع أسر أخرى' },
                      { title: 'مأوى غير لائق / آيل للسقوط', desc: 'سقف خشب، رشح مياه، بيئة خطرة' },
                    ].map((item) => (
                      <button
                        key={item.title}
                        type="button"
                        onClick={() => {
                          setHousingStatus(item.title);
                          setTimeout(handleNext, 150);
                        }}
                        className={`w-full p-2.5 sm:p-3 rounded-2xl border-2 text-right transition-all cursor-pointer flex items-center justify-between ${
                          housingStatus === item.title
                            ? 'bg-teal-50 border-teal-700 ring-1 ring-teal-700 text-teal-950 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="block text-xs sm:text-sm font-black">{item.title}</span>
                          <span className="block text-[11px] text-slate-500">{item.desc}</span>
                        </div>
                        <span
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            housingStatus === item.title ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300'
                          }`}
                        >
                          {housingStatus === item.title && <Check size={12} />}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Q9: Housing Facilities & Description */}
              {currentQuestion === 9 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                      <Home size={15} />
                      <span>المعاينة الميدانية ومرافق السكن</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      مرافق السكن وتوصيف البيئة المعيشية
                    </h2>
                    <p className="text-xs text-slate-500">
                      حدد حالة المرافق والأجهزة الأساسية واكتب وصف المسكن.
                    </p>
                  </div>

                  {/* Housing Facilities Quick Chips */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                    {/* Roof Type */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">حالة السقف</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'concrete' as const, label: 'خرساني مسلّح' },
                          { id: 'wood_straw' as const, label: 'خشب وقش / صاج' },
                          { id: 'damaged' as const, label: 'متصدع / متهدم' },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setRoofType(opt.id)}
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                              roofType === opt.id
                                ? 'bg-teal-700 border-teal-700 text-white shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Water & Electricity */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">مياه الشرب</label>
                        <CustomSelect
                          size="sm"
                          value={waterConnection}
                          onChange={(val) => setWaterConnection(val as typeof waterConnection)}
                          options={[
                            { value: 'independent', label: 'عداد مياه مستقل' },
                            { value: 'shared', label: 'وصلة مياه مشتركة' },
                            { value: 'none', label: 'بدون مياه بالمنزل' },
                          ]}
                          ariaLabel="مياه الشرب"
                          triggerClassName="text-xs font-medium"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">مصدر الكهرباء</label>
                        <CustomSelect
                          size="sm"
                          value={electricityMeter}
                          onChange={(val) => setElectricityMeter(val as typeof electricityMeter)}
                          options={[
                            { value: 'formal', label: 'عداد رسمي مسجل' },
                            { value: 'code_meter', label: 'عداد كودي / ممارسة' },
                            { value: 'none', label: 'بدون عداد كهرباء' },
                          ]}
                          ariaLabel="مصدر الكهرباء"
                          triggerClassName="text-xs font-medium"
                        />
                      </div>
                    </div>

                    {/* Private Bathroom Toggle */}
                    <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200">
                      <span className="text-xs font-bold text-slate-800">دورة مياه خاصة ومستقلة صالحة</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setHasPrivateBathroom(true)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            hasPrivateBathroom ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          نعم
                        </button>
                        <button
                          type="button"
                          onClick={() => setHasPrivateBathroom(false)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            !hasPrivateBathroom ? 'bg-rose-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          مشتركة / غير صالحة
                        </button>
                      </div>
                    </div>

                    {/* Basic Appliances Chips */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        الأجهزة الأساسية المتوفرة بالمنزل
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {['ثلاجة', 'غسالة', 'بوتاجاز', 'أسرّة كافية'].map((appliance) => {
                          const isSelected = basicAppliances.includes(appliance);
                          return (
                            <button
                              key={appliance}
                              type="button"
                              onClick={() => {
                                setBasicAppliances((prev) =>
                                  isSelected ? prev.filter((a) => a !== appliance) : [...prev, appliance]
                                );
                              }}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <Check
                                size={12}
                                className={isSelected ? 'text-emerald-700 stroke-[3]' : 'text-slate-300'}
                              />
                              <span>{appliance}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Summary Textarea */}
                  <div className="relative">
                    <textarea
                      rows={3}
                      value={caseSummary}
                      onChange={(e) => setCaseSummary(e.target.value)}
                      placeholder="اكتب المعاينة الميدانية التكميلية لحالة الجدران والبيئة المحيطة..."
                      className="w-full p-3 pl-12 text-xs sm:text-sm font-medium bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-slate-900 shadow-xs leading-relaxed"
                    />
                    <button
                      type="button"
                      onClick={() => toggleVoiceDictation('caseSummary', setCaseSummary)}
                      className={`absolute left-3 bottom-3 p-2 rounded-xl transition-all cursor-pointer ${
                        isListening && activeVoiceField === 'caseSummary'
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-slate-200/80 hover:bg-teal-100 text-slate-700'
                      }`}
                      title="تحدث بالصوت"
                    >
                      {isListening && activeVoiceField === 'caseSummary' ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Q10: Landmark */}
              {currentQuestion === 10 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                      <MapPin size={15} />
                      <span>تسهيل الوصول</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      هل توجد علامة مميزة لموقع السكن؟
                    </h2>
                    <p className="text-xs text-slate-500">
                      مسجد قريب، صيدلية، محل معروف لتسهيل الزيارات.
                    </p>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      value={landmarkAddress}
                      onChange={(e) => setLandmarkAddress(e.target.value)}
                      placeholder="مثال: بجوار مسجد النور، أمام صيدلية الأمل"
                      className="w-full p-4 pl-12 text-xs sm:text-sm font-semibold bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-slate-900 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => toggleVoiceDictation('landmark', setLandmarkAddress)}
                      className={`absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all cursor-pointer ${
                        isListening && activeVoiceField === 'landmark'
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-slate-200/80 hover:bg-teal-100 text-slate-700'
                      }`}
                      title="إملاء صوتي للعلامة المميزة"
                    >
                      {isListening && activeVoiceField === 'landmark' ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Q11: 1. أفراد الأسرة بنظام البطاقة الفردية (Member Sub-flow) */}
              {currentQuestion === 11 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                        <Users size={15} />
                        <span>أفراد الأسرة (بطاقة {activeMemberIndex + 1} من {familyMembers.length})</span>
                      </span>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                        بيانات {currentMember?.relation || 'الفرد'}
                      </h2>
                    </div>

                    {/* Member Quick Switcher Pills */}
                    <div className="flex items-center gap-1">
                      {familyMembers.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveMemberIndex(idx)}
                          className={`w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center cursor-pointer transition-all ${
                            activeMemberIndex === idx
                              ? 'bg-teal-800 text-white shadow-xs scale-105'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Single Member Compact Form (Strictly Zero-Scroll) */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 shadow-2xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block mb-0.5">الاسم</label>
                        <input
                          type="text"
                          value={currentMember?.name || (activeMemberIndex === 0 ? caseName : '')}
                          onChange={(e) => updateCurrentMember('name', e.target.value)}
                          placeholder="اسم الفرد رباعياً"
                          className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                          صلة القرابة بالنسبة للحالة
                        </label>
                        <CustomSelect
                          size="sm"
                          value={currentMember?.relation || 'نفس الحالة (صاحب الملف الأساسي)'}
                          onChange={(val) => updateCurrentMember('relation', val)}
                          options={[
                            { value: 'نفس الحالة (صاحب الملف الأساسي)', label: 'نفس الحالة (صاحب الملف الأساسي)' },
                            { value: 'الأب', label: 'الأب' },
                            { value: 'الأم', label: 'الأم' },
                            { value: 'الزوج / الزوجة', label: 'الزوج / الزوجة' },
                            { value: 'الابن / الابنة', label: 'الابن / الابنة' },
                            { value: 'الأخ / الأخت', label: 'الأخ / الأخت' },
                            { value: 'الجد / الجدة', label: 'الجد / الجدة' },
                            { value: 'قريب / كفيل آخر', label: 'قريب / كفيل آخر' },
                          ]}
                          ariaLabel="صلة القرابة بالنسبة للحالة"
                          triggerClassName="rounded-lg text-xs font-bold"
                        />
                      </div>
                    </div>

                    {/* Primary Caregiver Toggle Card */}
                    <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer text-xs transition-colors hover:bg-teal-50/40">
                      <input
                        type="checkbox"
                        checked={Boolean(currentMember?.isPrimaryCaregiver)}
                        onChange={(e) => updateCurrentMember('isPrimaryCaregiver', e.target.checked)}
                        className="w-4 h-4 rounded text-teal-700 accent-teal-700 shrink-0"
                      />
                      <div className="leading-tight">
                        <span className="font-bold text-slate-900 block text-xs">
                          المتكفل الفعلي بالإنفاق والرعاية على الأسرة
                        </span>
                        <span className="text-[10.5px] text-slate-500 block">
                          العائل الرئيسي المسؤول عن تأمين المعيشة للأفراد
                        </span>
                      </div>
                    </label>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block mb-0.5">السن (عمر الفرد)</label>
                        <input
                          type="number"
                          value={currentMember?.age || 20}
                          onChange={(e) => updateCurrentMember('age', Number(e.target.value) || 0)}
                          className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg font-bold font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block mb-0.5">الحالة الدراسية</label>
                        <CustomSelect
                          size="sm"
                          value={currentMember?.educationLevel || 'إعدادي'}
                          onChange={(val) => updateCurrentMember('educationLevel', val)}
                          options={[
                            { value: 'أمية', label: 'أمية' },
                            { value: 'ابتدائي', label: 'ابتدائي' },
                            { value: 'إعدادي', label: 'إعدادي' },
                            { value: 'ثانوي / دبلوم', label: 'ثانوي / دبلوم' },
                            { value: 'جامعي', label: 'جامعي' },
                            { value: 'غير ملتحق', label: 'غير ملتحق' },
                          ]}
                          ariaLabel="الحالة الدراسية"
                          triggerClassName="rounded-lg text-xs font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block mb-0.5">القدرة على العمل</label>
                        <CustomSelect
                          size="sm"
                          value={currentMember?.workCapacity || 'قادر على العمل'}
                          onChange={(val) => updateCurrentMember('workCapacity', val)}
                          options={[
                            { value: 'قادر على العمل', label: 'قادر على العمل' },
                            { value: 'ربة منزل', label: 'ربة منزل' },
                            { value: 'متفرغ لرعاية الأسرة', label: 'متفرغ لرعاية الأسرة' },
                            { value: 'عاجز جزئياً أو مسن', label: 'عاجز جزئياً أو مسن' },
                            { value: 'عاجز كلياً', label: 'عاجز كلياً' },
                            { value: 'طفل / قاصر', label: 'طفل / قاصر' },
                          ]}
                          ariaLabel="القدرة على العمل"
                          triggerClassName="rounded-lg text-xs font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-700 block mb-0.5">العمل الحالي ومصدر الدخل</label>
                      <input
                        type="text"
                        value={currentMember?.currentJob || ''}
                        onChange={(e) => updateCurrentMember('currentJob', e.target.value)}
                        placeholder="مثال: عامل يومية / ربة منزل / طالب"
                        className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg font-medium"
                      />
                    </div>

                    {/* Chronic Illness Sub-card (Linked to Settings Chronic Diseases) */}
                    <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={Boolean(currentMember?.chronicIllness)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const activeList = chronicDiseases.filter((d) => d.isActive);
                              const first = activeList[0];
                              updateCurrentMember('chronicIllness', {
                                diseaseId: first ? first.id : '__other__',
                                conditionName: first ? first.name : '',
                                monthlyCost: first ? first.defaultMonthlyCost : 300,
                                isCoveredByStateInsurance: false,
                              });
                            } else {
                              updateCurrentMember('chronicIllness', undefined);
                            }
                          }}
                          className="w-4 h-4 rounded text-rose-600 accent-rose-600 shrink-0"
                        />
                        <span className="font-bold text-slate-800">يعاني هذا الفرد من مرض مزمن أو عجز صحي</span>
                      </label>

                      {currentMember?.chronicIllness && (() => {
                        const activeList = chronicDiseases.filter((d) => d.isActive);
                        const ci = currentMember.chronicIllness!;
                        const matchedById = ci.diseaseId
                          ? chronicDiseases.find((d) => d.id === ci.diseaseId)
                          : undefined;
                        const matchedByName = !matchedById
                          ? chronicDiseases.find(
                              (d) => d.name.trim() === (ci.conditionName || '').trim()
                            )
                          : undefined;
                        const resolvedSelectValue =
                          ci.diseaseId === '__other__'
                            ? '__other__'
                            : matchedById?.id || matchedByName?.id || '__other__';

                        return (
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                                  تشخيص المرض المزمن
                                </label>
                                <CustomSelect
                                  size="sm"
                                  value={resolvedSelectValue}
                                  onChange={(val) => {
                                    if (val === '__other__') {
                                      updateCurrentMember('chronicIllness', {
                                        ...ci,
                                        diseaseId: '__other__',
                                        conditionName:
                                          matchedById || matchedByName ? '' : ci.conditionName,
                                      });
                                    } else {
                                      const picked = chronicDiseases.find((d) => d.id === val);
                                      if (picked) {
                                        updateCurrentMember('chronicIllness', {
                                          ...ci,
                                          diseaseId: picked.id,
                                          conditionName: picked.name,
                                          monthlyCost: picked.defaultMonthlyCost,
                                        });
                                      }
                                    }
                                  }}
                                  options={[
                                    ...activeList.map<CustomSelectOption>((d) => ({
                                      value: d.id,
                                      label: `${d.name} (${d.defaultMonthlyCost} ج.م)`,
                                    })),
                                    ...(matchedById && !matchedById.isActive
                                      ? [
                                          {
                                            value: matchedById.id,
                                            label: `${matchedById.name} (${matchedById.defaultMonthlyCost} ج.م)`,
                                          },
                                        ]
                                      : []),
                                    { value: '__other__', label: 'مرض آخر (كتابة مخصصة)' },
                                  ]}
                                  ariaLabel="تشخيص المرض المزمن"
                                  triggerClassName="rounded-lg bg-slate-50 text-xs font-semibold"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                                  تكلفة العلاج (ج.م/شهر)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  value={ci.monthlyCost}
                                  onChange={(e) =>
                                    updateCurrentMember('chronicIllness', {
                                      ...ci,
                                      monthlyCost: Number(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full p-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                                />
                              </div>
                            </div>

                            {resolvedSelectValue === '__other__' && (
                              <div>
                                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                                  اكتب اسم المرض أو العجز المخصص
                                </label>
                                <input
                                  type="text"
                                  value={ci.conditionName}
                                  onChange={(e) =>
                                    updateCurrentMember('chronicIllness', {
                                      ...ci,
                                      diseaseId: '__other__',
                                      conditionName: e.target.value,
                                    })
                                  }
                                  placeholder="مثال: التهاب مفصلي مزمن / مرض نادر..."
                                  className="w-full p-1.5 text-xs bg-slate-50 border border-[#005756] rounded-lg font-medium text-slate-900"
                                />
                              </div>
                            )}

                            <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-700">
                              <input
                                type="checkbox"
                                checked={ci.isCoveredByStateInsurance}
                                onChange={(e) =>
                                  updateCurrentMember('chronicIllness', {
                                    ...ci,
                                    isCoveredByStateInsurance: e.target.checked,
                                  })
                                }
                                className="w-3.5 h-3.5 rounded text-teal-700 accent-teal-700"
                              />
                              <span>مشمول بالتأمين الصحي أو علاج على نفقة الدولة</span>
                            </label>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Sub-flow actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleAddNewMember}
                      className="flex-1 py-2 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus size={14} />
                      <span>+ إضافة فرد آخر للأسرة</span>
                    </button>

                    {familyMembers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(activeMemberIndex)}
                        className="p-2 border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl cursor-pointer"
                        title="حذف هذا الفرد"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Q12: Basic Monthly Income */}
              {currentQuestion === 12 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                      <Wallet size={15} />
                      <span>الدخل الأساسي</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      ما هو إجمالي الدخل الأساسي الشهري (ج.م)؟
                    </h2>
                    <p className="text-xs text-slate-500">
                      معاش تكافل وكرامة، معاش تأميني، أو راتب شهري ثابت.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        autoFocus
                        value={basicIncomeAmount}
                        onChange={(e) => setBasicIncomeAmount(Number(e.target.value) || 0)}
                        className="w-full p-4 pl-16 text-center text-2xl font-black font-mono bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-slate-900 shadow-xs"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                        ج.م/شهر
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {[0, 450, 650, 900, 1200].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setBasicIncomeAmount(val)}
                          className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer"
                        >
                          {val} ج.م
                        </button>
                      ))}
                    </div>

                    <div className="pt-1 space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        مصدر وتفاصيل الدخل الأساسي
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={basicIncomeSources}
                          onChange={(e) => setBasicIncomeSources(e.target.value)}
                          placeholder="مثال: معاش تكافل وكرامة، معاش تأميني، راتب شهري..."
                          className="w-full h-10 px-3 pl-11 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:border-[#005756] focus:bg-white focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => toggleVoiceDictation('basicIncomeSource', setBasicIncomeSources)}
                          className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all cursor-pointer ${
                            isListening && activeVoiceField === 'basicIncomeSource'
                              ? 'bg-rose-600 text-white animate-pulse'
                              : 'bg-slate-200/80 hover:bg-teal-100 text-slate-700'
                          }`}
                          title="إملاء تفاصيل الدخل الأساسي صوتياً"
                        >
                          {isListening && activeVoiceField === 'basicIncomeSource' ? <MicOff size={14} /> : <Mic size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Q13: Additional Income */}
              {currentQuestion === 13 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                      <Wallet size={15} />
                      <span>الدخل الإضافي</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      ما هو الدخل الإضافي من اليوميات غير المنتظمة؟
                    </h2>
                    <p className="text-xs text-slate-500">
                      تقدير شهري للأعمال الحرفية واليوميات المتقطعة.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        autoFocus
                        value={additionalIncomeAmount}
                        onChange={(e) => setAdditionalIncomeAmount(Number(e.target.value) || 0)}
                        className="w-full p-4 pl-16 text-center text-2xl font-black font-mono bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-slate-900 shadow-xs"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                        ج.م/شهر
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {[0, 300, 400, 600, 800].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAdditionalIncomeAmount(val)}
                          className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer"
                        >
                          {val} ج.م
                        </button>
                      ))}
                    </div>

                    <div className="pt-1 space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        مصدر وتفاصيل الدخل الإضافي
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={additionalIncomeSources}
                          onChange={(e) => setAdditionalIncomeSources(e.target.value)}
                          placeholder="مثال: يوميات عمالة غير منتظمة، خياطة، مساعدة أهل..."
                          className="w-full h-10 px-3 pl-11 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:border-[#005756] focus:bg-white focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => toggleVoiceDictation('additionalIncomeSource', setAdditionalIncomeSources)}
                          className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all cursor-pointer ${
                            isListening && activeVoiceField === 'additionalIncomeSource'
                              ? 'bg-rose-600 text-white animate-pulse'
                              : 'bg-slate-200/80 hover:bg-teal-100 text-slate-700'
                          }`}
                          title="إملاء تفاصيل الدخل الإضافي صوتياً"
                        >
                          {isListening && activeVoiceField === 'additionalIncomeSource' ? <MicOff size={14} /> : <Mic size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Q14: Family Assets */}
              {currentQuestion === 14 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                      <Wallet size={15} />
                      <span>الأملاك والأصول</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      هل تمتلك الأسرة أي أصول أو أدوات إنتاج؟
                    </h2>
                  </div>

                  <div className="space-y-2">
                    {[
                      'لا توجد أي أملاك مسجلة',
                      'مركبة عمل (تروسيكل / دراجة نقل)',
                      'أجهزة كهربائية معيشية بسيطة فقط',
                      'دابة أو مواشي ريفية',
                    ].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setFamilyAssets(item);
                          setTimeout(handleNext, 150);
                        }}
                        className={`w-full p-3.5 rounded-2xl border-2 text-right text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-between ${
                          familyAssets === item
                            ? 'bg-teal-50 border-teal-700 text-teal-950 ring-1 ring-teal-700 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span>{item}</span>
                        <span
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            familyAssets === item ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300'
                          }`}
                        >
                          {familyAssets === item && <Check size={12} />}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Q15: Basic Expenses */}
              {currentQuestion === 15 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                      <Wallet size={15} />
                      <span>المصروفات المعيشية</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      ما هو إجمالي المصروفات الأساسية الشهرية؟
                    </h2>
                    <p className="text-xs text-slate-500">
                      تشمل: الإيجار، الطعام، وفواتير المياه والكهرباء.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        autoFocus
                        value={monthlyBasicExpenses}
                        onChange={(e) => setMonthlyBasicExpenses(Number(e.target.value) || 0)}
                        className="w-full p-4 pl-16 text-center text-2xl font-black font-mono bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-slate-900 shadow-xs"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                        ج.م/شهر
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {[1500, 2000, 2500, 3000, 3500].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setMonthlyBasicExpenses(val)}
                          className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer"
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Q16: Debts */}
              {currentQuestion === 16 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                      <Wallet size={15} />
                      <span>الديون والالتزامات</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      ما هي أقساط الديون الشهرية وتفاصيلها؟
                    </h2>
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        value={monthlyDebtsInstallments}
                        onChange={(e) => setMonthlyDebtsInstallments(Number(e.target.value) || 0)}
                        className="w-full p-3.5 pl-16 text-center text-xl font-black font-mono bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-rose-800 shadow-xs"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                        ج.م/شهر
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={debtsAndObligations}
                        onChange={(e) => setDebtsAndObligations(e.target.value)}
                        placeholder="بيان أسماء الدائنين وسبب الدين..."
                        className="w-full p-3.5 pl-12 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:border-teal-700 focus:bg-white focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => toggleVoiceDictation('debts', setDebtsAndObligations)}
                        className={`absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all cursor-pointer ${
                          isListening && activeVoiceField === 'debts'
                            ? 'bg-rose-600 text-white animate-pulse'
                            : 'bg-slate-200/80 hover:bg-teal-100 text-slate-700'
                        }`}
                        title="إملاء تفاصيل الدائنين والالتزامات صوتياً"
                      >
                        {isListening && activeVoiceField === 'debts' ? <MicOff size={15} /> : <Mic size={15} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Q17: Gap Review */}
              {currentQuestion === 17 && (
                <div className="space-y-3">
                  <div className="space-y-1 text-center">
                    <span className="text-xs font-bold text-teal-800 inline-flex items-center gap-1.5 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                      <TrendingUp size={14} className="text-teal-700" />
                      <span>حاسبة العجز المالي</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mt-1">
                      العجز الشهري (الفجوة المالية)
                    </h2>
                    <p className="text-xs text-slate-500">
                      حساب فوري للفرق بين إجمالي الدخل وكافة المصروفات.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl space-y-3">
                    <div className="text-center py-2 border-b border-slate-200">
                      <span className="text-xs text-slate-500 font-semibold block mb-1">
                        صافي العجز الشهري المقترح للتغطية
                      </span>
                      <span className="text-3xl sm:text-4xl font-black text-[#005756] font-mono tracking-tight">
                        {netFinancialGap.toLocaleString('ar-EG')} ج.م
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                        <span className="block text-[11px] text-slate-500">إجمالي الدخل</span>
                        <span className="block font-bold text-slate-800 font-mono mt-0.5">
                          {totalIncome.toLocaleString('ar-EG')} ج.م
                        </span>
                      </div>
                      <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                        <span className="block text-[11px] text-slate-500">إجمالي الالتزامات</span>
                        <span className="block font-bold text-rose-700 font-mono mt-0.5">
                          {totalObligations.toLocaleString('ar-EG')} ج.م
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Q18: Medical Condition */}
              {currentQuestion === 18 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                      <Activity size={15} />
                      <span>الحالة الصحية</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      ما هو توصيف الحالات المرضية بالأسرة؟
                    </h2>
                    <p className="text-xs text-slate-500">
                      الأمراض المزمنة، العجز، وأثر المرض على العمل.
                    </p>
                  </div>

                  <div className="relative">
                    <textarea
                      rows={4}
                      autoFocus
                      value={medicalConditionDescription}
                      onChange={(e) => setMedicalConditionDescription(e.target.value)}
                      placeholder="اكتب تفاصيل المرض والشخص المصاب..."
                      className="w-full p-3.5 pl-12 text-xs sm:text-sm font-medium bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-slate-900 shadow-xs leading-relaxed"
                    />
                    <button
                      type="button"
                      onClick={() => toggleVoiceDictation('medical', setMedicalConditionDescription)}
                      className={`absolute left-3 bottom-3 p-2 rounded-xl transition-all cursor-pointer ${
                        isListening && activeVoiceField === 'medical'
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-slate-200/80 hover:bg-teal-100 text-slate-700'
                      }`}
                      title="تحدث بالصوت"
                    >
                      {isListening && activeVoiceField === 'medical' ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Q19: Chronic Verification */}
              {currentQuestion === 19 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                      <Activity size={15} />
                      <span>التحقق الطبي</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      ما هو سند التأكد من صحة واستمرار المرض؟
                    </h2>
                  </div>

                  <div className="space-y-2">
                    {[
                      'مؤكد بتقارير وفحوصات طبية حديثة',
                      'عجز كلي معتمد بقرار طبي',
                      'عجز جزئي أو شيخوخة مع تقرير',
                      'لا توجد أمراض مزمنة بالأسرة',
                    ].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setChronicVerification(item);
                          setTimeout(handleNext, 150);
                        }}
                        className={`w-full p-3 rounded-2xl border-2 text-right text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-between ${
                          chronicVerification === item
                            ? 'bg-teal-50 border-teal-700 text-teal-950 ring-1 ring-teal-700 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span>{item}</span>
                        <span
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            chronicVerification === item ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300'
                          }`}
                        >
                          {chronicVerification === item && <Check size={12} />}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Q20: 2. سؤال التأمين الصحي ونفقة الدولة المستقل */}
              {currentQuestion === 20 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                      <HeartHandshake size={15} />
                      <span>التغطية الصحية الحكومية</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      ما هو الموقف من التأمين الصحي ونفقة الدولة؟
                    </h2>
                    <p className="text-xs text-slate-500">
                      هل تصرف الأسرة علاجاً مدعوماً من جهة رسمية؟
                    </p>
                  </div>

                  <div className="space-y-2">
                    {[
                      { title: 'غير مشمول بأي تأمين صحي', desc: 'تتحمل الأسرة كامل تكاليف العلاج نقداً' },
                      { title: 'صادر له قرار علاج على نفقة الدولة', desc: 'يصرف علاج دوري منتظم لمرض مزمن' },
                      { title: 'تأمين صحي حكومي شامل', desc: 'مشمول بمنظومة التأمين الصحي' },
                      { title: 'قيد استخراج أوراق التأمين / نفقة الدولة', desc: 'جارٍ إنهاء الفحوصات والقرارات' },
                    ].map((item) => (
                      <button
                        key={item.title}
                        type="button"
                        onClick={() => {
                          setStateHealthInsurance(item.title);
                          setTimeout(handleNext, 150);
                        }}
                        className={`w-full p-2.5 sm:p-3 rounded-2xl border-2 text-right transition-all cursor-pointer flex items-center justify-between ${
                          stateHealthInsurance === item.title
                            ? 'bg-teal-50 border-teal-700 ring-1 ring-teal-700 text-teal-950 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="block text-xs sm:text-sm font-black">{item.title}</span>
                          <span className="block text-[11px] text-slate-500">{item.desc}</span>
                        </div>
                        <span
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            stateHealthInsurance === item.title ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300'
                          }`}
                        >
                          {stateHealthInsurance === item.title && <Check size={12} />}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Q21: Monthly Medical Costs */}
              {currentQuestion === 21 && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                      <Activity size={15} />
                      <span>تكلفة العلاج</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      كم تبلغ تكاليف العلاج والأدوية الدورية شهرياً؟
                    </h2>
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        autoFocus
                        value={monthlyMedicalCosts}
                        onChange={(e) => setMonthlyMedicalCosts(Number(e.target.value) || 0)}
                        className="w-full p-4 pl-16 text-center text-2xl font-black font-mono bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-slate-900 shadow-xs"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                        ج.م/شهر
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {[0, 300, 450, 600, 900].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setMonthlyMedicalCosts(val)}
                          className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer"
                        >
                          {val} ج.م
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Q22: قائمة التحقق الرسمية والمرفقات (Official Checklist & Documents) */}
              {currentQuestion === 22 && (
                <div className="space-y-3 flex-1 overflow-y-auto overscroll-contain pr-1 pl-1 pb-6">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                      <FileCheck size={15} />
                      <span>قائمة التحقق الميدانية الرسمية (Checklist)</span>
                    </span>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                      فحص ومطابقة المستندات الثبوتية
                    </h2>
                    <p className="text-xs text-slate-500">
                      حدد بالضغط المباشر المستندات المتوفرة والمطابقة لمعايير الاستحقاق.
                    </p>
                  </div>

                  {/* Official Checklist Items (Interactive Toggle Cards) */}
                  <div className="space-y-1.5">
                    {[
                      {
                        key: 'nationalIdsAdults' as const,
                        label: 'بطاقات رقم قومي سارية لكامل البالغين (وش وضهر)',
                        desc: 'إلزامي للتحقق من هوية الأفراد البالغين بالأسرة',
                        required: true,
                      },
                      {
                        key: 'birthCertificatesMinors' as const,
                        label: 'شهادات ميلاد مميكنة لكامل أفراد الأسرة القصر',
                        desc: 'إثبات أعداد وتواريخ ميلاد الأبناء القصر',
                        required: true,
                      },
                      {
                        key: 'insurancePrintOut' as const,
                        label: 'برنت تأميني موجه / إفادة تكافل وكرامة',
                        desc: 'بيان المعاش أو عدم وجود دخل تأميني ثابت',
                        required: true,
                      },
                      {
                        key: 'utilityReceipt' as const,
                        label: 'إيصال مرافق حديث (كهرباء أو مياه)',
                        desc: 'إثبات محل السكن الفعلي واستقرار العنوان',
                        required: true,
                      },
                      {
                        key: 'leaseContractOrRentReceipt' as const,
                        label: 'عقد إيجار موثق / إيصال سداد إيجار حديث',
                        desc: 'في حالات الإيجار لتأكيد الالتزام وقيمة الإيجار',
                        required: false,
                      },
                      {
                        key: 'recentMedicalProof' as const,
                        label: 'تقارير وفحوصات وروشتات طبية حديثة',
                        desc: 'إثبات الأمراض المزمنة وتكاليف الأدوية الشهرية',
                        required: false,
                      },
                      {
                        key: 'deathOrDivorceCertificates' as const,
                        label: 'شهادة وفاة العائل أو قسيمة طلاق مميكنة',
                        desc: 'للأسر فاقدة العائل والأيتام والمطلقات',
                        required: false,
                      },
                    ].map((item) => {
                      const isChecked = checklist[item.key];
                      return (
                        <div
                          key={item.key}
                          onClick={() => setChecklist((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                          className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                            isChecked
                              ? 'bg-teal-50/90 border-teal-600 text-teal-950 shadow-2xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold leading-snug">{item.label}</span>
                              {item.required && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-teal-100 text-teal-800 rounded font-bold">
                                  أساسي
                                </span>
                              )}
                            </div>
                            <span className="text-[10.5px] text-slate-500 block">{item.desc}</span>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isChecked ? 'bg-teal-700 border-teal-700 text-white' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isChecked && <Check size={13} className="stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Camera & Quick Upload triggers (Strictly Zero-Scroll) */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="p-2.5 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-xl text-teal-950 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-98 transition-all"
                    >
                      <Camera size={15} className="text-teal-700" />
                      <span>📷 التقاط بالكاميرا</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAddingCustomDoc(true)}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
                    >
                      <Plus size={15} className="text-teal-800" />
                      <span>+ مستند إضافي</span>
                    </button>
                  </div>

                  {/* New Custom Document Input Modal / Field */}
                  {isAddingCustomDoc && (
                    <div className="p-2.5 bg-teal-50/90 border border-teal-300 rounded-2xl space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs font-bold text-teal-950">
                        <span>بيان المستند الإضافي (مثال: وصل كهرباء، عقد إيجار...)</span>
                        <button
                          type="button"
                          onClick={() => setIsAddingCustomDoc(false)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          value={customDocTitle}
                          onChange={(e) => setCustomDocTitle(e.target.value)}
                          placeholder="اكتب أو انطق نوع المستند..."
                          className="w-full p-2 pl-10 text-xs bg-white border border-teal-300 rounded-lg font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => toggleVoiceDictation('customDoc', setCustomDocTitle)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-teal-800 hover:text-teal-950 cursor-pointer"
                        >
                          <Mic size={14} />
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSimulateDirectUpload('customExtra', customDocTitle || 'مستند إضافي')}
                          className="flex-1 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                        >
                          تأكيد وحفظ المرفق
                        </button>
                        <button
                          type="button"
                          onClick={() => extraFileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-[11px] font-semibold cursor-pointer"
                        >
                          اختر ملفاً
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Attached Documents List */}
                  <div className="space-y-1">
                    {uploadedDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          {(doc.category as string) === 'voiceRecording' ? (
                            <button
                              type="button"
                              onClick={togglePlayRecordedAudio}
                              className="p-1 rounded-md bg-teal-100 text-teal-800 hover:bg-teal-200 cursor-pointer shrink-0 transition-colors"
                              title={isPlayingAudio ? 'إيقاف مؤقت' : 'استماع للتسجيل الصوتي'}
                            >
                              {isPlayingAudio ? <Pause size={12} /> : <Play size={12} />}
                            </button>
                          ) : (
                            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                          )}
                          <span className="font-bold text-slate-800 truncate">
                            {doc.title} {doc.customDescription ? `(${doc.customDescription})` : ''}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(doc.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Q23: توصية الباحث الميداني المستقلة (Researcher Recommendation) */}
              {currentQuestion === 23 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                      <HeartHandshake size={15} />
                      <span>توصية الباحث الميداني</span>
                    </span>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                      إيه نوع المساعدة والمبلغ اللي بتوصي بيه للأسرة؟
                    </h2>
                    <p className="text-xs text-slate-500">
                      اختار نوع الدعم الأنسب لحالة الأسرة وحدد المبلغ الشهري المقترح مع توضيح السبب للإدارة.
                    </p>
                  </div>

                  {/* 1. Assistance Type Selection Cards */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      نوع المساعدة المقترحة
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {ASSISTANCE_TYPE_OPTIONS.map((opt) => {
                        const isSelected = recommendedAssistanceType === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setRecommendedAssistanceType(opt.id)}
                            className={`w-full p-2.5 sm:p-3 rounded-xl border text-right transition-colors cursor-pointer flex items-center justify-between gap-2.5 ${
                              isSelected
                                ? 'bg-teal-50/80 border-[#005756] text-teal-950'
                                : 'bg-slate-50/70 border-slate-200/80 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div className="min-w-0 space-y-0.5">
                              <span className="block text-xs font-bold">{opt.label}</span>
                              <span className="block text-[11px] text-slate-500">{opt.desc}</span>
                            </div>
                            <span
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? 'border-[#005756] bg-[#005756] text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check size={12} />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Suggested Monthly Amount (defaults to netFinancialGap) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-700">
                        المبلغ المالي المقترح شهرياً (ج.م)
                      </label>
                      {recommendedAmountOverride !== null &&
                        recommendedAmountOverride !== netFinancialGap && (
                          <button
                            type="button"
                            onClick={() => setRecommendedAmountOverride(null)}
                            className="text-[11px] font-semibold text-[#005756] hover:underline cursor-pointer"
                          >
                            استخدام العجز ({netFinancialGap.toLocaleString('ar-EG')} ج.م)
                          </button>
                        )}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={effectiveRecommendedAmount}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '') {
                            setRecommendedAmountOverride(0);
                            return;
                          }
                          const parsed = Number(raw);
                          setRecommendedAmountOverride(
                            Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
                          );
                        }}
                        className="w-full p-3 pl-14 text-sm font-bold font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-xl focus:border-[#005756] focus:bg-white focus:outline-hidden text-slate-900"
                      />
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 pointer-events-none">
                        ج.م
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      مقترح تلقائياً حسب العجز الشهري للأسرة (
                      <span className="font-mono tabular-nums font-semibold text-slate-700">
                        {netFinancialGap.toLocaleString('ar-EG')} ج.م
                      </span>
                      ) وتقدر تعدله حسب رؤيتك الميدانية.
                    </p>
                  </div>

                  {/* 3. Justification & Researcher Notes for Management */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      مبررات التوصية وملاحظات الباحث للإدارة
                    </label>
                    <div className="relative">
                      <textarea
                        rows={3}
                        value={additionalNotesAndRemarks}
                        onChange={(e) => setAdditionalNotesAndRemarks(e.target.value)}
                        placeholder="اكتب هنا سبب ترشيح الدعم ده وأي تفاصيل شفتها على الطبيعة تساعد الإدارة في القرار..."
                        className="w-full p-3 pl-10 text-xs font-medium leading-relaxed bg-slate-50 border border-slate-200 rounded-xl focus:border-[#005756] focus:bg-white focus:outline-hidden text-slate-800 resize-none"
                      />
                      <button
                        type="button"
                        onClick={() => toggleVoiceDictation('remarks', setAdditionalNotesAndRemarks)}
                        className={`absolute left-2.5 top-2.5 p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isListening && activeVoiceField === 'remarks'
                            ? 'bg-rose-600 text-white animate-pulse'
                            : 'text-slate-500 hover:text-[#005756] hover:bg-slate-200/60'
                        }`}
                        title="إملاء صوتي سريع للنص"
                      >
                        {isListening && activeVoiceField === 'remarks' ? (
                          <MicOff size={14} />
                        ) : (
                          <Mic size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Q24: شاشة المراجعة الختامية (Quick Summary Slide) */}
              {currentQuestion === 24 && (
                <div className="space-y-3">
                  <div className="space-y-0.5 text-center">
                    <span className="text-xs font-bold text-teal-800 inline-flex items-center gap-1.5 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                      <CheckCircle2 size={13} className="text-teal-700" />
                      <span>المراجعة الختامية للبحث</span>
                    </span>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                      تأكيد واعتماد ملف الحالة
                    </h2>
                  </div>

                  {/* Researcher Voice Notes Card (v1 Primary Feature) */}
                  {fullAudioUrl ? (
                    <ResearcherVoicePlayer
                      audioUrl={fullAudioUrl}
                      durationSeconds={fullAudioDuration || 14}
                      researcherName={visitorName}
                      fileName="تسجيل_صوتي_للباحث.webm"
                      onReRecord={startFullAudioRecording}
                      onDelete={deleteFullAudioRecording}
                    />
                  ) : isFullAudioRecording ? (
                    <div className="p-3.5 bg-rose-50 border-2 border-rose-400 rounded-2xl space-y-2.5 text-right animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
                          <span className="text-xs font-black text-rose-950">
                            شغال تسجيل دلوقتي... سجل بصوتك أي ملاحظة مش مكتوبة
                          </span>
                        </div>
                        <span className="font-mono text-sm font-black text-white bg-rose-600 px-2.5 py-0.5 rounded-lg">
                          {formatDuration(fullAudioDuration)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={stopFullAudioRecording}
                        className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Square size={13} className="fill-white" />
                        <span>وقف واحفظ الريكورد</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-right">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          ملاحظات الزيارة الصوتية
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          سجّل ملخص سريع يساعد في تقييم الحالة
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={startFullAudioRecording}
                        className="px-3.5 py-2 bg-[#005756] hover:bg-[#004241] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <Mic size={14} />
                        <span>ابدأ التسجيل</span>
                      </button>
                    </div>
                  )}

                  {/* AI Executive Recommendation Card (Hidden in v1 via ENABLE_AI_EXTRACTION_V2) */}
                  {ENABLE_AI_EXTRACTION_V2 && executiveSummary && (
                    <div className="p-3 bg-gradient-to-br from-teal-50 via-emerald-50/50 to-white border-2 border-teal-600/70 rounded-2xl space-y-2 text-right shadow-2xs animate-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between pb-1.5 border-b border-teal-200/70">
                        <div className="flex items-center gap-1.5">
                          <Sparkles size={15} className="text-teal-700 animate-pulse" />
                          <span className="font-black text-xs text-teal-950">توصية التحليل الذكي للإدارة</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-800 leading-relaxed font-semibold">
                        {executiveSummary.justificationText}
                      </p>
                    </div>
                  )}

                  {/* Summary Card (Scrolls smoothly above CTA) */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                    <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium">اسم المستفيد:</span>
                      <span className="font-black text-slate-900">{caseName || 'رب الأسرة'}</span>
                    </div>

                    <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium">أفراد الأسرة:</span>
                      <span className="font-bold text-slate-800 text-left">
                        {familyMembers.length} أفراد ({familyMembers.map((m) => m.name || m.relation).filter(Boolean).slice(0, 3).join('، ')}...)
                      </span>
                    </div>

                    <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium">صافي الفجوة الشهرية:</span>
                      <span className="font-black text-teal-800 font-mono tabular-nums text-sm">
                        {netFinancialGap.toLocaleString('ar-EG')} ج.م
                      </span>
                    </div>

                    <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium">مرافق السكن:</span>
                      <span className="font-bold text-slate-800 text-left">
                        سقف {roofType === 'concrete' ? 'خرساني' : roofType === 'wood_straw' ? 'خشب/قش' : 'متصدع'} · {hasPrivateBathroom ? 'حمام خاص' : 'حمام مشترك'} ({basicAppliances.length} أجهزة)
                      </span>
                    </div>

                    <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium">مستندات الـ Checklist:</span>
                      <span className="font-bold text-emerald-800 font-mono tabular-nums">
                        {Object.values(checklist).filter(Boolean).length} من 7 بنود مستوفاة
                      </span>
                    </div>

                    <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium">الموقف الطبي:</span>
                      <span className="font-bold text-slate-800 text-left">{stateHealthInsurance}</span>
                    </div>

                    <div className="pb-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium block mb-1.5">
                        المرفقات الثبوتية المرفوعة ({uploadedDocs.length}):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {uploadedDocs.map((doc) => (
                          <span
                            key={doc.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-700"
                          >
                            <Check size={10} className="text-emerald-600" />
                            <span>{doc.title}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Researcher Recommendation Summary */}
                    <div className="pt-0.5 space-y-1.5">
                      <span className="text-slate-700 font-bold block">
                        توصية الباحث الميداني:
                      </span>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-500">نوع المساعدة المقترحة:</span>
                        <span className="font-bold text-slate-800">{recommendedAssistanceType}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-slate-500">المبلغ المقترح شهرياً:</span>
                        <span className="font-black text-[#005756] font-mono tabular-nums">
                          {effectiveRecommendedAmount.toLocaleString('ar-EG')} ج.م
                        </span>
                      </div>
                      <div className="pt-0.5">
                        <span className="text-slate-500 block mb-0.5">مبررات التوصية والملاحظات:</span>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                          {additionalNotesAndRemarks.trim() || 'مفيش ملاحظات إضافية مكتوبة.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-center text-slate-500 font-medium pb-1">
                    لما تضغط على الزر تحت، بيتبعت ملف الحالة على طول لإدارة الجمعية (بانتظار المراجعة والاعتماد).
                  </p>
                </div>
              )}

            </div>
          )}
        </div>

        {/* ==================================================== */}
        {/* 3. BOTTOM BAR (Fixed Thumb-Friendly CTA Navigation) */}
        {/* ==================================================== */}
        {!isSuccessSubmitted && (
          <div className="bg-white px-5 py-3 border-t border-slate-100 shrink-0 flex items-center justify-between gap-3">
            {/* Back Button */}
            {currentQuestion > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="w-12 h-14 border border-slate-200 hover:bg-slate-100 active:bg-slate-200 text-slate-700 rounded-2xl flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                title="السابق"
              >
                <ArrowRight size={20} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRequestClose}
                className="px-3.5 h-14 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-2xl text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                إلغاء
              </button>
            )}

            {/* Skip Button (Mandatory check rule) */}
            {currentQuestion < totalQuestions && (
              <button
                type="button"
                onClick={handleSkip}
                className="px-3 h-14 text-slate-500 hover:text-slate-800 hover:bg-slate-50 active:bg-slate-100 rounded-2xl text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                تخطي
              </button>
            )}

            {/* Main Primary Button (Full-width thumb CTA) */}
            {currentQuestion < totalQuestions ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 h-14 bg-[#005756] hover:bg-[#004342] active:scale-[0.98] text-white rounded-xl text-sm sm:text-base font-bold shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>حفظ ومتابعة</span>
                <ArrowLeft size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="flex-1 h-14 bg-teal-800 hover:bg-teal-900 active:scale-[0.98] text-white rounded-xl text-sm sm:text-base font-bold shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 size={20} />
                <span>تأكيد وحفظ البحث</span>
              </button>
            )}
          </div>
        )}

        {/* Calm UI Close Confirmation Overlay (Protects against accidental data loss) */}
        {showCloseConfirm && !isSuccessSubmitted && (
          <div
            className="absolute inset-0 z-30 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4 text-right">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">
                    هل تريد حفظ المسودة قبل الإغلاق؟
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    وصلت إلى <strong className="text-slate-800">الخطوة {currentQuestion} من {totalQuestions}</strong>. عند الإغلاق سيتم الاحتفاظ بجميع بياناتك تلقائياً لتتمكن من استكمالها من نفس الخطوة لاحقاً.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleConfirmSaveAndClose}
                  className="w-full h-10 bg-[#005756] hover:bg-[#004342] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Save size={15} />
                  <span>حفظ المسودة والخروج</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCloseConfirm(false)}
                    className="h-10 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    متابعة الاستمارة
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscardDraftAndClose}
                    className="h-10 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    حذف المسودة والخروج
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
