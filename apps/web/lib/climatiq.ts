// ============================================================================
// CarbonTrackAI — Climatiq API Client
// Fetches emission factors from Climatiq Data API v1 and maps them to our
// internal emission_factors table format.
//
// API docs: https://www.climatiq.io/docs
// ============================================================================

const CLIMATIQ_BASE = "https://api.climatiq.io/data/v1";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClimatiqFactor {
  id: string;
  activity_id: string;
  name: string;
  category: string;
  sector: string;
  source: string;
  region: string;
  year: number;
  unit: string;
  unit_type: string;
  factor: number;           // kg CO2e per unit
  factor_calculation_method: string;
  uncertainty?: number;
  source_dataset?: string;
}

export interface ClimatiqSearchResponse {
  results: ClimatiqFactor[];
  total_count: number;
  current_page: number;
  last_page: number;
}

export interface FactorRefreshResult {
  source: string;
  factorsFetched: number;
  factorsInserted: number;
  countries: string[];
  errors: string[];
  durationMs: number;
}

// ─── Activity type → Climatiq activity_id mapping ─────────────────────────────

const ACTIVITY_CLIMATIQ_MAP: Record<string, { activity_id: string; unit: string }> = {
  electricity:       { activity_id: "electricity-supply_grid-source_supplier_mix", unit: "kWh" },
  natural_gas:       { activity_id: "natural-gas_combustion_stationary", unit: "m3" },
  heating_oil:       { activity_id: "fuel-oil_combustion_stationary", unit: "L" },
  petrol_car_fuel:   { activity_id: "gasoline_combustion_mobile", unit: "L" },
  diesel_car_fuel:   { activity_id: "diesel_combustion_mobile", unit: "L" },
};

// EU27 country codes
const EU27_COUNTRIES = [
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR",
  "HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
];

// ─── Client ───────────────────────────────────────────────────────────────────

function getApiKey(): string {
  // Browser-safe: only used in API routes (server-side)
  if (typeof process !== "undefined" && process.env.CLIMATIQ_API_KEY) {
    return process.env.CLIMATIQ_API_KEY;
  }
  throw new Error("CLIMATIQ_API_KEY not set in environment");
}

async function climatiqFetch<T>(path: string): Promise<T> {
  const url = `${CLIMATIQ_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Climatiq API error ${res.status}: ${body}`);
  }

  return res.json();
}

// ─── Factor fetching ──────────────────────────────────────────────────────────

/**
 * Fetch emission factors from Climatiq for all supported activity types
 * across all EU27 countries. Falls back to EU-wide factors when country-
 * specific ones are unavailable.
 */
export async function fetchAllFactors(): Promise<ClimatiqFactor[]> {
  const allFactors: ClimatiqFactor[] = [];
  const seen = new Set<string>();

  for (const [ourType, { activity_id, unit }] of Object.entries(ACTIVITY_CLIMATIQ_MAP)) {
    // Try each country
    for (const country of EU27_COUNTRIES) {
      try {
        const res = await climatiqFetch<ClimatiqSearchResponse>(
          `/emission-factors?activity_id=${activity_id}&region=${country}&year=${new Date().getFullYear()}&per_page=5`
        );

        for (const factor of res.results) {
          const key = `${factor.activity_id}|${factor.region}|${factor.year}`;
          if (!seen.has(key)) {
            seen.add(key);
            allFactors.push({ ...factor, unit, activity_id: ourType });
          }
        }
      } catch (err) {
        // Country-specific may not exist — that's OK, we'll use EU-wide fallback
      }
    }

    // Also fetch EU-wide (region-less) fallback
    try {
      const res = await climatiqFetch<ClimatiqSearchResponse>(
        `/emission-factors?activity_id=${activity_id}&year=${new Date().getFullYear()}&per_page=3`
      );
      for (const factor of res.results) {
        const key = `${factor.activity_id}|EU|${factor.year}`;
        if (!seen.has(key)) {
          seen.add(key);
          allFactors.push({ ...factor, unit, activity_id: ourType, region: "EU" });
        }
      }
    } catch (err) {
      // Ignore — we have fallbacks
    }
  }

  return allFactors;
}

// ─── DB helpers (imported lazily to avoid browser bundling) ───────────────────

export interface EmissionFactorRow {
  activity_type: string;
  unit: string;
  region: string | null;
  value: number;
  metadata: Record<string, unknown>;
}

/**
 * Map Climatiq factors to our emission_factors table row format.
 */
export function mapToDbRows(factors: ClimatiqFactor[]): EmissionFactorRow[] {
  return factors.map((f) => ({
    activity_type: f.activity_id,
    unit: f.unit,
    region: f.region === "EU" ? null : f.region,
    value: f.factor,
    metadata: {
      climatiq_id: f.id,
      name: f.name,
      category: f.category,
      sector: f.sector,
      source: f.source,
      year: f.year,
      unit_type: f.unit_type,
      calculation_method: f.factor_calculation_method,
      uncertainty: f.uncertainty,
    },
  }));
}

// ─── Activity type mapping for our calculation engine ─────────────────────────

/**
 * Map our internal activity types to Climatiq activity IDs for
 * use in the calculation engine's provenance tracking.
 */
export function getClimatiqActivityId(ourType: string): string | undefined {
  return ACTIVITY_CLIMATIQ_MAP[ourType]?.activity_id;
}
