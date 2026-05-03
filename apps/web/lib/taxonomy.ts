// ============================================================================
// CarbonTrackAI — EU Taxonomy Computation Engine
// Computes eligibility, alignment, and KPI percentages per EU Taxonomy Regulation
// and the SME-proportionate flow under Omnibus I.
// ============================================================================

// ─── Types ────────────────────────────────────────────────────────────────────

export type AssessmentDepth = "eligibility_only" | "partial_alignment" | "full_alignment";

export interface TaxonomyActivity {
  id?: string;
  nace_code: string;
  activity_description: string;
  substantial_contribution_met: boolean;
  dnsh_met: boolean;
  minimum_safeguards_met: boolean;
  turnover_percentage?: number | null;
  capex_percentage?: number | null;
  opex_percentage?: number | null;
}

export interface TaxonomySnapshot {
  totalActivities: number;
  eligibleCount: number;
  eligiblePct: number;
  alignedCount: number;         // fully aligned (SC + DNSH + MS)
  alignedPct: number;
  partiallyAlignedCount: number; // SC only
  // KPIs
  turnoverAlignedPct: number;
  capexAlignedPct: number;
  opexAlignedPct: number;
  turnoverEligiblePct: number;
  capexEligiblePct: number;
  opexEligiblePct: number;
  // GAR-like breakdown
  byObjective: Record<string, { eligible: number; aligned: number }>;
}

// ─── NACE macro-categories for quick reference ────────────────────────────────

export const TAXONOMY_OBJECTIVES = [
  "Climate change mitigation",
  "Climate change adaptation",
  "Water and marine resources",
  "Circular economy",
  "Pollution prevention",
  "Biodiversity and ecosystems",
] as const;

// Common NACE codes with taxonomy-eligible activities (non-exhaustive SME reference)
export const COMMON_ELIGIBLE_NACE: Record<string, string> = {
  "A01": "Agriculture & forestry",
  "C20": "Chemicals manufacturing",
  "C24": "Basic metals",
  "C25": "Fabricated metal products",
  "C27": "Electrical equipment",
  "C28": "Machinery & equipment",
  "C29": "Motor vehicles",
  "D35": "Electricity, gas, steam",
  "E36": "Water collection & treatment",
  "E38": "Waste collection & treatment",
  "F41": "Construction of buildings",
  "F42": "Civil engineering",
  "F43": "Specialised construction",
  "H49": "Land transport",
  "H50": "Water transport",
  "H52": "Warehousing & support",
  "J61": "Telecommunications",
  "J62": "Computer programming",
  "M71": "Architecture & engineering",
  "M72": "Scientific R&D",
};

// ─── Computation ──────────────────────────────────────────────────────────────

function safeNum(v: number | null | undefined): number {
  return v ?? 0;
}

export function computeTaxonomySnapshot(
  activities: TaxonomyActivity[],
  depth: AssessmentDepth = "full_alignment",
): TaxonomySnapshot {
  const total = activities.length;
  const eligible = activities; // all entered activities are assumed eligible for the SME's sector

  // Alignment definitions by depth
  const isAligned = (a: TaxonomyActivity): boolean => {
    switch (depth) {
      case "eligibility_only":
        return true; // just being in the list counts
      case "partial_alignment":
        return a.substantial_contribution_met;
      case "full_alignment":
        return a.substantial_contribution_met && a.dnsh_met && a.minimum_safeguards_met;
    }
  };

  const alignedActivities = activities.filter(isAligned);
  const scOnly = activities.filter((a) => a.substantial_contribution_met && !(a.dnsh_met && a.minimum_safeguards_met));

  // KPI percentages (turnover, CapEx, OpEx)
  const turnoverEligible = activities.reduce((s, a) => s + safeNum(a.turnover_percentage), 0);
  const turnoverAligned = alignedActivities.reduce((s, a) => s + safeNum(a.turnover_percentage), 0);
  const capexEligible = activities.reduce((s, a) => s + safeNum(a.capex_percentage), 0);
  const capexAligned = alignedActivities.reduce((s, a) => s + safeNum(a.capex_percentage), 0);
  const opexEligible = activities.reduce((s, a) => s + safeNum(a.opex_percentage), 0);
  const opexAligned = alignedActivities.reduce((s, a) => s + safeNum(a.opex_percentage), 0);

  return {
    totalActivities: total,
    eligibleCount: eligible.length,
    eligiblePct: total > 0 ? round((eligible.length / total) * 100, 1) : 0,
    alignedCount: alignedActivities.length,
    alignedPct: total > 0 ? round((alignedActivities.length / total) * 100, 1) : 0,
    partiallyAlignedCount: scOnly.length,
    turnoverAlignedPct: turnoverAligned,
    capexAlignedPct: capexAligned,
    opexAlignedPct: opexAligned,
    turnoverEligiblePct: turnoverEligible,
    capexEligiblePct: capexEligible,
    opexEligiblePct: opexEligible,
    byObjective: {},
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

/** Get a human-readable label for a NACE code */
export function getNaceLabel(code: string): string {
  return COMMON_ELIGIBLE_NACE[code] ?? `NACE ${code}`;
}
