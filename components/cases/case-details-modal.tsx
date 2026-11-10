'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import {
  X,
  User,
  Phone,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle,
  FileText,
  DollarSign,
  Heart,
  Home,
  ShieldAlert,
  Clock,
  Download,
  Share2,
  Edit3,
  UserCheck,
  Briefcase,
  FileCheck,
  Zap,
  FileSpreadsheet,
  Receipt,
  Coins,
  CheckCircle2,
  ArrowUpDown,
  MessageSquare,
} from 'lucide-react';
import { calculateCaseAssessment, getPriorityLabel, getStatusLabel } from '@/services/scoring-engine';
import { CaseStatus } from '@/types';
import { BeneficiaryNotes } from '@/components/beneficiaries/beneficiary-notes';
import { ResearcherSelect } from './researcher-select';

export function CaseDetailsModal() {
  const {
    selectedCaseId,
    setSelectedCaseId,
    setEditingCase,
    cases,
    visits,
    researchReports,
    fastTrackOrders,
    allocations,
    currentUserRole,
    permissions,
    changeCaseStatus,
    approveCaseException,
    reassignResearcher,
    addCaseAttachment,
    openFieldSurvey,
    caseNotes,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'profile' | 'financials' | 'visits' | 'documents' | 'notes'>('profile');
  const [showExceptionDialog, setShowExceptionDialog] = useState(false);
  const [exceptionReasonInput, setExceptionReasonInput] = useState('');
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [newResearcherInput, setNewResearcherInput] = useState('');
  const [showAddAttachmentDialog, setShowAddAttachmentDialog] = useState(false);
  const [attachmentTitle, setAttachmentTitle] = useState('');
  const [attachmentCategory, setAttachmentCategory] = useState<'national_id' | 'medical_report' | 'income_proof' | 'housing_contract' | 'field_video'>('medical_report');
  const [attachmentFileName, setAttachmentFileName] = useState('');
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'periodic' | 'fast_track'>('all');

  const currentCase = useMemo(() => {
    return selectedCaseId ? cases.find((c) => c.id === selectedCaseId) : undefined;
  }, [cases, selectedCaseId]);

  const caseVisits = useMemo(() => {
    return selectedCaseId ? visits.filter((v) => v.caseId === selectedCaseId) : [];
  }, [visits, selectedCaseId]);

  const caseReports = useMemo(() => {
    return selectedCaseId ? researchReports.filter((r) => r.caseId === selectedCaseId) : [];
  }, [researchReports, selectedCaseId]);

  const caseFastTrackOrders = useMemo(() => {
    return selectedCaseId ? fastTrackOrders.filter((o) => o.caseId === selectedCaseId) : [];
  }, [fastTrackOrders, selectedCaseId]);

  const thisCaseNotes = useMemo(() => {
    return selectedCaseId ? caseNotes.filter((n) => n.caseId === selectedCaseId) : [];
  }, [caseNotes, selectedCaseId]);

  // تجميع كشف الحساب المالي الموحد للمستفيد (سجل المساعدات والدورات المصروفة)
  type LedgerEntry = {
    id: string;
    batchTitle: string;
    date: string;
    category: string;
    fundSourceBadge: string;
    proposedAmount: number;
    approvedAmount: number;
    notes: string;
    status: 'delivered' | 'approved' | 'draft' | 'cancelled' | 'excluded';
    statusLabel: string;
    voucherNo: string;
    isFastTrack: boolean;
  };

  const beneficiaryLedger = useMemo(() => {
    if (!currentCase) return [];

    const entries: LedgerEntry[] = [];
    const caseId = currentCase.id;
    const caseCode = currentCase.code;

    // 1. استخراج مشاركات الحالة في كافة دورات الميزانية المخصصة
    if (allocations) {
      Object.values(allocations).forEach((alloc) => {
        const item = alloc.items?.find((i) => i.caseId === caseId);
        if (item && (item.approvedAmount > 0 || item.proposedAmount > 0 || item.isExcluded)) {
          const isApproved = alloc.status === 'approved';
          const date = alloc.executionDate || (alloc.approvedDate ? alloc.approvedDate.split(' ')[0] : (alloc.period ? `${alloc.period}-15` : '-'));
          const title = alloc.batchTitle || `كفالات ${alloc.periodLabel || alloc.period}`;

          let status: LedgerEntry['status'] = isApproved ? 'delivered' : 'draft';
          let statusLabel = isApproved ? 'تم الاعتماد والصرف' : 'مقترح مسودة';

          if (item.isExcluded) {
            status = 'excluded';
            statusLabel = 'مستبعدة من الدورة';
          }

          const notes = item.isExcluded
            ? `[استبعاد]: ${item.exclusionReason || 'استبعاد مؤقت من دورة الصرف'}`
            : item.isManuallyAdjusted && item.adjustmentReason
            ? `[تعديل استثنائي]: ${item.adjustmentReason}`
            : item.reasoning;

          entries.push({
            id: `alloc-${alloc.id}-${item.id}`,
            batchTitle: title,
            date,
            category: item.fundSourceName || 'الصندوق العام',
            fundSourceBadge: item.fundSource === 'restricted_case' ? 'مقيد بالاسم' : item.fundSource === 'restricted_purpose' ? 'مقيد لغرض' : 'صندوق عام',
            proposedAmount: item.proposedAmount,
            approvedAmount: item.approvedAmount,
            notes: notes || '-',
            status,
            statusLabel,
            voucherNo: isApproved ? `إذن اعتماد #${alloc.period.replace('-', '')}-${caseCode.replace('CASE-', '')}` : `مسودة #${alloc.period}`,
            isFastTrack: false,
          });
        }
      });
    }

    // 2. استخراج أذونات الصرف الفوري والتبرعات المقيدة الخاصة بالحالة
    caseFastTrackOrders.forEach((order) => {
      entries.push({
        id: `ft-${order.id}`,
        batchTitle: `صرف فوري (${order.shariaCategoryName})`,
        date: order.deliveredDate || order.issuedDate,
        category: order.shariaCategoryName,
        fundSourceBadge: 'صرف فوري',
        proposedAmount: order.amount,
        approvedAmount: order.status === 'delivered' ? order.amount : order.status === 'cancelled' ? 0 : order.amount,
        notes: `${order.purposeNote}${order.deliveryNotes ? ` · تسليم: ${order.deliveryNotes}` : ''}`,
        status: order.status === 'delivered' ? 'delivered' : order.status === 'cancelled' ? 'cancelled' : 'approved',
        statusLabel: order.status === 'delivered' ? 'تم التسليم الفعلي' : order.status === 'cancelled' ? 'ملغي' : 'قيد التسليم',
        voucherNo: order.deliveryReceiptNo ? `${order.voucherCode} (سند: ${order.deliveryReceiptNo})` : order.voucherCode,
        isFastTrack: true,
      });
    });

    entries.sort((a, b) => b.date.localeCompare(a.date));
    return entries;
  }, [allocations, currentCase, caseFastTrackOrders]);

  const filteredLedger = useMemo(() => {
    if (ledgerFilter === 'periodic') return beneficiaryLedger.filter((e) => !e.isFastTrack);
    if (ledgerFilter === 'fast_track') return beneficiaryLedger.filter((e) => e.isFastTrack);
    return beneficiaryLedger;
  }, [beneficiaryLedger, ledgerFilter]);

  const ledgerSummary = useMemo(() => {
    const deliveredItems = beneficiaryLedger.filter((e) => e.status === 'delivered');
    const totalDelivered = deliveredItems.reduce((sum, e) => sum + e.approvedAmount, 0);
    const totalProposed = beneficiaryLedger.reduce((sum, e) => sum + e.proposedAmount, 0);
    const averageDelivered = deliveredItems.length > 0 ? Math.round(totalDelivered / deliveredItems.length) : 0;
    return {
      totalDelivered,
      totalProposed,
      deliveredCount: deliveredItems.length,
      totalOperations: beneficiaryLedger.length,
      averageDelivered,
    };
  }, [beneficiaryLedger]);

  const handleExportLedger = () => {
    if (!currentCase || beneficiaryLedger.length === 0) return;
    const headers = [
      'مسمى دورة الصرف / الدفعة',
      'تاريخ الاستحقاق / الصرف الفعلي',
      'بند ومصدر المساعدة',
      'المبلغ المقرر (ج.م)',
      'المبلغ المنصرف (ج.م)',
      'سبب الاستثناء / الملاحظات',
      'حالة الاستلام',
      'رقم سند / إذن الصرف',
    ];
    const rows = beneficiaryLedger.map((e) => [
      `"${e.batchTitle.replace(/"/g, '""')}"`,
      `"${e.date}"`,
      `"${e.category.replace(/"/g, '""')}"`,
      e.proposedAmount,
      e.approvedAmount,
      `"${e.notes.replace(/"/g, '""')}"`,
      `"${e.statusLabel}"`,
      `"${e.voucherNo}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `كشف_حساب_مساعدات_${currentCase.code}_${currentCase.fullName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloadNotice('تم تصدير كشف الحساب المالي للمستفيد بنجاح');
    setTimeout(() => setDownloadNotice(null), 3500);
  };

  if (!selectedCaseId || !currentCase) return null;

  const assessment = calculateCaseAssessment(currentCase);

  const handleApproveException = () => {
    if (!exceptionReasonInput.trim()) return;
    approveCaseException(
      currentCase.id,
      currentUserRole === 'admin' ? 'أ. أحمد الجزار (الإدارة)' : 'المسؤول المعتمد',
      exceptionReasonInput
    );
    setShowExceptionDialog(false);
    setExceptionReasonInput('');
  };

  const handleReassign = () => {
    if (!newResearcherInput.trim()) return;
    reassignResearcher(currentCase.id, newResearcherInput, 'تحديث إداري للمتابعة الدورية');
    setShowReassignDialog(false);
    setNewResearcherInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden border-t sm:border border-slate-200/80 animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-2 duration-200">
        {/* Mobile bottom-sheet handle indicator */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Header - Full-Width Layout */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50/95 border-b border-slate-200 shrink-0">
          {/* Top row: Case Code & Status Badges on Start, Close button (X) on End */}
          <div className="flex items-center justify-between gap-2 mb-2 sm:mb-2.5">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="px-2.5 py-0.5 rounded-md bg-teal-100/90 text-teal-900 font-mono text-xs font-bold border border-teal-200/60">
                {currentCase.code}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-md font-bold ${
                  currentCase.status === 'pending_field_research'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-slate-200/80 text-slate-700'
                }`}
              >
                {getStatusLabel(currentCase.status)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedCaseId(null)}
              className="p-1.5 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 active:scale-95 transition-all cursor-pointer"
              aria-label="إغلاق النافذة"
            >
              <X size={20} />
            </button>
          </div>

          {/* Beneficiary Name Row - Full width with zero squishing */}
          <div className="w-full">
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 leading-snug break-words flex flex-wrap items-baseline gap-2">
              <span>{currentCase.primaryName || currentCase.fullName}</span>
              {currentCase.secondaryName && (
                <span className="text-slate-500 font-normal text-xs sm:text-sm">
                  ({currentCase.secondaryName})
                </span>
              )}
            </h2>
          </div>

          {/* Quick metadata card / pills */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200/60">
            <span className="flex items-center gap-1.5 font-mono">
              <User size={13} className="text-slate-400 shrink-0" />
              <span>
                الرقم القومي:{' '}
                {permissions.canViewBeneficiaryPII
                  ? currentCase.nationalId
                  : `${currentCase.nationalId.substring(0, 5)}********* (محجوب للخصوصية)`}
              </span>
            </span>
            <span className="flex items-center gap-1.5 font-mono">
              <Phone size={13} className="text-slate-400 shrink-0" />
              <span>{permissions.canViewBeneficiaryPII ? currentCase.phone : '010********'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin size={13} className="text-slate-400 shrink-0" />
              <span>{currentCase.governorate} · {currentCase.district}</span>
            </span>
          </div>

          {/* Dedicated Action Buttons Grid (thumb-friendly, ≥ 44px touch targets) */}
          {permissions.canManageCases && (
            <div className="grid grid-cols-2 gap-2 mt-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  openFieldSurvey(currentCase.id);
                  setSelectedCaseId(null);
                }}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-[0.98] ${
                  currentCase.status === 'pending_field_research'
                    ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-amber-900/10'
                    : 'bg-[#005756] hover:bg-[#004241] active:bg-[#003534] text-white shadow-teal-950/15'
                }`}
              >
                <MapPin size={16} className="shrink-0" />
                <span className="truncate">
                  {currentCase.status === 'pending_field_research'
                    ? 'بدء بحث حالة'
                    : 'بحث حالة'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setEditingCase(currentCase)}
                className="min-h-[44px] px-3 py-2 bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 text-slate-800 border border-slate-200/80 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 flex items-center justify-center gap-2 shadow-2xs cursor-pointer active:scale-[0.98]"
              >
                <Edit3 size={15} className="shrink-0 text-slate-600" />
                <span className="truncate">تعديل بيانات الحالة</span>
              </button>
            </div>
          )}
        </div>

        {/* Status & Exception Alert Banner if needed */}
        {currentCase.vulnerability.incompleteDocuments && (
          <div className="px-4 sm:px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-700 shrink-0" />
              <span>
                <strong>أوراق الحالة غير مكتملة رسمياً</strong> · ثقة الباحث الميداني ({currentCase.vulnerability.confidenceScore}%)
                {currentCase.vulnerability.exceptionApproved ? (
                  <span className="text-emerald-700 font-bold mr-2">
                    (معتمدة كاستثناء إنساني بواسطة {currentCase.vulnerability.exceptionApprovedBy})
                  </span>
                ) : (
                  <span className="text-rose-700 font-bold mr-2">(بانتظار قرار اعتماد الاستثناء)</span>
                )}
              </span>
            </div>

            {!currentCase.vulnerability.exceptionApproved && currentUserRole === 'admin' && (
              <button
                onClick={() => setShowExceptionDialog(true)}
                className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-md transition-colors text-[11px]"
              >
                اعتماد استثناء إنساني
              </button>
            )}
          </div>
        )}

        {/* Tab Navigation - Smooth Horizontal Scroll */}
        <div className="bg-white border-b border-slate-200 shrink-0 px-3 sm:px-6">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-2 text-xs font-semibold -mb-px">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`min-h-[38px] px-3.5 py-2 rounded-lg whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-teal-50 text-teal-800 font-bold border border-teal-200/80 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              الملف التعريفي والتقييم
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('financials')}
              className={`min-h-[38px] px-3.5 py-2 rounded-lg whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                activeTab === 'financials'
                  ? 'bg-teal-50 text-teal-800 font-bold border border-teal-200/80 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              البيانات المالية والفجوة
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('visits')}
              className={`min-h-[38px] px-3.5 py-2 rounded-lg whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                activeTab === 'visits'
                  ? 'bg-teal-50 text-teal-800 font-bold border border-teal-200/80 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              سجل الزيارات الميدانية ({caseVisits.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className={`min-h-[38px] px-3.5 py-2 rounded-lg whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                activeTab === 'documents'
                  ? 'bg-teal-50 text-teal-800 font-bold border border-teal-200/80 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              المستندات والمرفقات ({currentCase.attachments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`min-h-[38px] px-3.5 py-2 rounded-lg whitespace-nowrap shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'notes'
                  ? 'bg-teal-50 text-teal-800 font-bold border border-teal-200/80 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <MessageSquare size={14} className={activeTab === 'notes' ? 'text-teal-700' : 'text-slate-400'} />
              <span>ملاحظات الحالة والنشاط</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                  activeTab === 'notes' ? 'bg-teal-200 text-teal-900' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {thisCaseNotes.length}
              </span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs pb-8 sm:pb-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Score and Priority Explainability Card */}
              <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">مؤشر أولوية الاحتياج:</span>
                    <span className="font-mono text-base font-extrabold text-teal-900">
                      {assessment.totalScore} / 100
                    </span>
                    <span className="text-teal-800 font-semibold mr-2">
                      ({getPriorityLabel(currentCase.priority)})
                    </span>
                  </div>
                  <span className="text-[11px] text-teal-700 font-medium">
                    حساب خوارزمي دقيق وموثق
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-teal-200/60 font-mono text-[11px]">
                  <div className="p-2 bg-white rounded-lg border border-teal-100">
                    <span className="text-slate-500 block font-sans">فجوة الدخل:</span>
                    <strong className="text-slate-900">{assessment.financialGapScore} نقطة</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-teal-100">
                    <span className="text-slate-500 block font-sans">الأمراض المزمنة:</span>
                    <strong className="text-slate-900">{assessment.medicalUrgencyScore} نقطة</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-teal-100">
                    <span className="text-slate-500 block font-sans">الأيتام والإعالة:</span>
                    <strong className="text-slate-900">{assessment.orphanDependentsScore} نقطة</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-teal-100">
                    <span className="text-slate-500 block font-sans">حالة السكن:</span>
                    <strong className="text-slate-900">{assessment.housingInsecurityScore} نقطة</strong>
                  </div>
                </div>

                {/* Factors Explanations */}
                <div className="pt-2">
                  <span className="font-semibold text-slate-700 block mb-1">عوامل التقييم الميداني المحسوبة:</span>
                  <ul className="space-y-1 list-disc list-inside text-slate-600 leading-relaxed">
                    {assessment.explanation.map((exp, idx) => (
                      <li key={idx}>{exp}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Household Members */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">أفراد الأسرة والمعالون ({currentCase.householdMembers.length} أفراد)</h3>
                  {currentCase.vulnerability.isOrphanHousehold && (
                    <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      أسرة بها {currentCase.vulnerability.orphanCount} أيتام
                    </span>
                  )}
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-right">
                    <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                      <tr>
                        <th className="p-2.5">الاسم</th>
                        <th className="p-2.5">صلة القرابة</th>
                        <th className="p-2.5">السن</th>
                        <th className="p-2.5">التعليم</th>
                        <th className="p-2.5">الحالة الصحية</th>
                        <th className="p-2.5">العمل والكسب</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentCase.householdMembers.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-bold text-slate-900">{m.name}</td>
                          <td className="p-2.5 text-slate-700">{m.relation}</td>
                          <td className="p-2.5 font-mono">{m.age} سنة</td>
                          <td className="p-2.5 text-slate-600">{m.educationLevel}</td>
                          <td className="p-2.5 text-slate-700">{m.healthStatus}</td>
                          <td className="p-2.5 text-slate-600">{m.workStatus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Vulnerability & Living Conditions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Heart size={15} className="text-rose-600" />
                    <span>الوضع الصحي والرعاية الطبية</span>
                  </h4>
                  <p className="text-slate-700 leading-relaxed">
                    {currentCase.vulnerability.chronicIllnessDetails || 'لا توجد أمراض مزمنة حرجة مسجلة'}
                  </p>
                  <div className="text-[11px] text-slate-500 font-mono pt-1">
                    مصاريف العلاج الشهرية: <strong>{currentCase.financials.medicalExpenses.toLocaleString('ar-EG')} ج.م</strong>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Home size={15} className="text-teal-700" />
                    <span>ظروف السكن والإقامة</span>
                  </h4>
                  <p className="text-slate-700 leading-relaxed">
                    العنوان: {currentCase.address}
                  </p>
                  {currentCase.directionsNote && (
                    <p className="text-slate-600">
                      علامة مميزة: {currentCase.directionsNote}
                    </p>
                  )}
                  {currentCase.gpsLocation && (
                    <div className="pt-1">
                      <a
                        href={currentCase.gpsLocation.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:underline"
                      >
                        <MapPin size={11} className="text-emerald-600" />
                        <span>موقع المنزل على خرائط جوجل (GPS)</span>
                      </a>
                    </div>
                  )}
                  <p className="text-slate-600">
                    تصنيف السكن: {currentCase.vulnerability.housingCondition === 'dilapidated_urgent' ? 'آيل للسقوط / خطورة شديدة' : currentCase.vulnerability.housingCondition === 'rent_unstable' ? 'إيجار غير مستقر مهدد بالإخلاء' : 'إيجار مستقر'}
                  </p>
                </div>
              </div>

              {/* Case Notes & Chronological Audit Timeline */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <FileText size={15} className="text-teal-700" />
                    <span>السجل التاريخي والتايم لاين الإجرائي للحالة</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">توثيق تلقائي للأذونات والقرارات</span>
                </div>
                {currentCase.notes ? (
                  <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto">
                    {currentCase.notes}
                  </div>
                ) : (
                  <p className="text-slate-500 text-xs italic">لا توجد ملاحظات أو قيود تاريخية مسجلة حتى الآن.</p>
                )}
                <div className="pt-2 flex items-center justify-between border-t border-slate-200/60">
                  <span className="text-[11px] text-slate-600 font-medium">
                    يوجد {thisCaseNotes.length} ملاحظة تفاعلية (عامة وخاصة) مسجلة للحالة
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('notes')}
                    className="px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                  >
                    <MessageSquare size={13} />
                    <span>سجل ملاحظات الحالة ({thisCaseNotes.length})</span>
                  </button>
                </div>
              </div>

              {/* Researcher & Follow-up Details */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">الباحث المسؤول: {currentCase.assignedResearcher}</span>
                    <button
                      onClick={() => {
                        setNewResearcherInput(currentCase.assignedResearcher || '');
                        setShowReassignDialog(true);
                      }}
                      className="text-xs text-teal-800 underline hover:text-teal-950 font-semibold cursor-pointer"
                    >
                      تغيير الباحث
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-slate-500 font-mono text-[11px]">
                    <span>تاريخ التسجيل: {currentCase.registrationDate}</span>
                    <span>آخر زيارة: {currentCase.lastVisitDate}</span>
                    <span className={currentCase.isVisitOverdue ? 'text-rose-600 font-bold' : ''}>
                      الزيارة القادمة: {currentCase.nextVisitDueDate}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={currentCase.status}
                    onChange={(e) => changeCaseStatus(currentCase.id, e.target.value as CaseStatus)}
                    className="p-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                  >
                    <option value="active_eligible">مؤهلة ومستحقة</option>
                    <option value="pending_exception">بانتظار اعتماد استثناء</option>
                    <option value="under_review">تحت البحث والمراجعة</option>
                    <option value="temporarily_suspended">إيقاف مؤقت للدعم</option>
                    <option value="excluded_current_month">استبعاد من دورة الشهر</option>
                    <option value="closed">إغلاق الملف نهائياً</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'financials' && (
            <div className="space-y-5">
              {/* Financial Calculation Balance Box */}
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold">ميزان الفجوة المالية الشهرية (الواقع الميداني)</span>
                  <span className="text-xs px-2 py-0.5 rounded-sm bg-teal-800 text-teal-100 font-mono">
                    محسوبة آلياً
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800 text-center">
                  <div className="p-3 bg-slate-800/80 rounded-lg">
                    <span className="text-slate-400 block text-xs">إجمالي الدخول الحقيقية</span>
                    <span className="text-lg font-bold font-mono text-emerald-400 mt-1 block">
                      {(currentCase.financials.directIncome + currentCase.financials.indirectIncome + currentCase.financials.externalAid).toLocaleString('ar-EG')} ج.م
                    </span>
                    <span className="text-[10px] text-slate-400">مباشر + غير مباشر + دعم خارجي</span>
                  </div>

                  <div className="p-3 bg-slate-800/80 rounded-lg">
                    <span className="text-slate-400 block text-xs">إجمالي المصروفات الأساسية</span>
                    <span className="text-lg font-bold font-mono text-rose-400 mt-1 block">
                      {(currentCase.financials.basicExpenses + currentCase.financials.medicalExpenses).toLocaleString('ar-EG')} ج.م
                    </span>
                    <span className="text-[10px] text-slate-400">معيشة + فواتير + علاج شهري</span>
                  </div>

                  <div className="p-3 bg-teal-950/80 border border-teal-700/60 rounded-lg">
                    <span className="text-teal-200 block text-xs">فجوة الاحتياج الشهري للأسرة</span>
                    <span className="text-xl font-extrabold font-mono text-white mt-1 block">
                      {currentCase.financials.netFinancialGap.toLocaleString('ar-EG')} ج.م
                    </span>
                    <span className="text-[10px] text-teal-300">مبلغ الاحتياج المقدر شهرياً</span>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown Tables */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Incomes */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                  <h4 className="font-bold text-slate-900 border-b pb-2 flex items-center justify-between">
                    <span>مصادر الدخل (المثبتة وغير الرسمية)</span>
                    <span className="text-emerald-700 font-mono text-xs font-bold">+ دخل</span>
                  </h4>
                  <div className="space-y-2 font-mono">
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-600 font-sans">دخل مثبت (معاش تكافل وكرامة/تأمينات):</span>
                      <strong className="text-slate-900">{currentCase.financials.directIncome.toLocaleString('ar-EG')} ج.م</strong>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-600 font-sans">دخل غير مباشر وعمل غير منتظم (يوميات):</span>
                      <strong className="text-slate-900">{currentCase.financials.indirectIncome.toLocaleString('ar-EG')} ج.م</strong>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600 font-sans">مساعدات خارجية منتظمة من أفراد/جهات:</span>
                      <strong className="text-slate-900">{currentCase.financials.externalAid.toLocaleString('ar-EG')} ج.م</strong>
                    </div>
                  </div>
                </div>

                {/* Expenses */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                  <h4 className="font-bold text-slate-900 border-b pb-2 flex items-center justify-between">
                    <span>المصروفات والالتزامات الحتمية</span>
                    <span className="text-rose-700 font-mono text-xs font-bold">- نفقات</span>
                  </h4>
                  <div className="space-y-2 font-mono">
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-600 font-sans">نفقات المعيشة والإيجار والغذاء الأساسي:</span>
                      <strong className="text-slate-900">{currentCase.financials.basicExpenses.toLocaleString('ar-EG')} ج.م</strong>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-600 font-sans">تكلفة العلاج والأدوية المزمنة:</span>
                      <strong className="text-rose-600 font-bold">{currentCase.financials.medicalExpenses.toLocaleString('ar-EG')} ج.م</strong>
                    </div>
                    <div className="flex justify-between items-center py-1 text-slate-500 font-sans text-[11px]">
                      <span>إجمالي المساعدات المصروفة تاريخياً للحالة:</span>
                      <strong className="font-mono text-slate-900">{currentCase.historicalAssistanceTotal.toLocaleString('ar-EG')} ج.م</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Beneficiary Financial Ledger: سجل المساعدات والدورات المصروفة */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3.5 shadow-2xs">
                {/* Ledger Header & Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center shrink-0 border border-teal-200">
                      <FileSpreadsheet size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                        <span>سجل المساعدات والدورات المصروفة</span>
                        <span className="text-[11px] text-slate-500 font-normal">
                          (كشف الحساب المالي الموحد للحالة)
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        مطابقة دورات التخصيص المعتمدة وأذونات الصرف الفوري والتبرعات المقيدة
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Filters */}
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setLedgerFilter('all')}
                        className={`px-2 py-1 rounded-md transition cursor-pointer ${
                          ledgerFilter === 'all'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        الكل ({beneficiaryLedger.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setLedgerFilter('periodic')}
                        className={`px-2 py-1 rounded-md transition cursor-pointer ${
                          ledgerFilter === 'periodic'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        الدورات ({beneficiaryLedger.filter((e) => !e.isFastTrack).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setLedgerFilter('fast_track')}
                        className={`px-2 py-1 rounded-md transition cursor-pointer ${
                          ledgerFilter === 'fast_track'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        صرف فوري ({caseFastTrackOrders.length})
                      </button>
                    </div>

                    {/* Export CSV button */}
                    <button
                      type="button"
                      onClick={handleExportLedger}
                      disabled={beneficiaryLedger.length === 0}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                      title="تصدير كشف حساب الحالة بصيغة CSV"
                    >
                      <Download size={12} />
                      <span>تصدير كشف الحساب (.csv)</span>
                    </button>
                  </div>
                </div>

                {downloadNotice && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-700 shrink-0" />
                    <span>{downloadNotice}</span>
                  </div>
                )}

                {/* Ledger Table (Excel-like Grid) */}
                {filteredLedger.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <Receipt size={24} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">لا توجد حركات مسجلة في كشف حساب الحالة</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      ستظهر هنا تلقائياً كافة مبالغ دورات التخصيص المعتمدة وأذونات الصرف الفوري المقيدة
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto max-h-72">
                      <table className="w-full text-right text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-700 text-[11px] font-bold sticky top-0 z-10 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3 border-l border-slate-200">1. مسمى دورة الصرف / الدفعة</th>
                            <th className="py-2.5 px-3 border-l border-slate-200 whitespace-nowrap">2. تاريخ الاستحقاق / الصرف</th>
                            <th className="py-2.5 px-3 border-l border-slate-200">3. بند ومصدر المساعدة</th>
                            <th className="py-2.5 px-3 border-l border-slate-200 whitespace-nowrap">4. المقرر / المنصرف</th>
                            <th className="py-2.5 px-3 border-l border-slate-200 min-w-[160px]">5. سبب الاستثناء / الملاحظات</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">6. حالة الاستلام ورقم السند/الإذن</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {filteredLedger.map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* 1. Batch Title */}
                              <td className="py-2.5 px-3 border-l border-slate-100 font-medium">
                                <div className="flex items-center gap-1.5">
                                  {row.isFastTrack ? (
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
                                  ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                  )}
                                  <span className="font-bold text-slate-900">{row.batchTitle}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 block mt-0.5 mr-3">
                                  {row.isFastTrack ? 'إذن صرف فوري' : 'دورة ميزانية دورية'}
                                </span>
                              </td>

                              {/* 2. Date */}
                              <td className="py-2.5 px-3 border-l border-slate-100 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                                {row.date}
                              </td>

                              {/* 3. Category & Fund Source */}
                              <td className="py-2.5 px-3 border-l border-slate-100">
                                <div className="font-semibold text-slate-900 text-[11px]">{row.category}</div>
                                <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold mt-0.5 ${
                                  row.fundSourceBadge === 'صرف فوري'
                                    ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                    : row.fundSourceBadge === 'مقيد بالاسم'
                                    ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                    : row.fundSourceBadge === 'مقيد لغرض'
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {row.fundSourceBadge}
                                </span>
                              </td>

                              {/* 4. Proposed vs Approved Amount */}
                              <td className="py-2.5 px-3 border-l border-slate-100 font-mono whitespace-nowrap">
                                <div className="flex items-baseline gap-2">
                                  <div>
                                    <span className="text-[10px] text-slate-400 block">المنصرف:</span>
                                    <strong className="text-emerald-700 text-xs font-extrabold">
                                      {row.approvedAmount.toLocaleString('ar-EG')} ج.م
                                    </strong>
                                  </div>
                                  {row.proposedAmount !== row.approvedAmount && (
                                    <div>
                                      <span className="text-[10px] text-slate-400 block">المقرر:</span>
                                      <span className="text-slate-500 line-through text-[11px]">
                                        {row.proposedAmount.toLocaleString('ar-EG')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* 5. Notes & Exception Reason */}
                              <td className="py-2.5 px-3 border-l border-slate-100 text-[11px] text-slate-600 leading-relaxed">
                                <p className="line-clamp-2" title={row.notes}>
                                  {row.notes}
                                </p>
                              </td>

                              {/* 6. Status & Voucher No. */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <div className="space-y-1">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                    row.status === 'delivered'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : row.status === 'approved'
                                      ? 'bg-teal-100 text-teal-800'
                                      : row.status === 'cancelled' || row.status === 'excluded'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {row.status === 'delivered' && <CheckCircle size={10} />}
                                    <span>{row.statusLabel}</span>
                                  </span>
                                  <div className="font-mono text-[10px] text-slate-500 font-semibold">
                                    {row.voucherNo}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Summary Footer Bar (Excel Totals) */}
                    <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-4 text-slate-600 font-medium">
                        <span>إجمالي المعاملات: <strong className="font-mono text-slate-900">{ledgerSummary.totalOperations}</strong></span>
                        <span>·</span>
                        <span>الدورات المنصرفة: <strong className="font-mono text-emerald-700">{ledgerSummary.deliveredCount}</strong></span>
                        <span>·</span>
                        <span>متوسط الصرف: <strong className="font-mono text-slate-900">{ledgerSummary.averageDelivered.toLocaleString('ar-EG')} ج.م</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-semibold text-[11px]">صافي المنصرف الفعلي للحالة:</span>
                        <span className="text-sm font-extrabold font-mono text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                          {ledgerSummary.totalDelivered.toLocaleString('ar-EG')} ج.م
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'visits' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">سجل الزيارات والتقارير الميدانية</h3>
                  <p className="text-xs text-slate-500">متابعة إلزامية كل 6 أشهر لتجديد بيانات الحالة والاستحقاق</p>
                </div>
                <button
                  onClick={() => setShowReassignDialog(true)}
                  className="px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-800 rounded-lg text-xs font-semibold hover:bg-teal-100 transition-colors"
                >
                  تعيين باحث للزيارة القادمة
                </button>
              </div>

              {caseVisits.length === 0 ? (
                <div className="py-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl">
                  لم يتم تسجيل زيارات سابقة في الأرشيف الرقمي لهذه الحالة
                </div>
              ) : (
                <div className="space-y-3">
                  {caseVisits.map((v) => (
                    <div key={v.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">زيارة الباحث: {v.researcherName}</span>
                          <span className="text-slate-400 font-mono">· {v.visitDate}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${v.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {v.status === 'completed' ? 'مكتملة وموثقة' : 'متأخرة عن الموعد'}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed text-xs">
                        {v.observations}
                      </p>
                      <div className="pt-2 border-t border-slate-200 text-teal-900 font-medium text-xs">
                        توصيات الباحث: {v.recommendedChanges}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">المستندات والأدلة الميدانية المرفقة</h3>
                  <p className="text-xs text-slate-500">وثائق الهوية، التقارير الطبية، عقود الإيجار، وتوثيق الفيديو</p>
                </div>
                {permissions.canManageCases && (
                  <button
                    onClick={() => {
                      setAttachmentTitle('');
                      setAttachmentFileName('');
                      setShowAddAttachmentDialog(true);
                    }}
                    className="px-3 py-1.5 bg-teal-800 text-white rounded-lg text-xs font-bold hover:bg-teal-900 transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>إرفاق وثيقة / إثبات جديد</span>
                  </button>
                )}
              </div>

              {currentCase.attachments.length === 0 ? (
                <div className="py-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl">
                  لا توجد مستندات مرفقة حالياً
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentCase.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl hover:border-teal-500 transition-colors flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-teal-700 shrink-0" />
                          <span className="font-bold text-slate-900">{att.title}</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                          <span>{att.fileName}</span>
                          <span>·</span>
                          <span>{att.fileSize}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setDownloadNotice(att.title);
                          setTimeout(() => setDownloadNotice(null), 3500);
                        }}
                        className="p-2 text-teal-800 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                        title="تحميل ومعاينة المستند"
                      >
                        <Download size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {downloadNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle size={15} className="text-emerald-700 shrink-0" />
                  <span>تم تجهيز وتحميل المستند الرسمي: <strong>{downloadNotice}</strong></span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <BeneficiaryNotes
              caseId={currentCase.id}
              caseCode={currentCase.code}
              caseName={currentCase.fullName}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-slate-500 text-xs font-mono">
            كود الملف المرجعي: {currentCase.code}
          </span>
          <button
            onClick={() => setSelectedCaseId(null)}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold text-xs transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>

      {/* Exception Approval Sub-Dialog */}
      {showExceptionDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 border border-slate-200 shadow-xl">
            <h3 className="font-bold text-slate-900 text-sm">اعتماد استثناء إنساني للحالة</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              وفقاً للقواعد التشغيلية، نقص المستندات لا يحرم الحالة الحرجة إذا كانت ثقة الباحث الميداني عالية ({currentCase.vulnerability.confidenceScore}%). يرجى توثيق مبرر الاعتماد الرسمي:
            </p>
            <textarea
              rows={3}
              value={exceptionReasonInput}
              onChange={(e) => setExceptionReasonInput(e.target.value)}
              placeholder="مثال: حالة مرضية شديدة وسكن غير آمن، وجارٍ استخراج الأوراق بمعرفة الفريق القانوني..."
              className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-600"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowExceptionDialog(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                إلغاء
              </button>
              <button
                onClick={handleApproveException}
                disabled={!exceptionReasonInput.trim()}
                className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white font-bold rounded-lg"
              >
                تأكيد اعتماد الاستثناء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Researcher Sub-Dialog */}
      {showReassignDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 border border-slate-200 shadow-xl">
            <h3 className="font-bold text-slate-900 text-sm">تكليف باحث ميداني للمتابعة</h3>
            <p className="text-xs text-slate-600">
              تحديد الباحث المسؤول عن الزيارة الميدانية القادمة للحالة دون شطب السجل التاريخي:
            </p>
            <ResearcherSelect
              value={newResearcherInput}
              onChange={setNewResearcherInput}
              label="اختيار الباحث الميداني المعتمد"
              required
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowReassignDialog(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                إلغاء
              </button>
              <button
                onClick={handleReassign}
                disabled={!newResearcherInput.trim()}
                className="px-4 py-1.5 bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white font-bold rounded-lg"
              >
                حفظ التكليف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Document Sub-Dialog */}
      {showAddAttachmentDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 border border-slate-200 shadow-xl">
            <h3 className="font-bold text-slate-900 text-sm">إرفاق مستند أو وثيقة لملف الحالة</h3>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">عنوان المستند أو الوصف *</label>
                <input
                  type="text"
                  value={attachmentTitle}
                  onChange={(e) => setAttachmentTitle(e.target.value)}
                  placeholder="مثال: روشتة علاج الغسيل الكلوي لشهر أكتوبر"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">تصنيف الوثيقة</label>
                <select
                  value={attachmentCategory}
                  onChange={(e) => setAttachmentCategory(e.target.value as any)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="medical_report">تقرير طبي أو روشتة علاج</option>
                  <option value="national_id">بطاقة رقم قومي أو شهادة ميلاد</option>
                  <option value="income_proof">بيان معاش أو إثبات دخل</option>
                  <option value="housing_contract">عقد إيجار أو إيصال مرافق</option>
                  <option value="field_video">فيديو معاينة ميدانية</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">اسم الملف والمستند المرفق</label>
                <input
                  type="text"
                  value={attachmentFileName}
                  onChange={(e) => setAttachmentFileName(e.target.value)}
                  placeholder="october_medical_report.pdf"
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs pt-1">
              <button
                onClick={() => setShowAddAttachmentDialog(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  if (!attachmentTitle.trim()) return;
                  addCaseAttachment(currentCase.id, {
                    title: attachmentTitle.trim(),
                    category: attachmentCategory,
                    fileName: attachmentFileName.trim() || `${attachmentCategory}_doc.pdf`,
                    fileSize: '1.4 MB',
                    uploadDate: new Date().toISOString().split('T')[0],
                  });
                  setShowAddAttachmentDialog(false);
                  setAttachmentTitle('');
                  setAttachmentFileName('');
                }}
                disabled={!attachmentTitle.trim()}
                className="px-4 py-1.5 bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white font-bold rounded-lg"
              >
                حفظ وإرفاق بالملف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
