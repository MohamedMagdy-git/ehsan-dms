'use client';

import React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HeartHandshake,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react';
import { ENABLE_AI_EXTRACTION_V2, SubmittedSummaryData } from './types';

export interface CaseStudyStatusBannersProps {
  hasDraftAvailable: boolean;
  lastSavedTime: string | null;
  onRestoreDraft: () => void;
  onDiscardDraft: () => void;
  isSuccessSubmitted: boolean;
  adminRevisionNote: string | null;
  isRevisionBannerExpanded: boolean;
  onToggleRevisionBanner: () => void;
}

export function CaseStudyStatusBanners({
  hasDraftAvailable,
  lastSavedTime,
  onRestoreDraft,
  onDiscardDraft,
  isSuccessSubmitted,
  adminRevisionNote,
  isRevisionBannerExpanded,
  onToggleRevisionBanner,
}: CaseStudyStatusBannersProps) {
  return (
    <>
      {/* Draft Restored Bar */}
      {hasDraftAvailable && (
        <div className="px-5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700">
          <span className="text-[11px] font-semibold">
            توجد مسودة سابقة {lastSavedTime ? `(${lastSavedTime})` : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRestoreDraft}
              className="px-2.5 py-1 bg-[#005756] hover:bg-[#004342] text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
            >
              استرجاع
            </button>
            <button
              type="button"
              onClick={onDiscardDraft}
              className="text-slate-500 hover:text-slate-800 text-[10px] font-medium cursor-pointer"
            >
              تجاهل
            </button>
          </div>
        </div>
      )}

      {/* Read-only Admin Revision Notice Banner */}
      {!isSuccessSubmitted && adminRevisionNote && (
        <div className="px-5 py-2.5 bg-amber-50/70 border-b border-amber-200/80 text-right">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertTriangle size={14} className="text-amber-700 shrink-0" />
              <span className="text-xs font-bold text-amber-950 truncate">
                مطلوب استكمال من الإدارة
              </span>
            </div>
            <button
              type="button"
              onClick={onToggleRevisionBanner}
              className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-0.5 shrink-0 cursor-pointer"
            >
              <span>{isRevisionBannerExpanded ? 'إخفاء' : 'عرض التفاصيل'}</span>
              {isRevisionBannerExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
          {isRevisionBannerExpanded && (
            <p className="mt-1.5 text-[11px] text-amber-900/90 leading-relaxed whitespace-pre-line max-h-20 overflow-y-auto pr-0.5">
              {adminRevisionNote}
            </p>
          )}
        </div>
      )}
    </>
  );
}

export interface CaseStudyVoiceHeaderBarProps {
  isSuccessSubmitted: boolean;
  isFullAudioRecording: boolean;
  fullAudioUrl: string | null;
  fullAudioDuration: number;
  isPlayingAudio: boolean;
  isExtractingWithAI: boolean;
  formatDuration: (seconds: number) => string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onTogglePlayAudio: () => void;
  onDeleteRecording: () => void;
  onExtractWithAI: () => void;
}

export function CaseStudyVoiceHeaderBar({
  isSuccessSubmitted,
  isFullAudioRecording,
  fullAudioUrl,
  fullAudioDuration,
  isPlayingAudio,
  isExtractingWithAI,
  formatDuration,
  onStartRecording,
  onStopRecording,
  onTogglePlayAudio,
  onDeleteRecording,
  onExtractWithAI,
}: CaseStudyVoiceHeaderBarProps) {
  if (isSuccessSubmitted) return null;

  return (
    <div className="border-t border-slate-200 bg-slate-50 text-slate-800">
      {/* State 1: Idle (Not recording, no audio yet) */}
      {!isFullAudioRecording && !fullAudioUrl && (
        <div className="px-5 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
              <Mic size={16} />
            </div>
            <div className="leading-tight min-w-0">
              <span className="font-bold text-xs text-slate-800 block truncate">
                ملاحظات الزيارة الصوتية
              </span>
              <span className="text-[10px] text-slate-500 truncate block">
                سجّل ملخص سريع يساعد في تقييم الحالة
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onStartRecording}
            className="px-3 py-1.5 bg-[#005756] hover:bg-[#004342] active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Mic size={14} />
            <span>ابدأ التسجيل</span>
          </button>
        </div>
      )}

      {/* State 2: Actively Recording */}
      {isFullAudioRecording && (
        <div className="px-5 py-2.5 bg-rose-50 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 animate-pulse">
              <Mic size={16} />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                <span className="font-bold text-xs text-rose-900">جاري التسجيل...</span>
                <span className="font-mono text-xs font-bold text-rose-700 bg-white px-1.5 py-0.5 rounded border border-rose-200">
                  {formatDuration(fullAudioDuration)}
                </span>
              </div>
              <span className="text-[10px] text-rose-700 block">
                سجّل بصوتك أي ملاحظات إضافية عن وضع الأسرة
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onStopRecording}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Square size={12} className="fill-white" />
            <span>إيقاف وحفظ</span>
          </button>
        </div>
      )}

      {/* State 3: Recorded Audio Saved & Ready for Review */}
      {!isFullAudioRecording && fullAudioUrl && (
        <div className="px-5 py-2.5 bg-slate-50 flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2 truncate">
            <button
              type="button"
              onClick={onTogglePlayAudio}
              className="px-2.5 py-1.5 rounded-xl bg-[#005756] hover:bg-[#004342] text-white flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors text-xs font-bold"
              title={isPlayingAudio ? 'إيقاف مؤقت' : 'استمع للتسجيل'}
            >
              {isPlayingAudio ? <Pause size={13} /> : <Play size={13} className="mr-0.5" />}
              <span>{isPlayingAudio ? 'إيقاف مؤقت' : 'تشغيل التسجيل'}</span>
            </button>
            <div className="leading-tight truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-slate-800">
                  تم حفظ التسجيل
                </span>
                <span className="text-[10px] font-mono text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                  {formatDuration(fullAudioDuration || 12)}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono truncate block">
                تسجيل_صوتي_للباحث.webm
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {ENABLE_AI_EXTRACTION_V2 && (
              <button
                type="button"
                onClick={onExtractWithAI}
                disabled={isExtractingWithAI}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-[#005756] hover:bg-[#004342] text-white"
              >
                <Sparkles size={13} />
                <span>تفريغ وتعبئة الاستمارة آلياً</span>
              </button>
            )}

            <button
              type="button"
              onClick={onStartRecording}
              className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
              title="إعادة التسجيل"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">إعادة تسجيل</span>
            </button>

            <button
              type="button"
              onClick={onDeleteRecording}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
              title="حذف التسجيل"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export interface CaseStudySuccessViewProps {
  submittedSummary: SubmittedSummaryData | null;
  visitorName: string;
  isResearcherPOV: boolean;
  onFinishAndNavigate: () => void;
}

export function CaseStudySuccessView({
  submittedSummary,
  visitorName,
  isResearcherPOV,
  onFinishAndNavigate,
}: CaseStudySuccessViewProps) {
  return (
    <div className="text-center space-y-4 animate-in zoom-in-95 duration-200">
      <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
        <CheckCircle2 size={36} />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-black text-slate-900">
          تم اعتماد استمارة «بحث حالة» بنجاح!
        </h3>

        {/* Calm UI Gratitude & Dua Card for Field Researcher */}
        <div className="px-4 py-3 bg-teal-50/60 border border-teal-200/70 rounded-2xl text-center">
          <p className="text-xs sm:text-sm font-semibold text-teal-900 leading-relaxed flex items-center justify-center gap-2">
            <HeartHandshake size={16} className="text-[#005756] shrink-0" />
            <span>
              جزاك الله خيراً{' '}
              <span className="font-bold text-[#005756]">
                {submittedSummary?.researcher || visitorName || 'أ. هبة الشامي'}
              </span>{' '}
              على جهدك الميداني المبارك، كُتب سعيك في ميزان حسناتك.
            </span>
          </p>
        </div>

        <p className="text-xs text-slate-600">
          أُحيلت الحالة إلى وضع «قيد المراجعة» للاعتماد المالي والإداري
        </p>
      </div>

      {submittedSummary && (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-right space-y-2 shadow-2xs">
          <div className="flex justify-between items-center text-xs border-b border-slate-200/60 pb-2">
            <span className="text-slate-500">اسم الحالة:</span>
            <span className="font-bold text-slate-800">{submittedSummary.caseName}</span>
          </div>
          <div className="flex justify-between items-center text-xs border-b border-slate-200/60 pb-2">
            <span className="text-slate-500">أفراد الأسرة:</span>
            <span className="font-bold text-slate-800">{submittedSummary.membersCount} أفراد</span>
          </div>
          <div className="flex justify-between items-center text-xs border-b border-slate-200/60 pb-2">
            <span className="text-slate-500">الباحث المسؤول:</span>
            <span className="font-semibold text-slate-700">{submittedSummary.researcher}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">صافي الفجوة الشهرية:</span>
            <span className="font-black text-teal-800 text-sm">
              {submittedSummary.gap.toLocaleString('ar-EG')} ج.م
            </span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onFinishAndNavigate}
        className="w-full py-3.5 bg-[#005756] hover:bg-[#004241] text-white rounded-2xl font-bold text-xs shadow-sm transition-all cursor-pointer"
      >
        {isResearcherPOV ? 'العودة إلى حالاتي وزياراتي' : 'الانتقال لجدول الحالات والمراجعة'}
      </button>
    </div>
  );
}

export interface CaseStudyFooterNavProps {
  isSuccessSubmitted: boolean;
  currentQuestion: number;
  totalQuestions: number;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
  onRequestClose: () => void;
  onFinalSubmit: (e: React.FormEvent) => void;
}

export function CaseStudyFooterNav({
  isSuccessSubmitted,
  currentQuestion,
  totalQuestions,
  onPrev,
  onNext,
  onSkip,
  onRequestClose,
  onFinalSubmit,
}: CaseStudyFooterNavProps) {
  if (isSuccessSubmitted) return null;

  return (
    <div className="bg-white px-5 py-3 border-t border-slate-100 shrink-0 flex items-center justify-between gap-3">
      {/* Back Button */}
      {currentQuestion > 1 ? (
        <button
          type="button"
          onClick={onPrev}
          className="w-12 h-14 border border-slate-200 hover:bg-slate-100 active:bg-slate-200 text-slate-700 rounded-2xl flex items-center justify-center cursor-pointer shrink-0 transition-colors"
          title="السابق"
        >
          <ArrowRight size={20} />
        </button>
      ) : (
        <button
          type="button"
          onClick={onRequestClose}
          className="px-3.5 h-14 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-2xl text-xs font-bold transition-colors cursor-pointer shrink-0"
        >
          إلغاء
        </button>
      )}

      {/* Skip Button (Mandatory check rule) */}
      {currentQuestion < totalQuestions && (
        <button
          type="button"
          onClick={onSkip}
          className="px-3 h-14 text-slate-500 hover:text-slate-800 hover:bg-slate-50 active:bg-slate-100 rounded-2xl text-xs font-bold transition-colors cursor-pointer shrink-0"
        >
          تخطي
        </button>
      )}

      {/* Main Primary Button (Full-width thumb CTA) */}
      {currentQuestion < totalQuestions ? (
        <button
          type="button"
          onClick={onNext}
          className="flex-1 h-14 bg-[#005756] hover:bg-[#004342] active:scale-[0.98] text-white rounded-xl text-sm sm:text-base font-bold shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>حفظ ومتابعة</span>
          <ArrowLeft size={18} />
        </button>
      ) : (
        <button
          type="button"
          onClick={onFinalSubmit}
          className="flex-1 h-14 bg-teal-800 hover:bg-teal-900 active:scale-[0.98] text-white rounded-xl text-sm sm:text-base font-bold shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <CheckCircle2 size={20} />
          <span>تأكيد وحفظ البحث</span>
        </button>
      )}
    </div>
  );
}

export interface CaseStudyCloseConfirmModalProps {
  showCloseConfirm: boolean;
  isSuccessSubmitted: boolean;
  currentQuestion: number;
  totalQuestions: number;
  onConfirmSaveAndClose: () => void;
  onContinueEditing: () => void;
  onDiscardDraftAndClose: () => void;
}

export function CaseStudyCloseConfirmModal({
  showCloseConfirm,
  isSuccessSubmitted,
  currentQuestion,
  totalQuestions,
  onConfirmSaveAndClose,
  onContinueEditing,
  onDiscardDraftAndClose,
}: CaseStudyCloseConfirmModalProps) {
  if (!showCloseConfirm || isSuccessSubmitted) return null;

  return (
    <div
      className="absolute inset-0 z-30 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4 text-right">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">
              هل تريد حفظ المسودة قبل الإغلاق؟
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              وصلت إلى <strong className="text-slate-800">الخطوة {currentQuestion} من {totalQuestions}</strong>. عند الإغلاق سيتم الاحتفاظ بجميع بياناتك تلقائياً لتتمكن من استكمالها من نفس الخطوة لاحقاً.
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onConfirmSaveAndClose}
            className="w-full h-10 bg-[#005756] hover:bg-[#004342] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Save size={15} />
            <span>حفظ المسودة والخروج</span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onContinueEditing}
              className="h-10 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              متابعة الاستمارة
            </button>
            <button
              type="button"
              onClick={onDiscardDraftAndClose}
              className="h-10 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              حذف المسودة والخروج
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
