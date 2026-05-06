# CarbonTrackAI — Agent Guide

> **Purpose**: This document gives AI agents (and human developers) a complete map of the CarbonTrackAI repository — a unified ESG reporting platform for EU SMEs (< 250 employees) with SME-proportionate workflows (VSME Basic, VSME Comprehensive, CSRD). Navigate, edit, and reason about the codebase without guesswork.

---

## 1. Project Overview

| Attribute | Value |
|-----------|-------|
| **Name** | CarbonTrackAI |
| **Description** | ESG reporting for EU SMEs per Recommendation 2003/361/EC (micro <10 + ≤€2M turnover/balance, small <50 + ≤€10M, medium <250 + ≤€50M turnover/≤€43M balance) — VSME-first with CSRD/ESRS alignment for in-scope listed SMEs. Three proportionate modes: VSME Basic, VSME Comprehensive, CSRD. |
| **Repository** | `https://github.com/GreenAI-Analytics/carbontrackai` |
| **Stack** | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 (frontend), Supabase PostgreSQL (backend/database) |
| **Package Manager** | npm (workspaces monorepo) |
| **License** | TBD |
| **Production URL** | https://carbontrackai-eight.vercel.app |
| **CI/CD** | GitHub Actions (typecheck, lint, build) → Vercel auto-deploy |

### Regulatory Framework

The platform adapts dynamically to SME size and regulatory scope, supporting three regulatory modes based on the SME's characteristics and compliance obligations.

### SME Scoping Logic

> **Legal basis**: SME classification follows **Commission Recommendation 2003/361/EC** (OJ L 124, 20.5.2003). An enterprise qualifies as an SME if it meets the **staff headcount** threshold **AND** at least **one** of the two financial thresholds (**turnover OR balance sheet**). This is distinct from the **Accounting Directive (2013/34/EU)** which uses lower thresholds for simplified *financial reporting* purposes only and must not be used for SME classification.

| SME Type | Staff Headcount | Turnover (annual) | OR Balance Sheet | CSRD Mandatory? | Platform Mode |
|---|---|---|---|---|---|
| **Micro** | < 10 | ≤ €2M | ≤ €2M | ❌ No | **VSME Basic** |
| **Small** | < 50 | ≤ €10M | ≤ €10M | ❌ No (unless listed) | **VSME Basic / VSME Comprehensive** |
| **Medium** | < 250 | ≤ €50M | ≤ €43M | ❌ No (unless listed) | **VSME Comprehensive / CSRD** |
| **Listed SMEs** | Listed on regulated market | — | — | ⚠ Omnibus-dependent | **VSME Comprehensive / CSRD** |
| **Subsidiaries of large groups** | Required by parent | — | — | ⚠ Possibly | **CSRD** |

> **Omnibus I (2025) note**: Under the proposed Omnibus simplification package, the CSRD scope threshold would rise to **>1,000 employees + €50M turnover or €25M balance sheet**. If adopted as proposed, the vast majority of listed SMEs will fall *out* of mandatory CSRD and into the voluntary VSME regime. The onboarding auto-detection logic accounts for this; listed SMEs are no longer unconditionally routed to CSRD.
### Platform Modes

> **Naming note**: The official EFRAG VSME standard (published Dec 2024) defines two modules: **Basic Module (B1–B11)** and **Comprehensive Module (C1–C9)**. The codebase currently uses the legacy names `VSME Basic` and `VSME Comprehensive`. Migration 19 aligned the enum with the official EFRAG naming: `vsme_basic` / `vsme_comprehensive` / `csrd`. See `features.md` §1.1 (marked as RESOLVED).

| Mode | Official EFRAG Equivalent | Description |
|---|---|---|
| **VSME Basic** | VSME Basic Module (B1–B11) | Simplified ESG: basic climate, basic workforce, basic governance, simplified materiality. |
| **VSME Comprehensive** | VSME Comprehensive Module (C1–C9, additive to Basic) | Full voluntary SME standard: all E/S/G topics, simplified taxonomy. |
| **CSRD** | Full ESRS Set 1 | Full ESRS E1–E5, S1–S4, G1, double materiality, EU Taxonomy. For the small subset of SMEs still in mandatory CSRD scope post-Omnibus. |

**Target audience**: EU SMEs per Recommendation 2003/361/EC — micro (<10 employees, ≤ €2M turnover or ≤ €2M balance sheet), small (<50 employees, ≤ €10M turnover or ≤ €10M balance sheet), and medium (<250 employees, ≤ €50M turnover or ≤ €43M balance sheet). The platform is **VSME-first** — most SMEs use VSME Basic or VSME Comprehensive voluntarily. CSRD mode serves the subset of listed SMEs and subsidiaries of large groups that remain in mandatory CSRD scope (subject to Omnibus I changes). The app auto-detects the SME's mode at onboarding and hides irrelevant complexity.

**Design philosophy**: Simplified for SME reality. No over-engineered assurance workflows — instead, audit-grade change history and evidence attachments. Qualitative/narrative disclosures use simple structured forms, not complex CMS tools. The datapoint taxonomy starts at the module level and becomes granular per-pillar as the platform matures.

**Design principle**: The platform prioritises VSME Basic and VSME Comprehensive as the primary use cases for the majority of non-listed SMEs. CSRD is served as a secondary mode for the minority of SMEs that remain in mandatory CSRD scope post-Omnibus I (listed SMEs above the revised threshold + subsidiaries of large groups). Where complexity can be reduced without breaking regulatory usefulness, it is reduced. The VSME "value-chain shield" workflow (see `features.md` §1.2) is a core commercial feature — enabling SMEs to push back on disproportionate ESG data requests from large counterparties.

**ESRS Topical Standards covered:**

| Pillar | Standards | Topics |
|--------|-----------|--------|
| **Environmental** | ESRS E1–E5 | Climate change, Pollution, Water & marine resources, Biodiversity & ecosystems, Resource use & circular economy |
| **Social** | ESRS S1–S4 | Own workforce, Workers in value chain, Affected communities, Consumers & end-users |
| **Governance** | ESRS G1 | Business conduct |

**Cross-cutting standards:** ESRS 1 (General requirements — double materiality), ESRS 2 (General disclosures — governance, strategy, IRO management)

### Monorepo Workspaces

```
carbontrackai/
├── apps/
│   ├── api/          # Supabase backend + Fastify API (planned)
│   └── web/          # Next.js frontend
├── docs/
│   ├── architecture.md
│   ├── build-plan.md
│   └── datasets/     # ESG factor datasets (emission factors, social benchmarks, etc.)
├── img/              # Brand assets
├── agents.md         ← You are here
├── package.json      # Root workspace config
├── features.md       # Feature specification reference
└── README.md         # Project brief
```

---

## 2. Frontend (`apps/web`)

### 2.1 Tech Stack

- **Framework**: Next.js 16.2.3 (App Router) + TypeScript 5
- **UI**: Tailwind CSS v4 (via `@tailwindcss/postcss`)
- **State**: Supabase client SDK + React built-in hooks
- **Forms**: Native `<form>` elements (React Hook Form + Zod planned)
- **Auth**: `@supabase/supabase-js` + `@supabase/ssr`
- **Charts**: Recharts (planned, for ESG KPI visualisation)
- **PWA**: next-pwa or service worker (planned, for offline draft)

### 2.2 File Map

