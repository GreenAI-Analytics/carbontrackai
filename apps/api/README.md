# CarbonTrackAI API Backend

Node.js + Fastify backend for emissions calculations and factor integrations.

## Quick Start

```bash
# Install dependencies
npm install -w @carbontrackai/api

# Configure environment
cp .env.example .env.local
# Update with your Supabase credentials

# Start development
npm run dev -w @carbontrackai/api
```

## Architecture

- **Database**: Supabase PostgreSQL with Row-Level Security
- **Auth**: Supabase JWT-based authentication
- **Validation**: Zod schemas (shared with frontend)
- **Emission Factors**: ADEME (FR) + MITECO (ES) + Climatiq (EU27)

## Key Features

- ✅ Module 1: Scope 1 & 2 emissions (Basic)
- ✅ Module 2: Scope 3 emissions (Comprehensive)
- ✅ Module 3: Reduction targets & transition planning
- ✅ Module 4: Climate risk assessments
- ✅ Module 5: Supply chain & product PCF

## Database Setup

See [BACKEND_SETUP.md](./BACKEND_SETUP.md) for:
- Schema documentation
- Authentication flows
- Row-Level Security policies
- Emission factor integration strategy

## Responsibilities

- Emission calculations (Scope 1, 2, 3)
- Emission factor integrations (Climatiq, national APIs)
- Validation, conversion, and reporting payloads
- Audit metadata for factor sources and versions
- Excel import/export processing
- User authentication & organization management
