'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/app-context';
import {
  X,
  User,
  AlertCircle,
  Plus,
  Trash2,
  DollarSign,
  Heart,
  Home,
  Save,
} from 'lucide-react';
import { BeneficiaryCase, HousingCondition, WorkCapacity, FoodInsecurityLevel, HouseholdMember, CaseStatus } from '@/types';
import { AmountInput } from '@/components/common/amount-input';
import { ResearcherSelect } from './researcher-select';

interface EditCaseModalProps {
  caseItem: BeneficiaryCase | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditCaseModal({ caseItem, isOpen, onClose }: EditCaseModalProps) {
  const { updateCase, cases } = useApp();

  const [primaryName, setPrimaryName] = useState('');
  const [secondaryName, setSecondaryName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState('القاهرة');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [assignedResearcher, setAssignedResearcher] = useState('أ. هبة الشامي');
  const [status, setStatus] = useState<CaseStatus>('active_eligible');

  // Financials
  const [directIncome, setDirectIncome] = useState<number>(0);
  const [indirectIncome, setIndirectIncome] = useState<number>(0);
  const [basicExpenses, setBasicExpenses] = useState<number>(0);
  const [medicalExpenses, setMedicalExpenses] = useState<number>(0);
  const [externalAid, setExternalAid] = useState<number>(0);

  // Vulnerability
  const [hasChronicIllness, setHasChronicIllness] = useState(false);
  const [chronicIllnessDetails, setChronicIllnessDetails] = useState('');
  const [isOrphanHousehold, setIsOrphanHousehold] = useState(false);
  const [orphanCount, setOrphanCount] = useState<number>(0);
  const [housingCondition, setHousingCondition] = useState<HousingCondition>('rent_unstable');
  const [foodInsecurityLevel, setFoodInsecurityLevel] = useState<FoodInsecurityLevel>('moderate');
  const [workCapacity, setWorkCapacity] = useState<WorkCapacity>('partial');
  const [confidenceScore, setConfidenceScore] = useState<number>(100);
  const [incompleteDocuments, setIncompleteDocuments] = useState(false);
  const [notes, setNotes] = useState('');

  // Household Members
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (caseItem) {
      setPrimaryName(caseItem.primaryName || caseItem.fullName);
      setSecondaryName(caseItem.secondaryName || '');
      setNationalId(caseItem.nationalId);
      setPhone(caseItem.phone);
      setGovernorate(caseItem.governorate);
      setDistrict(caseItem.district);
      setAddress(caseItem.address);
      setAssignedResearcher(caseItem.assignedResearcher);
      setStatus(caseItem.status);

      setDirectIncome(caseItem.financials.directIncome);
      setIndirectIncome(caseItem.financials.indirectIncome);
      setBasicExpenses(caseItem.financials.basicExpenses);
      setMedicalExpenses(caseItem.financials.medicalExpenses);
      setExternalAid(caseItem.financials.externalAid);

      setHasChronicIllness(caseItem.vulnerability.hasChronicIllness);
      setChronicIllnessDetails(caseItem.vulnerability.chronicIllnessDetails || '');
      setIsOrphanHousehold(caseItem.vulnerability.isOrphanHousehold);
      setOrphanCount(caseItem.vulnerability.orphanCount || 0);
      setHousingCondition(caseItem.vulnerability.housingCondition);
      setFoodInsecurityLevel(caseItem.vulnerability.foodInsecurityLevel);
      setWorkCapacity(caseItem.vulnerability.workCapacity);
      setConfidenceScore(caseItem.vulnerability.confidenceScore || 100);
      setIncompleteDocuments(caseItem.vulnerability.incompleteDocuments);
      setNotes(caseItem.notes);

      setMembers([...caseItem.householdMembers]);
      setErrorMessage('');
    }
  }, [caseItem]);

  if (!isOpen || !caseItem) return null;

  const calculatedGap = Math.max(
    0,
    basicExpenses + medicalExpenses - (directIncome + indirectIncome + externalAid)
  );

