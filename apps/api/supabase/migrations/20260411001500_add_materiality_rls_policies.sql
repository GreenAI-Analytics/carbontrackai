-- ============================================================================
-- Migration 15: Add missing INSERT/UPDATE/DELETE RLS policies
-- for Double Materiality tables
-- ============================================================================
-- The original migration 8 only created SELECT policies. Without INSERT,
-- UPDATE, and DELETE policies, authenticated users cannot add or modify
-- materiality data through the API (Supabase defaults to deny).
-- ============================================================================

-- ============================================================================
-- 1. materiality_assessments
-- ============================================================================

CREATE POLICY "Users can create materiality assessments in their organization"
  ON public.materiality_assessments
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update materiality assessments in their organization"
  ON public.materiality_assessments
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete materiality assessments in their organization"
  ON public.materiality_assessments
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 2. materiality_iro (Impacts, Risks, Opportunities)
--    Links to organization via materiality_assessments.organization_id
-- ============================================================================

CREATE POLICY "Users can create IROs in their organization"
  ON public.materiality_iro
  FOR INSERT
  WITH CHECK (
    assessment_id IN (
      SELECT ma.id FROM public.materiality_assessments ma
      JOIN public.user_roles ur ON ur.organization_id = ma.organization_id
      WHERE ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update IROs in their organization"
  ON public.materiality_iro
  FOR UPDATE
  USING (
    assessment_id IN (
      SELECT ma.id FROM public.materiality_assessments ma
      JOIN public.user_roles ur ON ur.organization_id = ma.organization_id
      WHERE ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete IROs in their organization"
  ON public.materiality_iro
  FOR DELETE
  USING (
    assessment_id IN (
      SELECT ma.id FROM public.materiality_assessments ma
      JOIN public.user_roles ur ON ur.organization_id = ma.organization_id
      WHERE ur.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. stakeholder_engagement
-- ============================================================================

CREATE POLICY "Users can create stakeholder engagement records in their organization"
  ON public.stakeholder_engagement
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update stakeholder engagement records in their organization"
  ON public.stakeholder_engagement
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete stakeholder engagement records in their organization"
  ON public.stakeholder_engagement
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );
