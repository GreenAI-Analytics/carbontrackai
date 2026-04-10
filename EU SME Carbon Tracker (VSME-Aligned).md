# Reference Guide: EU SME Carbon Tracker (VSME-Aligned)

**Version:** 1.0  
**Target Audience:** EU SMEs (<250 employees)  
**Regulatory Basis:** European Commission Recommendation on VSME (July 2025), GHG Protocol, EFRAG VSME Standard

---

## Part 1: Core Architectural Principles

Before coding, adopt these principles to ensure adoption:

| Principle             | Implementation Rule                                                                                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **VSME-First**        | Every feature must map directly to a VSME disclosure (Basic or Comprehensive module). Do not ask for materiality assessments or double materiality (not required for VSME). |
| **Proportionality**   | Default to activity-based data (kWh, km, kg). Only fall back to spend-based (€) if activity data is impossible to obtain.                                                   |
| **Conditional Logic** | Screens must appear only if applicable (e.g., show "livestock emissions" only for farms).                                                                                   |
| **Low Cost**          | Free tier for Basic Module. Paid tier for Comprehensive Module ≤ €99/month. No enterprise lock-in contracts.                                                                |
| **Offline Capable**   | Progressive Web App (PWA) with localStorage sync. Excel import/export as primary backup.                                                                                    |

---

## Part 2: Functional Modules (By VSME Disclosure)

Organize development into these seven modules. Each corresponds to a specific VSME section.

### Module 1: Basic Emissions (Scope 1 & 2)

| VSME Ref                | Required Data                                                                    | Calculation Method                                                                    |
| ----------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| B1 – GHG emissions      | Natural gas (m³), heating oil (L), electricity (kWh), company car fuel (L or km) | Emission factors from EU ETS/EEA database. Auto-detect country-specific grid factors. |
| B2 – Energy consumption | Total annual electricity + heating + cooling (MWh)                               | Sum of utility bills.                                                                 |

**Developer Notes:**

- Build an **emission factor API** that pulls from the latest EEA database (updated quarterly).

- Allow manual factor override for users with corporate PPA contracts.

- Output: tCO2e per year, split by Scope 1 and Scope 2 (location-based and market-based).

### Module 2: Comprehensive GHG (Scope 3 – Simplified)

| VSME Ref                        | Required Data (only if applicable)                            | Data Sources                                  |
| ------------------------------- | ------------------------------------------------------------- | --------------------------------------------- |
| C1 – Business travel            | Flights (km, class), train (km), hotel nights                 | Expense reports, corporate card API           |
| C2 – Upstream transport         | Tonne-km by vehicle type, fuel type                           | Logistics invoices, carrier API               |
| C3 – Purchased goods (optional) | Spend by category (€) with supplier primary data if available | Accounting software (Xero, DATEV, QuickBooks) |

**Critical Rule for SMEs:**  
Do NOT require full Scope 3 inventory. Only ask for categories where the SME has **operational control** (e.g., a delivery fleet) or **significant spend** (>10% of revenue).

### Module 3: Reduction Targets & Transition Plan

| VSME Ref               | Feature                                                                                  | UI/UX Requirement                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| C3 – Reduction targets | Target setting wizard: base year, target year, % reduction (absolute or intensity)       | Visual gap chart: current emissions vs 1.5°C pathway (SBTi SME method)       |
| C4 – Transition plan   | Action library: 50+ decarbonization levers (EVs, heat pumps, solar, waste heat recovery) | Drag-and-drop timeline. Auto-calculate estimated annual reduction per lever. |

**Algorithm for Target Feasibility:**

text

Required annual reduction rate = (Current tCO2e - Target tCO2e) / (Target year - Base year)
If rate > 7% per year, flag "Highly ambitious – consider interim targets"

### Module 4: Climate Risk & Physical Assets

| VSME Ref                | Feature                                                                 | Data Source                                                                 |
| ----------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| C5 – Physical risks     | Qualitative questionnaire: floods, heatwaves, wildfires, sea level rise | Pre-fill location-based risk from EU Climate-ADAPT API (latitude/longitude) |
| C6 – Real estate assets | Building footprint (m²), energy label (A–G), renovation status          | User manual input or energy certificate upload (OCR)                        |

**UI Pattern:** Risk heatmap overlay on OpenStreetMap showing flood zones and heat risk (1km resolution).

### Module 5: Supply Chain & Product Carbon Footprint

