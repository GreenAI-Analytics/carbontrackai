-- Manual governance patch for hosted Supabase SQL Editor
-- Use this when CLI migration push is unavailable.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.dataset_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  source_url TEXT NOT NULL,
  license TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'deprecated')),
  downloaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  activated_at TIMESTAMPTZ,
  checksums JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (name, version)
);

ALTER TABLE public.dataset_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read dataset registry" ON public.dataset_registry;
CREATE POLICY "Anyone can read dataset registry"
  ON public.dataset_registry
  FOR SELECT
  USING (true);

DO $$
BEGIN
  IF to_regclass('public.emission_factors') IS NOT NULL THEN
    ALTER TABLE public.emission_factors
      ADD COLUMN IF NOT EXISTS source_version TEXT,
      ADD COLUMN IF NOT EXISTS license TEXT,
      ADD COLUMN IF NOT EXISTS uncertainty_pct DECIMAL(6,3),
      ADD COLUMN IF NOT EXISTS gas TEXT,
      ADD COLUMN IF NOT EXISTS gwp_basis TEXT,
      ADD COLUMN IF NOT EXISTS valid_from DATE,
      ADD COLUMN IF NOT EXISTS valid_to DATE,
      ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.dataset_registry(id),
      ADD COLUMN IF NOT EXISTS checksum TEXT;

    UPDATE public.emission_factors
    SET
      valid_from = COALESCE(valid_from, effective_date),
      source_version = COALESCE(source_version, 'legacy_seed')
    WHERE valid_from IS NULL OR source_version IS NULL;

    CREATE INDEX IF NOT EXISTS idx_emission_factors_import_batch_id
      ON public.emission_factors(import_batch_id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.factor_import_staging') IS NULL
     AND to_regclass('public.factor_sources') IS NOT NULL THEN
    CREATE TABLE public.factor_import_staging (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      dataset_id UUID NOT NULL REFERENCES public.dataset_registry(id) ON DELETE CASCADE,
      source_id UUID REFERENCES public.factor_sources(id) ON DELETE SET NULL,
      activity_type TEXT,
      unit TEXT,
      region TEXT,
      value DECIMAL(18,6),
      effective_date DATE,
      valid_to DATE,
      normalized_payload JSONB NOT NULL,
      raw_payload JSONB,
      checksum TEXT,
      status TEXT NOT NULL DEFAULT 'staged' CHECK (status IN ('staged', 'validated', 'rejected', 'promoted')),
      validation_errors JSONB,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      promoted_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_factor_import_staging_dataset_id
      ON public.factor_import_staging(dataset_id);

    CREATE INDEX IF NOT EXISTS idx_factor_import_staging_status
      ON public.factor_import_staging(status);

    ALTER TABLE public.factor_import_staging ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Anyone can read factor import staging" ON public.factor_import_staging;
    CREATE POLICY "Anyone can read factor import staging"
      ON public.factor_import_staging
      FOR SELECT
      USING (true);
  END IF;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Verification
-- SELECT to_regclass('public.dataset_registry') AS dataset_registry_table;
--
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'emission_factors'
--   AND column_name IN ('source_version','license','import_batch_id','valid_from','valid_to','checksum')
-- ORDER BY column_name;
