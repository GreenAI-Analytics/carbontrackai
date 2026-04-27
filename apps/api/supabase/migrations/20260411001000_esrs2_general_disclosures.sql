-- ============================================================================
-- ESRS 2 General Disclosures (GOV, SBM, IRO) — Migration 10
-- ============================================================================

-- ESRS 2 GOV-1: Board/management oversight of ESG
CREATE TABLE IF NOT EXISTS public.governance_sustainability_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  role_name VARCHAR(200) NOT NULL,
  esg_responsibility TEXT NOT NULL,
  oversight_body VARCHAR(100),
  meeting_frequency VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ESRS 2 SBM-1: Business model & value chain
CREATE TABLE IF NOT EXISTS public.strategy_business_model (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  narrative_description TEXT NOT NULL,
  value_chain_stages TEXT,
  key_sectors TEXT,
  geographies TEXT,
  employee_breakdown TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ESRS 2 SBM-2: Stakeholder mapping
CREATE TABLE IF NOT EXISTS public.stakeholder_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  stakeholder_group VARCHAR(100) NOT NULL,
  engagement_purpose TEXT,
  frequency VARCHAR(50),
  key_topics_raised TEXT,
  strategy_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ESRS 2 IRO-1: Due diligence process
CREATE TABLE IF NOT EXISTS public.due_diligence_process (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  scope_area VARCHAR(100) NOT NULL,
  methodology_description TEXT,
  coverage_percentage DECIMAL(5,2),
  outcomes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ESRS 2 IRO-4: Risk management & internal controls
CREATE TABLE IF NOT EXISTS public.risk_management_esg (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  risk_category VARCHAR(100) NOT NULL,
  process_description TEXT,
  integration_with_erm TEXT,
  control_effectiveness VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ESRS 2 MDR-P: Policy registry
CREATE TABLE IF NOT EXISTS public.policy_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  policy_title VARCHAR(200) NOT NULL,
  esrs_reference VARCHAR(50),
  approval_date DATE,
  version VARCHAR(20),
  document_url TEXT,
  scope_description TEXT,
  review_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Generic narrative disclosures (all ESRS)
CREATE TABLE IF NOT EXISTS public.narrative_disclosures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  esrs_datapoint_ref VARCHAR(50) NOT NULL,
  narrative_text TEXT NOT NULL,
  disclosure_type VARCHAR(50) DEFAULT 'narrative',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.governance_sustainability_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_business_model ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stakeholder_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.due_diligence_process ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_management_esg ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_disclosures ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    AND table_name IN ('governance_sustainability_roles','strategy_business_model','stakeholder_mapping','due_diligence_process','risk_management_esg','policy_documents','narrative_disclosures')
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
CREATE INDEX IF NOT EXISTS idx_narrative_disclosures_org ON public.narrative_disclosures(organization_id);
CREATE INDEX IF NOT EXISTS idx_governance_roles_org ON public.governance_sustainability_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_strategy_business_model_org ON public.strategy_business_model(organization_id);
CREATE INDEX IF NOT EXISTS idx_policy_documents_org ON public.policy_documents(organization_id);
