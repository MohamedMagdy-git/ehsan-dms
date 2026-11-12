'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
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
} from 'lucide-react';
import { CaseStudyReport, CaseStudyFamilyMember, PriorityLevel, HousingFacilities } from '@/types';
import { ResearcherSelect } from '@/components/cases/researcher-select';

const DRAFT_STORAGE_KEY = 'ehsan_case_study_draft_v1';

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
  const {
    isFieldSurveyModalOpen,
    setIsFieldSurveyModalOpen,
    surveyTargetCaseId,
    cases,
    submitCaseStudyReport,
    currentSessionProfile,
    setActiveSection,
  } = useApp();

  // Wizard Step: Single atomic questions (1 to 23)
  const [currentQuestion, setCurrentQuestion] = useState<number>(1);
  const totalQuestions = 23;

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  // Completion / Success state
  const [isSuccessSubmitted, setIsSuccessSubmitted] = useState(false);
  const [submittedSummary, setSubmittedSummary] = useState<{
    caseName: string;
    gap: number;
    researcher: string;
    membersCount: number;
  } | null>(null);

  // Draft restored state
  const [hasDraftAvailable, setHasDraftAvailable] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

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
  const [priorityLevel, setPriorityLevel] = useState<PriorityLevel>('high');
  const [housingStatus, setHousingStatus] = useState<string>('إيجار غير مستقر / مهدد بالإخلاء');
  const [caseSummary, setCaseSummary] = useState('');
  const [landmarkAddress, setLandmarkAddress] = useState('');

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

  const [additionalNotesAndRemarks, setAdditionalNotesAndRemarks] = useState(
    'الحالة مستحقة للدعم المالي الشهري العاجل مع سداد متأخرات الإيجار لتفادي الطرد وتوفير علاج شهري.'
  );

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

  // ----------------------------------------------------
  // Load target case data if modal was opened for an existing case
  // ----------------------------------------------------
  const loadTargetCase = useCallback(
    (caseId: string) => {
      const target = cases.find((c) => c.id === caseId);
      if (!target) return;

      setCaseName(target.primaryName || target.fullName || '');
      setVisitorName(target.assignedResearcher || currentSessionProfile.name || 'أ. هبة الشامي');
      setContactPhone(target.phone || '');
      setAddress(`${target.governorate || 'القاهرة'} - ${target.district || 'بولاق الدكرور'} - ${target.address || ''}`);
      setPriorityLevel(target.priority || 'high');

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
        setBasicIncomeAmount(target.financials.directIncome || 600);
        setAdditionalIncomeAmount(target.financials.indirectIncome || 400);
        setMonthlyBasicExpenses(target.financials.basicExpenses || 2400);
        setMonthlyMedicalCosts(target.financials.medicalExpenses || 450);
      }

      if (target.notes) {
        setCaseSummary(target.notes.slice(0, 200));
        setAdditionalNotesAndRemarks(target.notes);
      }
    },
    [cases, currentSessionProfile.name]
  );

  // Initialize modal state on mount or open
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isFieldSurveyModalOpen) {
      setIsSuccessSubmitted(false);
      setSubmittedSummary(null);
      setCurrentQuestion(1);
      setActiveMemberIndex(0);
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

    if (surveyTargetCaseId) {
      loadTargetCase(surveyTargetCaseId);
    } else {
      try {
        const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed && parsed.caseName) {
            setHasDraftAvailable(true);
            setLastSavedTime(
              parsed.savedAt
                ? new Date(parsed.savedAt).toLocaleTimeString('ar-EG', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : null
            );
          }
        }
      } catch {
        // ignore
      }

      if (!visitorName) {
        setVisitorName(currentSessionProfile.name || 'أ. هبة الشامي');
      }
    }
  }, [isFieldSurveyModalOpen, surveyTargetCaseId, loadTargetCase, currentSessionProfile.name, visitorName]);

  // Restore draft
  const handleRestoreDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!saved) return;
      const d = JSON.parse(saved);
      if (d.caseName) setCaseName(d.caseName);
      if (d.visitorName) setVisitorName(d.visitorName);
      if (d.contactPhone) setContactPhone(d.contactPhone);
      if (d.secondaryPhone) setSecondaryPhone(d.secondaryPhone);
      if (d.address) setAddress(d.address);
      if (d.referralSource) setReferralSource(d.referralSource);
      if (d.priorityLevel) setPriorityLevel(d.priorityLevel);
      if (d.housingStatus) setHousingStatus(d.housingStatus);
      if (d.caseSummary) setCaseSummary(d.caseSummary);
      if (d.landmarkAddress) setLandmarkAddress(d.landmarkAddress);
      if (d.roofType) setRoofType(d.roofType);
      if (d.waterConnection) setWaterConnection(d.waterConnection);
      if (d.electricityMeter) setElectricityMeter(d.electricityMeter);
      if (d.hasPrivateBathroom !== undefined) setHasPrivateBathroom(d.hasPrivateBathroom);
      if (d.basicAppliances && Array.isArray(d.basicAppliances)) setBasicAppliances(d.basicAppliances);
      if (d.checklist) setChecklist((prev) => ({ ...prev, ...d.checklist }));
      if (d.familyMembers && Array.isArray(d.familyMembers)) setFamilyMembers(d.familyMembers);
      if (d.basicIncomeAmount !== undefined) setBasicIncomeAmount(d.basicIncomeAmount);
      if (d.additionalIncomeAmount !== undefined) setAdditionalIncomeAmount(d.additionalIncomeAmount);
      if (d.familyAssets) setFamilyAssets(d.familyAssets);
      if (d.monthlyBasicExpenses !== undefined) setMonthlyBasicExpenses(d.monthlyBasicExpenses);
      if (d.monthlyDebtsInstallments !== undefined) setMonthlyDebtsInstallments(d.monthlyDebtsInstallments);
      if (d.debtsAndObligations) setDebtsAndObligations(d.debtsAndObligations);
      if (d.medicalConditionDescription) setMedicalConditionDescription(d.medicalConditionDescription);
      if (d.chronicVerification) setChronicVerification(d.chronicVerification);
      if (d.stateHealthInsurance) setStateHealthInsurance(d.stateHealthInsurance);
      if (d.monthlyMedicalCosts !== undefined) setMonthlyMedicalCosts(d.monthlyMedicalCosts);
      if (d.uploadedDocs && Array.isArray(d.uploadedDocs)) setUploadedDocs(d.uploadedDocs);
      if (d.additionalNotesAndRemarks) setAdditionalNotesAndRemarks(d.additionalNotesAndRemarks);
      if (d.currentQuestion) setCurrentQuestion(d.currentQuestion);
      setHasDraftAvailable(false);
      showToast('تم استرجاع مسودة بحث الحالة بنجاح');
    } catch {
      setHasDraftAvailable(false);
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setHasDraftAvailable(false);
  };

  // Auto-Save Draft to LocalStorage
  useEffect(() => {
    if (!isFieldSurveyModalOpen || isSuccessSubmitted) return;
    if (!caseName && !caseSummary && !contactPhone) return;

    const timer = setTimeout(() => {
      try {
        const draftData = {
          savedAt: new Date().toISOString(),
          currentQuestion,
          caseName,
          visitorName,
          visitDate,
          contactPhone,
          secondaryPhone,
          address,
          referralSource,
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
          additionalIncomeAmount,
          familyAssets,
          monthlyBasicExpenses,
          monthlyDebtsInstallments,
          debtsAndObligations,
          medicalConditionDescription,
          chronicVerification,
          stateHealthInsurance,
          monthlyMedicalCosts,
          uploadedDocs,
          additionalNotesAndRemarks,
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
        setLastSavedTime(
          new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        );
      } catch {
        // ignore
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [
    isFieldSurveyModalOpen,
    isSuccessSubmitted,
    currentQuestion,
    caseName,
    visitorName,
    visitDate,
    contactPhone,
    secondaryPhone,
    address,
    referralSource,
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
    additionalIncomeAmount,
    familyAssets,
    monthlyBasicExpenses,
    monthlyDebtsInstallments,
    debtsAndObligations,
    medicalConditionDescription,
    chronicVerification,
    stateHealthInsurance,
    monthlyMedicalCosts,
    uploadedDocs,
    additionalNotesAndRemarks,
  ]);

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
        return visitorName.trim().length > 0;
      case 3:
        return contactPhone.trim().length > 0;
      case 4:
        return true; // Secondary phone optional
      case 5:
        return address.trim().length > 0;
      case 6:
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

    const reportPayload: CaseStudyReport = {
      id: `csr-${Date.now()}`,
      caseId: surveyTargetCaseId || undefined,
      caseName: caseName.trim(),
      visitorName: visitorName || 'أ. هبة الشامي',
      visitDate,
      contactPhone: contactPhone.trim(),
      secondaryPhone: secondaryPhone.trim() || undefined,
      address: address.trim(),
      referralSource,
      priorityLevel,
      housingStatus,
      caseSummary: caseSummary.trim(),
      landmarkAddress: landmarkAddress.trim() || undefined,
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
      additionalIncomeSources: 'يوميات غير منتظمة',
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
        })),
      },
      additionalNotesAndRemarks,
      status: 'pending_review',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    submitCaseStudyReport(reportPayload);
    localStorage.removeItem(DRAFT_STORAGE_KEY);

    setSubmittedSummary({
      caseName: caseName.trim(),
      gap: netFinancialGap,
      researcher: visitorName || 'أ. هبة الشامي',
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

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 w-[92%] max-w-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="bg-amber-950/95 text-amber-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-amber-600/60 backdrop-blur-md">
            <AlertCircle size={20} className="text-amber-400 shrink-0" />
            <span className="text-xs sm:text-sm font-bold flex-1 leading-snug">
              {toastMessage}
            </span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-amber-300 hover:text-white p-1 rounded-full cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STRICT ZERO-SCROLL MOBILE CONTAINER */}
      <div className="relative w-full max-w-md h-[100dvh] sm:h-[90vh] sm:max-h-[820px] bg-white sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col justify-between border border-slate-200/80">
        
        {/* ==================================================== */}
        {/* 1. HEADER (Fixed height, shrink-0)                    */}
        {/* ==================================================== */}
        <div className="bg-white shrink-0 border-b border-slate-100">
          {/* Simulated Mobile Top Bar */}
          <div className="bg-slate-900 text-slate-100 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono tracking-wider font-semibold text-slate-300">
                {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-slate-400 font-medium">
                متصل | حفظ تلقائي
              </span>
            </div>

            <div className="px-3 py-0.5 bg-slate-800 rounded-full border border-slate-700 flex items-center gap-1.5 shadow-inner">
              <Sparkles size={11} className="text-teal-400 shrink-0" />
              <span className="text-[11px] font-bold text-teal-200 tracking-wide">
                بحث حالة
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsFieldSurveyModalOpen(false)}
              className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              title="إغلاق"
            >
              <X size={18} />
            </button>
          </div>

          {/* Draft Restored Bar */}
          {hasDraftAvailable && (
            <div className="px-4 py-2 bg-amber-50 border-b border-amber-200/80 flex items-center justify-between text-xs text-amber-900">
              <span className="text-[11px] font-semibold">
                توجد مسودة سابقة {lastSavedTime ? `(${lastSavedTime})` : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRestoreDraft}
                  className="px-2 py-0.5 bg-amber-700 text-white rounded-md text-[10px] font-bold cursor-pointer"
                >
                  استرجاع
                </button>
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="text-slate-500 text-[10px] cursor-pointer"
                >
                  تجاهل
                </button>
              </div>
            </div>
          )}

          {/* Segmented Progress Bar */}
          <div className="px-5 pt-3 pb-2.5">
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
              <div
                className="bg-gradient-to-r from-teal-700 to-emerald-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mt-2">
              <span className="text-slate-800">
                سؤال {currentQuestion} من {totalQuestions}
              </span>
              <span className="text-teal-800 font-mono bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
                {completionPercentage}%
              </span>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* 2. CENTER BODY (Single Question Flow)                 */}
        {/* ==================================================== */}
        <div className="flex-1 flex flex-col px-4 sm:px-6 py-3 overflow-y-auto overscroll-contain">
          {isSuccessSubmitted ? (
            /* Success Screen */
            <div className="text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={36} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">
                  تم اعتماد استمارة «بحث حالة» بنجاح!
                </h3>
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
                  setActiveSection('cases');
                }}
                className="w-full py-3.5 bg-teal-800 hover:bg-teal-900 text-white rounded-2xl font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                الانتقال لجدول الحالات والمراجعة
              </button>
            </div>
          ) : (
            <div
              className={`space-y-3.5 animate-in fade-in duration-200 ${
                currentQuestion === 22 ? 'flex-1 flex flex-col min-h-0' : 'my-auto'
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
                    <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                      <ShieldCheck size={15} />
                      <span>التكليف الميداني</span>
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                      من هو الباحث الميداني المسؤول؟
                    </h2>
                    <p className="text-xs text-slate-500">
                      اختر الباحث المكلف بالنزول أو أضف باحثاً جديداً.
                    </p>
                  </div>

                  <div className="p-2 bg-slate-50 rounded-2xl border border-slate-200">
                    <ResearcherSelect
                      value={visitorName}
                      onChange={(val) => setVisitorName(val)}
                      label="الباحث الميداني المسؤول"
                      required
                    />
                  </div>
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
                    ].map((src) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => {
                          setReferralSource(src);
                          setTimeout(handleNext, 150);
                        }}
                        className={`w-full p-3.5 rounded-2xl border-2 text-right text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-between ${
                          referralSource === src
                            ? 'bg-teal-50 border-teal-700 text-teal-950 ring-1 ring-teal-700 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span>{src}</span>
                        <span
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            referralSource === src
                              ? 'border-teal-700 bg-teal-700 text-white'
                              : 'border-slate-300'
                          }`}
                        >
                          {referralSource === src && <Check size={12} />}
                        </span>
                      </button>
                    ))}
                  </div>
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
                      { level: 'critical' as PriorityLevel, label: 'أولوية حرجة (تدخل عاجل)', badge: 'bg-rose-100 text-rose-900 border-rose-400' },
                      { level: 'high' as PriorityLevel, label: 'أولوية عالية (استحقاق مؤكد)', badge: 'bg-amber-100 text-amber-900 border-amber-400' },
                      { level: 'medium' as PriorityLevel, label: 'أولوية متوسطة (دعم جزئي)', badge: 'bg-teal-100 text-teal-900 border-teal-400' },
                      { level: 'low' as PriorityLevel, label: 'أولوية منخفضة / معونة موسمية', badge: 'bg-slate-100 text-slate-800 border-slate-300' },
                    ].map((item) => (
                      <button
                        key={item.level}
                        type="button"
                        onClick={() => {
                          setPriorityLevel(item.level);
                          setTimeout(handleNext, 150);
                        }}
                        className={`w-full p-3 rounded-2xl border-2 text-right transition-all cursor-pointer flex items-center justify-between ${
                          priorityLevel === item.level
                            ? `${item.badge} ring-1 ring-current shadow-xs`
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xs sm:text-sm font-black">{item.label}</span>
                        <span
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            priorityLevel === item.level
                              ? 'border-current bg-current text-white'
                              : 'border-slate-300'
                          }`}
                        >
                          {priorityLevel === item.level && <Check size={12} className="text-white" />}
                        </span>
                      </button>
                    ))}
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
                        <select
                          value={waterConnection}
                          onChange={(e) => setWaterConnection(e.target.value as any)}
                          className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl font-medium cursor-pointer"
                        >
                          <option value="independent">عداد مياه مستقل</option>
                          <option value="shared">وصلة مياه مشتركة</option>
                          <option value="none">بدون مياه بالمنزل</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">مصدر الكهرباء</label>
                        <select
                          value={electricityMeter}
                          onChange={(e) => setElectricityMeter(e.target.value as any)}
                          className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl font-medium cursor-pointer"
                        >
                          <option value="formal">عداد رسمي مسجل</option>
                          <option value="code_meter">عداد كودي / ممارسة</option>
                          <option value="none">بدون عداد كهرباء</option>
                        </select>
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
                        <select
                          value={currentMember?.relation || 'نفس الحالة (صاحب الملف الأساسي)'}
                          onChange={(e) => updateCurrentMember('relation', e.target.value)}
                          className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg cursor-pointer font-bold text-teal-950"
                        >
                          <option value="نفس الحالة (صاحب الملف الأساسي)">نفس الحالة (صاحب الملف الأساسي)</option>
                          <option value="الأب">الأب</option>
                          <option value="الأم">الأم</option>
                          <option value="الزوج / الزوجة">الزوج / الزوجة</option>
                          <option value="الابن / الابنة">الابن / الابنة</option>
                          <option value="الأخ / الأخت">الأخ / الأخت</option>
                          <option value="الجد / الجدة">الجد / الجدة</option>
                          <option value="قريب / كفيل آخر">قريب / كفيل آخر</option>
                        </select>
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
                        <select
                          value={currentMember?.educationLevel || 'إعدادي'}
                          onChange={(e) => updateCurrentMember('educationLevel', e.target.value)}
                          className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg cursor-pointer font-medium"
                        >
                          <option value="أمية">أمية</option>
                          <option value="ابتدائي">ابتدائي</option>
                          <option value="إعدادي">إعدادي</option>
                          <option value="ثانوي / دبلوم">ثانوي / دبلوم</option>
                          <option value="جامعي">جامعي</option>
                          <option value="غير ملتحق">غير ملتحق</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-700 block mb-0.5">القدرة على العمل</label>
                        <select
                          value={currentMember?.workCapacity || 'قادر على العمل'}
                          onChange={(e) => updateCurrentMember('workCapacity', e.target.value)}
                          className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg cursor-pointer font-medium"
                        >
                          <option value="قادر على العمل">قادر على العمل</option>
                          <option value="عاجز جزئياً أو مسن">عاجز جزئياً أو مسن</option>
                          <option value="عاجز كلياً">عاجز كلياً</option>
                          <option value="طفل / قاصر">طفل / قاصر</option>
                        </select>
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

                    {/* Chronic Illness Sub-card */}
                    <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={Boolean(currentMember?.chronicIllness)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateCurrentMember('chronicIllness', {
                                conditionName: 'مرض مزمن / عجز',
                                monthlyCost: 250,
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

                      {currentMember?.chronicIllness && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">تشخيص المرض / العجز</label>
                              <input
                                type="text"
                                value={currentMember.chronicIllness.conditionName}
                                onChange={(e) =>
                                  updateCurrentMember('chronicIllness', {
                                    ...currentMember.chronicIllness!,
                                    conditionName: e.target.value,
                                  })
                                }
                                placeholder="مثال: غسيل كلى، سكري، قلب"
                                className="w-full p-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">تكلفة العلاج (ج.م/شهر)</label>
                              <input
                                type="number"
                                value={currentMember.chronicIllness.monthlyCost}
                                onChange={(e) =>
                                  updateCurrentMember('chronicIllness', {
                                    ...currentMember.chronicIllness!,
                                    monthlyCost: Number(e.target.value) || 0,
                                  })
                                }
                                className="w-full p-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                              />
                            </div>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-700">
                            <input
                              type="checkbox"
                              checked={currentMember.chronicIllness.isCoveredByStateInsurance}
                              onChange={(e) =>
                                updateCurrentMember('chronicIllness', {
                                  ...currentMember.chronicIllness!,
                                  isCoveredByStateInsurance: e.target.checked,
                                })
                              }
                              className="w-3.5 h-3.5 rounded text-teal-700 accent-teal-700"
                            />
                            <span>مشمول بالتأمين الصحي أو علاج على نفقة الدولة</span>
                          </label>
                        </div>
                      )}
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

                  <div className="p-4 bg-gradient-to-br from-teal-950 via-slate-900 to-slate-950 text-white rounded-3xl shadow-xl space-y-3">
                    <div className="text-center py-2 border-b border-teal-800/80">
                      <span className="text-xs text-teal-300 font-bold block mb-1">
                        صافي العجز الشهري المقترح للتغطية
                      </span>
                      <span className="text-3xl sm:text-4xl font-black text-amber-300 font-mono tracking-tight">
                        {netFinancialGap.toLocaleString('ar-EG')} ج.م
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="p-2 bg-slate-800/70 rounded-xl">
                        <span className="block text-[11px] text-slate-400">إجمالي الدخل</span>
                        <span className="block font-bold text-emerald-400 font-mono mt-0.5">
                          {totalIncome.toLocaleString('ar-EG')} ج.م
                        </span>
                      </div>
                      <div className="p-2 bg-slate-800/70 rounded-xl">
                        <span className="block text-[11px] text-slate-400">إجمالي الالتزامات</span>
                        <span className="block font-bold text-rose-300 font-mono mt-0.5">
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
                <div className="space-y-3 flex-1 overflow-y-auto overscroll-contain pr-1 pl-1 pb-32">
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
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
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

                  {/* Notes */}
                  <div className="relative">
                    <input
                      type="text"
                      value={additionalNotesAndRemarks}
                      onChange={(e) => setAdditionalNotesAndRemarks(e.target.value)}
                      placeholder="التوصية الختامية للباحث..."
                      className="w-full p-2.5 pl-10 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:border-teal-700 focus:bg-white text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => toggleVoiceDictation('remarks', setAdditionalNotesAndRemarks)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-teal-800 cursor-pointer"
                    >
                      <Mic size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Q23: 4. شاشة المراجعة الختامية (Quick Summary Slide) */}
              {currentQuestion === 23 && (
                <div className="space-y-2.5">
                  <div className="space-y-0.5 text-center">
                    <span className="text-xs font-bold text-teal-800 inline-flex items-center gap-1.5 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                      <CheckCircle2 size={13} className="text-teal-700" />
                      <span>المراجعة الختامية للبحث</span>
                    </span>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                      تأكيد واعتماد ملف الحالة
                    </h2>
                  </div>

                  {/* Summary Capsules (Zero-Scroll strictly fitted) */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium">اسم المستفيد:</span>
                      <span className="font-black text-slate-900">{caseName || 'رب الأسرة'}</span>
                    </div>

                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium">أفراد الأسرة:</span>
                      <span className="font-bold text-slate-800">
                        {familyMembers.length} أفراد ({familyMembers.map((m) => m.name || m.relation).filter(Boolean).slice(0, 3).join('، ')}...)
                      </span>
                    </div>

                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium">صافي الفجوة الشهرية:</span>
                      <span className="font-black text-teal-800 font-mono text-sm">
                        {netFinancialGap.toLocaleString('ar-EG')} ج.م
                      </span>
                    </div>

                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium">مرافق السكن:</span>
                      <span className="font-bold text-slate-800">
                        سقف {roofType === 'concrete' ? 'خرساني' : roofType === 'wood_straw' ? 'خشب/قش' : 'متصدع'} · {hasPrivateBathroom ? 'حمام خاص' : 'حمام مشترك'} ({basicAppliances.length} أجهزة)
                      </span>
                    </div>

                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium">مستندات الـ Checklist:</span>
                      <span className="font-bold text-emerald-800">
                        {Object.values(checklist).filter(Boolean).length} من 7 بنود مستوفاة
                      </span>
                    </div>

                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium">الموقف الطبي:</span>
                      <span className="font-bold text-slate-800">{stateHealthInsurance}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block mb-1">
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
                  </div>

                  <p className="text-[11px] text-center text-slate-500 font-medium">
                    بالضغط على الزر أدناه يتم إحالة الحالة فورياً لمدير النظام بوضع (بانتظار المراجعة والاعتماد).
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
                onClick={() => setIsFieldSurveyModalOpen(false)}
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
                className="flex-1 h-14 bg-slate-900 hover:bg-slate-950 active:scale-[0.98] text-white rounded-xl text-sm sm:text-base font-bold shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
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

      </div>
    </div>
  );
}
