# CarbonTrackAI — Compliance-Driven Design Changes

> **Author perspective**: EU ESG/CSRD compliance specialist
> **Audience**: Product, engineering, legal/compliance reviewers
> **Scope**: Necessary design changes to align CarbonTrackAI with the regulatory reality faced by EU SMEs in 2025–2027.
>
> This document complements `agents.md` (architecture/state) by listing **what is missing or incorrect from a compliance standpoint** and **how to fix it**. Items are tagged **P0 (blocker)**, **P1 (high)**, **P2 (medium)**, **P3 (nice-to-have)**.

---

## 0a. EU SME Definition — Foundational Correction

**Problem**: `agents.md` line 22–32 (SME Scoping Logic) uses an incorrect micro-enterprise threshold and omits the balance-sheet criterion entirely. This is a foundational error that ripples into onboarding mode-detection and marketing claims.

### Official EU SME Definition (Recommendation 2003/361/EC)

An enterprise qualifies as an **SME** if it meets the **staff headcount** threshold **AND** at least **one** of the two financial thresholds (turnover **OR** balance sheet):

| Category | Staff headcount | Turnover (annual) | OR Balance sheet total |
|----------|-----------------|-------------------|------------------------|
| **Micro** | < 10 | ≤ €2 million | ≤ €2 million |
| **Small** | < 50 | ≤ €10 million | ≤ €10 million |
| **Medium** | < 250 | ≤ €50 million | ≤ €43 million |

> **Source**: Commission Recommendation 2003/361/EC (OJ L 124, 20.5.2003, p. 36), Annex Art. 2. This is the definition used for EU SME policy, CSRD scope, and state aid. The Accounting Directive (2013/34/EU) uses different thresholds for *financial reporting* purposes and should not be used for SME classification in this context.

### What `agents.md` currently says (incorrect)

| SME Type | agents.md Criteria |
|----------|-------------------|
| Micro | <10 employees, ≤ **€700k** turnover |
| Small | <50 employees, ≤ €10M turnover |
| Medium | <250 employees, ≤ €50M turnover |

### Errors identified

| # | Error | Detail |
|---|-------|--------|
| 1 | **Micro turnover wrong** | ≤ €700k is the Accounting Directive micro-undertaking threshold (Dir. 2013/34/EU Art. 3(2)), **not** the SME Recommendation. Correct value is ≤ **€2M**. This understates the micro-enterprise population by a factor of ~3. |
| 2 | **Balance sheet missing** | The SME definition uses turnover **OR** balance sheet as alternative criteria. An enterprise with €45M turnover and €20M balance sheet is a medium SME (meets balance sheet criterion). An enterprise with €5M turnover and €12M balance sheet could be ineligible as an SME (exceeds balance sheet). Agents.md ignores this entire dimension. |
| 3 | **"AND" logic incompletely stated** | The document implies only turnover matters. The correct logic is: headcount AND (turnover OR balance sheet). This affects onboarding flow questions — the app currently only asks for turnover/revenue. |

### Required changes

- **[P0]** Fix the SME Scoping Logic table in `agents.md` §1: use correct micro threshold (≤ €2M turnover **or** ≤ €2M balance sheet), add balance-sheet column to all rows.
- **[P0]** Add a balance-sheet question to the onboarding flow (Step 1, alongside revenue).
- **[P0]** Implement the two-out-of-three logic: headcount AND (turnover OR balance sheet) rather than headcount AND turnover only.
- **[P1]** Document the distinction between the SME Recommendation (general SME classification) and Accounting Directive thresholds (simplified accounts) in `agents.md` so developers understand why €2M not €700k.
- Cross-check README FAQ (line ~"< 250 employees, ≤ €50M turnover, or ≤ €43M balance sheet") — this is **correct** for medium enterprises but needs the micro and small balance-sheet thresholds added too.

---

## 0. Regulatory Context (as of late 2025)

The compliance landscape changed materially in 2025 and the codebase does not yet reflect it:

