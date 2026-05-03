// ============================================================================
// CarbonTrackAI — Social Metrics Computation Engine (ESRS S1: Own Workforce)
// Computes key S1 KPIs from raw data tables per ESRS S1-6 through S1-17.
// ============================================================================

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkforceHeadcount {
  total_employees: number;
  female_count?: number | null;
  male_count?: number | null;
  non_binary_count?: number | null;
  under_30_count?: number | null;
  age_30_50_count?: number | null;
  over_50_count?: number | null;
  permanent_contracts?: number | null;
  temporary_contracts?: number | null;
  full_time_count?: number | null;
  part_time_count?: number | null;
}

export interface WorkforceTurnover {
  hires?: number | null;
  leavers?: number | null;
  turnover_rate?: number | null;
  voluntary_leavers?: number | null;
  involuntary_leavers?: number | null;
}

export interface WorkforceDiversity {
  gender_ratio_management?: number | null;
  women_in_senior_management?: number | null;
  men_in_senior_management?: number | null;
  employees_with_disabilities?: number | null;
  disability_percentage?: number | null;
}

export interface HealthSafetyIncidents {
  recordable_injuries?: number | null;
  lost_days?: number | null;
  fatalities?: number | null;
  near_misses?: number | null;
  injury_rate?: number | null;
}

export interface TrainingRecords {
  total_training_hours?: number | null;
  avg_hours_per_employee?: number | null;
  training_hours_female?: number | null;
  training_hours_male?: number | null;
}

export interface GenderPayGap {
  mean_gap_percentage?: number | null;
  median_gap_percentage?: number | null;
}

export interface WorkforceNonEmployees {
  worker_type: string;
  headcount: number;
  fte_equivalent?: number | null;
}

export interface WorkforceAdequateWages {
  employee_category: string;
  minimum_wage?: number | null;
  living_wage_benchmark?: number | null;
  gap_percentage?: number | null;
}

export interface WorklifeBalance {
  parental_leave_uptake_percentage?: number | null;
  flexible_work_percentage?: number | null;
  avg_weekly_hours?: number | null;
}

export interface WorkforceSnapshot {
  // Headcount
  totalEmployees: number;
  genderRatio: { female: number; male: number; nonBinary: number };
  ageDistribution: { under30: number; age30to50: number; over50: number };
  contractTypes: { permanent: number; temporary: number };
  workSchedule: { fullTime: number; partTime: number };
  nonEmployees: { total: number; fteEquivalent: number };

  // Turnover
  turnover: {
    hires: number;
    leavers: number;
    turnoverRate: number;
    voluntaryRate: number;
    involuntaryRate: number;
  };

  // Diversity
  diversity: {
    womenInSeniorMgmt: number;
    menInSeniorMgmt: number;
    managementGenderRatio: number;
    employeesWithDisabilities: number;
    disabilityPct: number;
  };

  // Health & Safety
  healthSafety: {
    recordableInjuries: number;
    lostDays: number;
    fatalities: number;
    nearMisses: number;
    injuryRate: number;
    lostDayRate: number;
  };

  // Training
  training: {
    totalHours: number;
    avgHoursPerEmployee: number;
    femaleHours: number;
    maleHours: number;
  };

  // Pay
  payGap: {
    meanGapPct: number;
    medianGapPct: number;
  };

  // Work-life
  worklife: {
    parentalLeavePct: number;
    flexibleWorkPct: number;
    avgWeeklyHours: number;
  };

  // Wage adequacy
  wageAdequacy: Array<{
    category: string;
    gapPct: number;
  }>;
}

// ─── Computation ──────────────────────────────────────────────────────────────

function safeNum(v: number | null | undefined): number {
  return v ?? 0;
}

/**
 * Build a complete workforce snapshot from raw table data.
 * All inputs are optional — missing tables produce zero values.
 */
