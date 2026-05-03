"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";

type Row = { country: string; riskLevel: string; remediation: string; status: string };

export default function ValueChainPage() {
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
    const { data: d } = await supabase.from("human_rights_due_diligence").select("*").eq("organization_id", oid).eq("reporting_period_id", p?.id);
    if (d?.length) setRows(d.map((x: any) => ({ country: x.country ?? "", riskLevel: x.risk_level ?? "low", remediation: x.remediation_actions ?? "", status: x.status ?? "" })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!orgId || !periodId) return;
    setSaving(true); setSaved(false);
    await supabase.from("human_rights_due_diligence").delete().eq("organization_id", orgId).eq("reporting_period_id", periodId);
    const valid = rows.filter((r) => r.country);
    if (valid.length) await supabase.from("human_rights_due_diligence").insert(valid.map((r) => ({ organization_id: orgId, reporting_period_id: periodId, country: r.country, risk_level: r.riskLevel, remediation_actions: r.remediation || null, status: r.status || null })));
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <div className="space-y-6 animate-pulse"><div className="h-6 w-48 rounded bg-gray-200" /><div className="h-64 rounded-xl bg-gray-100" /></div>;

  const highRisk = rows.filter((r) => r.riskLevel === "high" || r.riskLevel === "critical").length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-primary-600 hover:text-primary-700">← Back to Overview</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Workers in Value Chain</h1>
        <p className="text-gray-600">ESRS S2-1 to S2-5 · Human rights due diligence, supply chain risk assessment, remediation tracking.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiBox label="Countries assessed" value={String(rows.length)} colour="blue" />
        <KpiBox label="High/critical risk" value={String(highRisk)} colour={highRisk > 0 ? "red" : "emerald"} sub={highRisk > 0 ? "Priority action needed" : "No high-risk countries"} />
        <KpiBox label="With remediation" value={String(rows.filter((r) => r.remediation).length)} colour="blue" />
      </div>

      <form onSubmit={save} className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
        <div className="flex justify-between"><div><h2 className="text-lg font-semibold text-gray-900">Supply Chain Due Diligence</h2><p className="text-sm text-gray-500">Country-level human rights risk assessments for your value chain.</p></div><button type="button" onClick={() => setRows([...rows, { country: "", riskLevel: "low", remediation: "", status: "" }])} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Add country</button></div>
        {rows.length === 0 && <div className="text-center py-12 text-gray-400"><p className="text-5xl mb-3">🔗</p><p>No countries assessed. Click &ldquo;+ Add country&rdquo; to start.</p></div>}
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end border border-gray-100 rounded-lg p-3">
            <Field label="Country" value={r.country} onChange={(v) => { const n = [...rows]; n[i].country = v; setRows(n); }} placeholder="e.g. Bangladesh" />
            <div><label className="mb-1 block text-xs font-medium text-gray-600">Risk level</label><select value={r.riskLevel} onChange={(e) => { const n = [...rows]; n[i].riskLevel = e.target.value; setRows(n); }} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
            <Field label="Status" value={r.status} onChange={(v) => { const n = [...rows]; n[i].status = v; setRows(n); }} placeholder="e.g. In progress" />
            <Field label="Remediation actions" value={r.remediation} onChange={(v) => { const n = [...rows]; n[i].remediation = v; setRows(n); }} placeholder="e.g. Supplier audit" />
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
  const c: Record<string, string> = { blue: "bg-blue-50 border-blue-200 text-blue-700", emerald: "bg-emerald-50 border-emerald-200 text-emerald-700", red: "bg-red-50 border-red-200 text-red-700" };
  return <div className={`rounded-xl border px-4 py-3 ${c[colour] || c.blue}`}><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p><p className="text-2xl font-bold mt-1">{value}</p>{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}</div>;
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <div><label className="mb-1 block text-xs font-medium text-gray-600">{label}</label><input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" /></div>;
}
