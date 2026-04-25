# CarbonTrackAI — Agent Guide

> **Purpose**: This document gives AI agents (and human developers) a complete map of the CarbonTrackAI repository — a unified ESG reporting platform for EU SMEs (< 250 employees) with SME-proportionate workflows (VSME-Lite, VSME-Full, CSRD-Full). Navigate, edit, and reason about the codebase without guesswork.

---

## 1. Project Overview

| Attribute | Value |
|-----------|-------|
| **Name** | CarbonTrackAI |
| **Description** | ESG reporting for EU SMEs (< 250 employees) — VSME-first with CSRD/ESRS alignment for listed SMEs. Three proportionate modes: VSME-Lite, VSME-Full, CSRD-Full. |
| **Repository** | `https://github.com/GreenAI-Analytics/carbontrackai` |
| **Stack** | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 (frontend), Supabase PostgreSQL (backend/database) |
| **Package Manager** | npm (workspaces monorepo) |
| **License** | TBD |

### Regulatory Framework

The platform adapts dynamically to SME size and regulatory scope, supporting three regulatory modes based on the SME's characteristics and compliance obligations.

### SME Scoping Logic

| SME Type | Criteria | CSRD Mandatory? | Platform Mode |
|---|---|---|---|
| **Micro** | <10 employees, ≤ €700k turnover | ❌ No | **VSME-Lite** |
| **Small** | <50 employees, ≤ €10M turnover | ❌ No (unless listed) | **VSME-Lite / VSME-Full** |
| **Medium** | <250 employees, ≤ €50M turnover | ❌ No (unless listed) | **VSME-Full / CSRD-Full** |
| **Listed SMEs** | Listed on regulated market | ✅ Yes | **CSRD-Full** |
| **Subsidiaries of large groups** | Required by parent | ⚠ Possibly | **CSRD-Full** |

### Platform Modes

| Mode | Description |
|---|---|
| **VSME-Lite** | Simplified ESG: basic climate, basic workforce, basic governance, simplified materiality. |
| **VSME-Full** | Full voluntary SME standard: all E/S/G topics, simplified taxonomy. |
| **CSRD-Full** | Full ESRS E1–E5, S1–S4, G1, double materiality, EU Taxonomy. |

**Target audience**: EU SMEs (< 250 employees, ≤ €50M turnover, or ≤ €43M balance sheet). The platform is **VSME-first** — most SMEs use VSME-Lite or VSME-Full voluntarily. CSRD-Full mode serves listed SMEs and subsidiaries of large groups. The app auto-detects the SME's mode at onboarding and hides irrelevant complexity.

**Design philosophy**: Simplified for SME reality. No over-engineered assurance workflows — instead, audit-grade change history and evidence attachments. Qualitative/narrative disclosures use simple structured forms, not complex CMS tools. The datapoint taxonomy starts at the module level and becomes granular per-pillar as the platform matures.

