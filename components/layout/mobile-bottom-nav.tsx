'use client';

import React from 'react';
import { motion, LayoutGroup, useReducedMotion } from 'motion/react';
import { useApp } from '@/context/app-context';
import { useAuth } from '@/context/auth-context';
import { useScopedData } from '@/hooks/use-scoped-data';
import {
  LayoutGrid,
  ClipboardList,
  ShieldCheck,
  Wallet,
  FileSpreadsheet,
  FilePlus2,
} from 'lucide-react';

interface MobileNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge: number | null;
  isUrgentBadge?: boolean;
  onPress?: () => void;
}

export function MobileBottomNav() {
  const { activeSection, setActiveSection, cases, openFieldSurvey } = useApp();
  const { user } = useAuth();
  const { isResearcherPOV, researcherMetrics } = useScopedData();

  const prefersReducedMotion = useReducedMotion();

  const isDonorPortal = activeSection === 'donor-portal';
  if (isDonorPortal) return null;

  const pendingReviewCount =
    cases?.filter((c) => c.status === 'pending_review').length ?? 0;

  const adminNavItems: MobileNavItem[] = [
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
      isUrgentBadge: true,
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

  const researcherUrgentVisits =
    researcherMetrics.needsRevisionCount + researcherMetrics.overdueVisitsCount;

  const researcherNavItems: MobileNavItem[] = [
    {
      id: 'dashboard',
      label: 'الرئيسية',
      icon: LayoutGrid,
      badge: null,
    },
    {
      id: 'research',
      label: 'حالاتي وزياراتي',
      icon: ClipboardList,
      badge:
        researcherMetrics.awaitingVisitCount > 0
          ? researcherMetrics.awaitingVisitCount
          : null,
      isUrgentBadge: researcherUrgentVisits > 0,
    },
    {
      id: 'survey-action',
      label: 'استمارة بحث',
      icon: FilePlus2,
      badge: null,
      onPress: () => openFieldSurvey(),
    },
    {
      id: 'my-custody',
      label: 'عهدتي',
      icon: Wallet,
      badge:
        researcherMetrics.approvedReadyForDeliveryCount > 0
          ? researcherMetrics.approvedReadyForDeliveryCount
          : null,
      isUrgentBadge: false,
    },
  ];

  const navItems = isResearcherPOV ? researcherNavItems : adminNavItems;

  const indicatorTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 380, damping: 32 };

  const tapTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 600, damping: 30, mass: 0.5 };

  return (
    <nav
      aria-label="شريط التنقل السريع للهاتف"
      className="md:hidden fixed bottom-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] inset-x-4 max-w-md mx-auto z-40 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] p-1.5"
    >
      <LayoutGroup id={`mobile-bottom-nav-${user.role}`}>
        <div
          className={`grid items-center gap-1 ${
            isResearcherPOV ? 'grid-cols-4' : 'grid-cols-5'
          }`}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActionItem = Boolean(item.onPress);
            const isActive = !isActionItem && activeSection === item.id;
            return (
              <motion.button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  if (item.onPress) {
                    item.onPress();
                  } else {
                    setActiveSection(item.id);
                  }
                }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.93 }}
                transition={tapTransition}
                className={`relative flex flex-col items-center justify-center h-[52px] min-h-[44px] py-1 px-1 rounded-xl cursor-pointer select-none transition-colors duration-200 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#005756]/30 ${
                  isActive
                    ? 'text-[#005756]'
                    : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-800'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeMobileNavIndicator"
                    initial={false}
                    transition={indicatorTransition}
                    className="pointer-events-none absolute inset-0 rounded-xl bg-[#005756]/10 border border-[#005756]/15"
                    aria-hidden="true"
                  />
                )}
                <div className="relative z-10 flex flex-col items-center justify-center transition-all duration-200">
                  <div className="relative">
                    <Icon
                      size={19}
                      className={`transition-colors duration-200 ${
                        isActive ? 'stroke-[2.25]' : 'stroke-[1.75]'
                      }`}
                    />
                    {item.badge !== null && (
                      <span
                        className={`absolute -top-1.5 -left-2.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold tabular-nums flex items-center justify-center ring-2 ring-white ${
                          item.isUrgentBadge
                            ? 'bg-rose-600 text-white'
                            : 'bg-[#005756] text-white'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10.5px] whitespace-nowrap mt-1 leading-none transition-colors duration-200 ${
                      isActive ? 'font-bold' : 'font-medium'
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
