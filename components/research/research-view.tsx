'use client';

import React, { useState } from 'react';
import { motion, MotionConfig } from 'motion/react';
import { useApp } from '@/context/app-context';
import { useToast } from '@/context/toast-context';
import { FieldVisit } from '@/types';
import {
  Clock,
  Plus,
  CheckCircle2,
  FileText,
  Search,
  Eye,
  Camera,
  MapPin,
  Volume2,
  RotateCcw,
  UserPlus,
  X,
} from 'lucide-react';
import { RoleInspirationalCard } from '@/components/common/role-inspirational-card';
import { CustomSelect } from '@/components/ui/custom-select';

function getVisitStatusLabel(status: FieldVisit['status']): string {
  switch (status) {
    case 'completed':
      return 'تمت الزيارة';
    case 'scheduled':
      return 'بانتظار النزول';
    case 'overdue':
      return 'متأخرة عن موعدها';
  }
}

export function ResearchView() {
  const {
    visits,
    cases,
    addVisit,
    setSelectedCaseId,
    openFieldSurvey,
  } = useApp();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'first_visit' | 'overdue' | 'revision' | 'all'>('first_visit');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewVisitModal, setShowNewVisitModal] = useState(false);

  // New visit form state
  const [selectedCaseForVisit, setSelectedCaseForVisit] = useState(cases[0]?.id || '');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [researcherName, setResearcherName] = useState('أ. هبة الشامي');
  const [observations, setObservations] = useState('');
  const [recommendedChanges, setRecommendedChanges] = useState('');

  // الحالات الجديدة التي لم يسبق لها إجراء زيارة ميدانية أولى
  const firstVisitCases = cases.filter(
    (c) =>
      c.status === 'pending_field_research' ||
      (!c.lastVisitDate &&
        c.status !== 'needs_revision' &&
        c.status !== 'pending_review' &&
        c.status !== 'closed')
  );

  // المتابعة الدورية فقط: الحالات التي لها زيارة سابقة وتجاوزت 6 شهور
  const overdueCases = cases.filter(
    (c) =>
      c.isVisitOverdue &&
      Boolean(c.lastVisitDate) &&
      c.status !== 'pending_field_research' &&
      c.status !== 'closed'
  );
  const needsRevisionCases = cases.filter((c) => c.status === 'needs_revision');

  const filteredVisits = visits.filter((v) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      v.caseName.toLowerCase().includes(q) ||
      v.caseCode.toLowerCase().includes(q) ||
      v.researcherName.toLowerCase().includes(q) ||
      v.observations.toLowerCase().includes(q)
    );
  });

  const handleCreateVisit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCase = cases.find((c) => c.id === selectedCaseForVisit);
    if (!targetCase) return;

    const nextDate = new Date(visitDate);
    nextDate.setMonth(nextDate.getMonth() + 6);

    addVisit({
      caseId: targetCase.id,
      caseCode: targetCase.code,
      caseName: targetCase.fullName,
      researcherName,
      visitDate,
      scheduledNextDate: nextDate.toISOString().split('T')[0],
      status: 'completed',
      observations: observations.trim() || 'تم النزول والمعاينة على الطبيعة والتأكد من وضع الأسرة.',
      recommendedChanges: recommendedChanges.trim() || 'استمرار المساعدة الشهرية زي ما هي.',
      attachmentsCount: 1,
    });

    toast.success('تم تسجيل الزيارة الميدانية وتحديث ملف الحالة بنجاح');
    setShowNewVisitModal(false);
    setObservations('');
    setRecommendedChanges('');
  };

  return (
    <div className="space-y-5">
      {/* Top Action & Summary Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 tabular-nums">
          <span className="font-semibold text-slate-800">ملخص المتابعة</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className={firstVisitCases.length > 0 ? 'font-medium text-[#005756]' : ''}>
            زيارات أولى: {firstVisitCases.length}
          </span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span>راجِع من الإدارة: {needsRevisionCases.length}</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className={overdueCases.length > 0 ? 'font-medium text-rose-700' : ''}>
            متابعة دورية متأخرة: {overdueCases.length}
          </span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span>سجل الزيارات: {visits.length}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openFieldSurvey()}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[40px] bg-[#005756] hover:bg-[#004241] text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <MapPin size={15} />
            <span>ابدأ بحث حالة</span>
          </button>
          <button
            type="button"
            onClick={() => setShowNewVisitModal(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[40px] bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200/80 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus size={15} className="text-slate-400" />
            <span>تسجيل زيارة سريعة</span>
          </button>
        </div>
      </div>

      {/* Inspirational Quranic Guidance Card for Field Researcher */}
      <RoleInspirationalCard role="researcher" />

      {/* Tabs / Filter Navigation */}
      <MotionConfig reducedMotion="user">
        <motion.div
          layoutScroll
          role="tablist"
          aria-label="تبويبات الزيارات الميدانية"
          className="relative flex items-center gap-1 border-b border-slate-200/80 text-xs font-semibold overflow-x-auto"
        >
          {[
            {
              id: 'first_visit' as const,
              label: `حالات جديدة (زيارة أولى) (${firstVisitCases.length})`,
              icon: UserPlus,
            },
            {
              id: 'overdue' as const,
              label: `متابعة دورية (متأخرة عن 6 شهور) (${overdueCases.length})`,
              icon: Clock,
            },
            {
              id: 'revision' as const,
              label: `راجِع من الإدارة (${needsRevisionCases.length})`,
              icon: RotateCcw,
            },
            {
              id: 'all' as const,
              label: `سجل الزيارات (${visits.length})`,
              icon: FileText,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`relative min-h-[44px] py-2.5 px-4 transition-colors duration-200 flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                  isActive
                    ? 'text-[#005756]'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon
                  size={15}
                  className={`transition-colors duration-200 ${
                    isActive ? 'text-[#005756]' : 'text-slate-400'
                  }`}
                />
                <span>{tab.label}</span>
                {isActive && (
                  <motion.span
                    layoutId="research-active-tab-indicator"
                    aria-hidden="true"
                    transition={{
                      type: 'spring',
                      stiffness: 420,
                      damping: 36,
                      mass: 0.7,
                    }}
                    className="pointer-events-none absolute bottom-0 inset-x-0 h-[2px] bg-[#005756] rounded-full"
                  />
                )}
              </button>
            );
          })}
        </motion.div>
      </MotionConfig>

      {/* First Visit Cases Tab (New Intake Requests Awaiting Initial Field Research) */}
      {activeTab === 'first_visit' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-2 font-semibold text-sm text-slate-800">
              <UserPlus size={16} className="text-[#005756] shrink-0" />
              <span>حالات جديدة بانتظار الزيارة الميدانية الأولى</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              الحالات المسجلة حديثاً في الاستقبال ومطلوب النزول لها لأول مرة لعمل البحث الميداني وتقييم الوضع قبل إرسالها للمراجعة والاعتماد.
            </p>
          </div>

          {firstVisitCases.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200/80 shadow-none text-slate-500">
              <CheckCircle2 size={28} className="mx-auto text-slate-400 mb-2" />
              <p className="font-semibold text-sm text-slate-800">مفيش حالات جديدة بانتظار الزيارة الأولى</p>
              <p className="text-xs text-slate-500 mt-1">تمت زيارة وبحث جميع الطلبات المسجلة حديثاً.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {firstVisitCases.map((c) => (
                <div
                  key={c.id}
                  className="p-5 bg-white rounded-xl border border-slate-200/70 shadow-none space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="min-w-0">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="font-bold text-sm text-slate-900">{c.fullName}</span>
                        <span className="text-slate-300" aria-hidden="true">·</span>
                        <span className="text-xs font-mono text-slate-500 tabular-nums">
                          {c.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{c.governorate} · {c.district}</p>
                    </div>

                    <div className="inline-flex items-center gap-1.5 shrink-0">
                      <UserPlus size={14} className="text-[#005756] shrink-0" />
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100/70 text-xs font-medium text-slate-700 whitespace-nowrap">
                        حالة جديدة تتطلب زيارة
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/80 p-3 rounded-lg border border-slate-200/70">
                    <div>
                      <span className="text-slate-500 block">تاريخ التسجيل:</span>
                      <strong className="text-slate-800 font-mono tabular-nums mt-0.5 block">
                        {c.registrationDate}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">الاحتياج التقديري:</span>
                      <strong className="text-slate-800 font-mono tabular-nums mt-0.5 block">
                        {(c.financials?.estimatedAssistanceNeed || 0).toLocaleString('ar-EG')} ج.م
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs pt-1">
                    <span className="text-slate-500">
                      الباحث المسؤول: <strong className="text-slate-800 font-semibold">{c.assignedResearcher || 'مش متحدد'}</strong>
                    </span>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedCaseId(c.id)}
                        className="px-3 py-1.5 min-h-[36px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors text-xs whitespace-nowrap cursor-pointer"
                      >
                        عرض الملف
                      </button>
                      <button
                        type="button"
                        onClick={() => openFieldSurvey(c.id)}
                        className="px-3.5 py-1.5 min-h-[36px] bg-[#005756] hover:bg-[#004241] text-white font-semibold rounded-lg transition-colors flex items-center gap-1.5 text-xs whitespace-nowrap cursor-pointer"
                      >
                        <MapPin size={13} />
                        <span>ابدأ بحث حالة</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Returned Cases for Revision Tab */}
      {activeTab === 'revision' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-2 font-semibold text-sm text-slate-800">
              <RotateCcw size={16} className="text-slate-400 shrink-0" />
              <span>حالات راجعة من الإدارة لتكملة بياناتها</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              راجع ملاحظات المدير على كل حالة وعدّل البيانات المطلوبة عشان تتبعت تاني للاعتماد.
            </p>
          </div>

          {needsRevisionCases.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200/80 shadow-none text-slate-500">
              <CheckCircle2 size={28} className="mx-auto text-slate-400 mb-2" />
              <p className="font-semibold text-sm text-slate-800">مفيش حالات راجعة لتكملة نواقص</p>
              <p className="text-xs text-slate-500 mt-1">كل الأبحاث الميدانية كاملة أو معتمدة حالياً.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {needsRevisionCases.map((c) => (
                <div
                  key={c.id}
                  className="p-5 bg-white rounded-xl border border-slate-200/70 shadow-none space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="min-w-0">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <h4 className="font-bold text-slate-900 text-sm">{c.fullName}</h4>
                        <span className="text-slate-300" aria-hidden="true">·</span>
                        <span className="font-mono text-xs text-slate-500 tabular-nums">
                          {c.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {c.governorate} · {c.district}
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-1.5 shrink-0">
                      <RotateCcw size={14} className="text-slate-500 shrink-0" />
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100/70 text-xs font-medium text-slate-700 whitespace-nowrap">
                        راجعة لتعديل البيانات
                      </span>
                    </div>
                  </div>

                  {/* Notes / Instructions from Management */}
                  {(c.adminRevisionNote || c.notes) && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs space-y-1">
                      <strong className="block text-xs font-semibold text-amber-950">ملاحظات الإدارة:</strong>
                      <p className="text-amber-900/90 leading-relaxed whitespace-pre-line text-xs">
                        {c.adminRevisionNote || c.notes?.split('\n\n')[0]}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 text-xs pt-1">
                    <span className="text-slate-500">
                      الباحث المسؤول: <strong className="text-slate-800 font-semibold">{c.assignedResearcher || 'مش متحدد'}</strong>
                    </span>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedCaseId(c.id)}
                        className="px-3 py-1.5 min-h-[36px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors text-xs whitespace-nowrap cursor-pointer"
                      >
                        عرض الملف
                      </button>
                      <button
                        type="button"
                        onClick={() => openFieldSurvey(c.id)}
                        className="px-3.5 py-1.5 min-h-[36px] bg-[#005756] hover:bg-[#004241] text-white font-semibold rounded-lg transition-colors flex items-center gap-1.5 text-xs whitespace-nowrap cursor-pointer"
                      >
                        <MapPin size={13} />
                        <span>استكمال البحث</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Overdue Cases Alert List */}
      {activeTab === 'overdue' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-2 font-semibold text-sm text-slate-800">
              <Clock size={16} className="text-slate-400 shrink-0" />
              <span>متابعة دورية كل 6 شهور</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              الحالات دي عدى عليها 6 شهور من آخر نزول ومحتاجة زيارة تحديث للتأكد من وضع الدخل والظروف المعيشية والصحية.
            </p>
          </div>

          {overdueCases.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200/80 shadow-none text-slate-500">
              <CheckCircle2 size={28} className="mx-auto text-slate-400 mb-2" />
              <p className="font-semibold text-sm text-slate-800">كل الحالات متحدثة ومفيش مواعيد متأخرة</p>
              <p className="text-xs text-slate-500 mt-1">مفيش حالات عدى عليها 6 شهور من غير متابعة دلوقتي.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {overdueCases.map((c) => (
                <div
                  key={c.id}
                  className="p-5 bg-white rounded-xl border border-slate-200/70 shadow-none space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="min-w-0">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="font-bold text-sm text-slate-900">{c.fullName}</span>
                        <span className="text-slate-300" aria-hidden="true">·</span>
                        <span className="text-xs font-mono text-slate-500 tabular-nums">
                          {c.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{c.governorate} · {c.district}</p>
                    </div>

                    <div className="inline-flex items-center gap-1.5 shrink-0">
                      <Clock size={14} className="text-rose-500 shrink-0" />
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100/70 text-xs font-medium text-slate-700 whitespace-nowrap">
                        متأخرة عن موعدها
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-200/60">
                    <div>
                      <span className="text-slate-500 block">تاريخ آخر نزول:</span>
                      <strong className="text-slate-800 font-mono tabular-nums mt-0.5 block">
                        {c.lastVisitDate}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">معاد التجديد الجاي:</span>
                      <strong className="text-slate-800 font-mono tabular-nums mt-0.5 block">
                        {c.nextVisitDueDate}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs pt-1">
                    <span className="text-slate-500">
                      الباحث الحالي: <strong className="text-slate-800 font-semibold">{c.assignedResearcher || 'مش متحدد'}</strong>
                    </span>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedCaseId(c.id)}
                        className="px-3 py-1.5 min-h-[36px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors text-xs whitespace-nowrap cursor-pointer"
                      >
                        عرض الملف
                      </button>
                      <button
                        type="button"
                        onClick={() => openFieldSurvey(c.id)}
                        className="px-3.5 py-1.5 min-h-[36px] bg-[#005756] hover:bg-[#004241] text-white font-semibold rounded-lg transition-colors flex items-center gap-1.5 text-xs whitespace-nowrap cursor-pointer"
                      >
                        <MapPin size={13} />
                        <span>ابدأ بحث حالة</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Completed Visits Archive */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-none flex items-center gap-2.5">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="دوّر في سجل الزيارات باسم الأسرة، الكود، أو الباحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs text-slate-800 placeholder:text-slate-400 bg-transparent focus:outline-hidden"
            />
          </div>

          {filteredVisits.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200/80 shadow-none text-slate-500">
              <FileText size={28} className="mx-auto text-slate-400 mb-2" />
              <p className="font-semibold text-sm text-slate-800">مفيش زيارات مطابقة للبحث</p>
              <p className="text-xs text-slate-500 mt-1">جرّب تدوّر باسم تاني أو امسح كلمة البحث.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredVisits.map((v) => {
                const linkedCase = cases.find((c) => c.id === v.caseId);
                const isPendingAdminReview = linkedCase?.status === 'pending_review';
                const isNeedsRevision = linkedCase?.status === 'needs_revision';

                return (
                <div
                  key={v.id}
                  className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-none space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center flex-wrap gap-1.5">
                      <span className="font-bold text-slate-900 text-sm">{v.caseName}</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="font-mono text-xs text-slate-500 tabular-nums">
                        {v.caseCode}
                      </span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="text-slate-500 text-xs">الباحث: {v.researcherName}</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      {isPendingAdminReview ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200/70 text-[#005756] text-[11px] font-semibold">
                          <CheckCircle2 size={12} className="shrink-0" />
                          <span>مكتمل البحث · بانتظار مراجعة الإدارة</span>
                        </span>
                      ) : isNeedsRevision ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-[11px] font-semibold">
                          <RotateCcw size={12} className="shrink-0" />
                          <span>مكتمل البحث · راجع للاستكمال</span>
                        </span>
                      ) : (
                        <span
                          className={`text-xs font-medium ${
                            v.status === 'overdue' ? 'text-rose-700 font-semibold' : 'text-slate-600'
                          }`}
                        >
                          {getVisitStatusLabel(v.status)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center flex-wrap gap-2 text-xs font-mono tabular-nums text-slate-500 shrink-0">
                      <span>تاريخ النزول: {v.visitDate}</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span>النزول الجاي: {v.scheduledNextDate}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-700 leading-relaxed">
                    <strong className="text-slate-800 font-semibold block mb-0.5">
                      ملاحظات المعاينة على الطبيعة:
                    </strong>
                    {v.observations}
                  </div>

                  {/* Location and Voice Note if recorded */}
                  {(v.gpsLocation || v.voiceNoteUrl) && (
                    <div className="flex items-center gap-3 flex-wrap pt-1">
                      {v.gpsLocation && (
                        <a
                          href={v.gpsLocation.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-[#005756] hover:underline"
                        >
                          <MapPin size={13} className="text-slate-400" />
                          <span>موقع موثق على الخريطة</span>
                        </a>
                      )}
                      {v.voiceNoteUrl && (
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50/80 border border-slate-200/80 text-slate-600 text-xs font-medium">
                          <Volume2 size={13} className="text-slate-400" />
                          <span>ملاحظة صوتية مسجلة</span>
                          <audio src={v.voiceNoteUrl} controls className="h-6 w-32" />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-xs bg-slate-50/80 p-3 rounded-lg border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-slate-600 whitespace-pre-line leading-relaxed">
                      <strong className="text-slate-800 font-semibold">توصية الباحث:</strong>{' '}
                      {v.recommendedChanges}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCaseId(v.caseId)}
                      className="text-xs font-semibold text-[#005756] hover:underline flex items-center gap-1 shrink-0 self-end sm:self-center cursor-pointer"
                    >
                      <span>فتح الملف</span>
                      <Eye size={13} />
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* New Field Visit Modal */}
      {showNewVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200/80">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">تسجيل زيارة سريعة</h3>
                <p className="text-xs text-slate-500 mt-1">
                  تحديث بيانات الأسرة ومعاد المتابعة الجاي
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewVisitModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                aria-label="إغلاق النافذة"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateVisit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">اختار الحالة *</label>
                <CustomSelect
                  value={selectedCaseForVisit}
                  onChange={setSelectedCaseForVisit}
                  options={cases.map((c) => ({
                    value: c.id,
                    label: `${c.fullName} (${c.code}) - ${c.district}`,
                  }))}
                  placeholder="اختار الحالة..."
                  ariaLabel="اختار الحالة"
                  triggerClassName="rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">تاريخ النزول *</label>
                  <input
                    type="date"
                    required
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg font-mono tabular-nums text-xs text-slate-800 focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">اسم الباحث *</label>
                  <input
                    type="text"
                    required
                    value={researcherName}
                    onChange={(e) => setResearcherName(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">
                  ملخص المعاينة وظروف المعيشة *
                </label>
                <textarea
                  required
                  rows={3}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="اوصف حالة السكن، شغل الأسرة باليومية، ومصاريف العلاج الفعلية..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">التوصية بالمبلغ ونوع المساعدة</label>
                <textarea
                  rows={2}
                  value={recommendedChanges}
                  onChange={(e) => setRecommendedChanges(e.target.value)}
                  placeholder="مثال: زيادة المساعدة لـ 3,000 ج.م عشان مصاريف العلاج، مع كرتونة مواد غذائية..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15"
                />
              </div>

              <div className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-lg text-slate-600 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs">
                  <Camera size={15} className="text-slate-400" />
                  <span>إرفاق صور المعاينة والأوراق المطلوبة</span>
                </span>
                <span className="text-slate-500 text-xs">مرفق موثق</span>
              </div>

              <div className="pt-3 border-t border-slate-200/80 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewVisitModal(false)}
                  className="px-4 py-2 border border-slate-200/80 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#005756] hover:bg-[#004241] text-white rounded-lg font-semibold cursor-pointer"
                >
                  حفظ وتجديد 6 شهور
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
