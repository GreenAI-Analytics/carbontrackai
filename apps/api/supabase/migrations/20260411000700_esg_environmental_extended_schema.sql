-- ============================================================================
-- ESG Environmental Extended Schema (ESRS E2–E5) — Migration 7
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE pollutant_media AS ENUM ('air', 'water', 'soil');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE water_source AS ENUM ('municipal', 'groundwater', 'surface_water', 'rainwater', 'recycled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE disposal_method AS ENUM ('recycling', 'landfill', 'incineration', 'composting', 'energy_recovery', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- E2: Pollutant inventories
CREATE TABLE IF NOT EXISTS public.pollutant_inventories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  pollutant_type VARCHAR(100) NOT NULL,
  media pollutant_media NOT NULL,
  quantity DECIMAL(15,4) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  threshold_exceeded BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- E3: Water consumption
CREATE TABLE IF NOT EXISTS public.water_consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  source water_source NOT NULL,
  volume_m3 DECIMAL(15,4) NOT NULL,
  recycled_percentage DECIMAL(5,2),
  water_stress_area BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- E3: Water discharge
CREATE TABLE IF NOT EXISTS public.water_discharge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  volume_m3 DECIMAL(15,4) NOT NULL,
  treatment_level VARCHAR(100),
  receiving_water_body VARCHAR(200),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- E4: Biodiversity sites
CREATE TABLE IF NOT EXISTS public.biodiversity_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_name VARCHAR(200) NOT NULL,
  location_description TEXT,
  near_protected_area BOOLEAN DEFAULT false,
  protected_area_name VARCHAR(200),
  biodiversity_action_plan BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- E5: Material flows
CREATE TABLE IF NOT EXISTS public.material_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  material_type VARCHAR(100) NOT NULL,
  input_mass_tonnes DECIMAL(15,4) NOT NULL,
  recycled_content_percentage DECIMAL(5,2),
  renewable_percentage DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- E5: Waste generation
CREATE TABLE IF NOT EXISTS public.waste_generation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period_id UUID NOT NULL REFERENCES public.reporting_periods(id) ON DELETE CASCADE,
  waste_code VARCHAR(10),
  hazardous BOOLEAN DEFAULT false,
  disposal_method disposal_method NOT NULL,
  tonnage DECIMAL(15,4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.pollutant_inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_discharge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biodiversity_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_generation ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    AND table_name IN ('pollutant_inventories','water_consumption','water_discharge','biodiversity_sites','material_flows','waste_generation')
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
CREATE INDEX IF NOT EXISTS idx_pollutant_inventories_org ON public.pollutant_inventories(organization_id);
CREATE INDEX IF NOT EXISTS idx_water_consumption_org ON public.water_consumption(organization_id);
CREATE INDEX IF NOT EXISTS idx_material_flows_org ON public.material_flows(organization_id);
CREATE INDEX IF NOT EXISTS idx_waste_generation_org ON public.waste_generation(organization_id);
