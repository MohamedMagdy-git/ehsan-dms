'use client';

import { useCallback, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { useApp } from '@/context/app-context';
import {
  BeneficiaryCase,
  CaseNote,
  CustodyDeliveryItem,
} from '@/types';
import {
  canUserReadCaseNote,
  resolveResearcherId,
} from '@/lib/researcher-relations';

export interface ResearcherScopedMetrics {
  totalAssignedCases: number;
  awaitingVisitCount: number;
  needsRevisionCount: number;
  overdueVisitsCount: number;
  pendingApprovalCount: number;
  approvedCasesCount: number;
  approvedReadyForDeliveryCount: number;
  deliveredCustodyCount: number;
  totalCustodyAmount: number;
  totalActiveCustodyAmount: number;
  deliveredCustodyAmount: number;
}

/**
 * طبقة محددات مركزية تحاكي سياسات Row-Level Security (RLS) في Supabase:
 * - للمدير التنفيذي (admin): وصول كامل لكافة السجلات.
 * - للباحث الميداني (researcher): عزل صارم بناءً على researcher_id = profiles.researcher_id
 *   مع حجب الملاحظات الخاصة بالغير وفق author_user_id = auth.uid().
 */
export function useScopedData() {
  const { user } = useAuth();
  const {
    cases,
    visits,
    researchReports,
    fastTrackOrders,
    deliveredCustodyIds,
    caseNotes,
    dashboardCycle,
    allocations,
  } = useApp();

  const isResearcherPOV = user.role === 'researcher';
  const activeResearcherId = user.researcherId;

  const matchesActiveResearcher = useCallback(
    (name?: string, explicitId?: string) => {
      if (!isResearcherPOV || !activeResearcherId) return true;
      const resolvedId = resolveResearcherId(name, explicitId);
      return resolvedId === activeResearcherId;
    },
    [isResearcherPOV, activeResearcherId]
  );

  const scopedCases = useMemo(() => {
    if (!isResearcherPOV) return cases;
    return cases.filter((c) =>
      matchesActiveResearcher(c.assignedResearcher, c.researcherId)
    );
  }, [cases, isResearcherPOV, matchesActiveResearcher]);

  const scopedCaseIdSet = useMemo(
    () => new Set(scopedCases.map((c) => c.id)),
    [scopedCases]
  );

  const casesById = useMemo(() => {
    const map = new Map<string, BeneficiaryCase>();
    for (const c of cases) {
      map.set(c.id, c);
    }
    return map;
  }, [cases]);

  const scopedVisits = useMemo(() => {
    if (!isResearcherPOV) return visits;
    return visits.filter(
      (v) =>
        matchesActiveResearcher(v.researcherName, v.researcherId) ||
        scopedCaseIdSet.has(v.caseId)
    );
  }, [visits, isResearcherPOV, matchesActiveResearcher, scopedCaseIdSet]);

  const scopedReports = useMemo(() => {
    if (!isResearcherPOV) return researchReports;
    return researchReports.filter(
      (r) =>
        matchesActiveResearcher(r.researcherName, r.researcherId) ||
        scopedCaseIdSet.has(r.caseId)
    );
  }, [researchReports, isResearcherPOV, matchesActiveResearcher, scopedCaseIdSet]);

  const scopedFastTrackOrders = useMemo(() => {
    if (!isResearcherPOV) return fastTrackOrders;
    return fastTrackOrders.filter(
      (o) =>
        matchesActiveResearcher(o.assignedResearcher, o.researcherId) ||
        scopedCaseIdSet.has(o.caseId)
    );
  }, [fastTrackOrders, isResearcherPOV, matchesActiveResearcher, scopedCaseIdSet]);

  const latestApprovedCycle = useMemo(() => {
    if (
      dashboardCycle &&
      (dashboardCycle.status === 'approved' || dashboardCycle.status === 'closed')
    ) {
      return dashboardCycle;
    }
    const approvedCycles = Object.values(allocations).filter(
      (a) => a.status === 'approved' || a.status === 'closed'
    );
    if (approvedCycles.length === 0) return undefined;
    return [...approvedCycles].sort((a, b) =>
      (b.approvedDate || b.periodDate || b.period).localeCompare(
        a.approvedDate || a.periodDate || a.period
      )
    )[0];
  }, [dashboardCycle, allocations]);

  const scopedCustodyItems = useMemo<CustodyDeliveryItem[]>(() => {
    const items: CustodyDeliveryItem[] = [];
    const deliveredSet = new Set(deliveredCustodyIds);

    if (latestApprovedCycle) {
      for (const allocItem of latestApprovedCycle.items) {
        if (allocItem.isExcluded || allocItem.approvedAmount <= 0) continue;
        const linkedCase = casesById.get(allocItem.caseId);
        if (!linkedCase) continue;
        if (
          isResearcherPOV &&
          !matchesActiveResearcher(
            linkedCase.assignedResearcher,
            linkedCase.researcherId
          )
        ) {
          continue;
        }
        const custodyItemId = `cycle-${latestApprovedCycle.id}-${allocItem.id}`;
        const isDelivered =
          latestApprovedCycle.status === 'closed' ||
          deliveredSet.has(custodyItemId);

        items.push({
          id: custodyItemId,
          sourceType: 'allocation_cycle',
          sourceLabel:
            latestApprovedCycle.batchTitle || latestApprovedCycle.periodLabel,
          cyclePeriod: latestApprovedCycle.period,
          caseId: linkedCase.id,
          caseCode: linkedCase.code,
          caseName: linkedCase.primaryName || linkedCase.fullName,
          beneficiaryPhone: linkedCase.phone,
          beneficiaryAddress: linkedCase.address,
          district: linkedCase.district,
          payoutMethod: linkedCase.payoutMethod ?? 'cash_researcher',
          walletNumber:
            linkedCase.payoutMethod === 'e_wallet' ? linkedCase.walletNumber : undefined,
          researcherId: resolveResearcherId(
            linkedCase.assignedResearcher,
            linkedCase.researcherId
          ),
          assignedResearcher: linkedCase.assignedResearcher,
          amount: allocItem.approvedAmount,
          status: isDelivered ? 'delivered' : 'pending_delivery',
          issuedDate:
            latestApprovedCycle.approvedDate?.split(' ')[0] ||
            latestApprovedCycle.executionDate ||
            latestApprovedCycle.generatedDate,
          purposeNote: allocItem.reasoning,
        });
      }
    }

    // في الإصدار الأول (Phase 1): عهدة الباحث الميداني تُستمد حصرياً من الدورات الشهرية المعتمدة فقط
    return items;
  }, [
    latestApprovedCycle,
    casesById,
    isResearcherPOV,
    matchesActiveResearcher,
    deliveredCustodyIds,
  ]);

  const scopedCaseNotes = useMemo<CaseNote[]>(() => {
    return caseNotes.filter((note) => {
      if (isResearcherPOV && !scopedCaseIdSet.has(note.caseId)) {
        return false;
      }
      return canUserReadCaseNote(note, user);
    });
  }, [caseNotes, isResearcherPOV, scopedCaseIdSet, user]);

  const getScopedCaseNotes = useCallback(
    (caseId: string): CaseNote[] => {
      return scopedCaseNotes.filter((n) => n.caseId === caseId);
    },
    [scopedCaseNotes]
  );

  const researcherMetrics = useMemo<ResearcherScopedMetrics>(() => {
    const needsRevisionCount = scopedCases.filter(
      (c) => c.status === 'needs_revision'
    ).length;

    const overdueVisitsCount = scopedCases.filter(
      (c) =>
        c.isVisitOverdue &&
        Boolean(c.lastVisitDate) &&
        c.status !== 'pending_field_research' &&
        c.status !== 'closed'
    ).length;

    const awaitingVisitCount = scopedCases.filter(
      (c) =>
        c.status === 'pending_field_research' ||
        c.status === 'needs_revision' ||
        (c.isVisitOverdue &&
          Boolean(c.lastVisitDate) &&
          c.status !== 'closed')
    ).length;

    const pendingApprovalCount = scopedCases.filter(
      (c) => c.status === 'pending_review'
    ).length;

    const approvedCasesCount = scopedCases.filter(
      (c) => c.status === 'active_eligible'
    ).length;

    const pendingCustodyItems = scopedCustodyItems.filter(
      (item) => item.status === 'pending_delivery'
    );
    const deliveredCustodyItems = scopedCustodyItems.filter(
      (item) => item.status === 'delivered'
    );

    const approvedReadyForDeliveryCount = pendingCustodyItems.length;
    const deliveredCustodyCount = deliveredCustodyItems.length;
    const totalActiveCustodyAmount = pendingCustodyItems.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    const deliveredCustodyAmount = deliveredCustodyItems.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    const totalCustodyAmount =
      totalActiveCustodyAmount + deliveredCustodyAmount;

    return {
      totalAssignedCases: scopedCases.length,
      awaitingVisitCount,
      needsRevisionCount,
      overdueVisitsCount,
      pendingApprovalCount,
      approvedCasesCount,
      approvedReadyForDeliveryCount,
      deliveredCustodyCount,
      totalCustodyAmount,
      totalActiveCustodyAmount,
      deliveredCustodyAmount,
    };
  }, [scopedCases, scopedCustodyItems]);

  return {
    user,
    isResearcherPOV,
    activeResearcherId,
    scopedCases,
    scopedVisits,
    scopedReports,
    scopedFastTrackOrders,
    scopedCustodyItems,
    scopedCaseNotes,
    getScopedCaseNotes,
    researcherMetrics,
    latestApprovedCycle,
  };
}
