'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
import { useToast } from '@/context/toast-context';
import {
  Sliders,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Tag,
  BookmarkCheck,
  Activity,
  X,
} from 'lucide-react';
import { DEFAULT_SCORING_CONFIG, checkVisitOverdueStatus } from '@/services/scoring-engine';
import { AmountInput } from '@/components/common/amount-input';
import { ShariaCategoryColor, ShariaDonationCategory, ChronicDiseaseConfig } from '@/types';

// Preserves downstream Sharia category color compatibility while keeping Settings UI calm
function getAutoShariaColor(name: string, index = 0): ShariaCategoryColor {
  const norm = (name || '').trim().toLowerCase();
  if (norm.includes('زكاة') || norm.includes('مال') || norm.includes('فطر')) return 'emerald';
  if (norm.includes('يتيم') || norm.includes('أيتام') || norm.includes('طفل')) return 'purple';
  if (norm.includes('علاج') || norm.includes('صحة') || norm.includes('دواء') || norm.includes('مريض') || norm.includes('عملية')) return 'rose';
  if (norm.includes('صدقة') || norm.includes('جارية') || norm.includes('وقف')) return 'teal';
  if (norm.includes('دين') || norm.includes('ديون') || norm.includes('غارم')) return 'amber';
  if (norm.includes('طعام') || norm.includes('إطعام') || norm.includes('غذاء') || norm.includes('وجبة') || norm.includes('كرتونة')) return 'cyan';
  if (norm.includes('سكن') || norm.includes('سقف') || norm.includes('مأوى') || norm.includes('ترميم')) return 'indigo';

  const PALETTE: ShariaCategoryColor[] = ['teal', 'emerald', 'indigo', 'purple', 'amber', 'cyan', 'rose'];
  return PALETTE[index % PALETTE.length];
}

function clampWeight(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.min(max, Math.max(min, Math.round(val)));
}

// Temporarily hidden until re-enabled
const SHOW_SHARIA_TAB: boolean = false;

