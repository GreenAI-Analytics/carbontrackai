"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { formatEuro } from "@/lib/governance-metrics";

type Incident = { id?: string; itype: string; desc: string; fines: string; sanctions: string; legal: string };
type Whistleblower = { reports: string; investigated: string; substantiated: string; remediation: string };
type Deadline = { title: string; date: string; authority: string; status: string };

export default function CompliancePage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [wb, setWb] = useState<Whistleblower>({ reports: "", investigated: "", substantiated: "", remediation: "" });
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [individualCases, setIndividualCases] = useState<Array<{ case_reference: string; report_type: string; case_status: string; submitted_at: string; acknowledged_at: string | null; feedback_deadline: string | null; description: string | null }>>([]);
  const [tab, setTab] = useState<"incidents" | "whistleblower" | "deadlines">("incidents");
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

    const [inc, wbData, nd, indivCases] = await Promise.all([
      supabase.from("compliance_incidents").select("*").eq("organization_id", oid).eq("reporting_period_id", pid),
      supabase.from("whistleblower_cases").select("*").eq("organization_id", oid).eq("reporting_period_id", pid).single(),
      supabase.from("narrative_disclosures").select("*").eq("organization_id", oid).eq("reporting_period_id", pid).eq("disclosure_type", "regulatory_deadline"),
      supabase.from("whistleblower_cases").select("case_reference,report_type,case_status,submitted_at,acknowledged_at,feedback_deadline,description").eq("organization_id", oid).not("case_reference", "is", null).order("submitted_at", { ascending: false }).limit(20),
    ]);

    if (inc.data?.length) setIncidents(inc.data.map((x: any) => ({ id: x.id, itype: x.incident_type ?? "", desc: x.description ?? "", fines: String(x.regulatory_fines ?? ""), sanctions: String(x.non_monetary_sanctions ?? ""), legal: String(x.legal_actions ?? "") })));
    if (wbData.data) setWb({ reports: String(wbData.data.reports_received ?? ""), investigated: String(wbData.data.cases_investigated ?? ""), substantiated: String(wbData.data.cases_substantiated ?? ""), remediation: wbData.data.remediation_actions ?? "" });
    if (nd.data?.length) setDeadlines(nd.data.map((x: any) => ({ title: x.esrs_datapoint_ref ?? "", date: x.narrative_text ?? "", authority: "", status: "pending" })));
    if (indivCases.data?.length) setIndividualCases(indivCases.data as any[]);

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!orgId || !periodId) return;
    setSaving(true); setSaved(false);
    const tf = (s: string) => s === "" ? null : parseFloat(s);
    const ti = (s: string) => s === "" ? null : parseInt(s, 10);

    // Incidents: delete and re-insert
    await supabase.from("compliance_incidents").delete().eq("organization_id", orgId).eq("reporting_period_id", periodId);
    const vi = incidents.filter((i) => i.itype);
    const ops = [];
    if (vi.length) ops.push(supabase.from("compliance_incidents").insert(vi.map((i) => ({ organization_id: orgId, reporting_period_id: periodId, incident_type: i.itype, description: i.desc || null, regulatory_fines: tf(i.fines), non_monetary_sanctions: ti(i.sanctions), legal_actions: ti(i.legal) }))));

    // Whistleblower: upsert
    ops.push(supabase.from("whistleblower_cases").upsert({ organization_id: orgId, reporting_period_id: periodId, reports_received: ti(wb.reports), cases_investigated: ti(wb.investigated), cases_substantiated: ti(wb.substantiated), remediation_actions: wb.remediation || null }, { onConflict: "organization_id,reporting_period_id" }));

    // Deadlines: store as narrative_disclosures
    await supabase.from("narrative_disclosures").delete().eq("organization_id", orgId).eq("reporting_period_id", periodId).eq("disclosure_type", "regulatory_deadline");
    const vd = deadlines.filter((d) => d.title);
    if (vd.length) ops.push(supabase.from("narrative_disclosures").insert(vd.map((d) => ({ organization_id: orgId, reporting_period_id: periodId, esrs_datapoint_ref: d.title, narrative_text: d.date, disclosure_type: "regulatory_deadline" }))));

    await Promise.all(ops);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <div className="space-y-6 animate-pulse"><div className="h-6 w-48 rounded bg-gray-200" /><div className="h-64 rounded-xl bg-gray-100" /></div>;

  const totalFines = incidents.reduce((s, i) => s + (parseFloat(i.fines) || 0), 0);
  const totalLegal = incidents.reduce((s, i) => s + (parseInt(i.legal) || 0), 0);
  const wbSubstantiation = parseInt(wb.investigated) > 0 ? ((parseInt(wb.substantiated) || 0) / parseInt(wb.investigated) * 100).toFixed(1) : "0.0";
  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-primary-600 hover:text-primary-700">← Back to Overview</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Compliance & Incidents</h1>
        <p className="text-gray-600">ESRS G1-4 · Regulatory compliance, whistleblower cases, incident tracking, filing deadlines.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiBox label="Total Fines" value={formatEuro(totalFines)} colour="amber" />
        <KpiBox label="Incidents" value={String(incidents.length)} colour="blue" />
        <KpiBox label="Legal Actions" value={String(totalLegal)} colour={totalLegal > 0 ? "red" : "emerald"} />
        <KpiBox label="WB Substantiation" value={`${wbSubstantiation}%`} colour="purple" sub={`${wb.reports || "0"} reports`} />
      </div>

      <div className="flex border-b border-gray-200 gap-1">
        {[["incidents", "⚠️ Incidents"], ["whistleblower", "📢 Whistleblower"], ["deadlines", "📅 Deadlines"]].map(([t, l]) => (
          <button key={t} type="button" onClick={() => setTab(t as any)} className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition ${tab === t ? "bg-white text-primary-700 border border-b-white -mb-px border-gray-200" : "text-gray-500 hover:text-gray-700"}`}>{l}</button>
        ))}
        <div className="flex-1 border-b border-gray-200" />
      </div>

      <form onSubmit={save} className="rounded-b-xl rounded-tr-xl border border-t-0 border-gray-200 bg-white p-6 space-y-8">
        {/* Compliance Incidents */}
        {tab === "incidents" && (
          <div className="space-y-4">
            <div className="flex justify-between"><div><h2 className="text-lg font-semibold text-gray-900">Compliance Incidents</h2><p className="text-sm text-gray-500">Regulatory fines, non-monetary sanctions, legal actions. Each row is one incident type.</p></div><button type="button" onClick={() => setIncidents([...incidents, { itype: "", desc: "", fines: "", sanctions: "", legal: "" }])} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Add incident</button></div>
            {incidents.length === 0 && <div className="text-center py-12 text-gray-400"><p className="text-5xl mb-3">✅</p><p>No incidents recorded. Click &ldquo;+ Add incident&rdquo; to register one.</p></div>}
            {incidents.map((inc, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Incident type" value={inc.itype} onChange={(v) => { const n = [...incidents]; n[i].itype = v; setIncidents(n); }} placeholder="e.g. Environmental breach" />
                  <Field label="Fines (EUR)" value={inc.fines} onChange={(v) => { const n = [...incidents]; n[i].fines = v; setIncidents(n); }} type="decimal" />
                </div>
                <Textarea label="Description" value={inc.desc} onChange={(v) => { const n = [...incidents]; n[i].desc = v; setIncidents(n); }} rows={2} placeholder="Brief description of the incident and circumstances..." />
                <div className="grid grid-cols-3 gap-3 items-end">
                  <Field label="Non-monetary sanctions" value={inc.sanctions} onChange={(v) => { const n = [...incidents]; n[i].sanctions = v; setIncidents(n); }} />
                  <Field label="Legal actions" value={inc.legal} onChange={(v) => { const n = [...incidents]; n[i].legal = v; setIncidents(n); }} />
                  <button type="button" onClick={() => setIncidents(incidents.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm mb-1 justify-self-end">✕ Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Whistleblower */}
        {tab === "whistleblower" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Whistleblower Channel</h2>
              <p className="text-sm text-gray-500">Reports received, investigations, substantiation, and remediation per ESRS G1-1 and Directive 2019/1937.</p>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <strong>⚠️ GDPR & Confidentiality:</strong> Whistleblower case data is subject to strict confidentiality under Directive 2019/1937 Art. 16. Only aggregate counts are stored — no personal identifiers. Access to detailed case files must be restricted to the designated whistleblower officer role.
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Field label="Reports received" value={wb.reports} onChange={(v) => setWb({ ...wb, reports: v })} />
              <Field label="Cases investigated" value={wb.investigated} onChange={(v) => setWb({ ...wb, investigated: v })} />
              <Field label="Cases substantiated" value={wb.substantiated} onChange={(v) => setWb({ ...wb, substantiated: v })} />
            </div>

            {parseInt(wb.investigated) > 0 && (
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-700">
                  <strong>Substantiation rate:</strong> {wbSubstantiation}% ({wb.substantiated || 0} of {wb.investigated || 0} investigated)
                </p>
                <div className="mt-2 h-2 rounded-full bg-gray-200">
                  <div className="h-2 rounded-full bg-purple-500 transition-all" style={{ width: `${Math.min(parseFloat(wbSubstantiation), 100)}%` }} />
                </div>
              </div>
            )}

            <Textarea label="Remediation actions" value={wb.remediation} onChange={(v) => setWb({ ...wb, remediation: v })} rows={3} placeholder="Describe remediation actions taken as a result of substantiated cases..." />
          </div>
        )}

        {/* Regulatory Deadlines */}
        {tab === "deadlines" && (
          <div className="space-y-4">
            <div className="flex justify-between"><div><h2 className="text-lg font-semibold text-gray-900">Regulatory Filing Deadlines</h2><p className="text-sm text-gray-500">Track key compliance deadlines — CSRD filing, tax, environmental permits, data protection.</p></div><button type="button" onClick={() => setDeadlines([...deadlines, { title: "", date: "", authority: "", status: "pending" }])} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Add deadline</button></div>
            {deadlines.length === 0 && <div className="text-center py-12 text-gray-400"><p className="text-5xl mb-3">📅</p><p>No deadlines tracked. Click &ldquo;+ Add deadline&rdquo; to start.</p></div>}
            {deadlines.map((d, i) => (
              <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end border border-gray-100 rounded-lg p-3">
                <Field label="Deadline" value={d.title} onChange={(v) => { const n = [...deadlines]; n[i].title = v; setDeadlines(n); }} placeholder="e.g. CSRD annual filing" />
                <Field label="Due date" value={d.date} onChange={(v) => { const n = [...deadlines]; n[i].date = v; setDeadlines(n); }} placeholder="YYYY-MM-DD" />
                <Field label="Authority" value={d.authority} onChange={(v) => { const n = [...deadlines]; n[i].authority = v; setDeadlines(n); }} placeholder="e.g. BaFin" />
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Status</label>
                  <select value={d.status} onChange={(e) => { const n = [...deadlines]; n[i].status = e.target.value; setDeadlines(n); }} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="pending">Pending</option><option value="in_progress">In progress</option><option value="filed">Filed</option><option value="overdue">Overdue</option>
                  </select>
                </div>
                <button type="button" onClick={() => setDeadlines(deadlines.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm mb-1">✕</button>
              </div>
            ))}
          </div>
        )}

        <hr className="border-gray-200" />

            <div>
              <h2 className="text-lg font-semibold text-gray-900">Individual Case Register</h2>
              <p className="text-sm text-gray-500">Cases submitted via the whistleblower channel at <a href="/whistleblower" className="text-primary-600 hover:text-primary-700" target="_blank">/whistleblower</a>. Case status, deadlines, and timer tracking.</p>
            </div>

            {individualCases.length === 0 ? (
              <p className="text-gray-400 py-4 text-center text-sm">No individual cases submitted yet. Share the <a href="/whistleblower" className="text-primary-600 hover:text-primary-700" target="_blank">whistleblower form link</a> with your organisation.</p>
            ) : (
              <div className="space-y-2">
                {individualCases.map((cs, i) => {
                  const isOverdue = cs.feedback_deadline && new Date(cs.feedback_deadline) < new Date();
                  const needsAck = cs.case_status === "pending" && cs.submitted_at && (new Date().getTime() - new Date(cs.submitted_at).getTime()) > 7 * 86400000;
                  return (
                    <div key={i} className="border border-gray-100 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono font-medium text-gray-900">{cs.case_reference}</span>
                          <span className="text-gray-500 ml-2">{cs.report_type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={"text-xs px-2 py-0.5 rounded-full " + (cs.case_status === "pending" ? "bg-yellow-100 text-yellow-700" : cs.case_status === "acknowledged" ? "bg-blue-100 text-blue-700" : cs.case_status === "investigating" ? "bg-purple-100 text-purple-700" : cs.case_status === "substantiated" ? "bg-red-100 text-red-700" : cs.case_status === "resolved" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>{cs.case_status}</span>
                          {needsAck && <span className="text-xs text-red-600 font-medium">⚠ 7d exceeded</span>}
                          {isOverdue && <span className="text-xs text-red-600 font-medium">⚠ Overdue</span>}
                        </div>
                      </div>
                      {cs.description && <p className="text-gray-600 mt-1 text-xs line-clamp-2">{cs.description}</p>}
                      <div className="flex gap-4 mt-1 text-xs text-gray-400">
                        <span>Submitted: {cs.submitted_at ? new Date(cs.submitted_at).toLocaleDateString("en-GB") : "—"}</span>
                        <span>Ack deadline: {cs.submitted_at ? new Date(new Date(cs.submitted_at).getTime() + 7*86400000).toLocaleDateString("en-GB") : "—"}</span>
                        <span>Feedback by: {cs.feedback_deadline ? new Date(cs.feedback_deadline).toLocaleDateString("en-GB") : "—"}</span>
                      </div>
                    </div>
                  );
                })}
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

function KpiBox({ label, value, sub, colour }: { label: string; value: string; sub?: string; colour: string }) {
  const c: Record<string, string> = { blue: "bg-blue-50 border-blue-200 text-blue-700", emerald: "bg-emerald-50 border-emerald-200 text-emerald-700", amber: "bg-amber-50 border-amber-200 text-amber-700", red: "bg-red-50 border-red-200 text-red-700", purple: "bg-purple-50 border-purple-200 text-purple-700" };
  return <div className={`rounded-xl border px-4 py-3 ${c[colour] || c.blue}`}><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p><p className="text-2xl font-bold mt-1">{value}</p>{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}</div>;
}

function Field({ label, value, onChange, type = "int", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: "int" | "decimal"; placeholder?: string }) {
  const isNum = type === "int" || type === "decimal";
  return <div><label className="mb-1 block text-xs font-medium text-gray-600">{label}</label><input type={isNum ? "number" : "text"} min="0" step={type === "decimal" ? "0.01" : "1"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" /></div>;
}

function Textarea({ label, value, onChange, rows = 3, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return <div><label className="mb-1 block text-xs font-medium text-gray-600">{label}</label><textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 resize-vertical" /></div>;
}