1. **Omnibus I “Simplification” package (proposed Feb 2025, partly adopted)**
   - **Stop-the-clock directive (adopted)**: postpones CSRD application for Wave 2 (large non-listed) and Wave 3 (listed SMEs) by 2 years.
   - **Substantive proposal (in negotiation)**: raises CSRD scope threshold to **>1,000 employees + €50M turnover or €25M balance sheet**. If adopted as proposed, **the vast majority of listed SMEs will fall *out* of mandatory CSRD** and into the voluntary VSME regime.
   - **VSME “shield”**: large companies and banks are restricted from asking SMEs in their value chain for ESG data **beyond the VSME standard**. This makes the VSME report a *defensive instrument* SMEs use to push back on disproportionate questionnaires.
   - **EU Taxonomy**: opt-in only for companies <1,000 employees; simplified KPIs; partial alignment now permitted.

2. **VSME Standard (EFRAG, published Dec 2024 — final)**
   - **Two modules**, not three: a **Basic Module (B1–B11)** and an optional **Comprehensive Module (C1–C9)**.
   - The codebase’s `vsme_lite / vsme_full / csrd_full` enum **does not match the official VSME structure**.

3. **Pay Transparency Directive (EU 2023/970)** — applies from **7 June 2026**; gender-pay-gap reporting becomes mandatory at >100 employees with strict structure (job-category equal-value comparison, joint pay assessment if >5% unexplained gap).

4. **Whistleblower Directive (EU 2019/1937)** — already applies to all entities ≥50 employees with strict procedural requirements (7-day acknowledgement, 3-month feedback, confidentiality).

5. **CSDDD (EU 2024/1760)** — first-wave application postponed to 2028 under Omnibus; SMEs are *indirectly* affected via tier-1 supplier requests.

6. **GDPR** — unchanged but extremely relevant for ESRS S1 datapoints (gender, disability, nationality, training, pay).

7. **ESEF / iXBRL digital tagging** — required for in-scope companies under CSRD; tagging follows the ESRS XBRL taxonomy published by EFRAG.

The platform must be re-anchored against **VSME as the primary product** with CSRD as a secondary, optional layer for the small set of SMEs still in scope.

---

## 1. Critical (P0) — Must Fix Before Production Use

### 1.1 Align with the official VSME module structure

**Problem**: The `plan_type` enum (`vsme_lite | vsme_full | csrd_full`) and the “VSME-Lite / VSME-Full” terminology do **not** map to the published EFRAG VSME standard, which has only two modules:

| Official VSME | Datapoints | Audience |
|---|---|---|
| **Basic Module** | B1–B11 | All voluntary SME reporters; minimum content |
| **Comprehensive Module** | C1–C9 (additive to Basic) | SMEs with bank/customer requests, listed SMEs |

**Required changes**
- Rename modes to **`vsme_basic` / `vsme_comprehensive` / `csrd`** (DB enum, feature flags, UI copy, marketing pages).
- Restructure the datapoint taxonomy (`esrs_datapoints`) so each row is tagged with `vsme_module ∈ {basic, comprehensive, csrd_only}`. Today the table only stores `mandatory_for` against the legacy enum.
- Update onboarding mode auto-detection: default everyone to **Basic**, allow upgrade to Comprehensive when a counterparty (bank/customer/parent) has requested data, force CSRD only when the SME is in legal scope.
- Reflect the 2025 Omnibus reality on the marketing page: most SMEs (including most previously-in-scope listed SMEs) are now **voluntary VSME**, not mandatory CSRD.

**Schema impact**
- New migration: rename enum, backfill data, add `esrs_datapoints.vsme_module`, add `organizations.reporting_basis ∈ {voluntary, mandatory_csrd, mandatory_other}`.

---

### 1.2 Implement the VSME “value-chain shield” workflow

**Problem**: The single most valuable feature for an EU SME in 2025 is the ability to **respond to ESG questionnaires from banks, insurers, and large customers using one VSME report**. The platform has none of this.

**Required changes**
- New entity: `data_requests` — tracks incoming ESG/sustainability requests (counterparty name, type bank/customer/investor/parent, requested datapoints, deadline, status).
- New entity: `data_request_shares` — recipient-scoped, time-limited, watermarked share links of VSME reports (PDF + machine-readable JSON) to specific counterparties; full audit log of who accessed what.
- “Out-of-scope” response template: when a counterparty asks for data **beyond VSME**, generate a polite VSME-shield response citing the Omnibus restriction.
- Inbound mapping helper: paste a counterparty questionnaire (CSV / EcoVadis / CDP / SBTi-style) → system maps fields to existing VSME datapoints and flags out-of-scope items.

