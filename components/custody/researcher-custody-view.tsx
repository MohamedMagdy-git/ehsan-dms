'use client';

import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '@/context/auth-context';
import { useApp } from '@/context/app-context';
import { useScopedData } from '@/hooks/use-scoped-data';
import { useToast } from '@/context/toast-context';
import { CustodyDeliveryItem, DeliveryProof } from '@/types';
import {
  copyTextToClipboard,
  getEffectivePayoutMethod,
  getPayoutMethodLabel,
} from '@/lib/payout-helpers';
import {
  DeliveryProofCaptureModal,
  DeliveryProofPreviewModal,
  DeliveryProofPreviewTarget,
} from '@/components/custody/delivery-proof-modal';
import {
  ResearcherFormModal,
  ResearcherFormPayload,
} from '@/components/research/researcher-form-modal';
import {
  Banknote,
  Check,
  CheckCircle2,
  Copy,
  FileCheck2,
  MapPin,
  Pencil,
  Phone,
  Smartphone,
  Wallet,
} from 'lucide-react';

type CustodyFilterTab = 'all' | 'pending' | 'delivered';

function getSanitizedTelHref(phone?: string): string | null {
  const cleaned = (phone || '').replace(/[^\d+]/g, '');
  return cleaned ? `tel:${cleaned}` : null;
}

export function ResearcherCustodyView() {
  const { user } = useAuth();
  const {
    confirmCustodyItemDelivered,
    openCaseDetails,
    researcherProfiles,
    updateResearcher,
  } = useApp();
  const { scopedCustodyItems, researcherMetrics, latestApprovedCycle } =
    useScopedData();
  const { toast } = useToast();
  const prefersReducedMotion = useReducedMotion();

  const [filterTab, setFilterTab] = useState<CustodyFilterTab>('all');
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [activeCaptureItem, setActiveCaptureItem] =
    useState<CustodyDeliveryItem | null>(null);
  const [previewProofTarget, setPreviewProofTarget] =
    useState<DeliveryProofPreviewTarget | null>(null);
  const [isSelfProfileModalOpen, setIsSelfProfileModalOpen] =
    useState<boolean>(false);

  const ownResearcherProfile = useMemo(() => {
    if (user.researcherId) {
      const byId = researcherProfiles.find((r) => r.id === user.researcherId);
      if (byId) return byId;
    }
    return researcherProfiles.find(
      (r) => r.name.trim() === user.name.trim()
    );
  }, [researcherProfiles, user.researcherId, user.name]);

  const handleSaveSelfProfile = (payload: ResearcherFormPayload) => {
    if (!ownResearcherProfile) return;
    updateResearcher(ownResearcherProfile.id, payload);
    setIsSelfProfileModalOpen(false);
    toast.success('تم تحديث بيانات ملفك الميداني بنجاح');
  };

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
    setActiveCaptureItem(item);
  };

  const handleSaveDeliveryConfirmation = (
    item: CustodyDeliveryItem,
    proof?: DeliveryProof
  ) => {
    confirmCustodyItemDelivered(item, proof);
    toast.success(
      `تم تأكيد تسليم ${item.amount.toLocaleString('ar-EG')} ج.م لـ ${item.caseName} بنجاح`
    );
  };

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
                المستحقات المعتمدة المسندة باسمك فقط ({ownResearcherProfile?.name || user.name})
                {latestApprovedCycle
                  ? ` • ${latestApprovedCycle.batchTitle || latestApprovedCycle.periodLabel}`
                  : ''}
              </p>
            </div>

            {ownResearcherProfile && (
              <button
                type="button"
                onClick={() => setIsSelfProfileModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
              >
                <Pencil size={13} className="text-slate-400 shrink-0" />
                <span>تعديل ملفي الشخصي</span>
              </button>
            )}
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
                          <div className="inline-flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold whitespace-nowrap">
                              <CheckCircle2
                                size={15}
                                className="text-[#005756] shrink-0"
                                aria-hidden="true"
                              />
                              <span>تم التسليم</span>
                            </span>

                            {item.deliveryProof && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewProofTarget({
                                    caseName: item.caseName,
                                    caseCode: item.caseCode,
                                    amount: item.amount,
                                    batchTitle: item.sourceLabel,
                                    researcherName: item.assignedResearcher,
                                    payoutMethod: item.payoutMethod,
                                    walletNumber: item.walletNumber,
                                    proof: item.deliveryProof!,
                                  })
                                }
                                title="معاينة إثبات التسليم"
                                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white border border-slate-200 hover:border-[#005756]/40 hover:bg-slate-50 text-[#005756] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                              >
                                <FileCheck2 size={14} className="shrink-0" aria-hidden="true" />
                                <span>موثّق بإثبات</span>
                              </button>
                            )}
                          </div>
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

      {/* نافذة توثيق التسليم الميداني للباحث */}
      {activeCaptureItem && (
        <DeliveryProofCaptureModal
          item={activeCaptureItem}
          onClose={() => setActiveCaptureItem(null)}
          onConfirm={handleSaveDeliveryConfirmation}
        />
      )}

      {/* نافذة معاينة إثبات التسليم */}
      {previewProofTarget && (
        <DeliveryProofPreviewModal
          target={previewProofTarget}
          onClose={() => setPreviewProofTarget(null)}
        />
      )}

      {/* نافذة تعديل الملف الشخصي للباحث الميداني */}
      <ResearcherFormModal
        isOpen={isSelfProfileModalOpen}
        onClose={() => setIsSelfProfileModalOpen(false)}
        editingResearcher={ownResearcherProfile || null}
        existingNames={researcherProfiles.map((r) => r.name)}
        onSubmit={handleSaveSelfProfile}
        mode="self-profile"
      />
    </>
  );
}
