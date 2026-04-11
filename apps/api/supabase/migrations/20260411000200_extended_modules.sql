-- Extended Schema for Comprehensive Modules (Scope 3, Targets, Climate Risk, Supply Chain)
-- CarbonTrackAI: Modules 2-5 Database Tables

-- ============================================================================
-- MODULE 2: SCOPE 3 EMISSIONS (COMPREHENSIVE)
-- ============================================================================

-- Business Travel Records
CREATE TABLE public.business_travel_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  travel_type VARCHAR(50) NOT NULL, -- 'flight', 'train', 'car_rental', 'hotel'
  origin TEXT,
  destination TEXT,
  distance_km DECIMAL(10, 2),
  flight_class VARCHAR(20), -- 'economy', 'business', 'first_class'
  hotel_nights INTEGER,
  quantity DECIMAL(15, 4),
  unit VARCHAR(20),
  employee_count INTEGER,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Upstream Transport Records
CREATE TABLE public.upstream_transport_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  transport_mode VARCHAR(50) NOT NULL, -- 'road', 'rail', 'air', 'sea'
  vehicle_type VARCHAR(50),
  fuel_type VARCHAR(50),
  tonne_km DECIMAL(15, 4),
  origin TEXT,
  destination TEXT,
  supplier_name TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Purchased Goods Records (Scope 3 Upscream)
CREATE TABLE public.purchased_goods_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL, -- 'raw_materials', 'packaging', 'it_equipment', 'office_supplies', etc.
  supplier_name TEXT,
  spend_eur DECIMAL(15, 2),
  quantity DECIMAL(15, 4),
  unit VARCHAR(20),
  supplier_has_primary_data BOOLEAN DEFAULT false,
  supplier_emissions_data JSONB,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Calculated Scope 3 Results
CREATE TABLE public.scope3_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL, -- 'business_travel', 'upstream_transport', 'purchased_goods'
  total_emissions DECIMAL(15, 4) NOT NULL, -- tCO2e
  breakdown JSONB,
  data_quality_flag VARCHAR(50), -- 'primary', 'secondary', 'estimated'
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, reporting_period_id, category)
);

-- ============================================================================
-- MODULE 3: REDUCTION TARGETS & TRANSITION PLANNING
-- ============================================================================

CREATE TABLE public.reduction_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  base_year INTEGER NOT NULL,
  base_year_emissions DECIMAL(15, 4) NOT NULL, -- tCO2e
  target_year INTEGER NOT NULL,
  target_emissions DECIMAL(15, 4) NOT NULL, -- tCO2e
  target_type VARCHAR(50) NOT NULL, -- 'absolute', 'intensity'
  intensity_metric VARCHAR(100), -- 'per_employee', 'per_revenue', etc.
  ambition_level VARCHAR(50), -- 'highly_ambitious', 'moderate', 'conservative'
  alignment_sbt BOOLEAN DEFAULT false, -- Science-Based Target
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transition Plan Actions
CREATE TABLE public.transition_plan_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.reduction_targets(id) ON DELETE CASCADE,
  action_category VARCHAR(100) NOT NULL, -- 'renewable_energy', 'electrification', 'efficiency', 'waste', etc.
  action_description TEXT NOT NULL,
  implementation_year INTEGER,
  estimated_annual_reduction_tco2e DECIMAL(15, 4),
  capital_investment_eur DECIMAL(15, 2),
  payback_period_years DECIMAL(5, 1),
  confidence_level VARCHAR(50), -- 'high', 'medium', 'low'
  status VARCHAR(50) DEFAULT 'planned', -- 'planned', 'in_progress', 'completed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- MODULE 4: CLIMATE RISK & PHYSICAL ASSETS
-- ============================================================================

CREATE TABLE public.physical_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  asset_type VARCHAR(100) NOT NULL, -- 'building', 'manufacturing_facility', 'warehouse'
  location_latitude DECIMAL(10, 8),
  location_longitude DECIMAL(11, 8),
  country_code VARCHAR(2),
  region_name TEXT,
  building_area_sqm DECIMAL(12, 2),
  construction_year INTEGER,
  energy_label VARCHAR(2), -- 'A', 'B', 'C', 'D', 'E', 'F', 'G'
  energy_label_certification_url TEXT,
  renovation_status VARCHAR(50), -- 'not_renovated', 'partially_renovated', 'fully_renovated'
  last_renovation_year INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Climate Risk Assessment
CREATE TABLE public.climate_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  physical_asset_id UUID REFERENCES public.physical_assets(id) ON DELETE SET NULL,
  risk_type VARCHAR(100) NOT NULL, -- 'flooding', 'heatwave', 'drought', 'wildfire', 'sea_level_rise'
  risk_severity VARCHAR(50) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  risk_probability VARCHAR(50), -- 'unlikely', 'possible', 'likely', 'very_likely'
  affected_area_description TEXT,
  exposure_data JSONB, -- Data from EU Climate-ADAPT API
  mitigation_measures TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- MODULE 5: SUPPLY CHAIN & PRODUCT CARBON FOOTPRINT
-- ============================================================================

