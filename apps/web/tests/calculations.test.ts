import { describe, it, expect } from "vitest";
import {
  calculateEmissions,
  calculateMarketBasedScope2,
  formatTco2e,
  formatMWh,
  ACTIVITY_META,
  type ActivityRecord,
  type EmissionFactor,
} from "@/lib/calculations";

describe("calculateEmissions", () => {
  const records: ActivityRecord[] = [
    { id: "1", activity_type: "natural_gas", quantity: 1000, unit: "m³" },
    { id: "2", activity_type: "electricity", quantity: 5000, unit: "kWh" },
    { id: "3", activity_type: "diesel_car_fuel", quantity: 200, unit: "L" },
  ];

  const factors: EmissionFactor[] = [
    { activity_type: "natural_gas", unit: "m³", region: "DE", value: 2.04 },
    { activity_type: "electricity", unit: "kWh", region: "DE", value: 0.340 },
    { activity_type: "diesel_car_fuel", unit: "L", region: "EU", value: 2.68 },
  ];

  it("calculates scope 1 emissions correctly", () => {
    const result = calculateEmissions(records, factors, "DE");
    // natural_gas: 1000 * 2.04 = 2040 kg = 2.04 t
    // diesel: 200 * 2.68 = 536 kg = 0.536 t
    // Total scope 1: 2.576 tCO2e
    expect(result.scope1Tco2e).toBeCloseTo(2.576, 2);
  });

  it("calculates scope 2 emissions correctly", () => {
    const result = calculateEmissions(records, factors, "DE");
    // electricity: 5000 * 0.340 = 1700 kg = 1.7 t
    expect(result.scope2LocationTco2e).toBeCloseTo(1.7, 1);
  });

  it("calculates total energy correctly", () => {
    const result = calculateEmissions(records, factors, "DE");
    const expectedMWh =
      (1000 * (ACTIVITY_META["natural_gas"]?.mwhPerUnit ?? 0)) +
      (5000 * (ACTIVITY_META["electricity"]?.mwhPerUnit ?? 0)) +
      (200 * (ACTIVITY_META["diesel_car_fuel"]?.mwhPerUnit ?? 0));
    expect(result.totalMWh).toBeCloseTo(expectedMWh, 2);
  });

  it("returns breakdown items with all required fields", () => {
    const result = calculateEmissions(records, factors, "DE");
    expect(result.breakdown).toHaveLength(3);

    for (const item of result.breakdown) {
      expect(item).toHaveProperty("activityType");
      expect(item).toHaveProperty("emissionsTco2e");
      expect(item).toHaveProperty("emissionsKgCo2e");
      expect(item).toHaveProperty("energyMWh");
      expect(item).toHaveProperty("factorValue");
      expect(item).toHaveProperty("factorRegion");
      expect(item).toHaveProperty("scope");
      expect(typeof item.emissionsTco2e).toBe("number");
    }
  });

  it("prefers country-specific factors over EU-wide", () => {
    const deResult = calculateEmissions(records, factors, "DE");
    const natGasDE = deResult.breakdown.find((b) => b.activityType === "natural_gas");
    // natural_gas has DE factor (2.04), diesel has EU factor (2.68)
    expect(natGasDE?.factorRegion).toBe("DE");
    expect(natGasDE?.factorValue).toBe(2.04);
  });

  it("falls back to EU factor when country not found", () => {
    const frResult = calculateEmissions(records, factors, "FR");
    const dieselFR = frResult.breakdown.find((b) => b.activityType === "diesel_car_fuel");
    // diesel only has EU factor, should fall back
    expect(dieselFR?.factorRegion).toBe("EU");
  });

  it("returns zero emissions for empty records", () => {
    const result = calculateEmissions([], factors, "DE");
    expect(result.scope1Tco2e).toBe(0);
    expect(result.scope2LocationTco2e).toBe(0);
    expect(result.totalMWh).toBe(0);
    expect(result.breakdown).toHaveLength(0);
  });

  it("handles unknown activity types gracefully", () => {
    const unknownRecord: ActivityRecord = {
      id: "4",
      activity_type: "heating_oil" as ActivityRecord["activity_type"],
      quantity: 100,
      unit: "L",
    };
    // heating_oil is in ACTIVITY_META so should work if factors exist
    const result = calculateEmissions([unknownRecord], factors, "DE");
    // Falls back to built-in fallback factor
    expect(result.breakdown).toHaveLength(1);
  });
});

describe("calculateMarketBasedScope2", () => {
  const instruments = [
    { instrument_type: "goo", mwh_covered: 3 },
    { instrument_type: "ppa", mwh_covered: 2 },
  ];

  it("returns certificated MWh correctly", () => {
    const result = calculateMarketBasedScope2(10, instruments, "DE");
    expect(result.certificatedMWh).toBe(5);
  });

  it("sums certificated MWh from all instruments", () => {
    const result = calculateMarketBasedScope2(5, instruments, "DE");
    expect(result.certificatedMWh).toBe(5);
  });

  it("returns 0 certificated when no instruments", () => {
    const result = calculateMarketBasedScope2(10, [], "DE");
    expect(result.certificatedMWh).toBe(0);
  });
});

describe("formatTco2e", () => {
  it("formats to 2 decimal places", () => {
    expect(formatTco2e(2.576)).toBe("2.58");
  });

  it("handles zero", () => {
    expect(formatTco2e(0)).toBe("0.00");
  });
});

describe("formatMWh", () => {
  it("formats to 1 decimal place", () => {
    expect(formatMWh(10.55)).toBe("10.6");
  });
});
