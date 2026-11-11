'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/app-context';
import {
  Zap,
  ShieldCheck,
  Calendar,
  Clock,
  Printer,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  DollarSign,
  UserCheck,
  Heart,
  ChevronDown,
  Sparkles,
  Home,
  ShoppingBag,
  ShieldAlert,
  Activity,
  ArrowRight,
  Filter,
  X,
  Building2,
  Check,
  Ban,
  Lock,
  HeartHandshake,
} from 'lucide-react';
import { BeneficiaryCase, FastTrackDisbursementOrder, ShariaDonationCategory } from '@/types';
import { INITIAL_RESEARCHERS } from '@/data/initial-mock-data';
import { ResearcherSelect } from '@/components/cases/researcher-select';
import { UrgentVoucherPrintModal } from '@/components/reports/urgent-voucher-print-modal';

// Helper to render category icon dynamically
function getCategoryIcon(iconName?: string) {
  switch (iconName) {
    case 'Heart':
      return Heart;
    case 'Activity':
      return Activity;
    case 'Sparkles':
      return Sparkles;
    case 'ShieldAlert':
      return ShieldAlert;
    case 'ShoppingBag':
      return ShoppingBag;
    case 'Home':
      return Home;
    case 'Zap':
      return Zap;
    default:
      return ShieldCheck;
  }
}

// Arabic Currency Spellout (Tafqeet) helper for numbers up to 100,000
function tafqeetArabic(num: number): string {
  if (!num || num <= 0) return 'صفر جنيه مصري';
  const thousands = Math.floor(num / 1000);
  const remainder = num % 1000;
  const hundreds = Math.floor(remainder / 100);
  const tensAndOnes = remainder % 100;

  const onesArr = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة',
    'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tensArr = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundredsArr = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  const parts: string[] = [];

  if (thousands > 0) {
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) parts.push(`${onesArr[thousands]} آلاف`);
    else {
      // 11 to 99
      const tTens = Math.floor(thousands / 10);
      const tOnes = thousands % 10;
      if (thousands < 20) parts.push(`${onesArr[thousands]} ألفاً`);
      else if (tOnes === 0) parts.push(`${tensArr[tTens]} ألفاً`);
      else parts.push(`${onesArr[tOnes]} و${tensArr[tTens]} ألفاً`);
    }
  }

  if (hundreds > 0) {
    parts.push(hundredsArr[hundreds]);
  }

  if (tensAndOnes > 0) {
    if (tensAndOnes < 20) {
      parts.push(onesArr[tensAndOnes]);
    } else {
      const t = Math.floor(tensAndOnes / 10);
      const o = tensAndOnes % 10;
      if (o === 0) parts.push(tensArr[t]);
      else parts.push(`${onesArr[o]} و${tensArr[t]}`);
    }
  }

  return `فقط ${parts.join(' و ')} جنيه مصري لا غير`;
}

// Helper to determine if a case matches a specific sharia fund
function matchCaseToFund(c: BeneficiaryCase, categoryId: string, categoryName: string): { matches: boolean; reason: string } {
  const normName = categoryName.toLowerCase();

  // 1. Medical fund (رعاية صحية ودواء / مرضى)
  if (categoryId === 'sharia-03' || normName.includes('صحية') || normName.includes('دواء') || normName.includes('مرض')) {
    if (c.vulnerability?.hasChronicIllness || (c.financials?.medicalExpenses ?? 0) >= 300) {
      const illness = c.vulnerability?.chronicIllnessDetails || 'مرض مزمن يحتاج رعاية وعلاج';
      const cost = c.financials?.medicalExpenses ? `تكلفة أدوية: ${c.financials.medicalExpenses.toLocaleString('ar-EG')} ج.م` : '';
      return { matches: true, reason: `${illness} ${cost ? `(${cost})` : ''}` };
    }
  }

  // 2. Orphan sponsorship (كفالة أيتام)
  if (categoryId === 'sharia-02' || normName.includes('أيتام') || normName.includes('يتيم')) {
    if (c.vulnerability?.isOrphanHousehold || (c.vulnerability?.orphanCount ?? 0) > 0) {
      const count = c.vulnerability?.orphanCount || 1;
      return { matches: true, reason: `أسرة أيتام (${count} أيتام قُصّر)` };
    }
  }

  // 3. Debt relief / Ghaaremeen (سداد ديون / غارمين)
  if (categoryId === 'sharia-05' || normName.includes('ديون') || normName.includes('غارمين')) {
    if ((c.financials?.netFinancialGap ?? 0) >= 1500 || c.notes?.includes('دين') || c.notes?.includes('إيجار')) {
      return { matches: true, reason: `فجوة تمويلية مرتفعة (${c.financials?.netFinancialGap.toLocaleString('ar-EG')} ج.م) والتزامات متراكمة` };
    }
  }

  // 4. Food assistance (إطعام ومساعدات غذائية)
  if (categoryId === 'sharia-06' || normName.includes('إطعام') || normName.includes('غذائ')) {
    if (c.vulnerability?.foodInsecurityLevel === 'severe' || c.vulnerability?.foodInsecurityLevel === 'moderate') {
      const level = c.vulnerability?.foodInsecurityLevel === 'severe' ? 'انعدام أمن غذائي حاد' : 'عجز غذائي متوسط';
      return { matches: true, reason: `${level} - حاجة لطرود وإعانات غذائية عاجلة` };
    }
  }

  // 5. Housing support (دعم سكن وترميم)
  if (categoryId === 'sharia-07' || normName.includes('سكن') || normName.includes('ترميم')) {
    if (c.vulnerability?.housingCondition === 'dilapidated_urgent' || c.vulnerability?.housingCondition === 'rent_unstable') {
      const cond = c.vulnerability?.housingCondition === 'dilapidated_urgent' ? 'سكن متهالك آيل للسقوط' : 'إيجار غير مستقر وتهديد بالإخلاء';
      return { matches: true, reason: cond };
    }
  }

  // 6. Zakat & General charity (زكاة مال / صدقة جارية)
  if (categoryId === 'sharia-01' || categoryId === 'sharia-04' || normName.includes('زكاة') || normName.includes('صدقة')) {
    if (c.status === 'active_eligible' || c.status === 'pending_exception') {
      return { matches: true, reason: `حالة مستحقة مسجلة ومعتمدة (أولوية: ${c.priority === 'critical' ? 'حرجة' : c.priority === 'high' ? 'عالية' : 'متوسطة'})` };
    }
  }

  // General fallback: if net financial gap > 0 and eligible
  if (c.status === 'active_eligible' && (c.financials?.netFinancialGap ?? 0) > 0) {
    return { matches: true, reason: `استحقاق عام لسد الفجوة (${c.financials?.netFinancialGap.toLocaleString('ar-EG')} ج.م)` };
  }

  return { matches: false, reason: '' };
}