  const handleAddMember = () => {
    setMembers((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        name: '',
        relation: 'ابن',
        age: 10,
        educationLevel: 'ابتدائي',
        healthStatus: 'سليم',
        workStatus: 'طالب',
      },
    ]);
  };

  const handleRemoveMember = (index: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMemberChange = (index: number, field: keyof HouseholdMember, val: any) => {
    setMembers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!primaryName.trim()) {
      setErrorMessage('يرجى إدخال الاسم الأساسي لرب الأسرة أو العائل');
      return;
    }
    if (!nationalId.trim() || nationalId.trim().length !== 14) {
      setErrorMessage('الرقم القومي المصري يجب أن يتكون من 14 رقماً بالضبط');
      return;
    }

    // Verify duplicate National ID against OTHER cases
    const duplicate = cases.find((c) => c.nationalId === nationalId.trim() && c.id !== caseItem.id);
    if (duplicate) {
      setErrorMessage(`الرقم القومي مسجل بالفعل لحالة أخرى (${duplicate.fullName} - ${duplicate.code})`);
      return;
    }

    updateCase(caseItem.id, {
      primaryName: primaryName.trim(),
      secondaryName: secondaryName.trim() || undefined,
      fullName: primaryName.trim(),
      nationalId: nationalId.trim(),
      phone: phone.trim() || 'غير مسجل',
      governorate,
      district: district.trim(),
      address: address.trim(),
      assignedResearcher,
      status,
      householdMembers: members.filter((m) => m.name.trim() !== ''),
      financials: {
        ...caseItem.financials,
        directIncome: Number(directIncome),
        indirectIncome: Number(indirectIncome),
        basicExpenses: Number(basicExpenses),
        medicalExpenses: Number(medicalExpenses),
        externalAid: Number(externalAid),
        netFinancialGap: calculatedGap,
        estimatedAssistanceNeed: calculatedGap,
      },
      vulnerability: {
        ...caseItem.vulnerability,
        hasChronicIllness,
        chronicIllnessDetails: hasChronicIllness ? chronicIllnessDetails : undefined,
        isOrphanHousehold,
        orphanCount: isOrphanHousehold ? Number(orphanCount) : 0,
        dependentsCount: Math.max(0, members.length - 1),
        housingCondition,
        foodInsecurityLevel,
        workCapacity,
        confidenceScore: Number(confidenceScore),
        incompleteDocuments,
      },
      notes: notes.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                تحديث بيانات الحالة: {caseItem.primaryName || caseItem.fullName}
                {caseItem.secondaryName ? ` (${caseItem.secondaryName})` : ''}
              </h2>
              <span className="font-mono text-xs font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                {caseItem.code}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              تعديل تفاصيل الهوية، مصادر الدخل، مصاريف العلاج، وأفراد الأسرة
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {errorMessage && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Identity */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 pb-1 border-b border-slate-100 flex items-center gap-1.5">
              <User size={15} className="text-teal-700" />
              <span>البيانات الأساسية والحالة التشغيلية</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">الاسم الأساسي لرب الأسرة / المعيل *</label>
                <input
                  type="text"
                  required
                  value={primaryName}
                  onChange={(e) => setPrimaryName(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">الاسم الثانوي أو الشهرة (اختياري)</label>
                <input
                  type="text"
                  value={secondaryName}
                  onChange={(e) => setSecondaryName(e.target.value)}
                  placeholder="مثال: أم أحمد / الشهرة"
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">الرقم القومي (14 رقم) *</label>
                <input
                  type="text"
                  required
                  maxLength={14}
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">رقم الهاتف</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">الحي أو المنطقة</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">الحالة التشغيلية</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CaseStatus)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold"
                >
                  <option value="active_eligible">مؤهلة ومستحقة</option>
                  <option value="pending_exception">بانتظار اعتماد استثناء</option>
                  <option value="under_review">تحت البحث والمراجعة</option>
                  <option value="temporarily_suspended">موقوفة مؤقتاً</option>
                  <option value="excluded_current_month">مستبعدة من تخصيص الشهر</option>
                  <option value="closed">مغلقة / زال الاستحقاق</option>
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-slate-700 font-semibold">العنوان التفصيلي</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <ResearcherSelect
                value={assignedResearcher}
                onChange={setAssignedResearcher}
                label="الباحث الميداني المسؤول"
                required
              />
            </div>
          </div>

          {/* Financials */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                <DollarSign size={15} className="text-teal-700" />
                <span>البيانات المالية الواقعية (بالجنيه المصري)</span>
              </h3>
              <div className="text-teal-900 font-mono font-bold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                الفجوة المعاد احتسابها: {calculatedGap.toLocaleString('ar-EG')} ج.م
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">دخل رسمي مثبت</label>
                <AmountInput
                  min={0}
                  value={directIncome}
                  onChange={setDirectIncome}
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">دخل غير مباشر (يوميات)</label>
                <AmountInput
                  min={0}
                  value={indirectIncome}
                  onChange={setIndirectIncome}
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">مصاريف معيشة وإيجار</label>
                <AmountInput
                  min={0}
                  value={basicExpenses}
                  onChange={setBasicExpenses}
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">مصاريف علاج وأدوية</label>
                <AmountInput
                  min={0}
                  value={medicalExpenses}
                  onChange={setMedicalExpenses}
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">مساعدات خارجية</label>
                <AmountInput
                  min={0}
                  value={externalAid}
                  onChange={setExternalAid}
                />
              </div>
            </div>
          </div>

          {/* Vulnerability */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 pb-1 border-b border-slate-100 flex items-center gap-1.5">
              <Heart size={15} className="text-rose-600" />
              <span>محاور الهشاشة والاحتياج</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={hasChronicIllness}
                    onChange={(e) => setHasChronicIllness(e.target.checked)}
                    className="rounded-sm border-slate-300 text-teal-700"
                  />
                  <span>أمراض مزمنة أو عجز حركي</span>
                </label>
                {hasChronicIllness && (
                  <input
                    type="text"
                    value={chronicIllnessDetails}
                    onChange={(e) => setChronicIllnessDetails(e.target.value)}
                    placeholder="تفاصيل المرض..."
                    className="w-full p-1.5 border border-slate-200 rounded-md text-xs bg-white"
                  />
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={isOrphanHousehold}
                    onChange={(e) => setIsOrphanHousehold(e.target.checked)}
                    className="rounded-sm border-slate-300 text-teal-700"
                  />
                  <span>أسرة أيتام</span>
                </label>
                {isOrphanHousehold && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">عدد الأيتام:</span>
                    <input
                      type="number"
                      min="1"
                      value={orphanCount}
                      onChange={(e) => setOrphanCount(Number(e.target.value))}
                      className="w-20 p-1 border border-slate-200 rounded-md text-xs font-mono bg-white"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-semibold">حالة السكن</label>
                <select
                  value={housingCondition}
                  onChange={(e) => setHousingCondition(e.target.value as HousingCondition)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="dilapidated_urgent">سكن آيل للسقوط / خطورة شديدة</option>
                  <option value="rent_unstable">إيجار غير مستقر مهدد بالإخلاء</option>
                  <option value="rent_stable">إيجار قديم أو مستقر</option>
                  <option value="owned">ملك</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 font-semibold">
                    نسبة ثقة الباحث: <strong className="font-mono text-teal-800">{confidenceScore}%</strong>
                  </label>
                </div>
                <input
                  type="range"
                  min="70"
                  max="100"
                  step="5"
                  value={confidenceScore}
                  onChange={(e) => setConfidenceScore(Number(e.target.value))}
                  className="w-full accent-teal-700"
                />

                <label className="flex items-center gap-2 cursor-pointer text-slate-800 pt-1">
                  <input
                    type="checkbox"
                    checked={incompleteDocuments}
                    onChange={(e) => setIncompleteDocuments(e.target.checked)}
                    className="rounded-sm border-slate-300 text-teal-700"
                  />
                  <span className="font-semibold text-amber-800">أوراق رسمية غير مكتملة</span>
                </label>
              </div>
            </div>
          </div>

          {/* Members Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">أفراد الأسرة المعالون ({members.length})</h3>
              <button
                type="button"
                onClick={handleAddMember}
                className="text-xs text-teal-800 font-semibold flex items-center gap-1 hover:underline"
              >
                <Plus size={14} />
                <span>إضافة فرد</span>
              </button>
            </div>

            <div className="space-y-2">
              {members.map((m, index) => (
                <div key={m.id || index} className="grid grid-cols-12 gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 items-center">
                  <input
                    type="text"
                    placeholder="اسم الفرد"
                    value={m.name}
                    onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                    className="col-span-4 p-1.5 border border-slate-200 rounded-md bg-white text-xs"
                  />
                  <input
                    type="text"
                    placeholder="القرابة"
                    value={m.relation}
                    onChange={(e) => handleMemberChange(index, 'relation', e.target.value)}
                    className="col-span-2 p-1.5 border border-slate-200 rounded-md bg-white text-xs"
                  />
                  <input
                    type="number"
                    placeholder="السن"
                    value={m.age}
                    onChange={(e) => handleMemberChange(index, 'age', Number(e.target.value))}
                    className="col-span-2 p-1.5 border border-slate-200 rounded-md bg-white font-mono text-xs"
                  />
                  <input
                    type="text"
                    placeholder="العمل/الدراسة"
                    value={m.workStatus}
                    onChange={(e) => handleMemberChange(index, 'workStatus', e.target.value)}
                    className="col-span-3 p-1.5 border border-slate-200 rounded-md bg-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(index)}
                    className="col-span-1 p-1 text-slate-400 hover:text-rose-600 flex justify-center"
                    title="حذف"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-slate-700 font-semibold">ملاحظات الباحث الميداني وتاريخ الحالة</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#005756] hover:bg-[#004241] text-white rounded-lg font-bold text-xs shadow-xs flex items-center gap-1.5"
            >
              <Save size={14} />
              <span>حفظ وتحديث بيانات الحالة</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
