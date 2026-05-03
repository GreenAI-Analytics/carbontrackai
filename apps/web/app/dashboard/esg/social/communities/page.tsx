"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";

type Row = { engType: string; stakeholderCount: string; complaints: string; outcomes: string };

export default function CommunitiesPage() {
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
    const { data: d } = await supabase.from("community_engagement").select("*").eq("organization_id", oid).eq("reporting_period_id", p?.id);
    if (d?.length) setRows(d.map((x: any) => ({ engType: x.engagement_type ?? "", stakeholderCount: String(x.stakeholder_count ?? ""), complaints: String(x.complaints_received ?? ""), outcomes: x.key_outcomes ?? "" })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!orgId || !periodId) return;
    setSaving(true); setSaved(false);
    await supabase.from("community_engagement").delete().eq("organization_id", orgId).eq("reporting_period_id", periodId);
    const valid = rows.filter((r) => r.engType);
    if (valid.length) await supabase.from("community_engagement").insert(valid.map((r) => ({ organization_id: orgId, reporting_period_id: periodId, engagement_type: r.engType, stakeholder_count: parseInt(r.stakeholderCount) || null, complaints_received: parseInt(r.complaints) || 0, key_outcomes: r.outcomes || null })));
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <div className="space-y-6 animate-pulse"><div className="h-6 w-48 rounded bg-gray-200" /><div className="h-64 rounded-xl bg-gray-100" /></div>;

  const totalStakeholders = rows.reduce((s, r) => s + (parseInt(r.stakeholderCount) || 0), 0);
  const totalComplaints = rows.reduce((s, r) => s + (parseInt(r.complaints) || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-primary-600 hover:text-primary-700">← Back to Overview</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Affected Communities</h1>
        <p className="text-gray-600">ESRS S3-1 to S3-5 · Community engagement, stakeholder relations, and local impact management.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiBox label="Engagements" value={String(rows.length)} colour="blue" />
        <KpiBox label="Stakeholders" value={String(totalStakeholders)} colour="blue" />
        <KpiBox label="Complaints" value={String(totalComplaints)} colour={totalComplaints > 0 ? "amber" : "emerald"} />
      </div>

      <form onSubmit={save} className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
        <div className="flex justify-between"><div><h2 className="text-lg font-semibold text-gray-900">Community Engagement</h2><p className="text-sm text-gray-500">Track engagement activities, stakeholder reach, and community feedback.</p></div><button type="button" onClick={() => setRows([...rows, { engType: "", stakeholderCount: "", complaints: "", outcomes: "" }])} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Add engagement</button></div>
        {rows.length === 0 && <div className="text-center py-12 text-gray-400"><p className="text-5xl mb-3">🏘️</p><p>No engagements recorded. Click &ldquo;+ Add engagement&rdquo; to start.</p></div>}
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end border border-gray-100 rounded-lg p-3">
            <Field label="Engagement type" value={r.engType} onChange={(v) => { const n = [...rows]; n[i].engType = v; setRows(n); }} placeholder="e.g. Town hall" />
            <Field label="Stakeholders" value={r.stakeholderCount} onChange={(v) => { const n = [...rows]; n[i].stakeholderCount = v; setRows(n); }} />
            <Field label="Complaints" value={r.complaints} onChange={(v) => { const n = [...rows]; n[i].complaints = v; setRows(n); }} />
            <Field label="Key outcomes" value={r.outcomes} onChange={(v) => { const n = [...rows]; n[i].outcomes = v; setRows(n); }} placeholder="e.g. Agreement reached" />
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
  const c: Record<string, string> = { blue: "bg-blue-50 border-blue-200 text-blue-700", emerald: "bg-emerald-50 border-emerald-200 text-emerald-700", amber: "bg-amber-50 border-amber-200 text-amber-700" };
  return <div className={`rounded-xl border px-4 py-3 ${c[colour] || c.blue}`}><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p><p className="text-2xl font-bold mt-1">{value}</p>{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}</div>;
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <div><label className="mb-1 block text-xs font-medium text-gray-600">{label}</label><input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" /></div>;
}
