-- ============================================================================
-- EMISSION FACTORS SEED DATA
-- EU27 Emission Factors from ADEME, MITECO, EEA, and Climatiq
-- ============================================================================

-- ============================================================================
-- FRANCE: ADEME Base Carbone Factors
-- ============================================================================

INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'ADEME Base Carbone' LIMIT 1),
  'natural_gas', 'm3', 'FR', 2.04, '2024-01-01'::DATE, 
  '{"source": "ADEME Base Carbone", "category": "heating", "dataset_year": 2023}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'natural_gas' AND unit = 'm3' AND region = 'FR'
);

INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'ADEME Base Carbone' LIMIT 1),
  'heating_oil', 'L', 'FR', 3.15, '2024-01-01'::DATE,
  '{"source": "ADEME Base Carbone", "category": "heating", "dataset_year": 2023}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'heating_oil' AND unit = 'L' AND region = 'FR'
);

INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'ADEME Base Carbone' LIMIT 1),
  'electricity', 'kWh', 'FR', 0.057, '2024-01-01'::DATE,
  '{"source": "ADEME Base Carbone", "note": "French grid (high renewable)", "dataset_year": 2023}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'electricity' AND unit = 'kWh' AND region = 'FR'
);

INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'ADEME Base Carbone' LIMIT 1),
  'petrol_car_fuel', 'L', 'FR', 2.31, '2024-01-01'::DATE,
  '{"source": "ADEME Base Carbone", "note": "Average car", "dataset_year": 2023}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'petrol_car_fuel' AND unit = 'L' AND region = 'FR'
);

INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'ADEME Base Carbone' LIMIT 1),
  'diesel_car_fuel', 'L', 'FR', 2.68, '2024-01-01'::DATE,
  '{"source": "ADEME Base Carbone", "note": "Average car", "dataset_year": 2023}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'diesel_car_fuel' AND unit = 'L' AND region = 'FR'
);

INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'ADEME Base Carbone' LIMIT 1),
  'flight_economy', 'km', 'FR', 0.285, '2024-01-01'::DATE,
  '{"source": "ADEME Base Carbone", "note": "Short-haul economy", "dataset_year": 2023}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'flight_economy' AND unit = 'km' AND region = 'FR'
);

-- ============================================================================
-- SPAIN: MITECO Factors
-- ============================================================================

INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'Spain MITECO' LIMIT 1),
  'natural_gas', 'm3', 'ES', 2.04, '2024-01-01'::DATE,
  '{"source": "MITECO Spain", "category": "heating"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'natural_gas' AND unit = 'm3' AND region = 'ES'
);

INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'Spain MITECO' LIMIT 1),
  'electricity', 'kWh', 'ES', 0.371, '2024-01-01'::DATE,
  '{"source": "MITECO Spain", "note": "Spanish grid mix"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'electricity' AND unit = 'kWh' AND region = 'ES'
);

INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'Spain MITECO' LIMIT 1),
  'diesel_car_fuel', 'L', 'ES', 2.68, '2024-01-01'::DATE,
  '{"source": "MITECO Spain"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'diesel_car_fuel' AND unit = 'L' AND region = 'ES'
);

-- ============================================================================
-- EU-WIDE: EEA Factors (via Climatiq)
-- ============================================================================

-- Austria
INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'EEA (via Climatiq)' LIMIT 1),
  'electricity', 'kWh', 'AT', 0.142, '2024-01-01'::DATE,
  '{"source": "EEA", "note": "Austrian grid (renewable-heavy)"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'electricity' AND unit = 'kWh' AND region = 'AT'
);

-- Belgium
INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'EEA (via Climatiq)' LIMIT 1),
  'electricity', 'kWh', 'BE', 0.195, '2024-01-01'::DATE,
  '{"source": "EEA", "note": "Belgian grid"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'electricity' AND unit = 'kWh' AND region = 'BE'
);

-- Germany
INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'EEA (via Climatiq)' LIMIT 1),
  'electricity', 'kWh', 'DE', 0.340, '2024-01-01'::DATE,
  '{"source": "EEA", "note": "German grid"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'electricity' AND unit = 'kWh' AND region = 'DE'
);

-- Netherlands
INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'EEA (via Climatiq)' LIMIT 1),
  'electricity', 'kWh', 'NL', 0.287, '2024-01-01'::DATE,
  '{"source": "EEA", "note": "Dutch grid"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'electricity' AND unit = 'kWh' AND region = 'NL'
);

-- Ireland
INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'EEA (via Climatiq)' LIMIT 1),
  'electricity', 'kWh', 'IE', 0.268, '2024-01-01'::DATE,
  '{"source": "EEA", "note": "Irish grid"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'electricity' AND unit = 'kWh' AND region = 'IE'
);

-- Italy
INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'EEA (via Climatiq)' LIMIT 1),
  'electricity', 'kWh', 'IT', 0.315, '2024-01-01'::DATE,
  '{"source": "EEA", "note": "Italian grid"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'electricity' AND unit = 'kWh' AND region = 'IT'
);

-- Poland
INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'EEA (via Climatiq)' LIMIT 1),
  'electricity', 'kWh', 'PL', 0.739, '2024-01-01'::DATE,
  '{"source": "EEA", "note": "Polish grid (coal-heavy)"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'electricity' AND unit = 'kWh' AND region = 'PL'
);

-- ============================================================================
-- GENERIC EU FACTORS (for countries without specific data)
-- ============================================================================

INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'EEA (via Climatiq)' LIMIT 1),
  'natural_gas', 'm3', 'EU', 2.04, '2024-01-01'::DATE,
  '{"source": "EEA", "note": "EU-wide average"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'natural_gas' AND unit = 'm3' AND region = 'EU'
);

INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'EEA (via Climatiq)' LIMIT 1),
  'heating_oil', 'L', 'EU', 3.15, '2024-01-01'::DATE,
  '{"source": "EEA", "note": "EU-wide average"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'heating_oil' AND unit = 'L' AND region = 'EU'
);

INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'EEA (via Climatiq)' LIMIT 1),
  'petrol_car_fuel', 'L', 'EU', 2.31, '2024-01-01'::DATE,
  '{"source": "EEA", "note": "EU-wide average"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'petrol_car_fuel' AND unit = 'L' AND region = 'EU'
);

INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'EEA (via Climatiq)' LIMIT 1),
  'diesel_car_fuel', 'L', 'EU', 2.68, '2024-01-01'::DATE,
  '{"source": "EEA", "note": "EU-wide average"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'diesel_car_fuel' AND unit = 'L' AND region = 'EU'
);

-- ============================================================================
-- BUSINESS TRAVEL & TRANSPORT FACTORS (Scope 3)
-- ============================================================================

-- Flight factors (kg CO2e per km)
INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'Climatiq' LIMIT 1),
  'flight_short_haul_economy', 'km', 'EU', 0.285, '2024-01-01'::DATE,
  '{"scope": 3, "category": "business_travel", "note": "Short-haul < 1500 km"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'flight_short_haul_economy' AND unit = 'km'
);

INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'Climatiq' LIMIT 1),
  'flight_short_haul_business', 'km', 'EU', 0.665, '2024-01-01'::DATE,
  '{"scope": 3, "category": "business_travel", "note": "Business class multiplier ~2.3x economy"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'flight_short_haul_business' AND unit = 'km'
);

INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'Climatiq' LIMIT 1),
  'flight_long_haul_economy', 'km', 'EU', 0.195, '2024-01-01'::DATE,
  '{"scope": 3, "category": "business_travel", "note": "Long-haul > 1500 km"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'flight_long_haul_economy' AND unit = 'km'
);

-- Train factors
INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'Climatiq' LIMIT 1),
  'train', 'km', 'EU', 0.041, '2024-01-01'::DATE,
  '{"scope": 3, "category": "business_travel", "note": "EU-wide passenger train average"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'train' AND unit = 'km'
);

-- Hotel stay
INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'Climatiq' LIMIT 1),
  'hotel_night', 'night', 'EU', 0.067, '2024-01-01'::DATE,
  '{"scope": 3, "category": "business_travel", "note": "Average European hotel per night"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'hotel_night' AND unit = 'night'
);

-- Upstream transport (freight)
INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'Climatiq' LIMIT 1),
  'transport_road_freight', 'tkm', 'EU', 0.116, '2024-01-01'::DATE,
  '{"scope": 3, "category": "upstream_transport", "note": "Tonne-km by truck"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'transport_road_freight' AND unit = 'tkm'
);

INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'Climatiq' LIMIT 1),
  'transport_rail_freight', 'tkm', 'EU', 0.023, '2024-01-01'::DATE,
  '{"scope": 3, "category": "upstream_transport", "note": "Tonne-km by train"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'transport_rail_freight' AND unit = 'tkm'
);

INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'Climatiq' LIMIT 1),
  'transport_sea_freight', 'tkm', 'EU', 0.009, '2024-01-01'::DATE,
  '{"scope": 3, "category": "upstream_transport", "note": "Tonne-km by ship"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'transport_sea_freight' AND unit = 'tkm'
);

-- ============================================================================
-- SUPPLY CHAIN (SPEND-BASED) FACTORS
-- ============================================================================

-- Upstream spending factors (EUR spent → tCO2e) - from MRIO databases
INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'Climatiq' LIMIT 1),
  'spend_raw_materials', 'EUR', 'EU', 0.00050, '2024-01-01'::DATE,
  '{"scope": 3, "category": "purchased_goods", "note": "Avg emission intensity €/EUR - raw materials"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'spend_raw_materials' AND unit = 'EUR'
);

INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'Climatiq' LIMIT 1),
  'spend_packaging', 'EUR', 'EU', 0.00060, '2024-01-01'::DATE,
  '{"scope": 3, "category": "purchased_goods", "note": "Avg emission intensity €/EUR - packaging"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'spend_packaging' AND unit = 'EUR'
);

INSERT INTO public.emission_factors (source_id, activity_type, unit, region, value, effective_date, metadata)
SELECT 
  (SELECT id FROM public.factor_sources WHERE name = 'Climatiq' LIMIT 1),
  'spend_it_equipment', 'EUR', 'EU', 0.00040, '2024-01-01'::DATE,
  '{"scope": 3, "category": "purchased_goods", "note": "Avg emission intensity €/EUR - IT/electronics"}'::JSONB
WHERE NOT EXISTS (
  SELECT 1 FROM public.emission_factors 
  WHERE activity_type = 'spend_it_equipment' AND unit = 'EUR'
);

-- ============================================================================
-- NOTE: These seed factors are EU-wide averages/defaults
-- In production, integrate with:
-- 1. Climatiq API for real-time factor updates
-- 2. Country-specific APIs (France ADEME, Spain MITECO)
-- 3. Dynamic electricity grid factors (update quarterly)
-- ============================================================================
