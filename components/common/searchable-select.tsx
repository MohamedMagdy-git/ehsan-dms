'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizeLocationSearch } from '@/lib/egypt-locations';

export interface SearchableSelectOption {
  value: string;
  label: string;
  secondaryLabel?: string;
  keywords?: string;
}

export interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  allowCustom?: boolean;
  customHintLabel?: string;
  disabled?: boolean;
  required?: boolean;
  clearable?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'اختر من القائمة...',
  searchPlaceholder = 'ابحث بالاسم...',
  emptyMessage = 'لا توجد نتائج مطابقة',
  allowCustom = false,
  customHintLabel = 'إضافة واختيار',
  disabled = false,
  required = false,
  clearable = false,
  className,
  ariaLabel,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [openUpward, setOpenUpward] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const displayLabel = selectedOption?.label || value;

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeLocationSearch(query);
    if (!normalizedQuery) return options;

    return options.filter((opt) => {
      const haystack = normalizeLocationSearch(
        `${opt.label} ${opt.secondaryLabel ?? ''} ${opt.keywords ?? ''}`
      );
      return haystack.includes(normalizedQuery);
    });
  }, [options, query]);

  const trimmedQuery = query.trim();
  const hasExactMatch = useMemo(() => {
    if (!trimmedQuery) return true;
    const normalizedQuery = normalizeLocationSearch(trimmedQuery);
    return options.some(
      (opt) =>
        normalizeLocationSearch(opt.label) === normalizedQuery ||
        normalizeLocationSearch(opt.value) === normalizedQuery
    );
  }, [options, trimmedQuery]);

  const showCustomOption = allowCustom && trimmedQuery.length > 0 && !hasExactMatch;

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenUpward(spaceBelow < 260 && spaceAbove > spaceBelow);
    }
    setIsOpen((prev) => {
      if (prev) setQuery('');
      return !prev;
    });
  };

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
    setQuery('');
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredOptions.length === 1) {
        handleSelect(filteredOptions[0].value);
      } else if (showCustomOption) {
        handleSelect(trimmedQuery);
      } else if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[0].value);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
      setQuery('');
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Hidden input keeps native form required validation aligned */}
      {required && (
        <input
          type="text"
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value}
          onChange={() => {}}
          className="sr-only pointer-events-none"
        />
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className={cn(
          'w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer text-right',
          'focus:outline-hidden focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15',
          'disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed',
          isOpen && 'border-[#005756] ring-2 ring-[#005756]/15',
          displayLabel ? 'text-slate-800' : 'text-slate-400'
        )}
      >
        <span className="truncate flex-1">{displayLabel || placeholder}</span>

        <span className="flex items-center gap-1 shrink-0">
          {clearable && value && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="مسح الاختيار"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={15}
            className={cn(
              'text-slate-400 transition-transform duration-150',
              isOpen && 'rotate-180 text-[#005756]'
            )}
          />
        </span>
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute z-50 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in duration-100',
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          )}
        >
          {/* Sticky Search Bar */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center h-9 px-2.5 bg-white border border-slate-200 rounded-lg gap-2 focus-within:border-[#005756] focus-within:ring-1 focus-within:ring-[#005756]/20 transition-colors">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                className="w-full h-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                  aria-label="مسح البحث"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div role="listbox" className="max-h-52 overflow-y-auto p-1.5 space-y-0.5">
            {showCustomOption && (
              <button
                type="button"
                onClick={() => handleSelect(trimmedQuery)}
                className="w-full px-2.5 py-2 rounded-lg text-xs text-right flex items-center gap-2 bg-[#005756]/8 text-[#005756] hover:bg-[#005756]/15 font-bold transition-colors cursor-pointer"
              >
                <Plus size={14} className="shrink-0" />
                <span className="truncate">
                  {customHintLabel}: «{trimmedQuery}»
                </span>
              </button>
            )}

            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      'w-full px-2.5 py-2 rounded-lg text-xs text-right flex items-center justify-between gap-2 transition-colors cursor-pointer',
                      isSelected
                        ? 'bg-[#005756]/10 text-[#005756] font-bold'
                        : 'text-slate-700 hover:bg-slate-50 font-medium'
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check size={14} className="text-[#005756] shrink-0" />}
                  </button>
                );
              })
            ) : !showCustomOption ? (
              <div className="px-3 py-5 text-center text-[11px] text-slate-400">
                {emptyMessage}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
