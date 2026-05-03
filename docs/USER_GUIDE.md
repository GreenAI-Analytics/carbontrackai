# CarbonTrackAI — User Guide

> **Version**: 1.0 | **Last updated**: May 2026
>
> CarbonTrackAI is a CSRD/ESRS-compliant ESG reporting platform built for EU SMEs. This guide covers every feature, page, and workflow.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Onboarding & SME Classification](#2-onboarding--sme-classification)
3. [Dashboard Overview](#3-dashboard-overview)
4. [Environmental (E1–E5)](#4-environmental-e1e5)
5. [Social (S1–S4)](#5-social-s1s4)
6. [Governance (G1)](#6-governance-g1)
7. [Double Materiality](#7-double-materiality)
8. [EU Taxonomy](#8-eu-taxonomy)
9. [ESRS 2 General Disclosures](#9-esrs-2-general-disclosures)
10. [Report Builder](#10-report-builder)
11. [Admin Dashboard](#11-admin-dashboard)
12. [Settings](#12-settings)
13. [Whistleblower Channel](#13-whistleblower-channel)
14. [Compliance Framework Reference](#14-compliance-framework-reference)

---

## 1. Getting Started

### Creating an Account

1. Go to `https://carbontrackai-eight.vercel.app/signup`
2. Enter your email and password
3. Check your inbox for a confirmation email (check spam if not received)
4. Click **Confirm email address** in the email
5. You'll be redirected to the onboarding flow

### Logging In

1. Go to `https://carbontrackai-eight.vercel.app/login`
2. Enter your credentials
3. If you forget your password, click **Forgot password?** on the login page

---

## 2. Onboarding & SME Classification

The onboarding flow determines your regulatory mode and provisions the right features.

### Step 1: Organisation Details

| Field | Purpose |
|-------|---------|
| **Organisation name** | Your company name as it will appear in reports |
| **Country** | HQ country — determines emission factor defaults and filing portal |
| **Sector** | NACE macro-category — used for materiality templates |
| **Base year** | First year of emissions reporting |
| **Employees (FTE)** | Full-time equivalent headcount |
| **Annual turnover (EUR)** | SME classification threshold |
| **Balance sheet (EUR)** | Alternative SME classification threshold |

> **SME Classification**: Follows EU Recommendation 2003/361/EC. An enterprise qualifies as an SME if it meets the **headcount** threshold AND at least one financial threshold (**turnover OR balance sheet**).

| Category | Headcount | Turnover | OR Balance Sheet |
|----------|-----------|----------|------------------|
| Micro | < 10 | ≤ €2M | ≤ €2M |
| Small | < 50 | ≤ €10M | ≤ €10M |
| Medium | < 250 | ≤ €50M | ≤ €43M |

### Step 2: Compliance Scope

Three questions determine your regulatory obligations:

- **Listed on an EU-regulated market?** — Under Omnibus I (2025), most listed SMEs now fall outside mandatory CSRD scope
- **Subsidiary of a large group?** — May pull you into mandatory CSRD if your parent reports
- **Receiving ESG data requests from banks/customers/investors?** — A VSME report serves as your "value-chain shield"

Based on your answers, the platform recommends a plan.

### Step 3: Plan Selection

| Plan | Price | Includes |
|------|-------|----------|
| **VSME Basic** | Free | Climate (E1), Basic Workforce (S1), Basic Governance (G1), Simplified Materiality, Report Builder, ESRS 2 Disclosures |
| **VSME Comprehensive** | €99/mo | All Environmental (E1–E5), All Social (S1–S4), All Governance (G1), Simplified EU Taxonomy |
| **CSRD** | €99/mo | All VSME Comprehensive features + Full EU Taxonomy + Expanded ESRS 2 narratives |

> You can upgrade or downgrade at any time from **Settings → Plan**.

---

## 3. Dashboard Overview

The dashboard (`/dashboard`) is your home screen. It shows:

- **Pillar Progress Cards**: Visual completion status for Environmental (5 modules), Social (4), Governance (3), and Cross-Cutting (3)
- **Quick Links**: Direct access to Activity Data, Emissions Results, Double Materiality, and Report Builder
- **Sidebar Navigation**: 7 groups with 22 links covering every ESG module

### Sidebar Structure

| Group | Links |
|-------|-------|
| Overview | Dashboard |
| General Disclosures | Governance & Strategy, IRO Management |
| Environmental | Energy & Emissions, Activity Data, Emissions Results, Pollution, Water, Biodiversity, Circular Economy |
| Social | Own Workforce, Value Chain, Communities, Consumers |
| Governance | Business Ethics, Compliance, Data Privacy |
| Cross-Cutting | Double Materiality, EU Taxonomy, Report Builder |
| Platform | Admin, Settings |

---

## 4. Environmental (E1–E5)

### E1 — Climate (Energy & Emissions)

The climate module covers ESRS E1-1 through E1-9.

**Climate Hub** (`/dashboard/esg/environmental/climate`):
- Live KPI snapshot showing latest Scope 1, Scope 2, and energy totals
- Quick-action cards linking to Activity Data and Emissions Results
- **Contractual Instruments** panel: add Guarantees of Origin (GoOs), Power Purchase Agreements (PPAs), and Renewable Energy Certificates (RECs) for market-based Scope 2 calculation

**Activity Data** (`/dashboard/activity`):
- Enter energy and fuel consumption data
- Supported types: Natural Gas (m³), Heating Oil (L), Electricity (kWh), Petrol (L), Diesel (L)
- Data is stored per reporting period with monthly granularity

**Emissions Results** (`/dashboard/emissions`):
- Select reporting year, click **Calculate**
- View Scope 1, Scope 2 (location-based), and Scope 2 (market-based) breakdowns
- Factor freshness banner shows when emission factors were last updated from Climatiq
- Results are saved as `calculation_runs` for audit trail

**How Market-Based Scope 2 Works**:
1. Add contractual instruments (GoOs, PPAs, RECs) in the Climate Hub
2. Run an emissions calculation — the system computes:
   - **Market-based** = (total MWh − certificated MWh) × residual mix factor + certificated MWh × supplier factor
3. Both location-based and market-based results are displayed

### E2 — Pollution (`/dashboard/esg/environmental/pollution`)

Track air, water, and soil pollutant inventories per ESRS E2-1 through E2-6.

- Add pollutants with type, media (air/water/soil), quantity, unit, and threshold exceeded flag
- KPI cards show total pollutants and threshold exceedances

### E3 — Water (`/dashboard/esg/environmental/water`)

Two tabs: **Consumption** and **Discharge**.

- **Consumption**: By source (municipal, groundwater, surface water, rainwater, recycled), with recycled percentage and water stress area flag
- **Discharge**: Volume, treatment level, and receiving water body

### E4 — Biodiversity (`/dashboard/esg/environmental/biodiversity`)

- List operational sites with proximity to protected areas
- Track biodiversity action plan status per site
- KPIs show sites near protected areas and action plan coverage

### E5 — Circular Economy (`/dashboard/esg/environmental/circular`)

Two tabs: **Material Flows** and **Waste**.

- **Material Flows**: Material types with input tonnage, recycled content %, and renewable %
- **Waste**: By waste code, hazard classification, disposal method (recycling, landfill, incineration, composting, energy recovery), and tonnage

---

## 5. Social (S1–S4)

### S1 — Own Workforce (`/dashboard/esg/social/workforce`)

Covers ESRS S1-1 through S1-17. Four tabs:

**👥 Workforce Profile**:
- Headcount: total, gender, age distribution, contract types, full-time/part-time
- Turnover: hires, leavers, voluntary/involuntary breakdown
- Computed KPIs: turnover rate, gender ratio

**🏥 Health & Safety**:
- Recordable injuries, lost days, fatalities, near misses
- Computed: injury rate per 100 FTE, lost day rate

**📚 Training**:
- Total training hours, female/male breakdown
- Computed: average hours per employee

**💰 Pay & Conditions**:
- Gender pay gap: mean and median percentages
- **Pay Transparency** (Directive 2023/970): quartile distribution by gender (Q1–Q4), pay component breakdown (base/variable/bonus)
- Management diversity: women/men in senior management, employees with disabilities
- Work-life balance: parental leave uptake, flexible work %, average weekly hours

> **k-Anonymity**: Counts below 10 are suppressed in reports to prevent re-identification per GDPR Art. 9.

### S2 — Value Chain (`/dashboard/esg/social/valuechain`)

Human rights due diligence per ESRS S2-1 through S2-5.

- Country-level risk assessments with severity (low/medium/high/critical)
- Remediation actions and status tracking
- KPIs: countries assessed, high-risk count, remediation coverage

### S3 — Communities (`/dashboard/esg/social/communities`)

Community engagement per ESRS S3-1 through S3-5.

- Engagement types with stakeholder counts
- Complaints received and key outcomes
- KPIs: total engagements, stakeholders reached, complaints

### S4 — Consumers (`/dashboard/esg/social/consumers`)

Product safety per ESRS S4-1 through S4-5.

- Incident types with severity levels
- Recall counts and regulatory fines
- KPIs: incidents, recalls, fines total

---

## 6. Governance (G1)

### Business Ethics (`/dashboard/esg/governance/ethics`)

Four tabs covering ESRS G1-1 through G1-6:

**🏛️ Board & Ethics**:
- Board composition: size, independence, gender diversity, average tenure
- Ethics training: topics, employees covered, coverage %, frequency

**⚖️ Compliance**:
- Compliance incidents: type, fines, sanctions, legal actions
- Whistleblower channel: aggregate statistics (reports, investigations, substantiation)

**🔒 Data Privacy**:
- Data breach register: breach type, records affected, DPA notification status, fines

**🔗 Supply Chain**:
- Supplier conduct assessments: violations, audits, corrective actions
- Political contributions: recipients, countries, amounts

### Compliance (`/dashboard/esg/governance/compliance`)

Deeper incident and whistleblower management:

**⚠️ Incidents**: Detailed incident records with descriptions, fines, sanctions, and legal actions
**📢 Whistleblower**: Aggregate stats + individual case register with status tracking, deadlines, and overdue warnings
**📅 Deadlines**: Regulatory filing calendar with status (pending/in progress/filed/overdue)

### Data Privacy (`/dashboard/esg/governance/dataprivacy`)

Three tabs:

**🔓 Breaches**: Register with Art. 33 GDPR 72-hour notification tracker
**📋 GDPR Compliance**: Processing purposes, DPIAs, DPAs, retention policy, cross-border transfers
**📨 Subject Requests**: SAR tracker with received/responded dates and status

---

## 7. Double Materiality

The Double Materiality assessment (`/dashboard/materiality`) is the gateway to ESRS reporting — it determines which topics are material and therefore require disclosure.

### Assessment List

- View all assessments per reporting period
- Create new assessments
- Each assessment shows IRO count and status

### IRO Register (Tab 1)

Add Impacts, Risks, and Opportunities (IROs):

- **Type**: Impact, Risk, or Opportunity
- **Direction**: Actual/Potential Negative, Actual/Potential Positive, Financial Risk/Opportunity
- **Topic**: ESRS topic (E1–E5, S1–S4, G1)
- **ESRS 1 Scoring** (scale × scope × irremediability):
  - Scale: how grave (1–5)
  - Scope: how widespread (1–5)
  - Irremediability: how hard to reverse — negative impacts only (1–5)
- **Time Horizon**: Short (<1y), Medium (1–5y), Long (>5y)
- **Value Chain Location**: Upstream, Own Operations, Downstream, Multiple

### Materiality Matrix (Tab 2)

Visual 2×2 matrix plotting IROs by impact materiality (x-axis) vs financial materiality (y-axis). Quadrants:

- **Top-right (Double)**: Material — disclosure required
- **Top-left (Financial)**: Financially material only
- **Bottom-right (Impact)**: Impact material only
- **Bottom-left**: Not material

### Summary (Tab 3)

- Material topics list
- Highly material topics
- Completion percentage
- Entity-defined threshold with rationale (ESRS 1 §44)

### Methodology

Per ESRS 1 §43:
- **Negative impacts**: Severity = scale × scope × irremediability
- **Positive impacts**: Severity = scale × scope (no irremediability)
- **Financial materiality**: Magnitude × likelihood
- **Double materiality**: max(impact score, financial score)

---

## 8. EU Taxonomy

(`/dashboard/taxonomy`) Assess economic activities against the EU Taxonomy Regulation.

### Assessment Depth (Omnibus I SME-proportionate)

| Depth | What's Assessed | For Whom |
|-------|-----------------|----------|
| **Eligibility only** | Just activity classification | SMEs under Omnibus I |
| **Partial alignment** | Substantial contribution | Medium SMEs |
| **Full alignment** | SC + DNSH + Minimum Safeguards | CSRD-scope entities |

### Adding Activities

1. Click **+ Add activity** or pick from the NACE reference panel (19 common codes)
2. Enter NACE code and description
3. Check: Substantial contribution, DNSH met, Minimum safeguards
4. Enter KPI percentages: Turnover %, CapEx %, OpEx %
5. KPIs auto-compute: eligibility %, alignment %, turnover/CapEx/OpEx aligned %

---

## 9. ESRS 2 General Disclosures

### Governance & Strategy (`/dashboard/esg/general/governance`)

Four tabs:

**📋 Strategy & Business Model** (SBM-1): Narrative description of business model, value chain stages, key sectors, geographies, employee breakdown
**🏛️ Governance Roles** (GOV-1): Board/management ESG oversight roles with responsibilities and meeting frequency
**👥 Stakeholders** (SBM-2): Stakeholder groups, engagement purpose, topics raised, strategy feedback
**📜 Policies** (MDR-P): Policy registry with ESRS references, versions, approval/review dates

### IRO Management (`/dashboard/esg/general/iro-management`)

Three tabs:

**🔍 Due Diligence** (IRO-1): Scope areas, methodology, coverage %, outcomes
**⚠️ Risk Management** (IRO-4): Risk categories, process descriptions, ERM integration, control effectiveness
**📝 Narrative Disclosures**: Supplementary narratives keyed to ESRS datapoint references

---

## 10. Report Builder

(`/dashboard/reports`) Generate CSRD/VSME-compliant ESG reports.

### Building a Report

1. Select a **reporting period** from the dropdown
2. The system auto-aggregates data from all 25+ ESG tables
3. Review the preview organized by pillar
4. Choose export format:

| Format | Description |
|--------|-------------|
| **JSON** | Machine-readable structured data — for API integration |
| **iXBRL** | XHTML with embedded ESRS XBRL tags — for ESEF filing (CSRD-mode users) |

### Snapshots

- Click **Generate Snapshot** to create an immutable record
- Snapshots are stored in the database for audit trail
- Download any snapshot from the **Snapshots** tab
- Country-specific filing information is shown for your HQ country

---

## 11. Admin Dashboard

(`/dashboard/admin`) Available to users with the **admin** role.

**📡 Factors**: List all emission factor sources with provider, last updated timestamp, and active/inactive status. Link to refresh from Settings.

**📋 Audit Log**: Last 50 changes across all ESG tables showing date, table, field, old value → new value.

**📊 Stats**: Organisation count, user count, reporting period count, plus system summary.

---

## 12. Settings

(`/dashboard/settings`) Four tabs:

**🏢 Profile**: Edit organisation name, country, sector, base year, SME classification fields (headcount, turnover, balance sheet), GHG consolidation approach. Read-only display of derived SME category and reporting basis.

**💳 Plan**: View current plan, upgrade/downgrade between VSME Basic, VSME Comprehensive, and CSRD. Module access grid shows all 14 feature flags with enabled/locked status.

**🌍 Countries**: Per-country regulatory overlays for your countries of operation — filing portals, emission factor authorities, labour law extensions, CSRD transposition laws, and language requirements.

**👥 Team**: List of organisation members with roles (admin/user) and primary indicator.

**⚠️ Danger Zone**: Delete organisation — type DELETE to confirm. Cascading delete of all ESG data.

### Refreshing Emission Factors

In the Profile tab, click **🔄 Refresh from Climatiq** to pull the latest country-specific emission factors from the Climatiq API. Requires `CLIMATIQ_API_KEY` in environment variables.

---

## 13. Whistleblower Channel

(`/whistleblower`) Public anonymous reporting form — no login required.

### Submitting a Report

1. Enter organisation name (optional — helps route the report)
2. Select type of concern (fraud, corruption, environmental, H&S, discrimination, data protection, etc.)
3. Describe the issue (minimum 20 characters)
4. Optionally provide contact for follow-up
5. Click **Submit Report Anonymously**

### After Submission

- You receive a **case reference code** (e.g., `WB-2026-001`)
- Save this code — you'll need it to check status or provide additional info
- The report is acknowledged within 7 days
- You receive feedback within 3 months
- Retaliation is strictly prohibited under Directive 2019/1937

### For Administrators

- Individual cases appear in the Compliance page under the Whistleblower tab
- Cases show status (pending → acknowledged → investigating → substantiated/dismissed → resolved)
- Overdue warnings for missed 7-day acknowledgement and 3-month feedback deadlines
- Only admins and whistleblower officers can access case details

---

## 14. Compliance Framework Reference

| Framework | Coverage | App Features |
|-----------|----------|--------------|
| **CSRD / ESRS** | E1–E5, S1–S4, G1, ESRS 1 & 2 | All 13 ESRS modules, double materiality, report builder |
| **VSME (EFRAG)** | Basic (B1–B11) + Comprehensive (C1–C9) | VSME Basic / VSME Comprehensive / CSRD plan tiers |
| **EU Taxonomy** | Climate Delegated Act + Environmental Objectives | NACE screening, SC, DNSH, minimum safeguards, KPI calculation |
| **GDPR** | Art. 6, 9, 28, 30, 33, 35, 44–49 | k-anonymity, data residency, breach register, DPA tracking, SAR tracker |
| **Directive 2019/1937** | Whistleblower protection | Anonymous channel, 7-day ack, 3-month feedback, anti-retaliation, restricted access |
| **Directive 2023/970** | Pay transparency | Quartile distribution, pay component breakdown, job categories, joint assessment trigger |
| **Green Claims Dir. (2024/825)** | Environmental claims substantiation | Live greenwashing detection on narrative fields |
| **ESEF / iXBRL** | Digital tagging for CSRD filers | iXBRL export with ESRS XBRL taxonomy tags |
| **Omnibus I (2025)** | SME simplification | SME-proportionate taxonomy depth, listed SME scope adjustment |

---

## Appendix: Keyboard Shortcuts & Tips

- **Save**: Every data entry form has a **Save all changes** button — data is persisted to Supabase
- **Auto-save**: No auto-save — click Save to persist
- **Reporting periods**: Created automatically when you first visit a module for a given year
- **Navigation**: Use the sidebar or breadcrumb links (← Back to Overview) at the top of every page
- **Demo data**: Run `npm run seed:demo-data && npm run seed:demo-esg` to populate the demo account with sample data

---

*CarbonTrackAI — Built for European SMEs. CSRD/ESRS compliant. VSME-first.*
