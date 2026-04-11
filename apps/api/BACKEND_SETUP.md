# CarbonTrackAI Backend Setup Guide

## Overview

This document describes the Supabase PostgreSQL backend infrastructure for CarbonTrackAI, including database schema, authentication flows, and API architecture.

## Architecture

### Technology Stack

- **Database**: PostgreSQL (Supabase-hosted)
- **Auth**: Supabase Auth (JWT-based)
- **API**: Node.js + Fastify (to be implemented)
- **ORM**: Prisma (to be configured)
- **Validation**: Zod schemas (shared with frontend)

## Database Schema Overview

The database is organized into five core modules corresponding to VSME disclosure requirements:

### **Module 1: Basic Emissions (Scope 1 & 2)**

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `organizations` | Company/SME accounts | name, country_code, sector, base_year |
| `reporting_periods` | Annual reporting windows | year, start_date, end_date, is_locked |
| `activity_records` | Energy/fuel usage data | activity_type, quantity, unit, month |
| `emission_factors` | CO2 conversion rates | activity_type, unit, region, value |
| `calculation_runs` | Computed Scope 1 & 2 | scope_type, total_emissions |
| `report_snapshots` | Finalized annual reports | scope1_emissions, scope2_emissions |

**Example Flow:**
1. User enters: "1000 kWh electricity (FR)" → stored in `activity_records`
2. System looks up France's factor (0.057 kgCO2e/kWh) from `emission_factors`
3. Calculates: 1000 * 0.057 = 57 kgCO2e → stored in `calculation_runs`
4. Annual report snapshots in `report_snapshots`

### **Module 2: Scope 3 Emissions (Comprehensive)**

| Table | Purpose |
|-------|---------|
| `business_travel_records` | Flights, trains, hotels |
| `upstream_transport_records` | Freight (road, rail, sea) |
| `purchased_goods_records` | Supplier spending data |
| `scope3_calculations` | Computed Scope 3 totals |

### **Module 3: Reduction Targets & Transition Planning**

| Table | Purpose |
|-------|---------|
| `reduction_targets` | Base year, target year, % reduction |
| `transition_plan_actions` | Decarbonization actions with estimated cost savings |

### **Module 4: Climate Risk & Physical Assets**

| Table | Purpose |
|-------|---------|
| `physical_assets` | Buildings, facilities, energy labels |
| `climate_risk_assessments` | Flood, heatwave, wildfire risks (location-based) |

### **Module 5: Supply Chain & Product Carbon Footprint**

| Table | Purpose |
|-------|---------|
| `supplier_contacts` | Supplier list & contact info |
| `supplier_data_requests` | Email templates for requesting supplier emissions |
| `product_carbon_footprints` | Cradle-to-gate PCF calculations |

---

## Authentication Architecture

### User Signup Flow

1. **Frontend** sends email + password to Supabase Auth
2. **Supabase** generates JWT token + sends confirmation email
3. **User confirms email** → account activated
4. **Trigger** (`handle_new_user`) creates profile in `user_profiles` table
5. **Frontend** redirects to onboarding (create/join organization)

### Organization & User Roles

```
auth.users (Supabase managed)
    ↓
user_roles (junction table)
    ├── user_id
    ├── organization_id
    ├── role ('user' | 'admin')
    └── is_primary (true/false)
```

**Role Types:**
- **`user`**: Regular SME employee. Can view/edit their organization's data.
- **`admin`**: Organization admin. Can manage other users, finalize reports, configure settings.
- **`system_admin`**: (Reserved) For app maintenance. Must have `is_primary = true` and `role = 'admin'`.

### Admin Maintenance Login

**For app maintenance tasks** (update factors, clear test data, etc.):

1. Create a separate **system admin user** in Supabase with `role = 'admin'` and `is_primary = true`
2. Log in with that account
3. System detects `is_system_admin()` = true → grants admin dashboard access
4. All admin actions are logged in `admin_audit_log` table

**Permission Check:**
```sql
-- User is system admin if:
SELECT EXISTS(
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid() AND role = 'admin' AND is_primary = true
);
```

---

## Row-Level Security (RLS)

All tables have RLS enabled. Users can **only** access data they own:

### Example: Activity Records

```sql
CREATE POLICY "Users can access their organization's activity records"
  ON public.activity_records
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  );
```

**Effect:** A user can only see activity records from organizations they belong to.

### Emission Factors (Public Read)

Exception: All active emission factors are **publicly readable** so any user can query them.

```sql
CREATE POLICY "Anyone can read active emission factors"
  ON public.emission_factors
  FOR SELECT
  USING (
    source_id IN (SELECT id FROM public.factor_sources WHERE is_active = true)
  );
```

---

## Emission Factor Integration

### Data Sources (Tier Strategy)

