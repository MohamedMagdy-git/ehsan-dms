'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
import { RotateCcw, CheckCircle2, AlertTriangle, X } from 'lucide-react';

export function Footer() {
  const { resetToSeedData } = useApp();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleConfirmReset = () => {
    resetToSeedData();
    setShowConfirmModal(false);
    setResetSuccess(true);
    setTimeout(() => {
      setResetSuccess(false);
    }, 3500);
  };

  return (
    <>
      <footer className="w-full bg-white border-t border-slate-200 py-3.5 px-4 sm:px-6 mb-16 md:mb-0 mt-auto text-xs text-slate-600 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3 text-center lg:text-right">
          {/* Right Side: Identity & Activity */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 text-slate-700 font-medium order-1 lg:order-1">
            <span className="w-2 h-2 rounded-full bg-[#005756] shrink-0" />
            <span>منظومة إدارة المساعدات الإنسانية · كفالة ودعم الأسر المستحقة</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-slate-100 text-slate-500 border border-slate-200/80">
              v0.9.5-beta
            </span>
          </div>

          {/* Center: Developer & Company Attribution */}
          <div className="text-slate-500 font-normal order-3 lg:order-2">
            <span>تطوير: شركة <strong className="font-semibold text-slate-700">Gensystem</strong> للأنظمة الذكية والحلول السحابية © 2026</span>
          </div>

          {/* Left Side: Interactive Reset & Feedback */}
          <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2.5 order-2 lg:order-3">

            {/* Success notification if just reset */}
            {resetSuccess && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium animate-in fade-in">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>تمت استعادة البيانات بنجاح</span>
              </span>
            )}

            {/* Reset Button */}
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 hover:text-slate-900 text-[11px] font-semibold transition-all hover:border-slate-400 active:scale-98 shadow-2xs cursor-pointer"
              title="استعادة قاعدة البيانات الافتراضية للنظام"
            >
              <RotateCcw size={12} className="text-teal-700" />
              <span>استعادة البيانات الافتراضية</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Confirmation Dialog Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-5 text-right relative animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-modal-title"
          >
            {/* Close icon */}
            <button
              onClick={() => setShowConfirmModal(false)}
              className="absolute left-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div className="space-y-1">
                <h3 id="reset-modal-title" className="text-base font-bold text-slate-900">
                  استعادة البيانات المؤسسية الافتراضية
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  هل تريد بالتأكيد استعادة بيانات النظام إلى الحالة المؤسسية الافتراضية؟
                </p>
              </div>
            </div>

            {/* Details Box */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
              <p className="font-semibold text-slate-700">سيترتب على هذه العملية:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-500 text-[11px] leading-relaxed">
                <li>استعادة كشف الحالات والزيارات الميدانية الأصلي (10 حالات).</li>
                <li>إرجاع أرصدة التبرعات والخزينة إلى وضعها الأولي (188,000 ج.م).</li>
                <li>إعادة فتح دورة أكتوبر 2026 كمسودة قابلة للتعديل والاعتماد الرسمي.</li>
                <li>تحديث سجل التدقيق والرقابة وإلغاء العمليات المؤقتة.</li>
              </ul>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#005756] hover:bg-[#004443] text-white text-xs font-bold transition-all shadow-xs"
              >
                <RotateCcw size={13} />
                <span>نعم، إعادة الضبط الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
