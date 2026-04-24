# CarbonTrackAI

VSME-aligned carbon accounting platform for EU SMEs.

## Project Goal

Build a practical, affordable platform that helps SMEs measure and reduce emissions with a VSME-first approach:

- Basic Module: Scope 1 and Scope 2 reporting
- Comprehensive Module: selective Scope 3, targets, transition planning, climate risk, and supplier/product extensions
- Offline-capable UX with import/export friendly workflows

## Current Repository Status

This repository now includes a working Module 1 flow end-to-end:

- Web app in `apps/web` for signup, onboarding, activity entry, and emissions review.
- API in `apps/api` (Fastify) for Module 1 calculations and country factor resolution.
- Supabase migrations for auth, core entities, RLS, and reporting governance extensions.
- Reporting-mode quality controls (fail-closed when fallback/governance conditions are not met).
- Factor provenance persistence in calculation runs and line-level audit records.
- Manual SQL patch files for hosted Supabase when CLI migration push is unavailable.
- Import input placeholders for EEA electricity and DEFRA core fuels in `apps/api/data/import-inputs`.

## Planning Docs

- [Build Plan](docs/build-plan.md)
- [Architecture Draft](docs/architecture.md)

## Suggested Technical Direction

- Frontend: Next.js app-router web app (`apps/web`)
- Backend: Node.js + Fastify service (`apps/api`)
- Data: Supabase Postgres + RLS with provider adapters and fallback hierarchy

## Suggested Next Milestones

1. Add Scope 2 market-based pathway and contractual factor inputs.
2. Implement exports (Excel/PDF) with methodology/provenance disclosure.
3. Add tests and CI for calculation quality gates and migrations.
4. Import and activate real EEA and DEFRA annual datasets to replace `legacy_seed` versions.
5. Expand to broader Scope 3 workflows behind plan gating.

## License

TBD
