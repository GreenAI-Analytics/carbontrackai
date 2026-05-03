#!/usr/bin/env node
// ============================================================================
// CarbonTrackAI — Climatiq Factor Refresh Script
// Run: node apps/api/scripts/refresh-factors.js
// Requires: CLIMATIQ_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in env
// ============================================================================

const { createClient } = require("@supabase/supabase-js");

const CLIMATIQ_BASE = "https://api.climatiq.io/data/v1";

const ACTIVITY_MAP = {
  electricity:     { activity_id: "electricity-supply_grid-source_supplier_mix", unit: "kWh" },
  natural_gas:     { activity_id: "natural-gas_combustion_stationary", unit: "m3" },
  heating_oil:     { activity_id: "fuel-oil_combustion_stationary", unit: "L" },
  petrol_car_fuel: { activity_id: "gasoline_combustion_mobile", unit: "L" },
  diesel_car_fuel: { activity_id: "diesel_combustion_mobile", unit: "L" },
};

const EU27 = ["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE"];

async function main() {
  const apiKey = process.env.CLIMATIQ_API_KEY;
  if (!apiKey) { console.error("CLIMATIQ_API_KEY not set"); process.exit(1); }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const start = Date.now();

  console.log("Fetching factors from Climatiq...");
  const allFactors = [];
  const seen = new Set();

  for (const [type, { activity_id, unit }] of Object.entries(ACTIVITY_MAP)) {
    for (const country of EU27) {
      try {
        const url = `${CLIMATIQ_BASE}/emission-factors?activity_id=${activity_id}&region=${country}&year=${new Date().getFullYear()}&per_page=5`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
        if (!res.ok) continue;
        const data = await res.json();
        for (const f of data.results || []) {
          const key = `${f.activity_id}|${f.region}|${f.year}`;
          if (!seen.has(key)) { seen.add(key); allFactors.push({ ...f, unit, activity_id: type }); }
        }
      } catch {}
    }
    // EU-wide fallback
    try {
      const url = `${CLIMATIQ_BASE}/emission-factors?activity_id=${activity_id}&year=${new Date().getFullYear()}&per_page=3`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
      if (res.ok) {
        const data = await res.json();
        for (const f of data.results || []) {
          const key = `${f.activity_id}|EU|${f.year}`;
          if (!seen.has(key)) { seen.add(key); allFactors.push({ ...f, unit, activity_id: type, region: "EU" }); }
        }
      }
    } catch {}
  }

  console.log(`Fetched ${allFactors.length} factors in ${Date.now() - start}ms`);

  // Get or create Climatiq source
  let { data: source } = await supabase.from("factor_sources").select("id").eq("name", "Climatiq").eq("provider", "climatiq").single();
  if (!source) {
    const { data: ns } = await supabase.from("factor_sources").insert({ name: "Climatiq", provider: "climatiq", url: "https://www.climatiq.io/data", is_active: true, last_updated: new Date().toISOString() }).select("id").single();
    source = ns;
  }
  if (!source) { console.error("Failed to create factor source"); process.exit(1); }

  // Delete old + insert new
  await supabase.from("emission_factors").delete().eq("source_id", source.id);

  const rows = allFactors.map((f) => ({
    source_id: source.id,
    activity_type: f.activity_id,
    unit: f.unit,
    region: f.region === "EU" ? null : f.region,
    value: f.factor,
    version: 1,
    effective_date: new Date().toISOString().split("T")[0],
    metadata: { climatiq_id: f.id, name: f.name, category: f.category, sector: f.sector, year: f.year, uncertainty: f.uncertainty },
  }));

  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await supabase.from("emission_factors").insert(rows.slice(i, i + 50));
    if (error) console.error(`Batch ${i}:`, error.message);
  }

  await supabase.from("factor_sources").update({ last_updated: new Date().toISOString() }).eq("id", source.id);
  const countries = [...new Set(allFactors.map((f) => f.region).filter((r) => r !== "EU"))].sort();
  console.log(`Done. Inserted ${rows.length} factors for ${countries.length} countries in ${Date.now() - start}ms`);
}

main().catch(console.error);
