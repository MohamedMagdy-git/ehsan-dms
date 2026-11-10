'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
import {
  Calendar,
  Clock,
  UserCheck,
  AlertTriangle,
  Plus,
  CheckCircle2,
  FileText,
  Search,
  Filter,
  ArrowRight,
  Eye,
  Camera,
  Video,
  MapPin,
  Volume2,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { RoleInspirationalCard } from '@/components/common/role-inspirational-card';

export function ResearchView() {
  const {
    visits,
    cases,
    addVisit,
    setSelectedCaseId,
    reassignResearcher,
    openFieldSurvey,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'revision' | 'overdue' | 'all' | 'schedule'>('overdue');
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
      observations: observations.trim() || 'تمت المعاينة الميدانية والتحقق من الوضع المعيشي.',
      recommendedChanges: recommendedChanges.trim() || 'استمرار المساعدة الشهرية الحالية.',
      attachmentsCount: 1,
    });

    setShowNewVisitModal(false);
    setObservations('');
    setRecommendedChanges('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">الزيارات الميدانية والمتابعة</h2>
          <p className="text-xs text-slate-500">
            جدول نزول الباحثين ومتابعة تجديد أبحاث الأسر.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openFieldSurvey()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
          >
            <MapPin size={15} />
            <span>إجراء بحث حالة</span>
          </button>
          <button
            onClick={() => setShowNewVisitModal(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
          >
            <Plus size={15} />
            <span>توثيق سريع</span>
          </button>
        </div>
      </div>

      {/* Inspirational Quranic Guidance Card for Field Researcher */}
      <RoleInspirationalCard role="researcher" />

      {/* Tabs / Filter Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('revision')}
          className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'revision'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <RotateCcw size={15} className="text-amber-600" />
          <span>بانتظار استكمال النواقص ({needsRevisionCases.length})</span>
          {needsRevisionCases.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('overdue')}
          className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'overdue'
              ? 'border-rose-600 text-rose-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock size={16} className="text-rose-600" />
          <span>حالات تجاوزت 6 أشهر ({overdueCases.length})</span>
          {overdueCases.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'all'
              ? 'border-teal-700 text-teal-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText size={16} />
          <span>أرشيف الزيارات المكتملة ({visits.length})</span>
        </button>
      </div>

      {/* Returned Cases for Revision Tab */}
      {activeTab === 'revision' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-xl text-xs text-amber-950 space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              <RotateCcw size={18} className="text-amber-700" />
              <span>حالات أُرجعت من الإدارة لاستكمال البيانات ونواقص البحث</span>
            </div>
            <p className="text-amber-900/90 leading-relaxed">
              هذه الحالات قام المدير بفحصها وإرجاعها للباحث الميداني مع تسجيل ملاحظات وتوجيهات محددة. يرجى استيفاء النواقص المطلوبة وإعادة رفع التقرير للاعتماد المالي.
            </p>
          </div>

          {needsRevisionCases.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
              <CheckCircle2 size={32} className="mx-auto text-emerald-600 mb-2" />
              <p className="font-bold text-sm text-slate-900">لا توجد حالات بانتظار استكمال النواقص</p>
              <p className="text-xs text-slate-500 mt-1">جميع الأبحاث الميدانية مكتملة أو معتمدة دون ملاحظات معلقة</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {needsRevisionCases.map((c) => (
                <div
                  key={c.id}
                  className="p-5 bg-white rounded-2xl border-2 border-amber-300 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-amber-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{c.fullName}</h4>
                        <span className="font-mono text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                          {c.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {c.governorate} · {c.district}
                      </p>
                    </div>

                    <span className="px-2 py-1 bg-amber-100 text-amber-900 text-[11px] font-bold rounded-lg border border-amber-300 shrink-0">
                      بانتظار استكمال النواقص
                    </span>
                  </div>

                  {/* Notes / Instructions from Management */}
                  {c.notes && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                      <strong className="block text-[11px] font-bold text-amber-950">توجيهات الإدارة والملاحظات:</strong>
                      <p className="text-slate-800 leading-relaxed font-sans whitespace-pre-line text-[11px]">
                        {c.notes.split('\n\n')[0]}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-600">
                      الباحث المسؤول: <strong className="text-slate-800">{c.assignedResearcher || 'غير محدد'}</strong>
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSelectedCaseId(c.id)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg transition-colors text-xs cursor-pointer"
                      >
                        الملف
                      </button>
                      <button
                        type="button"
                        onClick={() => openFieldSurvey(c.id)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1 text-xs shadow-xs cursor-pointer"
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
          <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle size={18} className="text-rose-700" />
              <span>قاعدة الرقابة التشغيلية: إلزامية التحديث كل 6 أشهر</span>
            </div>
            <p className="text-rose-800/90 leading-relaxed">
              نظام الرقابة التشغيلية يُدرج إشعاراً دورياً للمتابعة الميدانية لكل ملف تجاوز 6 أشهر، لضمان تحديث بيانات الدخل والحالة المعيشية والصحية وإعادة تقييم الاستحقاق. يتيح النظام إعادة تعيين باحث جديد للزيارة القادمة دون فقدان السجل السابق.
            </p>
          </div>

          {overdueCases.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
              <CheckCircle2 size={32} className="mx-auto text-emerald-600 mb-2" />
              <p className="font-bold text-sm text-slate-900">جميع الحالات محدثة ومستوفاة لمواعيد الزيارات</p>
              <p className="text-xs text-slate-500 mt-1">لا توجد حالات تجاوزت 6 أشهر دون متابعة حالياً</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {overdueCases.map((c) => (
                <div
                  key={c.id}
                  className="p-5 bg-white rounded-xl border-2 border-rose-200 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-slate-900">{c.fullName}</span>
                        <span className="text-xs font-mono font-bold text-teal-900 bg-teal-100 px-2 py-0.5 rounded">
                          {c.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{c.governorate} · {c.district}</p>
                    </div>

                    <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                      <Clock size={12} />
                      <span>متأخرة عن موعدها</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 block font-sans">تاريخ آخر زيارة:</span>
                      <strong className="text-slate-800">{c.lastVisitDate}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-sans">موعد التجديد المستحق:</span>
                      <strong className="text-rose-600">{c.nextVisitDueDate}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-600">
                      الباحث الحالي: <strong>{c.assignedResearcher}</strong>
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setSelectedCaseId(c.id)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg transition-colors text-xs"
                      >
                        الملف
                      </button>
                      <button
                        onClick={() => openFieldSurvey(c.id)}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition-colors flex items-center gap-1 text-xs shadow-xs"
                      >
                        <MapPin size={13} />
                        <span>بحث حالة</span>
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
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              placeholder="البحث في سجل الزيارات باسم الحالة، الكود، أو الباحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-transparent focus:outline-hidden"
            />
          </div>

          <div className="space-y-3">
            {filteredVisits.map((v) => (
              <div
                key={v.id}
                className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3 hover:border-teal-500/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{v.caseName}</span>
                    <span className="font-mono text-xs font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                      {v.caseCode}
                    </span>
                    <span className="text-slate-400 text-xs">· الباحث: {v.researcherName}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
                    <span>تاريخ الزيارة: {v.visitDate}</span>
                    <span>· الزيارة القادمة: {v.scheduledNextDate}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-700 leading-relaxed">
                  <strong className="text-slate-900 block mb-0.5">مشاهدات الواقع الميداني:</strong>
                  {v.observations}
                </div>

                {/* GPS and Voice Note Badges if recorded */}
                {(v.gpsLocation || v.voiceNoteUrl) && (
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {v.gpsLocation && (
                      <a
                        href={v.gpsLocation.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold hover:underline"
                      >
                        <MapPin size={11} className="text-emerald-600" />
                        <span>موقع GPS موثق (Google Maps)</span>
                      </a>
                    )}
                    {v.voiceNoteUrl && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-bold">
                        <Volume2 size={11} className="text-rose-600" />
                        <span>ملاحظة صوتية مسجلة</span>
                        <audio src={v.voiceNoteUrl} controls className="h-5 w-28 ml-1" />
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-teal-900 bg-teal-50/60 p-2.5 rounded-lg border border-teal-100 flex items-center justify-between">
                  <span>
                    <strong>التوصية الإدارية:</strong> {v.recommendedChanges}
                  </span>
                  <button
                    onClick={() => setSelectedCaseId(v.caseId)}
                    className="text-xs font-bold text-teal-800 hover:underline flex items-center gap-1 shrink-0"
                  >
                    <span>فتح الحالة</span>
                    <Eye size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Field Visit Modal */}
      {showNewVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">توثيق تقرير زيارة ميدانية</h3>
                <p className="text-xs text-slate-500">تحديث مؤشرات الدخل والمصروفات والأوضاع الصحية للأسرة</p>
              </div>
              <button
                onClick={() => setShowNewVisitModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVisit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">الحالة المستهدفة بالزيارة *</label>
                <select
                  value={selectedCaseForVisit}
                  onChange={(e) => setSelectedCaseForVisit(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.code}) - {c.district}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">تاريخ الزيارة الميدانية *</label>
                  <input
                    type="date"
                    required
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">الباحث القائم بالمعاينة *</label>
                  <input
                    type="text"
                    required
                    value={researcherName}
                    onChange={(e) => setResearcherName(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">
                  مشاهدات الواقع المعيشي ورصد الدخل غير المباشر *
                </label>
                <textarea
                  required
                  rows={3}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="وصف حالة السكن، عمل الأبناء باليومية، عمل الأم المنزلي، مصاريف العلاج الفعلية..."
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">التوصية بمبلغ ونوع المساعدة</label>
                <textarea
                  rows={2}
                  value={recommendedChanges}
                  onChange={(e) => setRecommendedChanges(e.target.value)}
                  placeholder="مثال: زيادة المساعدة لـ 3,000 ج.م بسبب شراء أدوية مزمنة، وتوفير بطانية وكرتونة مواد غذائية..."
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs">
                  <Camera size={15} className="text-teal-700" />
                  <span>إرفاق صور المعاينة الميدانية والوثائق الرسمية</span>
                </span>
                <span className="text-slate-500 font-mono text-[11px]">مستند موثق</span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewVisitModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#005756] hover:bg-[#004241] text-white rounded-lg font-bold shadow-xs"
                >
                  حفظ وتحديث موعد الـ 6 أشهر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
