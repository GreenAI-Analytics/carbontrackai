# CarbonTrackAI Build Plan (VSME-Aligned)

## 1. Scope and Delivery Approach

This plan converts the product brief into an execution roadmap.

Delivery principle:

- Build Module 1 first (Scope 1 and Scope 2) as the production MVP.
- Design all services so Module 2 to Module 5 can be added without rework.
- Keep comprehensive features behind plan/feature flags.

Initial release target:

- A usable SME workflow from onboarding to annual Scope 1 and Scope 2 report export.

## Current Implementation Status (as of 2026-04-12)

Verified in workspace:

- Frontend build status: `npm run build` in `apps/web` passes.
- Frontend lint status: `npm run lint` in `apps/web` passes.
- Monorepo workspaces configured at root (`apps/api`, `apps/web`).
- Supabase schema/migrations created for core entities and RLS.
- Authentication flow implemented in web app:
  - `/signup`
  - `/login`
  - `/forgot-password`
  - `/reset-password`
  - `/onboarding`
- Route protection implemented via proxy layer (`apps/web/proxy.ts`) — migrated from deprecated middleware convention to Next.js 16 proxy convention.
- Dashboard foundation implemented:
  - `/dashboard` overview
  - `/dashboard/activity` (activity entry)
  - `/dashboard/emissions` (calculation + breakdown)
- Module 1 calculation engine implemented in web (`apps/web/lib/calculations.ts`):
  - Scope 1 + Scope 2 (location-based)
  - Total annual energy (MWh)
  - Factor fallback strategy (country-specific -> EU/default fallback)
- Full application branding implemented:
  - CarbonTrackAI logo (`/public/img/carbontrack-ai-logo.png`) applied to header, dashboard nav, all auth/onboarding pages, and footer.
  - GreenAI Analytics logo (`/public/img/greenai-analytics-logo.png`) displayed in footer with link to https://greenaianalytics.org.
  - Site metadata icons set to CarbonTrackAI logo.
  - Logos use transparent backgrounds; dark-surface contexts use CSS filter or white pill background for legibility.

Current gaps vs MVP exit criteria:

- Scope 2 market-based calculation path is not yet implemented end-to-end.
- Export pipeline (Excel/PDF) not yet implemented in app/API flow.
- Factor refresh jobs/provider adapters are not yet implemented as services.
- CI pipeline and automated tests are not yet configured in repo.
- Offline draft + sync behavior is not yet implemented.

## 2. Recommended Tech Stack

## Frontend (`apps/web`)

- Framework: Next.js (App Router) + TypeScript
- UI: Tailwind CSS + accessible component primitives
- Forms: React Hook Form + Zod
- State: TanStack Query + localStorage cache for offline draft mode
- PWA: next-pwa or equivalent service worker setup
- Charts: Recharts for emissions trend and scope split

## Backend (`apps/api`)

- Runtime: Node.js + TypeScript
- API: Fastify (or NestJS if team prefers convention-heavy architecture)
- Validation: Zod schemas shared with frontend
- ORM: Prisma
- Database: PostgreSQL
- Jobs: BullMQ (factor refresh, report generation)
- Auth (v1 simple): magic-link or email/password with JWT session

## Infrastructure

- Hosting: Vercel (web) + Railway/Fly.io (API/Postgres) for low-cost MVP
- Object storage: S3-compatible bucket for imports/exports
- Monitoring: Sentry + structured logs

## 3. Domain Architecture

Use modular boundaries from day one:

- `org-profile`: country, sector, base year, reporting settings
- `activity-data`: energy/fuel usage records and units
- `factors`: factor providers, fallback, versioning, provenance
- `calculations`: scope computations, conversions, totals, intensity
- `reporting`: annual snapshots and exports
- `billing-gates`: free (Basic) vs paid (Comprehensive)

Core design rules:

- Every computed value stores source factor ID, factor version, and timestamp.
- Calculations are deterministic and repeatable for auditability.
- Country auto-detection influences electricity factors by default.

## 4. Phased Roadmap

## Phase 0: Foundation (Week 1)

Deliverables:

- Monorepo setup with `apps/web` and `apps/api`
- CI pipeline: lint, typecheck, unit tests
- Shared package for schemas and calculation contracts
- Basic auth and organization setup

Exit criteria:

- Developer can run web and API locally in one command.
- CI passes on pull request.

## Phase 1: Module 1 MVP (Week 2 to Week 4)

In scope:

- Inputs: natural gas (m3), heating oil (L), electricity (kWh), car fuel (L or km)
- Auto country electricity factor
- Manual factor override for PPA/contractual values
- Output:
  - Scope 1 total (tCO2e)
  - Scope 2 location-based (tCO2e)
  - Scope 2 market-based (tCO2e)
  - Total annual energy (MWh)
- Export: Excel + PDF summary