CREATE TABLE public.supplier_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  supplier_name TEXT NOT NULL,
  contact_email VARCHAR(255),
  contact_person TEXT,
  product_category VARCHAR(100),
  annual_spend_eur DECIMAL(15, 2),
  is_strategic_supplier BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Supplier Data Requests
CREATE TABLE public.supplier_data_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  supplier_contact_id UUID NOT NULL REFERENCES public.supplier_contacts(id) ON DELETE CASCADE,
  request_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'received', 'rejected'
  request_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  due_date TIMESTAMP WITH TIME ZONE,
  response_received_at TIMESTAMP WITH TIME ZONE,
  response_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Product Carbon Footprint (PCF)
CREATE TABLE public.product_carbon_footprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  sku VARCHAR(100),
  raw_material_kg DECIMAL(15, 4),
  raw_material_source TEXT,
  manufacturing_kwh DECIMAL(15, 4),
  manufacturing_location TEXT,
  transport_tkm DECIMAL(15, 4),
  transport_mode VARCHAR(50),
  packaging_material VARCHAR(100),
  packaging_weight_kg DECIMAL(10, 2),
  cradle_to_gate_tco2e DECIMAL(15, 4),
  methodology VARCHAR(100), -- 'EN 15804+A2', 'IKE', 'PAS 2050'
  verification_status VARCHAR(50), -- 'draft', 'internal_verified', 'third_party_verified'
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_business_travel_org ON public.business_travel_records(organization_id);
CREATE INDEX idx_business_travel_period ON public.business_travel_records(reporting_period_id);
CREATE INDEX idx_upstream_transport_org ON public.upstream_transport_records(organization_id);
CREATE INDEX idx_upstream_transport_period ON public.upstream_transport_records(reporting_period_id);
CREATE INDEX idx_purchased_goods_org ON public.purchased_goods_records(organization_id);
CREATE INDEX idx_purchased_goods_period ON public.purchased_goods_records(reporting_period_id);
CREATE INDEX idx_scope3_calculations_org ON public.scope3_calculations(organization_id);
CREATE INDEX idx_reduction_targets_org ON public.reduction_targets(organization_id);
CREATE INDEX idx_transition_actions_target ON public.transition_plan_actions(target_id);
CREATE INDEX idx_physical_assets_org ON public.physical_assets(organization_id);
CREATE INDEX idx_climate_risk_org ON public.climate_risk_assessments(organization_id);
CREATE INDEX idx_supplier_contacts_org ON public.supplier_contacts(organization_id);
CREATE INDEX idx_supplier_requests_org ON public.supplier_data_requests(organization_id);
CREATE INDEX idx_product_pcf_org ON public.product_carbon_footprints(organization_id);

-- ============================================================================
-- RLS POLICIES FOR EXTENDED MODULES
-- ============================================================================

ALTER TABLE public.business_travel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upstream_transport_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchased_goods_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scope3_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reduction_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transition_plan_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.climate_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_data_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_carbon_footprints ENABLE ROW LEVEL SECURITY;

-- Business Travel RLS
CREATE POLICY "Users can access their org's business travel data"
  ON public.business_travel_records
  FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Upstream Transport RLS
CREATE POLICY "Users can access their org's upstream transport data"
  ON public.upstream_transport_records
  FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Purchased Goods RLS
CREATE POLICY "Users can access their org's purchased goods data"
  ON public.purchased_goods_records
  FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Scope 3 Calculations RLS
CREATE POLICY "Users can access their org's scope 3 calculations"
  ON public.scope3_calculations
  FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Reduction Targets RLS
CREATE POLICY "Users can access their org's reduction targets"
  ON public.reduction_targets
  FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Transition Plan RLS
CREATE POLICY "Users can access their org's transition plans"
  ON public.transition_plan_actions
  FOR SELECT
  USING (target_id IN (SELECT id FROM public.reduction_targets WHERE organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid())));

-- Physical Assets RLS
CREATE POLICY "Users can access their org's physical assets"
  ON public.physical_assets
  FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Climate Risk RLS
CREATE POLICY "Users can access their org's climate risk assessments"
  ON public.climate_risk_assessments
  FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Supplier Contacts RLS
CREATE POLICY "Users can access their org's supplier contacts"
  ON public.supplier_contacts
  FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Supplier Requests RLS
CREATE POLICY "Users can access their org's supplier data requests"
  ON public.supplier_data_requests
  FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Product PCF RLS
CREATE POLICY "Users can access their org's product PCFs"
  ON public.product_carbon_footprints
  FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()));

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER trigger_physical_assets_updated_at
  BEFORE UPDATE ON public.physical_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_supplier_contacts_updated_at
  BEFORE UPDATE ON public.supplier_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_reduction_targets_updated_at
  BEFORE UPDATE ON public.reduction_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_transition_plan_actions_updated_at
  BEFORE UPDATE ON public.transition_plan_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_climate_risk_updated_at
  BEFORE UPDATE ON public.climate_risk_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_product_pcf_updated_at
  BEFORE UPDATE ON public.product_carbon_footprints
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
