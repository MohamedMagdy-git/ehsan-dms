'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { MonthlyAllocation, BeneficiaryCase, AllocationItem } from '@/types';
import { tafqeetNumberToArabicWords } from '@/lib/tafqeet';

interface QuickFieldDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  allocation: MonthlyAllocation;
  cases: BeneficiaryCase[];
  researcherName: string;
  fieldNotes: Record<string, string>;
}

function formatBeneficiaryDisplayName(caseObj?: BeneficiaryCase, fallbackName?: string): string {
  if (!caseObj) return fallbackName || 'غير محدد';
  const primary = caseObj.primaryName || caseObj.fullName;
  if (caseObj.secondaryName && caseObj.secondaryName.trim()) {
    return `${primary} (${caseObj.secondaryName.trim()})`;
  }
  return primary;
}

export function QuickFieldDeliveryModal({
  isOpen,
  onClose,
  allocation,
  cases,
  researcherName,
  fieldNotes,
}: QuickFieldDeliveryModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const caseMap = useMemo(() => {
    const map = new Map<string, BeneficiaryCase>();
    cases.forEach((c) => map.set(c.id, c));
    return map;
  }, [cases]);

  // الحالات الميدانية المستحقة للصرف (غير المستبعدة ولها مبلغ مقرر)
  const items = useMemo(() => {
    let list = allocation.items.filter((item) => !item.isExcluded && item.approvedAmount > 0);
    if (researcherName !== 'all') {
      list = list.filter((item) => {
        const c = caseMap.get(item.caseId);
        return c && c.assignedResearcher === researcherName;
      });
    }
    return list;
  }, [allocation.items, researcherName, caseMap]);

  const totalCustody = useMemo(
    () => items.reduce((sum, item) => sum + item.approvedAmount, 0),
    [items]
  );

  const batchTitle = allocation.batchTitle || allocation.periodLabel;
  const executionDate =
    allocation.executionDate ||
    new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  // تحديد اسم النطاق أو الباحث لعنوان الترويسة
  const scopeLabel = useMemo(() => {
    if (researcherName === 'all') return 'كافة المناطق';
    // البحث عن الحي/القرية أو اسم الباحث
    const firstCase = items[0] ? caseMap.get(items[0].caseId) : null;
    return firstCase?.district || researcherName;
  }, [researcherName, items, caseMap]);

  // تقسيم قائمة الحالات إلى عمودين متجاورين (Two-column split) لتوفير الورق في A4
  const { col1Items, col2Items } = useMemo(() => {
    const mid = Math.ceil(items.length / 2);
    return {
      col1Items: items.slice(0, mid),
      col2Items: items.slice(mid),
    };
  }, [items]);

  if (!isOpen || !mounted) return null;

  const renderTableColumn = (columnItems: AllocationItem[], startIndex: number) => {
    return (
      <table className="w-full text-right border-collapse text-xs">
        <thead>
          <tr className="bg-slate-100 text-slate-900 border-b-2 border-slate-900 font-black">
            <th className="py-1.5 px-2.5 border border-slate-400">الاسم والملاحظة الميدانية</th>
            <th className="py-1.5 px-2 text-center w-24 border border-slate-400 whitespace-nowrap">المبلغ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-300">
          {columnItems.map((item, idx) => {
            const caseObj = caseMap.get(item.caseId);
            const displayName = formatBeneficiaryDisplayName(caseObj, item.caseName);
            const noteText = fieldNotes[item.id] !== undefined
              ? fieldNotes[item.id]
              : item.reasoning;
            const globalIndex = startIndex + idx + 1;

            return (
              <tr key={item.id} className="border-b border-slate-300 hover:bg-slate-50/50 print:hover:bg-transparent">
                {/* الاسم والملاحظة في خانة مدمجة واحدة */}
                <td className="py-1.5 px-2.5 border border-slate-300 align-top">
                  <div className="font-bold text-slate-950 text-xs flex items-baseline gap-1">
                    <span className="font-mono text-slate-500 font-normal text-[11px] shrink-0">#{globalIndex}.</span>
                    <span>{displayName}</span>
                  </div>
                  {noteText && noteText.trim() && (
                    <div className="text-[10px] text-slate-800 font-semibold bg-amber-50/90 print:bg-transparent p-1 rounded mt-0.5 border border-amber-200 print:border-none print:p-0 print:text-black leading-tight">
                      📌 {noteText}
                    </div>
                  )}
                </td>

                {/* المبلغ المقرر صرفه كبير وواضح */}
                <td className="py-1.5 px-2 border border-slate-300 text-center font-mono font-black text-sm text-slate-950 whitespace-nowrap bg-slate-50/30 print:bg-transparent align-middle">
                  {item.approvedAmount.toLocaleString('ar-EG')}
                  <span className="text-[10px] font-bold text-slate-500 mr-1 print:text-black">ج.م</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const modalJSX = (
    <div
      id="quick-delivery-modal-root"
      className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-start p-2 sm:p-4 print:p-0 print:bg-white print:overflow-visible print:static print:inset-auto print:block print:w-full print:h-auto"
      dir="rtl"
    >
      {/* إعدادات الطباعة A4 Portrait مع عمودين متجاورين لتوفير الورق */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 6mm 6mm 6mm 6mm;
              }
              body {
                background: white !important;
                color: black !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print {
                display: none !important;
              }
              .print-sheet {
                box-shadow: none !important;
                border: none !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
              }
              table {
                width: 100% !important;
                border-collapse: collapse !important;
              }
              th, td {
                border: 1.2px solid #1e293b !important;
              }
            }
          `,
        }}
      />

      {/* شريط التحكم للشاشة فقط */}
      <div className="no-print w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 mb-3 flex flex-col sm:flex-row items-center justify-between gap-3 sticky top-2 z-70">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center shrink-0">
            <Printer size={20} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <span>كشف الصرف الميداني السريع (شيت الباحث العملي)</span>
              <span className="text-[11px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-bold">
                {items.length} حالة · عمودين A4
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              قائمة مختصرة ومركزة ومقسمة على عمودين لتوفير الورق وسرعة الحركة بالشارع
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-[#005756] hover:bg-[#004241] text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer size={15} />
            <span>طباعة الشيت الميداني (Ctrl + P)</span>
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

      {/* ورقة الكشف الميداني الفعلية A4 */}
      <div className="print-sheet w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-200 p-5 sm:p-6 space-y-3 text-slate-900">
        {/* 1. الترويسة العلوية العريضة والمباشرة */}
        <div className="border-b-2 border-slate-900 pb-2 text-center">
          <h1 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">
            {batchTitle} - {scopeLabel} - إجمالي: {totalCustody.toLocaleString('ar-EG')} ج.م
          </h1>
          <div className="text-xs font-bold text-slate-700 mt-1 flex items-center justify-center gap-2 flex-wrap">
            <span>الباحث المسؤول: {researcherName === 'all' ? 'كافة الباحثين' : researcherName}</span>
            <span>·</span>
            <span>تاريخ التوزيع: {executionDate}</span>
            <span>·</span>
            <span>عدد الحالات: {items.length} حالة</span>
          </div>
        </div>

        {/* 2. جدول الحالات على عمودين متجاورين (Two-column split) */}
        {items.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-bold text-xs">
            لا توجد حالات مستحقة للصرف مطابقة للمحددات المختارة
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-3.5 print:gap-2.5 items-start">
            {/* العمود الأول */}
            <div className="overflow-hidden">
              {renderTableColumn(col1Items, 0)}
            </div>

            {/* العمود الثاني */}
            <div className="overflow-hidden">
              {col2Items.length > 0 ? (
                renderTableColumn(col2Items, col1Items.length)
              ) : (
                <div className="p-4 text-center text-slate-400 text-xs border border-dashed border-slate-300 rounded-xl print:hidden">
                  (اكتمال الحالات في العمود الأول)
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. شريط ملخص سفلي نظيف بدون إقرارات أو خانات بصمة */}
        <div className="border-t-2 border-slate-900 pt-2 flex items-center justify-between text-xs font-black text-slate-950 mt-2">
          <div>
            إجمالي الحالات: <span className="font-mono">{items.length}</span> حالة
          </div>
          <div className="text-left font-mono">
            إجمالي المبلغ: {totalCustody.toLocaleString('ar-EG')} ج.م ({tafqeetNumberToArabicWords(totalCustody)})
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
}