**Why it matters**: this is the platform’s commercial wedge. Without it, CarbonTrackAI is just another reporting tool; with it, it becomes the SME’s defensive layer.

---

### 1.3 GDPR & personal-data minimisation in S1 (Own Workforce)

**Problem**: Tables `workforce_headcount`, `workforce_diversity`, `workforce_disability`, `gender_pay_gap`, `discrimination_incidents`, `health_safety_incidents`, `whistleblower_cases` collect **special category personal data** (Art. 9 GDPR: health, ethnic origin, trade-union membership). The current schema has **no aggregation guarantees, no lawful-basis documentation, no data-residency enforcement, no DPIA artefacts, and no retention rules**.

**Required changes**
- **Aggregation-only constraint**: enforce in DB (CHECK constraints + RLS) that S1/G1 tables hold only aggregates (no `employee_id`, no free-text identifiers). Today nothing prevents an admin from typing names into descriptions.
- **k-anonymity floor**: when group size <10 (e.g. “employees with disability in office X”), suppress the count and replace with “<10” in the report builder.
- **Data residency**: pin Supabase region to **EU (eu-central-1 / eu-west-1)**. Document this in `agents.md`. Today the region is not stated.
- **DPA template**: ship a customer-facing Data Processing Agreement (Art. 28 GDPR) and a controller-side DPIA template for S1 processing.
- **Lawful basis register**: new table `processing_purposes` per organisation, stored alongside policy_documents.
- **Right-to-erasure handling**: explicit policy for ex-employee aggregate data — aggregates remain (lawful for statistical reporting under Art. 89), but any free-text traces must be redacted.
- **Whistleblower confidentiality**: `whistleblower_cases` requires a **separate, restricted role** (`whistleblower_officer`) with RLS denying even org admins. Today any `admin` can read all cases — this is a **legal breach** of Directive 2019/1937 Art. 16.

**Schema impact**
- New `app_role` enum value: `whistleblower_officer`.
- New table: `processing_purposes (organization_id, purpose, lawful_basis, data_categories, retention_period, dpia_url)`.
- Add `is_aggregate_only BOOLEAN` flag and CHECK constraint to all S1 tables.
- Migration to revoke admin SELECT on `whistleblower_cases` and `discrimination_incidents`.

---

### 1.4 Double-materiality methodology compliance

**Problem**: `lib/materiality.ts` uses `√(severity × likelihood)` and `√(magnitude × likelihood)` with hard-coded thresholds (2.5 / 4.0). This is **not ESRS-compliant**:

- ESRS 1 §43 requires negative-impact severity to be assessed as `scale × scope × irremediability` — three components, not one.
- ESRS 1 §47 requires positive-impact severity to be assessed as `scale × scope` (no irremediability).
- Financial materiality requires both **magnitude × likelihood** and a qualitative description.
- The materiality **threshold is set by the entity** and must be **disclosed with rationale** (ESRS 1 §44). Hard-coding 2.5/4.0 is non-compliant.
- Each IRO must be tagged with **time horizon (short <1y / medium 1–5y / long >5y)** and **value-chain location (upstream / own operations / downstream)** — both required by ESRS 2 IRO-1 and SBM-3.

**Required changes**
- Replace single `severity` and `likelihood` columns in `materiality_iro` with explicit `scale_score`, `scope_score`, `irremediability_score`, `likelihood_score`, `magnitude_score`, `financial_likelihood_score`, plus narrative fields `severity_rationale`, `financial_rationale`.
- Add `time_horizon ENUM('short','medium','long')`, `value_chain_location ENUM('upstream','own','downstream','multiple')`, `affected_stakeholders TEXT[]`.
- Per-assessment `materiality_threshold NUMERIC` with required `threshold_rationale TEXT`.
- Distinguish negative vs positive impacts in scoring (irremediability irrelevant for positive).
- Connect material IROs to the ESRS 2 SBM-3 disclosure: each material topic must have a narrative on current/anticipated financial effects, time horizon, and resilience.
- Mandatory **stakeholder engagement evidence**: at least one `stakeholder_engagement` row per material topic, otherwise the assessment cannot be finalised.