| Tier | Provider | Coverage | Status |
|------|----------|----------|--------|
| **1** | ADEME (France) | FR | Direct API integration planned |
| **1** | MITECO (Spain) | ES | Direct API integration planned |
| **1** | EPA (Ireland) | IE | WFS endpoint |
| **2** | Climatiq | EU27 | Free API (aggregator) |
| **3** | Local Cache | EU27 | Fallback (SQL seeding) |

### Current Seed Data

Migration `20260411000300_seed_emission_factors.sql` pre-populates:

- ✅ ADEME factors (FR): natural gas, heating oil, electricity, car fuel
- ✅ MITECO factors (ES): electricity, gas, diesel
- ✅ EEA grid factors: All EU27 countries (via Climatiq)
- ✅ Business travel factors: flights, trains, hotels
- ✅ Freight factors: road, rail, sea tonne-km
- ✅ Supply chain (spend-based): raw materials, packaging, IT equipment

### How Calculation Works

1. User enters: `1000 kWh electricity, Spain`
2. API queries:
   ```sql
   SELECT * FROM emission_factors 
   WHERE activity_type = 'electricity' 
   AND unit = 'kWh' 
   AND region IN ('ES', 'EU')  -- Country-first, then EU-wide fallback
   AND effective_date <= NOW();
   ```
3. Uses most specific factor (ES > EU)
4. Calculates: 1000 kWh * 0.371 kgCO2e/kWh = 371 kgCO2e

---

## API Endpoints (To Be Implemented)

### Structure

```
POST /auth/signup                    # Register new user
POST /auth/login                     # Email + password login
POST /auth/logout                    # Revoke JWT
POST /auth/password-reset            # Send reset email
GET  /auth/me                        # Get current user profile

POST /organizations                  # Create new organization
GET  /organizations/:id              # Get org (RLS protected)
PUT  /organizations/:id              # Update org
GET  /organizations/:id/users        # List org members
POST /organizations/:id/invite       # Invite user

POST /reporting-periods              # Create reporting period
GET  /reporting-periods/:id          # Get period

POST /activity-records               # Log energy/fuel usage
GET  /activity-records               # List records (RLS filtered)
PUT  /activity-records/:id           # Update record
DELETE /activity-records/:id         # Delete record

POST /calculations/scope1            # Trigger Scope 1 calculation
POST /calculations/scope2            # Trigger Scope 2 calculation
GET  /calculations/:id               # Get results

POST /reports/export                 # Generate Excel/PDF export
GET  /reports/:id                    # Get report snapshot

-- Emission Factors (Public)
GET  /emission-factors               # List factors (public, no RLS)
GET  /emission-factors?region=FR     # Filter by country

-- Admin Only
GET  /admin/audit-log                # View admin actions
POST /admin/factors/refresh          # Manually refresh from Climatiq
POST /admin/users/:id/approve        # Approve admin access request
```

---

## Database Migrations

Migrations are managed in `apps/api/supabase/migrations/`:

| File | Purpose |
|------|---------|
| `20260411000000_init_schema.sql` | Core tables + RLS + helper functions |
| `20260411000100_auth_and_admin.sql` | Auth setup + admin audit + MFA helpers |
| `20260411000200_extended_modules.sql` | Scope 3, targets, climate risk, suppliers |
| `20260411000300_seed_emission_factors.sql` | Pre-populate EU27 factors |

### Applying Migrations

```bash
# Push to Supabase cloud database
npm run db:push -w @carbontrackai/api

# Create new migration
npm run db:migrate -w @carbontrackai/api
```

---

## Environment Variables

See `apps/api/.env.local` for local configuration:

```
SUPABASE_URL=https://qkpxtlfoidvgpyrocqej.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
CLIMATIQ_API_KEY=    # To be added
```

- **ANON_KEY**: Used by frontend. Limited to RLS-protected queries.
- **SERVICE_ROLE_KEY**: Admin key for backend. Bypasses RLS (use carefully).

---

## Security Best Practices

1. ✅ **RLS enabled** on all tables → users can't query data they don't own
2. ✅ **JWT tokens** handled by Supabase → no password storage in app
3. ✅ **Admin audit log** → all admin actions tracked
4. ✅ **Login audit** → detect suspicious activity
5. ⚠️ **Service role key** → never expose in frontend code
6. ⚠️ **Rate limiting** → add at API gateway level (to be implemented)

---

## Next Steps

1. **Implement Fastify API** (scaffold with Prisma setup)
2. **Integrate Climatiq API** for real-time factor updates
3. **Build Excel import/export** with validation
4. **Add timezone-aware calculations** (for multi-country reports)
5. **Configure webhooks** for external factor updates
6. **Set up automated tests** with test database

---

## Support Resources

- Supabase Docs: https://supabase.com/docs
- PostgreSQL Docs: https://www.postgresql.org/docs/
- VSME Directive: https://ec.europa.eu/info/business-economy-euro_en
- Climatiq API: https://docs.climatiq.io/