| VSME Ref                            | Feature                                                                                                 | Complexity Level                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| C7 – Supplier data request          | Email portal: request primary data from up to 20 suppliers (template pre-filled with VSME Basic Module) | Simple – generates CSV/Excel template                 |
| C8 – Product Carbon Footprint (PCF) | Simplified cradle-to-gate calculator: raw material (kg) → transport (tkm) → production (kWh)            | Use IKE (Finnish standard) or EN 15804+A2 methodology |

**Implementation Shortcut:**  
For PCF, offer an **Excel template** that users fill offline and upload. The app validates and calculates using embedded factors. Do not build a full LCA engine – too complex for SMEs.

# EU27 Emission Data APIs by Country

## National-Level APIs (Country-Specific)

| Country         | Source Agency                       | API Endpoint / Access Method                                                                                                                                                                                                                       | Coverage (Scopes)               | Notes                                                                                                                                                                           |
| --------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **France**      | ADEME (Base Carbone)                | `https://data.ademe.fr/api-base-carbone` [](https://www.data.gouv.fr/dataservices/api-base-carbone/discussions)                                                                                                                                    | Scope 1, 2, 3                   | Public API with 10 calls/sec/IP limit. Returns emission factors for 170+ activities (transport, heating, food, digital). [](https://staging.api.gouv.fr/les-api/api-impact-co2) |
| **France**      | ADEME (Impact CO2)                  | `https://api.impactco2.fr` (request API key) [](https://staging.api.gouv.fr/les-api/api-impact-co2)                                                                                                                                                | Scope 1, 2, 3                   | Free but requires key. Includes Agribalyse food data and transport mode calculators.                                                                                            |
| **Germany**     | UBA (Umweltbundesamt)               | No public REST API – use **Climatiq API** (aggregator) or download Excel/CSV from UBA portal                                                                                                                                                       | Scope 1, 2                      | UBA provides fuel, electricity, transport factors via annual reports (PDF/Excel). [](https://www.climatiq.io/data/emission-factor/0d7c48ba-bab2-480d-b08c-0269a69f3862)         |
| **Ireland**     | EPA Ireland                         | **WFS endpoint:** `https://gis.epa.ie/geoserver/EPA/ows?service=WFS&request=getcapabilities` [](https://data.gov.ie/en_GB/dataset/inspire-e-prtr-emission-data/resource/d8e9ffd3-7ebf-4267-962e-72ecfa5fe331?inner_span=True)                      | Scope 1 (industrial facilities) | Provides INSPIRE-compliant emission data for regulated facilities (E-PRTR). [](https://data.epa.ie/api-list/leap-open-data/#Complaint)                                          |
| **Italy**       | ISPRA / ENEA                        | Register at `https://www.bancadatiitalianalca.enea.it` for full dataset access [](https://www.bancadatiitalianalca.enea.it/Node/datasetdetail/process.xhtml?lang=en&uuid=79d6cf71-b518-4078-9cf7-607823a3792e&version=01.00.000)                   | Scope 1, 2, 3                   | Italian LCA Database – free registration required. Contains transport, agriculture, industrial factors.                                                                         |
| **Netherlands** | RVO (Netherlands Enterprise Agency) | No API – download Excel from RVO website [](https://wiki.carbonaccountingalliance.com/index.php?title=Emission_Factors:Netherlands_Enterprise_Agency_(RVO))                                                                                        | Scope 1, 2                      | Annual spreadsheet (Dutch language) with 109 factors for fuels, electricity, transport, refrigerants.                                                                           |
| **Spain**       | MITECO                              | OpenAPI datastore: `https://catalogo.datosabiertos.miteco.gob.es/catalogo/openapi/datastore/` [](https://catalogo.datosabiertos.miteco.gob.es/catalogo/dataset/42d3d20c-6cba-4bca-8c3f-8a3c7b33520d/resource/940cc8f7-8edb-45bf-8d94-d00beb969a7b) | Scope 1 (national inventory)    | Returns CSV via API. National emissions by pollutant and NFR activity code (1990–2023 series).                                                                                  |

---

## EU-Wide APIs (Multi-Country Coverage)

| Source                 | API Endpoint                                                   | Countries Covered        | Coverage (Scopes)        | Cost / License                                                                                                                         |
| ---------------------- | -------------------------------------------------------------- | ------------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **EEA (via Climatiq)** | `https://api.climatiq.io` (requires free API key)              | All 27 EU countries + UK | Scope 1, 2               | Free tier available. EEA factors for electricity intensity (gCO2e/kWh). CC BY 4.0 license. [](https://www.climatiq.io/data/source/eea) |
| **EEA Direct (WFS)**   | `https://discomap.eea.europa.eu/` (OGC web services)           | All 27 EU countries      | Scope 1 (air pollutants) | Free. Provides gridded emission data for industrial facilities (E-PRTR).                                                               |
| **Eurostat FIGARO**    | `https://ec.europa.eu/eurostat/web/io` (API via Eurostat REST) | All 27 EU countries      | Scope 3 (MRIO)           | Free. Input-output tables for spend-based Scope 3 calculations.                                                                        |
| **AIB Residual Mix**   | `https://www.aib-net.org/portal` (API available for members)   | All 27 EU countries      | Scope 2 (market-based)   | Free for basic access. Residual grid mix factors for renewable energy claims.                                                          |

---

## Recommended Integration Strategy

Since **not all countries provide direct REST APIs**, here is the pragmatic approach for your carbon tracker:

### Tier 1: Direct API Integration (Build native connectors)

- **France** → ADEME Base Carbone API

- **Spain** → MITECO OpenAPI

- **Ireland** → EPA Geoserver WFS (for facility data)

### Tier 2: Use Aggregator API (Single integration for all EU27)

- **Climatiq API** (`api.climatiq.io`) – provides EEA, UBA, ADEME, and UK DESNZ factors through one endpoint [](https://www.climatiq.io/data/source/eea). This reduces development time significantly.

### Tier 3: Excel/CSV Download + Local Database (Fallback)

- **Germany (UBA)** , **Netherlands (RVO)** , **Italy (ENEA)** – build an ETL pipeline that downloads annual Excel files and loads them into your database.

---

## Example API Call (France ADEME Base Carbone)

bash

# Get emission factor for electricity in France

curl -X GET "https://data.ademe.fr/api-base-carbone/v1/facteurs?nom=électricité&pays=France" \
  -H "Accept: application/json"

*Rate limit: 10 requests/second per IP* [](https://www.data.gouv.fr/dataservices/api-base-carbone/discussions)

---

## Summary Table by Country (Quick Reference)

| Country         | Has REST API?      | Primary Source          | Action for Developer      |
| --------------- | ------------------ | ----------------------- | ------------------------- |
| Austria         | No                 | EEA (via Climatiq)      | Use Climatiq API          |
| Belgium         | No                 | EEA / Regional agencies | Use Climatiq API          |
| Bulgaria        | No                 | EEA                     | Use Climatiq API          |
| Croatia         | No                 | EEA                     | Use Climatiq API          |
| Cyprus          | No                 | EEA                     | Use Climatiq API          |
| Czechia         | No                 | EEA / UBA proxy         | Use Climatiq API          |
| Denmark         | No                 | EEA / DCE               | Use Climatiq API          |
| **Estonia**     | No                 | EEA                     | Use Climatiq API          |
| **Finland**     | No                 | EEA / SYKE              | Use Climatiq API          |
| **France**      | ✅ Yes              | ADEME                   | Direct API integration    |
| **Germany**     | No (Excel)         | UBA                     | ETL from Excel + Climatiq |
| **Greece**      | No                 | EEA                     | Use Climatiq API          |
| **Hungary**     | No                 | EEA                     | Use Climatiq API          |
| **Ireland**     | ✅ Yes (WFS)        | EPA                     | WFS endpoint + Climatiq   |
| **Italy**       | Partial (register) | ISPRA/ENEA              | Register + Climatiq       |
| **Latvia**      | No                 | EEA                     | Use Climatiq API          |
| **Lithuania**   | No                 | EEA                     | Use Climatiq API          |
| **Luxembourg**  | No                 | EEA                     | Use Climatiq API          |
| **Malta**       | No                 | EEA                     | Use Climatiq API          |
| **Netherlands** | No (Excel)         | RVO                     | ETL from Excel            |
| **Poland**      | No                 | EEA / KOBIZE            | Use Climatiq API          |
| **Portugal**    | No                 | EEA / APA               | Use Climatiq API          |
| **Romania**     | No                 | EEA                     | Use Climatiq API          |
| **Slovakia**    | No                 | EEA                     | Use Climatiq API          |
| **Slovenia**    | No                 | EEA                     | Use Climatiq API          |
| **Spain**       | ✅ Yes              | MITECO                  | OpenAPI integration       |
| **Sweden**      | No                 | EEA / Naturvårdsverket  | Use Climatiq API          |
