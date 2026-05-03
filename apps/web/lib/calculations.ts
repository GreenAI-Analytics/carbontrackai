// ============================================================================
// CarbonTrackAI — Module 1 Calculation Engine
// Computes Scope 1 and Scope 2 (location-based) emissions from activity data.
// Reference: VSME B1/B2, GHG Protocol, EU ETS/EEA emission factors.
// ============================================================================

export type ActivityType =
  | "natural_gas"
  | "heating_oil"
  | "electricity"
  | "petrol_car_fuel"
  | "diesel_car_fuel";

export const ACTIVITY_TYPES = [
  "natural_gas",
  "heating_oil",
  "electricity",
  "petrol_car_fuel",
  "diesel_car_fuel",
] as const satisfies readonly ActivityType[];

export type ActivityMeta = {
  label: string;
  unit: string;
  scope: "scope_1" | "scope_2";
  /** Multiply quantity by this to get MWh */
  mwhPerUnit: number;
  hint: string;
};

export const ACTIVITY_META: Record<ActivityType, ActivityMeta> = {
  natural_gas: {
    label: "Natural Gas",
    unit: "m³",
    scope: "scope_1",
    mwhPerUnit: 10.55 / 1000, // EU average gross calorific value: 10.55 kWh/m³
    hint: "Total cubic metres consumed (from utility bills)",
  },
  heating_oil: {
    label: "Heating Oil",
    unit: "L",
    scope: "scope_1",
    mwhPerUnit: 10.35 / 1000, // 10.35 kWh/L
    hint: "Litres of fuel oil / kerosene used for heating",
  },
  electricity: {
    label: "Electricity",
    unit: "kWh",
    scope: "scope_2",
    mwhPerUnit: 1 / 1000, // 1 MWh = 1,000 kWh
    hint: "Total purchased electricity (from utility bills or smart meter)",
  },
  petrol_car_fuel: {
    label: "Petrol (Company Car)",
    unit: "L",
    scope: "scope_1",
    mwhPerUnit: 8.64 / 1000, // 8.64 kWh/L petrol
    hint: "Litres of petrol consumed by company-owned vehicles",
  },
  diesel_car_fuel: {
    label: "Diesel (Company Car)",
    unit: "L",
    scope: "scope_1",
    mwhPerUnit: 9.59 / 1000, // 9.59 kWh/L diesel
    hint: "Litres of diesel consumed by company-owned vehicles",
  },
};

// EU-wide fallback factors (kg CO₂e per unit) used when no country-specific
// factor is found in the database. Sources: ADEME Base Carbone, EU ETS averages.
export const FALLBACK_FACTORS: Record<ActivityType, number> = {
  natural_gas: 2.04,     // kg CO₂e / m³
  heating_oil: 2.96,     // kg CO₂e / L
  electricity: 0.295,    // kg CO₂e / kWh (EU27 unweighted average, EEA 2023)
  petrol_car_fuel: 2.31, // kg CO₂e / L (tank-to-wheel)
  diesel_car_fuel: 2.68, // kg CO₂e / L (tank-to-wheel)
};

// ─── Residual Mix Factors (AIB European Residual Mix 2023, kg CO₂e/kWh) ───
// Source: Association of Issuing Bodies (AIB) — used for market-based Scope 2
// when contractual instruments do not cover 100% of electricity consumption.
export const RESIDUAL_MIX_FACTORS: Record<string, number> = {
  AT: 0.185, BE: 0.185, BG: 0.520, HR: 0.350, CY: 0.670, CZ: 0.510,
  DK: 0.210, EE: 0.730, FI: 0.180, FR: 0.076, DE: 0.420, GR: 0.580,
  HU: 0.310, IE: 0.410, IT: 0.330, LV: 0.230, LT: 0.200, LU: 0.350,
  MT: 0.530, NL: 0.340, PL: 0.680, PT: 0.310, RO: 0.420, SK: 0.210,
  SI: 0.310, ES: 0.280, SE: 0.025,
};

export const EU_RESIDUAL_MIX_DEFAULT = 0.350; // kg CO₂e/kWh — conservative EU average

// ─── Contractual instrument types ───

export interface ContractualInstrument {
  instrument_type: string;
  mwh_covered: number;
  supplier?: string | null;
  country?: string | null;
}

// ─── Market-based Scope 2 ───

/**
 * Calculate market-based Scope 2 emissions.
 * Market-based = (consumption − certificated MWh) × residual-mix factor
 *               + certificated MWh × supplier-specific factor (or 0 for renewables)
 */
