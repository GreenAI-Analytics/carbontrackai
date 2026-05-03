#!/usr/bin/env node
// Seed demo ESG data for S1, G1, Taxonomy, and Materiality modules.
// Run after seed-demo-data.js: node apps/api/scripts/seed-demo-esg-data.js

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootEnvPath = resolve(__dirname, "..", "..", "..", ".env.local");

function loadEnv() {
  if (!existsSync(rootEnvPath)) return;
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

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const YEAR = new Date().getFullYear();
let ORG_ID, PERIOD_ID, ASSESSMENT_ID, TAX_ASSESSMENT_ID;

async function main() {
  // 1. Find demo org
  const { data: users } = await supabase.auth.admin.listUsers();
  const demo = users.users.find((u) => u.email === "demo@carbontrackai.com");
  if (!demo) { console.error("Run seed-demo-user.js first"); process.exit(1); }
  const { data: roles } = await supabase.from("user_roles").select("organization_id").eq("user_id", demo.id).eq("is_primary", true).single();
  ORG_ID = roles.organization_id;
  console.log(`Org: ${ORG_ID}`);

  // 2. Get/create reporting period
  let { data: period } = await supabase.from("reporting_periods").select("id").eq("organization_id", ORG_ID).eq("year", YEAR).single();
  if (!period) {
    const { data: np } = await supabase.from("reporting_periods").insert({ organization_id: ORG_ID, year: YEAR, start_date: `${YEAR}-01-01`, end_date: `${YEAR}-12-31` }).select("id").single();
    period = np;
  }
  PERIOD_ID = period.id;

  // 3. Seed S1 Workforce
  await seedWorkforce();
  // 4. Seed G1 Governance
  await seedGovernance();
  // 5. Seed Taxonomy
  await seedTaxonomy();
  // 6. Seed Materiality
  await seedMateriality();

  console.log("\n✅ All ESG demo data seeded successfully!");
}

// ─── S1 Own Workforce ─────────────────────────────────────────────────────────

async function seedWorkforce() {
  console.log("\n👥 Seeding S1 Workforce...");

  // Check if exists
  const { data: existing } = await supabase.from("workforce_headcount").select("id").eq("organization_id", ORG_ID).eq("reporting_period_id", PERIOD_ID).maybeSingle();
  if (existing) { console.log("   Already seeded — skipping"); return; }

  // Headcount: 42 employees, realistic German SME
  await supabase.from("workforce_headcount").insert({
    organization_id: ORG_ID, reporting_period_id: PERIOD_ID,
    total_employees: 42, female_count: 18, male_count: 24,
    permanent_contracts: 38, temporary_contracts: 4,
    full_time_count: 32, part_time_count: 10,
    under_30_count: 12, age_30_50_count: 22, over_50_count: 8,
  });

  // Turnover
  await supabase.from("workforce_turnover").insert({
    organization_id: ORG_ID, reporting_period_id: PERIOD_ID,
    hires: 6, leavers: 4, turnover_rate: 9.5, voluntary_leavers: 3, involuntary_leavers: 1,
  });

  // Diversity
  await supabase.from("workforce_diversity").insert({
    organization_id: ORG_ID, reporting_period_id: PERIOD_ID,
    women_in_senior_management: 3, men_in_senior_management: 7,
    employees_with_disabilities: 2, disability_percentage: 4.8,
  });

  // H&S
  await supabase.from("health_safety_incidents").insert({
    organization_id: ORG_ID, reporting_period_id: PERIOD_ID,
    recordable_injuries: 2, lost_days: 14, fatalities: 0, near_misses: 5,
  });

  // Training
  await supabase.from("training_records").insert({
    organization_id: ORG_ID, reporting_period_id: PERIOD_ID,
    total_training_hours: 630, avg_hours_per_employee: 15,
    training_hours_female: 280, training_hours_male: 350,
  });

  // Pay gap
  await supabase.from("gender_pay_gap").insert({
    organization_id: ORG_ID, reporting_period_id: PERIOD_ID,
    mean_gap_percentage: 12.5, median_gap_percentage: 9.3,
  });

  // Work-life
  await supabase.from("worklife_balance").insert({
    organization_id: ORG_ID, reporting_period_id: PERIOD_ID,
    parental_leave_uptake_percentage: 85, flexible_work_percentage: 60, avg_weekly_hours: 38.5,
  });

  console.log("   ✅ Workforce: 42 employees, 9.5% turnover, 12.5% pay gap, 15h training avg");
}

// ─── G1 Governance ────────────────────────────────────────────────────────────

async function seedGovernance() {
  console.log("\n🏛️ Seeding G1 Governance...");

  const { data: existing } = await supabase.from("board_composition").select("id").eq("organization_id", ORG_ID).eq("reporting_period_id", PERIOD_ID).maybeSingle();
  if (existing) { console.log("   Already seeded — skipping"); return; }

  // Board
  await supabase.from("board_composition").insert({
    organization_id: ORG_ID, reporting_period_id: PERIOD_ID,
    board_size: 5, independent_members: 2, female_members: 2, male_members: 3, avg_tenure_years: 4.2,
  });

  // Ethics training
  await supabase.from("ethics_training").insert([
    { organization_id: ORG_ID, reporting_period_id: PERIOD_ID, training_topic: "Anti-bribery & Corruption", employees_covered: 42, coverage_percentage: 100, frequency: "Annual" },
    { organization_id: ORG_ID, reporting_period_id: PERIOD_ID, training_topic: "Code of Conduct", employees_covered: 42, coverage_percentage: 100, frequency: "Onboarding + Annual" },
    { organization_id: ORG_ID, reporting_period_id: PERIOD_ID, training_topic: "GDPR & Data Protection", employees_covered: 38, coverage_percentage: 90.5, frequency: "Annual" },
  ]);

  // Compliance incidents
  await supabase.from("compliance_incidents").insert([
    { organization_id: ORG_ID, reporting_period_id: PERIOD_ID, incident_type: "Late filing penalty", regulatory_fines: 2500, non_monetary_sanctions: 0, legal_actions: 0, description: "Late submission of annual tax return — penalty paid" },
    { organization_id: ORG_ID, reporting_period_id: PERIOD_ID, incident_type: "Environmental permit exceedance", regulatory_fines: 5000, non_monetary_sanctions: 1, legal_actions: 0, description: "Minor exceedance of wastewater permit limits — corrective action implemented" },
  ]);

  // Whistleblower
  await supabase.from("whistleblower_cases").insert({
    organization_id: ORG_ID, reporting_period_id: PERIOD_ID,
    reports_received: 3, cases_investigated: 3, cases_substantiated: 2, remediation_actions: "Disciplinary action taken; policy updated; mandatory retraining completed",
  });

  // Data breaches
  await supabase.from("data_breaches").insert([
    { organization_id: ORG_ID, reporting_period_id: PERIOD_ID, breach_type: "Unauthorised access — phishing", records_affected: 150, notified_authority: true, fines_amount: 0 },
    { organization_id: ORG_ID, reporting_period_id: PERIOD_ID, breach_type: "Misconfigured cloud bucket", records_affected: 4200, notified_authority: true, fines_amount: 0 },
  ]);

  // Supplier conduct
  await supabase.from("supplier_conduct_assessments").insert([
    { organization_id: ORG_ID, reporting_period_id: PERIOD_ID, supplier_name: "TechSupply GmbH", code_violations: 0, audits_conducted: 2, corrective_actions_issued: 0 },
    { organization_id: ORG_ID, reporting_period_id: PERIOD_ID, supplier_name: "LogiTrans AG", code_violations: 1, audits_conducted: 1, corrective_actions_issued: 1 },
    { organization_id: ORG_ID, reporting_period_id: PERIOD_ID, supplier_name: "CleanEnergy Solutions", code_violations: 0, audits_conducted: 1, corrective_actions_issued: 0 },
  ]);

  // Political contributions
  await supabase.from("political_contributions").insert([
    { organization_id: ORG_ID, reporting_period_id: PERIOD_ID, recipient: "Digital Economy Association", country: "DE", amount: 5000 },
  ]);

  // Strategy (ESRS 2 SBM-1)
  const { data: existingSbm } = await supabase.from("strategy_business_model").select("id").eq("organization_id", ORG_ID).eq("reporting_period_id", PERIOD_ID).maybeSingle();
  if (!existingSbm) {
    await supabase.from("strategy_business_model").insert({
      organization_id: ORG_ID, reporting_period_id: PERIOD_ID,
      narrative_description: "Demo Company Ltd. is a mid-sized IT services and software development firm headquartered in Berlin, Germany. We serve enterprise clients across the DACH region with cloud infrastructure, managed services, and custom software solutions. Sustainability is embedded in our strategy through our Green IT programme — reducing data centre energy intensity, promoting remote work, and achieving carbon-neutral operations by 2030.",
      value_chain_stages: "Upstream: hardware suppliers (servers, networking equipment), cloud infrastructure (AWS eu-central-1), office supplies. Own operations: software development, IT support, consulting, data centre operations (co-located). Downstream: client onboarding, software deployment, ongoing maintenance and support.",
      key_sectors: "J62 (Computer programming), J63 (Information service activities)",
      geographies: "DE (HQ Berlin), AT (Vienna office), CH (Zurich sales)",
      employee_breakdown: "60% technical (developers, engineers, support), 25% consulting/project management, 15% admin/finance/HR",
    });
  }

  // Policies
  const { data: existingPols } = await supabase.from("policy_documents").select("id").eq("organization_id", ORG_ID).maybeSingle();
  if (!existingPols) {
    await supabase.from("policy_documents").insert([
      { organization_id: ORG_ID, policy_title: "Anti-Corruption & Bribery Policy", esrs_reference: "G1-1", approval_date: "2024-06-15", version: "2.1", scope_description: "All employees, contractors, and board members" },
      { organization_id: ORG_ID, policy_title: "Data Protection & GDPR Policy", esrs_reference: "G1-6", approval_date: "2024-03-01", version: "3.0", scope_description: "All personal data processing activities" },
      { organization_id: ORG_ID, policy_title: "Supplier Code of Conduct", esrs_reference: "G1-2", approval_date: "2024-09-01", version: "1.0", scope_description: "All tier-1 suppliers and contractors" },
      { organization_id: ORG_ID, policy_title: "Environmental & Climate Policy", esrs_reference: "E1-1", approval_date: "2024-01-15", version: "1.2", scope_description: "All operations, data centres, business travel" },
    ]);
  }

  console.log("   ✅ Governance: 5-member board, 3 ethics trainings, 2 incidents, 2 breaches, 3 suppliers");
}

// ─── EU Taxonomy ──────────────────────────────────────────────────────────────

async function seedTaxonomy() {
  console.log("\n🏷️ Seeding EU Taxonomy...");

  // Assessment
  let { data: assessment } = await supabase.from("taxonomy_assessments").select("id").eq("organization_id", ORG_ID).eq("reporting_period_id", PERIOD_ID).single();
  if (!assessment) {
    const { data: na } = await supabase.from("taxonomy_assessments").insert({ organization_id: ORG_ID, reporting_period_id: PERIOD_ID, status: "in_progress" }).select("id").single();
    assessment = na;
  }
  TAX_ASSESSMENT_ID = assessment.id;

  const { data: existing } = await supabase.from("taxonomy_activities").select("id").eq("assessment_id", TAX_ASSESSMENT_ID).maybeSingle();
  if (existing) { console.log("   Already seeded — skipping"); return; }

  await supabase.from("taxonomy_activities").insert([
    { assessment_id: TAX_ASSESSMENT_ID, nace_code: "J62", activity_description: "Computer programming and software development", substantial_contribution_met: true, dnsh_met: true, minimum_safeguards_met: true, turnover_percentage: 65, capex_percentage: 40, opex_percentage: 55 },
    { assessment_id: TAX_ASSESSMENT_ID, nace_code: "J63", activity_description: "Information service activities — cloud infrastructure management", substantial_contribution_met: true, dnsh_met: true, minimum_safeguards_met: false, turnover_percentage: 25, capex_percentage: 45, opex_percentage: 30 },
    { assessment_id: TAX_ASSESSMENT_ID, nace_code: "M71", activity_description: "Architecture & engineering — data centre energy efficiency consulting", substantial_contribution_met: true, dnsh_met: false, minimum_safeguards_met: false, turnover_percentage: 10, capex_percentage: 15, opex_percentage: 15 },
  ]);

  console.log("   ✅ Taxonomy: 3 NACE activities, 2 fully aligned (SC+DNSH+MS)");
}

// ─── Double Materiality ──────────────────────────────────────────────────────

async function seedMateriality() {
  console.log("\n🎯 Seeding Double Materiality...");

  let { data: assessment } = await supabase.from("materiality_assessments").select("id").eq("organization_id", ORG_ID).eq("reporting_period_id", PERIOD_ID).single();
  if (!assessment) {
    const { data: na } = await supabase.from("materiality_assessments").insert({ organization_id: ORG_ID, reporting_period_id: PERIOD_ID, methodology: "double_materiality", status: "in_progress", materiality_threshold: 2.5, threshold_rationale: "Standard threshold selected based on EFRAG implementation guidance — any IRO scoring ≥2.5 on the double materiality scale is considered material for disclosure." }).select("id").single();
    assessment = na;
  }
  ASSESSMENT_ID = assessment.id;

  const { data: existing } = await supabase.from("materiality_iro").select("id").eq("assessment_id", ASSESSMENT_ID).maybeSingle();
  if (existing) { console.log("   Already seeded — skipping"); return; }

  const iros = [
    { iro_type: "impact", direction: "actual_negative", topic: "E1", title: "GHG emissions from data centres", severity_scale: 4, likelihood_scale: 5, scale_score: 4, scope_score: 2, irremediability_score: 3, time_horizon: "medium", value_chain_location: "own_operations", impact_materiality_score: 3.8, double_materiality_score: 3.8 },
    { iro_type: "risk", direction: "financial_risk", topic: "E1", title: "Carbon pricing risk on electricity costs", severity_scale: 3, likelihood_scale: 4, magnitude_score: 3, financial_likelihood_score: 4, time_horizon: "medium", value_chain_location: "own_operations", financial_materiality_score: 3.5, double_materiality_score: 3.5 },
    { iro_type: "impact", direction: "actual_positive", topic: "S1", title: "Quality employment in tech sector", severity_scale: 4, likelihood_scale: 5, scale_score: 4, scope_score: 3, time_horizon: "short", value_chain_location: "own_operations", impact_materiality_score: 3.5, double_materiality_score: 3.5 },
    { iro_type: "impact", direction: "potential_negative", topic: "S1", title: "Skills shortage and talent retention", severity_scale: 3, likelihood_scale: 4, scale_score: 3, scope_score: 2, irremediability_score: 2, time_horizon: "medium", value_chain_location: "own_operations", impact_materiality_score: 2.8, double_materiality_score: 2.8 },
    { iro_type: "risk", direction: "financial_risk", topic: "G1", title: "Data breach and GDPR fine exposure", severity_scale: 4, likelihood_scale: 3, magnitude_score: 4, financial_likelihood_score: 3, time_horizon: "short", value_chain_location: "own_operations", financial_materiality_score: 3.5, double_materiality_score: 3.5 },
    { iro_type: "impact", direction: "potential_negative", topic: "E5", title: "E-waste from decommissioned hardware", severity_scale: 2, likelihood_scale: 3, scale_score: 2, scope_score: 1, irremediability_score: 2, time_horizon: "long", value_chain_location: "downstream", impact_materiality_score: 1.8, double_materiality_score: 1.8 },
    { iro_type: "opportunity", direction: "financial_opportunity", topic: "E1", title: "Green IT consulting revenue growth", severity_scale: 4, likelihood_scale: 4, magnitude_score: 3, financial_likelihood_score: 5, time_horizon: "short", value_chain_location: "own_operations", financial_materiality_score: 3.9, double_materiality_score: 3.9 },
  ];

  for (const iro of iros) {
    await supabase.from("materiality_iro").insert({ assessment_id: ASSESSMENT_ID, ...iro });
  }

  console.log("   ✅ Materiality: 7 IROs across E1, S1, G1, E5 — 5 material, 1 not material");
}

main().catch(console.error);