```
apps/web/
├── app/
│   ├── dashboard/
│   │   ├── activity/
│   │   │   └── page.tsx                    # Energy/fuel activity data entry (Scope 1 & 2)
│   │   ├── emissions/
│   │   │   └── page.tsx                    # Scope 1 & 2 calculation results + run trigger
│   │   ├── esg/
│   │   │   ├── environmental/
│   │   │   │   ├── climate/page.tsx        # E1 Implemented
│   │   │   │   ├── pollution/page.tsx      # E2 Implemented
│   │   │   │   ├── water/page.tsx          # E3 Implemented
│   │   │   │   ├── biodiversity/page.tsx   # E4 Implemented
│   │   │   │   └── circular/page.tsx       # E5 Implemented
│   │   │   ├── social/
│   │   │   │   ├── workforce/page.tsx      # S1 Implemented
│   │   │   │   ├── valuechain/page.tsx     # S2 Implemented
│   │   │   │   ├── communities/page.tsx    # S3 Implemented
│   │   │   │   └── consumers/page.tsx      # S4 Implemented
│   │   │   ├── governance/
│   │   │   │   ├── ethics/page.tsx         # G1 ethics Implemented
│   │   │   │   ├── compliance/page.tsx     # G1 compliance Implemented
│   │   │   │   └── dataprivacy/page.tsx    # G1 data privacy Implemented
│   │   │   └── general/
│   │   │       ├── governance/page.tsx     # ESRS 2 GOV/SBM Implemented
│   │   │       └── iro-management/page.tsx # ESRS 2 IRO Implemented
│   │   ├── materiality/page.tsx            # Double materiality Implemented
│   │   ├── taxonomy/page.tsx               # EU Taxonomy Implemented
│   │   ├── reports/page.tsx                # Report builder Implemented
│   │   ├── settings/page.tsx               # Settings Implemented
│   │   ├── layout.tsx                      # Dashboard shell (header + sidebar nav)
│   │   └── page.tsx                        # Dashboard overview (ESG pillar cards, carbon KPIs, checklist)
│   ├── forgot-password/
│   │   └── page.tsx                        # Password reset request form
│   ├── login/
│   │   └── page.tsx                        # Email + password login
│   ├── onboarding/
│   │   └── page.tsx                        # Multi-step onboarding (org → sector → ESG scope)
│   ├── reset-password/
│   │   └── page.tsx                        # New password creation
│   ├── signup/
│   │   └── page.tsx                        # Registration (name, email, password)
│   ├── favicon.ico
│   ├── globals.css                         # Tailwind import + base styles
│   ├── layout.tsx                          # Root layout (metadata, icons)
│   └── page.tsx                            # Marketing homepage (Hero, ESG Modules, WhyChoose, CTA, Footer)
├── components/
│   ├── CTA.tsx                             # Call-to-action (Start Free ESG Reporting)
│   ├── DashboardNav.tsx                    # Sidebar nav (7 groups, 21 ESG links)
│   ├── Footer.tsx                          # Site footer (logo, links, brand attribution)
│   ├── Header.tsx                          # Nav bar (logo, nav links, login/signup CTAs)
│   ├── Hero.tsx                            # Landing hero (ESG messaging)
│   ├── Modules.tsx                         # ESG module overview (Free + Comprehensive tiers)
│   ├── SignOutButton.tsx                   # Supabase sign-out + redirect
│   └── WhyChoose.tsx                       # Value proposition grid (CSRD/ESRS angles)
├── lib/
│   ├── calculations.ts                     # Carbon calculation engine (Scope 1 & 2)
│   ├── esg-scoring.ts                      # Planned: ESG composite scoring
│   ├── materiality.ts                      # Planned: Double materiality logic
│   ├── taxonomy.ts                         # Planned: EU Taxonomy calculator
│   ├── social-metrics.ts                   # Planned: S1–S4 metric computation
│   ├── governance-metrics.ts               # Planned: G1 metric computation
│   ├── narrative-disclosures.ts            # Planned: ESRS 2 narrative helpers
│   ├── assurance.ts                        # Planned: Change history & evidence
│   └── supabase-browser.ts                 # Supabase client singleton
├── public/
│   └── img/                                # Static images (logos, icons)
├── proxy.ts                                # Route protection (Next.js 16 convention)
├── middleware.ts                           # Removed (superseded by proxy.ts)
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 2.3 Auth & Route Protection

**Mechanism**: Dual approach with `middleware.ts` and `proxy.ts` (both coexist; consolidate to one eventually).

- **Protected routes**: `/dashboard/*`, `/onboarding`
- **Auth-only routes**: `/login`, `/signup`, `/forgot-password`
- **Redirect logic**:
  - Unauthenticated → redirected to `/login`
  - Authenticated on auth pages → redirected to `/dashboard`

**Auth flow**:
1. `/signup` → Supabase `signUp()` → redirect to `/onboarding`
2. `/onboarding` → create org + user_roles + feature flags (ESG scope selection) → redirect to `/dashboard`
3. `/login` → Supabase `signInWithPassword()` → redirect to `/`
4. `/forgot-password` → Supabase `resetPasswordForEmail()` → link to `/reset-password`
5. `/reset-password` → Supabase `updateUser()` → confirmation

### 2.4 Dashboard Architecture (Updated for SME Modes)

The dashboard (`/dashboard`) is the authenticated hub. The sidebar adapts dynamically based on the SME's regulatory mode — hiding modules that are out of scope for the SME's tier.

**Module Visibility by Mode**

| Module | VSME Basic | VSME Comprehensive | CSRD |
|---|---|---|---|
| Climate (E1) | ✔ Basic | ✔ Full | ✔ Full |
| Pollution (E2) | — | Optional | ✔ Required |
| Water (E3) | — | Optional | ✔ Required |
| Biodiversity (E4) | — | Optional | ✔ Required |
| Circular Economy (E5) | — | Optional | ✔ Required |
| Workforce (S1) | ✔ Basic | ✔ Full | ✔ Full |
| Value Chain (S2) | — | Optional | ✔ Required |
| Communities (S3) | — | Optional | ✔ Required |
| Consumers (S4) | — | Optional | ✔ Required |
| Governance (G1) | ✔ Basic | ✔ Full | ✔ Full |
| ESRS 2 — General Disclosures | ✔ Basic | ✔ Full | ✔ Required |
| Double Materiality | Simplified | Simplified | Full |
| EU Taxonomy | — | Optional | ✔ Required |

The sidebar hides modules not applicable to the SME's scope.

**DashboardNav sidebar links:**

| Category | Link | ESRS Reference | Status |
|----------|------|----------------|--------|
| **Overview** | `/dashboard` | — | ✅ Implemented |
| | | | |
| **🌍 Environmental** | | | |
| → Energy & Emissions | `/dashboard/esg/environmental/climate` | ESRS E1 | 🟡 Placeholder (Scope 1&2 done) |
| → Pollution | `/dashboard/esg/environmental/pollution` | ESRS E2 | ✅ Implemented |
| → Water | `/dashboard/esg/environmental/water` | ESRS E3 | ✅ Implemented |
| → Biodiversity | `/dashboard/esg/environmental/biodiversity` | ESRS E4 | ✅ Implemented |
| → Circular Economy | `/dashboard/esg/environmental/circular` | ESRS E5 | ✅ Implemented |
| | | | |
| **👥 Social** | | | |
| → Workforce | `/dashboard/esg/social/workforce` | ESRS S1 | ✅ Implemented |
| → Value Chain | `/dashboard/esg/social/valuechain` | ESRS S2 | ✅ Implemented |
| → Communities | `/dashboard/esg/social/communities` | ESRS S3 | ✅ Implemented |
| → Consumers | `/dashboard/esg/social/consumers` | ESRS S4 | ✅ Implemented |
| | | | |
| **🏛️ Governance** | | | |
| → Business Ethics | `/dashboard/esg/governance/ethics` | ESRS G1 | ✅ Implemented |
| → Compliance | `/dashboard/esg/governance/compliance` | ESRS G1 | ✅ Implemented |
| → Data Privacy | `/dashboard/esg/governance/dataprivacy` | ESRS G1 + GDPR | ✅ Implemented |
| | | | |
| **📋 General Disclosures (ESRS 2)** | | | |
| → Governance & Strategy | `/dashboard/esg/general/governance` | ESRS 2 (GOV, SBM) | ✅ Implemented |
| → IRO Management | `/dashboard/esg/general/iro-management` | ESRS 2 (IRO) | ✅ Implemented |
| | | | |
| **⚖️ Overarching** | | | |
| → Double Materiality | `/dashboard/materiality` | ESRS 1, IRO-1 | ✅ Implemented |
| → EU Taxonomy | `/dashboard/taxonomy` | EU Taxonomy Reg. | ✅ Implemented |
| | | | |
| **📄 Reports** | `/dashboard/reports` | All ESRS | ✅ Implemented |
| **⚙️ Settings** | `/dashboard/settings` | — | 🟡 Placeholder |

### 2.5 Carbon Calculation Engine (`lib/calculations.ts`)

**Supported activity types** (ESRS E1-6 — GHG emissions):
| Type | Unit | Scope | MWh/Unit formula | Fallback factor (kg CO₂e/unit) |
|---|---|---|---|---|
| `natural_gas` | m³ | Scope 1 | 10.55 kWh/m³ → /1000 | 2.04 |
| `heating_oil` | L | Scope 1 | 10.35 kWh/L → /1000 | 2.96 |
| `electricity` | kWh | Scope 2 | 1/1000 | 0.295 (EU27 avg) |
| `petrol_car_fuel` | L | Scope 1 | 8.64 kWh/L → /1000 | 2.31 |
| `diesel_car_fuel` | L | Scope 1 | 9.59 kWh/L → /1000 | 2.68 |

**Factor resolution order**:
1. Country-specific match on `region === countryCode`
2. EU-wide match (`region === null` or `region === 'EU'`)
3. Built-in fallback constant (`FALLBACK_FACTORS`)

**Core function**: `calculateEmissions(records, factors, countryCode) → CalculationResult`

### 2.6 Branding

- **Primary logo**: `/public/img/carbontrack-ai-logo.png` — used throughout the app
- **Powered-by logo**: `/public/img/greenai-analytics-logo.png` — footer link to `https://greenaianalytics.org`
- **Site metadata**: CarbonTrackAI branding

---

## 3. Backend (`apps/api`)

### 3.1 Tech Stack

- **Runtime**: Node.js + TypeScript (Fastify planned)
- **Database**: PostgreSQL (Supabase-hosted)
- **ORM**: Prisma (planned, not yet configured)
- **Validation**: Zod schemas (to be shared with frontend)

### 3.2 File Map

```
apps/web/
└── lib/
    └── materiality.ts                            # Double materiality scoring engine + ESRS topic definitions
```

```
apps/api/
├── scripts/
│   ├── seed-demo-user.js                            # Creates demo user + org + role + flags
│   └── seed-demo-data.js                            # Seeds activity records + calculations
├── supabase/
│   ├── migrations/
│   │   ├── 20260411000000_init_schema.sql            # Core ESG tables + RLS
│   │   ├── 20260411000100_auth_and_admin.sql          # Auth, audit, admin
│   │   ├── 20260411000200_extended_modules.sql        # Scope 3, targets, risk, supply chain
│   │   ├── 20260411000300_seed_emission_factors.sql   # EU27 carbon factor seeding
│   │   ├── 20260411000400_fix_signup_rls_policies.sql # Fix INSERT policies
│   │   ├── 20260411000500_esg_social_schema.sql           # Social (S1–S4) schema — 18 tables
│   │   ├── 20260411000600_esg_governance_schema.sql       # Governance (G1) schema — 7 tables
│   │   ├── 20260411000700_esg_environmental_extended_schema.sql  # E2–E5 extended — 6 tables
│   │   ├── 20260411000800_esg_double_materiality_schema.sql     # Double materiality — 3 tables
│   │   ├── 20260411000900_esg_taxonomy_schema.sql              # EU Taxonomy — 2 tables
│   │   ├── 20260411001000_esrs2_general_disclosures.sql        # ESRS 2 narrative — 7 tables
│   │   ├── 20260411001100_esrs_datapoint_taxonomy.sql          # Datapoint reference — 27 seeds
│   │   ├── 20260411001200_assurance_change_tracking.sql        # Change history & evidence — 3 tables
│   │   ├── 20260411001300_update_plan_type_and_feature_flags.sql # Plan type enum + ESG flags
│   │   ├── 20260411001400_fix_user_roles_rls_recursion.sql     # Fix infinite RLS recursion on user_roles
│   │   └── 20260411001500_add_materiality_rls_policies.sql     # INSERT/UPDATE/DELETE policies for materiality tables
│   ├── .temp/                                         # Supabase local runtime
│   └── config.toml                                    # Supabase local config
├── .gitignore
├── BACKEND_SETUP.md
├── README.md
├── package.json
├── scripts/
│   ├── seed-demo-user.js                            # Creates demo user + org + role + flags
│   └── seed-demo-data.js                            # Seeds activity records + calculations
└── supabase.json
```

### 3.3 Database Schema — Core ESG Tables (Migration 1)

| Table | ESRS | Purpose | Key Columns |
|---|---|---|---|
| `organizations` | — | SME accounts | `id`, `name`, `country_code`, `sector`, `base_year`, `created_at`, `updated_at` |
| `user_roles` | — | User-org mapping | `user_id`, `organization_id`, `role`, `is_primary` |
| `reporting_periods` | ESRS 1 | Annual reporting windows | `organization_id`, `year`, `start_date`, `end_date`, `is_locked` |
| `activity_records` | E1 | Energy/fuel usage | `organization_id`, `reporting_period_id`, `activity_type`, `quantity`, `unit`, `month`, soft-delete |
| `factor_sources` | E1 | Factor provider registry | `name`, `provider`, `url`, `is_active` |
| `emission_factors` | E1 | CO₂ conversion rates | `source_id`, `activity_type`, `unit`, `region`, `value`, `version`, `effective_date` |
| `calculation_runs` | E1 | Computed carbon results | `organization_id`, `reporting_period_id`, `scope_type`, `total_emissions`, `total_energy`, `breakdown`, `factor_versions` |
| `report_snapshots` | All | Finalised ESG reports | `organization_id`, `reporting_period_id`, per-ESRS JSONB sections, `finalized_at` |
| `import_jobs` | — | Import tracking | Status, file, rows processed |
| `export_jobs` | — | Export tracking | Format, file path, status |
| `feature_flag_subscriptions` | — | ESG module gating | `plan_type` (vsme_basic/vsme_comprehensive/csrd), per-module boolean flags, `expires_at` |

### 3.4 Auth & Admin Tables (Migration 2)

| Table | Purpose |
|---|---|
| `user_profiles` | Extended user info (full_name, phone, avatar, preferences) |
| `admin_audit_log` | All admin actions logged for compliance |
| `login_audit` | Login attempts (success/failure, IP, user-agent) |
| `admin_access_requests` | Request/approval workflow for admin access |
| `organization_invitations` | Invite users to orgs via email with token |

**Key triggers**:
- `on_auth_user_created` → auto-creates `user_profiles` row on signup
- `set_updated_at()` → `updated_at` auto-update (on all major tables)

### 3.5 Legacy Extended Modules (Migration 3 — repurposed for ESG)

| Module | Tables | New ESRS Mapping |
|---|---|---|
| Scope 3 | `business_travel_records`, `upstream_transport_records`, `purchased_goods_records`, `scope3_calculations` | ESRS E1-6 (category 3–8) + S2 |
| Targets | `reduction_targets`, `transition_plan_actions` | ESRS E1-1, E1-2, E1-3 |
| Climate Risk | `physical_assets`, `climate_risk_assessments` | ESRS E1-9, E4 |
| Supply Chain | `supplier_contacts`, `supplier_data_requests`, `product_carbon_footprints` | ESRS S2, E1, E5 |

### 3.6 Social Schema (Migration 5 — ESRS S1–S4)

| Table | ESRS | Purpose | Key Columns |
|---|---|---|---|
| `workforce_headcount` | S1-6 | Employee demographics | Total, gender split, age brackets, nationality, contract type, full-time/part-time |
| `workforce_turnover` | S1-6 | Employee movement | Hires, leavers, turnover rate %, reasons |
| `workforce_diversity` | S1-9 | Diversity metrics | Gender ratio at management, age distribution, disability |
| `health_safety_incidents` | S1-14 | H&S data | Recordable injuries, lost days, fatalities, near-misses |
| `training_records` | S1-13 | Training hours | Total hours, by gender, by employee category, avg hours/employee |
| `gender_pay_gap` | S1-16 | Pay equity | Mean gap %, median gap %, by job level |
| `workforce_policies` | S1-1 | Policies related to own workforce | Policy type (human rights, H&S, diversity, etc.), description, approval date, coverage % |
| `workforce_engagement` | S1-2 | Workforce engagement processes | Engagement method (works council, survey, union), frequency, coverage %, key outcomes |
| `workforce_remediation` | S1-3 | Grievance / remediation mechanisms | Mechanism type, cases received, cases resolved, avg resolution time |
| `workforce_targets` | S1-4 | Targets related to own workforce | Target metric, baseline value, target value, target year, status |
| `workforce_non_employees` | S1-7 | Non-employee workers | Worker type (agency, freelance, contractor), headcount, FTE equivalent |
| `workforce_adequate_wages` | S1-10 | Adequate wage assessment | Employee category, minimum wage vs living wage benchmark, gap % |
| `workforce_disability` | S1-12 | Persons with disabilities | Total employees with disabilities, % of workforce, accommodation measures |
| `worklife_balance` | S1-15 | Work-life balance metrics | Parental leave uptake %, flexible work arrangement %, avg weekly hours |
| `discrimination_incidents` | S1-17 | Discrimination & harassment | Incident type, cases reported, cases investigated, remediation actions |
| `human_rights_due_diligence` | S2/S3 | HRDD assessments | Country, risk level, remediation actions, status |
| `community_engagement` | S3 | Local impact | Engagement type, stakeholder count, complaints received |
| `product_safety_incidents` | S4 | Consumer safety | Incident type, severity, recalls, fines |

### 3.7 Governance Schema (Migration 6 — ESRS G1)

| Table | Purpose | Key Columns |
|---|---|---|
| `board_composition` | G1-1 | Board size, independence, gender diversity, tenure |
| `ethics_training` | G1-1, G1-3 | Anti-corruption training, % employees covered, frequency |
| `compliance_incidents` | G1-4 | Regulatory fines, non-monetary sanctions, legal actions |
| `data_breaches` | G1-5 (GDPR) | Breach type, records affected, notified authority, fines |
| `whistleblower_cases` | G1-1 | Reports received, investigated, substantiated, remediation |
| `supplier_conduct_assessments` | G1-2, S2 | Supplier code violations, audits, corrective actions |
| `political_contributions` | G1-5 | Amount, recipient, country, approval |

### 3.8 Environmental Extended Schema (Migration 7 — ESRS E2–E5)

| Table | ESRS | Purpose | Key Columns |
|---|---|---|---|
| `pollutant_inventories` | E2 | Air/water/soil pollutants | Pollutant type, media (air/water/soil), quantity, unit, threshold |
| `water_consumption` | E3 | Water usage | Source (municipal/ground/surface), volume, recycled %, stress area flag |
| `water_discharge` | E3 | Wastewater | Volume, treatment level, receiving water body |
| `biodiversity_sites` | E4 | Site proximity to sensitive areas | Site location, proximity to protected area, biodiversity action plan |
| `material_flows` | E5 | Resource use | Material type, input mass, recycled content %, renewable % |
| `waste_generation` | E5 | Waste by type and disposal | Waste code (EWC), hazardous flag, disposal method (R/D code), tonnage |

### 3.9 Double Materiality Schema (Migration 8)

| Table | Purpose | Key Columns |
|---|---|---|
| `materiality_assessments` | Assessment round per period | `organization_id`, `reporting_period_id`, `methodology`, `status` |
| `materiality_iro` | Impact, Risk, Opportunity register | `assessment_id`, IRO type (impact/risk/opportunity), topic, subtopic, severity scale, likelihood scale, financial materiality score, impact materiality score, double materiality score, stakeholder input |
| `stakeholder_engagement` | Stakeholder input records | Stakeholder group, engagement method, date, key findings, datapoint references |

### 3.10 EU Taxonomy Schema (Migration 9)

| Table | Purpose | Key Columns |
|---|---|---|
| `taxonomy_assessments` | Alignment per period | `organization_id`, `reporting_period_id`, `status` |
| `taxonomy_activities` | Economic activities assessed | NACE code, activity description, substantial contribution criteria met, DNSH criteria met, minimum safeguards, turnover %, CapEx %, OpEx % |

### 3.11 ESRS 2 General Disclosures (Migration 10)

ESRS 2 is the mandatory baseline for all CSRD reporters. It covers governance, strategy, and IRO management. For SMEs, these are simplified narrative tables.

| Table | ESRS | Purpose | Key Columns |
|---|---|---|---|
| `governance_sustainability_roles` | ESRS 2 GOV-1 | Board/management oversight of ESG | Role, name (optional), ESG responsibility description, oversight body, meeting frequency |
| `strategy_business_model` | ESRS 2 SBM-1 | Business model & value chain description | Narrative description, value chain stages, sectors, geographies, employee breakdown |
| `stakeholder_mapping` | ESRS 2 SBM-2 | Key stakeholder groups & engagement | Stakeholder group, engagement purpose, frequency, key topics raised, how feedback informs strategy |
| `due_diligence_process` | ESRS 2 IRO-1 | Due diligence methodology & scope | Due diligence scope (environmental/social/governance), methodology description, coverage %, outcomes |
| `risk_management_esg` | ESRS 2 IRO-4 | ESG risk management & internal controls | Risk category, process description, integration with enterprise risk management, control effectiveness |
| `policy_documents` | ESRS 2 MDR-P | ESG policy registry | Policy title, ESRS reference, approval date, version, document URL, scope, review date |
| `narrative_disclosures` | All ESRS | Generic qualitative narrative by ESRS datapoint | `organization_id`, `reporting_period_id`, `esrs_datapoint_ref`, `narrative_text`, `disclosure_type` (policy/action/target/outcome) |

### 3.12 ESRS Datapoint Taxonomy Reference (Migration 11)

A lookup table that maps every ESRS datapoint to its data type, unit, mandatory mode, and availability. Only the datapoints relevant to SMEs are pre-seeded — filters out complexity irrelevant to <250 employee companies.

| Table | Purpose | Key Columns |
|---|---|---|
| `esrs_datapoints` | Central datapoint reference | `datapoint_id` (e.g. "E1-6_01"), `esrs_standard`, `paragraph_ref`, `topic`, `data_type` (numeric/boolean/narrative), `unit`, `mandatory_for` (vsme_basic/vsme_comprehensive/csrd), `is_active`, `version` |

### 3.13 Assurance & Change Tracking (Migration 12)

Simplified audit trail — no complex multi-stage approval workflows. Designed for proportionate SME assurance readiness.

| Table | Purpose | Key Columns |
|---|---|---|
| `change_history` | Per-field change tracking | `table_name`, `record_id`, `field_name`, `old_value`, `new_value`, `changed_by`, `changed_at`, `change_reason` |
| `evidence_attachments` | Evidence files linked to records | `source_table`, `source_record_id`, `file_name`, `file_url`, `file_type`, `description`, `uploaded_by`, `uploaded_at` |
| `review_approval_log` | Simple sign-off tracking | `source_table`, `source_record_id`, `reviewer_id`, `review_status` (draft/reviewed/approved), `comments`, `reviewed_at` |

### 3.14 Row-Level Security (RLS) Pattern

All organisation-scoped tables use the same RLS pattern:

```sql
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  )
);
```

**Exceptions**:
- `emission_factors` — publicly readable (only active sources)
- `factor_sources` — publicly readable (only active)

**Insert policies**: Authenticated users can insert rows scoped to their orgs (fixed in migration 4).

### 3.15 Emission Factors — Source Tier Strategy

| Tier | Provider | Region | Status |
|---|---|---|---|
| 1 | ADEME Base Carbone | France (FR) | Seeded |
| 1 | MITECO | Spain (ES) | Seeded |
| 1 | EPA | Ireland (IE) | Planned |
| 2 | Climatiq (EEA data) | EU27 | Seeded |
| 3 | Local Cache | EU27 fallback | Seeded |

**Pre-seeded factor sources** (migration 2):
- ADEME Base Carbone (FR)
- Spain MITECO (ES)
- Climatiq (EU27)
- EEA (via Climatiq)
- Local Cache Fallback

---

## 4. ESG Modules & Pricing

### 4.1 ESRS Module Map with SME Applicability

| Pillar | Module | ESRS Ref | SME Applicability | Price Tier |
|--------|--------|----------|-------------------|------------|
| **E** | Climate — Energy & Emissions | E1-1 to E1-9 | **All SMEs** — required even in VSME Basic | Free (Basic) |
| **E** | Pollution | E2-1 to E2-6 | Medium SMEs, listed SMEs — optional for VSME | €99/mo |
| **E** | Water & Marine Resources | E3-1 to E3-5 | Medium SMEs, listed SMEs — optional for VSME | €99/mo |
| **E** | Biodiversity & Ecosystems | E4-1 to E4-6 | Medium SMEs, listed SMEs — optional for VSME | €99/mo |
| **E** | Resource Use & Circular Economy | E5-1 to E5-7 | Medium SMEs, listed SMEs — optional for VSME | €99/mo |
| **S** | Own Workforce | S1-1 to S1-17 | **All SMEs** — simplified for VSME, full for CSRD | €99/mo |
| **S** | Workers in Value Chain | S2-1 to S2-5 | Medium SMEs, listed SMEs — optional for VSME | €99/mo |
| **S** | Affected Communities | S3-1 to S3-5 | Medium SMEs, listed SMEs — optional for VSME | €99/mo |
| **S** | Consumers & End-Users | S4-1 to S4-5 | Medium SMEs, listed SMEs — optional for VSME | €99/mo |
| **G** | Business Conduct | G1-1 to G1-6 | **All SMEs** — simplified for VSME, full for CSRD | €99/mo |
| **Cross** | Double Materiality | ESRS 1, IRO-1, IRO-2 | **All SMEs** — simplified for VSME, full for CSRD | Free |
| **Cross** | EU Taxonomy | EU Tax. Reg. | Listed SMEs — optional for VSME Comprehensive, hidden for VSME Basic | €99/mo |
| **Cross** | Report Builder | ESRS 1–G1 | **All SMEs** — scope adapts to mode | Free (Basic) |

### 4.2 Feature Flag Mapping

Each module is gated by a boolean flag in `feature_flag_subscriptions`:

```typescript
type EsgFeatureFlags = {
  plan_type: 'vsme_basic' | 'vsme_comprehensive' | 'csrd';
  // General Disclosures (ESRS 2)
  esrs2_enabled: true;                  // always free — mandatory baseline
  // Environmental
  climate_enabled: true;                // always free
  pollution_enabled: boolean;
  water_enabled: boolean;
  biodiversity_enabled: boolean;
  circular_economy_enabled: boolean;
  // Social
  workforce_enabled: boolean;
  valuechain_enabled: boolean;
  communities_enabled: boolean;
  consumers_enabled: boolean;
  // Governance
  business_conduct_enabled: boolean;
  // Cross-cutting
  materiality_enabled: true;            // always free
  taxonomy_enabled: boolean;
  report_builder_enabled: true;         // always free
};
```

### 4.3 Plan Gating Logic (Updated for SME Modes)

- **`vsme_basic`** → **VSME Basic (Free)**: Climate (E1), Workforce (S1, basic), Governance (G1, basic), Simplified Materiality, Report Builder, ESRS 2 General Disclosures. Core feature flags: `climate_enabled`, `esrs2_enabled`, `materiality_enabled`, `report_builder_enabled` — all `true`
- **`vsme_comprehensive`** → **VSME Comprehensive (€99/mo)**: All Environmental (E1–E5) + All Social (S1–S4) + All Governance (G1) + Simplified Taxonomy. Feature flags for all E/S/G modules enabled
- **`csrd`** → **CSRD (€99/mo)**: All VSME Comprehensive features + Full Double Materiality + Full EU Taxonomy + Expanded ESRS 2 narrative. `taxonomy_enabled = true`, all other module flags enabled
- **Mode auto-detection**: Onboarding detects SME type (micro, small, medium, listed, subsidiary) and compliance drivers to assign the correct mode and provision feature flags accordingly. The `plan_type` enum stores `'vsme_basic' | 'vsme_comprehensive' | 'csrd'` in `feature_flag_subscriptions`

---

## 5. Current Implementation Status

> **Last updated**: May 2026. Production-deployed, 25 migrations, 26 pages, 8 libraries, zero TypeScript errors.

### ✅ All Modules Implemented — Zero Placeholders

#### 🌍 Environmental (E1–E5) — 5/5

| Module | Page | Tables |
|--------|------|--------|
| E1 Climate | Activity Data, Emissions Results, Climate Hub | `activity_records`, `calculation_runs`, `emission_factors`, `contractual_instruments` — dual Scope 2 (location + market-based) with AIB residual mix, GoO/PPA/REC tracking |
| E2 Pollution | `/esg/environmental/pollution` | `pollutant_inventories` |
| E3 Water | `/esg/environmental/water` | `water_consumption`, `water_discharge` |
| E4 Biodiversity | `/esg/environmental/biodiversity` | `biodiversity_sites` |
| E5 Circular Economy | `/esg/environmental/circular` | `material_flows`, `waste_generation` |

#### 👥 Social (S1–S4) — 4/4

| Module | Page | Tables |
|--------|------|--------|
| S1 Own Workforce | `/esg/social/workforce` | `workforce_headcount`, turnover, diversity, H&S, training, pay gap, work-life (7 tables) |
| S2 Value Chain | `/esg/social/valuechain` | `human_rights_due_diligence` |
| S3 Communities | `/esg/social/communities` | `community_engagement` |
| S4 Consumers | `/esg/social/consumers` | `product_safety_incidents` |

#### 🏛️ Governance (G1) — 3/3

| Module | Page | Tables |
|--------|------|--------|
| Business Ethics | `/esg/governance/ethics` | `board_composition`, `ethics_training`, suppliers, political contributions (4 tables) |
| Compliance | `/esg/governance/compliance` | `compliance_incidents`, `whistleblower_cases` + regulatory deadlines |
| Data Privacy | `/esg/governance/dataprivacy` | `data_breaches` + GDPR compliance + SAR tracker |

#### ⚖️ Cross-Cutting — 3/3

| Module | Page | Tables |
|--------|------|--------|
| Double Materiality | `/dashboard/materiality` | `materiality_assessments`, `materiality_iro` |
| EU Taxonomy | `/dashboard/taxonomy` | `taxonomy_assessments`, `taxonomy_activities` |
| ESRS 2 Disclosures | `/esg/general/governance`, `/esg/general/iro-management` | 7 tables (strategy, governance roles, stakeholders, policies, due diligence, risk mgmt, narratives) |

#### 📄 Platform

| Module | Page | Tables |
|--------|------|--------|
| Report Builder | `/dashboard/reports` | `report_snapshots` (migration 17) — cross-pillar aggregation, JSON export |
| Settings | `/dashboard/settings` | `organizations`, `user_roles`, `feature_flag_subscriptions` — profile, plan, team, danger zone, Climatiq refresh |

#### 🛡️ GDPR & Data Protection

- `whistleblower_officer` role added to `user_role` enum (migration 20a)
- `whistleblower_cases` restricted to admin + whistleblower_officer (Directive 2019/1937 Art. 16)
- `discrimination_incidents` restricted to admin-only (GDPR Art. 9 special category data)
- `applyKAnonymity()` in `lib/social-metrics.ts` suppresses counts <10 in reports
- `data_residency_region` column on `organizations` enforces EU/EEA storage (GDPR Art. 44-49)

### 📦 Computation Libraries

| Library | Purpose |
|--------|--------|
| `lib/calculations.ts` | Carbon — Scope 1 & 2 (location-based), EU27 fallback factors (195 lines) |
| `lib/materiality.ts` | ESRS 1-compliant double materiality — scale×scope×irremediability, per-assessment thresholds, time-horizon/value-chain tagging, k-anonymity helpers (600+ lines) |
| `lib/social-metrics.ts` | S1 workforce KPIs — headcount, turnover, H&S, training, pay gap, work-life, GDPR k-anonymity suppression (300+ lines) |
| `lib/governance-metrics.ts` | G1 governance KPIs — board, ethics, compliance, privacy, whistleblower, suppliers, political (203 lines) |
| `lib/taxonomy.ts` | EU Taxonomy — eligibility, alignment, turnover/CapEx/OpEx KPIs, 3 depth levels, 19 NACE codes (143 lines) |
| `lib/climatiq.ts` | Climatiq Data API v1 client — fetches emission factors for 5 activity types across 27 EU countries, maps to internal format (181 lines) |
| `lib/greenwashing.ts` | Green Claims Directive (EU 2024/825) — detects 25 high-risk + 12 medium-risk unsubstantiated environmental terms in narrative text (137 lines) |
| `lib/ixbrl.ts` | ESEF iXBRL generator — ESRS XBRL taxonomy inline tagging, 23 datapoint mappings, XHTML output (212 lines) |

### 🗄️ Database — 25 Migrations

| # | Purpose |
|---|--------|
| 1 | Core schema: `organizations`, `user_roles`, `activity_records`, `emission_factors`, `calculation_runs` |
| 2–3 | Auth, admin, extended modules |
| 4 | EU27 emission factor seed data (ADEME, MITECO, Climatiq, EEA) |
| 5 | Social schema (S1–S4): 18 tables |
| 6 | Governance schema (G1): 7 tables |
| 7 | Environmental extended (E2–E5): 6 tables |
| 8 | Double materiality schema: 3 tables |
| 9 | EU Taxonomy schema: 2 tables |
| 10 | ESRS 2 General Disclosures: 7 tables |
| 11 | ESRS datapoint taxonomy: 27 datapoints |
| 12 | Assurance & change tracking |
| 13 | Plan type enum update + 14 ESG feature flag columns |
| 14 | RLS recursion fix |
| 15 | Materiality RLS policies |
| 16 | SME classification columns |
| 17 | report_snapshots immutable storage |
| 18 | Scope 2 market-based |
| 19 | VSME enum rename |
| 20a | whistleblower_officer role |
| 20b | GDPR RLS guards |
| 21 | Materiality ESRS 1 columns: `scale_score`, `scope_score`, `irremediability_score`, `time_horizon`, `value_chain_location`, per-assessment thresholds |
| 22 | Pay Transparency Directive (EU 2023/970): quartile distribution, pay components, job_category_pay_gap, joint_pay_assessment |
| 23 | Whistleblower channel: case_reference, case_status, timers (7-day ack, 3-month feedback), anti-retaliation policy |
| 24 | XBRL tags: xbrl_tag and xbrl_namespace columns on esrs_datapoints, seeded 27 concept names from EFRAG taxonomy |
| 25 | Country overlays: per-member-state regulatory config — 8 countries seeded (DE, FR, IT, ES, NL, PL, AT, SE, DK) |

### ✅ Recently Completed

- **CI pipeline** — GitHub Actions: TypeScript check, ESLint, Next.js build on push
- **Admin dashboard** — factor sources, audit log viewer, system statistics
- **iXBRL / ESEF export** — embedded XBRL tags in XHTML, 23 datapoint mappings
- **Greenwashing detection** — live flagging on strategy narrative (Green Claims Dir. 2024/825)
- **Pay Transparency Directive** — quartile distribution, pay components, job categories, joint assessment
- **Whistleblower channel** — anonymous web form, case timers, Directive 2019/1937 compliant
- **Country overlays** — 8 EU member states with filing portals, factor authorities, labour law extensions
- **Demo data** — comprehensive seed script for all ESG modules
- **Emissions page crash** — fixed `Uncaught TypeError: e.emissionsTco2e is undefined` caused by JSON double-encoding in seed script + missing defensive checks in breakdown table render
- **Climate page year-filtering** — added year selector + `reporting_period_id` filtering to Energy & Emissions page. Previously queried non-existent columns (`scope1`, `scope2`, `year`) on `calculation_runs` and counted activity records / contractual instruments across ALL periods. Now scoped to the selected reporting year like the Activity and Emissions pages.
- **Production readiness audit & hardening** — audited against production-code-readiness.md and security.md. Addressed 10 items: zod validation on all API routes + key forms, npm audit zeroed (0 vulns), IP-based rate limiting, security headers (CSP/X-Frame/XSS/Referrer/Permissions-Policy), secured refresh-factors with admin API key, error boundary pages, health check endpoint, 14 unit tests, structured JSON logger, crash handlers (instrumentation.ts), extracted IroForm component. Verified: tsc passes, 14/14 tests pass.

### 🔔 Future / Not Yet Implemented

- **Swap IroForm into materiality page** — component extracted and ready, needs import + prop wiring
- **Offline draft + sync** — no PWA
- **Shared types package** — no `@carbontrackai/shared` workspace
- **Multilingual reports** — i18n on UI strings not yet implemented

## 6. Key Data Flows

### 6.1 User Onboarding Flow (Updated for SME Modes)

> **SME classification** follows Recommendation 2003/361/EC: headcount **AND** (turnover **OR** balance sheet). See §1 SME Scoping Logic for thresholds.

```
/signup → supabase.auth.signUp() → email confirmation
  → /onboarding (Step 1: org details — name, country, sector, headcount, annual turnover, annual balance sheet total)
      → SME classification: two-of-three logic applied
        → Does headcount qualify? (< 250 for any SME category)
        → Does turnover OR balance sheet qualify?
        → Assign: micro / small / medium / non-SME
    → /onboarding (Step 2: Compliance Scope Detection)
        - Listed on a regulated market? → If yes + Omnibus scope check (not automatic CSRD)
        - Required by parent company (subsidiary of large group)?
        - Receiving ESG data requests from banks/customers/investors?
        - Voluntary VSME reporting?
      → Determine: mandatory CSRD vs voluntary VSME vs counterparty-driven VSME
    → /onboarding (Step 3: ESG scope — select E/S/G pillars needed)
      → /onboarding (Step 4: plan — Basic (VSME Basic) vs Comprehensive (VSME Comprehensive / CSRD))
        → Auto-assign mode using SME type + compliance driver:
            - Micro/small non-listed → VSME Basic (upgradable to VSME Comprehensive)
            - Medium non-listed → VSME Comprehensive (upgradable to CSRD if counterparty requires)
            - Listed SMEs (in Omnibus scope) → CSRD
            - Listed SMEs (outside Omnibus scope) → VSME Comprehensive (upgradable to CSRD)
        → supabase.from("organizations").insert()
        → supabase.from("user_roles").insert()
        → supabase.from("feature_flag_subscriptions").insert()
        → /dashboard
```

### 6.2 ESRS 2 General Disclosures Flow (Narrative)

**Mode**: Required in all modes — VSME Basic, VSME Comprehensive, and CSRD.

```
/dashboard/esg/narrative/
  → User completes structured narrative forms per ESRS 2 section:

  → /governance (ESRS 2 GOV-1 to GOV-3):
    → Enter board/management roles responsible for ESG
    → Describe internal controls over sustainability reporting
    → Save to governance_sustainability_roles table

  → /strategy (ESRS 2 SBM-1 to SBM-3):
    → Describe business model and value chain stages
    → Map key stakeholder groups and engagement methods
    → Save to strategy_business_model and stakeholder_mapping tables

  → /iro-management (ESRS 2 IRO-1, IRO-4):
    → Describe due diligence process and coverage
    → Describe ESG risk management integration
    → Save to due_diligence_process and risk_management_esg tables

  → /policies (ESRS 2 MDR-P):
    → Upload ESG policy documents
    → Tag each policy to relevant ESRS datapoints
    → Set approval date, review date, scope
    → Save to policy_documents table

  → Narrative data feeds into report builder alongside quantitative metrics
  → Change history auto-tracks every field edit (assurance.ts)
  → Evidence attachments can be linked to any narrative entry
```

### 6.3 Carbon Calculation Flow (ESRS E1-6)

```
/dashboard/esg/environmental/climate
  → user enters activity data (natural_gas, electricity, etc.)
  → INSERT into activity_records
  → user clicks "Calculate"
    → SELECT records for period
    → SELECT emission_factors (by country + activity_type)
    → calculateEmissions(records, factors, countryCode)
    → UPSERT calculation_runs (scope_1, scope_2_location)
    → Calculate Scope 3 from business_travel, transport, goods tables
    → Compute energy intensity (MWh/revenue, MWh/employee)
  → Display breakdown table + totals + intensity ratios
```

### 6.4 Social Metric Computation Flow (ESRS S1)

```
/dashboard/esg/social/workforce
  → user enters annual aggregate data per table:
    → workforce_headcount (by gender, contract type)
    → workforce_turnover (hires, leavers)
    → health_safety_incidents (injuries, lost days)
    → training_records (hours by category)
    → gender_pay_gap (mean, median)
    → workforce_policies (S1-1), workforce_engagement (S1-2)
    → workforce_remediation (S1-3), workforce_targets (S1-4)
    → workforce_non_employees (S1-7), adequate_wages (S1-10)
    → workforce_disability (S1-12), worklife_balance (S1-15)
    → discrimination_incidents (S1-17)
  → social-metrics.ts library computes:
    → FTE count, gender ratio (%)
    → Turnover rate (%)
    → Injury rate (per 100 FTE)
    → Lost day rate
    → Average training hours/FTE
    → Gender pay gap (%)
    → Policy coverage %, engagement coverage %
  → Saves derived metrics to esg_metric_snapshots
  → Display KPI cards, trend charts, peer benchmarking
```

### 6.5 Double Materiality Assessment Flow (ESRS 1 / IRO-1)

**VSME Basic / VSME Comprehensive** (simplified):
```
/dashboard/materiality
  → Step 1: Select pre-defined sector template
  → Step 2: IRO Identification — pick from curated list of common IROs for the sector
    → For each IRO, assess:
      → 3-point severity scale (low / medium / high)
      → No financial materiality scoring
    → Material if severity ≥ medium
  → Step 3: Automatic mapping to simplified VSME disclosures
  → Save to materiality_iro table
  → Display: simple checklist, datapoint coverage %
```

**CSRD** (full ESRS):
```
/dashboard/materiality
  → Step 1: Context — describe business model, value chain, stakeholder groups
  → Step 2: IRO Identification — identify relevant ESG impacts, risks, opportunities
    → For each IRO, assess:
      → Impact materiality (severity × likelihood for negative; scale × likelihood for positive)
        → Severity: scale (1–5) + scope (1–5) + irremediability (1–5)
      → Financial materiality (magnitude × likelihood of financial effect)
    → Compute double materiality threshold
  → Step 3: Materiality matrix — plot IROs on 2×2 grid
    → Top-right quadrant = material (disclosure required)
  → Step 4: Disclosure mapping — map material IROs to ESRS datapoints
  → Save to materiality_iro table
  → Display: interactive matrix chart, datapoint coverage %, export
```

### 6.6 EU Taxonomy Alignment Flow

**Mode gating**: Mandatory for **CSRD**, optional for **VSME Comprehensive**, hidden for **VSME Basic**.

```
/dashboard/taxonomy
  → Step 1: Eligibility screening — select NACE-coded economic activities
    → Check against delegated acts (climate mitigation/adaptation + other objectives)
  → Step 2: Substantial contribution — does activity meet technical screening criteria?
    → Per objective: climate, water, circular, pollution, biodiversity
  → Step 3: DNSH — does no significant harm to other objectives?
  → Step 4: Minimum safeguards — OECD guidelines, UNGP, ILO, OECD due diligence
  → Step 5: KPI calculation — turnover, CapEx, OpEx alignment percentages
  → Save to taxonomy_activities table
  → Display: eligibility % vs alignment %, trend, GAR/KPI breakdown
```

### 6.7 CSRD Report Builder Flow

```
/dashboard/reports
  → User selects reporting period
  → User selects which ESRS datapoints to include
    → Pre-populated from materiality assessment (material topics)
    → Includes ESRS 2 narrative disclosures
  → System aggregates all ESG data for the period:
    → ESRS 2: governance, strategy, IRO management narratives
    → E1: calculation_runs, emission factors
    → E2–E5: pollutant_inventories, water_consumption, etc.
    → S1–S4: workforce metrics, incidents, training, policies, etc.
    → G1: board_composition, compliance_incidents, etc.
    → Materiality: materiality_iro table
    → Taxonomy: taxonomy_activities table
  → Generate report snapshot:
    → Excel export (structured per ESRS template with narrative + quantitative sections)
    → PDF export (narrative + KPI summary)
    → XHTML/iXBRL (future — for ESEF compliance via third-party filing agent)
  → Finalise snapshot (immutable, audit trail)
  → Change history frozen at finalisation
  → Display: report preview, download links, version history
```

---

## 7. Planned API Endpoints (Full ESG Scope)

### Auth & Organisation

```
POST   /auth/signup
POST   /auth/login
POST   /auth/logout
POST   /auth/password-reset
GET    /auth/me

POST   /organizations
GET    /organizations/:id
PUT    /organizations/:id
GET    /organizations/:id/users
POST   /organizations/:id/invite
```

### Environmental (ESRS E1–E5)

```
GET    /orgs/:id/reporting-periods
POST   /orgs/:id/reporting-periods

POST   /orgs/:id/activity-records
GET    /orgs/:id/activity-records
PUT    /activity-records/:id
DELETE /activity-records/:id

POST   /orgs/:id/calculations/scope1
POST   /orgs/:id/calculations/scope2
POST   /orgs/:id/calculations/scope3
GET    /orgs/:id/calculations/:runId

POST   /orgs/:id/pollution                  # E2
POST   /orgs/:id/water                      # E3
POST   /orgs/:id/biodiversity               # E4
POST   /orgs/:id/material-flows             # E5
POST   /orgs/:id/waste                      # E5

GET    /emission-factors                    # Public
GET    /emission-factors?region=FR
```

### Social (ESRS S1–S4)

```
POST   /orgs/:id/workforce/policies         # S1-1 (NEW)
POST   /orgs/:id/workforce/engagement       # S1-2 (NEW)
POST   /orgs/:id/workforce/remediation      # S1-3 (NEW)
POST   /orgs/:id/workforce/targets          # S1-4 (NEW)
POST   /orgs/:id/workforce/headcount        # S1-6
POST   /orgs/:id/workforce/turnover         # S1-6
POST   /orgs/:id/workforce/non-employees    # S1-7 (NEW)
POST   /orgs/:id/workforce/diversity        # S1-9
POST   /orgs/:id/workforce/adequate-wages   # S1-10 (NEW)
POST   /orgs/:id/workforce/disability       # S1-12 (NEW)
POST   /orgs/:id/workforce/training         # S1-13
POST   /orgs/:id/workforce/hs-incidents     # S1-14
POST   /orgs/:id/workforce/worklife-balance # S1-15 (NEW)
POST   /orgs/:id/workforce/pay-gap          # S1-16
POST   /orgs/:id/workforce/discrimination   # S1-17 (NEW)
POST   /orgs/:id/valuechain/hrdd            # S2
POST   /orgs/:id/communities                # S3
POST   /orgs/:id/consumers/safety           # S4
```

### Governance (ESRS G1)

```
POST   /orgs/:id/governance/board           # G1-1
POST   /orgs/:id/governance/ethics-training # G1-3
POST   /orgs/:id/governance/compliance      # G1-4
POST   /orgs/:id/governance/data-breaches   # G1-5
POST   /orgs/:id/governance/whistleblower   # G1-1
POST   /orgs/:id/governance/supplier-conduct # G1-2
```

### Cross-cutting

```
POST   /orgs/:id/esrs2/governance           # ESRS 2 GOV-1 (NEW)
POST   /orgs/:id/esrs2/strategy             # ESRS 2 SBM-1 (NEW)
POST   /orgs/:id/esrs2/stakeholder-map      # ESRS 2 SBM-2 (NEW)
POST   /orgs/:id/esrs2/due-diligence        # ESRS 2 IRO-1 (NEW)
POST   /orgs/:id/esrs2/risk-management      # ESRS 2 IRO-4 (NEW)
POST   /orgs/:id/esrs2/policies             # ESRS 2 MDR-P (NEW)

POST   /orgs/:id/materiality                # ESRS 1 / IRO-1
GET    /orgs/:id/materiality/:assessId
POST   /orgs/:id/materiality/iro           # Individual IRO record
PUT    /materiality/iro/:id                # Update IRO scoring

POST   /orgs/:id/taxonomy                   # EU Taxonomy alignment
GET    /orgs/:id/taxonomy/:assessId
POST   /orgs/:id/taxonomy/activities

POST   /orgs/:id/reports/generate          # CSRD report builder
GET    /orgs/:id/reports                   # List snapshots
GET    /orgs/:id/reports/:snapshotId
POST   /orgs/:id/reports/:snapshotId/finalize
GET    /orgs/:id/reports/:snapshotId/export?format=excel|pdf|xhtml

# Assurance & evidence
GET    /orgs/:id/change-history             # Per-field audit log (NEW)
POST   /orgs/:id/evidence/upload            # Upload evidence file (NEW)
GET    /orgs/:id/evidence                   # List evidence files (NEW)
POST   /orgs/:id/review/approve             # Sign-off approval (NEW)
```

### ESRS 2 General Disclosures (Narrative)

```
POST   /orgs/:id/governance/sustainability-roles    # ESRS 2 GOV-1
POST   /orgs/:id/strategy/business-model             # ESRS 2 SBM-1
POST   /orgs/:id/strategy/stakeholder-mapping         # ESRS 2 SBM-2
POST   /orgs/:id/iro/due-diligence                    # ESRS 2 IRO-1
POST   /orgs/:id/iro/risk-management                  # ESRS 2 IRO-4
POST   /orgs/:id/policies                             # MDR-P
POST   /orgs/:id/narrative-disclosures                # All ESRS narrative
```

### Assurance & Evidence

```
GET    /orgs/:id/change-history?table=&record_id=
POST   /orgs/:id/evidence                            # Upload evidence file
GET    /orgs/:id/evidence/:evidenceId
POST   /orgs/:id/review-approval                     # Sign-off on a record
GET    /orgs/:id/review-approval/:source_table/:record_id
```

### Admin

```
GET    /admin/audit-log
POST   /admin/factors/refresh
POST   /admin/users/:id/approve
```

---

## 8. Environment Variables

> **GDPR data residency**: The Supabase project MUST be pinned to an EU region (**eu-central-1** or **eu-west-1**) to ensure personal data (including ESRS S1 workforce aggregates) remains within the EEA. This is a regulatory requirement under Art. 44–49 GDPR.

| Variable | Used In | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend (`supabase-browser.ts`) | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend (`supabase-browser.ts`) | Yes |
| `SUPABASE_URL` | Backend (future) | Yes |
| `SUPABASE_ANON_KEY` | Backend (future) | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend admin operations | Production |
| `SUPABASE_REGION` | Supabase project region (must be `eu-central-1` or `eu-west-1`) | **P0 — GDPR** |
| `CLIMATIQ_API_KEY` | Factor refresh (future) | When integrating |
| `ESRS_DATAPOINT_API_URL` | ESRS taxonomy updates | Optional |
| `SOCIAL_BENCHMARK_DB_URL` | Social metric benchmarking | Optional |

---

## 9. Key Architectural Decisions

1. **ESRS-traceable data model**: Every table references the specific ESRS datapoint it supports (via column naming or metadata). This creates a clear audit trail from raw data → computed metric → disclosure.
2. **Pillar-based module organisation**: UI and backend are organised by ESG pillar (E, S, G) + cross-cutting. This mirrors how CSRD reports are structured.
3. **Feature flags for module gating**: Each ESRS topical standard gets its own feature flag. Onboarding provisions only the modules the SME actually needs, keeping the UI clean.
4. **Double materiality as the gateway**: The materiality assessment determines which ESRS datapoints an SME must report on. The report builder uses the materiality matrix to scope the output.
5. **Activity-based data as default**: Spend-based and estimation-based fallbacks are secondary. This aligns with the VSME principle of proportionate data collection.
6. **Audit trail everywhere**: Every calculation, assessment, and finalised report stores versioned inputs, methodology references, and timestamps. CSRD requires assurance readiness.
7. **Immutable snapshots**: Once an ESG report is finalised (`finalized_at` set), the snapshot is append-only. This is critical for auditability and assurance.
8. **Country-aware defaults**: Emission factors, social benchmarks, and governance norms vary by EU member state. All modules default to country-specific values where possible.
9. **Supabase-first with planned API layer**: Current frontend queries Supabase directly (simpler for MVP). A Fastify/Prisma API layer will later abstract complex operations (report generation, taxonomy calculations, factor refresh jobs).
10. **Simplified for SMEs**: The platform prioritises VSME Basic and VSME Comprehensive for the majority of non-listed SMEs. CSRD serves a smaller subset (listed SMEs, subsidiaries). Where complexity can be removed without breaking regulatory usefulness, it is removed — no over-engineered assurance, simple narrative forms, progressive datapoint granularity.

---

## 10. Getting Started for Development

```bash
# From repo root
npm install

# Run frontend dev server
npm run dev -w @carbontrackai/web

# Run API (Supabase local)
npm run dev -w @carbontrackai/api

# Run both simultaneously
npm run dev:all

# Build frontend
npm run build -w @carbontrackai/web

# Lint frontend
npm run lint -w @carbontrackai/web
```

### Database Migrations

```bash
# Push migrations to Supabase
npm run db:push -w @carbontrackai/api

# Create new migration
npm run db:migrate -w @carbontrackai/api
```

### Seeding a Demo User

A seed script is available to quickly create a test user with a pre-provisioned organization, admin role, and full feature flags:

```bash
# From repo root — creates demo@carbontrackai.com / Demo1234!
npm run seed:demo-user

# Or from the api workspace
npm run seed:demo-user -w @carbontrackai/api
```

The script creates:
- A confirmed user in `auth.users` via the Supabase Admin API (service_role key)
- A row in `user_profiles` (via the `on_auth_user_created` trigger)
- An organization named "Demo Company Ltd." (DE, IT & Software, base year 2024)
- Admin role with `is_primary = true` in `user_roles`
- Feature flags with `csrd` plan in `feature_flag_subscriptions`

After running, log in at `http://localhost:3000/login` with:
- **Email**: `demo@carbontrackai.com`
- **Password**: `Demo1234!`

> **Note**: The script reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the root `.env.local`. These must be configured before running.

### Seeding Demo Data

After the demo user exists, populate the dashboard with sample activity data and calculations:

```bash
# From repo root
npm run seed:demo-data

# Or from the api workspace
npm run seed:demo-data -w @carbontrackai/api
```

The script creates:
- A 2025 reporting period
- **36 activity records** (12 months × electricity, natural gas, diesel car fuel) for a typical German SME office
- **Scope 1 calculation run** — 23.86 tCO₂e (gas heating + fleet fuel)
- **Scope 2 calculation run** — 16.83 tCO₂e (German grid electricity, 49.5 MWh)

The script is idempotent — it skips records that already exist.

### Adding a New ESG Module

1. **Database**: Create new migration in `apps/api/supabase/migrations/` with tables + RLS + indexes
2. **Library**: Add computation logic in `apps/web/lib/` (e.g. `social-metrics.ts`)
3. **Pages**: Create route group under `apps/web/app/dashboard/esg/{pillar}/{module}/`
4. **Navigation**: Add link to `DashboardNav.tsx`
5. **Dashboard**: Add KPI card to dashboard overview
6. **Feature flag**: Add boolean to `feature_flag_subscriptions` schema and onboarding flow
7. **Export**: Add ESRS datapoint mapping to report builder

---

## Double Materiality Module

A full double materiality assessment UI has been built, replacing the Implemented page.

### Pages

| Route | Purpose |
|---|---|
| `/dashboard/materiality` | Assessment list — create new or pick existing assessment |
| `/dashboard/materiality/[id]` | Assessment detail with 3 tabs (IRO Register, Matrix, Summary) |

### IRO Register (Tab 1)

- Full CRUD table for Impacts, Risks, and Opportunities
- Modal form with IRO type selector, direction, ESRS topic/subtopic pickers, severity/likelihood sliders (1–5)
- Real-time score computation as sliders change
- Score columns: Impact Materiality, Financial Materiality, Double Materiality

### Materiality Matrix (Tab 2)

- SVG-based 2×2 matrix plotting IROs by impact score (x-axis) vs financial score (y-axis)
- Color-coded quadrants: Not Material, Impact, Financial, Double Material
- IROs rendered as circles sized by double materiality score, colored by type (impact=red, risk=amber, opportunity=green)
- Data table below with quadrant classification badges

### Summary (Tab 3)

- Key metric cards: Total IROs, Material Topics, Highly Material Topics, Assessment Progress %
- Per-topic materiality table showing all 10 ESRS topics with IRO count and materiality badge
- Next steps section with guidance based on material topics identified

### Library: `lib/materiality.ts`

| Export | Purpose |
|---|---|
| `ESRS_TOPICS` | Registry of all 10 ESRS topics (E1–E5, S1–S4, G1) with 32 subtopics |
| `calculateImpactScore(severity, likelihood)` | Impact materiality score using √(severity × likelihood) |
| `calculateFinancialScore(magnitude, likelihood)` | Financial materiality score using √(magnitude × likelihood) |
| `calculateDoubleMaterialityScore(impact, financial)` | Max of impact and financial scores |
| `classifyMateriality(score)` | Threshold-based classification (<2.5 not material, <4.0 material, ≥4.0 highly material) |
| `computeIroScores(iro)` | Computes all three scores from an IRO record in one call |
| `buildMatrixData(iros)` | Generates matrix points with quadrant assignment |
| `generateSummary(assessmentId, status, iros)` | Full assessment summary with material topic detection |

### Database

Migration 15 adds missing INSERT/UPDATE/DELETE RLS policies for:
- `materiality_assessments`
- `materiality_iro` (via assessment → org join)
- `stakeholder_engagement`

---

## 11. Known Issues & Gotchas

- **RLS on insert was missing initially** — migration `20260411000400` fixed this for `user_roles` and `feature_flag_subscriptions`. Any new ESG table must have INSERT policies or onboarding/data entry will fail.
- **No shared types package yet** — types across lib/*.ts are duplicated across components. Creating `@carbontrackai/shared` workspace would reduce duplication.
- **ESG module UIs are all fully implemented** — all 25 pages have real data entry forms, calculations, and dashboards. Zero Implementeds remain.
- **Emissions page is 428 lines** — too large. Refactor into smaller components (calculation runner, results table, factor provenance panel).
- **VSME→ESRS remapping needed** — the original 5 VSME modules don't map 1:1 to ESRS topical standards. Use the mapping tables in section 4 to guide refactoring.
- **ESRS 2 narrative UI not yet built** — all 7 ESRS 2 tables exist in schema (Migration 10) but the narrative disclosure pages and forms are not yet implemented.
- **Datapoint taxonomy seeded only at module level** — the `esrs_datapoints` table (Migration 11) exists with 27 high-level module references. Granular datapoint seeding per pillar is needed as modules are built out.
- **Social & governance benchmarks vary by country** — unlike emission factors, social metrics (e.g. average training hours, gender pay gap) need country-specific benchmarks. Plan for a `social_benchmarks` and `governance_benchmarks` table.
- **Feature flag gating not yet enforced** — `feature_flag_subscriptions` has 14 ESG module flags and the updated `plan_type` enum (`vsme_basic`/`vsme_comprehensive`/`csrd`), but the sidebar and dashboard don't dynamically hide modules based on the SME's plan.
- **Database connection via pooler** — direct DNS (`db.<ref>.supabase.co`) fails on some networks (IPv6-only). Use the pooler at `aws-0-eu-west-1.pooler.supabase.com:6543` instead. See conversation context for credentials.
- **pgBouncer transaction mode** — multi-statement SQL blocks can fail. Prefer individual statements or scripts when applying migrations manually.
- **Migrations 14 & 15 must be applied manually via SQL Editor** — they cannot be pushed via `supabase db push` due to the pooler connection issue. Run the SQL from the migration files in the Supabase Dashboard SQL Editor.
- **Materiality page has no stakeholder engagement tab yet** — the `stakeholder_engagement` table exists with RLS, but the UI only has IRO Register, Matrix, and Summary tabs. A future step should add stakeholder engagement logging.
- **Stakeholder engagement table not yet connected to the UI** — `stakeholder_engagement` table has RLS policies (migration 15) but no data entry forms exist.
- **JSONB columns: never `JSON.stringify()` before insert** — when inserting into `JSONB` columns via Supabase JS client, pass JavaScript objects/arrays directly. Using `JSON.stringify()` causes double-encoding (the value becomes a JSON string literal instead of a JSON object). When spread back (`[...str]`), it explodes into characters. If you encounter `TypeError: can't access property "toFixed"` or similar on data from a JSONB column, check for double-encoding in the seed/insert path.
- **`calculation_runs` stores scope rows, not a single row per period** — each row has a `scope_type` (`scope_1`, `scope_2_location`, `scope_2_market`) with `total_emissions` and `total_energy`. To get Scope 1 and Scope 2 totals, you must fetch ALL rows for a `reporting_period_id` and then `.find()` by `scope_type`. Do NOT `.limit(1)` or select non-existent columns like `scope1`/`scope2`/`year`.

### ✅ Resolved Issues

- **RLS infinite recursion on `user_roles`** — fixed in migration 14. The original policy had `SELECT ... FROM public.user_roles` inside the `user_roles` SELECT policy, causing infinite recursion. Replaced with `SECURITY DEFINER` helper functions that bypass RLS.
- **Login redirects to homepage** — fixed login page to redirect to `/dashboard` instead of `/`.
- **Session cookies not synced with proxy middleware** — fixed browser Supabase client to use `createBrowserClient` from `@supabase/ssr` (was using plain `createClient` which only stored sessions in localStorage).
- **Tailwind v4 custom colors not resolving** — fixed by moving `primary` color palette from `tailwind.config.ts` (ignored by v4) into `globals.css` via `@theme` directive.
- **Missing INSERT/UPDATE/DELETE RLS on materiality tables** — fixed in migration 15. The original migration 8 only created SELECT policies, preventing users from adding IROs through the API.
- **Double Materiality Implemented page** — replaced the "Coming soon" Implemented with a full working UI: assessment list, IRO Register CRUD, materiality matrix visualization, and summary with topic-level classification.
- **Emissions page `TypeError: e.emissionsTco2e is undefined`** — seed script was `JSON.stringify()`-ing `breakdown` before inserting into a `JSONB` column, causing double-encoding. When read back and spread (`[...doubleEncodedString]`), it produced an array of characters instead of breakdown items. Fixed by: (1) removing `JSON.stringify()` in the seed script, (2) adding normalization in `displayData` construction that filters out non-object items, (3) adding `typeof` guards before `.toFixed()` calls in the render.

- **Climate page not filtering by year** — Energy & Emissions page queried calculation_runs with non-existent columns (scope1, scope2, year), counted activity records across ALL periods, and contractual instruments weren't scoped to a reporting year. Added year selector + reporting_period_id filtering matching the Activity/Emissions page pattern.
- **Reports page calculation_runs query bug** — queried with .limit(1) which only returned one scope_type row, and referenced non-existent columns (scope1, scope2, totalMWh). Fixed to fetch all rows for the period and aggregate by scope_type.
---
n- **Production readiness audit** — audited against production-code-readiness.md and security.md. Addressed 10 critical/medium items: zod validation on all API routes, npm audit zeroed (0 vulns), rate limiting, security headers (CSP/X-Frame/XSS/Referrer), secured refresh-factors endpoint with admin key, error boundary pages, health check endpoint, 14 unit tests on calculations.ts, structured logger replacing console.*, crash handlers (instrumentation.ts), and IroForm component extraction from 965-line materiality page.

## 12. Naming Conventions

| Scope | Convention | Example |
|-------|-----------|---------|
| Files (components) | `PascalCase.tsx` | `DashboardNav.tsx` |
| Files (pages) | `kebab-case/page.tsx` | `forgot-password/page.tsx` |
| Database tables | `snake_case` | `activity_records`, `workforce_headcount` |
| Database enums | `snake_case` | `scope_type`, `esg_pillar` |
| API routes | `kebab-case` | `/activity-records`, `/materiality/iro` |
| TypeScript types | `PascalCase` | `WorkforceHeadcount`, `MaterialityIRO` |
| Functions | `camelCase` | `calculateEmissions`, `computeGenderPayGap` |
| Feature flags | `snake_case` | `climate_enabled`, `workforce_enabled` |
| ESRS references | `E1-6`, `S1-9`, `G1-4` | Used in table comments and metadata |
| CSS | Tailwind utility classes | Custom CSS only in `globals.css` for base resets |