export function calculateMarketBasedScope2(
  totalElectricityMWh: number,
  instruments: ContractualInstrument[],
  countryCode: string
): { scope2MarketTco2e: number; certificatedMWh: number; residualMWh: number } {
  const certificatedMWh = instruments.reduce((s, i) => s + i.mwh_covered, 0);
  const residualMWh = Math.max(0, totalElectricityMWh - certificatedMWh);
  const residualFactor = RESIDUAL_MIX_FACTORS[countryCode] ?? EU_RESIDUAL_MIX_DEFAULT;

  // Certificated MWh: assume 0 kg CO2e for GoOs/RECs (renewable), use supplier factor for PPAs
  let certificatedEmissions = 0;
  for (const inst of instruments) {
    if (inst.instrument_type === "ppa") {
      // PPAs may have a disclosed emission factor; default to grid average if not specified
      const ppaFactor = RESIDUAL_MIX_FACTORS[inst.country ?? countryCode] ?? EU_RESIDUAL_MIX_DEFAULT;
      certificatedEmissions += inst.mwh_covered * ppaFactor * 0.1; // PPAs typically lower-carbon
    }
    // GoOs and RECs = zero emissions (renewable)
  }

  const residualEmissionsKg = residualMWh * 1000 * residualFactor;
  const certificatedEmissionsKg = certificatedEmissions; // PPA emissions included, GoOs/RECs = 0
  const totalKg = residualEmissionsKg + certificatedEmissionsKg;

  return {
    scope2MarketTco2e: totalKg / 1000,
    certificatedMWh,
    residualMWh,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityRecord = {
  id: string;
  activity_type: ActivityType;
  quantity: number;
  unit: string;
};

export type EmissionFactor = {
  activity_type: string;
  unit: string;
  region: string | null;
  value: number; // kg CO₂e per unit
};

export type BreakdownItem = {
  activityType: ActivityType;
  label: string;
  quantity: number;
  unit: string;
  emissionsKgCo2e: number;
  emissionsTco2e: number;
  energyMWh: number;
  factorValue: number; // kg CO₂e per unit
  factorRegion: string;
  scope: "scope_1" | "scope_2";
};

export type CalculationResult = {
  scope1Tco2e: number;
  scope2LocationTco2e: number;
  totalMWh: number;
  breakdown: BreakdownItem[];
};

// ─── Core calculation ─────────────────────────────────────────────────────────

/**
 * Calculates Scope 1 and Scope 2 (location-based) emissions.
 *
 * Factor resolution order:
 *   1. Country-specific (matching `countryCode`)
 *   2. EU-wide (region = null or 'EU')
 *   3. Built-in EU average fallback constant
 */
export function calculateEmissions(
  records: ActivityRecord[],
  factors: EmissionFactor[],
  countryCode: string
): CalculationResult {
  function getBestFactor(type: ActivityType): { value: number; region: string } {
    const countryMatch = factors.find(
      (f) => f.activity_type === type && f.region === countryCode
    );
    if (countryMatch) return { value: countryMatch.value, region: countryCode };

    const euMatch = factors.find(
      (f) => f.activity_type === type && (f.region === null || f.region === "EU")
    );
    if (euMatch) return { value: euMatch.value, region: euMatch.region ?? "EU" };

    return { value: FALLBACK_FACTORS[type] ?? 0, region: "EU (built-in)" };
  }

  const breakdown: BreakdownItem[] = [];
  let scope1Kg = 0;
  let scope2LocationKg = 0;
  let totalMWh = 0;

  for (const record of records) {
    const meta = ACTIVITY_META[record.activity_type];
    if (!meta) continue;

    const factor = getBestFactor(record.activity_type);
    const emissionsKg = record.quantity * factor.value;
    const energyMWh = record.quantity * meta.mwhPerUnit;

    breakdown.push({
      activityType: record.activity_type,
      label: meta.label,
      quantity: record.quantity,
      unit: meta.unit,
      emissionsKgCo2e: emissionsKg,
      emissionsTco2e: emissionsKg / 1000,
      energyMWh,
      factorValue: factor.value,
      factorRegion: factor.region,
      scope: meta.scope,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format a tCO₂e number for display: 2 decimal places, no trailing zeros. */
export function formatTco2e(value: number): string {
  return value.toFixed(2);
}

export function formatMWh(value: number): string {
  return value.toFixed(1);
}
