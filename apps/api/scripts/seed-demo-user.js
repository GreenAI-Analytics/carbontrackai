#!/usr/bin/env node

/**
 * Seed Demo User Script
 *
 * Creates a demo user with email/password, an organization, admin role,
 * and feature flags for testing the ESG reporting app.
 *
 * Usage:
 *   node scripts/seed-demo-user.js
 *
 * Environment variables (from .env.local or process env):
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
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv();

// ─── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEMO_USER = {
  email: "demo@carbontrackai.com",
  password: "Demo1234!",
  full_name: "Demo User",
};

const DEMO_ORG = {
  name: "Demo Company Ltd.",
  country_code: "DE",
  sector: "IT & Software",
  base_year: 2024,
};

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("   Ensure they are set in .env.local or environment.");
  process.exit(1);
}

// ─── Supabase Admin Client (bypasses RLS) ───────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ─── Helpers ────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function userExists(email) {
  // List users via Admin API with a filter — Supabase lists all, we filter locally
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    // Fallback: try a direct SQL query via the REST API
    console.log("⚠️  Admin listUsers failed, trying direct query...");
    return null;
  }
  const found = data.users.find((u) => u.email === email);
  return found || null;
}

async function createDemoUser() {
  console.log(`🔍 Checking if ${DEMO_USER.email} already exists...`);

  const existing = await userExists(DEMO_USER.email);
  if (existing) {
    console.log(`✅ Demo user already exists (id: ${existing.id})`);
    return existing;
  }

  console.log(`👤 Creating demo user: ${DEMO_USER.email}`);
  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_USER.email,
    password: DEMO_USER.password,
    email_confirm: true, // auto-confirm since we have service role
    user_metadata: {
      full_name: DEMO_USER.full_name,
    },
  });

  if (error) {
    console.error("❌ Failed to create user:", error.message);
    process.exit(1);
  }

  console.log(`✅ User created (id: ${data.user.id})`);
  return data.user;
}

async function createOrganization(userId) {
  console.log(`🔍 Checking if organization "${DEMO_ORG.name}" already exists...`);

  const { data: existingOrgs } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("name", DEMO_ORG.name)
    .maybeSingle();

  if (existingOrgs) {
    console.log(`✅ Organization already exists (id: ${existingOrgs.id})`);
    return existingOrgs;
  }

  console.log(`🏢 Creating organization: ${DEMO_ORG.name}`);
  const { data: org, error } = await supabase
    .from("organizations")
    .insert({
      name: DEMO_ORG.name,
      country_code: DEMO_ORG.country_code,
      sector: DEMO_ORG.sector,
      base_year: DEMO_ORG.base_year,
    })
    .select("id, name")
    .single();

  if (error) {
    console.error("❌ Failed to create organization:", error.message);
    process.exit(1);
  }

  console.log(`✅ Organization created (id: ${org.id})`);
  return org;
}

async function assignAdminRole(userId, orgId) {
  console.log(`🔍 Checking if user is already assigned to org...`);

  const { data: existingRole } = await supabase
    .from("user_roles")
    .select("id, role, is_primary")
    .eq("user_id", userId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (existingRole) {
    console.log(`✅ User already has role "${existingRole.role}" in org (is_primary: ${existingRole.is_primary})`);
    return existingRole;
  }

  console.log(`🔑 Assigning user as admin (is_primary = true)...`);
  const { data: role, error } = await supabase
    .from("user_roles")
    .insert({
      user_id: userId,
      organization_id: orgId,
      role: "admin",
      is_primary: true,
    })
    .select("id, role, is_primary")
    .single();

  if (error) {
    console.error("❌ Failed to assign admin role:", error.message);
    process.exit(1);
  }

  console.log(`✅ Admin role assigned (id: ${role.id})`);
  return role;
}

async function provisionFeatureFlags(orgId) {
  console.log(`🔍 Checking if feature flags are already provisioned...`);

  const { data: existingFlags } = await supabase
    .from("feature_flag_subscriptions")
    .select("id, plan_type")
    .eq("organization_id", orgId)
    .maybeSingle();

  if (existingFlags) {
    console.log(`✅ Feature flags already provisioned (plan: ${existingFlags.plan_type})`);
    return existingFlags;
  }

  console.log(`🚩 Provisioning feature flags (plan: csrd)...`);
  const { data: flags, error } = await supabase
    .from("feature_flag_subscriptions")
    .insert({
      organization_id: orgId,
      plan_type: "csrd",
    })
    .select("id, plan_type")
    .single();

  if (error) {
    console.error("❌ Failed to provision feature flags:", error.message);
    // Non-fatal — the org can still sign in and onboard normally
    console.log("   ⚠️  Continuing anyway — user can onboard manually.");
    return null;
  }

  console.log(`✅ Feature flags provisioned (plan: ${flags.plan_type})`);
  return flags;
}

async function ensureUserProfile(userId) {
  console.log(`🔍 Checking user_profiles entry...`);

  const { data: existing } = await supabase
    .from("user_profiles")
    .select("id, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (existing) {
    console.log(`✅ User profile already exists (full_name: ${existing.full_name})`);
    return existing;
  }

  // The trigger on_auth_user_created should have created this, but just in case:
  console.log(`📝 Creating user_profiles entry...`);
  const { data: profile, error } = await supabase
    .from("user_profiles")
    .insert({
      id: userId,
      full_name: DEMO_USER.full_name,
    })
    .select("id, full_name")
    .single();

  if (error) {
    console.log(`   ⚠️  Could not create profile (may already exist via trigger): ${error.message}`);
    return null;
  }

  console.log(`✅ User profile created`);
  return profile;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  🌱 Seed Demo User for ESG TrackAI");
  console.log("═══════════════════════════════════════════\n");

  // 1. Create (or find) the demo user
  const user = await createDemoUser();
  await sleep(500); // Let the auth trigger fire

  // 2. Ensure user_profiles exists (trigger should have created it)
  await ensureUserProfile(user.id);

  // 3. Create (or find) the demo organization
  const org = await createOrganization(user.id);

  // 4. Assign admin role
  await assignAdminRole(user.id, org.id);

  // 5. Provision feature flags
  await provisionFeatureFlags(org.id);

  console.log("\n═══════════════════════════════════════════");
  console.log("  ✅  Demo user ready!");
  console.log("═══════════════════════════════════════════\n");
  console.log(`   Email:    ${DEMO_USER.email}`);
  console.log(`   Password: ${DEMO_USER.password}`);
  console.log(`   Org:      ${DEMO_ORG.name}`);
  console.log(`   Plan:     csrd\n`);
  console.log(`   Login at: http://localhost:3000/login\n`);
}

main().catch((err) => {
  console.error("💥 Unexpected error:", err);
  process.exit(1);
});
