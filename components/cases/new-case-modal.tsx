'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
import {
  X,
  User,
  Phone,
  MapPin,
  Clock,
  ShieldAlert,
  ClipboardList,
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
    { id: 'financial_aid', label: 'مساعدة مالية دورية (كفاف ومعيشة)' },
    { id: 'medical', label: 'رعاية صحية ودواء / مرض مزمن' },
    { id: 'orphan', label: 'كفالة أيتام وأسرة فاقدة العائل' },
    { id: 'debts', label: 'سداد ديون / تفريج كرب غارمين' },
    { id: 'housing', label: 'تحسين مسكن / تسقيف وإيواء' },
    { id: 'food', label: 'مساعدات غذائية وإطعام عاجل' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!primaryName.trim()) {
      setErrorMessage('يرجى إدخال اسم المستفيد الأساسي (الرباعي)');
      return;
    }
    if (!nationalId.trim() || nationalId.trim().length !== 14) {
      setErrorMessage('الرقم القومي يجب أن يتكون من 14 رقماً بالضبط');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('يرجى إدخال رقم الهاتف للتواصل وتنسيق الزيارة الميدانية');
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
      status: 'pending_field_research', // قيد الانتظار · بانتظار الزيارة الميدانية
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
          initialNeedType === 'medical' ? 'تم الرصد المبدئي لمشكلة صحية' : undefined,
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
      notes: `[قيد طلب جديد - نوع الاحتياج: ${initialNeedLabel}]\n${intakeNotes.trim()}`,
      attachments: [],
    });

    if (!result.success) {
      setErrorMessage(result.error || 'حدث خطأ أثناء قيد الطلب');
      return;
    }

    if (result.caseId) {
      setSelectedCaseId(result.caseId);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 text-right">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#004241] to-[#005756] text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <ClipboardList size={20} className="text-teal-200" />
            </div>
            <div>
              <h2 className="text-base font-bold">استقبال حالة جديدة (مكتب الاستقبال)</h2>
              <p className="text-[11px] text-teal-100/90 mt-0.5">
                إدخال البيانات المبدئية وإدراج الحالة في قائمة الانتظار بانتظار الزيارة الميدانية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X size={18} />
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

          {/* Operational Status Info Banner */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-950 flex items-start gap-2.5">
            <Clock size={18} className="text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block text-amber-900">
                الحالة التشغيلية التلقائية: قائمة الانتظار · تحتاج بحث ميداني
              </span>
              <p className="text-[11px] text-amber-800/90 leading-relaxed">
                <strong>الحماية المالية:</strong> تظل الحالة معزولة تماماً عن جداول التخصيص والصرف الشهري، ولا يُعتمد صرف أي مبالغ لها حتى يتم فحصها وتوثيقها ميدانياً عبر استمارة الزيارة الميدانية.
              </p>
            </div>
          </div>

          {/* 1. Identity & Contact */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
            <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <User size={14} className="text-teal-700" />
              <span>البيانات التعريفية والاتصال</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-800">
                  الاسم الأساسي لرب الأسرة <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="الاسم الرباعي الرسمي..."
                  value={primaryName}
                  onChange={(e) => setPrimaryName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">
                  اسم الشهرة / اللقب <span className="text-slate-400 font-normal">(اختياري)</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: أبو عمر، أم زياد..."
                  value={secondaryName}
                  onChange={(e) => setSecondaryName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-800">
                  الرقم القومي (14 رقماً) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={14}
                  placeholder="2950101..."
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-xs bg-white focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800">
                  رقم الهاتف للتواصل الميداني <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="01012345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-xs bg-white focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Location & Address */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
            <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <MapPin size={14} className="text-rose-600" />
              <span>بيانات الموقع والعنوان للزيارة</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-800">المحافظة</label>
                <select
                  value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
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
                <label className="font-bold text-slate-800">الحي / المركز / القرية</label>
                <input
                  type="text"
                  placeholder="مثال: منشأة ناصر، بولاق الدكرور، شبرا الخيمة..."
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-800">العنوان التفصيلي وعلامة مميزة للوصول</label>
              <input
                type="text"
                placeholder="اسم الشارع، رقم العقار، الدور، علامة مميزة (بجوار مسجد أو متجر معروف)..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* 3. Initial Need & Assigned Researcher */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
            <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <HeartHandshake size={14} className="text-teal-700" />
              <span>نوع الاحتياج المبدئي وتعيين الباحث</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-800">تصنيف الاحتياج المبدئي المطلوب</label>
                <select
                  value={initialNeedType}
                  onChange={(e) => setInitialNeedType(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
                >
                  {NEED_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800">مبلغ الاحتياج التقديري المبدئي</label>
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
              label="الباحث الميداني المرشح لإجراء المعاينة"
              required
            />

            <div className="space-y-1">
              <label className="font-bold text-slate-800">ملاحظات الاستقبال المكتبي وظروف التقدم بالطلب</label>
              <textarea
                rows={2}
                placeholder="ملخص شكوى المتقدم، سبب التقدم بطلب المساعدة، المستندات المبدئية التي تم الاطلاع عليها..."
                value={intakeNotes}
                onChange={(e) => setIntakeNotes(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer text-xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#005756] hover:bg-[#004241] text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer active:scale-98 text-xs"
            >
              <CheckCircle2 size={16} />
              <span>حفظ وإدراج في قائمة الانتظار</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
