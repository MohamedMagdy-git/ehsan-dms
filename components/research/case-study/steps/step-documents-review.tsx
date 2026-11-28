'use client';

import React from 'react';
import {
  X,
  CheckCircle2,
  FileCheck,
  Plus,
  Sparkles,
  Check,
  Mic,
  MicOff,
  Camera,
  HeartHandshake,
  Square,
  Play,
  Pause,
} from 'lucide-react';
import { CaseStudyFamilyMember, CaseExecutiveSummary } from '@/types';
import { ResearcherVoicePlayer } from '@/components/common/researcher-voice-player';
import {
  ENABLE_AI_EXTRACTION_V2,
  ASSISTANCE_TYPE_OPTIONS,
  AttachmentItem,
} from '../types';

export interface ChecklistState {
  nationalIdsAdults: boolean;
  birthCertificatesMinors: boolean;
  insurancePrintOut: boolean;
  utilityReceipt: boolean;
  leaseContractOrRentReceipt: boolean;
  recentMedicalProof: boolean;
  deathOrDivorceCertificates: boolean;
}

export interface StepDocumentsReviewProps {
  currentQuestion: number;
  checklist: ChecklistState;
  setChecklist: React.Dispatch<React.SetStateAction<ChecklistState>>;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  extraFileInputRef: React.RefObject<HTMLInputElement | null>;
  isAddingCustomDoc: boolean;
  setIsAddingCustomDoc: React.Dispatch<React.SetStateAction<boolean>>;
  customDocTitle: string;
  setCustomDocTitle: React.Dispatch<React.SetStateAction<string>>;
  handleSimulateDirectUpload: (category: AttachmentItem['category'], title: string) => void;
  uploadedDocs: AttachmentItem[];
  handleRemoveDoc: (id: string) => void;
  isPlayingAudio: boolean;
  togglePlayRecordedAudio: () => void;
  recommendedAssistanceType: string;
  setRecommendedAssistanceType: React.Dispatch<React.SetStateAction<string>>;
  recommendedAmountOverride: number | null;
  setRecommendedAmountOverride: React.Dispatch<React.SetStateAction<number | null>>;
  effectiveRecommendedAmount: number;
  netFinancialGap: number;
  additionalNotesAndRemarks: string;
  setAdditionalNotesAndRemarks: React.Dispatch<React.SetStateAction<string>>;
  isListening: boolean;
  activeVoiceField: string | null;
  toggleVoiceDictation: (
    fieldKey: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => void;
  fullAudioUrl: string | null;
  fullAudioDuration: number;
  visitorName: string;
  isFullAudioRecording: boolean;
  startFullAudioRecording: () => void;
  stopFullAudioRecording: () => void;
  deleteFullAudioRecording: () => void;
  formatDuration: (seconds: number) => string;
  executiveSummary: CaseExecutiveSummary | null;
  caseName: string;
  familyMembers: CaseStudyFamilyMember[];
  roofType: 'concrete' | 'wood_straw' | 'damaged';
  hasPrivateBathroom: boolean;
  basicAppliances: string[];
  stateHealthInsurance: string;
}

export function StepDocumentsReview({
  currentQuestion,
  checklist,
  setChecklist,
  cameraInputRef,
  extraFileInputRef,
  isAddingCustomDoc,
  setIsAddingCustomDoc,
  customDocTitle,
  setCustomDocTitle,
  handleSimulateDirectUpload,
  uploadedDocs,
  handleRemoveDoc,
  isPlayingAudio,
  togglePlayRecordedAudio,
  recommendedAssistanceType,
  setRecommendedAssistanceType,
  recommendedAmountOverride,
  setRecommendedAmountOverride,
  effectiveRecommendedAmount,
  netFinancialGap,
  additionalNotesAndRemarks,
  setAdditionalNotesAndRemarks,
  isListening,
  activeVoiceField,
  toggleVoiceDictation,
  fullAudioUrl,
  fullAudioDuration,
  visitorName,
  isFullAudioRecording,
  startFullAudioRecording,
  stopFullAudioRecording,
  deleteFullAudioRecording,
  formatDuration,
  executiveSummary,
  caseName,
  familyMembers,
  roofType,
  hasPrivateBathroom,
  basicAppliances,
  stateHealthInsurance,
}: StepDocumentsReviewProps) {
  return (
    <>
      {/* Q22: قائمة التحقق الرسمية والمرفقات (Official Checklist & Documents) */}
      {currentQuestion === 22 && (
        <div className="space-y-3 flex-1 overflow-y-auto overscroll-contain pr-1 pl-1 pb-6">
          <div className="space-y-1">
            <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
              <FileCheck size={15} />
              <span>قائمة التحقق الميدانية الرسمية (Checklist)</span>
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
              فحص ومطابقة المستندات الثبوتية
            </h2>
            <p className="text-xs text-slate-500">
              حدد بالضغط المباشر المستندات المتوفرة والمطابقة لمعايير الاستحقاق.
            </p>
          </div>

          {/* Official Checklist Items (Interactive Toggle Cards) */}
          <div className="space-y-1.5">
            {[
              {
                key: 'nationalIdsAdults' as const,
                label: 'بطاقات رقم قومي سارية لكامل البالغين (وش وضهر)',
                desc: 'إلزامي للتحقق من هوية الأفراد البالغين بالأسرة',
                required: true,
              },
              {
                key: 'birthCertificatesMinors' as const,
                label: 'شهادات ميلاد مميكنة لكامل أفراد الأسرة القصر',
                desc: 'إثبات أعداد وتواريخ ميلاد الأبناء القصر',
                required: true,
              },
              {
                key: 'insurancePrintOut' as const,
                label: 'برنت تأميني موجه / إفادة تكافل وكرامة',
                desc: 'بيان المعاش أو عدم وجود دخل تأميني ثابت',
                required: true,
              },
              {
                key: 'utilityReceipt' as const,
                label: 'إيصال مرافق حديث (كهرباء أو مياه)',
                desc: 'إثبات محل السكن الفعلي واستقرار العنوان',
                required: true,
              },
              {
                key: 'leaseContractOrRentReceipt' as const,
                label: 'عقد إيجار موثق / إيصال سداد إيجار حديث',
                desc: 'في حالات الإيجار لتأكيد الالتزام وقيمة الإيجار',
                required: false,
              },
              {
                key: 'recentMedicalProof' as const,
                label: 'تقارير وفحوصات وروشتات طبية حديثة',
                desc: 'إثبات الأمراض المزمنة وتكاليف الأدوية الشهرية',
                required: false,
              },
              {
                key: 'deathOrDivorceCertificates' as const,
                label: 'شهادة وفاة العائل أو قسيمة طلاق مميكنة',
                desc: 'للأسر فاقدة العائل والأيتام والمطلقات',
                required: false,
              },
            ].map((item) => {
              const isChecked = checklist[item.key];
              return (
                <div
                  key={item.key}
                  onClick={() => setChecklist((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                  className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                    isChecked
                      ? 'bg-teal-50/90 border-teal-600 text-teal-950 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold leading-snug">{item.label}</span>
                      {item.required && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-teal-100 text-teal-800 rounded font-bold">
                          أساسي
                        </span>
                      )}
                    </div>
                    <span className="text-[10.5px] text-slate-500 block">{item.desc}</span>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isChecked ? 'bg-teal-700 border-teal-700 text-white' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isChecked && <Check size={13} className="stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Camera & Quick Upload triggers (Strictly Zero-Scroll) */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="p-2.5 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-xl text-teal-950 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-98 transition-all"
            >
              <Camera size={15} className="text-teal-700" />
              <span>📷 التقاط بالكاميرا</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddingCustomDoc(true)}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
            >
              <Plus size={15} className="text-teal-800" />
              <span>+ مستند إضافي</span>
            </button>
          </div>

          {/* New Custom Document Input Modal / Field */}
          {isAddingCustomDoc && (
            <div className="p-2.5 bg-teal-50/90 border border-teal-300 rounded-2xl space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-teal-950">
                <span>بيان المستند الإضافي (مثال: وصل كهرباء، عقد إيجار...)</span>
                <button
                  type="button"
                  onClick={() => setIsAddingCustomDoc(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={customDocTitle}
                  onChange={(e) => setCustomDocTitle(e.target.value)}
                  placeholder="اكتب أو انطق نوع المستند..."
                  className="w-full p-2 pl-10 text-xs bg-white border border-teal-300 rounded-lg font-medium"
                />
                <button
                  type="button"
                  onClick={() => toggleVoiceDictation('customDoc', setCustomDocTitle)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-teal-800 hover:text-teal-950 cursor-pointer"
                >
                  <Mic size={14} />
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSimulateDirectUpload('customExtra', customDocTitle || 'مستند إضافي')}
                  className="flex-1 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                >
                  تأكيد وحفظ المرفق
                </button>
                <button
                  type="button"
                  onClick={() => extraFileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-[11px] font-semibold cursor-pointer"
                >
                  اختر ملفاً
                </button>
              </div>
            </div>
          )}

          {/* Attached Documents List */}
          <div className="space-y-1">
            {uploadedDocs.map((doc) => (
              <div
                key={doc.id}
                className="px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  {(doc.category as string) === 'voiceRecording' ? (
                    <button
                      type="button"
                      onClick={togglePlayRecordedAudio}
                      className="p-1 rounded-md bg-teal-100 text-teal-800 hover:bg-teal-200 cursor-pointer shrink-0 transition-colors"
                      title={isPlayingAudio ? 'إيقاف مؤقت' : 'استماع للتسجيل الصوتي'}
                    >
                      {isPlayingAudio ? <Pause size={12} /> : <Play size={12} />}
                    </button>
                  ) : (
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  )}
                  <span className="font-bold text-slate-800 truncate">
                    {doc.title} {doc.customDescription ? `(${doc.customDescription})` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveDoc(doc.id)}
                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Q23: توصية الباحث الميداني المستقلة (Researcher Recommendation) */}
      {currentQuestion === 23 && (
        <div className="space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
              <HeartHandshake size={15} />
              <span>توصية الباحث الميداني</span>
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
              إيه نوع المساعدة والمبلغ اللي بتوصي بيه للأسرة؟
            </h2>
            <p className="text-xs text-slate-500">
              اختار نوع الدعم الأنسب لحالة الأسرة وحدد المبلغ الشهري المقترح مع توضيح السبب للإدارة.
            </p>
          </div>

          {/* 1. Assistance Type Selection Cards */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              نوع المساعدة المقترحة
            </label>
            <div className="grid grid-cols-1 gap-2">
              {ASSISTANCE_TYPE_OPTIONS.map((opt) => {
                const isSelected = recommendedAssistanceType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRecommendedAssistanceType(opt.id)}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border text-right transition-colors cursor-pointer flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-teal-50/80 border-[#005756] text-teal-950'
                        : 'bg-slate-50/70 border-slate-200/80 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <span className="block text-xs font-bold">{opt.label}</span>
                      <span className="block text-[11px] text-slate-500">{opt.desc}</span>
                    </div>
                    <span
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'border-[#005756] bg-[#005756] text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check size={12} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Suggested Monthly Amount (defaults to netFinancialGap) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700">
                المبلغ المالي المقترح شهرياً (ج.م)
              </label>
              {recommendedAmountOverride !== null &&
                recommendedAmountOverride !== netFinancialGap && (
                  <button
                    type="button"
                    onClick={() => setRecommendedAmountOverride(null)}
                    className="text-[11px] font-semibold text-[#005756] hover:underline cursor-pointer"
                  >
                    استخدام العجز ({netFinancialGap.toLocaleString('ar-EG')} ج.م)
                  </button>
                )}
            </div>
            <div className="relative">
              <input
                type="number"
                min={0}
                step={50}
                value={effectiveRecommendedAmount}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    setRecommendedAmountOverride(0);
                    return;
                  }
                  const parsed = Number(raw);
                  setRecommendedAmountOverride(
                    Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
                  );
                }}
                className="w-full p-3 pl-14 text-sm font-bold font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-xl focus:border-[#005756] focus:bg-white focus:outline-hidden text-slate-900"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 pointer-events-none">
                ج.م
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              مقترح تلقائياً حسب العجز الشهري للأسرة (
              <span className="font-mono tabular-nums font-semibold text-slate-700">
                {netFinancialGap.toLocaleString('ar-EG')} ج.م
              </span>
              ) وتقدر تعدله حسب رؤيتك الميدانية.
            </p>
          </div>

          {/* 3. Justification & Researcher Notes for Management */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              مبررات التوصية وملاحظات الباحث للإدارة
            </label>
            <div className="relative">
              <textarea
                rows={3}
                value={additionalNotesAndRemarks}
                onChange={(e) => setAdditionalNotesAndRemarks(e.target.value)}
                placeholder="اكتب هنا سبب ترشيح الدعم ده وأي تفاصيل شفتها على الطبيعة تساعد الإدارة في القرار..."
                className="w-full p-3 pl-10 text-xs font-medium leading-relaxed bg-slate-50 border border-slate-200 rounded-xl focus:border-[#005756] focus:bg-white focus:outline-hidden text-slate-800 resize-none"
              />
              <button
                type="button"
                onClick={() => toggleVoiceDictation('remarks', setAdditionalNotesAndRemarks)}
                className={`absolute left-2.5 top-2.5 p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isListening && activeVoiceField === 'remarks'
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'text-slate-500 hover:text-[#005756] hover:bg-slate-200/60'
                }`}
                title="إملاء صوتي سريع للنص"
              >
                {isListening && activeVoiceField === 'remarks' ? (
                  <MicOff size={14} />
                ) : (
                  <Mic size={14} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Q24: شاشة المراجعة الختامية (Quick Summary Slide) */}
      {currentQuestion === 24 && (
        <div className="space-y-3">
          <div className="space-y-0.5 text-center">
            <span className="text-xs font-bold text-teal-800 inline-flex items-center gap-1.5 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              <CheckCircle2 size={13} className="text-teal-700" />
              <span>المراجعة الختامية للبحث</span>
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
              تأكيد واعتماد ملف الحالة
            </h2>
          </div>

          {/* Researcher Voice Notes Card (v1 Primary Feature) */}
          {fullAudioUrl ? (
            <ResearcherVoicePlayer
              audioUrl={fullAudioUrl}
              durationSeconds={fullAudioDuration || 14}
              researcherName={visitorName}
              fileName="تسجيل_صوتي_للباحث.webm"
              onReRecord={startFullAudioRecording}
              onDelete={deleteFullAudioRecording}
            />
          ) : isFullAudioRecording ? (
            <div className="p-3.5 bg-rose-50 border-2 border-rose-400 rounded-2xl space-y-2.5 text-right animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
                  <span className="text-xs font-black text-rose-950">
                    شغال تسجيل دلوقتي... سجل بصوتك أي ملاحظة مش مكتوبة
                  </span>
                </div>
                <span className="font-mono text-sm font-black text-white bg-rose-600 px-2.5 py-0.5 rounded-lg">
                  {formatDuration(fullAudioDuration)}
                </span>
              </div>
              <button
                type="button"
                onClick={stopFullAudioRecording}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
              >
                <Square size={13} className="fill-white" />
                <span>وقف واحفظ الريكورد</span>
              </button>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-right">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  ملاحظات الزيارة الصوتية
                </span>
                <span className="text-[11px] text-slate-500 block">
                  سجّل ملخص سريع يساعد في تقييم الحالة
                </span>
              </div>
              <button
                type="button"
                onClick={startFullAudioRecording}
                className="px-3.5 py-2 bg-[#005756] hover:bg-[#004241] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Mic size={14} />
                <span>ابدأ التسجيل</span>
              </button>
            </div>
          )}

          {/* AI Executive Recommendation Card (Hidden in v1 via ENABLE_AI_EXTRACTION_V2) */}
          {ENABLE_AI_EXTRACTION_V2 && executiveSummary && (
            <div className="p-3 bg-gradient-to-br from-teal-50 via-emerald-50/50 to-white border-2 border-teal-600/70 rounded-2xl space-y-2 text-right shadow-2xs animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-1.5 border-b border-teal-200/70">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={15} className="text-teal-700 animate-pulse" />
                  <span className="font-black text-xs text-teal-950">توصية التحليل الذكي للإدارة</span>
                </div>
              </div>
              <p className="text-xs text-slate-800 leading-relaxed font-semibold">
                {executiveSummary.justificationText}
              </p>
            </div>
          )}

          {/* Summary Card (Scrolls smoothly above CTA) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
            <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">اسم المستفيد:</span>
              <span className="font-black text-slate-900">{caseName || 'رب الأسرة'}</span>
            </div>

            <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">أفراد الأسرة:</span>
              <span className="font-bold text-slate-800 text-left">
                {familyMembers.length} أفراد ({familyMembers.map((m) => m.name || m.relation).filter(Boolean).slice(0, 3).join('، ')}...)
              </span>
            </div>

            <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">صافي الفجوة الشهرية:</span>
              <span className="font-black text-teal-800 font-mono tabular-nums text-sm">
                {netFinancialGap.toLocaleString('ar-EG')} ج.م
              </span>
            </div>

            <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">مرافق السكن:</span>
              <span className="font-bold text-slate-800 text-left">
                سقف {roofType === 'concrete' ? 'خرساني' : roofType === 'wood_straw' ? 'خشب/قش' : 'متصدع'} · {hasPrivateBathroom ? 'حمام خاص' : 'حمام مشترك'} ({basicAppliances.length} أجهزة)
              </span>
            </div>

            <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">مستندات الـ Checklist:</span>
              <span className="font-bold text-emerald-800 font-mono tabular-nums">
                {Object.values(checklist).filter(Boolean).length} من 7 بنود مستوفاة
              </span>
            </div>

            <div className="flex justify-between items-center gap-2 pb-1.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">الموقف الطبي:</span>
              <span className="font-bold text-slate-800 text-left">{stateHealthInsurance}</span>
            </div>

            <div className="pb-1.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium block mb-1.5">
                المرفقات الثبوتية المرفوعة ({uploadedDocs.length}):
              </span>
              <div className="flex flex-wrap gap-1">
                {uploadedDocs.map((doc) => (
                  <span
                    key={doc.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-700"
                  >
                    <Check size={10} className="text-emerald-600" />
                    <span>{doc.title}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Researcher Recommendation Summary */}
            <div className="pt-0.5 space-y-1.5">
              <span className="text-slate-700 font-bold block">
                توصية الباحث الميداني:
              </span>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500">نوع المساعدة المقترحة:</span>
                <span className="font-bold text-slate-800">{recommendedAssistanceType}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500">المبلغ المقترح شهرياً:</span>
                <span className="font-black text-[#005756] font-mono tabular-nums">
                  {effectiveRecommendedAmount.toLocaleString('ar-EG')} ج.م
                </span>
              </div>
              <div className="pt-0.5">
                <span className="text-slate-500 block mb-0.5">مبررات التوصية والملاحظات:</span>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                  {additionalNotesAndRemarks.trim() || 'مفيش ملاحظات إضافية مكتوبة.'}
                </p>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-center text-slate-500 font-medium pb-1">
            لما تضغط على الزر تحت، بيتبعت ملف الحالة على طول لإدارة الجمعية (بانتظار المراجعة والاعتماد).
          </p>
        </div>
      )}
    </>
  );
}
