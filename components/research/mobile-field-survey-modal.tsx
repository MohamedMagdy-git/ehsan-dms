'use client';

import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { useApp } from '@/context/app-context';
import {
  MapPin,
  Mic,
  MicOff,
  Play,
  Square,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  User,
  Phone,
  Home,
  HeartPulse,
  Coins,
  ShieldCheck,
  Calendar,
  Sparkles,
  ExternalLink,
  Plus,
  Trash2,
  X,
  Volume2,
  LayoutDashboard,
  Camera,
  Eye,
  RefreshCw,
  Users,
  Clock,
  HeartHandshake,
  AlertCircle,
  HardDrive,
  Wifi,
  WifiOff,
  CloudUpload,
} from 'lucide-react';
import { BeneficiaryCase, HouseholdMember, HousingCondition, PriorityLevel } from '@/types';
import {
  saveSurveyDraft,
  getSurveyDraft,
  deleteSurveyDraft,
  enqueueOfflineSurvey,
  SurveyDraft,
} from '@/services/offline-storage';
import { useOnlineStatus } from '@/hooks/use-online-status';

function formatDraftTimeAgo(timestamp: number | string): string {
  const timeNum = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  const diffMs = Math.max(0, Date.now() - (isNaN(timeNum) ? Date.now() : timeNum));
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) {
    return 'منذ لحظات';
  }
  if (diffMinutes < 60) {
    return `منذ ${diffMinutes} دقيقة`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `منذ ${diffHours} ساعة`;
  }
  return new Date(timeNum).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
}

// SpeechRecognition type polyfill for Web Speech API
type IWindow = typeof window & {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
};

const emptySubscribe = () => () => {};

function getSttSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as IWindow;
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
}

interface VoiceDictationButtonProps {
  isListening: boolean;
  onToggle: () => void;
  label?: string;
}

