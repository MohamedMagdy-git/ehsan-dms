'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import {
  FileSpreadsheet,
  Printer,
  FileText,
  Calendar,
  Clock,
  AlertTriangle,
  Zap,
  PieChart,
  User,
  Users,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  exportMonthlyAllocationToExcel,
  exportResearcherAllocationToExcel,
  exportQuickFieldDeliveryToExcel,
  exportExceptionsToExcel,
  exportOverdueToExcel,
  exportVouchersToExcel,
  exportDonationsToExcel,
} from '@/services/excel-export';
import { MoneyDisplay } from '@/components/common/money-display';
import { BeneficiaryCase, FastTrackDisbursementOrder } from '@/types';
import { CustodyPrintModal } from '@/components/reports/custody-print-modal';
import { QuickFieldDeliveryModal } from '@/components/reports/quick-field-delivery-modal';
import { UrgentVoucherPrintModal } from '@/components/reports/urgent-voucher-print-modal';
import { tafqeetNumberToArabicWords } from '@/lib/tafqeet';

function formatBeneficiaryDisplayName(caseObj?: BeneficiaryCase, fallbackName?: string): string {
  if (!caseObj) return fallbackName || 'غير محدد';
  const primary = caseObj.primaryName || caseObj.fullName;
  if (caseObj.secondaryName && caseObj.secondaryName.trim()) {
    return `${primary} (${caseObj.secondaryName.trim()})`;
  }
  return primary;
}