---

### 1.5 GHG accounting boundary & Scope 2 dual reporting

**Problem**: ESRS E1-6 and the GHG Protocol require:
- Disclosure of **consolidation approach** (operational control / financial control / equity share).
- **Dual Scope 2 reporting**: location-based **and** market-based.
- Separate disclosure of **biogenic CO₂**.
- Tracking of **contractual instruments** (Guarantees of Origin, PPAs, RECs) for market-based Scope 2.

The current schema captures none of these.

**Required changes**
- `organizations.consolidation_approach ENUM('operational_control','financial_control','equity_share')` + `equity_share_percent` where applicable.
- `calculation_runs.scope_type` to include `scope_2_market_based` (presently only `scope_2_location_based`).
- New table `contractual_instruments` (type, MWh covered, certificate ID, country, vintage year, supplier, evidence_url).
- New column `biogenic_co2_kg` on `calculation_runs` and `activity_records`.
- Update `lib/calculations.ts` to compute market-based Scope 2 = (consumption − certificated MWh) × residual-mix factor + certificated MWh × supplier-specific factor.
- Add residual-mix factors per EU Member State to `emission_factors` (AIB European Residual Mix dataset).

---

### 1.6 Pay Transparency Directive (effective June 2026)

**Problem**: `gender_pay_gap` table has only `mean_gap_pct`, `median_gap_pct`, `by_job_level`. Directive 2023/970 Art. 9–10 requires substantially more.

**Required changes**
- Per-`job_category_of_equal_value` rows (categories defined by the employer using gender-neutral criteria).
- Quartile distribution by gender (Art. 9(1)(g)).
- Pay components breakdown: base, variable, complementary/bonus.
- Trigger field: `joint_pay_assessment_required BOOLEAN` (true when unexplained gap >5% in any category and not corrected within 6 months).
- New child table `joint_pay_assessment` (Art. 10): findings, root-cause analysis, remediation plan, worker-rep involvement.
- Reporting cadence configuration (every 3 years for 100–149 employees, annual for ≥150).

---

### 1.7 Whistleblower channel compliance (Directive 2019/1937)

**Problem**: `whistleblower_cases` records cases but the workflow doesn’t enforce procedural obligations and there is **no actual reporting channel** in the product (the table assumes channels exist elsewhere).

**Required changes**
- Build an in-product **anonymous reporting channel** (web form + optional email/phone capture, end-to-end encrypted attachments).
- Auto-assigned **case timer**: 7-day acknowledgement, 3-month feedback deadlines visible to the whistleblower-officer role.
- Strict access control (see §1.3).
- Data retention rule: retain only as long as proceedings + statute of limitations; auto-purge thereafter.
- Anti-retaliation policy upload requirement (link to `policy_documents`).
- Available in **all official languages of the Member States the SME operates in** (see §3.4).

---

## 2. High Priority (P1)

### 2.1 Datapoint taxonomy must be granular, versioned, and tagged for XBRL

**Problem**: `esrs_datapoints` only has 27 rows seeded at module level. The official ESRS Set 1 has ~1,144 datapoints; VSME has ~70 across B1–B11 + C1–C9. Without per-datapoint metadata the report builder cannot:
- Drive per-datapoint completeness checks.
- Apply phase-in reliefs (ESRS 1 Appendix C: certain datapoints deferred 1–3 years).
- Generate iXBRL tags (ESEF).
- Honour conditional disclosure (“if material”) logic.

**Required changes**
- Seed the **full VSME catalogue** (B1–B11, C1–C9) with: `datapoint_id`, `module`, `data_type`, `unit`, `is_conditional`, `condition_expression`, `phase_in_year`, `xbrl_tag`, `xbrl_taxonomy_version`.
- Seed CSRD-only datapoints behind `csrd` mode flag.
- Version the taxonomy (`taxonomy_version_id`); locked report snapshots reference the version they were built against.
- Add `datapoint_values` table that connects every quantitative cell in any module table to a `datapoint_id`, enabling a generic completeness query and iXBRL tagging.

---

### 2.2 Connectivity & restatement of prior-year figures

