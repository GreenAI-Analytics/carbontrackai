-- ============================================================================
-- Report Snapshots — Migration 17
-- Extends report_snapshots (created in migration 1) with JSONB report_data
-- and metadata columns for the Report Builder.
-- ============================================================================

-- Make legacy NOT NULL columns nullable (report data now goes into report_data JSONB)
ALTER TABLE public.report_snapshots
  ALTER COLUMN scope1_emissions DROP NOT NULL,
  ALTER COLUMN scope2_location_emissions DROP NOT NULL,
  ALTER COLUMN scope2_market_emissions DROP NOT NULL,
  ALTER COLUMN total_energy DROP NOT NULL;

-- Add new columns for Report Builder
ALTER TABLE public.report_snapshots
  ADD COLUMN IF NOT EXISTS title VARCHAR(200) DEFAULT 'Untitled Report',
  ADD COLUMN IF NOT EXISTS report_data JSONB,
  ADD COLUMN IF NOT EXISTS generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

COMMENT ON COLUMN public.report_snapshots.report_data IS 'Full ESG report as JSONB — used by Report Builder';
COMMENT ON COLUMN public.report_snapshots.title IS 'Human-readable report title (e.g. ESG Report 2025)';
COMMENT ON COLUMN public.report_snapshots.status IS 'draft | final';
