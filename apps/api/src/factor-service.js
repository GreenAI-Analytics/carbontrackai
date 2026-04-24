import {
  ACTIVITY_META,
  COUNTRY_PROVIDER,
  FALLBACK_FACTORS,
  SUPPORTED_COUNTRY_CODES,
} from "./constants.js";
import { supabaseAdmin } from "./supabase.js";
import { fetchFranceFactors } from "./adapters/france.js";
import { fetchSpainFactors } from "./adapters/spain.js";
import { fetchIrelandFactors } from "./adapters/ireland.js";

function endOfReportingYear(reportingYear) {
  return `${reportingYear}-12-31`;
}

function startOfReportingYear(reportingYear) {
  return `${reportingYear}-01-01`;
}

function buildFactorQuery(selectClause, normalizedCountry, activityTypes, normalizedReportingYear) {
  return supabaseAdmin
    .from("emission_factors")
    .select(selectClause)
    .in("activity_type", activityTypes)
    .in("region", [normalizedCountry, "EU"])
    .lte("effective_date", endOfReportingYear(normalizedReportingYear))
    .or(`expiry_date.is.null,expiry_date.gte.${startOfReportingYear(normalizedReportingYear)}`);
}

async function loadActiveDatasets() {
  const activeDatasetsById = new Map();

  const { data, error } = await supabaseAdmin
    .from("dataset_registry")
    .select("id, name, version, status, activated_at")
    .eq("status", "active");

  if (error) {
    console.warn(`Dataset registry query failed: ${error.message}`);
    return { activeDatasetsById, governanceSchemaAvailable: false };
  }

  for (const dataset of data ?? []) {
    activeDatasetsById.set(dataset.id, dataset);
  }

  return { activeDatasetsById, governanceSchemaAvailable: true };
}

async function fetchDbFactors(normalizedCountry, activityTypes, normalizedReportingYear) {
  const enhanced = await buildFactorQuery(
    "id, activity_type, unit, region, value, metadata, source_version, license, import_batch_id, effective_date, expiry_date, factor_sources(provider)",
    normalizedCountry,
    activityTypes,
    normalizedReportingYear
  );

  if (!enhanced.error) {
    return {
      data: enhanced.data ?? [],
      error: null,
      governanceColumnsAvailable: true,
    };
  }

  if (!/source_version|license|import_batch_id/i.test(enhanced.error.message)) {
    return {
      data: [],
      error: enhanced.error,
      governanceColumnsAvailable: false,
    };
  }

  console.warn(`Emission factor governance columns unavailable, retrying legacy query: ${enhanced.error.message}`);

  const legacy = await buildFactorQuery(
    "id, activity_type, unit, region, value, metadata, effective_date, expiry_date, factor_sources(provider)",
    normalizedCountry,
    activityTypes,
    normalizedReportingYear
  );

  if (legacy.error) {
    return {
      data: [],
      error: legacy.error,
      governanceColumnsAvailable: false,
    };
  }

  return {
    data: (legacy.data ?? []).map((row) => ({
      ...row,
      source_version: row.metadata?.dataset_year ? String(row.metadata.dataset_year) : null,
      license: null,
      import_batch_id: null,
    })),
    error: null,
    governanceColumnsAvailable: false,
  };
}

function providerFor(countryCode) {
  return COUNTRY_PROVIDER[countryCode] ?? "local_cache";
}

async function fetchLiveCountryFactors(countryCode, activityTypes) {
  if (countryCode === "FR") return fetchFranceFactors(activityTypes);
  if (countryCode === "ES") return fetchSpainFactors(activityTypes);
  if (countryCode === "IE") return fetchIrelandFactors(activityTypes);
  return { factors: {}, diagnostics: [] };
}