**Problem**:
- ESRS 1 §117–129 requires connectivity between sustainability and financial information (e.g. CapEx aligned with EU Taxonomy must reconcile to the financial statements).
- ESRS 1 §86–93 requires disclosure of **restatements** when prior-year figures change.

**Required changes**
- New table `financial_connectors` linking ESRS metrics to financial-statement line items (e.g. revenue, CapEx, OpEx, total assets) with a free-text reconciliation note.
- `reporting_periods.is_locked` must trigger a restatement workflow when edits are attempted: a `restatements` table records the old value, new value, ESRS-compliant reason (error correction / methodology change / scope change), and disclosure narrative.
- Report builder must include an automatic “Restatement of prior period” section.

---

### 2.3 Phase-in reliefs (ESRS 1 Appendix C)

**Problem**: First-time CSRD reporters can defer certain datapoints (anticipated financial effects, value-chain Scope 3 categories, several S1 datapoints) for 1–3 years. The platform has no concept of phase-in.

**Required changes**
- `organizations.first_reporting_year`.
- Per-datapoint `phase_in_year_offset` in `esrs_datapoints`.
- The report builder skips phase-in datapoints in years 1–N and **automatically inserts the standardised phase-in disclosure note** (ESRS 1 §132–134).

---

### 2.4 Audit trail upgrades for limited assurance

**Problem**: CSRD requires limited assurance from year 1 (where it applies) and reasonable assurance later. The current `change_history` + `evidence_attachments` + `review_approval_log` are a starting point but lack:
- A **separate, read-only auditor role** (`external_auditor`) with full visibility but no edit rights.
- **Methodology versioning** per metric (which calculation engine version produced this number?).
- **Factor provenance pinning**: every `calculation_runs` row should pin specific `emission_factors.id` (not just a `factor_versions` JSON snapshot).
- **Sign-off chain**: preparer → reviewer → approver → board approval; today `review_status` is a single field.
- **Independence statement** capture for the auditor.

**Required changes**
- Add `external_auditor` to `app_role`; RLS grants read on all org tables and append-only on `audit_findings`.
- Add `methodology_version` and `engine_commit_sha` to `calculation_runs`.
- Add `emission_factor_ids INTEGER[]` to `calculation_runs` (FK array).
- Replace single-field review status with a chain: `submissions(record_ref, preparer_id, submitted_at)`, `reviews(submission_id, reviewer_id, decision, comment)`, `approvals(...)`.

---

### 2.5 ESEF / iXBRL preview for CSRD-mode users

**Problem**: Listed SMEs that remain in CSRD scope must publish their management report in **iXBRL** tagged with the ESRS XBRL taxonomy (EFRAG). The platform lists this as “future” but it is a hard legal requirement.

**Required changes**
- Map every `datapoint_values` row to its `xbrl_tag`.
- Generate iXBRL using a server-side library (e.g. Arelle invoked as a CLI worker, or `python-xbrl`).
- “XBRL preview” tab in the report builder showing each tagged value before finalisation.
- ESEF zip packaging (XHTML + taxonomy package) export; explicit disclaimer that the preparer remains responsible for the file submitted to the OAM.

---

### 2.6 Country-specific overlays

**Problem**: Member States have transposed CSRD with national specifics (e.g. France’s “DPEF/CSRD” transposition, Germany’s LkSG due-diligence law, Spain’s Ley 11/2018, Italy’s D.Lgs. 125/2024). The platform treats EU as monolithic.

**Required changes**
- `country_overlays` config: per ISO-3166 code, declare:
  - National emission-factor source (already partially done — formalise).
  - Local labour reporting requirements that extend ESRS S1 (e.g. France BDESE).
  - Local language requirements (see §3.4).
  - Local filing portal (e.g. France’s INPI; Germany’s Unternehmensregister).
- Onboarding asks for **all countries of operation**, not just HQ country.

---

### 2.7 Data quality flags on every quantitative datapoint

**Problem**: ESRS 1 §73 requires disclosure of measurement uncertainty and estimation methods. No table currently carries a quality flag.

**Required changes**
- Add `data_quality ENUM('measured','calculated','estimated','proxy','default_factor')` and `uncertainty_pct NUMERIC` to every metric table.
- Report builder must surface a quality summary (% measured / calculated / estimated) per topic.