// Calculate flexible, nature-aware deadline based on category and case urgency
function calculateRecommendedDeadline(
  categoryId?: string,
  categoryName?: string,
  casePriority?: string
): { date: string; days: number; reason: string } {
  const normCat = ((categoryName || '') + ' ' + (categoryId || '')).toLowerCase();
  const today = new Date();
  let days = 7;
  let reason = 'مهلة تنفيذ قياسية (7 أيام)';

  if (normCat.includes('علاج') || normCat.includes('دواء') || normCat.includes('صحة') || normCat.includes('مرض') || casePriority === 'critical') {
    days = 3;
    reason = 'تدخل علاجي / دوائي عاجل (3 أيام)';
  } else if (normCat.includes('طعام') || normCat.includes('إطعام') || normCat.includes('غذاء')) {
    days = 5;
    reason = 'إعانة غذائية وتموينية مباشرة (5 أيام)';
  } else if (normCat.includes('دين') || normCat.includes('ديون') || normCat.includes('غارم')) {
    days = 10;
    reason = 'سداد مالي وفك كرب (10 أيام)';
  } else if (normCat.includes('يتيم') || normCat.includes('أيتام') || normCat.includes('كفالة')) {
    days = 15;
    reason = 'كفالة معيشية شهرية (15 يوماً)';
  } else if (normCat.includes('سكن') || normCat.includes('سقف') || normCat.includes('مأوى') || normCat.includes('ترميم')) {
    days = 14;
    reason = 'ترميم وتجهيز مأوى (14 يوماً)';
  } else {
    days = 7;
    reason = 'صرف وتوجيه مباشر (7 أيام)';
  }

  const targetDate = new Date();
  targetDate.setDate(today.getDate() + days);

  return {
    date: targetDate.toISOString().split('T')[0],
    days,
    reason,
  };
}

