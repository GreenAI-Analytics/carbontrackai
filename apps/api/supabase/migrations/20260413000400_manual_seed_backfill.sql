-- Manual seeded-data governance backfill for hosted Supabase SQL Editor
-- Run this after 20260413000300_manual_governance_patch.sql

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.dataset_registry') IS NULL THEN
    RAISE EXCEPTION 'dataset_registry table is missing. Run manual governance patch first.';
  END IF;

  IF to_regclass('public.emission_factors') IS NULL THEN
    RAISE EXCEPTION 'emission_factors table is missing.';
  END IF;

  IF to_regclass('public.factor_sources') IS NULL THEN
    RAISE EXCEPTION 'factor_sources table is missing.';
  END IF;
END $$;

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

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Verification 1: dataset registry rows
-- SELECT name, version, status, activated_at
-- FROM public.dataset_registry
-- WHERE version LIKE '%legacy_seed'
-- ORDER BY name, version;

-- Verification 2: seeded factor linkage coverage
-- SELECT
--   COUNT(*) FILTER (WHERE import_batch_id IS NOT NULL) AS linked_rows,
--   COUNT(*) FILTER (WHERE import_batch_id IS NULL) AS unlinked_rows,
--   COUNT(*) AS total_rows
-- FROM public.emission_factors;

-- Verification 3: key coverage for module 1 activities
-- SELECT
--   ef.activity_type,
--   ef.region,
--   ef.source_version,
--   ef.license,
--   dr.name AS dataset_name,
--   dr.version AS dataset_version,
--   dr.status AS dataset_status
-- FROM public.emission_factors ef
-- LEFT JOIN public.dataset_registry dr ON dr.id = ef.import_batch_id
-- WHERE ef.activity_type IN ('electricity', 'natural_gas', 'heating_oil', 'petrol_car_fuel', 'diesel_car_fuel')
-- ORDER BY ef.activity_type, ef.region;
