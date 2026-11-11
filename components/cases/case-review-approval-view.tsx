'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter,
  Eye,
  FileCheck,
  User,
  Calendar,
  Wallet,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  MapPin,
  Sparkles,
  Check,
  LayoutGrid,
  List,
  X,
  ChevronDown,
} from 'lucide-react';
import { BeneficiaryCase, PriorityLevel } from '@/types';
import { CaseReviewApprovalModal } from './case-review-approval-modal';
import { calculateFieldSurveyCompleteness } from '@/lib/survey-completeness';

/* Circular Progress Gauge for Survey Completeness (Pinterest Bento Style) */
function CircularProgressGauge({
  percentage,
  size = 52,
  strokeWidth = 4.5,
  colorClass = 'text-teal-600',
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
          className="text-slate-100"
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
        <span className="font-mono font-black text-xs text-slate-800 leading-none">
          {percentage}%
        </span>
      </div>
    </div>
  );
}

export function CaseReviewApprovalView() {
  const { cases, approveCaseReview, setActiveSection } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedResearcher, setSelectedResearcher] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [auditCase, setAuditCase] = useState<BeneficiaryCase | null>(null);
  const [auditInitialAction, setAuditInitialAction] = useState<'none' | 'return' | 'approve'>('none');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleReturnSuccess = (message: string) => {
    setToastMessage(message);
    setAuditCase(null);
    setAuditInitialAction('none');
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 4500);
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

  // Arabic grammar helper for cases count (Egyptian UI copy standard)
  const formatArabicCases = (count: number): string => {
    if (count === 0) return 'لا توجد حالات';
    if (count === 1) return 'حالة واحدة';
    if (count === 2) return 'حالتان';
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
      (acc, c) => acc + Math.min(c.attachments?.length || 0, 4),
      0
    );
    return Math.round((totalActual / totalPossible) * 100);
  }, [pendingCases]);

  // Exact dynamic calculation of field survey completeness across all pending cases (22 fields)
  const overallSurveyCompleteness = useMemo(() => {
    if (pendingCases.length === 0) return { percentage: 100, completed: 22, total: 22 };
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

  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case 'critical':
        return { label: 'أولوية حرجة', cls: 'bg-rose-100 text-rose-950 border-rose-300', textCls: 'text-rose-700 font-bold' };
      case 'high':
        return { label: 'أولوية عالية', cls: 'bg-amber-100 text-amber-950 border-amber-300', textCls: 'text-amber-700 font-bold' };
      case 'medium':
        return { label: 'أولوية متوسطة', cls: 'bg-teal-100 text-teal-950 border-teal-300', textCls: 'text-teal-700 font-bold' };
      case 'low':
        return { label: 'أولوية منخفضة', cls: 'bg-slate-100 text-slate-800 border-slate-300', textCls: 'text-slate-600 font-medium' };
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner and Metric Cards */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              أبحاث بانتظار المراجعة والاعتماد
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
              {formatArabicCases(pendingCount)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            فحص الحالات المبحوثة ميدانياً واعتماد استحقاقها للدعم.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveSection('cases')}
          className="px-3.5 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowRight size={14} />
          <span>العودة لسجل الحالات الكامل</span>
        </button>
      </div>

      {/* Overview Stat Badges: 5-Card Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="block text-2xl font-black text-amber-800 font-mono leading-none">
            {pendingCount}
          </span>
          <span className="block text-[11px] text-slate-500 font-medium mt-1.5">
            أبحاث بانتظار المراجعة
          </span>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="block text-2xl font-black text-rose-800 font-mono leading-none">
            {needsRevisionCount}
          </span>
          <span className="block text-[11px] text-slate-500 font-medium mt-1.5">
            حالات تحتاج استكمال بيانات
          </span>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <span className="block text-2xl font-black text-teal-800 font-mono leading-none">
            {totalPendingGap.toLocaleString('ar-EG')} ج.م
          </span>
          <span className="block text-[11px] text-slate-500 font-medium mt-1.5">
            العجز الشهري (الفجوة المالية)
          </span>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="block text-[11px] text-slate-500 font-medium">اكتمال الثبوتيات</span>
            <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
              4 مستندات
            </span>
          </div>
          <span className="block text-xl font-black text-emerald-700 font-mono mt-1">
            {attachmentCompletionRate}%
          </span>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
            <div
              style={{ width: `${attachmentCompletionRate}%` }}
              className="h-full rounded-full bg-emerald-600 transition-all duration-300"
            />
          </div>
        </div>

        {/* Card 5: Dedicated Survey Data Completeness with Progress Bar and Dynamic Badge */}
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between gap-1">
            <span className="block text-[11px] text-slate-500 font-medium truncate">اكتمال بيانات البحث</span>
            <span
              className={`text-[9px] px-2 py-0.5 rounded-full border whitespace-nowrap font-bold ${
                overallSurveyCompleteness.percentage === 100
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : overallSurveyCompleteness.percentage >= 80
                  ? 'bg-teal-100 text-teal-900 border-teal-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}
            >
              {overallSurveyCompleteness.percentage === 100
                ? 'بحث مكتمل'
                : overallSurveyCompleteness.percentage >= 80
                ? 'شبه مكتمل'
                : 'بيانات ناقصة'}
            </span>
          </div>

          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black font-mono text-slate-900">
              {overallSurveyCompleteness.percentage}%
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {overallSurveyCompleteness.completed}/{overallSurveyCompleteness.total} حقل
            </span>
          </div>

          {/* Dynamic Progress Bar */}
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-1.5">
            <div
              style={{ width: `${overallSurveyCompleteness.percentage}%` }}
              className={`h-full rounded-full transition-all duration-300 ${
                overallSurveyCompleteness.percentage === 100
                  ? 'bg-emerald-600'
                  : overallSurveyCompleteness.percentage >= 80
                  ? 'bg-teal-600'
                  : 'bg-amber-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar with View Mode Toggle */}
      <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم، الكود، أو الباحث..."
              className="w-full h-10 pr-9 pl-3 py-2 text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:border-[#005756] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#005756] transition"
            />
          </div>

          <div className="relative">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-800 pr-3 pl-8 appearance-none focus:outline-hidden focus:border-[#005756] focus:ring-1 focus:ring-[#005756] cursor-pointer shadow-2xs"
            >
              <option value="all">كافة مستويات الأولوية</option>
              <option value="critical">حرجة</option>
              <option value="high">عالية</option>
              <option value="medium">متوسطة</option>
              <option value="low">منخفضة</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={selectedResearcher}
              onChange={(e) => setSelectedResearcher(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-800 pr-3 pl-8 appearance-none focus:outline-hidden focus:border-[#005756] focus:ring-1 focus:ring-[#005756] cursor-pointer shadow-2xs"
            >
              <option value="all">كافة الباحثين الميدانيين</option>
              {researchersList.map((res) => (
                <option key={res} value={res}>
                  {res}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* View Mode Toggle: Modern Cards vs Classic Table (Only visible on lg+ desktop) */}
        <div className="hidden lg:flex items-center justify-end gap-1 shrink-0 self-end md:self-center">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-teal-950 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="عرض كروت المراجعة العصرية"
            >
              <LayoutGrid size={14} />
              <span>كروت الاعتماد</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-teal-950 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="عرض الجدول المجدول"
            >
              <List size={14} />
              <span>جدول البيانات</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredCases.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 size={26} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            لا توجد حالات معلقة بانتظار المراجعة والاعتماد حالياً
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            تم اعتماد جميع أبحاث الحالات الميدانية بنجاح، أو لا توجد نتائج مطابقة لفلتر البحث المحدد أعلاه.
          </p>
        </div>
      ) : (
        <>
          {/* Cards View: Always active on mobile/tablet (< lg), and active on lg+ when viewMode === 'cards' */}
          <div className={`space-y-4 ${viewMode === 'table' ? 'lg:hidden' : 'block'}`}>
            {filteredCases.map((c) => {
              const pBadge = getPriorityBadge(c.priority);
              const attCount = c.attachments?.length || 0;
              const isAttComplete = attCount >= 4;
              const surveyComp = calculateFieldSurveyCompleteness(c);
              const isFullyReady = surveyComp.isComplete && isAttComplete;

              return (
                <div
                  key={c.id}
                  className="relative bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-[0_2px_14px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.07)] hover:-translate-y-0.5 transition-all duration-300 p-4 sm:p-5 md:p-6 xl:p-7 overflow-hidden group"
                >
                  {/* Fluid 3-tier responsive grid:
                      - Mobile (< md): Vertical stacked flow
                      - Tablet/Compact Laptop (md to lg): 2-row layout (Row 1: Identity & Metrics, Row 2: Full-width Action Dock)
                      - Desktop (xl+): Full horizontal 3-zone row */}
                  <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 sm:gap-5 xl:gap-6">
                    
                    {/* Upper Group: Identity & Metrics */}
                    <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-5 xl:gap-6">
                      
                      {/* 1. Identity & Beneficiary Meta */}
                      <div className="w-full md:w-auto md:max-w-xs lg:max-w-sm xl:max-w-none xl:flex-1 space-y-1.5 sm:space-y-2">
                        {/* Status dot + Code + Unboxed status text */}
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="relative flex h-2 w-2 shrink-0">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isFullyReady ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${isFullyReady ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-500 tracking-wider">
                            {c.code}
                          </span>
                          <span className="text-slate-300" aria-hidden="true">·</span>
                          <span className={pBadge.textCls}>
                            {pBadge.label}
                          </span>
                          <span className="text-slate-300" aria-hidden="true">·</span>
                          <span className={c.status === 'needs_revision' ? 'text-rose-600 font-bold' : 'text-amber-600 font-bold'}>
                            {c.status === 'needs_revision' ? 'تحتاج تعديل' : 'بانتظار المراجعة'}
                          </span>
                          {isFullyReady && (
                            <>
                              <span className="text-slate-300" aria-hidden="true">·</span>
                              <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                                <CheckCircle2 size={13} className="text-emerald-600" />
                                <span>جاهز للاعتماد</span>
                              </span>
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
                              className="text-base sm:text-lg xl:text-xl font-black text-slate-900 group-hover:text-teal-900 transition-colors cursor-pointer tracking-tight"
                            >
                              {c.primaryName || c.fullName}
                            </h3>
                            {c.secondaryName && (
                              <span className="text-xs text-slate-400 font-normal">
                                ({c.secondaryName})
                              </span>
                            )}
                            {c.nationalId && (
                              <span className="text-[11px] font-mono text-slate-400">
                                • {c.nationalId}
                              </span>
                            )}
                          </div>

                          {/* Open Linear Meta Row */}
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 font-medium">
                            <span className="inline-flex items-center gap-1 text-slate-600">
                              <MapPin size={13} className="text-slate-400 shrink-0" />
                              <span>{c.governorate} · {c.district}</span>
                            </span>
                            <span className="text-slate-300" aria-hidden="true">•</span>
                            <span className="inline-flex items-center gap-1 text-slate-600">
                              <User size={13} className="text-slate-400 shrink-0" />
                              <span>الباحث: <strong className="font-semibold text-slate-700">{c.assignedResearcher || 'غير محدد'}</strong></span>
                            </span>
                            <span className="text-slate-300" aria-hidden="true">•</span>
                            <span className="inline-flex items-center gap-1 font-mono text-slate-500">
                              <Calendar size={13} className="text-slate-400 shrink-0" />
                              <span>{c.lastVisitDate || c.registrationDate}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 2. Middle Section: Bento Metrics (Stacked / 2-col on mobile, flex on tablet/desktop) */}
                      <div className="w-full md:w-auto flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center md:items-stretch lg:items-center gap-2.5 sm:gap-3 xl:gap-3.5 shrink-0">
                        
                        {/* Monthly Deficit Bento Box - full width on mobile */}
                        <div className="w-full sm:w-auto sm:flex-1 md:w-auto px-4 sm:px-4.5 py-3 sm:py-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100/70 md:min-w-[190px] xl:min-w-[210px] transition-colors group-hover:bg-emerald-50/75">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-800 tracking-tight">
                              العجز الشهري (الفجوة)
                            </span>
                            <div className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-lg bg-emerald-100/70 text-emerald-800 flex items-center justify-center shrink-0">
                              <Wallet size={14} />
                            </div>
                          </div>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-xl sm:text-2xl font-black text-emerald-950 font-mono tracking-tight tabular-nums">
                              {(c.financials?.netFinancialGap || 0).toLocaleString('ar-EG')}
                            </span>
                            <span className="text-xs font-black text-emerald-700">ج.م/شهر</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-emerald-700/80 mt-0.5 font-mono">
                            <span>دخل: {(c.financials?.directIncome || 0).toLocaleString('ar-EG')}</span>
                            <span>·</span>
                            <span>مصروف: {((c.financials?.basicExpenses || 0) + (c.financials?.medicalExpenses || 0)).toLocaleString('ar-EG')}</span>
                          </div>
                        </div>

                        {/* Dual Mini Indicators on mobile: 2-column grid */}
                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3 shrink-0">
                          
                          {/* Circular Progress Gauge for Survey Fields */}
                          <div className="px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-center gap-2.5 sm:gap-3.5 sm:min-w-[165px] xl:min-w-[185px]">
                            <CircularProgressGauge
                              percentage={surveyComp.percentage}
                              size={48}
                              strokeWidth={4}
                              colorClass={
                                surveyComp.percentage === 100
                                  ? 'text-emerald-600'
                                  : surveyComp.percentage >= 80
                                  ? 'text-teal-600'
                                  : 'text-amber-500'
                              }
                            />
                            <div className="space-y-0.5">
                              <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 block">اكتمال البحث</span>
                              <span className="text-xs sm:text-sm font-mono font-bold text-slate-800 block tabular-nums">
                                {surveyComp.completedFields}/{surveyComp.totalFields} <span className="text-[9px] sm:text-[10px] font-medium text-slate-500 font-sans">حقل</span>
                              </span>
                              <span className={`text-[9px] sm:text-[10px] font-bold ${
                                surveyComp.percentage === 100 ? 'text-emerald-700' : surveyComp.percentage >= 80 ? 'text-teal-700' : 'text-amber-700'
                              }`}>
                                {surveyComp.statusBadge.label}
                              </span>
                            </div>
                          </div>

                          {/* Attachments Bento Box */}
                          <div className="px-3.5 sm:px-4 py-3 sm:py-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 flex flex-col justify-center gap-1.5 sm:min-w-[125px] xl:min-w-[135px]">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px] sm:text-xs">
                                <FileCheck size={13} className={isAttComplete ? 'text-emerald-600' : 'text-amber-600'} />
                                <span>المرفقات</span>
                              </span>
                              <span className="font-mono font-bold text-slate-800 tabular-nums text-xs">
                                {attCount}/4
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${Math.min(100, (attCount / 4) * 100)}%` }}
                                className={`h-full rounded-full transition-all duration-500 ${isAttComplete ? 'bg-emerald-600' : 'bg-amber-500'}`}
                              />
                            </div>
                            <span className="text-[9px] sm:text-[10px] font-semibold text-slate-500">
                              {isAttComplete ? 'ثبوتيات مكتملة ✓' : 'ناقص مستندات'}
                            </span>
                          </div>

                        </div>
                      </div>
                    </div>

                    {/* 3. Decision Action Dock:
                        - On mobile (< md): Full-width side-by-side flex row (height >= 44px)
                        - On tablet/compact laptop (md to lg): Full-width bottom row aligned cleanly
                        - On desktop (xl+): Vertical column on the left */}
                    <div className="w-full xl:w-[220px] flex items-center gap-2.5 pt-3.5 md:pt-4 xl:pt-0 border-t md:border-t xl:border-t-0 border-slate-100 justify-end xl:flex-col xl:items-stretch xl:justify-center shrink-0">
                      {isFullyReady ? (
                        <>
                          <button
                            type="button"
                            onClick={() => approveCaseReview(c.id)}
                            className="flex-1 xl:flex-initial min-h-[44px] py-2.5 sm:py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl sm:rounded-2xl font-bold text-xs shadow-md ring-2 ring-emerald-500/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
                          >
                            <CheckCircle2 size={16} />
                            <span>اعتماد رسمي للصرف</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAuditCase(c);
                              setAuditInitialAction('none');
                            }}
                            className="flex-1 sm:flex-initial xl:flex-initial min-h-[44px] py-2.5 px-4 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl sm:rounded-2xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                            title="فحص التفاصيل والمستندات"
                          >
                            <Eye size={14} />
                            <span>فحص التقرير</span>
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
                            className="flex-1 xl:flex-initial min-h-[44px] py-2.5 sm:py-3 px-4 bg-teal-800 hover:bg-teal-900 text-white rounded-xl sm:rounded-2xl font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
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
                            className="flex-1 xl:flex-initial min-h-[44px] py-2.5 px-3 sm:px-4 bg-white hover:bg-amber-50/70 border border-amber-300 text-amber-900 rounded-xl sm:rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                            title="إرجاع الحالة للباحث للاستكمال"
                          >
                            <RotateCcw size={14} className="text-amber-700 shrink-0" />
                            <span className="truncate">إرجاع للباحث للاستكمال</span>
                          </button>
                        </>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          {/* Classic Table Container: ONLY on lg+ desktop and only when viewMode === 'table' */}
          {viewMode === 'table' && (
            <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-right text-xs min-w-[950px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] whitespace-nowrap">
                      <th className="py-3 px-3.5 font-bold">كود الحالة</th>
                      <th className="py-3 px-3 font-bold">اسم المستفيد</th>
                      <th className="py-3 px-3 font-bold">الباحث المسؤول</th>
                      <th className="py-3 px-3 font-bold">تاريخ الزيارة</th>
                      <th className="py-3 px-3 font-bold">الأولوية</th>
                      <th className="py-3 px-3 font-bold">المرفقات</th>
                      <th className="py-3 px-3 font-bold">الفجوة المالية</th>
                      <th className="py-3 px-3 font-bold text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {filteredCases.map((c) => {
                      const pBadge = getPriorityBadge(c.priority);
                      const attCount = c.attachments?.length || 0;
                      const isAttComplete = attCount >= 4;
                      const surveyComp = calculateFieldSurveyCompleteness(c);

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition-colors whitespace-nowrap">
                          <td className="py-3 px-3.5 font-mono font-bold text-teal-800">
                            {c.code}
                          </td>

                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 block">
                                  {c.primaryName || c.fullName}
                                </span>
                                {c.secondaryName && (
                                  <span className="text-[11px] text-slate-400 font-normal">
                                    ({c.secondaryName})
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 block">
                                {c.governorate} - {c.district}
                              </span>

                              {/* Mini Survey Completeness Progress Indicator */}
                              <div className="pt-1 space-y-1 max-w-[210px]">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="font-semibold text-slate-700">
                                    اكتمال البحث: {surveyComp.completedFields}/22 حقل ({surveyComp.percentage}%)
                                  </span>
                                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full border ${surveyComp.statusBadge.badgeClass}`}>
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
                            {c.assignedResearcher || 'غير محدد'}
                          </td>

                          <td className="py-3 px-3 font-mono text-slate-600">
                            {c.lastVisitDate || c.registrationDate}
                          </td>

                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${pBadge.cls}`}>
                              {pBadge.label}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                isAttComplete
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              <FileCheck size={11} />
                              <span>
                                {attCount}/4 مستندات ({Math.round((Math.min(attCount, 4) / 4) * 100)}%)
                              </span>
                            </span>
                          </td>

                          <td className="py-3 px-3 font-mono font-bold text-teal-900">
                            {(c.financials?.netFinancialGap || 0).toLocaleString('ar-EG')} ج.م
                          </td>

                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {surveyComp.isComplete && isAttComplete ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => approveCaseReview(c.id)}
                                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-black text-[11px] shadow-xs ring-2 ring-emerald-500/20 flex items-center gap-1 transition-all cursor-pointer active:scale-98"
                                    title="اعتماد رسمي للصرف فوراً"
                                  >
                                    <CheckCircle2 size={13} className="text-emerald-200" />
                                    <span>اعتماد رسمي للصرف</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAuditCase(c);
                                      setAuditInitialAction('none');
                                    }}
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[11px] transition-colors cursor-pointer"
                                    title="فحص التفاصيل"
                                  >
                                    <Eye size={12} />
                                    <span>فحص</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAuditCase(c);
                                      setAuditInitialAction('return');
                                    }}
                                    className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl font-black text-[11px] shadow-xs ring-2 ring-amber-400/40 flex items-center gap-1 transition-all cursor-pointer active:scale-98"
                                    title="إرجاع للباحث للاستكمال"
                                  >
                                    <RotateCcw size={13} className="text-amber-100" />
                                    <span>إرجاع للباحث للاستكمال</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAuditCase(c);
                                      setAuditInitialAction('none');
                                    }}
                                    className="px-2.5 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl font-bold text-[11px] transition-colors cursor-pointer"
                                    title="فحص تقرير البحث"
                                  >
                                    <Eye size={12} />
                                    <span>فحص</span>
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

      {/* Success Toast Notification */}
      {toastMessage && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-90 flex items-center gap-3 bg-slate-900/95 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-amber-500/40 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-200"
          dir="rtl"
        >
          <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={16} className="text-amber-400" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-amber-50">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white mr-1 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="إغلاق التنبيه"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Case Audit Drawer Modal */}
      {auditCase && (
        <CaseReviewApprovalModal
          key={`${auditCase.id}-${auditInitialAction}`}
          caseItem={auditCase}
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
