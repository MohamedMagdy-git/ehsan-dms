'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import { useToast } from '@/context/toast-context';
import {
  CheckCircle2,
  RotateCcw,
  Search,
  Eye,
  FileCheck,
  User,
  Calendar,
  Wallet,
  ArrowRight,
  MapPin,
  LayoutGrid,
  List,
} from 'lucide-react';
import { BeneficiaryCase, PriorityLevel } from '@/types';
import { CaseReviewApprovalModal } from './case-review-approval-modal';
import {
  calculateFieldSurveyCompleteness,
  FIELD_SURVEY_TOTAL_QUESTIONS,
  getCoreDocumentsStats,
} from '@/lib/survey-completeness';
import { ResearcherVoicePlayer } from '@/components/common/researcher-voice-player';
import { CustomSelect } from '@/components/ui/custom-select';

/* Circular Progress Gauge for Survey Completeness */
function CircularProgressGauge({
  percentage,
  size = 48,
  strokeWidth = 4,
  colorClass = 'text-[#005756]',
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  colorClass?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`${colorClass} transition-all duration-700 ease-out`}
          fill="transparent"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono font-bold text-xs text-slate-800 leading-none tabular-nums">
          {percentage}%
        </span>
      </div>
    </div>
  );
}

export function CaseReviewApprovalView() {
  const { cases, approveCaseReview, setActiveSection } = useApp();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedResearcher, setSelectedResearcher] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [auditCase, setAuditCase] = useState<BeneficiaryCase | null>(null);
  const [auditInitialAction, setAuditInitialAction] = useState<'none' | 'return' | 'approve'>('none');

  const handleDirectApprove = (caseId: string) => {
    approveCaseReview(caseId);
    toast.success('تم اعتماد الحالة وإدراجها في كشوف الصرف بنجاح', {
      duration: 6000,
      action: {
        label: 'عرض في الميزانية',
        onClick: () => setActiveSection('allocation'),
      },
    });
  };

  const handleReturnSuccess = () => {
    setAuditCase(null);
    setAuditInitialAction('none');
  };

  // Filter cases with status 'pending_review' or 'needs_revision'
  const pendingCases = useMemo(() => {
    return cases.filter(
      (c) => c.status === 'pending_review' || c.status === 'needs_revision'
    );
  }, [cases]);

  // Distinct researchers from pending cases
  const researchersList = useMemo(() => {
    return Array.from(new Set(pendingCases.map((c) => c.assignedResearcher))).filter(Boolean);
  }, [pendingCases]);

  // Filtered cases
  const filteredCases = useMemo(() => {
    return pendingCases.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (c.primaryName && c.primaryName.toLowerCase().includes(q)) ||
        c.fullName.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.nationalId.includes(q) ||
        (c.assignedResearcher && c.assignedResearcher.toLowerCase().includes(q));

      const matchesPriority = selectedPriority === 'all' || c.priority === selectedPriority;
      const matchesResearcher = selectedResearcher === 'all' || c.assignedResearcher === selectedResearcher;

      return matchesSearch && matchesPriority && matchesResearcher;
    });
  }, [pendingCases, searchQuery, selectedPriority, selectedResearcher]);

  // Arabic grammar helper for cases count
  const formatArabicCases = (count: number): string => {
    if (count === 0) return 'مفيش حالات';
    if (count === 1) return 'حالة واحدة';
    if (count === 2) return 'حالتين';
    if (count >= 3 && count <= 10) return `${count} حالات`;
    return `${count} حالة`;
  };

  // Metrics
  const pendingCount = pendingCases.filter((c) => c.status === 'pending_review').length;
  const needsRevisionCount = pendingCases.filter((c) => c.status === 'needs_revision').length;
  const totalPendingGap = pendingCases.reduce(
    (sum, c) => sum + (c.financials?.netFinancialGap || 0),
    0
  );

  // Exact dynamic calculation of attachments completeness percentage (4 core documents expected per case)
  const attachmentCompletionRate = useMemo(() => {
    if (pendingCases.length === 0) return 100;
    const totalPossible = pendingCases.length * 4;
    const totalActual = pendingCases.reduce(
      (acc, c) => acc + getCoreDocumentsStats(c).completed,
      0
    );
    return Math.round((totalActual / totalPossible) * 100);
  }, [pendingCases]);

  // Exact dynamic calculation of field survey completeness across all pending cases (24 questions)
  const overallSurveyCompleteness = useMemo(() => {
    if (pendingCases.length === 0) {
      return {
        percentage: 100,
        completed: FIELD_SURVEY_TOTAL_QUESTIONS,
        total: FIELD_SURVEY_TOTAL_QUESTIONS,
      };
    }
    const totals = pendingCases.reduce(
      (acc, c) => {
        const res = calculateFieldSurveyCompleteness(c);
        return {
          completed: acc.completed + res.completedFields,
          total: acc.total + res.totalFields,
        };
      },
      { completed: 0, total: 0 }
    );
    const percentage = totals.total > 0 ? Math.round((totals.completed / totals.total) * 100) : 100;
    return {
      percentage,
      completed: totals.completed,
      total: totals.total,
    };
  }, [pendingCases]);

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

  return (
    <div className="space-y-5">
      {/* Top Summary & Return Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 tabular-nums">
          <span className="font-semibold text-slate-800">ملخص المراجعة</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span>{formatArabicCases(pendingCount)} بانتظار القرار</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className={needsRevisionCount > 0 ? 'font-semibold text-amber-700' : ''}>
            راجعة للباحث: {needsRevisionCount}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setActiveSection('cases')}
          className="px-3.5 py-2 min-h-[40px] bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <ArrowRight size={14} className="text-slate-400" />
          <span>رجوع لسجل الأسر</span>
        </button>
      </div>

      {/* Overview Stat Cards: 5-Card Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-none">
          <span className="block text-2xl font-bold text-slate-900 font-mono tabular-nums leading-none">
            {pendingCount}
          </span>
          <span className="block text-xs text-slate-500 font-medium mt-2">
            أبحاث بانتظار القرار
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-none">
          <span
            className={`block text-2xl font-bold font-mono tabular-nums leading-none ${
              needsRevisionCount > 0 ? 'text-amber-700' : 'text-slate-900'
            }`}
          >
            {needsRevisionCount}
          </span>
          <span
            className={`block text-xs font-medium mt-2 ${
              needsRevisionCount > 0 ? 'text-amber-700' : 'text-slate-500'
            }`}
          >
            راجعة للباحث
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-none">
          <span className="block text-2xl font-bold text-slate-900 font-mono tabular-nums leading-none">
            {totalPendingGap.toLocaleString('ar-EG')} ج.م
          </span>
          <span className="block text-xs text-slate-500 font-medium mt-2">
            إجمالي العجز الشهري
          </span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-none flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="block text-xs text-slate-500 font-medium">اكتمال الأوراق</span>
            <span className="text-[11px] text-slate-400 font-medium tabular-nums">4 أوراق</span>
          </div>
          <span className="block text-xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {attachmentCompletionRate}%
          </span>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
            <div
              style={{ width: `${attachmentCompletionRate}%` }}
              className="h-full rounded-full bg-[#005756] transition-all duration-300"
            />
          </div>
        </div>

        {/* Card 5: Survey Completeness */}
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-none flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <span className="block text-xs text-slate-500 font-medium truncate">اكتمال الاستمارة</span>
            <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
              {overallSurveyCompleteness.percentage === 100
                ? 'مكتملة'
                : overallSurveyCompleteness.percentage >= 80
                ? 'قربت تكتمل'
                : 'ناقصة بيانات'}
            </span>
          </div>

          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
              {overallSurveyCompleteness.percentage}%
            </span>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              {overallSurveyCompleteness.completed}/{overallSurveyCompleteness.total} سؤال
            </span>
          </div>

          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
            <div
              style={{ width: `${overallSurveyCompleteness.percentage}%` }}
              className={`h-full rounded-full transition-all duration-300 ${
                overallSurveyCompleteness.percentage === 100 ? 'bg-[#005756]' : 'bg-slate-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar with View Mode Toggle */}
      <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-none flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="دوّر بالاسم، الكود، أو الباحث..."
              className="w-full h-10 pr-9 pl-3 py-2 text-xs font-medium bg-slate-50/70 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:border-[#005756] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#005756] transition"
            />
          </div>

          <CustomSelect
            value={selectedPriority}
            onChange={setSelectedPriority}
            options={[
              { value: 'all', label: 'كل الأولويات' },
              { value: 'critical', label: 'أولوية حرجة' },
              { value: 'high', label: 'أولوية عالية' },
              { value: 'medium', label: 'أولوية متوسطة' },
              { value: 'low', label: 'أولوية منخفضة' },
            ]}
            ariaLabel="تصفية حسب الأولوية"
            triggerClassName="h-10 text-xs font-medium bg-slate-50/70 rounded-lg"
          />

          <CustomSelect
            value={selectedResearcher}
            onChange={setSelectedResearcher}
            options={[
              { value: 'all', label: 'كل الباحثين' },
              ...researchersList.map((res) => ({ value: res, label: res })),
            ]}
            ariaLabel="تصفية حسب الباحث"
            triggerClassName="h-10 text-xs font-medium bg-slate-50/70 rounded-lg"
          />
        </div>

        {/* View Mode Toggle: Cards vs Table (Only visible on lg+ desktop) */}
        <div className="hidden lg:flex items-center justify-end gap-1 shrink-0">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'cards'
                  ? 'bg-white text-[#005756] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="عرض الكروت"
            >
              <LayoutGrid size={14} />
              <span>عرض الكروت</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'table'
                  ? 'bg-white text-[#005756] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="عرض الجدول"
            >
              <List size={14} />
              <span>عرض الجدول</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredCases.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-xl border border-slate-200/80 shadow-none space-y-2.5">
          <CheckCircle2 size={28} className="mx-auto text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800">
            مفيش أبحاث مستنية مراجعة دلوقتي
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            كل الحالات اتراجعت واعتمدت، أو مفيش نتايج مطابقة للبحث اللي فوق.
          </p>
        </div>
      ) : (
        <>
          {/* Cards View: Always active on mobile/tablet (< lg), and active on lg+ when viewMode === 'cards' */}
          <div className={`space-y-4 ${viewMode === 'table' ? 'lg:hidden' : 'block'}`}>
            {filteredCases.map((c) => {
              const pMeta = getPriorityMeta(c.priority);
              const docStats = getCoreDocumentsStats(c);
              const attCount = docStats.completed;
              const isAttComplete = docStats.isComplete;
              const surveyComp = calculateFieldSurveyCompleteness(c);
              const isFullyReady = surveyComp.isComplete && isAttComplete;

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-xl border border-slate-200/80 shadow-none p-4 sm:p-5 space-y-4"
                >
                  <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 sm:gap-5">
                    {/* Upper Group: Identity & Metrics */}
                    <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-5">
                      {/* 1. Identity & Beneficiary Meta */}
                      <div className="w-full md:w-auto md:max-w-xs lg:max-w-sm xl:max-w-none xl:flex-1 space-y-1.5">
                        {/* Code + Priority + Review Status (Unboxed text, semantic color only for critical/returned) */}
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="font-mono font-semibold text-slate-500 tabular-nums">
                            {c.code}
                          </span>
                          <span className="text-slate-300" aria-hidden="true">·</span>
                          <span className={pMeta.textCls}>{pMeta.label}</span>
                          <span className="text-slate-300" aria-hidden="true">·</span>
                          <span
                            className={
                              c.status === 'needs_revision'
                                ? 'text-amber-700 font-semibold'
                                : 'text-slate-500 font-medium'
                            }
                          >
                            {c.status === 'needs_revision' ? 'راجعة للباحث' : 'بانتظار المراجعة'}
                          </span>
                          {isFullyReady && (
                            <>
                              <span className="text-slate-300" aria-hidden="true">·</span>
                              <span className="text-[#005756] font-semibold">جاهزة للاعتماد</span>
                            </>
                          )}
                        </div>

                        {/* Beneficiary Name & Open Meta */}
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <h3
                              onClick={() => {
                                setAuditCase(c);
                                setAuditInitialAction('none');
                              }}
                              className="text-base sm:text-lg font-bold text-slate-900 hover:text-[#005756] transition-colors cursor-pointer"
                            >
                              {c.primaryName || c.fullName}
                            </h3>
                            {c.secondaryName && (
                              <span className="text-xs text-slate-500 font-normal">
                                ({c.secondaryName})
                              </span>
                            )}
                            {c.nationalId && (
                              <span className="text-xs font-mono text-slate-400 tabular-nums">
                                · {c.nationalId}
                              </span>
                            )}
                          </div>

                          {/* Open Linear Meta Row */}
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1 text-slate-600">
                              <MapPin size={13} className="text-slate-400 shrink-0" />
                              <span>{c.governorate} · {c.district}</span>
                            </span>
                            <span className="text-slate-300" aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 text-slate-600">
                              <User size={13} className="text-slate-400 shrink-0" />
                              <span>
                                الباحث:{' '}
                                <strong className="font-semibold text-slate-700">
                                  {c.assignedResearcher || 'مش متحدد'}
                                </strong>
                              </span>
                            </span>
                            <span className="text-slate-300" aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-500">
                              <Calendar size={13} className="text-slate-400 shrink-0" />
                              <span>{c.lastVisitDate || c.registrationDate}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 2. Unified Soft Slate Metric Blocks */}
                      <div className="w-full md:w-auto flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center md:items-stretch lg:items-center gap-2.5 shrink-0">
                        {/* Monthly Deficit Box (Neutral Slate) */}
                        <div className="w-full sm:w-auto sm:flex-1 md:w-auto px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-200/70 md:min-w-[185px] xl:min-w-[200px]">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">
                              العجز الشهري
                            </span>
                            <Wallet size={14} className="text-slate-400 shrink-0" />
                          </div>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-lg sm:text-xl font-bold text-slate-900 font-mono tabular-nums">
                              {(c.financials?.netFinancialGap || 0).toLocaleString('ar-EG')}
                            </span>
                            <span className="text-xs font-medium text-slate-500">ج.م/شهر</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                            <span>دخل: {(c.financials?.directIncome || 0).toLocaleString('ar-EG')}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              مصاريف:{' '}
                              {((c.financials?.basicExpenses || 0) + (c.financials?.medicalExpenses || 0)).toLocaleString('ar-EG')}
                            </span>
                          </div>
                        </div>

                        {/* Dual Mini Indicators on mobile: 2-column grid */}
                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 shrink-0">
                          {/* Circular Progress Gauge for Survey Fields */}
                          <div className="px-3.5 py-3 rounded-xl bg-slate-50/80 border border-slate-200/70 flex items-center gap-3 sm:min-w-[165px]">
                            <CircularProgressGauge
                              percentage={surveyComp.percentage}
                              size={44}
                              strokeWidth={4}
                              colorClass={surveyComp.percentage === 100 ? 'text-[#005756]' : 'text-slate-500'}
                            />
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-medium text-slate-500 block">
                                اكتمال البحث
                              </span>
                              <span className="text-xs sm:text-sm font-mono font-bold text-slate-800 block tabular-nums">
                                {surveyComp.completedFields}/{surveyComp.totalFields}{' '}
                                <span className="text-[10px] font-medium text-slate-500 font-sans">سؤال</span>
                              </span>
                              <span className="text-[11px] font-medium text-slate-500 block">
                                {surveyComp.statusBadge.label}
                              </span>
                            </div>
                          </div>

                          {/* Attachments Box */}
                          <div className="px-3.5 py-3 rounded-xl bg-slate-50/80 border border-slate-200/70 flex flex-col justify-center gap-1.5 sm:min-w-[130px]">
                            <div className="flex items-center justify-between text-xs gap-2">
                              <span className="font-medium text-slate-600 flex items-center gap-1">
                                <FileCheck size={13} className="text-slate-400 shrink-0" />
                                <span>الأوراق</span>
                              </span>
                              <span className="font-mono font-bold text-slate-800 tabular-nums text-xs">
                                {attCount}/4
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${Math.min(100, (attCount / 4) * 100)}%` }}
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isAttComplete ? 'bg-[#005756]' : 'bg-slate-500'
                                }`}
                              />
                            </div>
                            <span className="text-[11px] font-medium text-slate-500">
                              {isAttComplete ? 'الأوراق كاملة' : 'ناقص ورق'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. Decision Action Dock */}
                    <div className="w-full xl:w-[205px] flex items-center gap-2 pt-3.5 md:pt-4 xl:pt-0 border-t xl:border-t-0 border-slate-100 justify-end xl:flex-col xl:items-stretch xl:justify-center shrink-0">
                      {isFullyReady ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDirectApprove(c.id)}
                            className="flex-1 xl:flex-initial min-h-[42px] py-2.5 px-4 bg-[#005756] hover:bg-[#004241] text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <CheckCircle2 size={15} />
                            <span>اعتماد للصرف</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAuditCase(c);
                              setAuditInitialAction('none');
                            }}
                            className="flex-1 xl:flex-initial min-h-[42px] py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                            title="عرض التفاصيل والأوراق"
                          >
                            <Eye size={14} className="text-slate-400" />
                            <span>عرض التقرير</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setAuditCase(c);
                              setAuditInitialAction('none');
                            }}
                            className="flex-1 xl:flex-initial min-h-[42px] py-2.5 px-4 bg-[#005756] hover:bg-[#004241] text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <Eye size={15} />
                            <span>فحص واعتماد</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAuditCase(c);
                              setAuditInitialAction('return');
                            }}
                            className="flex-1 xl:flex-initial min-h-[42px] py-2.5 px-3.5 bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                            title="إرجاع الحالة للباحث للاستكمال"
                          >
                            <RotateCcw size={14} className="text-slate-400 shrink-0" />
                            <span>إرجاع للباحث</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Embedded Quiet Neutral Researcher Voice Player */}
                  <div className="pt-3 border-t border-slate-100">
                    <ResearcherVoicePlayer
                      audioUrl={
                        c.voiceNoteUrl ||
                        c.attachments?.find(
                          (a) =>
                            a.category === 'voice_memo' ||
                            a.fileName.endsWith('.webm') ||
                            a.fileName.endsWith('.mp3') ||
                            a.fileName.endsWith('.wav')
                        )?.url ||
                        null
                      }
                      durationSeconds={
                        c.voiceNoteDuration ||
                        c.attachments?.find((a) => a.category === 'voice_memo')?.durationSeconds ||
                        18
                      }
                      researcherName={c.assignedResearcher}
                      fileName="تسجيل_صوتي_للباحث.webm"
                      transcriptHint={c.notes}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Classic Table Container: ONLY on lg+ desktop and only when viewMode === 'table' */}
          {viewMode === 'table' && (
            <div className="hidden lg:block bg-white rounded-xl border border-slate-200/80 shadow-none overflow-hidden">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-right text-xs min-w-[950px]">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200/80 text-[11px] whitespace-nowrap">
                      <th className="py-3 px-3.5 font-semibold">كود الحالة</th>
                      <th className="py-3 px-3 font-semibold">اسم المستفيد</th>
                      <th className="py-3 px-3 font-semibold">الباحث المسؤول</th>
                      <th className="py-3 px-3 font-semibold">تاريخ النزول</th>
                      <th className="py-3 px-3 font-semibold">الأولوية</th>
                      <th className="py-3 px-3 font-semibold">الأوراق</th>
                      <th className="py-3 px-3 font-semibold">العجز الشهري</th>
                      <th className="py-3 px-3 font-semibold text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {filteredCases.map((c) => {
                      const pMeta = getPriorityMeta(c.priority);
                      const docStats = getCoreDocumentsStats(c);
                      const attCount = docStats.completed;
                      const isAttComplete = docStats.isComplete;
                      const surveyComp = calculateFieldSurveyCompleteness(c);

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                          <td className="py-3 px-3.5 font-mono font-semibold text-slate-600 tabular-nums">
                            {c.code}
                          </td>

                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900">
                                  {c.primaryName || c.fullName}
                                </span>
                                {c.secondaryName && (
                                  <span className="text-[11px] text-slate-400 font-normal">
                                    ({c.secondaryName})
                                  </span>
                                )}
                                {c.status === 'needs_revision' && (
                                  <>
                                    <span className="text-slate-300" aria-hidden="true">·</span>
                                    <span className="text-[11px] text-amber-700 font-semibold">
                                      راجعة للباحث
                                    </span>
                                  </>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 block">
                                {c.governorate} · {c.district}
                              </span>

                              {/* Mini Survey Completeness Progress Indicator */}
                              <div className="pt-0.5 space-y-1 max-w-[210px]">
                                <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                                  <span>
                                    الاستمارة: {surveyComp.completedFields}/{surveyComp.totalFields} ({surveyComp.percentage}%)
                                  </span>
                                  <span className={surveyComp.statusBadge.badgeClass}>
                                    {surveyComp.statusBadge.label}
                                  </span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    style={{ width: `${surveyComp.percentage}%` }}
                                    className={`h-full rounded-full transition-all ${surveyComp.statusBadge.barClass}`}
                                  />
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-slate-700">
                            {c.assignedResearcher || 'مش متحدد'}
                          </td>

                          <td className="py-3 px-3 font-mono text-slate-600 tabular-nums">
                            {c.lastVisitDate || c.registrationDate}
                          </td>

                          <td className="py-3 px-3">
                            <span className={pMeta.textCls}>{pMeta.label}</span>
                          </td>

                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-mono tabular-nums">
                              <FileCheck size={13} className="text-slate-400" />
                              <span>
                                {attCount}/4 ({Math.round((Math.min(attCount, 4) / 4) * 100)}%)
                              </span>
                            </span>
                          </td>

                          <td className="py-3 px-3 font-mono font-bold text-slate-900 tabular-nums">
                            {(c.financials?.netFinancialGap || 0).toLocaleString('ar-EG')} ج.م
                          </td>

                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {surveyComp.isComplete && isAttComplete ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleDirectApprove(c.id)}
                                    className="px-3 py-1.5 bg-[#005756] hover:bg-[#004241] text-white rounded-lg font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                    title="اعتماد للصرف فوراً"
                                  >
                                    <CheckCircle2 size={13} />
                                    <span>اعتماد للصرف</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAuditCase(c);
                                      setAuditInitialAction('none');
                                    }}
                                    className="px-2.5 py-1.5 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                    title="عرض التقرير"
                                  >
                                    <Eye size={12} className="text-slate-400" />
                                    <span>عرض</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAuditCase(c);
                                      setAuditInitialAction('none');
                                    }}
                                    className="px-3 py-1.5 bg-[#005756] hover:bg-[#004241] text-white rounded-lg font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                    title="فحص واعتماد"
                                  >
                                    <Eye size={12} />
                                    <span>فحص واعتماد</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAuditCase(c);
                                      setAuditInitialAction('return');
                                    }}
                                    className="px-2.5 py-1.5 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                    title="إرجاع للباحث"
                                  >
                                    <RotateCcw size={12} className="text-slate-400" />
                                    <span>إرجاع للباحث</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Case Audit Drawer Modal */}
      {auditCase && (
        <CaseReviewApprovalModal
          key={`${auditCase.id}-${auditInitialAction}`}
          caseItem={cases.find((c) => c.id === auditCase.id) || auditCase}
          isOpen={auditCase !== null}
          initialAction={auditInitialAction}
          onSuccess={handleReturnSuccess}
          onClose={() => {
            setAuditCase(null);
            setAuditInitialAction('none');
          }}
        />
      )}
    </div>
  );
}
