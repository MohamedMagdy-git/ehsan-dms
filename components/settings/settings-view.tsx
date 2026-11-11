'use client';
import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/app-context';
import {
  Sliders,
  ShieldAlert,
  Save,
  RotateCcw,
  Clock,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Edit2,
  Tag,
  ShieldCheck,
  Check,
  X,
  BookmarkCheck,
  HeartHandshake,
} from 'lucide-react';
import { DEFAULT_SCORING_CONFIG, checkVisitOverdueStatus } from '@/services/scoring-engine';
import { AmountInput } from '@/components/common/amount-input';
import { ShariaCategoryColor, ShariaDonationCategory } from '@/types';

// Deterministic institutional coloring engine for Sharia categories
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

const COLOR_OPTIONS: { id: ShariaCategoryColor; label: string; bg: string; text: string; border: string; dot: string }[] = [
  { id: 'emerald', label: 'أخضر زمردي (زكاة مال)', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  { id: 'purple', label: 'بنفسجي ملكي (أيتام)', bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', dot: 'bg-purple-500' },
  { id: 'rose', label: 'وردي صحي (علاج ومرضى)', bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', dot: 'bg-rose-500' },
  { id: 'teal', label: 'تركواز (صدقة جارية)', bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200', dot: 'bg-teal-500' },
  { id: 'amber', label: 'كهرماني (سداد ديون وغارمين)', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' },
  { id: 'cyan', label: 'سماوي (إطعام وغذاء)', bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200', dot: 'bg-cyan-500' },
  { id: 'indigo', label: 'نيلي (دعم سكن وإيواء)', bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200', dot: 'bg-indigo-500' },
];

export function SettingsView() {
  const {
    scoringConfig,
    updateScoringConfig,
    cases,
    currentPeriod,
    shariaCategories,
    addShariaCategory,
    updateShariaCategory,
    toggleShariaCategory,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'rules' | 'sharia'>('rules');

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

  // احتساب الحالات المتأثرة لحظياً بمهلة الزيارة الميدانية المختارة
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
      setCategoryError('يرجى إدخال اسم المصرف الشرعي');
      return;
    }

    const assignedColor = editingCategory?.color || getAutoShariaColor(categoryName.trim(), shariaCategories.length);

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
  };

  const getColorConfig = (color: ShariaCategoryColor) => {
    return COLOR_OPTIONS.find((c) => c.id === color) || COLOR_OPTIONS[3];
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'rules'
              ? 'bg-[#005756] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sliders size={15} />
          <span>قواعد التقييم والأوزان</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sharia')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeTab === 'sharia'
              ? 'bg-[#005756] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Tag size={15} />
          <span>المصارف الشرعية وتصنيفات التبرع</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'sharia' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {shariaCategories.length}
          </span>
        </button>
      </div>

      {activeTab === 'rules' ? (
        <form onSubmit={handleSaveConfig} className="space-y-6">
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base">أوزان محاور تقييم أولوية الحالات</h3>
              <p className="text-xs text-slate-500">
                توزيع النقاط النسبية (مجموع الأوزان المرجحة: {totalWeight}%)
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold underline"
            >
              <RotateCcw size={13} />
              <span>استعادة الإعدادات الافتراضية</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* Financial Gap Weight */}
            <div className="space-y-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center">
                <label className="font-bold text-slate-800">وزن فجوة الدخل والمصروفات</label>
                <span className="font-mono font-bold text-teal-800 text-sm">{gapWeight}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="50"
                step="5"
                value={gapWeight}
                onChange={(e) => setGapWeight(Number(e.target.value))}
                className="w-full accent-teal-700"
              />
              <p className="text-[11px] text-slate-500">
                يقيس الفرق بين المصاريف الحتمية وإجمالي الدخل المباشر وغير المباشر.
              </p>
            </div>

            {/* Medical Urgency Weight */}
            <div className="space-y-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center">
                <label className="font-bold text-slate-800">وزن الأمراض المزمنة والرعاية الحرجة</label>
                <span className="font-mono font-bold text-teal-800 text-sm">{medicalWeight}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="40"
                step="5"
                value={medicalWeight}
                onChange={(e) => setMedicalWeight(Number(e.target.value))}
                className="w-full accent-teal-700"
              />
              <p className="text-[11px] text-slate-500">
                التركيز على مرضى الفشل الكلوي، الأورام، والضمور العضلي.
              </p>
            </div>

            {/* Orphan and Dependents Weight */}
            <div className="space-y-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center">
                <label className="font-bold text-slate-800">وزن كفالة الأيتام وعبء الإعالة</label>
                <span className="font-mono font-bold text-teal-800 text-sm">{orphanWeight}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="35"
                step="5"
                value={orphanWeight}
                onChange={(e) => setOrphanWeight(Number(e.target.value))}
                className="w-full accent-teal-700"
              />
              <p className="text-[11px] text-slate-500">
                إعطاء أولوية مرتفعة للأرامل اللاتي يعلن أطفالاً صغاراً.
              </p>
            </div>

            {/* Housing Insecurity Weight */}
            <div className="space-y-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center">
                <label className="font-bold text-slate-800">وزن حالة وأمان السكن</label>
                <span className="font-mono font-bold text-teal-800 text-sm">{housingWeight}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="25"
                step="5"
                value={housingWeight}
                onChange={(e) => setHousingWeight(Number(e.target.value))}
                className="w-full accent-teal-700"
              />
              <p className="text-[11px] text-slate-500">
                المنازل الآيلة للسقوط، تهديدات الإخلاء، أو عدم صلاحية السكن.
              </p>
            </div>
          </div>
        </div>

        {/* Operational Limits & Thresholds */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-900 text-base">
              الحدود المالية والضوابط الزمنية
            </h3>
            <p className="text-xs text-slate-500">
              حوكمة سقف الصرف الفردي للصندوق العام وإلزامية دورية الزيارات الميدانية
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Field Visit Overdue Months */}
            <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <label className="text-slate-800 font-bold block">دورية الزيارات الميدانية الإلزامية</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="3"
                  max="12"
                  value={overdueMonths}
                  onChange={(e) => setOverdueMonths(Math.max(1, Number(e.target.value)))}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                />
                <span className="text-slate-600 shrink-0 font-medium">أشهر</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                إيقاف مقترح الصرف من الصندوق العام تلقائياً إذا انقضت {overdueMonths} أشهر دون مسح ميداني.
              </p>
            </div>

            {/* Individual Max Assistance Cap */}
            <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <label className="text-slate-800 font-bold block">سقف المساعدة الفردية الواحدة</label>
              <AmountInput
                value={maxCap}
                onChange={setMaxCap}
                size="sm"
                min={500}
                max={50000}
                step={500}
                currency="ج.م"
                className="w-full"
                inputClassName="bg-white font-mono text-xs font-bold"
              />
              <p className="text-[11px] text-slate-500 leading-tight">
                سقف حصة الصندوق العام للأسرة شهرياً (مع استثناء التبرعات المقيدة بالاسم).
              </p>
            </div>

            {/* Minimum Assistance Floor */}
            <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <label className="text-slate-800 font-bold block">الحد الأدنى لمبلغ المساعدة</label>
              <AmountInput
                value={minFloor}
                onChange={setMinFloor}
                size="sm"
                min={100}
                max={10000}
                step={100}
                currency="ج.م"
                className="w-full"
                inputClassName="bg-white font-mono text-xs font-bold"
              />
              <p className="text-[11px] text-slate-500 leading-tight">
                لتفادي تحويل مبالغ متناهية الصغر من الصندوق العام غير ذات جدوى.
              </p>
            </div>
          </div>

          {/* Real-time Dynamic Impact Indicator */}
          <div
            className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 transition-colors ${
              previewOverdueCases.length > 0
                ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                : 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
            }`}
          >
            <AlertTriangle
              size={16}
              className={`shrink-0 mt-0.5 ${
                previewOverdueCases.length > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            />
            <div className="space-y-1">
              <div className="font-bold flex items-center gap-2">
                <span>
                  {previewOverdueCases.length > 0
                    ? `أثر الضوابط الزمنية: سيتم إيقاف مقترح الصرف لـ (${previewOverdueCases.length}) أسر متجاوزة للمدة (${overdueMonths} أشهر)`
                    : `أثر الضوابط الزمنية: كافة الحالات النشطة مؤهلة ومحدثة الزيارات ضمن مهلة (${overdueMonths} أشهر)`}
                </span>
                {previewOverdueCases.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-amber-200/80 text-amber-900 rounded font-mono text-[10px] font-bold">
                    {previewOverdueCases.map((c) => c.code).join('، ')}
                  </span>
                )}
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                {previewOverdueCases.length > 0
                  ? `الحالات أعلاه لن يُقترح لها أي مبالغ من الصندوق العام، وسيقتصر الصرف على ما هو مخصص لها بالاسم من متبرعين حتى تجديد الزيارة الميدانية وتحديث البحث.`
                  : `يطبق سقف المساعدة (${maxCap.toLocaleString('ar-EG')} ج.م) والحد الأدنى (${minFloor.toLocaleString('ar-EG')} ج.م) على الصندوق العام فقط دون المساس بالتبرعات المقيدة.`}
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            {savedSuccess ? (
              <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
                <CheckCircle2 size={16} />
                <span>تم حفظ القواعد وتحديث درجات كافة الحالات ومقترح الميزانية فوراً!</span>
              </span>
            ) : (
              <span />
            )}

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#005756] hover:bg-[#004241] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Save size={15} />
              <span>حفظ وتطبيق القواعد فوراً</span>
            </button>
          </div>
        </div>
      </form>
    ) : (
    /* Sharia Donation Categories Management */
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">المصارف الشرعية وتصنيفات التبرعات</h2>
          <p className="text-xs text-slate-500">
            إدارة ديناميكية لأغراض وقيود التبرعات وفق الضوابط الفقهية، وتحديد ألوان الشارات التوضيحية
          </p>
        </div>

        <button
          type="button"
          onClick={openNewCategoryModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#005756] hover:bg-[#004241] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus size={16} />
          <span>إضافة مصرف شرعي جديد</span>
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">إجمالي المصارف المعرفة</span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              {shariaCategories.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">تصنيفات قيود شرعية معتمدة</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-800 shrink-0">
            <Tag size={20} />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-700 font-bold">المصارف النشطة والمتاحة</span>
            <div className="text-xl font-bold font-mono text-emerald-800 mt-1">
              {shariaCategories.filter((c) => c.isActive).length}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">تظهر في استمارة تسجيل التبرع</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">المصارف المعطلة مؤقتاً</span>
            <div className="text-xl font-bold font-mono text-slate-600 mt-1">
              {shariaCategories.filter((c) => !c.isActive).length}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">محجوبة من استمارات الاستقبال الجديدة</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
            <BookmarkCheck size={20} />
          </div>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">قائمة المصارف الشرعية وتصنيفات الصرف</h3>
          <span className="text-[11px] text-slate-500">
            يمكن تفعيل أو تعطيل أي مصرف أو تعديل شاراته وبياناته الفقهية
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3 px-4">اسم المصرف الشرعي</th>
                <th className="py-3 px-3">الشارة المؤسسية المعتمدة</th>
                <th className="py-3 px-4">وصف وضوابط الصرف الشرعي</th>
                <th className="py-3 px-3">حالة التفعيل</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shariaCategories.map((cat) => {
                const colorConfig = getColorConfig(cat.color);
                return (
                  <tr key={cat.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Name */}
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${colorConfig.dot}`} />
                        <span>{cat.name}</span>
                      </div>
                    </td>

                    {/* Badge Preview */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${colorConfig.bg} ${colorConfig.text} ${colorConfig.border}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                        <span>{cat.name}</span>
                      </span>
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-4 text-slate-600 text-[11px] leading-relaxed max-w-md">
                      {cat.description || 'لا يوجد وصف محدد'}
                    </td>

                    {/* Active Toggle */}
                    <td className="py-3.5 px-3">
                      <button
                        type="button"
                        onClick={() => toggleShariaCategory(cat.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer border ${
                          cat.isActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                        }`}
                        title="انقر لتبديل حالة التفعيل"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            cat.isActive ? 'bg-emerald-600' : 'bg-slate-400'
                          }`}
                        />
                        <span>{cat.isActive ? 'نشط ومتاح' : 'معطل مؤقتاً'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => openEditCategoryModal(cat)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-700 hover:text-teal-800 hover:bg-teal-50 rounded text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Edit2 size={13} />
                        <span>تعديل</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}

  {/* Category Add/Edit Modal */}
  {isCategoryModalOpen && (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-800">
              <Tag size={16} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {editingCategory ? 'تعديل المصرف الشرعي' : 'إضافة مصرف شرعي جديد'}
              </h3>
              <p className="text-[11px] text-slate-500">
                تحديد اسم المصرف وضوابط الصرف الشرعي المعتمدة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSaveCategory} className="p-5 space-y-4">
          {categoryError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium">
              {categoryError}
            </div>
          )}

          {/* Name & Badge Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                اسم المصرف الشرعي <span className="text-rose-500">*</span>
              </label>
              {(() => {
                const previewColor = editingCategory?.color || getAutoShariaColor(categoryName, shariaCategories.length);
                const activeColor = getColorConfig(previewColor);
                return (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${activeColor.bg} ${activeColor.text} ${activeColor.border}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                    <span>{categoryName.trim() || 'معاينة الشارة'}</span>
                  </span>
                );
              })()}
            </div>
            <input
              type="text"
              required
              value={categoryName}
              onChange={(e) => {
                setCategoryName(e.target.value);
                setCategoryError('');
              }}
              placeholder="مثال: كفالة طالب علم / زكاة فطر / كفارة يمين"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-600"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              وصف وضوابط الصرف الشرعي
            </label>
            <textarea
              rows={3}
              value={categoryDesc}
              onChange={(e) => setCategoryDesc(e.target.value)}
              placeholder="شروط استحقاق هذا البند، ونوعية الأسر أو الحالات المستهدفة..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-600 resize-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#005756] hover:bg-[#004241] text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              {editingCategory ? 'حفظ التعديلات' : 'إضافة المصرف'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )}
    </div>
  );
}
