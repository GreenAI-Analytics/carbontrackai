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

export interface IroRecord {
  id?: string;
  assessment_id: string;
  iro_type: IroType;
  direction: IroDirection;
  topic: string;                  // e.g. "E1"
  subtopic?: string;
  title: string;
  description?: string;
  severity_scale?: number;        // 1–5
  likelihood_scale?: number;      // 1–5
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
// Scoring
// =============================================================================

/**
 * Calculate the impact materiality score for a negative impact.
 *
 * Based on ESRS 1.3.3: severity = scale × scope × irremediability
 * For this simplified SME version: severity = scale × scope
 * Combined with likelihood for potential impacts.
 *
 * @param severity  1–5 (scale of the impact)
 * @param likelihood 1–5 (probability, 1 = unlikely, 5 = almost certain)
 * @param isActual   If true, impact is already occurring (likelihood = 5)
 * @returns Impact materiality score (0–5)
 */
export function calculateImpactScore(
  severity: number,
  likelihood: number,
  isActual: boolean = false
): number {
  const effectiveLikelihood = isActual ? 5 : clamp(likelihood, 1, 5);
  const s = clamp(severity, 1, 5);
  // Score = sqrt(severity × likelihood) / 5 × 5 → normalised 0–5
  const raw = Math.sqrt(s * effectiveLikelihood);
  return round(clamp(raw, 0, 5), 2);
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
export const MATERIAL_THRESHOLD = 2.5;
export const HIGHLY_MATERIAL_THRESHOLD = 4.0;

export function classifyMateriality(score: number): MaterialityLevel {
  if (score < MATERIAL_THRESHOLD) return "not_material";
  if (score < HIGHLY_MATERIAL_THRESHOLD) return "material";
  return "highly_material";
}

/**
 * Compute all three scores for an IRO in one call.
 */
export function computeIroScores(
  iro: Pick<
    IroRecord,
    "iro_type" | "direction" | "severity_scale" | "likelihood_scale"
  >
): {
  impact_materiality_score: number;
  financial_materiality_score: number;
  double_materiality_score: number;
} {
  const severity = iro.severity_scale ?? 3;
  const likelihood = iro.likelihood_scale ?? 3;

  const isActual =
    iro.direction === "actual_negative" || iro.direction === "actual_positive";

  const impactScore =
    iro.iro_type === "impact"
      ? calculateImpactScore(severity, likelihood, isActual)
      : 0;

  const financialScore =
    iro.iro_type === "risk" || iro.iro_type === "opportunity"
      ? calculateFinancialScore(severity, likelihood)
      : 0;

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
export function buildMatrixData(iros: IroRecord[]): MaterialityMatrixPoint[] {
  return iros.map((iro) => {
    const impact = iro.impact_materiality_score ?? 0;
    const financial = iro.financial_materiality_score ?? 0;
    const doubleScore = iro.double_materiality_score ?? Math.max(impact, financial);

    let quadrant: MaterialityMatrixPoint["quadrant"];
    if (impact < MATERIAL_THRESHOLD && financial < MATERIAL_THRESHOLD) {
      quadrant = "not_material";
    } else if (impact >= MATERIAL_THRESHOLD && financial < MATERIAL_THRESHOLD) {
      quadrant = "impact";
    } else if (financial >= MATERIAL_THRESHOLD && impact < MATERIAL_THRESHOLD) {
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
  iros: IroRecord[]
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
    const level = classifyMateriality(score);
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
    severity_scale: 3,
    likelihood_scale: 3,
  };
}

/**
 * Default threshold config (can be overridden per assessment).
 */
export const DEFAULT_THRESHOLDS = {
  material: MATERIAL_THRESHOLD,
  highly_material: HIGHLY_MATERIAL_THRESHOLD,
} as const;
