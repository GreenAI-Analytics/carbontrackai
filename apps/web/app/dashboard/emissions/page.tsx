"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import {
  ACTIVITY_META,
  ActivityType,
  BreakdownItem,
  CalculationResult,
  formatMWh,
  formatTco2e,
} from "@/lib/calculations";

type ReportingPeriod = {
  id: string;
  year: number;
};

type SavedRun = {
  scope_type: string;
  total_emissions: number;
  total_energy: number | null;
  breakdown: BreakdownItem[] | null;
  calculated_at: string;
};

type DisplayData = {
  scope1: number;
  scope2: number;
  totalMWh: number;
  breakdown: BreakdownItem[];
  calculatedAt: string;
};

type ApiCalculationResponse = {
  countryCode: string;
  reportingYear?: number;
  qualityMode: "estimate" | "reporting";
  quality?: {
    reportingReady: boolean;
    fallbackActivityTypes: string[];
    databaseActivityTypes: string[];
    governanceIssueActivityTypes?: string[];
    inactiveDatasetActivityTypes?: string[];
    unmanagedDatasetActivityTypes?: string[];
  };
  providerDiagnostics?: unknown[];
  factorProvenance?: unknown[];
  scope1Tco2e: number;
  scope2LocationTco2e: number;
  totalMWh: number;
  breakdown: Array<
    BreakdownItem & {
      factorId?: string | null;
      factorSourceVersion?: string | null;
      factorLicense?: string | null;
      appliedTier?: string | null;
    }
  >;
};

type UpsertedRun = {
  id: string;
  scope_type: "scope_1" | "scope_2_location" | "scope_2_market" | "scope_3";
};

