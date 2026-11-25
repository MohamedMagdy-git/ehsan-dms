'use client';

import React, { useMemo, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useApp } from '@/context/app-context';
import { useToast } from '@/context/toast-context';
import {
  X,
  User,
  Phone,
  MapPin,
  ShieldAlert,
  HeartHandshake,
  CheckCircle2,
  Banknote,
  Smartphone,
} from 'lucide-react';
import { PayoutMethod } from '@/types';
import {
  isValidEgyptianWalletNumber,
  normalizeWalletDigits,
} from '@/lib/payout-helpers';
import { AmountInput } from '@/components/common/amount-input';
import { SearchableSelect } from '@/components/common/searchable-select';
import { CustomSelect } from '@/components/ui/custom-select';
import { EGYPT_GOVERNORATES, getCitiesByGovernorateName } from '@/lib/egypt-locations';
import { ResearcherSelect } from './researcher-select';

interface NewCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NEED_CATEGORIES = [
  { id: 'financial_aid', label: 'مساعدة مالية شهرية (معيشة)' },
  { id: 'medical', label: 'علاج وأدوية / مرض مزمن' },
  { id: 'orphan', label: 'كفالة أيتام' },
  { id: 'debts', label: 'سداد ديون / غارمين' },
  { id: 'housing', label: 'ترميم سكن أو تسقيف' },
  { id: 'food', label: 'مساعدات غذائية وإطعام' },
  { id: 'other', label: 'أخرى (تحديد نوع المساعدة)' },
];

const UNIFIED_INPUT_CLASS =
  'w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15 focus:outline-hidden transition-colors';

