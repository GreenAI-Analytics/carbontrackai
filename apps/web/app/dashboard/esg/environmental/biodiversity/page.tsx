"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";

type Row = { siteName: string; location: string; nearProtected: boolean; protectedName: string; hasPlan: boolean };

export default function BiodiversityPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: r } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).single();
    if (!r) { setLoading(false); return; }
    setOrgId(r.organization_id);
    const { data: d } = await supabase.from("biodiversity_sites").select("*").eq("organization_id", r.organization_id);
    if (d?.length) setRows(d.map((x: any) => ({ siteName: x.site_name ?? "", location: x.location_description ?? "", nearProtected: !!x.near_protected_area, protectedName: x.protected_area_name ?? "", hasPlan: !!x.biodiversity_action_plan })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setSaving(true); setSaved(false);
    await supabase.from("biodiversity_sites").delete().eq("organization_id", orgId);
    const valid = rows.filter((r) => r.siteName);
    if (valid.length) await supabase.from("biodiversity_sites").insert(valid.map((r) => ({ organization_id: orgId, site_name: r.siteName, location_description: r.location || null, near_protected_area: r.nearProtected, protected_area_name: r.protectedName || null, biodiversity_action_plan: r.hasPlan })));
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <div className="space-y-6 animate-pulse"><div className="h-6 w-48 rounded bg-gray-200" /><div className="h-64 rounded-xl bg-gray-100" /></div>;

  const nearProtected = rows.filter((r) => r.nearProtected).length;
  const withPlan = rows.filter((r) => r.hasPlan).length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-primary-600 hover:text-primary-700">← Back to Overview</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Biodiversity & Ecosystems</h1>
        <p className="text-gray-600">ESRS E4-1 to E4-6 · Site proximity to protected areas, biodiversity action plans, ecosystem impacts.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiBox label="Sites" value={String(rows.length)} colour="blue" />
        <KpiBox label="Near protected area" value={String(nearProtected)} colour={nearProtected > 0 ? "amber" : "emerald"} />
        <KpiBox label="Action plans" value={String(withPlan)} colour={withPlan > 0 ? "emerald" : "amber"} sub={rows.length > 0 && withPlan < rows.length ? `${rows.length - withPlan} sites need plan` : undefined} />
      </div>

      <form onSubmit={save} className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
        <div className="flex justify-between"><div><h2 className="text-lg font-semibold text-gray-900">Sites</h2><p className="text-sm text-gray-500">Operational sites and their proximity to biodiversity-sensitive areas.</p></div><button type="button" onClick={() => setRows([...rows, { siteName: "", location: "", nearProtected: false, protectedName: "", hasPlan: false }])} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Add site</button></div>
        {rows.length === 0 && <div className="text-center py-12 text-gray-400"><p className="text-5xl mb-3">🌿</p><p>No sites recorded. Click &ldquo;+ Add site&rdquo; to start.</p></div>}
        {rows.map((r, i) => (
          <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Site name" value={r.siteName} onChange={(v) => { const n = [...rows]; n[i].siteName = v; setRows(n); }} />
              <Field label="Location" value={r.location} onChange={(v) => { const n = [...rows]; n[i].location = v; setRows(n); }} />
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={r.nearProtected} onChange={(e) => { const n = [...rows]; n[i].nearProtected = e.target.checked; setRows(n); }} />Near protected area</label>
              {r.nearProtected && <Field label="Protected area name" value={r.protectedName} onChange={(v) => { const n = [...rows]; n[i].protectedName = v; setRows(n); }} />}
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={r.hasPlan} onChange={(e) => { const n = [...rows]; n[i].hasPlan = e.target.checked; setRows(n); }} />Biodiversity action plan in place</label>
              <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm">✕ Remove</button>
            </div>
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
