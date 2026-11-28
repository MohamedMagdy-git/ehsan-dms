'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Plus } from 'lucide-react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'offline-sync',
    question: 'ماذا أفعل لو انقطع الإنترنت أثناء تعبئة الاستمارة في الميدان؟',
    answer:
      'لا تقلق؛ المنظومة تحفظ كل إجابة تُدخلها تلقائياً على هاتفك كمسودة آمنة مرتبطة بملف هذه الحالة تحديداً. يمكنك مواصلة البحث وتسجيل الملاحظات الصوتية حتى نهاية الاستمارة بدون إنترنت، وبمجرد عودة الاتصال تضغط على «تأكيد وإرسال التقرير» ليصل مباشرة للإدارة.',
  },
  {
    id: 'admin-notes',
    question: 'كيف أعرف الملاحظات التي طلبتها الإدارة على تقريري؟',
    answer:
      'ستظهر الحالة في شاشة «حالاتي وزياراتي» داخل تبويب «راجِع من الإدارة» بشارة «تحتاج استكمال»، وبداخلها ملاحظة المدير مع زر مباشر «استكمال النواقص» لتعديل الاستمارة وإعادة إرسالها.',
  },
  {
    id: 'edit-after-submit',
    question: 'هل يمكنني تعديل تقرير البحث بعد إرساله للإدارة؟',
    answer:
      'إذا أعادت الإدارة التقرير، عدّله مباشرة من تبويب «راجِع من الإدارة» عبر زر «استكمال النواقص». أما إذا كان لا يزال «بانتظار مراجعة الإدارة»، فيمكنك الوصول إليه من تبويب «سجل الزيارات» ← «فتح الملف» ← «بدء البحث الميداني» لتحديث البيانات وإعادة الإرسال.',
  },
  {
    id: 'custody-proof',
    question: 'ما هي طرق إثبات تسليم المبلغ للأسرة في كشف العهدة؟',
    answer:
      'تعتمد المنظومة على إرفاق صورة إيصال الاستلام الورقي الموقّع (أو لقطة شاشة التحويل في حالة المحفظة الإلكترونية) كإثبات أساسي، مع إمكانية إضافة موقع التسليم (GPS) وكتابة ملاحظة سريعة حول الاستلام.',
  },
  {
    id: 'unreachable-family',
    question: 'ماذا أفعل إذا تعذر الوصول للأسرة أو تبين تغيير عنوان السكن؟',
    answer:
      'يمكنك التواصل مع الأسرة عبر زر الاتصال المباشر على بطاقة الحالة، أو الضغط على زر «ملاحظات» أسفل البطاقة لتسجيل سبب تعذر الزيارة أو العنوان الجديد ليراجعه مدير المنظومة ويعيد توجيه الحالة.',
  },
];

export function FieldFaqAccordion() {
  const [openId, setOpenId] = useState<string | null>('offline-sync');
  const prefersReducedMotion = Boolean(useReducedMotion());

  const toggleFaq = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section aria-labelledby="faq-heading" className="space-y-4">
      <div>
        <h3
          id="faq-heading"
          className="text-base sm:text-lg font-bold text-slate-900"
        >
          الأسئلة الميدانية السريعة
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          إجابات مباشرة على أبرز المواقف اليومية أثناء الزيارات الميدانية وتسليم العهدة
        </p>
      </div>

      <div className="space-y-2.5">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openId === item.id;
          return (
            <div
              key={item.id}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isOpen
                  ? 'bg-white border-[#005756]/35 ring-1 ring-[#005756]/10 shadow-2xs'
                  : 'bg-slate-100/75 hover:bg-slate-100 border-slate-200/85'
              }`}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => toggleFaq(item.id)}
                className="w-full px-4 py-3.5 sm:px-5 sm:py-4 flex items-center justify-between gap-3 text-right cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#005756]/30 rounded-2xl"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold tabular-nums shrink-0 border transition-colors duration-200 ${
                      isOpen
                        ? 'bg-[#005756]/10 text-[#005756] border-[#005756]/20'
                        : 'bg-white text-slate-700 border-slate-200/90'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={`text-sm sm:text-base font-bold leading-snug transition-colors duration-200 ${
                      isOpen ? 'text-slate-900' : 'text-slate-800'
                    }`}
                  >
                    {item.question}
                  </span>
                </div>

                <span
                  aria-hidden="true"
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-colors duration-200 ${
                    isOpen
                      ? 'bg-white text-[#005756] border-[#005756]/30'
                      : 'bg-[#005756] text-white border-[#005756]'
                  }`}
                >
                  <motion.span
                    initial={false}
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 360, damping: 26 }
                    }
                    className="inline-flex items-center justify-center"
                  >
                    <Plus size={16} strokeWidth={2.25} />
                  </motion.span>
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="answer"
                    initial={
                      prefersReducedMotion
                        ? { opacity: 1, height: 'auto' }
                        : { opacity: 0, height: 0 }
                    }
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={
                      prefersReducedMotion
                        ? { opacity: 0, height: 0 }
                        : { opacity: 0, height: 0 }
                    }
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { duration: 0.24, ease: [0.16, 1, 0.3, 1] }
                    }
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 pr-14 sm:pr-15">
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
                        {item.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