---

## 3. Medium Priority (P2)

### 3.1 Configurable materiality threshold with rationale

Already covered structurally in §1.4. Make sure the UI **forces** the user to enter a rationale before they can lock the assessment.

### 3.2 Stakeholder engagement UI

`stakeholder_engagement` table exists with RLS but no UI. ESRS 1 §22 requires stakeholder engagement evidence; without a UI the table will stay empty and the materiality assessment will be unsigned-off-able under §1.4.

### 3.3 Targets & transition plan compliance (E1-3, E1-4)

Existing `reduction_targets` / `transition_plan_actions` lack:
- Base year fixing (cannot float).
- Target type: absolute / intensity / net.
- Science-based-target alignment flag (SBTi 1.5°C-aligned, well-below-2°C, none).
- CapEx commitment per action.
- Locked-in emissions estimate (E1-1 §16(g)).

### 3.4 Multilingual reports

ESRS reports must be filed in the **official language(s) of the Member State**. Add:
- i18n on every UI string (all 24 official EU languages — at minimum DE, FR, IT, ES, NL, PL, EN to start).
- Per-narrative-field language selector; allow side-by-side EN + local-language editing for narratives.
- Report exports rendered in the chosen filing language.

### 3.5 EU Taxonomy SME-proportionate flow

Today the schema and flow assume full alignment assessment. Under Omnibus, SMEs can disclose **eligibility only** with a partial-alignment option.

- Add `assessment_depth ENUM('eligibility_only','partial_alignment','full_alignment')` on `taxonomy_assessments`.
- Hide DNSH and minimum-safeguards modules when `eligibility_only`.

### 3.6 Mode change migration path

If an SME upgrades VSME → CSRD mid-cycle (e.g. gets listed, acquired by a large group), historical periods must remain valid in their original mode. Current `feature_flag_subscriptions` does not version with reporting periods.

- New table `period_mode_history (organization_id, reporting_period_id, mode, effective_from)` so each finalised report records the mode it was built under.

### 3.7 Factor refresh jobs & dataset freshness banners

ADEME, MITECO, EEA, AIB residual mix all update annually. The product should:
- Run a scheduled refresh job (Climatiq adapter or direct).
- Surface a “factor dataset vintage” badge on every emissions calculation.
- Auto-flag calculations that used a factor superseded since the run (do not auto-restate; prompt the user).

### 3.8 Greenwashing safeguards in narrative fields

The Green Claims Directive and EmpCo Directive (UCPD amendment) make unsubstantiated environmental claims unlawful. The narrative editor should:
- Detect terms such as “climate-neutral”, “carbon-neutral”, “100% green”, “eco-friendly” and require a substantiation link (evidence attachment) before the field can be saved.
- Surface a warning that offsets do not by themselves justify neutrality claims.

### 3.9 Accessibility (EAA — Directive 2019/882, applies June 2025)

The European Accessibility Act applies to digital services placed on the EU market from 28 June 2025. Run a WCAG 2.1 AA audit on the dashboard and onboarding flows; add it to CI.

---

## 4. Lower Priority but Future-Proofing (P3)

### 4.1 CSDDD readiness (large-customer pull-through)

Even though CSDDD is delayed, large-corporate customers will pass due-diligence asks down to SME suppliers. Provide:
- A `due_diligence_questionnaire_responses` template aligned with OECD Due Diligence Guidance, reusable per customer.
- An export specifically formatted for the most common pull-through frameworks (EcoVadis, Sedex, CDP-Supply-Chain).

### 4.2 Sector-specific ESRS (when adopted)

EFRAG sector standards are paused under Omnibus but will return. Build the datapoint taxonomy with `sector_code` (NACE) so sector standards can be layered without re-architecture.

### 4.3 Assurance-firm marketplace

Lightweight integration where the SME can invite a registered statutory auditor (REVISORI, Wirtschaftsprüfer, Commissaire aux comptes…) into the workspace under the `external_auditor` role.

### 4.4 SME-friendly “green finance” bridge

Banks subject to the **Pillar 3 ESG disclosures (EBA ITS)** will keep asking SMEs for transition data. Provide one-click export to EBA Pillar 3 templates (GAR-relevant subset).

