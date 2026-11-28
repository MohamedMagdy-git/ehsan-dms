'use client';

import React from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { CaseStudyFamilyMember, ChronicDiseaseConfig } from '@/types';
import { CustomSelect, CustomSelectOption } from '@/components/ui/custom-select';

export interface StepFamilyProps {
  currentQuestion: number;
  caseName: string;
  familyMembers: CaseStudyFamilyMember[];
  activeMemberIndex: number;
  setActiveMemberIndex: React.Dispatch<React.SetStateAction<number>>;
  currentMember: CaseStudyFamilyMember;
  updateCurrentMember: (field: keyof CaseStudyFamilyMember, value: any) => void;
  handleAddNewMember: () => void;
  handleRemoveMember: (idx: number) => void;
  chronicDiseases: ChronicDiseaseConfig[];
}

export function StepFamily({
  currentQuestion,
  caseName,
  familyMembers,
  activeMemberIndex,
  setActiveMemberIndex,
  currentMember,
  updateCurrentMember,
  handleAddNewMember,
  handleRemoveMember,
  chronicDiseases,
}: StepFamilyProps) {
  if (currentQuestion !== 11) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
            <Users size={15} />
            <span>أفراد الأسرة (بطاقة {activeMemberIndex + 1} من {familyMembers.length})</span>
          </span>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
            بيانات {currentMember?.relation || 'الفرد'}
          </h2>
        </div>

        {/* Member Quick Switcher Pills */}
        <div className="flex items-center gap-1">
          {familyMembers.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveMemberIndex(idx)}
              className={`w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center cursor-pointer transition-all ${
                activeMemberIndex === idx
                  ? 'bg-teal-800 text-white shadow-xs scale-105'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Single Member Compact Form (Strictly Zero-Scroll) */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 shadow-2xs">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">الاسم</label>
            <input
              type="text"
              value={currentMember?.name || (activeMemberIndex === 0 ? caseName : '')}
              onChange={(e) => updateCurrentMember('name', e.target.value)}
              placeholder="اسم الفرد رباعياً"
              className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg font-bold"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
              صلة القرابة بالنسبة للحالة
            </label>
            <CustomSelect
              size="sm"
              value={currentMember?.relation || 'نفس الحالة (صاحب الملف الأساسي)'}
              onChange={(val) => updateCurrentMember('relation', val)}
              options={[
                { value: 'نفس الحالة (صاحب الملف الأساسي)', label: 'نفس الحالة (صاحب الملف الأساسي)' },
                { value: 'الأب', label: 'الأب' },
                { value: 'الأم', label: 'الأم' },
                { value: 'الزوج / الزوجة', label: 'الزوج / الزوجة' },
                { value: 'الابن / الابنة', label: 'الابن / الابنة' },
                { value: 'الأخ / الأخت', label: 'الأخ / الأخت' },
                { value: 'الجد / الجدة', label: 'الجد / الجدة' },
                { value: 'قريب / كفيل آخر', label: 'قريب / كفيل آخر' },
              ]}
              ariaLabel="صلة القرابة بالنسبة للحالة"
              triggerClassName="rounded-lg text-xs font-bold"
            />
          </div>
        </div>

        {/* Primary Caregiver Toggle Card */}
        <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer text-xs transition-colors hover:bg-teal-50/40">
          <input
            type="checkbox"
            checked={Boolean(currentMember?.isPrimaryCaregiver)}
            onChange={(e) => updateCurrentMember('isPrimaryCaregiver', e.target.checked)}
            className="w-4 h-4 rounded text-teal-700 accent-teal-700 shrink-0"
          />
          <div className="leading-tight">
            <span className="font-bold text-slate-900 block text-xs">
              المتكفل الفعلي بالإنفاق والرعاية على الأسرة
            </span>
            <span className="text-[10.5px] text-slate-500 block">
              العائل الرئيسي المسؤول عن تأمين المعيشة للأفراد
            </span>
          </div>
        </label>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">السن (عمر الفرد)</label>
            <input
              type="number"
              value={currentMember?.age || 20}
              onChange={(e) => updateCurrentMember('age', Number(e.target.value) || 0)}
              className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg font-bold font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">الحالة الدراسية</label>
            <CustomSelect
              size="sm"
              value={currentMember?.educationLevel || 'إعدادي'}
              onChange={(val) => updateCurrentMember('educationLevel', val)}
              options={[
                { value: 'أمية', label: 'أمية' },
                { value: 'ابتدائي', label: 'ابتدائي' },
                { value: 'إعدادي', label: 'إعدادي' },
                { value: 'ثانوي / دبلوم', label: 'ثانوي / دبلوم' },
                { value: 'جامعي', label: 'جامعي' },
                { value: 'غير ملتحق', label: 'غير ملتحق' },
              ]}
              ariaLabel="الحالة الدراسية"
              triggerClassName="rounded-lg text-xs font-medium"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">القدرة على العمل</label>
            <CustomSelect
              size="sm"
              value={currentMember?.workCapacity || 'قادر على العمل'}
              onChange={(val) => updateCurrentMember('workCapacity', val)}
              options={[
                { value: 'قادر على العمل', label: 'قادر على العمل' },
                { value: 'ربة منزل', label: 'ربة منزل' },
                { value: 'متفرغ لرعاية الأسرة', label: 'متفرغ لرعاية الأسرة' },
                { value: 'عاجز جزئياً أو مسن', label: 'عاجز جزئياً أو مسن' },
                { value: 'عاجز كلياً', label: 'عاجز كلياً' },
                { value: 'طفل / قاصر', label: 'طفل / قاصر' },
              ]}
              ariaLabel="القدرة على العمل"
              triggerClassName="rounded-lg text-xs font-medium"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-700 block mb-0.5">العمل الحالي ومصدر الدخل</label>
          <input
            type="text"
            value={currentMember?.currentJob || ''}
            onChange={(e) => updateCurrentMember('currentJob', e.target.value)}
            placeholder="مثال: عامل يومية / ربة منزل / طالب"
            className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg font-medium"
          />
        </div>

        {/* Chronic Illness Sub-card (Linked to Settings Chronic Diseases) */}
        <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={Boolean(currentMember?.chronicIllness)}
              onChange={(e) => {
                if (e.target.checked) {
                  const activeList = chronicDiseases.filter((d) => d.isActive);
                  const first = activeList[0];
                  updateCurrentMember('chronicIllness', {
                    diseaseId: first ? first.id : '__other__',
                    conditionName: first ? first.name : '',
                    monthlyCost: first ? first.defaultMonthlyCost : 300,
                    isCoveredByStateInsurance: false,
                  });
                } else {
                  updateCurrentMember('chronicIllness', undefined);
                }
              }}
              className="w-4 h-4 rounded text-rose-600 accent-rose-600 shrink-0"
            />
            <span className="font-bold text-slate-800">يعاني هذا الفرد من مرض مزمن أو عجز صحي</span>
          </label>

          {currentMember?.chronicIllness && (() => {
            const activeList = chronicDiseases.filter((d) => d.isActive);
            const ci = currentMember.chronicIllness!;
            const matchedById = ci.diseaseId
              ? chronicDiseases.find((d) => d.id === ci.diseaseId)
              : undefined;
            const matchedByName = !matchedById
              ? chronicDiseases.find(
                  (d) => d.name.trim() === (ci.conditionName || '').trim()
                )
              : undefined;
            const resolvedSelectValue =
              ci.diseaseId === '__other__'
                ? '__other__'
                : matchedById?.id || matchedByName?.id || '__other__';

            return (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                      تشخيص المرض المزمن
                    </label>
                    <CustomSelect
                      size="sm"
                      value={resolvedSelectValue}
                      onChange={(val) => {
                        if (val === '__other__') {
                          updateCurrentMember('chronicIllness', {
                            ...ci,
                            diseaseId: '__other__',
                            conditionName:
                              matchedById || matchedByName ? '' : ci.conditionName,
                          });
                        } else {
                          const picked = chronicDiseases.find((d) => d.id === val);
                          if (picked) {
                            updateCurrentMember('chronicIllness', {
                              ...ci,
                              diseaseId: picked.id,
                              conditionName: picked.name,
                              monthlyCost: picked.defaultMonthlyCost,
                            });
                          }
                        }
                      }}
                      options={[
                        ...activeList.map<CustomSelectOption>((d) => ({
                          value: d.id,
                          label: `${d.name} (${d.defaultMonthlyCost} ج.م)`,
                        })),
                        ...(matchedById && !matchedById.isActive
                          ? [
                              {
                                value: matchedById.id,
                                label: `${matchedById.name} (${matchedById.defaultMonthlyCost} ج.م)`,
                              },
                            ]
                          : []),
                        { value: '__other__', label: 'مرض آخر (كتابة مخصصة)' },
                      ]}
                      ariaLabel="تشخيص المرض المزمن"
                      triggerClassName="rounded-lg bg-slate-50 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                      تكلفة العلاج (ج.م/شهر)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={ci.monthlyCost}
                      onChange={(e) =>
                        updateCurrentMember('chronicIllness', {
                          ...ci,
                          monthlyCost: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full p-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
                    />
                  </div>
                </div>

                {resolvedSelectValue === '__other__' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                      اكتب اسم المرض أو العجز المخصص
                    </label>
                    <input
                      type="text"
                      value={ci.conditionName}
                      onChange={(e) =>
                        updateCurrentMember('chronicIllness', {
                          ...ci,
                          diseaseId: '__other__',
                          conditionName: e.target.value,
                        })
                      }
                      placeholder="مثال: التهاب مفصلي مزمن / مرض نادر..."
                      className="w-full p-1.5 text-xs bg-slate-50 border border-[#005756] rounded-lg font-medium text-slate-900"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-700">
                  <input
                    type="checkbox"
                    checked={ci.isCoveredByStateInsurance}
                    onChange={(e) =>
                      updateCurrentMember('chronicIllness', {
                        ...ci,
                        isCoveredByStateInsurance: e.target.checked,
                      })
                    }
                    className="w-3.5 h-3.5 rounded text-teal-700 accent-teal-700"
                  />
                  <span>مشمول بالتأمين الصحي أو علاج على نفقة الدولة</span>
                </label>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Sub-flow actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleAddNewMember}
          className="flex-1 py-2 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
        >
          <Plus size={14} />
          <span>+ إضافة فرد آخر للأسرة</span>
        </button>

        {familyMembers.length > 1 && (
          <button
            type="button"
            onClick={() => handleRemoveMember(activeMemberIndex)}
            className="p-2 border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl cursor-pointer"
            title="حذف هذا الفرد"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
