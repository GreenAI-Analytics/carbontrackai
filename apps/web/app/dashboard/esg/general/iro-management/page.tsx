"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";

type DueDiligence = { scope: string; methodology: string; coverage: string; outcomes: string };
type RiskMgmt = { category: string; process: string; integration: string; effectiveness: string };
type Narrative = { datapointRef: string; text: string };

export default function IroManagementPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [dueDiligence, setDueDiligence] = useState<DueDiligence[]>([]);
  const [riskMgmt, setRiskMgmt] = useState<RiskMgmt[]>([]);
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [tab, setTab] = useState<"due_diligence" | "risk" | "narratives">("due_diligence");
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

    const [dd, rm, nd] = await Promise.all([
      supabase.from("due_diligence_process").select("*").eq("organization_id", oid).eq("reporting_period_id", pid),
      supabase.from("risk_management_esg").select("*").eq("organization_id", oid).eq("reporting_period_id", pid),
      supabase.from("narrative_disclosures").select("*").eq("organization_id", oid).eq("reporting_period_id", pid),
    ]);

    if (dd.data?.length) setDueDiligence(dd.data.map((x: any) => ({ scope: x.scope_area ?? "", methodology: x.methodology_description ?? "", coverage: String(x.coverage_percentage ?? ""), outcomes: x.outcomes ?? "" })));
    if (rm.data?.length) setRiskMgmt(rm.data.map((x: any) => ({ category: x.risk_category ?? "", process: x.process_description ?? "", integration: x.integration_with_erm ?? "", effectiveness: x.control_effectiveness ?? "" })));
    if (nd.data?.length) setNarratives(nd.data.map((x: any) => ({ datapointRef: x.esrs_datapoint_ref ?? "", text: x.narrative_text ?? "" })));

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!orgId || !periodId) return;
    setSaving(true); setSaved(false);

    await Promise.all([
      supabase.from("due_diligence_process").delete().eq("organization_id", orgId).eq("reporting_period_id", periodId),
      supabase.from("risk_management_esg").delete().eq("organization_id", orgId).eq("reporting_period_id", periodId),
      supabase.from("narrative_disclosures").delete().eq("organization_id", orgId).eq("reporting_period_id", periodId),
    ]);

    const ops = [];
    const vdd = dueDiligence.filter((d) => d.scope);
    const vrm = riskMgmt.filter((r) => r.category);
    const vnd = narratives.filter((n) => n.datapointRef);

    if (vdd.length) ops.push(supabase.from("due_diligence_process").insert(vdd.map((d) => ({ organization_id: orgId, reporting_period_id: periodId, scope_area: d.scope, methodology_description: d.methodology || null, coverage_percentage: parseFloat(d.coverage) || null, outcomes: d.outcomes || null }))));
    if (vrm.length) ops.push(supabase.from("risk_management_esg").insert(vrm.map((r) => ({ organization_id: orgId, reporting_period_id: periodId, risk_category: r.category, process_description: r.process || null, integration_with_erm: r.integration || null, control_effectiveness: r.effectiveness || null }))));
    if (vnd.length) ops.push(supabase.from("narrative_disclosures").insert(vnd.map((n) => ({ organization_id: orgId, reporting_period_id: periodId, esrs_datapoint_ref: n.datapointRef, narrative_text: n.text, disclosure_type: "narrative" }))));

    await Promise.all(ops);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <div className="space-y-6 animate-pulse"><div className="h-6 w-48 rounded bg-gray-200" /><div className="h-64 rounded-xl bg-gray-100" /></div>;

  const TABS = [
    ["due_diligence", "🔍 Due Diligence"],
    ["risk", "⚠️ Risk Management"],
    ["narratives", "📝 Narrative Disclosures"],
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-primary-600 hover:text-primary-700">← Back to Overview</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">IRO Management</h1>
        <p className="text-gray-600">ESRS 2 IRO-1, IRO-4 · Due diligence process, ESG risk management integration, and supplementary narrative disclosures.</p>
      </div>

      <div className="flex border-b border-gray-200 gap-1">
        {TABS.map(([t, l]) => (
          <button key={t} type="button" onClick={() => setTab(t as any)} className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition ${tab === t ? "bg-white text-primary-700 border border-b-white -mb-px border-gray-200" : "text-gray-500 hover:text-gray-700"}`}>{l}</button>
        ))}
        <div className="flex-1 border-b border-gray-200" />
      </div>

      <form onSubmit={save} className="rounded-b-xl rounded-tr-xl border border-t-0 border-gray-200 bg-white p-6 space-y-8">
        {/* Due Diligence */}
        {tab === "due_diligence" && (
          <div className="space-y-4">
            <div className="flex justify-between"><Section title="Due Diligence Process" desc="Describe your ESG due diligence scope, methodology, and outcomes per ESRS 2 IRO-1."><></></Section><button type="button" onClick={() => setDueDiligence([...dueDiligence, { scope: "", methodology: "", coverage: "", outcomes: "" }])} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Add scope</button></div>
            {dueDiligence.map((d, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Scope area" value={d.scope} onChange={(v) => { const n = [...dueDiligence]; n[i].scope = v; setDueDiligence(n); }} placeholder="e.g. Supply chain human rights" />
                  <Field label="Coverage %" value={d.coverage} onChange={(v) => { const n = [...dueDiligence]; n[i].coverage = v; setDueDiligence(n); }} />
                </div>
                <Textarea label="Methodology" value={d.methodology} onChange={(v) => { const n = [...dueDiligence]; n[i].methodology = v; setDueDiligence(n); }} rows={3} placeholder="Describe how due diligence is conducted — frameworks used, frequency, data sources..." />
                <div className="flex gap-3 items-end">
                  <Textarea label="Outcomes" value={d.outcomes} onChange={(v) => { const n = [...dueDiligence]; n[i].outcomes = v; setDueDiligence(n); }} rows={2} placeholder="Key findings and actions taken..." />
                  <button type="button" onClick={() => setDueDiligence(dueDiligence.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm mb-1">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Risk Management */}
        {tab === "risk" && (
          <div className="space-y-4">
            <div className="flex justify-between"><Section title="ESG Risk Management" desc="Risk categories, processes, ERM integration, and control effectiveness per ESRS 2 IRO-4."><></></Section><button type="button" onClick={() => setRiskMgmt([...riskMgmt, { category: "", process: "", integration: "", effectiveness: "" }])} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Add risk category</button></div>
            {riskMgmt.map((r, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Risk category" value={r.category} onChange={(v) => { const n = [...riskMgmt]; n[i].category = v; setRiskMgmt(n); }} placeholder="e.g. Climate transition risk" />
                  <Field label="Control effectiveness" value={r.effectiveness} onChange={(v) => { const n = [...riskMgmt]; n[i].effectiveness = v; setRiskMgmt(n); }} placeholder="e.g. Effective" />
                </div>
                <Textarea label="Process description" value={r.process} onChange={(v) => { const n = [...riskMgmt]; n[i].process = v; setRiskMgmt(n); }} rows={3} placeholder="How is this risk identified, assessed, and managed?" />
                <div className="flex gap-3 items-end">
                  <Textarea label="Integration with ERM" value={r.integration} onChange={(v) => { const n = [...riskMgmt]; n[i].integration = v; setRiskMgmt(n); }} rows={2} placeholder="How does ESG risk management integrate with overall enterprise risk management?" />
                  <button type="button" onClick={() => setRiskMgmt(riskMgmt.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm mb-1">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Narrative Disclosures */}
        {tab === "narratives" && (
          <div className="space-y-4">
            <div className="flex justify-between"><Section title="Narrative Disclosures" desc="Supplementary narrative disclosures keyed to specific ESRS datapoint references."><></></Section><button type="button" onClick={() => setNarratives([...narratives, { datapointRef: "", text: "" }])} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Add narrative</button></div>
            {narratives.map((n, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-4 space-y-3">
                <Field label="ESRS datapoint reference" value={n.datapointRef} onChange={(v) => { const nd = [...narratives]; nd[i].datapointRef = v; setNarratives(nd); }} placeholder="e.g. ESRS 2 SBM-3 para 48" />
                <div className="flex gap-3 items-end">
                  <Textarea label="Narrative text" value={n.text} onChange={(v) => { const nd = [...narratives]; nd[i].text = v; setNarratives(nd); }} rows={4} placeholder="Enter the narrative disclosure text..." />
                  <button type="button" onClick={() => setNarratives(narratives.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm mb-1">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <button type="submit" disabled={saving} className="rounded-lg bg-primary-600 px-6 py-2.5 font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60">{saving ? "Saving…" : "Save all"}</button>
          {saved && <span className="text-sm text-emerald-600 font-medium">✓ Saved</span>}
        </div>
      </form>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return <div className="space-y-3"><div><h2 className="text-lg font-semibold text-gray-900">{title}</h2><p className="text-sm text-gray-500">{desc}</p></div>{children}</div>;
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <div><label className="mb-1 block text-xs font-medium text-gray-600">{label}</label><input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" /></div>;
}

function Textarea({ label, value, onChange, rows = 3, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return <div><label className="mb-1 block text-xs font-medium text-gray-600">{label}</label><textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 resize-vertical" /></div>;
}