function pickBestDbFactor(type, countryCode, dbFactors, activeDatasetsById, governanceContext) {
  const direct = dbFactors.find((f) => f.activity_type === type && f.region === countryCode);
  if (direct) {
    const activeDataset = direct.import_batch_id ? activeDatasetsById.get(direct.import_batch_id) : null;
    return {
      factorId: direct.id,
      value: Number(direct.value),
      source: "database",
      sourceRegion: countryCode,
      sourceProvider: direct?.factor_sources?.provider ?? "local_cache",
      sourceVersion: direct.source_version ?? null,
      sourceLicense: direct.license ?? null,
      importBatchId: direct.import_batch_id ?? null,
      datasetName: activeDataset?.name ?? null,
      datasetVersion: activeDataset?.version ?? null,
      datasetStatus: activeDataset
        ? "active"
        : direct.import_batch_id
        ? "inactive"
        : governanceContext.governanceSchemaAvailable && governanceContext.governanceColumnsAvailable
        ? "unmanaged"
        : "legacy_schema",
    };
  }

  const eu = dbFactors.find(
    (f) => f.activity_type === type && (f.region === "EU" || f.region == null)
  );

  if (eu) {
    const activeDataset = eu.import_batch_id ? activeDatasetsById.get(eu.import_batch_id) : null;
    return {
      factorId: eu.id,
      value: Number(eu.value),
      source: "database",
      sourceRegion: eu.region ?? "EU",
      sourceProvider: eu?.factor_sources?.provider ?? "local_cache",
      sourceVersion: eu.source_version ?? null,
      sourceLicense: eu.license ?? null,
      importBatchId: eu.import_batch_id ?? null,
      datasetName: activeDataset?.name ?? null,
      datasetVersion: activeDataset?.version ?? null,
      datasetStatus: activeDataset
        ? "active"
        : eu.import_batch_id
        ? "inactive"
        : governanceContext.governanceSchemaAvailable && governanceContext.governanceColumnsAvailable
        ? "unmanaged"
        : "legacy_schema",
    };
  }

  return null;
}

export async function resolveFactors(countryCode, activityTypes, reportingYear) {
  const normalizedCountry = (countryCode ?? "EU").toUpperCase();
  const normalizedReportingYear = Number.isInteger(reportingYear)
    ? reportingYear
    : new Date().getUTCFullYear();

  const { activeDatasetsById, governanceSchemaAvailable } = await loadActiveDatasets();
  const { data, error, governanceColumnsAvailable } = await fetchDbFactors(
    normalizedCountry,
    activityTypes,
    normalizedReportingYear
  );

  if (error) {
    // Keep the calculation service available even if DB seed tables are not reachable.
    // In that case, provider integrations + built-in fallbacks are used.
    console.warn(`Emission factor DB query failed: ${error.message}`);
  }

  let liveFactors = {};
  let diagnostics = [];

  if (SUPPORTED_COUNTRY_CODES.includes(normalizedCountry)) {
    const live = await fetchLiveCountryFactors(normalizedCountry, activityTypes);
    liveFactors = live.factors;
    diagnostics = live.diagnostics;
  }

  const resolved = {};
  const resolvedDetails = {};
  const provenance = [];

  for (const type of activityTypes) {
    const liveValue = liveFactors[type];
    if (typeof liveValue === "number" && liveValue > 0) {
      resolved[type] = liveValue;
      resolvedDetails[type] = {
        value: liveValue,
        source: "country_api",
        sourceProvider: providerFor(normalizedCountry),
        sourceRegion: normalizedCountry,
        sourceVersion: null,
        sourceLicense: null,
        factorId: null,
        appliedTier: "tier_2_activity_default",
        datasetStatus: "provider_live",
        datasetName: null,
        datasetVersion: null,
      };
      provenance.push({
        activityType: type,
        source: "country_api",
        sourceProvider: providerFor(normalizedCountry),
        sourceRegion: normalizedCountry,
        factorValue: liveValue,
        sourceVersion: null,
        sourceLicense: null,
        datasetStatus: "provider_live",
        reportingYear: normalizedReportingYear,
      });
      continue;
    }

    const dbValue = pickBestDbFactor(
      type,
      normalizedCountry,
      error ? [] : data ?? [],
      activeDatasetsById,
      { governanceSchemaAvailable, governanceColumnsAvailable }
    );
    if (dbValue) {
      resolved[type] = dbValue.value;
      resolvedDetails[type] = {
        factorId: dbValue.factorId,
        value: dbValue.value,
        source: dbValue.source,
        sourceProvider: dbValue.sourceProvider,
        sourceRegion: dbValue.sourceRegion,
        sourceVersion: dbValue.sourceVersion,
        sourceLicense: dbValue.sourceLicense,
        appliedTier: "tier_2_activity_default",
        datasetStatus: dbValue.datasetStatus,
        datasetName: dbValue.datasetName,
        datasetVersion: dbValue.datasetVersion,
      };
      provenance.push({
        activityType: type,
        source: dbValue.source,
        sourceProvider: dbValue.sourceProvider,
        sourceRegion: dbValue.sourceRegion,
        factorValue: dbValue.value,
        sourceVersion: dbValue.sourceVersion,
        sourceLicense: dbValue.sourceLicense,
        datasetStatus: dbValue.datasetStatus,
        datasetName: dbValue.datasetName,
        datasetVersion: dbValue.datasetVersion,
        reportingYear: normalizedReportingYear,
        governanceSchemaAvailable,
        governanceColumnsAvailable,
      });
      continue;
    }

    const fallback = FALLBACK_FACTORS[type] ?? 0;
    resolved[type] = fallback;
    resolvedDetails[type] = {
      value: fallback,
      source: "built_in_fallback",
      sourceProvider: "internal",
      sourceRegion: "EU",
      sourceVersion: null,
      sourceLicense: null,
      factorId: null,
      appliedTier: "tier_3_fallback",
      datasetStatus: "fallback",
      datasetName: null,
      datasetVersion: null,
    };
    provenance.push({
      activityType: type,
      source: "built_in_fallback",
      sourceProvider: "internal",
      sourceRegion: "EU",
      factorValue: fallback,
      sourceVersion: null,
      sourceLicense: null,
      datasetStatus: "fallback",
      reportingYear: normalizedReportingYear,
    });
  }

  return {
    countryCode: normalizedCountry,
    reportingYear: normalizedReportingYear,
    resolved,
    resolvedDetails,
    diagnostics,
    provenance,
  };
}

