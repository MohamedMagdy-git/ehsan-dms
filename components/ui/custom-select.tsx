'use client';

import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CustomSelectOption {
  label: string;
  value: string;
  disabled?: boolean;
  group?: string;
  isAction?: boolean;
}

export interface CustomSelectProps {
  options: CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  triggerClassName?: string;
  size?: 'sm' | 'md';
  prefix?: React.ReactNode;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
  menuMinWidth?: number;
}

interface FloatingPosition {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  minWidth: number;
  maxWidth: number;
  openUpward: boolean;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'اختر من القائمة...',
  label,
  className = '',
  triggerClassName = '',
  size = 'md',
  prefix,
  disabled = false,
  id,
  ariaLabel,
  menuMinWidth,
}: CustomSelectProps) {
  const generatedId = useId();
  const triggerId = id || generatedId;
  const listboxId = `${triggerId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<FloatingPosition>({
    top: 0,
    right: 0,
    minWidth: 0,
    maxWidth: 320,
    openUpward: false,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const selectedOption = options.find((opt) => opt.value === value && !opt.isAction);

  const computePosition = useCallback((): FloatingPosition | null => {
    if (!triggerRef.current || typeof window === 'undefined') return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportPadding = 12;
    const estimatedMenuHeight = Math.min(options.length * 40 + 24, 272);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow;

    const desiredMinWidth = Math.max(rect.width, menuMinWidth ?? 0);
    const maxViewportWidth = Math.max(160, window.innerWidth - viewportPadding * 2);
    const availableFromRightAnchor = rect.right - viewportPadding;
    const availableFromLeftAnchor = window.innerWidth - rect.left - viewportPadding;

    // Default RTL alignment anchors to trigger's right edge; flip to left anchor only if near left viewport edge
    const anchorToLeft =
      availableFromRightAnchor < Math.min(desiredMinWidth, 220) &&
      availableFromLeftAnchor > availableFromRightAnchor;

    const horizontal: Pick<FloatingPosition, 'left' | 'right' | 'minWidth' | 'maxWidth'> =
      anchorToLeft
        ? {
            left: Math.max(viewportPadding, rect.left),
            minWidth: Math.min(desiredMinWidth, availableFromLeftAnchor),
            maxWidth: Math.min(Math.max(rect.width, 360), availableFromLeftAnchor, maxViewportWidth),
          }
        : {
            right: Math.max(viewportPadding, window.innerWidth - rect.right),
            minWidth: Math.min(desiredMinWidth, availableFromRightAnchor),
            maxWidth: Math.min(Math.max(rect.width, 360), availableFromRightAnchor, maxViewportWidth),
          };

    if (openUpward) {
      return {
        bottom: window.innerHeight - rect.top + 6,
        ...horizontal,
        openUpward: true,
      };
    }

    return {
      top: rect.bottom + 6,
      ...horizontal,
      openUpward: false,
    };
  }, [options.length, menuMinWidth]);

  const handleToggle = () => {
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    const nextPos = computePosition();
    if (nextPos) {
      setPosition(nextPos);
    }
    setIsOpen(true);
  };

  const handleSelect = (option: CustomSelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  // Click Outside, Escape key, and scroll/resize repositioning
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleReposition = () => {
      const nextPos = computePosition();
      if (nextPos) {
        setPosition(nextPos);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, computePosition]);

  const menuContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          id={listboxId}
          role="listbox"
          aria-labelledby={triggerId}
          dir="rtl"
          initial={
            prefersReducedMotion
              ? { opacity: 1 }
              : { opacity: 0, y: position.openUpward ? 4 : -4, scale: 0.99 }
          }
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={
            prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, y: position.openUpward ? 4 : -4, scale: 0.99 }
          }
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.14, ease: 'easeOut' }
          }
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: position.top,
            bottom: position.bottom,
            left: position.left,
            right: position.right,
            minWidth: position.minWidth,
            maxWidth: position.maxWidth,
            transformOrigin: position.openUpward ? 'bottom center' : 'top center',
          }}
          className="z-[90] bg-white border border-slate-200/80 shadow-lg shadow-slate-900/10 rounded-xl p-1.5 max-h-64 overflow-y-auto"
        >
          <div className="space-y-0.5">
            {options.map((option, idx) => {
              const isSelected = !option.isAction && option.value === value;
              const prevGroup = idx > 0 ? options[idx - 1].group : undefined;
              const showGroupHeader = Boolean(option.group && option.group !== prevGroup);
              const showActionDivider = Boolean(option.isAction && idx > 0);

              return (
                <React.Fragment key={`${option.value}-${idx}`}>
                  {showGroupHeader && (
                    <div
                      className={cn(
                        'px-3 pb-1 text-[11px] font-semibold text-slate-400 select-none',
                        idx > 0 ? 'pt-2 mt-1 border-t border-slate-100' : 'pt-1'
                      )}
                    >
                      {option.group}
                    </div>
                  )}
                  {showActionDivider && !showGroupHeader && (
                    <div className="my-1 border-t border-slate-100" />
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    onClick={() => handleSelect(option)}
                    className={cn(
                      'w-full flex items-center justify-between gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm transition-colors text-right',
                      option.disabled
                        ? 'text-slate-300 cursor-not-allowed'
                        : option.isAction
                        ? 'text-[#005756] font-semibold hover:bg-[#005756]/8 cursor-pointer'
                        : isSelected
                        ? 'bg-[#005756]/10 text-[#005756] font-medium cursor-pointer'
                        : 'text-slate-700 hover:bg-slate-50 font-normal cursor-pointer'
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && (
                      <Check size={15} className="text-[#005756] shrink-0" />
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label
          htmlFor={triggerId}
          className="text-slate-700 font-semibold block mb-1.5"
        >
          {label}
        </label>
      )}

      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          'w-full flex items-center justify-between gap-2 bg-white border rounded-xl text-right transition-colors focus:outline-none focus:border-[#005756] focus:ring-2 focus:ring-[#005756]/15',
          size === 'sm' ? 'h-9 px-3 text-xs' : 'min-h-[40px] px-3 py-2 text-xs sm:text-sm',
          disabled
            ? 'bg-slate-50 text-slate-400 border-slate-200/70 cursor-not-allowed'
            : isOpen
            ? 'border-[#005756] ring-2 ring-[#005756]/15 text-slate-900 cursor-pointer'
            : 'border-slate-200 hover:border-slate-300 text-slate-900 cursor-pointer',
          triggerClassName
        )}
      >
        <span className="flex items-center gap-1.5 min-w-0 flex-1">
          {prefix && <span className="shrink-0 flex items-center gap-1.5">{prefix}</span>}
          <span
            className={cn(
              'truncate',
              selectedOption ? 'text-slate-800' : 'text-slate-400'
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          size={size === 'sm' ? 14 : 16}
          className={cn(
            'shrink-0 transition-transform duration-200',
            isOpen ? 'rotate-180 text-[#005756]' : 'text-slate-400'
          )}
        />
      </button>

      {typeof document !== 'undefined' && createPortal(menuContent, document.body)}
    </div>
  );
}
