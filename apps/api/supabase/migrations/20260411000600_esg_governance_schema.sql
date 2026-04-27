-- ============================================================================
-- ESG Governance Schema (ESRS G1) — Migration 6
-- ============================================================================

-- Board composition
CREATE TABLE IF NOT EXISTS public.board_composition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  board_size INTEGER,
  independent_members INTEGER,
  female_members INTEGER,
  male_members INTEGER,
  avg_tenure_years DECIMAL(4,1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ethics & anti-corruption training
CREATE TABLE IF NOT EXISTS public.ethics_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  training_topic VARCHAR(200) NOT NULL,
  employees_covered INTEGER,
  coverage_percentage DECIMAL(5,2),
  frequency VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Compliance incidents
CREATE TABLE IF NOT EXISTS public.compliance_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  incident_type VARCHAR(100) NOT NULL,
  regulatory_fines DECIMAL(15,2),
  non_monetary_sanctions INTEGER DEFAULT 0,
  legal_actions INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Data breaches
CREATE TABLE IF NOT EXISTS public.data_breaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  breach_type VARCHAR(100) NOT NULL,
  records_affected INTEGER,
  notified_authority BOOLEAN DEFAULT false,
  fines_amount DECIMAL(15,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Whistleblower cases
CREATE TABLE IF NOT EXISTS public.whistleblower_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  reports_received INTEGER DEFAULT 0,
  cases_investigated INTEGER DEFAULT 0,
  cases_substantiated INTEGER DEFAULT 0,
  remediation_actions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Supplier conduct assessments
CREATE TABLE IF NOT EXISTS public.supplier_conduct_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  supplier_name VARCHAR(200),
  code_violations INTEGER DEFAULT 0,
  audits_conducted INTEGER DEFAULT 0,
  corrective_actions_issued INTEGER DEFAULT 0,
  status VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Political contributions
CREATE TABLE IF NOT EXISTS public.political_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  recipient VARCHAR(200) NOT NULL,
  country VARCHAR(100),
  amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.board_composition ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ethics_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_breaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whistleblower_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_conduct_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.political_contributions ENABLE ROW LEVEL SECURITY;

-- Apply standard org-scoped RLS policy
DO $$ DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    AND table_name IN ('board_composition','ethics_training','compliance_incidents','data_breaches','whistleblower_cases','supplier_conduct_assessments','political_contributions')
  LOOP
    EXECUTE format('
      CREATE POLICY "Users can access their organization''s %s"
        ON public.%I
        FOR SELECT
        USING (
          organization_id IN (
            SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
          )
        );
    ', tbl, tbl);
  END LOOP;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_board_composition_org ON public.board_composition(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_incidents_org ON public.compliance_incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_data_breaches_org ON public.data_breaches(organization_id);
CREATE INDEX IF NOT EXISTS idx_whistleblower_org ON public.whistleblower_cases(organization_id);
CREATE INDEX IF NOT EXISTS idx_supplier_conduct_org ON public.supplier_conduct_assessments(organization_id);
