# MAXIMUM-ACCURACY EMISSION ENGINE SPECIFICATION (V2)
## Free-First, Self-Hosted, Reporting-Grade (CSRD / ESRS E1 / VSME)

This specification defines a production-ready carbon calculation engine for EU SMEs with a strict priority on reporting accuracy, auditability, and commercial-safe free data use.

## 1. Project Goal
Build a Node.js + Fastify emission engine that:
- Calculates Scope 1, Scope 2, and Scope 3 emissions with strict data-quality hierarchy.
- Uses free datasets for commercial use wherever possible.
- Covers EU-27 country-specific calculations for electricity and core fuels.
- Produces report-ready outputs for CSRD (ESRS E1) and VSME.
- Fails safely in reporting mode when only low-confidence fallback factors are available.
- Stores complete factor lineage and methodology for assurance.

## 2. Accuracy Hierarchy (Mandatory)
For each emission line item, resolve factors in this order:
1. Tier 1 - Primary activity data with source-specific factor:
     - Metered energy (kWh), fuel volume/mass, distance and mode, waste mass/type, refrigerant top-up/leakage, supplier PCF/EPD.
2. Tier 2 - High-quality activity defaults:
     - Official national factors and recognized public datasets (DEFRA, EEA electricity, national agencies, curated IPCC-based defaults).
3. Tier 3 - Spend-based fallback (EEIO):
     - Open CEDA (if accessible under free terms).

Hard rule:
- Never use Tier 3 when valid Tier 1 or Tier 2 activity data exists.

## 3. Data Source Policy (Free + Commercial-Safe)
Use sources with explicit free/public use terms and keep license metadata in DB.

| Use Case | Primary Source | Status in V2 | Notes |
|---|---|---|---|
| Scope 2 location-based electricity EU-27 | EEA electricity intensity indicator and underlying data | Approved | Country-specific EU coverage; update annually. |
| Scope 1 fuels, transport, waste defaults | DEFRA conversion factors (latest full set) | Approved | Strong practical coverage; map units carefully. |
| Scope 1/3 supplemental factors | Curated IPCC EFDB entries | Approved with curation | EFDB is a library, not plug-and-play; require quality filtering and references. |
| Country sanity baseline | EDGAR GHG report dataset | Approved for validation only | Not used as direct factor table for SME activity lines. |
| Scope 3 spend fallback | Open CEDA | Approved fallback | Keep attribution and version lock; request/download workflow may be manual. |
| Deep MRIO fallback | EXIOBASE | Optional, off by default | Do not treat as guaranteed free-commercial default without license confirmation. |

Licensing safeguards:
- Every imported dataset row must include license string, source URL, version, and import date.
- Engine must block dataset activation if license metadata is missing.

## 4. Calculation Modes
Implement two explicit modes:

### 4.1 Estimate Mode
- Returns a result even if Tier 3 fallback is used.
- Must disclose fallback share and uncertainty.

### 4.2 Reporting Mode (Default for disclosures)
- Fails closed when material categories rely only on Tier 3 or unmanaged fallback.
- Returns actionable error payload with missing-data list.
- No silent substitution to generic EU constants for reporting output.

## 5. Hybrid Logic (Exact Rules)
For each record:

```pseudocode
if has_primary_activity_data(record):
        factor = resolve_tier1_or_tier2_factor(record)
        emissions = convert_units(record.value, record.unit, factor.unit_in) * factor.value
        tier = factor.tier
else:
        factor = resolve_tier3_spend_factor(record.nace_code, record.country, record.year)
        emissions = record.spend_eur * factor.kgco2e_per_eur
        tier = "Tier 3"

if mode == "reporting" and tier == "Tier 3" and record.is_material:
        raise ReportingQualityError(record_id, reason="Material item lacks activity-based factor")
```

Additional rules:
- Scope 2 location-based must use country factor by reporting year.
- If contractual supplier electricity data exists, also compute market-based result.
- Separate biogenic CO2 and non-CO2 gases where source data supports this.
- Use pint for all unit conversions and store conversion path.

## 6. Reporting-Grade Data Quality Controls
Must enforce:
- Input schema validation (type, range, unit compatibility, time period).
- Duplicate detection and period overlap checks.
- Outlier checks by activity class.
- Country/year factor availability checks.
- Mandatory provenance per line item.

Materiality controls:
- Configurable threshold (example: 5% of total emissions or policy-driven threshold).
- Reporting mode blocks submission if unresolved material lines exist.

## 7. Database Schema (Minimum)

