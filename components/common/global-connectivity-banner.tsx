'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useApp } from '@/context/app-context';
import { WifiOff, CloudUpload } from 'lucide-react';

export function GlobalConnectivityBanner() {
  const { isOnline, mounted, syncQueueCount, refreshQueueCount } = useOnlineStatus();
  const { isFieldSurveyModalOpen, triggerSync, isSyncing } = useApp();
  const [showRestored, setShowRestored] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const restoreTimerRef = useRef<NodeJS.Timeout | null>(null);
  const collapseTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setShowRestored(true);
      setIsCollapsed(false);
      refreshQueueCount();

      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = null;
      }

      if (restoreTimerRef.current) {
        clearTimeout(restoreTimerRef.current);
      }
      // Flash green and fade out after 2 seconds as requested
      restoreTimerRef.current = setTimeout(() => {
        setShowRestored(false);
        restoreTimerRef.current = null;
      }, 2000);
    };

    const handleOffline = () => {
      if (restoreTimerRef.current) {
        clearTimeout(restoreTimerRef.current);
        restoreTimerRef.current = null;
      }
      setShowRestored(false);
      setIsCollapsed(false);

      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
      // Auto-collapse to micro-island after 3 seconds of being offline
      collapseTimerRef.current = setTimeout(() => {
        setIsCollapsed(true);
      }, 3000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // If starting in offline mode, collapse after initial 3 seconds
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      collapseTimerRef.current = setTimeout(() => {
        setIsCollapsed(true);
      }, 3000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current);
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, [refreshQueueCount]);

  if (!mounted || isFieldSurveyModalOpen) {
    return null;
  }

  const isOffline = !isOnline;
  const isShowingRestored = isOnline && showRestored;

  if (!isOffline && !isShowingRestored) {
    return null;
  }

  const toggleExpanded = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = setTimeout(() => {
        setIsCollapsed(true);
      }, 3000);
    } else {
      setIsCollapsed(true);
    }
  };

  return (
    <div className="fixed top-2.5 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center pointer-events-none select-none max-w-fit">
      <AnimatePresence mode="wait">
        {isOffline && (
          <motion.div
            key="offline-island"
            layout
            initial={{ y: -30, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -30, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            onClick={toggleExpanded}
            role="status"
            aria-live="polite"
            title={isCollapsed ? 'وضع العمل بدون اتصال - انقر للتفاصيل' : 'انقر لتصغير الإشعار'}
            className="pointer-events-auto rounded-full bg-slate-950/92 text-white shadow-xl shadow-slate-950/25 backdrop-blur-md border border-white/10 px-3 py-1 text-xs font-medium transition-all duration-300 ease-out flex items-center gap-2 cursor-pointer hover:bg-slate-900 active:scale-95"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
            <WifiOff size={13} className="text-amber-400 shrink-0" />

            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.span
                  key="offline-text"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden whitespace-nowrap text-[11px] text-amber-200/90 font-medium tracking-tight"
                >
                  أوفلاين (حفظ محلي)
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {isShowingRestored && (
          <motion.div
            key="restored-island"
            layout
            initial={{ y: -30, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -30, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            role="status"
            aria-live="polite"
            className="pointer-events-auto rounded-full bg-slate-950/92 text-white shadow-xl shadow-emerald-950/30 backdrop-blur-md border border-emerald-400/20 px-3 py-1 text-xs font-medium transition-all duration-300 ease-out flex items-center gap-2"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-[11px] text-emerald-300 font-semibold tracking-tight whitespace-nowrap">
              متصل
            </span>

            {syncQueueCount > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerSync();
                }}
                disabled={isSyncing}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-[10px] font-bold border border-emerald-400/30 transition-all active:scale-95 cursor-pointer ml-0.5"
                title="مزامنة الاستمارات المسجلة محلياً"
              >
                <CloudUpload size={11} className={isSyncing ? 'animate-bounce text-emerald-300' : 'text-emerald-300'} />
                <span>{isSyncing ? 'جاري...' : `مزامنة (${syncQueueCount})`}</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
