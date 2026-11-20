'use client';

import React from 'react';
import { useApp } from '@/context/app-context';
import { Menu, Plus } from 'lucide-react';
import { AppUserRole } from '@/types';
import { NetworkStatusBadge } from '@/components/common/network-status-badge';
import { getSectionMeta } from '@/lib/navigation-config';

interface HeaderUser {
  name: string;
  role: string;
  roleKey: AppUserRole;
  avatarInitial: string;
}

const DEFAULT_EXECUTIVE_USER: HeaderUser = {
  name: 'أحمد الجزار',
  role: 'مدير المنظومة',
  roleKey: 'admin',
  avatarInitial: 'أ',
};

interface HeaderProps {
  onOpenMobile: () => void;
  onOpenNewCase: () => void;
  onOpenNewDonation: () => void;
  title?: string;
  subtitle?: string;
}

export function Header({
  onOpenMobile,
  onOpenNewCase,
  onOpenNewDonation,
  title,
  subtitle,
}: HeaderProps) {
  const {
    activeSection,
    currentUserRole,
    currentSessionProfile,
    triggerSync,
    isSyncing,
  } = useApp();

  // كائن مستخدم جاهز للتوسع المستقبلي (يدعم التبديل الديناميكي لمنظور الباحث لاحقاً دون إعادة بناء الواجهة)
  const currentUser: HeaderUser =
    currentUserRole === 'admin'
      ? DEFAULT_EXECUTIVE_USER
      : {
          name: currentSessionProfile.name,
          role: currentSessionProfile.badgeLabel,
          roleKey: currentUserRole,
          avatarInitial:
            currentSessionProfile.avatarInitial ||
            currentSessionProfile.name.charAt(0),
        };

  const sectionMeta = getSectionMeta(activeSection);
  const desktopTitle = title || sectionMeta.headerTitle;
  const desktopSubtitle = subtitle || sectionMeta.headerDescription;
  const mobileTitle = sectionMeta.mobileTitle || desktopTitle;

  return (
    <header className="h-[calc(3.75rem+env(safe-area-inset-top,0px))] md:h-16 pt-[env(safe-area-inset-top,0px)] md:pt-0 md:py-0 backdrop-blur-md bg-white/90 border-b border-slate-200/70 px-3 sm:px-4 lg:px-8 flex items-center justify-between gap-2.5 sm:gap-4 sticky top-0 z-30 shadow-xs shadow-slate-900/[0.03] transition-colors w-full">
      {/* Zone 1: Mobile toggle & Page Header */}
      <div className="flex items-center gap-2 sm:gap-3 shrink min-w-0">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100/80 active:scale-95 transition-all cursor-pointer"
          aria-label="فتح القائمة"
        >
          <Menu size={22} />
        </button>

        {/* Mobile Header Title (Untouched behavior & classes) */}
        <div className="block md:hidden min-w-0 py-1">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight leading-tight truncate">
            {mobileTitle}
          </h2>
        </div>

        {/* Desktop Header Title & Subtitle (Vertically centered in 64px bar matching sidebar) */}
        <div className="hidden md:flex md:flex-col md:justify-center min-w-0">
          <h2 className="text-base lg:text-lg font-bold text-slate-800 tracking-tight leading-tight truncate">
            {desktopTitle}
          </h2>
          {desktopSubtitle && (
            <p className="text-xs text-slate-500 truncate max-w-2xl leading-tight mt-0.5">
              {desktopSubtitle}
            </p>
          )}
        </div>
      </div>

      {/* Zone 2 & 3: Status, Desktop Executive Profile Badge & Quick Actions */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Live Network & Offline Sync Status */}
        <NetworkStatusBadge onTriggerSync={triggerSync} isSyncing={isSyncing} />

        {/* Fixed Desktop Executive User Profile Pill (Hidden on mobile/tablet) */}
        <div
          className="hidden lg:flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 rounded-full px-3 py-1.5 shrink-0"
          aria-label={`${currentUser.name} - ${currentUser.role}`}
        >
          {/* Avatar Circle with Active Indicator Dot */}
          <div className="relative w-9 h-9 rounded-full bg-[#005756] text-white flex items-center justify-center font-bold text-sm shrink-0">
            <span>{currentUser.avatarInitial}</span>
            <span
              className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-50"
              aria-hidden="true"
            />
          </div>

          {/* Name & Role (Calm Vertical Stack) */}
          <div className="flex flex-col justify-center text-right min-w-0">
            <span className="text-sm font-semibold text-slate-800 leading-tight whitespace-nowrap">
              {currentUser.name}
            </span>
            <span className="text-xs text-slate-500 font-normal leading-tight mt-0.5 whitespace-nowrap">
              {currentUser.role}
            </span>
          </div>
        </div>

        {/* Subtle Vertical Divider before Operational Actions (Desktop) */}
        <div
          className="hidden lg:block h-7 w-px bg-slate-200/80 shrink-0"
          aria-hidden="true"
        />

        {/* Quick Contextual Actions based on Role */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Donation action: calm secondary button across all visible roles */}
          {(currentUser.roleKey === 'admin' ||
            currentUser.roleKey === 'finance' ||
            currentUser.roleKey === 'donor') && (
            <button
              type="button"
              onClick={onOpenNewDonation}
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl transition-colors duration-150 active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus size={15} className="text-slate-400 shrink-0" />
              <span>
                {currentUser.roleKey === 'donor'
                  ? 'تقديم مساهمة جديدة'
                  : 'تسجيل تبرع'}
              </span>
            </button>
          )}

          {/* Case registration: single primary CTA visible to admin and researcher */}
          {(currentUser.roleKey === 'admin' ||
            currentUser.roleKey === 'researcher') && (
            <button
              type="button"
              onClick={onOpenNewCase}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-[#005756] hover:bg-[#004241] rounded-xl transition-colors duration-150 active:scale-[0.98] shadow-xs shadow-teal-950/15 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus size={15} className="shrink-0" />
              <span>تسجيل حالة جديدة</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