### 7.1 Core tables
- emission_factors
    - factor_id, source_name, source_version, source_url, license, year, scope, category,
        activity_type, unit_in, unit_out, factor_value, gas, gwp_basis,
        country_code, nace_code, data_tier, uncertainty_pct, valid_from, valid_to,
        import_batch_id, checksum

- calculation_runs
    - calculation_id, org_id, mode, period_start, period_end, input_hash,
        total_scope1, total_scope2_location, total_scope2_market, total_scope3,
        quality_summary_json, methodology_text, created_at

- calculation_line_items
    - line_id, calculation_id, category, activity_value, activity_unit,
        spend_eur, factor_id, applied_factor_value, applied_tier,
        emissions_kgco2e, uncertainty_low_kg, uncertainty_high_kg,
        provenance_json

- dataset_registry
    - dataset_id, name, version, source_url, license, downloaded_at,
        activated_at, status, checksums_json, notes

## 8. Required Output Contract (CSRD / VSME Ready)
Each calculation response must include:
- Scope totals (kgCO2e and tCO2e):
    - scope1, scope2_location, scope2_market (if applicable), scope3, total.
- Category breakdown and contribution percentages.
- Data-quality distribution by tier (absolute + percentage).
- Factor provenance list (source, version, year, country, tier, license).
- Uncertainty range per category and total.
- Methodology disclosure paragraph (auto-generated, report-ready).
- Improvement roadmap with prioritized actions to increase Tier 1 share.

## 9. Methodology Disclosure Template (Auto-Generated)
The engine must generate text that states:
- Organizational boundary and reporting period.
- Standards basis (GHG Protocol Corporate; CSRD/ESRS E1 mapping; VSME mapping).
- Scope 2 basis (location-based and market-based if available).
- Data hierarchy and tier distribution.
- Source versions and licenses used.
- Key assumptions, exclusions, and uncertainty statement.

## 10. Annual Refresh and Version Governance
Refresh cycle:
- September to October each year: ingest latest DEFRA, EEA, EDGAR, Open CEDA snapshot, and national factor updates.

Governance requirements:
- Never overwrite prior factors; append with versioning.
- Recalculate-on-request support for prior years with locked factor vintages.
- Automatic changelog between factor versions (delta report).

## 11. Free Data Constraints and Operational Fallbacks
- If Open CEDA download/access is temporarily unavailable:
    - Keep last approved frozen version active.
    - Flag dataset staleness in output.
- EXIOBASE may be integrated only when legal usage rights are explicitly validated for intended use.
- EDGAR remains validation-only, not direct activity factor substitution.

## 12. Acceptance Criteria (Definition of Done)
Engine is considered reporting-worthy when all are true:
1. Reporting mode blocks unresolved material Tier 3 dependence.
2. Factor provenance is complete for 100% of line items.
3. Scope outputs and methodology text are reproducible from stored inputs and factor versions.
4. Unit conversions are deterministic and tested.
5. Dataset licenses are recorded and validated before activation.
6. Quality summary shows Tier 1 share and uncertainty disclosure.

## 13. Implementation Notes for API Service
- Expose endpoints:
    - GET /health
    - GET /v1/providers
    - POST /v1/calculations/module1
    - POST /v1/factors/import (planned)
    - POST /v1/factors/activate (planned)
- Add mode parameter: estimate or reporting.
- Return 422 for reporting-quality failures with machine-readable remediation items.

## 14. Implementation Snapshot (As Built on 2026-04-13)
Implemented now:
- Runtime stack: Node.js + Fastify + Zod + Supabase service client.
- Reporting mode request validation via `qualityMode` field in calculation payload.
- Reporting fail-closed behavior when:
    - built-in fallback factors are used, or
    - database factors are missing governance metadata (source_version/license).
- Country providers:
    - FR via ADEME adapter.
    - ES via MITECO adapter.
    - IE via SEAI 2024 static factors.
- Factor provenance in API response (`providerDiagnostics`, `factorProvenance`).
- DB governance migration includes:
    - `dataset_registry`
    - metadata extensions on `emission_factors`
    - `calculation_line_items`
    - enhanced `calculation_runs` fields (`quality_summary`, `methodology_text`, `input_hash`).
- Web app emissions flow persists run-level and line-level audit data.

## 15. Roadmap to Maximum Accuracy
Phase A (now):
- Scope 1 + Scope 2 reporting mode with strict factor provenance.

Phase B:
- Scope 3 category expansion with supplier-primary data ingestion.

Phase C:
- Automated invoice parsing, supplier-specific factors, and uncertainty calibration with historical error tracking.

This V2 specification prioritizes the most accurate achievable calculations under free-first constraints while remaining fit for real disclosure workflows.


