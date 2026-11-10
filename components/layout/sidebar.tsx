'use client';

import React from 'react';
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
          badgeUrgent: pendingReviewCount > 0,
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
              <div className="w-9 h-9 rounded-xl bg-[#76B837] flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-emerald-950/20">
                إ
              </div>
              <div>
                <h1 className="font-bold text-base leading-tight tracking-tight text-white">
                  منظومة إحسان
                </h1>
                <p className="text-[11px] text-teal-200/80">إدارة الحالات وتخصيص المساعدات</p>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-9 h-9 rounded-xl bg-[#76B837] flex items-center justify-center text-white font-bold text-lg shadow-sm">
                إ
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
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] text-right relative cursor-pointer ${
                      isActive
                        ? 'bg-white/15 text-white font-semibold shadow-xs ring-1 ring-white/10'
                        : 'text-teal-100 hover:bg-white/10 hover:text-white'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon
                      size={19}
                      className={`shrink-0 ${isActive ? 'text-[#76B837]' : 'text-teal-300'}`}
                    />
                    {!collapsed && (
                      <span className="flex-1 truncate tracking-tight">{item.label}</span>
                    )}
                    {!collapsed && item.badge !== null && (
                      <span
                        className={`text-[10.5px] px-2 py-0.5 rounded-full tabular-nums shrink-0 font-semibold border ${
                          item.badgeUrgent
                            ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                            : 'bg-teal-900/80 text-teal-200 border-teal-700/50'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Custom PWA Install Widget (Placed at the bottom of the sidebar) */}
        <PWAInstallWidget collapsed={collapsed} />
      </aside>
    </>
  );
}
