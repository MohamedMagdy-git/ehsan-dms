'use client';

import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ChevronLeft, ChevronDown } from 'lucide-react';
import {
  Step01SurveyPreview,
  Step02ReviewPreview,
  Step03CustodyPreview,
  Step04DeliveryPreview,
} from './workflow-step-previews';

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
  const prefersReducedMotion = Boolean(useReducedMotion());
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isDesktop, setIsDesktop] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsDesktop(e.matches);
    };

    handleMediaChange(mediaQuery);
    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, []);

  useEffect(() => {
    if (!isDesktop || isHovered || prefersReducedMotion) return;

    const timer = window.setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 3500);

    return () => window.clearInterval(timer);
  }, [isDesktop, isHovered, prefersReducedMotion]);

  const steps = [
    {
      stepNumber: '01',
      roleLabel: 'دور الباحث الميداني',
      title: 'البحث والتوثيق الميداني',
      description:
        'النزول لمحل سكن الأسرة، تعبئة استمارة البحث من 24 سؤالاً، إرفاق صور المستندات، وتسجيل الملاحظة الصوتية قبل إرسال التقرير.',
      ctaLabel: 'فتح استمارة بحث ميداني',
      onAction: () => onOpenSurvey(),
      renderPreview: (isActive: boolean) => (
        <Step01SurveyPreview
          isActive={isActive}
          reducedMotion={prefersReducedMotion}
        />
      ),
    },
    {
      stepNumber: '02',
      roleLabel: 'دور مدير المنظومة',
      title: 'المراجعة والتدقيق الإداري',
      description:
        'تفحص الإدارة التقرير الميداني والمرفقات وتستمع للتسجيل الصوتي؛ إما لاعتماد الاستحقاق أو إرجاع الملف بملاحظة محددة لاستيفائها.',
      ctaLabel: isResearcherPOV
        ? 'متابعة حالاتي وزياراتي'
        : 'فتح أبحاث بانتظار الاعتماد',
      onAction: () =>
        onNavigateSection(isResearcherPOV ? 'research' : 'cases-review'),
      renderPreview: (isActive: boolean) => (
        <Step02ReviewPreview
          isActive={isActive}
          reducedMotion={prefersReducedMotion}
        />
      ),
    },
    {
      stepNumber: '03',
      roleLabel: 'دور مدير المنظومة · الميزانية',
      title: 'اعتماد الميزانية ونزول العهدة',
      description:
        'بعد اعتماد مدير المنظومة لميزانية الشهر وتخصيص الدعم الشهري للحالات المسندة إليك، يظهر المبلغ مباشرة داخل «كشف عهدتك» جاهزاً للتسليم.',
      ctaLabel: isResearcherPOV
        ? 'استعراض كشف عهدتي'
        : 'توزيع ميزانية الشهر',
      onAction: () =>
        onNavigateSection(isResearcherPOV ? 'my-custody' : 'allocation'),
      renderPreview: (isActive: boolean) => (
        <Step03CustodyPreview
          isActive={isActive}
          reducedMotion={prefersReducedMotion}
        />
      ),
    },
    {
      stepNumber: '04',
      roleLabel: 'إتمام المهمة الميدانية',
      title: 'التسليم للمستحق والإغلاق',
      description:
        'تسليم المبلغ للأسرة يداً بيد، وتوثيق التسليم بالتوقيع الرقمي أو صورة الإيصال أو الإقرار الصوتي لإغلاق العهدة رسمياً.',
      ctaLabel: 'الانتقال لتسليم الحالات والتوثيق',
      onAction: () =>
        onNavigateSection(isResearcherPOV ? 'my-custody' : 'research'),
      renderPreview: (isActive: boolean) => (
        <Step04DeliveryPreview
          isActive={isActive}
          reducedMotion={prefersReducedMotion}
        />
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
          <span className="tabular-nums">01</span> البحث الميداني ←{' '}
          <span className="tabular-nums">04</span> تسليم الدعم
        </span>
      </div>

      {/* Connected Workflow Track: Desktop RTL Row (01 Right -> 04 Left) / Mobile Vertical Column */}
      <div
        onMouseLeave={() => setIsHovered(false)}
        className="flex flex-col lg:flex-row items-stretch"
      >
        {steps.map((step, index) => {
          const isActive = activeStep === index;
          const isNotLast = index < steps.length - 1;

          return (
            <React.Fragment key={step.stepNumber}>
              <motion.article
                onMouseEnter={() => {
                  setIsHovered(true);
                  setActiveStep(index);
                }}
                onClick={() => setActiveStep(index)}
                viewport={{ once: false, amount: 0.6 }}
                onViewportEnter={() => {
                  if (!isDesktop) {
                    setActiveStep(index);
                  }
                }}
                className={`flex-1 min-w-0 bg-white border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 ${
                  isActive
                    ? 'border-[#005756]/45 ring-1 ring-[#005756]/10'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Bento Mini UI Visual Preview Header */}
                  <div
                    className={`h-28 lg:h-[132px] flex flex-col justify-center rounded-xl p-3 mb-4 overflow-hidden border transition-colors duration-300 ${
                      isActive
                        ? 'bg-slate-50 border-[#005756]/20'
                        : 'bg-slate-50/90 border-slate-200/70'
                    }`}
                  >
                    {step.renderPreview(isActive)}
                  </div>

                  {/* Step Indicator & Role Metadata (No font-mono on Arabic text) */}
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#005756]">
                        المرحلة{' '}
                        <span className="tabular-nums">{step.stepNumber}</span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-slate-600">
                        {step.roleLabel}
                      </span>
                    </div>
                    <span className="lg:hidden text-[11px] tabular-nums text-slate-400">
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
                    onClick={(e) => {
                      e.stopPropagation();
                      step.onAction();
                    }}
                    className="w-full inline-flex items-center justify-between text-xs font-semibold text-[#005756] hover:text-[#004241] py-1.5 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span>{step.ctaLabel}</span>
                    <ArrowLeft size={14} className="shrink-0" />
                  </button>
                </div>
              </motion.article>

              {/* Explicit Connectors between Steps 01->02, 02->03, 03->04 */}
              {isNotLast && (
                <>
                  {/* Desktop Horizontal Connector (RTL Leftward Flow) */}
                  <div
                    aria-hidden="true"
                    className="hidden lg:flex shrink-0 w-7 items-center justify-center relative select-none"
                  >
                    <div
                      className={`w-full h-[1.5px] relative overflow-hidden transition-colors duration-300 ${
                        isActive ? 'bg-[#005756]/40' : 'bg-slate-200'
                      }`}
                    >
                      {isActive && !prefersReducedMotion && (
                        <motion.div
                          initial={{ x: '100%' }}
                          animate={{ x: '-100%' }}
                          transition={{
                            duration: 1.4,
                            ease: 'easeInOut',
                            repeat: Infinity,
                          }}
                          className="w-full h-full bg-[#005756]"
                        />
                      )}
                    </div>
                    <motion.span
                      initial={false}
                      animate={
                        isActive && !prefersReducedMotion
                          ? { x: [1, -2, 1] }
                          : { x: 0 }
                      }
                      transition={
                        isActive && !prefersReducedMotion
                          ? {
                              duration: 1.4,
                              ease: 'easeInOut',
                              repeat: Infinity,
                            }
                          : { duration: 0.2 }
                      }
                      className={`absolute bg-slate-50 px-0.5 rounded-full flex items-center justify-center transition-colors duration-300 ${
                        isActive ? 'text-[#005756]' : 'text-slate-300'
                      }`}
                    >
                      <ChevronLeft size={15} />
                    </motion.span>
                  </div>

                  {/* Mobile & Tablet Vertical Connector (Downward Flow) */}
                  <div
                    aria-hidden="true"
                    className="flex lg:hidden h-7 items-center justify-center relative select-none"
                  >
                    <div
                      className={`h-full w-[1.5px] relative overflow-hidden transition-colors duration-300 ${
                        isActive ? 'bg-[#005756]/40' : 'bg-slate-200'
                      }`}
                    >
                      {isActive && !prefersReducedMotion && (
                        <motion.div
                          initial={{ y: '-100%' }}
                          animate={{ y: '100%' }}
                          transition={{
                            duration: 1.4,
                            ease: 'easeInOut',
                            repeat: Infinity,
                          }}
                          className="w-full h-full bg-[#005756]"
                        />
                      )}
                    </div>
                    <motion.span
                      initial={false}
                      animate={
                        isActive && !prefersReducedMotion
                          ? { y: [-1, 2, -1] }
                          : { y: 0 }
                      }
                      transition={
                        isActive && !prefersReducedMotion
                          ? {
                              duration: 1.4,
                              ease: 'easeInOut',
                              repeat: Infinity,
                            }
                          : { duration: 0.2 }
                      }
                      className={`absolute bg-slate-50 py-0.5 rounded-full flex items-center justify-center transition-colors duration-300 ${
                        isActive ? 'text-[#005756]' : 'text-slate-300'
                      }`}
                    >
                      <ChevronDown size={15} />
                    </motion.span>
                  </div>
                </>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
}
