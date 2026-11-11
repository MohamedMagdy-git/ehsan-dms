'use client';

import React, { useState, useSyncExternalStore } from 'react';
import { Download, X, Share2, PlusSquare, HandHeart } from 'lucide-react';
import { usePWAInstall } from '@/hooks/use-pwa-install';

const STORAGE_KEY = 'ehsan_pwa_install_dismissed';

function subscribeDismissed(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener('ehsan_pwa_dismissed', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('ehsan_pwa_dismissed', callback);
  };
}

function getDismissedSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

interface PWAInstallWidgetProps {
  collapsed?: boolean;
}

export function PWAInstallWidget({ collapsed = false }: PWAInstallWidgetProps) {
  const { isInstallable, isInstalled, isIOS, install, mounted } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  const isDismissed = useSyncExternalStore(
    subscribeDismissed,
    getDismissedSnapshot,
    getServerSnapshot
  );

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
      window.dispatchEvent(new Event('ehsan_pwa_dismissed'));
    } catch {
      // LocalStorage access fail-safe
    }
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (isInstallable) {
      try {
        const success = await install();
        if (success) {
          localStorage.setItem(STORAGE_KEY, 'true');
          window.dispatchEvent(new Event('ehsan_pwa_dismissed'));
        }
      } catch (err) {
        console.warn('PWA install prompt error:', err);
      }
    } else {
      setShowIOSModal(true);
    }
  };

  // Suppress widget if not yet mounted, already installed, or user dismissed
  if (!mounted || isInstalled || isDismissed) {
    return null;
  }

  // Render compact view for collapsed sidebar
  if (collapsed) {
    return (
      <div className="mx-auto my-2 shrink-0 flex justify-center">
        <button
          type="button"
          onClick={handleInstallClick}
          className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#003833] to-[#004d40] border border-teal-500/40 text-white hover:border-teal-300 hover:scale-105 active:scale-95 transition-all shadow-md flex items-center justify-center cursor-pointer group"
          title="تثبيت تطبيق إحسان"
          aria-label="تثبيت تطبيق إحسان"
        >
          <HandHeart size={19} className="text-teal-300 group-hover:text-white transition-colors" />
        </button>

        {/* iOS Instruction Modal */}
        {showIOSModal && (
          <div
            className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs font-sans text-right"
            dir="rtl"
            onClick={() => setShowIOSModal(false)}
          >
            <div
              className="bg-white text-slate-900 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
                    <HandHeart size={20} className="text-[#005756]" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">تثبيت تطبيق إحسان</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSModal(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                لتثبيت التطبيق على جهازك والاستمتاع بتجربة أسرع بدون اتصال:
              </p>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                    <Share2 size={15} />
                  </div>
                  <span>1. اضغط على زر المشاركة (Share) في المتصفح</span>
                </div>
                <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                    <PlusSquare size={15} />
                  </div>
                  <span>2. اختر «إضافة إلى الشاشة الرئيسية» (Add to Home Screen)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="w-full py-2.5 bg-[#005756] hover:bg-[#004241] text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                فهمت ذلك
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full Expanded Bento Card (Matching User Attachment)
  return (
    <>
      <div className="relative overflow-hidden rounded-2xl p-4 mx-3 my-2 text-white bg-gradient-to-b from-[#003833] via-[#003e38] to-[#004d40] border border-teal-500/30 shadow-xl shadow-teal-950/40 shrink-0 select-none animate-in fade-in duration-200">
        {/* Subtle abstract green wave lines background (faithful to attachment) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
          viewBox="0 0 200 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            d="M-20 40 C 40 10, 80 90, 150 30 C 190 -10, 220 50, 240 80"
            stroke="#34d399"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.6"
          />
          <path
            d="M-10 80 C 60 50, 100 120, 180 60 C 210 35, 230 90, 250 120"
            stroke="#10b981"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.4"
          />
          <path
            d="M10 120 C 70 80, 120 140, 200 90"
            stroke="#6ee7b7"
            strokeWidth="0.8"
            strokeLinecap="round"
            opacity="0.3"
          />
          <circle cx="160" cy="20" r="50" fill="#10b981" opacity="0.08" />
        </svg>

        {/* Top Header: Official HandHeart Logo + Subtle Close Button */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shadow-xs shrink-0">
            <HandHeart size={18} className="text-teal-300" />
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-6 h-6 rounded-full flex items-center justify-center text-teal-200/70 hover:text-white hover:bg-white/15 active:scale-90 transition-all cursor-pointer"
            title="إخفاء التنبيه"
            aria-label="إخفاء التنبيه"
          >
            <X size={14} />
          </button>
        </div>

        {/* Typography Content */}
        <div className="relative z-10 mt-3 text-right">
          <h4 className="text-white font-bold text-sm tracking-tight leading-snug">
            تثبيت تطبيق إحسان
          </h4>
          <p className="text-teal-200/80 text-[11.5px] mt-0.5 leading-normal">
            لتشغيل أسرع وإشعارات مباشرة
          </p>
        </div>

        {/* Action Button (CTA) */}
        <div className="relative z-10 mt-3.5">
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full py-2 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-xs transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.98]"
          >
            <Download size={14} className="shrink-0" />
            <span>تثبيت الآن</span>
          </button>
        </div>
      </div>

      {/* Guided Instruction Modal (for iOS Safari or manual installation) */}
      {showIOSModal && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs font-sans text-right"
          dir="rtl"
          onClick={() => setShowIOSModal(false)}
        >
          <div
            className="bg-white text-slate-900 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
                  <HandHeart size={20} className="text-[#005756]" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">تثبيت تطبيق إحسان</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              لتثبيت التطبيق على جهازك والاستمتاع بتجربة أسرع بدون اتصال:
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                  <Share2 size={15} />
                </div>
                <span>1. اضغط على زر المشاركة (Share) في المتصفح</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                  <PlusSquare size={15} />
                </div>
                <span>2. اختر «إضافة إلى الشاشة الرئيسية» (Add to Home Screen)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 bg-[#005756] hover:bg-[#004241] text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
            >
              فهمت ذلك
            </button>
          </div>
        </div>
      )}
    </>
  );
}
