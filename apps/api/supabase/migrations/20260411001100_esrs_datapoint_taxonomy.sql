-- ============================================================================
-- ESRS Datapoint Taxonomy Reference — Migration 11
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE esrs_standard AS ENUM ('ESRS_1','ESRS_2','E1','E2','E3','E4','E5','S1','S2','S3','S4','G1');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE datapoint_data_type AS ENUM ('numeric', 'boolean', 'narrative', 'date', 'percentage');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE mandatory_mode AS ENUM ('vsme_lite', 'vsme_full', 'csrd_full');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Central datapoint reference lookup
CREATE TABLE IF NOT EXISTS public.esrs_datapoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  datapoint_id VARCHAR(50) UNIQUE NOT NULL,
  esrs_standard esrs_standard NOT NULL,
  paragraph_ref VARCHAR(20),
  topic VARCHAR(200) NOT NULL,
  data_type datapoint_data_type NOT NULL,
  unit VARCHAR(50),
  mandatory_for mandatory_mode NOT NULL,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial datapoints for key ESRS areas (SME-relevant subset)
INSERT INTO public.esrs_datapoints (datapoint_id, esrs_standard, paragraph_ref, topic, data_type, unit, mandatory_for) VALUES
  -- ESRS 2 General Disclosures
  ('ESRS2_GOV1_01', 'ESRS_2', 'GOV-1', 'Board oversight of sustainability', 'narrative', NULL, 'vsme_lite'),
  ('ESRS2_SBM1_01', 'ESRS_2', 'SBM-1', 'Business model description', 'narrative', NULL, 'vsme_lite'),
  ('ESRS2_IRO1_01', 'ESRS_2', 'IRO-1', 'Due diligence process', 'narrative', NULL, 'vsme_lite'),
  -- E1 Climate
  ('E1_6_01', 'E1', 'E1-6', 'Scope 1 GHG emissions', 'numeric', 'tCO2e', 'vsme_lite'),
  ('E1_6_02', 'E1', 'E1-6', 'Scope 2 GHG emissions (location-based)', 'numeric', 'tCO2e', 'vsme_lite'),
  ('E1_6_03', 'E1', 'E1-6', 'Scope 2 GHG emissions (market-based)', 'numeric', 'tCO2e', 'vsme_full'),
  ('E1_6_04', 'E1', 'E1-6', 'Total energy consumption', 'numeric', 'MWh', 'vsme_lite'),
  ('E1_6_05', 'E1', 'E1-6', 'GHG intensity per net revenue', 'numeric', 'tCO2e/EUR', 'vsme_lite'),
  -- E2 Pollution
  ('E2_1_01', 'E2', 'E2-1', 'Air pollutant emissions', 'numeric', 'kg', 'vsme_full'),
  ('E2_4_01', 'E2', 'E2-4', 'Microplastics generated', 'numeric', 'kg', 'csrd_full'),
  -- E3 Water
  ('E3_1_01', 'E3', 'E3-1', 'Water consumption volume', 'numeric', 'm3', 'vsme_full'),
  ('E3_3_01', 'E3', 'E3-3', 'Water discharge volume', 'numeric', 'm3', 'csrd_full'),
  -- E4 Biodiversity
  ('E4_2_01', 'E4', 'E4-2', 'Sites near protected areas', 'boolean', NULL, 'vsme_full'),
  ('E4_4_01', 'E4', 'E4-4', 'Biodiversity action plans', 'narrative', NULL, 'csrd_full'),
  -- E5 Circular Economy
  ('E5_1_01', 'E5', 'E5-1', 'Material input mass', 'numeric', 'tonnes', 'vsme_full'),
  ('E5_5_01', 'E5', 'E5-5', 'Waste by disposal method', 'numeric', 'tonnes', 'vsme_full'),
  -- S1 Workforce
  ('S1_6_01', 'S1', 'S1-6', 'Total employee headcount', 'numeric', 'employees', 'vsme_lite'),
  ('S1_6_02', 'S1', 'S1-6', 'Employee turnover rate', 'percentage', NULL, 'vsme_lite'),
  ('S1_9_01', 'S1', 'S1-9', 'Gender diversity at management', 'percentage', NULL, 'vsme_lite'),
  ('S1_13_01', 'S1', 'S1-13', 'Average training hours per employee', 'numeric', 'hours', 'vsme_lite'),
  ('S1_14_01', 'S1', 'S1-14', 'Recordable work-related injuries', 'numeric', 'incidents', 'vsme_lite'),
  ('S1_16_01', 'S1', 'S1-16', 'Gender pay gap', 'percentage', NULL, 'vsme_full'),
  ('S1_17_01', 'S1', 'S1-17', 'Discrimination incidents', 'numeric', 'incidents', 'vsme_full'),
  -- G1 Governance
  ('G1_1_01', 'G1', 'G1-1', 'Board composition', 'narrative', NULL, 'vsme_lite'),
  ('G1_3_01', 'G1', 'G1-3', 'Anti-corruption training coverage', 'percentage', NULL, 'vsme_full'),
  ('G1_4_01', 'G1', 'G1-4', 'Compliance incidents', 'numeric', 'incidents', 'vsme_lite'),
  ('G1_5_01', 'G1', 'G1-5', 'Data breaches', 'numeric', 'incidents', 'vsme_full')
ON CONFLICT (datapoint_id) DO NOTHING;

-- Index
CREATE INDEX IF NOT EXISTS idx_esrs_datapoints_standard ON public.esrs_datapoints(esrs_standard);
CREATE INDEX IF NOT EXISTS idx_esrs_datapoints_mandatory ON public.esrs_datapoints(mandatory_for);
