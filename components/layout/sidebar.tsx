'use client';

import React from 'react';
import { motion, MotionConfig } from 'motion/react';
import { useApp } from '@/context/app-context';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  HeartHandshake,
  Calculator,
  UserCheck,
  FileSpreadsheet,
  Sliders,
  ChevronRight,
  ChevronLeft,
  Zap,
  ShieldCheck,
  HandHeart,
} from 'lucide-react';
import { NAVIGATION_SECTIONS } from '@/lib/navigation-config';
import { PWAInstallWidget } from './pwa-install-widget';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const {
    activeSection,
    setActiveSection,
    metrics,
    currentSessionProfile,
    fastTrackOrders,
    cases,
  } = useApp();

  const pendingReviewCount = cases?.filter((c) => c.status === 'pending_review').length ?? 0;

  const todayStr = new Date().toISOString().split('T')[0];
  const overdueFastTrackCount = fastTrackOrders?.filter(
    (o) => o.status === 'pending_delivery' && Boolean(o.dueDeadlineDate && o.dueDeadlineDate < todayStr)
  ).length ?? 0;

  interface NavItem {
    id: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    badge?: string | number | null;
    badgeUrgent?: boolean;
    comingSoon?: boolean;
  }

  interface NavGroup {
    id: string;
    title: string;
    items: NavItem[];
  }

  const navGroups: NavGroup[] = [
    {
      id: 'overview',
      title: 'نظرة عامة',
      items: [
        {
          id: 'dashboard',
          label: NAVIGATION_SECTIONS.dashboard.sidebarLabel,
          icon: LayoutDashboard,
          badge: null,
        },
      ],
    },
    {
      id: 'beneficiaries',
      title: 'البحث والمستحقين',
      items: [
        {
          id: 'cases',
          label: NAVIGATION_SECTIONS.cases.sidebarLabel,
          icon: Users,
          badge: metrics.totalCases,
        },
        {
          id: 'cases-review',
          label: NAVIGATION_SECTIONS['cases-review'].sidebarLabel,
          icon: ShieldCheck,
          badge: pendingReviewCount > 0 ? `${pendingReviewCount}` : null,
        },
        {
          id: 'research',
          label: NAVIGATION_SECTIONS.research.sidebarLabel,
          icon: ClipboardList,
          badge: metrics.overdueVisitsCases > 0 ? `${metrics.overdueVisitsCases} متأخر` : null,
          badgeUrgent: metrics.overdueVisitsCases > 0,
        },
        {
          id: 'researcher-profile',
          label: NAVIGATION_SECTIONS['researcher-profile'].sidebarLabel,
          icon: UserCheck,
          badge: null,
        },
      ],
    },
    {
      id: 'budget_funding',
      title: 'الميزانية والتمويل',
      items: [
        {
          id: 'donations',
          label: NAVIGATION_SECTIONS.donations.sidebarLabel,
          icon: HeartHandshake,
          badge: null,
        },
        {
          id: 'fast-track',
          label: NAVIGATION_SECTIONS['fast-track'].sidebarLabel,
          icon: Zap,
          badge: overdueFastTrackCount > 0 ? `${overdueFastTrackCount} متأخر` : null,
          badgeUrgent: overdueFastTrackCount > 0,
        },
        {
          id: 'allocation',
          label: NAVIGATION_SECTIONS.allocation.sidebarLabel,
          icon: Calculator,
          badge: null,
        },
        {
          id: 'donor-portal',
          label: NAVIGATION_SECTIONS['donor-portal'].sidebarLabel,
          icon: UserCheck,
          badge: null,
          comingSoon: true,
        },
      ],
    },
    {
      id: 'reports_governance',
      title: 'التقارير والضبط',
      items: [
        {
          id: 'reports',
          label: NAVIGATION_SECTIONS.reports.sidebarLabel,
          icon: FileSpreadsheet,
          badge: null,
        },
        {
          id: 'settings',
          label: NAVIGATION_SECTIONS.settings.sidebarLabel,
          icon: Sliders,
          badge: null,
        },
      ],
    },
  ];

  // Filter groups and items based on user role permissions
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        currentSessionProfile.allowedTabs.includes(item.id)
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {/* Mobile backdrop with backdrop blur */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 right-0 z-50 bg-[#005756] text-white flex flex-col transition-all duration-200 border-l border-teal-900/40 shadow-2xl shadow-teal-950/20 ${
          collapsed ? 'w-20' : 'w-72'
        } ${mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-400/20 flex items-center justify-center text-teal-300 shadow-xs backdrop-blur-xs shrink-0">
                <HandHeart size={22} className="text-teal-300" />
              </div>
              <div>
                <h1 className="font-bold text-base leading-tight tracking-tight text-white">
                  منظومة إحسان
                </h1>
                <p className="text-xs text-teal-100/70 mt-0.5">كفالة ودعم الأسر</p>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-400/20 flex items-center justify-center text-teal-300 shadow-xs">
                <HandHeart size={22} className="text-teal-300" />
              </div>
            </div>
          )}

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-teal-200 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            title={collapsed ? 'توسيع القائمة' : 'تصغير القائمة'}
          >
            {collapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        {/* Categorized Navigation Groups */}
        <MotionConfig reducedMotion="user">
          <nav className="flex-1 py-3 px-2.5 space-y-2.5 overflow-y-auto">
            {visibleGroups.map((group, groupIdx) => (
              <div key={group.id} className="space-y-1">
                {/* Divider between icon groups in collapsed mode */}
                {groupIdx > 0 && collapsed && (
                  <div className="border-t border-teal-800/50 my-2 mx-2" />
                )}

                {/* Subheader title in expanded mode */}
                {!collapsed && (
                  <div className="px-3 pt-2 pb-0.5 text-[10.5px] font-bold text-teal-300/70 tracking-wider">
                    {group.title}
                  </div>
                )}

                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isDisabled = Boolean(item.comingSoon);
                  const isActive = !isDisabled && activeSection === item.id;
                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      disabled={isDisabled}
                      aria-disabled={isDisabled || undefined}
                      whileTap={!isDisabled ? { scale: 0.97 } : undefined}
                      onClick={() => {
                        if (isDisabled) return;
                        setActiveSection(item.id);
                        onCloseMobile();
                      }}
                      className={`group w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-150 text-right relative ${
                        isDisabled
                          ? 'text-teal-100/45 cursor-not-allowed'
                          : isActive
                          ? 'text-white font-semibold cursor-pointer'
                          : 'text-teal-100/80 hover:bg-white/[0.06] hover:text-white cursor-pointer'
                      }`}
                      title={
                        collapsed
                          ? isDisabled
                            ? `${item.label} (قريباً)`
                            : item.label
                          : undefined
                      }
                    >
                      {isActive && (
                        <motion.span
                          layoutId="active-sidebar-pill"
                          aria-hidden="true"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                          className="absolute inset-0 bg-white/10 backdrop-blur-xs rounded-xl border border-white/5 pointer-events-none"
                        />
                      )}
                      <Icon
                        size={19}
                        className={`relative z-10 shrink-0 transition-colors ${
                          isDisabled
                            ? 'text-teal-200/40'
                            : isActive
                            ? 'text-white'
                            : 'text-teal-200/75 group-hover:text-white'
                        }`}
                      />
                      {!collapsed && (
                        <span className="relative z-10 flex-1 truncate tracking-tight">
                          {item.label}
                        </span>
                      )}
                      {!collapsed && isDisabled && (
                        <span className="relative z-10 text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium bg-white/[0.08] text-teal-100/75 border border-white/10">
                          قريباً
                        </span>
                      )}
                      {!collapsed && !isDisabled && item.badge !== null && (
                        <span
                          className={`relative z-10 text-[11px] px-2 py-0.5 rounded-full tabular-nums shrink-0 font-medium border ${
                            item.badgeUrgent
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/20'
                              : 'bg-white/[0.08] text-teal-100/85 border-white/10'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            ))}
          </nav>
        </MotionConfig>

        {/* Custom PWA Install Widget (Placed at the bottom of the sidebar) */}
        <PWAInstallWidget collapsed={collapsed} />
      </aside>
    </>
  );
}
