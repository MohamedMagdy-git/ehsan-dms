'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
import {
  Users,
  AlertTriangle,
  Clock,
  HeartHandshake,
  Coins,
  ShieldCheck,
  TrendingUp,
  FileCheck2,
  ChevronLeft,
  CheckCircle2,
  Wallet,
  ShieldAlert,
  ArrowDownRight,
  Info,
  MapPin,
  X,
  Lock,
  Unlock,
  Check,
  HelpCircle,
  ExternalLink,
  FileSpreadsheet,
  AlertCircle,
  FileQuestion,
} from 'lucide-react';
import { InfoTooltip } from '@/components/common/info-tooltip';
import { RoleInspirationalCard } from '@/components/common/role-inspirational-card';
import { MoneyDisplay } from '@/components/common/money-display';

export function DashboardView() {
  const {
    metrics,
    cases,
    donations,
    currentAllocation,
    setActiveSection,
    setSelectedCaseId,
    auditLogs,
    currentUserRole,
    approveAllocation,
    currentPeriod,
  } = useApp();

  const [showDonationBreakdownModal, setShowDonationBreakdownModal] = useState(false);
  const [showFamiliesStatusModal, setShowFamiliesStatusModal] = useState(false);
  const [isApprovingCycle, setIsApprovingCycle] = useState(false);

  // Priority distribution data for chart
  const priorityCounts = [
    { name: 'حرجة وعاجلة', value: cases.filter((c) => c.priority === 'critical').length, color: '#dc2626' },
    { name: 'مرتفعة', value: cases.filter((c) => c.priority === 'high').length, color: '#ea580c' },
    { name: 'متوسطة', value: cases.filter((c) => c.priority === 'medium').length, color: '#d97706' },
    { name: 'اعتيادية/منخفضة', value: cases.filter((c) => c.priority === 'low').length, color: '#65a30d' },
  ];

  // Cases comparison: Family Need Gap vs Proposed/Approved Assistance
  const caseComparisonData = cases
    .filter((c) => c.status === 'active_eligible' || (c.status === 'pending_exception' && c.vulnerability?.exceptionApproved))
    .slice(0, 6)
    .map((c) => {
      const allocItem = currentAllocation?.items.find((i) => i.caseId === c.id);
      return {
        name: c.fullName.split(' ')[0] + ' ' + (c.fullName.split(' ')[1] || ''),
        gap: c.financials.netFinancialGap,
        proposed: allocItem ? (allocItem.approvedAmount > 0 ? allocItem.approvedAmount : allocItem.proposedAmount) : 0,
      };
    });

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

  const coveragePercentage = totalAssessedNeed > 0
    ? Math.min(100, Math.round((totalAllocated / totalAssessedNeed) * 100))
    : 100;

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

      {/* 2. Key Financial Metrics Grid (المؤشرات المالية الرئيسية الستة) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">الموقف المالي الحقيقي للخزينة والصناديق</h2>
            <span className="text-xs text-slate-400 font-mono">· عملة الجنيه المصري (ج.م)</span>
          </div>
          <button
            type="button"
            onClick={() => setShowDonationBreakdownModal(true)}
            className="text-xs text-teal-800 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>كشف تفصيل الصناديق والمقيد</span>
            <ChevronLeft size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3.5">
          {/* Metric 1: Total Received Donations */}
          <div className="p-3 sm:p-4 bg-white rounded-xl border border-slate-200/70 shadow-none flex flex-col justify-between hover:border-slate-300 transition-all duration-150 group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 tracking-tight">إجمالي التبرعات المحصلة</span>
                <InfoTooltip
                  title="إجمالي التبرعات المحصلة"
                  badge="سيولة مودعة"
                  badgeColor="teal"
                  icon="help"
                  iconSize={13}
                  content={
                    <p>
                      المبالغ التي تم تحصيلها وتسجيلها فعلياً في حسابات وخزينة الجمعية هذا الشهر ({metrics.receivedDonationsTotal.toLocaleString('ar-EG')} ج.م)، وهي جاهزة للتمويل الإنساني وتتوزع بين عام متاح ومقيد بأغراض.
                    </p>
                  }
                />
              </div>
              <span className="text-[11px] text-teal-800 font-medium block mt-0.5">النقد الفعلي بالخزينة</span>
            </div>
            <div className="mt-3">
              <MoneyDisplay
                amount={metrics.receivedDonationsTotal}
                size="lg"
                variant="neutral"
              />
              <div className="mt-2 pt-2 border-t border-slate-100/80 flex items-center justify-between text-[10px] text-slate-500 tabular-nums">
                <span>مودعة بالكامل</span>
                <span className="text-teal-700 font-bold">100% موثقة</span>
              </div>
            </div>
          </div>

          {/* Metric 2: Unrestricted Donations */}
          <div className="p-4 bg-white rounded-xl border border-slate-200/70 shadow-none flex flex-col justify-between hover:border-slate-300 transition-all duration-150 group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 tracking-tight">التبرعات غير المقيدة</span>
                <InfoTooltip
                  title="التبرعات غير المقيدة (العامة)"
                  badge="صندوق عام"
                  badgeColor="teal"
                  icon="help"
                  iconSize={13}
                  content={
                    <p>
                      المبالغ العامة التي تسمح قواعد الجمعية باستخدامها في كافة مصارف المساعدات والأسر المستحقة بمرونة تامة دون أي قيد من المتبرع ({metrics.unrestrictedDonationsBalance.toLocaleString('ar-EG')} ج.م).
                    </p>
                  }
                />
              </div>
              <span className="text-[11px] text-slate-600 font-medium block mt-0.5">متاحة لكافة المصارف</span>
            </div>
            <div className="mt-3">
              <MoneyDisplay
                amount={metrics.unrestrictedDonationsBalance}
                size="lg"
                variant="teal"
              />
              <div className="mt-2 pt-2 border-t border-slate-100/80 flex items-center justify-between text-[10px] text-slate-500 tabular-nums">
                <span>وعاء التوزيع الأساسي</span>
                <span className="font-mono text-teal-800 font-bold">58% من النقد</span>
              </div>
            </div>
          </div>

          {/* Metric 3: Restricted Donations */}
          <div className="p-4 bg-white rounded-xl border border-slate-200/70 shadow-none flex flex-col justify-between hover:border-slate-300 transition-all duration-150 group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 tracking-tight">التبرعات المقيدة</span>
                <InfoTooltip
                  title="التبرعات المقيدة (المشروطة)"
                  badge="أغراض وحالات"
                  badgeColor="indigo"
                  icon="help"
                  iconSize={13}
                  content={
                    <div className="space-y-1 text-xs">
                      <p>أموال مخصصة حصراً لأغراض أو حالات محددة من قبل المتبرعين ({metrics.restrictedDonationsBalance.toLocaleString('ar-EG')} ج.م)، ويحظر صرفها في غير أبوابها المقررة:</p>
                      <div className="pt-1 border-t border-slate-800 text-[10px] space-y-0.5">
                        <div>• رعاية طبية وعمليات: 25,000 ج.م</div>
                        <div>• كفالة أيتام وتعليم: 20,000 ج.م</div>
                        <div>• كفالة حالة خاصة (EHS-105): 15,000 ج.م</div>
                        <div>• سقف وترميم منازل: 15,000 ج.م</div>
                      </div>
                    </div>
                  }
                />
              </div>
              <span className="text-[11px] text-indigo-700 font-medium block mt-0.5">مشروطة بأغراض محددة</span>
            </div>
            <div className="mt-3">
              <MoneyDisplay
                amount={metrics.restrictedDonationsBalance}
                size="lg"
                variant="neutral"
              />
              <div className="mt-2 pt-2 border-t border-slate-100/80 flex items-center justify-between text-[10px] tabular-nums">
                <button
                  type="button"
                  onClick={() => setShowDonationBreakdownModal(true)}
                  className="text-indigo-700 hover:text-indigo-900 font-semibold underline cursor-pointer"
                >
                  عرض تفصيل الأغراض
                </button>
                <span className="font-mono text-indigo-800 font-bold">4 مصارف</span>
              </div>
            </div>
          </div>

          {/* Metric 4: Approved Assistance */}
          <div className="p-4 bg-white rounded-xl border border-slate-200/70 shadow-none flex flex-col justify-between hover:border-slate-300 transition-all duration-150 group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 tracking-tight">المعتمد للصرف</span>
                <InfoTooltip
                  title="المساعدات المعتمدة للصرف"
                  badge="التزام مالي"
                  badgeColor="slate"
                  icon="help"
                  iconSize={13}
                  content={
                    <p>
                      الالتزامات والمساعدات التي وافقت عليها الإدارة وأقرتها في كشف دورة أكتوبر 2026 ({metrics.approvedAssistanceTotal.toLocaleString('ar-EG')} ج.م) لصالح 9 أسر مستحقة.
                    </p>
                  }
                />
              </div>
              <span className="text-[11px] text-blue-700 font-medium block mt-0.5">دورة أكتوبر 2026</span>
            </div>
            <div className="mt-3">
              <MoneyDisplay
                amount={metrics.approvedAssistanceTotal}
                size="lg"
                variant="neutral"
              />
              <div className="mt-2 pt-2 border-t border-slate-100/80 flex items-center justify-between text-[10px] text-slate-500 tabular-nums">
                <span>المستفيدون</span>
                <span className="text-blue-800 font-bold">{metrics.eligibleCases} أسر</span>
              </div>
            </div>
          </div>

          {/* Metric 5: Disbursed Assistance */}
          <div className="p-4 bg-white rounded-xl border border-slate-200/70 shadow-none flex flex-col justify-between hover:border-slate-300 transition-all duration-150 group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 tracking-tight">المصروف فعلياً</span>
                <InfoTooltip
                  title="المساعدات المصروفة فعلياً"
                  badge="توثيق التسليم"
                  badgeColor="emerald"
                  icon="help"
                  iconSize={13}
                  content={
                    <p>
                      المبالغ التي تم توثيق صرفها وتسليمها فعلياً للمستحقين. بعد اعتماد دورة الصرف، يصبح المبلغ معتمداً ومسلماً للمستحقين بالكامل وفق الإيصالات الرسمية.
                    </p>
                  }
                />
              </div>
              <span className="text-[11px] text-emerald-800 font-medium block mt-0.5">توثيق تسليم المساعدات</span>
            </div>
            <div className="mt-3">
              <MoneyDisplay
                amount={metrics.disbursedAssistanceTotal}
                size="lg"
                variant="approved"
              />
              <div className="mt-2 pt-2 border-t border-slate-100/80 flex items-center justify-between text-[10px] tabular-nums">
                <span className="text-slate-500">حالة الصرف:</span>
                <span className={`font-bold ${isAllocationApproved ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {isAllocationApproved ? 'تم الصرف والتسليم' : 'بانتظار الاعتماد'}
                </span>
              </div>
            </div>
          </div>

          {/* Metric 6: Unrestricted Available Balance */}
          <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200/70 shadow-none flex flex-col justify-between hover:border-emerald-300 transition-all duration-150 group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-950 tracking-tight">الرصيد المتاح للتخصيص</span>
                <InfoTooltip
                  title="الرصيد غير المقيد المتاح للتخصيص الحر"
                  badge="فائض أمان"
                  badgeColor="emerald"
                  icon="help"
                  iconSize={13}
                  content={
                    <div className="space-y-1 text-xs">
                      <p className="font-semibold text-emerald-300">طريقة الحساب المحاسبية الدقيقة:</p>
                      <div className="bg-slate-800 p-2 rounded-lg font-mono text-[11px] text-emerald-300">
                        التبرعات غير المقيدة ({metrics.unrestrictedDonationsBalance.toLocaleString('ar-EG')}) - المعتمد للصرف ({metrics.approvedAssistanceTotal.toLocaleString('ar-EG')}) = +{metrics.unrestrictedAvailableBalance.toLocaleString('ar-EG')} ج.م
                      </div>
                      <p>
                        هذا المبلغ يمثل السيولة العامة المتاحة للاستخدام الإنساني الآمن دون أدنى مساس بأموال التبرعات المقيدة لأغراض أخرى.
                      </p>
                    </div>
                  }
                />
              </div>
              <span className="text-[11px] text-emerald-800 font-medium block mt-0.5">سيولة حرة آمنة</span>
            </div>
            <div className="mt-3">
              <MoneyDisplay
                amount={metrics.unrestrictedAvailableBalance}
                size="lg"
                variant="approved"
              />
              <div className="mt-2 pt-2 border-t border-emerald-200/70 flex items-center justify-between text-[10px] tabular-nums">
                <span className="text-emerald-800 font-medium">موقف آمن تماماً</span>
                <span className="font-mono text-emerald-900 font-bold">جاهز للصرف</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Family Status & Beneficiary Pipeline (مؤشرات الأسر والاستحقاق وتوزيع الحالات) */}
      <div className="p-5 bg-white rounded-xl border border-slate-200/70 shadow-none space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-teal-50 text-teal-800 border border-teal-100/80">
              <Users size={16} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  خريطة ومؤشرات استحقاق الأسر المسجلة (إجمالي {metrics.totalCases} أسرة)
                </h3>
                <InfoTooltip
                  title="مؤشرات استحقاق الأسر"
                  badge="دورة أكتوبر"
                  badgeColor="teal"
                  icon="help"
                  iconSize={13}
                  content={
                    <div className="space-y-1.5 text-xs">
                      <p>
                        تضم قاعدة بيانات الجمعية 12 أسرة مسجلة، تم تصنيفها بدقة وفق البحث الاجتماعي:
                      </p>
                      <div className="pt-1 border-t border-slate-800 space-y-1 text-[11px]">
                        <div>• <strong>9 أسر مستحقة للصرف (100% تغطية):</strong> (8 استحقاق أساسي + 1 استثناء معتمد).</div>
                        <div>• <strong>1 أسرة استبعاد مؤقت:</strong> كفالة خارجية طارئة 5,000 ج.م لشهر أكتوبر.</div>
                        <div>• <strong>1 أسرة قيد البحث:</strong> أوراق ثبوتية غير مكتملة وبانتظار تقرير الباحث.</div>
                        <div>• <strong>1 أسرة ملف مغلق:</strong> زوال الاستحقاق بعد توظيف الابن بمرتب 7,500 ج.م.</div>
                      </div>
                    </div>
                  }
                />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                تتبع حالة الاستحقاق من التسجيل حتى اعتماد الصرف مع توضيح أسباب استبعاد أي حالة بشفافية
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowFamiliesStatusModal(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:text-teal-900 bg-teal-50/80 hover:bg-teal-100 px-3.5 py-1.5 rounded-full border border-teal-200/80 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] self-start sm:self-auto cursor-pointer"
          >
            <Info size={13} />
            <span>عرض تفاصيل الحالات وأسباب الاستبعاد</span>
          </button>
        </div>

        {/* Pipeline Funnel Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 ring-1 ring-black/[0.02]">
            <span className="text-[11px] text-slate-500 block">إجمالي المسجلين</span>
            <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block tabular-nums">{metrics.totalCases} أسرة</span>
            <span className="text-[10px] text-slate-400">قاعدة البيانات</span>
          </div>

          <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200/60 ring-1 ring-teal-500/10">
            <span className="text-[11px] text-teal-900 block font-medium">الأسر المؤهلة والنشطة</span>
            <span className="text-base font-bold text-teal-900 font-mono mt-0.5 block tabular-nums">{metrics.eligibleCases} أسر</span>
            <span className="text-[10px] text-teal-700">8 أساسي + 1 استثناء</span>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/60 ring-1 ring-blue-500/10">
            <span className="text-[11px] text-blue-900 block font-medium">مدرجة بمقترح الصرف</span>
            <span className="text-base font-bold text-blue-900 font-mono mt-0.5 block tabular-nums">{metrics.eligibleCases} أسر</span>
            <span className="text-[10px] text-blue-700">دورة أكتوبر 2026</span>
          </div>

          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200/60 ring-1 ring-indigo-500/10">
            <span className="text-[11px] text-indigo-900 block font-medium">معتمد لها الصرف</span>
            <span className="text-base font-bold text-indigo-900 font-mono mt-0.5 block tabular-nums">{metrics.eligibleCases} أسر</span>
            <span className="text-[10px] text-indigo-700 tabular-nums">{metrics.approvedAssistanceTotal.toLocaleString('ar-EG')} ج.م</span>
          </div>

          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60 ring-1 ring-emerald-500/10">
            <span className="text-[11px] text-emerald-900 block font-medium">الصرف والتسليم</span>
            <span className="text-base font-bold text-emerald-800 font-mono mt-0.5 block tabular-nums">{metrics.disbursedAssistanceTotal > 0 ? `${metrics.eligibleCases} أسر` : 'جاهزة للصرف'}</span>
            <span className="text-[10px] text-emerald-700">تغطية 100% للاحتياج</span>
          </div>

          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 ring-1 ring-amber-500/10">
            <span className="text-[11px] text-amber-900 block font-medium">غير مشمولة هذا الشهر</span>
            <span className="text-base font-bold text-amber-900 font-mono mt-0.5 block tabular-nums">{metrics.excludedOrClosedCases + metrics.underInvestigationCases} أسر</span>
            <button
              type="button"
              onClick={() => setShowFamiliesStatusModal(true)}
              className="text-[10px] text-amber-800 hover:text-amber-950 underline font-medium cursor-pointer"
            >
              عرض الأسباب
            </button>
          </div>
        </div>

        {/* Visual Progress Bar (12 Families) */}
        <div>
          <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${(9 / 12) * 100}%` }}
              className="bg-emerald-500 h-full transition-all"
              title="9 أسر مستفيدة ومعتمدة للصرف (75%)"
            />
            <div
              style={{ width: `${(1 / 12) * 100}%` }}
              className="bg-sky-500 h-full transition-all"
              title="أسرة واحدة مستبعدة مؤقتاً لتلقي دعم خارجي (8%)"
            />
            <div
              style={{ width: `${(1 / 12) * 100}%` }}
              className="bg-amber-500 h-full transition-all"
              title="أسرة واحدة تحت البحث الميداني وتجهيز الأوراق (8%)"
            />
            <div
              style={{ width: `${(1 / 12) * 100}%` }}
              className="bg-slate-400 h-full transition-all"
              title="أسرة واحدة ملف مغلق لزوال الاستحقاق واستقرار الدخل (8%)"
            />
          </div>

          {/* Interactive Status Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs">
            <button
              type="button"
              onClick={() => setShowFamiliesStatusModal(true)}
              className="w-full p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 ring-1 ring-emerald-500/10 flex items-center justify-between text-right hover:bg-emerald-100/80 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="font-semibold text-emerald-950 text-[11px] tracking-tight">مستفيدة هذا الشهر</span>
              </div>
              <span className="font-mono font-bold text-emerald-800 text-xs tabular-nums">9 أسر (75%)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFamiliesStatusModal(true)}
              className="w-full p-2.5 rounded-xl bg-sky-50/70 border border-sky-200/80 ring-1 ring-sky-500/10 flex items-center justify-between text-right hover:bg-sky-100/80 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0"></span>
                <span className="font-semibold text-sky-950 text-[11px] tracking-tight">استبعاد مؤقت (دعم خارجي)</span>
              </div>
              <span className="font-mono font-bold text-sky-800 text-xs tabular-nums">1 أسرة</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFamiliesStatusModal(true)}
              className="w-full p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 ring-1 ring-amber-500/10 flex items-center justify-between text-right hover:bg-amber-100/80 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                <span className="font-semibold text-amber-950 text-[11px] tracking-tight">قيد البحث والأوراق</span>
              </div>
              <span className="font-mono font-bold text-amber-800 text-xs tabular-nums">1 أسرة</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFamiliesStatusModal(true)}
              className="w-full p-2.5 rounded-xl bg-slate-100/80 border border-slate-200/80 ring-1 ring-black/[0.02] flex items-center justify-between text-right hover:bg-slate-200/80 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500 shrink-0"></span>
                <span className="font-semibold text-slate-800 text-[11px] tracking-tight">ملف مغلق (زال الاستحقاق)</span>
              </div>
              <span className="font-mono font-bold text-slate-700 text-xs tabular-nums">1 أسرة</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Actionable Management Decisions & Operational Alerts (بنود الإجراءات والقرارات المعلقة) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Cycle Approval Decision */}
        <div className={`p-5 rounded-xl border shadow-none flex flex-col justify-between transition-all duration-150 ${
          isAllocationApproved
            ? 'bg-emerald-50/40 border-emerald-200/80'
            : 'bg-amber-50/40 border-amber-200/80'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-tight ${
                isAllocationApproved ? 'bg-emerald-500/10 text-emerald-800 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-900 border border-amber-500/20'
              }`}>
                {isAllocationApproved ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                {isAllocationApproved ? 'دورة معتمدة رسمياً' : 'قرار معلق ينتظر المدير'}
              </span>
              <span className="text-xs font-mono text-slate-400">أكتوبر 2026</span>
            </div>

            <h4 className="text-sm font-bold text-slate-900 mt-2.5 tracking-tight">
              {isAllocationApproved
                ? 'كشف صرف دورة أكتوبر 2026 معتمد'
                : 'مقترح دورة أكتوبر 2026 جاهز للاعتماد'}
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {isAllocationApproved
                ? `تم اعتماد صرف مبلغ ${metrics.approvedAssistanceTotal.toLocaleString('ar-EG')} ج.م لـ ${metrics.eligibleCases} أسر مستحقة بواسطة ${currentAllocation?.approvedBy || 'الإدارة'}.`
                : `المبلغ المطلوب اعتماده: ${metrics.approvedAssistanceTotal.toLocaleString('ar-EG')} ج.م موزع على ${metrics.eligibleCases} أسر مستحقة بنسبة تغطية 100%.`}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-200/60 mt-3 flex items-center gap-2">
            {!isAllocationApproved ? (
              <>
                <button
                  type="button"
                  onClick={handleQuickApproveCycle}
                  disabled={isApprovingCycle}
                  className="flex-1 py-2 px-3 bg-[#005756] hover:bg-[#004342] text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  <Check size={14} />
                  <span>{isApprovingCycle ? 'جاري الاعتماد...' : 'اعتماد دورة الصرف الآن'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('allocation')}
                  className="py-2 px-3 bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  مراجعة الكشف
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleExportExcel}
                className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <FileSpreadsheet size={14} />
                <span>تصدير كشف الصرف المعتمد لإكسل</span>
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Exceptions & Urgent Case Review */}
        <div className="p-5 bg-white rounded-xl border border-slate-200/70 shadow-none flex flex-col justify-between transition-all duration-150">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-tight bg-indigo-500/10 text-indigo-800 border border-indigo-500/20">
                <ShieldAlert size={13} />
                استثناء إنساني معتمد
              </span>
              <span className="text-xs font-mono text-slate-400">EHS-104</span>
            </div>

            <h4 className="text-sm font-bold text-slate-900 mt-2.5 tracking-tight">
              محمد شعبان فتحي (منشأة ناصر الدويقة)
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              اعتمدت الإدارة صرف 3,000 ج.م كاستثناء إنساني عاجل لخطورة المرض وتداعي سكن الخشب، وجارٍ استخراج شهادات ميلاد الأطفال رسمياً.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100/80 mt-3 flex items-center justify-between">
            <span className="text-[11px] text-teal-800 font-semibold bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
              ثقة الباحث 90%
            </span>
            <button
              type="button"
              onClick={() => setSelectedCaseId('case-04')}
              className="text-xs text-indigo-700 hover:text-indigo-900 font-bold underline flex items-center gap-1 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
            >
              <span>فحص ملف الحالة والمستندات</span>
              <ChevronLeft size={13} />
            </button>
          </div>
        </div>

        {/* Card 3: Overdue Visits & Incomplete Documents */}
        <div className="p-5 bg-white rounded-xl border border-slate-200/70 shadow-none flex flex-col justify-between transition-all duration-150">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-tight bg-rose-500/10 text-rose-800 border border-rose-500/20">
                <AlertTriangle size={13} />
                تنبيه رقابي ميداني
              </span>
              <span className="text-xs font-mono text-rose-700 font-bold">متأخرة {'>'} 8 أشهر</span>
            </div>

            <h4 className="text-sm font-bold text-slate-900 mt-2.5 tracking-tight">
              نادية فؤاد حسن (EHS-106 - عزبة النخل)
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              آخر زيارة ميدانية تمت في 10 فبراير 2026. تجاوزت 6 أشهر دون تقرير تحديث دوري لدخل الابن والوضع الصحي.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100/80 mt-3 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">الباحث: أ. هبة الشامي</span>
            <button
              type="button"
              onClick={() => setActiveSection('research')}
              className="text-xs text-rose-700 hover:text-rose-900 font-bold underline flex items-center gap-1 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
            >
              <span>جدولة زيارة / تكليف باحث</span>
              <ChevronLeft size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Visual Analytics Charts Grid (الرسوم البيانية التوضيحية والتحليل) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Family Need Gap vs Proposed/Approved Assistance (2 cols) */}
        <div className="lg:col-span-2 p-5 md:p-6 bg-white rounded-xl border border-slate-200/70 shadow-none space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                مقارنة فجوة احتياج الأسر مقابل المساعدة المعتمدة
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                توضيح مدى كفاية وتغطية المبالغ المعتمدة للاحتياج الفعلي لكل أسرة
              </p>
            </div>
            <button
              onClick={() => setActiveSection('allocation')}
              className="text-xs text-teal-800 font-semibold hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
            >
              <span>فتح مساحة التخصيص</span>
              <ChevronLeft size={14} />
            </button>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600 mb-2">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-slate-300 inline-block" />
                فجوة الاحتياج المعيشي
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#005756] inline-block" />
                المبلغ المعتمد للصرف
              </span>
            </div>

            <div className="space-y-2.5">
              {caseComparisonData.map((item) => {
                const maxVal = Math.max(...caseComparisonData.map((d) => Math.max(d.gap, d.proposed)), 3500);
                const gapPercent = Math.min(100, Math.round((item.gap / maxVal) * 100));
                const proposedPercent = Math.min(100, Math.round((item.proposed / maxVal) * 100));

                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 tracking-tight">{item.name}</span>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span className="flex items-center gap-1">
                          <span>معتمد:</span>
                          <MoneyDisplay amount={item.proposed} size="xs" variant="teal" />
                        </span>
                        <span>/</span>
                        <span className="flex items-center gap-1">
                          <span>فجوة:</span>
                          <MoneyDisplay amount={item.gap} size="xs" variant="gap" />
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {/* Gap bar */}
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-300 rounded-full transition-all duration-300"
                          style={{ width: `${gapPercent}%` }}
                        />
                      </div>
                      {/* Proposed bar */}
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
          </div>

          <div className="p-3 bg-slate-50/80 rounded-xl text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2 border border-slate-200/60 ring-1 ring-black/[0.02]">
            <span className="flex items-center gap-1.5">
              <span>إجمالي فجوة الأسر المؤهلة النشطة:</span>
              <MoneyDisplay
                amount={currentAllocation?.summary.totalAssessedNeed ?? 0}
                size="xs"
                variant="neutral"
              />
            </span>
            <span>
              نسبة التغطية المعتمدة بالدورة:{' '}
              <strong className="text-teal-700 font-bold tabular-nums">
                {coveragePercentage}% {coveragePercentage >= 100 ? '(تغطية تامة)' : ''}
              </strong>
            </span>
          </div>

          {overdueSuspendedCount > 0 && (
            <div className="p-2.5 bg-amber-50/70 rounded-xl text-xs text-amber-900 border border-amber-200/80 ring-1 ring-amber-500/10 flex flex-wrap items-center justify-between gap-2 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span>
                  <strong>بند الرقابة والمتابعة:</strong> توجد {overdueSuspendedCount} {overdueSuspendedCount === 1 ? 'حالة' : 'حالات'} بمخصصات موقوفة رقابياً ({overdueSuspendedNeed.toLocaleString('ar-EG')} ج.م) بانتظار تحديث الزيارة الميدانية.
                </span>
              </div>
              <span className="text-[11px] font-semibold text-amber-800 bg-white/90 px-2.5 py-0.5 rounded-full border border-amber-200/80 shrink-0">
                لا تُعد عجزاً في السيولة المتاحة
              </span>
            </div>
          )}
        </div>

        {/* Chart 2: Priority breakdown (1 col) */}
        <div className="p-5 md:p-6 bg-white rounded-xl border border-slate-200/70 shadow-none space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">توزيع الحالات حسب درجة الأولوية</h3>
            <p className="text-xs text-slate-500 mt-0.5">محسوبة بنظام النقاط وفق الفجوة، المرض، والأيتام</p>
          </div>

          {/* SVG Donut Ring Chart */}
          <div className="py-2 flex flex-col items-center justify-center">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform">
                {(() => {
                  const total = priorityCounts.reduce((acc, curr) => acc + curr.value, 0) || 1;
                  let cumulativePercent = 0;
                  return priorityCounts.map((slice, i) => {
                    const percent = (slice.value / total) * 100;
                    const strokeDasharray = `${percent} ${100 - percent}`;
                    const strokeDashoffset = -cumulativePercent;
                    cumulativePercent += percent;
                    return (
                      <circle
                        key={i}
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke={slice.color}
                        strokeWidth="16"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        pathLength="100"
                        className="transition-all duration-300"
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-slate-900 leading-none tabular-nums tracking-tight">
                  {cases.length}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 font-medium">حالات مسجلة</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100/80 text-xs">
            {priorityCounts.map((p) => (
              <div key={p.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <span className="text-slate-600 truncate">{p.name}:</span>
                <span className="font-bold text-slate-900 tabular-nums">{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Operational Follow-up & Audit Trail (سجل الإجراءات والقرارات الرقابية) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Follow-up Cases List */}
        <div className="p-5 md:p-6 bg-white rounded-xl border border-slate-200/70 shadow-none space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100/80">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">حالات تتطلب متابعة تشغيلية عاجلة</h3>
              <p className="text-xs text-slate-500">حالات حرجة، أوراق ناقصة، أو متأخرة عن الزيارة الميدانية</p>
            </div>
            <button
              onClick={() => setActiveSection('cases')}
              className="text-xs text-teal-800 font-semibold hover:underline cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
            >
              عرض سجل الحالات
            </button>
          </div>

          <div className="space-y-2.5">
            {cases
              .filter((c) => c.priority === 'critical' || c.isVisitOverdue || c.vulnerability.incompleteDocuments)
              .slice(0, 4)
              .map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCaseId(c.id)}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/20 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 group-hover:text-teal-900">{c.fullName}</span>
                      <span className="text-xs font-mono text-slate-500">({c.code})</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={11} className="text-slate-400" />
                        {c.district}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>الباحث: {c.assignedResearcher}</span>
                      {c.isVisitOverdue && (
                        <span className="text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded text-[11px]">
                          متأخرة عن الزيارة
                        </span>
                      )}
                      {c.vulnerability.incompleteDocuments && (
                        <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">
                          أوراق ناقصة
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <span className="text-xs font-bold text-slate-900 block tabular-nums" suppressHydrationWarning>
                      {c.financials.netFinancialGap.toLocaleString('en-US')} ج.م
                    </span>
                    <span className="text-[11px] text-slate-400">فجوة احتياج شهري</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Operational Audit Log */}
        <div className="p-5 md:p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">سجل الإجراءات والقرارات الرقابية</h3>
              <p className="text-xs text-slate-500">تتبع شفاف لقرارات الاعتماد المالي والاستبعاد وتعديل المخصصات</p>
            </div>
            <button
              onClick={() => setActiveSection('reports')}
              className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              عرض السجل الكامل
            </button>
          </div>

          <div className="space-y-3">
            {auditLogs.slice(0, 4).map((log, idx) => (
              <div key={`${log.id}-${idx}`} className="flex items-start gap-3 text-xs p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-2.5 h-2.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{log.action}</span>
                    <span className="text-[11px] font-mono text-slate-400">{log.timestamp}</span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">{log.details}</p>
                  <p className="text-[11px] text-teal-800 font-medium">بواسطة: {log.user}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal 1: Donation Breakdown Modal (عام vs مشروط) */}
      {showDonationBreakdownModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowDonationBreakdownModal(false)}
        >
          <div
            className="bg-white/95 backdrop-blur-xl rounded-2xl max-w-2xl w-full border border-slate-200/60 ring-1 ring-black/[0.04] shadow-2xl shadow-slate-950/15 p-6 space-y-5 max-h-[90vh] overflow-y-auto text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100/80">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100/80 flex items-center justify-center text-[#005756]">
                  <Coins size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    تفصيل مصادر وأرصدة التبرعات بالخزينة
                  </h3>
                  <p className="text-xs text-slate-500 tabular-nums" suppressHydrationWarning>
                    إجمالي التبرعات المحصلة والمودعة: {metrics.receivedDonationsTotal.toLocaleString('en-US')} ج.م
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDonationBreakdownModal(false)}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 flex items-center justify-center transition-all duration-200 active:scale-[0.95] cursor-pointer"
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              {/* Category 1: Unrestricted */}
              <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Unlock size={16} className="text-[#005756]" />
                    <span className="font-bold text-slate-900 text-sm">
                      1. الصندوق العام المتاح (غير المقيد)
                    </span>
                  </div>
                  <div className="bg-white px-2.5 py-1 rounded-lg border border-teal-200">
                    <MoneyDisplay
                      amount={metrics.unrestrictedDonationsBalance}
                      size="sm"
                      variant="teal"
                    />
                  </div>
                </div>
                <p className="text-slate-600 text-xs">
                  <strong>التعريف والغاية:</strong> تبرعات عامة تمنح إدارة الصندوق مرونة الصرف الكاملة وفق جدول أولويات الفقر والاحتياج دون تقييد (سداد إيجارات، مواد غذائية، ديون غارمين، إعانات معيشية دورية).
                </p>
                <div className="bg-white/80 rounded-lg p-2.5 border border-teal-100 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-700">
                    <span>• م. أحمد حسام الدين (تحويل بنكي شهري)</span>
                    <span className="font-mono font-bold">65,000 ج.م</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>• مجموعة الأمل للمقاولات (شيك مسؤولية مجتمعية)</span>
                    <span className="font-mono font-bold">40,000 ج.م</span>
                  </div>
                </div>
              </div>

              {/* Category 2: Restricted */}
              <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock size={16} className="text-indigo-700" />
                    <span className="font-bold text-slate-900 text-sm">
                      2. التبرعات المشروطة بأغراض محددة (المقيدة)
                    </span>
                  </div>
                  <div className="bg-white px-2.5 py-1 rounded-lg border border-indigo-200">
                    <MoneyDisplay
                      amount={metrics.restrictedDonationsBalance}
                      size="sm"
                      variant="neutral"
                    />
                  </div>
                </div>
                <p className="text-slate-600 text-xs">
                  <strong>الضابط الشرعي والإداري:</strong> أموال ألزم المتبرعون صرفها في مصارف وأوجه محددة حصراً، ويحظر توجيهها لغير ذلك التزاماً بالأمانة:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 bg-white rounded-lg border border-indigo-100 space-y-1">
                    <div className="flex justify-between font-bold text-indigo-900">
                      <span>رعاية طبية وعمليات</span>
                      <span className="font-mono">25,000 ج.م</span>
                    </div>
                    <p className="text-slate-500 text-[10px]">د. منى الشريف: جلسات غسيل كلوي وأدوية أمراض مزمنة</p>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-indigo-100 space-y-1">
                    <div className="flex justify-between font-bold text-indigo-900">
                      <span>كفالة أيتام وتعليم</span>
                      <span className="font-mono">20,000 ج.م</span>
                    </div>
                    <p className="text-slate-500 text-[10px]">فاعل خير (الإسكندرية): نفقات معيشة وكتب ومصاريف دراسية</p>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-indigo-100 space-y-1">
                    <div className="flex justify-between font-bold text-indigo-900">
                      <span>كفالة حالة خاصة بالاسم</span>
                      <span className="font-mono">15,000 ج.م</span>
                    </div>
                    <p className="text-slate-500 text-[10px]">م. هشام عبد المنعم: للحالة EHS-105 (أحمد رجب - ضمور عضلات)</p>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-indigo-100 space-y-1">
                    <div className="flex justify-between font-bold text-indigo-900">
                      <span>ترميم وسقف منازل</span>
                      <span className="font-mono">15,000 ج.م</span>
                    </div>
                    <p className="text-slate-500 text-[10px]">د. سارة الديب: عزل أمطار وترميم أسقف قبل فصل الشتاء</p>
                  </div>
                </div>
              </div>

              {/* Category 3: Pledged */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 flex items-center justify-between text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-amber-700 shrink-0" />
                  <span>تعهدات تحت التحصيل (أ. طارق عبد الحميد - تحويل بنكي مرتقب):</span>
                </div>
                <MoneyDisplay
                  amount={metrics.pledgedDonationsTotal}
                  size="xs"
                  variant="gap"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDonationBreakdownModal(false);
                  setActiveSection('donations');
                }}
                className="px-4 py-2 text-xs font-semibold bg-[#005756] text-white rounded-xl hover:bg-[#004342] transition-colors cursor-pointer"
              >
                فتح سجل التبرعات الكامل
              </button>
              <button
                type="button"
                onClick={() => setShowDonationBreakdownModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Families Status & Distribution Modal (تفصيل الـ 12 أسرة) */}
      {showFamiliesStatusModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowFamiliesStatusModal(false)}
        >
          <div
            className="bg-white/95 backdrop-blur-xl rounded-2xl max-w-3xl w-full border border-slate-200/60 ring-1 ring-black/[0.04] shadow-2xl shadow-slate-950/15 p-6 space-y-5 max-h-[90vh] overflow-y-auto text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100/80">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100/80 flex items-center justify-center text-[#005756]">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    خريطة وتوزيع الأسر المسجلة في الجمعية (إجمالي 12 أسرة)
                  </h3>
                  <p className="text-xs text-slate-500">
                    إيضاح كامل لأسس الصرف والاستبعاد والاستثناء لدورة أكتوبر 2026
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFamiliesStatusModal(false)}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 flex items-center justify-center transition-all duration-200 active:scale-[0.95] cursor-pointer"
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>
            </div>

            {/* Clarification Alert Box */}
            <div className="p-3.5 bg-teal-50/80 border border-teal-200 rounded-xl text-xs text-teal-950 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-teal-900">
                <Check size={16} className="text-teal-700" />
                <span>إيضاح هام: لماذا تضم دورة الصرف 9 أسر مستفيدة؟ وما معنى تغطية 100%؟</span>
              </div>
              <p className="text-slate-700 text-[11.5px]">
                تضم الجمعية <strong>12 أسرة مسجلة</strong> في قواعد البيانات. محرك التوزيع اعتمد الصرف لـ <strong>9 أسر مستحقة</strong> (8 أسر استحقاق أساسي نشط + أسرة واحدة اعتمدت كاستثناء إنساني عاجل نظراً لخطورة المرض وتداعي السكن).
              </p>
              <p className="text-slate-700 text-[11.5px]" suppressHydrationWarning>
                <strong>نسبة 100%:</strong> تعني أن جميع الأسر الـ 9 المستحقة للصرف هذا الشهر تم توفير كامل مبالغ المساعدة المعتمدة لها ({metrics.approvedAssistanceTotal.toLocaleString('en-US')} ج.م) دون أي عجز تمويلي، بينما الحالات الـ 3 المتبقية غير مشمولة لأسباب موثقة أدناه.
              </p>
            </div>

            {/* Category 1: Funded Cases (9 Families) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span>المجموعة الأولى: 9 أسر مشمولة بالصرف هذا الشهر (تغطية كاملة)</span>
                </h4>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-flex items-center gap-1">
                  <span>المعتمد:</span>
                  <MoneyDisplay amount={metrics.approvedAssistanceTotal} size="xs" variant="approved" />
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {cases
                  .filter((c) => c.status === 'active_eligible' || (c.status === 'pending_exception' && c.vulnerability.exceptionApproved))
                  .map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setShowFamiliesStatusModal(false);
                        setSelectedCaseId(c.id);
                      }}
                      className="p-2.5 bg-slate-50 hover:bg-teal-50/50 rounded-xl border border-slate-200 hover:border-teal-400 transition-all cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-[11px] truncate">{c.fullName}</span>
                        <span className="text-[10px] font-mono text-slate-500">{c.code}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>{c.district}</span>
                        {c.vulnerability.exceptionApproved ? (
                          <span className="text-teal-700 font-bold bg-teal-100/70 px-1 rounded">استثناء معتمد</span>
                        ) : (
                          <span className="text-emerald-700 font-medium">استحقاق نشط</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Category 2: Excluded / Ineligible / Under Investigation (3 Families) */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                  <span>المجموعة الثانية: 3 أسر غير مشمولة بالصرف لدورة أكتوبر (أسباب موثقة)</span>
                </h4>
                <span className="text-[11px] text-slate-500">محددة ومراجعة إدارياً</span>
              </div>

              <div className="space-y-2 text-xs">
                {/* Case 1: Temporarily excluded this month */}
                <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">محمود عبد العليم سلامة (EHS-109)</span>
                      <span className="text-[10px] bg-sky-100 text-sky-800 font-semibold px-2 py-0.5 rounded-md">
                        استبعاد مؤقت (شهر أكتوبر فقط)
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">فيصل (العشرين)</span>
                  </div>
                  <p className="text-slate-600 text-[11.5px] leading-relaxed">
                    <strong>السبب الموثق:</strong> استلمت الأسرة منحة طارئة مباشرة من فاعل خير بقيمة 5,000 ج.م ومواد غذائية تكفيها لشهرين، فأصبحت فجوة احتياجها صفر هذا الشهر. تم تأجيل الصرف مؤقتاً لتوجيه الدعم لحالات أشد فقراً.
                  </p>
                </div>

                {/* Case 2: Under Field Review */}
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">صابر جاد المولى مهران (EHS-110)</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-md">
                        تحت البحث الميداني وتجهيز الأوراق
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">المرج الشرقية</span>
                  </div>
                  <p className="text-slate-600 text-[11.5px] leading-relaxed">
                    <strong>السبب الموثق:</strong> الأوراق الثبوتية غير مكتملة، وبانتظار استكمال تقرير البحث الميداني المفصل لـ أ. هبة الشامي للتحقق من دخل الإعالة الفعلي وتحديد درجة الاستحقاق قبل إدراجها بالصرف.
                  </p>
                </div>

                {/* Case 3: Closed */}
                <div className="p-3 bg-slate-100/70 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">كمال حامد عثمان الصعيدي (EHS-112)</span>
                      <span className="text-[10px] bg-slate-200 text-slate-800 font-semibold px-2 py-0.5 rounded-md">
                        ملف مغلق (زال الاستحقاق نهائياً)
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">الجمالية</span>
                  </div>
                  <p className="text-slate-600 text-[11.5px] leading-relaxed">
                    <strong>السبب الموثق:</strong> تم إغلاق الملف رسمياً لزوال الاستحقاق بعد تخرج الابن وتعيينه بوظيفة محاسب براتب مستقر (7,500 ج.م)، وأصبح دخل الأسرة كافياً ومستقلاً ولا تحتاج إلى معونات.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowFamiliesStatusModal(false);
                  setActiveSection('cases');
                }}
                className="px-4 py-2 text-xs font-semibold bg-[#005756] text-white rounded-xl hover:bg-[#004342] transition-colors cursor-pointer"
              >
                فتح قاعدة بيانات الحالات
              </button>
              <button
                type="button"
                onClick={() => setShowFamiliesStatusModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
