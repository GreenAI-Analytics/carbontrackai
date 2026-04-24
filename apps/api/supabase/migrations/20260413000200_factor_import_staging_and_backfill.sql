-- Factor import staging and legacy seed governance backfill.

-- ============================================================================
-- FACTOR IMPORT STAGING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.factor_import_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES public.dataset_registry(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.factor_sources(id) ON DELETE SET NULL,
  activity_type TEXT,
  unit TEXT,
  region TEXT,
  value DECIMAL(18, 6),
  effective_date DATE,
  valid_to DATE,
  normalized_payload JSONB NOT NULL,
  raw_payload JSONB,
  checksum TEXT,
  status TEXT NOT NULL DEFAULT 'staged' CHECK (status IN ('staged', 'validated', 'rejected', 'promoted')),
  validation_errors JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  promoted_at TIMESTAMP WITH TIME ZONE
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

-- ============================================================================
-- LEGACY SEED DATASET REGISTRY BACKFILL
-- ============================================================================

INSERT INTO public.dataset_registry (name, version, source_url, license, status, activated_at, notes)
VALUES
  (
    'ADEME Base Carbone',
    '2023_legacy_seed',
    'https://data.ademe.fr/api-base-carbone',
    'Licence Ouverte / Open Licence v2.0',
    'active',
    CURRENT_TIMESTAMP,
    'Backfilled from repository seed migration 20260411000300. Replace with curated annual import when available.'
  ),
  (
    'Spain MITECO',
    '2024_legacy_seed',
    'https://datosabiertos.miteco.gob.es',
    'MITECO open data portal reuse terms (verify latest conditions before external assurance)',
    'active',
    CURRENT_TIMESTAMP,
    'Backfilled from repository seed migration 20260411000300. Replace with curated annual import when available.'
  ),
  (
    'EEA (via Climatiq)',
    '2024_legacy_seed',
    'https://www.climatiq.io/data/source/eea',
    'Legacy repo seed via Climatiq; governance backfill only. Replace with direct EEA import for reporting-grade use.',
    'inactive',
    NULL,
    'Backfilled from repository seed migration 20260411000300. Keep inactive until direct EEA dataset import is loaded.'
  ),
  (
    'Climatiq',
    '2024_legacy_seed',
    'https://api.climatiq.io',
    'Legacy commercial API seed; governance backfill only. Not approved as free-first reporting dataset.',
    'inactive',
    NULL,
    'Backfilled from repository seed migration 20260411000300. Replace with approved public datasets before reporting use.'
  )
ON CONFLICT (name, version) DO UPDATE
SET
  source_url = EXCLUDED.source_url,
  license = EXCLUDED.license,
  status = EXCLUDED.status,
  activated_at = EXCLUDED.activated_at,
  notes = EXCLUDED.notes;

-- ============================================================================
-- LEGACY SEED EMISSION FACTOR BACKFILL
-- ============================================================================

WITH dataset_map AS (
  SELECT id, name, version, license, status
  FROM public.dataset_registry
  WHERE version = '2023_legacy_seed' AND name = 'ADEME Base Carbone'
  UNION ALL
  SELECT id, name, version, license, status
  FROM public.dataset_registry
  WHERE version = '2024_legacy_seed' AND name = 'Spain MITECO'
  UNION ALL
  SELECT id, name, version, license, status
  FROM public.dataset_registry
  WHERE version = '2024_legacy_seed' AND name = 'EEA (via Climatiq)'
  UNION ALL
  SELECT id, name, version, license, status
  FROM public.dataset_registry
  WHERE version = '2024_legacy_seed' AND name = 'Climatiq'
)
UPDATE public.emission_factors ef
SET
  import_batch_id = dm.id,
  source_version = COALESCE(
    ef.source_version,
    NULLIF(ef.metadata ->> 'dataset_year', ''),
    dm.version
  ),
  license = COALESCE(ef.license, dm.license),
  valid_from = COALESCE(ef.valid_from, ef.effective_date),
  valid_to = COALESCE(ef.valid_to, ef.expiry_date),
  checksum = COALESCE(
    ef.checksum,
    md5(concat_ws('|', ef.source_id::TEXT, ef.activity_type, ef.unit, COALESCE(ef.region, 'EU'), ef.value::TEXT, ef.effective_date::TEXT))
  )
FROM public.factor_sources fs
JOIN dataset_map dm ON dm.name = fs.name
WHERE ef.source_id = fs.id
  AND ef.import_batch_id IS NULL;