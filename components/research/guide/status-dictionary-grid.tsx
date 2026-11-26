'use client';

import React, { useState } from 'react';
import {
  Clock,
  AlertTriangle,
  ShieldCheck,
  Wallet,
  CalendarClock,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';

type StatusFilterCategory = 'all' | 'researcher_action' | 'admin_flow';

interface StatusDictionaryItem {
  id: string;
  badgeText: string;
  toneClass: string;
  category: 'researcher_action' | 'admin_flow';
  ownerLabel: string;
  meaning: string;
  actionRequired: string;
  ctaLabel: string;
  targetSection: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface StatusDictionaryGridProps {
  isResearcherPOV: boolean;
  onNavigateSection: (sectionId: string) => void;
  onOpenSurvey: () => void;
}

const STATUS_ITEMS: StatusDictionaryItem[] = [
  {
    id: 'pending_field_research',
    badgeText: 'بانتظار الزيارة الأولى / مسودة محفوظة',
    toneClass: 'text-teal-800 bg-teal-50/80 border-teal-200/80',
    category: 'researcher_action',
    ownerLabel: 'مسؤولية الباحث',
    meaning:
      'حالة جديدة مسندة إليك في منطقتك، أو استمارة بدأت تعبئتها وحُفظت تلقائياً على جهازك.',
    actionRequired:
      'إجراء الزيارة الميدانية واستكمال بنود الاستمارة وإرسالها للاعتماد.',
    ctaLabel: 'بدء أو استكمال البحث',
    targetSection: 'survey',
    icon: Clock,
  },
  {
    id: 'needs_revision',
    badgeText: 'مطلوب استيفاء ملاحظات',
    toneClass: 'text-amber-900 bg-amber-50 border-amber-200',
    category: 'researcher_action',
    ownerLabel: 'أولوية عاجلة للباحث',
    meaning:
      'راجعت الإدارة التقرير وطلبت استكمال مستند ناقص أو توضيح نقطة محددة في البحث.',
    actionRequired:
      'قراءة ملاحظة المدير داخل بطاقة الحالة، تحديث البيان المطلوب، وإعادة الإرسال.',
    ctaLabel: 'مراجعة الحالات المطلوب استيفاؤها',
    targetSection: 'research',
    icon: AlertTriangle,
  },
  {
    id: 'pending_review',
    badgeText: 'بانتظار مراجعة الإدارة',
    toneClass: 'text-slate-700 bg-slate-100 border-slate-200/90',
    category: 'admin_flow',
    ownerLabel: 'لدى مدير المنظومة',
    meaning:
      'وصل تقريرك الميداني بنجاح وهو الآن قيد الفحص والاعتماد من مدير المنظومة.',
    actionRequired:
      'لا يلزمك أي إجراء حالياً؛ ستتحول الحالة تلقائياً فور اعتماد الإدارة.',
    ctaLabel: 'متابعة حالة الملفات المرسلة',
    targetSection: 'research',
    icon: ShieldCheck,
  },
  {
    id: 'active_eligible',
    badgeText: 'نشطة ومستحقة (جاهزة للتسليم)',
    toneClass: 'text-emerald-800 bg-emerald-50/90 border-emerald-200/80',
    category: 'researcher_action',
    ownerLabel: 'عهدة تسليم ميداني',
    meaning:
      'تم اعتماد الأسرة وإدراج مخصصها المالي ضمن كشف عهدتك للشهر الحالي.',
    actionRequired:
      'التوجه لتبويب «كشف عهدتي للتسليم» لصرف المبلغ للأسرة وتوثيق الإيصال.',
    ctaLabel: 'فتح كشف عهدتي للتسليم',
    targetSection: 'my-custody',
    icon: Wallet,
  },
  {
    id: 'overdue_visit',
    badgeText: 'متأخرة عن الزيارة الدورية',
    toneClass: 'text-rose-800 bg-rose-50/90 border-rose-200/80',
    category: 'researcher_action',
    ownerLabel: 'متابعة ميدانية مطلوبة',
    meaning:
      'أسرة مستفيدة حان موعد تحديث بحثها الميداني الدوري للتأكد من استمرار الاستحقاق.',
    actionRequired:
      'تحديد موعد لزيارة الأسرة وتحديث بيانات الاستمارة بالمستجدات الميدانية.',
    ctaLabel: 'عرض الزيارات المتأخرة',
    targetSection: 'research',
    icon: CalendarClock,
  },
  {
    id: 'delivered_closed',
    badgeText: 'تم التسليم وتوثيق العهدة',
    toneClass: 'text-slate-700 bg-slate-50 border-slate-200',
    category: 'admin_flow',
    ownerLabel: 'مهمة مكتملة',
    meaning:
      'اكتملت دورة الشهر الحالي وتم حفظ إثبات استلام الأسرة للمساعدة في السجل المالي.',
    actionRequired:
      'المهمة مكتملة بنجاح ولا يتطلب الملف أي إجراء إضافي لهذا الشهر.',
    ctaLabel: 'استعراض سجل التسليمات',
    targetSection: 'my-custody',
    icon: CheckCircle2,
  },
];

export function StatusDictionaryGrid({
  isResearcherPOV,
  onNavigateSection,
  onOpenSurvey,
}: StatusDictionaryGridProps) {
  const [filter, setFilter] = useState<StatusFilterCategory>('all');

  const visibleItems =
    filter === 'all'
      ? STATUS_ITEMS
      : STATUS_ITEMS.filter((item) => item.category === filter);

  const handleAction = (target: string) => {
    if (target === 'survey') {
      onOpenSurvey();
      return;
    }
    if (target === 'my-custody' && !isResearcherPOV) {
      onNavigateSection('allocation');
      return;
    }
    onNavigateSection(target);
  };

  return (
    <section aria-labelledby="status-dict-heading" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3
            id="status-dict-heading"
            className="text-base sm:text-lg font-bold text-slate-900"
          >
            دليل الشارات وحالات الملفات
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            تفسير مبسط لكل حالة تظهر أمام ملف الأسرة والإجراء الميداني المطلوب منك
          </p>
        </div>

        {/* Interactive Filter Segmented Control */}
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/70 self-start sm:self-auto">
          {[
            { id: 'all', label: 'جميع الحالات' },
            { id: 'researcher_action', label: 'تتطلب تدخلك' },
            { id: 'admin_flow', label: 'بانتظار الإدارة / مكتملة' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as StatusFilterCategory)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-white text-[#005756] font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between gap-3 hover:border-slate-300 transition-colors"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${item.toneClass}`}
                  >
                    <Icon size={14} className="shrink-0" />
                    <span>{item.badgeText}</span>
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {item.ownerLabel}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  <strong className="text-slate-800 font-semibold">
                    المعنى:{' '}
                  </strong>
                  {item.meaning}
                </p>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  <strong className="text-[#005756] font-semibold">
                    المطلوب منك:{' '}
                  </strong>
                  {item.actionRequired}
                </p>
              </div>

              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => handleAction(item.targetSection)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#005756] hover:text-[#004241] py-1 px-2 -mx-2 rounded-lg hover:bg-teal-50/50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span>{item.ctaLabel}</span>
                  <ArrowLeft size={13} className="shrink-0" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
