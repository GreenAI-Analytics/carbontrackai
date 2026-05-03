-- ============================================================================
-- Scope 2 Market-Based + Contractual Instruments — Migration 18
-- Enables dual Scope 2 reporting per GHG Protocol and ESRS E1-6.
-- ============================================================================

-- Contractual instruments: GoOs, PPAs, RECs for market-based Scope 2
CREATE TABLE IF NOT EXISTS public.contractual_instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  instrument_type VARCHAR(50) NOT NULL CHECK (instrument_type IN ('goo', 'ppa', 'rec', 'other')),
  description VARCHAR(200),
  mwh_covered DECIMAL(12, 2) NOT NULL,
  certificate_id VARCHAR(100),
  supplier VARCHAR(200),
  country VARCHAR(2),
  vintage_year INTEGER,
  evidence_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.contractual_instruments IS 'Guarantees of Origin, PPAs, RECs — used for market-based Scope 2 calculation per GHG Protocol Scope 2 Guidance';
COMMENT ON COLUMN public.contractual_instruments.instrument_type IS 'goo = Guarantee of Origin, ppa = Power Purchase Agreement, rec = Renewable Energy Certificate, other';

-- Biogenic CO2 tracking on calculation runs
ALTER TABLE public.calculation_runs
  ADD COLUMN IF NOT EXISTS biogenic_co2_kg DECIMAL(15, 4);

COMMENT ON COLUMN public.calculation_runs.biogenic_co2_kg IS 'Biogenic CO2 emissions in kg — reported separately per ESRS E1-6 para 47';

-- Emission factor ID pinning for audit trail
ALTER TABLE public.calculation_runs
  ADD COLUMN IF NOT EXISTS emission_factor_ids INTEGER[];

COMMENT ON COLUMN public.calculation_runs.emission_factor_ids IS 'Array of emission_factors.id used in this calculation — enables factor provenance audit';

-- RLS
ALTER TABLE public.contractual_instruments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their org contractual_instruments"
  ON public.contractual_instruments
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_contractual_instruments_org ON public.contractual_instruments(organization_id);
CREATE INDEX IF NOT EXISTS idx_contractual_instruments_period ON public.contractual_instruments(reporting_period_id);
