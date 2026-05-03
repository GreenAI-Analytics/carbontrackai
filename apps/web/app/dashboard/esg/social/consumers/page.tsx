"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";

type Row = { incType: string; severity: string; recalls: string; fines: string };

export default function ConsumersPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
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
    const { data: d } = await supabase.from("product_safety_incidents").select("*").eq("organization_id", oid).eq("reporting_period_id", p?.id);
    if (d?.length) setRows(d.map((x: any) => ({ incType: x.incident_type ?? "", severity: x.severity ?? "low", recalls: String(x.recalls_count ?? ""), fines: String(x.fines_amount ?? "") })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!orgId || !periodId) return;
    setSaving(true); setSaved(false);
    await supabase.from("product_safety_incidents").delete().eq("organization_id", orgId).eq("reporting_period_id", periodId);
    const valid = rows.filter((r) => r.incType);
    if (valid.length) await supabase.from("product_safety_incidents").insert(valid.map((r) => ({ organization_id: orgId, reporting_period_id: periodId, incident_type: r.incType, severity: r.severity, recalls_count: parseInt(r.recalls) || 0, fines_amount: parseFloat(r.fines) || null })));
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <div className="space-y-6 animate-pulse"><div className="h-6 w-48 rounded bg-gray-200" /><div className="h-64 rounded-xl bg-gray-100" /></div>;

  const totalRecalls = rows.reduce((s, r) => s + (parseInt(r.recalls) || 0), 0);
  const totalFines = rows.reduce((s, r) => s + (parseFloat(r.fines) || 0), 0);
  const critical = rows.filter((r) => r.severity === "critical" || r.severity === "high").length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-primary-600 hover:text-primary-700">← Back to Overview</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Consumers & End-Users</h1>
        <p className="text-gray-600">ESRS S4-1 to S4-5 · Product safety incidents, recalls, consumer health impacts, and privacy.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiBox label="Incidents" value={String(rows.length)} colour="blue" />
        <KpiBox label="Recalls" value={String(totalRecalls)} colour={totalRecalls > 0 ? "red" : "emerald"} />
        <KpiBox label="Fines" value={`€${totalFines.toFixed(0)}`} colour={totalFines > 0 ? "amber" : "emerald"} sub={critical > 0 ? `${critical} critical/high` : undefined} />
      </div>

      <form onSubmit={save} className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
        <div className="flex justify-between"><div><h2 className="text-lg font-semibold text-gray-900">Product Safety Incidents</h2><p className="text-sm text-gray-500">Incident type, severity, recalls, and regulatory fines.</p></div><button type="button" onClick={() => setRows([...rows, { incType: "", severity: "low", recalls: "", fines: "" }])} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Add incident</button></div>
        {rows.length === 0 && <div className="text-center py-12 text-gray-400"><p className="text-5xl mb-3">🛡️</p><p>No incidents recorded. Click &ldquo;+ Add incident&rdquo; to start.</p></div>}
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end border border-gray-100 rounded-lg p-3">
            <Field label="Incident type" value={r.incType} onChange={(v) => { const n = [...rows]; n[i].incType = v; setRows(n); }} placeholder="e.g. Product defect" />
            <div><label className="mb-1 block text-xs font-medium text-gray-600">Severity</label><select value={r.severity} onChange={(e) => { const n = [...rows]; n[i].severity = e.target.value; setRows(n); }} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
            <Field label="Recalls" value={r.recalls} onChange={(v) => { const n = [...rows]; n[i].recalls = v; setRows(n); }} />
            <Field label="Fines (EUR)" value={r.fines} onChange={(v) => { const n = [...rows]; n[i].fines = v; setRows(n); }} type="decimal" />
            <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm mb-1">✕</button>
          </div>
        ))}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <button type="submit" disabled={saving} className="rounded-lg bg-primary-600 px-6 py-2.5 font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
          {saved && <span className="text-sm text-emerald-600 font-medium">✓ Saved</span>}
        </div>
      </form>
    </div>
  );
}

function KpiBox({ label, value, sub, colour }: { label: string; value: string; sub?: string; colour: string }) {
  const c: Record<string, string> = { blue: "bg-blue-50 border-blue-200 text-blue-700", emerald: "bg-emerald-50 border-emerald-200 text-emerald-700", amber: "bg-amber-50 border-amber-200 text-amber-700", red: "bg-red-50 border-red-200 text-red-700" };
  return <div className={`rounded-xl border px-4 py-3 ${c[colour] || c.blue}`}><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p><p className="text-2xl font-bold mt-1">{value}</p>{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}</div>;
}

function Field({ label, value, onChange, type = "int", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: "int" | "decimal"; placeholder?: string }) {
  return <div><label className="mb-1 block text-xs font-medium text-gray-600">{label}</label><input type="number" min="0" step={type === "decimal" ? "0.01" : "1"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" /></div>;
}
