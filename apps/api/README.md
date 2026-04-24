# CarbonTrackAI API Backend

Fastify service for Module 1 emissions calculation and country-specific factor resolution.

## Quick Start

```bash
# Install dependencies
npm install -w @carbontrackai/api

# Configure environment
cp .env.example .env.local
# Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

# Start API server
npm run dev -w @carbontrackai/api
```

Default API URL: `http://localhost:4000`

## Implemented Endpoints

- `GET /health`
- `GET /v1/providers`
- `POST /v1/calculations/module1`

`POST /v1/calculations/module1` expects:

```json
{
	"countryCode": "FR",
	"reportingYear": 2024,
	"qualityMode": "reporting",
	"records": [
		{ "activity_type": "electricity", "quantity": 12000, "unit": "kWh" }
	]
}
```

## Phase 1 Country Integrations

- France: ADEME Base Carbone connector (`ademe_api`)
- Spain: MITECO catalog connector (`miteco_api`)
- Ireland: SEAI 2024 static conversion factors (`seai_2024_static`)

If a live provider cannot return usable factor values, the API falls back to Supabase-seeded factors and then built-in EU fallback constants.

## Factor Imports

Two importer scripts are available under `apps/api/scripts`:

- `npm run factors:import:eea -w @carbontrackai/api -- --input <path-to-eea-snapshot.json|csv> [--activate]`
- `npm run factors:import:defra -w @carbontrackai/api -- --input <path-to-defra-snapshot.json|csv> [--activate]`

Import flow:

- Load a local JSON or CSV snapshot.
- Normalize rows into the engine's factor schema.
- Validate every row before promotion.
- Write both valid and rejected rows to `factor_import_staging`.
- Promote validated rows into `emission_factors` unless `--stage-only` is used.

Importer flags:

- `--dry-run`: validate only, no Supabase writes.
- `--stage-only`: write staging rows only, do not promote.
- `--activate`: activate the dataset version in `dataset_registry` after promotion.

Expected snapshot shapes:

- EEA electricity: `country_code`, `year`, `factor` or `kg_co2e_per_kwh`
- DEFRA core fuels: `activity_type` or `fuel`, `unit`, `year`, `factor` or `kg_co2e_per_unit`

Existing seed rows are backfilled into `dataset_registry` and linked with `import_batch_id` by migration `20260413000200_factor_import_staging_and_backfill.sql`.

Hosted Supabase manual SQL option (if CLI push is unavailable):

- `supabase/migrations/20260413000300_manual_governance_patch.sql`
- `supabase/migrations/20260413000400_manual_seed_backfill.sql`

Import placeholders to replace with real downloaded snapshots:

- `data/import-inputs/eea-electricity-snapshot.json`
- `data/import-inputs/defra-core-fuels-snapshot.json`

Operational step-by-step commands are documented in `IMPORT_RUNBOOK.md`.

## Notes

- This service currently focuses on Module 1 (Scope 1 + Scope 2 location-based).
- Scope 2 market-based, exports, and jobs are not implemented yet.
- See [BACKEND_SETUP.md](./BACKEND_SETUP.md) for schema and RLS details.
