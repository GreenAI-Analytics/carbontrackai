"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";

type MatRow = { materialType: string; inputTonnes: string; recycledPct: string; renewablePct: string };
type WasteRow = { wasteCode: string; hazardous: boolean; method: string; tonnage: string };

export default function CircularEconomyPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [materials, setMaterials] = useState<MatRow[]>([]);
  const [waste, setWaste] = useState<WasteRow[]>([]);
  const [tab, setTab] = useState<"materials" | "waste">("materials");
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
    const [{ data: m }, { data: w }] = await Promise.all([
      supabase.from("material_flows").select("*").eq("organization_id", oid).eq("reporting_period_id", pid),
      supabase.from("waste_generation").select("*").eq("organization_id", oid).eq("reporting_period_id", pid),
    ]);
    if (m?.length) setMaterials(m.map((x: any) => ({ materialType: x.material_type ?? "", inputTonnes: String(x.input_mass_tonnes ?? ""), recycledPct: String(x.recycled_content_percentage ?? ""), renewablePct: String(x.renewable_percentage ?? "") })));
    if (w?.length) setWaste(w.map((x: any) => ({ wasteCode: x.waste_code ?? "", hazardous: !!x.hazardous, method: x.disposal_method ?? "landfill", tonnage: String(x.tonnage ?? "") })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!orgId || !periodId) return;
    setSaving(true); setSaved(false);
    await Promise.all([
      supabase.from("material_flows").delete().eq("organization_id", orgId).eq("reporting_period_id", periodId),
      supabase.from("waste_generation").delete().eq("organization_id", orgId).eq("reporting_period_id", periodId),
    ]);
    const vm = materials.filter((r) => r.materialType);
    const vw = waste.filter((r) => r.tonnage);
    const ops = [];
    if (vm.length) ops.push(supabase.from("material_flows").insert(vm.map((r) => ({ organization_id: orgId, reporting_period_id: periodId, material_type: r.materialType, input_mass_tonnes: parseFloat(r.inputTonnes) || 0, recycled_content_percentage: parseFloat(r.recycledPct) || null, renewable_percentage: parseFloat(r.renewablePct) || null }))));
    if (vw.length) ops.push(supabase.from("waste_generation").insert(vw.map((r) => ({ organization_id: orgId, reporting_period_id: periodId, waste_code: r.wasteCode || null, hazardous: r.hazardous, disposal_method: r.method, tonnage: parseFloat(r.tonnage) || 0 }))));
    await Promise.all(ops);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <div className="space-y-6 animate-pulse"><div className="h-6 w-48 rounded bg-gray-200" /><div className="h-64 rounded-xl bg-gray-100" /></div>;

  const totalMaterial = materials.reduce((s, r) => s + (parseFloat(r.inputTonnes) || 0), 0);
  const totalWaste = waste.reduce((s, r) => s + (parseFloat(r.tonnage) || 0), 0);
  const hazardousWaste = waste.filter((r) => r.hazardous).length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-primary-600 hover:text-primary-700">← Back to Overview</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Resource Use & Circular Economy</h1>
        <p className="text-gray-600">ESRS E5-1 to E5-7 · Material flows, waste by type and disposal method, circularity rate.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiBox label="Material input" value={`${totalMaterial.toFixed(1)} t`} colour="blue" />
        <KpiBox label="Waste generated" value={`${totalWaste.toFixed(1)} t`} colour="blue" />
        <KpiBox label="Hazardous waste" value={String(hazardousWaste)} colour={hazardousWaste > 0 ? "red" : "emerald"} />
      </div>

      <div className="flex border-b border-gray-200 gap-1">
        {[["materials", "📦 Material Flows"], ["waste", "🗑️ Waste"]].map(([t, l]) => (
          <button key={t} type="button" onClick={() => setTab(t as any)} className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition ${tab === t ? "bg-white text-primary-700 border border-b-white -mb-px border-gray-200" : "text-gray-500 hover:text-gray-700"}`}>{l}</button>
        ))}
        <div className="flex-1 border-b border-gray-200" />
      </div>

      <form onSubmit={save} className="rounded-b-xl rounded-tr-xl border border-t-0 border-gray-200 bg-white p-6 space-y-6">
        {tab === "materials" && (
          <div className="space-y-4">
            <div className="flex justify-between"><div><h2 className="text-lg font-semibold text-gray-900">Material Flows</h2><p className="text-sm text-gray-500">Input materials, recycled content, and renewable share.</p></div><button type="button" onClick={() => setMaterials([...materials, { materialType: "", inputTonnes: "", recycledPct: "", renewablePct: "" }])} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Add material</button></div>
            {materials.map((r, i) => (
              <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end border border-gray-100 rounded-lg p-3">
                <Field label="Material type" value={r.materialType} onChange={(v) => { const n = [...materials]; n[i].materialType = v; setMaterials(n); }} placeholder="e.g. Steel" />
                <Field label="Input (tonnes)" value={r.inputTonnes} onChange={(v) => { const n = [...materials]; n[i].inputTonnes = v; setMaterials(n); }} type="decimal" />
                <Field label="Recycled %" value={r.recycledPct} onChange={(v) => { const n = [...materials]; n[i].recycledPct = v; setMaterials(n); }} type="decimal" />
                <Field label="Renewable %" value={r.renewablePct} onChange={(v) => { const n = [...materials]; n[i].renewablePct = v; setMaterials(n); }} type="decimal" />
                <button type="button" onClick={() => setMaterials(materials.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm mb-1">✕</button>
              </div>
            ))}
          </div>
        )}

        {tab === "waste" && (
          <div className="space-y-4">
            <div className="flex justify-between"><div><h2 className="text-lg font-semibold text-gray-900">Waste Generation</h2><p className="text-sm text-gray-500">By type, hazard classification, and disposal method.</p></div><button type="button" onClick={() => setWaste([...waste, { wasteCode: "", hazardous: false, method: "landfill", tonnage: "" }])} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Add waste</button></div>
            {waste.map((r, i) => (
              <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end border border-gray-100 rounded-lg p-3">
                <Field label="Waste code" value={r.wasteCode} onChange={(v) => { const n = [...waste]; n[i].wasteCode = v; setWaste(n); }} placeholder="e.g. 20 01 01" />
                <Field label="Tonnage" value={r.tonnage} onChange={(v) => { const n = [...waste]; n[i].tonnage = v; setWaste(n); }} type="decimal" />
                <div><label className="mb-1 block text-xs font-medium text-gray-600">Method</label><select value={r.method} onChange={(e) => { const n = [...waste]; n[i].method = e.target.value; setWaste(n); }} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="recycling">Recycling</option><option value="landfill">Landfill</option><option value="incineration">Incineration</option><option value="composting">Composting</option><option value="energy_recovery">Energy recovery</option><option value="other">Other</option></select></div>
                <label className="flex items-center gap-2 text-sm mb-1"><input type="checkbox" checked={r.hazardous} onChange={(e) => { const n = [...waste]; n[i].hazardous = e.target.checked; setWaste(n); }} />Hazardous</label>
                <button type="button" onClick={() => setWaste(waste.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm mb-1">✕</button>
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
  const c: Record<string, string> = { blue: "bg-blue-50 border-blue-200 text-blue-700", emerald: "bg-emerald-50 border-emerald-200 text-emerald-700", red: "bg-red-50 border-red-200 text-red-700" };
  return <div className={`rounded-xl border px-4 py-3 ${c[colour] || c.blue}`}><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p><p className="text-2xl font-bold mt-1">{value}</p>{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}</div>;
}

function Field({ label, value, onChange, type = "int", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: "int" | "decimal"; placeholder?: string }) {
  return <div><label className="mb-1 block text-xs font-medium text-gray-600">{label}</label><input type="number" min="0" step={type === "decimal" ? "0.01" : "1"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" /></div>;
}
