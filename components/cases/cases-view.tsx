'use client';

import React, { useState, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useApp } from '@/context/app-context';
import {
  Search,
  Plus,
  Eye,
  ShieldCheck,
  FileText,
  MapPin,
  RotateCcw,
  ArrowLeft,
} from 'lucide-react';
import { CaseStatus, PriorityLevel, BeneficiaryCase } from '@/types';
import { CaseReviewApprovalModal } from '@/components/cases/case-review-approval-modal';
import { CustomSelect } from '@/components/ui/custom-select';

const getPriorityDisplay = (priority: PriorityLevel): { label: string; className: string } => {
  switch (priority) {
    case 'critical':
      return { label: 'حالة حرجة', className: 'text-rose-600 font-semibold' };
    case 'high':
      return { label: 'أولوية عالية', className: 'text-slate-700 font-medium' };
    case 'medium':
      return { label: 'أولوية متوسطة', className: 'text-slate-600 font-medium' };
    case 'low':
      return { label: 'أولوية عادية', className: 'text-slate-500 font-normal' };
  }
};

const getStatusDisplay = (status: CaseStatus): { label: string; className: string } => {
  switch (status) {
    case 'pending_field_research':
      return { label: 'بانتظار النزول', className: 'text-slate-600 font-medium' };
    case 'pending_review':
      return { label: 'بانتظار المراجعة', className: 'text-slate-800 font-semibold' };
    case 'needs_revision':
      return { label: 'راجعة للاستكمال', className: 'text-slate-700 font-semibold' };
    case 'active_eligible':
      return { label: 'معتمدة للصرف', className: 'text-slate-700 font-medium' };
    case 'pending_exception':
      return { label: 'بانتظار استثناء', className: 'text-slate-600 font-medium' };
    case 'under_review':
      return { label: 'قيد المراجعة', className: 'text-slate-600 font-medium' };
    case 'excluded_current_month':
      return { label: 'مستبعدة هذا الشهر', className: 'text-slate-500 font-medium' };
    case 'temporarily_suspended':
      return { label: 'موقوفة مؤقتاً', className: 'text-slate-500 font-medium' };
    case 'closed':
      return { label: 'ملف مغلق', className: 'text-slate-400 font-normal' };
  }
};

