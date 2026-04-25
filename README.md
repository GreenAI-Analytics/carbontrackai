# CarbonTrackAI

> **One-stop ESG reporting for EU SMEs (< 250 employees, ≤ €50M turnover, or ≤ €43M balance sheet) — CSRD/ESRS-compliant disclosures, made simple.**

[![License: TBD](https://img.shields.io/badge/license-TBD-yellow)](#)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase)](https://supabase.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](#)

---

## 🌱 The Problem

The **Corporate Sustainability Reporting Directive (CSRD)** requires ~50,000 EU SMEs to report on Environmental, Social, and Governance (ESG) metrics — but existing tools are either:

- **Enterprise-grade** — too complex and expensive for SMEs (SAP, Workiva)
- **Carbon-only** — miss social (S1–S4) and governance (G1) requirements
- **Spreadsheet-based** — error-prone, non-auditable, and unsustainable at scale

SMEs need a proportionate, affordable, and CSRD-aligned solution.

---

## ✅ The Solution: CarbonTrackAI

CarbonTrackAI is a **purpose-built ESG reporting platform** for EU SMEs (< 250 employees, ≤ €50M turnover, or ≤ €43M balance sheet). It covers the full ESRS landscape — from carbon accounting to social metrics, governance disclosures, double materiality, and EU Taxonomy alignment — in a single, intuitive application.

### What makes us different

| For SMEs | For Advisors / Accountants | For Auditors |
|----------|---------------------------|--------------|
| Guided data entry wizards | Multi-client dashboard | Immutable report snapshots |
| No ESG expertise needed | White-label exports | Full audit trail per datapoint |
| Free Climate + Materiality tier | Bulk onboarding | ESRS datapoint traceability |
| Offline-capable drafts (planned) | Peer benchmarking | Assurance-ready outputs |

---

## 🏛️ Regulatory Coverage

Built around the **European Sustainability Reporting Standards (ESRS)** , with the **VSME Voluntary SME standard** as the proportionate entry point.

### ESRS Topical Standards

| Pillar | Standards | Coverage |
|--------|-----------|----------|
| 🌍 **Environmental** | ESRS E1–E5 | Climate, Pollution, Water, Biodiversity, Circular Economy |
| 👥 **Social** | ESRS S1–S4 | Workforce, Value Chain, Communities, Consumers |
| 🏛️ **Governance** | ESRS G1 | Business Conduct, Ethics, Compliance, Data Privacy |

### Cross-cutting Standards

| Standard | Purpose |
|----------|---------|
| **ESRS 1** | General requirements — Double Materiality gateway |
| **ESRS 2** | General disclosures — Governance, Strategy, IRO management |
| **EU Taxonomy Regulation** | Eligibility & alignment assessment |

---

## 📦 ESG Modules

### Free Tier (always included)

| Module | ESRS Ref | What you get |
|--------|----------|--------------|
| 🌡️ Climate — Energy & Emissions | E1-1 to E1-9 | Scope 1 & 2 calculation engine, EU27 emission factors (ADEME, MITECO, Climatiq, EEA), activity data entry, intensity ratios, Scope 3 (basic) |
| ⚖️ Double Materiality | ESRS 1, IRO-1 | Impact × Financial materiality matrix, stakeholder engagement tracker, IRO register, disclosure mapping |
| 📄 Report Builder | ESRS 1–G1 | CSRD-ready report generation, ESRS datapoint mapping, Excel & PDF export, immutable snapshots |

### Comprehensive Tier (€99/mo)

All Free Tier features **plus** full Environmental, Social, and Governance modules:

<details>
<summary><strong>🌍 Environmental Extended (E2–E5)</strong></summary>

| Module | ESRS Ref | Key Datapoints |
|--------|----------|----------------|
| Pollution | E2-1 to E2-6 | Air/water/soil pollutant inventory, microplastics, substances of concern |
| Water & Marine Resources | E3-1 to E3-5 | Water consumption intensity, water stress assessment, discharge management |
| Biodiversity & Ecosystems | E4-1 to E4-6 | Site proximity to sensitive areas, biodiversity action plans, offsets |
| Resource Use & Circular Economy | E5-1 to E5-7 | Material flows, waste by type/disposal, circularity rate, product durability |
</details>

<details>
<summary><strong>👥 Social (S1–S4)</strong></summary>

| Module | ESRS Ref | Key Datapoints |
|--------|----------|----------------|
| Own Workforce | S1-1 to S1-17 | Headcount, diversity, turnover, H&S incidents, training hours, gender pay gap, work-life balance, collective bargaining |
| Workers in Value Chain | S2-1 to S2-5 | Supply chain mapping, human rights due diligence, remediation tracking |
| Affected Communities | S3-1 to S3-5 | Community engagement, indigenous rights, economic impact assessments |
| Consumers & End-Users | S4-1 to S4-5 | Product safety incidents, health impact assessments, privacy, accessibility |
</details>

<details>
<summary><strong>🏛️ Governance (G1)</strong></summary>

| Module | ESRS Ref | Key Datapoints |
|--------|----------|----------------|
| Business Conduct | G1-1 to G1-6 | Board composition, anti-corruption training, whistleblower cases, compliance incidents, data breaches, political contributions, supplier conduct |
</details>

<details>
<summary><strong>⚖️ EU Taxonomy</strong></summary>

| Module | Key Features |
|--------|--------------|
| Alignment Assessment | NACE activity screening, substantial contribution criteria, DNSH check, minimum safeguards |
| KPI Reporting | Turnover %, CapEx %, OpEx % alignment, GAR breakdown, trend analysis |
</details>

---

## 🧱 Architecture

```
carbontrackai/
├── apps/
│   ├── web/                     # Next.js 16 (App Router) + Tailwind CSS v4
│   │   ├── app/
│   │   │   ├── dashboard/       # Authenticated ESG hub
│   │   │   │   ├── esg/         # E, S, G pillar data entry & dashboards
│   │   │   │   ├── materiality/ # Double materiality wizard
│   │   │   │   ├── taxonomy/    # EU Taxonomy alignment
│   │   │   │   └── reports/     # CSRD report builder & exports
│   │   │   ├── onboarding/      # Multi-step ESG scope selection
│   │   │   ├── login/ & signup/ # Supabase Auth
│   │   │   └── page.tsx         # Marketing homepage
│   │   ├── components/          # Reusable UI (Hero, Modules, DashboardNav, etc.)
│   │   └── lib/                 # Calculation engines & ESG libraries
│   │       ├── calculations.ts   # Carbon (E1) engine
│   │       ├── esg-scoring.ts    # ESG composite scoring (NEW)
│   │       ├── materiality.ts    # Double materiality logic (NEW)
│   │       ├── taxonomy.ts       # EU Taxonomy calculator (NEW)
│   │       ├── social-metrics.ts # S1–S4 metric computation (NEW)
│   │       └── governance-metrics.ts # G1 metric computation (NEW)
│   └── api/                     # Supabase PostgreSQL + Fastify (planned)
│       └── supabase/migrations/ # 9 migration files (ESG-full schema with RLS)
├── docs/                        # Architecture, build plan, datasets
├── img/                         # Brand assets
├── agents.md                    # AI agent repository guide
└── package.json                 # npm workspaces monorepo
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **ESRS-traceable data model** | Every table references its ESRS datapoint — clear audit trail from raw data → metric → disclosure |
| **Double materiality as gateway** | Materiality assessment determines which datapoints to report — keeps SMEs focused |
| **Feature-flagged modules** | SMEs only see the modules they need — simple, clean UI |
| **Immutable report snapshots** | Finalised reports are append-only — critical for CSRD assurance readiness |
| **Country-aware defaults** | Emission factors, social benchmarks, and governance norms vary by member state |

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/GreenAI-Analytics/carbontrackai.git
cd carbontrackai

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase project credentials

# Start development
npm run dev:all        # Frontend + API simultaneously
# OR separately:
npm run dev -w @carbontrackai/web   # Frontend only (localhost:3000)
npm run dev -w @carbontrackai/api   # API only
```

### Prerequisites

- **Node.js** 20+ and **npm** 10+
- **Supabase** project (self-hosted or cloud)
- **PostgreSQL** 15+ (included with Supabase)

### Database Setup

```bash
# Push migrations to your Supabase instance
npm run db:push -w @carbontrackai/api

# Create a new migration
npm run db:migrate -w @carbontrackai/api
```

---

## 🧭 Current Status

| Area | Status |
|------|--------|
| Monorepo setup, auth flow, onboarding | ✅ Complete |
| Carbon (E1) — Scope 1 & 2 calculation engine | ✅ Complete |
| ESG database schema (E1–E5, S1–S4, G1, Materiality, Taxonomy) | ✅ Designed (migrations ready) |
| Double Materiality assessment wizard | ❌ In progress |
| Social data collection pages (S1–S4) | ❌ Not started |
| Governance data collection pages (G1) | ❌ Not started |
| Environmental extended pages (E2–E5) | ❌ Not started |
| EU Taxonomy alignment | ❌ Not started |
| CSRD Report Builder | ❌ Not started |
| ESG composite scoring & benchmarking | ❌ Planned |
| CI pipeline & tests | ❌ Planned |
| Offline draft + PWA | ❌ Planned |

---

## 🗺️ Roadmap

### Phase 1 — Foundation (Current) ✅
- [x] Monorepo setup with npm workspaces
- [x] Supabase Auth & RLS
- [x] Carbon calculation engine (Scope 1 & 2)
- [x] EU27 emission factor seeding (ADEME, MITECO, Climatiq, EEA)

### Phase 2 — ESG Core (In Progress) 🟡
- [ ] Double Materiality assessment wizard
- [ ] Social data entry (S1–S4) with metric computation
- [ ] Governance data entry (G1) with metric computation
- [ ] Environmental extended pages (E2–E5)
- [ ] Dashboard navigation & KPI expansion

### Phase 3 — Advanced Features 🔵
- [ ] EU Taxonomy alignment engine
- [ ] CSRD Report Builder (Excel, PDF, XHTML export)
- [ ] ESG composite scoring & peer benchmarking
- [ ] Scope 2 market-based + Scope 3 full

### Phase 4 — Production Hardening 🟢
- [ ] Fastify/Prisma API abstraction layer
- [ ] Shared types package (`@carbontrackai/shared`)
- [ ] CI pipeline with unit & integration tests
- [ ] Admin dashboard (factor management, audit log)
- [ ] PWA offline draft + sync
- [ ] Factor refresh automation (Climatiq API)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16 (App Router), TypeScript 5, Tailwind CSS v4 |
| **Backend** | Supabase (PostgreSQL 15), Fastify + Prisma (planned) |
| **Auth** | Supabase Auth (JWT, RLS, email/password) |
| **State** | Supabase client SDK + React hooks |
| **Forms** | Native `<form>` elements (React Hook Form + Zod planned) |
| **Charts** | Recharts (planned) |
| **Validation** | Zod schemas (to be shared via `@carbontrackai/shared`) |
| **Migrations** | Supabase SQL migrations |
| **Package Manager** | npm workspaces (monorepo) |

---

## 📖 Documentation

| Resource | Description |
|----------|-------------|
| [`agents.md`](agents.md) | Complete AI agent guide — database schema, API endpoints, data flows, module architecture |
| [`docs/architecture.md`](docs/architecture.md) | System architecture & design decisions |
| [`docs/build-plan.md`](docs/build-plan.md) | Milestone-based implementation plan |
| [`apps/api/BACKEND_SETUP.md`](apps/api/BACKEND_SETUP.md) | Backend configuration guide |

---

## 🤝 Contributing

We welcome contributions! Whether it's a new ESG module, a factor source integration, or a bug fix:

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-esg-module`)
3. Commit your changes (`git commit -m 'feat: add water consumption module (E3)'`)
4. Push to the branch (`git push origin feat/amazing-esg-module`)
5. Open a Pull Request

See [`agents.md`](agents.md) for detailed guidance on adding new ESG modules.

---

## 📄 License

TBD — License will be determined before public release.

---

## 🙋‍♀️ FAQ

**Q: Who is CarbonTrackAI for?**
A: EU SMEs with fewer than 250 employees (and ≤ €50M turnover or ≤ €43M balance sheet) that need CSRD-compliant ESG reporting. Also useful for accountants, consultants, and auditors managing multi-client SME portfolios.

**Q: Do I need ESG expertise to use it?**
A: No. The platform guides you through each step — from double materiality assessment to final report export.

**Q: Is it really free?**
A: Yes. Climate (E1), Double Materiality, and Report Builder are always free. The Comprehensive tier (all E/S/G modules + EU Taxonomy) is €99/mo with a 30-day trial.

**Q: Can I try it before committing?**
A: Yes. Sign up, complete your double materiality assessment, and generate a sample report — all free, no credit card required.

**Q: Is the data auditable?**
A: Yes. Every calculation, assessment, and finalised report stores versioned inputs, methodology references, and timestamps — designed for CSRD assurance readiness.

---

<p align="center">
  Built with ❤️ by <a href="https://greenaianalytics.org">GreenAI Analytics</a>
</p>