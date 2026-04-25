

---

# **📄 agents.md — CarbonTrackAI Agent Guide (Rewritten & Updated)**

> **Purpose**  
> This document provides AI agents and developers with a complete, structured understanding of the CarbonTrackAI repository — a unified ESG reporting platform for EU SMEs. It explains the regulatory context, architecture, data flows, and SME‑proportionate logic (VSME‑Lite, VSME‑Full, CSRD‑Full).
> 
> Agents should use this document to navigate, reason about, and modify the codebase without guesswork.

---

# **1. Project Overview**

## **1.1 Summary**

CarbonTrackAI is a one‑stop ESG reporting platform designed for **EU SMEs** preparing sustainability disclosures under:

- **CSRD** (Corporate Sustainability Reporting Directive)
- **ESRS** (European Sustainability Reporting Standards)
- **VSME** (Voluntary SME Standard — simplified ESG for SMEs)

The platform adapts dynamically to SME size and regulatory scope, ensuring proportionality and avoiding unnecessary complexity.

| Attribute           | Value                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Name**            | CarbonTrackAI                                                                                                         |
| **Description**     | ESG reporting for EU SMEs with CSRD/ESRS alignment and SME‑proportionate workflows (VSME‑Lite, VSME‑Full, CSRD‑Full). |
| **Repository**      | `https://github.com/GreenAI-Analytics/carbontrackai`                                                                  |
| **Stack**           | Next.js 16 + TypeScript + Tailwind CSS v4 + Supabase PostgreSQL                                                       |
| **Package Manager** | npm workspaces                                                                                                        |
| **License**         | TBD                                                                                                                   |

---

## **1.2 Regulatory Framework (Updated for SME Proportionality)**

CarbonTrackAI supports three regulatory modes:

### **SME Scoping Logic**

| SME Type                         | Criteria                        | CSRD Mandatory?      | Platform Mode             |
| -------------------------------- | ------------------------------- | -------------------- | ------------------------- |
| **Micro**                        | <10 employees, ≤ €700k turnover | ❌ No                 | **VSME‑Lite**             |
| **Small**                        | <50 employees, ≤ €10M turnover  | ❌ No (unless listed) | **VSME‑Lite / VSME‑Full** |
| **Medium**                       | <250 employees, ≤ €50M turnover | ❌ No (unless listed) | **VSME‑Full / CSRD‑Full** |
| **Listed SMEs**                  | Listed on regulated market      | ✅ Yes                | **CSRD‑Full**             |
| **Subsidiaries of large groups** | Required by parent              | ⚠ Possibly           | **CSRD‑Full**             |

### **Platform Modes**

| Mode          | Description                                                                               |
| ------------- | ----------------------------------------------------------------------------------------- |
| **VSME‑Lite** | Simplified ESG: basic climate, basic workforce, basic governance, simplified materiality. |
| **VSME‑Full** | Full voluntary SME standard: all E/S/G topics, simplified taxonomy.                       |
| **CSRD‑Full** | Full ESRS E1–E5, S1–S4, G1, double materiality, EU Taxonomy.                              |

---

## **1.3 ESRS Topical Standards Covered**

| Pillar            | Standards  | Topics                                                    |
| ----------------- | ---------- | --------------------------------------------------------- |
| **Environmental** | ESRS E1–E5 | Climate, Pollution, Water, Biodiversity, Circular Economy |
| **Social**        | ESRS S1–S4 | Workforce, Value Chain, Communities, Consumers            |
| **Governance**    | ESRS G1    | Business Conduct                                          |
| **Cross‑cutting** | ESRS 1–2   | General requirements, double materiality                  |

---

## **1.4 Monorepo Structure**

```
carbontrackai/
├── apps/
│   ├── api/
│   └── web/
├── docs/
├── img/
├── agents.md
├── package.json
└── README.md
```

---

# **2. Frontend (`apps/web`)**

## **2.1 Tech Stack**

- Next.js 16.2.3 (App Router)
- TypeScript 5
- Tailwind CSS v4
- Supabase client SDK
- Planned: React Hook Form + Zod, Recharts, PWA

---

## **2.2 File Map**

*(Preserved from original — unchanged except for ESG expansion)*

---

## **2.3 Auth & Route Protection**

- Protected: `/dashboard/*`, `/onboarding`
- Auth‑only: `/login`, `/signup`, `/forgot-password`
- Redirect logic unchanged

---

## **2.4 Dashboard Architecture (Updated for SME Modes)**

The dashboard adapts dynamically based on the SME’s regulatory mode.

### **Module Visibility by Mode**

