-- ============================================================================
-- Pay Transparency Directive (EU 2023/970) — Migration 22
-- Effective June 2026. Applies to entities ≥100 employees.
-- ============================================================================

-- Step 1: Extend gender_pay_gap with quartile distribution and pay components
ALTER TABLE public.gender_pay_gap
  ADD COLUMN IF NOT EXISTS quartile_q1_female_pct DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS quartile_q2_female_pct DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS quartile_q3_female_pct DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS quartile_q4_female_pct DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS base_pay_gap_pct DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS variable_pay_gap_pct DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS bonus_pay_gap_pct DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS reporting_cadence VARCHAR(30) DEFAULT 'annual';

COMMENT ON COLUMN public.gender_pay_gap.quartile_q1_female_pct IS 'Art. 9(1)(g): % of women in lowest-paid quartile';
COMMENT ON COLUMN public.gender_pay_gap.quartile_q4_female_pct IS 'Art. 9(1)(g): % of women in highest-paid quartile';
COMMENT ON COLUMN public.gender_pay_gap.base_pay_gap_pct IS 'Pay gap for base salary component only';
COMMENT ON COLUMN public.gender_pay_gap.variable_pay_gap_pct IS 'Pay gap for variable/ complementary pay component';
COMMENT ON COLUMN public.gender_pay_gap.bonus_pay_gap_pct IS 'Pay gap for bonus component';
COMMENT ON COLUMN public.gender_pay_gap.reporting_cadence IS 'Every 3 years (100-149 employees) or annual (≥150) — Art. 9(1)';

-- Step 2: Job-category equal-value comparison (Art. 9(1)(a-f))
CREATE TABLE IF NOT EXISTS public.job_category_pay_gap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  category_name VARCHAR(200) NOT NULL,
  category_criteria TEXT,
  female_count INTEGER,
  male_count INTEGER,
  female_avg_pay DECIMAL(12,2),
  male_avg_pay DECIMAL(12,2),
  gap_percentage DECIMAL(5,2),
  unexplained_gap_pct DECIMAL(5,2),
  joint_pay_assessment_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.job_category_pay_gap IS 'Art. 9(1): per-category equal-value comparison using gender-neutral criteria';
COMMENT ON COLUMN public.job_category_pay_gap.unexplained_gap_pct IS 'Gap remaining after adjusting for objective factors';
COMMENT ON COLUMN public.job_category_pay_gap.joint_pay_assessment_required IS 'Art. 10: true if unexplained gap >5% and not corrected within 6 months';

-- Step 3: Joint pay assessment (Art. 10)
CREATE TABLE IF NOT EXISTS public.joint_pay_assessment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  triggered_by_category_id UUID REFERENCES public.job_category_pay_gap(id),
  findings TEXT,
  root_cause_analysis TEXT,
  remediation_plan TEXT,
  worker_rep_involvement BOOLEAN DEFAULT false,
  completion_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.joint_pay_assessment IS 'Art. 10: mandatory joint pay assessment when unexplained gap >5%';

-- Step 4: Reporting cadence on organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS pay_reporting_cadence VARCHAR(30) DEFAULT 'every_3_years';

COMMENT ON COLUMN public.organizations.pay_reporting_cadence IS 'Art. 9(1): every_3_years for 100-149 employees, annual for >=150';

-- RLS
ALTER TABLE public.job_category_pay_gap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.joint_pay_assessment ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE tbl TEXT; BEGIN
  FOR tbl IN SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('job_category_pay_gap','joint_pay_assessment')
  LOOP
    EXECUTE format('CREATE POLICY "Users can access their org %s" ON public.%I FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));', tbl, tbl);
  END LOOP;
END $$;