**Design principle**: The platform prioritises VSME-Lite and VSME-Full as the primary use cases for the majority of non-listed SMEs. CSRD-Full is served as a secondary mode for listed SMEs and subsidiaries of large groups. Where complexity can be reduced without breaking regulatory usefulness, it is reduced.

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
│   │   ├── dashboard/
│   │   │   ├── activity/
│   │   │   │   └── page.tsx              # Energy/fuel activity data entry (Scope 1 & 2)
│   │   │   ├── emissions/
│   │   │   │   └── page.tsx              # Scope 1 & 2 calculation results + run trigger
│   │   │   ├── esg/                      ← EXPANDED: full ESG data collection
│   │   │   │   ├── narrative/            ← NEW: ESRS 2 narrative disclosures
│   │   │   │   │   ├── governance/       #     ESRS 2 GOV-1 to GOV-3: Board oversight, roles, internal controls
│   │   │   │   │   ├── strategy/         #     ESRS 2 SBM-1 to SBM-3: Business model, value chain, stakeholder mapping
│   │   │   │   │   ├── iro-management/   #     ESRS 2 IRO-1 to IRO-2: Due diligence, risk management
│   │   │   │   │   └── policies/         #     Policy document upload & registry
│   │   │   │   ├── environmental/        #   ESRS E1–E5 data entry + dashboards
│   │   │   │   │   ├── climate/          #     E1: Carbon (existing), transition plan
│   │   │   │   │   ├── pollution/        #     E2: Air/water/soil pollutant inventory
│   │   │   │   │   ├── water/            #     E3: Water consumption, discharge
│   │   │   │   │   ├── biodiversity/     #     E4: Site proximity to sensitive areas
│   │   │   │   │   └── circular/         #     E5: Material flows, waste, recycling
│   │   │   │   ├── social/               #   ESRS S1–S4 data entry + dashboards
│   │   │   │   │   ├── workforce/        #     S1: Headcount, diversity, turnover, H&S, policies, engagement
│   │   │   │   │   ├── valuechain/       #     S2: Supply chain social audits
│   │   │   │   │   ├── communities/      #     S3: Community engagement, impact
│   │   │   │   │   └── consumers/        #     S4: Product safety, customer health
│   │   │   │   └── governance/           #   ESRS G1 data entry + dashboards
│   │   │   │       ├── ethics/           #     Anti-corruption, code of conduct
│   │   │   │       ├── compliance/       #     Regulatory compliance, fines
│   │   │   │       └── dataprivacy/      #     GDPR breaches, data protection
│   ├── esrs2/                    # ESRS 2 General Disclosures (narrative)
│   │   │   ├── governance/           #   Board oversight, management roles, internal controls
│   │   ├── strategy/             #   Business model, value chain, stakeholder mapping
│   │   └── iro-management/       #   Due diligence, risk management integration
│   ├── materiality/              # Double materiality assessment wizard
│   ├── taxonomy/   │                 # EU Taxonomy alignment assessment
│   ├── reports/ │                    # CSRD-ready report generation + exports
│   ├── layout.ts │  x                # Dashboard shell (header + sidebar nav)
│   └── page.tsx   │                  # Dashboard overview (ESG KPI cards, checklist, modules)
│   ├── forgot-password/
│   │   └── page.tsx                  # Password reset request form
│   ├── login/
│   │   └── page.tsx                  # Email + password login
│   ├── onboarding/
│   │   └── page.tsx                  # Multi-step onboarding (org → sector → ESG scope)
│   ├── reset-password/
│   │   └── page.tsx                  # New password creation
│   ├── signup/
│   │   └── page.tsx                  # Registration (name, email, password)
│   ├── favicon.ico
│   ├── globals.css                   # Tailwind import + base styles
│   ├── layout.tsx                    # Root layout (metadata, icons)
│   └── page.tsx                      # Marketing homepage (Hero, ESG Modules, WhyChoose, CTA, Footer)
├── components/
│   ├── CTA.tsx                       # Call-to-action (Start Free ESG Reporting)
│   ├── DashboardNav.tsx              # Sidebar nav (expanded for ESG sections)
│   ├── Footer.tsx                    # Site footer (logo, links, brand attribution)
│   ├── Header.tsx                    # Nav bar (logo, nav links, login/signup CTAs)
│   ├── Hero.tsx                      # Landing hero (ESG messaging)
│   ├── Modules.tsx                   # ESG module overview (E, S, G pillars)
│   ├── SignOutButton.tsx             # Supabase sign-out + redirect
│   └── WhyChoose.tsx                 # Value proposition grid (ESG angles)
├── lib/
│   ├── calculations.ts               # Carbon calculation engine (Scope 1 & 2)
│   ├── esg-scoring.ts                ← NEW: ESG composite scoring & benchmarking
│   ├── materiality.ts                ← NEW: Double materiality assessment logic
│   ├── taxonomy.ts                   ← NEW: EU Taxonomy alignment calculator
│   ├── social-metrics.ts             ← NEW: S1–S4 metric computation
│   ├── governance-metrics.ts         ← NEW: G1 metric computation
│   ├── narrative-disclosures.ts      ← NEW: ESRS 2 narrative disclosure helpers
│   ├── assurance.ts                  ← NEW: Change history & evidence tracking
│   └── supabase-browser.ts           # Supabase client singleton
├── public/
│   └── img/                          # Static images (logos, icons)
├── middleware.ts                     # Route protection
├── proxy.ts                          # Route protection (legacy/Next.js 16)
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

