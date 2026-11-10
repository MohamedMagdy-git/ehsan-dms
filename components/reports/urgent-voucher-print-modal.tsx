'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  X,
  ShieldCheck,
  User,
} from 'lucide-react';
import { FastTrackDisbursementOrder } from '@/types';
import { tafqeetNumberToArabicWords } from '@/lib/tafqeet';

export interface UrgentVoucherPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: FastTrackDisbursementOrder | null;
  availableOrders?: FastTrackDisbursementOrder[];
  onSelectOrder?: (order: FastTrackDisbursementOrder) => void;
}

export function UrgentVoucherPrintModal({
  isOpen,
  onClose,
  order,
  availableOrders = [],
  onSelectOrder,
}: UrgentVoucherPrintModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Keyboard shortcut: Esc to close, Ctrl+P to print
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const tafqeetText = order?.amount
    ? tafqeetNumberToArabicWords(order.amount)
    : 'صفر جنيه مصري لا غير';

  const printDateStr = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (!isOpen || !order || !mounted) return null;

  const modalJSX = (
    <div
      id="urgent-voucher-print-root"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-start p-2 sm:p-4 print:p-0 print:bg-white print:overflow-visible print:static print:inset-auto print:block print:w-full print:h-auto"
      dir="rtl"
    >
      {/* Strict Official A4 Portrait Print Styling */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: A4 portrait;
              margin: 12mm;
            }
            @media print {
              html, body {
                background: #ffffff !important;
                color: #0f172a !important;
                margin: 0 !important;
                padding: 0 !important;
                font-family: inherit;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print, [data-no-print="true"] {
                display: none !important;
              }
              #urgent-voucher-print-root {
                position: static !important;
                background: transparent !important;
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
                box-shadow: none !important;
                display: block !important;
              }
              .official-voucher-sheet {
                box-shadow: none !important;
                border: 2px solid #0f172a !important;
                border-radius: 0 !important;
                padding: 7mm 8mm !important;
                margin: 0 auto !important;
                width: 100% !important;
                max-width: 100% !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `,
        }}
      />

      {/* Screen-Only Control Toolbar (Hidden during Print) */}
      <div className="no-print w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-200 p-3 sm:p-4 mb-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sticky top-2 z-60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center shrink-0">
            <Printer size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                إذن الصرف المالي الفوري المعتمد
              </h2>
              <span className="text-[11px] font-mono font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded">
                {order.voucherCode}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              مستند مالي A4 رسمي مجهز للطباعة والتوقيعات والاعتماد الرقابي
            </p>
          </div>
        </div>

        {/* Quick order switcher if multiple orders provided */}
        <div className="flex items-center gap-2">
          {availableOrders.length > 1 && onSelectOrder && (
            <select
              value={order.id}
              onChange={(e) => {
                const found = availableOrders.find((o) => o.id === e.target.value);
                if (found) onSelectOrder(found);
              }}
              className="bg-slate-100 border border-slate-300 text-slate-800 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              {availableOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.voucherCode} - {o.beneficiaryPrimaryName} ({o.amount.toLocaleString('ar-EG')} ج.م)
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => window.print()}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer active:scale-95"
          >
            <Printer size={15} />
            <span>طباعة الإذن (A4)</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="إغلاق النافذة (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Printable Document Area (A4 Sheet Simulation) */}
      <div className="official-voucher-sheet w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-300 p-6 sm:p-8 text-slate-900 relative space-y-4">
        {/* 1. Header (الترويسة الرسمية) */}
        <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between gap-4">
          {/* Right side: Society Branding & Legal Details */}
          <div className="space-y-1">
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-950 tracking-tight leading-tight">
                جمعية إحسان للتكافل والتنمية الاجتماعية
              </h1>
              <p className="text-[11px] text-slate-600 font-medium">
                مشهرة برقم 4829 لسنة 2018 - وزارة التضامن الاجتماعي
              </p>
            </div>
            <div className="text-[11px] text-teal-900 font-bold flex items-center gap-1.5 pt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
              <span>إدارة المساعدات الاجتماعية والإغاثة العاجلة · وحدة التبرعات المقيدة</span>
            </div>
          </div>

          {/* Left side: Voucher Code, Barcode, & Timestamps */}
          <div className="text-left font-mono border-2 border-slate-900 p-2 rounded-lg bg-slate-50/80 min-w-[155px] print:bg-transparent">
            <div className="flex items-center justify-between text-xs font-black text-slate-950">
              <span className="text-[10px] text-slate-500 font-sans">كود الإذن:</span>
              <span className="tracking-wider">{order.voucherCode}</span>
            </div>

            {/* Crisp High-Contrast Barcode graphic */}
            <div
              className="h-7 w-full bg-white border border-slate-400 flex items-center justify-between px-1 my-1.5 overflow-hidden"
              title={order.voucherCode}
            >
              <span className="w-1.5 h-full bg-slate-900" />
              <span className="w-0.5 h-full bg-slate-900" />
              <span className="w-2 h-full bg-slate-900" />
              <span className="w-0.5 h-full bg-white" />
              <span className="w-1 h-full bg-slate-900" />
              <span className="w-2.5 h-full bg-slate-900" />
              <span className="w-0.5 h-full bg-slate-900" />
              <span className="w-1.5 h-full bg-white" />
              <span className="w-2 h-full bg-slate-900" />
              <span className="w-1 h-full bg-slate-900" />
              <span className="w-0.5 h-full bg-slate-900" />
              <span className="w-1.5 h-full bg-slate-900" />
              <span className="w-0.5 h-full bg-white" />
              <span className="w-2 h-full bg-slate-900" />
              <span className="w-1 h-full bg-slate-900" />
            </div>

            <div className="text-[10px] text-slate-600 font-sans space-y-0.5">
              <div className="flex justify-between">
                <span>تاريخ التحرير:</span>
                <span className="font-mono font-bold text-slate-900">{order.issuedDate}</span>
              </div>
              <div className="flex justify-between text-rose-700 font-bold">
                <span>مهلة التسليم:</span>
                <span className="font-mono">{order.dueDeadlineDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Identifying Title Block (البلوك التعريفي) */}
        <div className="text-center py-2 px-3 bg-slate-100 rounded-lg border border-slate-300">
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-wide">
            إذن صرف مالي فوري - مساعدات مقيدة ومشروطة
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-700 mt-1 font-medium">
            <span>
              مصرف الصرف الشرعي:{' '}
              <strong className="text-teal-900 font-bold">{order.shariaCategoryName}</strong>
            </span>
            <span className="text-slate-400">·</span>
            <span>
              رقم القيد الدفتري:{' '}
              <strong className="font-mono text-slate-900 font-bold">
                {order.manualReceiptNo || order.deliveryReceiptNo || 'قيد فوري معتمد'}
              </strong>
            </span>
            {order.donorName && (
              <>
                <span className="text-slate-400">·</span>
                <span>
                  مخصص بموجب إهداء المتبرع:{' '}
                  <strong className="text-slate-900 font-bold">{order.donorName}</strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* 3. Financial Amount Block (كتلة المبلغ المالي والتفقيط) */}
        <div className="border-2 border-slate-900 rounded-xl p-3 sm:p-4 bg-slate-50/50 print:bg-white space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-300 pb-2.5">
            <span className="text-xs sm:text-sm font-bold text-slate-800">
              المبلغ المصرح بصرفه نقداً للمستحق:
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-950 font-mono tracking-tight">
                {order.amount.toLocaleString('ar-EG')}
              </span>
              <span className="text-sm font-bold text-slate-800">جنيه مصري فقط</span>
            </div>
          </div>

          {/* Tafqeet in safe, enclosed financial strip */}
          <div className="bg-white border-2 border-slate-800 px-3 py-2 rounded-lg flex items-center justify-between text-xs sm:text-sm font-bold text-slate-950">
            <span className="text-slate-600 text-xs shrink-0 font-medium">التفقيط المالي الرسمي:</span>
            <span className="text-teal-950 font-black text-center flex-1 px-2">
              {tafqeetText}
            </span>
          </div>
        </div>

        {/* 4. Beneficiary & Purpose Block (بيانات المستفيد والغرض الميداني) */}
        <div className="border border-slate-400 rounded-xl overflow-hidden bg-white">
          <div className="bg-slate-800 text-white px-3 py-1.5 flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <User size={14} className="text-amber-300" />
              <span>بيانات المستفيد المعتمدة وموجبات الصرف الميداني</span>
            </div>
            <span className="text-[11px] font-mono text-slate-300">
              كود الحالة: {order.caseCode}
            </span>
          </div>

          <div className="p-3.5 text-xs text-slate-800 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              {/* Beneficiary Name */}
              <div className="flex items-start gap-1.5">
                <span className="text-slate-500 min-w-[110px] font-medium shrink-0">اسم المستفيد الأساسي:</span>
                <span className="font-bold text-slate-950 text-sm">{order.beneficiaryPrimaryName}</span>
              </div>

              {/* Alias / Secondary */}
              <div className="flex items-start gap-1.5">
                <span className="text-slate-500 min-w-[110px] font-medium shrink-0">اسم الشهرة / البديل:</span>
                <span className="font-bold text-teal-900">
                  {order.beneficiarySecondaryName || 'لا يوجد (المستفيد الأصيل)'}
                </span>
              </div>

              {/* National ID - 14 digits Monospace without clipping */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 min-w-[110px] font-medium shrink-0">الرقم القومي (14 رقماً):</span>
                <span className="font-mono font-black text-sm tracking-widest text-slate-950 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                  {order.beneficiaryNationalId}
                </span>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 min-w-[110px] font-medium shrink-0">رقم الهاتف للتواصل:</span>
                <span className="font-mono font-bold text-slate-900" dir="ltr">
                  {order.beneficiaryPhone}
                </span>
              </div>

              {/* Address */}
              <div className="sm:col-span-2 flex items-start gap-1.5 pt-1 border-t border-slate-100">
                <span className="text-slate-500 min-w-[110px] font-medium shrink-0">العنوان ومحل الإقامة:</span>
                <span className="font-semibold text-slate-900">{order.beneficiaryAddress}</span>
              </div>

              {/* Purpose / Urgent Cause */}
              <div className="sm:col-span-2 flex items-start gap-1.5 pt-1 border-t border-slate-100">
                <span className="text-slate-500 min-w-[110px] font-medium shrink-0">الغرض والمصرف المشروط:</span>
                <div className="font-bold text-slate-900 bg-amber-50/60 p-2 rounded-lg border border-amber-200/80 flex-1 leading-relaxed">
                  {order.purposeNote}
                </div>
              </div>

              {/* Meta details */}
              <div className="sm:col-span-2 flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                <div>
                  <span>المسؤول المعتمد للإصدار: </span>
                  <strong className="text-slate-800">{order.issuedBy}</strong>
                </div>
                <div>
                  <span>الباحث الميداني المكلف بالتسليم: </span>
                  <strong className="text-teal-900">{order.assignedResearcher}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Signatures & Regulatory Audit Strip (شريط التوقيعات والاعتمادات الرقابية - 4 خانات متوازنة) */}
        <div className="pt-2 print:break-inside-avoid">
          <div className="text-center mb-2">
            <h3 className="text-xs font-black text-slate-900 inline-block border-b-2 border-slate-900 pb-0.5">
              التوقيعات والاعتمادات الرسمية الرباعية (إلزامية للرقابة المالية الميدانية)
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-right text-xs">
            {/* Box 1: Beneficiary Receipt & Live Fingerprint */}
            <div className="border-2 border-slate-800 rounded-xl p-2.5 bg-slate-50/60 print:bg-white flex flex-col justify-between min-h-[145px]">
              <div>
                <div className="font-black text-slate-950 border-b border-slate-300 pb-1 text-center text-xs">
                  (1) إقرار المستلم والمستفيد
                </div>
                <p className="text-[10px] text-slate-600 mt-1 leading-tight text-justify">
                  أقر أنا الموقع أدناه باستلام كامل المبلغ المذكور نقداً للغرض المبين.
                </p>
              </div>

              <div className="space-y-1 text-[11px] text-slate-800">
                <div className="flex justify-between items-center text-[10px]">
                  <span>التوقيع:</span>
                  <span className="text-slate-400">........................</span>
                </div>
                {/* Fingerprint Box */}
                <div className="border border-dashed border-slate-600 rounded-lg p-1 text-center bg-white">
                  <span className="text-[9px] text-slate-500 block">موضع البصمة الحية</span>
                  <div className="h-6" />
                </div>
              </div>
            </div>

            {/* Box 2: Field Researcher / Disbursement Officer */}
            <div className="border-2 border-slate-800 rounded-xl p-2.5 bg-slate-50/60 print:bg-white flex flex-col justify-between min-h-[145px]">
              <div>
                <div className="font-black text-slate-950 border-b border-slate-300 pb-1 text-center text-xs">
                  (2) الباحث الميداني المسلّم
                </div>
                <p className="text-[10px] text-slate-600 mt-1 leading-tight">
                  أشهد بتمام المعاينة الميدانية وتسليم الإعانة يداً بيد لمستحقها.
                </p>
              </div>

              <div className="space-y-1 text-[10.5px] text-slate-800">
                <div className="text-[10px]">
                  <span className="text-slate-500">الاسم: </span>
                  <span className="font-bold text-slate-900">{order.assignedResearcher}</span>
                </div>
                <div className="text-[10px]">التاريخ: ___ / ___ / 2026</div>
                <div className="flex justify-between items-center text-[10px]">
                  <span>التوقيع:</span>
                  <span className="text-slate-400">........................</span>
                </div>
              </div>
            </div>

            {/* Box 3: Treasurer / Financial Officer */}
            <div className="border-2 border-slate-800 rounded-xl p-2.5 bg-slate-50/60 print:bg-white flex flex-col justify-between min-h-[145px]">
              <div>
                <div className="font-black text-slate-950 border-b border-slate-300 pb-1 text-center text-xs">
                  (3) أمين الصندوق / المالية
                </div>
                <p className="text-[10px] text-slate-600 mt-1 leading-tight">
                  تم الصرف الفوري والخصم دفترياً من رصيد الصندوق المقيد المعتمد.
                </p>
              </div>

              <div className="space-y-1 text-[10.5px] text-slate-800">
                <div className="text-[10px]">
                  <span className="text-slate-500">المسؤول: </span>
                  <span className="font-bold text-slate-900">أ. محمود صبري</span>
                </div>
                <div className="text-[10px]">سند القيد: ....................</div>
                <div className="flex justify-between items-center text-[10px]">
                  <span>التوقيع:</span>
                  <span className="text-slate-400">........................</span>
                </div>
              </div>
            </div>

            {/* Box 4: Executive Approval & Official Stamp Area */}
            <div className="border-2 border-slate-800 rounded-xl p-2.5 bg-slate-50/60 print:bg-white flex flex-col justify-between min-h-[145px]">
              <div>
                <div className="font-black text-slate-950 border-b border-slate-300 pb-1 text-center text-xs">
                  (4) اعتماد الإدارة والخاتم
                </div>
                <p className="text-[10px] text-slate-600 mt-1 leading-tight">
                  يُعتمد الصرف الفوري طبقاً للضوابط الشرعية ولائحة المساعدات.
                </p>
              </div>

              <div className="space-y-1 text-center">
                <div className="text-[10px] text-slate-700">التوقيع: ....................</div>
                {/* Official Oval Stamp Area */}
                <div className="border-2 border-dashed border-teal-800/80 rounded-full py-1 px-2 mx-auto w-24 bg-white print:border-slate-800">
                  <span className="text-[8.5px] font-bold text-teal-950 print:text-slate-900 block leading-tight">
                    خاتم الجمعية
                  </span>
                  <span className="text-[7.5px] text-slate-500 block">إحسان المشهرة</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Regulatory Footer Note */}
        <div className="border-t border-slate-300 pt-2 text-center text-[10px] text-slate-500 space-y-0.5">
          <p className="font-medium text-slate-700">
            مستند مالي وإداري رسمي خاضع لإشراف ورقابة وزارة التضامن الاجتماعي والمراجعة المحاسبية القانونية
          </p>
          <p className="text-[9px] text-slate-400">
            صدر آلياً من منظومة إحسان لإدارة التبرعات والمساعدات · لا يُعتد بالإذن إلا بتمام التوقيعات الأربعة وخاتم الجمعية الرسمي · طُبع بتاريخ: {printDateStr}
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
}
