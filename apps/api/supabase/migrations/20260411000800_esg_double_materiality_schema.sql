carbontrackai\apps\api\supabase\migrations\20260411000800_esg_double_materiality_schema.sql
```sql
-- ============================================================================
-- ESG Double Materiality Schema (ESRS 1 / IRO-1) — Migration 8
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE materiality_status AS ENUM ('draft', 'in_progress', 'completed', 'reviewed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE iro_type AS ENUM ('impact', 'risk', 'opportunity');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE stakeholder_group AS ENUM ('employees', 'customers', 'suppliers', 'investors', 'regulators', 'community', 'ngos', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Materiality assessment rounds
CREATE TABLE IF NOT EXISTS public.materiality_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  methodology VARCHAR(100) DEFAULT 'double_materiality',
  status materiality_status DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- IRO (Impacts, Risks, Opportunities) register
CREATE TABLE IF NOT EXISTS public.materiality_iro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.materiality_assessments(id) ON DELETE CASCADE,
  iro_type iro_type NOT NULL,
  topic VARCHAR(100) NOT NULL,
  subtopic VARCHAR(100),
  severity_scale INTEGER CHECK (severity_scale BETWEEN 1 AND 5),
  likelihood_scale INTEGER CHECK (likelihood_scale BETWEEN 1 AND 5),
  financial_materiality_score DECIMAL(5,2),
  impact_materiality_score DECIMAL(5,2),
  double_materiality_score DECIMAL(5,2),
  stakeholder_input TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stakeholder engagement records
CREATE TABLE IF NOT EXISTS public.stakeholder_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  stakeholder_group stakeholder_group NOT NULL,
  engagement_method VARCHAR(100),
  engagement_date DATE,
  key_findings TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.materiality_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiality_iro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stakeholder_engagement ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    AND table_name IN ('materiality_assessments','materiality_iro','stakeholder_engagement')
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
CREATE INDEX IF NOT EXISTS idx_materiality_assessments_org ON public.materiality_assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_materiality_iro_assessment ON public.materiality_iro(assessment_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_engagement_org ON public.stakeholder_engagement(organization_id);
