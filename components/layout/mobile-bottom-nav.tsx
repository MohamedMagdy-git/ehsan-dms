'use client';

import React from 'react';
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
      badgeUrgent: true,
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

  return (
    <nav
      aria-label="شريط التنقل السريع للهاتف"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] pb-[max(0.4rem,env(safe-area-inset-bottom,0px))] transition-all"
    >
      <div className="grid grid-cols-5 items-center h-14 px-1 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className={`relative flex flex-col items-center justify-center h-full min-h-[44px] py-1 cursor-pointer transition-all duration-150 active:scale-[0.92] select-none ${
                isActive
                  ? 'text-[#005756] font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className="relative">
                <Icon
                  size={20}
                  className={`transition-transform duration-150 ${
                    isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'
                  }`}
                />
                {item.badge !== null && (
                  <span className="absolute -top-1.5 -left-2 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center bg-rose-600 text-white shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-semibold whitespace-nowrap mt-0.5">
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#005756]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
