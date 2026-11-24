'use client';

import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CustodyDeliveryItem,
  DeliveryProof,
  PayoutMethod,
} from '@/types';
import {
  buildGoogleMapsLocationUrl,
  compressDeliveryProofImage,
  formatDeliveryTimestamp,
} from '@/lib/delivery-proof-helpers';
import {
  getEffectivePayoutMethod,
  getPayoutMethodLabel,
} from '@/lib/payout-helpers';
import {
  Banknote,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  ImagePlus,
  Loader2,
  MapPin,
  RefreshCw,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';

interface DeliveryProofCaptureModalProps {
  item: CustodyDeliveryItem | null;
  onClose: () => void;
  onConfirm: (item: CustodyDeliveryItem, proof?: DeliveryProof) => void;
}

export function DeliveryProofCaptureModal({
  item,
  onClose,
  onConfirm,
}: DeliveryProofCaptureModalProps) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const [imageDataUrl, setImageDataUrl] = useState<string>('');
  const [compressedSizeKb, setCompressedSizeKb] = useState<number | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const [location, setLocation] = useState<{ lat: number; lng: number } | undefined>(
    undefined
  );
  const [gpsStatus, setGpsStatus] = useState<
    'idle' | 'locating' | 'captured' | 'unavailable'
  >('idle');
  const [deliveryNote, setDeliveryNote] = useState<string>('');

  if (!item || typeof document === 'undefined') return null;

  const isEWallet = getEffectivePayoutMethod(item.payoutMethod) === 'e_wallet';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImageError(null);
    setIsCompressing(true);
    try {
      const { dataUrl, approxSizeKb } = await compressDeliveryProofImage(
        file,
        1000,
        0.72
      );
      setImageDataUrl(dataUrl);
      setCompressedSizeKb(approxSizeKb);
    } catch (err) {
      setImageError(
        err instanceof Error ? err.message : 'تعذر ضغط ومعالجة الصورة المختارة'
      );
    } finally {
      setIsCompressing(false);
    }
  };

  const handleClearImage = () => {
    setImageDataUrl('');
    setCompressedSizeKb(null);
    setImageError(null);
  };

  const handleCaptureGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('unavailable');
      return;
    }

    setGpsStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
        setGpsStatus('captured');
      },
      () => {
        // رفض الإذن أو عدم توفر الموقع لا يعطل تأكيد التسليم نهائياً
        setGpsStatus('unavailable');
      },
      {
        enableHighAccuracy: true,
        timeout: 7000,
        maximumAge: 60000,
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedNote = deliveryNote.trim();
    const hasAnyProofData = Boolean(imageDataUrl || location || trimmedNote);

    const proof: DeliveryProof | undefined = hasAnyProofData
      ? {
          imageDataUrl,
          capturedAt: new Date().toISOString(),
          ...(location ? { location } : {}),
          ...(trimmedNote ? { deliveryNote: trimmedNote } : {}),
        }
      : undefined;

    onConfirm(item, proof);
    onClose();
  };

  return createPortal(
    <div
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-80 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pod-capture-title"
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border-t sm:border border-slate-200 shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h3
              id="pod-capture-title"
              className="text-sm sm:text-base font-bold text-slate-900 truncate"
            >
              تأكيد وتوثيق تسليم المساعدة
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {item.sourceLabel} · {item.caseCode}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1"
        >
          {/* ملخص المستحق والمبلغ وطريقة الصرف */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-sm text-slate-900 truncate">
                {item.caseName}
              </span>
              <span className="text-sm sm:text-base font-bold text-[#005756] tabular-nums whitespace-nowrap">
                {item.amount.toLocaleString('ar-EG')} ج.م
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 text-slate-600">
              <span className="inline-flex items-center gap-1.5 font-medium">
                {isEWallet ? (
                  <Smartphone size={14} className="text-[#005756] shrink-0" />
                ) : (
                  <Banknote size={14} className="text-slate-400 shrink-0" />
                )}
                <span>{getPayoutMethodLabel(item.payoutMethod)}</span>
              </span>
              {isEWallet && item.walletNumber && (
                <span
                  dir="ltr"
                  className="font-mono tabular-nums font-semibold text-slate-900"
                >
                  {item.walletNumber}
                </span>
              )}
            </div>
          </div>

          {/* 1. رفع صورة الإثبات (كاميرا أو معرض) مع الضغط التلقائي */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800">
                صورة إثبات التسليم{' '}
                <span className="font-normal text-slate-500">
                  ({isEWallet ? 'لقطة شاشة التحويل' : 'إيصال الاستلام الموقع'})
                </span>
              </label>
              {compressedSizeKb !== null && (
                <span className="text-[11px] font-mono tabular-nums text-[#005756]">
                  مضغوطة تلقائياً ({compressedSizeKb} KB)
                </span>
              )}
            </div>

            {/* Hidden File Inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {!imageDataUrl ? (
              <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50/60 space-y-3 text-center">
                <p className="text-slate-600 leading-relaxed">
                  التقط صورة الإيصال مباشرة بالكاميرا أو اختر صورة من المعرض (يتم ضغط
                  الصورة تلقائياً لحفظ المساحة)
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={isCompressing}
                    onClick={() => cameraInputRef.current?.click()}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-[#005756] hover:bg-[#004241] disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isCompressing ? (
                      <Loader2 size={15} className="animate-spin shrink-0" />
                    ) : (
                      <Camera size={15} className="shrink-0" />
                    )}
                    <span>التقاط بالكاميرا</span>
                  </button>

                  <button
                    type="button"
                    disabled={isCompressing}
                    onClick={() => galleryInputRef.current?.click()}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-700 border border-slate-200 font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ImagePlus size={15} className="text-slate-500 shrink-0" />
                    <span>من المعرض</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 space-y-2.5">
                <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-white max-h-48 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageDataUrl}
                    alt="معاينة إثبات التسليم"
                    className="max-h-44 w-auto object-contain mx-auto"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw size={13} className="text-slate-500 shrink-0" />
                    <span>استبدال الصورة</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 hover:border-rose-200 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} className="shrink-0" />
                    <span>حذف الصورة</span>
                  </button>
                </div>
              </div>
            )}

            {imageError && (
              <p className="text-rose-600 text-[11px] font-medium">{imageError}</p>
            )}
          </div>

          {/* 2. التقاط الموقع الجغرافي (GPS) الاختياري */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="space-y-0.5 min-w-0">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin size={14} className="text-[#005756] shrink-0" />
                <span>الموقع الجغرافي للتسليم (GPS — اختياري)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                {gpsStatus === 'captured' && location
                  ? `تم التقاط الإحداثيات (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`
                  : gpsStatus === 'unavailable'
                  ? 'تعذر التقاط الموقع أو تم رفض الإذن — يمكنك المتابعة بشكل طبيعي'
                  : 'توثيق إحداثيات موقع التسليم الميداني إن رغبت'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {gpsStatus === 'captured' && location ? (
                <button
                  type="button"
                  onClick={() => {
                    setLocation(undefined);
                    setGpsStatus('idle');
                  }}
                  className="min-h-[36px] px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-rose-700 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  إزالة الموقع
                </button>
              ) : (
                <button
                  type="button"
                  disabled={gpsStatus === 'locating'}
                  onClick={handleCaptureGps}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {gpsStatus === 'locating' ? (
                    <>
                      <Loader2 size={13} className="animate-spin text-[#005756]" />
                      <span>جارٍ التحديد...</span>
                    </>
                  ) : (
                    <>
                      <MapPin size={13} className="text-[#005756]" />
                      <span>التقاط الموقع</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* 3. ملاحظة تسليم سريعة اختيارية */}
          <div className="space-y-1.5">
            <label
              htmlFor="pod-delivery-note"
              className="font-bold text-slate-800 block"
            >
              ملاحظة التسليم{' '}
              <span className="font-normal text-slate-500">(اختياري)</span>
            </label>
            <input
              id="pod-delivery-note"
              type="text"
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
              placeholder={
                isEWallet
                  ? 'مثال: تم التحويل على محفظة المستحق وتأكيد الاستلام...'
                  : 'مثال: تم التسليم نقداً يداً بيد لرب الأسرة...'
              }
              className="w-full h-10 px-3 py-2 bg-white border border-slate-200 focus:border-[#005756] rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#005756]"
            />
          </div>

          {/* أزرار الحفظ والإلغاء */}
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isCompressing}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#005756] hover:bg-[#004241] disabled:opacity-50 text-white font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 size={15} className="shrink-0" />
              <span>حفظ وتأكيد التسليم</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export interface DeliveryProofPreviewTarget {
  caseName: string;
  caseCode: string;
  amount: number;
  batchTitle: string;
  researcherName?: string;
  payoutMethod?: PayoutMethod;
  walletNumber?: string;
  proof: DeliveryProof;
}

interface DeliveryProofPreviewModalProps {
  target: DeliveryProofPreviewTarget | null;
  onClose: () => void;
}

export function DeliveryProofPreviewModal({
  target,
  onClose,
}: DeliveryProofPreviewModalProps) {
  if (!target || typeof document === 'undefined') return null;

  const { proof } = target;
  const mapsUrl = proof.location
    ? buildGoogleMapsLocationUrl(proof.location.lat, proof.location.lng)
    : null;
  const isEWallet = getEffectivePayoutMethod(target.payoutMethod) === 'e_wallet';

  return createPortal(
    <div
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-80 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pod-preview-title"
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border-t sm:border border-slate-200 shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileCheck2 size={16} className="text-[#005756] shrink-0" />
              <h3
                id="pod-preview-title"
                className="text-sm sm:text-base font-bold text-slate-900 truncate"
              >
                معاينة توثيق إثبات التسليم
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {target.caseName} ({target.caseCode}) · {target.batchTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق المعاينة"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* صورة الإثبات */}
          {proof.imageDataUrl ? (
            <div className="border border-slate-200 rounded-xl bg-slate-50 p-2.5 flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proof.imageDataUrl}
                alt={`إثبات تسليم ${target.caseName}`}
                className="max-h-72 w-auto object-contain rounded-lg"
              />
            </div>
          ) : (
            <div className="border border-dashed border-slate-200 rounded-xl bg-slate-50 py-8 px-4 text-center text-slate-500">
              تم توثيق التسليم بدون إرفاق صورة إيصال
            </div>
          )}

          {/* بيانات التسليم الموثّقة */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
              <span className="text-slate-500">المبلغ المُسلّم:</span>
              <strong className="text-sm font-bold text-[#005756] tabular-nums">
                {target.amount.toLocaleString('ar-EG')} ج.م
              </strong>
            </div>

            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Clock size={13} className="text-slate-400 shrink-0" />
                <span>تاريخ ووقت التسليم:</span>
              </span>
              <span className="font-semibold text-slate-800 tabular-nums">
                {formatDeliveryTimestamp(proof.capturedAt)}
              </span>
            </div>

            {target.payoutMethod && (
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
                <span className="text-slate-500">طريقة التسليم:</span>
                <span className="font-semibold text-slate-800">
                  {getPayoutMethodLabel(target.payoutMethod)}
                  {isEWallet && target.walletNumber ? (
                    <span dir="ltr" className="font-mono tabular-nums mr-1.5">
                      ({target.walletNumber})
                    </span>
                  ) : null}
                </span>
              </div>
            )}

            {target.researcherName && (
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
                <span className="text-slate-500">الباحث المنفّذ:</span>
                <span className="font-semibold text-slate-800">
                  {target.researcherName}
                </span>
              </div>
            )}

            {proof.deliveryNote && (
              <div className="space-y-1 pt-0.5">
                <span className="text-slate-500 block">ملاحظة التسليم الميداني:</span>
                <p className="text-slate-800 font-medium leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200/80">
                  {proof.deliveryNote}
                </p>
              </div>
            )}

            {mapsUrl && proof.location && (
              <div className="pt-1 flex items-center justify-between gap-2">
                <span className="text-slate-500 font-mono tabular-nums text-[11px]">
                  GPS: {proof.location.lat.toFixed(5)}, {proof.location.lng.toFixed(5)}
                </span>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 min-h-[34px] px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-[#005756] border border-slate-200 font-bold text-xs transition-colors"
                >
                  <MapPin size={13} className="shrink-0" />
                  <span>فتح الموقع على الخريطة</span>
                  <ExternalLink size={12} className="shrink-0" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[38px] px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
