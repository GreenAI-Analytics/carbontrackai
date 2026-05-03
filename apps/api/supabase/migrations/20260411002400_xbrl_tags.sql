-- ============================================================================
-- iXBRL / ESEF XBRL Tagging — Migration 24
-- Adds XBRL concept names from the ESRS XBRL taxonomy (EFRAG).
-- ============================================================================

ALTER TABLE public.esrs_datapoints
  ADD COLUMN IF NOT EXISTS xbrl_tag VARCHAR(100),
  ADD COLUMN IF NOT EXISTS xbrl_namespace VARCHAR(200) DEFAULT 'http://efrag.org/esrs/2024/esrs';

COMMENT ON COLUMN public.esrs_datapoints.xbrl_tag IS 'XBRL concept name from EFRAG ESRS taxonomy (e.g., esrs_E1-6-Scope1GHGEmissions)';
COMMENT ON COLUMN public.esrs_datapoints.xbrl_namespace IS 'XBRL taxonomy namespace URI';

-- Seed XBRL tags for existing datapoints
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_ESRS2GOV1_BoardOversight' WHERE datapoint_id = 'ESRS2_GOV1_01';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_ESRS2SBM1_BusinessModelDescription' WHERE datapoint_id = 'ESRS2_SBM1_01';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_ESRS2IRO1_DueDiligenceProcess' WHERE datapoint_id = 'ESRS2_IRO1_01';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_E1-6-Scope1GHGEmissions' WHERE datapoint_id = 'E1_6_01';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_E1-6-Scope2LocationBasedGHGEmissions' WHERE datapoint_id = 'E1_6_02';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_E1-6-Scope2MarketBasedGHGEmissions' WHERE datapoint_id = 'E1_6_03';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_E1-6-TotalEnergyConsumption' WHERE datapoint_id = 'E1_6_04';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_E1-6-GHGIntensityPerNetRevenue' WHERE datapoint_id = 'E1_6_05';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_E2-1-AirPollutantEmissions' WHERE datapoint_id = 'E2_1_01';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_E2-4-MicroplasticsGenerated' WHERE datapoint_id = 'E2_4_01';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_E3-1-WaterConsumptionVolume' WHERE datapoint_id = 'E3_1_01';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_E3-3-WaterDischargeVolume' WHERE datapoint_id = 'E3_3_01';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_E4-2-SitesNearProtectedAreas' WHERE datapoint_id = 'E4_2_01';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_E4-4-BiodiversityActionPlans' WHERE datapoint_id = 'E4_4_01';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_E5-1-MaterialInputMass' WHERE datapoint_id = 'E5_1_01';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_E5-5-WasteByDisposalMethod' WHERE datapoint_id = 'E5_5_01';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_S1-6-TotalEmployeeHeadcount' WHERE datapoint_id = 'S1_6_01';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_S1-6-EmployeeTurnoverRate' WHERE datapoint_id = 'S1_6_02';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_S1-9-GenderDiversityAtManagement' WHERE datapoint_id = 'S1_9_01';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_S1-13-AverageTrainingHours' WHERE datapoint_id = 'S1_13_01';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_S1-14-RecordableWorkRelatedInjuries' WHERE datapoint_id = 'S1_14_01';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_S1-16-GenderPayGap' WHERE datapoint_id = 'S1_16_01';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_S1-17-DiscriminationIncidents' WHERE datapoint_id = 'S1_17_01';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_G1-1-BoardComposition' WHERE datapoint_id = 'G1_1_01';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_G1-3-AntiCorruptionTrainingCoverage' WHERE datapoint_id = 'G1_3_01';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_G1-4-ComplianceIncidents' WHERE datapoint_id = 'G1_4_01';
UPDATE public.esrs_datapoints SET xbrl_tag = 'esrs_G1-5-DataBreaches' WHERE datapoint_id = 'G1_5_01';
