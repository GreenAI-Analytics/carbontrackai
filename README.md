# CarbonTrackAI

VSME-aligned carbon accounting platform for EU SMEs.

## Project Goal

Build a practical, affordable platform that helps SMEs measure and reduce emissions with a VSME-first approach:

- Basic Module: Scope 1 and Scope 2 reporting
- Comprehensive Module: selective Scope 3, targets, transition planning, climate risk, and supplier/product extensions
- Offline-capable UX with import/export friendly workflows

## Current Repository Status

This repository was initialized from the product brief and now includes:

- Product reference brief in the root
- Foundational docs in `docs/`
- App placeholders in `apps/web` and `apps/api`
- Environment template and git ignore defaults

## Planning Docs

- [Build Plan](docs/build-plan.md)
- [Architecture Draft](docs/architecture.md)

## Suggested Technical Direction

- Frontend: PWA-capable web app (React/Next.js or similar)
- Backend: API service for factors, calculations, and exports
- Data: emission factors from Climatiq + country-specific integrations where available

## Suggested Next Milestones

1. Define v1 architecture and stack choices.
2. Implement Module 1 (Scope 1 and Scope 2) end-to-end.
3. Add factors abstraction layer (country-aware, versioned).
4. Add Excel import/export and offline sync strategy.
5. Expand to Comprehensive modules behind plan gating.

## License

TBD
