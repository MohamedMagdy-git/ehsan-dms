'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
import {
  Users,
  AlertTriangle,
  Clock,
  ChevronLeft,
  CheckCircle2,
  X,
  Lock,
  Unlock,
  Check,
  FileSpreadsheet,
  AlertCircle,
  Plus,
  MapPin,
} from 'lucide-react';
import { InfoTooltip } from '@/components/common/info-tooltip';
import { RoleInspirationalCard } from '@/components/common/role-inspirational-card';
import { MoneyDisplay } from '@/components/common/money-display';

function describeDonutSector(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startAngleDeg: number,
  endAngleDeg: number
): string {
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const point = (r: number, deg: number) => {
    const rad = toRad(deg);
    return {
      x: Number((cx + r * Math.cos(rad)).toFixed(3)),
      y: Number((cy + r * Math.sin(rad)).toFixed(3)),
    };
  };

  const outerStart = point(rOuter, startAngleDeg);
  const outerEnd = point(rOuter, endAngleDeg);
  const innerEnd = point(rInner, endAngleDeg);
  const innerStart = point(rInner, startAngleDeg);
  const largeArc = endAngleDeg - startAngleDeg > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

export function DashboardView() {
  const {
    metrics,
    cases,
    currentAllocation,
    setActiveSection,
    setSelectedCaseId,
    setIsNewCaseModalOpen,
    auditLogs,
    approveAllocation,
    currentPeriod,
  } = useApp();

  const [showDonationBreakdownModal, setShowDonationBreakdownModal] = useState(false);
  const [showFamiliesStatusModal, setShowFamiliesStatusModal] = useState(false);
  const [isApprovingCycle, setIsApprovingCycle] = useState(false);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [hoveredSliceIndex, setHoveredSliceIndex] = useState<number | null>(null);

  // Priority distribution data for Donut chart (Teal + Slate, calm Rose strictly for critical)
  const priorityCounts = [
    {
      name: 'حرجة وعاجلة',
      value: cases.filter((c) => c.priority === 'critical').length,
      color: '#e11d48',
      isCritical: true,
    },
    {
      name: 'مرتفعة',
      value: cases.filter((c) => c.priority === 'high').length,
      color: '#005756',
      isCritical: false,
    },
    {
      name: 'متوسطة',
      value: cases.filter((c) => c.priority === 'medium').length,
      color: '#64748b',
      isCritical: false,
    },
    {
      name: 'اعتيادية',
      value: cases.filter((c) => c.priority === 'low').length,
      color: '#cbd5e1',
      isCritical: false,
    },
  ];

  const totalPriorityCases = priorityCounts.reduce((acc, curr) => acc + curr.value, 0) || 1;
  const activePrioritySlice =
    hoveredSliceIndex !== null ? priorityCounts[hoveredSliceIndex] : null;
  const activePriorityPercent = activePrioritySlice
    ? Math.round((activePrioritySlice.value / totalPriorityCases) * 100)
    : 0;

  // Cases comparison: Monthly Deficit vs Approved Support
  const caseComparisonData = cases
    .filter(
      (c) =>
        c.status === 'active_eligible' ||
        (c.status === 'pending_exception' && c.vulnerability?.exceptionApproved)
    )
    .slice(0, 6)
    .map((c) => {
      const allocItem = currentAllocation?.items.find((i) => i.caseId === c.id);
      const proposed = allocItem
        ? allocItem.approvedAmount > 0
          ? allocItem.approvedAmount
          : allocItem.proposedAmount
        : 0;
      const gap = c.financials.netFinancialGap;
      const coverage = gap > 0 ? Math.min(100, Math.round((proposed / gap) * 100)) : 100;
      return {
        id: c.id,
        code: c.code,
        district: c.district,
        name: c.fullName.split(' ')[0] + ' ' + (c.fullName.split(' ')[1] || ''),
        fullName: c.fullName,
        gap,
        proposed,
        coverage,
      };
    });

  const maxComparisonVal = Math.max(
    ...caseComparisonData.map((d) => Math.max(d.gap, d.proposed)),
    3500
  );
  const hoveredComparisonItem =
    hoveredBarIndex !== null ? caseComparisonData[hoveredBarIndex] : null;

  // Calculate coverage percentage of active assessed need and compliance suspended metrics
  const activeEligibleItems = (currentAllocation?.items || []).filter(
    (item) => !item.isExcluded && !item.isVisitOverdue
  );
  const overdueSuspendedItems = (currentAllocation?.items || []).filter(
    (item) => !item.isExcluded && item.isVisitOverdue
  );

  const totalAssessedNeed = activeEligibleItems.reduce((sum, item) => sum + item.financialGap, 0);
  const totalAllocated = currentAllocation?.summary.totalAllocated ?? 0;
  const overdueSuspendedNeed =
    currentAllocation?.summary.totalOverdueSuspendedNeed ??
    overdueSuspendedItems.reduce(
      (sum, item) => sum + Math.max(0, item.financialGap - (item.approvedAmount || 0)),
      0
    );
  const overdueSuspendedCount =
    currentAllocation?.summary.overdueSuspendedCasesCount ?? overdueSuspendedItems.length;

  const coveragePercentage =
    totalAssessedNeed > 0 ? Math.min(100, Math.round((totalAllocated / totalAssessedNeed) * 100)) : 100;

  const unrestrictedSharePercent =
    metrics.receivedDonationsTotal > 0
      ? Math.round((metrics.unrestrictedDonationsBalance / metrics.receivedDonationsTotal) * 100)
      : 0;

  // Handle direct one-click cycle approval from dashboard
  const handleQuickApproveCycle = () => {
    setIsApprovingCycle(true);
    setTimeout(() => {
      approveAllocation(currentPeriod, 'أ. أحمد الجزار (رئيس المبادرة)');
      setIsApprovingCycle(false);
    }, 400);
  };

  const handleExportExcel = async () => {
    if (currentAllocation) {
      const { exportMonthlyAllocationToExcel } = await import('@/services/excel-export');
      exportMonthlyAllocationToExcel(currentAllocation);
    }
  };

  const isAllocationApproved = currentAllocation?.status === 'approved';

  return (
    <div className="space-y-6">
      {/* Inspirational Quranic Guidance Card tailored to current role */}
      <RoleInspirationalCard />

      {/* 2. Treasury KPIs Grid (موقف الخزينة هذا الشهر) */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">موقف الخزينة هذا الشهر</h2>
            <span className="text-xs text-slate-400 font-medium">· بالجنيه المصري (ج.م)</span>
          </div>
          <button
            type="button"
            onClick={() => setShowDonationBreakdownModal(true)}
            className="text-xs text-[#005756] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>عرض تفصيل الصناديق</span>
            <ChevronLeft size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3.5">
          {/* Metric 1: Total Received Donations */}
          <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200/80 shadow-none flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-slate-700 tracking-tight">إجمالي التبرعات</span>
                <InfoTooltip
                  title="إجمالي التبرعات"
                  badge="نقد بالخزينة"
                  badgeColor="slate"
                  icon="help"
                  iconSize={13}
                  content={
                    <p suppressHydrationWarning>
                      المبالغ التي دخلت حسابات وخزينة المبادرة هذا الشهر ({metrics.receivedDonationsTotal.toLocaleString('en-US')} ج.م)، وتشمل التبرعات العامة والمخصصة.
                    </p>
                  }
                />
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5">دخلت الخزينة فعلياً</span>
            </div>
            <div className="mt-3">
              <MoneyDisplay amount={metrics.receivedDonationsTotal} size="lg" variant="neutral" />
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 tabular-nums">
                <span>مودعة بالكامل</span>
                <span className="text-slate-700 font-semibold">100% موثقة</span>
              </div>
            </div>
          </div>

          {/* Metric 2: Unrestricted Donations */}
          <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200/80 shadow-none flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-slate-700 tracking-tight">التبرعات العامة</span>
                <InfoTooltip
                  title="التبرعات العامة"
                  badge="صرف مرن"
                  badgeColor="teal"
                  icon="help"
                  iconSize={13}
                  content={
                    <p suppressHydrationWarning>
                      مبالغ عامة متاحة للصرف على أي أسرة مستحقة بدون شروط مسبقة من المتبرع ({metrics.unrestrictedDonationsBalance.toLocaleString('en-US')} ج.م).
                    </p>
                  }
                />
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5">متاحة لكل المساعدات</span>
            </div>
            <div className="mt-3">
              <MoneyDisplay amount={metrics.unrestrictedDonationsBalance} size="lg" variant="neutral" />
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 tabular-nums">
                <span>وعاء الصرف الحر</span>
                <span className="text-slate-700 font-semibold">
                  <span className="font-mono" dir="ltr">{unrestrictedSharePercent}%</span> من النقد
                </span>
              </div>
            </div>
          </div>

          {/* Metric 3: Restricted Donations */}
          <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200/80 shadow-none flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-slate-700 tracking-tight">تبرعات لأغراض محددة</span>
                <InfoTooltip
                  title="تبرعات لأغراض محددة"
                  badge="مقيدة"
                  badgeColor="slate"
                  icon="help"
                  iconSize={13}
                  content={
                    <div className="space-y-1 text-xs">
                      <p suppressHydrationWarning>
                        أموال خصصها المتبرعون لأبواب محددة ({metrics.restrictedDonationsBalance.toLocaleString('en-US')} ج.م) ولا تُصرف إلا فيها:
                      </p>
                      <div className="pt-1 border-t border-slate-800 text-[10px] space-y-0.5">
                        <div>• رعاية طبية وعمليات: 25,000 ج.م</div>
                        <div>• كفالة أيتام وتعليم: 20,000 ج.م</div>
                        <div>• كفالة حالة خاصة (EHS-105): 15,000 ج.م</div>
                        <div>• ترميم وسقف منازل: 15,000 ج.م</div>
                      </div>
                    </div>
                  }
                />
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5">مخصصة لبنود معينة</span>
            </div>
            <div className="mt-3">
              <MoneyDisplay amount={metrics.restrictedDonationsBalance} size="lg" variant="neutral" />
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] tabular-nums">
                <button
                  type="button"
                  onClick={() => setShowDonationBreakdownModal(true)}
                  className="text-slate-600 hover:text-[#005756] font-semibold underline cursor-pointer"
                >
                  عرض الأغراض
                </button>
                <span className="text-slate-700 font-semibold">
                  <span className="font-mono" dir="ltr">4</span> بنود
                </span>
              </div>
            </div>
          </div>

          {/* Metric 4: Approved Assistance */}
          <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200/80 shadow-none flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-slate-700 tracking-tight">المعتمد هذا الشهر</span>
                <InfoTooltip
                  title="المعتمد هذا الشهر"
                  badge="كشف الصرف"
                  badgeColor="slate"
                  icon="help"
                  iconSize={13}
                  content={
                    <p suppressHydrationWarning>
                      إجمالي المساعدات المدرجة في كشف دورة أكتوبر 2026 ({metrics.approvedAssistanceTotal.toLocaleString('en-US')} ج.م) لصالح {metrics.eligibleCases} أسر.
                    </p>
                  }
                />
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5">دورة أكتوبر 2026</span>
            </div>
            <div className="mt-3">
              <MoneyDisplay amount={metrics.approvedAssistanceTotal} size="lg" variant="neutral" />
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 tabular-nums">
                <span>الأسر المستفيدة</span>
                <span className="text-slate-700 font-semibold">{metrics.eligibleCases} أسر</span>
              </div>
            </div>
          </div>

          {/* Metric 5: Disbursed Assistance */}
          <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200/80 shadow-none flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-slate-700 tracking-tight">تم صرفه</span>
                <InfoTooltip
                  title="المبالغ المسلمة"
                  badge="توثيق التسليم"
                  badgeColor="slate"
                  icon="help"
                  iconSize={13}
                  content={
                    <p>
                      المبالغ التي تم تسليمها وتوثيق إيصالاتها بالفعل. بمجرد اعتماد الكشف يتحول المبلغ إلى مصروف ومسلم.
                    </p>
                  }
                />
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5">توثيق تسليم المساعدات</span>
            </div>
            <div className="mt-3">
              <MoneyDisplay amount={metrics.disbursedAssistanceTotal} size="lg" variant="neutral" />
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] tabular-nums">
                <span className="text-slate-500">الحالة</span>
                <span className={`font-semibold ${isAllocationApproved ? 'text-[#005756]' : 'text-slate-700'}`}>
                  {isAllocationApproved ? 'تم التسليم' : 'بانتظار الاعتماد'}
                </span>
              </div>
            </div>
          </div>

          {/* Metric 6: Remaining in Treasury (Unified White Calm Card) */}
          <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200/80 shadow-none flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-slate-900 tracking-tight">المتبقي في الخزنة</span>
                <InfoTooltip
                  title="المتبقي في الخزنة (متاح للصرف)"
                  badge="رصيد آمن"
                  badgeColor="teal"
                  icon="help"
                  iconSize={13}
                  content={
                    <div className="space-y-1 text-xs">
                      <p className="font-semibold text-slate-200">طريقة الحساب:</p>
                      <div className="bg-slate-800 p-2 rounded-lg font-mono text-[11px] text-slate-200" suppressHydrationWarning>
                        التبرعات العامة ({metrics.unrestrictedDonationsBalance.toLocaleString('en-US')}) - المعتمد ({metrics.approvedAssistanceTotal.toLocaleString('en-US')}) = {metrics.unrestrictedAvailableBalance.toLocaleString('en-US')} ج.م
                      </div>
                      <p>
                        الرصيد العام المتبقي للاستخدام الحر دون المساس بالتبرعات المخصصة لأغراض معينة.
                      </p>
                    </div>
                  }
                />
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5">متاح للصرف بحرية</span>
            </div>
            <div className="mt-3">
              <MoneyDisplay amount={metrics.unrestrictedAvailableBalance} size="lg" variant="teal" />
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] tabular-nums">
                <span className="text-slate-500">موقف السيولة</span>
                <span className="text-[#005756] font-bold">جاهزة للصرف</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Family Status & Beneficiary Pipeline (موقف الأسر هذا الشهر) */}
      <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-none space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-slate-50 text-slate-700 border border-slate-200/80 shrink-0">
              <Users size={16} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  موقف الأسر هذا الشهر (إجمالي {metrics.totalCases} أسرة)
                </h3>
                <InfoTooltip
                  title="توزيع الأسر هذا الشهر"
                  badge="دورة أكتوبر"
                  badgeColor="slate"
                  icon="help"
                  iconSize={13}
                  content={
                    <div className="space-y-1.5 text-xs">
                      <p>
                        ملخص حالة الأسر المسجلة ({metrics.totalCases} أسرة) بعد المراجعة الميدانية:
                      </p>
                      <div className="pt-1 border-t border-slate-800 space-y-1 text-[11px]">
                        <div>• <strong>9 أسر جاهزة للصرف (تغطية كاملة):</strong> 8 أسر أساسية + حالة استثناء معتمدة.</div>
                        <div>• <strong>أسرة مستبعدة مؤقتاً:</strong> استلمت دعم خارجي بقيمة 5,000 ج.م في أكتوبر.</div>
                        <div>• <strong>أسرة قيد البحث:</strong> بانتظار استكمال الأوراق وتقرير الباحث.</div>
                        <div>• <strong>أسرة ملفها مغلق:</strong> تحسن دخل الأسرة بعد توظيف الابن.</div>
                      </div>
                    </div>
                  }
                />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                متابعة وضع كل أسرة من التسجيل حتى تسليم المساعدة بوضوح
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setIsNewCaseModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus size={14} />
              <span>إضافة حالة</span>
            </button>
            <button
              type="button"
              onClick={() => setShowFamiliesStatusModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-[#005756] bg-white hover:bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>عرض التفاصيل</span>
              <ChevronLeft size={14} />
            </button>
          </div>
        </div>

        {/* Calm Uniform Pipeline Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          <div className="p-3 bg-white rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 block">كل الأسر المسجلة</span>
            <span className="text-base font-bold text-slate-900 mt-0.5 block tabular-nums">
              <span className="font-mono" dir="ltr">{metrics.totalCases}</span> أسرة
            </span>
            <span className="text-[10px] text-slate-400">قاعدة البيانات</span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-600 block font-medium">جاهزة للصرف</span>
            <span className="text-base font-bold text-[#005756] mt-0.5 block tabular-nums">
              <span className="font-mono" dir="ltr">{metrics.eligibleCases}</span> أسر
            </span>
            <span className="text-[10px] text-slate-500">8 أساسي + 1 استثناء</span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 block">مدرجة في الكشف</span>
            <span className="text-base font-bold text-slate-900 mt-0.5 block tabular-nums">
              <span className="font-mono" dir="ltr">{metrics.eligibleCases}</span> أسر
            </span>
            <span className="text-[10px] text-slate-400">دورة أكتوبر 2026</span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 block">معتمد لها الصرف</span>
            <span className="text-base font-bold text-slate-900 mt-0.5 block tabular-nums">
              <span className="font-mono" dir="ltr">{metrics.eligibleCases}</span> أسر
            </span>
            <span className="text-[10px] text-slate-500 tabular-nums" suppressHydrationWarning>
              {metrics.approvedAssistanceTotal.toLocaleString('en-US')} ج.م
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 block">تسليم المساعدة</span>
            <span className="text-base font-bold text-slate-900 mt-0.5 block tabular-nums">
              {metrics.disbursedAssistanceTotal > 0 ? (
                <>
                  <span className="font-mono" dir="ltr">{metrics.eligibleCases}</span> أسر
                </>
              ) : (
                'جاهزة للصرف'
              )}
            </span>
            <span className="text-[10px] text-slate-500">تغطية 100% للعجز</span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 block">غير مشمولة هذا الشهر</span>
            <span className="text-base font-bold text-slate-900 mt-0.5 block tabular-nums">
              <span className="font-mono" dir="ltr">
                {metrics.excludedOrClosedCases + metrics.underInvestigationCases}
              </span>{' '}
              أسر
            </span>
            <button
              type="button"
              onClick={() => setShowFamiliesStatusModal(true)}
              className="text-[10px] text-slate-600 hover:text-[#005756] underline font-medium cursor-pointer"
            >
              عرض الأسباب
            </button>
          </div>
        </div>

        {/* Calm Cohesive Progress Bar (Teal + Slate shades only) */}
        <div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${(9 / 12) * 100}%` }}
              className="bg-[#005756] h-full transition-all"
              title="9 أسر مستفيدة هذا الشهر (75%)"
            />
            <div
              style={{ width: `${(1 / 12) * 100}%` }}
              className="bg-slate-500 h-full transition-all"
              title="أسرة مستبعدة مؤقتاً لوجود دعم خارجي (8%)"
            />
            <div
              style={{ width: `${(1 / 12) * 100}%` }}
              className="bg-slate-400 h-full transition-all"
              title="أسرة قيد البحث وتجهيز الأوراق (8%)"
            />
            <div
              style={{ width: `${(1 / 12) * 100}%` }}
              className="bg-slate-300 h-full transition-all"
              title="أسرة ملف مغلق لتحسن الدخل (8%)"
            />
          </div>

          {/* Calm Interactive Legend Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2.5 text-xs">
            <button
              type="button"
              onClick={() => setShowFamiliesStatusModal(true)}
              className="w-full p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between text-right hover:border-slate-300 hover:bg-slate-50/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#005756] shrink-0" />
                <span className="font-semibold text-slate-800 text-[11px]">مستفيدة هذا الشهر</span>
              </div>
              <span className="font-bold text-slate-900 text-xs tabular-nums">
                <span className="font-mono" dir="ltr">9</span> أسر (75%)
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowFamiliesStatusModal(true)}
              className="w-full p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between text-right hover:border-slate-300 hover:bg-slate-50/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-500 shrink-0" />
                <span className="font-semibold text-slate-700 text-[11px]">استبعاد مؤقت</span>
              </div>
              <span className="font-bold text-slate-800 text-xs tabular-nums">
                <span className="font-mono" dir="ltr">1</span> أسرة
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowFamiliesStatusModal(true)}
              className="w-full p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between text-right hover:border-slate-300 hover:bg-slate-50/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-400 shrink-0" />
                <span className="font-semibold text-slate-700 text-[11px]">قيد البحث</span>
              </div>
              <span className="font-bold text-slate-800 text-xs tabular-nums">
                <span className="font-mono" dir="ltr">1</span> أسرة
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowFamiliesStatusModal(true)}
              className="w-full p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between text-right hover:border-slate-300 hover:bg-slate-50/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 shrink-0" />
                <span className="font-semibold text-slate-700 text-[11px]">ملف مغلق</span>
              </div>
              <span className="font-bold text-slate-800 text-xs tabular-nums">
                <span className="font-mono" dir="ltr">1</span> أسرة
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Actionable Management Decisions & Alerts (قرارات وتنبيهات اليوم) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Cycle Approval Decision */}
        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold tracking-tight ${
                  isAllocationApproved ? 'text-[#005756]' : 'text-slate-700'
                }`}
              >
                {isAllocationApproved ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {isAllocationApproved ? 'تم اعتماد الصرف' : 'بانتظار اعتمادك'}
              </span>
              <span className="text-xs font-medium text-slate-400">
                أكتوبر <span className="font-mono" dir="ltr">2026</span>
              </span>
            </div>

            <h4 className="text-sm font-bold text-slate-900 mt-2.5 tracking-tight">
              {isAllocationApproved
                ? 'كشف صرف أكتوبر معتمد وجاهز'
                : 'كشف صرف أكتوبر جاهز للاعتماد'}
            </h4>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed" suppressHydrationWarning>
              {isAllocationApproved
                ? `تم اعتماد صرف ${metrics.approvedAssistanceTotal.toLocaleString('en-US')} ج.م لـ ${metrics.eligibleCases} أسر بواسطة ${currentAllocation?.approvedBy || 'الإدارة'}.`
                : `إجمالي المبلغ: ${metrics.approvedAssistanceTotal.toLocaleString('en-US')} ج.م لـ ${metrics.eligibleCases} أسر بتغطية كاملة للعجز.`}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-4 flex items-center gap-2">
            {!isAllocationApproved ? (
              <>
                <button
                  type="button"
                  onClick={handleQuickApproveCycle}
                  disabled={isApprovingCycle}
                  className="flex-1 min-h-[40px] py-2 px-3 bg-[#005756] hover:bg-[#004746] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Check size={14} />
                  <span>{isApprovingCycle ? 'جاري الاعتماد...' : 'اعتماد الصرف'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('allocation')}
                  className="min-h-[40px] py-2 px-3.5 bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                >
                  مراجعة الكشف
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleExportExcel}
                className="w-full min-h-[40px] py-2 px-3 bg-[#005756] hover:bg-[#004746] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <FileSpreadsheet size={14} />
                <span>تصدير كشف إكسل</span>
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Exceptions & Urgent Case Review */}
        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 tracking-tight">
                حالة استثناء معتمدة
              </span>
              <span className="text-xs font-mono text-slate-400" dir="ltr">
                EHS-104
              </span>
            </div>

            <h4 className="text-sm font-bold text-slate-900 mt-2.5 tracking-tight">
              محمد شعبان فتحي · منشأة ناصر
            </h4>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              صرف عاجل بقيمة 3,000 ج.م لظروف المرض وحالة السكن، وجارٍ استكمال شهادات ميلاد الأطفال.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium tabular-nums">
              تقدير الباحث: 90%
            </span>
            <button
              type="button"
              onClick={() => setSelectedCaseId('case-04')}
              className="text-xs text-slate-700 hover:text-[#005756] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>مراجعة الملف</span>
              <ChevronLeft size={14} />
            </button>
          </div>
        </div>

        {/* Card 3: Overdue Visits & Incomplete Documents (Calm Rose text strictly for urgent alert) */}
        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 tracking-tight">
                <AlertTriangle size={14} />
                تأخر في الزيارة الميدانية
              </span>
              <span className="text-xs text-rose-600 font-bold tabular-nums">
                متأخرة <span className="font-mono" dir="ltr">&gt; 8</span> أشهر
              </span>
            </div>

            <h4 className="text-sm font-bold text-slate-900 mt-2.5 tracking-tight">
              نادية فؤاد حسن · عزبة النخل{' '}
              <span className="font-mono text-xs font-normal text-slate-400" dir="ltr">
                (EHS-106)
              </span>
            </h4>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              آخر زيارة كانت في 10 فبراير 2026، وتحتاج تحديث بيانات دخل الابن والوضع الصحي.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">الباحث: أ. هبة الشامي</span>
            <button
              type="button"
              onClick={() => setActiveSection('research')}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>تحديد موعد زيارة</span>
              <ChevronLeft size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Interactive Visual Analytics Charts Grid (الرسوم البيانية التفاعلية) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Monthly Deficit vs Approved Support (2 cols) */}
        <div className="lg:col-span-2 p-5 md:p-6 bg-white rounded-xl border border-slate-200/80 shadow-none space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                مقارنة العجز الشهري مقابل المبلغ المعتمد
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                نسبة تغطية الدعم المعتمد للعجز الفعلي لكل أسرة
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('allocation')}
              className="text-xs text-[#005756] font-semibold hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>فتح التخصيص</span>
              <ChevronLeft size={14} />
            </button>
          </div>

          {/* Legend + Fixed-Height Interactive Hover Readout Strip (Zero Layout Shift) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600 shrink-0">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-slate-300 inline-block" />
                العجز الشهري
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#005756] inline-block" />
                المبلغ المعتمد
              </span>
            </div>

            <div
              aria-live="polite"
              suppressHydrationWarning
              className={`h-7 px-2.5 rounded-lg border text-[11px] flex items-center gap-2 whitespace-nowrap overflow-hidden tabular-nums pointer-events-none select-none transition-opacity duration-150 ${
                hoveredComparisonItem
                  ? 'opacity-100 visible bg-slate-50 border-slate-200/80 text-slate-700'
                  : 'opacity-0 invisible bg-slate-50 border-transparent text-transparent'
              }`}
            >
              {hoveredComparisonItem ? (
                <>
                  <span className="font-bold text-slate-900 truncate max-w-[140px]">
                    {hoveredComparisonItem.fullName}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span>
                    العجز:{' '}
                    <strong className="text-slate-800">
                      {hoveredComparisonItem.gap.toLocaleString('en-US')} ج.م
                    </strong>
                  </span>
                  <span className="text-slate-400">·</span>
                  <span>
                    المعتمد:{' '}
                    <strong className="text-[#005756]">
                      {hoveredComparisonItem.proposed.toLocaleString('en-US')} ج.م
                    </strong>
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="font-bold text-[#005756]">
                    {hoveredComparisonItem.coverage}%
                  </span>
                </>
              ) : (
                <span aria-hidden="true">-</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {caseComparisonData.map((item, idx) => {
              const gapPercent = Math.min(100, Math.round((item.gap / maxComparisonVal) * 100));
              const proposedPercent = Math.min(
                100,
                Math.round((item.proposed / maxComparisonVal) * 100)
              );
              const isHovered = hoveredBarIndex === idx;
              const isDimmed = hoveredBarIndex !== null && !isHovered;

              return (
                <div
                  key={item.id}
                  tabIndex={0}
                  onMouseEnter={() => setHoveredBarIndex(idx)}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                  onFocus={() => setHoveredBarIndex(idx)}
                  onBlur={() => setHoveredBarIndex(null)}
                  onClick={() => setSelectedCaseId(item.id)}
                  className={`relative p-2 -mx-2 rounded-xl border transition-all duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
                    isHovered
                      ? 'bg-slate-50/90 border-slate-200/80'
                      : 'border-transparent hover:bg-slate-50/60'
                  } ${isDimmed ? 'opacity-55' : 'opacity-100'}`}
                >
                  {/* Floating Hover Tooltip */}
                  {isHovered && (
                    <div
                      className="hidden sm:flex items-center gap-3 absolute left-3 -top-8 z-20 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] shadow-md pointer-events-none select-none whitespace-nowrap tabular-nums"
                      suppressHydrationWarning
                    >
                      <span className="font-bold">{item.fullName}</span>
                      <span className="text-slate-400">|</span>
                      <span>العجز: {item.gap.toLocaleString('en-US')} ج.م</span>
                      <span>المعتمد: {item.proposed.toLocaleString('en-US')} ج.م</span>
                      <span className="text-teal-300 font-bold">({item.coverage}%)</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 tracking-tight">{item.name}</span>
                      <span className="text-[11px] text-slate-400 hidden sm:inline">
                        {item.district}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 tabular-nums">
                      <span className="flex items-center gap-1">
                        <span>معتمد:</span>
                        <MoneyDisplay amount={item.proposed} size="xs" variant="teal" />
                      </span>
                      <span>/</span>
                      <span className="flex items-center gap-1">
                        <span>العجز:</span>
                        <MoneyDisplay amount={item.gap} size="xs" variant="neutral" />
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    {/* Monthly Deficit bar */}
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-300 rounded-full transition-all duration-300"
                        style={{ width: `${gapPercent}%` }}
                      />
                    </div>
                    {/* Approved Support bar */}
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#005756] rounded-full transition-all duration-300"
                        style={{ width: `${proposedPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-slate-50/70 rounded-xl text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2 border border-slate-200/80">
            <span className="flex items-center gap-1.5">
              <span>إجمالي العجز للأسر الجاهزة للصرف:</span>
              <MoneyDisplay
                amount={currentAllocation?.summary.totalAssessedNeed ?? 0}
                size="xs"
                variant="neutral"
              />
            </span>
            <span className="tabular-nums">
              نسبة التغطية المعتمدة:{' '}
              <strong className="text-[#005756] font-bold">
                {coveragePercentage}% {coveragePercentage >= 100 ? '(تغطية كاملة)' : ''}
              </strong>
            </span>
          </div>

          {overdueSuspendedCount > 0 && (
            <div className="p-3 bg-white rounded-xl text-xs text-slate-600 border border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
              <span suppressHydrationWarning>
                <strong className="text-rose-600">موقوفة للمتابعة:</strong> توجد{' '}
                {overdueSuspendedCount} {overdueSuspendedCount === 1 ? 'حالة' : 'حالات'} بمبلغ
                موقوف ({overdueSuspendedNeed.toLocaleString('en-US')} ج.م) لحين تحديث الزيارة
                الميدانية.
              </span>
              <span className="text-[11px] font-medium text-slate-500 shrink-0">
                لا تُخصم من المتاح في الخزنة
              </span>
            </div>
          )}
        </div>

        {/* Chart 2: Interactive Priority Breakdown Donut (1 col) */}
        <div className="p-5 md:p-6 bg-white rounded-xl border border-slate-200/80 shadow-none space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              توزيع الحالات حسب الأولوية
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              توزيع الأسر المسجلة وفق درجة الاحتياج والأولوية
            </p>
          </div>

          {/* Interactive SVG Donut Ring Chart (Exact Non-Overlapping Annular Sectors) */}
          <div className="py-2 flex flex-col items-center justify-center">
            <div
              className="relative w-44 h-44 flex items-center justify-center"
              onMouseLeave={() => setHoveredSliceIndex(null)}
            >
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full overflow-visible"
                onMouseLeave={() => setHoveredSliceIndex(null)}
              >
                {(() => {
                  const nonZeroSlicesCount = priorityCounts.filter((s) => s.value > 0).length;
                  let currentAngle = 0;

                  return priorityCounts.map((slice, i) => {
                    if (slice.value <= 0) return null;

                    const angleSpan = (slice.value / totalPriorityCases) * 360;
                    const startAngle = currentAngle;
                    const endAngle = currentAngle + angleSpan;
                    currentAngle = endAngle;

                    const isActive = hoveredSliceIndex === i;
                    const isDimmed = hoveredSliceIndex !== null && !isActive;

                    // Handle single 100% slice cleanly without zero-length arc collapse
                    if (angleSpan >= 359.9) {
                      return (
                        <circle
                          key={slice.name}
                          cx="50"
                          cy="50"
                          r="37"
                          fill="none"
                          stroke={slice.color}
                          strokeWidth={isActive ? 17 : 14}
                          pointerEvents="stroke"
                          opacity={isDimmed ? 0.35 : 1}
                          className="transition-all duration-150 cursor-pointer outline-none"
                          onMouseEnter={() => setHoveredSliceIndex(i)}
                          onMouseLeave={() => setHoveredSliceIndex(null)}
                          onFocus={() => setHoveredSliceIndex(i)}
                          onBlur={() => setHoveredSliceIndex(null)}
                        />
                      );
                    }

                    const gap = nonZeroSlicesCount > 1 && angleSpan > 3 ? 1.4 : 0;
                    const sectorPath = describeDonutSector(
                      50,
                      50,
                      isActive ? 29 : 30.5,
                      isActive ? 47 : 44.5,
                      startAngle + gap / 2,
                      endAngle - gap / 2
                    );

                    return (
                      <path
                        key={slice.name}
                        d={sectorPath}
                        fill={slice.color}
                        pointerEvents="fill"
                        opacity={isDimmed ? 0.35 : 1}
                        className="transition-all duration-150 cursor-pointer outline-none"
                        onMouseEnter={() => setHoveredSliceIndex(i)}
                        onMouseLeave={() => setHoveredSliceIndex(null)}
                        onFocus={() => setHoveredSliceIndex(i)}
                        onBlur={() => setHoveredSliceIndex(null)}
                      />
                    );
                  });
                })()}
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center px-4">
                {activePrioritySlice ? (
                  <>
                    <span
                      className={`text-2xl font-bold leading-none tabular-nums tracking-tight pointer-events-none ${
                        activePrioritySlice.isCritical ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      {activePrioritySlice.value}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-700 mt-1 pointer-events-none">
                      {activePrioritySlice.name}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 tabular-nums mt-0.5 pointer-events-none">
                      {activePriorityPercent}% من الإجمالي
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-bold text-slate-900 leading-none tabular-nums tracking-tight pointer-events-none">
                      {cases.length}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1 font-medium pointer-events-none">
                      كل الحالات
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div
            className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs"
            onMouseLeave={() => setHoveredSliceIndex(null)}
          >
            {priorityCounts.map((p, idx) => {
              const percent = Math.round((p.value / totalPriorityCases) * 100);
              const isActive = hoveredSliceIndex === idx;
              return (
                <button
                  key={p.name}
                  type="button"
                  onMouseEnter={() => setHoveredSliceIndex(idx)}
                  onMouseLeave={() => setHoveredSliceIndex(null)}
                  onFocus={() => setHoveredSliceIndex(idx)}
                  onBlur={() => setHoveredSliceIndex(null)}
                  onClick={() =>
                    setHoveredSliceIndex((prev) => (prev === idx ? null : idx))
                  }
                  className={`flex items-center justify-between gap-1.5 p-2 rounded-lg border text-right transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-50 border-slate-300'
                      : 'bg-white border-transparent hover:bg-slate-50/70'
                  }`}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="text-slate-700 truncate text-[11px] font-medium">{p.name}</span>
                  </span>
                  <span className="font-bold text-slate-900 tabular-nums text-[11px] shrink-0">
                    {p.value} <span className="text-slate-400 font-normal">({percent}%)</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 6. Operational Follow-up & Audit Trail (حالات المتابعة السريعة وسجل القرارات) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Follow-up Cases List */}
        <div className="p-5 md:p-6 bg-white rounded-xl border border-slate-200/80 shadow-none space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                حالات تحتاج متابعة سريعة
              </h3>
              <p className="text-xs text-slate-500">
                حالات حرجة أو أوراق ناقصة أو تأخر عن الزيارة الميدانية
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('cases')}
              className="text-xs text-[#005756] font-semibold hover:underline cursor-pointer shrink-0"
            >
              عرض كل الحالات
            </button>
          </div>

          <div className="space-y-2.5">
            {cases
              .filter(
                (c) =>
                  c.priority === 'critical' ||
                  c.isVisitOverdue ||
                  c.vulnerability.incompleteDocuments
              )
              .slice(0, 4)
              .map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCaseId(c.id)}
                  className="p-3.5 rounded-xl border border-slate-200/80 hover:border-[#005756]/50 hover:bg-slate-50/70 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 group-hover:text-[#005756] truncate">
                        {c.fullName}
                      </span>
                      <span className="text-xs font-mono text-slate-400 shrink-0">({c.code})</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={11} className="text-slate-400" />
                        {c.district}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>الباحث: {c.assignedResearcher}</span>
                      {c.isVisitOverdue && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-rose-600 font-semibold text-[11px]">
                            متأخرة عن الزيارة
                          </span>
                        </>
                      )}
                      {c.vulnerability.incompleteDocuments && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-600 font-medium text-[11px]">
                            أوراق ناقصة
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <span
                      className="text-xs font-bold text-slate-900 block tabular-nums"
                      suppressHydrationWarning
                    >
                      {c.financials.netFinancialGap.toLocaleString('en-US')} ج.م
                    </span>
                    <span className="text-[11px] text-slate-400">العجز الشهري</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Operational Audit Log */}
        <div className="p-5 md:p-6 bg-white rounded-xl border border-slate-200/80 shadow-none space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                سجل القرارات والإجراءات
              </h3>
              <p className="text-xs text-slate-500">
                آخر قرارات الاعتماد والتعديلات المالية في المبادرة
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSection('reports')}
              className="text-xs text-slate-600 hover:text-[#005756] font-semibold cursor-pointer shrink-0"
            >
              عرض الكل
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {auditLogs.slice(0, 4).map((log, idx) => (
              <div
                key={`${log.id}-${idx}`}
                className="py-3 first:pt-1 last:pb-1 text-xs space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{log.action}</span>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0 tabular-nums">
                    {log.timestamp}
                  </span>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">{log.details}</p>
                <p className="text-[11px] text-slate-500 font-medium">بواسطة: {log.user}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal 1: Donation Breakdown Modal */}
      {showDonationBreakdownModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowDonationBreakdownModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh] text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-800">تفصيل أموال الخزينة</h3>
                <p className="text-xs text-slate-500 mt-1 tabular-nums" suppressHydrationWarning>
                  إجمالي التبرعات الموجودة بالخزينة: {metrics.receivedDonationsTotal.toLocaleString('en-US')} ج.م
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDonationBreakdownModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                aria-label="إغلاق"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs text-slate-700 leading-relaxed">
              {/* Category 1: Unrestricted */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Unlock size={16} className="text-slate-400" />
                    <span className="font-bold text-slate-800 text-sm">
                      1. التبرعات العامة (متاحة لكل الحالات)
                    </span>
                  </div>
                  <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    <MoneyDisplay
                      amount={metrics.unrestrictedDonationsBalance}
                      size="sm"
                      variant="teal"
                    />
                  </div>
                </div>
                <p className="text-slate-600 text-xs">
                  <strong>التوضيح:</strong> تبرعات عامة يمكن صرفها على أي احتياج أساسي مثل الإيجارات والغذاء وسداد الديون والإعانات الشهرية.
                </p>
                <div className="bg-white rounded-lg p-2.5 border border-slate-200/80 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-700">
                    <span>• م. أحمد حسام الدين (تحويل بنكي شهري)</span>
                    <span className="font-mono font-bold">65,000 ج.م</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>• مجموعة الأمل للمقاولات (شيك دعم عام)</span>
                    <span className="font-mono font-bold">40,000 ج.م</span>
                  </div>
                </div>
              </div>

              {/* Category 2: Restricted */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock size={16} className="text-slate-400" />
                    <span className="font-bold text-slate-800 text-sm">
                      2. تبرعات لأغراض محددة
                    </span>
                  </div>
                  <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    <MoneyDisplay
                      amount={metrics.restrictedDonationsBalance}
                      size="sm"
                      variant="neutral"
                    />
                  </div>
                </div>
                <p className="text-slate-600 text-xs">
                  <strong>ضابط الصرف:</strong> مبالغ خصصها المتبرعون لأغراض محددة ولا تُصرف في غيرها:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 space-y-1">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>رعاية طبية وعمليات</span>
                      <span className="font-mono text-[#005756]">25,000 ج.م</span>
                    </div>
                    <p className="text-slate-500 text-[10px]">د. منى الشريف: جلسات غسيل كلوي وأدوية أمراض مزمنة</p>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 space-y-1">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>كفالة أيتام وتعليم</span>
                      <span className="font-mono text-[#005756]">20,000 ج.م</span>
                    </div>
                    <p className="text-slate-500 text-[10px]">فاعل خير (الإسكندرية): نفقات معيشة وكتب ومصاريف دراسية</p>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 space-y-1">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>كفالة حالة خاصة بالاسم</span>
                      <span className="font-mono text-[#005756]">15,000 ج.م</span>
                    </div>
                    <p className="text-slate-500 text-[10px]">م. هشام عبد المنعم: للحالة EHS-105 (أحمد رجب - ضمور عضلات)</p>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 space-y-1">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>ترميم وسقف منازل</span>
                      <span className="font-mono text-[#005756]">15,000 ج.م</span>
                    </div>
                    <p className="text-slate-500 text-[10px]">د. سارة الديب: عزل أمطار وترميم أسقف قبل الشتاء</p>
                  </div>
                </div>
              </div>

              {/* Category 3: Pledged */}
              <div className="px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-slate-400 shrink-0" />
                  <span>تعهدات منتظرة (أ. طارق عبد الحميد - تحويل بنكي قريب):</span>
                </div>
                <MoneyDisplay amount={metrics.pledgedDonationsTotal} size="xs" variant="neutral" />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowDonationBreakdownModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-200/70 transition-colors cursor-pointer"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDonationBreakdownModal(false);
                  setActiveSection('donations');
                }}
                className="px-5 py-2 text-xs font-bold bg-[#005756] text-white rounded-xl hover:bg-[#004746] transition-colors cursor-pointer"
              >
                فتح سجل التبرعات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Families Status & Distribution Modal */}
      {showFamiliesStatusModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowFamiliesStatusModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh] text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  توزيع الأسر المسجلة (إجمالي 12 أسرة)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  توضيح الحالات الجاهزة للصرف والأسباب الخاصة بباقي الأسر لدورة أكتوبر 2026
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFamiliesStatusModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                aria-label="إغلاق"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto text-xs text-slate-700">
              <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-600 space-y-1 leading-relaxed">
                <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Check size={14} className="text-slate-400 shrink-0" />
                  <span>لماذا تضم دورة الصرف 9 أسر بتغطية كاملة؟</span>
                </p>
                <p suppressHydrationWarning>
                  من بين 12 أسرة مسجلة، تشمل الدورة 9 أسر جاهزة للصرف (8 أسر أساسية + حالة استثناء عاجل) تم توفير كامل مبالغها ({metrics.approvedAssistanceTotal.toLocaleString('en-US')} ج.م)، بينما الحالات الـ 3 الأخرى مؤجلة أو قيد المراجعة للأسباب الموضحة أدناه.
                </p>
              </div>

              {/* Category 1: Funded Cases */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-700 text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-xs bg-[#005756] inline-block" />
                    <span>المجموعة الأولى: 9 أسر جاهزة ومشمولة بالصرف هذا الشهر</span>
                  </h4>
                  <span className="text-[11px] font-bold text-slate-700 bg-slate-50 px-2.5 py-0.5 rounded-md border border-slate-200 inline-flex items-center gap-1">
                    <span>المعتمد:</span>
                    <MoneyDisplay amount={metrics.approvedAssistanceTotal} size="xs" variant="teal" />
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {cases
                    .filter(
                      (c) =>
                        c.status === 'active_eligible' ||
                        (c.status === 'pending_exception' && c.vulnerability.exceptionApproved)
                    )
                    .map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setShowFamiliesStatusModal(false);
                          setSelectedCaseId(c.id);
                        }}
                        className="p-2.5 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 hover:border-[#005756]/40 transition-colors cursor-pointer space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-[11px] truncate">
                            {c.fullName}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">{c.code}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>{c.district}</span>
                          {c.vulnerability.exceptionApproved ? (
                            <span className="text-[#005756] font-semibold">استثناء معتمد</span>
                          ) : (
                            <span className="text-slate-600 font-medium">جاهزة للصرف</span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Category 2: Excluded / Closed */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-700 text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-xs bg-slate-400 inline-block" />
                    <span>المجموعة الثانية: 3 أسر غير مشمولة في صرف أكتوبر</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">مراجعة إدارية</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          محمود عبد العليم سلامة{' '}
                          <span className="font-mono text-xs font-normal text-slate-500">
                            (EHS-109)
                          </span>
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          · استبعاد مؤقت (أكتوبر فقط)
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">فيصل (العشرين)</span>
                    </div>
                    <p className="text-slate-600 text-[11.5px] leading-relaxed">
                      <strong>السبب:</strong> استلمت الأسرة منحة طارئة مباشرة من فاعل خير بقيمة 5,000 ج.م ومواد غذائية تكفيها لشهرين، فتم تأجيل الصرف مؤقتاً لتوجيه الدعم لحالات أشد احتياجاً.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          صابر جاد المولى مهران{' '}
                          <span className="font-mono text-xs font-normal text-slate-500">
                            (EHS-110)
                          </span>
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          · قيد البحث والأوراق
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">المرج الشرقية</span>
                    </div>
                    <p className="text-slate-600 text-[11.5px] leading-relaxed">
                      <strong>السبب:</strong> الأوراق غير مكتملة، وبانتظار استكمال تقرير البحث الميداني لـ أ. هبة الشامي للتأكد من الدخل الفعلي قبل إدراجها بالصرف.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          كمال حامد عثمان الصعيدي{' '}
                          <span className="font-mono text-xs font-normal text-slate-500">
                            (EHS-112)
                          </span>
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          · ملف مغلق
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">الجمالية</span>
                    </div>
                    <p className="text-slate-600 text-[11.5px] leading-relaxed">
                      <strong>السبب:</strong> تم إغلاق الملف بعد تخرج الابن وتعيينه بوظيفة محاسب براتب مستقر (7,500 ج.م)، وأصبح دخل الأسرة كافياً.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowFamiliesStatusModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-200/70 transition-colors cursor-pointer"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFamiliesStatusModal(false);
                  setActiveSection('cases');
                }}
                className="px-5 py-2 text-xs font-bold bg-[#005756] text-white rounded-xl hover:bg-[#004746] transition-colors cursor-pointer"
              >
                عرض سجل الحالات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