export function SettingsView() {
  const {
    scoringConfig,
    updateScoringConfig,
    cases,
    shariaCategories,
    addShariaCategory,
    updateShariaCategory,
    toggleShariaCategory,
    chronicDiseases,
    addChronicDisease,
    updateChronicDisease,
    toggleChronicDisease,
    deleteChronicDisease,
  } = useApp();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'rules' | 'sharia' | 'chronic_diseases'>('rules');

  const [gapWeight, setGapWeight] = useState(scoringConfig.financialGapWeight);
  const [medicalWeight, setMedicalWeight] = useState(scoringConfig.medicalUrgencyWeight);
  const [orphanWeight, setOrphanWeight] = useState(scoringConfig.orphanDependentsWeight);
  const [housingWeight, setHousingWeight] = useState(scoringConfig.housingConditionWeight);
  const [overdueMonths, setOverdueMonths] = useState(scoringConfig.overdueVisitMonths);
  const [maxCap, setMaxCap] = useState(scoringConfig.maxAssistanceCap);
  const [minFloor, setMinFloor] = useState(scoringConfig.minAssistanceFloor);

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sharia category modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ShariaDonationCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [categoryError, setCategoryError] = useState('');

  // Chronic disease modal state
  const [isDiseaseModalOpen, setIsDiseaseModalOpen] = useState(false);
  const [editingDisease, setEditingDisease] = useState<ChronicDiseaseConfig | null>(null);
  const [diseaseName, setDiseaseName] = useState('');
  const [diseaseCost, setDiseaseCost] = useState<number>(400);
  const [diseaseError, setDiseaseError] = useState('');

  // Live preview of overdue cases impacted by visit cadence threshold
  const previewOverdueCases = cases.filter((c) =>
    checkVisitOverdueStatus(c.lastVisitDate, overdueMonths).isOverdue
  );

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateScoringConfig({
      financialGapWeight: Number(gapWeight),
      medicalUrgencyWeight: Number(medicalWeight),
      orphanDependentsWeight: Number(orphanWeight),
      housingConditionWeight: Number(housingWeight),
      overdueVisitMonths: Number(overdueMonths),
      maxAssistanceCap: Number(maxCap),
      minAssistanceFloor: Number(minFloor),
    });
    setSavedSuccess(true);
    toast.success('تم حفظ إعدادات وقواعد التقييم بنجاح');
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const handleResetDefaults = () => {
    setGapWeight(DEFAULT_SCORING_CONFIG.financialGapWeight);
    setMedicalWeight(DEFAULT_SCORING_CONFIG.medicalUrgencyWeight);
    setOrphanWeight(DEFAULT_SCORING_CONFIG.orphanDependentsWeight);
    setHousingWeight(DEFAULT_SCORING_CONFIG.housingConditionWeight);
    setOverdueMonths(DEFAULT_SCORING_CONFIG.overdueVisitMonths);
    setMaxCap(DEFAULT_SCORING_CONFIG.maxAssistanceCap);
    setMinFloor(DEFAULT_SCORING_CONFIG.minAssistanceFloor);
    updateScoringConfig(DEFAULT_SCORING_CONFIG);
    setSavedSuccess(true);
    toast.info('تم استعادة قواعد التقييم الافتراضية');
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const totalWeight = gapWeight + medicalWeight + orphanWeight + housingWeight;

  const openNewCategoryModal = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDesc('');
    setCategoryError('');
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: ShariaDonationCategory) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryDesc(cat.description || '');
    setCategoryError('');
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setCategoryError('من فضلك اكتب اسم المصرف الأول.');
      return;
    }

    const assignedColor =
      editingCategory?.color || getAutoShariaColor(categoryName.trim(), shariaCategories.length);

    if (editingCategory) {
      updateShariaCategory(editingCategory.id, {
        name: categoryName.trim(),
        description: categoryDesc.trim(),
        color: assignedColor,
      });
    } else {
      addShariaCategory({
        name: categoryName.trim(),
        description: categoryDesc.trim(),
        color: assignedColor,
        isActive: true,
      });
    }

    setIsCategoryModalOpen(false);
    toast.success(editingCategory ? 'تم تحديث بيانات المصرف الشرعي' : 'تمت إضافة المصرف الشرعي بنجاح');
  };

  const openNewDiseaseModal = () => {
    setEditingDisease(null);
    setDiseaseName('');
    setDiseaseCost(400);
    setDiseaseError('');
    setIsDiseaseModalOpen(true);
  };

  const openEditDiseaseModal = (d: ChronicDiseaseConfig) => {
    setEditingDisease(d);
    setDiseaseName(d.name);
    setDiseaseCost(d.defaultMonthlyCost);
    setDiseaseError('');
    setIsDiseaseModalOpen(true);
  };

  const handleSaveDisease = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = diseaseName.trim();
    if (!trimmed) {
      setDiseaseError('من فضلك اكتب اسم المرض المزمن أولاً.');
      return;
    }
    const costVal = Math.max(0, Number(diseaseCost) || 0);
    if (editingDisease) {
      updateChronicDisease(editingDisease.id, {
        name: trimmed,
        defaultMonthlyCost: costVal,
      });
      toast.success(`تم تحديث بيانات "${trimmed}" بنجاح`);
    } else {
      addChronicDisease({
        name: trimmed,
        defaultMonthlyCost: costVal,
        isActive: true,
      });
      toast.success(`تمت إضافة "${trimmed}" لقائمة الأمراض المزمنة`);
    }
    setIsDiseaseModalOpen(false);
  };

  const activeDiseasesCount = chronicDiseases.filter((d) => d.isActive).length;
  const avgDiseaseCost =
    chronicDiseases.length > 0
      ? Math.round(
          chronicDiseases.reduce((sum, d) => sum + (Number(d.defaultMonthlyCost) || 0), 0) /
            chronicDiseases.length
        )
      : 0;

  const weightCriteria = [
    {
      id: 'gap-weight',
      label: 'فجوة الدخل والمصروفات',
      helper: 'بيقيس الفرق بين دخل الأسرة الفعلي ومصاريفها الأساسية كل شهر.',
      value: gapWeight,
      min: 10,
      max: 50,
      onChange: setGapWeight,
    },
    {
      id: 'medical-weight',
      label: 'الظروف الصحية والعلاج',
      helper: 'بيدي أولوية أعلى للحالات اللي فيها مرض مزمن أو احتياج لعلاج مستمر.',
      value: medicalWeight,
      min: 10,
      max: 40,
      onChange: setMedicalWeight,
    },
    {
      id: 'orphan-weight',
      label: 'الأيتام وعدد المُعالين',
      helper: 'بيرفع ترتيب الأسر اللي بتعول أيتام أو أطفال في مراحل الدراسة.',
      value: orphanWeight,
      min: 10,
      max: 35,
      onChange: setOrphanWeight,
    },
    {
      id: 'housing-weight',
      label: 'وضع السكن والمعيشة',
      helper: 'بيراعي البيوت اللي محتاجة ترميم أو مهددة بالإخلاء.',
      value: housingWeight,
      min: 5,
      max: 25,
      onChange: setHousingWeight,
    },
  ];

  const activeCategoriesCount = shariaCategories.filter((c) => c.isActive).length;
  const pausedCategoriesCount = shariaCategories.length - activeCategoriesCount;

  return (
    <div className="space-y-6">
      {/* Calm Segmented Navigation Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div
          className={`w-full grid ${
            SHOW_SHARIA_TAB ? 'grid-cols-3' : 'grid-cols-2'
          } sm:inline-flex sm:w-auto sm:items-center gap-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80`}
          role="tablist"
          aria-label="أقسام الإعدادات"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'rules'}
            onClick={() => setActiveTab('rules')}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2 sm:px-4 text-xs font-medium sm:font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap min-w-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#005756]/40 ${
              activeTab === 'rules'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                activeTab === 'rules' ? 'text-[#005756]' : 'text-slate-400'
              }`}
            />
            <span className="sm:hidden truncate">قواعد التقييم</span>
            <span className="hidden sm:inline">قواعد التقييم والصرف</span>
          </button>

          {SHOW_SHARIA_TAB && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'sharia'}
              onClick={() => setActiveTab('sharia')}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2 sm:px-4 text-xs font-medium sm:font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap min-w-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#005756]/40 ${
                activeTab === 'sharia'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tag
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                  activeTab === 'sharia' ? 'text-[#005756]' : 'text-slate-400'
                }`}
              />
              <span className="truncate">المصارف الشرعية</span>
              <span className="tabular-nums text-[11px] font-medium text-slate-500 shrink-0">
                ({shariaCategories.length})
              </span>
            </button>
          )}

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'chronic_diseases'}
            onClick={() => setActiveTab('chronic_diseases')}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2 sm:px-4 text-xs font-medium sm:font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap min-w-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#005756]/40 ${
              activeTab === 'chronic_diseases'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                activeTab === 'chronic_diseases' ? 'text-[#005756]' : 'text-slate-400'
              }`}
            />
            <span className="sm:hidden truncate">الأمراض المزمنة</span>
            <span className="hidden sm:inline">الأمراض المزمنة والتكاليف</span>
            <span className="tabular-nums text-[11px] font-medium text-slate-500 shrink-0">
              ({chronicDiseases.length})
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'rules' && (
        <form onSubmit={handleSaveConfig} className="space-y-6">
          {/* Section 1: Criteria Weights */}
          <div className="p-5 sm:p-6 bg-white rounded-xl border border-slate-200/80 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  معايير استحقاق الدعم المالي
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  توزيع الأهمية النسبية بين ظروف الأسرة لتحديد أولوية الصرف ·{' '}
                  <span
                    className={`tabular-nums font-semibold ${
                      totalWeight !== 100 ? 'text-rose-600' : 'text-slate-700'
                    }`}
                  >
                    إجمالي الأوزان: {totalWeight}%
                  </span>
                  {totalWeight !== 100 && (
                    <span className="text-rose-600 mr-1.5">
                      (يفضّل ضبط المجموع إلى 100%)
                    </span>
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetDefaults}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-700"
              >
                <RotateCcw size={13} className="text-slate-400 shrink-0" />
                <span>استعادة الافتراضي</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {weightCriteria.map((criterion) => (
                <div
                  key={criterion.id}
                  className="space-y-2.5 pb-4 md:pb-0 border-b border-slate-100 md:border-b-0 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor={criterion.id}
                      className="text-xs font-bold text-slate-800"
                    >
                      {criterion.label}
                    </label>

                    <div className="w-20 h-8 flex items-center bg-white border border-slate-200 rounded-lg px-2 focus-within:border-[#005756] focus-within:ring-1 focus-within:ring-teal-700/20 transition-colors shrink-0">
                      <input
                        id={criterion.id}
                        type="number"
                        min={criterion.min}
                        max={criterion.max}
                        step={5}
                        value={criterion.value}
                        onChange={(e) =>
                          criterion.onChange(
                            clampWeight(Number(e.target.value), criterion.min, criterion.max)
                          )
                        }
                        className="w-full text-center text-xs font-bold tabular-nums text-slate-900 bg-transparent focus:outline-hidden"
                      />
                      <span className="text-[11px] font-medium text-slate-400 select-none">
                        %
                      </span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={criterion.min}
                    max={criterion.max}
                    step={5}
                    value={criterion.value}
                    aria-label={criterion.label}
                    onChange={(e) => criterion.onChange(Number(e.target.value))}
                    className="w-full accent-[#005756] cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-700 rounded"
                  />

                  <p className="text-xs text-slate-500 leading-relaxed">
                    {criterion.helper}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Financial Limits & Visit Cadence */}
          <div className="p-5 sm:p-6 bg-white rounded-xl border border-slate-200/80 space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="font-bold text-slate-800 text-base">
                حدود الصرف ومتابعة الزيارات
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                تحديد أقصى وأقل مبلغ للدعم الشهري، والمدة المسموحة قبل طلب زيارة ميدانية جديدة.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Visit Cadence Months */}
              <div className="space-y-1.5">
                <label
                  htmlFor="overdue-months-input"
                  className="text-xs font-bold text-slate-800 block"
                >
                  المدة المسموحة بين الزيارات
                </label>
                <div className="flex items-center bg-white border border-slate-200 rounded-lg focus-within:border-[#005756] focus-within:ring-1 focus-within:ring-teal-700/20 transition-colors">
                  <input
                    id="overdue-months-input"
                    type="number"
                    min={3}
                    max={12}
                    value={overdueMonths}
                    onChange={(e) => setOverdueMonths(Math.max(1, Number(e.target.value)))}
                    className="w-full py-2 px-3 bg-transparent tabular-nums text-xs font-semibold text-slate-900 focus:outline-hidden text-right"
                  />
                  <span className="text-[11px] font-medium text-slate-500 pl-3 pr-1 shrink-0 select-none">
                    أشهر
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed pt-0.5">
                  لو مر {overdueMonths} شهور من غير زيارة جديدة، الدعم من الصندوق العام بيتوقف مؤقتاً لحد ما الحالة تتراجع.
                </p>
              </div>

              {/* Max Assistance Cap */}
              <div className="space-y-1.5">
                <label
                  htmlFor="max-cap-input"
                  className="text-xs font-bold text-slate-800 block"
                >
                  حد الصرف الأقصى
                </label>
                <AmountInput
                  id="max-cap-input"
                  value={maxCap}
                  onChange={setMaxCap}
                  size="md"
                  min={500}
                  max={50000}
                  step={500}
                  currency="ج.م"
                  className="w-full"
                  inputClassName="font-semibold"
                />
                <p className="text-xs text-slate-500 leading-relaxed pt-0.5">
                  أكبر مبلغ يتصرف للأسرة في الشهر من الصندوق العام (من غير التبرعات المخصصة بالاسم).
                </p>
              </div>

              {/* Min Assistance Floor */}
              <div className="space-y-1.5">
                <label
                  htmlFor="min-floor-input"
                  className="text-xs font-bold text-slate-800 block"
                >
                  الحد الأدنى للدعم
                </label>
                <AmountInput
                  id="min-floor-input"
                  value={minFloor}
                  onChange={setMinFloor}
                  size="md"
                  min={100}
                  max={10000}
                  step={100}
                  currency="ج.م"
                  className="w-full"
                  inputClassName="font-semibold"
                />
                <p className="text-xs text-slate-500 leading-relaxed pt-0.5">
                  أقل مبلغ يتصرف للأسرة عشان الدعم يفضل مؤثر وله قيمة حقيقية.
                </p>
              </div>
            </div>

            {/* Calm Dynamic Impact Notice */}
            <div className="p-3.5 rounded-xl bg-slate-50/60 border border-slate-200/80 flex items-start gap-2.5">
              {previewOverdueCases.length > 0 ? (
                <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 size={16} className="text-[#005756] shrink-0 mt-0.5" />
              )}

              <div className="space-y-1">
                <div
                  className={`text-xs font-semibold ${
                    previewOverdueCases.length > 0 ? 'text-rose-600' : 'text-slate-800'
                  }`}
                >
                  {previewOverdueCases.length > 0
                    ? `تنبيه المتابعة: سيتم إيقاف الصرف من الصندوق العام مؤقتاً لـ ${previewOverdueCases.length} أسر لتجاوزها مهلة الـ ${overdueMonths} أشهر`
                    : `كافة الأسر النشطة زياراتها محدثة خلال مهلة الـ ${overdueMonths} أشهر`}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {previewOverdueCases.length > 0 ? (
                    <>
                      الحالات المتأثرة:{' '}
                      <span className="tabular-nums font-medium text-slate-700">
                        {previewOverdueCases.map((c) => c.code).join('، ')}
                      </span>{' '}
                      — هتستمر التبرعات المخصصة بالاسم لحد تحديث الزيارة الميدانية.
                    </>
                  ) : (
                    `تُطبّق حدود الصرف (${minFloor.toLocaleString('ar-EG')} – ${maxCap.toLocaleString('ar-EG')} ج.م) على الصندوق العام فقط دون التأثير على التبرعات المقيدة.`
                  )}
                </p>
              </div>
            </div>

            {/* Save Footer */}
            <div className="pt-2 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
              {savedSuccess ? (
                <span className="text-xs text-[#005756] font-semibold flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="shrink-0" />
                  <span>تم حفظ الإعدادات وتحديث تقييم الحالات</span>
                </span>
              ) : (
                <span />
              )}

              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-10 px-5 bg-[#005756] hover:bg-[#004746] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
              >
                <Save size={15} className="shrink-0" />
                <span>حفظ الإعدادات</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {SHOW_SHARIA_TAB && activeTab === 'sharia' && (
        /* Tab 2: Sharia Donation Categories Management */
        <div className="space-y-6">
          {/* Header & Primary Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                المصارف الشرعية وتوجيه التبرعات
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                تحديد أبواب الصرف الشرعية وشروط كل باب ليظهر في شاشات تسجيل التبرعات.
              </p>
            </div>

            <button
              type="button"
              onClick={openNewCategoryModal}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-10 px-4 bg-[#005756] hover:bg-[#004746] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
            >
              <Plus size={16} className="shrink-0" />
              <span>إضافة مصرف جديد</span>
            </button>
          </div>

          {/* 3 Uniform Calm Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-500 font-medium">إجمالي المصارف</span>
                <div className="text-xl font-bold tabular-nums text-slate-900 mt-1">
                  {shariaCategories.length}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">أبواب الصرف المسجلة بالمنظومة</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-500 shrink-0">
                <Tag size={18} />
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-500 font-medium">المصارف المفعّلة</span>
                <div className="text-xl font-bold tabular-nums text-slate-900 mt-1">
                  {activeCategoriesCount}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">متاحة للاختيار عند تسجيل تبرع</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-center text-[#005756] shrink-0">
                <CheckCircle2 size={18} />
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-500 font-medium">المصارف المتوقفة</span>
                <div className="text-xl font-bold tabular-nums text-slate-900 mt-1">
                  {pausedCategoriesCount}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">مخفية مؤقتاً من التبرعات الجديدة</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-400 shrink-0">
                <BookmarkCheck size={18} />
              </div>
            </div>
          </div>

          {/* Categories Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="font-bold text-slate-800 text-sm">قائمة المصارف الشرعية</h3>
              <span className="text-xs text-slate-500">
                يمكنك تفعيل أو إيقاف أي مصرف أو تعديل ضوابط الصرف
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-600 font-semibold">
                    <th className="py-3 px-5 whitespace-nowrap">اسم المصرف</th>
                    <th className="py-3 px-4">ضوابط وشروط الصرف</th>
                    <th className="py-3 px-4 whitespace-nowrap">حالة التفعيل</th>
                    <th className="py-3 px-5 text-center whitespace-nowrap">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shariaCategories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Name */}
                      <td className="py-3.5 px-5 font-semibold text-slate-900 whitespace-nowrap">
                        {cat.name}
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 text-slate-600 text-xs leading-relaxed max-w-md">
                        {cat.description || 'لا توجد شروط إضافية'}
                      </td>

                      {/* Calm Teal Switch */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={cat.isActive}
                          onClick={() => toggleShariaCategory(cat.id)}
                          className="inline-flex items-center gap-2.5 cursor-pointer rounded-lg p-1 -m-1 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-700"
                          title={cat.isActive ? 'إيقاف تفعيل المصرف' : 'تفعيل المصرف'}
                        >
                          <span
                            className={`relative inline-flex h-5 w-9 shrink-0 items-center justify-start p-0.5 rounded-full transition-colors duration-150 ${
                              cat.isActive ? 'bg-[#005756]' : 'bg-slate-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 rounded-full bg-white shadow-xs transition-transform duration-150 ${
                                cat.isActive ? '-translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </span>
                          <span
                            className={`text-xs font-medium ${
                              cat.isActive ? 'text-slate-800' : 'text-slate-500'
                            }`}
                          >
                            {cat.isActive ? 'مفعّل' : 'متوقف'}
                          </span>
                        </button>
                      </td>

                      {/* Edit Action */}
                      <td className="py-3.5 px-5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditCategoryModal(cat)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-700"
                        >
                          <Edit2 size={13} className="text-slate-400 shrink-0" />
                          <span>تعديل</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'chronic_diseases' && (
        /* Tab 3: Chronic Diseases & Default Monthly Costs Management */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                قائمة الأمراض المزمنة والتكاليف التقديرية
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                إدارة الأمراض التي تظهر تلقائياً في استمارة البحث الميداني (بطاقات أفراد الأسرة) مع متوسط تكلفة العلاج الشهرية.
              </p>
            </div>

            <button
              type="button"
              onClick={openNewDiseaseModal}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-10 px-4 bg-[#005756] hover:bg-[#004746] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
            >
              <Plus size={16} className="shrink-0" />
              <span>إضافة مرض مزمن</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-500 font-medium">إجمالي الأمراض المسجلة</span>
                <div className="text-xl font-bold tabular-nums text-slate-900 mt-1">
                  {chronicDiseases.length}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">مدرجة بقائمة الاستمارة الميدانية</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-500 shrink-0">
                <Activity size={18} />
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-500 font-medium">الأمراض المفعّلة</span>
                <div className="text-xl font-bold tabular-nums text-slate-900 mt-1">
                  {activeDiseasesCount}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">متاحة للاختيار الفوري للباحثين</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-center text-[#005756] shrink-0">
                <CheckCircle2 size={18} />
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-500 font-medium">متوسط التكلفة التقديرية</span>
                <div className="text-xl font-bold tabular-nums text-slate-900 mt-1">
                  {avgDiseaseCost.toLocaleString('ar-EG')} ج.م
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">تُملأ تلقائياً مع قابلية التعديل</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-400 shrink-0">
                <Sliders size={18} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="font-bold text-slate-800 text-sm">جدول الأمراض المزمنة وتكاليفها</h3>
              <span className="text-xs text-slate-500">
                أي تعديل ينعكس مباشرة في خطوة أفراد الأسرة (س11) داخل البحث الميداني
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-600 font-semibold">
                    <th className="py-3 px-5 whitespace-nowrap">مسمى المرض / الحالة المزمنة</th>
                    <th className="py-3 px-4 whitespace-nowrap">متوسط التكلفة الشهرية</th>
                    <th className="py-3 px-4 whitespace-nowrap">حالة التفعيل</th>
                    <th className="py-3 px-5 text-center whitespace-nowrap">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {chronicDiseases.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-900 whitespace-nowrap">
                        {d.name}
                      </td>
                      <td className="py-3.5 px-4 font-bold font-mono tabular-nums text-[#005756] whitespace-nowrap">
                        {d.defaultMonthlyCost.toLocaleString('ar-EG')} ج.م / شهر
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={d.isActive}
                          onClick={() => {
                            toggleChronicDisease(d.id);
                            toast.info(`${d.isActive ? 'تم إيقاف' : 'تم تفعيل'} "${d.name}"`);
                          }}
                          className="inline-flex items-center gap-2.5 cursor-pointer rounded-lg p-1 -m-1 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-700"
                        >
                          <span
                            className={`relative inline-flex h-5 w-9 shrink-0 items-center justify-start p-0.5 rounded-full transition-colors duration-150 ${
                              d.isActive ? 'bg-[#005756]' : 'bg-slate-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 rounded-full bg-white shadow-xs transition-transform duration-150 ${
                                d.isActive ? '-translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </span>
                          <span
                            className={`text-xs font-medium ${
                              d.isActive ? 'text-slate-800' : 'text-slate-500'
                            }`}
                          >
                            {d.isActive ? 'مفعّل' : 'متوقف'}
                          </span>
                        </button>
                      </td>
                      <td className="py-3.5 px-5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditDiseaseModal(d)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                          >
                            <Edit2 size={13} className="text-slate-400 shrink-0" />
                            <span>تعديل</span>
                          </button>
                          {chronicDiseases.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                deleteChronicDisease(d.id);
                                toast.info(`تم حذف "${d.name}" من القائمة`);
                              }}
                              className="p-1.5 bg-white hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Category Add/Edit Modal */}
      {isCategoryModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsCategoryModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl border border-slate-200/80 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  {editingCategory ? 'تعديل المصرف الشرعي' : 'إضافة مصرف جديد'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  تحديد اسم المصرف وشروط الصرف المعتمدة
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-700"
                aria-label="إغلاق"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              {categoryError && (
                <div className="p-3 bg-rose-50/70 border border-rose-200/80 text-rose-600 rounded-lg text-xs font-medium">
                  {categoryError}
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="category-name-input"
                  className="block text-xs font-semibold text-slate-700"
                >
                  اسم المصرف <span className="text-rose-600">*</span>
                </label>
                <input
                  id="category-name-input"
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => {
                    setCategoryName(e.target.value);
                    setCategoryError('');
                  }}
                  placeholder="مثال: زكاة فطر / كفالة طالب علم / كفارة يمين"
                  className="w-full h-10 px-3 py-2 text-xs text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#005756] focus:ring-1 focus:ring-teal-700/20"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label
                  htmlFor="category-desc-input"
                  className="block text-xs font-semibold text-slate-700"
                >
                  شروط الاستحقاق والصرف
                </label>
                <textarea
                  id="category-desc-input"
                  rows={3}
                  value={categoryDesc}
                  onChange={(e) => setCategoryDesc(e.target.value)}
                  placeholder="اكتب باختصار شروط الصرف والأسر المستهدفة من هذا البند..."
                  className="w-full px-3 py-2 text-xs text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#005756] focus:ring-1 focus:ring-teal-700/20 resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="h-9 px-4 bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="h-9 px-5 bg-[#005756] hover:bg-[#004746] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
                >
                  {editingCategory ? 'حفظ التعديلات' : 'إضافة المصرف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chronic Disease Add/Edit Modal */}
      {isDiseaseModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsDiseaseModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl border border-slate-200/80 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  {editingDisease ? 'تعديل بيانات المرض المزمن' : 'إضافة مرض مزمن جديد'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  تحديد اسم المرض ومتوسط تكلفة العلاج الشهرية الافتراضية
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDiseaseModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="إغلاق"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDisease} className="p-6 space-y-4">
              {diseaseError && (
                <div className="p-3 bg-rose-50/70 border border-rose-200/80 text-rose-600 rounded-lg text-xs font-medium">
                  {diseaseError}
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="disease-name-input"
                  className="block text-xs font-semibold text-slate-700"
                >
                  اسم المرض أو الحالة المزمنة <span className="text-rose-600">*</span>
                </label>
                <input
                  id="disease-name-input"
                  type="text"
                  required
                  value={diseaseName}
                  onChange={(e) => {
                    setDiseaseName(e.target.value);
                    setDiseaseError('');
                  }}
                  placeholder="مثال: ضمور عضلات / غسيل كلى / سكري مزمن"
                  className="w-full h-10 px-3 py-2 text-xs text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#005756] focus:ring-1 focus:ring-teal-700/20"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="disease-cost-input"
                  className="block text-xs font-semibold text-slate-700"
                >
                  متوسط التكلفة الشهرية التقديرية
                </label>
                <AmountInput
                  id="disease-cost-input"
                  value={diseaseCost}
                  onChange={setDiseaseCost}
                  size="md"
                  min={0}
                  max={25000}
                  step={50}
                  currency="ج.م/شهر"
                  className="w-full"
                  inputClassName="font-semibold"
                />
                <p className="text-[11px] text-slate-500">
                  تظهر هذه التكلفة تلقائياً عند اختيار المرض في استمارة البحث الميداني مع إمكانية تعديلها.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDiseaseModalOpen(false)}
                  className="h-9 px-4 bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="h-9 px-5 bg-[#005756] hover:bg-[#004746] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  {editingDisease ? 'حفظ التعديلات' : 'إضافة للقائمة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
