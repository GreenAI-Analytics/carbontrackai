# Dataset Preparation Guide

This guide covers how to download, transform, and import each emission factor dataset into CarbonTrackAI. Datasets are grouped by priority: **immediate** (importers already built) and **future** (importers to be written).

---

## Priority 1 — Immediate: EEA Electricity (Scope 2)

**Covers:** Grid electricity emission intensity per EU27 country (kgCO₂e/kWh)  
**Importer:** `apps/api/scripts/import-eea-electricity.js`  
**Placeholder:** `apps/api/data/import-inputs/eea-electricity-snapshot.json`

### Step 1 — Download source data

Go to:  
https://www.eea.europa.eu/en/analysis/indicators/greenhouse-gas-emission-intensity-of-1

- Navigate to the data/chart section on that page.
- Download the country-level table as CSV or Excel.
- The table will have columns for: country name/code, year, and CO₂ intensity (gCO₂eq/kWh or kgCO₂eq/kWh — check units carefully).

### Step 2 — Convert units

The importer expects `kgCO₂e per kWh`. EEA often publishes in **gCO₂eq/kWh**.

```
factor_kg_co2e_per_kwh = published_value_g_co2eq_per_kwh / 1000
```

Example: France 2023 = 56 gCO₂eq/kWh → `0.056` kgCO₂e/kWh

### Step 3 — Build the JSON snapshot

Replace the contents of `apps/api/data/import-inputs/eea-electricity-snapshot.json` with one object per country. Keep all field names exactly as shown:

```json
[
  {
    "country_code": "FR",
    "country_name": "France",
    "year": 2024,
    "dataset_version": "2024_snapshot",
    "factor": 0.056,
    "source_url": "https://www.eea.europa.eu/en/analysis/indicators/greenhouse-gas-emission-intensity-of-1",
    "license": "EEA standard re-use policy"
  },
  {
    "country_code": "DE",
    "country_name": "Germany",
    "year": 2024,
    "dataset_version": "2024_snapshot",
    "factor": 0.364,
    "source_url": "https://www.eea.europa.eu/en/analysis/indicators/greenhouse-gas-emission-intensity-of-1",
    "license": "EEA standard re-use policy"
  }
]
```

**Supported `country_code` values (EU27 ISO-2):**  
AT, BE, BG, HR, CY, CZ, DK, EE, FI, FR, DE, GR, HU, IE, IT, LV, LT, LU, MT, NL, PL, PT, RO, SK, SI, ES, SE

Rows with unknown country codes are rejected by the importer validator. Include only EU27 countries.

### Step 4 — Run dry-run, then activate

From `apps/api`:

```powershell
npm run factors:import:eea -- --input data/import-inputs/eea-electricity-snapshot.json --dry-run
# Review output. If valid:
npm run factors:import:eea -- --input data/import-inputs/eea-electricity-snapshot.json --activate
```

---

## Priority 1 — Immediate: DEFRA 2025 GHG Conversion Factors (Scope 1 & 3)

**Covers:** Activity-based emission factors for fuels, transport, refrigerants, waste, travel  
**Importer:** `apps/api/scripts/import-defra-core-fuels.js`  
**Placeholder:** `apps/api/data/import-inputs/defra-core-fuels-snapshot.json`

### Step 1 — Download source data

Official page:  
https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025

Direct full-set Excel download:  
https://assets.publishing.service.gov.uk/media/6846a4f55e92539572806125/ghg-conversion-factors-2025-full-set.xlsx

### Step 2 — Identify the relevant sheets and rows

The workbook has many tabs. For the core fuels importer, extract rows from:

| Sheet | Fuel types to extract |
|---|---|
| **Fuels** | Natural gas (m³), Gas oil / heating oil (L), Diesel (L), Petrol (L) |
| *(optionally)* **Business travel** | Diesel car, Petrol car, Van |

Use the **kgCO₂e** column (total GHG, not CO₂-only). DEFRA publishes the factor already in **kgCO₂e per unit** — no conversion needed.

### Step 3 — Build the JSON snapshot

Replace the contents of `apps/api/data/import-inputs/defra-core-fuels-snapshot.json`:

