-- ============================================================================
-- Add SME classification columns to organizations — Migration 16
-- Enables two-of-three SME classification per Recommendation 2003/361/EC
-- and captures CSRD regulatory basis, consolidation approach, and first reporting year.
-- ============================================================================

-- Step 1: Add SME classification columns (headcount + financial thresholds)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS headcount INTEGER,
  ADD COLUMN IF NOT EXISTS annual_turnover NUMERIC(15, 2),        -- EUR
  ADD COLUMN IF NOT EXISTS annual_balance_sheet NUMERIC(15, 2);  -- EUR

COMMENT ON COLUMN public.organizations.headcount IS 'Number of employees (full-time equivalent) for SME classification per Recommendation 2003/361/EC';
COMMENT ON COLUMN public.organizations.annual_turnover IS 'Annual turnover in EUR — SME threshold criterion per Recommendation 2003/361/EC';
COMMENT ON COLUMN public.organizations.annual_balance_sheet IS 'Annual balance sheet total in EUR — alternative SME threshold criterion per Recommendation 2003/361/EC';

-- Step 2: Add SME classification result (derived at onboarding)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS sme_category TEXT CHECK (sme_category IN ('micro', 'small', 'medium', 'non_sme'));

COMMENT ON COLUMN public.organizations.sme_category IS 'Derived SME category per Recommendation 2003/361/EC: micro | small | medium | non_sme';

-- Step 3: Add regulatory basis (voluntary VSME vs mandatory CSRD vs other obligation)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS reporting_basis TEXT CHECK (reporting_basis IN ('voluntary', 'mandatory_csrd', 'mandatory_other', 'counterparty_request'));

COMMENT ON COLUMN public.organizations.reporting_basis IS 'Why this SME is reporting: voluntary VSME, mandatory CSRD (in Omnibus scope), other mandatory regime, or counterparty-driven request';

-- Step 4: Add CSRD-specific fields
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_listed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_subsidiary_of_large_group BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_reporting_year INTEGER;

COMMENT ON COLUMN public.organizations.is_listed IS 'Whether the SME is listed on an EU-regulated market';
COMMENT ON COLUMN public.organizations.is_subsidiary_of_large_group IS 'Whether the SME is a subsidiary of a large group that may pull it into CSRD scope';
COMMENT ON COLUMN public.organizations.first_reporting_year IS 'First year the entity will report under CSRD (determines phase-in reliefs per ESRS 1 Appendix C)';

-- Step 5: Add GHG consolidation approach (required by ESRS E1-6)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS consolidation_approach TEXT CHECK (consolidation_approach IN ('operational_control', 'financial_control', 'equity_share'));

COMMENT ON COLUMN public.organizations.consolidation_approach IS 'GHG Protocol consolidation approach: operational_control | financial_control | equity_share (ESRS E1-6)';

-- Step 6: Add countries of operation (for multi-country SMEs — see features.md §2.6)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS countries_of_operation TEXT[] DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN public.organizations.countries_of_operation IS 'ISO 3166-1 alpha-2 codes for all countries where the SME operates (not just HQ)';
