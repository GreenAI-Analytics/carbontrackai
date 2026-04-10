# Architecture Draft (V1)

## Principles

- VSME-first disclosures
- Proportional data collection (activity-based first)
- Conditional workflows by sector and applicability
- Low-cost deployment model
- Offline-capable user experience

## Core Components

1. Web App (`apps/web`)
- Data collection forms
- Conditional module flows
- Dashboard, exports, and basic planning views

2. API (`apps/api`)
- Emissions calculation engine
- Emission factor lookup abstraction
- Import/export processing

3. Factors Layer
- Country-aware factor resolution
- Source priority rules
- Versioning and audit trail

## Initial Domain Modules

1. Basic Emissions (Scope 1 and 2)
2. Comprehensive Scope 3 (simplified and conditional)
3. Targets and transition planning
4. Climate risk and asset profile
5. Supplier request and PCF assist

## Non-Functional Targets

- PWA/offline-first behavior for key workflows
- Explainable calculations with factor provenance
- Repeatable annual reporting snapshots
