-- CarbonTrackAI Database Schema
-- Supabase Migration: Initial Schema Setup

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE plan_type AS ENUM ('basic', 'comprehensive');
CREATE TYPE import_job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE export_job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE scope_type AS ENUM ('scope_1', 'scope_2_location', 'scope_2_market', 'scope_3');

-- ============================================================================
-- TABLES
-- ============================================================================

-- Organizations: Core entity for SME accounts
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  sector TEXT,
  base_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- User Roles: Maps users to organizations with role assignments
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'user',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, organization_id)
);

-- Reporting Periods: Annual or custom reporting windows
CREATE TABLE public.reporting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, year)
);

-- Activity Records: Energy/fuel usage data
CREATE TABLE public.activity_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- 'natural_gas', 'heating_oil', 'electricity', 'car_fuel'
  quantity DECIMAL(15, 4) NOT NULL,
  unit VARCHAR(20) NOT NULL, -- 'm3', 'L', 'kWh', 'km'
  month INTEGER,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Factor Sources: Where emission factors come from
CREATE TABLE public.factor_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'climatiq', 'national_api', 'local_cache'
  url TEXT,
  last_updated TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, provider)
);

-- Emission Factors: CO2 conversion rates
CREATE TABLE public.emission_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.factor_sources(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  region VARCHAR(50), -- country code or specific region
  value DECIMAL(15, 6) NOT NULL, -- kg CO2e per unit
  version INTEGER DEFAULT 1,
  effective_date DATE NOT NULL,
  expiry_date DATE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_id, activity_type, unit, region, version, effective_date)
);

-- Calculation Runs: Results of emission calculations
CREATE TABLE public.calculation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  scope_type scope_type NOT NULL,
  total_emissions DECIMAL(15, 4) NOT NULL, -- tCO2e
  total_energy DECIMAL(15, 4),
  breakdown JSONB, -- detailed breakdown by activity type
  factor_versions JSONB, -- track which factor versions were used
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, reporting_period_id, scope_type)
);

-- Report Snapshots: Finalized annual reports
CREATE TABLE public.report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  scope1_emissions DECIMAL(15, 4) NOT NULL,
  scope2_location_emissions DECIMAL(15, 4),
  scope2_market_emissions DECIMAL(15, 4),
  total_energy DECIMAL(15, 4),
  summary_data JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  finalized_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Import Jobs: Track Excel/data imports
CREATE TABLE public.import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  status import_job_status DEFAULT 'pending',
  file_name TEXT,
  file_path TEXT,
  rows_processed INTEGER DEFAULT 0,
  rows_failed INTEGER DEFAULT 0,
  error_details JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Export Jobs: Track report exports
CREATE TABLE public.export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  report_snapshot_id UUID NOT NULL REFERENCES public.report_snapshots(id) ON DELETE CASCADE,
  status export_job_status DEFAULT 'pending',
  export_format VARCHAR(20) NOT NULL, -- 'excel', 'pdf'
  file_path TEXT,
  file_size INTEGER,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Feature Flag Subscriptions: Plan gating for comprehensive features
CREATE TABLE public.feature_flag_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_type plan_type NOT NULL DEFAULT 'basic',
  scope_3_enabled BOOLEAN DEFAULT false,
  targets_enabled BOOLEAN DEFAULT false,
  climate_risk_enabled BOOLEAN DEFAULT false,
  supplier_extension_enabled BOOLEAN DEFAULT false,
  product_extension_enabled BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_organization_id ON public.user_roles(organization_id);
CREATE INDEX idx_reporting_periods_organization_id ON public.reporting_periods(organization_id);
CREATE INDEX idx_activity_records_organization_id ON public.activity_records(organization_id);
CREATE INDEX idx_activity_records_reporting_period_id ON public.activity_records(reporting_period_id);
CREATE INDEX idx_emission_factors_source_id ON public.emission_factors(source_id);
CREATE INDEX idx_emission_factors_activity_type ON public.emission_factors(activity_type);
CREATE INDEX idx_calculation_runs_organization_id ON public.calculation_runs(organization_id);
CREATE INDEX idx_calculation_runs_reporting_period_id ON public.calculation_runs(reporting_period_id);
CREATE INDEX idx_report_snapshots_organization_id ON public.report_snapshots(organization_id);
CREATE INDEX idx_import_jobs_organization_id ON public.import_jobs(organization_id);
CREATE INDEX idx_export_jobs_organization_id ON public.export_jobs(organization_id);
CREATE INDEX idx_feature_flag_subscriptions_organization_id ON public.feature_flag_subscriptions(organization_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emission_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flag_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factor_sources ENABLE ROW LEVEL SECURITY;

-- Organization access: Users can only access their organizations
CREATE POLICY "Users can view their organizations"
  ON public.organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own organizations"
  ON public.organizations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their organizations"
  ON public.organizations
  FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- User Roles access
CREATE POLICY "Users can view their user roles"
  ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid() OR organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Reporting Periods access
CREATE POLICY "Users can access their organization's reporting periods"
  ON public.reporting_periods
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

-- Activity Records access
CREATE POLICY "Users can access their organization's activity records"
  ON public.activity_records
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create activity records in their organization"
  ON public.activity_records
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

-- Emission Factors: Public read access (but must be from active sources)
CREATE POLICY "Anyone can read active emission factors"
  ON public.emission_factors
  FOR SELECT
  USING (
    source_id IN (SELECT id FROM public.factor_sources WHERE is_active = true)
  );

-- Calculation Runs access
CREATE POLICY "Users can access their organization's calculations"
  ON public.calculation_runs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

-- Report Snapshots access
CREATE POLICY "Users can access their organization's reports"
  ON public.report_snapshots
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

-- Import/Export Jobs access
CREATE POLICY "Users can access their organization's import jobs"
  ON public.import_jobs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access their organization's export jobs"
  ON public.export_jobs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

-- Feature Flags access
CREATE POLICY "Users can access their organization's feature flags"
  ON public.feature_flag_subscriptions
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's primary organization
CREATE OR REPLACE FUNCTION public.get_user_primary_organization()
RETURNS UUID AS $$
  SELECT organization_id FROM public.user_roles
  WHERE user_id = auth.uid() AND is_primary = true
  LIMIT 1;
$$ LANGUAGE SQL;

-- Function to check if user is admin of organization
CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND organization_id = org_id AND role = 'admin'
  );
$$ LANGUAGE SQL;

-- Function to check if user is system admin (for maintenance)
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin' AND is_primary = true
  );
$$ LANGUAGE SQL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp on table changes
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_reporting_periods_updated_at
  BEFORE UPDATE ON public.reporting_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_activity_records_updated_at
  BEFORE UPDATE ON public.activity_records
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_report_snapshots_updated_at
  BEFORE UPDATE ON public.report_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_feature_flag_subscriptions_updated_at
  BEFORE UPDATE ON public.feature_flag_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