```json
[
  {
    "activity_type": "natural gas",
    "unit": "m3",
    "region": "EU",
    "year": 2025,
    "dataset_version": "2025_full_set",
    "factor": 2.02289,
    "source_url": "https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025",
    "license": "UK Open Government Licence v3.0"
  },
  {
    "activity_type": "heating oil",
    "unit": "L",
    "region": "EU",
    "year": 2025,
    "dataset_version": "2025_full_set",
    "factor": 2.57196,
    "source_url": "https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025",
    "license": "UK Open Government Licence v3.0"
  },
  {
    "activity_type": "diesel",
    "unit": "L",
    "region": "EU",
    "year": 2025,
    "dataset_version": "2025_full_set",
    "factor": 2.50960,
    "source_url": "https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025",
    "license": "UK Open Government Licence v3.0"
  },
  {
    "activity_type": "petrol",
    "unit": "L",
    "region": "EU",
    "year": 2025,
    "dataset_version": "2025_full_set",
    "factor": 2.15310,
    "source_url": "https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025",
    "license": "UK Open Government Licence v3.0"
  }
]
```

**Supported `activity_type` values (case-insensitive):**

| Input value | Mapped to |
|---|---|
| `natural gas`, `gas`, `natural_gas` | `natural_gas` |
| `heating oil`, `fuel oil`, `heating_oil` | `heating_oil` |
| `diesel`, `diesel car fuel`, `diesel_car_fuel` | `diesel_car_fuel` |
| `petrol`, `petrol car fuel`, `petrol_car_fuel` | `petrol_car_fuel` |

Rows with any other activity type are rejected.

> **Note:** The published factor values above are illustrative. Always use the exact kgCO₂e figure from the downloaded 2025 DEFRA spreadsheet.

### Step 4 — Run dry-run, then activate

```powershell
npm run factors:import:defra -- --input data/import-inputs/defra-core-fuels-snapshot.json --dry-run
# Review output. If valid:
npm run factors:import:defra -- --input data/import-inputs/defra-core-fuels-snapshot.json --activate
```

---

## Priority 2 — Future: Open CEDA 2025 (Scope 3 Spend-based EEIO)

**Covers:** Spend-based emission intensity factors per NACE/sector, EU-focused  
**Importer:** Not yet built — needs a new script `scripts/import-open-ceda.js`

### Acquisition

Option A — request access via the web form:  
https://openceda.org

Option B — direct S3 access (no credentials required):

```powershell
# Requires AWS CLI installed
aws s3 ls s3://open-ceda/ --no-sign-request
aws s3 cp s3://open-ceda/ ./data/import-inputs/open-ceda/ --recursive --no-sign-request
```

### What to build

1. Explore the S3 bucket structure to identify the relevant CSV/Parquet files.
2. Create `apps/api/data/import-inputs/open-ceda-snapshot.json` (or CSV) with fields:
   - `nace_code` — industry sector code (e.g. `C10` for food manufacturing)
   - `nace_label`
   - `unit` — typically `kgCO2e per EUR`
   - `year`
   - `dataset_version`
   - `factor`
   - `source_url`
   - `license`
3. Write `apps/api/scripts/import-open-ceda.js` using `createImporter()` from `scripts/import-factors/common.js`.
4. Map each CEDA sector row to a CarbonTrackAI `activity_type` corresponding to a spend category.

### Schema sketch for snapshot

```json
[
  {
    "nace_code": "C10",
    "nace_label": "Food manufacturing",
    "unit": "EUR",
    "region": "EU",
    "year": 2023,
    "dataset_version": "open_ceda_v2025",
    "factor": 1.234,
    "source_url": "https://openceda.org",
    "license": "Open CEDA License (see openceda.org/license)"
  }
]
```

---

## Priority 2 — Future: EDGAR 2025 (National Validation Baselines)

**Covers:** National-level GHG inventories by sector/gas for cross-validation  
**Importer:** Not yet built — EDGAR is primarily a validation reference, not a per-activity factor source

### Acquisition

Main page: https://edgar.jrc.ec.europa.eu/report_2025  
Direct Excel: https://edgar.jrc.ec.europa.eu/booklet/EDGAR_2025_GHG_booklet_2025.xlsx

### Intended use in this project

EDGAR totals allow you to sanity-check whether a customer's calculated emissions are in a plausible range relative to their country's national sector totals. It is not directly imported as emission factors.

### Recommended approach

1. Download `EDGAR_2025_GHG_booklet_2025.xlsx`.
2. Extract the "by sector" tab for each EU member state.
3. Store as a reference table in Supabase (separate from `emission_factors`), e.g. `national_inventory_benchmarks`.
4. Build an API endpoint or calculation module that compares a company's total to the national benchmark.

