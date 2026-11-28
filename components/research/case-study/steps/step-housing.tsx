'use client';

import React from 'react';
import { Check, Home, MapPin, Mic, MicOff } from 'lucide-react';
import { CustomSelect } from '@/components/ui/custom-select';

export interface StepHousingProps {
  currentQuestion: number;
  housingStatus: string;
  setHousingStatus: React.Dispatch<React.SetStateAction<string>>;
  roofType: 'concrete' | 'wood_straw' | 'damaged';
  setRoofType: React.Dispatch<React.SetStateAction<'concrete' | 'wood_straw' | 'damaged'>>;
  waterConnection: 'independent' | 'shared' | 'none';
  setWaterConnection: React.Dispatch<React.SetStateAction<'independent' | 'shared' | 'none'>>;
  electricityMeter: 'formal' | 'code_meter' | 'none';
  setElectricityMeter: React.Dispatch<React.SetStateAction<'formal' | 'code_meter' | 'none'>>;
  hasPrivateBathroom: boolean;
  setHasPrivateBathroom: React.Dispatch<React.SetStateAction<boolean>>;
  basicAppliances: string[];
  setBasicAppliances: React.Dispatch<React.SetStateAction<string[]>>;
  caseSummary: string;
  setCaseSummary: React.Dispatch<React.SetStateAction<string>>;
  landmarkAddress: string;
  setLandmarkAddress: React.Dispatch<React.SetStateAction<string>>;
  handleNext: () => void;
  isListening: boolean;
  activeVoiceField: string | null;
  toggleVoiceDictation: (
    fieldKey: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => void;
}

export function StepHousing({
  currentQuestion,
  housingStatus,
  setHousingStatus,
  roofType,
  setRoofType,
  waterConnection,
  setWaterConnection,
  electricityMeter,
  setElectricityMeter,
  hasPrivateBathroom,
  setHasPrivateBathroom,
  basicAppliances,
  setBasicAppliances,
  caseSummary,
  setCaseSummary,
  landmarkAddress,
  setLandmarkAddress,
  handleNext,
  isListening,
  activeVoiceField,
  toggleVoiceDictation,
}: StepHousingProps) {
  if (currentQuestion < 8 || currentQuestion > 10) return null;

  return (
    <>
      {/* Q8: Housing Status */}
      {currentQuestion === 8 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
              <Home size={15} />
              <span>تقييم السكن</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              ما هي الحالة السكنية للأسرة؟
            </h2>
          </div>

          <div className="space-y-2">
            {[
              { title: 'إيجار غير مستقر / مهدد بالإخلاء', desc: 'تراكم إيجارات وإنذار بالطرد' },
              { title: 'إيجار قديم أو شبه مستقر', desc: 'إيجار ثابت بقيمة منخفضة' },
              { title: 'ملك للأسرة / ورثة', desc: 'سكن ملك ولكن بحاجة لترميم ومرافق' },
              { title: 'غرفة مشتركة / سكن مؤقت', desc: 'منافع مشتركة مع أسر أخرى' },
              { title: 'مأوى غير لائق / آيل للسقوط', desc: 'سقف خشب، رشح مياه، بيئة خطرة' },
            ].map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => {
                  setHousingStatus(item.title);
                  setTimeout(handleNext, 150);
                }}
                className={`w-full p-2.5 sm:p-3 rounded-2xl border-2 text-right transition-all cursor-pointer flex items-center justify-between ${
                  housingStatus === item.title
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
                    housingStatus === item.title ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300'
                  }`}
                >
                  {housingStatus === item.title && <Check size={12} />}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Q9: Housing Facilities & Description */}
      {currentQuestion === 9 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
              <Home size={15} />
              <span>المعاينة الميدانية ومرافق السكن</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              مرافق السكن وتوصيف البيئة المعيشية
            </h2>
            <p className="text-xs text-slate-500">
              حدد حالة المرافق والأجهزة الأساسية واكتب وصف المسكن.
            </p>
          </div>

          {/* Housing Facilities Quick Chips */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
            {/* Roof Type */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">حالة السقف</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'concrete' as const, label: 'خرساني مسلّح' },
                  { id: 'wood_straw' as const, label: 'خشب وقش / صاج' },
                  { id: 'damaged' as const, label: 'متصدع / متهدم' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRoofType(opt.id)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                      roofType === opt.id
                        ? 'bg-teal-700 border-teal-700 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Water & Electricity */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">مياه الشرب</label>
                <CustomSelect
                  size="sm"
                  value={waterConnection}
                  onChange={(val) => setWaterConnection(val as typeof waterConnection)}
                  options={[
                    { value: 'independent', label: 'عداد مياه مستقل' },
                    { value: 'shared', label: 'وصلة مياه مشتركة' },
                    { value: 'none', label: 'بدون مياه بالمنزل' },
                  ]}
                  ariaLabel="مياه الشرب"
                  triggerClassName="text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">مصدر الكهرباء</label>
                <CustomSelect
                  size="sm"
                  value={electricityMeter}
                  onChange={(val) => setElectricityMeter(val as typeof electricityMeter)}
                  options={[
                    { value: 'formal', label: 'عداد رسمي مسجل' },
                    { value: 'code_meter', label: 'عداد كودي / ممارسة' },
                    { value: 'none', label: 'بدون عداد كهرباء' },
                  ]}
                  ariaLabel="مصدر الكهرباء"
                  triggerClassName="text-xs font-medium"
                />
              </div>
            </div>

            {/* Private Bathroom Toggle */}
            <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-800">دورة مياه خاصة ومستقلة صالحة</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setHasPrivateBathroom(true)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    hasPrivateBathroom ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  نعم
                </button>
                <button
                  type="button"
                  onClick={() => setHasPrivateBathroom(false)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !hasPrivateBathroom ? 'bg-rose-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  مشتركة / غير صالحة
                </button>
              </div>
            </div>

            {/* Basic Appliances Chips */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                الأجهزة الأساسية المتوفرة بالمنزل
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['ثلاجة', 'غسالة', 'بوتاجاز', 'أسرّة كافية'].map((appliance) => {
                  const isSelected = basicAppliances.includes(appliance);
                  return (
                    <button
                      key={appliance}
                      type="button"
                      onClick={() => {
                        setBasicAppliances((prev) =>
                          isSelected ? prev.filter((a) => a !== appliance) : [...prev, appliance]
                        );
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Check
                        size={12}
                        className={isSelected ? 'text-emerald-700 stroke-[3]' : 'text-slate-300'}
                      />
                      <span>{appliance}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Detailed Summary Textarea */}
          <div className="relative">
            <textarea
              rows={3}
              value={caseSummary}
              onChange={(e) => setCaseSummary(e.target.value)}
              placeholder="اكتب المعاينة الميدانية التكميلية لحالة الجدران والبيئة المحيطة..."
              className="w-full p-3 pl-12 text-xs sm:text-sm font-medium bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-slate-900 shadow-xs leading-relaxed"
            />
            <button
              type="button"
              onClick={() => toggleVoiceDictation('caseSummary', setCaseSummary)}
              className={`absolute left-3 bottom-3 p-2 rounded-xl transition-all cursor-pointer ${
                isListening && activeVoiceField === 'caseSummary'
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-slate-200/80 hover:bg-teal-100 text-slate-700'
              }`}
              title="تحدث بالصوت"
            >
              {isListening && activeVoiceField === 'caseSummary' ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* Q10: Landmark */}
      {currentQuestion === 10 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
              <MapPin size={15} />
              <span>تسهيل الوصول</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              هل توجد علامة مميزة لموقع السكن؟
            </h2>
            <p className="text-xs text-slate-500">
              مسجد قريب، صيدلية، محل معروف لتسهيل الزيارات.
            </p>
          </div>

          <div className="relative">
            <input
              type="text"
              autoFocus
              value={landmarkAddress}
              onChange={(e) => setLandmarkAddress(e.target.value)}
              placeholder="مثال: بجوار مسجد النور، أمام صيدلية الأمل"
              className="w-full p-4 pl-12 text-xs sm:text-sm font-semibold bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-slate-900 shadow-xs"
            />
            <button
              type="button"
              onClick={() => toggleVoiceDictation('landmark', setLandmarkAddress)}
              className={`absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all cursor-pointer ${
                isListening && activeVoiceField === 'landmark'
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-slate-200/80 hover:bg-teal-100 text-slate-700'
              }`}
              title="إملاء صوتي للعلامة المميزة"
            >
              {isListening && activeVoiceField === 'landmark' ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
