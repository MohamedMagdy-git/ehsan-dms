'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  WifiOff,
  MessageSquareWarning,
  FileEdit,
  FileCheck2,
  MapPinOff,
} from 'lucide-react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  topic: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'offline-sync',
    topic: 'العمل بدون إنترنت',
    question: 'ماذا أفعل لو انقطع الإنترنت أثناء تعبئة الاستمارة في الميدان؟',
    answer:
      'لا تقلق؛ المنظومة تحفظ كل إجابة تُدخلها تلقائياً على هاتفك كمسودة آمنة مرتبطة بملف هذه الحالة تحديداً. يمكنك مواصلة البحث وتسجيل الملاحظات الصوتية حتى نهاية الاستمارة بدون إنترنت، وبمجرد عودة الاتصال تضغط على «تأكيد وإرسال التقرير» ليصل مباشرة للإدارة.',
    icon: WifiOff,
  },
  {
    id: 'admin-notes',
    topic: 'ملاحظات الإدارة',
    question: 'كيف أعرف الملاحظات التي طلبتها الإدارة على تقريري؟',
    answer:
      'ستظهر الحالة في أعلى قائمة «حالاتي وزياراتي» تحت تنبيه «مطلوب استيفاء ملاحظات»، وبداخلها نص الملاحظة المباشرة من مدير المنظومة مع زر لتعديل الاستمارة وإعادة إرسالها.',
    icon: MessageSquareWarning,
  },
  {
    id: 'edit-after-submit',
    topic: 'تعديل التقارير',
    question: 'هل يمكنني تعديل تقرير البحث بعد إرساله للإدارة؟',
    answer:
      'طالما أن الملف في مرحلة «بانتظار مراجعة الإدارة» أو «مطلوب استيفاء»، يمكنك فتح استمارة البحث وتحديث البيانات أو إعادة تسجيل الملاحظة الصوتية ثم الضغط على اعتماد وإرسال التحديث.',
    icon: FileEdit,
  },
  {
    id: 'custody-proof',
    topic: 'توثيق العهدة',
    question: 'ما هي طرق إثبات تسليم المبلغ للأسرة في كشف العهدة؟',
    answer:
      'توفر المنظومة 3 بدائل مرنة تناسب ظروف كل أسرة: التوقيع الرقمي المباشر على شاشة الهاتف، أو تصوير إيصال الاستلام الورقي، أو تسجيل إقرار صوتي قصير من المستفيد يؤكد استلام المبلغ.',
    icon: FileCheck2,
  },
  {
    id: 'unreachable-family',
    topic: 'تعذر الزيارة',
    question: 'ماذا أفعل إذا تعذر الوصول للأسرة أو تبين تغيير عنوان السكن؟',
    answer:
      'افتح ملف الحالة وسجل ملاحظة ميدانية توضح سبب تعذر الزيارة أو العنوان الجديد، ليتمكن مدير المنظومة من تحديث النطاق الجغرافي أو إعادة إسناد الحالة للباحث المختص بالمنطقة الجديدة.',
    icon: MapPinOff,
  },
];

export function FieldFaqAccordion() {
  const [openId, setOpenId] = useState<string | null>('offline-sync');

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

      <div className="bg-white border border-slate-200/90 rounded-2xl divide-y divide-slate-200/70 overflow-hidden">
        {FAQ_ITEMS.map((item) => {
          const Icon = item.icon;
          const isOpen = openId === item.id;
          return (
            <div key={item.id} className="transition-colors">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => toggleFaq(item.id)}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-right hover:bg-slate-50/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                      isOpen
                        ? 'bg-[#005756] text-white border-[#005756]'
                        : 'bg-slate-50 text-[#005756] border-slate-200/80'
                    }`}
                  >
                    <Icon size={17} />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">
                      {item.topic}
                    </span>
                    <span className="block text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      {item.question}
                    </span>
                  </div>
                </div>

                <ChevronDown
                  size={18}
                  className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-[#005756]' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 mr-12">
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50/90 border border-slate-200/70 rounded-xl p-3.5">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