export function assessReportingQuality(provenance) {
  const fallbackEntries = provenance.filter((p) => p.source === "built_in_fallback");
  const dbEntries = provenance.filter((p) => p.source === "database");
  const dbGovernanceIssues = dbEntries.filter(
    (p) => !p.sourceVersion || !p.sourceLicense || p.datasetStatus !== "active"
  );
  const inactiveDatasetEntries = dbEntries.filter((p) => p.datasetStatus === "inactive");
  const unmanagedDatasetEntries = dbEntries.filter((p) => p.datasetStatus === "unmanaged");
  const legacySchemaEntries = dbEntries.filter((p) => p.datasetStatus === "legacy_schema");

  return {
    reportingReady: fallbackEntries.length === 0 && dbGovernanceIssues.length === 0,
    fallbackActivityTypes: fallbackEntries.map((p) => p.activityType),
    databaseActivityTypes: dbEntries.map((p) => p.activityType),
    governanceIssueActivityTypes: dbGovernanceIssues.map((p) => p.activityType),
    inactiveDatasetActivityTypes: inactiveDatasetEntries.map((p) => p.activityType),
    unmanagedDatasetActivityTypes: unmanagedDatasetEntries.map((p) => p.activityType),
    legacySchemaActivityTypes: legacySchemaEntries.map((p) => p.activityType),
  };
}

export function calculateModule1(records, resolvedFactors, resolvedDetails) {
  let scope1Kg = 0;
  let scope2LocationKg = 0;
  let totalMWh = 0;

  const breakdown = [];

  for (const record of records) {
    const type = record.activity_type;
    const meta = ACTIVITY_META[type];
    if (!meta) continue;

    const quantity = Number(record.quantity);
    const factorValue = Number(resolvedFactors[type] ?? FALLBACK_FACTORS[type] ?? 0);
    const factorDetail = resolvedDetails[type];

    const emissionsKg = quantity * factorValue;
    const energyMWh = quantity * meta.mwhPerUnit;

    breakdown.push({
      activityType: type,
      label: meta.label,
      quantity,
      unit: meta.unit,
      scope: meta.scope,
      factorId: factorDetail?.factorId ?? null,
      factorValue,
      factorRegion: factorDetail?.sourceRegion ?? "EU",
      factorProvider: factorDetail?.sourceProvider ?? "internal",
      factorSourceVersion: factorDetail?.sourceVersion ?? null,
      factorLicense: factorDetail?.sourceLicense ?? null,
      appliedTier: factorDetail?.appliedTier ?? "tier_3_fallback",
      factorDatasetStatus: factorDetail?.datasetStatus ?? "fallback",
      factorDatasetName: factorDetail?.datasetName ?? null,
      factorDatasetVersion: factorDetail?.datasetVersion ?? null,
      emissionsKgCo2e: emissionsKg,
      emissionsTco2e: emissionsKg / 1000,
      energyMWh,
    });

    totalMWh += energyMWh;

    if (meta.scope === "scope_1") {
      scope1Kg += emissionsKg;
    } else {
      scope2LocationKg += emissionsKg;
    }
  }

  return {
    scope1Tco2e: scope1Kg / 1000,
    scope2LocationTco2e: scope2LocationKg / 1000,
    totalMWh,
    breakdown,
  };
}
