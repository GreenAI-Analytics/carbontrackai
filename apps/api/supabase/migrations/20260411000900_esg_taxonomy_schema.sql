carbontrackai\apps\api\supabase\migrations\20260411000900_esg_taxonomy_schema.sql
```

```sql
-- ============================================================================
-- EU Taxonomy Schema (EU Taxonomy Regulation) — Migration 9
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE taxonomy_status AS ENUM ('draft', 'in_progress', 'completed', 'reviewed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Taxonomy alignment assessments per period
CREATE TABLE IF NOT EXISTS public.taxonomy_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  status taxonomy_status DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Individual economic activities assessed
CREATE TABLE IF NOT EXISTS public.taxonomy_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.taxonomy_assessments(id) ON DELETE CASCADE,
  nace_code VARCHAR(10) NOT NULL,
  activity_description TEXT NOT NULL,
  substantial_contribution_met BOOLEAN DEFAULT false,
  dnsh_met BOOLEAN DEFAULT false,
  minimum_safeguards_met BOOLEAN DEFAULT false,
  turnover_percentage DECIMAL(5,2),
  capex_percentage DECIMAL(5,2),
  opex_percentage DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.taxonomy_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_activities ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    AND table_name IN ('taxonomy_assessments','taxonomy_activities')
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
CREATE INDEX IF NOT EXISTS idx_taxonomy_assessments_org ON public.taxonomy_assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_taxonomy_activities_assessment ON public.taxonomy_activities(assessment_id);
