/**
 * @file materiality.ts
 * @description Double Materiality Assessment Engine
 *
 * Implements ESRS 1 (Chapter 3) double materiality logic:
 *   - Impact materiality: assessment of the undertaking's actual/potential impacts
 *   - Financial materiality: assessment of risks/opportunities affecting financial value
 *   - Double materiality = the union of impact and financial materiality
 *
 * Database tables consumed:
 *   - materiality_assessments (assessment metadata, status)
 *   - materiality_iro (impacts, risks, opportunities register)
 *   - stakeholder_engagement (stakeholder input per IRO)
 *
 * See migration 20260411000800_esg_double_materiality_schema.sql
 */

// =============================================================================
// Types
// =============================================================================

export type IroType = "impact" | "risk" | "opportunity";

export type IroDirection =
  | "actual_negative"
  | "potential_negative"
  | "actual_positive"
  | "potential_positive"
  | "financial_risk"
  | "financial_opportunity";

export type MaterialityStatus = "draft" | "in_progress" | "completed" | "reviewed";

export type MaterialityLevel = "not_material" | "material" | "highly_material";

/** ESRS 1 para 43, IRO-1 required: time horizon for each IRO */
export type TimeHorizon = "short" | "medium" | "long";

/** ESRS 2 SBM-3 required: where in the value chain the IRO occurs */
export type ValueChainLocation = "upstream" | "own_operations" | "downstream" | "multiple";

export type EsrsPillar = "E" | "S" | "G";

export interface EsrsSubtopic {
  id: string;
  label: string;
  description: string;
}

export interface EsrsTopic {
  id: string;                     // e.g. "E1"
  standard: string;               // e.g. "ESRS E1"
  label: string;                  // e.g. "Climate Change"
  pillar: EsrsPillar;
  description: string;
  subtopics: EsrsSubtopic[];
}

/** Per-assessment materiality threshold configuration (ESRS 1 para 44) */
export interface MaterialityThresholdConfig {
  material: number;         // threshold above which a topic is material
  highly_material: number;  // threshold above which a topic is highly material
  rationale: string;        // entity must disclose why this threshold was chosen (ESRS 1 para 44)
}

export interface IroRecord {
  id?: string;
  assessment_id: string;
  iro_type: IroType;
  direction: IroDirection;
  topic: string;                  // e.g. "E1"
  subtopic?: string;
  title: string;
  description?: string;
  // ── Legacy fields (deprecated; kept for backward compat) ──
  severity_scale?: number;        // @deprecated — use scale_score, scope_score, irremediability_score
  likelihood_scale?: number;      // @deprecated — use likelihood_score

  // ── ESRS-compliant impact materiality scoring (ESRS 1 para 43) ──
  scale_score?: number;           // 1–5: how grave the impact is
  scope_score?: number;           // 1–5: how widespread the impact is
  irremediability_score?: number; // 1–5: how hard to reverse (negative impacts only)
  likelihood_score?: number;      // 1–5: probability (1=unlikely, 5=almost certain)

  // ── ESRS-compliant financial materiality scoring (ESRS 1 para 47) ──
  magnitude_score?: number;       // 1–5: size of financial effect
  financial_likelihood_score?: number; // 1–5: probability of financial effect

  // ── ESRS-required metadata (ESRS 2 IRO-1, SBM-3) ──
  time_horizon?: TimeHorizon;             // short (<1y), medium (1–5y), long (>5y)
  value_chain_location?: ValueChainLocation; // upstream, own_operations, downstream, multiple
  affected_stakeholders?: string[];        // stakeholder groups affected
  severity_rationale?: string;             // narrative justifying severity scores
  financial_rationale?: string;            // narrative justifying financial scores

  // ── Computed scores ──
  financial_materiality_score?: number;  // 0–5 (computed or manual)
  impact_materiality_score?: number;     // 0–5 (computed)
  double_materiality_score?: number;     // 0–5 (derived)

  stakeholder_input?: string;
  notes?: string;
}

export interface MaterialityMatrixPoint {
  label: string;
  topic: string;
  iro_type: IroType;
  impact_score: number;           // x-axis
  financial_score: number;        // y-axis
  double_score: number;
  quadrant: "not_material" | "impact" | "financial" | "double";
}

