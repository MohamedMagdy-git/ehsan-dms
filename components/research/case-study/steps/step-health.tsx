'use client';

import React from 'react';
import { Activity, Check, Mic, MicOff, HeartHandshake } from 'lucide-react';

export interface StepHealthProps {
  currentQuestion: number;
  medicalConditionDescription: string;
  setMedicalConditionDescription: React.Dispatch<React.SetStateAction<string>>;
  chronicVerification: string;
  setChronicVerification: React.Dispatch<React.SetStateAction<string>>;
  stateHealthInsurance: string;
  setStateHealthInsurance: React.Dispatch<React.SetStateAction<string>>;
  monthlyMedicalCosts: number;
  setMonthlyMedicalCosts: React.Dispatch<React.SetStateAction<number>>;
  handleNext: () => void;
  isListening: boolean;
  activeVoiceField: string | null;
  toggleVoiceDictation: (
    fieldKey: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => void;
}

export function StepHealth({
  currentQuestion,
  medicalConditionDescription,
  setMedicalConditionDescription,
  chronicVerification,
  setChronicVerification,
  stateHealthInsurance,
  setStateHealthInsurance,
  monthlyMedicalCosts,
  setMonthlyMedicalCosts,
  handleNext,
  isListening,
  activeVoiceField,
  toggleVoiceDictation,
}: StepHealthProps) {
  return (
    <>
      {/* Q18: Medical Condition */}
      {currentQuestion === 18 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
              <Activity size={15} />
              <span>الحالة الصحية</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              ما هو توصيف الحالات المرضية بالأسرة؟
            </h2>
            <p className="text-xs text-slate-500">
              الأمراض المزمنة، العجز، وأثر المرض على العمل.
            </p>
          </div>

          <div className="relative">
            <textarea
              rows={4}
              autoFocus
              value={medicalConditionDescription}
              onChange={(e) => setMedicalConditionDescription(e.target.value)}
              placeholder="اكتب تفاصيل المرض والشخص المصاب..."
              className="w-full p-3.5 pl-12 text-xs sm:text-sm font-medium bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-slate-900 shadow-xs leading-relaxed"
            />
            <button
              type="button"
              onClick={() => toggleVoiceDictation('medical', setMedicalConditionDescription)}
              className={`absolute left-3 bottom-3 p-2 rounded-xl transition-all cursor-pointer ${
                isListening && activeVoiceField === 'medical'
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-slate-200/80 hover:bg-teal-100 text-slate-700'
              }`}
              title="تحدث بالصوت"
            >
              {isListening && activeVoiceField === 'medical' ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* Q19: Chronic Verification */}
      {currentQuestion === 19 &&
        (() => {
          const presetVerificationOptions = [
            'مؤكد بتقارير وفحوصات طبية حديثة',
            'عجز كلي معتمد بقرار طبي',
            'عجز جزئي أو شيخوخة مع تقرير',
            'لا توجد أمراض مزمنة بالأسرة',
            'روشتات أو أدوية فقط (بدون تقرير حديث)',
          ];
          const otherVerificationLabel = 'سند آخر (اذكره)';
          const isOtherVerificationSelected =
            !presetVerificationOptions.includes(chronicVerification);
          const customVerificationValue =
            isOtherVerificationSelected && chronicVerification !== otherVerificationLabel
              ? chronicVerification
              : '';

          return (
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                  <Activity size={15} />
                  <span>التحقق الطبي</span>
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  ما هو سند التأكد من صحة واستمرار المرض؟
                </h2>
              </div>

              <div className="space-y-2">
                {presetVerificationOptions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setChronicVerification(item);
                      setTimeout(handleNext, 150);
                    }}
                    className={`w-full p-3 rounded-2xl border-2 text-right text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-between ${
                      chronicVerification === item
                        ? 'bg-teal-50 border-teal-700 text-teal-950 ring-1 ring-teal-700 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span>{item}</span>
                    <span
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        chronicVerification === item
                          ? 'border-teal-700 bg-teal-700 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {chronicVerification === item && <Check size={12} />}
                    </span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    if (
                      !isOtherVerificationSelected ||
                      chronicVerification === otherVerificationLabel
                    ) {
                      setChronicVerification('');
                    }
                  }}
                  className={`w-full p-3 rounded-2xl border-2 text-right text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-between ${
                    isOtherVerificationSelected
                      ? 'bg-teal-50 border-teal-700 text-teal-950 ring-1 ring-teal-700 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span>{otherVerificationLabel}</span>
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isOtherVerificationSelected
                        ? 'border-teal-700 bg-teal-700 text-white'
                        : 'border-slate-300'
                    }`}
                  >
                    {isOtherVerificationSelected && <Check size={12} />}
                  </span>
                </button>
              </div>

              {isOtherVerificationSelected && (
                <div className="pt-0.5 space-y-1.5 animate-in fade-in duration-150">
                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      value={customVerificationValue}
                      onChange={(e) => setChronicVerification(e.target.value)}
                      placeholder="مثال: بطاقة خدمات متكاملة، قرار نفقة دولة، تقرير قديم..."
                      className="w-full p-3.5 pl-12 text-xs sm:text-sm font-semibold bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-slate-900 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        toggleVoiceDictation('chronicVerificationOther', setChronicVerification)
                      }
                      className={`absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all cursor-pointer ${
                        isListening && activeVoiceField === 'chronicVerificationOther'
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-slate-200/80 hover:bg-teal-100 text-slate-700'
                      }`}
                      title="تحدث بالصوت"
                    >
                      {isListening && activeVoiceField === 'chronicVerificationOther' ? (
                        <MicOff size={15} />
                      ) : (
                        <Mic size={15} />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

      {/* Q20: 2. سؤال التأمين الصحي ونفقة الدولة المستقل */}
      {currentQuestion === 20 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
              <HeartHandshake size={15} />
              <span>التغطية الصحية الحكومية</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              ما هو الموقف من التأمين الصحي ونفقة الدولة؟
            </h2>
            <p className="text-xs text-slate-500">
              هل تصرف الأسرة علاجاً مدعوماً من جهة رسمية؟
            </p>
          </div>

          <div className="space-y-2">
            {[
              { title: 'غير مشمول بأي تأمين صحي', desc: 'تتحمل الأسرة كامل تكاليف العلاج نقداً' },
              { title: 'صادر له قرار علاج على نفقة الدولة', desc: 'يصرف علاج دوري منتظم لمرض مزمن' },
              { title: 'تأمين صحي حكومي شامل', desc: 'مشمول بمنظومة التأمين الصحي' },
              { title: 'قيد استخراج أوراق التأمين / نفقة الدولة', desc: 'جارٍ إنهاء الفحوصات والقرارات' },
            ].map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => {
                  setStateHealthInsurance(item.title);
                  setTimeout(handleNext, 150);
                }}
                className={`w-full p-2.5 sm:p-3 rounded-2xl border-2 text-right transition-all cursor-pointer flex items-center justify-between ${
                  stateHealthInsurance === item.title
                    ? 'bg-teal-50 border-teal-700 ring-1 ring-teal-700 text-teal-950 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="space-y-0.5">
                  <span className="block text-xs sm:text-sm font-black">{item.title}</span>
                  <span className="block text-[11px] text-slate-500">{item.desc}</span>
                </div>
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    stateHealthInsurance === item.title ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300'
                  }`}
                >
                  {stateHealthInsurance === item.title && <Check size={12} />}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Q21: Monthly Medical Costs */}
      {currentQuestion === 21 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
              <Activity size={15} />
              <span>تكلفة العلاج</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              كم تبلغ تكاليف العلاج والأدوية الدورية شهرياً؟
            </h2>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <input
                type="number"
                min={0}
                autoFocus
                value={monthlyMedicalCosts}
                onChange={(e) => setMonthlyMedicalCosts(Number(e.target.value) || 0)}
                className="w-full p-4 pl-16 text-center text-2xl font-black font-mono bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-slate-900 shadow-xs"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                ج.م/شهر
              </span>
            </div>

            <div className="flex gap-2">
              {[0, 300, 450, 600, 900].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMonthlyMedicalCosts(val)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer"
                >
                  {val} ج.م
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
