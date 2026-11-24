'use client';

import React, { useMemo } from 'react';
import { RotateCcw, CheckCircle2 } from 'lucide-react';
import {
  SURVEY_SECTIONS,
  SurveyCompletenessResult,
  SurveyQuestionAnswerItem,
} from '@/lib/survey-completeness';

export type SurveyQAFilterMode = 'all' | 'missing';

interface CaseSurveyQAListProps {
  surveyComp: SurveyCompletenessResult;
  filterMode: SurveyQAFilterMode;
  onFilterModeChange: (mode: SurveyQAFilterMode) => void;
  onInsertMissingForReturn?: () => void;
}

export function CaseSurveyQAList({
  surveyComp,
  filterMode,
  onFilterModeChange,
  onInsertMissingForReturn,
}: CaseSurveyQAListProps) {
  const missingCount = surveyComp.missingItems.length;

  const groupedSections = useMemo(() => {
    const filtered =
      filterMode === 'missing'
        ? surveyComp.questions.filter((q) => q.isMissingRequired)
        : surveyComp.questions;

    return SURVEY_SECTIONS.map((sec) => ({
      ...sec,
      items: filtered.filter((q) => q.sectionId === sec.id),
    })).filter((sec) => sec.items.length > 0);
  }, [surveyComp.questions, filterMode]);

  const formatQuestionNumber = (num: number) => String(num).padStart(2, '0');

  return (
    <div className="space-y-4">
      {/* Top Flat Summary & Segmented Filter Strip (Zero Cards-Within-Cards) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 tabular-nums">
          <span className="font-semibold text-slate-800">
            مكتمل {surveyComp.completedFields} من {surveyComp.totalFields} سؤال
          </span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          {missingCount > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-semibold">
              {missingCount} غير مجاب
            </span>
          ) : (
            <span className="text-[#005756] font-semibold">كل الأسئلة الإلزامية مجابة</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Calm Segmented Control */}
          <div
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/80"
            role="tablist"
            aria-label="تصفية أسئلة الاستمارة"
          >
            <button
              type="button"
              role="tab"
              aria-selected={filterMode === 'all'}
              onClick={() => onFilterModeChange('all')}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                filterMode === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل ({surveyComp.totalFields})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterMode === 'missing'}
              onClick={() => onFilterModeChange('missing')}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                filterMode === 'missing'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : missingCount > 0
                  ? 'text-rose-700 hover:text-rose-800'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              غير مجاب فقط ({missingCount})
            </button>
          </div>

          {missingCount > 0 && onInsertMissingForReturn && (
            <button
              type="button"
              onClick={onInsertMissingForReturn}
              className="px-2.5 py-1.5 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw size={12} className="text-slate-400 shrink-0" />
              <span>إرجاع النواقص للباحث</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty state when filtering missing on a 100% complete survey */}
      {groupedSections.length === 0 ? (
        <div className="py-10 px-4 text-center border border-slate-200/80 rounded-xl bg-white space-y-2">
          <CheckCircle2 size={28} className="text-[#005756] mx-auto" />
          <p className="text-xs font-bold text-slate-800">
            كل الأسئلة الإلزامية مجابة بالكامل
          </p>
          <p className="text-[11px] text-slate-500">
            مفيش أي نواقص إلزامية في الاستمارة دي. تقدر تستعرض كل الإجابات من زر «الكل».
          </p>
          <button
            type="button"
            onClick={() => onFilterModeChange('all')}
            className="mt-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
          >
            عرض كل الأسئلة ({surveyComp.totalFields})
          </button>
        </div>
      ) : (
        /* Single flat bordered container — Zero Cards-Within-Cards */
        <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white">
          {groupedSections.map((section, sectionIdx) => (
            <div key={section.id}>
              {/* Section Divider Header */}
              <div
                className={`px-4 py-2.5 bg-slate-50/90 flex items-center justify-between gap-2 ${
                  sectionIdx > 0 ? 'border-t border-slate-200/80' : ''
                } border-b border-slate-200/80`}
              >
                <h4 className="text-xs font-bold text-slate-800">{section.title}</h4>
                <span className="text-[11px] text-slate-400 font-medium tabular-nums whitespace-nowrap">
                  {section.items.length === 1
                    ? 'سؤال واحد'
                    : section.items.length === 2
                    ? 'سؤالان'
                    : `${section.items.length} أسئلة`}
                </span>
              </div>

              {/* Flat Divide-Y Rows */}
              <div className="divide-y divide-slate-200/80 bg-white">
                {section.items.map((item: SurveyQuestionAnswerItem) => (
                  <div
                    key={item.key}
                    className={`px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-4 transition-colors ${
                      item.isMissingRequired ? 'bg-rose-50/25' : 'bg-white'
                    }`}
                  >
                    {/* Question Column */}
                    <div className="sm:w-[44%] shrink-0 flex items-start gap-2.5 min-w-0">
                      <span
                        className={`font-mono text-[11px] font-semibold tabular-nums pt-0.5 w-6 shrink-0 ${
                          item.isMissingRequired ? 'text-rose-700' : 'text-slate-400'
                        }`}
                      >
                        {formatQuestionNumber(item.number)}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-800 leading-relaxed block">
                          {item.question}
                        </span>
                        {item.isOptional && (
                          <span className="text-[11px] text-slate-400 font-normal block mt-0.5">
                            سؤال اختياري
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Answer Column */}
                    <div className="flex-1 min-w-0 pr-8 sm:pr-0">
                      {item.isMissingRequired ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-semibold">
                          غير مجاب
                        </span>
                      ) : item.isOptional && !item.hasValue ? (
                        <span className="text-xs text-slate-400 font-normal">
                          لم يُضف (اختياري)
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-800 leading-relaxed whitespace-pre-line break-words">
                            {item.answerText}
                          </p>
                          {item.answerDetail && (
                            <p className="text-[11px] text-slate-500 leading-relaxed whitespace-pre-line break-words">
                              {item.answerDetail}
                            </p>
                          )}
                          {item.subItems && item.subItems.length > 0 && (
                            <ul className="pt-1 space-y-1 text-[11px] text-slate-600">
                              {item.subItems.map((sub, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-1.5 leading-relaxed break-words"
                                >
                                  <span className="text-slate-300 select-none" aria-hidden="true">
                                    ·
                                  </span>
                                  <span>{sub}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