function VoiceDictationButton({ isListening, onToggle, label }: VoiceDictationButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
        isListening
          ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-300 animate-pulse'
          : 'bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 hover:border-teal-300'
      }`}
      title={isListening ? 'إيقاف الاستماع الصوتي' : `إملاء صوتي لـ ${label || 'هذا الحقل'}`}
    >
      {isListening ? (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          <MicOff size={13} className="shrink-0" />
          <span>جاري الاستماع... (اضغط للإيقاف)</span>
        </>
      ) : (
        <>
          <Mic size={13} className="shrink-0 text-teal-700" />
          <span>إملاء صوتي</span>
        </>
      )}
    </button>
  );
}

export function MobileFieldSurveyModal() {
  const {
    isFieldSurveyModalOpen,
    setIsFieldSurveyModalOpen,
    surveyTargetCaseId,
    cases,
    addCase,
    updateCase,
    addVisit,
    currentSessionProfile,
    setActiveSection,
  } = useApp();

  // Wizard Step (1 to 4)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Success Completion Screen State
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [submittedCaseSummary, setSubmittedCaseSummary] = useState<{
    code: string;
    name: string;
    isNew: boolean;
    nextDueDate: string;
  } | null>(null);

  // Survey Mode: Update existing case or new case
  const [surveyMode, setSurveyMode] = useState<'update_existing' | 'new_case'>('update_existing');
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  // ----------------------------------------------------
  // Step 1: Identity, Contacts & Geolocation
  // ----------------------------------------------------
  const [primaryName, setPrimaryName] = useState('');
  const [secondaryName, setSecondaryName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState('القاهرة');
  const [district, setDistrict] = useState('بولاق الدكرور');
  const [address, setAddress] = useState('');
  const [directionsNote, setDirectionsNote] = useState('');
  const [caseSummary, setCaseSummary] = useState('');
  const [assignedResearcher, setAssignedResearcher] = useState(currentSessionProfile.name || 'أ. هبة الشامي');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);

  // GPS State
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsData, setGpsData] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    mapsUrl?: string;
  } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // ----------------------------------------------------
  // Step 2: Checklist Inspection (Check List)
  // ----------------------------------------------------
  const [checklist, setChecklist] = useState({
    validAdultIds: true,             // بطاقات سارية لكامل البالغين
    minorBirthCerts: true,           // شهادات ميلاد لكامل القصر
    deathOrDivorceCerts: true,       // شهادات وفاة / قسيمة طلاق إن وجدت
    medicalProofsRecent: true,       // إثباتات وتقارير حديثة للحالة المرضية
    noExpatriateInFamily: true,      // التأكد من عدم وجود فرد مغترب بالخارج
    noRegisteredAssets: true,        // التأكد من عدم وجود أملاك (عقارات أو سيارات)
  });
  const [housingCondition, setHousingCondition] = useState<HousingCondition>('rent_unstable');

  // Quick Camera Upload for checklist & housing (Optional)
  const [capturedPhotos, setCapturedPhotos] = useState<Record<string, string>>({
    validAdultIds: '',
    minorBirthCerts: '',
    deathOrDivorceCerts: '',
    medicalProofsRecent: '',
    housingConditionPhotos: '',
  });
  const [previewModalImage, setPreviewModalImage] = useState<{ title: string; url: string } | null>(null);

  const handlePhotoCapture = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCapturedPhotos((prev) => ({
        ...prev,
        [key]: dataUrl,
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhoto = (key: string) => {
    setCapturedPhotos((prev) => ({
      ...prev,
      [key]: '',
    }));
  };

  // ----------------------------------------------------
  // Step 3: Health, Financial & Family Assessment
  // ----------------------------------------------------
  const [requestedAidType, setRequestedAidType] = useState('كفالة نقدية شهرية');
  const [hasChronicIllness, setHasChronicIllness] = useState(true);
  const [chronicIllnessDetails, setChronicIllnessDetails] = useState('');
  const [medicalExpenses, setMedicalExpenses] = useState<number>(600);
  const [healthInsuranceCoverage, setHealthInsuranceCoverage] = useState<
    'government_insurance' | 'state_funded_treatment' | 'none' | 'in_progress'
  >('none');
  const [healthInsuranceDetails, setHealthInsuranceDetails] = useState('');

  const [directIncome, setDirectIncome] = useState<number>(500); // معاش أو دخل رسمي
  const [indirectIncome, setIndirectIncome] = useState<number>(400); // عمل غير منتظم أو يومية
  const [basicExpenses, setBasicExpenses] = useState<number>(2400); // طعام وإيجار وفواتير وديون
  const [debtAndIncomeDetails, setDebtAndIncomeDetails] = useState('');

  // Priority Level: 1 to 5
  const [priorityScoreLevel, setPriorityScoreLevel] = useState<1 | 2 | 3 | 4 | 5>(4);

  // Household Members
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([
    {
      id: 'm-1',
      name: 'رب الأسرة',
      relation: 'رب الأسرة',
      age: 46,
      maritalStatus: 'متزوج',
      educationLevel: 'ابتدائي',
      workCapacity: 'عاجز جزئياً أو مسن',
      workStatus: 'يومية غير منتظمة',
      healthStatus: 'مريض مزمن',
    },
    {
      id: 'm-2',
      name: 'الزوجة',
      relation: 'زوجة',
      age: 41,
      maritalStatus: 'متزوج',
      educationLevel: 'أمية / بدون تعليم',
      workCapacity: 'قادر على العمل',
      workStatus: 'ربة منزل',
      healthStatus: 'سليم',
    },
  ]);

  // ----------------------------------------------------
  // Step 4: Notes, Audio Recording & Speech-to-Text
  // ----------------------------------------------------
  const [observations, setObservations] = useState('');
  const [recommendations, setRecommendations] = useState('');

  // Audio Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const sttSupported = useSyncExternalStore(emptySubscribe, getSttSnapshot, () => false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wasOpenRef = useRef<boolean>(false);
  const [countdown, setCountdown] = useState<number>(60);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);

  // Auto-calculated Net Financial Gap
  const netFinancialGap = Math.max(0, basicExpenses + medicalExpenses - (directIncome + indirectIncome));

  // ----------------------------------------------------
  // PWA Offline Resilience & Draft States
  // ----------------------------------------------------
  const { isOnline } = useOnlineStatus();
  const [detectedDraft, setDetectedDraft] = useState<SurveyDraft | null>(null);
  const [isExitingDraft, setIsExitingDraft] = useState(false);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(null);
  const [isOfflineSubmission, setIsOfflineSubmission] = useState<boolean>(false);

  const getDraftKey = useCallback(() => {
    if (surveyMode === 'update_existing' && selectedCaseId) {
      return `case_${selectedCaseId}`;
    }
    return 'new_case_draft';
  }, [surveyMode, selectedCaseId]);

  const checkForDraft = useCallback(async (key: string) => {
    try {
      const draft = await getSurveyDraft(key);
      if (draft && draft.data) {
        setDetectedDraft(draft);
      } else {
        setDetectedDraft(null);
      }
    } catch {
      setDetectedDraft(null);
    }
  }, []);

  const handleRestoreDraft = () => {
    if (!detectedDraft || !detectedDraft.data) return;
    const d = detectedDraft.data;
    if (d.primaryName !== undefined) setPrimaryName(d.primaryName);
    if (d.secondaryName !== undefined) setSecondaryName(d.secondaryName || '');
    if (d.nationalId !== undefined) setNationalId(d.nationalId);
    if (d.phone !== undefined) setPhone(d.phone);
    if (d.governorate !== undefined) setGovernorate(d.governorate);
    if (d.district !== undefined) setDistrict(d.district);
    if (d.address !== undefined) setAddress(d.address);
    if (d.directionsNote !== undefined) setDirectionsNote(d.directionsNote || '');
    if (d.caseSummary !== undefined) setCaseSummary(d.caseSummary);
    if (d.requestedAidType !== undefined) setRequestedAidType(d.requestedAidType);
    if (d.hasChronicIllness !== undefined) setHasChronicIllness(d.hasChronicIllness);
    if (d.chronicIllnessDetails !== undefined) setChronicIllnessDetails(d.chronicIllnessDetails || '');
    if (d.medicalExpenses !== undefined) setMedicalExpenses(d.medicalExpenses);
    if (d.healthInsuranceCoverage !== undefined) setHealthInsuranceCoverage(d.healthInsuranceCoverage as any);
    if (d.healthInsuranceDetails !== undefined) setHealthInsuranceDetails(d.healthInsuranceDetails || '');
    if (d.directIncome !== undefined) setDirectIncome(d.directIncome);
    if (d.indirectIncome !== undefined) setIndirectIncome(d.indirectIncome);
    if (d.basicExpenses !== undefined) setBasicExpenses(d.basicExpenses);
    if (d.debtAndIncomeDetails !== undefined) setDebtAndIncomeDetails(d.debtAndIncomeDetails || '');
    if (d.priorityScoreLevel !== undefined) setPriorityScoreLevel(d.priorityScoreLevel);
    if (d.housingCondition !== undefined) setHousingCondition(d.housingCondition as any);
    if (d.checklist !== undefined) setChecklist((prev) => ({ ...prev, ...d.checklist }));
    if (d.householdMembers !== undefined && Array.isArray(d.householdMembers)) setHouseholdMembers(d.householdMembers);
    if (d.observations !== undefined) setObservations(d.observations);
    if (d.recommendations !== undefined) setRecommendations(d.recommendations);
    if (d.gpsData !== undefined) setGpsData(d.gpsData);
    if (d.capturedPhotos !== undefined) setCapturedPhotos(d.capturedPhotos);
    if (detectedDraft.currentStep !== undefined) setCurrentStep(detectedDraft.currentStep as any);

    setLastSavedTimestamp(
      new Date(detectedDraft.lastSaved).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    );
    setDetectedDraft(null);
  };

  const handleDismissDraft = async () => {
    if (detectedDraft) {
      await deleteSurveyDraft(detectedDraft.id);
      setDetectedDraft(null);
    }
  };

  const handleRestoreDraftClick = () => {
    setIsExitingDraft(true);
    setTimeout(() => {
      handleRestoreDraft();
      setIsExitingDraft(false);
    }, 200);
  };

  const handleDismissDraftClick = () => {
    setIsExitingDraft(true);
    setTimeout(async () => {
      await handleDismissDraft();
      setIsExitingDraft(false);
    }, 200);
  };

  // ----------------------------------------------------
  // Granular Field-Level Voice Dictation (Speech-to-Text)
  // ----------------------------------------------------
  const [activeDictationField, setActiveDictationField] = useState<string | null>(null);
  const [dictationError, setDictationError] = useState<string | null>(null);
  const fieldRecognitionRef = useRef<any>(null);
  const dictationBaseTextRef = useRef<string>('');

  const stopFieldDictation = useCallback(() => {
    if (fieldRecognitionRef.current) {
      try {
        fieldRecognitionRef.current.stop();
      } catch {
        // ignore
      }
      fieldRecognitionRef.current = null;
    }
    setActiveDictationField(null);
  }, []);

  const toggleFieldDictation = useCallback(
    (
      fieldKey: string,
      currentValue: string,
      setter: (val: string | ((prev: string) => string)) => void
    ) => {
      if (activeDictationField === fieldKey) {
        stopFieldDictation();
        return;
      }

      stopFieldDictation();

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }

      const win = typeof window !== 'undefined' ? (window as IWindow) : null;
      const SpeechRecognitionClass = win?.SpeechRecognition || win?.webkitSpeechRecognition;

      if (!SpeechRecognitionClass) {
        setDictationError('خاصية تحويل الصوت إلى نص غير مدعومة في متصفحك، يمكنك استخدام الكتابة اليدوية.');
        setTimeout(() => setDictationError(null), 4500);
        return;
      }

      try {
        const recognition = new SpeechRecognitionClass();
        recognition.lang = 'ar-EG';
        recognition.continuous = true;
        recognition.interimResults = true;

        dictationBaseTextRef.current = currentValue ? currentValue.trim() : '';

        recognition.onstart = () => {
          setActiveDictationField(fieldKey);
          setDictationError(null);
        };

        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = 0; i < event.results.length; i++) {
            const item = event.results[i];
            if (item.isFinal) {
              finalTranscript += item[0].transcript + ' ';
            } else {
              interimTranscript += item[0].transcript;
            }
          }

          const spoken = (finalTranscript + interimTranscript).trim();
          const base = dictationBaseTextRef.current;

          if (spoken) {
            const updated = base ? `${base} ${spoken}` : spoken;
            setter(updated);
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('Field voice recognition error:', fieldKey, e);
          if (e.error === 'not-allowed') {
            setDictationError('يرجى السماح بالوصول للمايكروفون من إعدادات المتصفح.');
            setTimeout(() => setDictationError(null), 4500);
          }
          stopFieldDictation();
        };

        recognition.onend = () => {
          setActiveDictationField((curr) => (curr === fieldKey ? null : curr));
        };

        recognition.start();
        fieldRecognitionRef.current = recognition;
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        stopFieldDictation();
      }
    },
    [activeDictationField, stopFieldDictation]
  );

  // Reset all fields completely with zero leftover data from previous cases
  const resetFormStateForNewCase = useCallback(() => {
    setSurveyMode('new_case');
    setSelectedCaseId('');
    setPrimaryName('');
    setSecondaryName('');
    setNationalId('');
    setPhone('');
    setGovernorate('');
    setDistrict('');
    setAddress('');
    setDirectionsNote('');
    setGpsData(null);
    setGpsError(null);
    setAssignedResearcher(currentSessionProfile.name || 'أ. هبة الشامي');
    setVisitDate(new Date().toISOString().split('T')[0]);

    setChecklist({
      validAdultIds: true,
      minorBirthCerts: true,
      deathOrDivorceCerts: false,
      medicalProofsRecent: false,
      noExpatriateInFamily: true,
      noRegisteredAssets: true,
    });
    setHousingCondition('rent_unstable');
    setRequestedAidType('كفالة نقدية شهرية');
    setHasChronicIllness(false);
    setChronicIllnessDetails('');
    setMedicalExpenses(0);
    setHealthInsuranceCoverage('none');
    setHealthInsuranceDetails('');

    setDirectIncome(0);
    setIndirectIncome(0);
    setBasicExpenses(0);
    setPriorityScoreLevel(3);

    setHouseholdMembers([
      {
        id: `m-${Date.now()}-1`,
        name: '',
        relation: 'رب الأسرة',
        age: 35,
        maritalStatus: 'متزوج',
        educationLevel: 'إعدادي',
        workCapacity: 'قادر على العمل',
        workStatus: 'يومية غير منتظمة',
        healthStatus: 'سليم',
      },
    ]);

    setCaseSummary('');
    setDebtAndIncomeDetails('');
    stopFieldDictation();
    setObservations('');
    setRecommendations('');
    setRecordedAudioUrl(null);
    setRecordingSeconds(0);
    setCapturedPhotos({
      validAdultIds: '',
      minorBirthCerts: '',
      deathOrDivorceCerts: '',
      medicalProofsRecent: '',
      housingConditionPhotos: '',
    });
    setPreviewModalImage(null);
    setValidationError(null);
    setAudioError(null);
    setCurrentStep(1);
  }, [currentSessionProfile.name, stopFieldDictation]);

  const loadCaseData = useCallback((caseId: string) => {
    const c = cases.find((item) => item.id === caseId);
    if (!c) return;

    setSurveyMode('update_existing');
    setSelectedCaseId(caseId);
    setPrimaryName(c.primaryName || c.fullName || '');
    setSecondaryName(c.secondaryName || '');
    setNationalId(c.nationalId || '');
    setPhone(c.phone || '');
    setGovernorate(c.governorate || '');
    setDistrict(c.district || '');
    setAddress(c.address || '');
    setDirectionsNote(c.directionsNote || '');
    setAssignedResearcher(c.assignedResearcher || currentSessionProfile.name || 'أ. هبة الشامي');
    setVisitDate(new Date().toISOString().split('T')[0]);

    if (c.gpsLocation) {
      setGpsData(c.gpsLocation);
    } else {
      setGpsData(null);
    }
    setGpsError(null);

    setHousingCondition(c.vulnerability?.housingCondition || 'rent_unstable');
    setHasChronicIllness(c.vulnerability?.hasChronicIllness ?? false);
    setChronicIllnessDetails(c.vulnerability?.chronicIllnessDetails || '');
    setMedicalExpenses(c.financials?.medicalExpenses || 0);

    setDirectIncome(c.financials?.directIncome || 0);
    setIndirectIncome(c.financials?.indirectIncome || 0);
    setBasicExpenses(c.financials?.basicExpenses || 0);

    if (c.householdMembers && c.householdMembers.length > 0) {
      setHouseholdMembers(c.householdMembers);
    } else {
      setHouseholdMembers([
        {
          id: `m-${Date.now()}-1`,
          name: c.primaryName || c.fullName || 'رب الأسرة',
          relation: 'رب الأسرة',
          age: 40,
          educationLevel: 'ابتدائي',
          healthStatus: 'سليم',
          workStatus: 'يومية غير منتظمة',
        },
      ]);
    }

    // Map priority
    const pMap: Record<PriorityLevel, 1 | 2 | 3 | 4 | 5> = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 5,
    };
    setPriorityScoreLevel(pMap[c.priority] || 4);

    const rawNotes = c.notes || '';
    const matchSummary = rawNotes.match(/\[مختصر وصف الحالة\]:\s*([^\n]+)/);
    const matchDebt = rawNotes.match(/\[تفاصيل الديون والدخل غير المنتظم\]:\s*([^\n]+)/);
    const matchAidType = rawNotes.match(/\[نوع المساعدة المطلوبة\]:\s*([^\n]+)/);
    const matchInsurance = rawNotes.match(/\[تفاصيل التأمين الصحي\]:\s*([^\n]+)/);

    setRequestedAidType(matchAidType ? matchAidType[1].trim() : 'كفالة نقدية شهرية');
    setHealthInsuranceCoverage('none');
    setHealthInsuranceDetails(matchInsurance ? matchInsurance[1].trim() : '');
    setCaseSummary(matchSummary ? matchSummary[1].trim() : (rawNotes.split('\n')[0] || ''));
    setDebtAndIncomeDetails(matchDebt ? matchDebt[1].trim() : '');
    stopFieldDictation();

    setObservations(c.notes || '');
    setRecommendations('استمرار الدعم وتغطية الفجوة المالية.');
    setRecordedAudioUrl(null);
    setRecordingSeconds(0);
    setCapturedPhotos({
      validAdultIds: '',
      minorBirthCerts: '',
      deathOrDivorceCerts: '',
      medicalProofsRecent: '',
      housingConditionPhotos: '',
    });
    setPreviewModalImage(null);
    setValidationError(null);
    setAudioError(null);
    setCurrentStep(1);
  }, [cases, currentSessionProfile.name, stopFieldDictation]);

  // Initialize data when modal opens or when target case changes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isFieldSurveyModalOpen) {
      wasOpenRef.current = false;
      stopFieldDictation();
      // Clean up audio & timer resources on modal close
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (redirectTimerRef.current) {
        clearInterval(redirectTimerRef.current);
      }
      setIsSubmittedSuccess(false);
      setSubmittedCaseSummary(null);
      return;
    }

    // Only run initialization ONCE when modal transitions from closed to open
    if (!wasOpenRef.current) {
      wasOpenRef.current = true;
      setIsSubmittedSuccess(false);
      setSubmittedCaseSummary(null);
      setCurrentStep(1);

      if (surveyTargetCaseId) {
        loadCaseData(surveyTargetCaseId);
        checkForDraft(`case_${surveyTargetCaseId}`);
      } else {
        resetFormStateForNewCase();
        checkForDraft('new_case_draft');
      }
    }
  }, [isFieldSurveyModalOpen, surveyTargetCaseId, loadCaseData, resetFormStateForNewCase, stopFieldDictation, checkForDraft]);

  // Debounced Auto-Save to IndexedDB (keeps researcher progress safe on every field keystroke)
  useEffect(() => {
    if (!isFieldSurveyModalOpen || isSubmittedSuccess) return;

    // Only auto-save if some user data has been typed
    const hasData =
      primaryName.trim().length > 0 ||
      observations.trim().length > 0 ||
      nationalId.trim().length > 0 ||
      phone.trim().length > 0;

    if (!hasData) return;

    const timer = setTimeout(async () => {
      const draftKey = getDraftKey();
      const draftPayload: SurveyDraft = {
        id: draftKey,
        caseId: surveyMode === 'update_existing' ? selectedCaseId : undefined,
        caseName: primaryName.trim() || undefined,
        surveyMode,
        lastSaved: new Date().toISOString(),
        currentStep,
        data: {
          selectedCaseId,
          primaryName,
          secondaryName,
          nationalId,
          phone,
          governorate,
          district,
          address,
          directionsNote,
          caseSummary,
          requestedAidType,
          hasChronicIllness,
          chronicIllnessDetails,
          medicalExpenses,
          healthInsuranceCoverage,
          healthInsuranceDetails,
          directIncome,
          indirectIncome,
          basicExpenses,
          debtAndIncomeDetails,
          priorityScoreLevel,
          housingCondition,
          checklist,
          householdMembers,
          observations,
          recommendations,
          gpsData,
          capturedPhotos,
          recordedAudioUrl,
        },
      };

      try {
        await saveSurveyDraft(draftPayload);
        setLastSavedTimestamp(
          new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        );
      } catch (err) {
        console.warn('Failed to auto-save draft to IndexedDB:', err);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [
    isFieldSurveyModalOpen,
    isSubmittedSuccess,
    surveyMode,
    selectedCaseId,
    currentStep,
    primaryName,
    secondaryName,
    nationalId,
    phone,
    governorate,
    district,
    address,
    directionsNote,
    caseSummary,
    requestedAidType,
    hasChronicIllness,
    chronicIllnessDetails,
    medicalExpenses,
    healthInsuranceCoverage,
    healthInsuranceDetails,
    directIncome,
    indirectIncome,
    basicExpenses,
    debtAndIncomeDetails,
    priorityScoreLevel,
    housingCondition,
    checklist,
    householdMembers,
    observations,
    recommendations,
    gpsData,
    capturedPhotos,
    recordedAudioUrl,
    getDraftKey,
  ]);

  // Auto-Redirect Countdown when survey is successfully submitted (60 seconds)
  useEffect(() => {
    if (isSubmittedSuccess) {
      setCountdown(60);
      const startTime = Date.now();
      const totalDuration = 60000;

      redirectTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, Math.ceil((totalDuration - elapsed) / 1000));
        setCountdown(remaining);

        if (elapsed >= totalDuration) {
          if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
          setIsSubmittedSuccess(false);
          setSubmittedCaseSummary(null);
          setIsFieldSurveyModalOpen(false);
          setActiveSection('cases');
        }
      }, 250);

      return () => {
        if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
      };
    }
  }, [isSubmittedSuccess, setActiveSection, setIsFieldSurveyModalOpen]);

  // Mobile browser Back Button (Popstate) protection for fullscreen overlay
  useEffect(() => {
    if (!isFieldSurveyModalOpen || isSubmittedSuccess) return;

    try {
      window.history.pushState({ modal: 'mobileFieldSurvey' }, '');
    } catch {
      // ignore
    }

    const handlePopState = () => {
      const hasEnteredData = primaryName.trim().length > 0 || observations.trim().length > 0;
      if (hasEnteredData) {
        try {
          window.history.pushState({ modal: 'mobileFieldSurvey' }, '');
        } catch {
          // ignore
        }
        setShowExitConfirmModal(true);
      } else {
        stopFieldDictation();
        setIsFieldSurveyModalOpen(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isFieldSurveyModalOpen, isSubmittedSuccess, primaryName, observations, setIsFieldSurveyModalOpen, stopFieldDictation]);

  const handleGoToCasesNow = () => {
    if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
    setIsSubmittedSuccess(false);
    setSubmittedCaseSummary(null);
    setIsFieldSurveyModalOpen(false);
    setActiveSection('cases');
  };

  const handleStartAnotherSurvey = () => {
    if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
    setIsSubmittedSuccess(false);
    setSubmittedCaseSummary(null);
    resetFormStateForNewCase();
    setCurrentStep(1);
  };

  const handleModeChange = (newMode: 'update_existing' | 'new_case') => {
    if (newMode === 'new_case') {
      resetFormStateForNewCase();
      checkForDraft('new_case_draft');
    } else {
      setSurveyMode('update_existing');
      if (cases.length > 0) {
        const targetId = selectedCaseId || surveyTargetCaseId || cases[0].id;
        setSelectedCaseId(targetId);
        loadCaseData(targetId);
        checkForDraft(`case_${targetId}`);
      }
    }
  };

  const handleExitToDashboard = () => {
    setIsSubmittedSuccess(false);
    setSubmittedCaseSummary(null);
    setIsFieldSurveyModalOpen(false);
    setActiveSection('dashboard');
  };

  // ----------------------------------------------------
  // GPS Geolocation Handler
  // ----------------------------------------------------
  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      setGpsError('خاصية تحديد الموقع غير مدعومة في هذا المتصفح');
      return;
    }

    setIsCapturingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        const accuracy = Math.round(position.coords.accuracy);
        const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

        setGpsData({
          latitude: lat,
          longitude: lng,
          accuracy,
          mapsUrl,
        });
        setIsCapturingGps(false);
      },
      (error) => {
        setIsCapturingGps(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError('تم رفض إذن الوصول للموقع. يرجى تفعيل الموقع من إعدادات الهاتف.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsError('إشارة GPS غير متوفرة حالياً.');
            break;
          case error.TIMEOUT:
            setGpsError('انتهت مهلة التقاط الموقع، يرجى المحاولة ثانية في مكان مفتوح.');
            break;
          default:
            setGpsError('تعذر تحديد الموقع الجغرافي.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  // ----------------------------------------------------
  // Audio Recording & Web Speech API Handlers
  // ----------------------------------------------------
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(audioUrl);
        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start Timer
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // Start Speech to Text if supported
      startSpeechToText();
      setAudioError(null);
    } catch (err) {
      console.error('Audio capture error:', err);
      setAudioError('يرجى السماح بالوصول للمايكروفون من إعدادات المتصفح لتسجيل الملاحظات الميدانية.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    stopSpeechToText();
  };

  const deleteRecording = () => {
    setRecordedAudioUrl(null);
    setRecordingSeconds(0);
  };

  const startSpeechToText = () => {
    const win = typeof window !== 'undefined' ? (window as IWindow) : null;
    const SpeechRecognitionClass = win?.SpeechRecognition || win?.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setAudioError('خاصية الإملاء الصوتي غير مدعومة في هذا المتصفح');
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'ar-EG';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsTranscribing(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }
        if (transcript.trim()) {
          setObservations((prev) => (prev ? `${prev}\n${transcript.trim()}` : transcript.trim()));
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e);
        setIsTranscribing(false);
      };

      recognition.onend = () => {
        setIsTranscribing(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('Could not start speech recognition:', err);
    }
  };

  const stopSpeechToText = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn(err);
      }
      setIsTranscribing(false);
    }
  };

  // Add Member
  const handleAddMember = () => {
    const newMember: HouseholdMember = {
      id: `m-${Date.now()}`,
      name: '',
      relation: 'ابن',
      age: 12,
      maritalStatus: 'أعزب',
      educationLevel: 'ابتدائي',
      workCapacity: 'طفل / قاصر',
      workStatus: 'طالب',
      healthStatus: 'سليم',
    };
    setHouseholdMembers((prev) => [...prev, newMember]);
  };

  // Remove Member
  const handleRemoveMember = (id: string) => {
    setHouseholdMembers((prev) => prev.filter((m) => m.id !== id));
  };

  // Update Member
  const handleUpdateMember = (id: string, field: keyof HouseholdMember, value: any) => {
    setHouseholdMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  // ----------------------------------------------------
  // Final Save & Submit (Online Direct or Offline Queued)
  // ----------------------------------------------------
  const handleSubmitSurvey = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!primaryName.trim()) {
      setValidationError('يرجى إدخال اسم المستفيد الأساسي لإكمال وحفظ استمارة البحث الميداني.');
      setCurrentStep(1);
      return;
    }
    setValidationError(null);

    const priorityMap: Record<1 | 2 | 3 | 4 | 5, PriorityLevel> = {
      1: 'low',
      2: 'medium',
      3: 'high',
      4: 'critical',
      5: 'critical',
    };

    const nextDueDate = new Date(visitDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + 6);
    const nextDueDateStr = nextDueDate.toISOString().split('T')[0];

    const vulnerabilityData = {
      hasChronicIllness,
      chronicIllnessDetails: hasChronicIllness ? chronicIllnessDetails : undefined,
      isOrphanHousehold: false,
      orphanCount: 0,
      dependentsCount: householdMembers.length,
      housingCondition,
      foodInsecurityLevel: 'severe' as const,
      workCapacity: 'partial' as const,
      confidenceScore: 95,
      incompleteDocuments: !checklist.validAdultIds || !checklist.minorBirthCerts,
      exceptionApproved: false,
    };

    const financialsData = {
      directIncome: Number(directIncome) || 0,
      indirectIncome: Number(indirectIncome) || 0,
      basicExpenses: Number(basicExpenses) || 0,
      medicalExpenses: Number(medicalExpenses) || 0,
      externalAid: 0,
      netFinancialGap,
      estimatedAssistanceNeed: Math.min(3500, Math.max(1200, netFinancialGap)),
    };

    const photosCount = Object.values(capturedPhotos).filter(Boolean).length;
    const totalAttachments = (recordedAudioUrl ? 1 : 0) + photosCount;
    stopFieldDictation();

    const compiledNotes = [
      requestedAidType ? `[نوع المساعدة المطلوبة]: ${requestedAidType}` : '',
      caseSummary.trim() ? `[مختصر وصف الحالة]: ${caseSummary.trim()}` : '',
      observations.trim() ? `[ملاحظات الباحث]: ${observations.trim()}` : '',
      debtAndIncomeDetails.trim() ? `[تفاصيل الديون والدخل غير المنتظم]: ${debtAndIncomeDetails.trim()}` : '',
      healthInsuranceDetails.trim() ? `[تفاصيل التأمين الصحي]: ${healthInsuranceDetails.trim()}` : '',
      recommendations.trim() ? `[التوصيات]: ${recommendations.trim()}` : '',
    ].filter(Boolean).join('\n\n') || observations.trim();

    const draftKey = getDraftKey();
    const isActuallyOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    setIsOfflineSubmission(!isActuallyOnline);

    if (surveyMode === 'update_existing' && selectedCaseId) {
      const caseUpdates = {
        primaryName: primaryName.trim(),
        secondaryName: secondaryName.trim() || undefined,
        nationalId: nationalId.trim(),
        phone: phone.trim(),
        governorate,
        district,
        address: address.trim(),
        directionsNote: directionsNote.trim() || undefined,
        assignedResearcher,
        status: 'active_eligible' as const,
        priority: priorityMap[priorityScoreLevel],
        vulnerability: vulnerabilityData,
        financials: financialsData,
        householdMembers,
        notes: compiledNotes,
        lastAssessmentDate: visitDate,
        lastVisitDate: visitDate,
        nextVisitDueDate: nextDueDateStr,
        isVisitOverdue: false,
        gpsLocation: gpsData || undefined,
      };

      const currentCase = cases.find((c) => c.id === selectedCaseId);
      const visitRecord = {
        caseId: selectedCaseId,
        caseCode: currentCase?.code || 'EHS-???',
        caseName: primaryName.trim(),
        researcherName: assignedResearcher,
        visitDate,
        scheduledNextDate: nextDueDateStr,
        status: 'completed' as const,
        observations: `${observations.trim() || 'تمت المعاينة والتحقق الميداني الشامل.'}\n[ملاحظة السكن: ${housingCondition}]${photosCount > 0 ? `\n[مرفق صور ميدانية: ${photosCount} صورة]` : ''}`,
        recommendedChanges: recommendations.trim() || 'استمرار المساعدة وتغطية الفجوة التقديرية.',
        attachmentsCount: totalAttachments || 1,
        voiceNoteUrl: recordedAudioUrl || undefined,
        gpsLocation: gpsData || undefined,
        checklistSummary: checklist,
      };

      if (!isActuallyOnline) {
        try {
          await enqueueOfflineSurvey({
            surveyMode: 'update_existing',
            caseId: selectedCaseId,
            caseName: primaryName.trim(),
            payload: {
              caseUpdates,
              visitRecord,
            },
          });
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('ehsan_sync_queue_updated'));
          }
        } catch (queueErr) {
          console.warn('Failed to enqueue offline survey:', queueErr);
        }
      }

      // Update in-memory state
      updateCase(selectedCaseId, caseUpdates);
      addVisit(visitRecord);

      try {
        await deleteSurveyDraft(draftKey);
      } catch {
        // ignore
      }

      setSubmittedCaseSummary({
        code: currentCase?.code || 'EHS-101',
        name: primaryName.trim(),
        isNew: false,
        nextDueDate: nextDueDateStr,
      });
      setIsSubmittedSuccess(true);
    } else {
      // Create Brand New Case
      const newCode = `EHS-${cases.length + 101}`;
      const newCasePayload = {
        primaryName: primaryName.trim(),
        secondaryName: secondaryName.trim() || undefined,
        fullName: primaryName.trim(),
        nationalId: nationalId.trim() || `${Date.now()}`.padEnd(14, '0'),
        phone: phone.trim() || '01000000000',
        governorate: governorate || 'القاهرة',
        district: district || 'بولاق الدكرور',
        address: address.trim() || 'العنوان غير مدخل',
        directionsNote: directionsNote.trim() || undefined,
        assignedResearcher,
        registrationDate: visitDate,
        status: 'active_eligible' as const,
        priority: priorityMap[priorityScoreLevel],
        lastAssessmentDate: visitDate,
        lastVisitDate: visitDate,
        nextVisitDueDate: nextDueDateStr,
        householdMembers,
        financials: financialsData,
        vulnerability: vulnerabilityData,
        notes: compiledNotes,
        attachments: [],
        gpsLocation: gpsData || undefined,
      };

      const visitRecord = {
        caseId: 'temp_case_id',
        caseCode: newCode,
        caseName: primaryName.trim(),
        researcherName: assignedResearcher,
        visitDate,
        scheduledNextDate: nextDueDateStr,
        status: 'completed' as const,
        observations: `${observations.trim() || 'بحث ميداني أولي وتسجيل حالة جديدة.'}\n[ملاحظة السكن: ${housingCondition}]${photosCount > 0 ? `\n[مرفق صور ميدانية: ${photosCount} صورة]` : ''}`,
        recommendedChanges: recommendations.trim() || 'اعتماد المساعدة الشهرية المقترحة.',
        attachmentsCount: totalAttachments || 1,
        voiceNoteUrl: recordedAudioUrl || undefined,
        gpsLocation: gpsData || undefined,
        checklistSummary: checklist,
      };

      if (!isActuallyOnline) {
        try {
          await enqueueOfflineSurvey({
            surveyMode: 'new_case',
            caseName: primaryName.trim(),
            payload: {
              newCaseData: newCasePayload,
              visitRecord,
            },
          });
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('ehsan_sync_queue_updated'));
          }
        } catch (queueErr) {
          console.warn('Failed to enqueue offline survey:', queueErr);
        }
      }

      const result = addCase(newCasePayload);
      if (result.success && result.caseId) {
        addVisit({
          ...visitRecord,
          caseId: result.caseId,
        });
      }

      try {
        await deleteSurveyDraft(draftKey);
      } catch {
        // ignore
      }

      setSubmittedCaseSummary({
        code: newCode,
        name: primaryName.trim(),
        isNew: true,
        nextDueDate: nextDueDateStr,
      });
      setIsSubmittedSuccess(true);
    }
  };

  if (!isFieldSurveyModalOpen) return null;

  // ----------------------------------------------------
  // Success Completion Screen (Dedicated View)
  // ----------------------------------------------------
  if (isSubmittedSuccess) {
    const progressPercent = Math.min(100, Math.max(0, ((60 - countdown) / 60) * 100));

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex flex-col h-screen w-screen overflow-y-auto items-center justify-center p-4 sm:p-6 animate-in zoom-in-95 duration-150 text-right">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 text-center space-y-5">
          {/* Animated Success Badge */}
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-25" />
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner ring-8 ring-emerald-50">
              <CheckCircle2 size={44} className="text-emerald-600 animate-in zoom-in duration-200" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              تم توثيق الزيارة واعتماد البحث بنجاح
            </h2>
            {isOfflineSubmission ? (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-amber-950 text-xs space-y-1 text-right mt-2">
                <div className="flex items-center justify-center gap-1.5 font-bold text-amber-900">
                  <HardDrive size={15} className="text-amber-700" />
                  <span>تم الحفظ في طابور المزامنة المحلي (وضع عدم الاتصال)</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed text-center">
                  تم حفظ بيانات الحالة والزيارة الميدانية محلياً في قاعدة IndexedDB على جهازك. سيتم رفع ومزامنة البيانات تلقائياً مع الخادم فور استعادة اتصال الإنترنت.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-medium">
                تم تحديث السجل الميداني للحالة وتوثيق البيانات بنجاح في أرشيف الجمعية
              </p>
            )}
          </div>

          {/* Summary Card */}
          {submittedCaseSummary && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-xs space-y-2.5 text-right shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-semibold">المستفيد / رب الأسرة:</span>
                <span className="font-bold text-slate-900 text-sm">{submittedCaseSummary.name}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-semibold">كود الملف:</span>
                <span className="font-mono font-bold text-teal-800 bg-teal-50 border border-teal-200/60 px-2.5 py-0.5 rounded-lg">
                  {submittedCaseSummary.code}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500 font-semibold">تاريخ الزيارة الميدانية:</span>
                <span className="font-mono font-bold text-slate-800">{visitDate}</span>
              </div>
              <div className="flex items-center justify-between bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/80">
                <span className="text-emerald-900 font-bold flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-emerald-700" />
                  <span>تمديد الصلاحية الرقابية:</span>
                </span>
                <span className="font-mono font-bold text-emerald-800">
                  تاريخ المراجعة (+6 أشهر): {submittedCaseSummary.nextDueDate}
                </span>
              </div>
            </div>
          )}

          {/* Auto-Redirect Progress Bar & Countdown (60 Seconds) */}
          <div className="space-y-2 pt-1 bg-teal-50/50 p-3.5 rounded-2xl border border-teal-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-teal-950 flex items-center gap-1.5 text-right leading-relaxed">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse shrink-0" />
                <span>تم توثيق الزيارة بنجاح وتحديث الصلاحية لـ 6 أشهر.. سيتم التحويل تلقائياً إلى إدارة المستحقين خلال {countdown} ثانية</span>
              </span>
              <span className="font-mono font-bold text-teal-800 shrink-0 mr-2 bg-teal-100 px-2 py-0.5 rounded-md">{countdown}s</span>
            </div>
            <div className="w-full bg-slate-200/80 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-teal-600 to-emerald-600 h-full transition-all duration-200 ease-linear rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Manual Control Buttons */}
          <div className="pt-1 space-y-2.5">
            <button
              type="button"
              onClick={handleGoToCasesNow}
              className="w-full py-3.5 px-6 bg-[#005756] hover:bg-[#004241] text-white font-bold text-sm rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Users size={18} />
              <span>الذهاب إلى إدارة المستحقين الآن</span>
              <ArrowLeft size={16} />
            </button>

            <button
              type="button"
              onClick={handleStartAnotherSurvey}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus size={15} />
              <span>توثيق زيارة لحالة جديدة</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col h-[100dvh] max-h-[100dvh] w-screen overflow-hidden animate-in fade-in duration-150">
      {/* 1. Dynamic Island Styled Header */}
      <div className="px-3.5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#004241] via-[#005251] to-[#005756] text-white flex items-center justify-between shrink-0 shadow-md pt-[max(0.75rem,env(safe-area-inset-top,0px))] relative z-20">
        {/* Right side (اليمين): Circular calm exit/back button (X) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExitToDashboard}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            title="إغلاق الاستمارة والعودة للوحة التحكم"
          >
            <X size={18} />
          </button>

          <div className="hidden md:block">
            <h2 className="font-bold text-xs sm:text-sm leading-tight text-white truncate max-w-[200px]">
              {surveyMode === 'update_existing'
                ? (primaryName ? `توثيق: ${primaryName}` : 'توثيق زيارة ميدانية')
                : 'قيد وبحث ميداني جديد'}
            </h2>
            {lastSavedTimestamp && (
              <span className="text-[10px] text-teal-200/80 block">
                آخر حفظ تلقائي: {lastSavedTimestamp}
              </span>
            )}
          </div>
        </div>

        {/* Center: Dynamic Island Capsule */}
        <div className="flex-1 flex items-center justify-center px-2">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 text-white rounded-full shadow-lg border border-slate-800/80 text-[11px] font-medium tracking-wide transition-all select-none">
            {isOnline ? (
              <>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="whitespace-nowrap">مزامنة مباشرة</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0"></span>
                <span className="whitespace-nowrap text-amber-200">حفظ محلي (أوفلاين)</span>
              </>
            )}
          </div>
        </div>

        {/* Left side (اليسار): Step progress indicator badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-1 rounded-full bg-white/10 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs border border-white/10">
            <span className="text-[10px] text-teal-200 font-medium">الخطوة</span>
            <span className="font-mono text-xs">{currentStep}/4</span>
          </div>
        </div>
      </div>

      {/* 2. Wizard Progress Steps Indicator */}
      <div className="bg-white border-b border-slate-200 py-2.5 px-4 sm:px-8 shrink-0 shadow-2xs">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {[
            { num: 1, label: 'البيانات والموقع', icon: User },
            { num: 2, label: 'فحص المعيشة', icon: ShieldCheck },
            { num: 3, label: 'الصحة والمال', icon: HeartPulse },
            { num: 4, label: 'الملاحظات والصوت', icon: Mic },
          ].map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.num;
            const isDone = currentStep > step.num;
            return (
              <button
                key={step.num}
                type="button"
                onClick={() => {
                  stopFieldDictation();
                  setCurrentStep(step.num as any);
                }}
                className={`flex flex-col items-center gap-1 transition-all duration-150 ease-out active:scale-[0.96] cursor-pointer min-h-[44px] justify-center px-2 ${
                  isActive
                    ? 'text-[#005756] font-bold scale-105'
                    : isDone
                    ? 'text-emerald-700 font-medium'
                    : 'text-slate-400'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors ${
                    isActive
                      ? 'bg-[#005756] text-white ring-4 ring-teal-100 shadow-xs'
                      : isDone
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isDone ? <CheckCircle2 size={16} /> : <Icon size={14} />}
                </div>
                <span className="text-[11px] hidden sm:inline">{step.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Scrollable Main Form Viewport */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <form onSubmit={handleSubmitSurvey} className="max-w-3xl mx-auto space-y-5 text-xs pb-28">
          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0 text-rose-600" />
                <span className="font-semibold">{validationError}</span>
              </div>
              <button
                type="button"
                onClick={() => setValidationError(null)}
                className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {dictationError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0 text-amber-600" />
                <span className="font-semibold">{dictationError}</span>
              </div>
              <button
                type="button"
                onClick={() => setDictationError(null)}
                className="text-amber-600 hover:text-amber-800 p-1 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Modern Clean Draft Recovery Card (Fintech / Web3 Style) */}
          {detectedDraft && (
            <div
              className={`rounded-2xl border border-slate-100 bg-white shadow-sm p-4 relative overflow-hidden transition-all duration-200 ${
                isExitingDraft
                  ? 'opacity-0 -translate-y-2 scale-98 pointer-events-none'
                  : 'opacity-100 translate-y-0 scale-100 animate-in fade-in slide-in-from-top-2 duration-200'
              }`}
            >
              {/* Subtle Ethereal Gradient Overlay at top */}
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-emerald-50/60 via-slate-50/20 to-transparent pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center text-center">
                {/* Centered Circular Icon Badge */}
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2 mx-auto shadow-2xs">
                  <Sparkles size={18} />
                </div>

                {/* Title */}
                <h3 className="font-bold text-slate-900 text-sm text-center">
                  توجد مسودة بحث سابقة
                </h3>

                {/* Case Details & Timestamp */}
                <p className="text-xs text-slate-500 text-center mt-0.5 leading-relaxed">
                  {detectedDraft.caseName ? (
                    <>
                      لحالة <strong className="text-slate-800 font-semibold">{detectedDraft.caseName}</strong> · آخر تعديل: {formatDraftTimeAgo(detectedDraft.lastSaved)}
                    </>
                  ) : (
                    <>آخر تعديل: {formatDraftTimeAgo(detectedDraft.lastSaved)} · انقر للمتابعة من حيث توقفت</>
                  )}
                </p>

                {/* Action Buttons Stack */}
                <div className="w-full max-w-sm mt-3.5 space-y-1.5">
                  <button
                    type="button"
                    onClick={handleRestoreDraftClick}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-medium text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    <span>استعادة المسودة</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDismissDraftClick}
                    className="w-full py-2 rounded-xl text-slate-500 hover:text-slate-800 active:scale-98 text-xs font-normal transition-all cursor-pointer"
                  >
                    بدء استمارة فارغة
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* ========================================================== */}
          {/* STEP 1: IDENTITY, CONTACTS & GEOLOCATION */}
          {/* ========================================================== */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200 slide-in-from-left-2">
              {/* Survey Mode Selection */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
                <span className="text-xs font-bold text-slate-800 block">نوع الإجراء الميداني المطلوب:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleModeChange('update_existing')}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all duration-200 active:scale-[0.96] hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer ${
                      surveyMode === 'update_existing'
                        ? 'bg-[#005756] text-white border-[#005756] shadow-sm ring-2 ring-emerald-500/30'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <RotateCcw size={16} />
                    <span>توثيق زيارة ميدانية لحالة قائمة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange('new_case')}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all duration-200 active:scale-[0.96] hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer ${
                      surveyMode === 'new_case'
                        ? 'bg-[#005756] text-white border-[#005756] shadow-sm ring-2 ring-emerald-500/30'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <Plus size={16} />
                    <span>استمارة قيد وبحث ميداني جديد</span>
                  </button>
                </div>

                {surveyMode === 'update_existing' && (
                  <div className="pt-2 space-y-2">
                    <label className="text-slate-700 font-semibold mb-1 block">
                      اختر الحالة المستهدفة بالزيارة للتعبئة التلقائية:
                    </label>
                    <select
                      value={selectedCaseId}
                      onChange={(e) => {
                        setSelectedCaseId(e.target.value);
                        loadCaseData(e.target.value);
                        checkForDraft(`case_${e.target.value}`);
                      }}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                    >
                      {cases.some((c) => c.status === 'pending_field_research') && (
                        <optgroup label="📋 قائمة الانتظار · تحتاج بحث ميداني أولي">
                          {cases
                            .filter((c) => c.status === 'pending_field_research')
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                [قيد الانتظار] {c.primaryName || c.fullName} {c.secondaryName ? `(${c.secondaryName})` : ''} - [{c.code}] - {c.district}
                              </option>
                            ))}
                        </optgroup>
                      )}
                      <optgroup label="🔄 الحالات القائمة والمستحقة · التحديث الدوري">
                        {cases
                          .filter((c) => c.status !== 'pending_field_research')
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.primaryName || c.fullName} {c.secondaryName ? `(${c.secondaryName})` : ''} - [{c.code}] - {c.district}
                            </option>
                          ))}
                      </optgroup>
                    </select>

                    {/* Informative Banner when selecting a waiting-list case */}
                    {cases.find((c) => c.id === selectedCaseId)?.status === 'pending_field_research' && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 flex items-center gap-2 text-[11px] animate-in fade-in">
                        <Clock size={15} className="text-amber-700 shrink-0" />
                        <span>
                          <strong>حالة بقائمة الانتظار:</strong> عند حفظ واعتماد هذه الاستمارة، ستتحول الحالة تلقائياً من <strong>قائمة الانتظار</strong> إلى <strong>نشطة ومعتمدة</strong> ويبدأ سريان صلاحية الـ 6 أشهر والدخول في جداول الميزانية والتخصيص المالي.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-800 font-bold">
                    الاسم الأساسي لرب الأسرة أو العائل <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="الاسم الرباعي الرسمي..."
                    value={primaryName}
                    onChange={(e) => setPrimaryName(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">
                    الاسم الثانوي / الشهرة <span className="text-slate-400 font-normal">(اختياري)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: أم أحمد / اسم الزوجة أو اللقب..."
                    value={secondaryName}
                    onChange={(e) => setSecondaryName(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* National ID & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">الرقم القومي (14 رقم)</label>
                  <input
                    type="text"
                    maxLength={14}
                    placeholder="2901020010..."
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm font-mono text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">رقم هاتف التواصل الميداني</label>
                  <div className="relative">
                    <input
                      type="tel"
                      placeholder="01012345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-2.5 pl-8 bg-white border border-slate-200 rounded-lg shadow-sm font-mono text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                    />
                    <Phone size={14} className="absolute left-2.5 top-3 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* District & Detailed Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">المحافظة والحي / القرية</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="المحافظة"
                      value={governorate}
                      onChange={(e) => setGovernorate(e.target.value)}
                      className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                    />
                    <input
                      type="text"
                      placeholder="الحي أو القرية"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">العنوان التفصيلي</label>
                  <input
                    type="text"
                    placeholder="الشارع، رقم العقار، الدور، الشقة..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Directions & Landmark */}
              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">طريقة الوصول وعلامة مميزة (Landmark)</label>
                <input
                  type="text"
                  placeholder="مثال: بجوار مسجد النور، مدخل الحارة أمام دكان الحاج فتحي..."
                  value={directionsNote}
                  onChange={(e) => setDirectionsNote(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Case Brief Summary with Voice Dictation */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
                    <span>مختصر وصف الحالة</span>
                  </label>
                  <VoiceDictationButton
                    isListening={activeDictationField === 'caseSummary'}
                    onToggle={() =>
                      toggleFieldDictation('caseSummary', caseSummary, setCaseSummary)
                    }
                    label="مختصر وصف الحالة"
                  />
                </div>
                <textarea
                  rows={2}
                  placeholder="وصف موجز وسريع لطبيعة الأسرة وظروف العائل ومبررات الزيارة الميدانية..."
                  value={caseSummary}
                  onChange={(e) => setCaseSummary(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                />
              </div>

              {/* GPS Geolocation Component */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <MapPin size={15} className="text-rose-600" />
                    <span>تحديد موقع البيت (GPS)</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleCaptureGps}
                    disabled={isCapturingGps}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    {isCapturingGps ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>جاري تحديد الموقع...</span>
                      </>
                    ) : (
                      <>
                        <MapPin size={13} />
                        <span>📍 تحديد موقع البيت الآن</span>
                      </>
                    )}
                  </button>
                </div>

                {gpsData ? (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                    <div>
                      <strong className="block text-emerald-900 font-mono">
                        {gpsData.latitude}, {gpsData.longitude}
                      </strong>
                      <span className="text-emerald-700">
                        تم تحديد موقع البيت بنجاح · دقة الإشارة: ± {gpsData.accuracy || 10} متر
                      </span>
                    </div>

                    <a
                      href={gpsData.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-800 font-bold hover:underline shrink-0"
                    >
                      <span>عرض في Google Maps</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    اضغط الزر أثناء تواجدك عند مسكن الأسرة لحفظ خطوط الطول والعرض وتسهيل وصول الباحثين مستقبلاً.
                  </p>
                )}

                {gpsError && (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] flex items-center gap-1.5">
                    <AlertTriangle size={13} />
                    <span>{gpsError}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* STEP 2: CHECKLIST INSPECTION (CHECK LIST) */}
          {/* ========================================================== */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200 slide-in-from-left-2">
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                <ShieldCheck size={16} className="text-amber-700 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>قائمة الفحص الميداني والتحقق (Check List):</strong> يرجى التأكد العيني المباشر من مطابقة الثبوتيات أثناء الزيارة المنزلية قبل التوصية بالصرف.
                </p>
              </div>

              {/* Toggles List with Quick Camera Uploads */}
              <div className="space-y-3">
                {[
                  {
                    key: 'validAdultIds',
                    label: 'بطاقات الرقم القومي سارية (وش وضهر)',
                    desc: 'التأكد من سريان بطاقات رب الأسرة والزوجة والمعالين البالغين.',
                    hasPhoto: true,
                    photoPrompt: 'تصوير بطاقات الرقم القومي (وش وضهر)',
                  },
                  {
                    key: 'minorBirthCerts',
                    label: 'شهادات الميلاد المميكنة للقصر والأبناء',
                    desc: 'للتحقق من العدد الفعلي للمقيدين بالمدرسة وعدد المعالين.',
                    hasPhoto: true,
                    photoPrompt: 'تصوير شهادات ميلاد القصر',
                  },
                  {
                    key: 'deathOrDivorceCerts',
                    label: 'شهادة الوفاة / قسيمة الطلاق (إن وجدت الحالة)',
                    desc: 'لأسر الأيتام والمطلقات والأرامل لإثبات صفة العائل المنفرد.',
                    hasPhoto: true,
                    photoPrompt: 'تصوير شهادة الوفاة أو قسيمة الطلاق',
                  },
                  {
                    key: 'medicalProofsRecent',
                    label: 'الإثباتات والتقارير والفحوصات الطبية الحديثة',
                    desc: 'روشتات معتمدة حديثة أو تقرير مستشفى حكومي لا يتجاوز 6 أشهر.',
                    hasPhoto: true,
                    photoPrompt: 'تصوير الروشتات والتقارير الطبية',
                  },
                  {
                    key: 'noExpatriateInFamily',
                    label: 'التحقق والاطمئنان لعدم وجود فرد مغترب بالخارج',
                    desc: 'التأكد من عدم وجود مصدر دخل خارجي أو مسافر يعول الأسرة.',
                    hasPhoto: false,
                  },
                  {
                    key: 'noRegisteredAssets',
                    label: 'التحقق والتحري من عدم وجود أملاك (عقار أو أرض أو سيارة)',
                    desc: 'الاستعلام عن عدم امتلاك حيازة زراعية أو مركبة أو عقار تجاري مدر للدخل.',
                    hasPhoto: false,
                  },
                ].map((item) => {
                  const val = (checklist as any)[item.key];
                  const hasCaptured = Boolean(capturedPhotos[item.key]);

                  return (
                    <div
                      key={item.key}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        val
                          ? 'bg-emerald-50/40 border-emerald-300/80 shadow-2xs'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      {/* Primary Toggle Row */}
                      <div className="flex items-center justify-between gap-3">
                        <div
                          onClick={() =>
                            setChecklist((prev) => ({
                              ...prev,
                              [item.key]: !val,
                            }))
                          }
                          className="space-y-0.5 flex-1 cursor-pointer select-none"
                        >
                          <span
                            className={`font-bold text-xs block ${
                              val ? 'text-emerald-950' : 'text-slate-800'
                            }`}
                          >
                            {item.label}
                          </span>
                          <p className="text-[11px] text-slate-500 leading-tight">{item.desc}</p>
                        </div>

                        {/* Interactive Toggle Switch */}
                        <button
                          type="button"
                          onClick={() =>
                            setChecklist((prev) => ({
                              ...prev,
                              [item.key]: !val,
                            }))
                          }
                          className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 cursor-pointer ${
                            val ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                          }`}
                          title={val ? 'مكتمل ومتحقق منه' : 'غير متوفر'}
                        >
                          <div className="bg-white w-4 h-4 rounded-full shadow-xs" />
                        </button>
                      </div>

                      {/* Optional Camera Capture Row (for document checklist items) */}
                      {item.hasPhoto && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                          {hasCaptured ? (
                            <div className="flex items-center justify-between gap-2 w-full bg-white p-2 rounded-xl border border-emerald-200 shadow-2xs">
                              <div
                                onClick={() =>
                                  setPreviewModalImage({
                                    title: item.label,
                                    url: capturedPhotos[item.key],
                                  })
                                }
                                className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 cursor-pointer shrink-0 group hover:opacity-90 transition-opacity bg-slate-100"
                                title="اضغط لمعاينة الصورة بالحجم الكامل"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={capturedPhotos[item.key]}
                                  alt={item.label}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Eye size={14} className="text-white" />
                                </div>
                              </div>

                              <div className="flex-1 min-w-0 pr-1 text-right">
                                <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                                  <span>تم التقاط الصورة</span>
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate">
                                  انقر على المصغرة للمعاينة
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <label
                                  className="p-1.5 rounded-lg text-teal-700 hover:text-teal-900 hover:bg-teal-50 cursor-pointer transition-colors"
                                  title="استبدال الصورة بالكاميرا"
                                >
                                  <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={(e) => handlePhotoCapture(item.key, e)}
                                  />
                                  <RefreshCw size={14} />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleRemovePhoto(item.key)}
                                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
                                  title="حذف الصورة"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between w-full">
                              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50/70 hover:bg-teal-100/80 text-[#005756] text-xs font-bold transition-all active:scale-98 shadow-2xs">
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="hidden"
                                  onChange={(e) => handlePhotoCapture(item.key, e)}
                                />
                                <Camera size={14} className="text-teal-700 shrink-0" />
                                <span>التقاط صورة بالكاميرا</span>
                              </label>
                              <span className="text-[10px] text-slate-400 font-medium">
                                اختياري (لا يعطل الحفظ)
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Housing Condition Selection */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <label className="font-bold text-slate-900 block text-xs">
                  الحالة السكنية وطبيعة المأوى:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { val: 'rent_unstable', label: 'إيجار غير مستقر / مهدد' },
                    { val: 'rent_stable', label: 'إيجار منتظم' },
                    { val: 'owned', label: 'ملك بسيط' },
                    { val: 'dilapidated_urgent', label: 'سقف خشب متهالك / آيل للسقوط' },
                  ].map((h) => (
                    <button
                      key={h.val}
                      type="button"
                      onClick={() => setHousingCondition(h.val as any)}
                      className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                        housingCondition === h.val
                          ? 'bg-[#005756] text-white border-[#005756] shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>

                {/* Item 5: Quick Camera Capture for Shelter / Housing Photos */}
                <div className="pt-2 border-t border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Home size={14} className="text-teal-700" />
                      <span>صور السكن / المأوى المتضرر (اختياري)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      اختياري (سقف، جدران، مرافق)
                    </span>
                  </div>

                  {capturedPhotos.housingConditionPhotos ? (
                    <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                      <div
                        onClick={() =>
                          setPreviewModalImage({
                            title: 'صور السكن والمأوى المتضرر',
                            url: capturedPhotos.housingConditionPhotos,
                          })
                        }
                        className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 cursor-pointer shrink-0 group hover:opacity-90 transition-opacity bg-slate-100"
                        title="انقر لتكبير صورة المسكن"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={capturedPhotos.housingConditionPhotos}
                          alt="صورة المسكن"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye size={16} className="text-white" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 pr-1 text-right">
                        <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                          <span>تم توثيق صورة المسكن</span>
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate">
                          انقر على المصغرة لمعاينة الصورة بالحجم الكامل
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <label
                          className="p-2 rounded-xl text-teal-700 hover:text-teal-900 hover:bg-teal-50 cursor-pointer transition-colors"
                          title="استبدال صورة المسكن بالكاميرا"
                        >
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => handlePhotoCapture('housingConditionPhotos', e)}
                          />
                          <RefreshCw size={15} />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto('housingConditionPhotos')}
                          className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer transition-colors"
                          title="حذف صورة المسكن"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                      <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-teal-300 bg-white hover:bg-teal-50/70 text-[#005756] text-xs font-bold transition-all shadow-2xs active:scale-98">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handlePhotoCapture('housingConditionPhotos', e)}
                        />
                        <Camera size={15} className="text-teal-700 shrink-0" />
                        <span>📸 التقاط صورة لمسكن الأسرة بالكاميرا</span>
                      </label>
                      <span className="text-[11px] text-slate-400">
                        رفع الصور اختياري ولا يعيق الاعتماد في حال ضعف الإنترنت
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* STEP 3: HEALTH, FINANCIAL & FAMILY ASSESSMENT */}
          {/* ========================================================== */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200 slide-in-from-left-2">
              {/* Requested Aid Type Selection */}
              <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-teal-950 text-xs flex items-center gap-1.5">
                    <HeartHandshake size={15} className="text-teal-700" />
                    <span>نوع المساعدة المطلوبة (المستهدفة بالبحث الميداني) <span className="text-rose-600">*</span></span>
                  </label>
                  <span className="text-[10px] text-teal-800 font-bold bg-white px-2 py-0.5 rounded border border-teal-200">
                    تصنيف الاستحقاق
                  </span>
                </div>
                <select
                  value={requestedAidType}
                  onChange={(e) => setRequestedAidType(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm text-xs font-bold text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                >
                  <option value="كفالة نقدية شهرية">كفالة نقدية شهرية (إعانة كفاف دورية)</option>
                  <option value="مساعدة علاجية / أدوية">مساعدة علاجية / أدوية لأمراض مزمنة</option>
                  <option value="إجراء عملية جراحية">إجراء عملية جراحية وتدخل طبي عاجل</option>
                  <option value="سداد ديون وغارمات">سداد ديون وغارمات / تفريج كرب</option>
                  <option value="تحسين وترميم مسكن / سقف">تحسين وترميم مسكن / سقف وحماية</option>
                  <option value="إطعام وسلة غذائية">إطعام وسلة غذائية / دعم معيشي</option>
                  <option value="أجهزة تعويضية">أجهزة تعويضية وكراسي متحركة / ذوي همم</option>
                  <option value="أخرى">أخرى (مساعدة استثنائية مشروطة)</option>
                </select>
              </div>

              {/* Health Assessment */}
              <div className="p-3.5 bg-rose-50/50 border border-rose-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-950 flex items-center gap-1.5 text-xs">
                    <HeartPulse size={15} className="text-rose-600" />
                    <span>التقييم الصحي وتكاليف العلاج</span>
                  </span>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[11px] font-semibold text-slate-700">أمراض مزمنة أو عجز؟</span>
                    <input
                      type="checkbox"
                      checked={hasChronicIllness}
                      onChange={(e) => setHasChronicIllness(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                  </label>
                </div>

                {hasChronicIllness && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div className="sm:col-span-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-700 font-semibold text-[11px]">
                          توصيف الحالات المرضية وتفاصيل العلاج
                        </label>
                        <VoiceDictationButton
                          isListening={activeDictationField === 'chronicIllnessDetails'}
                          onToggle={() =>
                            toggleFieldDictation('chronicIllnessDetails', chronicIllnessDetails, setChronicIllnessDetails)
                          }
                          label="الحالة المرضية والعلاج"
                        />
                      </div>
                      <textarea
                        rows={2}
                        placeholder="مثال: غسيل كلوي مرتين أسبوعياً، أدوية سكر وضغط، تقارير قلب..."
                        value={chronicIllnessDetails}
                        onChange={(e) => setChronicIllnessDetails(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg shadow-sm text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-700 font-semibold text-[11px]">
                        تكلفة العلاج الشهرية (ج.م)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={medicalExpenses}
                        onChange={(e) => setMedicalExpenses(Number(e.target.value) || 0)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg shadow-sm font-mono text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Health Insurance & State-Funded Treatment Section */}
                <div className="pt-2.5 border-t border-rose-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-800 font-bold text-[11px]">موقف التأمين الصحي والعلاج على نفقة الدولة</label>
                    <span className="text-[10px] text-slate-500 font-medium">الوضع التأميني الرسمي</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'government_insurance', label: 'تأمين صحي شامل' },
                      { id: 'state_funded_treatment', label: 'علاج على نفقة الدولة' },
                      { id: 'none', label: 'لا يوجد تأمين' },
                      { id: 'in_progress', label: 'قيد الاستخراج' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setHealthInsuranceCoverage(opt.id as any)}
                        className={`p-2 rounded-lg border text-center text-[11px] font-bold transition-all cursor-pointer ${
                          healthInsuranceCoverage === opt.id
                            ? 'bg-rose-700 text-white border-rose-700 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-600 font-semibold text-[10px]">ملاحظات وتفاصيل التغطية التأمينية والقرارات</label>
                      <VoiceDictationButton
                        isListening={activeDictationField === 'healthInsuranceDetails'}
                        onToggle={() => toggleFieldDictation('healthInsuranceDetails', healthInsuranceDetails, setHealthInsuranceDetails)}
                        label="تفاصيل التأمين"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="مثال: يوجد قرار نفقة دولة يحتاج تجديد، أو بطاقة تأمين صحي معطلة، أو نقص أدوية أورام..."
                      value={healthInsuranceDetails}
                      onChange={(e) => setHealthInsuranceDetails(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg shadow-sm text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Inputs & Auto Gap Calculation */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <Coins size={15} className="text-teal-700" />
                  <span>المعادلة المالية والفجوة المعيشية الصافية</span>
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold text-[11px]">
                      دخل ثابت (معاش/تأمين)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={directIncome}
                      onChange={(e) => setDirectIncome(Number(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg shadow-sm font-mono text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold text-[11px]">
                      دخل غير مباشر (يومية/حِرف)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={indirectIncome}
                      onChange={(e) => setIndirectIncome(Number(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg shadow-sm font-mono text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1 space-y-1">
                    <label className="text-slate-700 font-semibold text-[11px]">
                      مصاريف المعيشة والإيجار
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={basicExpenses}
                      onChange={(e) => setBasicExpenses(Number(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg shadow-sm font-mono text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Debt & Irregular Income Details with Voice Dictation */}
                <div className="space-y-1 pt-2 border-t border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-700 font-semibold text-[11px]">
                      تفاصيل الديون ومصادر الدخل غير المنتظمة
                    </label>
                    <VoiceDictationButton
                      isListening={activeDictationField === 'debtAndIncomeDetails'}
                      onToggle={() =>
                        toggleFieldDictation('debtAndIncomeDetails', debtAndIncomeDetails, setDebtAndIncomeDetails)
                      }
                      label="تفاصيل الديون والدخل"
                    />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="حصر الديون (إيصالات أمانة، تجار البقالة، إيجار متأخر) وتفاصيل اليومية والعمل المتقطع واليومي..."
                    value={debtAndIncomeDetails}
                    onChange={(e) => setDebtAndIncomeDetails(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg shadow-sm text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                  />
                </div>

                {/* Auto-Calculated Net Financial Gap Banner */}
                <div className="p-3 bg-gradient-to-r from-teal-900 to-teal-800 text-white rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-teal-200 block">الفجوة المالية الشهرية المحتسبة آلياً:</span>
                    <strong className="text-base font-mono" suppressHydrationWarning>
                      {netFinancialGap.toLocaleString('en-US')} ج.م / شهرياً
                    </strong>
                  </div>

                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white/20 text-white">
                    {netFinancialGap > 2000 ? 'عجز مالي حاد' : netFinancialGap > 1000 ? 'عجز متوسط' : 'فجوة طفيفة'}
                  </span>
                </div>
              </div>

              {/* Family Members 7-Attribute Responsive Cards */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                      <User size={15} className="text-slate-600" />
                      <span>جدول أفراد الأسرة المقيمين بالمنزل ({householdMembers.length})</span>
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      توثيق كافة أفراد الأسرة المقيمين (البيانات المدنية والتعليمية والتشغيلية)
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="px-2.5 py-1.5 bg-teal-100 hover:bg-teal-200 text-teal-900 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <Plus size={13} />
                    <span>إضافة فرد</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-0.5">
                  {householdMembers.map((m, idx) => (
                    <div
                      key={m.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-2xs relative"
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-teal-100 text-[#005756] text-[11px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {m.name || `فرد ${idx + 1}`} ({m.relation || 'صلة القرابة'})
                          </span>
                        </div>
                        {householdMembers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.id)}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded-md hover:bg-rose-50 cursor-pointer"
                            title="حذف الفرد"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      {/* Line 1: Basic Identifiers (Name, Relation, Age) */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-6 space-y-0.5">
                          <label className="text-[10px] font-semibold text-slate-500">الاسم بالكامل</label>
                          <input
                            type="text"
                            placeholder="الاسم الرباعي أو الثلاثي"
                            value={m.name}
                            onChange={(e) => handleUpdateMember(m.id, 'name', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg shadow-sm text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                          />
                        </div>
                        <div className="sm:col-span-4 space-y-0.5">
                          <label className="text-[10px] font-semibold text-slate-500">صلة القرابة</label>
                          <select
                            value={m.relation}
                            onChange={(e) => handleUpdateMember(m.id, 'relation', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg shadow-sm text-xs text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                          >
                            <option value="رب الأسرة">رب الأسرة</option>
                            <option value="زوجة">زوجة</option>
                            <option value="ابن">ابن</option>
                            <option value="ابنة">ابنة</option>
                            <option value="أم">أم</option>
                            <option value="أب">أب</option>
                            <option value="أخ / أخت">أخ / أخت</option>
                            <option value="حفيد / حفيدة">حفيد / حفيدة</option>
                            <option value="آخر">آخر</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2 space-y-0.5">
                          <label className="text-[10px] font-semibold text-slate-500">السن</label>
                          <input
                            type="number"
                            min="0"
                            max="120"
                            placeholder="السن"
                            value={m.age}
                            onChange={(e) => handleUpdateMember(m.id, 'age', Number(e.target.value))}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg shadow-sm text-xs text-center font-mono text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      {/* Line 2: Social, Educational & Employment Attributes (Marital, Education, Capacity, Work) */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100">
                        <div className="space-y-0.5">
                          <label className="text-[10px] font-semibold text-slate-500">الحالة الاجتماعية</label>
                          <select
                            value={m.maritalStatus || 'أعزب'}
                            onChange={(e) => handleUpdateMember(m.id, 'maritalStatus', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg shadow-sm text-[11px] text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                          >
                            <option value="متزوج">متزوج</option>
                            <option value="أعزب">أعزب</option>
                            <option value="أرمل">أرمل</option>
                            <option value="مطلق">مطلق</option>
                            <option value="قاصر / طفل">قاصر / طفل</option>
                          </select>
                        </div>

                        <div className="space-y-0.5">
                          <label className="text-[10px] font-semibold text-slate-500">الحالة الدراسية / التعليم</label>
                          <select
                            value={m.educationLevel || 'ابتدائي'}
                            onChange={(e) => handleUpdateMember(m.id, 'educationLevel', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg shadow-sm text-[11px] text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                          >
                            <option value="ابتدائي">ابتدائي</option>
                            <option value="إعدادي">إعدادي</option>
                            <option value="ثانوي">ثانوي</option>
                            <option value="دبلوم / فني">دبلوم / فني</option>
                            <option value="جامعي">جامعي</option>
                            <option value="أمي / بدون تعليم">أمي / بدون تعليم</option>
                            <option value="طفل دون سن الدراسة">طفل دون سن الدراسة</option>
                          </select>
                        </div>

                        <div className="space-y-0.5">
                          <label className="text-[10px] font-semibold text-slate-500">القدرة على العمل</label>
                          <select
                            value={m.workCapacity || 'قادر على العمل'}
                            onChange={(e) => handleUpdateMember(m.id, 'workCapacity', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg shadow-sm text-[11px] text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                          >
                            <option value="قادر على العمل">قادر على العمل</option>
                            <option value="عاجز كلياً">عاجز كلياً</option>
                            <option value="عاجز جزئياً أو مسن">عاجز جزئياً أو مسن</option>
                            <option value="طفل / قاصر">طفل / قاصر</option>
                          </select>
                        </div>

                        <div className="space-y-0.5">
                          <label className="text-[10px] font-semibold text-slate-500">العمل الحالي ومصدر الدخل</label>
                          <select
                            value={m.workStatus || 'لا يعمل'}
                            onChange={(e) => handleUpdateMember(m.id, 'workStatus', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg shadow-sm text-[11px] text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                          >
                            <option value="لا يعمل">لا يعمل</option>
                            <option value="يومية غير منتظمة">يومية غير منتظمة</option>
                            <option value="عامل / موظف">عامل / موظف</option>
                            <option value="طالب">طالب</option>
                            <option value="ربة منزل">ربة منزل</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority Rating Selector (1 to 5) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 text-xs">
                    تصنيف درجة أولوية الحالة وفق تقدير الباحث:
                  </label>
                  <span className="font-mono font-bold text-xs text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                    {priorityScoreLevel} من 5
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { lvl: 1, label: '1 - منخفضة' },
                    { lvl: 2, label: '2 - متوسطة' },
                    { lvl: 3, label: '3 - مرتفعة' },
                    { lvl: 4, label: '4 - حرجة' },
                    { lvl: 5, label: '5 - قصوى' },
                  ].map((p) => (
                    <button
                      key={p.lvl}
                      type="button"
                      onClick={() => setPriorityScoreLevel(p.lvl as any)}
                      className={`py-2 px-1 rounded-lg text-center font-bold text-[11px] transition-colors ${
                        priorityScoreLevel === p.lvl
                          ? 'bg-[#005756] text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* STEP 4: NOTES, VOICE RECORDING & SPEECH-TO-TEXT */}
          {/* ========================================================== */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200 slide-in-from-left-2">
              {/* Audio Recording & Speech to Text Widget */}
              <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-rose-500 animate-ping' : 'bg-teal-400'}`} />
                    <span className="font-bold text-xs">التسجيل الصوتي الشفهي للباحث</span>
                  </div>

                  {sttSupported && (
                    <span className="text-[11px] text-teal-300 font-medium flex items-center gap-1">
                      <span>تحدث بالصوت</span>
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed">
                  تسجيل الانطباع الشفهي وملاحظات المعاينة الميدانية مع ميزة التحدث بالصوت والكتابة الفورية.
                </p>

                {audioError && (
                  <div className="p-2.5 bg-rose-500/20 border border-rose-400/30 rounded-xl text-rose-200 text-[11px] flex items-center gap-2">
                    <AlertTriangle size={14} className="shrink-0 text-rose-300" />
                    <span>{audioError}</span>
                  </div>
                )}

                {/* Recording Controls */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center gap-2 text-xs shadow-md transition-colors"
                    >
                      <Mic size={15} />
                      <span>{recordedAudioUrl ? 'إعادة تسجيل ملاحظة صوتية' : 'بدء التسجيل الصوتي'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl flex items-center gap-2 text-xs shadow-md animate-pulse"
                    >
                      <Square size={15} />
                      <span>إيقاف وحفظ التسجيل ({recordingSeconds} ثانية)</span>
                    </button>
                  )}

                  {isTranscribing && (
                    <span className="text-[11px] text-teal-300 flex items-center gap-1 animate-pulse">
                      <span>جاري الاستماع والتفريغ للنص...</span>
                    </span>
                  )}
                </div>

                {/* Audio Player if recorded */}
                {recordedAudioUrl && !isRecording && (
                  <div className="p-3 bg-white/10 rounded-xl border border-white/10 space-y-2 pt-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 text-emerald-300 font-bold">
                        <CheckCircle2 size={13} />
                        <span>تم حفظ التسجيل الصوتي ({recordingSeconds} ث)</span>
                      </span>

                      <button
                        type="button"
                        onClick={deleteRecording}
                        className="text-rose-300 hover:text-rose-100 flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        <span>حذف</span>
                      </button>
                    </div>

                    <audio src={recordedAudioUrl} controls className="w-full h-8" />
                  </div>
                )}
              </div>

              {/* Observations Text Area (Receives Voice Transcription or Manual Typing) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-bold">
                    مشاهدات وملاحظات الباحث الميدانية <span className="text-rose-600">*</span>
                  </label>
                  <VoiceDictationButton
                    isListening={activeDictationField === 'observations'}
                    onToggle={() =>
                      toggleFieldDictation('observations', observations, setObservations)
                    }
                    label="ملاحظات الباحث"
                  />
                </div>
                <textarea
                  required
                  rows={4}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="رصد واقع المسكن، سلامة السقف، أثاث المنزل، عمل الأطفال، الحالة الصحية الفعلية..."
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Recommendations */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 font-semibold">
                    توصية الباحث الميداني بمبلغ ونوع المساعدة
                  </label>
                  <VoiceDictationButton
                    isListening={activeDictationField === 'recommendations'}
                    onToggle={() =>
                      toggleFieldDictation('recommendations', recommendations, setRecommendations)
                    }
                    label="توصيات الباحث"
                  />
                </div>
                <textarea
                  rows={2}
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  placeholder="مثال: توصية بمساعدة مالية 2,500 ج.م شهرياً + كرتونة إطعام + مساهمة في علاج السكر..."
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Approval Summary Banner */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900">
                  <CheckCircle2 size={15} className="text-emerald-700" />
                  <span>تحديث تاريخ المراجعة تلقائياً (+6 أشهر)</span>
                </div>
                <p className="text-[11px] text-emerald-800/90 leading-relaxed">
                  عند الاعتماد: يتم تمديد موعد المتابعة القادمة لـ 6 أشهر وتحديث السجل الميداني للحالة وتوثيقه في أرشيف الزيارات وسجل التدقيق والرقابة.
                </p>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Dedicated Sticky Bottom Navigation Bar */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3 px-3.5 sm:px-8 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-lg shrink-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => {
                stopFieldDictation();
                setCurrentStep((prev) => (prev - 1) as any);
              }}
              className="px-4 py-2.5 min-h-[46px] border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-all duration-150 ease-out active:scale-[0.96] hover:-translate-y-0.5 flex items-center gap-1.5 text-xs cursor-pointer shadow-xs"
            >
              <ArrowRight size={16} />
              <span>السابق</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleExitToDashboard}
              className="px-4 py-2.5 min-h-[46px] border border-slate-300 hover:bg-slate-100 text-slate-600 font-semibold rounded-xl transition-all duration-150 ease-out active:scale-[0.96] hover:-translate-y-0.5 text-xs cursor-pointer shadow-xs"
            >
              إلغاء والعودة
            </button>
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={() => {
                stopFieldDictation();
                setCurrentStep((prev) => (prev + 1) as any);
              }}
              className="px-6 py-2.5 min-h-[46px] bg-[#005756] hover:bg-[#004241] text-white font-bold rounded-xl transition-all duration-150 ease-out active:scale-[0.96] hover:-translate-y-0.5 flex items-center gap-1.5 text-xs shadow-md cursor-pointer"
            >
              <span>التالي ({currentStep + 1}/4)</span>
              <ArrowLeft size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmitSurvey}
              className="px-6 py-2.5 min-h-[46px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition-all duration-150 ease-out active:scale-[0.96] hover:-translate-y-0.5 flex items-center gap-2 text-xs shadow-md cursor-pointer"
            >
              <CheckCircle2 size={16} />
              <span>
                {surveyMode === 'update_existing'
                  ? 'حفظ واعتماد الزيارة الميدانية'
                  : 'حفظ وقيد الحالة واعتماد الزيارة'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewModalImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewModalImage(null)}
        >
          <div
            className="relative max-w-lg w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-4 space-y-3 border border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between text-white pb-2 border-b border-slate-800">
              <span className="text-xs font-bold truncate">{previewModalImage.title}</span>
              <button
                type="button"
                onClick={() => setPreviewModalImage(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white transition-colors cursor-pointer"
                title="إغلاق المعاينة"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex items-center justify-center max-h-[70vh] overflow-hidden rounded-xl bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewModalImage.url}
                alt={previewModalImage.title}
                className="max-h-[70vh] w-auto max-w-full object-contain"
              />
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setPreviewModalImage(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                إغلاق المعاينة
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Exit Confirmation Modal (Mobile Back-Button / Popstate Protection) */}
      {showExitConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-70 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 border border-slate-200 space-y-4 text-right">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertCircle size={26} />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 text-sm">
                تأكيد مغادرة استمارة البحث الميداني
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                توجد بيانات تم تدوينها بالاستمارة. هل أنت متأكد من الخروج وإلغاء المسودة الحالية؟
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="w-full py-2.5 px-3 bg-[#005756] hover:bg-[#004241] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer active:scale-98"
              >
                متابعة الاستكمال
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowExitConfirmModal(false);
                  stopFieldDictation();
                  setIsFieldSurveyModalOpen(false);
                }}
                className="w-full py-2.5 px-3 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer active:scale-98"
              >
                نعم، إلغاء والخروج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