export interface MaterialitySummary {
  assessment_id: string;
  status: MaterialityStatus;
  total_iros: number;
  material_topics: string[];      // list of topic IDs deemed material
  highly_material_topics: string[];
  matrix_data: MaterialityMatrixPoint[];
  completion_pct: number;
}

// =============================================================================
// ESRS Topic Registry
// =============================================================================

export const ESRS_TOPICS: EsrsTopic[] = [
  {
    id: "E1",
    standard: "ESRS E1",
    label: "Climate Change",
    pillar: "E",
    description: "Climate change mitigation and adaptation, energy consumption",
    subtopics: [
      { id: "E1-1", label: "Climate transition plan", description: "Transition plan for climate change mitigation" },
      { id: "E1-2", label: "GHG emissions", description: "Scope 1, 2, and 3 greenhouse gas emissions" },
      { id: "E1-3", label: "Energy consumption", description: "Energy mix and efficiency" },
      { id: "E1-4", label: "Climate risks", description: "Physical and transition risks" },
    ],
  },
  {
    id: "E2",
    standard: "ESRS E2",
    label: "Pollution",
    pillar: "E",
    description: "Pollution of air, water, and soil; hazardous substances",
    subtopics: [
      { id: "E2-1", label: "Air pollution", description: "Emissions to air (NOx, SOx, PM, etc.)" },
      { id: "E2-2", label: "Water pollution", description: "Emissions to water" },
      { id: "E2-3", label: "Soil pollution", description: "Contamination of soil" },
      { id: "E2-4", label: "Hazardous substances", description: "Use and management of hazardous substances" },
    ],
  },
  {
    id: "E3",
    standard: "ESRS E3",
    label: "Water & Marine Resources",
    pillar: "E",
    description: "Water consumption, water withdrawals, marine resource impacts",
    subtopics: [
      { id: "E3-1", label: "Water consumption", description: "Water usage and intensity" },
      { id: "E3-2", label: "Water discharges", description: "Water effluents and treatment" },
      { id: "E3-3", label: "Marine resources", description: "Impacts on marine ecosystems" },
    ],
  },
  {
    id: "E4",
    standard: "ESRS E4",
    label: "Biodiversity & Ecosystems",
    pillar: "E",
    description: "Biodiversity loss, ecosystem degradation, restoration",
    subtopics: [
      { id: "E4-1", label: "Ecosystem impacts", description: "Direct impacts on ecosystems" },
      { id: "E4-2", label: "Land use", description: "Land footprint and land-use change" },
      { id: "E4-3", label: "Species impacts", description: "Impacts on species diversity" },
    ],
  },
  {
    id: "E5",
    standard: "ESRS E5",
    label: "Circular Economy",
    pillar: "E",
    description: "Resource inflows, waste management, circular design",
    subtopics: [
      { id: "E5-1", label: "Resource inflows", description: "Material consumption and circular material use" },
      { id: "E5-2", label: "Waste", description: "Waste generation and management" },
      { id: "E5-3", label: "Product circularity", description: "Circular design and end-of-life" },
    ],
  },
  {
    id: "S1",
    standard: "ESRS S1",
    label: "Own Workforce",
    pillar: "S",
    description: "Working conditions, health & safety, diversity, training",
    subtopics: [
      { id: "S1-1", label: "Working conditions", description: "Employment security, working time, wages" },
      { id: "S1-2", label: "Health & safety", description: "Workplace accidents, occupational health" },
      { id: "S1-3", label: "Diversity & inclusion", description: "Gender equality, equal opportunity" },
      { id: "S1-4", label: "Training & development", description: "Skills development, career progression" },
    ],
  },
  {
    id: "S2",
    standard: "ESRS S2",
    label: "Value Chain Workers",
    pillar: "S",
    description: "Working conditions in the supply chain",
    subtopics: [
      { id: "S2-1", label: "Supply chain working conditions", description: "Labour rights in the supply chain" },
      { id: "S2-2", label: "Child & forced labour", description: "Prevention of child and forced labour" },
    ],
  },
  {
    id: "S3",
    standard: "ESRS S3",
    label: "Affected Communities",
    pillar: "S",
    description: "Impacts on local communities",
    subtopics: [
      { id: "S3-1", label: "Community engagement", description: "Relations with local communities" },
      { id: "S3-2", label: "Community impacts", description: "Economic, social, and cultural impacts" },
    ],
  },
  {
    id: "S4",
    standard: "ESRS S4",
    label: "Consumers & End-Users",
    pillar: "S",
    description: "Consumer protection, privacy, product safety",
    subtopics: [
      { id: "S4-1", label: "Product safety", description: "Health and safety of products" },
      { id: "S4-2", label: "Data privacy", description: "Personal data protection" },
      { id: "S4-3", label: "Consumer engagement", description: "Accessibility, information, complaints" },
    ],
  },
  {
    id: "G1",
    standard: "ESRS G1",
    label: "Business Conduct",
    pillar: "G",
    description: "Business ethics, anti-corruption, compliance",
    subtopics: [
      { id: "G1-1", label: "Business ethics", description: "Anti-corruption, anti-bribery" },
      { id: "G1-2", label: "Compliance", description: "Regulatory compliance and disclosures" },
      { id: "G1-3", label: "Data governance", description: "Data protection and cybersecurity" },
    ],
  },
];

