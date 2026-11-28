'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { useApp } from '@/context/app-context';
import { useToast } from '@/context/toast-context';
import { X } from 'lucide-react';
import {
  CaseStudyFamilyMember,
  PriorityLevel,
  CaseExecutiveSummary,
} from '@/types';
import {
  LEGACY_DRAFT_STORAGE_KEY,
  getDraftStorageKey,
  TOTAL_QUESTIONS,
  AttachmentItem,
  SubmittedSummaryData,
} from './case-study/types';
import {
  CaseStudyStatusBanners,
  CaseStudyVoiceHeaderBar,
  CaseStudySuccessView,
  CaseStudyFooterNav,
  CaseStudyCloseConfirmModal,
} from './case-study/case-study-overlays';
import { StepIdentity } from './case-study/steps/step-identity';
import { StepHousing } from './case-study/steps/step-housing';
import { StepFamily } from './case-study/steps/step-family';
import { StepFinancials } from './case-study/steps/step-financials';
import { StepHealth } from './case-study/steps/step-health';
import { StepDocumentsReview } from './case-study/steps/step-documents-review';
import { useCaseStudyVoice } from './case-study/hooks/use-case-study-voice';
import { isQuestionAnswered } from './case-study/utils/validation';
import { buildCaseStudyReportPayload } from './case-study/utils/report-builder';

