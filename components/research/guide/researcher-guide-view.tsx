'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useApp } from '@/context/app-context';
import { useAuth } from '@/context/auth-context';
import { WorkflowBentoPipeline } from './workflow-bento-pipeline';
import { StatusDictionaryGrid } from './status-dictionary-grid';
import { FieldFaqAccordion } from './field-faq-accordion';

export function ResearcherGuideView() {
  const { setActiveSection, openFieldSurvey } = useApp();
  const { user } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  const isResearcherPOV = user.role === 'researcher';

  const sectionTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: 'easeOut' as const };

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={sectionTransition}
      className="space-y-6 pb-8"
    >
      {/* 1. The 4-Step Field Workflow Pipeline (Bento Cards) */}
      <WorkflowBentoPipeline
        isResearcherPOV={isResearcherPOV}
        onOpenSurvey={() => openFieldSurvey()}
        onNavigateSection={(sec) => setActiveSection(sec)}
      />

      {/* 2. Status Dictionary & Researcher Action Guide */}
      <StatusDictionaryGrid
        isResearcherPOV={isResearcherPOV}
        onOpenSurvey={() => openFieldSurvey()}
        onNavigateSection={(sec) => setActiveSection(sec)}
      />

      {/* 3. Field FAQ Accordion */}
      <FieldFaqAccordion />
    </motion.div>
  );
}