---

## Priority 3 — Future: EXIOBASE 3 (Deep MRIO for Scope 3)

**Covers:** Detailed multi-regional input-output emission intensities across 163 industries  
**Importer:** Not yet built — large dataset, requires preprocessing

### Acquisition

Latest version (3.9.4): https://zenodo.org/records/14614930

EXIOBASE is a large dataset (~several GB compressed). Recommended steps:

1. Download `IOT_2022_pxp.zip` (or latest year) from Zenodo.
2. Extract to a local working directory (not committed to the repo).
3. Use Python with the `pymrio` package to load and extract the satellite accounts you need:

```python
import pymrio
io = pymrio.load_test()  # replace with actual EXIOBASE path
# extract kgCO2e per EUR by sector
```

4. Export a sector-mapped CSV keyed to NACE codes.
5. Create a snapshot JSON following the Open CEDA schema above and write an importer script.

> EXIOBASE provides more granularity than Open CEDA but requires more preprocessing. Use Open CEDA first; upgrade to EXIOBASE if sector granularity is needed.

---

## Priority 3 — Future: IPCC EFDB (Scope 1 Stationary Sources)

**Covers:** IPCC emission factors for combustion, industrial processes, agriculture, waste  
**Importer:** Not yet built

### Acquisition

Searchable database (no bulk download): https://www.ipcc-nggip.iges.or.jp/EFDB/main.php

Recommended workflow:

1. Open the Basic Search or Fulltext Search.
2. Filter by:
   - **Sector**: Energy → Stationary Combustion
   - **Gas**: CO₂, CH₄, N₂O
   - **Region**: Europe or Global defaults
3. Export results to Excel via the export button.
4. Pivot/flatten to one row per fuel-gas-unit combination.
5. Convert to CO₂e using IPCC AR5 GWP100 values (CH₄ = 28, N₂O = 265).
6. Create `apps/api/data/import-inputs/ipcc-efdb-snapshot.json` and write `scripts/import-ipcc-efdb.js`.

### IPCC AR5 GWP100 reference values

| Gas | GWP100 |
|---|---|
| CO₂ | 1 |
| CH₄ | 28 |
| N₂O | 265 |
| HFC-32 | 677 |
| SF₆ | 23,500 |

---

## Import pipeline summary

| Dataset | Scope | Importer ready | Next action |
|---|---|---|---|
| EEA Electricity 2024 | Scope 2 | ✅ | Replace placeholder, run `--activate` |
| DEFRA 2025 Core Fuels | Scope 1 & 3 | ✅ | Replace placeholder, run `--activate` |
| Open CEDA 2025 | Scope 3 spend | ❌ | Download from S3, write importer |
| EDGAR 2025 | Validation only | ❌ | Use as benchmark reference table |
| EXIOBASE 3 | Scope 3 deep MRIO | ❌ | Preprocess with Python, write importer |
| IPCC EFDB | Scope 1 combustion | ❌ | Export per-sector, write importer |

---

## Common importer pattern

All importers use `createImporter()` from `apps/api/scripts/import-factors/common.js`. To add a new dataset:

```js
import { createImporter } from "./import-factors/common.js";

const importer = createImporter({
  name: "my-dataset-importer",
  mapRow(rawRow) {
    return {
      datasetName: "My Dataset",
      datasetVersion: rawRow.dataset_version,
      sourceUrl: rawRow.source_url,
      license: rawRow.license,
      activityType: rawRow.activity_type,   // must match DB enum
      unit: rawRow.unit,
      region: rawRow.region,
      value: Number(rawRow.factor),          // kgCO2e per unit
      effectiveDate: `${rawRow.year}-01-01`,
      validTo: `${rawRow.year}-12-31`,
      metadata: { source: "My Dataset" },
    };
  },
  describe(rows) {
    return {
      datasetName: "My Dataset",
      datasetVersion: rows[0]?.datasetVersion ?? "unknown",
      sourceUrl: rows[0]?.sourceUrl ?? "",
      license: rows[0]?.license ?? "",
    };
  },
});

importer.run();
```

Then add the npm script to `apps/api/package.json`:

```json
"factors:import:my-dataset": "node --experimental-vm-modules scripts/import-my-dataset.js"
```