// =============================================================================
// Lookup helpers
// =============================================================================

/** Find an ESRS topic by its ID (e.g. "E1", "S2"). */
export function getTopicById(id: string): EsrsTopic | undefined {
  return ESRS_TOPICS.find((t) => t.id === id);
}

/** Find a subtopic by its ID (e.g. "E1-2", "S1-3"). */
export function getSubtopicById(id: string): EsrsSubtopic | undefined {
  for (const topic of ESRS_TOPICS) {
    const sub = topic.subtopics.find((s) => s.id === id);
    if (sub) return sub;
  }
  return undefined;
}

/** Get all topics for a given pillar. */
export function getTopicsByPillar(pillar: EsrsPillar): EsrsTopic[] {
  return ESRS_TOPICS.filter((t) => t.pillar === pillar);
}

// =============================================================================
// Scoring — ESRS 1-compliant (scale × scope × irremediability for negative,
// scale × scope for positive; per-entity thresholds with rationale)
// =============================================================================

/**
 * Calculate negative impact severity per ESRS 1 para 43.
 * Severity = scale × scope × irremediability (normalised to 0–5).
 */
export function calculateNegativeImpactScore(
  scale: number,
  scope: number,
  irremediability: number,
  likelihood: number,
  isActual: boolean = false
): number {
  const s = clamp(scale, 1, 5);
  const sc = clamp(scope, 1, 5);
  const ir = clamp(irremediability, 1, 5);
  const effectiveLikelihood = isActual ? 5 : clamp(likelihood, 1, 5);
  const severityRaw = (s * sc * ir) / 25;
  const severity = clamp(severityRaw, 0, 5);
  const raw = Math.sqrt(severity * effectiveLikelihood);
  return round(clamp(raw, 0, 5), 2);
}

/**
 * Calculate positive impact severity per ESRS 1 para 47.
 * Severity = scale × scope (no irremediability for positive impacts).
 */
export function calculatePositiveImpactScore(
  scale: number,
  scope: number,
  likelihood: number,
  isActual: boolean = false
): number {
  const s = clamp(scale, 1, 5);
  const sc = clamp(scope, 1, 5);
  const effectiveLikelihood = isActual ? 5 : clamp(likelihood, 1, 5);
  const severity = clamp((s * sc) / 5, 0, 5);
  const raw = Math.sqrt(severity * effectiveLikelihood);
  return round(clamp(raw, 0, 5), 2);
}

/** @deprecated Use calculateNegativeImpactScore or calculatePositiveImpactScore */
export function calculateImpactScore(
  severity: number,
  likelihood: number,
  isActual: boolean = false
): number {
  return calculateNegativeImpactScore(severity, 3, 3, likelihood, isActual);
}

/**
 * Calculate the financial materiality score for a risk or opportunity.
 *
 * Based on ESRS 1.3.4: financial magnitude × likelihood
 *
 * @param magnitude  1–5 (financial effect size)
 * @param likelihood 1–5 (probability)
 * @returns Financial materiality score (0–5)
 */
export function calculateFinancialScore(
  magnitude: number,
  likelihood: number
): number {
  const m = clamp(magnitude, 1, 5);
  const l = clamp(likelihood, 1, 5);
  const raw = Math.sqrt(m * l);
  return round(clamp(raw, 0, 5), 2);
}

