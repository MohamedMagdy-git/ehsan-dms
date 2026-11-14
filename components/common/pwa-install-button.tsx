'use client';

import React, { useState } from 'react';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { Download, Smartphone, X, CheckCircle2, Share } from 'lucide-react';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install, mounted } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // Return null until mounted to ensure SSR output and initial client hydration match 100%
  if (!mounted) {
    return null;
  }

  // If already installed and running standalone, do not clutter UI
  if (isInstalled) {
    return null;
  }

  // Android / Chromium / Desktop install flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#005756] hover:bg-[#004241] text-white text-xs font-semibold shadow-xs shadow-teal-950/15 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
        title="تثبيت منظومة إحسان كتطبيق مستقل على هاتفك أو حاسوبك للعمل دون اتصال"
      >
        <Download size={13} className="shrink-0" />
        <span className="hidden sm:inline">تثبيت التطبيق</span>
        <span className="sm:hidden">تثبيت</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSModal(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] shadow-2xs cursor-pointer"
          title="تثبيت التطبيق على أجهزة iPhone و iPad"
        >
          <Smartphone size={13} className="shrink-0 text-slate-500" />
          <span className="hidden sm:inline">تثبيت على الآيفون</span>
          <span className="sm:hidden">تثبيت</span>
        </button>

        {showIOSModal && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-70 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setShowIOSModal(false)}
          >
            <div
              className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-right animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">تثبيت التطبيق على iPhone</h3>
                  <p className="text-xs text-slate-500 mt-1">للتشغيل السريع من الشاشة الرئيسية دون اتصال</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  aria-label="إغلاق"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-2.5 text-xs text-slate-700 leading-relaxed">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-[#005756] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <span>اضغط على زر المشاركة </span>
                    <strong className="text-slate-900 inline-flex items-center gap-1 font-semibold bg-white px-1.5 py-0.5 rounded-md border border-slate-200 mx-1">
                      <Share size={12} className="text-slate-400 inline" />
                      <span>Share</span>
                    </strong>
                    <span>في شريط متصفح Safari بالأسفل.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-[#005756] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <span>مرر للأسفل في القائمة واختر: </span>
                    <strong className="text-slate-900 font-semibold block mt-0.5 bg-white p-1 rounded-md border border-slate-200">
                      «إضافة إلى الصفحة الرئيسية» (Add to Home Screen)
                    </strong>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600">
                  <CheckCircle2 size={15} className="text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-snug">
                    سيظهر تطبيق <strong className="text-slate-800">إحسان</strong> كأيقونة مستقلة على شاشتك تعمل بكفاءة حتى عند انقطاع الإنترنت.
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowIOSModal(false)}
                  className="w-full py-2.5 bg-[#005756] hover:bg-[#004241] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  فهمت ذلك، تم
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
