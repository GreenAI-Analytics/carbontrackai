import { z } from "zod";

// ─── EU Country Codes ────────────────────────────────────────────────────────
const EU_COUNTRY_CODES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
] as const;

const SECTORS = [
  "Agriculture & Forestry", "Construction", "Education",
  "Energy & Utilities", "Finance & Insurance", "Food & Beverage",
  "Healthcare", "Hospitality & Tourism", "IT & Software",
  "Logistics & Transport", "Manufacturing", "Professional Services",
  "Real Estate", "Retail & Wholesale", "Other",
] as const;

const ACTIVITY_TYPES = [
  "natural_gas", "heating_oil", "diesel_car_fuel", "petrol_car_fuel",
  "electricity", "district_heating", "lpg", "wood_pellets",
] as const;

// ─── API Route Schemas ───────────────────────────────────────────────────────

export const whistleblowerSchema = z.object({
  orgRef: z.string().max(200).optional(),
  reportType: z.enum(["fraud", "harassment", "environmental", "safety", "discrimination", "other"]).optional(),
  description: z.string().min(20, "Description must be at least 20 characters").max(10000),
  contact: z.string().max(200).optional(),
});

export const checkoutSchema = z.object({
  planType: z.enum(["vsme_basic", "vsme_comprehensive", "csrd"]),
  orgId: z.string().uuid(),
  userId: z.string().uuid(),
  email: z.string().email().optional(),
});

export const portalSchema = z.object({
  orgId: z.string().uuid(),
});

// ─── Activity Data ───────────────────────────────────────────────────────────

export const activityRecordSchema = z.object({
  activityType: z.enum(ACTIVITY_TYPES),
  quantity: z.number().positive("Quantity must be positive").max(1_000_000_000),
  month: z.number().int().min(1).max(12).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const activityUpdateSchema = z.object({
  quantity: z.number().positive().max(1_000_000_000).optional(),
  month: z.number().int().min(1).max(12).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

// ─── Organization ────────────────────────────────────────────────────────────

export const onboardingSchema = z.object({
  orgName: z.string().min(1, "Organisation name is required").max(200),
  countryCode: z.enum(EU_COUNTRY_CODES),
  sector: z.enum(SECTORS),
  headcount: z.number().int().min(0).max(1_000_000).optional(),
  annualTurnover: z.number().min(0).max(1_000_000_000_000).optional(),
  annualBalanceSheet: z.number().min(0).max(1_000_000_000_000).optional(),
  isListed: z.boolean().optional(),
  isSubsidiary: z.boolean().optional(),
  hasDataRequests: z.boolean().optional(),
});

export const orgSettingsSchema = z.object({
  name: z.string().min(1).max(200),
  country_code: z.enum(EU_COUNTRY_CODES),
  sector: z.enum(SECTORS),
  base_year: z.number().int().min(2000).max(2100),
  headcount: z.number().int().min(0).max(1_000_000).nullable().optional(),
  annual_turnover: z.number().min(0).max(1_000_000_000_000).nullable().optional(),
  annual_balance_sheet: z.number().min(0).max(1_000_000_000_000).nullable().optional(),
  consolidation_approach: z.enum(["operational", "equity", "financial"]).nullable().optional(),
});

// ─── Contractual Instruments ─────────────────────────────────────────────────

export const contractualInstrumentSchema = z.object({
  instrument_type: z.enum(["goo", "ppa", "rec", "other"]),
  description: z.string().max(200).optional(),
  mwh_covered: z.number().positive().max(1_000_000_000),
  certificate_id: z.string().max(100).optional(),
  supplier: z.string().max(200).optional(),
  country: z.enum(EU_COUNTRY_CODES).optional(),
  vintage_year: z.number().int().min(2000).max(2100).optional(),
});

// ─── Materiality IRO ─────────────────────────────────────────────────────────

export const materialityIroSchema = z.object({
  topic: z.string().min(1).max(200),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  esrs_reference: z.string().max(50).optional(),
  pillar: z.enum(["environmental", "social", "governance"]),
  impact_materiality_score: z.number().min(0).max(5).optional(),
  financial_materiality_score: z.number().min(0).max(5).optional(),
  double_materiality_score: z.number().min(0).max(10).optional(),
  time_horizon: z.enum(["short", "medium", "long"]).optional(),
  value_chain_stage: z.enum(["upstream", "own_operations", "downstream"]).optional(),
});

// ─── Type exports ────────────────────────────────────────────────────────────

export type WhistleblowerInput = z.infer<typeof whistleblowerSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type PortalInput = z.infer<typeof portalSchema>;
export type ActivityRecordInput = z.infer<typeof activityRecordSchema>;
export type ActivityUpdateInput = z.infer<typeof activityUpdateSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type OrgSettingsInput = z.infer<typeof orgSettingsSchema>;
export type ContractualInstrumentInput = z.infer<typeof contractualInstrumentSchema>;
export type MaterialityIroInput = z.infer<typeof materialityIroSchema>;

// ─── API Route Helper ────────────────────────────────────────────────────────

/** Parse and validate JSON body against a zod schema. Returns parsed data or a 400 error Response. */
export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): { success: true; data: T } | { success: false; error: Response } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      success: false,
      error: new Response(
        JSON.stringify({
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      ),
    };
  }
  return { success: true, data: result.data };
}
