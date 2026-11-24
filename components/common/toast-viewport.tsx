'use client';

import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Info, AlertTriangle, AlertCircle, X, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'info' | 'warning' | 'error';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
  action?: ToastAction;
}

interface ToastCardProps {
  item: ToastItem;
  onDismiss: (id: string) => void;
}

const VARIANT_META: Record<
  ToastVariant,
  {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    iconWrapClass: string;
    iconClass: string;
    role: 'status' | 'alert';
  }
> = {
  success: {
    icon: CheckCircle2,
    iconWrapClass: 'bg-[#005756]/10',
    iconClass: 'text-[#005756]',
    role: 'status',
  },
  info: {
    icon: Info,
    iconWrapClass: 'bg-slate-100',
    iconClass: 'text-slate-600',
    role: 'status',
  },
  warning: {
    icon: AlertTriangle,
    iconWrapClass: 'bg-amber-50',
    iconClass: 'text-amber-600',
    role: 'status',
  },
  error: {
    icon: AlertCircle,
    iconWrapClass: 'bg-rose-50',
    iconClass: 'text-rose-600',
    role: 'alert',
  },
};

function ToastCard({ item, onDismiss }: ToastCardProps) {
  const remainingRef = useRef<number>(item.duration);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      onDismiss(item.id);
    }, remainingRef.current);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [item.id, onDismiss]);

  const handleMouseEnter = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const elapsed = Date.now() - startedAtRef.current;
    remainingRef.current = Math.max(500, remainingRef.current - elapsed);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) return;
    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      onDismiss(item.id);
    }, remainingRef.current);
  };

  const meta = VARIANT_META[item.variant];
  const Icon = meta.icon;

  return (
    <motion.div
      layout
      role={meta.role}
      aria-live={item.variant === 'error' ? 'assertive' : 'polite'}
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="pointer-events-auto w-full bg-white border border-slate-200/90 rounded-xl shadow-lg px-3.5 py-3 flex items-start gap-3 text-right"
    >
      <span
        className={cn(
          'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
          meta.iconWrapClass
        )}
      >
        <Icon size={16} className={meta.iconClass} />
      </span>

      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-xs sm:text-[13px] font-semibold text-slate-800 leading-snug">
          {item.title}
        </p>
        {item.description && (
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            {item.description}
          </p>
        )}
        {item.action && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => {
                item.action?.onClick();
                onDismiss(item.id);
              }}
              className="inline-flex items-center gap-1.5 min-h-[34px] px-3 py-1.5 rounded-lg bg-[#005756]/10 hover:bg-[#005756]/15 active:scale-[0.98] text-[#005756] text-xs font-semibold transition-all cursor-pointer"
            >
              <span>{item.action.label}</span>
              <ArrowLeft size={13} className="shrink-0" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="إغلاق التنبيه"
        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

interface ToastViewportProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return (
    <div
      dir="rtl"
      aria-label="الإشعارات السريعة"
      className="fixed top-4 left-4 right-4 sm:right-auto sm:w-[380px] z-[110] flex flex-col gap-2 pointer-events-none"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
