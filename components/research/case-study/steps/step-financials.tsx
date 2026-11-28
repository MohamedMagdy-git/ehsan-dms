'use client';

import React from 'react';
import { Wallet, Check, Mic, MicOff, TrendingUp } from 'lucide-react';

export interface StepFinancialsProps {
  currentQuestion: number;
  basicIncomeAmount: number;
  setBasicIncomeAmount: React.Dispatch<React.SetStateAction<number>>;
  basicIncomeSources: string;
  setBasicIncomeSources: React.Dispatch<React.SetStateAction<string>>;
  additionalIncomeAmount: number;
  setAdditionalIncomeAmount: React.Dispatch<React.SetStateAction<number>>;
  additionalIncomeSources: string;
  setAdditionalIncomeSources: React.Dispatch<React.SetStateAction<string>>;
  familyAssets: string;
  setFamilyAssets: React.Dispatch<React.SetStateAction<string>>;
  monthlyBasicExpenses: number;
  setMonthlyBasicExpenses: React.Dispatch<React.SetStateAction<number>>;
  monthlyDebtsInstallments: number;
  setMonthlyDebtsInstallments: React.Dispatch<React.SetStateAction<number>>;
  debtsAndObligations: string;
  setDebtsAndObligations: React.Dispatch<React.SetStateAction<string>>;
  totalIncome: number;
  totalObligations: number;
  netFinancialGap: number;
  handleNext: () => void;
  isListening: boolean;
  activeVoiceField: string | null;
  toggleVoiceDictation: (
    fieldKey: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => void;
}

export function StepFinancials({
  currentQuestion,
  basicIncomeAmount,
  setBasicIncomeAmount,
  basicIncomeSources,
  setBasicIncomeSources,
  additionalIncomeAmount,
  setAdditionalIncomeAmount,
  additionalIncomeSources,
  setAdditionalIncomeSources,
  familyAssets,
  setFamilyAssets,
  monthlyBasicExpenses,
  setMonthlyBasicExpenses,
  monthlyDebtsInstallments,
  setMonthlyDebtsInstallments,
  debtsAndObligations,
  setDebtsAndObligations,
  totalIncome,
  totalObligations,
  netFinancialGap,
  handleNext,
  isListening,
  activeVoiceField,
  toggleVoiceDictation,
}: StepFinancialsProps) {
  return (
    <>
      {/* Q12: Basic Monthly Income */}
      {currentQuestion === 12 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
              <Wallet size={15} />
              <span>الدخل الأساسي</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              ما هو إجمالي الدخل الأساسي الشهري (ج.م)؟
            </h2>
            <p className="text-xs text-slate-500">
              معاش تكافل وكرامة، معاش تأميني، أو راتب شهري ثابت.
            </p>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <input
                type="number"
                min={0}
                autoFocus
                value={basicIncomeAmount}
                onChange={(e) => setBasicIncomeAmount(Number(e.target.value) || 0)}
                className="w-full p-4 pl-16 text-center text-2xl font-black font-mono bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-slate-900 shadow-xs"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                ج.م/شهر
              </span>
            </div>

            <div className="flex gap-2">
              {[0, 450, 650, 900, 1200].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setBasicIncomeAmount(val)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer"
                >
                  {val} ج.م
                </button>
              ))}
            </div>

            <div className="pt-1 space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                مصدر وتفاصيل الدخل الأساسي
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={basicIncomeSources}
                  onChange={(e) => setBasicIncomeSources(e.target.value)}
                  placeholder="مثال: معاش تكافل وكرامة، معاش تأميني، راتب شهري..."
                  className="w-full h-10 px-3 pl-11 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:border-[#005756] focus:bg-white focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => toggleVoiceDictation('basicIncomeSource', setBasicIncomeSources)}
                  className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all cursor-pointer ${
                    isListening && activeVoiceField === 'basicIncomeSource'
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-slate-200/80 hover:bg-teal-100 text-slate-700'
                  }`}
                  title="إملاء تفاصيل الدخل الأساسي صوتياً"
                >
                  {isListening && activeVoiceField === 'basicIncomeSource' ? <MicOff size={14} /> : <Mic size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Q13: Additional Income */}
      {currentQuestion === 13 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
              <Wallet size={15} />
              <span>الدخل الإضافي</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              ما هو الدخل الإضافي من اليوميات غير المنتظمة؟
            </h2>
            <p className="text-xs text-slate-500">
              تقدير شهري للأعمال الحرفية واليوميات المتقطعة.
            </p>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <input
                type="number"
                min={0}
                autoFocus
                value={additionalIncomeAmount}
                onChange={(e) => setAdditionalIncomeAmount(Number(e.target.value) || 0)}
                className="w-full p-4 pl-16 text-center text-2xl font-black font-mono bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-slate-900 shadow-xs"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                ج.م/شهر
              </span>
            </div>

            <div className="flex gap-2">
              {[0, 300, 400, 600, 800].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAdditionalIncomeAmount(val)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer"
                >
                  {val} ج.م
                </button>
              ))}
            </div>

            <div className="pt-1 space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                مصدر وتفاصيل الدخل الإضافي
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={additionalIncomeSources}
                  onChange={(e) => setAdditionalIncomeSources(e.target.value)}
                  placeholder="مثال: يوميات عمالة غير منتظمة، خياطة، مساعدة أهل..."
                  className="w-full h-10 px-3 pl-11 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:border-[#005756] focus:bg-white focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => toggleVoiceDictation('additionalIncomeSource', setAdditionalIncomeSources)}
                  className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all cursor-pointer ${
                    isListening && activeVoiceField === 'additionalIncomeSource'
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-slate-200/80 hover:bg-teal-100 text-slate-700'
                  }`}
                  title="إملاء تفاصيل الدخل الإضافي صوتياً"
                >
                  {isListening && activeVoiceField === 'additionalIncomeSource' ? <MicOff size={14} /> : <Mic size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Q14: Family Assets */}
      {currentQuestion === 14 &&
        (() => {
          const presetAssetOptions = [
            'لا توجد أي أملاك مسجلة',
            'مركبة عمل (تروسيكل / دراجة نقل)',
            'أجهزة كهربائية معيشية بسيطة فقط',
            'دابة أو مواشي ريفية',
          ];
          const otherAssetLabel = 'أصول أخرى (اذكرها)';
          const isOtherAssetSelected = !presetAssetOptions.includes(familyAssets);
          const customAssetValue =
            isOtherAssetSelected && familyAssets !== otherAssetLabel ? familyAssets : '';

          return (
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                  <Wallet size={15} />
                  <span>الأملاك والأصول</span>
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  هل تمتلك الأسرة أي أصول أو أدوات إنتاج؟
                </h2>
              </div>

              <div className="space-y-2">
                {presetAssetOptions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setFamilyAssets(item);
                      setTimeout(handleNext, 150);
                    }}
                    className={`w-full p-3.5 rounded-2xl border-2 text-right text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-between ${
                      familyAssets === item
                        ? 'bg-teal-50 border-teal-700 text-teal-950 ring-1 ring-teal-700 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span>{item}</span>
                    <span
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        familyAssets === item
                          ? 'border-teal-700 bg-teal-700 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {familyAssets === item && <Check size={12} />}
                    </span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    if (!isOtherAssetSelected || familyAssets === otherAssetLabel) {
                      setFamilyAssets('');
                    }
                  }}
                  className={`w-full p-3.5 rounded-2xl border-2 text-right text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-between ${
                    isOtherAssetSelected
                      ? 'bg-teal-50 border-teal-700 text-teal-950 ring-1 ring-teal-700 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span>{otherAssetLabel}</span>
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isOtherAssetSelected
                        ? 'border-teal-700 bg-teal-700 text-white'
                        : 'border-slate-300'
                    }`}
                  >
                    {isOtherAssetSelected && <Check size={12} />}
                  </span>
                </button>
              </div>

              {isOtherAssetSelected && (
                <div className="pt-0.5 space-y-1.5 animate-in fade-in duration-150">
                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      value={customAssetValue}
                      onChange={(e) => setFamilyAssets(e.target.value)}
                      placeholder="مثال: ماكينة خياطة، كشك صغير، توكتوك، قيراط أرض..."
                      className="w-full p-3.5 pl-12 text-xs sm:text-sm font-semibold bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-slate-900 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => toggleVoiceDictation('familyAssetsOther', setFamilyAssets)}
                      className={`absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all cursor-pointer ${
                        isListening && activeVoiceField === 'familyAssetsOther'
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-slate-200/80 hover:bg-teal-100 text-slate-700'
                      }`}
                      title="تحدث بالصوت"
                    >
                      {isListening && activeVoiceField === 'familyAssetsOther' ? (
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

      {/* Q15: Basic Expenses */}
      {currentQuestion === 15 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
              <Wallet size={15} />
              <span>المصروفات المعيشية</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              ما هو إجمالي المصروفات الأساسية الشهرية؟
            </h2>
            <p className="text-xs text-slate-500">
              تشمل: الإيجار، الطعام، وفواتير المياه والكهرباء.
            </p>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <input
                type="number"
                min={0}
                autoFocus
                value={monthlyBasicExpenses}
                onChange={(e) => setMonthlyBasicExpenses(Number(e.target.value) || 0)}
                className="w-full p-4 pl-16 text-center text-2xl font-black font-mono bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-slate-900 shadow-xs"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                ج.م/شهر
              </span>
            </div>

            <div className="flex gap-2">
              {[1500, 2000, 2500, 3000, 3500].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMonthlyBasicExpenses(val)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer"
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Q16: Debts */}
      {currentQuestion === 16 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
              <Wallet size={15} />
              <span>الديون والالتزامات</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              ما هي أقساط الديون الشهرية وتفاصيلها؟
            </h2>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <input
                type="number"
                min={0}
                value={monthlyDebtsInstallments}
                onChange={(e) => setMonthlyDebtsInstallments(Number(e.target.value) || 0)}
                className="w-full p-3.5 pl-16 text-center text-xl font-black font-mono bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-rose-800 shadow-xs"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                ج.م/شهر
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                value={debtsAndObligations}
                onChange={(e) => setDebtsAndObligations(e.target.value)}
                placeholder="بيان أسماء الدائنين وسبب الدين..."
                className="w-full p-3.5 pl-12 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:border-teal-700 focus:bg-white focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => toggleVoiceDictation('debts', setDebtsAndObligations)}
                className={`absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all cursor-pointer ${
                  isListening && activeVoiceField === 'debts'
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-slate-200/80 hover:bg-teal-100 text-slate-700'
                }`}
                title="إملاء تفاصيل الدائنين والالتزامات صوتياً"
              >
                {isListening && activeVoiceField === 'debts' ? <MicOff size={15} /> : <Mic size={15} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Q17: Gap Review */}
      {currentQuestion === 17 && (
        <div className="space-y-3">
          <div className="space-y-1 text-center">
            <span className="text-xs font-bold text-teal-800 inline-flex items-center gap-1.5 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
              <TrendingUp size={14} className="text-teal-700" />
              <span>حاسبة العجز المالي</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mt-1">
              العجز الشهري (الفجوة المالية)
            </h2>
            <p className="text-xs text-slate-500">
              حساب فوري للفرق بين إجمالي الدخل وكافة المصروفات.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl space-y-3">
            <div className="text-center py-2 border-b border-slate-200">
              <span className="text-xs text-slate-500 font-semibold block mb-1">
                صافي العجز الشهري المقترح للتغطية
              </span>
              <span className="text-3xl sm:text-4xl font-black text-[#005756] font-mono tracking-tight">
                {netFinancialGap.toLocaleString('ar-EG')} ج.م
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <span className="block text-[11px] text-slate-500">إجمالي الدخل</span>
                <span className="block font-bold text-slate-800 font-mono mt-0.5">
                  {totalIncome.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                <span className="block text-[11px] text-slate-500">إجمالي الالتزامات</span>
                <span className="block font-bold text-rose-700 font-mono mt-0.5">
                  {totalObligations.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
