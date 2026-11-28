import { CaseStudyFamilyMember } from '@/types';
import { AttachmentItem } from '../types';

export interface ValidationInput {
  caseName: string;
  isResearcherPOV: boolean;
  authUserName: string;
  visitorName: string;
  contactPhone: string;
  address: string;
  referralSource: string;
  otherReferralSource: string;
  priorityLevel: string;
  housingStatus: string;
  caseSummary: string;
  currentMember?: CaseStudyFamilyMember;
  basicIncomeAmount: number;
  additionalIncomeAmount: number;
  familyAssets: string;
  monthlyBasicExpenses: number;
  debtsAndObligations: string;
  monthlyDebtsInstallments: number;
  medicalConditionDescription: string;
  chronicVerification: string;
  stateHealthInsurance: string;
  monthlyMedicalCosts: number;
  uploadedDocs: AttachmentItem[];
  recommendedAssistanceType: string;
  effectiveRecommendedAmount: number;
}

export function isQuestionAnswered(qIndex: number, data: ValidationInput): boolean {
  switch (qIndex) {
    case 1:
      return data.caseName.trim().length > 0;
    case 2:
      return data.isResearcherPOV
        ? data.authUserName.trim().length > 0
        : data.visitorName.trim().length > 0;
    case 3:
      return data.contactPhone.trim().length > 0;
    case 4:
      return true; // Secondary phone optional
    case 5:
      return data.address.trim().length > 0;
    case 6:
      if (data.referralSource === 'أخرى (مصدر آخر)') {
        return data.otherReferralSource.trim().length > 0;
      }
      return data.referralSource.trim().length > 0;
    case 7:
      return data.priorityLevel.trim().length > 0;
    case 8:
      return data.housingStatus.trim().length > 0;
    case 9:
      return data.caseSummary.trim().length > 0;
    case 10:
      return true; // Landmark optional
    case 11:
      // Family Member sub-flow: check current member
      return (data.currentMember?.name?.trim().length ?? 0) > 0 || data.caseName.trim().length > 0;
    case 12:
      return data.basicIncomeAmount >= 0;
    case 13:
      return data.additionalIncomeAmount >= 0;
    case 14:
      return (
        data.familyAssets.trim().length > 0 &&
        data.familyAssets.trim() !== 'أصول أخرى (اذكرها)'
      );
    case 15:
      return data.monthlyBasicExpenses > 0;
    case 16:
      return data.debtsAndObligations.trim().length > 0 || data.monthlyDebtsInstallments >= 0;
    case 17:
      return true; // Gap review
    case 18:
      return data.medicalConditionDescription.trim().length > 0;
    case 19:
      return (
        data.chronicVerification.trim().length > 0 &&
        data.chronicVerification.trim() !== 'سند آخر (اذكره)'
      );
    case 20:
      return data.stateHealthInsurance.trim().length > 0;
    case 21:
      return data.monthlyMedicalCosts >= 0;
    case 22:
      return data.uploadedDocs.length > 0; // Attachments
    case 23:
      return (
        data.recommendedAssistanceType.trim().length > 0 &&
        data.effectiveRecommendedAmount >= 0
      );
    case 24:
      return true; // Final review slide
    default:
      return true;
  }
}
