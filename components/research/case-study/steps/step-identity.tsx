'use client';

import React from 'react';
import {
  Activity,
  Building,
  Check,
  MapPin,
  Mic,
  MicOff,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { PriorityLevel } from '@/types';
import { ResearcherSelect } from '@/components/cases/researcher-select';

export interface StepIdentityProps {
  currentQuestion: number;
  caseName: string;
  setCaseName: React.Dispatch<React.SetStateAction<string>>;
  isResearcherPOV: boolean;
  authUserName: string;
  authUserAssignedDistricts?: string[];
  visitorName: string;
  setVisitorName: React.Dispatch<React.SetStateAction<string>>;
  contactPhone: string;
  setContactPhone: React.Dispatch<React.SetStateAction<string>>;
  secondaryPhone: string;
  setSecondaryPhone: React.Dispatch<React.SetStateAction<string>>;
  address: string;
  setAddress: React.Dispatch<React.SetStateAction<string>>;
  gpsLocation: { lat: number; lng: number } | null;
  isCapturingGps: boolean;
  handleCaptureGps: () => void;
  referralSource: string;
  setReferralSource: React.Dispatch<React.SetStateAction<string>>;
  otherReferralSource: string;
  setOtherReferralSource: React.Dispatch<React.SetStateAction<string>>;
  priorityLevel: PriorityLevel;
  setPriorityLevel: React.Dispatch<React.SetStateAction<PriorityLevel>>;
  handleNext: () => void;
  isListening: boolean;
  activeVoiceField: string | null;
  toggleVoiceDictation: (
    fieldKey: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => void;
}

export function StepIdentity({
  currentQuestion,
  caseName,
  setCaseName,
  isResearcherPOV,
  authUserName,
  authUserAssignedDistricts,
  visitorName,
  setVisitorName,
  contactPhone,
  setContactPhone,
  secondaryPhone,
  setSecondaryPhone,
  address,
  setAddress,
  gpsLocation,
  isCapturingGps,
  handleCaptureGps,
  referralSource,
  setReferralSource,
  otherReferralSource,
  setOtherReferralSource,
  priorityLevel,
  setPriorityLevel,
  handleNext,
  isListening,
  activeVoiceField,
  toggleVoiceDictation,
}: StepIdentityProps) {
  if (currentQuestion < 1 || currentQuestion > 7) return null;

  return (
    <>
      {/* Q1: Case Name */}
      {currentQuestion === 1 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
              <User size={15} />
              <span>البيانات التعريفية</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              ما هو اسم الحالة (رب الأسرة)؟
            </h2>
            <p className="text-xs text-slate-500">
              الاسم الرباعي الرسمي للمستفيد الأساسي كما هو بالبطاقة.
            </p>
          </div>

          <div className="relative">
            <input
              type="text"
              autoFocus
              value={caseName}
              onChange={(e) => setCaseName(e.target.value)}
              placeholder="مثال: يحيى سعيد محمود حسن"
              className="w-full p-4 pl-12 text-sm sm:text-base font-bold bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-slate-900 shadow-xs"
            />
            <button
              type="button"
              onClick={() => toggleVoiceDictation('caseName', setCaseName)}
              className={`absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all cursor-pointer ${
                isListening && activeVoiceField === 'caseName'
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-slate-200/80 hover:bg-teal-100 text-slate-700'
              }`}
              title="تحدث بالصوت"
            >
              {isListening && activeVoiceField === 'caseName' ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* Q2: Researcher */}
      {currentQuestion === 2 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[#005756] flex items-center gap-1.5">
              <ShieldCheck size={15} />
              <span>التكليف الميداني</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              {isResearcherPOV ? 'تأكيد اسم الباحث الميداني' : 'من هو الباحث الميداني المسؤول؟'}
            </h2>
            <p className="text-xs text-slate-500">
              {isResearcherPOV
                ? 'الاستمارة بتتسجل تلقائياً باسم حسابك الميداني النشط عشان تترفع للمراجعة باسمك.'
                : 'اختر الباحث المكلف بالنزول أو أضف باحثاً جديداً.'}
            </p>
          </div>

          {isResearcherPOV ? (
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  الباحث الميداني المسؤول
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                  تلقائي من الحساب
                </span>
              </div>
              <p className="text-base font-bold text-slate-900">{authUserName}</p>
              {authUserAssignedDistricts && authUserAssignedDistricts.length > 0 && (
                <p className="text-xs text-slate-500">
                  نطاق التغطية: {authUserAssignedDistricts.join(' · ')}
                </p>
              )}
            </div>
          ) : (
            <div className="p-2 bg-slate-50 rounded-2xl border border-slate-200">
              <ResearcherSelect
                value={visitorName}
                onChange={(val) => setVisitorName(val)}
                label="الباحث الميداني المسؤول"
                required
              />
            </div>
          )}
        </div>
      )}

      {/* Q3: Primary Phone */}
      {currentQuestion === 3 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
              <Phone size={15} />
              <span>أرقام التواصل</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              ما هو رقم هاتف التواصل الأساسي؟
            </h2>
            <p className="text-xs text-slate-500">
              رقم محمول نشط للتواصل الميداني.
            </p>
          </div>

          <input
            type="tel"
            autoFocus
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="01xxxxxxxxx"
            dir="ltr"
            className="w-full p-4 text-center text-lg sm:text-xl font-mono font-bold bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-slate-900 shadow-xs tracking-wider"
          />
        </div>
      )}

      {/* Q4: Secondary Phone */}
      {currentQuestion === 4 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
              <Phone size={15} />
              <span>هاتف بديل (اختياري)</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              هل يوجد رقم هاتف بديل؟
            </h2>
            <p className="text-xs text-slate-500">
              يمكنك تركه فارغاً والضغط على [التالي].
            </p>
          </div>

          <input
            type="tel"
            autoFocus
            value={secondaryPhone}
            onChange={(e) => setSecondaryPhone(e.target.value)}
            placeholder="01xxxxxxxxx (اختياري)"
            dir="ltr"
            className="w-full p-4 text-center text-base sm:text-lg font-mono font-medium bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-slate-900 shadow-xs tracking-wider"
          />
        </div>
      )}

      {/* Q5: Address & Geolocation */}
      {currentQuestion === 5 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
              <Building size={15} />
              <span>محل الإقامة والموقع</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              ما هو العنوان ومحل الإقامة التفصيلي؟
            </h2>
            <p className="text-xs text-slate-500">
              المحافظة - الحي - الشارع - رقم العقار أو وصف دقيق.
            </p>
          </div>

          <div className="relative">
            <input
              type="text"
              autoFocus
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="مثال: الجيزة - بولاق الدكرور - شارع جمال عبد الناصر..."
              className="w-full p-3.5 pl-12 text-xs sm:text-sm font-semibold bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-teal-700 focus:bg-white focus:outline-hidden text-slate-900 shadow-xs"
            />
            <button
              type="button"
              onClick={() => toggleVoiceDictation('address', setAddress)}
              className={`absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all cursor-pointer ${
                isListening && activeVoiceField === 'address'
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-slate-200/80 hover:bg-teal-100 text-slate-700'
              }`}
              title="تحدث بالصوت"
            >
              {isListening && activeVoiceField === 'address' ? <MicOff size={15} /> : <Mic size={15} />}
            </button>
          </div>

          <button
            type="button"
            onClick={handleCaptureGps}
            disabled={isCapturingGps}
            className="w-full py-2.5 px-3 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-xl text-teal-900 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <MapPin size={15} className="text-teal-700 shrink-0" />
            <span>
              {gpsLocation
                ? `تم تثبيت الإحداثيات (${gpsLocation.lat}, ${gpsLocation.lng})`
                : isCapturingGps
                ? 'جاري تحديد موقع البيت (GPS)...'
                : 'تحديد موقع البيت (GPS)'}
            </span>
          </button>
        </div>
      )}

      {/* Q6: Referral Source */}
      {currentQuestion === 6 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
              <Sparkles size={15} />
              <span>قناة الوصول</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              كيف وصلت الحالة إلى الجمعية؟
            </h2>
          </div>

          <div className="space-y-2">
            {[
              'ترشيح من متطوع / باحث ميداني',
              'التقدم بمقر الجمعية',
              'مسح وبحث ميداني دوري',
              'إحالة من جهة أو مؤسسة شريكة',
              'أخرى (مصدر آخر)',
            ].map((src) => {
              const isSelected = referralSource === src;
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => {
                    setReferralSource(src);
                    if (src !== 'أخرى (مصدر آخر)') {
                      setTimeout(handleNext, 150);
                    }
                  }}
                  className={`w-full p-3.5 rounded-2xl border-2 text-right text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-teal-50 border-teal-700 text-teal-950 ring-1 ring-teal-700 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span>{src}</span>
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'border-[#005756] bg-[#005756] text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} className="text-white" />}
                  </span>
                </button>
              );
            })}
          </div>

          {referralSource === 'أخرى (مصدر آخر)' && (
            <div className="pt-1 space-y-1.5 animate-in fade-in duration-150">
              <label className="text-xs font-bold text-slate-700 block">
                توضيح مصدر الوصول <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  value={otherReferralSource}
                  onChange={(e) => setOtherReferralSource(e.target.value)}
                  placeholder="اكتب مصدر وصول الحالة (مثال: ترشيح إمام مسجد / جيران / مستشفى)..."
                  className="w-full h-11 px-3.5 pl-12 text-xs sm:text-sm font-semibold bg-white border-2 border-[#005756] rounded-xl focus:outline-hidden text-slate-900 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => toggleVoiceDictation('otherReferral', setOtherReferralSource)}
                  className={`absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all cursor-pointer ${
                    isListening && activeVoiceField === 'otherReferral'
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-slate-100 hover:bg-teal-100 text-slate-700'
                  }`}
                  title="إملاء مصدر الوصول صوتياً"
                >
                  {isListening && activeVoiceField === 'otherReferral' ? <MicOff size={15} /> : <Mic size={15} />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Q7: Priority Level */}
      {currentQuestion === 7 && (
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
              <Activity size={15} />
              <span>تقييم الأولوية</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              ما هو تصنيف أولوية الحالة من واقع المعاينة؟
            </h2>
          </div>

          <div className="space-y-2">
            {[
              {
                level: 'critical' as PriorityLevel,
                label: 'أولوية حرجة (تدخل عاجل)',
                badge: 'bg-rose-50 text-rose-900 border-rose-500 ring-1 ring-rose-500',
                activeDot: 'border-rose-700 bg-rose-700',
              },
              {
                level: 'high' as PriorityLevel,
                label: 'أولوية عالية (استحقاق مؤكد)',
                badge: 'bg-amber-50 text-amber-900 border-amber-500 ring-1 ring-amber-500',
                activeDot: 'border-amber-700 bg-amber-700',
              },
              {
                level: 'medium' as PriorityLevel,
                label: 'أولوية متوسطة (دعم جزئي)',
                badge: 'bg-teal-50 text-teal-950 border-[#005756] ring-1 ring-[#005756]',
                activeDot: 'border-[#005756] bg-[#005756]',
              },
              {
                level: 'low' as PriorityLevel,
                label: 'أولوية منخفضة / معونة موسمية',
                badge: 'bg-slate-100 text-slate-900 border-slate-500 ring-1 ring-slate-500',
                activeDot: 'border-slate-700 bg-slate-700',
              },
            ].map((item) => {
              const isSelected = priorityLevel === item.level;
              return (
                <button
                  key={item.level}
                  type="button"
                  onClick={() => {
                    setPriorityLevel(item.level);
                    setTimeout(handleNext, 150);
                  }}
                  className={`w-full p-3.5 rounded-2xl border-2 text-right transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? `${item.badge} shadow-xs`
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs sm:text-sm font-black">{item.label}</span>
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? item.activeDot : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} className="text-white" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
