'use client';

import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ClipboardList,
  ShieldCheck,
  Wallet,
  CheckCircle2,
  Mic,
  ArrowLeft,
  FileCheck2,
  Signature,
} from 'lucide-react';

interface WorkflowBentoPipelineProps {
  isResearcherPOV: boolean;
  onOpenSurvey: () => void;
  onNavigateSection: (sectionId: string) => void;
}

export function WorkflowBentoPipeline({
  isResearcherPOV,
  onOpenSurvey,
  onNavigateSection,
}: WorkflowBentoPipelineProps) {
  const prefersReducedMotion = useReducedMotion();
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  const steps = [
    {
      stepNumber: '01',
      stationTitle: 'البحث والتوثيق',
      roleLabel: 'دور الباحث الميداني',
      title: 'البحث والتوثيق الميداني',
      description:
        'النزول لمحل سكن الأسرة، تعبئة استمارة البحث من 24 سؤالاً، إرفاق صور المستندات، وتسجيل الملاحظة الصوتية قبل إرسال التقرير.',
      ctaLabel: 'فتح استمارة بحث ميداني',
      onAction: () => onOpenSurvey(),
      preview: (
        <div className="space-y-2">
          <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <ClipboardList size={13} className="text-[#005756]" />
                <span>استمارة البحث الميداني</span>
              </span>
              <span className="font-mono tabular-nums text-[#005756] font-bold">
                24/24
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full w-4/5 bg-[#005756] rounded-full" />
            </div>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2">
            <span className="w-5 h-5 rounded-full bg-[#005756] text-white flex items-center justify-center shrink-0">
              <Mic size={11} />
            </span>
            <div className="flex items-center gap-0.5 flex-1 justify-center h-3">
              {[45, 80, 60, 100, 70, 50, 90, 65, 40, 75, 55, 85].map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${h}%` }}
                  className={`w-0.5 rounded-full ${
                    i < 8 ? 'bg-[#005756]' : 'bg-slate-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] font-mono tabular-nums text-slate-500">
              0:48
            </span>
          </div>
        </div>
      ),
    },
    {
      stepNumber: '02',
      stationTitle: 'المراجعة الإدارية',
      roleLabel: 'دور مدير المنظومة',
      title: 'المراجعة والتدقيق الإداري',
      description:
        'تفحص الإدارة التقرير الميداني والمرفقات وتستمع للتسجيل الصوتي؛ إما لاعتماد الاستحقاق أو إرجاع الملف بملاحظة محددة لاستيفائها.',
      ctaLabel: isResearcherPOV
        ? 'متابعة حالاتي وزياراتي'
        : 'فتح أبحاث بانتظار الاعتماد',
      onAction: () =>
        onNavigateSection(isResearcherPOV ? 'research' : 'cases-review'),
      preview: (
        <div className="space-y-2">
          <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#005756]" />
                <span>فحص ومطابقة الملف</span>
              </span>
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                مستوفى
              </span>
            </div>
            <div className="flex items-center justify-between text-[10.5px] text-slate-500 pt-1 border-t border-slate-100">
              <span>المرفقات والتسجيل الصوتي</span>
              <span className="font-mono tabular-nums text-slate-700 font-semibold">
                مكتمل 100%
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      stepNumber: '03',
      stationTitle: 'إسناد العهدة',
      roleLabel: 'الربط المالي والخزينة',
      title: 'الاعتماد وإسناد العهدة',
      description:
        'بعد اعتماد الحالة وتخصيص ميزانية الشهر، تُدرج المبالغ المعتمدة لحالات منطقتك تلقائياً داخل «كشف عهدتك» لتكون جاهزة للصرف.',
      ctaLabel: isResearcherPOV
        ? 'استعراض كشف عهدتي'
        : 'توزيع ميزانية الشهر',
      onAction: () =>
        onNavigateSection(isResearcherPOV ? 'my-custody' : 'allocation'),
      preview: (
        <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-600 flex items-center gap-1.5">
              <Wallet size={13} className="text-[#005756]" />
              <span>مخصص معتمد بالعهدة</span>
            </span>
            <span className="text-[10px] text-teal-700 font-medium">
              دفعة الشهر
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1 border-t border-slate-100">
            <span className="text-xs font-bold font-mono tabular-nums text-[#005756]">
              1,500 ج.م
            </span>
            <span className="text-[10px] text-slate-500">
              جاهز للتسليم الميداني
            </span>
          </div>
        </div>
      ),
    },
    {
      stepNumber: '04',
      stationTitle: 'التسليم والإغلاق',
      roleLabel: 'إتمام المهمة الميدانية',
      title: 'التسليم للمستحق والإغلاق',
      description:
        'تسليم المبلغ للأسرة يداً بيد، وتوثيق التسليم بالتوقيع الرقمي أو صورة الإيصال أو الإقرار الصوتي لإغلاق العهدة رسمياً.',
      ctaLabel: 'الانتقال لتسليم الحالات والتوثيق',
      onAction: () =>
        onNavigateSection(isResearcherPOV ? 'my-custody' : 'research'),
      preview: (
        <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>تم التسليم وتوثيق الإيصال</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-1 border-t border-slate-100">
            <span className="inline-flex items-center gap-1 text-slate-600">
              <Signature size={12} className="text-[#005756]" />
              توقيع رقمي
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 text-slate-600">
              <FileCheck2 size={12} className="text-[#005756]" />
              إيصال معتمد
            </span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section aria-labelledby="pipeline-heading" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h3
            id="pipeline-heading"
            className="text-base sm:text-lg font-bold text-slate-900"
          >
            مسار العمل الميداني (دورة حياة الحالة)
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            أربع مراحل متسلسلة توضح دورك الميداني وعلاقته بالمراجعة الإدارية والخزينة
          </p>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          01 البحث الميداني ← 04 تسليم الدعم
        </span>
      </div>

      {/* Desktop & Tablet Horizontal Connected Stepper (Above the 4 Bento Cards) */}
      <div
        aria-label="شريط مراحل مسار العمل الميداني"
        className="hidden md:block relative py-2 select-none"
      >
        {/* Continuous Horizontal Line spanning from Center of Station 01 to Center of Station 04 */}
        <div
          aria-hidden="true"
          className="absolute top-[26px] right-[12.5%] left-[12.5%] h-[2px] bg-slate-200 overflow-hidden rounded-full z-0"
        >
          {!prefersReducedMotion && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: '-100%' }}
              transition={{
                duration: 3.5,
                ease: 'easeInOut',
                repeat: Infinity,
              }}
              className="w-1/2 h-full bg-gradient-to-l from-transparent via-[#005756] to-transparent"
            />
          )}
        </div>

        {/* 4 Circular Numbered Stations aligned 1:1 with the 4 Bento Cards below */}
        <div className="grid grid-cols-4 gap-4 relative z-10">
          {steps.map((step, index) => {
            const isActive = index === activeStepIndex;
            return (
              <button
                key={step.stepNumber}
                type="button"
                onClick={() => setActiveStepIndex(index)}
                onMouseEnter={() => setActiveStepIndex(index)}
                className="group flex flex-col items-center justify-center focus:outline-hidden cursor-pointer"
              >
                <div className="relative flex items-center justify-center">
                  {/* Solid backdrop mask so the horizontal track never bleeds behind the circle */}
                  <span
                    aria-hidden="true"
                    className="w-11 h-11 rounded-full bg-slate-50 flex items-center justify-center"
                  >
                    <span
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-mono tabular-nums text-xs font-bold transition-all duration-200 ${
                        isActive
                          ? 'bg-[#005756] text-white ring-4 ring-[#005756]/15 shadow-xs'
                          : 'bg-white text-slate-700 border-2 border-slate-300 group-hover:border-[#005756] group-hover:text-[#005756]'
                      }`}
                    >
                      {step.stepNumber}
                    </span>
                  </span>
                </div>
                <span
                  className={`mt-1.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'text-[#005756]'
                      : 'text-slate-500 group-hover:text-slate-800'
                  }`}
                >
                  {step.stationTitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bento Cards Grid (with Mobile Vertical Stepper Sidebar Track) */}
      <div className="relative pr-9 md:pr-0">
        {/* Mobile Continuous Vertical Stepper Line on the Right (RTL) */}
        <div
          aria-hidden="true"
          className="md:hidden absolute top-6 bottom-6 right-[15px] w-[2px] bg-slate-200 overflow-hidden rounded-full z-0"
        >
          {!prefersReducedMotion && (
            <motion.div
              initial={{ y: '-100%' }}
              animate={{ y: '100%' }}
              transition={{
                duration: 3.5,
                ease: 'easeInOut',
                repeat: Infinity,
              }}
              className="w-full h-1/3 bg-gradient-to-b from-transparent via-[#005756] to-transparent"
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, index) => {
            const isActive = index === activeStepIndex;
            return (
              <div
                key={step.stepNumber}
                onMouseEnter={() => setActiveStepIndex(index)}
                className="relative flex flex-col"
              >
                {/* Mobile Circular Station Node on the Right Track */}
                <div
                  aria-hidden="true"
                  className="md:hidden absolute -right-9 top-5 w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center z-10"
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-mono tabular-nums text-[11px] font-bold transition-colors ${
                      isActive
                        ? 'bg-[#005756] text-white ring-3 ring-[#005756]/15'
                        : 'bg-white text-[#005756] border-2 border-slate-300'
                    }`}
                  >
                    {step.stepNumber}
                  </span>
                </div>

                {/* Clean Unclipped Bento Card */}
                <article
                  className={`flex-1 bg-white border rounded-2xl p-5 flex flex-col justify-between transition-colors ${
                    isActive
                      ? 'border-[#005756]/40 shadow-2xs'
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Bento Mini UI Visual Preview Header */}
                    <div className="h-28 bg-slate-50/90 border border-slate-200/70 rounded-xl p-3 flex flex-col justify-center mb-4 overflow-hidden">
                      {step.preview}
                    </div>

                    {/* Step Indicator & Role Metadata */}
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono tabular-nums font-bold text-[#005756]">
                          المرحلة {step.stepNumber}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-slate-600">
                          {step.roleLabel}
                        </span>
                      </div>
                      <span className="md:hidden text-[11px] font-mono tabular-nums text-slate-400">
                        {index + 1} من {steps.length}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900 mb-2">
                      {step.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={step.onAction}
                      className="w-full inline-flex items-center justify-between text-xs font-semibold text-[#005756] hover:text-[#004241] py-1.5 px-2 -mx-2 rounded-lg hover:bg-teal-50/50 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <span>{step.ctaLabel}</span>
                      <ArrowLeft size={14} className="shrink-0" />
                    </button>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
