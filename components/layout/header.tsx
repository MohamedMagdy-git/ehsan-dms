'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/app-context';
import { useAuth } from '@/context/auth-context';
import { Check, ChevronsUpDown, Menu, Plus } from 'lucide-react';
import { AppUserRole, SystemAuthRole } from '@/types';
import { NetworkStatusBadge } from '@/components/common/network-status-badge';
import { getSectionMeta } from '@/lib/navigation-config';
import { useOnlineStatus } from '@/hooks/use-online-status';

export interface ActiveUserProfile {
  name: string;
  role: string;
  roleKey: AppUserRole;
  avatarInitial: string;
}

const DEFAULT_EXECUTIVE_USER: ActiveUserProfile = {
  name: 'أحمد الجزار',
  role: 'مدير المنظومة',
  roleKey: 'admin',
  avatarInitial: 'أ',
};

export function getActiveUserProfile(
  role: AppUserRole,
  sessionProfile: { name: string; badgeLabel: string; avatarInitial?: string }
): ActiveUserProfile {
  if (role === 'admin') {
    return DEFAULT_EXECUTIVE_USER;
  }
  return {
    name: sessionProfile.name,
    role: sessionProfile.badgeLabel,
    roleKey: role,
    avatarInitial:
      sessionProfile.avatarInitial || sessionProfile.name.charAt(0),
  };
}

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
  const { activeSection, triggerSync, isSyncing } = useApp();
  const { user, demoUsers, switchDemoUser } = useAuth();
  const { isOnline } = useOnlineStatus();

  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSwitcherOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        switcherRef.current &&
        !switcherRef.current.contains(event.target as Node)
      ) {
        setIsSwitcherOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSwitcherOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSwitcherOpen]);

  const handleSelectRole = (nextRole: SystemAuthRole) => {
    setIsSwitcherOpen(false);
    if (nextRole === user.role) return;

    switchDemoUser(nextRole);
  };

  const sectionMeta = getSectionMeta(activeSection, user.role);
  const desktopTitle = title || sectionMeta.headerTitle;
  const desktopSubtitle = subtitle || sectionMeta.headerDescription;
  const mobileTitle = sectionMeta.mobileTitle || desktopTitle;

  const roleOptions: SystemAuthRole[] = ['admin', 'researcher'];

  return (
    <header className="h-[calc(3.75rem+env(safe-area-inset-top,0px))] md:h-16 pt-[env(safe-area-inset-top,0px)] md:pt-0 md:py-0 backdrop-blur-md bg-white/90 border-b border-slate-200/70 px-3 sm:px-4 lg:px-8 flex items-center justify-between gap-2.5 sm:gap-4 sticky top-0 z-30 shadow-xs shadow-slate-900/[0.03] transition-colors w-full">
      {/* Zone 1: Mobile toggle & Page Header */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100/80 active:scale-95 transition-all cursor-pointer"
          aria-label="فتح القائمة"
        >
          <Menu size={22} />
        </button>

        {/* Mobile Header Title */}
        <div className="block md:hidden min-w-0 py-1">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight leading-tight truncate">
            {mobileTitle}
          </h2>
        </div>

        {/* Desktop Header Title & Subtitle */}
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

      {/* Zone 2 & 3: Status, Desktop Profile Role Switcher & Quick Actions */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Live Network & Offline Sync Status */}
        <NetworkStatusBadge onTriggerSync={triggerSync} isSyncing={isSyncing} />

        {/* Desktop Interactive User Profile Pill with Calm Role Switcher (Hidden on mobile/tablet) */}
        <div ref={switcherRef} className="relative hidden lg:block shrink-0">
          <button
            type="button"
            onClick={() => setIsSwitcherOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={isSwitcherOpen}
            aria-label={`${user.name} - ${user.badgeLabel} - تبديل منظور العرض`}
            className={`flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100/80 border rounded-full pl-3 pr-2 py-1.5 transition-colors duration-150 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#005756]/30 ${
              isSwitcherOpen
                ? 'border-[#005756]/40 bg-white'
                : 'border-slate-200/80'
            }`}
          >
            {/* Avatar Circle with Live Network Status Dot */}
            <div className="relative w-9 h-9 rounded-full bg-[#005756] text-white flex items-center justify-center font-bold text-sm shrink-0">
              <span>{user.avatarInitial}</span>
              <span
                title={isOnline ? 'متصل بالإنترنت' : 'غير متصل بالإنترنت'}
                aria-label={isOnline ? 'متصل بالإنترنت' : 'غير متصل بالإنترنت'}
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white transition-colors duration-200 ${
                  isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                }`}
              />
            </div>

            {/* Name & Role (Calm Vertical Stack) */}
            <div className="flex flex-col justify-center text-right min-w-0">
              <span className="text-sm font-semibold text-slate-800 leading-tight whitespace-nowrap">
                {user.name}
              </span>
              <span className="text-xs text-slate-500 font-normal leading-tight mt-0.5 whitespace-nowrap">
                {user.badgeLabel}
              </span>
            </div>

            <ChevronsUpDown
              size={15}
              className="text-slate-400 mr-0.5 shrink-0"
              aria-hidden="true"
            />
          </button>

          {isSwitcherOpen && (
            <div
              role="menu"
              aria-label="تبديل منظور العرض"
              className="absolute left-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-sm p-1.5 z-50"
            >
              <div className="px-2.5 pt-1.5 pb-2 border-b border-slate-100 mb-1">
                <p className="text-xs font-semibold text-slate-800">
                  تبديل منظور العرض
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  معاينة سريعة لصلاحيات الإدارة والباحث الميداني
                </p>
              </div>

              <div className="space-y-1">
                {roleOptions.map((optionRole) => {
                  const optionUser = demoUsers[optionRole];
                  const isSelected = user.role === optionRole;
                  return (
                    <button
                      key={optionRole}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isSelected}
                      onClick={() => handleSelectRole(optionRole)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-right transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#005756]/8 text-[#005756]'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected
                            ? 'bg-[#005756] text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {optionUser.avatarInitial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate text-slate-900">
                          {optionUser.name}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {optionUser.badgeLabel}
                        </div>
                      </div>
                      {isSelected && (
                        <Check
                          size={16}
                          className="text-[#005756] shrink-0"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Subtle Vertical Divider before Operational Actions (Desktop) */}
        <div
          className="hidden lg:block h-7 w-px bg-slate-200/80 shrink-0"
          aria-hidden="true"
        />

        {/* Quick Contextual Actions based on Role */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Donation action: strictly hidden for Field Researcher */}
          {user.role === 'admin' && (
            <button
              type="button"
              onClick={onOpenNewDonation}
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl transition-colors duration-150 active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus size={15} className="text-slate-400 shrink-0" />
              <span>تسجيل تبرع</span>
            </button>
          )}

          {/* Case registration: primary CTA for both admin and researcher */}
          <button
            type="button"
            onClick={onOpenNewCase}
            className="inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3.5 text-xs font-semibold text-white bg-[#005756] hover:bg-[#004241] rounded-xl transition-colors duration-150 active:scale-[0.98] shadow-xs shadow-teal-950/15 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus size={15} className="shrink-0" />
            <span>تسجيل حالة جديدة</span>
          </button>
        </div>
      </div>
    </header>
  );
}
