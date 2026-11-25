'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, AlertTriangle, Check, Lock } from 'lucide-react';
import { ResearcherProfile } from '@/types';

const SUGGESTED_ROLE_TITLES = [
  'باحث ميداني معتمد',
  'متطوع أبحاث اجتماعية',
  'أخصائي اجتماعي وباحث ميداني',
  'منسق زيارات ميدانية',
];

const SUGGESTED_DISTRICTS = [
  'الجيزة (بولاق الدكرور)',
  'القاهرة (عزبة النخل)',
  'منشأة ناصر (الدويقة)',
  'المطرية',
  'عين شمس',
  'شبرا الخيمة',
  'دار السلام (البساتين)',
  'حلوان',
  'فيصل',
  'الوراق',
];

export type ResearcherFormMode = 'admin' | 'self-profile';

export interface ResearcherFormPayload {
  name: string;
  roleTitle: string;
  phone: string;
  email: string;
  assignedDistricts: string[];
  bio: string;
}

interface ResearcherFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingResearcher?: ResearcherProfile | null;
  existingNames: string[];
  onSubmit: (payload: ResearcherFormPayload) => void;
  mode?: ResearcherFormMode;
}

export function ResearcherFormModal({
  isOpen,
  onClose,
  editingResearcher,
  existingNames,
  onSubmit,
  mode = 'admin',
}: ResearcherFormModalProps) {
  const isEditMode = Boolean(editingResearcher);
  const isSelfProfileMode = mode === 'self-profile';

  const [name, setName] = useState('');
  const [roleTitle, setRoleTitle] = useState('باحث ميداني معتمد');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [districts, setDistricts] = useState<string[]>([]);
  const [districtInput, setDistrictInput] = useState('');
  const [bio, setBio] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isOpen) return;
    if (editingResearcher) {
      setName(editingResearcher.name || '');
      setRoleTitle(editingResearcher.roleTitle || 'باحث ميداني معتمد');
      setPhone(
        editingResearcher.phone === 'غير مسجل' ? '' : editingResearcher.phone || ''
      );
      setEmail(
        editingResearcher.email === 'غير مسجل' ? '' : editingResearcher.email || ''
      );
      setDistricts(
        editingResearcher.assignedDistricts?.filter(
          (d) => d && d !== 'نطاق عام'
        ) || []
      );
      setDistrictInput('');
      setBio(editingResearcher.bio || '');
      setErrorMsg(null);
    } else {
      setName('');
      setRoleTitle('باحث ميداني معتمد');
      setPhone('');
      setEmail('');
      setDistricts([]);
      setDistrictInput('');
      setBio('');
      setErrorMsg(null);
    }
  }, [isOpen, editingResearcher]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleAddDistrict = (valueToAdd?: string) => {
    const raw = (valueToAdd ?? districtInput).trim();
    if (!raw) return;
    const parts = raw
      .split(/[،,]/)
      .map((p) => p.trim())
      .filter(Boolean);
    setDistricts((prev) => {
      const next = [...prev];
      parts.forEach((p) => {
        if (!next.includes(p)) {
          next.push(p);
        }
      });
      return next;
    });
    if (valueToAdd === undefined) {
      setDistrictInput('');
    }
  };

  const handleRemoveDistrict = (target: string) => {
    setDistricts((prev) => prev.filter((d) => d !== target));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Enforced programmatic protection for administrative fields in self-profile mode
    const protectedName =
      isSelfProfileMode && editingResearcher
        ? editingResearcher.name.trim()
        : name.trim();
    const protectedRoleTitle =
      isSelfProfileMode && editingResearcher
        ? editingResearcher.roleTitle.trim() || 'باحث ميداني معتمد'
        : roleTitle.trim() || 'باحث ميداني معتمد';

    if (!protectedName) {
      setErrorMsg('اكتب اسم الباحث ثلاثي أو باللقب المعتمد');
      return;
    }

    if (!isSelfProfileMode) {
      const isDuplicate = existingNames.some(
        (n) =>
          n.trim() === protectedName &&
          (!editingResearcher || editingResearcher.name.trim() !== protectedName)
      );
      if (isDuplicate) {
        setErrorMsg('الاسم ده مسجل بالفعل ضمن فريق البحث الميداني');
        return;
      }
    }

    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setErrorMsg(
        isSelfProfileMode
          ? 'اكتب رقم موبايلك عشان يسهل التواصل والمتابعة الميدانية'
          : 'اكتب رقم موبايل الباحث للتواصل والمتابعة الميدانية'
      );
      return;
    }

    const pendingDistrict = districtInput.trim();
    const finalDistricts = [...districts];
    if (pendingDistrict && !finalDistricts.includes(pendingDistrict)) {
      finalDistricts.push(pendingDistrict);
    }

    onSubmit({
      name: protectedName,
      roleTitle: protectedRoleTitle,
      phone: trimmedPhone,
      email: email.trim() || 'غير مسجل',
      assignedDistricts:
        finalDistricts.length > 0 ? finalDistricts : ['نطاق عام'],
      bio:
        bio.trim() ||
        'باحث ميداني معتمد لمتابعة الأسر المستحقة وتوثيق الزيارات الدورية في منظومة إحسان.',
    });
  };

  const modalTitle = isSelfProfileMode
    ? 'تعديل بياناتي الميدانية'
    : isEditMode
    ? 'تعديل بيانات الباحث'
    : 'إضافة باحث ميداني جديد';

  const modalSubtitle = isSelfProfileMode
    ? 'تقدر تحدّث أرقام تواصلك ومناطق التغطية والنبذة التعريفية، وهتظهر فوراً للإدارة في سجل الفريق.'
    : isEditMode
    ? 'تحديث بيانات التواصل أو مناطق التغطية مع الحفاظ التام على سجل الحالات والزيارات.'
    : 'سجّل بيانات الباحث عشان يظهر فوراً في قوائم إسناد الحالات الجديدة.';

  const submitButtonLabel = isSelfProfileMode
    ? 'حفظ بياناتي'
    : isEditMode
    ? 'حفظ التعديلات'
    : 'إضافة الباحث';

  return createPortal(
    <div
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="researcher-form-modal-title"
    >
      <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200/80 shadow-xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[88vh] flex flex-col overflow-hidden text-right my-auto">
        {/* Zone 1: Sticky Header */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h3
              id="researcher-form-modal-title"
              className="text-base sm:text-lg font-bold text-slate-900 leading-tight"
            >
              {modalTitle}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {modalSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Zone 2 & 3: Form with Scrollable Body + Sticky Footer */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200/80 text-xs font-medium text-slate-800 flex items-center gap-2">
                <AlertTriangle size={14} className="text-slate-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Row 1: Identity & Role Title (Read-only banner in self-profile mode, editable inputs in admin mode) */}
            {isSelfProfileMode && editingResearcher ? (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-bold text-slate-900">
                      {editingResearcher.name}
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-xs font-medium text-slate-600">
                      {editingResearcher.roleTitle}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/80 text-[11px] font-medium">
                    <Lock size={11} className="text-slate-400 shrink-0" />
                    <span>معتمد من الإدارة</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  الاسم الرسمي والصفة الإدارية وحالة تنشيط الحساب بيانات إدارية ثابتة، وتقدر تعدّل بيانات تواصلك ومناطق التغطية بالأسفل.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="researcher-name-input"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      اسم الباحث / المتطوع{' '}
                      <span className="text-slate-400">*</span>
                    </label>
                    <input
                      id="researcher-name-input"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثال: أ. محمد عبد الرحمن"
                      className="w-full h-10 px-3 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#005756] focus-visible:border-[#005756]"
                    />
                  </div>

                  {/* Role Title */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="researcher-role-input"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      الصفة في فريق البحث
                    </label>
                    <input
                      id="researcher-role-input"
                      type="text"
                      value={roleTitle}
                      onChange={(e) => setRoleTitle(e.target.value)}
                      placeholder="مثال: باحث ميداني معتمد"
                      className="w-full h-10 px-3 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#005756] focus-visible:border-[#005756]"
                    />
                  </div>
                </div>

                {/* Suggested Role Titles Quick Row */}
                <div className="flex flex-wrap items-center gap-1.5 -mt-1.5">
                  <span className="text-[11px] text-slate-400 ml-1">
                    اختيار سريع للصفة:
                  </span>
                  {SUGGESTED_ROLE_TITLES.map((title) => {
                    const isSelected = roleTitle.trim() === title;
                    return (
                      <button
                        key={title}
                        type="button"
                        onClick={() => setRoleTitle(title)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#005756] text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                        }`}
                      >
                        {title}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Row 2: Phone & Email (2 columns on Desktop) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="researcher-phone-input"
                  className="block text-xs font-semibold text-slate-700"
                >
                  رقم الموبايل <span className="text-slate-400">*</span>
                </label>
                <input
                  id="researcher-phone-input"
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01012345678"
                  className="w-full h-10 px-3 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-900 text-right placeholder:text-slate-400 tabular-nums focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#005756] focus-visible:border-[#005756]"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="researcher-email-input"
                  className="block text-xs font-semibold text-slate-700"
                >
                  البريد الإلكتروني{' '}
                  <span className="text-[11px] font-normal text-slate-400">
                    (اختياري)
                  </span>
                </label>
                <input
                  id="researcher-email-input"
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@ehsan-initiative.org"
                  className="w-full h-10 px-3 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-900 text-right placeholder:text-slate-400 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#005756] focus-visible:border-[#005756]"
                />
              </div>
            </div>

            {/* Row 3: Coverage Districts */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <label
                htmlFor="researcher-district-input"
                className="block text-xs font-semibold text-slate-700"
              >
                {isSelfProfileMode
                  ? 'مناطق التغطية الميدانية (المسندة أو المقترحة منك)'
                  : 'مناطق التغطية الميدانية'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="researcher-district-input"
                  type="text"
                  value={districtInput}
                  onChange={(e) => setDistrictInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDistrict();
                    }
                  }}
                  placeholder="اكتب اسم الحي أو المنطقة واضغط إضافة..."
                  className="flex-1 h-9 px-3 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#005756] focus-visible:border-[#005756]"
                />
                <button
                  type="button"
                  onClick={() => handleAddDistrict()}
                  className="h-9 px-3.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  <Plus size={14} />
                  <span>إضافة</span>
                </button>
              </div>

              {districts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {districts.map((d) => (
                    <span
                      key={d}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/80 text-xs font-medium text-slate-700"
                    >
                      <span>{d}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDistrict(d)}
                        aria-label={`حذف منطقة ${d}`}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] text-slate-400 ml-1">
                  مناطق سريعة:
                </span>
                {SUGGESTED_DISTRICTS.map((sug) => {
                  const alreadyAdded = districts.includes(sug);
                  return (
                    <button
                      key={sug}
                      type="button"
                      onClick={() =>
                        alreadyAdded
                          ? handleRemoveDistrict(sug)
                          : handleAddDistrict(sug)
                      }
                      className={`px-2 py-0.5 rounded-md text-[11px] transition-colors cursor-pointer inline-flex items-center gap-1 ${
                        alreadyAdded
                          ? 'bg-slate-700 text-white font-medium'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/70'
                      }`}
                    >
                      {alreadyAdded && <Check size={10} />}
                      <span>{sug}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 4: Bio */}
            <div className="space-y-1.5">
              <label
                htmlFor="researcher-bio-input"
                className="block text-xs font-semibold text-slate-700"
              >
                {isSelfProfileMode
                  ? 'نبذة تعريفية عن تخصصك وخبرتك الميدانية'
                  : 'نبذة مختصرة عن تخصص الباحث'}
              </label>
              <textarea
                id="researcher-bio-input"
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="مثال: متطوع متخصص في المعاينات الميدانية ومتابعة الأسر الأولى بالرعاية..."
                className="w-full p-3 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 leading-relaxed focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#005756] focus-visible:border-[#005756] resize-none"
              />
            </div>
          </div>

          {/* Zone 3: Sticky Footer Actions */}
          <div className="px-5 sm:px-6 py-3.5 bg-slate-50/70 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-xl bg-[#005756] hover:bg-[#004746] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              {submitButtonLabel}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

interface ResearcherDeactivateModalProps {
  isOpen: boolean;
  researcher: ResearcherProfile | null;
  assignedCasesCount: number;
  visitsCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

export function ResearcherDeactivateModal({
  isOpen,
  researcher,
  assignedCasesCount,
  visitsCount,
  onClose,
  onConfirm,
}: ResearcherDeactivateModalProps) {
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !researcher || typeof document === 'undefined') return null;

  return createPortal(
    <div
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="researcher-deactivate-modal-title"
    >
      <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200/80 shadow-xl overflow-hidden text-right my-auto">
        <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <h3
              id="researcher-deactivate-modal-title"
              className="text-base font-bold text-slate-900"
            >
              إيقاف حساب الباحث مؤقتاً
            </h3>
            <p className="text-xs font-medium text-slate-500 truncate">
              {researcher.name} · {researcher.roleTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs text-slate-600 leading-relaxed">
            <p className="font-semibold text-slate-800">
              إيه اللي هيحصل لما توقف حساب الباحث؟
            </p>
            <ul className="space-y-1.5 list-disc list-inside text-slate-600">
              <li>
                مش هيظهر اسم الباحث في القوائم المنسدلة عند إسناد حالات جديدة.
              </li>
              <li>
                <strong>السجل التاريخي محفوظ بالكامل:</strong> كل الحالات المسندة حالياً ({assignedCasesCount} حالة)، وتقارير الزيارات السابقة ({visitsCount} زيارة)، وإثباتات التسليم الميداني هتفضل مربوطة باسمه بدون أي حذف.
              </li>
              <li>
                تقدر ترجّع الحساب نشط في أي وقت بضغطة واحدة من أرشيف الباحثين.
              </li>
            </ul>
          </div>

          <div className="pt-1 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              تراجع
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="h-10 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              تأكيد إيقاف الحساب
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
