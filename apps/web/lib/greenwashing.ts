// ============================================================================
// CarbonTrackAI — Greenwashing Safeguard Utility
// Detects unsubstantiated environmental claims per Green Claims Directive
// (EU 2024/825) and EmpCo Directive (UCPD amendment).
// ============================================================================

// ─── Flagged terms (require substantiation evidence) ─────────────────────────

const HIGH_RISK_TERMS = [
  "climate-neutral",
  "carbon-neutral",
  "co2-neutral",
  "co2 neutral",
  "climate neutral",
  "carbon neutral",
  "100% green",
  "100% renewable",
  "completely sustainable",
  "fully sustainable",
  "zero emissions",
  "zero-emission",
  "emission-free",
  "emission free",
  "net zero",
  "net-zero",
  "carbon negative",
  "carbon-positive",
  "eco-friendly",
  "eco friendly",
  "environmentally friendly",
  "greenest",
  "most sustainable",
  "planet-friendly",
  "planet friendly",
];

const MEDIUM_RISK_TERMS = [
  "sustainable",
  "green",
  "eco",
  "clean",
  "renewable",
  "low-carbon",
  "low carbon",
  "carbon-conscious",
  "carbon conscious",
  "environmentally responsible",
  "nature-positive",
  "nature positive",
];

// ─── Detection ────────────────────────────────────────────────────────────────

export interface GreenwashFlag {
  term: string;
  risk: "high" | "medium";
  index: number;
  context: string; // surrounding text snippet
}

/**
 * Scan narrative text for potential greenwashing terms.
 * Returns flagged terms that require evidence substantiation.
 */
export function detectGreenwash(text: string): GreenwashFlag[] {
  if (!text || text.length < 10) return [];

  const flags: GreenwashFlag[] = [];
  const lower = text.toLowerCase();

  for (const term of HIGH_RISK_TERMS) {
    let idx = lower.indexOf(term);
    while (idx !== -1) {
      const start = Math.max(0, idx - 10);
      const end = Math.min(lower.length, idx + term.length + 30);
      flags.push({
        term,
        risk: "high",
        index: idx,
        context: text.substring(start, end),
      });
      idx = lower.indexOf(term, idx + 1);
    }
  }

  for (const term of MEDIUM_RISK_TERMS) {
    let idx = lower.indexOf(term);
    while (idx !== -1) {
      // Only flag medium-risk terms if they appear with unqualified claims
      const before = lower.substring(Math.max(0, idx - 20), idx);
      if (!/(?:certified|verified| audited|according to|per |based on|in line with)/i.test(before)) {
        const start = Math.max(0, idx - 10);
        const end = Math.min(lower.length, idx + term.length + 30);
        flags.push({
          term,
          risk: "medium",
          index: idx,
          context: text.substring(start, end),
        });
      }
      idx = lower.indexOf(term, idx + 1);
    }
  }

  return flags;
}

/**
 * Check if text contains any unsubstantiated environmental claims.
 */
export function hasGreenwashRisk(text: string): boolean {
  return detectGreenwash(text).length > 0;
}

/**
 * Get a warning message for flagged terms.
 */
export function getGreenwashWarning(flags: GreenwashFlag[]): string | null {
  if (flags.length === 0) return null;

  const highRisk = flags.filter((f) => f.risk === "high");
  const mediumRisk = flags.filter((f) => f.risk === "medium");

  const parts: string[] = [];
  if (highRisk.length > 0) {
    parts.push(
      `${highRisk.length} high-risk term${highRisk.length > 1 ? "s" : ""}: ${highRisk.map((f) => `"${f.term}"`).join(", ")}. These terms require substantiation evidence under the Green Claims Directive (EU 2024/825). Offsets alone do not justify neutrality claims.`
    );
  }
  if (mediumRisk.length > 0) {
    parts.push(
      `${mediumRisk.length} medium-risk term${mediumRisk.length > 1 ? "s" : ""}: ${mediumRisk.map((f) => `"${f.term}"`).join(", ")}. Consider qualifying with certified standards or removing if unsubstantiated.`
    );
  }

  return parts.join(" ");
}
