# Factor Import Runbook

## 1. Prerequisites

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `apps/api/.env.local`.
- For local DB workflow: Docker Desktop running.
- For hosted Supabase workflow: either project linked via CLI or access to Supabase SQL Editor.

## 2. Migration Application

### Option A: Hosted Supabase project

1. Link project:

```bash
cd apps/api
npx supabase link --project-ref <your-project-ref>
```

2. Push migrations:

```bash
npx supabase db push
```

### Option B: Local Supabase stack

1. Start local stack:

```bash
cd apps/api
npx supabase start
```

2. Push migrations locally:

```bash
npx supabase db push --local
```

### Option C: Hosted Supabase SQL Editor (no CLI push)

Run these files in Supabase SQL Editor, in order:

1. `supabase/migrations/20260413000300_manual_governance_patch.sql`
2. `supabase/migrations/20260413000400_manual_seed_backfill.sql`

This applies governance schema + seeded-row linkage without direct DB CLI connectivity.

## 3. Dry-run Import Validation

```bash
cd apps/api
npm run factors:import:eea -- --input data/import-samples/eea-electricity-snapshot.sample.json --dry-run
npm run factors:import:defra -- --input data/import-samples/defra-core-fuels-snapshot.sample.json --dry-run
```

## 4. Stage Real Snapshots (No Promotion Yet)

```bash
cd apps/api
npm run factors:import:eea -- --input <path-to-eea-file.json-or-csv> --stage-only
npm run factors:import:defra -- --input <path-to-defra-file.json-or-csv> --stage-only
```

Default placeholder paths in this repo:

- `data/import-inputs/eea-electricity-snapshot.json`
- `data/import-inputs/defra-core-fuels-snapshot.json`

Review rejected rows in `public.factor_import_staging` where `status = 'rejected'`.

## 5. Promote + Activate

Only when staging has no rejected rows:

```bash
cd apps/api
npm run factors:import:eea -- --input <path-to-eea-file.json-or-csv> --activate
npm run factors:import:defra -- --input <path-to-defra-file.json-or-csv> --activate
```

## 6. Verify Governance Coverage

Run in SQL editor:

```sql
select
  ef.activity_type,
  ef.region,
  ef.source_version,
  ef.license,
  dr.name as dataset_name,
  dr.version as dataset_version,
  dr.status as dataset_status
from public.emission_factors ef
left join public.dataset_registry dr on dr.id = ef.import_batch_id
where ef.activity_type in ('electricity', 'natural_gas', 'heating_oil', 'petrol_car_fuel', 'diesel_car_fuel')
order by ef.activity_type, ef.region;
```

## 7. API Smoke Test

```bash
cd apps/api
node -e "fetch('http://localhost:4000/v1/calculations/module1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({countryCode:'DE',reportingYear:2024,qualityMode:'reporting',records:[{id:'1',activity_type:'electricity',quantity:1000,unit:'kWh'}]})}).then(async r=>{console.log('STATUS='+r.status); console.log(await r.text());})"
```

Expected after full governed imports: no `legacy_schema`, `unmanaged`, or fallback quality blockers for covered countries.
