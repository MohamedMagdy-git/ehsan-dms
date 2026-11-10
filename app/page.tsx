'use client';

import React, { useState } from 'react';
import { AppProvider, useApp } from '@/context/app-context';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { CasesView } from '@/components/cases/cases-view';
import { CaseDetailsModal } from '@/components/cases/case-details-modal';
import { EditCaseModal } from '@/components/cases/edit-case-modal';
import { NewCaseModal } from '@/components/cases/new-case-modal';
import { CaseReviewApprovalView } from '@/components/cases/case-review-approval-view';
import { ResearchView } from '@/components/research/research-view';
import { ResearcherProfileView } from '@/components/research/researcher-profile-view';
import { DonationsView } from '@/components/donations/donations-view';
import { NewDonationModal } from '@/components/donations/new-donation-modal';
import { AllocationView } from '@/components/allocation/allocation-view';
import { FastTrackView } from '@/components/fast-track/fast-track-view';
import { DonorPortalView } from '@/components/donor-portal/donor-portal-view';
import { ReportsView } from '@/components/reports/reports-view';
import { SettingsView } from '@/components/settings/settings-view';
import { CaseStudyModal } from '@/components/research/case-study-modal';
import { GlobalConnectivityBanner } from '@/components/common/global-connectivity-banner';
import { Footer } from '@/components/layout/footer';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';

function MainApp() {
  const {
    activeSection,
    currentSessionProfile,
    editingCase,
    setEditingCase,
    isNewCaseModalOpen,
    setIsNewCaseModalOpen,
    isNewDonationModalOpen,
    setIsNewDonationModalOpen,
  } = useApp();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Guard section by role's allowed tabs
  const isSectionAllowed = currentSessionProfile?.allowedTabs.includes(activeSection);
  const effectiveSection = isSectionAllowed
    ? activeSection
    : currentSessionProfile?.defaultTab || 'dashboard';

  const isDonorPortal = effectiveSection === 'donor-portal';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      {/* YouTube-style floating slide-down connectivity banner for dashboard shell */}
      <GlobalConnectivityBanner />

      {/* Sidebar - hidden in donor-portal for a dedicated, distraction-free portal experience */}
      {!isDonorPortal && (
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-200 ${
          !isDonorPortal
            ? sidebarCollapsed
              ? 'lg:mr-20'
              : 'lg:mr-72'
            : 'mr-0'
        }`}
      >
        {/* Header */}
        <Header
          onOpenMobile={() => setMobileSidebarOpen(true)}
          onOpenNewCase={() => setIsNewCaseModalOpen(true)}
          onOpenNewDonation={() => setIsNewDonationModalOpen(true)}
        />

        {/* View Content Viewport */}
        <main className="flex-1 p-3.5 sm:p-4 lg:p-8 max-w-7xl w-full mx-auto pb-28 md:pb-6">
          {effectiveSection === 'dashboard' && <DashboardView />}
          {effectiveSection === 'cases' && (
            <CasesView onOpenNewCase={() => setIsNewCaseModalOpen(true)} />
          )}
          {effectiveSection === 'cases-review' && <CaseReviewApprovalView />}
          {effectiveSection === 'research' && <ResearchView />}
          {effectiveSection === 'researcher-profile' && <ResearcherProfileView />}
          {effectiveSection === 'donations' && (
            <DonationsView onOpenNewDonation={() => setIsNewDonationModalOpen(true)} />
          )}
          {effectiveSection === 'fast-track' && <FastTrackView />}
          {effectiveSection === 'allocation' && <AllocationView />}
          {effectiveSection === 'donor-portal' && <DonorPortalView />}
          {effectiveSection === 'reports' && <ReportsView />}
          {effectiveSection === 'settings' && <SettingsView />}
        </main>

        {/* Footer */}
        <Footer />

        {/* Mobile-First Fixed Bottom Navigation Bar */}
        <MobileBottomNav />
      </div>

      {/* Modals */}
      <CaseDetailsModal />
      <EditCaseModal
        caseItem={editingCase}
        isOpen={editingCase !== null}
        onClose={() => setEditingCase(null)}
      />
      <NewCaseModal
        isOpen={isNewCaseModalOpen}
        onClose={() => setIsNewCaseModalOpen(false)}
      />
      <NewDonationModal
        isOpen={isNewDonationModalOpen}
        onClose={() => setIsNewDonationModalOpen(false)}
      />
      <CaseStudyModal />
    </div>
  );
}

export default function Page() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
