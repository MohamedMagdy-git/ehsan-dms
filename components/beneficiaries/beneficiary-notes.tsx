'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import {
  Lock,
  Globe,
  Send,
  User,
  Clock,
  Trash2,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { CaseNote } from '@/types';

interface BeneficiaryNotesProps {
  caseId: string;
  caseCode?: string;
  caseName?: string;
}

export function BeneficiaryNotes({ caseId, caseCode, caseName }: BeneficiaryNotesProps) {
  const {
    caseNotes,
    addCaseNote,
    deleteCaseNote,
    currentUserRole,
    currentSessionProfile,
  } = useApp();

  const [noteContent, setNoteContent] = useState('');
  const [isPrivate, setIsPrivate] = useState<boolean>(false); // false = عامة للفريق, true = خاصة بي
  const [noteCategory, setNoteCategory] = useState<'general' | 'followup' | 'warning' | 'urgent'>('general');
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private'>('all');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // Filter notes for this specific case and sort newest first
  const caseNotesList = useMemo(() => {
    return caseNotes
      .filter((n) => n.caseId === caseId)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [caseNotes, caseId]);

  // Apply privacy / view filters
  const visibleNotes = useMemo(() => {
    return caseNotesList.filter((note) => {
      // Access check:
      // Public notes: visible to everyone
      // Private notes: visible to the author or if currentUserRole is 'admin'
      const isAuthor = note.authorId === currentUserRole || note.authorName === currentSessionProfile.name;
      const canView = !note.isPrivate || isAuthor || currentUserRole === 'admin';
      if (!canView) return false;

      // Filter tabs:
      if (filterType === 'public') return !note.isPrivate;
      if (filterType === 'private') return note.isPrivate;
      return true;
    });
  }, [caseNotesList, filterType, currentUserRole, currentSessionProfile.name]);

  // Statistics counters
  const publicCount = useMemo(() => {
    return caseNotesList.filter((n) => !n.isPrivate).length;
  }, [caseNotesList]);

  const privateCount = useMemo(() => {
    return caseNotesList.filter((n) => {
      const isAuthor = n.authorId === currentUserRole || n.authorName === currentSessionProfile.name;
      return n.isPrivate && (isAuthor || currentUserRole === 'admin');
    }).length;
  }, [caseNotesList, currentUserRole, currentSessionProfile.name]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!noteContent.trim()) return;

    addCaseNote({
      caseId,
      content: noteContent.trim(),
      isPrivate,
      category: noteCategory,
      authorName: currentSessionProfile.name,
      authorRole: currentSessionProfile.title || currentSessionProfile.badgeLabel,
    });

    setNoteContent('');
    setSuccessToast(isPrivate ? 'تمت إضافة الملاحظة الخاصة بنجاح (مرئية لك فقط)' : 'تمت إضافة الملاحظة العامة ومشاركتها مع الفريق');
    setTimeout(() => {
      setSuccessToast(null);
    }, 3500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleDelete = (noteId: string) => {
    deleteCaseNote(noteId);
    setDeletingNoteId(null);
    setSuccessToast('تم حذف الملاحظة من السجل');
    setTimeout(() => {
      setSuccessToast(null);
    }, 3000);
  };

  return (
    <div className="space-y-6 text-slate-800" dir="rtl">
      {/* Success Feedback Alert */}
      {successToast && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 1. قسم إدخال الملاحظة الجديدة (Add Note Section) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all duration-200 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/10">
        {/* Header of Add Note Section */}
        <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-200/60">
              <FileText size={15} />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                تسجيل ملاحظة إدارية أو ميدانية جديدة
              </h3>
              <p className="text-[11px] text-slate-500">
                تسجيل بصفتك:{' '}
                <strong className="text-slate-700 font-semibold">
                  {currentSessionProfile.name}
                </strong>{' '}
                ({currentSessionProfile.title || currentSessionProfile.badgeLabel})
              </p>
            </div>
          </div>

          {/* Quick Category Selector */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setNoteCategory('general')}
              className={`px-2 py-1 text-[11px] rounded-lg transition-colors cursor-pointer ${
                noteCategory === 'general'
                  ? 'bg-slate-200 font-bold text-slate-800'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              عامة
            </button>
            <button
              type="button"
              onClick={() => setNoteCategory('followup')}
              className={`px-2 py-1 text-[11px] rounded-lg transition-colors cursor-pointer ${
                noteCategory === 'followup'
                  ? 'bg-sky-100 font-bold text-sky-800 border border-sky-200'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              متابعة
            </button>
            <button
              type="button"
              onClick={() => setNoteCategory('urgent')}
              className={`px-2 py-1 text-[11px] rounded-lg transition-colors cursor-pointer ${
                noteCategory === 'urgent'
                  ? 'bg-rose-100 font-bold text-rose-800 border border-rose-200'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              عاجلة
            </button>
          </div>
        </div>

        {/* Textarea Input */}
        <div className="p-3 sm:p-4">
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            placeholder="اكتب ملاحظتك التوثيقية أو التوصية الميدانية حول الحالة هنا... (اضغط Ctrl + Enter للإرسال السريع)"
            className="w-full resize-y min-h-[96px] p-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 bg-slate-50/50 hover:bg-white focus:bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all duration-150 leading-relaxed font-sans"
          />

          {/* Bottom Action Toolbar: Privacy Toggle + CTA Button */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Privacy Toggle: Segmented Control */}
            <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
              {/* Option 1: Public */}
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  !isPrivate
                    ? 'bg-white text-teal-800 shadow-2xs font-bold border border-teal-200/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
                title="تظهر لجميع أعضاء الفريق والمشرفين"
              >
                <Globe size={14} className={!isPrivate ? 'text-teal-600' : 'text-slate-400'} />
                <span>عامة للفريق</span>
              </button>

              {/* Option 2: Private */}
              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isPrivate
                    ? 'bg-white text-purple-800 shadow-2xs font-bold border border-purple-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
                title="تظهر لك فقط ولن تظهر لباقي المستخدمين"
              >
                <Lock size={14} className={isPrivate ? 'text-purple-600' : 'text-slate-400'} />
                <span>خاصة بي</span>
              </button>
            </div>

            {/* Privacy Clarification Helper text */}
            <div className="hidden md:block text-[11px] text-slate-500">
              {!isPrivate ? (
                <span className="text-teal-700 font-medium flex items-center gap-1">
                  <Globe size={12} /> تظهر لجميع الباحثين والمشرفين
                </span>
              ) : (
                <span className="text-purple-700 font-medium flex items-center gap-1">
                  <Lock size={12} /> محفوظة لك وحدك كمسودة سرية
                </span>
              )}
            </div>

            {/* Submit Button (CTA) */}
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!noteContent.trim()}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer shadow-xs active:scale-[0.98] ${
                noteContent.trim()
                  ? isPrivate
                    ? 'bg-purple-700 hover:bg-purple-800 text-white shadow-purple-900/10'
                    : 'bg-[#005756] hover:bg-[#004241] text-white shadow-teal-950/15'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              <Send size={15} className="rotate-180 shrink-0" />
              <span>إضافة الملاحظة</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. عرض أرشيف الملاحظات (Notes Timeline Feed) */}
      <div className="space-y-4">
        {/* Timeline Header & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>سجل ملاحظات الحالة والنشاط</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-mono font-bold">
                {caseNotesList.length}
              </span>
            </h3>
            {caseCode && (
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                للحالة: <strong>{caseCode}</strong>
              </span>
            )}
          </div>

          {/* Feed Filter Chips */}
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs font-semibold ${
                filterType === 'all'
                  ? 'bg-slate-800 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              الكل ({caseNotesList.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('public')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs font-semibold flex items-center gap-1 ${
                filterType === 'public'
                  ? 'bg-teal-700 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Globe size={12} />
              <span>العامة ({publicCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('private')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs font-semibold flex items-center gap-1 ${
                filterType === 'private'
                  ? 'bg-purple-700 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Lock size={12} />
              <span>الخاصة ({privateCount})</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
        {visibleNotes.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FileText size={24} />
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-700 mb-1">
              {filterType === 'private'
                ? 'لا توجد ملاحظات خاصة بك مسجلة لهذه الحالة'
                : filterType === 'public'
                ? 'لا توجد ملاحظات عامة مسجلة لهذه الحالة'
                : 'لا توجد ملاحظات مسجلة على هذه الحالة حتى الآن'}
            </p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              يمكنك استخدام نموذج التسجيل أعلاه لإضافة أول ملاحظة ميدانية أو إدارية توثيقية حول المستفيد.
            </p>
          </div>
        ) : (
          /* Ordered Timeline List (Newest first) */
          <div className="space-y-3.5 relative before:absolute before:top-2 before:bottom-2 before:right-4 before:w-0.5 before:bg-slate-200/70 before:hidden sm:before:block">
            {visibleNotes.map((note) => {
              const isAuthor =
                note.authorId === currentUserRole ||
                note.authorName === currentSessionProfile.name;
              const canDelete = isAuthor || currentUserRole === 'admin';

              return (
                <div
                  key={note.id}
                  className={`relative bg-white rounded-2xl border p-3.5 sm:p-4 shadow-2xs transition-all duration-150 hover:shadow-xs sm:mr-8 ${
                    note.isPrivate
                      ? 'border-purple-200/80 hover:border-purple-300'
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  {/* Timeline connector dot on desktop */}
                  <div
                    className={`hidden sm:flex absolute -right-[27px] top-4 w-3.5 h-3.5 rounded-full border-2 border-white items-center justify-center shadow-2xs ${
                      note.isPrivate
                        ? 'bg-purple-600 ring-2 ring-purple-100'
                        : 'bg-teal-600 ring-2 ring-teal-100'
                    }`}
                  />

                  {/* Header: Author Name, Exact Date/Time, and Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Avatar initial or icon */}
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                          note.isPrivate
                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                            : 'bg-teal-100 text-teal-900 border border-teal-200'
                        }`}
                      >
                        {note.authorName ? note.authorName.charAt(0) : <User size={13} />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {note.authorName}
                          </span>
                          {note.authorRole && (
                            <span className="text-[11px] text-slate-500 font-normal">
                              ({note.authorRole})
                            </span>
                          )}
                        </div>

                        {/* Exact formatted date and time */}
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono mt-0.5">
                          <Clock size={11} className="shrink-0" />
                          <span>{note.createdAt}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right side of header: Status Badge + Optional Delete */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Category Tag if urgent/warning */}
                      {note.category === 'urgent' && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200 flex items-center gap-1">
                          <AlertCircle size={10} />
                          <span>عاجلة</span>
                        </span>
                      )}
                      {note.category === 'followup' && (
                        <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 text-[10px] font-semibold border border-sky-200">
                          متابعة
                        </span>
                      )}

                      {/* Status Badge: Lock vs Globe */}
                      {note.isPrivate ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 shadow-2xs">
                          <Lock size={12} className="text-purple-600 shrink-0" />
                          <span>خاصة بي</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs">
                          <Globe size={12} className="text-teal-600 shrink-0" />
                          <span>عامة للفريق</span>
                        </span>
                      )}

                      {/* Delete action button */}
                      {canDelete && (
                        <div className="relative">
                          {deletingNoteId === note.id ? (
                            <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-1 rounded-lg animate-in fade-in">
                              <span className="text-[10px] text-rose-800 font-bold px-1">حذف؟</span>
                              <button
                                type="button"
                                onClick={() => handleDelete(note.id)}
                                className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold hover:bg-rose-700 cursor-pointer"
                              >
                                نعم
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingNoteId(null)}
                                className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] hover:bg-slate-300 cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeletingNoteId(note.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="حذف الملاحظة"
                              aria-label="حذف الملاحظة"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Note Content: Calm light gray background container */}
                  <div className="bg-slate-50/80 rounded-xl p-3 sm:p-3.5 text-xs sm:text-sm text-slate-700 leading-relaxed font-sans border border-slate-100/90 whitespace-pre-wrap break-words">
                    {note.content}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
