'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import {
  Search,
  Filter,
  Plus,
  Eye,
  AlertTriangle,
  UserCheck,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText,
  Heart,
  ChevronDown,
  MapPin,
  RotateCcw,
} from 'lucide-react';
import { CaseStatus, PriorityLevel, BeneficiaryCase } from '@/types';
import { getPriorityLabel, getStatusLabel } from '@/services/scoring-engine';
import { CaseReviewApprovalModal } from '@/components/cases/case-review-approval-modal';

interface CasesViewProps {
  onOpenNewCase: () => void;
}

export function CasesView({ onOpenNewCase }: { onOpenNewCase: () => void }) {
  const { cases, setSelectedCaseId, setEditingCase, permissions, changeCaseStatus, scoringConfig, openFieldSurvey, setActiveSection } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [researcherFilter, setResearcherFilter] = useState<string>('all');
  const [reviewApprovalModalCase, setReviewApprovalModalCase] = useState<BeneficiaryCase | null>(null);

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
      // Search
      const matchesSearch =
        searchQuery.trim() === '' ||
        (c.primaryName && c.primaryName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.secondaryName && c.secondaryName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.nationalId.includes(searchQuery) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.district.toLowerCase().includes(searchQuery.toLowerCase());

      // Status
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

      // Priority
      const matchesPriority = priorityFilter === 'all' || c.priority === priorityFilter;

      // Overdue
      const matchesOverdue = !overdueOnly || c.isVisitOverdue;

      // Researcher
      const matchesResearcher = researcherFilter === 'all' || c.assignedResearcher === researcherFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesOverdue && matchesResearcher;
    });
  }, [cases, searchQuery, statusFilter, priorityFilter, overdueOnly, researcherFilter]);

  const getPriorityBadgeStyle = (priority: PriorityLevel) => {
    switch (priority) {
      case 'critical':
        return 'text-rose-700 bg-rose-500/10 border border-rose-500/20';
      case 'high':
        return 'text-amber-800 bg-amber-500/10 border border-amber-500/20';
      case 'medium':
        return 'text-yellow-800 bg-yellow-500/10 border border-yellow-500/20';
      case 'low':
        return 'text-slate-700 bg-slate-500/10 border border-slate-500/20';
    }
  };

  const getStatusBadgeStyle = (status: CaseStatus) => {
    switch (status) {
      case 'pending_field_research':
        return 'text-amber-900 bg-amber-500/10 border border-amber-500/25 font-bold';
      case 'pending_review':
        return 'text-purple-800 bg-purple-500/10 border border-purple-500/25 font-bold';
      case 'needs_revision':
        return 'text-rose-800 bg-rose-500/15 border border-rose-500/30 font-bold';
      case 'active_eligible':
        return 'text-emerald-700 bg-emerald-500/10 border border-emerald-500/20';
      case 'pending_exception':
        return 'text-indigo-700 bg-indigo-500/10 border border-indigo-500/20';
      case 'under_review':
        return 'text-sky-700 bg-sky-500/10 border border-sky-500/20';
      case 'excluded_current_month':
        return 'text-amber-700 bg-amber-500/10 border border-amber-500/20';
      case 'temporarily_suspended':
        return 'text-orange-700 bg-orange-500/10 border border-orange-500/20';
      case 'closed':
        return 'text-slate-600 bg-slate-500/10 border border-slate-500/20';
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">سجل المستحقين والأسر</h2>
          <p className="text-xs text-slate-500">
            بيانات الأسر والحالات المسجلة وملفاتهم الميدانية · إجمالي {cases.length} حالة مسجلة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openFieldSurvey()}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
          >
            <MapPin size={15} />
            <span>بحث حالة</span>
          </button>
          <button
            onClick={onOpenNewCase}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#005756] hover:bg-[#004241] text-white text-xs font-bold rounded-xl shadow-xs transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
          >
            <Plus size={16} />
            <span>استقبال حالة جديدة</span>
          </button>
        </div>
      </div>

      {/* Pending Review Alert Banner */}
      {pendingReviewCount > 0 && (
        <div className="p-3.5 bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-2xl border border-teal-700/60 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-800/80 border border-teal-500/40 flex items-center justify-center shrink-0">
              <ShieldCheck className="text-teal-300" size={20} />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm block">
                أبحاث بانتظار الاعتماد ({pendingReviewCount === 1 ? 'حالة واحدة' : pendingReviewCount === 2 ? 'حالتان' : pendingReviewCount <= 10 ? `${pendingReviewCount} حالات` : `${pendingReviewCount} حالة`})
              </span>
              <p className="text-[11px] text-teal-200 mt-0.5">
                تم إنهاء بحث جديد ومستني مراجعتك لاعتماده.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveSection('cases-review')}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 self-end sm:self-center shadow-xs"
          >
            مراجعة الآن
          </button>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/60 ring-1 ring-black/[0.02] shadow-sm shadow-slate-950/5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search box */}
          <div className="relative md:col-span-2">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="البحث بالاسم، الرقم القومي، كود الحالة، أو الحي..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pr-9 pl-4 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-600 focus:ring-1 focus:ring-teal-600 bg-slate-50/50"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-600 bg-slate-50/50 pr-3 pl-8 appearance-none text-slate-800"
            >
              <option value="all">كل الحالات التشغيلية</option>
              <option value="pending_review">بانتظار المراجعة</option>
              <option value="needs_revision">تحتاج تعديل</option>
              <option value="pending_field_research">قائمة الانتظار · تحتاج بحث ميداني</option>
              <option value="active_eligible">معتمدة للصرف</option>
              <option value="pending_exception">بانتظار اعتماد استثناء</option>
              <option value="under_review">تحت البحث والمراجعة</option>
              <option value="excluded_current_month">مستبعدة من تخصيص الشهر</option>
              <option value="temporarily_suspended">موقوفة مؤقتاً</option>
              <option value="closed">مغلقة / زال الاستحقاق</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Priority filter */}
          <div className="relative">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-600 bg-slate-50/50 pr-3 pl-8 appearance-none text-slate-800"
            >
              <option value="all">كل مستويات الأولوية</option>
              <option value="critical">حرجة وعاجلة جداً</option>
              <option value="high">أولوية مرتفعة</option>
              <option value="medium">أولوية متوسطة</option>
              <option value="low">أولوية اعتيادية</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Secondary filters row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Researcher Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium text-xs">الباحث المسؤول:</span>
              <div className="relative">
                <select
                  value={researcherFilter}
                  onChange={(e) => setResearcherFilter(e.target.value)}
                  className="h-8 py-1 pr-2.5 pl-7 border border-slate-200 rounded-lg text-xs font-medium bg-white appearance-none text-slate-800"
                >
                  <option value="all">الجميع</option>
                  {researchers.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Overdue Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 select-none">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => setOverdueOnly(e.target.checked)}
                className="rounded-sm border-slate-300 text-teal-700 focus:ring-teal-600"
              />
              <span className="font-medium text-rose-600">
                زيارات تجاوزت {scoringConfig.overdueVisitMonths} أشهر فقط
              </span>
            </label>
          </div>

          {(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || overdueOnly || researcherFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setPriorityFilter('all');
                setOverdueOnly(false);
                setResearcherFilter('all');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              إعادة ضبط الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Cases View: Responsive Cards on Mobile + Table on Desktop */}
      <div className="bg-white rounded-2xl border border-slate-200/60 ring-1 ring-black/[0.02] shadow-sm shadow-slate-950/5 overflow-hidden">
        {/* Mobile View: Responsive Card List (360px - 430px) */}
        <div className="block md:hidden divide-y divide-slate-100/80">
          {filteredCases.length === 0 ? (
            <div className="py-12 text-center text-slate-500 px-4">
              <p className="font-semibold text-sm">لا توجد حالات تطابق محددات البحث</p>
              <p className="text-xs mt-1 text-slate-400">جرّب تغيير كلمات البحث أو إعادة ضبط الفلاتر</p>
            </div>
          ) : (
            filteredCases.map((c) => (
              <div
                key={c.id}
                className="p-3.5 space-y-2.5 hover:bg-slate-50/80 active:bg-slate-100/80 transition-colors"
                onClick={() => setSelectedCaseId(c.id)}
              >
                {/* Header Row: Name & Priority */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{c.primaryName || c.fullName}</span>
                      {c.secondaryName && (
                        <span className="text-xs text-slate-500 font-normal">({c.secondaryName})</span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-2">
                      <span className="font-semibold text-teal-800">{c.code}</span>
                      <span>·</span>
                      <span className="text-slate-600">{c.district}</span>
                    </div>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${getPriorityBadgeStyle(c.priority)}`}>
                    {getPriorityLabel(c.priority)}
                  </span>
                </div>

                {/* Status & Financial Gap row */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100/80">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusBadgeStyle(c.status)}`}>
                    {getStatusLabel(c.status)}
                  </span>
                  <div className="text-left font-mono">
                    <span className="text-[11px] text-slate-400 ml-1">فجوة:</span>
                    <span className="font-bold text-slate-900 text-xs">{c.financials.netFinancialGap.toLocaleString('ar-EG')} ج.م</span>
                  </div>
                </div>

                {/* Researcher & Visit Warning */}
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate">الباحث: {c.assignedResearcher}</span>
                  {c.isVisitOverdue && (
                    <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-bold text-[9px] shrink-0">
                      تجاوزت مهلة الزيارة
                    </span>
                  )}
                </div>

                {/* Action Buttons with 44px min touch target */}
                <div className="flex items-center gap-2 pt-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setSelectedCaseId(c.id)}
                    className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Eye size={15} />
                    <span>التفاصيل</span>
                  </button>
                  {c.status === 'pending_review' ? (
                    <button
                      type="button"
                      onClick={() => setReviewApprovalModalCase(c)}
                      className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-teal-800 hover:bg-teal-900 active:scale-[0.98] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <ShieldCheck size={15} />
                      <span>فحص واعتماد</span>
                    </button>
                  ) : c.status === 'needs_revision' ? (
                    <button
                      type="button"
                      onClick={() => setReviewApprovalModalCase(c)}
                      className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <RotateCcw size={15} />
                      <span>متابعة التعديل</span>
                    </button>
                  ) : permissions.canManageCases ? (
                    <button
                      type="button"
                      onClick={() => openFieldSurvey(c.id)}
                      className={`flex-1 min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-2xs ${
                        c.status === 'pending_field_research'
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-[#005756] hover:bg-[#004241] text-white'
                      }`}
                    >
                      <MapPin size={14} />
                      <span>{c.status === 'pending_field_research' ? 'بدء بحث حالة' : 'بحث حالة'}</span>
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Full Data Table (md and up) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 text-xs font-bold">
                <th className="py-3.5 px-4 tracking-tight">كود الحالة والاسم</th>
                <th className="py-3.5 px-3 tracking-tight">الرقم القومي والاتصال</th>
                <th className="py-3.5 px-3 tracking-tight">العنوان والمنطقة</th>
                <th className="py-3.5 px-3 tracking-tight">الفجوة المالية</th>
                <th className="py-3.5 px-3 tracking-tight">الحالة التشغيلية</th>
                <th className="py-3.5 px-3 tracking-tight">الأولوية</th>
                <th className="py-3.5 px-3 tracking-tight">الباحث وآخر زيارة</th>
                <th className="py-3.5 px-4 text-center tracking-tight">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80 text-xs">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <p className="font-semibold text-sm">لا توجد حالات تطابق محددات البحث</p>
                    <p className="text-xs mt-1">جرّب تغيير كلمات البحث أو إعادة ضبط الفلاتر</p>
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-teal-50/30 transition-colors cursor-pointer group"
                    onClick={() => setSelectedCaseId(c.id)}
                  >
                    {/* Code & Name */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 group-hover:text-teal-900 transition-colors flex items-center gap-1.5 flex-wrap">
                        <span>{c.primaryName || c.fullName}</span>
                        {c.secondaryName && (
                          <span className="text-slate-500 font-normal text-xs font-sans">
                            ({c.secondaryName})
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-2">
                        <span className="font-semibold text-teal-800">{c.code}</span>
                        {c.vulnerability.isOrphanHousehold && (
                          <span className="text-amber-700">· أيتام ({c.vulnerability.orphanCount})</span>
                        )}
                        {c.vulnerability.hasChronicIllness && (
                          <span className="text-rose-600">· مرض مزمن</span>
                        )}
                      </div>
                    </td>

                    {/* National ID & Phone */}
                    <td className="py-3 px-3 font-mono tabular-nums">
                      <div className="text-slate-800 font-medium">
                        {permissions.canViewBeneficiaryPII
                          ? c.nationalId
                          : `${c.nationalId.substring(0, 5)}*********`}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {permissions.canViewBeneficiaryPII ? c.phone : '010********'}
                      </div>
                    </td>

                    {/* District */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">{c.district}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[140px]">{c.governorate}</div>
                    </td>

                    {/* Financial Gap */}
                    <td className="py-3 px-3 font-mono tabular-nums">
                      <div className="font-bold text-slate-900">
                        {c.financials.netFinancialGap.toLocaleString('ar-EG')} ج.م
                      </div>
                      <div className="text-[11px] text-slate-400">فجوة شهرية</div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getStatusBadgeStyle(c.status)}`}>
                        {getStatusLabel(c.status)}
                      </span>
                    </td>

                    {/* Priority Badge */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${getPriorityBadgeStyle(c.priority)}`}>
                        {getPriorityLabel(c.priority)}
                      </span>
                    </td>

                    {/* Researcher & Visit Date */}
                    <td className="py-3 px-3">
                      <div className="text-slate-800 font-medium">{c.assignedResearcher}</div>
                      <div className="text-[11px] font-mono mt-0.5 flex items-center gap-1">
                        {c.status === 'pending_field_research' ? (
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-900 border border-amber-500/20 rounded-full font-semibold text-[10px]">
                            لم تُبحث بعد
                          </span>
                        ) : (
                          <>
                            <span className={c.isVisitOverdue ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                              {c.lastVisitDate || 'لم تُحدد'}
                            </span>
                            {c.isVisitOverdue && (
                              <span className="px-1.5 py-0.2 bg-rose-500/10 text-rose-700 border border-rose-500/20 rounded-full text-[9px] font-bold">متأخر</span>
                            )}
                          </>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedCaseId(c.id)}
                          className="p-1.5 rounded-xl text-teal-800 hover:bg-teal-100/80 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] inline-flex items-center gap-1 font-semibold text-xs cursor-pointer"
                          title="عرض تفاصيل الحالة"
                        >
                          <Eye size={15} />
                          <span>التفاصيل</span>
                        </button>
                        {c.status === 'pending_review' ? (
                          <button
                            onClick={() => setReviewApprovalModalCase(c)}
                            className="p-1.5 px-2.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white transition-all inline-flex items-center gap-1.5 font-bold text-xs shadow-xs active:scale-98 cursor-pointer"
                            title="مراجعة واعتماد التقرير الميداني"
                          >
                            <ShieldCheck size={14} className="text-teal-200" />
                            <span>فحص واعتماد</span>
                          </button>
                        ) : c.status === 'needs_revision' ? (
                          <button
                            onClick={() => setReviewApprovalModalCase(c)}
                            className="p-1.5 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-all inline-flex items-center gap-1.5 font-bold text-xs shadow-xs active:scale-98 cursor-pointer"
                            title="متابعة تعديل الملاحظات"
                          >
                            <RotateCcw size={14} className="text-white" />
                            <span>متابعة التعديل</span>
                          </button>
                        ) : permissions.canManageCases ? (
                          <>
                            {c.status === 'pending_field_research' ? (
                              <button
                                onClick={() => openFieldSurvey(c.id)}
                                className="p-1.5 px-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white transition-all inline-flex items-center gap-1.5 font-bold text-xs shadow-xs active:scale-98 cursor-pointer"
                                title="بدء الزيارة الميدانية للحالة من قائمة الانتظار"
                              >
                                <MapPin size={14} className="text-white" />
                                <span>بدء بحث حالة</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => openFieldSurvey(c.id)}
                                className="p-1.5 px-2 rounded-lg text-emerald-800 hover:bg-emerald-50 transition-colors inline-flex items-center gap-1.5 font-bold text-xs cursor-pointer"
                                title="إجراء بحث حالة للمستحق"
                              >
                                <MapPin size={14} className="text-emerald-700" />
                                <span>بحث حالة</span>
                              </button>
                            )}
                            <button
                              onClick={() => setEditingCase(c)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-teal-900 hover:bg-teal-50 transition-colors inline-flex items-center gap-1 font-semibold text-xs cursor-pointer"
                              title="تعديل بيانات الحالة"
                            >
                              <FileText size={14} />
                              <span>تعديل</span>
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case Review and Approval Modal */}
      <CaseReviewApprovalModal
        caseItem={reviewApprovalModalCase}
        isOpen={reviewApprovalModalCase !== null}
        onClose={() => setReviewApprovalModalCase(null)}
      />
    </div>
  );
}
