import {
  CaseStudyReport,
  CaseStudyFamilyMember,
  PriorityLevel,
  CaseExecutiveSummary,
} from '@/types';
import { AttachmentItem } from '../types';
import { ChecklistState } from '../steps/step-documents-review';

export interface BuildCaseStudyReportInput {
  surveyTargetCaseId: string | null;
  caseName: string;
  effectiveVisitorName: string;
  visitDate: string;
  contactPhone: string;
  secondaryPhone: string;
  address: string;
  referralSource: string;
  otherReferralSource: string;
  priorityLevel: PriorityLevel;
  housingStatus: string;
  caseSummary: string;
  landmarkAddress: string;
  gpsLocation: { lat: number; lng: number } | null;
  roofType: 'concrete' | 'wood_straw' | 'damaged';
  waterConnection: 'independent' | 'shared' | 'none';
  electricityMeter: 'formal' | 'code_meter' | 'none';
  hasPrivateBathroom: boolean;
  basicAppliances: string[];
  familyMembers: CaseStudyFamilyMember[];
  basicIncomeSources: string;
  basicIncomeAmount: number;
  additionalIncomeSources: string;
  additionalIncomeAmount: number;
  familyAssets: string;
  monthlyBasicExpenses: number;
  monthlyDebtsInstallments: number;
  debtsAndObligations: string;
  netFinancialGap: number;
  medicalConditionDescription: string;
  chronicVerification: string;
  monthlyMedicalCosts: number;
  stateHealthInsurance: string;
  checklist: ChecklistState;
  uploadedDocs: AttachmentItem[];
  fullAudioUrl: string | null;
  fullAudioDuration: number;
  recommendedAssistanceType: string;
  effectiveRecommendedAmount: number;
  additionalNotesAndRemarks: string;
  executiveSummary: CaseExecutiveSummary | null;
}

export function buildCaseStudyReportPayload(
  input: BuildCaseStudyReportInput
): CaseStudyReport {
  const finalReferralSource =
    input.referralSource === 'أخرى (مصدر آخر)'
      ? `أخرى: ${input.otherReferralSource.trim()}`
      : input.referralSource;

  const nowIso = new Date().toISOString();

  return {
    id: `csr-${Date.now()}`,
    caseId: input.surveyTargetCaseId || undefined,
    caseName: input.caseName.trim(),
    visitorName: input.effectiveVisitorName,
    visitDate: input.visitDate,
    contactPhone: input.contactPhone.trim(),
    secondaryPhone: input.secondaryPhone.trim() || undefined,
    address: input.address.trim(),
    referralSource: finalReferralSource,
    priorityLevel: input.priorityLevel,
    housingStatus: input.housingStatus,
    caseSummary: input.caseSummary.trim(),
    landmarkAddress: input.landmarkAddress.trim() || undefined,
    gpsLocation: input.gpsLocation
      ? {
          latitude: input.gpsLocation.lat,
          longitude: input.gpsLocation.lng,
          mapsUrl: `https://www.google.com/maps?q=${input.gpsLocation.lat},${input.gpsLocation.lng}`,
        }
      : undefined,
    housingFacilities: {
      roofType: input.roofType,
      waterConnection: input.waterConnection,
      electricityMeter: input.electricityMeter,
      hasPrivateBathroom: input.hasPrivateBathroom,
      basicAppliancesAvailable: input.basicAppliances,
    },
    familyMembers: input.familyMembers,
    basicIncomeSources: input.basicIncomeSources,
    basicIncomeAmount: Number(input.basicIncomeAmount) || 0,
    additionalIncomeSources: input.additionalIncomeSources || 'يوميات غير منتظمة',
    additionalIncomeAmount: Number(input.additionalIncomeAmount) || 0,
    familyAssets: input.familyAssets,
    monthlyBasicExpenses: Number(input.monthlyBasicExpenses) || 0,
    monthlyDebtsInstallments: Number(input.monthlyDebtsInstallments) || 0,
    debtsAndObligations: input.debtsAndObligations,
    netFinancialGap: input.netFinancialGap,
    financialGapDocumentation: `إجمالي العجز الشهري المقدر: ${input.netFinancialGap} ج.م`,
    medicalConditionDescription: input.medicalConditionDescription,
    chronicVerification: input.chronicVerification,
    monthlyMedicalCosts: Number(input.monthlyMedicalCosts) || 0,
    stateHealthInsuranceDetails: input.stateHealthInsurance,
    attachments: {
      nationalIdsAdults: input.checklist.nationalIdsAdults,
      birthCertificatesMinors: input.checklist.birthCertificatesMinors,
      deathOrDivorceCertificates: input.checklist.deathOrDivorceCertificates,
      recentMedicalProof: input.checklist.recentMedicalProof,
      insurancePrintOut: input.checklist.insurancePrintOut,
      utilityReceipt: input.checklist.utilityReceipt,
      leaseContractOrRentReceipt: input.checklist.leaseContractOrRentReceipt,
      uploadedFiles: input.uploadedDocs.map((d) => ({
        id: d.id,
        title: d.customDescription ? `${d.title} - ${d.customDescription}` : d.title,
        category: d.category,
        fileName: d.fileName,
        progress: d.progress,
        status: d.status,
        url:
          (d.category as string) === 'voiceRecording'
            ? input.fullAudioUrl || undefined
            : undefined,
        durationSeconds:
          (d.category as string) === 'voiceRecording'
            ? input.fullAudioDuration || 15
            : undefined,
      })),
    },
    recommendedAssistanceType: input.recommendedAssistanceType.trim(),
    recommendedMonthlyAmount: Number(input.effectiveRecommendedAmount) || 0,
    additionalNotesAndRemarks: input.additionalNotesAndRemarks.trim(),
    voiceNoteUrl: input.fullAudioUrl || undefined,
    voiceNoteDuration: input.fullAudioDuration || undefined,
    executiveSummary: input.executiveSummary || undefined,
    status: 'pending_review',
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}
