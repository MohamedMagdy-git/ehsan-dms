'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  ClipboardList,
  ShieldCheck,
  Wallet,
  CheckCircle2,
  Mic,
  FileCheck2,
  Signature,
} from 'lucide-react';

export interface StepPreviewProps {
  isActive: boolean;
  reducedMotion: boolean;
}

const WAVE_BARS = [45, 80, 60, 100, 70, 50, 90, 65, 40, 75, 55, 85];

export function Step01SurveyPreview({
  isActive,
  reducedMotion,
}: StepPreviewProps) {
  const animateActive = isActive && !reducedMotion;

  return (
    <div className="space-y-2">
      <div className="bg-white border border-slate-200 rounded-lg p-2.5">
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-700 mb-1.5">
          <span className="flex items-center gap-1.5">
            <ClipboardList size={13} className="text-[#005756]" />
            <span>استمارة البحث الميداني</span>
          </span>
          <span className="tabular-nums text-[#005756] font-bold">
            {isActive ? '24/24' : '15/24'}
          </span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={false}
            animate={{ width: isActive ? '100%' : '60%' }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 0.7, ease: 'easeOut' }
            }
            className="h-full bg-[#005756] rounded-full"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2">
        <motion.span
          initial={false}
          animate={
            animateActive ? { scale: [1, 1.08, 1] } : { scale: 1 }
          }
          transition={
            animateActive
              ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.2 }
          }
          className="w-5 h-5 rounded-full bg-[#005756] text-white flex items-center justify-center shrink-0"
        >
          <Mic size={11} />
        </motion.span>

        <div className="flex items-center gap-0.5 flex-1 justify-center h-3">
          {WAVE_BARS.map((h, i) => {
            const isColored = isActive ? i < 10 : i < 7;
            const peak = Math.min(100, h + 20);
            const low = Math.max(25, h - 20);
            return (
              <motion.span
                key={i}
                initial={false}
                animate={
                  animateActive
                    ? { height: [`${h}%`, `${peak}%`, `${low}%`, `${h}%`] }
                    : { height: `${h}%` }
                }
                transition={
                  animateActive
                    ? {
                        duration: 1.2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: i * 0.06,
                      }
                    : { duration: 0.25 }
                }
                className={`w-0.5 rounded-full transition-colors duration-300 ${
                  isColored ? 'bg-[#005756]' : 'bg-slate-300'
                }`}
              />
            );
          })}
        </div>

        <span className="text-[10px] tabular-nums text-slate-500">0:48</span>
      </div>
    </div>
  );
}

export function Step02ReviewPreview({
  isActive,
  reducedMotion,
}: StepPreviewProps) {
  const animateActive = isActive && !reducedMotion;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-800 flex items-center gap-1.5">
          <motion.span
            initial={false}
            animate={
              animateActive
                ? { scale: [1, 1.14, 1] }
                : { scale: 1 }
            }
            transition={
              animateActive
                ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.2 }
            }
            className="inline-flex text-[#005756]"
          >
            <ShieldCheck size={14} />
          </motion.span>
          <span>فحص ومطابقة الملف</span>
        </span>

        <motion.span
          initial={false}
          animate={{
            opacity: isActive ? 1 : 0.75,
            scale: animateActive ? [0.96, 1.03, 1] : 1,
          }}
          transition={{ duration: reducedMotion ? 0 : 0.35, ease: 'easeOut' }}
          className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors duration-300 ${
            isActive
              ? 'bg-[#005756]/10 text-[#005756] border-[#005756]/25'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          مستوفى
        </motion.span>
      </div>

      <div className="flex items-center justify-between text-[10.5px] text-slate-500 pt-1.5 border-t border-slate-100">
        <span>المرفقات والتسجيل الصوتي</span>
        <span
          className={`font-semibold transition-colors duration-300 ${
            isActive ? 'text-[#005756]' : 'text-slate-700'
          }`}
        >
          مكتمل <span className="tabular-nums">100%</span>
        </span>
      </div>
    </div>
  );
}

export function Step03CustodyPreview({
  isActive,
  reducedMotion,
}: StepPreviewProps) {
  const animateActive = isActive && !reducedMotion;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-700 flex items-center gap-1.5">
          <Wallet size={13} className="text-[#005756]" />
          <span>دعم شهري معتمد</span>
        </span>
        <span className="text-[10px] text-[#005756] font-medium">
          دفعة الشهر
        </span>
      </div>

      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
        <motion.span
          initial={false}
          animate={
            animateActive ? { scale: [1, 1.04, 1] } : { scale: 1 }
          }
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className={`text-xs font-bold px-2 py-0.5 rounded-md border transition-colors duration-300 ${
            isActive
              ? 'bg-[#005756]/10 text-[#005756] border-[#005756]/25'
              : 'bg-slate-50 text-[#005756] border-slate-200'
          }`}
        >
          <span className="tabular-nums">1,500</span> ج.م
        </motion.span>

        <motion.span
          initial={false}
          animate={
            animateActive ? { opacity: [0.65, 1, 0.65] } : { opacity: 1 }
          }
          transition={
            animateActive
              ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.2 }
          }
          className={`text-[10px] font-medium transition-colors duration-300 ${
            isActive ? 'text-[#005756]' : 'text-slate-500'
          }`}
        >
          نزل في كشف عهدتك
        </motion.span>
      </div>
    </div>
  );
}

export function Step04DeliveryPreview({
  isActive,
  reducedMotion,
}: StepPreviewProps) {
  const animateActive = isActive && !reducedMotion;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-800 flex items-center gap-1.5">
          <motion.span
            initial={false}
            animate={
              animateActive
                ? { scale: [1, 1.16, 1] }
                : { scale: 1 }
            }
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="inline-flex text-[#005756]"
          >
            <CheckCircle2 size={14} />
          </motion.span>
          <span>تم التسليم وتوثيق الإيصال</span>
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] pt-1.5 border-t border-slate-100">
        <motion.span
          initial={false}
          animate={{
            opacity: isActive ? 1 : 0.8,
            y: animateActive ? [1, 0] : 0,
          }}
          transition={{ duration: reducedMotion ? 0 : 0.25 }}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors duration-300 ${
            isActive
              ? 'bg-[#005756]/10 text-[#005756] border-[#005756]/25 font-medium'
              : 'bg-slate-50 text-slate-600 border-slate-200'
          }`}
        >
          <Signature size={11} className="text-[#005756]" />
          <span>توقيع رقمي</span>
        </motion.span>

        <motion.span
          initial={false}
          animate={{
            opacity: isActive ? 1 : 0.8,
            y: animateActive ? [1, 0] : 0,
          }}
          transition={{
            duration: reducedMotion ? 0 : 0.25,
            delay: animateActive ? 0.18 : 0,
          }}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors duration-300 ${
            isActive
              ? 'bg-[#005756]/10 text-[#005756] border-[#005756]/25 font-medium'
              : 'bg-slate-50 text-slate-600 border-slate-200'
          }`}
        >
          <FileCheck2 size={11} className="text-[#005756]" />
          <span>إيصال معتمد</span>
        </motion.span>
      </div>
    </div>
  );
}
