'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
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
  X,
} from 'lucide-react';
import { RoleInspirationalCard } from '@/components/common/role-inspirational-card';

function getVisitStatusLabel(status: FieldVisit['status']): string {
  switch (status) {
    case 'completed':
      return 'تمت الزيارة';
    case 'scheduled':
      return 'بانتظار النزول';
    case 'overdue':
      return 'زيارة متأخرة';
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

  const [activeTab, setActiveTab] = useState<'revision' | 'overdue' | 'all'>('overdue');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewVisitModal, setShowNewVisitModal] = useState(false);

  // New visit form state
  const [selectedCaseForVisit, setSelectedCaseForVisit] = useState(cases[0]?.id || '');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [researcherName, setResearcherName] = useState('أ. هبة الشامي');
  const [observations, setObservations] = useState('');
  const [recommendedChanges, setRecommendedChanges] = useState('');

  const overdueCases = cases.filter((c) => c.isVisitOverdue);
  const needsRevisionCases = cases.filter((c) => c.status === 'needs_revision');

  const filteredVisits = visits.filter((v) => {
    return (
      searchQuery === '' ||
      v.caseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.caseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.researcherName.toLowerCase().includes(searchQuery.toLowerCase())
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
          <span>راجِع من الإدارة: {needsRevisionCases.length}</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className={overdueCases.length > 0 ? 'font-medium text-rose-700' : ''}>
            زيارات متأخرة: {overdueCases.length}
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
      <div className="flex items-center gap-1 border-b border-slate-200/80 text-xs font-semibold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('revision')}
          className={`min-h-[44px] py-2.5 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
            activeTab === 'revision'
              ? 'border-[#005756] text-[#005756]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <RotateCcw
            size={15}
            className={activeTab === 'revision' ? 'text-[#005756]' : 'text-slate-400'}
          />
          <span>راجِع من الإدارة ({needsRevisionCases.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('overdue')}
          className={`min-h-[44px] py-2.5 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
            activeTab === 'overdue'
              ? 'border-[#005756] text-[#005756]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock
            size={15}
            className={activeTab === 'overdue' ? 'text-[#005756]' : 'text-slate-400'}
          />
          <span>متأخرة عن 6 شهور ({overdueCases.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`min-h-[44px] py-2.5 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
            activeTab === 'all'
              ? 'border-[#005756] text-[#005756]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText
            size={15}
            className={activeTab === 'all' ? 'text-[#005756]' : 'text-slate-400'}
          />
          <span>سجل الزيارات ({visits.length})</span>
        </button>
      </div>

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
                  className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-none space-y-3"
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

                    <span className="text-xs font-medium text-slate-500 shrink-0">
                      راجِع لتكملة بيانات
                    </span>
                  </div>

                  {/* Notes / Instructions from Management */}
                  {c.notes && (
                    <div className="p-3 bg-slate-50/80 border border-slate-200/70 rounded-lg text-xs space-y-1">
                      <strong className="block text-xs font-semibold text-slate-700">ملاحظات الإدارة:</strong>
                      <p className="text-slate-600 leading-relaxed whitespace-pre-line text-xs">
                        {c.notes.split('\n\n')[0]}
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
                  className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-none space-y-3"
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

                    <span className="text-xs font-semibold text-rose-700 flex items-center gap-1 shrink-0">
                      <Clock size={13} className="text-rose-600" />
                      <span>زيارة متأخرة</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/80 p-3 rounded-lg border border-slate-200/70">
                    <div>
                      <span className="text-slate-500 block">تاريخ آخر نزول:</span>
                      <strong className="text-slate-800 font-mono tabular-nums mt-0.5 block">
                        {c.lastVisitDate}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">معاد التجديد الجاي:</span>
                      <strong className="text-rose-700 font-mono tabular-nums mt-0.5 block">
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
              {filteredVisits.map((v) => (
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
                      <span
                        className={`text-xs font-medium ${
                          v.status === 'overdue' ? 'text-rose-700 font-semibold' : 'text-slate-600'
                        }`}
                      >
                        {getVisitStatusLabel(v.status)}
                      </span>
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
                    <span className="text-slate-600">
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
              ))}
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
                <select
                  value={selectedCaseForVisit}
                  onChange={(e) => setSelectedCaseForVisit(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.code}) - {c.district}
                    </option>
                  ))}
                </select>
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
