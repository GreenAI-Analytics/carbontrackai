carbontrackai\apps\api\supabase\migrations\20260411000500_esg_social_schema.sql
-- ============================================================================
-- ESG Social Schema (ESRS S1–S4) — Migration 5
-- ============================================================================

-- Drop existing types first if recreating
DO $$ BEGIN
  CREATE TYPE esrs_social_category AS ENUM ('own_workforce', 'value_chain', 'communities', 'consumers');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE engagement_method AS ENUM ('works_council', 'survey', 'union_negotiation', 'town_hall', 'focus_group', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE incident_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE target_status AS ENUM ('on_track', 'behind', 'achieved', 'not_started');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- S1-6: Workforce headcount
CREATE TABLE IF NOT EXISTS public.workforce_headcount (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  total_employees INTEGER NOT NULL,
  female_count INTEGER,
  male_count INTEGER,
  non_binary_count INTEGER,
  under_30_count INTEGER,
  age_30_50_count INTEGER,
  over_50_count INTEGER,
  permanent_contracts INTEGER,
  temporary_contracts INTEGER,
  full_time_count INTEGER,
  part_time_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- S1-6: Workforce turnover
CREATE TABLE IF NOT EXISTS public.workforce_turnover (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  hires INTEGER DEFAULT 0,
  leavers INTEGER DEFAULT 0,
  turnover_rate DECIMAL(5,2),
  voluntary_leavers INTEGER,
  involuntary_leavers INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- S1-9: Diversity metrics
CREATE TABLE IF NOT EXISTS public.workforce_diversity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  gender_ratio_management DECIMAL(5,2),
  women_in_senior_management INTEGER,
  men_in_senior_management INTEGER,
  employees_with_disabilities INTEGER,
  disability_percentage DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- S1-14: Health & safety incidents
CREATE TABLE IF NOT EXISTS public.health_safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  recordable_injuries INTEGER DEFAULT 0,
  lost_days INTEGER DEFAULT 0,
  fatalities INTEGER DEFAULT 0,
  near_misses INTEGER DEFAULT 0,
  injury_rate DECIMAL(8,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- S1-13: Training records
CREATE TABLE IF NOT EXISTS public.training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  total_training_hours DECIMAL(10,2) DEFAULT 0,
  avg_hours_per_employee DECIMAL(6,2),
  training_hours_female DECIMAL(10,2),
  training_hours_male DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- S1-16: Gender pay gap
CREATE TABLE IF NOT EXISTS public.gender_pay_gap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  mean_gap_percentage DECIMAL(5,2),
  median_gap_percentage DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- S1-1: Workforce policies
CREATE TABLE IF NOT EXISTS public.workforce_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  policy_type VARCHAR(100) NOT NULL,
  description TEXT,
  coverage_percentage DECIMAL(5,2),
  approval_date DATE,
  document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- S1-2: Workforce engagement
CREATE TABLE IF NOT EXISTS public.workforce_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  engagement_method engagement_method NOT NULL,
  frequency VARCHAR(50),
  coverage_percentage DECIMAL(5,2),
  key_outcomes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- S1-3: Grievance / remediation mechanisms
CREATE TABLE IF NOT EXISTS public.workforce_remediation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  mechanism_type VARCHAR(100) NOT NULL,
  cases_received INTEGER DEFAULT 0,
  cases_resolved INTEGER DEFAULT 0,
  avg_resolution_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- S1-4: Targets related to own workforce
CREATE TABLE IF NOT EXISTS public.workforce_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  target_metric VARCHAR(200) NOT NULL,
  baseline_value DECIMAL(12,2),
  target_value DECIMAL(12,2) NOT NULL,
  target_year INTEGER NOT NULL,
  status target_status DEFAULT 'not_started',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- S1-7: Non-employee workers
CREATE TABLE IF NOT EXISTS public.workforce_non_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  worker_type VARCHAR(50) NOT NULL,
  headcount INTEGER NOT NULL,
  fte_equivalent DECIMAL(8,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- S1-10: Adequate wage assessment
CREATE TABLE IF NOT EXISTS public.workforce_adequate_wages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  employee_category VARCHAR(100) NOT NULL,
  minimum_wage DECIMAL(10,2),
  living_wage_benchmark DECIMAL(10,2),
  gap_percentage DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- S1-12: Persons with disabilities
CREATE TABLE IF NOT EXISTS public.workforce_disability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  total_employees_with_disabilities INTEGER DEFAULT 0,
  percentage_of_workforce DECIMAL(5,2),
  accommodation_measures TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- S1-15: Work-life balance metrics
CREATE TABLE IF NOT EXISTS public.worklife_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  parental_leave_uptake_percentage DECIMAL(5,2),
  flexible_work_percentage DECIMAL(5,2),
  avg_weekly_hours DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- S1-17: Discrimination incidents
CREATE TABLE IF NOT EXISTS public.discrimination_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  incident_type VARCHAR(100) NOT NULL,
  cases_reported INTEGER DEFAULT 0,
  cases_investigated INTEGER DEFAULT 0,
  remediation_actions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- S2: Human rights due diligence
CREATE TABLE IF NOT EXISTS public.human_rights_due_diligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  country VARCHAR(100),
  risk_level incident_severity,
  remediation_actions TEXT,
  status VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- S3: Community engagement
CREATE TABLE IF NOT EXISTS public.community_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  engagement_type VARCHAR(100) NOT NULL,
  stakeholder_count INTEGER,
  complaints_received INTEGER DEFAULT 0,
  key_outcomes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- S4: Product safety incidents
CREATE TABLE IF NOT EXISTS public.product_safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  incident_type VARCHAR(100) NOT NULL,
  severity incident_severity,
  recalls_count INTEGER DEFAULT 0,
  fines_amount DECIMAL(15,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.workforce_headcount ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_turnover ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_diversity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_safety_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gender_pay_gap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_remediation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_non_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_adequate_wages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_disability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worklife_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discrimination_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_rights_due_diligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_safety_incidents ENABLE ROW LEVEL SECURITY;

-- Apply standard org-scoped RLS policy to all social tables
DO $$ DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    AND table_name IN ('workforce_headcount','workforce_turnover','workforce_diversity','health_safety_incidents','training_records','gender_pay_gap','workforce_policies','workforce_engagement','workforce_remediation','workforce_targets','workforce_non_employees','workforce_adequate_wages','workforce_disability','worklife_balance','discrimination_incidents','human_rights_due_diligence','community_engagement','product_safety_incidents')
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
CREATE INDEX IF NOT EXISTS idx_workforce_headcount_org ON public.workforce_headcount(organization_id);
CREATE INDEX IF NOT EXISTS idx_workforce_turnover_org ON public.workforce_turnover(organization_id);
CREATE INDEX IF NOT EXISTS idx_health_safety_org ON public.health_safety_incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_training_records_org ON public.training_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_gender_pay_gap_org ON public.gender_pay_gap(organization_id);
CREATE INDEX IF NOT EXISTS idx_discrimination_org ON public.discrimination_incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_community_engagement_org ON public.community_engagement(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_safety_org ON public.product_safety_incidents(organization_id);
