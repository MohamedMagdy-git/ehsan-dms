'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  X,
  FileText,
  Scissors,
  CheckCircle2,
  Building2,
  Calendar,
  User,
  Info,
} from 'lucide-react';
import { MonthlyAllocation, BeneficiaryCase, AllocationItem } from '@/types';
import { tafqeetNumberToArabicWords } from '@/lib/tafqeet';

interface CustodyPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  allocation: MonthlyAllocation;
  cases: BeneficiaryCase[];
  initialResearcher?: string;
}

function formatDisplayName(caseObj?: BeneficiaryCase, fallbackName?: string): string {
  if (!caseObj) return fallbackName || 'غير محدد';
  const primary = caseObj.primaryName || caseObj.fullName;
  if (caseObj.secondaryName && caseObj.secondaryName.trim()) {
    return `${primary} (${caseObj.secondaryName.trim()})`;
  }
  return primary;
}

export function CustodyPrintModal({
  isOpen,
  onClose,
  allocation,
  cases,
  initialResearcher = 'all',
}: CustodyPrintModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'ledger' | 'slips'>('ledger');
  const [selectedResearcher, setSelectedResearcher] = useState<string>(initialResearcher);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const caseMap = useMemo(() => {
    const map = new Map<string, BeneficiaryCase>();
    cases.forEach((c) => map.set(c.id, c));
    return map;
  }, [cases]);

  // استخراج قائمة الباحثين الميدانيين
  const researchers = useMemo(() => {
    const set = new Set<string>();
    cases.forEach((c) => {
      if (c.assignedResearcher) set.add(c.assignedResearcher);
    });
    return Array.from(set).sort();
  }, [cases]);

  // الحالات المشمولة بالطباعة (حسب الباحث المختار)
  const printItems = useMemo(() => {
    let items = allocation.items;
    if (selectedResearcher !== 'all') {
      items = items.filter((item) => {
        const c = caseMap.get(item.caseId);
        return c && c.assignedResearcher === selectedResearcher;
      });
    }
    // في قسائم الاستلام الفردية، تقتصر الطباعة على الحالات المستحقة غير المستبعدة
    if (activeTab === 'slips') {
      return items.filter((i) => !i.isExcluded && i.approvedAmount > 0);
    }
    return items;
  }, [allocation.items, selectedResearcher, caseMap, activeTab]);

  // تجميع قسائم الاستلام الفردية (3 قسائم في كل ورقة A4 بالضبط)
  const slipsChunks = useMemo(() => {
    const chunks: AllocationItem[][] = [];
    for (let i = 0; i < printItems.length; i += 3) {
      chunks.push(printItems.slice(i, i + 3));
    }
    return chunks;
  }, [printItems]);

  const activeFundedItems = useMemo(
    () => printItems.filter((i) => !i.isExcluded && i.approvedAmount > 0),
    [printItems]
  );

  const totalCustodyAmount = useMemo(
    () => activeFundedItems.reduce((sum, i) => sum + i.approvedAmount, 0),
    [activeFundedItems]
  );

  const sessionMinutesNum = allocation.sessionMinutesNumber || '14/2026';
  const sessionMinutesDate = allocation.sessionMinutesDate || allocation.approvedDate || '2026-10-18';
  const printDateStr = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (!isOpen || !mounted) return null;

  const modalJSX = (
    <div
      id="custody-modal-root"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-start p-2 sm:p-4 print:p-0 print:bg-white print:overflow-visible print:static print:inset-auto print:block print:w-full print:h-auto"
      dir="rtl"
    >
      {/* Dynamic Print Style per tab (Landscape for Ledger, Portrait for Slips) */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: ${activeTab === 'ledger' ? 'A4 landscape' : 'A4 portrait'};
                margin: ${activeTab === 'ledger' ? '5mm 6mm 5mm 6mm' : '5mm 6mm 5mm 6mm'};
              }
            }
          `,
        }}
      />

      {/* Screen-Only Control Toolbar */}
      <div className="no-print w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 mb-3 flex flex-col gap-2.5 sticky top-2 z-60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center shrink-0">
              <Printer size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>منظومة الطباعة الميدانية المعتمدة (A4 Print / PDF)</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  معايير حوكمة
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                نماذج جاهزة للطباعة الورقية المباشرة أو التصدير لملف PDF بأبعاد A4 قياسية
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer size={15} />
              <span>طباعة النموذج المختار (Ctrl + P)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="إغلاق النافذة"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Switcher & Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Tabs */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'ledger'
                  ? 'bg-white text-teal-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText size={14} className="shrink-0" />
              <span className="sm:hidden">كشف العهدة</span>
              <span className="hidden sm:inline">1. كشف تسوية العهدة الإداري (A4 Landscape)</span>
            </button>

            <button
              onClick={() => setActiveTab('slips')}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'slips'
                  ? 'bg-white text-teal-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scissors size={14} className="shrink-0" />
              <span className="sm:hidden">قسائم الاستلام</span>
              <span className="hidden sm:inline">2. قسائم إقرار الاستلام الفردية (A4 Portrait · 3 بالورقة)</span>
            </button>
          </div>

          {/* Researcher Filter */}
          <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-medium shrink-0">الباحث:</span>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 flex-1 sm:flex-initial">
              <User size={13} className="text-teal-700 shrink-0" />
              <select
                value={selectedResearcher}
                onChange={(e) => setSelectedResearcher(e.target.value)}
                className="bg-transparent focus:outline-hidden cursor-pointer text-xs font-bold text-slate-800 w-full sm:w-auto"
              >
                <option value="all">كافة الباحثين (الكشف الشامل)</option>
                {researchers.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Informational Notice */}
        <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 text-[11px] text-slate-600">
          <Info size={14} className="text-teal-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            {activeTab === 'ledger' ? (
              <span>
                <strong>كشف تسوية العهدة الإداري:</strong> وثيقة رقابية لإخلاء طرف الباحث الميداني وتسوية العهدة المالية مع أمانة الصندوق والمدير التنفيذي. مصمم ليتسع لكشف الـ 10 حالات مع التوقيعات الثلاثية والختم المعتمد في صفحة A4 عرضية متناسقة.
              </span>
            ) : (
              <span>
                <strong>قسائم إقرار الاستلام الفردية (3 في الصفحة):</strong> حماية كاملة لخصوصية الأسر المستفيدة. كل صفحة A4 تستوعب 3 قسائم كاملة ومستقلة يفصل بينها خط منقط ورمز المقص ✂️ مع خانة واسعة للبصمة الحية والتوقيع لمنع انشطار أي قسيمة.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Printable Area Container */}
      <div
        id="printable-area"
        className={`w-full bg-white transition-all text-slate-900 ${
          activeTab === 'ledger'
            ? 'max-w-[297mm] shadow-lg rounded-xl print:shadow-none print:rounded-none p-5 print:p-0 print:max-w-none'
            : 'max-w-[210mm] shadow-lg rounded-xl print:shadow-none print:rounded-none p-4 print:p-0 print:max-w-none'
        }`}
      >
        {/* ========================================================================= */}
        {/* TAB 1: كشف تسوية العهدة الإداري (A4 Landscape)                            */}
        {/* ========================================================================= */}
        {activeTab === 'ledger' && (
          <div className="flex flex-col space-y-2">
            {/* Header: Official Association Branding */}
            <div className="border-b-2 border-slate-800 pb-1.5 flex items-start justify-between text-xs">
              <div className="text-right space-y-0.5">
                <div className="font-extrabold text-[11px] text-slate-900 leading-tight">
                  جمهورية مصر العربية · وزارة التضامن الاجتماعي
                </div>
                <div className="font-black text-sm text-teal-900">
                  جمعية إحسان الخيرية (مشهرة برقم 1048 لسنة 2018)
                </div>
                <div className="text-[9px] text-slate-500 font-semibold">
                  لجنة التكافل والمساعدات الميدانية · محافظة القاهرة
                </div>
              </div>

              <div className="text-center px-4 py-1.5 bg-slate-50 rounded-xl border border-slate-300">
                <h1 className="font-black text-sm text-slate-900">
                  كشف تسليم وصرف المساعدات النقدية الميدانية
                </h1>
                <div className="text-xs font-bold text-teal-800 mt-0.5">
                  اسم الدفعة المعتمد: {allocation.batchTitle || allocation.periodLabel}
                </div>
                <div className="text-[10px] text-slate-600 font-semibold mt-0.5">
                  الباحث المسؤول: {selectedResearcher !== 'all' ? selectedResearcher : 'كافة الباحثين الميدانيين'} · التاريخ: {allocation.executionDate || printDateStr}
                </div>
              </div>

              <div className="text-left space-y-0.5 text-[9px] font-mono text-slate-600">
                <div className="font-bold text-slate-900">REF-{allocation.period}-{selectedResearcher !== 'all' ? 'RES' : 'ALL'}</div>
                <div>تاريخ الطباعة: {printDateStr}</div>
                <div className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-300 text-[8px]">
                  كشف تسليم رسمي
                </div>
              </div>
            </div>

            {/* Researcher & Custody Metadata Bar */}
            <div className="grid grid-cols-4 gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300 text-[10.5px]">
              <div>
                <span className="text-slate-500 ml-1">الباحث الميداني:</span>
                <span className="font-extrabold text-slate-900">
                  {selectedResearcher !== 'all' ? selectedResearcher : 'كافة الباحثين'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 ml-1">الحالات المعتمدة:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {activeFundedItems.length} حالة مستحقة
                </span>
              </div>
              <div>
                <span className="text-slate-500 ml-1">إجمالي عهدة الصرف:</span>
                <span className="font-black text-teal-900 font-mono">
                  {totalCustodyAmount.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
              <div className="truncate">
                <span className="text-slate-500 ml-1">تفقيطاً:</span>
                <span className="font-bold text-slate-800 text-[9.5px]">
                  {tafqeetNumberToArabicWords(totalCustodyAmount)}
                </span>
              </div>
            </div>

            {/* Main Table: 5 columns requested by user */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-400 text-[10.5px] text-right">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-black border-b border-slate-400 text-[10.5px]">
                    <th className="border border-slate-400 px-2 py-1.5 text-center w-10">م</th>
                    <th className="border border-slate-400 px-3 py-1.5">اسم الحالة</th>
                    <th className="border border-slate-400 px-2 py-1.5 text-center w-36">الرقم القومي</th>
                    <th className="border border-slate-400 px-2 py-1.5 text-center w-32">المبلغ المقرر صرفه</th>
                    <th className="border border-slate-400 px-3 py-1.5 text-center w-48">توقيع / بصمة المستفيد</th>
                  </tr>
                </thead>
                <tbody>
                  {printItems.map((item, index) => {
                    const caseObj = caseMap.get(item.caseId);
                    const displayName = formatDisplayName(caseObj, item.caseName);
                    const nationalId = caseObj?.nationalId || 'مرفق بالملف';

                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-slate-300 ${
                          item.isExcluded ? 'bg-rose-50/50 text-slate-400' : 'hover:bg-slate-50'
                        }`}
                        style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                      >
                        <td className="border border-slate-300 px-2 py-1.5 text-center font-mono font-bold text-slate-600">
                          {index + 1}
                        </td>
                        <td className="border border-slate-300 px-3 py-1.5 font-bold text-slate-900">
                          <div>{displayName}</div>
                          <div className="text-[9px] font-mono font-normal text-slate-400">{item.caseCode}</div>
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5 text-center font-mono font-bold text-slate-800">
                          {nationalId}
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5 text-center font-mono font-black text-slate-900">
                          {item.isExcluded ? (
                            <span className="text-rose-600 text-[10px]">مستبعد</span>
                          ) : (
                            `${item.approvedAmount.toLocaleString('ar-EG')} ج.م`
                          )}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-center h-11 bg-slate-50/40">
                          <div className="border border-dashed border-slate-300 rounded h-9 flex items-center justify-center text-[10px] text-slate-400 font-medium">
                            توقيع / بصمة المستفيد
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black border-t-2 border-slate-500 text-slate-900 text-[11px]">
                    <td colSpan={3} className="border border-slate-400 px-3 py-2 text-left font-black">
                      الإجمالي العام لعهدة الصرف:
                    </td>
                    <td className="border border-slate-400 px-2 py-2 text-center font-mono font-black text-teal-900 text-xs">
                      {totalCustodyAmount.toLocaleString('ar-EG')} ج.م
                    </td>
                    <td className="border border-slate-400 px-3 py-2 text-[10px] text-slate-600 font-normal">
                      {tafqeetNumberToArabicWords(totalCustodyAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Triple Endorsement Footer (التوقيعات الثلاثية وإخلاء الطرف) */}
            <div
              className="pt-2 border-t-2 border-slate-800 mt-2"
              style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
            >
              <div className="grid grid-cols-3 gap-3 text-[10px]">
                {/* 1. توقيع الباحث الميداني */}
                <div className="border border-slate-300 rounded p-2 bg-slate-50 flex flex-col justify-between h-20">
                  <div>
                    <div className="font-extrabold text-slate-900">1. الباحث الميداني (مستلم العهدة)</div>
                    <p className="text-[8.5px] text-slate-600 leading-tight mt-0.5">
                      أقر باستلام مبلغ العهدة الموضح وصرفه وفق قسائم الاستلام الفردية المعتمدة والتزامي بتسوية الإيصالات المستوفاة.
                    </p>
                  </div>
                  <div className="pt-1 border-t border-slate-200 flex justify-between text-[9px] font-bold">
                    <span>الاسم: {selectedResearcher !== 'all' ? selectedResearcher : '.........................'}</span>
                    <span>التوقيع: ..................</span>
                  </div>
                </div>

                {/* 2. مراجعة أمين الصندوق */}
                <div className="border border-slate-300 rounded p-2 bg-slate-50 flex flex-col justify-between h-20">
                  <div>
                    <div className="font-extrabold text-slate-900">2. مراجعة أمين الصندوق / الإدارة المالية</div>
                    <p className="text-[8.5px] text-slate-600 leading-tight mt-0.5">
                      تم صرف عهدة الكشف دفترياً، والمراجعة جارية على قسائم الاستلام الفردية وإيصالات البصمة والتوقيع فور انتهاء التوزيع.
                    </p>
                  </div>
                  <div className="pt-1 border-t border-slate-200 flex justify-between text-[9px] font-bold">
                    <span>أمين الصندوق: .........................</span>
                    <span>التوقيع: ..................</span>
                  </div>
                </div>

                {/* 3. اعتماد المدير التنفيذي وختم الجمعية */}
                <div className="border border-slate-300 rounded p-2 bg-slate-50 flex flex-col justify-between h-20 relative">
                  <div>
                    <div className="font-extrabold text-slate-900">3. اعتماد رئيس مجلس الإدارة / المدير التنفيذي</div>
                    <p className="text-[8.5px] text-slate-600 leading-tight mt-0.5">
                      يعتمد الصرف والتسوية النهائية بناءً على محضر الجلسة رقم ({sessionMinutesNum}) وقسائم التوقيع والبصمة المستوفاة.
                    </p>
                  </div>
                  {/* Official Stamp Circle */}
                  <div className="absolute left-2 top-1.5 w-12 h-12 rounded-full border border-dashed border-teal-700/60 flex items-center justify-center text-[7.5px] font-bold text-teal-800 text-center leading-none rotate-12 opacity-80 pointer-events-none">
                    ختم الجمعية
                    <br />
                    المعتمد
                  </div>
                  <div className="pt-1 border-t border-slate-200 flex justify-between text-[9px] font-bold">
                    <span>المدير التنفيذي: .........................</span>
                    <span>التوقيع: ..................</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: قسائم إقرار الاستلام الفردية (3 قسائم مستقلة بالورقة A4 Portrait)    */}
        {/* ========================================================================= */}
        {activeTab === 'slips' && (
          <div className="space-y-4 print:space-y-0">
            {slipsChunks.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-bold">
                لا توجد حالات معتمدة للصرف في هذا التحديد.
              </div>
            ) : (
              slipsChunks.map((chunk, pageIndex) => (
                <div
                  key={`page-${pageIndex}`}
                  className="slip-page flex flex-col justify-between print:h-[280mm] print:max-h-[280mm] print:overflow-hidden"
                  style={{
                    pageBreakAfter: pageIndex < slipsChunks.length - 1 ? 'always' : 'auto',
                    breakAfter: pageIndex < slipsChunks.length - 1 ? 'page' : 'auto',
                  }}
                >
                  {chunk.map((item, slipIndex) => {
                    const caseObj = caseMap.get(item.caseId);
                    const displayName = formatDisplayName(caseObj, item.caseName);
                    const nationalId = caseObj?.nationalId || 'مرفق بالملف الورقي';
                    const fullAddress = caseObj?.address || 'غير محدد';
                    const phone = caseObj?.phone || 'لا يوجد هاتف';
                    const researcherName = caseObj?.assignedResearcher || selectedResearcher || 'الباحث الميداني';
                    const amountSpellout = tafqeetNumberToArabicWords(item.approvedAmount);

                    return (
                      <React.Fragment key={item.id}>
                        {/* Individual Slip Card */}
                        <div
                          className="slip-card flex flex-col justify-between p-3 border-2 border-slate-800 rounded-xl bg-white text-slate-900 relative shadow-2xs print:h-[86mm] print:max-h-[86mm] print:overflow-hidden print:border-slate-800"
                          style={{
                            pageBreakInside: 'avoid',
                            breakInside: 'avoid',
                          }}
                        >
                          {/* Micro Header */}
                          <div className="flex items-start justify-between border-b border-slate-300 pb-1">
                            <div>
                              <div className="text-[10px] font-black text-teal-900 leading-tight">
                                جمعية إحسان الخيرية (مشهرة برقم 1048)
                              </div>
                              <div className="text-[8.5px] text-slate-500 font-semibold">
                                لجنة التكافل والمساعدات الميدانية · محافظة القاهرة
                              </div>
                            </div>

                            <div className="text-center">
                              <span className="font-black text-[11px] text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-300">
                                قسيمة إقرار استلام مساعدة مالية نقدية
                              </span>
                              <div className="text-[8.5px] text-slate-500 font-bold mt-0.5">
                                دورة: {allocation.periodLabel} (محضر رقم: {sessionMinutesNum})
                              </div>
                            </div>

                            <div className="text-left font-mono text-[9.5px]">
                              <span className="font-extrabold text-slate-900 bg-teal-50 text-teal-900 px-1.5 py-0.5 rounded border border-teal-200">
                                {item.caseCode}
                              </span>
                              <div className="text-[7.5px] text-slate-400 mt-0.5">مسند صرف رسمي</div>
                            </div>
                          </div>

                          {/* Beneficiary Details Grid - Distributed in 2 clean, spacious rows */}
                          <div className="text-xs py-1 px-2.5 border border-slate-200 bg-slate-50/80 rounded-lg space-y-1 overflow-hidden">
                            {/* السطر الأول: اسم المستفيد والرقم القومي */}
                            <div className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-7 min-w-0">
                                <span className="text-[8px] text-slate-500 block leading-none">اسم المستفيد / رب الأسرة:</span>
                                <span className="font-black text-slate-900 text-[11.5px] block truncate mt-0.5">
                                  {displayName}
                                </span>
                              </div>

                              <div className="col-span-5 min-w-0">
                                <span className="text-[8px] text-slate-500 block leading-none">الرقم القومي (14 رقم):</span>
                                <span
                                  className="font-mono font-bold text-slate-900 text-[11px] tracking-wider block mt-0.5"
                                  dir="ltr"
                                >
                                  {nationalId}
                                </span>
                              </div>
                            </div>

                            {/* السطر الثاني: العنوان وهاتف التواصل منفصلين تماماً لمنع أي خروج عن الإطار */}
                            <div className="grid grid-cols-12 gap-2 items-center border-t border-slate-200/70 pt-1">
                              <div className="col-span-7 min-w-0">
                                <span className="text-[8px] text-slate-500 block leading-none">العنوان بالتفصيل:</span>
                                <span className="text-[9.5px] text-slate-700 block truncate mt-0.5" title={fullAddress}>
                                  {fullAddress}
                                </span>
                              </div>

                              <div className="col-span-5 min-w-0">
                                <span className="text-[8px] text-slate-500 block leading-none">هاتف التواصل:</span>
                                <span
                                  className="font-mono font-bold text-slate-900 text-[11px] tracking-wider block mt-0.5"
                                  dir="ltr"
                                >
                                  {phone || 'لا يوجد هاتف'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Highlighted Amount & Sharia Source Box */}
                          <div className="flex items-center justify-between bg-teal-50/70 border border-teal-700 rounded px-2 py-1 text-xs">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-[10px] font-bold text-teal-900">المبلغ المستلم:</span>
                              <span className="font-mono font-black text-sm text-teal-950">
                                {item.approvedAmount.toLocaleString('ar-EG')} ج.م
                              </span>
                            </div>
                            <div className="text-[10px] font-bold text-slate-800">
                              <span className="text-slate-500 text-[9px] ml-1">تفقيطاً:</span>
                              <span>{amountSpellout}</span>
                            </div>
                            <div className="text-[8.5px] font-bold bg-white text-teal-800 px-1.5 py-0.5 rounded border border-teal-300">
                              {item.fundSourceName || 'حساب الزكاة والصدقات'}
                            </div>
                          </div>

                          {/* Beneficiary Legal Declaration */}
                          <p className="text-[8.5px] text-slate-700 leading-tight bg-slate-50 px-2 py-1 rounded border border-slate-200">
                            <strong>إقرار الاستلام:</strong> أقر أنا الموقع / المبصوم أدناه بصفتي رب الأسرة / المستحق، باستلام كامل مبلغ المساعدة النقدية الموضح أعلاه دون أي استقطاع أو خصم، لاستخدامه في أوجه الإعانة المعتمدة للأسرة.
                          </p>

                          {/* Signature & Fingerprint Live Proof Boxes */}
                          <div className="grid grid-cols-12 gap-2 pt-0.5">
                            {/* Thumbprint & Beneficiary Signature Box */}
                            <div className="col-span-7 border border-dashed border-slate-400 rounded p-1.5 flex items-center justify-between bg-white min-h-[50px]">
                              <div className="space-y-0.5">
                                <span className="text-[9.5px] font-black text-slate-900 block">توقيع المستلم:</span>
                                <div className="text-[9px] text-slate-400">................................................</div>
                                <span className="text-[7.5px] text-slate-500 block">
                                  [ ] تم التحقق من أصل بطاقة الرقم القومي
                                </span>
                              </div>
                              <div className="w-14 h-11 rounded border border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-[7px] text-slate-400 text-center font-bold">
                                <span>بصمة</span>
                                <span>الإبهام الحية</span>
                              </div>
                            </div>

                            {/* Field Delivery Proof Box */}
                            <div className="col-span-5 border border-slate-300 rounded p-1.5 flex flex-col justify-between bg-slate-50/80 text-[9px]">
                              <div>
                                <span className="font-bold text-slate-900 block">القائم بالصرف الميداني:</span>
                                <span className="font-extrabold text-teal-900 truncate block">{researcherName}</span>
                              </div>
                              <div className="border-t border-slate-200 pt-0.5 flex justify-between items-center text-[8px] text-slate-600">
                                <span>التاريخ: .... / .... / 2026</span>
                                <span>التوقيع: .........</span>
                              </div>
                            </div>
                          </div>

                          {/* Micro Footnote */}
                          <div className="text-[7px] text-slate-400 text-center border-t border-slate-100 pt-0.5">
                            وثيقة صرف رسمية صادرة بموجب لائحة النظام الأساسي لجمعية إحسان. تحفظ أصول القسائم لدى أمانة الصندوق لتسوية عهدة الباحث.
                          </div>
                        </div>

                        {/* Quiet Dashed Cutting Line with Scissor Icon Only (No Text) */}
                        {slipIndex < chunk.length - 1 && (
                          <div
                            className="relative my-1.5 border-b border-dashed border-slate-400 text-center select-none"
                            style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                          >
                            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-white px-2 text-xs text-slate-500 font-mono">
                              ✂️
                            </span>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
}
