// ============================================================================
// CarbonTrackAI — Governance Metrics Computation Engine (ESRS G1: Business Conduct)
// Computes key G1 KPIs from raw data tables per ESRS G1-1 through G1-6.
// ============================================================================

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BoardComposition {
  board_size?: number | null;
  independent_members?: number | null;
  female_members?: number | null;
  male_members?: number | null;
  avg_tenure_years?: number | null;
}

export interface EthicsTraining {
  training_topic: string;
  employees_covered?: number | null;
  coverage_percentage?: number | null;
  frequency?: string | null;
}

export interface ComplianceIncident {
  incident_type: string;
  regulatory_fines?: number | null;
  non_monetary_sanctions?: number | null;
  legal_actions?: number | null;
}

export interface DataBreach {
  breach_type: string;
  records_affected?: number | null;
  notified_authority?: boolean | null;
  fines_amount?: number | null;
}

export interface WhistleblowerCase {
  reports_received?: number | null;
  cases_investigated?: number | null;
  cases_substantiated?: number | null;
}

export interface SupplierConduct {
  supplier_name?: string | null;
  code_violations?: number | null;
  audits_conducted?: number | null;
  corrective_actions_issued?: number | null;
}

export interface PoliticalContribution {
  recipient: string;
  country?: string | null;
  amount: number;
}

export interface GovernanceSnapshot {
  // Board
  board: {
    size: number;
    independentPct: number;
    femalePct: number;
    malePct: number;
    avgTenure: number;
  };

  // Ethics training
  ethicsTraining: {
    totalCovered: number;
    avgCoveragePct: number;
    topics: string[];
  };

  // Compliance
  compliance: {
    totalFines: number;
    totalSanctions: number;
    totalLegalActions: number;
    incidentTypes: string[];
  };

  // Data privacy
  dataPrivacy: {
    totalBreaches: number;
    totalRecordsAffected: number;
    totalFines: number;
    notifiedPct: number;
  };

  // Whistleblower
  whistleblower: {
    reportsReceived: number;
    casesInvestigated: number;
    casesSubstantiated: number;
    substantiationRate: number;
  };

  // Supplier conduct
  supplierConduct: {
    totalSuppliers: number;
    totalViolations: number;
    totalAudits: number;
    correctiveActions: number;
  };

  // Political contributions
  politicalContributions: {
    totalAmount: number;
    recipients: number;
  };
}

// ─── Computation ──────────────────────────────────────────────────────────────

function safeNum(v: number | null | undefined): number {
  return v ?? 0;
}

export function computeGovernanceSnapshot(
  board: BoardComposition | null,
  ethicsTrainings: EthicsTraining[],
  complianceIncidents: ComplianceIncident[],
  dataBreaches: DataBreach[],
  whistleblower: WhistleblowerCase | null,
  supplierConducts: SupplierConduct[],
  politicalContributions: PoliticalContribution[],
): GovernanceSnapshot {
  // ── Board ──
  const boardSize = safeNum(board?.board_size);
  const independent = safeNum(board?.independent_members);
  const femaleB = safeNum(board?.female_members);
  const maleB = safeNum(board?.male_members);
  const independentPct = boardSize > 0 ? round((independent / boardSize) * 100, 1) : 0;
  const genderTotal = femaleB + maleB;
  const femalePct = genderTotal > 0 ? round((femaleB / genderTotal) * 100, 1) : 0;

  // ── Ethics training ──
  const totalCovered = ethicsTrainings.reduce((s, t) => s + safeNum(t.employees_covered), 0);
  const coverages = ethicsTrainings.map((t) => safeNum(t.coverage_percentage)).filter((v) => v > 0);
  const avgCoveragePct = coverages.length > 0 ? round(coverages.reduce((a, b) => a + b, 0) / coverages.length, 1) : 0;
  const topics = ethicsTrainings.map((t) => t.training_topic);

  // ── Compliance ──
  const totalFines = complianceIncidents.reduce((s, i) => s + safeNum(i.regulatory_fines), 0);
  const totalSanctions = complianceIncidents.reduce((s, i) => s + safeNum(i.non_monetary_sanctions), 0);
  const totalLegalActions = complianceIncidents.reduce((s, i) => s + safeNum(i.legal_actions), 0);
  const incidentTypes = complianceIncidents.map((i) => i.incident_type);

  // ── Data privacy ──
  const totalBreaches = dataBreaches.length;
  const totalRecordsAffected = dataBreaches.reduce((s, b) => s + safeNum(b.records_affected), 0);
  const totalDpFines = dataBreaches.reduce((s, b) => s + safeNum(b.fines_amount), 0);
  const notifiedCount = dataBreaches.filter((b) => b.notified_authority).length;
  const notifiedPct = totalBreaches > 0 ? round((notifiedCount / totalBreaches) * 100, 1) : 0;

  // ── Whistleblower ──
  const reports = safeNum(whistleblower?.reports_received);
  const investigated = safeNum(whistleblower?.cases_investigated);
  const substantiated = safeNum(whistleblower?.cases_substantiated);
  const substantiationRate = investigated > 0 ? round((substantiated / investigated) * 100, 1) : 0;

  // ── Supplier conduct ──
  const totalSuppliers = supplierConducts.length;
  const totalViolations = supplierConducts.reduce((s, sc) => s + safeNum(sc.code_violations), 0);
  const totalAudits = supplierConducts.reduce((s, sc) => s + safeNum(sc.audits_conducted), 0);
  const correctiveActions = supplierConducts.reduce((s, sc) => s + safeNum(sc.corrective_actions_issued), 0);

  // ── Political contributions ──
  const totalAmount = politicalContributions.reduce((s, pc) => s + safeNum(pc.amount), 0);
  const recipients = new Set(politicalContributions.map((pc) => pc.recipient)).size;

  return {
    board: {
      size: boardSize,
      independentPct,
      femalePct,
      malePct: genderTotal > 0 ? round((maleB / genderTotal) * 100, 1) : 0,
      avgTenure: safeNum(board?.avg_tenure_years),
    },
    ethicsTraining: { totalCovered, avgCoveragePct, topics },
    compliance: { totalFines, totalSanctions, totalLegalActions, incidentTypes },
    dataPrivacy: { totalBreaches, totalRecordsAffected, totalFines: totalDpFines, notifiedPct },
    whistleblower: { reportsReceived: reports, casesInvestigated: investigated, casesSubstantiated: substantiated, substantiationRate },
    supplierConduct: { totalSuppliers, totalViolations, totalAudits, correctiveActions },
    politicalContributions: { totalAmount, recipients },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function formatEuro(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(0)}K`;
  return `€${value.toFixed(0)}`;
}

export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}