export function computeWorkforceSnapshot(
  headcount: WorkforceHeadcount | null,
  turnover: WorkforceTurnover | null,
  diversity: WorkforceDiversity | null,
  hse: HealthSafetyIncidents | null,
  training: TrainingRecords | null,
  payGap: GenderPayGap | null,
  nonEmployees: WorkforceNonEmployees[],
  worklife: WorklifeBalance | null,
  wageData: WorkforceAdequateWages[],
): WorkforceSnapshot {
  const total = safeNum(headcount?.total_employees);

  // ── Headcount ──
  const females = safeNum(headcount?.female_count);
  const males = safeNum(headcount?.male_count);
  const nb = safeNum(headcount?.non_binary_count);

  const nonEmpTotal = nonEmployees.reduce((s, n) => s + safeNum(n.headcount), 0);
  const nonEmpFte = nonEmployees.reduce((s, n) => s + safeNum(n.fte_equivalent), 0);

  // ── Turnover ──
  const hires = safeNum(turnover?.hires);
  const leavers = safeNum(turnover?.leavers);
  const volLeavers = safeNum(turnover?.voluntary_leavers);
  const involLeavers = safeNum(turnover?.involuntary_leavers);
  const turnoverRate = total > 0 ? round((leavers / total) * 100, 1) : 0;
  const voluntaryRate = total > 0 ? round((volLeavers / total) * 100, 1) : 0;
  const involuntaryRate = total > 0 ? round((involLeavers / total) * 100, 1) : 0;

  // ── Diversity ──
  const womenMgmt = safeNum(diversity?.women_in_senior_management);
  const menMgmt = safeNum(diversity?.men_in_senior_management);
  const mgmtTotal = womenMgmt + menMgmt;
  const mgmtRatio = mgmtTotal > 0 ? round((womenMgmt / mgmtTotal) * 100, 1) : 0;
  const empDisability = safeNum(diversity?.employees_with_disabilities);
  const disabilityPct = total > 0 ? round((empDisability / total) * 100, 1) : 0;

  // ── Health & Safety ──
  const injuries = safeNum(hse?.recordable_injuries);
  const lostDays = safeNum(hse?.lost_days);
  const fatalities = safeNum(hse?.fatalities);
  const nearMisses = safeNum(hse?.near_misses);
  // Injury rate per 100 FTE (using total employees as proxy for FTE)
  const injuryRate = total > 0 ? round((injuries / total) * 100, 2) : 0;
  const lostDayRate = total > 0 ? round(lostDays / total, 2) : 0;

  // ── Training ──
  const trainHours = safeNum(training?.total_training_hours);
  const avgHours = total > 0 ? round(trainHours / total, 1) : 0;
  const femaleTrainHours = safeNum(training?.training_hours_female);
  const maleTrainHours = safeNum(training?.training_hours_male);

  // ── Pay Gap ──
  const meanGap = safeNum(payGap?.mean_gap_percentage);
  const medianGap = safeNum(payGap?.median_gap_percentage);

  // ── Work-life ──
  const parentalPct = safeNum(worklife?.parental_leave_uptake_percentage);
  const flexPct = safeNum(worklife?.flexible_work_percentage);
  const avgWkHrs = safeNum(worklife?.avg_weekly_hours);

  // ── Wage adequacy ──
  const wageAdequacy = wageData.map((w) => ({
    category: w.employee_category,
    gapPct: safeNum(w.gap_percentage),
  }));

  return {
    totalEmployees: total,
    genderRatio: { female: females, male: males, nonBinary: nb },
    ageDistribution: {
      under30: safeNum(headcount?.under_30_count),
      age30to50: safeNum(headcount?.age_30_50_count),
      over50: safeNum(headcount?.over_50_count),
    },
    contractTypes: {
      permanent: safeNum(headcount?.permanent_contracts),
      temporary: safeNum(headcount?.temporary_contracts),
    },
    workSchedule: {
      fullTime: safeNum(headcount?.full_time_count),
      partTime: safeNum(headcount?.part_time_count),
    },
    nonEmployees: { total: nonEmpTotal, fteEquivalent: nonEmpFte },
    turnover: { hires, leavers, turnoverRate, voluntaryRate, involuntaryRate },
    diversity: {
      womenInSeniorMgmt: womenMgmt,
      menInSeniorMgmt: menMgmt,
      managementGenderRatio: mgmtRatio,
      employeesWithDisabilities: empDisability,
      disabilityPct,
    },
    healthSafety: {
      recordableInjuries: injuries,
      lostDays,
      fatalities,
      nearMisses,
      injuryRate,
      lostDayRate,
    },
    training: {
      totalHours: trainHours,
      avgHoursPerEmployee: avgHours,
      femaleHours: femaleTrainHours,
      maleHours: maleTrainHours,
    },
    payGap: { meanGapPct: meanGap, medianGapPct: medianGap },
    worklife: { parentalLeavePct: parentalPct, flexibleWorkPct: flexPct, avgWeeklyHours: avgWkHrs },
    wageAdequacy,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Format a percentage for display (e.g. 12.5 → "12.5%") */
export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

/** Colour-code a metric: green = good, amber = warning, red = poor */
export function metricColour(
  value: number,
  thresholds: { green: number; amber: number },
  lowerIsBetter: boolean = false,
): "green" | "amber" | "red" {
  if (lowerIsBetter) {
    if (value <= thresholds.green) return "green";
    if (value <= thresholds.amber) return "amber";
    return "red";
  }
  if (value >= thresholds.green) return "green";
  if (value >= thresholds.amber) return "amber";
  return "red";
}