---

## 5. Summary table of required schema changes

| Change | Migration | Tables affected | Priority |
|---|---|---|---|
| **Fix SME definition thresholds (micro ≤ €2M not €700k) + add balance-sheet to onboarding** | update | `organizations`, onboarding flow | **P0** |
| Rename plan_type enum to `vsme_basic / vsme_comprehensive / csrd` | new | `feature_flag_subscriptions`, `organizations` | P0 |
| Add `vsme_module`, `phase_in_year_offset`, `xbrl_tag` to datapoints | new | `esrs_datapoints` | P0–P1 |
| Add `consolidation_approach`, `reporting_basis`, `first_reporting_year` | new | `organizations` | P0 |
| Add `data_requests`, `data_request_shares` | new | new tables | P0 |
| Add `processing_purposes` and `is_aggregate_only` constraints | new | S1/G1 tables | P0 |
| Add `whistleblower_officer` role, restrict RLS on whistleblower/discrimination | new | RLS only | P0 |
| Restructure `materiality_iro` (scale/scope/irremediability split, time horizon, value chain) | new | `materiality_iro`, `materiality_assessments` | P0 |
| Add `scope_2_market_based`, `biogenic_co2_kg`, `contractual_instruments` | new | `calculation_runs`, new table | P0 |
| Pay-transparency tables (job-category equal value, joint pay assessment, quartiles) | new | `gender_pay_gap`, new `joint_pay_assessment` | P0 |
| Whistleblower channel + case timers | new | `whistleblower_cases` extension | P0 |
| `datapoint_values` generic linking table for completeness + iXBRL | new | new table | P1 |
| `restatements`, `financial_connectors` | new | new tables | P1 |
| `external_auditor` role; preparer→reviewer→approver chain | new | new tables | P1 |
| `data_quality`, `uncertainty_pct` on all metric tables | new | many | P1 |
| `period_mode_history` | new | new table | P2 |
| `country_overlays` config | new | new table | P2 |
| i18n columns on narrative tables | new | all narrative tables | P2 |

---

## 6. Recommended sequencing

1. **Sprint 0 — SME definition** (P0 §0a): fix micro threshold (€700k→€2M), add balance-sheet capture in onboarding, implement two-of-three SME classification logic. This is a pre-requisite — everything else depends on correctly identifying which enterprises are SMEs.
2. **Sprint 1 — Regulatory truthfulness** (P0 §1.1, §1.6, §2.6 marketing copy): rename modes, fix marketing pages, publish privacy/DPA docs.
3. **Sprint 2 — Data-protection hardening** (P0 §1.3, §1.7): GDPR aggregation, whistleblower role separation, EU data residency.
4. **Sprint 3 — Methodology compliance** (P0 §1.4, §1.5): double-materiality rebuild, dual Scope 2, consolidation approach.
5. **Sprint 4 — Commercial wedge** (P0 §1.2): VSME-shield workflow + counterparty data-request inbox.
6. **Sprint 5 — Datapoint taxonomy** (P1 §2.1, §2.3): full VSME catalogue, phase-in engine.
7. **Sprint 6 — Assurance & connectivity** (P1 §2.2, §2.4, §2.5): auditor role, restatements, iXBRL preview.
8. Backlog: P2 + P3 items.

---

## 7. Documents to add to the repository

- `docs/legal/dpa-template.md` — Article 28 GDPR DPA.
- `docs/legal/dpia-s1.md` — DPIA template for ESRS S1 processing.
- `docs/legal/whistleblower-policy.md` — model policy aligned with Directive 2019/1937.
- `docs/methodology/double-materiality.md` — disclose the methodology and threshold (the platform will pre-fill, but the SME owns the disclosure).
- `docs/methodology/ghg-boundary.md` — operational vs financial control choice guide.
- `docs/methodology/factor-sources.md` — provenance of every emission factor seeded.
- `docs/methodology/sme-classification.md` — EU SME definition guide (Recommendation 2003/361/EC vs Accounting Directive), two-of-three criteria logic, and onboarding data-capture specification.

These satisfy ESRS 2 BP-2 (disclosures in relation to specific circumstances) and Art. 30 GDPR record-of-processing obligations.