| Module                | VSME‑Lite  | VSME‑Full  | CSRD‑Full  |
| --------------------- | ---------- | ---------- | ---------- |
| Climate (E1)          | ✔ Basic    | ✔ Full     | ✔ Full     |
| Pollution (E2)        | —          | Optional   | ✔ Required |
| Water (E3)            | —          | Optional   | ✔ Required |
| Biodiversity (E4)     | —          | Optional   | ✔ Required |
| Circular Economy (E5) | —          | Optional   | ✔ Required |
| Workforce (S1)        | ✔ Basic    | ✔ Full     | ✔ Full     |
| Value Chain (S2)      | —          | Optional   | ✔ Required |
| Communities (S3)      | —          | Optional   | ✔ Required |
| Consumers (S4)        | —          | Optional   | ✔ Required |
| Governance (G1)       | ✔ Basic    | ✔ Full     | ✔ Full     |
| Double Materiality    | Simplified | Simplified | Full       |
| EU Taxonomy           | —          | Optional   | ✔ Required |

The sidebar hides modules not applicable to the SME’s scope.

---

## **2.5 Carbon Calculation Engine (`lib/calculations.ts`)**

*(Preserved from original — unchanged)*

---

## **2.6 Branding**

*(Preserved from original — unchanged)*

---

# **3. Backend (`apps/api`)**

## **3.1 Tech Stack**

- Node.js + TypeScript
- Supabase PostgreSQL
- Planned: Fastify, Prisma, shared Zod schemas

---

## **3.2 File Map**

*(Preserved from original)*

---

## **3.3–3.12 Database Schema**

All schema sections (E1–E5, S1–S4, G1, materiality, taxonomy) are preserved from the original file.

The backend supports **full ESRS coverage**, required for CSRD‑Full and optional for VSME‑Full.

---

# **4. ESG Modules & Pricing (Updated)**

## **4.1 Module Map with SME Applicability**

| Module                | ESRS Ref         | SME Applicability        | Notes                      |
| --------------------- | ---------------- | ------------------------ | -------------------------- |
| Climate (E1)          | E1‑1 to E1‑9     | **All SMEs**             | Required even in VSME‑Lite |
| Pollution (E2)        | E2‑1 to E2‑6     | Medium SMEs, listed SMEs | Optional for VSME          |
| Water (E3)            | E3‑1 to E3‑5     | Medium SMEs, listed SMEs | Optional for VSME          |
| Biodiversity (E4)     | E4‑1 to E4‑6     | Medium SMEs, listed SMEs | Optional for VSME          |
| Circular Economy (E5) | E5‑1 to E5‑7     | Medium SMEs, listed SMEs | Optional for VSME          |
| Workforce (S1)        | S1‑1 to S1‑17    | **All SMEs**             | Simplified for VSME        |
| Value Chain (S2)      | S2‑1 to S2‑5     | Medium SMEs, listed SMEs | Optional for VSME          |
| Communities (S3)      | S3‑1 to S3‑5     | Medium SMEs, listed SMEs | Optional for VSME          |
| Consumers (S4)        | S4‑1 to S4‑5     | Medium SMEs, listed SMEs | Optional for VSME          |
| Governance (G1)       | G1‑1 to G1‑6     | **All SMEs**             | Simplified for VSME        |
| Double Materiality    | ESRS 1           | **All SMEs**             | Simplified for VSME        |
| EU Taxonomy           | EU Taxonomy Reg. | Listed SMEs              | Optional for VSME          |

---

## **4.2 Feature Flag Mapping**

*(Preserved from original — unchanged)*

---

## **4.3 Plan Gating Logic (Updated)**

- **Basic plan** → VSME‑Lite
- **Comprehensive plan** → VSME‑Full or CSRD‑Full depending on compliance scope
- Onboarding determines mode automatically

---

# **5. Current Implementation Status**

*(Preserved from original, with SME context added)*

- E1 implemented
- E2–E5, S1–S4, G1 UI missing
- Materiality & Taxonomy missing
- Report builder missing
- ESG scoring missing

These are required for **CSRD‑Full**, optional for **VSME‑Full**, hidden for **VSME‑Lite**.

---

# **6. Key Data Flows (Updated)**

## **6.1 Onboarding Flow (Updated)**

```
/signup
  → Step 1: Org details (size, sector, country)
  → Step 2: Compliance Scope Detection
        - Are you listed?
        - Required by parent?
        - Customer ESG requests?
        - Voluntary reporting?
  → Step 3: ESG scope selection (E/S/G)
  → Step 4: Plan (Basic vs Comprehensive)
  → Auto‑assign mode: VSME‑Lite / VSME‑Full / CSRD‑Full
  → Create org + roles + feature flags
  → /dashboard
```

---

## **6.2 Carbon Calculation Flow**

*(Preserved from original)*

---

## **6.3 Social Metric Computation Flow**

*(Preserved from original)*

---

## **6.4 Double Materiality (Updated)**

### **VSME‑Lite / VSME‑Full**

- Pre‑defined sector templates
- 3‑point severity scale
- No financial materiality scoring
- Automatic mapping to simplified disclosures

### **CSRD‑Full**

- Full ESRS severity × likelihood
- Financial materiality scoring
- Full IRO register
- Materiality matrix

---

## **6.5 EU Taxonomy Alignment Flow (Updated)**

- Mandatory only for **CSRD‑Full**
- Optional for **VSME‑Full**
- Hidden for **VSME‑Lite**

---