export type { AttachmentItem } from './case-study/types';

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
  const totalQuestions = TOTAL_QUESTIONS;

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
  const [submittedSummary, setSubmittedSummary] = useState<SubmittedSummaryData | null>(null);

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

  const [executiveSummary, setExecutiveSummary] = useState<CaseExecutiveSummary | null>(null);

  const handleApplyExtractedVoiceData = useCallback((d: any) => {
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

    if (d.basicIncomeAmount !== undefined) setBasicIncomeAmount(Number(d.basicIncomeAmount) || 0);
    if (d.basicIncomeSources) setBasicIncomeSources(d.basicIncomeSources);
    if (d.additionalIncomeAmount !== undefined) setAdditionalIncomeAmount(Number(d.additionalIncomeAmount) || 0);
    if (d.additionalIncomeSources) setAdditionalIncomeSources(d.additionalIncomeSources);
    if (d.familyAssets) setFamilyAssets(d.familyAssets);
    if (d.monthlyBasicExpenses !== undefined) setMonthlyBasicExpenses(Number(d.monthlyBasicExpenses) || 0);
    if (d.monthlyDebtsInstallments !== undefined) setMonthlyDebtsInstallments(Number(d.monthlyDebtsInstallments) || 0);
    if (d.debtsAndObligations) setDebtsAndObligations(d.debtsAndObligations);

    if (d.medicalConditionDescription) setMedicalConditionDescription(d.medicalConditionDescription);
    if (d.chronicVerification) setChronicVerification(d.chronicVerification);
    if (d.monthlyMedicalCosts !== undefined) setMonthlyMedicalCosts(Number(d.monthlyMedicalCosts) || 0);
    if (d.stateHealthInsurance) setStateHealthInsurance(d.stateHealthInsurance);

    if (d.checklist) {
      setChecklist((prev) => ({
        ...prev,
        ...d.checklist,
      }));
    }

    if (d.additionalNotesAndRemarks) setAdditionalNotesAndRemarks(d.additionalNotesAndRemarks);
    if (d.executiveSummary) {
      setExecutiveSummary(d.executiveSummary);
    }
  }, []);

  const {
    isFullAudioRecording,
    fullAudioDuration,
    setFullAudioDuration,
    fullAudioUrl,
    setFullAudioUrl,
    isExtractingWithAI,
    isPlayingAudio,
    setIsPlayingAudio,
    audioPlayerRef,
    isListening,
    activeVoiceField,
    toggleVoiceDictation,
    stopVoiceDictation,
    formatDuration,
    startFullAudioRecording,
    stopFullAudioRecording,
    deleteFullAudioRecording,
    togglePlayRecordedAudio,
    handleAIVoiceExtraction,
  } = useCaseStudyVoice({
    setUploadedDocs,
    showToast,
    caseSummary,
    onApplyExtractedData: handleApplyExtractedVoiceData,
  });

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
  }, [setFullAudioUrl, setFullAudioDuration, setIsPlayingAudio]);

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
  }, [setFullAudioUrl, setFullAudioDuration]);

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
      stopVoiceDictation();
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
  }, [isFieldSurveyModalOpen, surveyTargetCaseId, resetFormToDefaults, applyDraftObject, loadTargetCase, stopVoiceDictation, toast, totalQuestions]);

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

  const checkCurrentQuestionAnswered = (qIndex: number): boolean =>
    isQuestionAnswered(qIndex, {
      caseName,
      isResearcherPOV,
      authUserName: authUser.name,
      visitorName,
      contactPhone,
      address,
      referralSource,
      otherReferralSource,
      priorityLevel,
      housingStatus,
      caseSummary,
      currentMember,
      basicIncomeAmount,
      additionalIncomeAmount,
      familyAssets,
      monthlyBasicExpenses,
      debtsAndObligations,
      monthlyDebtsInstallments,
      medicalConditionDescription,
      chronicVerification,
      stateHealthInsurance,
      monthlyMedicalCosts,
      uploadedDocs,
      recommendedAssistanceType,
      effectiveRecommendedAmount,
    });

  const handleNext = () => {
    if (!checkCurrentQuestionAnswered(currentQuestion)) {
      showToast('يرجى إدخال البيانات أو استخدام المايك للمتابعة');
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
    if (!checkCurrentQuestionAnswered(currentQuestion)) {
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

    const effectiveVisitorName = isResearcherPOV
      ? authUser.name
      : visitorName || 'أ. هبة الشامي';

    const reportPayload = buildCaseStudyReportPayload({
      surveyTargetCaseId,
      caseName,
      effectiveVisitorName,
      visitDate,
      contactPhone,
      secondaryPhone,
      address,
      referralSource,
      otherReferralSource,
      priorityLevel,
      housingStatus,
      caseSummary,
      landmarkAddress,
      gpsLocation,
      roofType,
      waterConnection,
      electricityMeter,
      hasPrivateBathroom,
      basicAppliances,
      familyMembers,
      basicIncomeSources,
      basicIncomeAmount,
      additionalIncomeSources,
      additionalIncomeAmount,
      familyAssets,
      monthlyBasicExpenses,
      monthlyDebtsInstallments,
      debtsAndObligations,
      netFinancialGap,
      medicalConditionDescription,
      chronicVerification,
      monthlyMedicalCosts,
      stateHealthInsurance,
      checklist,
      uploadedDocs,
      fullAudioUrl,
      fullAudioDuration,
      recommendedAssistanceType,
      effectiveRecommendedAmount,
      additionalNotesAndRemarks,
      executiveSummary,
    });

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

          <CaseStudyStatusBanners
            hasDraftAvailable={hasDraftAvailable}
            lastSavedTime={lastSavedTime}
            onRestoreDraft={handleRestoreDraft}
            onDiscardDraft={handleDiscardDraft}
            isSuccessSubmitted={isSuccessSubmitted}
            adminRevisionNote={adminRevisionNote}
            isRevisionBannerExpanded={isRevisionBannerExpanded}
            onToggleRevisionBanner={() => setIsRevisionBannerExpanded((prev) => !prev)}
          />

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
          <CaseStudyVoiceHeaderBar
            isSuccessSubmitted={isSuccessSubmitted}
            isFullAudioRecording={isFullAudioRecording}
            fullAudioUrl={fullAudioUrl}
            fullAudioDuration={fullAudioDuration}
            isPlayingAudio={isPlayingAudio}
            isExtractingWithAI={isExtractingWithAI}
            formatDuration={formatDuration}
            onStartRecording={startFullAudioRecording}
            onStopRecording={stopFullAudioRecording}
            onTogglePlayAudio={togglePlayRecordedAudio}
            onDeleteRecording={deleteFullAudioRecording}
            onExtractWithAI={handleAIVoiceExtraction}
          />
        </div>

        {/* ==================================================== */}
        {/* 2. CENTER BODY (Single Question Flow)                 */}
        {/* ==================================================== */}
        <div className="flex-1 min-h-0 flex flex-col px-4 sm:px-6 py-3 overflow-y-auto overscroll-contain">
          {isSuccessSubmitted ? (
            <CaseStudySuccessView
              submittedSummary={submittedSummary}
              visitorName={visitorName}
              isResearcherPOV={isResearcherPOV}
              onFinishAndNavigate={() => {
                setIsFieldSurveyModalOpen(false);
                setActiveSection(isResearcherPOV ? 'research' : 'cases');
              }}
            />
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
              
              {/* Q1–Q7: Identity, Researcher, Contact, Location, Referral, Priority */}
              <StepIdentity
                currentQuestion={currentQuestion}
                caseName={caseName}
                setCaseName={setCaseName}
                isResearcherPOV={isResearcherPOV}
                authUserName={authUser.name}
                authUserAssignedDistricts={authUser.assignedDistricts}
                visitorName={visitorName}
                setVisitorName={setVisitorName}
                contactPhone={contactPhone}
                setContactPhone={setContactPhone}
                secondaryPhone={secondaryPhone}
                setSecondaryPhone={setSecondaryPhone}
                address={address}
                setAddress={setAddress}
                gpsLocation={gpsLocation}
                isCapturingGps={isCapturingGps}
                handleCaptureGps={handleCaptureGps}
                referralSource={referralSource}
                setReferralSource={setReferralSource}
                otherReferralSource={otherReferralSource}
                setOtherReferralSource={setOtherReferralSource}
                priorityLevel={priorityLevel}
                setPriorityLevel={setPriorityLevel}
                handleNext={handleNext}
                isListening={isListening}
                activeVoiceField={activeVoiceField}
                toggleVoiceDictation={toggleVoiceDictation}
              />

              {/* Q8–Q10: Housing Status, Facilities & Description, Landmark */}
              <StepHousing
                currentQuestion={currentQuestion}
                housingStatus={housingStatus}
                setHousingStatus={setHousingStatus}
                roofType={roofType}
                setRoofType={setRoofType}
                waterConnection={waterConnection}
                setWaterConnection={setWaterConnection}
                electricityMeter={electricityMeter}
                setElectricityMeter={setElectricityMeter}
                hasPrivateBathroom={hasPrivateBathroom}
                setHasPrivateBathroom={setHasPrivateBathroom}
                basicAppliances={basicAppliances}
                setBasicAppliances={setBasicAppliances}
                caseSummary={caseSummary}
                setCaseSummary={setCaseSummary}
                landmarkAddress={landmarkAddress}
                setLandmarkAddress={setLandmarkAddress}
                handleNext={handleNext}
                isListening={isListening}
                activeVoiceField={activeVoiceField}
                toggleVoiceDictation={toggleVoiceDictation}
              />

              {/* Q11: Family Members Sub-flow */}
              <StepFamily
                currentQuestion={currentQuestion}
                caseName={caseName}
                familyMembers={familyMembers}
                activeMemberIndex={activeMemberIndex}
                setActiveMemberIndex={setActiveMemberIndex}
                currentMember={currentMember}
                updateCurrentMember={updateCurrentMember}
                handleAddNewMember={handleAddNewMember}
                handleRemoveMember={handleRemoveMember}
                chronicDiseases={chronicDiseases}
              />

              {/* Q12–Q17: Financials & Financial Gap Calculator */}
              <StepFinancials
                currentQuestion={currentQuestion}
                basicIncomeAmount={basicIncomeAmount}
                setBasicIncomeAmount={setBasicIncomeAmount}
                basicIncomeSources={basicIncomeSources}
                setBasicIncomeSources={setBasicIncomeSources}
                additionalIncomeAmount={additionalIncomeAmount}
                setAdditionalIncomeAmount={setAdditionalIncomeAmount}
                additionalIncomeSources={additionalIncomeSources}
                setAdditionalIncomeSources={setAdditionalIncomeSources}
                familyAssets={familyAssets}
                setFamilyAssets={setFamilyAssets}
                monthlyBasicExpenses={monthlyBasicExpenses}
                setMonthlyBasicExpenses={setMonthlyBasicExpenses}
                monthlyDebtsInstallments={monthlyDebtsInstallments}
                setMonthlyDebtsInstallments={setMonthlyDebtsInstallments}
                debtsAndObligations={debtsAndObligations}
                setDebtsAndObligations={setDebtsAndObligations}
                totalIncome={totalIncome}
                totalObligations={totalObligations}
                netFinancialGap={netFinancialGap}
                handleNext={handleNext}
                isListening={isListening}
                activeVoiceField={activeVoiceField}
                toggleVoiceDictation={toggleVoiceDictation}
              />

              {/* Q18–Q21: Health, Medical Verification, Insurance & Monthly Medical Costs */}
              <StepHealth
                currentQuestion={currentQuestion}
                medicalConditionDescription={medicalConditionDescription}
                setMedicalConditionDescription={setMedicalConditionDescription}
                chronicVerification={chronicVerification}
                setChronicVerification={setChronicVerification}
                stateHealthInsurance={stateHealthInsurance}
                setStateHealthInsurance={setStateHealthInsurance}
                monthlyMedicalCosts={monthlyMedicalCosts}
                setMonthlyMedicalCosts={setMonthlyMedicalCosts}
                handleNext={handleNext}
                isListening={isListening}
                activeVoiceField={activeVoiceField}
                toggleVoiceDictation={toggleVoiceDictation}
              />

              {/* Q22–Q24: Documents Checklist, Researcher Recommendation & Final Review */}
              <StepDocumentsReview
                currentQuestion={currentQuestion}
                checklist={checklist}
                setChecklist={setChecklist}
                cameraInputRef={cameraInputRef}
                extraFileInputRef={extraFileInputRef}
                isAddingCustomDoc={isAddingCustomDoc}
                setIsAddingCustomDoc={setIsAddingCustomDoc}
                customDocTitle={customDocTitle}
                setCustomDocTitle={setCustomDocTitle}
                handleSimulateDirectUpload={handleSimulateDirectUpload}
                uploadedDocs={uploadedDocs}
                handleRemoveDoc={handleRemoveDoc}
                isPlayingAudio={isPlayingAudio}
                togglePlayRecordedAudio={togglePlayRecordedAudio}
                recommendedAssistanceType={recommendedAssistanceType}
                setRecommendedAssistanceType={setRecommendedAssistanceType}
                recommendedAmountOverride={recommendedAmountOverride}
                setRecommendedAmountOverride={setRecommendedAmountOverride}
                effectiveRecommendedAmount={effectiveRecommendedAmount}
                netFinancialGap={netFinancialGap}
                additionalNotesAndRemarks={additionalNotesAndRemarks}
                setAdditionalNotesAndRemarks={setAdditionalNotesAndRemarks}
                isListening={isListening}
                activeVoiceField={activeVoiceField}
                toggleVoiceDictation={toggleVoiceDictation}
                fullAudioUrl={fullAudioUrl}
                fullAudioDuration={fullAudioDuration}
                visitorName={visitorName}
                isFullAudioRecording={isFullAudioRecording}
                startFullAudioRecording={startFullAudioRecording}
                stopFullAudioRecording={stopFullAudioRecording}
                deleteFullAudioRecording={deleteFullAudioRecording}
                formatDuration={formatDuration}
                executiveSummary={executiveSummary}
                caseName={caseName}
                familyMembers={familyMembers}
                roofType={roofType}
                hasPrivateBathroom={hasPrivateBathroom}
                basicAppliances={basicAppliances}
                stateHealthInsurance={stateHealthInsurance}
              />

            </div>
          )}
        </div>

        {/* ==================================================== */}
        {/* 3. BOTTOM BAR (Fixed Thumb-Friendly CTA Navigation) */}
        {/* ==================================================== */}
        <CaseStudyFooterNav
          isSuccessSubmitted={isSuccessSubmitted}
          currentQuestion={currentQuestion}
          totalQuestions={totalQuestions}
          onPrev={handlePrev}
          onNext={handleNext}
          onSkip={handleSkip}
          onRequestClose={handleRequestClose}
          onFinalSubmit={handleFinalSubmit}
        />

        {/* Calm UI Close Confirmation Overlay (Protects against accidental data loss) */}
        <CaseStudyCloseConfirmModal
          showCloseConfirm={showCloseConfirm}
          isSuccessSubmitted={isSuccessSubmitted}
          currentQuestion={currentQuestion}
          totalQuestions={totalQuestions}
          onConfirmSaveAndClose={handleConfirmSaveAndClose}
          onContinueEditing={() => setShowCloseConfirm(false)}
          onDiscardDraftAndClose={handleDiscardDraftAndClose}
        />

      </div>
    </div>
  );
}