export default function EmissionsPage() {
  const router = useRouter();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState("EU");
  const [periods, setPeriods] = useState<ReportingPeriod[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() - 1);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

  const [calcResult, setCalcResult] = useState<CalculationResult | null>(null);
  const [savedRuns, setSavedRuns] = useState<SavedRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countrySource, setCountrySource] = useState<"signup" | "organization" | "fallback">("fallback");

  const loadSavedRuns = useCallback(async (periodId: string) => {
    const { data } = await supabase
      .from("calculation_runs")
      .select("scope_type, total_emissions, total_energy, breakdown, calculated_at")
      .eq("reporting_period_id", periodId);
    setSavedRuns((data ?? []) as SavedRun[]);
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const signupCountry = user.user_metadata?.signup_country_code;
      const normalizedSignupCountry =
        typeof signupCountry === "string" && signupCountry.length === 2
          ? signupCountry.toUpperCase()
          : null;

      if (normalizedSignupCountry) {
        setCountryCode(normalizedSignupCountry);
        setCountrySource("signup");
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("is_primary", true)
        .single();

      if (!roleData) { router.replace("/onboarding"); return; }

      const id = roleData.organization_id;
      setOrgId(id);

      const { data: orgData } = await supabase
        .from("organizations")
        .select("country_code")
        .eq("id", id)
        .single();
      if (orgData && !normalizedSignupCountry) {
        setCountryCode(orgData.country_code);
        setCountrySource("organization");
      }

      const { data: perData } = await supabase
        .from("reporting_periods")
        .select("id, year")
        .eq("organization_id", id)
        .order("year", { ascending: false });

      const perList = (perData ?? []) as ReportingPeriod[];
      setPeriods(perList);

      if (perList.length > 0) {
        const latest = perList[0];
        setSelectedYear(latest.year);
        setSelectedPeriodId(latest.id);
        await loadSavedRuns(latest.id);
      }

      setLoading(false);
    }
    init();
  }, [router, loadSavedRuns]);

  async function handleYearChange(year: number) {
    setSelectedYear(year);
    setCalcResult(null);
    setSavedRuns([]);
    const period = periods.find((p) => p.year === year);
    setSelectedPeriodId(period?.id ?? null);
    if (period) await loadSavedRuns(period.id);
  }

  async function handleCalculate() {
    if (!selectedPeriodId || !orgId) return;
    setCalculating(true);
    setError(null);
    setCalcResult(null);

    // 1. Fetch activity records for the period
    const { data: records, error: recErr } = await supabase
      .from("activity_records")
      .select("id, activity_type, quantity, unit")
      .eq("reporting_period_id", selectedPeriodId)
      .is("deleted_at", null);

    if (recErr) { setError(recErr.message); setCalculating(false); return; }
    if (!records || records.length === 0) {
      setError("No activity records found for this period. Add data in Activity Data first.");
      setCalculating(false);
      return;
    }

    // 2. Call backend API for factor resolution + emissions calculation
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

    let result: CalculationResult;
    let apiResult: ApiCalculationResponse | null = null;

    try {
      const response = await fetch(`${apiBaseUrl}/v1/calculations/module1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryCode,
          reportingYear: selectedYear,
          qualityMode: "reporting",
          records: records.map((record) => ({
            id: record.id,
            activity_type: record.activity_type as ActivityType,
            quantity: Number(record.quantity),
            unit: record.unit,
          })),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(
          body?.error ??
            "Reporting-grade factors are unavailable for one or more activities."
        );
        setCalculating(false);
        return;
      }

      apiResult = (await response.json()) as ApiCalculationResponse;

      result = {
        scope1Tco2e: apiResult.scope1Tco2e,
        scope2LocationTco2e: apiResult.scope2LocationTco2e,
        totalMWh: apiResult.totalMWh,
        breakdown: apiResult.breakdown,
      };
    } catch {
      setError("Could not reach emissions API. Ensure apps/api is running on port 4000.");
      setCalculating(false);
      return;
    }

    const factorVersionPayload = {
      generated_at: new Date().toISOString(),
      country: countryCode,
      reporting_year: apiResult?.reportingYear ?? selectedYear,
      source: "module1_api",
      quality_mode: apiResult?.qualityMode ?? "reporting",
      quality_summary: apiResult?.quality ?? null,
      provider_diagnostics: apiResult?.providerDiagnostics ?? [],
      factor_provenance: apiResult?.factorProvenance ?? [],
    };

    // 4. Save / upsert calculation runs
    const { data: upsertedRuns, error: runUpsertError } = await supabase.from("calculation_runs").upsert(
      [
        {
          organization_id: orgId,
          reporting_period_id: selectedPeriodId,
          scope_type: "scope_1",
          total_emissions: result.scope1Tco2e,
          total_energy: result.totalMWh,
          breakdown: result.breakdown.filter((b) => b.scope === "scope_1"),
          factor_versions: factorVersionPayload,
          quality_summary: apiResult?.quality ?? null,
          methodology_text:
            "Scope 1/2 location-based calculated via module1 API using reporting mode; activity-first factor hierarchy with provenance tracking.",
        },
        {
          organization_id: orgId,
          reporting_period_id: selectedPeriodId,
          scope_type: "scope_2_location",
          total_emissions: result.scope2LocationTco2e,
          total_energy: result.totalMWh,
          breakdown: result.breakdown.filter((b) => b.scope === "scope_2"),
          factor_versions: factorVersionPayload,
          quality_summary: apiResult?.quality ?? null,
          methodology_text:
            "Scope 1/2 location-based calculated via module1 API using reporting mode; activity-first factor hierarchy with provenance tracking.",
        },
      ],
      { onConflict: "organization_id,reporting_period_id,scope_type" }
    ).select("id, scope_type");

    if (runUpsertError) {
      setError(runUpsertError.message);
      setCalculating(false);
      return;
    }

    const runRows = (upsertedRuns ?? []) as UpsertedRun[];
    const runIds = runRows.map((r) => r.id);

    if (runIds.length > 0) {
      const lineItemsByScope = {
        scope_1: apiResult?.breakdown.filter((item) => item.scope === "scope_1") ?? [],
        scope_2_location:
          apiResult?.breakdown.filter((item) => item.scope === "scope_2") ?? [],
      };

      await supabase
        .from("calculation_line_items")
        .delete()
        .in("calculation_run_id", runIds);

      const lineInserts = runRows.flatMap((run) => {
        const scoped =
          run.scope_type === "scope_1"
            ? lineItemsByScope.scope_1
            : run.scope_type === "scope_2_location"
            ? lineItemsByScope.scope_2_location
            : [];

        return scoped.map((item) => ({
          calculation_run_id: run.id,
          category: "module_1",
          activity_type: item.activityType,
          activity_value: item.quantity,
          activity_unit: item.unit,
          factor_id: item.factorId ?? null,
          applied_factor_value: item.factorValue,
          applied_tier: item.appliedTier ?? null,
          emissions_kgco2e: item.emissionsKgCo2e,
          uncertainty_low_kg: null,
          uncertainty_high_kg: null,
          provenance: {
            factor_region: item.factorRegion,
            factor_provider: item.factorProvider,
            factor_source_version: item.factorSourceVersion ?? null,
            factor_license: item.factorLicense ?? null,
          },
        }));
      });

      if (lineInserts.length > 0) {
        const { error: lineInsertError } = await supabase
          .from("calculation_line_items")
          .insert(lineInserts);

        if (lineInsertError) {
          setError(lineInsertError.message);
          setCalculating(false);
          return;
        }
      }
    );

    setCalcResult(result);
    await loadSavedRuns(selectedPeriodId);
    setCalculating(false);
  }

  // Resolve display data from fresh result or last saved run
  const displayData: DisplayData | null = calcResult
    ? {
        scope1: calcResult.scope1Tco2e,
        scope2: calcResult.scope2LocationTco2e,
        totalMWh: calcResult.totalMWh,
        breakdown: calcResult.breakdown,
        calculatedAt: new Date().toISOString(),
      }
    : savedRuns.length > 0
    ? {
        scope1: savedRuns.find((r) => r.scope_type === "scope_1")?.total_emissions ?? 0,
        scope2: savedRuns.find((r) => r.scope_type === "scope_2_location")?.total_emissions ?? 0,
        totalMWh: savedRuns.find((r) => r.scope_type === "scope_1")?.total_energy ?? 0,
        breakdown: [
          ...(savedRuns.find((r) => r.scope_type === "scope_1")?.breakdown ?? []),
          ...(savedRuns.find((r) => r.scope_type === "scope_2_location")?.breakdown ?? []),
        ],
        calculatedAt: savedRuns[0]?.calculated_at ?? "",
      }
    : null;

  if (loading) {
    return <p className="text-gray-500 animate-pulse">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Emissions</h1>
          <p className="text-gray-600">
            Scope 1 &amp; 2 results for your organisation ({countryCode} grid factors applied, source: {countrySource}).
          </p>
        </div>
        <Link
          href="/dashboard/activity"
          className="text-sm font-medium text-primary-700 hover:text-primary-800"
        >
          ← Activity data
        </Link>
      </div>

      {/* Year selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700">Reporting year:</span>
        {periods.length === 0 ? (
          <span className="text-sm text-gray-500">
            No periods yet.{" "}
            <Link href="/dashboard/activity" className="text-primary-700 underline">
              Add activity data first.
            </Link>
          </span>
        ) : (
          periods.map((p) => (
            <button
              key={p.id}
              onClick={() => handleYearChange(p.year)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                selectedYear === p.year
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {p.year}
            </button>
          ))
        )}
      </div>

      {/* Calculate button */}
      {selectedPeriodId && (
        <div className="flex items-center gap-4">
          <button
            onClick={handleCalculate}
            disabled={calculating}
            className="rounded-lg bg-primary-600 px-5 py-2.5 font-semibold text-white hover:bg-primary-700 disabled:opacity-60 transition"
          >
            {calculating ? "Calculating…" : "Run calculation"}
          </button>
          {displayData?.calculatedAt && !calcResult && (
            <span className="text-sm text-gray-500">
              Last run {new Date(displayData.calculatedAt).toLocaleString()}
            </span>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* ── Results ──────────────────────────────────────────────────── */}
      {displayData && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
              <p className="text-sm font-medium text-gray-600">Scope 1 Emissions</p>
              <p className="mt-1 text-4xl font-bold text-gray-900 tabular-nums">
                {formatTco2e(displayData.scope1)}
              </p>
              <p className="text-xs text-gray-500">tCO₂e / year</p>
              <p className="mt-2 text-xs text-orange-700">
                Direct combustion (gas, oil, fuel)
              </p>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-sm font-medium text-gray-600">Scope 2 Emissions</p>
              <p className="mt-1 text-4xl font-bold text-gray-900 tabular-nums">
                {formatTco2e(displayData.scope2)}
              </p>
              <p className="text-xs text-gray-500">tCO₂e / year (location-based)</p>
              <p className="mt-2 text-xs text-blue-700">
                Purchased electricity — {countryCode} grid factor
              </p>
            </div>

            <div className="rounded-xl border border-green-200 bg-green-50 p-5">
              <p className="text-sm font-medium text-gray-600">Total Energy</p>
              <p className="mt-1 text-4xl font-bold text-gray-900 tabular-nums">
                {formatMWh(displayData.totalMWh)}
              </p>
              <p className="text-xs text-gray-500">MWh / year (VSME B2)</p>
              <p className="mt-2 text-xs text-green-700">
                Combined Scope 1 + 2:{" "}
                {formatTco2e(displayData.scope1 + displayData.scope2)} tCO₂e
              </p>
            </div>
          </div>

          {/* Breakdown table */}
          {displayData.breakdown.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Emissions breakdown</h2>
                <p className="text-sm text-gray-500">
                  Source-level detail with emission factors and energy equivalent
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-6 py-3">Source</th>
                      <th className="px-6 py-3">Scope</th>
                      <th className="px-6 py-3">Quantity</th>
                      <th className="px-6 py-3">Factor (kg CO₂e/unit)</th>
                      <th className="px-6 py-3 text-right">Emissions (tCO₂e)</th>
                      <th className="px-6 py-3 text-right">Energy (MWh)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {displayData.breakdown.map((item, i) => {
                      const meta = ACTIVITY_META[item.activityType];
                      return (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-900">
                            {item.label}
                          </td>
                          <td
                            className={`px-6 py-3 text-xs font-semibold ${
                              item.scope === "scope_1"
                                ? "text-orange-600"
                                : "text-blue-600"
                            }`}
                          >
                            {item.scope === "scope_1" ? "Scope 1" : "Scope 2"}
                          </td>
                          <td className="px-6 py-3 text-gray-700 tabular-nums">
                            {Number(item.quantity).toLocaleString()} {meta?.unit ?? item.unit}
                          </td>
                          <td className="px-6 py-3 text-gray-500">
                            <span className="tabular-nums">{item.factorValue}</span>
                            <br />
                            <span className="text-xs text-gray-400">{item.factorRegion}</span>
                          </td>
                          <td className="px-6 py-3 text-right font-medium text-gray-900 tabular-nums">
                            {item.emissionsTco2e.toFixed(3)}
                          </td>
                          <td className="px-6 py-3 text-right text-gray-700 tabular-nums">
                            {item.energyMWh.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                    <tr>
                      <td colSpan={4} className="px-6 py-3 text-gray-900">
                        Total
                      </td>
                      <td className="px-6 py-3 text-right text-gray-900 tabular-nums">
                        {formatTco2e(displayData.scope1 + displayData.scope2)}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-900 tabular-nums">
                        {formatMWh(displayData.totalMWh)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Factor provenance */}
          <p className="text-xs text-gray-400 border-t border-gray-100 pt-4">
            Emission factors sourced from ADEME Base Carbone (FR), MITECO (ES), and EEA/Climatiq (all EU27 countries).
            Electricity: location-based {countryCode} grid factor (gCO₂e/kWh). Combustion: tank-to-wheel. All values in tCO₂e (1 t = 1,000 kg).
            VSME disclosures: B1 (GHG emissions), B2 (energy consumption).
          </p>
        </>
      )}

      {!displayData && !error && selectedPeriodId && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p className="text-lg font-medium text-gray-700 mb-1">No calculation yet for {selectedYear}</p>
          <p className="text-sm text-gray-500 mb-4">
            Make sure you have{" "}
            <Link href="/dashboard/activity" className="text-primary-700 underline">
              added activity data
            </Link>{" "}
            for {selectedYear}, then click &quot;Run calculation&quot;.
          </p>
        </div>
      )}

      {!selectedPeriodId && periods.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p className="text-base text-gray-600 mb-4">
            No reporting periods yet.{" "}
            <Link href="/dashboard/activity" className="text-primary-700 underline">
              Start by adding activity data.
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
