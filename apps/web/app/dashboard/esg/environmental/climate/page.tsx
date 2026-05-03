"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { formatTco2e, formatMWh } from "@/lib/calculations";

type LatestCalc = {
  scope1: number;
  scope2: number;
  totalMWh: number;
  year: number;
};

export default function EnergyEmissionsPage() {
  const [latestCalc, setLatestCalc] = useState<LatestCalc | null>(null);
  const [activityCount, setActivityCount] = useState<number>(0);
  const [instruments, setInstruments] = useState<any[]>([]);
  const [instLoading, setInstLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  async function saveInstrument(e: any) {
    e.preventDefault();
    setInstLoading(true);
    const form = e.target;
    await supabase.from("contractual_instruments").insert({
      instrument_type: form.instType.value,
      description: form.desc.value || null,
      mwh_covered: parseFloat(form.mwh.value) || 0,
      certificate_id: form.certId.value || null,
      supplier: form.supplier.value || null,
      country: form.country.value || null,
      vintage_year: parseInt(form.vintage.value) || null,
    });
    // Refresh list
    const { data: inst } = await supabase.from("contractual_instruments").select("*").eq("organization_id", (await supabase.from("user_roles").select("organization_id").eq("user_id", (await supabase.auth.getUser()).data.user!.id).single()).data?.organization_id);
    if (inst) setInstruments(inst);
    setInstLoading(false);
    form.reset();
  }

  async function deleteInstrument(id: string) {
    await supabase.from("contractual_instruments").delete().eq("id", id);
    setInstruments(instruments.filter((i: any) => i.id !== id));
  }

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's org
      const { data: role } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!role) { setLoading(false); return; }
      const orgId = role.organization_id;

      // Fetch latest calculation
      const { data: calcs } = await supabase
        .from("calculation_runs")
        .select("scope1, scope2, totalMWh, year")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (calcs && calcs.length > 0) {
        setLatestCalc({
          scope1: calcs[0].scope1,
          scope2: calcs[0].scope2,
          totalMWh: calcs[0].totalMWh,
          year: calcs[0].year,
        });
      }

      // Count activity records
      const { count } = await supabase
        .from("activity_records")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId);

      setActivityCount(count ?? 0);
      // Fetch contractual instruments
      const { data: inst } = await supabase.from("contractual_instruments").select("*").eq("organization_id", orgId);
      if (inst) setInstruments(inst);
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-primary-600 hover:text-primary-700">
          ← Back to Overview
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Energy & Emissions</h1>
        <p className="text-gray-600">ESRS E1-1 to E1-9 · Track energy consumption, fuel usage, and calculate Scope 1 & 2 greenhouse gas emissions with country-specific emission factors.</p>
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
            {activityCount > 0 ? `${activityCount} records logged →` : "Get started →"}
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Latest snapshot ({latestCalc.year})</h2>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No emissions data yet</h2>
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
