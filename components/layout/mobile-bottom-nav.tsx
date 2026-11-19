'use client';

import React from 'react';
import { motion, LayoutGroup, useReducedMotion } from 'motion/react';
import { useApp } from '@/context/app-context';
import {
  LayoutGrid,
  ClipboardList,
  ShieldCheck,
  Wallet,
  FileSpreadsheet,
} from 'lucide-react';

export function MobileBottomNav() {
  const {
    activeSection,
    setActiveSection,
    cases,
  } = useApp();

  const prefersReducedMotion = useReducedMotion();

  const isDonorPortal = activeSection === 'donor-portal';
  if (isDonorPortal) return null;

  const pendingReviewCount =
    cases?.filter((c) => c.status === 'pending_review').length ?? 0;

  const navItems = [
    {
      id: 'dashboard',
      label: 'الرئيسية',
      icon: LayoutGrid,
      badge: null,
    },
    {
      id: 'research',
      label: 'بحث الحالة',
      icon: ClipboardList,
      badge: null,
    },
    {
      id: 'cases-review',
      label: 'الاعتماد',
      icon: ShieldCheck,
      badge: pendingReviewCount > 0 ? pendingReviewCount : null,
    },
    {
      id: 'allocation',
      label: 'الميزانية',
      icon: Wallet,
      badge: null,
    },
    {
      id: 'reports',
      label: 'التقارير',
      icon: FileSpreadsheet,
      badge: null,
    },
  ];

  const indicatorTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 380, damping: 32 };

  const tapTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 600, damping: 30, mass: 0.5 };

  return (
    <nav
      aria-label="شريط التنقل السريع للهاتف"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/80 backdrop-blur-lg border-t border-slate-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.03)] pb-[max(0.45rem,env(safe-area-inset-bottom,0px))]"
    >
      <LayoutGroup id="mobile-bottom-nav">
        <div className="grid grid-cols-5 items-center h-[60px] px-1.5 max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <motion.button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setActiveSection(item.id)}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
                transition={tapTransition}
                className={`relative flex flex-col items-center justify-center h-full min-h-[44px] py-1.5 px-1 cursor-pointer select-none transition-colors duration-150 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#005756]/30 rounded-2xl ${
                  isActive
                    ? 'text-[#005756]'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeMobileNavIndicator"
                    initial={false}
                    transition={indicatorTransition}
                    className="pointer-events-none absolute inset-x-1 inset-y-1.5 rounded-2xl bg-[#005756]/10 border border-[#005756]/15"
                    aria-hidden="true"
                  />
                )}
                <div className="relative z-10 flex flex-col items-center justify-center">
                  <div className="relative">
                    <Icon
                      size={20}
                      className={`transition-colors duration-150 ${
                        isActive ? 'stroke-[2.25]' : 'stroke-[1.75]'
                      }`}
                    />
                    {item.badge !== null && (
                      <span className="absolute -top-1.5 -left-2 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold tabular-nums flex items-center justify-center bg-rose-600 text-white">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[11px] whitespace-nowrap mt-0.5 leading-tight transition-colors duration-150 ${
                      isActive ? 'font-semibold' : 'font-medium'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </LayoutGroup>
    </nav>
  );
}
