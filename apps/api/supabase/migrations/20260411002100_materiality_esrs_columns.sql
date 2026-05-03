-- ============================================================================
-- ESRS 1 Materiality — Add ESRS-compliant columns — Migration 21
-- Syncs materiality_iro and materiality_assessments with lib/materiality.ts.
-- ============================================================================

-- ── materiality_iro: ESRS 1 §43 impact scoring (scale × scope × irremediability) ──

ALTER TABLE public.materiality_iro
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  -- ESRS 1 §43: replace single severity_scale with three components
  ADD COLUMN IF NOT EXISTS scale_score INTEGER CHECK (scale_score BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS scope_score INTEGER CHECK (scope_score BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS irremediability_score INTEGER CHECK (irremediability_score BETWEEN 1 AND 5),
  -- Renamed likelihood for clarity
  ADD COLUMN IF NOT EXISTS likelihood_score INTEGER CHECK (likelihood_score BETWEEN 1 AND 5),
  -- ESRS 1 §47: financial materiality
  ADD COLUMN IF NOT EXISTS magnitude_score INTEGER CHECK (magnitude_score BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS financial_likelihood_score INTEGER CHECK (financial_likelihood_score BETWEEN 1 AND 5),
  -- ESRS 2 IRO-1 / SBM-3 required metadata
  ADD COLUMN IF NOT EXISTS time_horizon VARCHAR(10) CHECK (time_horizon IN ('short', 'medium', 'long')),
  ADD COLUMN IF NOT EXISTS value_chain_location VARCHAR(20) CHECK (value_chain_location IN ('upstream', 'own_operations', 'downstream', 'multiple')),
  ADD COLUMN IF NOT EXISTS affected_stakeholders TEXT[],
  -- Narrative justification fields (ESRS 1 §44)
  ADD COLUMN IF NOT EXISTS severity_rationale TEXT,
  ADD COLUMN IF NOT EXISTS financial_rationale TEXT;

COMMENT ON COLUMN public.materiality_iro.scale_score IS 'ESRS 1 §43: how grave the impact is (1–5)';
COMMENT ON COLUMN public.materiality_iro.scope_score IS 'ESRS 1 §43: how widespread the impact is (1–5)';
COMMENT ON COLUMN public.materiality_iro.irremediability_score IS 'ESRS 1 §43: how hard to reverse — negative impacts only (1–5)';
COMMENT ON COLUMN public.materiality_iro.time_horizon IS 'ESRS 2 IRO-1: short (<1y), medium (1–5y), long (>5y)';
COMMENT ON COLUMN public.materiality_iro.value_chain_location IS 'ESRS 2 SBM-3: upstream, own_operations, downstream, multiple';
COMMENT ON COLUMN public.materiality_iro.severity_rationale IS 'ESRS 1 §44: entity must disclose why this severity was assigned';

-- ── Migrate existing data: copy severity_scale → scale_score ──
UPDATE public.materiality_iro
  SET scale_score = severity_scale,
      scope_score = 3,
      irremediability_score = 3,
      likelihood_score = likelihood_scale
WHERE scale_score IS NULL AND severity_scale IS NOT NULL;

-- ── materiality_assessments: per-assessment threshold (ESRS 1 §44) ──

ALTER TABLE public.materiality_assessments
  ADD COLUMN IF NOT EXISTS materiality_threshold NUMERIC(5,2) DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS threshold_rationale TEXT;

COMMENT ON COLUMN public.materiality_assessments.materiality_threshold IS 'ESRS 1 §44: entity-defined threshold — scores above this are material';
COMMENT ON COLUMN public.materiality_assessments.threshold_rationale IS 'ESRS 1 §44: entity must disclose why this threshold was chosen';
