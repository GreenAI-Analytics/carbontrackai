#!/usr/bin/env node

/**
 * Seed Demo Data Script
 *
 * Creates sample activity records and calculation results for the demo
 * organisation so the dashboard shows real KPIs.
 *
 * Usage:
 *   node scripts/seed-demo-data.js
 *
 * Environment variables (from root .env.local):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ─── Resolve root .env.local ────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootEnvPath = resolve(__dirname, "..", "..", "..", ".env.local");

function loadEnv() {
  if (!existsSync(rootEnvPath)) {
    console.log("⚠️  No .env.local found — falling back to process.env");
    return;
  }
  const content = readFileSync(rootEnvPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

// ─── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// These IDs were created by seed-demo-user.js — find them dynamically
let DEMO_USER_ID = null;
let DEMO_ORG_ID = null;

const YEAR = 2025;

// Sample activity data for a typical German SME (Demo Company Ltd.)
// Realistic monthly consumption for a small IT office (~20 employees)
const MONTHLY_DATA = [
  // electricity (kWh), natural_gas (m3), diesel_car_fuel (L)
  // Winter months have higher gas usage
  { month: 1,  electricity: 3800, natural_gas: 1400, diesel_fuel: 180 },
  { month: 2,  electricity: 3500, natural_gas: 1300, diesel_fuel: 160 },
  { month: 3,  electricity: 3800, natural_gas: 1100, diesel_fuel: 170 },
  { month: 4,  electricity: 4000, natural_gas: 800,  diesel_fuel: 160 },
  { month: 5,  electricity: 4200, natural_gas: 500,  diesel_fuel: 150 },
  { month: 6,  electricity: 4500, natural_gas: 300,  diesel_fuel: 140 },
  { month: 7,  electricity: 4800, natural_gas: 200,  diesel_fuel: 140 },
  { month: 8,  electricity: 4800, natural_gas: 200,  diesel_fuel: 140 },
  { month: 9,  electricity: 4300, natural_gas: 400,  diesel_fuel: 150 },
  { month: 10, electricity: 4000, natural_gas: 700,  diesel_fuel: 160 },
  { month: 11, electricity: 3800, natural_gas: 1000, diesel_fuel: 170 },
  { month: 12, electricity: 4000, natural_gas: 1300, diesel_fuel: 180 },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Supabase Admin Client ───────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Step 1: Find the demo user and org ──────────────────────────────────────
async function findDemoUser() {
  console.log("🔍 Looking up demo user...");

  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("❌ Failed to list users:", error.message);
    process.exit(1);
  }

  const demo = users.users.find((u) => u.email === "demo@carbontrackai.com");
  if (!demo) {
    console.error("❌ Demo user not found. Run seed-demo-user.js first.");
    process.exit(1);
  }

  DEMO_USER_ID = demo.id;
  console.log(`✅ Found demo user: ${DEMO_USER_ID}`);

  // Find their primary organisation
  const { data: roles } = await supabase
    .from("user_roles")
    .select("organization_id")
    .eq("user_id", DEMO_USER_ID)
    .eq("is_primary", true);

  if (!roles || roles.length === 0) {
    console.error("❌ Demo user has no organisation. Run seed-demo-user.js first.");
    process.exit(1);
  }

  DEMO_ORG_ID = roles[0].organization_id;
  console.log(`✅ Found demo org: ${DEMO_ORG_ID}`);
}

// ─── Step 2: Create reporting period ─────────────────────────────────────────
async function createReportingPeriod() {
  console.log(`\n📅 Creating reporting period for ${YEAR}...`);

  const { data: existing } = await supabase
    .from("reporting_periods")
    .select("id")
    .eq("organization_id", DEMO_ORG_ID)
    .eq("year", YEAR)
    .maybeSingle();

  if (existing) {
    console.log(`✅ Reporting period ${YEAR} already exists (id: ${existing.id})`);
    return existing.id;
  }

  const { data, error } = await supabase
    .from("reporting_periods")
    .insert({
      organization_id: DEMO_ORG_ID,
      year: YEAR,
      start_date: `${YEAR}-01-01`,
      end_date: `${YEAR}-12-31`,
      is_locked: false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("❌ Failed to create reporting period:", error.message);
    process.exit(1);
  }

  console.log(`✅ Reporting period created (id: ${data.id})`);
  return data.id;
}

// ─── Step 3: Insert activity records ─────────────────────────────────────────
async function insertActivityRecords(periodId) {
  console.log(`\n📊 Inserting activity records...`);

  // Check if records already exist for this period
  const { count: existingCount, error: countError } = await supabase
    .from("activity_records")
    .select("*", { count: "exact", head: true })
    .eq("reporting_period_id", periodId);

  if (!countError && existingCount && existingCount > 0) {
    console.log(`✅ ${existingCount} activity records already exist — skipping`);
    return;
  }

  const records = [];

  for (const m of MONTHLY_DATA) {
    // Electricity (kWh) — Scope 2
    records.push({
      organization_id: DEMO_ORG_ID,
      reporting_period_id: periodId,
      activity_type: "electricity",
      quantity: m.electricity,
      unit: "kWh",
      month: m.month,
      notes: `Monthly electricity consumption — ${m.month}/${YEAR}`,
      created_by: DEMO_USER_ID,
    });

    // Natural gas (m3) — Scope 1
    records.push({
      organization_id: DEMO_ORG_ID,
      reporting_period_id: periodId,
      activity_type: "natural_gas",
      quantity: m.natural_gas,
      unit: "m3",
      month: m.month,
      notes: `Monthly gas consumption — ${m.month}/${YEAR}`,
      created_by: DEMO_USER_ID,
    });

    // Diesel car fuel (L) — Scope 1
    records.push({
      organization_id: DEMO_ORG_ID,
      reporting_period_id: periodId,
      activity_type: "diesel_car_fuel",
      quantity: m.diesel_fuel,
      unit: "L",
      month: m.month,
      notes: `Monthly diesel fuel — ${m.month}/${YEAR}`,
      created_by: DEMO_USER_ID,
    });
  }

  // Insert in batches of 6 to avoid overwhelming the API
  let inserted = 0;
  for (let i = 0; i < records.length; i += 6) {
    const batch = records.slice(i, i + 6);
    const { error } = await supabase.from("activity_records").insert(batch);
    if (error) {
      console.error(`❌ Failed to insert batch starting at index ${i}:`, error.message);
      process.exit(1);
    }
    inserted += batch.length;
    console.log(`   Inserted ${inserted}/${records.length} records`);
  }

  console.log(`✅ ${inserted} activity records created`);
}

// ─── Step 4: Calculate emissions ─────────────────────────────────────────────
async function createCalculationRuns(periodId) {
  console.log(`\n🧮 Calculating emissions...`);

  // Look up emission factors for the org's country (DE) with EU fallback
  const { data: factors } = await supabase
    .from("emission_factors")
    .select("activity_type, unit, region, value")
    .in("activity_type", ["electricity", "natural_gas", "diesel_car_fuel"])
    .in("region", ["DE", "EU"])
    .eq("effective_date", "2024-01-01")
    .order("region", { ascending: false }); // DE before EU

  if (!factors || factors.length === 0) {
    console.error("❌ No emission factors found. Ensure migration 3 has been applied.");
    process.exit(1);
  }

  // Build a lookup: use DE-specific if available, otherwise EU fallback
  const factorMap = {};
  for (const f of factors) {
    if (!factorMap[f.activity_type] || f.region === "DE") {
      factorMap[f.activity_type] = f.value;
    }
  }

  console.log("   Factors loaded:", factorMap);

  // Calculate totals from monthly data
  let totalElectricityKWh = 0;
  let totalNaturalGasM3 = 0;
  let totalDieselL = 0;

  for (const m of MONTHLY_DATA) {
    totalElectricityKWh += m.electricity;
    totalNaturalGasM3 += m.natural_gas;
    totalDieselL += m.diesel_fuel;
  }

  // Emissions in kgCO2e, convert to tCO2e for storage
  const scope1Kg =
    totalNaturalGasM3 * (factorMap["natural_gas"] || 2.04) +
    totalDieselL * (factorMap["diesel_car_fuel"] || 2.68);

  const scope2Kg =
    totalElectricityKWh * (factorMap["electricity"] || 0.340);

  const scope1Tco2e = Math.round((scope1Kg / 1000) * 100) / 100;
  const scope2Tco2e = Math.round((scope2Kg / 1000) * 100) / 100;
  const totalMWh = Math.round((totalElectricityKWh / 1000) * 100) / 100;

  console.log(`   Scope 1: ${scope1Tco2e} tCO2e`);
  console.log(`   Scope 2 (location): ${scope2Tco2e} tCO2e`);
  console.log(`   Total energy: ${totalMWh} MWh`);

  // Build breakdown JSON in frontend BreakdownItem format
  const scope1Breakdown = [
    {
      activityType: "natural_gas",
      label: "Natural Gas",
      quantity: totalNaturalGasM3,
      unit: "m³",
      emissionsKgCo2e: Math.round(totalNaturalGasM3 * (factorMap["natural_gas"] || 2.04) * 100) / 100,
      emissionsTco2e: Math.round((totalNaturalGasM3 * (factorMap["natural_gas"] || 2.04) / 1000) * 100) / 100,
      energyMWh: Math.round((totalNaturalGasM3 * 10.55 / 1000) * 100) / 100,
      factorValue: factorMap["natural_gas"] || 2.04,
      factorRegion: "EU",
      scope: "scope_1",
    },
    {
      activityType: "diesel_car_fuel",
      label: "Diesel (Company Car)",
      quantity: totalDieselL,
      unit: "L",
      emissionsKgCo2e: Math.round(totalDieselL * (factorMap["diesel_car_fuel"] || 2.68) * 100) / 100,
      emissionsTco2e: Math.round((totalDieselL * (factorMap["diesel_car_fuel"] || 2.68) / 1000) * 100) / 100,
      energyMWh: Math.round((totalDieselL * 9.59 / 1000) * 100) / 100,
      factorValue: factorMap["diesel_car_fuel"] || 2.68,
      factorRegion: "EU",
      scope: "scope_1",
    },
  ];
  const scope2Breakdown = [
    {
      activityType: "electricity",
      label: "Electricity",
      quantity: totalElectricityKWh,
      unit: "kWh",
      emissionsKgCo2e: Math.round(scope2Kg * 100) / 100,
      emissionsTco2e: scope2Tco2e,
      energyMWh: totalMWh,
      factorValue: factorMap["electricity"] || 0.340,
      factorRegion: "DE",
      scope: "scope_2",
    },
  ];

  const factorVersions = {
    electricity: { region: "DE", value: factorMap["electricity"] || 0.340, source: "EEA (via Climatiq)" },
    natural_gas: { region: "EU", value: factorMap["natural_gas"] || 2.04, source: "EEA (via Climatiq)" },
    diesel_car_fuel: { region: "EU", value: factorMap["diesel_car_fuel"] || 2.68, source: "EEA (via Climatiq)" },
  };

  // Check if calculations already exist
  const { data: existingRuns } = await supabase
    .from("calculation_runs")
    .select("scope_type")
    .eq("reporting_period_id", periodId)
    .eq("organization_id", DEMO_ORG_ID);

  if (existingRuns && existingRuns.length > 0) {
    console.log(`✅ ${existingRuns.length} calculation runs already exist — skipping`);
    return;
  }

  // Insert calculation runs
  const runs = [
    {
      organization_id: DEMO_ORG_ID,
      reporting_period_id: periodId,
      scope_type: "scope_1",
      total_emissions: scope1Tco2e,
      total_energy: null,
      breakdown: scope1Breakdown,
      factor_versions: {
        natural_gas: factorVersions.natural_gas,
        diesel_car_fuel: factorVersions.diesel_car_fuel,
      },
    },
    {
      organization_id: DEMO_ORG_ID,
      reporting_period_id: periodId,
      scope_type: "scope_2_location",
      total_emissions: scope2Tco2e,
      total_energy: totalMWh,
      breakdown: scope2Breakdown,
      factor_versions: { electricity: factorVersions.electricity },
    },
  ];

  const { error } = await supabase.from("calculation_runs").insert(runs);
  if (error) {
    console.error("❌ Failed to insert calculation runs:", error.message);
    process.exit(1);
  }

  console.log(`✅ Calculation runs created (Scope 1 + Scope 2)`);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  📊 Seed Demo Data for ESG TrackAI");
  console.log("═══════════════════════════════════════════\n");

  await findDemoUser();
  await sleep(300);

  const periodId = await createReportingPeriod();
  await sleep(300);

  await insertActivityRecords(periodId);
  await sleep(300);

  await createCalculationRuns(periodId);

  console.log("\n═══════════════════════════════════════════");
  console.log("  ✅  Demo data seeded!");
  console.log("═══════════════════════════════════════════\n");
  console.log("   Organisation:  Demo Company Ltd. (DE)");
  console.log(`   Year:          ${YEAR}`);
  console.log(`   Months:        ${MONTHLY_DATA.length} months of data`);
  console.log(`   Records:       ${MONTHLY_DATA.length * 3} activity records`);
  console.log("   Calculations:  Scope 1 + Scope 2 (location-based)");
  console.log("\n   Refresh the dashboard to see the KPIs!\n");
}

main().catch((err) => {
  console.error("💥 Unexpected error:", err);
  process.exit(1);
});