| Module | VSME-Lite | VSME-Full | CSRD-Full |
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
| → Energy & Emissions | `/dashboard/esg/environmental/climate` | ESRS E1 | Partial (Scope 1&2 done) |
| → Pollution | `/dashboard/esg/environmental/pollution` | ESRS E2 | ❌ Not built |
| → Water | `/dashboard/esg/environmental/water` | ESRS E3 | ❌ Not built |
| → Biodiversity | `/dashboard/esg/environmental/biodiversity` | ESRS E4 | ❌ Not built |
| → Circular Economy | `/dashboard/esg/environmental/circular` | ESRS E5 | ❌ Not built |
| | | | |
| **👥 Social** | | | |
| → Workforce | `/dashboard/esg/social/workforce` | ESRS S1 | ❌ Not built |
| → Value Chain | `/dashboard/esg/social/valuechain` | ESRS S2 | ❌ Not built |
| → Communities | `/dashboard/esg/social/communities` | ESRS S3 | ❌ Not built |
| → Consumers | `/dashboard/esg/social/consumers` | ESRS S4 | ❌ Not built |
| | | | |
| **🏛️ Governance** | | | |
| → Business Ethics | `/dashboard/esg/governance/ethics` | ESRS G1 | ❌ Not built |
| → Compliance | `/dashboard/esg/governance/compliance` | ESRS G1 | ❌ Not built |
| → Data Privacy | `/dashboard/esg/governance/dataprivacy` | ESRS G1 + GDPR | ❌ Not built |
| | | | |
| **📋 General Disclosures (ESRS 2)** | | | |
| → Governance & Strategy | `/dashboard/esg/general/governance` | ESRS 2 (GOV, SBM) | ❌ Not built |
| → IRO Management | `/dashboard/esg/general/iro-management` | ESRS 2 (IRO) | ❌ Not built |
| | | | |
| **⚖️ Overarching** | | | |
| → Double Materiality | `/dashboard/materiality` | ESRS 1, IRO-1 | ❌ Not built |
| → EU Taxonomy | `/dashboard/taxonomy` | EU Taxonomy Reg. | ❌ Not built |
| | | | |
| **📄 Reports** | `/dashboard/reports` | All ESRS | ❌ Not built |
| **⚙️ Settings** | `/dashboard/settings` | — | ❌ Not built |

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
apps/api/
├── supabase/
│   ├── migrations/
│   │   ├── 20260411000000_init_schema.sql            # Core ESG tables + RLS
│   │   ├── 20260411000100_auth_and_admin.sql          # Auth, audit, admin
│   │   ├── 20260411000200_extended_modules.sql        # Scope 3, targets, risk, supply chain
│   │   ├── 20260411000300_seed_emission_factors.sql   # EU27 carbon factor seeding
│   │   ├── 20260411000400_fix_signup_rls_policies.sql # Fix INSERT policies
│   │   ├── 20260411000500_esg_social_tables.sql       ← NEW: Social (S1–S4) schema
│   │   ├── 20260411000600_esg_governance_tables.sql   ← NEW: Governance (G1) schema
│   │   ├── 20260411000700_esg_environmental_ext.sql   ← NEW: E2–E5 extended tables
│   │   ├── 20260411000800_double_materiality.sql      ← NEW: Materiality assessment schema
│   │   ├── 20260411000900_eu_taxonomy.sql             ← NEW: EU Taxonomy alignment schema
│   │   ├── 20260411001000_esrs2_general_disclosures.sql  ← NEW: ESRS 2 narrative tables
│   │   ├── 20260411001100_esrs_datapoint_taxonomy.sql    ← NEW: Datapoint reference
│   │   └── 20260411001200_assurance_change_tracking.sql  ← NEW: Change history & evidence
│   ├── .temp/                                         # Supabase local runtime
│   └── config.toml
├── .gitignore
├── BACKEND_SETUP.md
├── README.md
├── package.json
└── supabase.json
```

### 3.3 Database Schema — Core ESG Tables (Migration 1)

| Table | ESRS | Purpose | Key Columns |
|---|---|---|---|
| `organizations` | — | SME accounts | `id`, `name`, `country_code`, `sector`, `base_year`, `employee_count`, `revenue_eur`, `lei_code`, `platform_mode` (vsme_lite/vsme_full/csrd_full) |
| `user_roles` | — | User-org mapping | `user_id`, `organization_id`, `role`, `is_primary` |
| `reporting_periods` | ESRS 1 | Annual reporting windows | `organization_id`, `year`, `start_date`, `end_date`, `is_locked` |
| `activity_records` | E1 | Energy/fuel usage | `organization_id`, `reporting_period_id`, `activity_type`, `quantity`, `unit`, `month`, soft-delete |
| `factor_sources` | E1 | Factor provider registry | `name`, `provider`, `url`, `is_active` |
| `emission_factors` | E1 | CO₂ conversion rates | `source_id`, `activity_type`, `unit`, `region`, `value`, `version`, `effective_date` |
| `calculation_runs` | E1 | Computed carbon results | `organization_id`, `reporting_period_id`, `scope_type`, `total_emissions`, `total_energy`, `breakdown`, `factor_versions` |
| `report_snapshots` | All | Finalised ESG reports | `organization_id`, `reporting_period_id`, per-ESRS JSONB sections, `finalized_at` |
| `import_jobs` | — | Import tracking | Status, file, rows processed |
| `export_jobs` | — | Export tracking | Format, file path, status |
| `feature_flag_subscriptions` | — | ESG module gating | `plan_type` (vsme_lite/vsme_full/csrd_full), per-module boolean flags, `expires_at` |


| Table | ESRS | Purpose | Key Columns |
|---|---|---|---|


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

### 3.6 NEW: Social Schema (Migration 5 — ESRS S1–S4)

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

### 3.7 NEW: Governance Schema (Migration 6 — ESRS G1)

| Table | Purpose | Key Columns |
|---|---|---|
| `board_composition` | G1-1 | Board size, independence, gender diversity, tenure |
| `ethics_training` | G1-1, G1-3 | Anti-corruption training, % employees covered, frequency |
| `compliance_incidents` | G1-4 | Regulatory fines, non-monetary sanctions, legal actions |
| `data_breaches` | G1-5 (GDPR) | Breach type, records affected, notified authority, fines |
| `whistleblower_cases` | G1-1 | Reports received, investigated, substantiated, remediation |
| `supplier_conduct_assessments` | G1-2, S2 | Supplier code violations, audits, corrective actions |
| `political_contributions` | G1-5 | Amount, recipient, country, approval |

### 3.8 NEW: Environmental Extended Schema (Migration 7 — ESRS E2–E5)

| Table | ESRS | Purpose | Key Columns |
|---|---|---|---|
| `pollutant_inventories` | E2 | Air/water/soil pollutants | Pollutant type, media (air/water/soil), quantity, unit, threshold |
| `water_consumption` | E3 | Water usage | Source (municipal/ground/surface), volume, recycled %, stress area flag |
| `water_discharge` | E3 | Wastewater | Volume, treatment level, receiving water body |
| `biodiversity_sites` | E4 | Site proximity to sensitive areas | Site location, proximity to protected area, biodiversity action plan |
| `material_flows` | E5 | Resource use | Material type, input mass, recycled content %, renewable % |
| `waste_generation` | E5 | Waste by type and disposal | Waste code (EWC), hazardous flag, disposal method (R/D code), tonnage |

### 3.9 NEW: Double Materiality Schema (Migration 8)

| Table | Purpose | Key Columns |
|---|---|---|
| `materiality_assessments` | Assessment round per period | `organization_id`, `reporting_period_id`, `methodology`, `status` |
| `materiality_iro` | Impact, Risk, Opportunity register | `assessment_id`, IRO type (impact/risk/opportunity), topic, subtopic, severity scale, likelihood scale, financial materiality score, impact materiality score, double materiality score, stakeholder input |
| `stakeholder_engagement` | Stakeholder input records | Stakeholder group, engagement method, date, key findings, datapoint references |

### 3.10 NEW: EU Taxonomy Schema (Migration 9)

| Table | Purpose | Key Columns |
|---|---|---|
| `taxonomy_assessments` | Alignment per period | `organization_id`, `reporting_period_id`, `status` |
| `taxonomy_activities` | Economic activities assessed | NACE code, activity description, substantial contribution criteria met, DNSH criteria met, minimum safeguards, turnover %, CapEx %, OpEx % |
| `taxonomy_eligibility` | Eligibility screening | Activity, eligible Y/N, aligned Y/N, rationale |

### 3.11 NEW: ESRS 2 General Disclosures (Migration 10)

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

### 3.12 NEW: ESRS Datapoint Taxonomy Reference (Migration 11)

A lookup table that maps every ESRS datapoint to its data type, unit, mandatory mode, and availability. Only the datapoints relevant to SMEs are pre-seeded — filters out complexity irrelevant to <250 employee companies.

| Table | Purpose | Key Columns |
|---|---|---|
| `esrs_datapoints` | Central datapoint reference | `datapoint_id` (e.g. "E1-6_01"), `esrs_standard`, `paragraph_ref`, `topic`, `data_type` (numeric/boolean/narrative), `unit`, `mandatory_for` (vsme_lite/vsme_full/csrd_full), `is_active`, `version` |

### 3.13 NEW: Assurance & Change Tracking (Migration 12)

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
| **E** | Climate — Energy & Emissions | E1-1 to E1-9 | **All SMEs** — required even in VSME-Lite | Free (Basic) |
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
| **Cross** | EU Taxonomy | EU Tax. Reg. | Listed SMEs — optional for VSME-Full, hidden for VSME-Lite | €99/mo |
| **Cross** | Report Builder | ESRS 1–G1 | **All SMEs** — scope adapts to mode | Free (Basic) |

### 4.2 Feature Flag Mapping

Each module is gated by a boolean flag in `feature_flag_subscriptions`:

```typescript
type EsgFeatureFlags = {
  plan_type: 'vsme_lite' | 'vsme_full' | 'csrd_full';
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

- **Basic plan** → **VSME-Lite**: Climate (E1, basic) + Workforce (S1, basic) + Governance (G1, basic) + Simplified Materiality + Report Builder → free
- **Comprehensive plan** → **VSME-Full** or **CSRD-Full**: All E (E1–E5) + All S (S1–S4) + All G (G1) + EU Taxonomy (CSRD-Full only) → €99/mo with 30-day trial
- **Mode auto-detection**: Onboarding detects SME type (micro, small, medium, listed, subsidiary) and compliance drivers to assign the correct mode and provision feature flags accordingly

---

## 5. Current Implementation Status

### ✅ Implemented (Applicable to All Modes)

- Monorepo workspace setup with `apps/web` and `apps/api`
- Frontend build + lint pass
- Auth flow: signup → email confirmation → onboarding → dashboard
- Route protection via middleware
- Dashboard overview with KPI cards (carbon-focused — needs ESG expansion)
- Activity data entry (energy/fuel — covers E1 Scope 1&2 basics)
- Carbon calculation engine (Scope 1 + Scope 2 location-based — ESRS E1-6)
- Calculation results page with breakdown
- Emissions page saves `calculation_runs` to Supabase
- Database schema for carbon (E1 core) with RLS
- Pre-seeded EU27 emission factors
- Branding throughout (CarbonTrackAI logos)
- Onboarding flow creates org + roles + feature flags
- Extended modules schema (Scope 3, targets, risk, supply chain) — re-mappable to ESRS

### 🟡 Partial / Needs Adaptation (Blocking VSME-Full & CSRD-Full)

- **VSME focus → ESRS focus**: The original 5 VSME modules need re-mapping to ESRS topical standards. Carbon module (E1) maps cleanly; the rest need recategorisation.
- **`lib/calculations.ts`** — carbon-only; needs sibling modules for social, governance, materiality, taxonomy
- **`DashboardNav.tsx`** — lists only carbon-related pages; needs ESG pillar sections
- **`DashboardPage`** — KPI cards only show carbon metrics; needs ESG composite indicator cards
- **Marketing pages** (`Hero`, `Modules`, `WhyChoose`, `CTA`) — carbon-focused messaging; needs ESG language
- **Onboarding** — captures sector and plan; needs ESG scope selection (which pillars/modules)
- **`feature_flag_subscriptions`** — has 5 VSME flags; needs to be extended to ESRS module flags

### ❌ Gaps / Not Yet Implemented (Required for CSRD-Full, Optional for VSME-Full)

- **Social data collection (S1–S4)** — no tables, no forms, no calculations
- **Governance data collection (G1)** — no tables, no forms, no calculations
- **Environmental extended (E2–E5)** — no tables, no forms
- **Double materiality assessment** — no UI, no logic, no database tables
- **EU Taxonomy alignment** — no UI, no logic, no database tables
- **ESG composite scoring / benchmarking** — no `lib/esg-scoring.ts`
- **CSRD report builder** — no report engine (Excel/PDF/XHTML)
- **Scope 2 market-based** — not implemented
- **Factor refresh jobs** — no Climatiq/national API adapters
- **CI pipeline** — no tests
- **Offline draft + sync** — no PWA
- **Admin dashboard** — no factor/audit management UI
- **Shared types package** — no `@carbontrackai/shared` workspace

---

## 6. Key Data Flows

### 6.1 User Onboarding Flow (Updated for SME Modes)

```
/signup → supabase.auth.signUp() → email confirmation
  → /onboarding (Step 1: org details — name, country, sector, size, revenue)
    → /onboarding (Step 2: Compliance Scope Detection)
        - Are you listed on a regulated market?
        - Required by parent company?
        - Customer ESG requests?
        - Voluntary reporting?
    → /onboarding (Step 3: ESG scope — select E/S/G pillars needed)
      → /onboarding (Step 4: plan — Basic vs Comprehensive)
        → Auto-assign mode: VSME-Lite / VSME-Full / CSRD-Full
        → supabase.from("organizations").insert()
        → supabase.from("user_roles").insert()
        → supabase.from("feature_flag_subscriptions").insert()
        → /dashboard
```

### 6.2 ESRS 2 General Disclosures Flow (Narrative)

**Mode**: Required in all modes — VSME-Lite, VSME-Full, and CSRD-Full.

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

**VSME-Lite / VSME-Full** (simplified):
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

**CSRD-Full** (full ESRS):
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

**Mode gating**: Mandatory for **CSRD-Full**, optional for **VSME-Full**, hidden for **VSME-Lite**.

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

| Variable | Used In | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend (`supabase-browser.ts`) | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend (`supabase-browser.ts`) | Yes |
| `SUPABASE_URL` | Backend (future) | Yes |
| `SUPABASE_ANON_KEY` | Backend (future) | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend admin operations | Production |
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
10. **Simplified for SMEs**: The platform prioritises VSME-Lite and VSME-Full for the majority of non-listed SMEs. CSRD-Full serves a smaller subset (listed SMEs, subsidiaries). Where complexity can be removed without breaking regulatory usefulness, it is removed — no over-engineered assurance, simple narrative forms, progressive datapoint granularity.

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

### Adding a New ESG Module

1. **Database**: Create new migration in `apps/api/supabase/migrations/` with tables + RLS + indexes
2. **Library**: Add computation logic in `apps/web/lib/` (e.g. `social-metrics.ts`)
3. **Pages**: Create route group under `apps/web/app/dashboard/esg/{pillar}/{module}/`
4. **Navigation**: Add link to `DashboardNav.tsx`
5. **Dashboard**: Add KPI card to dashboard overview
6. **Feature flag**: Add boolean to `feature_flag_subscriptions` schema and onboarding flow
7. **Export**: Add ESRS datapoint mapping to report builder

---

## 11. Known Issues & Gotchas

- **RLS on insert was missing initially** — migration `20260411000400` fixed this for `user_roles` and `feature_flag_subscriptions`. Any new ESG table must have INSERT policies or onboarding/data entry will fail.
- **Both `middleware.ts` and `proxy.ts` exist** — identical logic. Consolidate to one to avoid confusion.
- **No shared types package yet** — types in `lib/calculations.ts` are duplicated across components. Create `@carbontrackai/shared` workspace when adding ESG modules.
- **Dashboard nav has dead links** — `/dashboard/reports` and `/dashboard/settings` return 404. These should be implemented for CSRD report generation.
- **Emissions page is 428 lines** — too large. Refactor into smaller components (calculation runner, results table, factor provenance panel).
- **VSME→ESRS remapping needed** — the original 5 VSME modules don't map 1:1 to ESRS topical standards. Use the mapping tables in section 4 to guide refactoring.
- **ESRS 2 narrative UI not yet built** — all ESRS 2 tables exist in schema (Migration 10) but the narrative disclosure pages and forms are not yet implemented.
- **Datapoint taxonomy seeded only at module level** — the `esrs_datapoints` table (Migration 11) exists with high-level module references. Granular datapoint seeding per pillar is needed as modules are built out.
- **Social & governance benchmarks vary by country** — unlike emission factors, social metrics (e.g. average training hours, gender pay gap) need country-specific benchmarks. Plan for a `social_benchmarks` and `governance_benchmarks` table.

---

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