/**
 * Determine the double materiality score for an IRO.
 *
 * Double materiality = the higher of impact materiality and financial materiality.
 *
 * @param impactScore   Impact materiality score (0–5)
 * @param financialScore Financial materiality score (0–5)
 * @returns Double materiality score (0–5)
 */
export function calculateDoubleMaterialityScore(
  impactScore: number,
  financialScore: number
): number {
  return round(Math.max(impactScore, financialScore), 2);
}

/**
 * Classify a score into a materiality level.
 *
 * Thresholds (configurable):
 *   - < MATERIAL_THRESHOLD      → not_material
 *   - < HIGHLY_MATERIAL_THRESHOLD → material
 *   - ≥ HIGHLY_MATERIAL_THRESHOLD → highly_material
 */
/** Default thresholds (can be overridden per assessment — ESRS 1 para 44) */
export const DEFAULT_MATERIAL_THRESHOLD = 2.5;
export const DEFAULT_HIGHLY_MATERIAL_THRESHOLD = 4.0;

/** @deprecated Use DEFAULT_MATERIAL_THRESHOLD */
export const MATERIAL_THRESHOLD = DEFAULT_MATERIAL_THRESHOLD;
/** @deprecated Use DEFAULT_HIGHLY_MATERIAL_THRESHOLD */
export const HIGHLY_MATERIAL_THRESHOLD = DEFAULT_HIGHLY_MATERIAL_THRESHOLD;

/**
 * Classify a double-materiality score into a materiality level.
 * Uses per-assessment thresholds when provided (ESRS 1 para 44).
 */
export function classifyMateriality(
  score: number,
  thresholds?: MaterialityThresholdConfig
): MaterialityLevel {
  const matThreshold = thresholds?.material ?? DEFAULT_MATERIAL_THRESHOLD;
  const highThreshold = thresholds?.highly_material ?? DEFAULT_HIGHLY_MATERIAL_THRESHOLD;
  if (score < matThreshold) return "not_material";
  if (score < highThreshold) return "material";
  return "highly_material";
}

/**
 * Compute all three scores for an IRO in one call.
 */
export function computeIroScores(
  iro: Pick<
    IroRecord,
    "iro_type" | "direction" | "severity_scale" | "likelihood_scale"
      | "scale_score" | "scope_score" | "irremediability_score"
      | "likelihood_score" | "magnitude_score" | "financial_likelihood_score"
  >
): {
  impact_materiality_score: number;
  financial_materiality_score: number;
  double_materiality_score: number;
} {
  const isActual =
    iro.direction === "actual_negative" || iro.direction === "actual_positive";
  const isNegative =
    iro.direction === "actual_negative" || iro.direction === "potential_negative";

  let impactScore = 0;
  if (iro.iro_type === "impact") {
    // Use ESRS-compliant fields if available; fall back to legacy severity_scale/likelihood_scale
    if (iro.scale_score != null && iro.scope_score != null) {
      const likelihood = iro.likelihood_score ?? iro.likelihood_scale ?? 3;
      if (isNegative) {
        const irremediability = iro.irremediability_score ?? 3;
        impactScore = calculateNegativeImpactScore(
          iro.scale_score, iro.scope_score, irremediability, likelihood, isActual
        );
      } else {
        impactScore = calculatePositiveImpactScore(
          iro.scale_score, iro.scope_score, likelihood, isActual
        );
      }
    } else {
      // Legacy path
      const severity = iro.severity_scale ?? 3;
      const likelihood = iro.likelihood_scale ?? 3;
      impactScore = calculateImpactScore(severity, likelihood, isActual);
    }
  }

  let financialScore = 0;
  if (iro.iro_type === "risk" || iro.iro_type === "opportunity") {
    const magnitude = iro.magnitude_score ?? iro.severity_scale ?? 3;
    const likelihood = iro.financial_likelihood_score ?? iro.likelihood_scale ?? 3;
    financialScore = calculateFinancialScore(magnitude, likelihood);
  }

  return {
    impact_materiality_score: impactScore,
    financial_materiality_score: financialScore,
    double_materiality_score: calculateDoubleMaterialityScore(
      impactScore,
      financialScore
    ),
  };
}

// =============================================================================
// Matrix
// =============================================================================

