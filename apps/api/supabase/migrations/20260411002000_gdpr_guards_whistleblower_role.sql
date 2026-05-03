-- ============================================================================
-- GDPR Guards — Whistleblower Officer Role + Sensitive Data RLS — Migration 20
-- Per Directive 2019/1937 Art. 16 and GDPR Art. 9 (special category data).
-- ============================================================================

-- Step 1: Add whistleblower_officer to user_role enum
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE 'whistleblower_officer';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Restrict whistleblower_cases — only admins and whistleblower_officers can read
DROP POLICY IF EXISTS "Users can access their organization's whistleblower_cases" ON public.whistleblower_cases;

CREATE POLICY "Admins and WB officers can read whistleblower_cases"
  ON public.whistleblower_cases
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'whistleblower_officer')
    )
  );

-- Admins and WB officers can insert/update
CREATE POLICY "Admins and WB officers can insert whistleblower_cases"
  ON public.whistleblower_cases
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'whistleblower_officer')
    )
  );

CREATE POLICY "Admins and WB officers can update whistleblower_cases"
  ON public.whistleblower_cases
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'whistleblower_officer')
    )
  );

-- Step 3: Restrict discrimination_incidents — sensitive personal data (Art. 9 GDPR)
DROP POLICY IF EXISTS "Users can access their organization's discrimination_incidents" ON public.discrimination_incidents;

CREATE POLICY "Admins can read discrimination_incidents"
  ON public.discrimination_incidents
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert discrimination_incidents"
  ON public.discrimination_incidents
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Step 4: Add k-anonymity comment markers to S1 tables (documentation for report builder)
COMMENT ON TABLE public.workforce_headcount IS 'S1-6: k-anonymity applies — suppress counts <10 in reports';
COMMENT ON TABLE public.workforce_diversity IS 'S1-9: k-anonymity applies — suppress counts <10 in reports';
COMMENT ON TABLE public.workforce_disability IS 'S1-12: k-anonymity applies — suppress counts <10 in reports';
COMMENT ON TABLE public.discrimination_incidents IS 'S1-17: RESTRICTED — admin-only access, k-anonymity <10, Art. 9 GDPR';
COMMENT ON TABLE public.whistleblower_cases IS 'G1-1: RESTRICTED — admin+WB-officer only, Directive 2019/1937 Art. 16 confidentiality';
COMMENT ON TABLE public.gender_pay_gap IS 'S1-16: k-anonymity applies — suppress if group size <10';

-- Step 5: Add data_residency_region to organizations for GDPR Art. 44-49 compliance
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS data_residency_region VARCHAR(20) DEFAULT 'eu-central-1';

COMMENT ON COLUMN public.organizations.data_residency_region IS 'Supabase/cloud region where data is stored — must be EU/EEA per Art. 44-49 GDPR';
