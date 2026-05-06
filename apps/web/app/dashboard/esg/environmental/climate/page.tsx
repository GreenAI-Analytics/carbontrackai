"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { contractualInstrumentSchema } from "@/lib/validations";
import { formatTco2e, formatMWh } from "@/lib/calculations";

type LatestCalc = {
  scope1: number;
  scope2: number;
  totalMWh: number;
  year: number;
};

type ReportingPeriod = {
  id: string;
  year: number;
};

export default function EnergyEmissionsPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() - 1);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [periods, setPeriods] = useState<ReportingPeriod[]>([]);
  const [latestCalc, setLatestCalc] = useState<LatestCalc | null>(null);
  const [activityCount, setActivityCount] = useState<number>(0);
  const [instruments, setInstruments] = useState<any[]>([]);
  const [instLoading, setInstLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPeriods = useCallback(async (oid: string) => {
    const { data } = await supabase
      .from("reporting_periods")
      .select("id, year")
      .eq("organization_id", oid)
      .order("year", { ascending: false });
    return (data ?? []) as ReportingPeriod[];
  }, []);

  const getOrCreatePeriod = useCallback(
    async (oid: string, year: number): Promise<string | null> => {
      const { data: existing } = await supabase
        .from("reporting_periods")
        .select("id")
        .eq("organization_id", oid)
        .eq("year", year)
        .single();

      if (existing) return existing.id;

      const { data: created } = await supabase
        .from("reporting_periods")
        .insert({
          organization_id: oid,
          year,
          start_date: `${year}-01-01`,
          end_date: `${year}-12-31`,
        })
        .select("id")
        .single();

      return created?.id ?? null;
    },
    []
  );

  const fetchData = useCallback(async (oid: string, periodId: string, year: number) => {
    // Fetch calculation runs for this period — scope_1 and scope_2_location
    const { data: calcs } = await supabase
      .from("calculation_runs")
      .select("scope_type, total_emissions, total_energy")
      .eq("organization_id", oid)
      .eq("reporting_period_id", periodId);

    if (calcs && calcs.length > 0) {
      const scope1Run = calcs.find((c: any) => c.scope_type === "scope_1");
      const scope2Run = calcs.find((c: any) => c.scope_type === "scope_2_location");
      setLatestCalc({
        scope1: Number(scope1Run?.total_emissions ?? 0),
        scope2: Number(scope2Run?.total_emissions ?? 0),
        totalMWh: Number(scope1Run?.total_energy ?? scope2Run?.total_energy ?? 0),
        year,
      });
    } else {
      setLatestCalc(null);
    }

    // Count activity records for this period
    const { count } = await supabase
      .from("activity_records")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", oid)
      .eq("reporting_period_id", periodId)
      .is("deleted_at", null);

    setActivityCount(count ?? 0);

    // Fetch contractual instruments for this period
    const { data: inst } = await supabase
      .from("contractual_instruments")
      .select("*")
      .eq("organization_id", oid)
      .eq("reporting_period_id", periodId);
    if (inst) setInstruments(inst);
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: role } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!role) { setLoading(false); return; }
      const oid = role.organization_id;
      setOrgId(oid);

      const perList = await fetchPeriods(oid);
      setPeriods(perList);

      const year = perList[0]?.year ?? new Date().getFullYear() - 1;
      setSelectedYear(year);
      const periodId = await getOrCreatePeriod(oid, year);
      setSelectedPeriodId(periodId);
      if (periodId) await fetchData(oid, periodId, year);

      setLoading(false);
    }
    init();
  }, [fetchPeriods, getOrCreatePeriod, fetchData]);

  const handleYearChange = async (year: number) => {
    if (!orgId) return;
    setSelectedYear(year);
    const periodId = await getOrCreatePeriod(orgId, year);
    setSelectedPeriodId(periodId);
    if (periodId) await fetchData(orgId, periodId, year);
  };

  async function saveInstrument(e: any) {
    e.preventDefault();
    if (!orgId || !selectedPeriodId) return;
    setInstLoading(true);
    const form = e.target;

    const parsed = contractualInstrumentSchema.safeParse({
      instrument_type: form.instType.value,
      description: form.desc.value || undefined,
      mwh_covered: parseFloat(form.mwh.value) || 0,
      certificate_id: form.certId.value || undefined,
      supplier: form.supplier.value || undefined,
      country: form.country.value || undefined,
      vintage_year: parseInt(form.vintage.value) || undefined,
    });
    if (!parsed.success) {
      console.error("Validation failed:", parsed.error.flatten());
      setInstLoading(false);
      return;
    }

    const { error } = await supabase.from("contractual_instruments").insert({
      organization_id: orgId,
      reporting_period_id: selectedPeriodId,
      instrument_type: form.instType.value,
      description: form.desc.value || null,
      mwh_covered: parseFloat(form.mwh.value) || 0,
      certificate_id: form.certId.value || null,
      supplier: form.supplier.value || null,
      country: form.country.value || null,
      vintage_year: parseInt(form.vintage.value) || null,
    });
    if (error) {
      console.error("Failed to save instrument:", error.message);
    } else {
      form.reset();
      if (orgId && selectedPeriodId) await fetchData(orgId, selectedPeriodId, selectedYear);
    }
    setInstLoading(false);
  }

  async function deleteInstrument(id: string) {
    await supabase.from("contractual_instruments").delete().eq("id", id);
    setInstruments(instruments.filter((i: any) => i.id !== id));
  }

  const currentYr = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYr - i);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-primary-600 hover:text-primary-700">
          ← Back to Overview
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Energy & Emissions</h1>
        <p className="text-gray-600">ESRS E1-1 to E1-9 · Track energy consumption, fuel usage, and calculate Scope 1 & 2 greenhouse gas emissions with country-specific emission factors.</p>
      </div>

      {/* Year selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700">Reporting year:</span>
        {yearOptions.map((yr) => {
          const isHistorical = yr < currentYr;
          return (
            <button
              key={yr}
              onClick={() => handleYearChange(yr)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                selectedYear === yr
                  ? "bg-primary-600 text-white"
                  : isHistorical
                  ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {yr}{isHistorical ? " 📜" : ""}
            </button>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/dashboard/activity"
          className="rounded-xl border-2 border-primary-200 bg-primary-50 p-6 transition hover:border-primary-400 hover:bg-primary-100"
        >
          <div className="text-3xl mb-2">⚡</div>
          <h3 className="font-semibold text-gray-900">Log Activity Data</h3>
          <p className="text-sm text-gray-600 mt-1">
            Enter energy and fuel consumption — natural gas, electricity, heating oil, company vehicles.
          </p>
          <p className="text-sm font-medium text-primary-700 mt-3">
            {activityCount > 0 ? `${activityCount} records in ${selectedYear} →` : "Get started →"}
          </p>
        </Link>

        <Link
          href="/dashboard/emissions"
          className="rounded-xl border-2 border-primary-200 bg-primary-50 p-6 transition hover:border-primary-400 hover:bg-primary-100"
        >
          <div className="text-3xl mb-2">📊</div>
          <h3 className="font-semibold text-gray-900">View Emissions Results</h3>
          <p className="text-sm text-gray-600 mt-1">
            See your Scope 1 & 2 CO₂e breakdown, energy intensity, and emission factors used.
          </p>
          {latestCalc ? (
            <p className="text-sm font-medium text-primary-700 mt-3">
              Latest: {formatTco2e(latestCalc.scope1 + latestCalc.scope2)} tCO₂e ({latestCalc.year}) →
            </p>
          ) : (
            <p className="text-sm font-medium text-primary-700 mt-3">Run calculation →</p>
          )}
        </Link>
      </div>

      {/* Summary snapshot */}
      {!loading && latestCalc && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Snapshot ({selectedYear})</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-500">Scope 1</p>
              <p className="text-2xl font-bold text-orange-700">{formatTco2e(latestCalc.scope1)}</p>
              <p className="text-xs text-gray-400">tCO₂e</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-500">Scope 2 (location)</p>
              <p className="text-2xl font-bold text-blue-700">{formatTco2e(latestCalc.scope2)}</p>
              <p className="text-xs text-gray-400">tCO₂e</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-emerald-700">{formatTco2e(latestCalc.scope1 + latestCalc.scope2)}</p>
              <p className="text-xs text-gray-400">tCO₂e</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-500">Energy</p>
              <p className="text-2xl font-bold text-purple-700">{formatMWh(latestCalc.totalMWh)}</p>
              <p className="text-xs text-gray-400">MWh</p>
            </div>
          </div>
        </div>
      )}

      {/* Contractual Instruments for Market-Based Scope 2 */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Contractual Instruments (Scope 2 Market-Based)</h2>
        <p className="text-sm text-gray-500 mb-4">Guarantees of Origin, PPAs, and RECs — used to calculate market-based Scope 2 emissions per GHG Protocol.</p>

        {instruments.length > 0 && (
          <div className="space-y-2 mb-4">
            {instruments.map((inst: any) => (
              <div key={inst.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3 text-sm">
                <div>
                  <span className="font-medium">{inst.instrument_type?.toUpperCase()}</span>
                  <span className="text-gray-500 ml-2">{inst.mwh_covered} MWh</span>
                  {inst.supplier && <span className="text-gray-400 ml-2">— {inst.supplier}</span>}
                  {inst.country && <span className="text-gray-400 ml-2">({inst.country})</span>}
                </div>
                <button onClick={() => deleteInstrument(inst.id)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
              </div>
            ))}
            <p className="text-xs text-gray-500">Total certificated: <strong>{instruments.reduce((s: number, i: any) => s + (i.mwh_covered || 0), 0).toFixed(1)} MWh</strong></p>
          </div>
        )}

        <form onSubmit={saveInstrument} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div><label className="mb-1 block text-xs font-medium text-gray-600">Type</label><select name="instType" defaultValue="goo" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="goo">Guarantee of Origin</option><option value="ppa">PPA</option><option value="rec">REC</option><option value="other">Other</option></select></div>
          <div><label className="mb-1 block text-xs font-medium text-gray-600">MWh covered</label><input name="mwh" type="number" min="0" step="0.1" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div>
          <div><label className="mb-1 block text-xs font-medium text-gray-600">Supplier</label><input name="supplier" type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="e.g. Vattenfall" /></div>
          <button type="submit" disabled={instLoading} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">{instLoading ? "Adding…" : "+ Add"}</button>
        </form>
      </div>

      {!loading && !latestCalc && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <div className="text-5xl mb-4">🌱</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No emissions data for {selectedYear}</h2>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            Start by logging your energy and fuel consumption data, then run a calculation to see your Scope 1 & 2 emissions.
          </p>
          <Link
            href="/dashboard/activity"
            className="inline-block rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white transition hover:bg-primary-700"
          >
            Log your first activity →
          </Link>
        </div>
      )}
    </div>
  );
}