Exit criteria:

- User completes annual data entry in less than 15 minutes for common SME profile.
- Report export includes full factor provenance.

Implementation note:

- In progress and partially delivered in current codebase.
- Data entry + Scope 1/2 location-based calculation are implemented.
- Remaining work for full Phase 1 completion: market-based Scope 2, export artifacts, and validated provenance UX in reports.

## Phase 2: Factors Platform (Week 5 to Week 6)

In scope:

- Provider abstraction with priority:
  1. Direct national API (France, Spain, Ireland where relevant)
  2. Climatiq (EEA-backed)
  3. Local factor cache/ETL fallback
- Factor refresh jobs (quarterly default, manual trigger)
- Factor test suite for unit mapping and conversion consistency

Exit criteria:

- Any Module 1 calculation resolves factors through unified API.
- Provider outage falls back without blocking calculation.

## Phase 3: Offline + Import/Export Hardening (Week 7)

In scope:

- Draft-mode offline data entry in browser
- Conflict-safe sync on reconnect
- Guided Excel import template and validation errors

Exit criteria:

- User can work offline and sync with no data loss in normal connectivity interruptions.

## Phase 4: Comprehensive Module Gate (Week 8 to Week 10)

In scope:

- Module 2 simplified Scope 3 (only applicable categories)
- Module 3 target wizard and transition plan baseline
- Feature flags and billing gates

Exit criteria:

- Paid plan users can enable comprehensive workflow without impacting basic users.

## 5. Data Model (V1)

Key entities:

- Organization
- ReportingPeriod
- ActivityRecord
- EmissionFactor
- FactorSource
- CalculationRun
- ReportSnapshot
- ImportJob
- ExportJob
- FeatureFlagSubscription

Minimal schema rules:

- `ActivityRecord` stores original unit and normalized unit.
- `CalculationRun` stores code version hash for reproducibility.
- `ReportSnapshot` immutable after publish.

## 6. API Design (Initial Endpoints)

Public (authenticated):

- `POST /orgs`
- `GET /orgs/:orgId/reporting-periods`
- `POST /orgs/:orgId/activity-records`
- `POST /orgs/:orgId/calculations/run`
- `GET /orgs/:orgId/calculations/:runId`
- `POST /orgs/:orgId/reports/export`

Internal/admin:

- `POST /factors/refresh`
- `GET /factors/resolve`
- `POST /factors/override`

## 7. Calculation Contract (Module 1)

Use a shared contract package so the same validation runs in web and API.

Inputs:

- Country code (ISO-2)
- Period year
- Activity list (type, value, unit)
- Optional factor overrides

Outputs:

- Scope 1 total
- Scope 2 location-based
- Scope 2 market-based
- Energy total MWh
- Breakdown by source
- Factor provenance list

## 8. Quality, Compliance, and Testing

Testing layers:

- Unit: conversion and factor lookup logic
- Integration: full calculation runs and provider fallback behavior
- E2E: onboarding -> data entry -> calculation -> export

Compliance readiness:

- Keep immutable audit trail for runs and reports
- Expose assumptions and factor source in every report
- Avoid collecting unnecessary data for VSME basic workflow

## 9. Delivery Backlog for First 10 Working Days

1. Scaffold web/API monorepo and CI.
2. Implement shared schema package.
3. Build org profile + reporting period screens.
4. Implement Module 1 activity entry forms.
5. Build factor resolution service with Climatiq adapter.
6. Implement calculation engine and API endpoint.
7. Add dashboard summary cards and charts.
8. Implement Excel and PDF export.
9. Add audit view (factor source/version).
10. Ship MVP beta to pilot SME users.

Updated near-term execution order:

1. Implement Scope 2 market-based path (including contractual/PPA override handling).
2. Implement report export (Excel first, then PDF) from saved calculation runs.
3. Add factor provenance panel in dashboard/report views (source + region + effective date).
4. Add CI checks (build, lint, typecheck) at root workspace.
5. Add baseline tests: calculation unit tests + onboarding/activity/emissions E2E smoke path.

## 10. Risks and Mitigations

- Inconsistent factors across providers:
  - Mitigation: provider priority + normalization + versioned snapshots.
- Scope creep into full Scope 3/LCA:
  - Mitigation: strict module gating and template-assisted PCF only.
- Offline sync complexity:
  - Mitigation: start with draft-only local cache, then conflict resolution rules.
- Regulatory interpretation drift:
  - Mitigation: traceability matrix from each feature to VSME reference.

## 11. Definition of Done for MVP

MVP is complete when:

- An SME can enter annual Scope 1 and Scope 2 data.
- System calculates valid tCO2e outputs with factor provenance.
- User exports report artifacts for annual disclosure.
- App supports temporary offline input and safe sync.
- CI, tests, and logging are in place for production support.
