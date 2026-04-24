import { createImporter } from "./import-factors/common.js";

const EU_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

function pick(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return null;
}

function toNumber(value) {
  if (typeof value === "number") return value;
  return Number(String(value).replace(/,/g, ".").trim());
}

function normalizeCountry(value) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!EU_COUNTRIES.has(normalized)) {
    throw new Error(`Unsupported or missing EU country code: ${value}`);
  }
  return normalized;
}

const importer = createImporter({
  name: "eea-electricity-importer",
  mapRow(rawRow) {
    const countryCode = normalizeCountry(
      pick(rawRow, ["country_code", "countryCode", "region", "iso2", "country"])
    );
    const year = pick(rawRow, ["year", "reporting_year", "reportingYear", "dataset_year"]);
    const datasetVersion = pick(rawRow, ["dataset_version", "datasetVersion"]) ?? `${year ?? "2024"}_snapshot`;
    const sourceUrl =
      pick(rawRow, ["source_url", "sourceUrl"]) ??
      "https://www.eea.europa.eu/en/analysis/indicators/greenhouse-gas-emission-intensity-of-1";
    const license =
      pick(rawRow, ["license", "licence"]) ??
      "EEA standard re-use policy (verify latest published terms before activation)";

    return {
      datasetName: "EEA Electricity",
      datasetVersion,
      sourceUrl,
      license,
      factorSourceName: "EEA Electricity",
      factorSourceProvider: "eea_dataset",
      factorSourceUrl: sourceUrl,
      activityType: "electricity",
      unit: "kWh",
      region: countryCode,
      value: toNumber(pick(rawRow, ["factor", "value", "kg_co2e_per_kwh", "factor_kg_co2e_per_kwh"])),
      effectiveDate: `${year ?? "2024"}-01-01`,
      validTo: `${year ?? "2024"}-12-31`,
      metadata: {
        source: "EEA Electricity",
        raw_country: pick(rawRow, ["country", "country_name"]) ?? countryCode,
        dataset_year: Number(year ?? "2024"),
      },
    };
  },
  describe(normalizedRows) {
    const datasetVersion = normalizedRows[0]?.datasetVersion ?? "unknown_snapshot";
    return {
      datasetName: "EEA Electricity",
      datasetVersion,
      sourceUrl: normalizedRows[0]?.sourceUrl ?? "https://www.eea.europa.eu/",
      license:
        normalizedRows[0]?.license ??
        "EEA standard re-use policy (verify latest published terms before activation)",
      factorSourceName: "EEA Electricity",
      factorSourceProvider: "eea_dataset",
      factorSourceUrl: normalizedRows[0]?.sourceUrl ?? "https://www.eea.europa.eu/",
      notes: "Imported by eea-electricity-importer. Review coverage before activation.",
    };
  },
});

await importer();