export function NewCaseModal({ isOpen, onClose }: NewCaseModalProps) {
  const { user } = useAuth();
  const isResearcherPOV = user.role === 'researcher';
  const { addCase, setSelectedCaseId } = useApp();
  const { toast } = useToast();

  const [primaryName, setPrimaryName] = useState('');
  const [secondaryName, setSecondaryName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState('القاهرة');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [assignedResearcher, setAssignedResearcher] = useState('أ. هبة الشامي');
  const [initialNeedType, setInitialNeedType] = useState<string>('financial_aid');
  const [customNeedType, setCustomNeedType] = useState('');
  const [estimatedInitialAmount, setEstimatedInitialAmount] = useState<number>(2000);
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('cash_researcher');
  const [walletNumber, setWalletNumber] = useState('');
  const [intakeNotes, setIntakeNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const governorateOptions = useMemo(
    () =>
      EGYPT_GOVERNORATES.map((gov) => ({
        value: gov.nameAr,
        label: gov.nameAr,
        secondaryLabel: gov.nameEn,
      })),
    []
  );

  const districtOptions = useMemo(
    () =>
      getCitiesByGovernorateName(governorate).map((city) => ({
        value: city.nameAr,
        label: city.nameAr,
        secondaryLabel: city.nameEn,
      })),
    [governorate]
  );

  if (!isOpen) return null;

  const handleGovernorateChange = (nextGovernorate: string) => {
    setGovernorate(nextGovernorate);
    const validCities = getCitiesByGovernorateName(nextGovernorate);
    if (district && !validCities.some((city) => city.nameAr === district)) {
      setDistrict('');
    }
  };

  const resetForm = () => {
    setPrimaryName('');
    setSecondaryName('');
    setNationalId('');
    setPhone('');
    setGovernorate('القاهرة');
    setDistrict('');
    setAddress('');
    setAssignedResearcher('أ. هبة الشامي');
    setInitialNeedType('financial_aid');
    setCustomNeedType('');
    setEstimatedInitialAmount(2000);
    setPayoutMethod('cash_researcher');
    setWalletNumber('');
    setIntakeNotes('');
    setErrorMessage('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!primaryName.trim()) {
      setErrorMessage('من فضلك اكتب اسم المستفيد رباعي');
      return;
    }
    if (!nationalId.trim() || nationalId.trim().length !== 14) {
      setErrorMessage('الرقم القومي لازم يكون 14 رقم بالظبط');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('من فضلك اكتب رقم الموبايل عشان الباحث يتواصل مع الحالة');
      return;
    }
    if (!governorate.trim()) {
      setErrorMessage('من فضلك اختر المحافظة');
      return;
    }
    if (initialNeedType === 'other' && !customNeedType.trim()) {
      setErrorMessage('من فضلك اكتب نوع المساعدة المطلوبة عند اختيار «أخرى»');
      return;
    }
    const cleanedWallet = normalizeWalletDigits(walletNumber);
    if (payoutMethod === 'e_wallet') {
      if (!cleanedWallet) {
        setErrorMessage('من فضلك اكتب رقم المحفظة الإلكترونية عند اختيار الاستلام عبر محفظة');
        return;
      }
      if (!isValidEgyptianWalletNumber(cleanedWallet)) {
        setErrorMessage('رقم المحفظة الإلكترونية لازم يكون 11 رقم ويبدأ بـ 010 أو 011 أو 012 أو 015');
        return;
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const initialNeedLabel =
      initialNeedType === 'other'
        ? customNeedType.trim()
        : NEED_CATEGORIES.find((n) => n.id === initialNeedType)?.label || 'مساعدة عامة';

    const effectiveAssignedResearcher = isResearcherPOV ? user.name : assignedResearcher;

    const result = addCase({
      primaryName: primaryName.trim(),
      secondaryName: secondaryName.trim() || undefined,
      fullName: primaryName.trim(),
      nationalId: nationalId.trim(),
      phone: phone.trim(),
      payoutMethod,
      walletNumber: payoutMethod === 'e_wallet' ? cleanedWallet : undefined,
      governorate,
      district: district.trim() || 'وسط البلد',
      address: address.trim() || 'العنوان بانتظار المعاينة الميدانية',
      assignedResearcher: effectiveAssignedResearcher,
      researcherId: isResearcherPOV ? user.researcherId || undefined : undefined,
      registrationDate: today,
      status: 'pending_field_research',
      priority: 'high',
      lastAssessmentDate: today,
      lastVisitDate: '',
      nextVisitDueDate: today,
      householdMembers: [
        {
          id: `m-${Date.now()}`,
          name: primaryName.trim(),
          relation: 'رب الأسرة',
          age: 42,
          educationLevel: 'متوسط',
          healthStatus: initialNeedType === 'medical' ? 'مريض مزمن' : 'سليم',
          workStatus: 'يومية غير منتظمة',
        },
      ],
      financials: {
        directIncome: 0,
        indirectIncome: 0,
        basicExpenses: Number(estimatedInitialAmount) || 2000,
        medicalExpenses: initialNeedType === 'medical' ? 800 : 0,
        externalAid: 0,
        netFinancialGap: Number(estimatedInitialAmount) || 2000,
        estimatedAssistanceNeed: Number(estimatedInitialAmount) || 2000,
      },
      vulnerability: {
        hasChronicIllness: initialNeedType === 'medical',
        chronicIllnessDetails:
          initialNeedType === 'medical' ? 'تم تسجيل شكوى صحية مبدئية' : undefined,
        isOrphanHousehold: initialNeedType === 'orphan',
        orphanCount: initialNeedType === 'orphan' ? 1 : 0,
        dependentsCount: 1,
        housingCondition: initialNeedType === 'housing' ? 'dilapidated_urgent' : 'rent_unstable',
        foodInsecurityLevel: 'moderate',
        workCapacity: 'partial',
        confidenceScore: 80,
        incompleteDocuments: true,
        exceptionApproved: false,
      },
      notes: `[طلب جديد - الاحتياج: ${initialNeedLabel}]\n${intakeNotes.trim()}`,
      recommendedAssistanceType: initialNeedLabel,
      attachments: [],
    });

    if (!result.success) {
      setErrorMessage(result.error || 'حصلت مشكلة أثناء حفظ الطلب');
      return;
    }

    if (result.caseId) {
      setSelectedCaseId(result.caseId);
    }
    toast.success('تم تسجيل الحالة بنجاح وإضافتها لقائمة الانتظار');
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 text-right">
        {/* Clean Light Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">تسجيل حالة جديدة</h2>
            <p className="text-xs text-slate-500 mt-1">
              تسجيل بيانات الحالة الأولية لتحديد موعد الزيارة والبحث الميداني
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <ShieldAlert size={16} className="text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Plain Neutral Operational Note */}
          <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 leading-relaxed">
            الحالة بتدخل قائمة الانتظار مبدئياً، ومش بتدخل جداول الصرف إلا بعد ما الباحث يعمل الزيارة الميدانية ويتأكد من البيانات.
          </p>

          {/* 1. Identity & Contact */}
          <div className="p-4 bg-slate-50/60 border border-slate-200 rounded-xl space-y-3">
            <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
              <User size={15} className="text-slate-400" />
              <span>البيانات الشخصية والتواصل</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">
                  الاسم رباعي <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="الاسم الرباعي من البطاقة..."
                  value={primaryName}
                  onChange={(e) => setPrimaryName(e.target.value)}
                  className={UNIFIED_INPUT_CLASS}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">
                  اسم الشهرة <span className="text-slate-400 font-normal">(اختياري)</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: أبو عمر، أم زياد..."
                  value={secondaryName}
                  onChange={(e) => setSecondaryName(e.target.value)}
                  className={UNIFIED_INPUT_CLASS}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">
                  الرقم القومي (14 رقم) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  maxLength={14}
                  placeholder="2950101..."
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                  className={`${UNIFIED_INPUT_CLASS} font-mono tabular-nums text-right`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">
                  رقم الموبايل للتواصل <span className="text-rose-600">*</span>
                </label>
                <div className="flex items-center h-10 bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-[#005756] focus-within:ring-2 focus-within:ring-[#005756]/15 transition-colors">
                  <span className="h-full px-3 flex items-center justify-center text-slate-400 border-l border-slate-100 bg-slate-50/50 shrink-0">
                    <Phone size={14} />
                  </span>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    placeholder="01012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-full px-3 bg-transparent font-mono tabular-nums text-xs text-slate-900 text-right placeholder:text-slate-400 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Location & Address */}
          <div className="p-4 bg-slate-50/60 border border-slate-200 rounded-xl space-y-3">
            <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
              <MapPin size={15} className="text-slate-400" />
              <span>العنوان ومكان الزيارة</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">المحافظة</label>
                <SearchableSelect
                  value={governorate}
                  onChange={handleGovernorateChange}
                  options={governorateOptions}
                  placeholder="اختر المحافظة..."
                  searchPlaceholder="ابحث عن المحافظة..."
                  emptyMessage="لا توجد محافظة مطابقة"
                  ariaLabel="المحافظة"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">
                  المنطقة / المركز / القرية
                </label>
                <SearchableSelect
                  value={district}
                  onChange={setDistrict}
                  options={districtOptions}
                  placeholder="اختر المركز أو الحي..."
                  searchPlaceholder="ابحث أو اكتب اسماً غير مدرج..."
                  emptyMessage="لا توجد مراكز مطابقة — اكتب الاسم لاعتماده يدوياً"
                  allowCustom
                  clearable
                  customHintLabel="اعتماد منطقة مخصصة"
                  ariaLabel="المنطقة / المركز / القرية"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">
                العنوان بالتفصيل وعلامة مميزة
              </label>
              <input
                type="text"
                placeholder="اسم الشارع، رقم البيت، الدور، أو أقرب علامة معروفة..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={UNIFIED_INPUT_CLASS}
              />
            </div>
          </div>

          {/* 3. Initial Need & Assigned Researcher */}
          <div className="p-4 bg-slate-50/60 border border-slate-200 rounded-xl space-y-3">
            <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
              <HeartHandshake size={15} className="text-slate-400" />
              <span>نوع المساعدة المطلوبة والباحث المسؤول</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">نوع المساعدة المبدئية</label>
                <CustomSelect
                  value={initialNeedType}
                  onChange={(next) => {
                    setInitialNeedType(next);
                    if (next !== 'other') setCustomNeedType('');
                  }}
                  options={NEED_CATEGORIES.map((cat) => ({
                    value: cat.id,
                    label: cat.label,
                  }))}
                  placeholder="اختر نوع المساعدة..."
                  triggerClassName="h-10 text-xs font-medium"
                  ariaLabel="نوع المساعدة المبدئية"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">
                  المبلغ التقديري المبدئي
                </label>
                <AmountInput
                  value={estimatedInitialAmount}
                  onChange={setEstimatedInitialAmount}
                  min={500}
                  step={200}
                  className="w-full h-10 rounded-xl border-slate-200"
                />
              </div>
            </div>

            {initialNeedType === 'other' && (
              <div className="space-y-1.5 animate-in fade-in duration-150">
                <label className="font-semibold text-slate-700 block">
                  تحديد نوع المساعدة المطلوبة <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: توفير أجهزة تعويضية، سداد مصروفات دراسية، جهاز عرائس..."
                  value={customNeedType}
                  onChange={(e) => setCustomNeedType(e.target.value)}
                  className={UNIFIED_INPUT_CLASS}
                />
              </div>
            )}

            {isResearcherPOV ? (
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">
                  الباحث المسؤول عن الزيارة
                </label>
                <div className="w-full h-10 px-3 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-800 font-semibold flex items-center justify-between gap-2">
                  <span className="truncate">{user.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium shrink-0">
                    مسند تلقائياً لك
                  </span>
                </div>
              </div>
            ) : (
              <ResearcherSelect
                value={assignedResearcher}
                onChange={setAssignedResearcher}
                label="الباحث المسؤول عن الزيارة"
                labelClassName="text-slate-700"
                selectClassName="border-slate-200 text-xs shadow-none"
                required
              />
            )}

            {/* Optional Payout Method */}
            <div className="pt-2 border-t border-slate-200/70 space-y-2.5">
              <label className="font-semibold text-slate-700 block">
                طريقة استلام المساعدة{' '}
                <span className="text-slate-400 font-normal">(اختياري · نقدي افتراضياً)</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPayoutMethod('cash_researcher')}
                  className={`min-h-[40px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    payoutMethod === 'cash_researcher'
                      ? 'bg-[#005756] border-[#005756] text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Banknote size={14} className="shrink-0" aria-hidden="true" />
                  <span className="truncate">نقدي عبر الباحث</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayoutMethod('e_wallet')}
                  className={`min-h-[40px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    payoutMethod === 'e_wallet'
                      ? 'bg-[#005756] border-[#005756] text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone size={14} className="shrink-0" aria-hidden="true" />
                  <span className="truncate">محفظة إلكترونية</span>
                </button>
              </div>

              {payoutMethod === 'e_wallet' && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="font-semibold text-slate-700">
                      رقم المحفظة الإلكترونية <span className="text-rose-600">*</span>
                    </label>
                    {normalizeWalletDigits(phone).length === 11 &&
                      walletNumber !== normalizeWalletDigits(phone) && (
                        <button
                          type="button"
                          onClick={() => setWalletNumber(normalizeWalletDigits(phone))}
                          className="text-[11px] font-semibold text-[#005756] hover:underline cursor-pointer"
                        >
                          استخدام نفس رقم الموبايل
                        </button>
                      )}
                  </div>
                  <div className="flex items-center h-10 bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-[#005756] focus-within:ring-2 focus-within:ring-[#005756]/15 transition-colors">
                    <span className="h-full px-3 flex items-center justify-center text-slate-400 border-l border-slate-100 bg-slate-50/50 shrink-0">
                      <Smartphone size={14} />
                    </span>
                    <input
                      type="tel"
                      dir="ltr"
                      inputMode="numeric"
                      maxLength={11}
                      placeholder="01012345678"
                      value={walletNumber}
                      onChange={(e) => setWalletNumber(normalizeWalletDigits(e.target.value))}
                      className="w-full h-full px-3 bg-transparent font-mono tabular-nums text-xs text-slate-900 text-right placeholder:text-slate-400 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">ملاحظات الاستقبال</label>
              <textarea
                rows={2}
                placeholder="ملخص الحالة، سبب الطلب، أو أي أوراق شفتها مبدئياً..."
                value={intakeNotes}
                onChange={(e) => setIntakeNotes(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15 focus:outline-hidden transition-colors"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer text-xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="h-10 px-5 bg-[#005756] hover:bg-[#004241] text-white font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer text-xs"
            >
              <CheckCircle2 size={15} />
              <span>حفظ وإضافة لقائمة الانتظار</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
