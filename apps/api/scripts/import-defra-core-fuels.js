import { createImporter } from "./import-factors/common.js";

const ACTIVITY_TYPE_MAP = new Map([
  ["natural gas", "natural_gas"],
  ["gas", "natural_gas"],
  ["natural_gas", "natural_gas"],
  ["heating oil", "heating_oil"],
  ["heating_oil", "heating_oil"],
  ["fuel oil", "heating_oil"],
  ["petrol", "petrol_car_fuel"],
  ["petrol car fuel", "petrol_car_fuel"],
  ["petrol_car_fuel", "petrol_car_fuel"],
  ["diesel", "diesel_car_fuel"],
  ["diesel car fuel", "diesel_car_fuel"],
  ["diesel_car_fuel", "diesel_car_fuel"],
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

function normalizeActivityType(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  const mapped = ACTIVITY_TYPE_MAP.get(normalized);
  if (!mapped) {
    throw new Error(`Unsupported DEFRA core fuel activity type: ${value}`);
  }
  return mapped;
}

function normalizeUnit(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new Error("Unit is required.");
  }
  return normalized === "m³" ? "m3" : normalized;
}

function toNumber(value) {
  if (typeof value === "number") return value;
  return Number(String(value).replace(/,/g, ".").trim());
}

const importer = createImporter({
  name: "defra-core-fuels-importer",
  mapRow(rawRow) {
    const year = pick(rawRow, ["year", "dataset_year", "datasetYear", "reporting_year"]);
    const datasetVersion = pick(rawRow, ["dataset_version", "datasetVersion"]) ?? `${year ?? "2024"}_snapshot`;
    const sourceUrl =
      pick(rawRow, ["source_url", "sourceUrl"]) ??
      "https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting";
    const license =
      pick(rawRow, ["license", "licence"]) ??
      "UK Open Government Licence v3.0";

    return {
      datasetName: "DEFRA Core Fuels",
      datasetVersion,
      sourceUrl,
      license,
      factorSourceName: "DEFRA Core Fuels",
      factorSourceProvider: "defra_dataset",
      factorSourceUrl: sourceUrl,
      activityType: normalizeActivityType(pick(rawRow, ["activity_type", "activityType", "fuel", "name"])),
      unit: normalizeUnit(pick(rawRow, ["unit", "uom"])),
      region: pick(rawRow, ["region", "country_code", "countryCode"]) ?? "EU",
      value: toNumber(pick(rawRow, ["factor", "value", "kg_co2e_per_unit", "factor_kg_co2e_per_unit"])),
      effectiveDate: `${year ?? "2024"}-01-01`,
      validTo: `${year ?? "2024"}-12-31`,
      metadata: {
        source: "DEFRA Core Fuels",
        dataset_year: Number(year ?? "2024"),
        category: "core_fuels",
      },
    };
  },
  describe(normalizedRows) {
    const datasetVersion = normalizedRows[0]?.datasetVersion ?? "unknown_snapshot";
    return {
      datasetName: "DEFRA Core Fuels",
      datasetVersion,
      sourceUrl:
        normalizedRows[0]?.sourceUrl ??
        "https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting",
      license: normalizedRows[0]?.license ?? "UK Open Government Licence v3.0",
      factorSourceName: "DEFRA Core Fuels",
      factorSourceProvider: "defra_dataset",
      factorSourceUrl:
        normalizedRows[0]?.sourceUrl ??
        "https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting",
      notes: "Imported by defra-core-fuels-importer. Intended for EU fallback or cross-country core fuel defaults.",
    };
  },
});

await importer();