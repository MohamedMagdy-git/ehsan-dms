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
  Printer,
  Eye,
  Check,
  ShieldCheck,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { BeneficiaryCase, PriorityLevel } from '@/types';
import { calculateFieldSurveyCompleteness } from '@/lib/survey-completeness';

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

  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case 'critical':
        return { label: 'أولوية حرجة', cls: 'bg-rose-100 text-rose-950 border-rose-300' };
      case 'high':
        return { label: 'أولوية عالية', cls: 'bg-amber-100 text-amber-950 border-amber-300' };
      case 'medium':
        return { label: 'أولوية متوسطة', cls: 'bg-teal-100 text-teal-950 border-teal-300' };
      case 'low':
        return { label: 'أولوية منخفضة', cls: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
  };

  const priorityMeta = getPriorityBadge(caseItem.priority);

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
            <div className="h-64 bg-slate-100 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center p-6 text-center space-y-2">
              <FileCheck size={48} className="text-teal-700" />
              <span className="text-xs font-bold text-slate-800">{previewDocument.fileName}</span>
              <span className="text-[11px] text-slate-500">تم التحقق من ختم وصحة المستند الميداني</span>
            </div>
            <button
              type="button"
              onClick={() => setPreviewDocument(null)}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              إغلاق المعاينة
            </button>
          </div>
        </div>
      )}

      {/* Dedicated Return for Revision Confirmation Dialog (Centered Modal with Backdrop) */}
      {activeAction === 'return' && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs font-sans animate-in fade-in duration-150"
          dir="rtl"
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-amber-300 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dialog Header */}
            <div className="bg-amber-500/10 border-b border-amber-200/80 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center shadow-xs shrink-0">
                  <RotateCcw size={20} className="text-amber-800" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    إرجاع الحالة للباحث الميداني للاستكمال
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-amber-950">{caseItem.primaryName || caseItem.fullName}</span>
                    <span>({caseItem.code})</span>
                    <span>·</span>
                    <span>الباحث: <strong className="text-slate-800">{caseItem.assignedResearcher || 'غير محدد'}</strong></span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveAction('none')}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-white/80 transition-colors cursor-pointer"
                aria-label="إغلاق النافذة"
              >
                <X size={18} />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="p-5 space-y-4">
              {/* Context Notice */}
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-xs text-amber-950 leading-relaxed">
                سيتم حفظ التوجيهات فوراً وتتحول حالة البحث إلى <strong>(بانتظار استكمال النواقص)</strong> لتظهر للباحث في زياراته الميدانية لإعادة استيفاء المطلوب.
              </div>

              {/* Quick Deficiency Suggestion Chips (if available) */}
              {surveyComp && surveyComp.missingItems.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span>النواقص المرصودة آلياً بالاستمارة:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const defaultTemplate = `يرجى استكمال وتعديل نواقص البحث الميداني:\n- ${surveyComp.missingItems.join('\n- ')}`;
                        setRevisionReason(defaultTemplate);
                      }}
                      className="text-amber-700 hover:underline text-[11px] font-semibold cursor-pointer"
                    >
                      إدراج الكل بالملاحظات
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {surveyComp.missingItems.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-bold rounded-md"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes Textarea */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  الملاحظات والنواقص المطلوب استيفاؤها من الباحث:
                </label>
                <textarea
                  rows={4}
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  placeholder="اكتب التوجيهات والنواقص المطلوب استيفاؤها من الباحث..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all leading-relaxed"
                />
              </div>
            </div>

            {/* Dialog Footer Actions */}
            <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setActiveAction('none')}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmReturn}
                disabled={!revisionReason.trim()}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>تأكيد الإرجاع للباحث</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Drawer Container */}
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Top Header - Institutional Deep Teal */}
        <div className="bg-[#005756] text-white px-5 py-4 flex items-center justify-between shrink-0 border-b border-teal-800 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-800/90 border border-teal-600/80 flex items-center justify-center font-mono font-bold text-teal-200 text-sm shadow-inner">
              {caseItem.code}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                  {caseItem.primaryName || caseItem.fullName}
                </h2>
                {caseItem.secondaryName && (
                  <span className="text-xs text-teal-100 font-medium">({caseItem.secondaryName})</span>
                )}
              </div>
              <p className="text-[11px] text-teal-100/80 flex items-center gap-2 mt-0.5">
                <span>مسؤول البحث: {caseItem.assignedResearcher || 'غير محدد'}</span>
                <span>·</span>
                <span>تاريخ الزيارة: {caseItem.lastVisitDate || caseItem.registrationDate}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${priorityMeta.cls}`}>
              {priorityMeta.label}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-teal-100 hover:text-white p-1.5 rounded-xl hover:bg-teal-700/60 transition-colors cursor-pointer"
              aria-label="إغلاق النافذة"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50">
          
          {/* Status Alert Banner */}
          <div className="p-3.5 bg-amber-50 border border-amber-200/90 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-950">
            <div className="flex items-center gap-2.5">
              <Clock size={18} className="text-amber-700 shrink-0" />
              <div>
                <span className="font-bold block">الحالة بانتظار المراجعة والاعتماد الإداري</span>
                <span className="text-[11px] text-amber-800">
                  تم الانتهاء من المعاينة الميدانية ورفع المستندات الثبوتية ومحتاجة قرار المدير للانضمام لدورة الصرف.
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-amber-200/80 rounded-xl font-bold text-[11px] text-amber-900 shrink-0">
              بانتظار المراجعة
            </span>
          </div>

          {/* Key Metric Highlights Grid (5 Cards on tablet/desktop) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="block text-[10px] text-slate-500 font-medium">العجز الشهري (الفجوة)</span>
              <span className="block text-sm sm:text-base font-black text-teal-800 font-mono mt-0.5">
                {calculatedGap.toLocaleString('ar-EG')} ج.م
              </span>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="block text-[10px] text-slate-500 font-medium">قوام أفراد الأسرة</span>
              <span className="block text-sm sm:text-base font-black text-slate-800 font-mono mt-0.5">
                {caseItem.householdMembers?.length || 1} أفراد
              </span>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="block text-[10px] text-slate-500 font-medium">اكتمال الثبوتيات</span>
              <span className={`block text-xs sm:text-sm font-black mt-1 ${isAttachmentsComplete ? 'text-emerald-700' : 'text-amber-700'}`}>
                {totalAttachments}/4 ({Math.round((Math.min(totalAttachments, 4) / 4) * 100)}%) {isAttachmentsComplete ? '✓' : ''}
              </span>
            </div>

            {/* Dedicated Survey Completeness Card with Progress Bar and Dynamic Badge */}
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1">
                <span className="block text-[10px] text-slate-500 font-medium truncate">اكتمال البحث</span>
                <span className={`text-[8.5px] px-1.5 py-0.2 rounded-full border font-bold ${surveyComp?.statusBadge.badgeClass}`}>
                  {surveyComp?.statusBadge.label}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-sm sm:text-base font-black font-mono text-slate-900">
                  {surveyComp?.percentage}%
                </span>
                <span className="text-[9.5px] text-slate-400 font-mono">
                  {surveyComp?.completedFields}/22 حقل
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                <div
                  style={{ width: `${surveyComp?.percentage}%` }}
                  className={`h-full rounded-full transition-all ${surveyComp?.statusBadge.barClass}`}
                />
              </div>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
              <span className="block text-[10px] text-slate-500 font-medium">الحالة السكنية</span>
              <span className="block text-xs font-bold text-slate-800 truncate mt-1">
                {caseItem.vulnerability?.housingCondition === 'rent_unstable'
                  ? 'إيجار غير مستقر'
                  : caseItem.vulnerability?.housingCondition === 'owned'
                  ? 'سكن ملك'
                  : 'إيجار قديم'}
              </span>
            </div>
          </div>

          {/* Missing Checklist Alert Box if incomplete */}
          {surveyComp && !surveyComp.isComplete && (
            <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-2xl space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <AlertTriangle size={15} className="text-amber-700 shrink-0" />
                  <span>تنبيه نواقص الاستمارة الميدانية ({surveyComp.missingItems.length} عناصر ناقصة)</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveAction('return');
                    setRevisionReason(`يرجى استكمال وتعديل نواقص البحث الميداني التالية:\n- ${surveyComp.missingItems.join('\n- ')}`);
                  }}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto"
                >
                  تنبيه الباحث بهذه النواقص بضغطة زر
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {surveyComp.missingItems.map((item, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-white text-amber-900 border border-amber-200 rounded-lg text-[10px] font-semibold">
                    • {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Section 1: Basic Information & Address with GPS */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Building size={15} className="text-teal-700" />
              <span>البيانات الأساسية ومحل الإقامة الميداني</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 block">الرقم القومي:</span>
                <span className="font-mono font-bold text-slate-900">{caseItem.nationalId || 'غير مسجل'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 block">رقم الهاتف والتواصل:</span>
                <span className="font-mono font-bold text-slate-900">{caseItem.phone || 'غير مسجل'}</span>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <span className="text-slate-500 block">العنوان بالتفصيل:</span>
                <span className="font-bold text-slate-900">
                  {caseItem.governorate} - {caseItem.district} - {caseItem.address}
                </span>
                {caseItem.directionsNote && (
                  <p className="text-[11px] text-slate-500 mt-0.5">علامة مميزة: {caseItem.directionsNote}</p>
                )}
              </div>
            </div>

            {/* GPS Link Card */}
            {caseItem.gpsLocation ? (
              <div className="p-2.5 bg-teal-50/70 border border-teal-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-teal-900 font-semibold">
                  <MapPin size={15} className="text-teal-700 shrink-0" />
                  <span>
                    تم توثيق إحداثيات GPS الميدانية ({caseItem.gpsLocation.latitude}, {caseItem.gpsLocation.longitude})
                  </span>
                </div>
                {caseItem.gpsLocation.mapsUrl && (
                  <a
                    href={caseItem.gpsLocation.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    <span>عرض على الخريطة</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            ) : (
              <div className="p-2.5 bg-slate-100 rounded-xl text-xs text-slate-500 flex items-center gap-2">
                <MapPin size={14} className="text-slate-400" />
                <span>إحداثيات GPS غير مثبتة لهذه الزيارة</span>
              </div>
            )}
          </div>

          {/* Section 2: Household Members Table */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="flex items-center gap-1.5">
                <Users size={15} className="text-teal-700" />
                <span>جدول أفراد الأسرة المقيمين ({caseItem.householdMembers?.length || 1})</span>
              </span>
              <span className="text-[11px] text-slate-500">حصر كامل من واقع نموذج PDF</span>
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
                        لا توجد بيانات أفراد مسجلة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Financial Gap & In-depth Breakdown */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="flex items-center gap-1.5">
                <Wallet size={15} className="text-teal-700" />
                <span>التحليل المالي واحتساب العجز الشهري (الفجوة المالية)</span>
              </span>
              <span className="text-xs font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                العجز الشهري: {calculatedGap.toLocaleString('ar-EG')} ج.م
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Incomes */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-1.5">
                <span className="font-bold text-emerald-950 block text-[11px]">الدخول الشهرية:</span>
                <div className="flex justify-between text-slate-700">
                  <span>دخل رسمي / معاش تكافل:</span>
                  <span className="font-bold font-mono">{caseItem.financials?.directIncome || 0} ج.م</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>دخل غير منتظم / يوميات:</span>
                  <span className="font-bold font-mono">{caseItem.financials?.indirectIncome || 0} ج.م</span>
                </div>
                <div className="flex justify-between border-t border-emerald-200 pt-1 font-bold text-emerald-900">
                  <span>إجمالي الدخل الشهري:</span>
                  <span className="font-mono">{totalIncome.toLocaleString('ar-EG')} ج.م</span>
                </div>
              </div>

              {/* Obligations */}
              <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200/80 space-y-1.5">
                <span className="font-bold text-rose-950 block text-[11px]">المصروفات والالتزامات:</span>
                <div className="flex justify-between text-slate-700">
                  <span>مصروفات أساسية وإيجار:</span>
                  <span className="font-bold font-mono">{caseItem.financials?.basicExpenses || 0} ج.م</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>علاج وفحوصات دورية:</span>
                  <span className="font-bold font-mono">{caseItem.financials?.medicalExpenses || 0} ج.م</span>
                </div>
                <div className="flex justify-between border-t border-rose-200 pt-1 font-bold text-rose-900">
                  <span>إجمالي الالتزامات:</span>
                  <span className="font-mono">{totalExpenses.toLocaleString('ar-EG')} ج.م</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Attachments Gallery */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="flex items-center gap-1.5">
                <FileCheck size={15} className="text-teal-700" />
                <span>معرض المستندات الثبوتية والمرفقات ({totalAttachments})</span>
              </span>
              <span className="text-[11px] text-teal-800 font-bold">انقر لمعاينة المستند</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {caseItem.attachments && caseItem.attachments.length > 0 ? (
                caseItem.attachments.map((att) => (
                  <button
                    key={att.id}
                    type="button"
                    onClick={() => setPreviewDocument({ title: att.title, fileName: att.fileName })}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-teal-500 bg-slate-50/80 hover:bg-teal-50/50 text-right transition-all flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="truncate">
                        <span className="block text-xs font-bold text-slate-900 truncate">{att.title}</span>
                        <span className="block text-[10px] text-slate-500 font-mono">{att.fileSize || '1.2 MB'}</span>
                      </div>
                    </div>
                    <Eye size={15} className="text-slate-400 group-hover:text-teal-700 shrink-0 mr-1" />
                  </button>
                ))
              ) : (
                <div className="col-span-2 text-center py-4 text-xs text-slate-400">
                  لم يتم إرفاق أي مستندات مصورة لهذه الحالة
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Researcher Notes and Summary */}
          {caseItem.notes && (
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2 text-xs">
              <span className="font-bold text-slate-900 block flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <FileText size={14} className="text-teal-700" />
                <span>تقرير المعاينة وتوصيات الباحث الميداني</span>
              </span>
              <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                {caseItem.notes}
              </p>
            </div>
          )}

          {/* Action Expansion Panels */}
          {activeAction === 'approve' && (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl space-y-3 animate-in fade-in">
              <span className="text-xs font-black text-emerald-950 block">
                تأكيد اعتماد الحالة ونقلها للمستحقين النشطين (Active Eligible)
              </span>
              <input
                type="text"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="ملاحظات الاعتماد الإداري أو شروط الاستحقاق (اختياري)..."
                className="w-full p-2.5 text-xs bg-white border border-emerald-300 rounded-xl"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirmApprove}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  تأكيد الاعتماد المالي النهائي
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAction('none')}
                  className="px-4 py-2.5 border border-slate-300 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}



          {activeAction === 'reject' && (
            <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-2xl space-y-3 animate-in fade-in">
              <span className="text-xs font-black text-rose-950 block">
                استبعاد الحالة وعدم الاعتماد بقرار إداري
              </span>
              <input
                type="text"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="اكتب سبب الاستبعاد أو عدم الاستحقاق الشرعي/الإداري..."
                className="w-full p-2.5 text-xs bg-white border border-rose-300 rounded-xl font-medium"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={!rejectionReason.trim()}
                  className="flex-1 py-2.5 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  تأكيد الاستبعاد
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAction('none')}
                  className="px-4 py-2.5 border border-slate-300 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Bottom Decision Action Bar */}
        <div className="bg-white px-5 py-3.5 border-t border-slate-200 shrink-0 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* If fully complete: Approve is primary green glow */}
            {surveyComp?.isComplete && isAttachmentsComplete ? (
              <button
                type="button"
                onClick={() => setActiveAction('approve')}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black rounded-xl shadow-md ring-2 ring-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>اعتماد رسمي للصرف (مكتمل 100%)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveAction('approve')}
                className="px-4 py-2.5 border border-emerald-600 text-emerald-800 hover:bg-emerald-50 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>اعتماد رسمي</span>
              </button>
            )}

            {/* If incomplete: Return for revision is prominent amber */}
            {!surveyComp?.isComplete || !isAttachmentsComplete ? (
              <button
                type="button"
                onClick={() => {
                  if (surveyComp && surveyComp.missingItems.length > 0 && !revisionReason) {
                    setRevisionReason(`يرجى استكمال وتعديل نواقص البحث الميداني:\n- ${surveyComp.missingItems.join('\n- ')}`);
                  }
                  setActiveAction('return');
                }}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md ring-2 ring-amber-400/40 transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
              >
                <RotateCcw size={15} />
                <span>إرجاع للباحث للاستكمال</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (surveyComp && surveyComp.missingItems.length > 0 && !revisionReason) {
                    setRevisionReason(`يرجى استكمال وتعديل نواقص البحث الميداني:\n- ${surveyComp.missingItems.join('\n- ')}`);
                  }
                  setActiveAction('return');
                }}
                className="px-3.5 py-2.5 border border-amber-400 text-amber-800 hover:bg-amber-50 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={15} />
                <span>إرجاع للباحث للاستكمال</span>
              </button>
            )}

            {/* Button 3: Reject / Exclude */}
            <button
              type="button"
              onClick={() => setActiveAction('reject')}
              className="px-3 py-2.5 border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Ban size={15} />
              <span>استبعاد</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {surveyComp && (
              <span className="hidden sm:inline text-[11px] font-bold text-slate-500">
                جاهزية البحث: <strong className={surveyComp.isComplete ? 'text-emerald-700' : 'text-amber-700'}>{surveyComp.percentage}%</strong> ({surveyComp.completedFields}/{surveyComp.totalFields} حقل)
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