/**
 * Build materiality matrix data from a list of IROs.
 *
 * Each point represents one IRO positioned on the matrix:
 *   - x-axis: impact materiality score
 *   - y-axis: financial materiality score
 *   - quadrant: determined by thresholds
 */
export function buildMatrixData(iros: IroRecord[], thresholds?: MaterialityThresholdConfig): MaterialityMatrixPoint[] {
  return iros.map((iro) => {
    const impact = iro.impact_materiality_score ?? 0;
    const financial = iro.financial_materiality_score ?? 0;
    const doubleScore = iro.double_materiality_score ?? Math.max(impact, financial);

    let quadrant: MaterialityMatrixPoint["quadrant"];
    const matThresh = thresholds?.material ?? DEFAULT_MATERIAL_THRESHOLD;
    if (impact < matThresh && financial < matThresh) {
      quadrant = "not_material";
    } else if (impact >= matThresh && financial < matThresh) {
      quadrant = "impact";
    } else if (financial >= matThresh && impact < matThresh) {
      quadrant = "financial";
    } else {
      quadrant = "double";
    }

    return {
      label: iro.title || `${iro.iro_type}: ${iro.topic}`,
      topic: iro.topic,
      iro_type: iro.iro_type,
      impact_score: impact,
      financial_score: financial,
      double_score: doubleScore,
      quadrant,
    };
  });
}

// =============================================================================
// Summary
// =============================================================================

/**
 * Generate a materiality summary from a list of IROs.
 *
 * Determines which ESRS topics are material based on their highest-scoring IRO,
 * and calculates overall completion percentage.
 */
export function generateSummary(
  assessmentId: string,
  status: MaterialityStatus,
  iros: IroRecord[],
  thresholds?: MaterialityThresholdConfig
): MaterialitySummary {
  const matrixData = buildMatrixData(iros);

  // Per-topic materiality: a topic is material if any of its IROs exceed threshold
  const topicScores = new Map<string, number>();
  for (const iro of iros) {
    const score = iro.double_materiality_score ?? 0;
    const existing = topicScores.get(iro.topic) ?? 0;
    if (score > existing) {
      topicScores.set(iro.topic, score);
    }
  }

  const materialTopics: string[] = [];
  const highlyMaterialTopics: string[] = [];

  for (const [topicId, score] of topicScores) {
    const level = classifyMateriality(score, thresholds);
    if (level === "material" || level === "highly_material") {
      materialTopics.push(topicId);
    }
    if (level === "highly_material") {
      highlyMaterialTopics.push(topicId);
    }
  }

  // Completion: based on whether each topic has at least one IRO assessed
  const totalTopics = ESRS_TOPICS.length;
  const assessedTopics = new Set(iros.map((i) => i.topic)).size;
  const completionPct = Math.round((assessedTopics / totalTopics) * 100);

  return {
    assessment_id: assessmentId,
    status,
    total_iros: iros.length,
    material_topics: materialTopics,
    highly_material_topics: highlyMaterialTopics,
    matrix_data: matrixData,
    completion_pct: completionPct,
  };
}

// =============================================================================
// Internal helpers
// =============================================================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// =============================================================================
// Supabase query helpers (for the frontend)
// =============================================================================

/**
 * Build a default IRO for a given topic to kickstart the assessment.
 */
export function createDefaultIro(
  assessmentId: string,
  topic: string
): IroRecord {
  return {
    assessment_id: assessmentId,
    iro_type: "impact",
    direction: "potential_negative",
    topic,
    title: `${getTopicById(topic)?.label ?? topic} — impact assessment`,
    scale_score: 3,
    scope_score: 3,
    irremediability_score: 3,
    likelihood_score: 3,
    magnitude_score: 3,
    financial_likelihood_score: 3,
    time_horizon: "medium",
    value_chain_location: "own_operations",
    // Legacy
    severity_scale: 3,
    likelihood_scale: 3,
  };
}

/**
 * Default threshold config (can be overridden per assessment).
 */
export const DEFAULT_THRESHOLDS: MaterialityThresholdConfig = {
  material: DEFAULT_MATERIAL_THRESHOLD,
  highly_material: DEFAULT_HIGHLY_MATERIAL_THRESHOLD,
  rationale: "Default threshold — entity should override with their own rationale per ESRS 1 para 44",
};