export function CasesView({ onOpenNewCase }: { onOpenNewCase: () => void }) {
  const {
    cases,
    setSelectedCaseId,
    setEditingCase,
    permissions,
    scoringConfig,
    openFieldSurvey,
    setActiveSection,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [researcherFilter, setResearcherFilter] = useState<string>('all');
  const [reviewApprovalModalCase, setReviewApprovalModalCase] = useState<BeneficiaryCase | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const sectionTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: 'easeOut' as const };

  const pendingReviewCount = useMemo(() => {
    return cases.filter((c) => c.status === 'pending_review' || c.status === 'needs_revision').length;
  }, [cases]);

  // Distinct researchers list
  const researchers = useMemo(() => {
    return Array.from(new Set(cases.map((c) => c.assignedResearcher))).filter(Boolean);
  }, [cases]);

  // Filtered cases
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        (c.primaryName && c.primaryName.toLowerCase().includes(q)) ||
        (c.secondaryName && c.secondaryName.toLowerCase().includes(q)) ||
        c.fullName.toLowerCase().includes(q) ||
        c.nationalId.includes(searchQuery.trim()) ||
        c.code.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || c.priority === priorityFilter;
      const matchesOverdue = !overdueOnly || c.isVisitOverdue;
      const matchesResearcher = researcherFilter === 'all' || c.assignedResearcher === researcherFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesOverdue && matchesResearcher;
    });
  }, [cases, searchQuery, statusFilter, priorityFilter, overdueOnly, researcherFilter]);

  const hasActiveFilters =
    Boolean(searchQuery) ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    overdueOnly ||
    researcherFilter !== 'all';

  return (
    <>
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={sectionTransition}
        className="space-y-5"
      >
        {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">سجل المستحقين والأسر</h2>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            بيانات الأسر المسجلة وملفاتها الميدانية · إجمالي {cases.length} أسرة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openFieldSurvey()}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200/80 hover:bg-slate-50 hover:text-[#005756] text-slate-700 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <MapPin size={15} className="text-slate-400" />
            <span>بحث ميداني</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewCase}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#005756] hover:bg-[#004241] text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus size={15} />
            <span>تسجيل أسرة جديدة</span>
          </button>
        </div>
      </div>

      {/* Pending Review Alert Banner */}
      {pendingReviewCount > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-none p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ShieldCheck size={18} className="text-slate-400 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-1.5">
                <span className="text-sm font-semibold text-slate-800">
                  أبحاث بانتظار الاعتماد
                </span>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <span className="text-xs font-medium text-slate-500 tabular-nums">
                  {pendingReviewCount === 1
                    ? 'حالة واحدة'
                    : pendingReviewCount === 2
                    ? 'حالتان'
                    : pendingReviewCount <= 10
                    ? `${pendingReviewCount} حالات`
                    : `${pendingReviewCount} حالة`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                تم إنهاء بحث جديد ومستني مراجعتك لاعتماده.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveSection('cases-review')}
            className="inline-flex items-center gap-1.5 bg-[#005756] hover:bg-[#004241] text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 self-end sm:self-center cursor-pointer"
          >
            <span>مراجعة الآن</span>
            <ArrowLeft size={14} />
          </button>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-none space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search box */}
          <div className="relative md:col-span-2">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="دوّر بالاسم، الرقم القومي، الكود، أو المنطقة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pr-9 pl-4 py-2 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 border border-slate-200/80 rounded-xl bg-slate-50/60 focus:bg-white focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15 transition-colors"
            />
          </div>

          {/* Status filter */}
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'كل الحالات' },
              { value: 'pending_review', label: 'بانتظار المراجعة' },
              { value: 'needs_revision', label: 'راجعة للاستكمال' },
              { value: 'pending_field_research', label: 'بانتظار النزول الميداني' },
              { value: 'active_eligible', label: 'معتمدة للصرف' },
              { value: 'pending_exception', label: 'بانتظار استثناء' },
              { value: 'under_review', label: 'قيد المراجعة' },
              { value: 'excluded_current_month', label: 'مستبعدة هذا الشهر' },
              { value: 'temporarily_suspended', label: 'موقوفة مؤقتاً' },
              { value: 'closed', label: 'ملف مغلق' },
            ]}
            ariaLabel="تصفية حسب الحالة"
            triggerClassName="h-10 bg-slate-50/60 border-slate-200/80 font-medium"
          />

          {/* Priority filter */}
          <CustomSelect
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={[
              { value: 'all', label: 'كل الأولويات' },
              { value: 'critical', label: 'حالة حرجة' },
              { value: 'high', label: 'أولوية عالية' },
              { value: 'medium', label: 'أولوية متوسطة' },
              { value: 'low', label: 'أولوية عادية' },
            ]}
            ariaLabel="تصفية حسب الأولوية"
            triggerClassName="h-10 bg-slate-50/60 border-slate-200/80 font-medium"
          />
        </div>

        {/* Secondary filters row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            {/* Researcher Filter */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">الباحث المسؤول:</span>
              <CustomSelect
                size="sm"
                value={researcherFilter}
                onChange={setResearcherFilter}
                options={[
                  { value: 'all', label: 'كل الباحثين' },
                  ...researchers.map((r) => ({ value: r, label: r })),
                ]}
                ariaLabel="تصفية حسب الباحث"
                className="w-auto min-w-[140px]"
                triggerClassName="h-8 py-1 px-2.5 bg-slate-50/60 border-slate-200/80 rounded-lg text-xs font-medium"
                menuMinWidth={170}
              />
            </div>

            {/* Overdue Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
                className="w-3.5 h-3.5 rounded-sm border-slate-300 accent-[#005756] focus:ring-[#005756]/20 cursor-pointer"
              />
              <span className={overdueOnly ? 'font-semibold text-rose-600' : 'font-medium text-slate-600'}>
                الزيارات المتأخرة عن {scoringConfig.overdueVisitMonths} أشهر فقط
              </span>
            </label>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setPriorityFilter('all');
                setOverdueOnly(false);
                setResearcherFilter('all');
              }}
              className="text-xs font-medium text-slate-500 hover:text-[#005756] transition-colors cursor-pointer"
            >
              إعادة ضبط الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Cases View: Responsive Cards on Mobile + Table on Desktop */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-none overflow-hidden">
        {/* Mobile View: Responsive Card List (360px - 430px) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredCases.length === 0 ? (
            <div className="py-12 text-center text-slate-500 px-4">
              <p className="font-semibold text-sm text-slate-700">مفيش حالات مطابقة للبحث ده</p>
              <p className="text-xs mt-1 text-slate-400">جرّب تغيّر كلمات البحث أو تصفّر الفلاتر</p>
            </div>
          ) : (
            filteredCases.map((c) => {
              const priorityDisplay = getPriorityDisplay(c.priority);
              const statusDisplay = getStatusDisplay(c.status);

              return (
                <div
                  key={c.id}
                  className="p-4 space-y-2.5 hover:bg-slate-50/70 transition-colors cursor-pointer"
                  onClick={() => setSelectedCaseId(c.id)}
                >
                  {/* Header Row: Name & Priority */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-900 text-sm">
                          {c.primaryName || c.fullName}
                        </span>
                        {c.secondaryName && (
                          <span className="text-xs text-slate-500 font-normal">({c.secondaryName})</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center flex-wrap gap-1.5">
                        <span className="font-mono tabular-nums text-slate-500">{c.code}</span>
                        <span aria-hidden="true">·</span>
                        <span>{c.district}</span>
                        {c.vulnerability.isOrphanHousehold && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>أيتام ({c.vulnerability.orphanCount})</span>
                          </>
                        )}
                        {c.vulnerability.hasChronicIllness && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>مرض مزمن</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`text-[11px] shrink-0 ${priorityDisplay.className}`}>
                      {priorityDisplay.label}
                    </span>
                  </div>

                  {/* Status & Financial Gap row */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <span className={statusDisplay.className}>{statusDisplay.label}</span>
                    <div className="text-left font-mono tabular-nums">
                      <span className="text-[11px] text-slate-400 font-sans ml-1">عجز:</span>
                      <span className="font-semibold text-slate-800">
                        {c.financials.netFinancialGap.toLocaleString('ar-EG')}
                      </span>
                      <span className="text-[11px] text-slate-500 font-sans mr-0.5"> ج.م</span>
                    </div>
                  </div>

                  {/* Researcher & Visit Warning */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate">الباحث: {c.assignedResearcher}</span>
                    {c.status === 'pending_field_research' ? (
                      <span className="text-[#005756] font-medium shrink-0">
                        حالة جديدة تتطلب زيارة
                      </span>
                    ) : c.isVisitOverdue ? (
                      <span className="text-rose-600 font-medium shrink-0">
                        متأخرة عن موعدها
                      </span>
                    ) : null}
                  </div>

                  {/* Action Buttons with 44px min touch target */}
                  <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setSelectedCaseId(c.id)}
                      className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Eye size={15} className="text-slate-500" />
                      <span>التفاصيل</span>
                    </button>
                    {c.status === 'pending_review' ? (
                      <button
                        type="button"
                        onClick={() => setReviewApprovalModalCase(c)}
                        className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 hover:text-[#005756] text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <ShieldCheck size={15} className="text-slate-400" />
                        <span>فحص واعتماد</span>
                      </button>
                    ) : c.status === 'needs_revision' ? (
                      <button
                        type="button"
                        onClick={() => setReviewApprovalModalCase(c)}
                        className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 hover:text-[#005756] text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <RotateCcw size={15} className="text-slate-400" />
                        <span>متابعة التعديل</span>
                      </button>
                    ) : permissions.canManageCases ? (
                      <button
                        type="button"
                        onClick={() => openFieldSurvey(c.id)}
                        className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 hover:text-[#005756] text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <MapPin size={14} className="text-slate-400" />
                        <span>{c.status === 'pending_field_research' ? 'بدء بحث' : 'بحث ميداني'}</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Full Data Table (md and up) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 text-xs font-semibold">
                <th className="py-3.5 px-4 tracking-tight">الأسرة والكود</th>
                <th className="py-3.5 px-3 tracking-tight">الرقم القومي والموبايل</th>
                <th className="py-3.5 px-3 tracking-tight">المنطقة والمحافظة</th>
                <th className="py-3.5 px-3 tracking-tight">العجز الشهري</th>
                <th className="py-3.5 px-3 tracking-tight">الحالة</th>
                <th className="py-3.5 px-3 tracking-tight">الأولوية</th>
                <th className="py-3.5 px-3 tracking-tight">الباحث وآخر نزول</th>
                <th className="py-3.5 px-4 text-center tracking-tight">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <p className="font-semibold text-sm text-slate-700">مفيش حالات مطابقة للبحث ده</p>
                    <p className="text-xs mt-1 text-slate-400">جرّب تغيّر كلمات البحث أو تصفّر الفلاتر</p>
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => {
                  const priorityDisplay = getPriorityDisplay(c.priority);
                  const statusDisplay = getStatusDisplay(c.status);

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      onClick={() => setSelectedCaseId(c.id)}
                    >
                      {/* Code & Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 group-hover:text-[#005756] transition-colors flex items-center gap-1.5 flex-wrap">
                          <span>{c.primaryName || c.fullName}</span>
                          {c.secondaryName && (
                            <span className="text-slate-500 font-normal text-xs">
                              ({c.secondaryName})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center flex-wrap gap-1.5">
                          <span className="font-mono tabular-nums">{c.code}</span>
                          {c.vulnerability.isOrphanHousehold && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>أيتام ({c.vulnerability.orphanCount})</span>
                            </>
                          )}
                          {c.vulnerability.hasChronicIllness && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>مرض مزمن</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* National ID & Phone */}
                      <td className="py-3.5 px-3 font-mono tabular-nums">
                        <div className="text-slate-700 font-medium">
                          {permissions.canViewBeneficiaryPII
                            ? c.nationalId
                            : `${c.nationalId.substring(0, 5)}*********`}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {permissions.canViewBeneficiaryPII ? c.phone : '010********'}
                        </div>
                      </td>

                      {/* District */}
                      <td className="py-3.5 px-3">
                        <div className="font-medium text-slate-700">{c.district}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
                          {c.governorate}
                        </div>
                      </td>

                      {/* Financial Gap */}
                      <td className="py-3.5 px-3 font-mono tabular-nums">
                        <div className="font-semibold text-slate-800">
                          {c.financials.netFinancialGap.toLocaleString('ar-EG')} ج.م
                        </div>
                        <div className="text-[11px] text-slate-400 font-sans">عجز شهري</div>
                      </td>

                      {/* Operational Status (Unboxed Quiet Typography) */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={statusDisplay.className}>{statusDisplay.label}</span>
                      </td>

                      {/* Priority (Unboxed Quiet Typography, Semantic Rose for Critical Only) */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={priorityDisplay.className}>{priorityDisplay.label}</span>
                      </td>

                      {/* Researcher & Visit Date */}
                      <td className="py-3.5 px-3">
                        <div className="text-slate-700 font-medium">{c.assignedResearcher}</div>
                        <div className="text-[11px] mt-0.5">
                          {c.status === 'pending_field_research' ? (
                            <span className="text-slate-400">لم يتم النزول</span>
                          ) : c.isVisitOverdue ? (
                            <span className="text-rose-600 font-medium font-mono tabular-nums">
                              {c.lastVisitDate || 'غير مسجل'} · متأخر
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono tabular-nums">
                              {c.lastVisitDate || 'غير مسجل'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Calm Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedCaseId(c.id)}
                            className="px-2 py-1.5 rounded-lg text-slate-600 hover:text-[#005756] hover:bg-slate-100/80 transition-colors inline-flex items-center gap-1 font-medium text-xs whitespace-nowrap cursor-pointer"
                            title="عرض تفاصيل الأسرة"
                          >
                            <Eye size={14} className="text-slate-400" />
                            <span>التفاصيل</span>
                          </button>

                          {c.status === 'pending_review' ? (
                            <button
                              type="button"
                              onClick={() => setReviewApprovalModalCase(c)}
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/80 hover:border-[#005756]/40 hover:text-[#005756] hover:bg-slate-50 text-slate-700 transition-colors inline-flex items-center gap-1.5 font-medium text-xs whitespace-nowrap cursor-pointer"
                              title="مراجعة واعتماد التقرير الميداني"
                            >
                              <ShieldCheck size={14} className="text-slate-400" />
                              <span>فحص واعتماد</span>
                            </button>
                          ) : c.status === 'needs_revision' ? (
                            <button
                              type="button"
                              onClick={() => setReviewApprovalModalCase(c)}
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/80 hover:border-[#005756]/40 hover:text-[#005756] hover:bg-slate-50 text-slate-700 transition-colors inline-flex items-center gap-1.5 font-medium text-xs whitespace-nowrap cursor-pointer"
                              title="متابعة استكمال الملاحظات"
                            >
                              <RotateCcw size={14} className="text-slate-400" />
                              <span>متابعة التعديل</span>
                            </button>
                          ) : permissions.canManageCases ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openFieldSurvey(c.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/80 hover:border-[#005756]/40 hover:text-[#005756] hover:bg-slate-50 text-slate-700 transition-colors inline-flex items-center gap-1.5 font-medium text-xs whitespace-nowrap cursor-pointer"
                                title={
                                  c.status === 'pending_field_research'
                                    ? 'بدء النزول الميداني للأسرة'
                                    : 'تسجيل بحث ميداني جديد'
                                }
                              >
                                <MapPin size={14} className="text-slate-400" />
                                <span>{c.status === 'pending_field_research' ? 'بدء بحث' : 'بحث ميداني'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCase(c)}
                                className="px-2 py-1.5 rounded-lg text-slate-500 hover:text-[#005756] hover:bg-slate-100/80 transition-colors inline-flex items-center gap-1 font-medium text-xs whitespace-nowrap cursor-pointer"
                                title="تعديل بيانات الأسرة"
                              >
                                <FileText size={14} className="text-slate-400" />
                                <span>تعديل</span>
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </motion.div>

      {/* Case Review and Approval Modal */}
      <CaseReviewApprovalModal
        caseItem={reviewApprovalModalCase}
        isOpen={reviewApprovalModalCase !== null}
        onClose={() => setReviewApprovalModalCase(null)}
      />
    </>
  );
}
