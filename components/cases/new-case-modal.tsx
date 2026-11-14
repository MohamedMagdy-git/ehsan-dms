'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
import {
  X,
  User,
  Phone,
  MapPin,
  ShieldAlert,
  HeartHandshake,
  CheckCircle2,
} from 'lucide-react';
import { AmountInput } from '@/components/common/amount-input';
import { ResearcherSelect } from './researcher-select';

interface NewCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewCaseModal({ isOpen, onClose }: NewCaseModalProps) {
  const { addCase, setSelectedCaseId } = useApp();

  const [primaryName, setPrimaryName] = useState('');
  const [secondaryName, setSecondaryName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState('القاهرة');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [assignedResearcher, setAssignedResearcher] = useState('أ. هبة الشامي');
  const [initialNeedType, setInitialNeedType] = useState<string>('financial_aid');
  const [estimatedInitialAmount, setEstimatedInitialAmount] = useState<number>(2000);
  const [intakeNotes, setIntakeNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const NEED_CATEGORIES = [
    { id: 'financial_aid', label: 'مساعدة مالية شهرية (معيشة)' },
    { id: 'medical', label: 'علاج وأدوية / مرض مزمن' },
    { id: 'orphan', label: 'كفالة أيتام' },
    { id: 'debts', label: 'سداد ديون / غارمين' },
    { id: 'housing', label: 'ترميم سكن أو تسقيف' },
    { id: 'food', label: 'مساعدات غذائية وإطعام' },
  ];

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

    const today = new Date().toISOString().split('T')[0];
    const initialNeedLabel =
      NEED_CATEGORIES.find((n) => n.id === initialNeedType)?.label || 'مساعدة عامة';

    const result = addCase({
      primaryName: primaryName.trim(),
      secondaryName: secondaryName.trim() || undefined,
      fullName: primaryName.trim(),
      nationalId: nationalId.trim(),
      phone: phone.trim(),
      governorate,
      district: district.trim() || 'وسط البلد',
      address: address.trim() || 'العنوان بانتظار المعاينة الميدانية',
      assignedResearcher,
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
      attachments: [],
    });

    if (!result.success) {
      setErrorMessage(result.error || 'حصلت مشكلة أثناء حفظ الطلب');
      return;
    }

    if (result.caseId) {
      setSelectedCaseId(result.caseId);
    }
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
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">
                  الاسم رباعي <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="الاسم الرباعي من البطاقة..."
                  value={primaryName}
                  onChange={(e) => setPrimaryName(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">
                  اسم الشهرة <span className="text-slate-400 font-normal">(اختياري)</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: أبو عمر، أم زياد..."
                  value={secondaryName}
                  onChange={(e) => setSecondaryName(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">
                  الرقم القومي (14 رقم) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={14}
                  placeholder="2950101..."
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-2.5 border border-slate-200 rounded-lg font-mono text-xs bg-white focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">
                  رقم الموبايل للتواصل <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="01012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg font-mono text-xs bg-white focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15 focus:outline-hidden"
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
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">المحافظة</label>
                <select
                  value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15 focus:outline-hidden"
                >
                  <option value="القاهرة">القاهرة</option>
                  <option value="الجيزة">الجيزة</option>
                  <option value="القليوبية">القليوبية</option>
                  <option value="الإسكندرية">الإسكندرية</option>
                  <option value="الفيوم">الفيوم</option>
                  <option value="بني سويف">بني سويف</option>
                  <option value="الشرقية">الشرقية</option>
                  <option value="الدقهلية">الدقهلية</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">المنطقة / المركز / القرية</label>
                <input
                  type="text"
                  placeholder="مثال: منشأة ناصر، بولاق الدكرور..."
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">العنوان بالتفصيل وعلامة مميزة</label>
              <input
                type="text"
                placeholder="اسم الشارع، رقم البيت، الدور، أو أقرب علامة معروفة..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15 focus:outline-hidden"
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
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">نوع المساعدة المبدئية</label>
                <select
                  value={initialNeedType}
                  onChange={(e) => setInitialNeedType(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15 focus:outline-hidden"
                >
                  {NEED_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">المبلغ التقديري المبدئي</label>
                <AmountInput
                  value={estimatedInitialAmount}
                  onChange={setEstimatedInitialAmount}
                  min={500}
                  step={200}
                  className="w-full"
                />
              </div>
            </div>

            <ResearcherSelect
              value={assignedResearcher}
              onChange={setAssignedResearcher}
              label="الباحث المسؤول عن الزيارة"
              required
            />

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">ملاحظات الاستقبال</label>
              <textarea
                rows={2}
                placeholder="ملخص الحالة، سبب الطلب، أو أي أوراق شفتها مبدئياً..."
                value={intakeNotes}
                onChange={(e) => setIntakeNotes(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer text-xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#005756] hover:bg-[#004241] text-white font-bold rounded-lg transition-all shadow-xs flex items-center gap-2 cursor-pointer text-xs"
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
