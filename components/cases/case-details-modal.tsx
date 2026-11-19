'use client';

import React, { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { motion, MotionConfig, useMotionValue, animate } from 'motion/react';
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
  Wallet,
  MessageSquareText,
} from 'lucide-react';
import { calculateCaseAssessment, getPriorityLabel, getStatusLabel } from '@/services/scoring-engine';
import { CaseStatus } from '@/types';
import { BeneficiaryNotes } from '@/components/beneficiaries/beneficiary-notes';
import { ResearcherSelect } from './researcher-select';
import { ResearcherVoicePlayer } from '@/components/common/researcher-voice-player';

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

  // Mobile Bottom Sheet interactive drag & snap state
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 639px)').matches : false
  );
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800
  );
  const [sheetSnap, setSheetSnap] = useState<'half' | 'full'>('half');
  const [isClosing, setIsClosing] = useState(false);
  const [dragState, setDragState] = useState<{ isDragging: boolean; deltaY: number }>({
    isDragging: false,
    deltaY: 0,
  });
  const dragStartRef = useRef<{
    pointerId: number;
    startY: number;
    lastY: number;
    lastTime: number;
    prevY: number;
    prevTime: number;
  } | null>(null);

  const tabListRef = useRef<HTMLDivElement | null>(null);
  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const hasPlacedIndicatorRef = useRef(false);
  const activeTabRef = useRef(activeTab);
  const indicatorX = useMotionValue(0);
  const indicatorWidth = useMotionValue(0);
  const indicatorOpacity = useMotionValue(0);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const updateViewport = () => {
      setIsMobileViewport(mq.matches);
      setViewportHeight(window.innerHeight);
    };
    mq.addEventListener('change', updateViewport);
    window.addEventListener('resize', updateViewport);
    return () => {
      mq.removeEventListener('change', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, []);

  const handleCloseModal = useCallback(() => {
    hasPlacedIndicatorRef.current = false;
    indicatorOpacity.jump(0);
    setDragState({ isDragging: false, deltaY: 0 });
    setSheetSnap('half');
    setIsClosing(false);
    setSelectedCaseId(null);
  }, [setSelectedCaseId, indicatorOpacity]);

  const handleSheetPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobileViewport || isClosing) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const now = performance.now();
    dragStartRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      lastY: e.clientY,
      lastTime: now,
      prevY: e.clientY,
      prevTime: now,
    };
    setDragState({ isDragging: true, deltaY: 0 });
  };

  const handleSheetPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStartRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const now = performance.now();
    if (now - drag.lastTime > 16) {
      drag.prevY = drag.lastY;
      drag.prevTime = drag.lastTime;
      drag.lastY = e.clientY;
      drag.lastTime = now;
    }
    setDragState({ isDragging: true, deltaY: e.clientY - drag.startY });
  };

  const handleSheetPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStartRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragStartRef.current = null;

    const deltaY = e.clientY - drag.startY;
    const dt = Math.max(16, performance.now() - drag.prevTime);
    const velocityY = (e.clientY - drag.prevY) / dt;

    if (Math.abs(deltaY) < 6) {
      setDragState({ isDragging: false, deltaY: 0 });
      setSheetSnap((prev) => (prev === 'half' ? 'full' : 'half'));
      return;
    }

    if (sheetSnap === 'half') {
      if (deltaY < -50 || velocityY < -0.45) {
        setSheetSnap('full');
        setDragState({ isDragging: false, deltaY: 0 });
      } else if (deltaY > 110 || velocityY > 0.55) {
        setDragState({ isDragging: false, deltaY: 0 });
        setIsClosing(true);
      } else {
        setDragState({ isDragging: false, deltaY: 0 });
      }
    } else {
      const closeThreshold = Math.max(240, viewportHeight * 0.36);
      if (deltaY > closeThreshold || (deltaY > 120 && velocityY > 0.75)) {
        setDragState({ isDragging: false, deltaY: 0 });
        setIsClosing(true);
      } else if (deltaY > 55 || velocityY > 0.45) {
        setSheetSnap('half');
        setDragState({ isDragging: false, deltaY: 0 });
      } else {
        setDragState({ isDragging: false, deltaY: 0 });
      }
    }
  };

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
          let statusLabel = isApproved ? 'تم الصرف' : 'تحت المراجعة';

          if (item.isExcluded) {
            status = 'excluded';
            statusLabel = 'مستبعدة من الشهر';
          }

          const notes = item.isExcluded
            ? `[استبعاد]: ${item.exclusionReason || 'استبعاد مؤقت من صرف هذا الشهر'}`
            : item.isManuallyAdjusted && item.adjustmentReason
            ? `[تعديل المبلغ]: ${item.adjustmentReason}`
            : item.reasoning;

          entries.push({
            id: `alloc-${alloc.id}-${item.id}`,
            batchTitle: title,
            date,
            category: item.fundSourceName || 'الصندوق العام',
            fundSourceBadge: item.fundSource === 'restricted_case' ? 'تبرع للحالة بالاسم' : item.fundSource === 'restricted_purpose' ? 'تبرع لغرض محدد' : 'صندوق عام',
            proposedAmount: item.proposedAmount,
            approvedAmount: item.approvedAmount,
            notes: notes || '-',
            status,
            statusLabel,
            voucherNo: isApproved ? `إيصال صرف #${alloc.period.replace('-', '')}-${caseCode.replace('CASE-', '')}` : `مسودة #${alloc.period}`,
            isFastTrack: false,
          });
        }
      });
    }

    // 2. استخراج المساعدات الفورية والتبرعات الخاصة بالحالة
    caseFastTrackOrders.forEach((order) => {
      entries.push({
        id: `ft-${order.id}`,
        batchTitle: `مساعدة فورية (${order.shariaCategoryName})`,
        date: order.deliveredDate || order.issuedDate,
        category: order.shariaCategoryName,
        fundSourceBadge: 'مساعدة فورية',
        proposedAmount: order.amount,
        approvedAmount: order.status === 'delivered' ? order.amount : order.status === 'cancelled' ? 0 : order.amount,
        notes: `${order.purposeNote}${order.deliveryNotes ? ` · تسليم: ${order.deliveryNotes}` : ''}`,
        status: order.status === 'delivered' ? 'delivered' : order.status === 'cancelled' ? 'cancelled' : 'approved',
        statusLabel: order.status === 'delivered' ? 'تم التسليم' : order.status === 'cancelled' ? 'ملغي' : 'جاري التسليم',
        voucherNo: order.deliveryReceiptNo ? `${order.voucherCode} (إيصال: ${order.deliveryReceiptNo})` : order.voucherCode,
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
      'اسم الدفعة / المساعدة',
      'تاريخ الصرف',
      'نوع المساعدة',
      'المبلغ المقرر (ج.م)',
      'المبلغ المنصرف (ج.م)',
      'ملاحظات',
      'حالة الاستلام',
      'رقم الإيصال',
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
    setDownloadNotice('تم تحميل كشف حساب المساعدات بنجاح');
    setTimeout(() => setDownloadNotice(null), 3500);
  };

  useLayoutEffect(() => {
    activeTabRef.current = activeTab;

    if (!selectedCaseId || !currentCase) {
      hasPlacedIndicatorRef.current = false;
      indicatorOpacity.jump(0);
      return;
    }

    const activeBtn = tabButtonRefs.current[activeTab];
    if (!activeBtn) return;

    const targetX = activeBtn.offsetLeft;
    const targetWidth = activeBtn.offsetWidth;
    if (targetWidth === 0) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isInitialOrSamePosition =
      !hasPlacedIndicatorRef.current ||
      prefersReducedMotion ||
      indicatorWidth.get() === 0 ||
      (indicatorX.get() === targetX && indicatorWidth.get() === targetWidth);

    if (isInitialOrSamePosition) {
      indicatorX.jump(targetX);
      indicatorWidth.jump(targetWidth);
      indicatorOpacity.jump(1);
      hasPlacedIndicatorRef.current = true;
      return;
    }

    const springTransition = {
      type: 'spring' as const,
      stiffness: 460,
      damping: 36,
      mass: 0.65,
    };

    const xAnim = animate(indicatorX, targetX, springTransition);
    const widthAnim = animate(indicatorWidth, targetWidth, springTransition);
    indicatorOpacity.jump(1);

    activeBtn.scrollIntoView({
      behavior: 'smooth',
      inline: 'nearest',
      block: 'nearest',
    });

    return () => {
      xAnim.stop();
      widthAnim.stop();
    };
  }, [
    selectedCaseId,
    currentCase,
    activeTab,
    caseVisits.length,
    thisCaseNotes.length,
    indicatorX,
    indicatorWidth,
    indicatorOpacity,
  ]);

  useEffect(() => {
    if (!selectedCaseId || !currentCase) return;
    const tabList = tabListRef.current;
    if (!tabList) return;

    let lastObservedWidth = tabList.getBoundingClientRect().width;

    const resizeObserver = new ResizeObserver((entries) => {
      const entryWidth = entries[0]?.contentRect.width ?? tabList.getBoundingClientRect().width;
      if (Math.abs(entryWidth - lastObservedWidth) < 0.5) return;
      lastObservedWidth = entryWidth;

      const activeBtn = tabButtonRefs.current[activeTabRef.current];
      if (!activeBtn || activeBtn.offsetWidth === 0) return;

      indicatorX.jump(activeBtn.offsetLeft);
      indicatorWidth.jump(activeBtn.offsetWidth);
      indicatorOpacity.jump(1);
    });

    resizeObserver.observe(tabList);
    return () => resizeObserver.disconnect();
  }, [selectedCaseId, currentCase, indicatorX, indicatorWidth, indicatorOpacity]);

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

  const halfHeight = Math.round(viewportHeight * 0.82);
  const fullHeight = viewportHeight;
  const maxShrinkDelta = Math.max(0, fullHeight - halfHeight);

  let mobileHeight = sheetSnap === 'full' ? fullHeight : halfHeight;
  let mobileTranslateY = 0;

  if (dragState.isDragging) {
    if (sheetSnap === 'half') {
      if (dragState.deltaY < 0) {
        mobileHeight = Math.min(fullHeight, halfHeight - dragState.deltaY);
      } else {
        mobileTranslateY = dragState.deltaY;
      }
    } else if (dragState.deltaY > 0) {
      if (dragState.deltaY <= maxShrinkDelta) {
        mobileHeight = fullHeight - dragState.deltaY;
      } else {
        mobileHeight = halfHeight;
        mobileTranslateY = dragState.deltaY - maxShrinkDelta;
      }
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            if (isMobileViewport) {
              setIsClosing(true);
            } else {
              handleCloseModal();
            }
          }
        }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs"
      >
        <motion.div
          key={currentCase.id}
          initial={false}
          animate={
            isMobileViewport
              ? {
                  y: isClosing ? fullHeight : mobileTranslateY,
                  height: mobileHeight,
                }
              : { y: 0, height: 'auto' }
          }
          transition={
            isMobileViewport && !dragState.isDragging
              ? { type: 'spring', stiffness: 360, damping: 34, mass: 0.85 }
              : { duration: 0 }
          }
          onAnimationComplete={() => {
            if (isClosing) {
              handleCloseModal();
            }
          }}
          className={`bg-white ${
            isMobileViewport && sheetSnap === 'full' && !dragState.isDragging
              ? 'rounded-t-none'
              : 'rounded-t-2xl'
          } sm:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[100dvh] sm:max-h-[90vh] flex flex-col overflow-hidden border-t sm:border border-slate-200/80`}
        >
          {/* Mobile bottom-sheet interactive drag handle */}
          <div
            role="slider"
            tabIndex={0}
            aria-label="اسحب الشريط لفوق لتوسيع النافذة أو لتحت لتصغيرها أو قفلها"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={sheetSnap === 'full' ? 100 : 82}
            onPointerDown={handleSheetPointerDown}
            onPointerMove={handleSheetPointerMove}
            onPointerUp={handleSheetPointerEnd}
            onPointerCancel={handleSheetPointerEnd}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') setSheetSnap('full');
              if (e.key === 'ArrowDown') {
                if (sheetSnap === 'full') setSheetSnap('half');
                else setIsClosing(true);
              }
            }}
            className="sm:hidden w-full pt-3 pb-2 flex items-center justify-center shrink-0 touch-none select-none cursor-grab active:cursor-grabbing bg-slate-50"
          >
            <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
          </div>

          {/* Header - Full-Width Layout */}
          <div className="px-4 sm:px-6 pt-1 pb-4 sm:py-4 bg-slate-50 border-b border-slate-200 shrink-0">
            {/* Top row: Case Code & Status Badges on Start, Close button (X) on End */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-mono text-[11px] font-semibold">
                  {currentCase.code}
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-md font-semibold border bg-slate-100 text-slate-700 border-slate-200">
                  {getStatusLabel(currentCase.status)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (isMobileViewport) {
                    setIsClosing(true);
                  } else {
                    handleCloseModal();
                  }
                }}
                className="p-1.5 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 active:scale-95 transition-all cursor-pointer"
                aria-label="إغلاق النافذة"
              >
                <X size={20} />
              </button>
            </div>

          {/* Beneficiary Name Row - Full width with zero squishing */}
          <div className="w-full">
            <h2 className="text-lg font-bold text-slate-800 leading-snug break-words flex flex-wrap items-baseline gap-2">
              <span>{currentCase.primaryName || currentCase.fullName}</span>
              {currentCase.secondaryName && (
                <span className="text-slate-500 font-normal text-xs">
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
                  handleCloseModal();
                }}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-[0.98] ${
                  currentCase.status === 'pending_field_research'
                    ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-amber-900/10'
                    : 'bg-[#005756] hover:bg-[#004241] active:bg-[#003534] text-white shadow-teal-950/15'
                }`}
              >
                <MapPin size={16} className="shrink-0" />
                <span className="truncate">بدء البحث الميداني</span>
              </button>

              <button
                type="button"
                onClick={() => setEditingCase(currentCase)}
                className="min-h-[44px] px-3 py-2 bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 text-slate-800 border border-slate-200/80 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 flex items-center justify-center gap-2 shadow-2xs cursor-pointer active:scale-[0.98]"
              >
                <Edit3 size={15} className="shrink-0 text-slate-600" />
                <span className="truncate">تعديل البيانات</span>
              </button>
            </div>
          )}
        </div>

        {/* Status & Exception Inline Note if needed */}
        {currentCase.vulnerability.incompleteDocuments && (
          <div className="px-4 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-slate-400 shrink-0" />
              <span>
                <strong className="text-slate-700">أوراق الحالة ناقصة</strong> · تقييم الباحث ({currentCase.vulnerability.confidenceScore}%)
                {currentCase.vulnerability.exceptionApproved ? (
                  <span className="text-teal-700 font-semibold mr-2">
                    (تم اعتماد الاستثناء بواسطة {currentCase.vulnerability.exceptionApprovedBy})
                  </span>
                ) : (
                  <span className="text-slate-500 font-medium mr-2">(بانتظار موافقة الإدارة على الاستثناء)</span>
                )}
              </span>
            </div>

            {!currentCase.vulnerability.exceptionApproved && currentUserRole === 'admin' && (
              <button
                type="button"
                onClick={() => setShowExceptionDialog(true)}
                className="px-2.5 py-1 bg-[#005756] hover:bg-[#004241] text-white font-semibold rounded-lg transition-colors text-[11px] shrink-0 cursor-pointer"
              >
                موافقة استثنائية
              </button>
            )}
          </div>
        )}

        {/* Tab Navigation - Calm UI Constrained Sliding Underline */}
        <div className="bg-white border-b border-slate-200/80 shrink-0 px-3 sm:px-6 overflow-hidden">
          <div className="overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div
              ref={tabListRef}
              role="tablist"
              aria-label="أقسام ملف الحالة"
              className="relative flex w-max min-w-full items-center gap-1 text-xs"
            >
              {[
                { id: 'profile' as const, label: 'ملخص الحالة', icon: UserCheck },
                { id: 'financials' as const, label: 'الدخل والمصروفات', icon: Wallet },
                { id: 'visits' as const, label: `الزيارات (${caseVisits.length})`, icon: MapPin },
                { id: 'documents' as const, label: `المستندات (${currentCase.attachments.length})`, icon: FileCheck },
                { id: 'notes' as const, label: `الملاحظات (${thisCaseNotes.length})`, icon: MessageSquareText },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => {
                      tabButtonRefs.current[tab.id] = el;
                    }}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative min-h-[44px] px-3.5 py-2.5 whitespace-nowrap shrink-0 flex items-center gap-1.5 font-semibold transition-colors duration-150 cursor-pointer tabular-nums ${
                      isActive
                        ? 'text-[#005756]'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                        isActive ? 'text-[#005756]' : 'text-slate-400'
                      }`}
                    />
                    <span>{tab.label}</span>
                  </button>
                );
              })}

              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden"
              >
                <motion.span
                  style={{
                    x: indicatorX,
                    width: indicatorWidth,
                    opacity: indicatorOpacity,
                  }}
                  className="block absolute top-0 left-0 h-full bg-[#005756] rounded-full will-change-transform"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain min-h-0 space-y-6 flex-1 text-xs pb-8 sm:pb-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Score and Priority Explainability Card */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">درجة الاحتياج:</span>
                    <span className="font-mono tabular-nums text-base font-extrabold text-[#005756]">
                      {assessment.totalScore} من 100
                    </span>
                    <span className="text-slate-600 font-semibold mr-1">
                      ({getPriorityLabel(currentCase.priority)})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    تقييم تلقائي حسب الحالة
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/70 font-mono text-[11px]">
                  <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                    <span className="text-slate-500 block font-sans">عجز الدخل الشهري:</span>
                    <strong className="text-slate-900">{assessment.financialGapScore} نقطة</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                    <span className="text-slate-500 block font-sans">الحالة الصحية والعلاج:</span>
                    <strong className="text-slate-900">{assessment.medicalUrgencyScore} نقطة</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                    <span className="text-slate-500 block font-sans">الأيتام وعدد الأفراد:</span>
                    <strong className="text-slate-900">{assessment.orphanDependentsScore} نقطة</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                    <span className="text-slate-500 block font-sans">ظروف السكن:</span>
                    <strong className="text-slate-900">{assessment.housingInsecurityScore} نقطة</strong>
                  </div>
                </div>

                {/* Factors Explanations */}
                <div className="pt-2">
                  <span className="font-semibold text-slate-700 block mb-1">ملخص ظروف الأسرة:</span>
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
                  <h3 className="font-bold text-slate-900 text-sm">أفراد الأسرة ({currentCase.householdMembers.length} أفراد)</h3>
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
                        <th className="p-2.5">العمل / مصدر الدخل</th>
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
                  <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Heart size={15} className="text-slate-400" />
                    <span>الحالة الصحية والعلاج</span>
                  </h4>
                  <p className="text-slate-700 leading-relaxed">
                    {currentCase.vulnerability.chronicIllnessDetails || 'لا توجد أمراض مزمنة مسجلة'}
                  </p>
                  <div className="text-[11px] text-slate-500 font-mono pt-1">
                    تكلفة العلاج الشهري: <strong>{currentCase.financials.medicalExpenses.toLocaleString('ar-EG')} ج.م</strong>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Home size={15} className="text-slate-400" />
                    <span>ظروف السكن والعنوان</span>
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
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#005756] bg-teal-50 px-2 py-0.5 rounded border border-teal-200 hover:underline"
                      >
                        <MapPin size={11} className="text-[#005756]" />
                        <span>موقع المنزل على خرائط جوجل (GPS)</span>
                      </a>
                    </div>
                  )}
                  <p className="text-slate-600">
                    نوع السكن: {currentCase.vulnerability.housingCondition === 'dilapidated_urgent' ? 'غير آمن / آيل للسقوط' : currentCase.vulnerability.housingCondition === 'rent_unstable' ? 'إيجار غير مستقر وعليهم متأخرات' : 'إيجار مستقر'}
                  </p>
                </div>
              </div>

              {/* Researcher Voice Memo Player (if available or pending review) */}
              {(currentCase.voiceNoteUrl ||
                currentCase.status === 'pending_review' ||
                currentCase.attachments?.some(
                  (a) => a.category === 'voice_memo' || a.fileName.endsWith('.webm')
                )) && (
                <ResearcherVoicePlayer
                  audioUrl={
                    currentCase.voiceNoteUrl ||
                    currentCase.attachments?.find(
                      (a) => a.category === 'voice_memo' || a.fileName.endsWith('.webm')
                    )?.url ||
                    null
                  }
                  durationSeconds={
                    currentCase.voiceNoteDuration ||
                    currentCase.attachments?.find((a) => a.category === 'voice_memo')
                      ?.durationSeconds ||
                    18
                  }
                  researcherName={currentCase.assignedResearcher}
                  fileName="تسجيل_صوتي_للباحث.webm"
                  transcriptHint={currentCase.notes}
                />
              )}

              {/* Case Notes & Chronological Audit Timeline */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                    <FileText size={15} className="text-slate-400" />
                    <span>ملاحظات البحث وتاريخ الحالة</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">سجل المتابعة والقرارات</span>
                </div>
                {currentCase.notes ? (
                  <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto">
                    {currentCase.notes}
                  </div>
                ) : (
                  <p className="text-slate-500 text-xs italic">لا توجد ملاحظات مسجلة على الحالة حتى الآن.</p>
                )}
                <div className="pt-2 flex items-center justify-between border-t border-slate-200/60">
                  <span className="text-[11px] text-slate-600 font-medium">
                    يوجد {thisCaseNotes.length} ملاحظة مسجلة على الحالة
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('notes')}
                    className="px-3 py-1.5 bg-[#005756] hover:bg-[#004241] text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <MessageSquare size={13} />
                    <span>عرض الملاحظات ({thisCaseNotes.length})</span>
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
                    <option value="active_eligible">مستحقة للدعم</option>
                    <option value="pending_exception">تحتاج موافقة استثنائية</option>
                    <option value="under_review">تحت المراجعة</option>
                    <option value="temporarily_suspended">إيقاف مؤقت</option>
                    <option value="excluded_current_month">مستبعدة من صرف هذا الشهر</option>
                    <option value="closed">إغلاق الملف</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'financials' && (
            <div className="space-y-5">
              {/* Financial Calculation Balance Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-bold">ملخص الدخل والمصروفات الشهرية</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-mono">
                    حساب تلقائي
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-slate-500 block text-xs">إجمالي الدخل الشهري</span>
                    <span className="text-lg font-bold font-mono text-slate-800 mt-1 block">
                      {(currentCase.financials.directIncome + currentCase.financials.indirectIncome + currentCase.financials.externalAid).toLocaleString('ar-EG')} ج.م
                    </span>
                    <span className="text-[10px] text-slate-400">دخل ثابت + يوميات + مساعدات خارجية</span>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-slate-500 block text-xs">إجمالي المصروفات الشهرية</span>
                    <span className="text-lg font-bold font-mono text-slate-800 mt-1 block">
                      {(currentCase.financials.basicExpenses + currentCase.financials.medicalExpenses).toLocaleString('ar-EG')} ج.م
                    </span>
                    <span className="text-[10px] text-slate-400">معيشة + إيجار وفواتير + علاج</span>
                  </div>

                  <div className="p-3 bg-white border border-teal-200 rounded-xl">
                    <span className="text-[#005756] font-semibold block text-xs">العجز الشهري (فرق الدخل عن المصاريف)</span>
                    <span className="text-xl font-extrabold font-mono text-[#005756] mt-1 block">
                      {currentCase.financials.netFinancialGap.toLocaleString('ar-EG')} ج.م
                    </span>
                    <span className="text-[10px] text-slate-500">المبلغ المطلوب لتغطية احتياج الأسرة</span>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown Tables */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Incomes */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                  <h4 className="font-bold text-slate-900 border-b pb-2 flex items-center justify-between">
                    <span>تفاصيل الدخل الشهري</span>
                    <span className="text-emerald-700 font-mono text-xs font-bold">+ دخل</span>
                  </h4>
                  <div className="space-y-2 font-mono">
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-600 font-sans">دخل ثابت (معاش / تكافل وكرامة / تأمينات):</span>
                      <strong className="text-slate-900">{currentCase.financials.directIncome.toLocaleString('ar-EG')} ج.م</strong>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-600 font-sans">شغل يومية غير منتظم:</span>
                      <strong className="text-slate-900">{currentCase.financials.indirectIncome.toLocaleString('ar-EG')} ج.م</strong>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-600 font-sans">مساعدات شهرية من أهل الخير أو جمعيات:</span>
                      <strong className="text-slate-900">{currentCase.financials.externalAid.toLocaleString('ar-EG')} ج.م</strong>
                    </div>
                  </div>
                </div>

                {/* Expenses */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                  <h4 className="font-bold text-slate-900 border-b pb-2 flex items-center justify-between">
                    <span>تفاصيل المصروفات الشهرية</span>
                    <span className="text-rose-700 font-mono text-xs font-bold">- مصروفات</span>
                  </h4>
                  <div className="space-y-2 font-mono">
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-600 font-sans">مصاريف البيت والإيجار والأكل:</span>
                      <strong className="text-slate-900">{currentCase.financials.basicExpenses.toLocaleString('ar-EG')} ج.م</strong>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-100">
                      <span className="text-slate-600 font-sans">مصاريف العلاج والأدوية الشهرية:</span>
                      <strong className="text-rose-600 font-bold">{currentCase.financials.medicalExpenses.toLocaleString('ar-EG')} ج.م</strong>
                    </div>
                    <div className="flex justify-between items-center py-1 text-slate-500 font-sans text-[11px]">
                      <span>إجمالي المساعدات اللي استلمتها الحالة قبل كده:</span>
                      <strong className="font-mono text-slate-900">{currentCase.historicalAssistanceTotal.toLocaleString('ar-EG')} ج.م</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Beneficiary Financial Ledger: سجل المساعدات المصروفة للحالة */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3.5 shadow-2xs">
                {/* Ledger Header & Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-800 flex items-center justify-center shrink-0 border border-teal-200">
                      <FileSpreadsheet size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                        <span>سجل المساعدات المصروفة للحالة</span>
                        <span className="text-[11px] text-slate-500 font-normal">
                          (كشف حساب المساعدات)
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        كل المبالغ اللي اتصرفت للحالة سواء شهرية أو فورية
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
                        مساعدات شهرية ({beneficiaryLedger.filter((e) => !e.isFastTrack).length})
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
                        مساعدات فورية ({caseFastTrackOrders.length})
                      </button>
                    </div>

                    {/* Export CSV button */}
                    <button
                      type="button"
                      onClick={handleExportLedger}
                      disabled={beneficiaryLedger.length === 0}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                      title="تحميل كشف حساب المساعدات بصيغة CSV"
                    >
                      <Download size={12} />
                      <span>تحميل كشف الحساب (.csv)</span>
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
                    <p className="font-semibold text-slate-700">لم يتم صرف أي مساعدات لهذه الحالة حتى الآن</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      ستظهر هنا كل المساعدات الشهرية أو الفورية بمجرد صرفها للحالة
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto max-h-72">
                      <table className="w-full text-right text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-700 text-[11px] font-bold sticky top-0 z-10 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3 border-l border-slate-200">1. اسم الدفعة / المساعدة</th>
                            <th className="py-2.5 px-3 border-l border-slate-200 whitespace-nowrap">2. تاريخ الصرف</th>
                            <th className="py-2.5 px-3 border-l border-slate-200">3. نوع المساعدة</th>
                            <th className="py-2.5 px-3 border-l border-slate-200 whitespace-nowrap">4. المبلغ المنصرف</th>
                            <th className="py-2.5 px-3 border-l border-slate-200 min-w-[160px]">5. ملاحظات</th>
                            <th className="py-2.5 px-3 whitespace-nowrap">6. حالة الاستلام ورقم الإيصال</th>
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
                                  {row.isFastTrack ? 'مساعدة فورية' : 'مساعدة شهرية'}
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
                                  row.fundSourceBadge === 'مساعدة فورية'
                                    ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                    : row.fundSourceBadge === 'تبرع للحالة بالاسم'
                                    ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                    : row.fundSourceBadge === 'تبرع لغرض محدد'
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
                        <span>عدد مرات الصرف: <strong className="font-mono text-slate-900">{ledgerSummary.totalOperations}</strong></span>
                        <span>·</span>
                        <span>دفعات تم تسليمها: <strong className="font-mono text-emerald-700">{ledgerSummary.deliveredCount}</strong></span>
                        <span>·</span>
                        <span>متوسط المساعدة: <strong className="font-mono text-slate-900">{ledgerSummary.averageDelivered.toLocaleString('ar-EG')} ج.م</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-semibold text-[11px]">إجمالي المبالغ المستلمة:</span>
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
                  <h3 className="font-bold text-slate-900 text-sm">سجل زيارات ومعاينات الباحثين</h3>
                  <p className="text-xs text-slate-500">متابعة دورية كل 6 شهور للتأكد من ظروف الأسرة</p>
                </div>
                <button
                  onClick={() => setShowReassignDialog(true)}
                  className="px-3 py-1.5 bg-teal-50 border border-teal-200 text-teal-800 rounded-lg text-xs font-semibold hover:bg-teal-100 transition-colors"
                >
                  تحديد باحث للزيارة الجاية
                </button>
              </div>

              {caseVisits.length === 0 ? (
                <div className="py-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl">
                  لم يتم تسجيل أي زيارات ميدانية لهذه الحالة حتى الآن
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
                          {v.status === 'completed' ? 'تمت الزيارة' : 'زيارة متأخرة'}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed text-xs">
                        {v.observations}
                      </p>
                      <div className="pt-2 border-t border-slate-200 text-teal-900 font-medium text-xs">
                        توصية الباحث: {v.recommendedChanges}
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
                  <h3 className="font-bold text-slate-900 text-sm">أوراق ومستندات الحالة</h3>
                  <p className="text-xs text-slate-500">صور البطاقات، شهادات الميلاد، التقارير الطبية، وإيصالات الإيجار والمرافق</p>
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
                    <span>إضافة مستند جديد</span>
                  </button>
                )}
              </div>

              {currentCase.attachments.length === 0 ? (
                <div className="py-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl">
                  لا توجد أوراق أو مستندات مرفوعة لهذه الحالة حالياً
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
                        title="تحميل المستند"
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
                  <span>تم تجهيز وتحميل المستند: <strong>{downloadNotice}</strong></span>
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
        <div className="px-4 sm:px-6 pt-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-slate-500 text-xs font-mono">
            كود الحالة: {currentCase.code}
          </span>
          <button
            type="button"
            onClick={() => {
              if (isMobileViewport) {
                setIsClosing(true);
              } else {
                handleCloseModal();
              }
            }}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </motion.div>

      {/* Exception Approval Sub-Dialog */}
      {showExceptionDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-base">موافقة استثنائية لصرف المساعدة</h3>
                <p className="text-xs text-slate-500 mt-0.5">اعتماد مؤقت لحين استكمال باقي الأوراق</p>
              </div>
              <button
                type="button"
                onClick={() => setShowExceptionDialog(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                رغم نقص بعض الأوراق، يمكن اعتماد الحالة طالما الباحث الميداني أكد احتياجها الفعلي بنسبة ({currentCase.vulnerability.confidenceScore}%). اكتب سبب الموافقة الاستثنائية:
              </p>
              <textarea
                rows={3}
                value={exceptionReasonInput}
                onChange={(e) => setExceptionReasonInput(e.target.value)}
                placeholder="مثال: حالة مرضية حرجة وسكن غير آمن، وجاري استكمال باقي الأوراق..."
                className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15"
              />
              <div className="flex justify-end gap-2 text-xs pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowExceptionDialog(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleApproveException}
                  disabled={!exceptionReasonInput.trim()}
                  className="px-4 py-2 bg-[#005756] hover:bg-[#004241] disabled:opacity-50 text-white font-bold rounded-lg cursor-pointer"
                >
                  تأكيد الموافقة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reassign Researcher Sub-Dialog */}
      {showReassignDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-base">تغيير الباحث المسؤول</h3>
                <p className="text-xs text-slate-500 mt-0.5">تحديد الباحث للزيارة والمتابعة الجاية</p>
              </div>
              <button
                type="button"
                onClick={() => setShowReassignDialog(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <ResearcherSelect
                value={newResearcherInput}
                onChange={setNewResearcherInput}
                label="اختيار الباحث الميداني"
                required
              />
              <div className="flex justify-end gap-2 text-xs pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReassignDialog(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleReassign}
                  disabled={!newResearcherInput.trim()}
                  className="px-4 py-2 bg-[#005756] hover:bg-[#004241] disabled:opacity-50 text-white font-bold rounded-lg cursor-pointer"
                >
                  حفظ الباحث
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Document Sub-Dialog */}
      {showAddAttachmentDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-base">إضافة مستند جديد</h3>
                <p className="text-xs text-slate-500 mt-0.5">إرفاق ورقة أو مستند جديد لملف الحالة</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddAttachmentDialog(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">اسم المستند أو الوصف *</label>
                  <input
                    type="text"
                    value={attachmentTitle}
                    onChange={(e) => setAttachmentTitle(e.target.value)}
                    placeholder="مثال: روشتة علاج الغسيل الكلوي لشهر أكتوبر"
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">نوع المستند</label>
                  <select
                    value={attachmentCategory}
                    onChange={(e) => setAttachmentCategory(e.target.value as any)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15"
                  >
                    <option value="medical_report">تقرير طبي أو روشتة علاج</option>
                    <option value="national_id">بطاقة رقم قومي أو شهادة ميلاد</option>
                    <option value="income_proof">برنت تأمينات أو مفردات مرتب / معاش</option>
                    <option value="housing_contract">عقد إيجار أو وصل كهرباء / مياه</option>
                    <option value="field_video">فيديو معاينة ميدانية</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">اسم الملف المرفق</label>
                  <input
                    type="text"
                    value={attachmentFileName}
                    onChange={(e) => setAttachmentFileName(e.target.value)}
                    placeholder="october_medical_report.pdf"
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono text-xs focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 text-xs pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddAttachmentDialog(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
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
                  className="px-4 py-2 bg-[#005756] hover:bg-[#004241] disabled:opacity-50 text-white font-bold rounded-lg cursor-pointer"
                >
                  حفظ المستند
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </MotionConfig>
  );
}
