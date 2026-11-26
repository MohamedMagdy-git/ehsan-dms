'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from '@/context/auth-context';
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
import { ResearcherGuideView } from '@/components/research/guide/researcher-guide-view';
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
import { ResearcherDashboardView } from '@/components/dashboard/researcher-dashboard-view';
import { ResearcherCustodyView } from '@/components/custody/researcher-custody-view';

function MainApp() {
  const { user } = useAuth();
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

  const isResearcherPOV = user.role === 'researcher';

  // Strict Route Guard by role's allowed tabs
  const isSectionAllowed =
    currentSessionProfile?.allowedTabs.includes(activeSection);
  const effectiveSection = isSectionAllowed
    ? activeSection
    : currentSessionProfile?.defaultTab || 'dashboard';

  const isDonorPortal = effectiveSection === 'donor-portal';
  const prevSectionRef = useRef(effectiveSection);

  useEffect(() => {
    if (prevSectionRef.current !== effectiveSection) {
      prevSectionRef.current = effectiveSection;
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [effectiveSection]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      {/* Floating slide-down connectivity banner */}
      <GlobalConnectivityBanner />

      {/* Sidebar */}
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
        className={`flex-1 flex flex-col min-w-0 overflow-x-clip transition-all duration-200 ${
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

        {/* View Content Viewport (Role-Guarded) */}
        <main className="flex-1 px-3.5 pt-3.5 sm:px-4 sm:pt-4 lg:px-8 lg:pt-8 max-w-7xl w-full mx-auto pb-28 md:pb-6">
          {effectiveSection === 'dashboard' &&
            (isResearcherPOV ? (
              <ResearcherDashboardView
                onOpenNewCase={() => setIsNewCaseModalOpen(true)}
              />
            ) : (
              <DashboardView />
            ))}
          {effectiveSection === 'my-custody' && isResearcherPOV && (
            <ResearcherCustodyView />
          )}
          {effectiveSection === 'research' && <ResearchView />}
          {effectiveSection === 'researcher-profile' && (
            <ResearcherProfileView />
          )}
          {effectiveSection === 'researcher-guide' && (
            <ResearcherGuideView />
          )}

          {/* Admin & Governance Routes (Strictly blocked in Researcher POV) */}
          {!isResearcherPOV && effectiveSection === 'cases' && (
            <CasesView onOpenNewCase={() => setIsNewCaseModalOpen(true)} />
          )}
          {!isResearcherPOV && effectiveSection === 'cases-review' && (
            <CaseReviewApprovalView />
          )}
          {!isResearcherPOV && effectiveSection === 'donations' && (
            <DonationsView
              onOpenNewDonation={() => setIsNewDonationModalOpen(true)}
            />
          )}
          {!isResearcherPOV && effectiveSection === 'fast-track' && (
            <FastTrackView />
          )}
          {!isResearcherPOV && effectiveSection === 'allocation' && (
            <AllocationView />
          )}
          {!isResearcherPOV && effectiveSection === 'donor-portal' && (
            <DonorPortalView />
          )}
          {!isResearcherPOV && effectiveSection === 'reports' && <ReportsView />}
          {!isResearcherPOV && effectiveSection === 'settings' && (
            <SettingsView />
          )}
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
      {!isResearcherPOV && (
        <NewDonationModal
          isOpen={isNewDonationModalOpen}
          onClose={() => setIsNewDonationModalOpen(false)}
        />
      )}
      <CaseStudyModal />
    </div>
  );
}

export default function Page() {
  return (
    <AuthProvider>
      <AppProvider>
        <MainApp />
      </AppProvider>
    </AuthProvider>
  );
}
