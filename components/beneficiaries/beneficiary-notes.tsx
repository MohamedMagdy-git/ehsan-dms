'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { useApp } from '@/context/app-context';
import { useToast } from '@/context/toast-context';
import { canUserReadCaseNote } from '@/lib/researcher-relations';
import {
  Lock,
  Globe,
  Send,
  User,
  Clock,
  Trash2,
  AlertCircle,
  MessageSquareText,
} from 'lucide-react';

interface BeneficiaryNotesProps {
  caseId: string;
  caseCode?: string;
  caseName?: string;
}

export function BeneficiaryNotes({ caseId, caseCode }: BeneficiaryNotesProps) {
  const { user } = useAuth();
  const {
    caseNotes,
    addCaseNote,
    deleteCaseNote,
  } = useApp();

  const [noteContent, setNoteContent] = useState('');
  const [isPrivate, setIsPrivate] = useState<boolean>(false); // false = عامة للفريق, true = خاصة بيا
  const [noteCategory, setNoteCategory] = useState<'general' | 'followup' | 'warning' | 'urgent'>('general');
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private'>('all');
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const { toast } = useToast();

  // Filter notes for this specific case and sort newest first
  const caseNotesList = useMemo(() => {
    return caseNotes
      .filter((n) => n.caseId === caseId)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [caseNotes, caseId]);

  // All notes accessible to the current user (RLS-style isolation for private notes)
  const accessibleNotes = useMemo(() => {
    return caseNotesList.filter((note) => canUserReadCaseNote(note, user));
  }, [caseNotesList, user]);

  // Apply privacy / view filters
  const visibleNotes = useMemo(() => {
    return accessibleNotes.filter((note) => {
      if (filterType === 'public') return !note.isPrivate;
      if (filterType === 'private') return note.isPrivate;
      return true;
    });
  }, [accessibleNotes, filterType]);

  // Statistics counters
  const publicCount = useMemo(() => {
    return accessibleNotes.filter((n) => !n.isPrivate).length;
  }, [accessibleNotes]);

  const privateCount = useMemo(() => {
    return accessibleNotes.filter((n) => n.isPrivate).length;
  }, [accessibleNotes]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!noteContent.trim()) return;

    addCaseNote({
      caseId,
      content: noteContent.trim(),
      isPrivate,
      category: noteCategory,
      authorName: user.name,
      authorRole: user.title,
    });

    setNoteContent('');
    toast.success(
      isPrivate
        ? 'تم حفظ الملاحظة الخاصة بنجاح (بتظهر لك إنت بس)'
        : 'تم حفظ الملاحظة ومشاركتها مع الفريق'
    );
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
    toast.info('تم حذف الملاحظة من السجل');
  };

  const getCategoryLabel = (category?: string) => {
    if (category === 'followup') return 'متابعة';
    if (category === 'urgent' || category === 'warning') return 'عاجلة';
    return 'ملاحظة عامة';
  };

  return (
    <div className="space-y-6 text-slate-800" dir="rtl">
      {/* 1. مساحة إضافة ملاحظة جديدة (Clean Calm UI Composer) */}
      <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden transition-colors duration-150 focus-within:border-[#005756]">
        {/* Textarea Input Area (No nested box) */}
        <div className="p-3.5 sm:p-4">
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            placeholder="اكتب ملاحظة أو متابعة على الحالة... (اضغط Ctrl + Enter للحفظ السريع)"
            className="w-full resize-y min-h-[84px] text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 bg-transparent focus:outline-hidden leading-relaxed font-sans"
          />
        </div>

        {/* Unified Bottom Toolbar: Category + Privacy + Submit Button */}
        <div className="px-3.5 sm:px-4 py-2.5 bg-slate-50/80 border-t border-slate-200/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Controls Group: Note Category & Privacy Level */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Segmented Control 1: Note Category */}
            <div
              role="group"
              aria-label="نوع الملاحظة"
              className="inline-flex items-center bg-slate-200/70 p-0.5 rounded-lg"
            >
              <button
                type="button"
                onClick={() => setNoteCategory('general')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  noteCategory === 'general'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                عامة
              </button>
              <button
                type="button"
                onClick={() => setNoteCategory('followup')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                  noteCategory === 'followup'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                متابعة
              </button>
              <button
                type="button"
                onClick={() => setNoteCategory('urgent')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  noteCategory === 'urgent'
                    ? 'bg-white text-rose-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <AlertCircle
                  size={11}
                  className={noteCategory === 'urgent' ? 'text-rose-600' : 'text-slate-400'}
                />
                <span>عاجلة</span>
              </button>
            </div>

            <span className="hidden sm:inline text-slate-300 select-none" aria-hidden="true">
              ·
            </span>

            {/* Segmented Control 2: Privacy Level */}
            <div
              role="group"
              aria-label="مستوى ظهور الملاحظة"
              className="inline-flex items-center bg-slate-200/70 p-0.5 rounded-lg"
            >
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                title="بتظهر لكل الفريق والإدارة"
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  !isPrivate
                    ? 'bg-white text-[#005756] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe
                  size={12}
                  className={!isPrivate ? 'text-[#005756]' : 'text-slate-400'}
                />
                <span>عامة للفريق</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                title="بتظهر لك إنت بس"
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  isPrivate
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Lock
                  size={12}
                  className={isPrivate ? 'text-slate-700' : 'text-slate-400'}
                />
                <span>خاصة بيا</span>
              </button>
            </div>
          </div>

          {/* Primary Save Action */}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!noteContent.trim()}
            className={`min-h-[36px] px-4 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-150 shrink-0 ${
              noteContent.trim()
                ? 'bg-[#005756] hover:bg-[#004241] text-white cursor-pointer active:scale-[0.99]'
                : 'bg-slate-200/70 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Send size={13} className="rotate-180 shrink-0" />
            <span>حفظ الملاحظة</span>
          </button>
        </div>
      </div>

      {/* 2. سجل الملاحظات والخط الزمني (Notes Timeline Feed) */}
      <div className="space-y-4">
        {/* Timeline Header & Segmented Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200/80">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              سجل الملاحظات والمتابعة
            </h3>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums font-semibold text-slate-600">
              {accessibleNotes.length}
            </span>
            {caseCode && (
              <>
                <span className="hidden sm:inline" aria-hidden="true">
                  ·
                </span>
                <span className="hidden sm:inline font-mono text-[11px] text-slate-400">
                  {caseCode}
                </span>
              </>
            )}
          </div>

          {/* Calm Segmented Filter Bar */}
          <div
            role="tablist"
            aria-label="تصفية سجل الملاحظات"
            className="inline-flex items-center bg-slate-100 p-1 rounded-lg text-xs tabular-nums"
          >
            <button
              type="button"
              role="tab"
              aria-selected={filterType === 'all'}
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white text-[#005756] shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل ({accessibleNotes.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterType === 'public'}
              onClick={() => setFilterType('public')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                filterType === 'public'
                  ? 'bg-white text-[#005756] shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe size={11} className={filterType === 'public' ? 'text-[#005756]' : 'text-slate-400'} />
              <span>عامة ({publicCount})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterType === 'private'}
              onClick={() => setFilterType('private')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                filterType === 'private'
                  ? 'bg-white text-[#005756] shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lock size={11} className={filterType === 'private' ? 'text-[#005756]' : 'text-slate-400'} />
              <span>خاصة بيا ({privateCount})</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
        {visibleNotes.length === 0 ? (
          <div className="py-10 px-4 text-center bg-slate-50/50 rounded-xl border border-slate-200/70">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
              <MessageSquareText size={18} />
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-700 mb-1">
              {filterType === 'private'
                ? 'مفيش ملاحظات خاصة بيك متسجلة للحالة دي'
                : filterType === 'public'
                ? 'مفيش ملاحظات عامة متسجلة للحالة دي'
                : 'مفيش أي ملاحظات متسجلة على الحالة دي لحد دلوقتي'}
            </p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              اكتب أول ملاحظة أو متابعة من المربع اللي فوق وهتظهر هنا فوراً.
            </p>
          </div>
        ) : (
          /* Ordered Timeline List (Newest first) */
          <div className="space-y-3 relative before:absolute before:top-3 before:bottom-3 before:right-3 before:w-px before:bg-slate-200 before:hidden sm:before:block">
            {visibleNotes.map((note) => {
              const isAuthor = note.authorUserId
                ? note.authorUserId === user.id
                : note.authorName === user.name;
              const canDelete = isAuthor || user.role === 'admin';
              const isUrgent = note.category === 'urgent' || note.category === 'warning';

              return (
                <div
                  key={note.id}
                  className="relative bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 transition-colors duration-150 hover:border-slate-300 sm:mr-7"
                >
                  {/* Timeline connector node on desktop */}
                  <div
                    aria-hidden="true"
                    className={`hidden sm:block absolute -right-[21px] top-4 w-2.5 h-2.5 rounded-full ring-4 ring-white ${
                      isUrgent
                        ? 'bg-rose-600'
                        : note.isPrivate
                        ? 'bg-slate-400'
                        : 'bg-[#005756]'
                    }`}
                  />

                  {/* Card Header: Author, Role, Date/Time & Quiet Metadata */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Calm Neutral Avatar */}
                      <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/70 flex items-center justify-center text-xs font-bold shrink-0">
                        {note.authorName ? note.authorName.charAt(0) : <User size={13} />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap text-xs">
                          <span className="font-bold text-slate-900">
                            {note.authorName}
                          </span>
                          {note.authorRole && (
                            <>
                              <span className="text-slate-300" aria-hidden="true">
                                ·
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {note.authorRole}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                          <Clock size={11} className="shrink-0" />
                          <span>{note.createdAt}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Metadata & Delete Action */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 shrink-0">
                      {/* Note Category Indicator */}
                      {isUrgent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50/80 text-rose-700 border border-rose-200/70 font-bold text-[11px]">
                          <AlertCircle size={11} className="shrink-0" />
                          <span>عاجلة</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium">
                          {getCategoryLabel(note.category)}
                        </span>
                      )}

                      <span className="text-slate-300" aria-hidden="true">
                        ·
                      </span>

                      {/* Privacy Status */}
                      {note.isPrivate ? (
                        <span className="inline-flex items-center gap-1 text-slate-600 font-semibold">
                          <Lock size={11} className="text-slate-400 shrink-0" />
                          <span>خاصة بيا</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#005756] font-semibold">
                          <Globe size={11} className="text-[#005756] shrink-0" />
                          <span>عامة للفريق</span>
                        </span>
                      )}

                      {/* Delete Control */}
                      {canDelete && (
                        <div className="flex items-center mr-1">
                          {deletingNoteId === note.id ? (
                            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md">
                              <span className="text-[10px] text-slate-700 font-semibold">
                                حذف؟
                              </span>
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
                                className="px-1.5 py-0.5 text-slate-600 hover:text-slate-900 rounded text-[10px] font-semibold cursor-pointer"
                              >
                                لا
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeletingNoteId(note.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
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

                  {/* Note Content (Direct readable prose, no box-inside-box) */}
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed font-sans whitespace-pre-wrap break-words">
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
