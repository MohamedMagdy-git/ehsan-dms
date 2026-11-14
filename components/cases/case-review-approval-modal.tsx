'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
import {
  X,
  CheckCircle2,
  RotateCcw,
  Ban,
  MapPin,
  ExternalLink,
  Users,
  Wallet,
  Activity,
  FileText,
  FileCheck,
  Calendar,
  Phone,
  User,
  Building,
  AlertTriangle,
  Eye,
  Check,
} from 'lucide-react';
import { BeneficiaryCase, PriorityLevel } from '@/types';
import { calculateFieldSurveyCompleteness } from '@/lib/survey-completeness';
import { ResearcherVoicePlayer } from '@/components/common/researcher-voice-player';

interface CaseReviewApprovalModalProps {
  caseItem: BeneficiaryCase | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  initialAction?: 'none' | 'approve' | 'return' | 'reject';
}

export function CaseReviewApprovalModal({
  caseItem,
  isOpen,
  onClose,
  onSuccess,
  initialAction = 'none',
}: CaseReviewApprovalModalProps) {
  const { approveCaseReview, returnCaseForRevision, rejectCaseReview } = useApp();

  const surveyComp = caseItem ? calculateFieldSurveyCompleteness(caseItem) : null;

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

  if (!isOpen || !caseItem) return null;

  const totalIncome =
    (Number(caseItem.financials?.directIncome) || 0) +
    (Number(caseItem.financials?.indirectIncome) || 0);

  const totalExpenses =
    (Number(caseItem.financials?.basicExpenses) || 0) +
    (Number(caseItem.financials?.medicalExpenses) || 0);

  const calculatedGap = caseItem.financials?.netFinancialGap ?? Math.max(0, totalExpenses - totalIncome);

  const totalAttachments = caseItem.attachments?.length || 0;
  const isAttachmentsComplete = totalAttachments >= 3;

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

  const handleConfirmApprove = () => {
    approveCaseReview(caseItem.id, approvalNotes.trim() || undefined);
    setActiveAction('none');
    setApprovalNotes('');
    onClose();
  };

  const handleConfirmReturn = () => {
    if (!revisionReason.trim() || !caseItem) return;
    returnCaseForRevision(caseItem.id, revisionReason.trim());
    setActiveAction('none');
    setRevisionReason('');
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto font-sans"
      dir="rtl"
    >
      {/* Lightbox / Document Preview Modal */}
      {previewDocument && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-bold text-sm text-slate-900">{previewDocument.title}</span>
              <button
                type="button"
                onClick={() => setPreviewDocument(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
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

      {/* Dedicated Return for Revision Confirmation Dialog (Centered Modal with Backdrop) */}
      {activeAction === 'return' && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs font-sans animate-in fade-in duration-150"
          dir="rtl"
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Clean Light Dialog Header */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 leading-tight">
                  إرجاع الحالة للباحث
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-slate-700">{caseItem.primaryName || caseItem.fullName}</span>
                  <span className="font-mono tabular-nums">({caseItem.code})</span>
                  <span>·</span>
                  <span>الباحث: <strong className="text-slate-700">{caseItem.assignedResearcher || 'مش متحدد'}</strong></span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveAction('none')}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                aria-label="إغلاق النافذة"
              >
                <X size={20} />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="p-6 space-y-4">
              {/* Calm Inline Note */}
              <p className="text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200/80 px-3.5 py-2.5 leading-relaxed">
                أول ما تأكد الإرجاع، الحالة هترجع للباحث في زياراته عشان يكمل النواقص المطلوبة.
              </p>

              {/* Quick Deficiency Suggestion List (if available) */}
              {surveyComp && surveyComp.missingItems.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>البيانات الناقصة في الاستمارة:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const defaultTemplate = `يرجى استكمال وتعديل نواقص البحث الميداني:\n- ${surveyComp.missingItems.join('\n- ')}`;
                        setRevisionReason(defaultTemplate);
                      }}
                      className="text-[#005756] hover:underline text-xs font-semibold cursor-pointer"
                    >
                      إدراج الكل في الملاحظات
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {surveyComp.missingItems.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-semibold rounded-md"
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
            <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5">
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

      {/* Main Drawer Container */}
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Top Header - Clean Light Gray */}
        <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-4 flex items-center justify-between shrink-0 gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-800 leading-tight">
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
            <p className="text-xs text-slate-500 flex items-center gap-2 mt-1 flex-wrap">
              <span>الباحث: {caseItem.assignedResearcher || 'مش متحدد'}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">تاريخ النزول: {caseItem.lastVisitDate || caseItem.registrationDate}</span>
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

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
          
          {/* Plain Neutral Status Note */}
          <p className="text-xs text-slate-500 bg-slate-50/80 border border-slate-200/80 rounded-xl px-3.5 py-2.5 leading-relaxed">
            الملف جاهز للمراجعة بعد النزول الميداني ورفع الأوراق، ومستني قرار الاعتماد للدخول في كشف الصرف.
          </p>

          {/* Researcher Field Voice Memo Card (Admin Audio Player) */}
          <ResearcherVoicePlayer
            audioUrl={effectiveVoiceUrl}
            durationSeconds={effectiveVoiceDuration}
            researcherName={caseItem.assignedResearcher}
            fileName={voiceAttachment?.fileName || 'تسجيل_صوتي_للباحث.webm'}
            transcriptHint={caseItem.notes}
          />

          {/* Key Metric Highlights Grid (5 Neutral Slate Cards) */}
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
                {totalAttachments}/4 ({Math.round((Math.min(totalAttachments, 4) / 4) * 100)}%)
              </span>
            </div>

            {/* Survey Completeness Card */}
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1">
                <span className="block text-[11px] text-slate-500 font-medium truncate">اكتمال الاستمارة</span>
                <span className={`text-[10px] ${surveyComp?.statusBadge.badgeClass}`}>
                  {surveyComp?.statusBadge.label}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-slate-900">
                  {surveyComp?.percentage}%
                </span>
                <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                  {surveyComp?.completedFields}/22 حقل
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden mt-1">
                <div
                  style={{ width: `${surveyComp?.percentage}%` }}
                  className={`h-full rounded-full transition-all ${surveyComp?.statusBadge.barClass}`}
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 col-span-2 sm:col-span-1">
              <span className="block text-[11px] text-slate-500 font-medium">حالة السكن</span>
              <span className="block text-xs font-bold text-slate-800 truncate mt-1">
                {caseItem.vulnerability?.housingCondition === 'rent_unstable'
                  ? 'إيجار غير مستقر'
                  : caseItem.vulnerability?.housingCondition === 'owned'
                  ? 'سكن ملك'
                  : 'إيجار قديم'}
              </span>
            </div>
          </div>

          {/* Missing Checklist Notice if incomplete */}
          {surveyComp && !surveyComp.isComplete && (
            <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <AlertTriangle size={15} className="text-slate-400 shrink-0" />
                  <span>البيانات الناقصة في الاستمارة ({surveyComp.missingItems.length})</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveAction('return');
                    setRevisionReason(`يرجى استكمال وتعديل نواقص البحث الميداني التالية:\n- ${surveyComp.missingItems.join('\n- ')}`);
                  }}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer self-start sm:self-auto"
                >
                  إرجاع النواقص للباحث
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {surveyComp.missingItems.map((item, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-white text-slate-600 border border-slate-200/80 rounded-md text-[11px] font-medium">
                    · {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Section 1: Basic Information & Address with GPS */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Building size={15} className="text-slate-400" />
              <span>البيانات الأساسية والعنوان</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 block">الرقم القومي:</span>
                <span className="font-mono font-bold text-slate-800 tabular-nums">{caseItem.nationalId || 'مش متسجل'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block">رقم الموبايل:</span>
                <span className="font-mono font-bold text-slate-800 tabular-nums">{caseItem.phone || 'مش متسجل'}</span>
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

            {/* Map Link Card */}
            {caseItem.gpsLocation ? (
              <div className="p-2.5 bg-slate-50/80 border border-slate-200/80 rounded-lg flex items-center justify-between text-xs gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <MapPin size={15} className="text-slate-400 shrink-0" />
                  <span className="font-mono tabular-nums">
                    موقع البيت على الخريطة ({caseItem.gpsLocation.latitude}, {caseItem.gpsLocation.longitude})
                  </span>
                </div>
                {caseItem.gpsLocation.mapsUrl && (
                  <a
                    href={caseItem.gpsLocation.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#005756] hover:bg-[#004241] text-white rounded-lg text-[11px] font-semibold cursor-pointer"
                  >
                    <span>افتح الخريطة</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            ) : (
              <div className="p-2.5 bg-slate-50/80 rounded-lg text-xs text-slate-500 flex items-center gap-2">
                <MapPin size={14} className="text-slate-400" />
                <span>لسه متسجلش موقع البيت على الخريطة في النزول ده</span>
              </div>
            )}
          </div>

          {/* Section 2: Household Members Table */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
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
                        <td className="py-2 px-2 font-mono">{member.age} سنة</td>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Incomes */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 space-y-1.5">
                <span className="font-bold text-slate-800 block text-[11px]">الدخل الشهري:</span>
                <div className="flex justify-between text-slate-600">
                  <span>دخل ثابت / معاش تكافل:</span>
                  <span className="font-bold font-mono tabular-nums text-slate-800">{caseItem.financials?.directIncome || 0} ج.م</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>شغل يومية غير منتظم:</span>
                  <span className="font-bold font-mono tabular-nums text-slate-800">{caseItem.financials?.indirectIncome || 0} ج.م</span>
                </div>
                <div className="flex justify-between border-t border-slate-200/80 pt-1 font-bold text-slate-900">
                  <span>إجمالي الدخل:</span>
                  <span className="font-mono tabular-nums">{totalIncome.toLocaleString('ar-EG')} ج.م</span>
                </div>
              </div>

              {/* Obligations */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 space-y-1.5">
                <span className="font-bold text-slate-800 block text-[11px]">المصروفات الشهرية:</span>
                <div className="flex justify-between text-slate-600">
                  <span>معيشة وإيجار:</span>
                  <span className="font-bold font-mono tabular-nums text-slate-800">{caseItem.financials?.basicExpenses || 0} ج.م</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>علاج وأدوية:</span>
                  <span className="font-bold font-mono tabular-nums text-slate-800">{caseItem.financials?.medicalExpenses || 0} ج.م</span>
                </div>
                <div className="flex justify-between border-t border-slate-200/80 pt-1 font-bold text-slate-900">
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
                <span>الأوراق والمستندات المرفوعة ({totalAttachments})</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">اضغط للمعاينة</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {caseItem.attachments && caseItem.attachments.length > 0 ? (
                caseItem.attachments.map((att) => (
                  <button
                    key={att.id}
                    type="button"
                    onClick={() => setPreviewDocument({ title: att.title, fileName: att.fileName })}
                    className="p-2.5 rounded-xl border border-slate-200/80 hover:border-[#005756] bg-slate-50/70 hover:bg-slate-50 text-right transition-colors flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="truncate">
                        <span className="block text-xs font-semibold text-slate-800 truncate">{att.title}</span>
                        <span className="block text-[11px] text-slate-500">{att.fileSize || 'ملف مرفق'}</span>
                      </div>
                    </div>
                    <Eye size={15} className="text-slate-400 group-hover:text-[#005756] shrink-0 mr-1" />
                  </button>
                ))
              ) : (
                <div className="col-span-2 text-center py-4 text-xs text-slate-400">
                  مفيش أوراق مرفوعة للحالة دي لسه
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Case Audit Log & Revision Notes History */}
          {caseItem.notes && (
            <div className="p-4 bg-white rounded-xl border border-slate-200/80 space-y-2.5 text-xs">
              <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <FileText size={15} className="text-slate-400" />
                <span>سجل المراجعات والملاحظات السابقة</span>
              </h3>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                {caseItem.notes}
              </p>
            </div>
          )}

          {/* Action Expansion Panels */}
          {activeAction === 'approve' && (
            <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-3 animate-in fade-in">
              <span className="text-xs font-bold text-slate-800 block">
                تأكيد اعتماد الحالة وإضافتها في كشف الصرف
              </span>
              <input
                type="text"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="ملاحظات الاعتماد أو أي شروط (اختياري)..."
                className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirmApprove}
                  className="flex-1 py-2.5 bg-[#005756] hover:bg-[#004241] text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  تأكيد الاعتماد النهائي
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAction('none')}
                  className="px-4 py-2.5 border border-slate-200 bg-white text-slate-600 rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {activeAction === 'reject' && (
            <div className="p-4 bg-slate-50/80 border border-rose-200 rounded-xl space-y-3 animate-in fade-in">
              <span className="text-xs font-bold text-slate-800 block">
                رفض واستبعاد الحالة من الدعم
              </span>
              <input
                type="text"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="اكتب سبب الاستبعاد أو عدم الاستحقاق..."
                className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg font-medium focus:outline-hidden focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={!rejectionReason.trim()}
                  className="flex-1 py-2.5 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  تأكيد الاستبعاد
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAction('none')}
                  className="px-4 py-2.5 border border-slate-200 bg-white text-slate-600 rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Bottom Decision Action Bar */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200/80 shrink-0 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Approve button */}
            {surveyComp?.isComplete && isAttachmentsComplete ? (
              <button
                type="button"
                onClick={() => setActiveAction('approve')}
                className="px-5 py-2 bg-[#005756] hover:bg-[#004241] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 size={15} />
                <span>اعتماد للصرف (مكتمل 100%)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveAction('approve')}
                className="px-4 py-2 bg-[#005756] hover:bg-[#004241] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 size={15} />
                <span>اعتماد للصرف</span>
              </button>
            )}

            {/* Return for revision */}
            <button
              type="button"
              onClick={() => {
                if (surveyComp && surveyComp.missingItems.length > 0 && !revisionReason) {
                  setRevisionReason(`يرجى استكمال وتعديل نواقص البحث الميداني:\n- ${surveyComp.missingItems.join('\n- ')}`);
                }
                setActiveAction('return');
              }}
              className="px-3.5 py-2 border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={14} className="text-slate-400" />
              <span>إرجاع للباحث</span>
            </button>

            {/* Reject / Exclude */}
            <button
              type="button"
              onClick={() => setActiveAction('reject')}
              className="px-3 py-2 border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Ban size={14} />
              <span>رفض واستبعاد</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {surveyComp && (
              <span className="hidden sm:inline text-xs font-medium text-slate-500 tabular-nums">
                جاهزية البحث: <strong className="text-slate-800">{surveyComp.percentage}%</strong> ({surveyComp.completedFields}/{surveyComp.totalFields} حقل)
              </span>
            )}
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
