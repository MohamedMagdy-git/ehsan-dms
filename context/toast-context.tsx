'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ToastItem, ToastVariant, ToastViewport } from '@/components/common/toast-viewport';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

export type ToastInput = string | ToastOptions;

interface ToastContextValue {
  showToast: (input: ToastInput) => string;
  dismissToast: (id: string) => void;
  toast: {
    show: (input: ToastInput) => string;
    success: (title: string, options?: Omit<ToastOptions, 'title' | 'variant'>) => string;
    info: (title: string, options?: Omit<ToastOptions, 'title' | 'variant'>) => string;
    warning: (title: string, options?: Omit<ToastOptions, 'title' | 'variant'>) => string;
    error: (title: string, options?: Omit<ToastOptions, 'title' | 'variant'>) => string;
  };
}

const DEFAULT_DURATION_MS = 3800;
const MAX_VISIBLE_TOASTS = 3;

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback((input: ToastInput): string => {
    const normalized: ToastOptions =
      typeof input === 'string' ? { title: input } : input;

    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nextItem: ToastItem = {
      id,
      title: normalized.title,
      description: normalized.description,
      variant: normalized.variant ?? 'success',
      duration: normalized.duration ?? DEFAULT_DURATION_MS,
    };

    setToasts((prev) => {
      // Avoid stacking identical messages back-to-back
      const filtered = prev.filter((item) => item.title !== nextItem.title);
      return [...filtered, nextItem].slice(-MAX_VISIBLE_TOASTS);
    });

    return id;
  }, []);

  const toastHelpers = useMemo(
    () => ({
      show: showToast,
      success: (title: string, options?: Omit<ToastOptions, 'title' | 'variant'>) =>
        showToast({ ...options, title, variant: 'success' }),
      info: (title: string, options?: Omit<ToastOptions, 'title' | 'variant'>) =>
        showToast({ ...options, title, variant: 'info' }),
      warning: (title: string, options?: Omit<ToastOptions, 'title' | 'variant'>) =>
        showToast({ ...options, title, variant: 'warning' }),
      error: (title: string, options?: Omit<ToastOptions, 'title' | 'variant'>) =>
        showToast({ ...options, title, variant: 'error' }),
    }),
    [showToast]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      dismissToast,
      toast: toastHelpers,
    }),
    [showToast, dismissToast, toastHelpers]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
