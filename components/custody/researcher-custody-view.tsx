'use client';

import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '@/context/auth-context';
import { useApp } from '@/context/app-context';
import { useScopedData } from '@/hooks/use-scoped-data';
import { useToast } from '@/context/toast-context';
import { CustodyDeliveryItem } from '@/types';
import {
  copyTextToClipboard,
  getEffectivePayoutMethod,
  getPayoutMethodLabel,
} from '@/lib/payout-helpers';
import {
  Banknote,
  Check,
  CheckCircle2,
  Copy,
  MapPin,
  Phone,
  Printer,
  Smartphone,
  Wallet,
  X,
} from 'lucide-react';

type CustodyFilterTab = 'all' | 'pending' | 'delivered';

function getSanitizedTelHref(phone?: string): string | null {
  const cleaned = (phone || '').replace(/[^\d+]/g, '');
  return cleaned ? `tel:${cleaned}` : null;
}

export function ResearcherCustodyView() {
  const { user } = useAuth();
  const { confirmCustodyItemDelivered, openCaseDetails } = useApp();
  const { scopedCustodyItems, researcherMetrics, latestApprovedCycle } =
    useScopedData();
  const { toast } = useToast();
  const prefersReducedMotion = useReducedMotion();

  const [filterTab, setFilterTab] = useState<CustodyFilterTab>('all');
  const [isPrintSheetOpen, setIsPrintSheetOpen] = useState(false);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);

  const handleCopyWallet = async (itemId: string, walletNumber: string) => {
    const ok = await copyTextToClipboard(walletNumber);
    if (ok) {
      setCopiedItemId(itemId);
      toast.success('تم نسخ رقم المحفظة الإلكترونية');
      setTimeout(() => {
        setCopiedItemId((prev) => (prev === itemId ? null : prev));
      }, 2000);
    } else {
      toast.error('تعذر نسخ الرقم تلقائياً');
    }
  };

  const sortedItems = useMemo(() => {
    return [...scopedCustodyItems].sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'pending_delivery' ? -1 : 1;
      }
      return b.amount - a.amount;
    });
  }, [scopedCustodyItems]);

  const filteredItems = useMemo(() => {
    if (filterTab === 'pending') {
      return sortedItems.filter((item) => item.status === 'pending_delivery');
    }
    if (filterTab === 'delivered') {
      return sortedItems.filter((item) => item.status === 'delivered');
    }
    return sortedItems;
  }, [sortedItems, filterTab]);

  const handleConfirmDelivery = (item: CustodyDeliveryItem) => {
    if (item.status === 'delivered') return;
    confirmCustodyItemDelivered(item);
    toast.success(
      `تم تأكيد تسليم ${item.amount.toLocaleString('ar-EG')} ج.م لـ ${item.caseName} بنجاح`
    );
  };

  const todayFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('ar-EG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }, []);

  const totalCount = scopedCustodyItems.length;
  const deliveredCount = researcherMetrics.deliveredCustodyCount;
  const remainingCount = researcherMetrics.approvedReadyForDeliveryCount;

  const sectionTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: 'easeOut' as const };

  return (
    <>
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={sectionTransition}
        className="space-y-4 sm:space-y-5 w-full min-w-0"
      >
        {/* 1. بطاقة ملخص العهدة الميدانية الهادئة */}
        <section className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                كشف عهدتي للتسليم الميداني
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                المستحقات المعتمدة المسندة باسمك فقط ({user.name})
                {latestApprovedCycle
                  ? ` • ${latestApprovedCycle.batchTitle || latestApprovedCycle.periodLabel}`
                  : ''}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsPrintSheetOpen(true)}
              disabled={scopedCustodyItems.length === 0}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 text-xs sm:text-sm font-semibold text-white bg-[#005756] hover:bg-[#004241] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Printer size={16} className="shrink-0" aria-hidden="true" />
              <span>طباعة كشف العهدة (A4 RTL)</span>
            </button>
          </div>

          {/* شريط أرقام الملخص المسطح بفاصل حدود دقيقة (بدون بطاقات متداخلة) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3.5 border-t border-slate-200/80">
            <div className="min-w-0">
              <span className="text-xs text-slate-500 block">
                إجمالي العهدة المعتمدة
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums">
                  {researcherMetrics.totalCustodyAmount.toLocaleString('ar-EG')}
                </span>
                <span className="text-xs text-slate-500">ج.م</span>
              </div>
            </div>

            <div className="min-w-0">
              <span className="text-xs text-slate-500 block">
                المتبقي للتسليم حالياً
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-bold text-[#005756] tabular-nums">
                  {researcherMetrics.totalActiveCustodyAmount.toLocaleString(
                    'ar-EG'
                  )}
                </span>
                <span className="text-xs text-slate-500">ج.م</span>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 min-w-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <span className="text-xs text-slate-500 block">
                موقف تسليم الحالات
              </span>
              <div className="mt-1 flex items-center flex-wrap gap-2 text-xs font-semibold tabular-nums">
                <span className="text-slate-900">
                  تم تسليم {deliveredCount} من {totalCount}
                </span>
                <span className="text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span className="text-[#005756]">
                  متبقي {remainingCount}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. قائمة المستحقين المسطحة (Zero Cards-Within-Cards) */}
        <section className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden">
          <div className="px-4 py-3.5 sm:px-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Wallet
                size={17}
                className="text-slate-400 shrink-0"
                aria-hidden="true"
              />
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                قائمة المستحقين في عهدتك ({totalCount})
              </h2>
            </div>

            <div
              role="tablist"
              aria-label="تصفية كشف العهدة"
              className="grid grid-cols-3 sm:inline-grid p-1 bg-slate-100/90 border border-slate-200/80 rounded-xl shrink-0"
            >
              <button
                type="button"
                role="tab"
                aria-selected={filterTab === 'all'}
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  filterTab === 'all'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                الكل ({totalCount})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filterTab === 'pending'}
                onClick={() => setFilterTab('pending')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  filterTab === 'pending'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                متبقي ({remainingCount})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filterTab === 'delivered'}
                onClick={() => setFilterTab('delivered')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  filterTab === 'delivered'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                مُسلّم ({deliveredCount})
              </button>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={22} aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {filterTab === 'pending'
                  ? 'تم تسليم كل عهدتك الميدانية بنجاح'
                  : filterTab === 'delivered'
                  ? 'لسه مفيش حالات تم تأكيد تسليمها'
                  : 'مفيش مستحقات معتمدة في عهدتك حالياً'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                أول ما الإدارة تعتمد دورة صرف شهرية جديدة لحالاتك هتظهر هنا فوراً جاهزة للتسليم.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200/80">
              {filteredItems.map((item) => {
                const telHref = getSanitizedTelHref(item.beneficiaryPhone);
                const isDelivered = item.status === 'delivered';

                return (
                  <li
                    key={item.id}
                    className="px-4 py-3.5 sm:px-5 sm:py-4 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* بيانات المستحق */}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openCaseDetails(item.caseId)}
                            className="text-sm font-semibold text-slate-900 hover:text-[#005756] transition-colors text-right cursor-pointer truncate max-w-full"
                          >
                            {item.caseName}
                          </button>
                          <span className="text-[11px] font-medium text-slate-400 tabular-nums shrink-0">
                            {item.caseCode}
                          </span>
                          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 truncate max-w-full">
                            {item.sourceLabel}
                          </span>
                        </div>

                        <div className="flex items-start gap-1.5 text-xs text-slate-500 min-w-0">
                          <MapPin
                            size={14}
                            className="text-slate-400 shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <span className="line-clamp-2 sm:truncate">
                            {item.district ? `${item.district} — ` : ''}
                            {item.beneficiaryAddress}
                          </span>
                        </div>

                        {/* طريقة الاستلام ورقم المحفظة مع زر النسخ السريع */}
                        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                          {getEffectivePayoutMethod(item.payoutMethod) === 'e_wallet' &&
                          item.walletNumber ? (
                            <>
                              <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                                <Smartphone
                                  size={13}
                                  className="text-[#005756] shrink-0"
                                  aria-hidden="true"
                                />
                                <span>{getPayoutMethodLabel(item.payoutMethod)}:</span>
                                <span
                                  dir="ltr"
                                  className="font-mono tabular-nums font-semibold text-slate-900"
                                >
                                  {item.walletNumber}
                                </span>
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyWallet(item.id, item.walletNumber || '')
                                }
                                aria-label={`نسخ رقم محفظة ${item.caseName}`}
                                title="نسخ رقم المحفظة"
                                className="inline-flex items-center gap-1 min-h-[32px] px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-[#005756]/40 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 hover:text-[#005756] transition-colors cursor-pointer shrink-0"
                              >
                                {copiedItemId === item.id ? (
                                  <>
                                    <Check
                                      size={13}
                                      className="text-[#005756] shrink-0"
                                      aria-hidden="true"
                                    />
                                    <span className="text-[#005756]">تم النسخ</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy
                                      size={13}
                                      className="text-slate-400 shrink-0"
                                      aria-hidden="true"
                                    />
                                    <span>نسخ الرقم</span>
                                  </>
                                )}
                              </button>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-slate-500">
                              <Banknote
                                size={13}
                                className="text-slate-400 shrink-0"
                                aria-hidden="true"
                              />
                              <span>{getPayoutMethodLabel(item.payoutMethod)}</span>
                            </span>
                          )}
                        </div>

                        {item.purposeNote && (
                          <p className="text-xs text-slate-500 truncate">
                            {item.purposeNote}
                          </p>
                        )}
                      </div>

                      {/* المبلغ وأدوات التواصل والتأكيد */}
                      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm sm:text-base font-bold text-[#005756] tabular-nums whitespace-nowrap">
                            {item.amount.toLocaleString('ar-EG')}{' '}
                            <span className="text-[11px] font-medium text-slate-500">
                              ج.م
                            </span>
                          </span>

                          {telHref && (
                            <a
                              href={telHref}
                              title={`اتصال بـ ${item.caseName}`}
                              aria-label={`اتصال هاتفي بالمستحق ${item.caseName}`}
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#005756] hover:bg-slate-100/80 transition-colors"
                            >
                              <Phone size={17} aria-hidden="true" />
                            </a>
                          )}
                        </div>

                        {isDelivered ? (
                          <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold whitespace-nowrap">
                            <CheckCircle2
                              size={15}
                              className="text-[#005756] shrink-0"
                              aria-hidden="true"
                            />
                            <span>تم التسليم</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleConfirmDelivery(item)}
                            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-[#005756] hover:bg-[#004241] active:scale-[0.98] rounded-xl transition-all cursor-pointer whitespace-nowrap"
                          >
                            <CheckCircle2
                              size={15}
                              className="shrink-0"
                              aria-hidden="true"
                            />
                            <span>تأكيد التسليم للمستحق</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </motion.div>

      {/* نافذة معاينة وطباعة كشف العهدة الرسمي (A4 RTL) معزولة بالكامل عبر #custody-modal-root */}
      {isPrintSheetOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            id="custody-modal-root"
            dir="rtl"
            className="fixed inset-0 z-70 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:bg-white print:p-0 print:block"
          >
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden print:border-0 print:rounded-none print:max-h-none print:max-w-none print:block">
              {/* شريط التحكم العلوي (يختفي تلقائياً عند الطباعة) */}
              <div className="no-print px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    معاينة كشف العهدة الميدانية للطباعة (A4 RTL)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    كشف رسمي موجه للباحث ({user.name}) ومجهز بخانات توقيع الاستلام والاعتماد
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#005756] hover:bg-[#004241] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    <Printer size={15} aria-hidden="true" />
                    <span>طباعة الآن</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrintSheetOpen(false)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
                    aria-label="إغلاق المعاينة"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* المستند الرسمي القابل للطباعة (A4 RTL) */}
              <div
                id="printable-area"
                className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white text-slate-900 space-y-6 print:p-4 print:overflow-visible"
              >
                {/* ترويسة المستند الرسمية */}
                <div className="border-b-2 border-[#005756] pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <h1 className="text-lg font-bold text-[#005756]">
                      منظومة إحسان — كشف تسليم عهدة الباحث الميداني
                    </h1>
                    <p className="text-xs text-slate-600 mt-1">
                      بيان رسمي بالمستحقات النقدية المعتمدة للتسليم للأسر المستحقة
                    </p>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1 sm:text-left">
                    <div>
                      <span className="font-semibold text-slate-800">
                        تاريخ الاستخراج:{' '}
                      </span>
                      <span>{todayFormatted}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">
                        الباحث المسؤول:{' '}
                      </span>
                      <span>{user.name}</span>
                    </div>
                  </div>
                </div>

                {/* ملخص مالي مختصر */}
                <div className="grid grid-cols-3 gap-3 border border-slate-200 rounded-xl p-3.5 text-xs">
                  <div>
                    <span className="text-slate-500 block">عدد المستحقين</span>
                    <strong className="text-sm text-slate-900 tabular-nums mt-0.5 block">
                      {totalCount} أسرة
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">
                      إجمالي قيمة الكشف
                    </span>
                    <strong className="text-sm text-[#005756] tabular-nums mt-0.5 block">
                      {researcherMetrics.totalCustodyAmount.toLocaleString(
                        'ar-EG'
                      )}{' '}
                      ج.م
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">الموقف الحالي</span>
                    <strong className="text-sm text-slate-900 tabular-nums mt-0.5 block">
                      {deliveredCount} مُسلّم · {remainingCount} متبقي
                    </strong>
                  </div>
                </div>

                {/* جدول المستحقين بخانة توقيع وبصمة المستلم */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800">
                        <th className="border border-slate-300 px-2.5 py-2 text-center w-9">
                          م
                        </th>
                        <th className="border border-slate-300 px-3 py-2 text-right">
                          اسم المستحق والكود
                        </th>
                        <th className="border border-slate-300 px-3 py-2 text-right">
                          المنطقة والهاتف
                        </th>
                        <th className="border border-slate-300 px-3 py-2 text-right">
                          المصدر / الدفعة
                        </th>
                        <th className="border border-slate-300 px-3 py-2 text-center">
                          المبلغ (ج.م)
                        </th>
                        <th className="border border-slate-300 px-3 py-2 text-center w-24">
                          الحالة
                        </th>
                        <th className="border border-slate-300 px-3 py-2 text-center w-32">
                          توقيع المستحق
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedItems.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="border border-slate-300 px-2.5 py-2.5 text-center tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="border border-slate-300 px-3 py-2.5">
                            <div className="font-semibold text-slate-900">
                              {item.caseName}
                            </div>
                            <div className="text-[11px] text-slate-500 tabular-nums">
                              {item.caseCode}
                            </div>
                          </td>
                          <td className="border border-slate-300 px-3 py-2.5">
                            <div>{item.district || '—'}</div>
                            <div className="text-[11px] text-slate-500 tabular-nums">
                              {item.beneficiaryPhone}
                            </div>
                          </td>
                          <td className="border border-slate-300 px-3 py-2.5">
                            <div>{item.sourceLabel}</div>
                            <div className="text-[11px] text-slate-600 mt-0.5">
                              {getEffectivePayoutMethod(item.payoutMethod) === 'e_wallet' &&
                              item.walletNumber ? (
                                <span>
                                  محفظة:{' '}
                                  <span dir="ltr" className="font-mono tabular-nums font-semibold">
                                    {item.walletNumber}
                                  </span>
                                </span>
                              ) : (
                                <span>نقدي عبر الباحث</span>
                              )}
                            </div>
                          </td>
                          <td className="border border-slate-300 px-3 py-2.5 text-center font-bold tabular-nums">
                            {item.amount.toLocaleString('ar-EG')}
                          </td>
                          <td className="border border-slate-300 px-3 py-2.5 text-center">
                            {item.status === 'delivered'
                              ? 'تم التسليم'
                              : 'قيد التسليم'}
                          </td>
                          <td className="border border-slate-300 px-3 py-2.5" />
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-bold">
                        <td
                          colSpan={4}
                          className="border border-slate-300 px-3 py-2.5 text-right"
                        >
                          الإجمالي العام للعهدة
                        </td>
                        <td className="border border-slate-300 px-3 py-2.5 text-center text-[#005756] tabular-nums">
                          {researcherMetrics.totalCustodyAmount.toLocaleString(
                            'ar-EG'
                          )}{' '}
                          ج.م
                        </td>
                        <td
                          colSpan={2}
                          className="border border-slate-300 px-3 py-2.5"
                        />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* خانات التوقيعات الرسمية */}
                <div className="grid grid-cols-3 gap-6 pt-8 text-xs text-center">
                  <div className="space-y-8">
                    <p className="font-semibold text-slate-800">
                      توقيع الباحث الميداني المستلم للعهدة
                    </p>
                    <div className="border-t border-slate-400 pt-1.5 text-slate-600">
                      {user.name}
                    </div>
                  </div>
                  <div className="space-y-8">
                    <p className="font-semibold text-slate-800">
                      مراجعة المسؤول المالي / أمين الصندوق
                    </p>
                    <div className="border-t border-slate-400 pt-1.5 text-slate-500">
                      الاسم والتوقيع
                    </div>
                  </div>
                  <div className="space-y-8">
                    <p className="font-semibold text-slate-800">
                      اعتماد مدير المنظومة
                    </p>
                    <div className="border-t border-slate-400 pt-1.5 text-slate-500">
                      أحمد الجزار
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
