'use client';

import React from 'react';
import { useApp } from '@/context/app-context';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Zap,
  HeartHandshake,
} from 'lucide-react';

export function MobileBottomNav() {
  const {
    activeSection,
    setActiveSection,
    currentSessionProfile,
    fastTrackOrders,
  } = useApp();

  const isDonorPortal = activeSection === 'donor-portal';
  if (isDonorPortal) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const pendingFastTrackCount = fastTrackOrders?.filter(
    (o) => o.status === 'pending_delivery'
  ).length ?? 0;

  const navItems = [
    {
      id: 'dashboard',
      label: 'الرئيسية',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'cases',
      label: 'المستحقين',
      icon: Users,
      badge: null,
    },
    {
      id: 'fast-track',
      label: 'الصرف الفوري',
      icon: Zap,
      badge: pendingFastTrackCount > 0 ? pendingFastTrackCount : null,
      badgeUrgent: true,
    },
    {
      id: 'research',
      label: 'البحث الميداني',
      icon: ClipboardList,
      badge: null,
    },
    {
      id: 'donations',
      label: 'التبرعات',
      icon: HeartHandshake,
      badge: null,
    },
  ];

  // Filter items allowed for the current session profile
  const allowedItems = navItems.filter((item) =>
    currentSessionProfile?.allowedTabs ? currentSessionProfile.allowedTabs.includes(item.id) : true
  );

  return (
    <nav
      aria-label="شريط التنقل السريع للهاتف"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] pb-[max(0.4rem,env(safe-area-inset-bottom,0px))] transition-all"
    >
      <div className="grid grid-cols-5 items-center h-14 px-1 max-w-lg mx-auto">
        {allowedItems.map((item) => {
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
                {item.badge && (
                  <span className="absolute -top-1.5 -left-2 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center bg-rose-600 text-white shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[62px]">
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
