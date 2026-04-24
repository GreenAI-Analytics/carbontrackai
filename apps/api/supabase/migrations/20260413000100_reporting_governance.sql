-- Reporting governance extensions for v2 accuracy specification
-- Adds dataset registry, richer factor metadata, and line-item audit storage.

-- ============================================================================
-- DATASET REGISTRY
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dataset_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  source_url TEXT NOT NULL,
  license TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'deprecated')),
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  activated_at TIMESTAMP WITH TIME ZONE,
  checksums JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, version)
);

-- ============================================================================
-- FACTOR METADATA ENHANCEMENTS
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.emission_factors') IS NOT NULL THEN
    ALTER TABLE public.emission_factors
      ADD COLUMN IF NOT EXISTS source_version TEXT,
      ADD COLUMN IF NOT EXISTS license TEXT,
      ADD COLUMN IF NOT EXISTS uncertainty_pct DECIMAL(6, 3),
      ADD COLUMN IF NOT EXISTS gas TEXT,
      ADD COLUMN IF NOT EXISTS gwp_basis TEXT,
      ADD COLUMN IF NOT EXISTS valid_from DATE,
      ADD COLUMN IF NOT EXISTS valid_to DATE,
      ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.dataset_registry(id),
      ADD COLUMN IF NOT EXISTS checksum TEXT;

    -- Backfill minimally for legacy rows.
    UPDATE public.emission_factors
    SET
      valid_from = COALESCE(valid_from, effective_date),
      source_version = COALESCE(source_version, 'legacy_seed')
    WHERE valid_from IS NULL OR source_version IS NULL;

    CREATE INDEX IF NOT EXISTS idx_emission_factors_import_batch_id
      ON public.emission_factors(import_batch_id);
  ELSE
    RAISE NOTICE 'Skipping emission_factors enhancements: base table public.emission_factors does not exist.';
  END IF;
END $$;

-- ============================================================================
-- CALCULATION RUN ENHANCEMENTS
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.calculation_runs') IS NOT NULL THEN
    ALTER TABLE public.calculation_runs
      ADD COLUMN IF NOT EXISTS input_hash TEXT,
      ADD COLUMN IF NOT EXISTS quality_summary JSONB,
      ADD COLUMN IF NOT EXISTS methodology_text TEXT;
  ELSE
    RAISE NOTICE 'Skipping calculation_runs enhancements: base table public.calculation_runs does not exist.';
  END IF;

  IF to_regclass('public.calculation_runs') IS NOT NULL
     AND to_regclass('public.emission_factors') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS public.calculation_line_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      calculation_run_id UUID NOT NULL REFERENCES public.calculation_runs(id) ON DELETE CASCADE,
      category TEXT,
      activity_type TEXT,
      activity_value DECIMAL(18, 6),
      activity_unit TEXT,
      spend_eur DECIMAL(18, 2),
      factor_id UUID REFERENCES public.emission_factors(id) ON DELETE SET NULL,
      applied_factor_value DECIMAL(18, 6),
      applied_tier TEXT,
      emissions_kgco2e DECIMAL(18, 6) NOT NULL,
      uncertainty_low_kg DECIMAL(18, 6),
      uncertainty_high_kg DECIMAL(18, 6),
      provenance JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_calculation_line_items_run_id
      ON public.calculation_line_items(calculation_run_id);
  ELSE
    RAISE NOTICE 'Skipping calculation_line_items creation: required base tables missing.';
  END IF;
END $$;

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE public.dataset_registry ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regclass('public.calculation_line_items') IS NOT NULL THEN
    ALTER TABLE public.calculation_line_items ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Read-only policy for visibility of active/inactive datasets.
DROP POLICY IF EXISTS "Anyone can read dataset registry" ON public.dataset_registry;
CREATE POLICY "Anyone can read dataset registry"
  ON public.dataset_registry
  FOR SELECT
  USING (true);

-- Users can read line items for their organization's runs.
DROP POLICY IF EXISTS "Users can read their calculation line items" ON public.calculation_line_items;
DO $$
BEGIN
  IF to_regclass('public.calculation_line_items') IS NOT NULL
     AND to_regclass('public.calculation_runs') IS NOT NULL
     AND to_regclass('public.user_roles') IS NOT NULL THEN
    CREATE POLICY "Users can read their calculation line items"
      ON public.calculation_line_items
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.calculation_runs cr
          JOIN public.user_roles ur ON ur.organization_id = cr.organization_id
          WHERE cr.id = calculation_run_id
            AND ur.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Users can insert line items for their organization's runs.
DROP POLICY IF EXISTS "Users can insert their calculation line items" ON public.calculation_line_items;
DO $$
BEGIN
  IF to_regclass('public.calculation_line_items') IS NOT NULL
     AND to_regclass('public.calculation_runs') IS NOT NULL
     AND to_regclass('public.user_roles') IS NOT NULL THEN
    CREATE POLICY "Users can insert their calculation line items"
      ON public.calculation_line_items
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.calculation_runs cr
          JOIN public.user_roles ur ON ur.organization_id = cr.organization_id
          WHERE cr.id = calculation_run_id
            AND ur.user_id = auth.uid()
        )
      );
  END IF;
END $$;