export function FastTrackView() {
  const {
    cases,
    shariaCategories,
    fastTrackOrders,
    metrics,
    getRestrictedFundBalances,
    issueFastTrackDisbursement,
    markFastTrackOrderDelivered,
    cancelFastTrackOrder,
    currentSessionProfile,
    permissions,
    fastTrackTriggerData,
    setFastTrackTriggerData,
  } = useApp();

  // Selected Fund for matching
  const [selectedFundId, setSelectedFundId] = useState<string>('sharia-03');
  // Sub-view tab: 'funds' or 'orders'
  const [activeTab, setActiveTab] = useState<'funds' | 'orders'>('funds');
  // Search query in matched cases
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [orderModalCase, setOrderModalCase] = useState<BeneficiaryCase | null>(null);
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<FastTrackDisbursementOrder | null>(null);

  // Fulfillment Modal state
  const [fulfillmentOrder, setFulfillmentOrder] = useState<FastTrackDisbursementOrder | null>(null);
  const [deliveryReceiptNo, setDeliveryReceiptNo] = useState<string>('');
  const [deliveryMethod, setDeliveryMethod] = useState<'cash_signed' | 'postal_transfer' | 'direct_vendor_payment'>('cash_signed');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');
  const [fulfillmentError, setFulfillmentError] = useState<string | null>(null);

  // Form State for issuance
  const [orderAmount, setOrderAmount] = useState<number>(0);
  const [orderResearcher, setOrderResearcher] = useState<string>('');
  const [orderDeadline, setOrderDeadline] = useState<string>('');
  const [deadlineReason, setDeadlineReason] = useState<string>('');
  const [orderPurpose, setOrderPurpose] = useState<string>('');
  const [orderFormError, setOrderFormError] = useState<string | null>(null);

  // Compute fund balances
  const fundBalances = useMemo(() => getRestrictedFundBalances(), [getRestrictedFundBalances]);

  // Overall Fast-Track Metrics (Centralized Single Source of Truth)
  const summaryStats = useMemo(() => {
    let purposeInbound = 0;
    let purposeDisbursed = 0;
    let purposeAvailable = 0;

    Object.values(fundBalances).forEach((bal) => {
      purposeInbound += bal.inbound;
      purposeDisbursed += bal.disbursed;
      purposeAvailable += bal.available;
    });

    const caseInbound = metrics.restrictedCaseInbound;
    const caseAvailable = metrics.restrictedCaseBalance;

    const caseOrders = fastTrackOrders.filter((o) => o.isRestrictedCaseOrder && o.status !== 'cancelled');
    const caseDisbursed = caseOrders.reduce((s, o) => s + o.amount, 0);

    const totalInbound = purposeInbound + caseInbound;
    const totalDisbursed = purposeDisbursed + caseDisbursed;
    const totalAvailable = purposeAvailable + caseAvailable;

    const pendingDeliveryOrders = fastTrackOrders.filter((o) => o.status === 'pending_delivery');
    const deliveredOrders = fastTrackOrders.filter((o) => o.status === 'delivered');
    const todayStr = new Date().toISOString().split('T')[0];
    const overdueOrders = pendingDeliveryOrders.filter((o) => o.dueDeadlineDate && o.dueDeadlineDate < todayStr);

    return {
      purposeInbound,
      purposeDisbursed,
      purposeAvailable,
      caseInbound,
      caseDisbursed,
      caseAvailable,
      caseOrdersCount: caseOrders.length,
      totalInbound,
      totalDisbursed,
      totalAvailable,
      pendingCount: pendingDeliveryOrders.length,
      overdueCount: overdueOrders.length,
      deliveredCount: deliveredOrders.length,
      totalOrdersCount: fastTrackOrders.length,
    };
  }, [fundBalances, fastTrackOrders, metrics]);

  // Active Fund object
  const activeFund = useMemo(() => {
    return (
      shariaCategories.find((cat) => cat.id === selectedFundId) ||
      shariaCategories.find((cat) => cat.isActive) ||
      shariaCategories[0]
    );
  }, [shariaCategories, selectedFundId]);

  const activeFundBalance = fundBalances[activeFund?.id]?.available ?? 0;

  // Filter matched cases for active fund
  const matchedCases = useMemo(() => {
    if (!activeFund) return [];

    return cases
      .filter((c) => c.status !== 'closed' && c.status !== 'excluded_current_month')
      .map((c) => {
        const matchInfo = matchCaseToFund(c, activeFund.id, activeFund.name);
        return {
          caseItem: c,
          isMatch: matchInfo.matches,
          matchReason: matchInfo.reason,
        };
      })
      .filter((item) => {
        if (!item.isMatch) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        const priName = (item.caseItem.primaryName || item.caseItem.fullName || '').toLowerCase();
        const secName = (item.caseItem.secondaryName || '').toLowerCase();
        const code = (item.caseItem.code || '').toLowerCase();
        const natId = (item.caseItem.nationalId || '').toLowerCase();
        const district = (item.caseItem.district || '').toLowerCase();
        return (
          priName.includes(q) ||
          secName.includes(q) ||
          code.includes(q) ||
          natId.includes(q) ||
          district.includes(q)
        );
      });
  }, [cases, activeFund, searchQuery]);

  // Open disbursement modal with smart defaults
  const handleOpenDisburseModal = (c: BeneficiaryCase) => {
    setOrderModalCase(c);
    setOrderFormError(null);

    // Calculate smart default amount:
    // Suggest covering financial gap capped by fund balance
    const gap = c.financials?.netFinancialGap ?? 1500;
    const suggested = Math.min(gap, activeFundBalance);
    setOrderAmount(suggested > 0 ? suggested : Math.min(1000, activeFundBalance));

    // Default researcher
    setOrderResearcher(c.assignedResearcher || INITIAL_RESEARCHERS[0]?.name || 'أ. وائل فتحي');

    // Flexible deadline based on aid nature & urgency
    const rec = calculateRecommendedDeadline(activeFund?.id, activeFund?.name, c.priority);
    setOrderDeadline(rec.date);
    setDeadlineReason(rec.reason);

    // Smart default purpose note
    if (activeFund?.id === 'sharia-03') {
      setOrderPurpose('صرف فوري عاجل لتأمين الأدوية وجلسات العلاج الشهرية');
    } else if (activeFund?.id === 'sharia-02') {
      setOrderPurpose('كفالة وإعانة عاجلة لأطفال الأسرة الأيتام وسد الاحتياجات الأساسية');
    } else if (activeFund?.id === 'sharia-05') {
      setOrderPurpose('سداد التزام مالي عاجل وفك كرب الأسرة المالي');
    } else if (activeFund?.id === 'sharia-06') {
      setOrderPurpose('إعانة غذائية وتموينية فورية للأسر الأكثر هشاشة');
    } else if (activeFund?.id === 'sharia-07') {
      setOrderPurpose('مساهمة عاجلة في ترميم السقف وسداد متأخر الإيجار');
    } else {
      setOrderPurpose(`صرف مساعدة فورية مشروطة من ${activeFund?.name || 'الصندوق'}`);
    }
  };

  // Submit fast-track order
  const handleConfirmDisbursement = () => {
    if (!orderModalCase || !activeFund) return;

    if (orderAmount <= 0) {
      setOrderFormError('يرجى تحديد مبلغ إعانة صالح أكبر من صفر');
      return;
    }

    if (orderAmount > activeFundBalance) {
      setOrderFormError(
        `المبلغ المطلوب (${orderAmount.toLocaleString('ar-EG')} ج.م) يتجاوز الرصيد المتاح حالياً في الصندوق (${activeFundBalance.toLocaleString('ar-EG')} ج.م)`
      );
      return;
    }

    if (!orderResearcher) {
      setOrderFormError('يرجى اختيار الباحث الميداني المسؤول عن التسليم');
      return;
    }

    const result = issueFastTrackDisbursement({
      caseId: orderModalCase.id,
      shariaCategoryId: activeFund.id,
      amount: orderAmount,
      assignedResearcher: orderResearcher,
      dueDeadlineDate: orderDeadline,
      purposeNote: orderPurpose,
    });

    if (result.success && result.order) {
      setOrderModalCase(null);
      // Immediately present the official printable voucher!
      setActiveReceiptOrder(result.order);
    } else {
      setOrderFormError(result.error || 'فشل في إصدار أمر الصرف الفوري');
    }
  };

  // Auto-fill and trigger issuance when arriving from NewDonationModal (Restricted Case)
  useEffect(() => {
    if (!fastTrackTriggerData) return;
    const trigger = fastTrackTriggerData;
    const targetCase = cases.find((c) => c.id === trigger.caseId);

    if (targetCase) {
      const gap = targetCase.financials?.netFinancialGap ?? 1500;
      const initialVal = trigger.suggestedAmount || gap;
      const rec = calculateRecommendedDeadline(activeFund?.id, activeFund?.name, targetCase.priority);
      const purpose =
        trigger.donationNote ||
        `صرف إعانة فورية مخصصة بالاسم للمستحق ${targetCase.primaryName || targetCase.fullName}`;

      const timer = setTimeout(() => {
        setActiveTab('funds');
        setOrderModalCase(targetCase);
        setOrderFormError(null);
        setOrderAmount(initialVal);
        setOrderResearcher(targetCase.assignedResearcher || INITIAL_RESEARCHERS[0]?.name || 'أ. وائل فتحي');
        setOrderDeadline(rec.date);
        setDeadlineReason(rec.reason);
        setOrderPurpose(purpose);
        setFastTrackTriggerData(null);
      }, 0);

      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setFastTrackTriggerData(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [fastTrackTriggerData, cases, activeFund, setFastTrackTriggerData]);

  const handleOpenFulfillment = (order: FastTrackDisbursementOrder) => {
    setFulfillmentOrder(order);
    setDeliveryReceiptNo('');
    setDeliveryMethod('cash_signed');
    setDeliveryNotes('');
    setFulfillmentError(null);
  };

  const handleConfirmFulfillment = () => {
    if (!fulfillmentOrder) return;
    if (!deliveryReceiptNo.trim()) {
      setFulfillmentError('يرجى إدخال رقم سند الصرف أو مرجع إيصال الاستلام الورقي لإتمام الإغلاق المستندي');
      return;
    }
    markFastTrackOrderDelivered(fulfillmentOrder.id, {
      deliveryReceiptNo: deliveryReceiptNo.trim(),
      deliveryMethod,
      deliveryNotes: deliveryNotes.trim(),
    });
    setFulfillmentOrder(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. Standard Clean Page Header (Flat Enterprise UI) */}
      <div className="pb-1">
        <h1 className="text-xl font-bold text-slate-900 leading-tight">
          إدارة التبرعات المقيدة والصرف الفوري
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          إدارة وتوجيه أموال المصارف الشرعية والتبرعات المقيدة وصرفها المباشر للحالات المستحقة وفق تواريخ استحقاق موثقة
        </p>
      </div>

      {/* 2. Standalone Horizontal Tabs Navigation (Right-Aligned) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('funds')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'funds'
              ? 'bg-[#005756] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 size={15} />
          <span>الصناديق والترشيح الفوري</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-[#005756] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText size={15} />
          <span>سجل الأذونات الصادرة</span>
          {summaryStats.pendingCount > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'orders'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {summaryStats.pendingCount}
            </span>
          )}
          {summaryStats.overdueCount > 0 && (
            <span className="px-2 py-0.5 bg-rose-600 text-white rounded-full text-[10px] font-bold animate-pulse">
              {summaryStats.overdueCount} متأخر
            </span>
          )}
        </button>
      </div>

      {/* 2. Key Metrics Bar (Synchronized with Central State) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Purpose-Restricted Funds */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">وارد صناديق الأغراض الشرعية</span>
            <HeartHandshake className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl lg:text-2xl font-black text-slate-900">
            {summaryStats.purposeInbound.toLocaleString('ar-EG')}{' '}
            <span className="text-xs font-medium text-slate-500">ج.م</span>
          </div>
          <div className="text-[11px] text-indigo-700 font-medium mt-1">
            المتبقي للترشيح: {summaryStats.purposeAvailable.toLocaleString('ar-EG')} ج.م
          </div>
        </div>

        {/* Card 2: Case-Restricted Donations */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">تبرعات مقيدة لحالات محددة</span>
            <Lock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl lg:text-2xl font-black text-slate-900">
            {summaryStats.caseInbound.toLocaleString('ar-EG')}{' '}
            <span className="text-xs font-medium text-slate-500">ج.م</span>
          </div>
          <div className="text-[11px] text-amber-800 font-medium mt-1">
            مخصصة بالاسم ({summaryStats.caseOrdersCount} أذونات موجهة)
          </div>
        </div>

        {/* Card 3: Unified Total Restricted Inbound */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-xs font-bold">إجمالي الوارد المقيد الموحد</span>
            <DollarSign className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-xl lg:text-2xl font-black text-emerald-700">
            {summaryStats.totalInbound.toLocaleString('ar-EG')}{' '}
            <span className="text-xs font-medium text-emerald-600">ج.م</span>
          </div>
          <div className="text-[11px] text-emerald-800 font-medium mt-1">
            مطابق 100% للتبرعات (منصرف: {summaryStats.totalDisbursed.toLocaleString('ar-EG')} ج.م)
          </div>
        </div>

        {/* Card 4: Orders in delivery */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">أذونات قيد التسليم الميداني</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl lg:text-2xl font-black text-amber-600">
            {summaryStats.pendingCount}{' '}
            <span className="text-xs font-medium text-slate-500">إذن نشط</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {summaryStats.deliveredCount} إذن تم تسليمها بنجاح
          </div>
        </div>
      </div>

      {/* 3. Main Views (Funds & Matching OR Orders Log) */}
      {activeTab === 'funds' ? (
        <div className="space-y-6">
          {/* Fund Selection Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-700" />
                أرصدة الصناديق الشرعية المقيدة (انقر لتصفية وترشيح الحالات)
              </h2>
              <span className="text-xs text-slate-500">
                يتم استرداد التبرعات المقيدة وتحديث الرصيد آلياً
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {shariaCategories
                .filter((cat) => cat.isActive)
                .map((cat) => {
                  const Icon = getCategoryIcon(cat.iconName);
                  const isSelected = activeFund?.id === cat.id;
                  const bal = fundBalances[cat.id] || { inbound: 0, disbursed: 0, available: 0 };
                  const percentUsed = bal.inbound > 0 ? Math.round((bal.disbursed / bal.inbound) * 100) : 0;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedFundId(cat.id)}
                      className={`text-right p-4 rounded-xl border-2 transition-all flex flex-col justify-between relative group ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50/50 shadow-md ring-2 ring-teal-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-3 left-3 bg-teal-600 text-white rounded-full p-1">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className={`p-2 rounded-lg ${
                              isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 group-hover:bg-teal-100 group-hover:text-teal-800'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{cat.name}</h3>
                            <span className="text-[10px] text-slate-500">كود: {cat.id}</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 min-h-[32px] mb-3">
                          {cat.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 w-full space-y-1.5 text-xs">
                        <div className="flex justify-between items-center text-slate-500">
                          <span>إجمالي الوارد:</span>
                          <span className="font-semibold text-slate-700">{bal.inbound.toLocaleString('ar-EG')} ج.م</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-500">
                          <span>المنصرف فورياً:</span>
                          <span className="font-semibold text-rose-600">{bal.disbursed.toLocaleString('ar-EG')} ج.م</span>
                        </div>
                        <div className="flex justify-between items-center font-bold pt-1 border-t border-slate-100">
                          <span className="text-slate-800">الرصيد المتاح:</span>
                          <span className="text-emerald-700 font-extrabold text-sm">
                            {bal.available.toLocaleString('ar-EG')} ج.م
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
                          <div
                            className={`h-full transition-all ${
                              percentUsed > 80 ? 'bg-rose-500' : percentUsed > 50 ? 'bg-amber-500' : 'bg-teal-600'
                            }`}
                            style={{ width: `${Math.min(100, percentUsed)}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Condition Matched Cases for the active fund */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-teal-100 text-teal-800 rounded-lg">
                    <Filter className="w-4 h-4" />
                  </span>
                  <h3 className="font-bold text-slate-900 text-base">
                    الحالات المستحقة المطابقة لشروط: {activeFund?.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  تم تحديد {matchedCases.length} حالة تطابق معايير واشتراطات هذا الصندوق الشرعي
                  {activeFundBalance <= 0 && ' (تنبيه: رصيد الصندوق الحالي 0 ج.م ويحتاج تعزيز تبرعات)'}
                </p>
              </div>

              {/* Search input */}
              <div className="flex items-center gap-3">
                <div className="relative min-w-[260px]">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم أو الشهرة أو الكود..."
                    className="w-full pl-3 pr-9 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800 shrink-0">
                  المتاح للصرف: {activeFundBalance.toLocaleString('ar-EG')} ج.م
                </div>
              </div>
            </div>

            {/* Matched Cases Table */}
            <div className="overflow-x-auto">
              {matchedCases.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <AlertCircle className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-semibold">لا توجد حالات مسجلة تطابق شروط هذا الصندوق حالياً</p>
                  <p className="text-xs text-slate-400 mt-1">
                    جرب اختيار صندوق شرعي آخر أو تعديل عبارة البحث
                  </p>
                </div>
              ) : (
                <table className="w-full text-right text-xs text-slate-700">
                  <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">كود الحالة</th>
                      <th className="py-3 px-4">اسم المستفيد (الأساسي والشهرة)</th>
                      <th className="py-3 px-4">المنطقة والباحث المسؤول</th>
                      <th className="py-3 px-4">معيار المطابقة الشرعية</th>
                      <th className="py-3 px-4">الفجوة المالية</th>
                      <th className="py-3 px-4">إجمالي المساعدات السابقة</th>
                      <th className="py-3 px-4 text-center">إجراء الصرف الفوري</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {matchedCases.map(({ caseItem, matchReason }) => (
                      <tr key={caseItem.id} className="hover:bg-teal-50/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-teal-800">
                          {caseItem.code}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">
                            {caseItem.primaryName || caseItem.fullName}
                            {caseItem.secondaryName && (
                              <span className="text-teal-700 font-medium mr-1.5 text-[11px]">
                                ({caseItem.secondaryName})
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            الرقم القومي: {caseItem.nationalId}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-800 font-medium">{caseItem.district}</div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <UserCheck className="w-3 h-3 text-slate-400" />
                            {caseItem.assignedResearcher || 'غير محدد'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-teal-50 text-teal-800 border border-teal-200/70 font-medium text-[11px]">
                            {matchReason}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-rose-700">
                          {caseItem.financials?.netFinancialGap.toLocaleString('ar-EG')} ج.م
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {(caseItem.historicalAssistanceTotal ?? 0).toLocaleString('ar-EG')} ج.م
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleOpenDisburseModal(caseItem)}
                            disabled={activeFundBalance <= 0}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                              activeFundBalance > 0
                                ? 'bg-teal-700 text-white hover:bg-teal-800 active:scale-95'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                            }`}
                          >
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            إصدار أمر صرف فوري
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Orders Log View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 lg:p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-700" />
                سجل أذونات الصرف الفوري الصادرة
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                توثيق كامل لأذونات الصرف الفورية مع إمكانية إعادة الطباعة، تأكيد التسليم الميداني، أو الإلغاء
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                إجمالي الأذونات: {fastTrackOrders.length}
              </span>
            </div>
          </div>

          {/* Mobile View: Responsive Fast-Track Cards (360px - 430px) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {fastTrackOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-500 px-4">
                <FileText className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-semibold">لم يتم إصدار أية أذونات صرف فوري حتى الآن</p>
              </div>
            ) : (
              fastTrackOrders.map((order) => {
                const todayStr = new Date().toISOString().split('T')[0];
                const isDelivered = order.status === 'delivered';
                const isCancelled = order.status === 'cancelled';
                const isOverdue = !isDelivered && !isCancelled && Boolean(order.dueDeadlineDate && order.dueDeadlineDate < todayStr);
                const isDueToday = !isDelivered && !isCancelled && order.dueDeadlineDate === todayStr;

                return (
                  <div
                    key={order.id}
                    className={`p-3.5 space-y-2.5 transition-colors ${
                      isOverdue ? 'bg-rose-50/40' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    {/* Header Row: Voucher Code & Amount */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-mono font-bold text-teal-800 text-sm">{order.voucherCode}</div>
                        <div className="text-xs font-semibold text-slate-900 mt-0.5">{order.beneficiaryPrimaryName}</div>
                      </div>
                      <div className="text-left font-mono">
                        <span className="font-black text-slate-900 text-sm">
                          {order.amount.toLocaleString('ar-EG')} ج.م
                        </span>
                        <span className="block text-[10px] text-teal-800 font-sans font-medium">{order.shariaCategoryName}</span>
                      </div>
                    </div>

                    {/* Metadata Row: Date & Status */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <div className="text-[11px] text-slate-500">
                        <span>إصدار: {order.issuedDate}</span>
                        {isOverdue && (
                          <span className="block text-rose-600 font-bold mt-0.5">تجاوز المهلة!</span>
                        )}
                        {isDueToday && (
                          <span className="block text-amber-600 font-bold mt-0.5">الموعد اليوم</span>
                        )}
                      </div>

                      <div>
                        {isDelivered ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            تم التسليم
                          </span>
                        ) : isCancelled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <X className="w-3 h-3" />
                            ملغي
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 shrink-0" />
                            قيد التسليم
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mobile Touch Action Buttons */}
                    <div className="flex items-center gap-2 pt-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveReceiptOrder(order)}
                        className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 active:scale-[0.98] text-teal-800 border border-teal-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      >
                        <Printer className="w-4 h-4" />
                        <span>طباعة الإذن</span>
                      </button>

                      {!isDelivered && !isCancelled && (
                        <button
                          type="button"
                          onClick={() => handleOpenFulfillment(order)}
                          className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <Check className="w-4 h-4" />
                          <span>تأكيد التسليم</span>
                        </button>
                      )}

                      {!isDelivered && !isCancelled && permissions.canConfigureSettings && (
                        <button
                          type="button"
                          onClick={() => cancelFastTrackOrder(order.id)}
                          className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-[0.98] text-rose-700 border border-rose-200 flex items-center justify-center transition-all cursor-pointer"
                          title="إلغاء الإذن"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            {fastTrackOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <FileText className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-semibold">لم يتم إصدار أية أذونات صرف فوري حتى الآن</p>
              </div>
            ) : (
              <table className="w-full text-right text-xs text-slate-700">
                <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">كود الإذن المالي</th>
                    <th className="py-3 px-4">تاريخ الإصدار / المهلة</th>
                    <th className="py-3 px-4">المستفيد</th>
                    <th className="py-3 px-4">المصرف الشرعي</th>
                    <th className="py-3 px-4">المبلغ المعتمد</th>
                    <th className="py-3 px-4">الباحث المكلف</th>
                    <th className="py-3 px-4">حالة التسليم</th>
                    <th className="py-3 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fastTrackOrders.map((order) => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const isDelivered = order.status === 'delivered';
                    const isCancelled = order.status === 'cancelled';
                    const isOverdue = !isDelivered && !isCancelled && Boolean(order.dueDeadlineDate && order.dueDeadlineDate < todayStr);
                    const isDueToday = !isDelivered && !isCancelled && order.dueDeadlineDate === todayStr;

                    return (
                      <tr key={order.id} className={`transition-colors ${isOverdue ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-slate-50/70'}`}>
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-teal-800">{order.voucherCode}</div>
                          {order.isRestrictedCaseOrder && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                                <Lock className="w-2.5 h-2.5 text-amber-600" />
                                تبرع مقيد لحالة
                              </span>
                              {order.manualReceiptNo && (
                                <span className="text-[10px] text-teal-800 bg-teal-50 px-1 py-0.2 rounded font-mono font-bold border border-teal-200">
                                  سند: {order.manualReceiptNo}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-800 font-medium">{order.issuedDate}</div>
                          <div className={`text-[10px] flex items-center gap-1 mt-0.5 ${
                            isOverdue
                              ? 'text-rose-700 font-bold'
                              : isDueToday
                              ? 'text-amber-800 font-bold'
                              : 'text-slate-500'
                          }`}>
                            {isOverdue ? (
                              <>
                                <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                                <span>متأخر عن: {order.dueDeadlineDate}</span>
                              </>
                            ) : isDueToday ? (
                              <>
                                <Clock className="w-3 h-3 text-amber-700 shrink-0" />
                                <span>يستحق اليوم: {order.dueDeadlineDate}</span>
                              </>
                            ) : (
                              <>
                                <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>المهلة: {order.dueDeadlineDate}</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">
                            {order.beneficiaryPrimaryName}
                            {order.beneficiarySecondaryName && (
                              <span className="text-teal-700 mr-1 text-[11px]">
                                ({order.beneficiarySecondaryName})
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {order.beneficiaryPhone}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {order.shariaCategoryName}
                        </td>
                        <td className="py-3 px-4 font-black text-slate-900 text-sm">
                          {order.amount.toLocaleString('ar-EG')}{' '}
                          <span className="text-xs font-normal text-slate-500">ج.م</span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {order.assignedResearcher}
                        </td>
                        <td className="py-3 px-4">
                          {isDelivered ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3" />
                                تم التسليم ({order.deliveredDate})
                              </span>
                              <div className="flex items-center gap-1 flex-wrap text-[10px]">
                                {order.deliveryReceiptNo && (
                                  <span className="font-mono bg-emerald-50 text-emerald-900 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                                    سند: {order.deliveryReceiptNo}
                                  </span>
                                )}
                                <span className="text-slate-600">
                                  {order.deliveryMethod === 'postal_transfer'
                                    ? 'حوالة بريدية'
                                    : order.deliveryMethod === 'direct_vendor_payment'
                                    ? 'سداد مباشر لدائن'
                                    : 'نقداً بإيصال مبصوم'}
                                </span>
                              </div>
                              {order.deliveryNotes && (
                                <p className="text-[10px] text-slate-500 italic max-w-xs truncate" title={order.deliveryNotes}>
                                  ملاحظة: {order.deliveryNotes}
                                </p>
                              )}
                            </div>
                          ) : isCancelled ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                              <Ban className="w-3 h-3" />
                              ملغي
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                              <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                              تجاوز مهلة الاستحقاق
                            </span>
                          ) : isDueToday ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-700 shrink-0" />
                              يستحق التسليم اليوم
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3 shrink-0" />
                              قيد التسليم الميداني
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => setActiveReceiptOrder(order)}
                              title="طباعة إذن الصرف الرسمي"
                              className="p-1.5 rounded-lg bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 transition-colors cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {!isDelivered && !isCancelled && (
                              <>
                                <button
                                  onClick={() => handleOpenFulfillment(order)}
                                  title="توثيق تسليم المساعدة للمستفيد"
                                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                {permissions.canConfigureSettings && (
                                  <button
                                    onClick={() => cancelFastTrackOrder(order.id)}
                                    title="إلغاء الإذن واسترداد الرصيد"
                                    className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 4. Fast-Track Disbursement Modal */}
      {orderModalCase && activeFund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden text-right">
            {/* Modal Header */}
            <div className="bg-gradient-to-l from-teal-800 to-teal-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-400 text-slate-950 rounded-xl">
                  <Zap className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-bold">إصدار أمر صرف فوري عاجل</h3>
                  <p className="text-xs text-teal-200">
                    خصم فوري من {activeFund.name} (الرصيد المتاح: {activeFundBalance.toLocaleString('ar-EG')} ج.م)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOrderModalCase(null)}
                className="text-teal-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-700">
              {/* Beneficiary Card Summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-slate-900">
                    {orderModalCase.primaryName || orderModalCase.fullName}
                    {orderModalCase.secondaryName && (
                      <span className="text-teal-700 mr-1.5 font-semibold">
                        ({orderModalCase.secondaryName})
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-xs font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                    {orderModalCase.code}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px]">
                  <div>الرقم القومي: {orderModalCase.nationalId}</div>
                  <div>الهاتف: {orderModalCase.phone}</div>
                  <div>
                    العنوان: {orderModalCase.governorate} - {orderModalCase.district}
                  </div>
                  <div className="font-bold text-rose-700">
                    الفجوة المالية للحالة: {orderModalCase.financials?.netFinancialGap.toLocaleString('ar-EG')} ج.م
                  </div>
                </div>
              </div>

              {/* Amount Field with smart helper */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-800">مبلغ الإعانة الفورية المطلوب (ج.م):</label>
                  <span className="text-[11px] text-teal-700 font-semibold">
                    الحد الأقصى المتاح بالصندوق: {activeFundBalance.toLocaleString('ar-EG')} ج.م
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={100}
                    max={activeFundBalance}
                    value={orderAmount || ''}
                    onChange={(e) => setOrderAmount(Number(e.target.value))}
                    className="w-full text-base font-black px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:bg-white text-slate-900"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    ج.م
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  تفقيط المبلغ: <span className="font-semibold text-slate-700">{tafqeetArabic(orderAmount)}</span>
                </p>
              </div>

              {/* Researcher Selection */}
              <ResearcherSelect
                value={orderResearcher}
                onChange={setOrderResearcher}
                label="الباحث الميداني المكلف بالتسليم:"
                required
              />

              {/* Flexible Deadline with Nature-Aware Guidance & Presets */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-800 text-xs">تاريخ استحقاق تسليم الإعانة للمستفيد:</label>
                  {deadlineReason && (
                    <span className="text-[10px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded font-bold border border-teal-200">
                      {deadlineReason}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={orderDeadline}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setOrderDeadline(e.target.value);
                      setDeadlineReason('تاريخ محدد يدوياً');
                    }}
                    className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:bg-white text-slate-900"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-500">
                  <span className="text-[10px]">تعديل سريع للمهلة:</span>
                  {[
                    { label: 'عاجل (3 أيام)', days: 3 },
                    { label: 'أسبوع (7 أيام)', days: 7 },
                    { label: 'أسبوعين (14 يوماً)', days: 14 },
                    { label: 'شهر (30 يوماً)', days: 30 },
                  ].map((preset) => {
                    const d = new Date();
                    d.setDate(d.getDate() + preset.days);
                    const dateStr = d.toISOString().split('T')[0];
                    const isSelected = orderDeadline === dateStr;
                    return (
                      <button
                        key={preset.days}
                        type="button"
                        onClick={() => {
                          setOrderDeadline(dateStr);
                          setDeadlineReason(`${preset.label}`);
                        }}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#005756] text-white border-[#005756]'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Purpose & Note */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800">الغرض وملاحظات الصرف المشروط:</label>
                <textarea
                  rows={2}
                  value={orderPurpose}
                  onChange={(e) => setOrderPurpose(e.target.value)}
                  placeholder="مثال: شراء أدوية وفلاتر جلسات الغسيل الكلوي وفق روشتة معتمدة..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:bg-white text-slate-900 resize-none"
                />
              </div>

              {/* Error banner if any */}
              {orderFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{orderFormError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOrderModalCase(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDisbursement}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 transition-all shadow-none flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                اعتماد وإصدار إذن الصرف فورياً
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Official Printable 4-Party Urgent Voucher Modal */}
      <UrgentVoucherPrintModal
        isOpen={!!activeReceiptOrder}
        onClose={() => setActiveReceiptOrder(null)}
        order={activeReceiptOrder}
        availableOrders={fastTrackOrders}
        onSelectOrder={setActiveReceiptOrder}
      />

      {/* 6. Fulfillment / Delivery Documentation Modal */}
      {fulfillmentOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-800 text-emerald-200 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">توثيق تسليم المساعدة وإغلاق إذن الصرف</h3>
                  <p className="text-xs text-emerald-200">
                    إثبات التسليم الميداني بالرقم المستندي وأرشفة العملية
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFulfillmentOrder(null)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto text-xs text-slate-700">
              {/* Order Info Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-slate-900">
                    {fulfillmentOrder.beneficiaryPrimaryName}
                    {fulfillmentOrder.beneficiarySecondaryName && (
                      <span className="text-teal-700 mr-1.5 font-semibold">
                        ({fulfillmentOrder.beneficiarySecondaryName})
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-xs font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                    {fulfillmentOrder.voucherCode}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px] pt-1 border-t border-slate-200">
                  <div>المبلغ المعتمد: <strong className="text-slate-900 font-mono text-xs">{fulfillmentOrder.amount.toLocaleString('ar-EG')} ج.م</strong></div>
                  <div>المصرف: <strong className="text-slate-900">{fulfillmentOrder.shariaCategoryName}</strong></div>
                  <div>الباحث المكلف: <strong className="text-slate-900">{fulfillmentOrder.assignedResearcher}</strong></div>
                  <div>تاريخ الإصدار: <span className="font-mono text-slate-900">{fulfillmentOrder.issuedDate}</span></div>
                </div>
              </div>

              {/* Field 1: Manual Delivery Receipt / Voucher Number */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-900 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    <span>رقم سند الصرف / إيصال الاستلام الورقي *</span>
                  </label>
                  <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                    إلزامي للرقابة
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={deliveryReceiptNo}
                  onChange={(e) => setDeliveryReceiptNo(e.target.value)}
                  placeholder="مثال: إيصال استلام ص-304 / سند تسليم يدوي رقم 892"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white text-slate-900"
                />
                <p className="text-[10px] text-slate-500">
                  رقم إيصال الاستلام الموقّع والمبصوم من المستحق في الميدان لتسهيل المطابقة أثناء المراجعة.
                </p>
              </div>

              {/* Field 2: Delivery Method */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-900">طريقة الاستلام والتسليم المعتمدة:</label>
                <div className="grid grid-cols-1 gap-2">
                  <label className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-colors ${deliveryMethod === 'cash_signed' ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}>
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="cash_signed"
                      checked={deliveryMethod === 'cash_signed'}
                      onChange={() => setDeliveryMethod('cash_signed')}
                      className="text-emerald-700 focus:ring-emerald-600"
                    />
                    <div>
                      <span>نقداً باليد بموجب إيصال موقّع ومبصوم</span>
                      <span className="block text-[10px] font-normal text-slate-500">تسليم نقدي مباشر بمقر إقامة المستفيد مع توقيع وبصمة</span>
                    </div>
                  </label>

                  <label className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-colors ${deliveryMethod === 'postal_transfer' ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}>
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="postal_transfer"
                      checked={deliveryMethod === 'postal_transfer'}
                      onChange={() => setDeliveryMethod('postal_transfer')}
                      className="text-emerald-700 focus:ring-emerald-600"
                    />
                    <div>
                      <span>حوالة بريدية رسمية (مكتب البريد المصري)</span>
                      <span className="block text-[10px] font-normal text-slate-500">تحويل رسمي على الرقم القومي يصرف من أي مكتب بريد</span>
                    </div>
                  </label>

                  <label className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-colors ${deliveryMethod === 'direct_vendor_payment' ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}>
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="direct_vendor_payment"
                      checked={deliveryMethod === 'direct_vendor_payment'}
                      onChange={() => setDeliveryMethod('direct_vendor_payment')}
                      className="text-emerald-700 focus:ring-emerald-600"
                    />
                    <div>
                      <span>سداد مباشر لفاتورة علاج أو مورد أو دائن</span>
                      <span className="block text-[10px] font-normal text-slate-500">دفع مباشر للمستشفى، الصيدلية، مقاول السقف، أو صاحب الدين بموجب فاتورة رسمية</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Field 3: Delivery Notes */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-900">ملاحظات واقعة التسليم الميداني:</label>
                <textarea
                  rows={2}
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="مثال: تم تسليم المساعدة لرب الأسرة بمقر السكن بحضور باحث المنطقة، مع التأكد من سلامة الصرف..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white text-slate-900 resize-none"
                />
              </div>

              {/* Error if any */}
              {fulfillmentError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{fulfillmentError}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setFulfillmentOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmFulfillment}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-all shadow-none flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                تأكيد التسليم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
