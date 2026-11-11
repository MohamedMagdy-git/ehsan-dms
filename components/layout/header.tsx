'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/app-context';
import {
  Menu,
  User,
  ShieldCheck,
  Check,
  ChevronDown,
  Plus,
  Heart,
  Briefcase,
  FileText,
  BadgeDollarSign,
} from 'lucide-react';
import { AppUserRole } from '@/types';
import { NetworkStatusBadge } from '@/components/common/network-status-badge';
import { getSectionMeta } from '@/lib/navigation-config';

interface HeaderProps {
  onOpenMobile: () => void;
  onOpenNewCase: () => void;
  onOpenNewDonation: () => void;
}

export function Header({
  onOpenMobile,
  onOpenNewCase,
  onOpenNewDonation,
}: HeaderProps) {
  const {
    activeSection,
    currentUserRole,
    setCurrentUserRole,
    currentSessionProfile,
    allSessionProfiles,
    triggerSync,
    isSyncing,
  } = useApp();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sectionMeta = getSectionMeta(activeSection);

  const getRoleBadgeStyle = (role: AppUserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-teal-700 text-white';
      case 'finance':
        return 'bg-blue-700 text-white';
      case 'researcher':
        return 'bg-amber-600 text-white';
      case 'donor':
        return 'bg-emerald-600 text-white';
      default:
        return 'bg-slate-700 text-white';
    }
  };

  const getRoleIcon = (role: AppUserRole) => {
    switch (role) {
      case 'admin':
        return ShieldCheck;
      case 'finance':
        return BadgeDollarSign;
      case 'researcher':
        return Briefcase;
      case 'donor':
        return Heart;
      default:
        return User;
    }
  };

  return (
    <header className="h-[calc(3.75rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] backdrop-blur-md bg-white/90 border-b border-slate-200/70 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2.5 sm:gap-4 sticky top-0 z-30 shadow-xs shadow-slate-900/[0.03] transition-colors w-full">
      {/* Zone 1: Mobile toggle & Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 shrink min-w-0">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100/80 active:scale-95 transition-all cursor-pointer"
          aria-label="فتح القائمة"
        >
          <Menu size={22} />
        </button>
        <div className="min-w-0 py-1">
          <div className="hidden xs:flex items-center gap-1.5 text-[11px] text-slate-500 font-medium truncate">
            <span>منظومة إحسان</span>
            <span aria-hidden="true" className="text-slate-300">/</span>
            <span className="text-[#005756] font-semibold truncate">
              {sectionMeta.headerTitle}
            </span>
          </div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight truncate">
            {sectionMeta.headerTitle}
          </h2>
          <p className="hidden md:block text-[11px] text-slate-500 truncate max-w-xl leading-tight mt-0.5">
            {sectionMeta.headerDescription}
          </p>
        </div>
      </div>

      {/* Zone 2: Operational Controls (Network Status & User Profile) */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Network & Offline Sync Status */}
        <NetworkStatusBadge onTriggerSync={triggerSync} isSyncing={isSyncing} />

        {/* Simulated Active User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/80 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] shadow-2xs text-right focus:outline-hidden focus:ring-2 focus:ring-teal-700/20 cursor-pointer"
            title="انقر لتبديل حساب المستخدم ومعاينة الأدوار"
            aria-expanded={isProfileMenuOpen}
          >
            {/* User Avatar */}
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${getRoleBadgeStyle(
                currentUserRole
              )}`}
            >
              {currentSessionProfile.avatarInitial}
            </div>

            {/* User details */}
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {currentSessionProfile.name}
              </span>
              <span className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
                {currentSessionProfile.badgeLabel}
              </span>
            </div>

            {/* Preview indicator pill */}
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium border border-slate-200 hidden md:inline">
              معاينة دور
            </span>

            <ChevronDown
              size={14}
              className={`text-slate-400 transition-transform duration-200 ${
                isProfileMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Role selection dropdown modal */}
          {isProfileMenuOpen && (
            <div className="absolute left-0 sm:left-auto right-auto sm:right-0 mt-2 w-80 backdrop-blur-xl bg-white/95 rounded-2xl shadow-xl shadow-slate-950/10 border border-slate-200/80 ring-1 ring-black/[0.04] z-50 overflow-hidden text-right animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3.5 bg-slate-50/80 border-b border-slate-200/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 tracking-tight">
                    تبديل حساب المستخدم النشط
                  </span>
                  <span className="text-[10px] text-teal-800 bg-teal-50 border border-teal-200/60 px-2 py-0.5 rounded-full font-semibold">
                    نظام الصلاحيات
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  اختر حساب المستخدم للتبديل السريع بين الصلاحيات المؤسسية:
                </p>
              </div>

              <div className="p-1.5 space-y-1">
                {(Object.keys(allSessionProfiles) as AppUserRole[]).map(
                  (roleKey) => {
                    const prof = allSessionProfiles[roleKey];
                    const isSelected = currentUserRole === roleKey;
                    const RoleIcon = getRoleIcon(roleKey);

                    return (
                      <button
                        key={roleKey}
                        onClick={() => {
                          setCurrentUserRole(roleKey);
                          setIsProfileMenuOpen(false);
                        }}
                        className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-right transition-colors ${
                          isSelected
                            ? 'bg-teal-50/80 border border-teal-200'
                            : 'hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${getRoleBadgeStyle(
                            roleKey
                          )}`}
                        >
                          <RoleIcon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {prof.name}
                            </span>
                            {isSelected && (
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-teal-800">
                                <Check size={13} />
                                النشط
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-teal-700 font-medium block">
                            {prof.badgeLabel}
                          </span>
                          <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5 line-clamp-2">
                            {prof.description}
                          </p>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>

              <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
                <span>تتغير عناصر القائمة والصلاحيات تلقائياً</span>
                <span className="font-semibold text-slate-700">منظومة إحسان</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Zone 3: Quick Contextual Actions based on Role */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Donation action: visible to admin, finance, and donor */}
        {(currentUserRole === 'admin' ||
          currentUserRole === 'finance' ||
          currentUserRole === 'donor') && (
          <button
            onClick={onOpenNewDonation}
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] shadow-xs cursor-pointer whitespace-nowrap ${
              currentUserRole === 'donor'
                ? 'text-white bg-emerald-600 hover:bg-emerald-700 shadow-emerald-950/10'
                : 'text-teal-800 bg-teal-50 border border-teal-200/70 hover:bg-teal-100/80'
            }`}
          >
            <Plus size={15} />
            <span>
              {currentUserRole === 'donor'
                ? 'تقديم مساهمة جديدة'
                : 'تسجيل تبرع'}
            </span>
          </button>
        )}

        {/* Case registration: visible only to admin and researcher */}
        {(currentUserRole === 'admin' || currentUserRole === 'researcher') && (
          <button
            onClick={onOpenNewCase}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#005756] hover:bg-[#004241] rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] shadow-xs shadow-teal-950/15 cursor-pointer whitespace-nowrap"
          >
            <Plus size={15} />
            <span>تسجيل حالة جديدة</span>
          </button>
        )}
      </div>
    </header>
  );
}
