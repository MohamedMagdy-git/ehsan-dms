'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import { UserCheck, Plus, Check, X, UserPlus, AlertCircle } from 'lucide-react';

export interface ResearcherSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  helperText?: string;
}

export function ResearcherSelect({
  value,
  onChange,
  label = 'الباحث الميداني المسؤول',
  required = false,
  disabled = false,
  className = '',
  placeholder = 'اختر الباحث الميداني المسؤول...',
  helperText,
}: ResearcherSelectProps) {
  const { researchers, addCustomResearcher } = useApp();

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newResearcherName, setNewResearcherName] = useState('');
  const [inputError, setInputError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Combine researchers with current value if it's not present (prevents losing historical names)
  const allResearchers = useMemo(() => {
    const list = [...researchers];
    if (value && value.trim() && !list.includes(value.trim())) {
      list.unshift(value.trim());
    }
    return list;
  }, [researchers, value]);

  useEffect(() => {
    if (isAddingNew && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingNew]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === '__ADD_NEW__') {
      setIsAddingNew(true);
      setNewResearcherName('');
      setInputError('');
    } else {
      onChange(selected);
    }
  };

  const handleConfirmNew = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newResearcherName.trim();
    if (!trimmed) {
      setInputError('يرجى كتابة اسم الباحث الميداني');
      return;
    }
    if (trimmed.length < 3) {
      setInputError('اسم الباحث يجب أن يتكون من 3 أحرف على الأقل');
      return;
    }

    addCustomResearcher(trimmed);
    onChange(trimmed);
    setIsAddingNew(false);
    setNewResearcherName('');
    setInputError('');
  };

  const handleCancelNew = () => {
    setIsAddingNew(false);
    setNewResearcherName('');
    setInputError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmNew();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelNew();
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
            <UserCheck size={14} className="text-teal-700 shrink-0" />
            <span>{label}</span>
            {required && <span className="text-rose-600">*</span>}
          </label>

          {!isAddingNew && !disabled && (
            <button
              type="button"
              onClick={() => {
                setIsAddingNew(true);
                setNewResearcherName('');
                setInputError('');
              }}
              className="text-[11px] font-bold text-teal-800 hover:text-teal-950 flex items-center gap-1 cursor-pointer transition-colors"
              title="إضافة باحث جديد للقائمة"
            >
              <Plus size={12} />
              <span>باحث جديد</span>
            </button>
          )}
        </div>
      )}

      {isAddingNew ? (
        /* Inline New Researcher Input Mode */
        <div className="space-y-1 animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={newResearcherName}
                onChange={(e) => {
                  setNewResearcherName(e.target.value);
                  if (inputError) setInputError('');
                }}
                onKeyDown={handleKeyDown}
                placeholder="اكتب اسم الباحث الجديد (مثال: أ. أحمد صلاح)..."
                className={`w-full p-2.5 text-xs bg-white border rounded-lg focus:ring-2 focus:ring-teal-600 focus:outline-hidden transition-all ${
                  inputError
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                    : 'border-teal-400 focus:border-teal-600'
                }`}
              />
            </div>

            <button
              type="button"
              onClick={() => handleConfirmNew()}
              className="px-3 py-2 bg-teal-800 hover:bg-teal-900 active:bg-teal-950 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs shrink-0 cursor-pointer"
              title="تأكيد إضافة الباحث"
            >
              <Check size={14} />
              <span className="hidden sm:inline">حفظ</span>
            </button>

            <button
              type="button"
              onClick={handleCancelNew}
              className="px-2.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer"
              title="إلغاء والعودة للقائمة"
            >
              <X size={14} />
            </button>
          </div>

          {inputError ? (
            <p className="text-[11px] text-rose-600 flex items-center gap-1 font-medium">
              <AlertCircle size={11} className="shrink-0" />
              <span>{inputError}</span>
            </p>
          ) : (
            <p className="text-[10px] text-slate-500">
              اضغط Enter للحفظ السريع أو Esc للإلغاء
            </p>
          )}
        </div>
      ) : (
        /* Standard Dropdown Selection Mode */
        <div className="relative">
          <select
            value={value}
            onChange={handleSelectChange}
            disabled={disabled}
            required={required}
            className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-600 focus:outline-hidden font-medium text-slate-800 transition-colors disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
          >
            <option value="" disabled={required}>
              {placeholder}
            </option>

            <optgroup label="الباحثون الميدانيون المعتمدون">
              {allResearchers.map((researcher) => (
                <option key={researcher} value={researcher}>
                  {researcher}
                </option>
              ))}
            </optgroup>

            <option
              value="__ADD_NEW__"
              className="font-bold text-teal-800 bg-teal-50/80 py-1"
            >
              ➕ إضافة باحث ميداني جديد...
            </option>
          </select>
        </div>
      )}

      {helperText && !isAddingNew && (
        <p className="text-[11px] text-slate-500">{helperText}</p>
      )}
    </div>
  );
}
