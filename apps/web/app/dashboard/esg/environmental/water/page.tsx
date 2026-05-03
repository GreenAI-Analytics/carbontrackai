"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";

type ConsRow = { source: string; volume: string; recycledPct: string; stressArea: boolean };
type DiscRow = { volume: string; treatment: string; waterBody: string };

export default function WaterPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [consumption, setConsumption] = useState<ConsRow[]>([]);
  const [discharge, setDischarge] = useState<DiscRow[]>([]);
  const [tab, setTab] = useState<"consumption" | "discharge">("consumption");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: r } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).single();
    if (!r) { setLoading(false); return; }
    const oid = r.organization_id; setOrgId(oid);
    const y = new Date().getFullYear();
    let { data: p } = await supabase.from("reporting_periods").select("id").eq("organization_id", oid).eq("year", y).single();
    if (!p) { const { data: np } = await supabase.from("reporting_periods").insert({ organization_id: oid, year: y, start_date: `${y}-01-01`, end_date: `${y}-12-31` }).select("id").single(); p = np; }
    setPeriodId(p?.id ?? null);
    const pid = p?.id;
    const [{ data: c }, { data: d }] = await Promise.all([
      supabase.from("water_consumption").select("*").eq("organization_id", oid).eq("reporting_period_id", pid),
      supabase.from("water_discharge").select("*").eq("organization_id", oid).eq("reporting_period_id", pid),
    ]);
    if (c?.length) setConsumption(c.map((x: any) => ({ source: x.source ?? "municipal", volume: String(x.volume_m3 ?? ""), recycledPct: String(x.recycled_percentage ?? ""), stressArea: !!x.water_stress_area })));
    if (d?.length) setDischarge(d.map((x: any) => ({ volume: String(x.volume_m3 ?? ""), treatment: x.treatment_level ?? "", waterBody: x.receiving_water_body ?? "" })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!orgId || !periodId) return;
    setSaving(true); setSaved(false);
    await Promise.all([
      supabase.from("water_consumption").delete().eq("organization_id", orgId).eq("reporting_period_id", periodId),
      supabase.from("water_discharge").delete().eq("organization_id", orgId).eq("reporting_period_id", periodId),
    ]);
    const vc = consumption.filter((r) => r.volume);
    const vd = discharge.filter((r) => r.volume);
    const ops = [];
    if (vc.length) ops.push(supabase.from("water_consumption").insert(vc.map((r) => ({ organization_id: orgId, reporting_period_id: periodId, source: r.source, volume_m3: parseFloat(r.volume) || 0, recycled_percentage: parseFloat(r.recycledPct) || null, water_stress_area: r.stressArea }))));
    if (vd.length) ops.push(supabase.from("water_discharge").insert(vd.map((r) => ({ organization_id: orgId, reporting_period_id: periodId, volume_m3: parseFloat(r.volume) || 0, treatment_level: r.treatment || null, receiving_water_body: r.waterBody || null }))));
    await Promise.all(ops);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <div className="space-y-6 animate-pulse"><div className="h-6 w-48 rounded bg-gray-200" /><div className="h-64 rounded-xl bg-gray-100" /></div>;

  const totalConsumption = consumption.reduce((s, r) => s + (parseFloat(r.volume) || 0), 0);
  const totalDischarge = discharge.reduce((s, r) => s + (parseFloat(r.volume) || 0), 0);
  const stressSites = consumption.filter((r) => r.stressArea).length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-primary-600 hover:text-primary-700">← Back to Overview</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Water & Marine Resources</h1>
        <p className="text-gray-600">ESRS E3-1 to E3-5 · Water consumption by source, discharge, and water stress assessment.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiBox label="Total consumption" value={`${totalConsumption.toFixed(1)} m³`} colour="blue" />
        <KpiBox label="Total discharge" value={`${totalDischarge.toFixed(1)} m³`} colour="blue" />
        <KpiBox label="Water stress areas" value={String(stressSites)} colour={stressSites > 0 ? "amber" : "emerald"} sub={stressSites > 0 ? "Monitor closely" : "No stress areas"} />
      </div>

      <div className="flex border-b border-gray-200 gap-1">
        {[["consumption", "💧 Consumption"], ["discharge", "🌊 Discharge"]].map(([t, l]) => (
          <button key={t} type="button" onClick={() => setTab(t as any)} className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition ${tab === t ? "bg-white text-primary-700 border border-b-white -mb-px border-gray-200" : "text-gray-500 hover:text-gray-700"}`}>{l}</button>
        ))}
        <div className="flex-1 border-b border-gray-200" />
      </div>

      <form onSubmit={save} className="rounded-b-xl rounded-tr-xl border border-t-0 border-gray-200 bg-white p-6 space-y-6">
        {tab === "consumption" && (
          <div className="space-y-4">
            <div className="flex justify-between"><div><h2 className="text-lg font-semibold text-gray-900">Water Consumption</h2><p className="text-sm text-gray-500">By source: municipal, groundwater, surface water, rainwater, recycled.</p></div><button type="button" onClick={() => setConsumption([...consumption, { source: "municipal", volume: "", recycledPct: "", stressArea: false }])} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Add</button></div>
            {consumption.map((r, i) => (
              <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end border border-gray-100 rounded-lg p-3">
                <div><label className="mb-1 block text-xs font-medium text-gray-600">Source</label><select value={r.source} onChange={(e) => { const n = [...consumption]; n[i].source = e.target.value; setConsumption(n); }} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="municipal">Municipal</option><option value="groundwater">Groundwater</option><option value="surface_water">Surface water</option><option value="rainwater">Rainwater</option><option value="recycled">Recycled</option></select></div>
                <Field label="Volume (m³)" value={r.volume} onChange={(v) => { const n = [...consumption]; n[i].volume = v; setConsumption(n); }} type="decimal" />
                <Field label="Recycled %" value={r.recycledPct} onChange={(v) => { const n = [...consumption]; n[i].recycledPct = v; setConsumption(n); }} type="decimal" />
                <label className="flex items-center gap-2 text-sm mb-1"><input type="checkbox" checked={r.stressArea} onChange={(e) => { const n = [...consumption]; n[i].stressArea = e.target.checked; setConsumption(n); }} />Water stress area</label>
                <button type="button" onClick={() => setConsumption(consumption.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm mb-1">✕</button>
              </div>
            ))}
          </div>
        )}

        {tab === "discharge" && (
          <div className="space-y-4">
            <div className="flex justify-between"><div><h2 className="text-lg font-semibold text-gray-900">Water Discharge</h2><p className="text-sm text-gray-500">Volume, treatment level, and receiving water body.</p></div><button type="button" onClick={() => setDischarge([...discharge, { volume: "", treatment: "", waterBody: "" }])} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Add</button></div>
            {discharge.map((r, i) => (
              <div key={i} className="grid grid-cols-3 gap-3 items-end border border-gray-100 rounded-lg p-3">
                <Field label="Volume (m³)" value={r.volume} onChange={(v) => { const n = [...discharge]; n[i].volume = v; setDischarge(n); }} type="decimal" />
                <Field label="Treatment level" value={r.treatment} onChange={(v) => { const n = [...discharge]; n[i].treatment = v; setDischarge(n); }} placeholder="e.g. Secondary" />
                <div className="flex gap-2"><Field label="Receiving water body" value={r.waterBody} onChange={(v) => { const n = [...discharge]; n[i].waterBody = v; setDischarge(n); }} placeholder="e.g. River Seine" /><button type="button" onClick={() => setDischarge(discharge.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm mb-1">✕</button></div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <button type="submit" disabled={saving} className="rounded-lg bg-primary-600 px-6 py-2.5 font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
          {saved && <span className="text-sm text-emerald-600 font-medium">✓ Saved</span>}
        </div>
      </form>
    </div>
  );
}

function KpiBox({ label, value, sub, colour }: { label: string; value: string; sub?: string; colour: string }) {
  const c: Record<string, string> = { blue: "bg-blue-50 border-blue-200 text-blue-700", emerald: "bg-emerald-50 border-emerald-200 text-emerald-700", amber: "bg-amber-50 border-amber-200 text-amber-700" };
  return <div className={`rounded-xl border px-4 py-3 ${c[colour] || c.blue}`}><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p><p className="text-2xl font-bold mt-1">{value}</p>{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}</div>;
}

function Field({ label, value, onChange, type = "int", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: "int" | "decimal"; placeholder?: string }) {
  return <div><label className="mb-1 block text-xs font-medium text-gray-600">{label}</label><input type={type === "decimal" ? "number" : "text"} min="0" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" /></div>;
}
