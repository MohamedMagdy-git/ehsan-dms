'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import {
  UserCheck,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  Users,
  Eye,
  FileText,
  ChevronLeft,
} from 'lucide-react';
import { INITIAL_RESEARCHERS } from '@/data/initial-mock-data';

export function ResearcherProfileView() {
  const { cases, visits, setSelectedCaseId, currentUserRole, researchers } = useApp();

  const allResearcherProfiles = useMemo(() => {
    const list = [...INITIAL_RESEARCHERS];
    researchers.forEach((name, idx) => {
      if (!list.some((r) => r.name === name)) {
        list.push({
          id: `res-custom-${idx}`,
          name,
          roleTitle: 'باحث ميداني معتمد',
          phone: '010********',
          email: 'researcher@ehsan-initiative.org',
          assignedDistricts: ['القاهرة والجيزة'],
          joinedDate: new Date().toISOString().split('T')[0],
          totalVisitsConducted: 0,
          activeAssignedCasesCount: cases.filter((c) => c.assignedResearcher === name).length,
          pendingVisitsCount: 0,
          completionRate: 100,
          bio: 'باحث ميداني معتمد لمتابعة واستقصاء الحالات الإنسانية وتحديث بيانات الاستحقاق.',
        });
      }
    });
    return list;
  }, [researchers, cases]);

  const [selectedResearcherId, setSelectedResearcherId] = useState(INITIAL_RESEARCHERS[0]?.id || 'res-01');

  const currentResearcher = allResearcherProfiles.find((r) => r.id === selectedResearcherId) || allResearcherProfiles[0] || INITIAL_RESEARCHERS[0];

  // Cases assigned to this researcher
  const assignedCases = cases.filter((c) => c.assignedResearcher === currentResearcher?.name);

  // Visits conducted by this researcher
  const researcherVisits = visits.filter((v) => v.researcherName === currentResearcher?.name);

  // Overdue visits among assigned cases
  const overdueCasesForResearcher = assignedCases.filter((c) => c.isVisitOverdue);

  return (
    <div className="space-y-6">
      {/* Top Banner & Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">فريق البحث الميداني</h2>
          <p className="text-xs text-slate-500">
            بيانات الباحثين، نطاقات العمل الميداني، ومتابعة العهد.
          </p>
        </div>

        {/* Switch Researcher Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">اختيار الباحث:</span>
          <select
            value={selectedResearcherId}
            onChange={(e) => setSelectedResearcherId(e.target.value)}
            className="p-1.5 border border-slate-300 rounded-lg text-xs bg-white font-bold text-teal-900 focus:outline-hidden"
          >
            {allResearcherProfiles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} - {r.roleTitle}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Profile Card */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-800 text-white flex items-center justify-center font-bold text-2xl shadow-xs shrink-0">
              {currentResearcher.name.split(' ')[1]?.charAt(0) || 'ب'}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-bold text-slate-900">{currentResearcher.name}</h3>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                  {currentResearcher.roleTitle}
                </span>
              </div>
              <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                {currentResearcher.bio}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1 font-mono">
                <span className="flex items-center gap-1 font-sans">
                  <Phone size={13} className="text-teal-700" />
                  <span>{currentResearcher.phone}</span>
                </span>
                <span className="flex items-center gap-1 font-sans">
                  <Mail size={13} className="text-teal-700" />
                  <span>{currentResearcher.email}</span>
                </span>
                <span className="flex items-center gap-1 font-sans">
                  <Calendar size={13} className="text-teal-700" />
                  <span>تاريخ الانضمام: {currentResearcher.joinedDate}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
            <span className="text-xs text-slate-500 font-medium">أحياء ومناطق التكليف:</span>
            <div className="flex flex-wrap gap-1.5">
              {currentResearcher.assignedDistricts.map((d, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Operational Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 text-xs block">إجمالي الزيارات المنجزة</span>
            <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
              {currentResearcher.totalVisitsConducted}
            </span>
            <span className="text-[11px] text-teal-800 font-medium">معاينات موثقة</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 text-xs block">الحالات المكلفة حالياً</span>
            <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
              {assignedCases.length}
            </span>
            <span className="text-[11px] text-slate-500">في النطاق الجغرافي</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 text-xs block">زيارات متأخرة (&gt; 6 أشهر)</span>
            <span
              className={`text-2xl font-bold font-mono mt-1 block ${
                overdueCasesForResearcher.length > 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {overdueCasesForResearcher.length}
            </span>
            <span className="text-[11px] text-rose-600 font-medium">
              {overdueCasesForResearcher.length > 0 ? 'تتطلب متابعة عاجلة' : 'لا توجد متأخرات'}
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 text-xs block">معدل الإنجاز الدوري</span>
            <span className="text-2xl font-bold font-mono text-emerald-700 mt-1 block">
              {currentResearcher.completionRate}%
            </span>
            <span className="text-[11px] text-emerald-700 font-medium">تقييم متميز</span>
          </div>
        </div>
      </div>

      {/* Two columns: Assigned Cases & Recent Visits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Cases List */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">الحالات المسندة للباحث ({assignedCases.length})</h4>
              <p className="text-xs text-slate-500">الأسر المستحقة الواقعة تحت إشرافه الميداني</p>
            </div>
            <span className="text-xs font-mono text-teal-800 font-bold">{currentResearcher.name}</span>
          </div>

          <div className="space-y-2.5">
            {assignedCases.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">لا توجد حالات مسندة حالياً لهذا الباحث</p>
            ) : (
              assignedCases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCaseId(c.id)}
                  className="p-3 rounded-lg border border-slate-200 hover:border-teal-500/60 hover:bg-teal-50/20 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-xs">{c.fullName}</span>
                      <span className="text-[11px] font-mono text-teal-900 bg-teal-50 px-1.5 py-0.2 rounded font-semibold">
                        {c.code}
                      </span>
                      {c.status === 'needs_revision' && (
                        <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded">
                          بانتظار استكمال النواقص
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>{c.district}</span>
                      <span>·</span>
                      <span className={c.isVisitOverdue ? 'text-rose-600 font-bold' : ''}>
                        آخر زيارة: {c.lastVisitDate}
                      </span>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <span className="text-xs font-mono font-bold text-slate-900 block" suppressHydrationWarning>
                      {c.financials.netFinancialGap.toLocaleString('en-US')} ج.م
                    </span>
                    <span className="text-[10px] text-slate-400">فجوة شهرية</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Researcher's Field Visits */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">تقارير الزيارات الميدانية الموثقة</h4>
              <p className="text-xs text-slate-500">آخر المعاينات المسجلة بواسطة الباحث</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">{researcherVisits.length} زيارات موثقة</span>
          </div>

          <div className="space-y-3">
            {researcherVisits.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">لم يتم تسجيل زيارات حديثة في الأرشيف الرقمي</p>
            ) : (
              researcherVisits.map((v) => (
                <div key={v.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{v.caseName}</span>
                      <span className="font-mono text-[11px] text-teal-900 font-semibold">({v.caseCode})</span>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px]">{v.visitDate}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    <strong>الرصد:</strong> {v.observations}
                  </p>
                  <p className="text-teal-900 font-medium text-[11px]">
                    <strong>التوصية:</strong> {v.recommendedChanges}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
