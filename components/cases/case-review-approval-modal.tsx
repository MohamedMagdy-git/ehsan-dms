'use client';

import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useApp } from '@/context/app-context';
import { useToast } from '@/context/toast-context';
import {
  X,
  CheckCircle2,
  RotateCcw,
  Ban,
  MapPin,
  ExternalLink,
  Users,
  Wallet,
  FileText,
  FileCheck,
  User,
  Building,
  AlertTriangle,
  Eye,
  ClipboardList,
  LayoutList,
} from 'lucide-react';
import { BeneficiaryCase, PriorityLevel } from '@/types';
import { calculateFieldSurveyCompleteness, getCoreDocumentsStats } from '@/lib/survey-completeness';
import { ResearcherVoicePlayer } from '@/components/common/researcher-voice-player';
import { CaseSurveyQAList, SurveyQAFilterMode } from '@/components/cases/case-survey-qa-list';

interface CaseReviewApprovalModalProps {
  caseItem: BeneficiaryCase | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  initialAction?: 'none' | 'approve' | 'return' | 'reject';
}

type ModalTab = 'summary' | 'full_survey';

export function CaseReviewApprovalModal({
  caseItem,
  isOpen,
  onClose,
  onSuccess,
  initialAction = 'none',
}: CaseReviewApprovalModalProps) {
  const {
    approveCaseReview,
    returnCaseForRevision,
    rejectCaseReview,
    setActiveSection,
  } = useApp();
  const { toast } = useToast();
  const prefersReducedMotion = useReducedMotion();

  const surveyComp = caseItem ? calculateFieldSurveyCompleteness(caseItem) : null;

  // Navigation tabs & Q&A filter
  const [activeTab, setActiveTab] = useState<ModalTab>('summary');
  const [qaFilterMode, setQaFilterMode] = useState<SurveyQAFilterMode>('all');

  // Action states
  const [activeAction, setActiveAction] = useState<'none' | 'approve' | 'return' | 'reject'>(
    initialAction || 'none'
  );
  const [approvalNotes, setApprovalNotes] = useState('');
  const [revisionReason, setRevisionReason] = useState(() => {
    if (initialAction === 'return' && surveyComp && surveyComp.missingItems.length > 0) {
      return `يرجى استكمال وتعديل نواقص البحث الميداني:\n- ${surveyComp.missingItems.join('\n- ')}`;
    }
    return '';
  });
  const [rejectionReason, setRejectionReason] = useState('');
  const [previewDocument, setPreviewDocument] = useState<{ title: string; fileName: string } | null>(null);

  if (!isOpen || !caseItem || !surveyComp) return null;

  const totalIncome =
    (Number(caseItem.financials?.directIncome) || 0) +
    (Number(caseItem.financials?.indirectIncome) || 0);

  const totalExpenses =
    (Number(caseItem.financials?.basicExpenses) || 0) +
    (Number(caseItem.financials?.medicalExpenses) || 0);

  const calculatedGap = caseItem.financials?.netFinancialGap ?? Math.max(0, totalExpenses - totalIncome);

  const coreDocs = getCoreDocumentsStats(caseItem);
  const paperAttachments = coreDocs.nonVoiceAttachments;
  const totalAttachments = coreDocs.completed;
  const isAttachmentsComplete = coreDocs.isComplete;

  const voiceAttachment = caseItem.attachments?.find(
    (a) =>
      a.category === 'voice_memo' ||
      a.fileName.endsWith('.webm') ||
      a.fileName.endsWith('.mp3') ||
      a.fileName.endsWith('.wav')
  );
  const effectiveVoiceUrl = caseItem.voiceNoteUrl || voiceAttachment?.url || null;
  const effectiveVoiceDuration =
    caseItem.voiceNoteDuration || voiceAttachment?.durationSeconds || 18;

  const openReturnWithMissing = () => {
    if (surveyComp.missingItems.length > 0) {
      setRevisionReason(
        `يرجى استكمال وتعديل نواقص البحث الميداني التالية:\n- ${surveyComp.missingItems.join('\n- ')}`
      );
    }
    setActiveAction('return');
  };

  const handleOpenFullSurvey = (filter: SurveyQAFilterMode = 'all') => {
    setQaFilterMode(filter);
    setActiveTab('full_survey');
  };

  const handleConfirmApprove = () => {
    approveCaseReview(caseItem.id, approvalNotes.trim() || undefined);
    setActiveAction('none');
    setApprovalNotes('');
    toast.success('تم اعتماد الحالة وإدراجها في كشوف الصرف بنجاح', {
      duration: 6000,
      action: {
        label: 'عرض في الميزانية',
        onClick: () => setActiveSection('allocation'),
      },
    });
    onClose();
  };

  const handleConfirmReturn = () => {
    if (!revisionReason.trim() || !caseItem) return;
    returnCaseForRevision(caseItem.id, revisionReason.trim());
    setActiveAction('none');
    setRevisionReason('');
    toast.info('تم إرجاع الحالة للباحث مع الملاحظات المسجلة');
    if (onSuccess) {
      onSuccess('تم إرجاع الحالة بنجاح للباحث مع الملاحظات');
    }
    onClose();
  };

  const handleConfirmReject = () => {
    if (!rejectionReason.trim()) return;
    rejectCaseReview(caseItem.id, rejectionReason.trim());
    setActiveAction('none');
    setRejectionReason('');
    toast.info('تم رفض الحالة وتسجيل السبب في السجل');
    onClose();
  };

  const getPriorityMeta = (priority: PriorityLevel) => {
    switch (priority) {
      case 'critical':
        return { label: 'أولوية حرجة', textCls: 'text-rose-700 font-semibold' };
      case 'high':
        return { label: 'أولوية عالية', textCls: 'text-slate-700 font-semibold' };
      case 'medium':
        return { label: 'أولوية متوسطة', textCls: 'text-slate-600 font-medium' };
      case 'low':
        return { label: 'أولوية منخفضة', textCls: 'text-slate-500 font-medium' };
    }
  };

  const priorityMeta = getPriorityMeta(caseItem.priority);
  const missingCount = surveyComp.missingItems.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto font-sans"
      dir="rtl"
    >
      {/* Lightbox / Document Preview Modal */}
      {previewDocument && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-bold text-sm text-slate-900">{previewDocument.title}</span>
              <button
                type="button"
                onClick={() => setPreviewDocument(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
                aria-label="إغلاق المعاينة"
              >
                <X size={18} />
              </button>
            </div>
            <div className="h-64 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center p-6 text-center space-y-2">
              <FileCheck size={48} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-800">{previewDocument.fileName}</span>
              <span className="text-[11px] text-slate-500">تم التأكد من ختم وصحة الورقة الميدانية</span>
            </div>
            <button
              type="button"
              onClick={() => setPreviewDocument(null)}
              className="w-full py-2.5 bg-[#005756] hover:bg-[#004241] text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              إغلاق المعاينة
            </button>
          </div>
        </div>
      )}

      {/* Dedicated Return for Revision Confirmation Dialog */}
      {activeAction === 'return' && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs font-sans"
          dir="rtl"
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Clean Light Dialog Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-5 sm:px-6 py-4 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                  إرجاع الحالة للباحث
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-slate-700">{caseItem.primaryName || caseItem.fullName}</span>
                  <span className="font-mono tabular-nums">({caseItem.code})</span>
                  <span>·</span>
                  <span>
                    الباحث: <strong className="text-slate-700">{caseItem.assignedResearcher || 'مش متحدد'}</strong>
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveAction('none')}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
                aria-label="إغلاق النافذة"
              >
                <X size={20} />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="p-5 sm:p-6 space-y-4">
              <p className="text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200/80 px-3.5 py-2.5 leading-relaxed">
                أول ما تأكد الإرجاع، الحالة هترجع للباحث في زياراته عشان يكمل النواقص المطلوبة.
              </p>

              {/* Quick Deficiency Suggestion List */}
              {missingCount > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700">
                    <span>الأسئلة الناقصة في الاستمارة ({missingCount}):</span>
                    <button
                      type="button"
                      onClick={() => {
                        const defaultTemplate = `يرجى استكمال وتعديل نواقص البحث الميداني:\n- ${surveyComp.missingItems.join('\n- ')}`;
                        setRevisionReason(defaultTemplate);
                      }}
                      className="text-[#005756] hover:underline text-xs font-semibold cursor-pointer whitespace-nowrap"
                    >
                      إدراج الكل في الملاحظات
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {surveyComp.missingItems.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[11px] font-semibold rounded-full"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes Textarea */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  الملاحظات والنواقص المطلوب استكمالها:
                </label>
                <textarea
                  rows={4}
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  placeholder="اكتب التوجيهات والنواقص المطلوب استكمالها من الباحث..."
                  className="w-full p-3 text-xs bg-white border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:ring-2 focus:ring-[#005756]/15 focus:border-[#005756] transition-all leading-relaxed"
                />
              </div>
            </div>

            {/* Dialog Footer Actions */}
            <div className="bg-slate-50 px-5 sm:px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setActiveAction('none')}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmReturn}
                disabled={!revisionReason.trim()}
                className="px-5 py-2 bg-[#005756] hover:bg-[#004241] disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>تأكيد الإرجاع للباحث</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Modal / Mobile Bottom-Sheet Container */}
      <div className="relative w-full max-w-3xl h-[92vh] sm:h-auto sm:max-h-[92vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden border border-slate-200">
        {/* Top Sticky Header */}
        <div className="bg-slate-50 border-b border-slate-200/80 px-4 sm:px-6 py-3.5 sm:py-4 flex items-start sm:items-center justify-between shrink-0 gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                {caseItem.primaryName || caseItem.fullName}
              </h2>
              {caseItem.secondaryName && (
                <span className="text-xs text-slate-500 font-normal">({caseItem.secondaryName})</span>
              )}
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="font-mono text-xs font-semibold text-slate-500 tabular-nums">
                {caseItem.code}
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-x-2 gap-y-1 mt-1 flex-wrap">
              <span>الباحث: {caseItem.assignedResearcher || 'مش متحدد'}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                تاريخ النزول: {caseItem.lastVisitDate || caseItem.registrationDate}
              </span>
              <span aria-hidden="true">·</span>
              <span className={priorityMeta.textCls}>{priorityMeta.label}</span>
              {caseItem.status === 'needs_revision' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-700 font-semibold">راجعة للباحث</span>
                </>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
            aria-label="إغلاق النافذة"
          >
            <X size={20} />
          </button>
        </div>

        {/* Top Calm 2-Tab Navigation Bar */}
        <div
          className="bg-white border-b border-slate-200/80 px-4 sm:px-6 shrink-0 flex items-center gap-5 sm:gap-6 overflow-x-auto"
          role="tablist"
          aria-label="أقسام فحص التقرير"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'summary'}
            onClick={() => setActiveTab('summary')}
            className={`relative py-3 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'summary' ? 'text-[#005756]' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutList size={14} className={activeTab === 'summary' ? 'text-[#005756]' : 'text-slate-400'} />
            <span>الملخص التنفيذي</span>
            {activeTab === 'summary' && (
              <motion.span
                layoutId="review-modal-tab-indicator"
                initial={false}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 420, damping: 34 }
                }
                className="absolute bottom-0 inset-x-0 h-0.5 bg-[#005756] rounded-full"
              />
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'full_survey'}
            onClick={() => setActiveTab('full_survey')}
            className={`relative py-3 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
              activeTab === 'full_survey' ? 'text-[#005756]' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList
              size={14}
              className={activeTab === 'full_survey' ? 'text-[#005756]' : 'text-slate-400'}
            />
            <span>كامل الاستمارة ({surveyComp.totalFields} سؤال)</span>
            {missingCount > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-semibold">
                {missingCount} ناقص
              </span>
            )}
            {activeTab === 'full_survey' && (
              <motion.span
                layoutId="review-modal-tab-indicator"
                initial={false}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 420, damping: 34 }
                }
                className="absolute bottom-0 inset-x-0 h-0.5 bg-[#005756] rounded-full"
              />
            )}
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-white min-w-0">
          {activeTab === 'full_survey' ? (
            <CaseSurveyQAList
              surveyComp={surveyComp}
              filterMode={qaFilterMode}
              onFilterModeChange={setQaFilterMode}
              onInsertMissingForReturn={missingCount > 0 ? openReturnWithMissing : undefined}
            />
          ) : (
            <>
              {/* Plain Neutral Status Note */}
              <p className="text-xs text-slate-500 bg-slate-50/80 border border-slate-200/80 rounded-xl px-3.5 py-2.5 leading-relaxed">
                الملف جاهز للمراجعة بعد النزول الميداني ورفع الأوراق، ومستني قرار الاعتماد للدخول في كشف الصرف.
              </p>

              {/* Researcher Field Voice Memo Card */}
              <ResearcherVoicePlayer
                audioUrl={effectiveVoiceUrl}
                durationSeconds={effectiveVoiceDuration}
                researcherName={caseItem.assignedResearcher}
                fileName={voiceAttachment?.fileName || 'تسجيل_صوتي_للباحث.webm'}
                transcriptHint={caseItem.notes}
              />

              {/* Key Metric Highlights Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70">
                  <span className="block text-[11px] text-slate-500 font-medium">العجز الشهري</span>
                  <span className="block text-sm sm:text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                    {calculatedGap.toLocaleString('ar-EG')} ج.م
                  </span>
                </div>

                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70">
                  <span className="block text-[11px] text-slate-500 font-medium">أفراد الأسرة</span>
                  <span className="block text-sm sm:text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                    {caseItem.householdMembers?.length || 1} أفراد
                  </span>
                </div>

                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70">
                  <span className="block text-[11px] text-slate-500 font-medium">الأوراق المرفوعة</span>
                  <span className="block text-xs sm:text-sm font-bold text-slate-900 font-mono tabular-nums mt-1">
                    {totalAttachments}/4 ({coreDocs.percentage}%)
                  </span>
                </div>

                {/* Survey Completeness Card — clickable to jump to full 24-question Q&A */}
                <button
                  type="button"
                  onClick={() => handleOpenFullSurvey('all')}
                  className="p-3 bg-slate-50/80 hover:bg-slate-100/80 rounded-xl border border-slate-200/70 hover:border-[#005756]/40 flex flex-col justify-between text-right transition-colors cursor-pointer"
                  title="اضغط لعرض إجابات الـ 24 سؤالاً كاملة"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="block text-[11px] text-slate-500 font-medium truncate">اكتمال الاستمارة</span>
                    <span className={`text-[10px] ${surveyComp.statusBadge.badgeClass}`}>
                      {surveyComp.statusBadge.label}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-slate-900">
                      {surveyComp.percentage}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                      {surveyComp.completedFields}/{surveyComp.totalFields} سؤال
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden mt-1">
                    <div
                      style={{ width: `${surveyComp.percentage}%` }}
                      className={`h-full rounded-full transition-all ${surveyComp.statusBadge.barClass}`}
                    />
                  </div>
                </button>

                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 col-span-2 sm:col-span-1">
                  <span className="block text-[11px] text-slate-500 font-medium">حالة السكن</span>
                  <span className="block text-xs font-bold text-slate-800 truncate mt-1">
                    {caseItem.vulnerability?.housingCondition === 'rent_unstable'
                      ? 'إيجار غير مستقر'
                      : caseItem.vulnerability?.housingCondition === 'owned'
                      ? 'سكن ملك'
                      : caseItem.vulnerability?.housingCondition === 'dilapidated_urgent'
                      ? 'مأوى غير لائق / آيل للسقوط'
                      : 'إيجار قديم'}
                  </span>
                </div>
              </div>

              {/* Missing Checklist Notice if incomplete */}
              {!surveyComp.isComplete && (
                <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                      <span>الأسئلة غير المجابة في الاستمارة ({missingCount})</span>
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleOpenFullSurvey('missing')}
                        className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-[#005756] rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        عرض النواقص في الاستمارة
                      </button>
                      <button
                        type="button"
                        onClick={openReturnWithMissing}
                        className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        إرجاع النواقص للباحث
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {surveyComp.missingItems.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 bg-rose-50 text-rose-700 rounded-full text-[11px] font-semibold"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 1: Basic Information & Address with GPS */}
              <div className="p-4 bg-white rounded-xl border border-slate-200/80 space-y-3">
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Building size={15} className="text-slate-400" />
                  <span>البيانات الأساسية والعنوان</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-500 block">الرقم القومي:</span>
                    <span className="font-mono font-bold text-slate-800 tabular-nums">
                      {caseItem.nationalId || 'مش متسجل'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-500 block">رقم الموبايل:</span>
                    <span className="font-mono font-bold text-slate-800 tabular-nums">
                      {caseItem.phone || 'مش متسجل'}
                    </span>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <span className="text-slate-500 block">العنوان بالتفصيل:</span>
                    <span className="font-bold text-slate-800">
                      {caseItem.governorate} · {caseItem.district} · {caseItem.address}
                    </span>
                    {caseItem.directionsNote && (
                      <p className="text-xs text-slate-500 mt-0.5">علامة مميزة: {caseItem.directionsNote}</p>
                    )}
                  </div>
                </div>

                {/* Map Link Row */}
                {typeof caseItem.gpsLocation?.latitude === 'number' &&
                typeof caseItem.gpsLocation?.longitude === 'number' ? (
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-slate-700 font-medium">
                      <MapPin size={15} className="text-[#005756] shrink-0" />
                      <span className="font-mono tabular-nums">
                        موقع البيت على الخريطة ({caseItem.gpsLocation.latitude}, {caseItem.gpsLocation.longitude})
                      </span>
                    </div>
                    <a
                      href={
                        caseItem.gpsLocation.mapsUrl ||
                        `https://www.google.com/maps?q=${caseItem.gpsLocation.latitude},${caseItem.gpsLocation.longitude}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#005756] hover:bg-[#004241] text-white rounded-lg text-[11px] font-semibold cursor-pointer"
                    >
                      <span>افتح الخريطة</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                ) : (
                  <div className="pt-2.5 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400" />
                    <span>لسه متسجلش موقع البيت على الخريطة في النزول ده</span>
                  </div>
                )}
              </div>

              {/* Section 2: Household Members Table */}
              <div className="p-4 bg-white rounded-xl border border-slate-200/80 space-y-3">
                <h3 className="text-xs font-bold text-slate-700 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Users size={15} className="text-slate-400" />
                    <span>أفراد الأسرة ({caseItem.householdMembers?.length || 1})</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">حصر من واقع الاستمارة</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
                        <th className="py-2 px-2.5 font-bold">الاسم</th>
                        <th className="py-2 px-2 font-bold">الصلة</th>
                        <th className="py-2 px-2 font-bold">السن</th>
                        <th className="py-2 px-2 font-bold">التعليم</th>
                        <th className="py-2 px-2 font-bold">القدرة على العمل</th>
                        <th className="py-2 px-2 font-bold">العمل والمهنة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {caseItem.householdMembers && caseItem.householdMembers.length > 0 ? (
                        caseItem.householdMembers.map((member, idx) => (
                          <tr key={member.id || idx} className="hover:bg-slate-50/70">
                            <td className="py-2 px-2.5 font-bold text-slate-900">{member.name || `فرد ${idx + 1}`}</td>
                            <td className="py-2 px-2">{member.relation}</td>
                            <td className="py-2 px-2 font-mono tabular-nums">{member.age} سنة</td>
                            <td className="py-2 px-2">{member.educationLevel || '-'}</td>
                            <td className="py-2 px-2">{member.workCapacity || '-'}</td>
                            <td className="py-2 px-2">{member.workStatus || '-'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-3 text-center text-slate-400">
                            مفيش بيانات أفراد مسجلة
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3: Financial Gap & In-depth Breakdown */}
              <div className="p-4 bg-white rounded-xl border border-slate-200/80 space-y-3">
                <h3 className="text-xs font-bold text-slate-700 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Wallet size={15} className="text-slate-400" />
                    <span>الدخل والمصاريف الشهرية</span>
                  </span>
                  <span className="text-xs font-semibold text-slate-700 font-mono tabular-nums">
                    العجز الشهري: {calculatedGap.toLocaleString('ar-EG')} ج.م
                  </span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Incomes */}
                  <div className="space-y-1.5">
                    <span className="font-bold text-slate-800 block text-[11px]">الدخل الشهري:</span>
                    <div className="flex justify-between text-slate-600">
                      <span>دخل ثابت / معاش تكافل:</span>
                      <span className="font-bold font-mono tabular-nums text-slate-800">
                        {(caseItem.financials?.directIncome || 0).toLocaleString('ar-EG')} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>شغل يومية غير منتظم:</span>
                      <span className="font-bold font-mono tabular-nums text-slate-800">
                        {(caseItem.financials?.indirectIncome || 0).toLocaleString('ar-EG')} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200/80 pt-1.5 font-bold text-slate-900">
                      <span>إجمالي الدخل:</span>
                      <span className="font-mono tabular-nums">{totalIncome.toLocaleString('ar-EG')} ج.م</span>
                    </div>
                  </div>

                  {/* Obligations */}
                  <div className="space-y-1.5 sm:border-r sm:border-slate-200/80 sm:pr-4">
                    <span className="font-bold text-slate-800 block text-[11px]">المصروفات الشهرية:</span>
                    <div className="flex justify-between text-slate-600">
                      <span>معيشة وإيجار:</span>
                      <span className="font-bold font-mono tabular-nums text-slate-800">
                        {(caseItem.financials?.basicExpenses || 0).toLocaleString('ar-EG')} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>علاج وأدوية:</span>
                      <span className="font-bold font-mono tabular-nums text-slate-800">
                        {(caseItem.financials?.medicalExpenses || 0).toLocaleString('ar-EG')} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200/80 pt-1.5 font-bold text-slate-900">
                      <span>إجمالي المصاريف:</span>
                      <span className="font-mono tabular-nums">{totalExpenses.toLocaleString('ar-EG')} ج.م</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Attachments Gallery */}
              <div className="p-4 bg-white rounded-xl border border-slate-200/80 space-y-3">
                <h3 className="text-xs font-bold text-slate-700 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-1.5">
                    <FileCheck size={15} className="text-slate-400" />
                    <span>الأوراق والمستندات المرفوعة ({paperAttachments.length})</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">اضغط للمعاينة</span>
                </h3>

                <div className="divide-y divide-slate-200/80">
                  {paperAttachments.length > 0 ? (
                    paperAttachments.map((att) => (
                      <button
                        key={att.id}
                        type="button"
                        onClick={() => setPreviewDocument({ title: att.title, fileName: att.fileName })}
                        className="w-full py-2.5 hover:bg-slate-50 text-right transition-colors flex items-center justify-between cursor-pointer group gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText size={16} className="text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="block text-xs font-semibold text-slate-800 truncate">{att.title}</span>
                            <span className="block text-[11px] text-slate-500">{att.fileSize || 'ملف مرفق'}</span>
                          </div>
                        </div>
                        <Eye size={15} className="text-slate-400 group-hover:text-[#005756] shrink-0" />
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-400">
                      مفيش أوراق مرفوعة للحالة دي لسه
                    </div>
                  )}
                </div>
              </div>

              {/* Section 5A: Field Researcher Observations & Recommendation */}
              {(caseItem.caseSummary || caseItem.researcherRecommendation) && (
                <div className="p-4 bg-white rounded-xl border border-slate-200/80 space-y-3 text-xs">
                  <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <User size={15} className="text-[#005756]" />
                    <span>معاينة وتوصية الباحث الميدانية</span>
                  </h3>
                  {caseItem.caseSummary && (
                    <div className="space-y-1">
                      <span className="block text-[11px] font-semibold text-slate-500">
                        وصف السكن والمعاينة الميدانية:
                      </span>
                      <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                        {caseItem.caseSummary}
                      </p>
                    </div>
                  )}
                  {caseItem.researcherRecommendation && (
                    <div className="pt-2.5 border-t border-slate-100 space-y-1">
                      <span className="block text-[11px] font-semibold text-slate-700">
                        توصية الباحث الختامية:
                      </span>
                      <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                        {caseItem.researcherRecommendation}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Section 5B: Administrative Review & Revision Audit Log */}
              {(caseItem.adminRevisionNote || caseItem.notes) && (
                <div className="p-4 bg-white rounded-xl border border-slate-200/80 space-y-3 text-xs">
                  <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <RotateCcw size={15} className="text-slate-400" />
                    <span>سجل المراجعة والإرجاع الإداري</span>
                  </h3>
                  {caseItem.adminRevisionNote && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg space-y-1">
                      <span className="block text-[11px] font-semibold text-amber-900">
                        ملاحظة الاستيفاء الحالية:
                      </span>
                      <p className="text-amber-900/90 leading-relaxed whitespace-pre-line">
                        {caseItem.adminRevisionNote}
                      </p>
                    </div>
                  )}
                  {caseItem.notes && (
                    <div className="space-y-1">
                      <span className="block text-[11px] font-semibold text-slate-500">
                        السجل الزمني للإدارة:
                      </span>
                      <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                        {caseItem.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Pinned Inline Confirmation Panel (accessible from BOTH tabs without scrolling) */}
        {activeAction === 'approve' && (
          <div className="px-4 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200/80 shrink-0 space-y-2.5">
            <span className="text-xs font-bold text-slate-800 block">
              تأكيد اعتماد الحالة وإضافتها في كشف الصرف
            </span>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="ملاحظات الاعتماد أو أي شروط (اختياري)..."
                className="flex-1 p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15"
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleConfirmApprove}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-[#005756] hover:bg-[#004241] text-white rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
                >
                  تأكيد الاعتماد النهائي
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAction('none')}
                  className="px-3.5 py-2.5 border border-slate-200 bg-white text-slate-600 rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {activeAction === 'reject' && (
          <div className="px-4 sm:px-6 py-3.5 bg-slate-50 border-t border-rose-200 shrink-0 space-y-2.5">
            <span className="text-xs font-bold text-slate-800 block">
              رفض واستبعاد الحالة من الدعم
            </span>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="اكتب سبب الاستبعاد أو عدم الاستحقاق..."
                className="flex-1 p-2.5 text-xs bg-white border border-slate-200 rounded-lg font-medium focus:outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15"
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={!rejectionReason.trim()}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
                >
                  تأكيد الاستبعاد
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAction('none')}
                  className="px-3.5 py-2.5 border border-slate-200 bg-white text-slate-600 rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Sticky Decision Action Bar */}
        <div className="bg-slate-50 px-4 sm:px-6 py-3 border-t border-slate-200/80 shrink-0 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Approve button */}
            {surveyComp.isComplete && isAttachmentsComplete ? (
              <button
                type="button"
                onClick={() => setActiveAction('approve')}
                className="px-4 sm:px-5 py-2 bg-[#005756] hover:bg-[#004241] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <CheckCircle2 size={15} />
                <span>اعتماد للصرف (مكتمل 100%)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveAction('approve')}
                className="px-4 py-2 bg-[#005756] hover:bg-[#004241] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <CheckCircle2 size={15} />
                <span>اعتماد للصرف</span>
              </button>
            )}

            {/* Return for revision */}
            <button
              type="button"
              onClick={() => {
                if (surveyComp.missingItems.length > 0 && !revisionReason) {
                  setRevisionReason(
                    `يرجى استكمال وتعديل نواقص البحث الميداني:\n- ${surveyComp.missingItems.join('\n- ')}`
                  );
                }
                setActiveAction('return');
              }}
              className="px-3.5 py-2 border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw size={14} className="text-slate-400" />
              <span>إرجاع للباحث</span>
            </button>

            {/* Reject / Exclude */}
            <button
              type="button"
              onClick={() => setActiveAction('reject')}
              className="px-3 py-2 border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Ban size={14} />
              <span>رفض واستبعاد</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs font-medium text-slate-500 tabular-nums">
              اكتمال الاستمارة: <strong className="text-slate-800">{surveyComp.percentage}%</strong> ({surveyComp.completedFields}/{surveyComp.totalFields} سؤال)
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