export function ReportsView() {
  const {
    currentPeriod,
    setCurrentPeriod,
    allocations,
    generateOrRefreshAllocation,
    currentAllocation,
    cases,
    donations,
    fastTrackOrders,
  } = useApp();

  const [selectedResearcher, setSelectedResearcher] = useState<string>('all');
  const [isQuickPrintModalOpen, setIsQuickPrintModalOpen] = useState(false);
  const [isSolidarityModalOpen, setIsSolidarityModalOpen] = useState(false);
  const [selectedVoucherOrder, setSelectedVoucherOrder] = useState<FastTrackDisbursementOrder | null>(null);

  // حالة لتخزين ملاحظات الإدارة والتسليم الميداني القابلة للتعديل الحي
  const [fieldNotes, setFieldNotes] = useState<Record<string, string>>({});

  // خريطة الحالات لسرعة البحث
  const caseMap = useMemo(() => {
    const map = new Map<string, BeneficiaryCase>();
    cases.forEach((c) => map.set(c.id, c));
    return map;
  }, [cases]);

  // قائمة الباحثين الميدانيين
  const researchers = useMemo(() => {
    const set = new Set<string>();
    cases.forEach((c) => {
      if (c.assignedResearcher) set.add(c.assignedResearcher);
    });
    return Array.from(set).sort();
  }, [cases]);

  // الحالات المستحقة للصرف في الكشف السريع (غير المستبعدة ولها مبلغ أكبر من 0)
  const activeQuickItems = useMemo(() => {
    if (!currentAllocation) return [];
    let items = currentAllocation.items.filter((i) => !i.isExcluded && i.approvedAmount > 0);
    if (selectedResearcher !== 'all') {
      items = items.filter((item) => {
        const caseObj = caseMap.get(item.caseId);
        return caseObj && caseObj.assignedResearcher === selectedResearcher;
      });
    }
    return items;
  }, [currentAllocation, selectedResearcher, caseMap]);

  // إجمالي مبلغ العهدة المسلمة للباحث
  const totalCustodyAmount = useMemo(
    () => activeQuickItems.reduce((sum, item) => sum + item.approvedAmount, 0),
    [activeQuickItems]
  );

  // الحالات الأخرى للتقارير الثانوية
  const overdueCases = useMemo(() => cases.filter((c) => c.isVisitOverdue), [cases]);
  const exceptionCases = useMemo(
    () =>
      cases.filter(
        (c) => c.vulnerability.incompleteDocuments || c.status === 'pending_exception'
      ),
    [cases]
  );

  // تصدير كشف الصرف الميداني السريع (4 أعمدة)
  const handleExportQuickExcel = () => {
    if (!currentAllocation) return;
    exportQuickFieldDeliveryToExcel(
      currentAllocation,
      cases,
      selectedResearcher,
      fieldNotes
    );
  };

  // تصدير الكشف الرسمي
  const handleExportSolidarityExcel = () => {
    if (!currentAllocation) return;
    if (selectedResearcher !== 'all') {
      exportResearcherAllocationToExcel(currentAllocation, cases, selectedResearcher);
    } else {
      exportMonthlyAllocationToExcel(currentAllocation, cases);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HERO BENTO CARD: كشوف الصرف الميداني السريعة للباحثين */}
      <div className="bg-white rounded-xl border border-slate-200/70 shadow-none p-5 sm:p-6 space-y-5">
        {/* Header & Main Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                كشوف الصرف الميداني للباحثين
              </h2>
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-teal-50 border border-teal-200 text-teal-900">
                تسليم العهدة الميدانية
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
              إعداد وطباعة كشوف الصرف الميدانية وتصدير البيانات
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Print Button */}
            <button
              onClick={() => setIsQuickPrintModalOpen(true)}
              disabled={activeQuickItems.length === 0}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#005756] hover:bg-[#004241] active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold rounded-xl shadow-none transition-all cursor-pointer"
              title="طباعة كشف الصرف الميداني للباحث"
            >
              <Printer size={15} />
              <span>طباعة كشف الصرف الميداني</span>
            </button>

            {/* Quick Excel Export */}
            <button
              onClick={handleExportQuickExcel}
              disabled={activeQuickItems.length === 0}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold rounded-xl shadow-none transition-all cursor-pointer"
              title="تصدير كشف الصرف الميداني إلى ملف إكسل (.xlsx)"
            >
              <FileSpreadsheet size={15} />
              <span>تصدير إكسل</span>
            </button>

            {/* Solidarity Full Official Report Button (Unchanged Legacy Report) */}
            <button
              onClick={() => setIsSolidarityModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer"
              title="فتح الكشف الإداري المفصل المعتمد للتضامن الاجتماعي"
            >
              <FileText size={15} className="text-slate-500" />
              <span>الكشف الرسمي المفصل (المعتمد للتضامن)</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar & Custody Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          {/* Filters Bar: 2 columns on mobile, 8 cols on desktop */}
          <div className="lg:col-span-8 p-3 bg-slate-50/60 rounded-xl border border-slate-200/70 grid grid-cols-2 gap-2.5 items-end">
            {/* Batch Selector */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1.5 truncate">
                <Calendar size={13} className="text-[#005756] shrink-0" />
                <span className="truncate">الدفعة المعتمدة:</span>
              </label>
              <div className="relative">
                <select
                  value={currentPeriod}
                  onChange={(e) => {
                    const selected = e.target.value;
                    setCurrentPeriod(selected);
                    if (!allocations[selected]) {
                      generateOrRefreshAllocation(selected);
                    }
                  }}
                  className="w-full h-9 px-2.5 py-1.5 pr-2.5 pl-7 text-xs sm:text-sm font-normal text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#005756] focus:ring-1 focus:ring-[#005756] appearance-none shadow-xs transition-colors cursor-pointer"
                >
                  {Object.entries(allocations).map(([key, alloc]) => (
                    <option key={key} value={key}>
                      {alloc.batchTitle
                        ? `${alloc.batchTitle} (${alloc.periodLabel || key})`
                        : alloc.periodLabel || key}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Researcher Selector */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1.5 truncate">
                <User size={13} className="text-[#005756] shrink-0" />
                <span className="truncate">الباحث المسؤول:</span>
              </label>
              <div className="relative">
                <select
                  value={selectedResearcher}
                  onChange={(e) => setSelectedResearcher(e.target.value)}
                  className="w-full h-9 px-2.5 py-1.5 pr-2.5 pl-7 text-xs sm:text-sm font-normal text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#005756] focus:ring-1 focus:ring-[#005756] appearance-none shadow-xs transition-colors cursor-pointer"
                >
                  <option value="all">كافة الباحثين (شامل)</option>
                  {researchers.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Custody Amount Box */}
          <div className="lg:col-span-4 p-3 bg-teal-50/60 rounded-xl border border-teal-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-teal-800">إجمالي العهدة النقدية المطلوبة</span>
              <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-teal-100 text-teal-900">
                {activeQuickItems.length} حالة مستحقة
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <div className="text-xl font-black text-teal-950 font-mono">
                {totalCustodyAmount.toLocaleString('ar-EG')}
              </div>
              <span className="text-xs font-bold text-teal-800">ج.م</span>
            </div>
            <div className="text-[10px] text-teal-700 font-medium truncate mt-0.5" title={tafqeetNumberToArabicWords(totalCustodyAmount)}>
              فقط {tafqeetNumberToArabicWords(totalCustodyAmount)}
            </div>
          </div>
        </div>

        {/* Interactive Cases Table Preview (Inline Notes Input) */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>كشف الحالات الميدانية وملاحظات التسليم:</span>
              <span className="text-slate-400 font-normal">
                (يمكنك إضافة أو تعديل ملاحظات التوجيه الميداني لكل حالة قبل الطباعة)
              </span>
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-3 text-center w-12">م</th>
                  <th className="py-3 px-4 w-72 whitespace-nowrap">اسم الحالة وشهرتها</th>
                  <th className="py-3 px-4 w-44 whitespace-nowrap">المبلغ المقرر صرفه</th>
                  <th className="py-3 px-4">ملاحظات الإدارة والتسليم الميداني</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeQuickItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 font-medium">
                      لا توجد حالات مستحقة للصرف مطابقة للمحددات المختارة
                    </td>
                  </tr>
                ) : (
                  activeQuickItems.map((item, idx) => {
                    const caseObj = caseMap.get(item.caseId);
                    const displayName = formatBeneficiaryDisplayName(caseObj, item.caseName);
                    const currentNote =
                      fieldNotes[item.id] !== undefined
                        ? fieldNotes[item.id]
                        : (item.reasoning || 'تسليم باليد في مقر السكن');

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* 1. مسلسل */}
                        <td className="py-3 px-3 text-center text-slate-400 font-mono font-bold">
                          {idx + 1}
                        </td>

                        {/* 2. اسم الحالة وشهرتها */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{displayName}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <span className="font-mono font-semibold text-slate-700">{item.caseCode}</span>
                            <span>·</span>
                            <span>الباحث: {caseObj?.assignedResearcher || 'غير محدد'}</span>
                          </div>
                        </td>

                        {/* 3. المبلغ المقرر صرفه */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-sm text-[#005756]">
                            {item.approvedAmount.toLocaleString('ar-EG')} ج.م
                          </div>
                        </td>

                        {/* 4. ملاحظات الإدارة والتسليم الميداني (حقل إدخال مباشر) */}
                        <td className="py-2 px-4">
                          <input
                            type="text"
                            value={currentNote}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFieldNotes((prev) => ({
                                ...prev,
                                [item.id]: val,
                              }));
                            }}
                            placeholder="اكتب ملاحظة للباحث بالشارع (مثال: تسليم باليد للأم، التأكد من البطاقة)..."
                            className="w-full h-10 px-3 py-2 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 focus:border-[#005756] rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#005756] transition"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Stack */}
          <div className="md:hidden space-y-3">
            {activeQuickItems.length === 0 ? (
              <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                لا توجد حالات مستحقة للصرف مطابقة للمحددات
              </div>
            ) : (
              activeQuickItems.map((item, idx) => {
                const caseObj = caseMap.get(item.caseId);
                const displayName = formatBeneficiaryDisplayName(caseObj, item.caseName);
                const currentNote =
                  fieldNotes[item.id] !== undefined
                    ? fieldNotes[item.id]
                    : (item.reasoning || 'تسليم باليد في مقر السكن');

                return (
                  <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-sm text-slate-900">{displayName}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-slate-400 font-semibold">#{idx + 1}</span>
                          <span>·</span>
                          <span className="font-mono font-semibold text-teal-800">{item.caseCode}</span>
                          <span>·</span>
                          <span>الباحث: {caseObj?.assignedResearcher || 'غير محدد'}</span>
                        </div>
                      </div>
                      <div className="font-bold text-sm text-[#005756] shrink-0 bg-teal-50 px-2 py-1 rounded-lg">
                        <span className="font-mono tabular-nums font-black">{item.approvedAmount.toLocaleString('ar-EG')}</span>
                        <span className="text-xs mr-0.5"> ج.م</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">
                        ملاحظة التسليم للباحث:
                      </label>
                      <input
                        type="text"
                        value={currentNote}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFieldNotes((prev) => ({
                            ...prev,
                            [item.id]: val,
                          }));
                        }}
                        placeholder="اكتب ملاحظة التسليم الميداني..."
                        className="w-full h-9 px-2.5 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-normal text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#005756] focus:ring-1 focus:ring-[#005756] transition"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 2. SECONDARY BENTO GRID: التقارير الرقابية والإدارية الأخرى */}
      <div>
        <div className="mb-3">
          <h3 className="text-sm font-bold text-slate-900">التقارير الرقابية والمالية الإضافية</h3>
          <p className="text-xs text-slate-500">
            تصدير كشوفات المتابعة والتدقيق الإداري والمالي المعتمدة
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: متأخرات الزيارات والأبحاث */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <Clock size={16} />
                </span>
                <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                  {overdueCases.length} متأخرة
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">متأخرات الأبحاث الميدانية</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                حصر الحالات التي تجاوزت 6 أشهر دون زيارة ميدانية لتجديد ملف الاستحقاق.
              </p>
            </div>
            <button
              onClick={() => exportOverdueToExcel(overdueCases)}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <FileSpreadsheet size={13} className="text-emerald-700" />
              <span>تصدير إكسل ({overdueCases.length})</span>
            </button>
          </div>

          {/* Card 2: أذونات الصرف الفوري */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-teal-50 text-teal-700">
                  <Zap size={16} />
                </span>
                <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                  {fastTrackOrders.length} إذن فوري
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">أذونات الصرف الفوري</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                إدارة وطباعة أذونات المساعدات النقدية الطارئة والعمليات العاجلة.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => exportVouchersToExcel(fastTrackOrders)}
                className="flex-1 inline-flex items-center justify-center gap-1 py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                <FileSpreadsheet size={13} className="text-emerald-700" />
                <span>إكسل</span>
              </button>
              {fastTrackOrders.length > 0 && (
                <button
                  onClick={() => setSelectedVoucherOrder(fastTrackOrders[0])}
                  className="inline-flex items-center justify-center gap-1 py-2 px-3 bg-teal-50 hover:bg-teal-100 text-[#005756] text-xs font-bold rounded-xl transition cursor-pointer"
                  title="معاينة إذن الصرف المالي A4"
                >
                  <Printer size={13} />
                  <span>طباعة A4</span>
                </button>
              )}
            </div>
          </div>

          {/* Card 3: كشف الاستثناءات ونقص المستندات */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-rose-50 text-rose-700">
                  <AlertTriangle size={16} />
                </span>
                <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                  {exceptionCases.length} استثناء
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">الاستثناءات ونقص الأوراق</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                متابعة الحالات التي حظيت باعتماد إنساني استثنائي أو نقص في الأوراق.
              </p>
            </div>
            <button
              onClick={() => exportExceptionsToExcel(exceptionCases)}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <FileSpreadsheet size={13} className="text-emerald-700" />
              <span>تصدير إكسل ({exceptionCases.length})</span>
            </button>
          </div>

          {/* Card 4: تقرير التبرعات والمحافظ المقيدة */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <PieChart size={16} />
                </span>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                  {donations.length} حركة
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">التبرعات والمحافظ المقيدة</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                متابعة أرصدة الصناديق والمصارف الشرعية وأموال الزكاة والصدقات.
              </p>
            </div>
            <button
              onClick={() => exportDonationsToExcel(donations)}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <FileSpreadsheet size={13} className="text-emerald-700" />
              <span>تصدير إكسل ({donations.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODALS */}

      {/* 1. Quick Field Delivery Modal (A4 Print / PDF) */}
      {isQuickPrintModalOpen && currentAllocation && (
        <QuickFieldDeliveryModal
          isOpen={isQuickPrintModalOpen}
          onClose={() => setIsQuickPrintModalOpen(false)}
          allocation={currentAllocation}
          cases={cases}
          researcherName={selectedResearcher}
          fieldNotes={fieldNotes}
        />
      )}

      {/* 2. Official Full Solidarity Custody Modal (Unchanged Legacy Report) */}
      {isSolidarityModalOpen && currentAllocation && (
        <CustodyPrintModal
          isOpen={isSolidarityModalOpen}
          onClose={() => setIsSolidarityModalOpen(false)}
          allocation={currentAllocation}
          cases={cases}
          initialResearcher={selectedResearcher}
        />
      )}

      {/* 3. Fast Track Urgent Voucher Modal */}
      {selectedVoucherOrder && (
        <UrgentVoucherPrintModal
          isOpen={Boolean(selectedVoucherOrder)}
          onClose={() => setSelectedVoucherOrder(null)}
          order={selectedVoucherOrder}
          availableOrders={fastTrackOrders}
          onSelectOrder={setSelectedVoucherOrder}
        />
      )}
    </div>
  );
}
