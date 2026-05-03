"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { formatEuro } from "@/lib/governance-metrics";

type Breach = { btype: string; records: string; notified: boolean; fines: string; desc: string };
type GdprItem = { ref: string; text: string };
type Sar = { requestType: string; received: string; responded: string; status: string };

export default function DataPrivacyPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [breaches, setBreaches] = useState<Breach[]>([]);
  const [gdprItems, setGdprItems] = useState<GdprItem[]>([]);
  const [sars, setSars] = useState<Sar[]>([]);
  const [tab, setTab] = useState<"breaches" | "gdpr" | "sars">("breaches");
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

    const [br, gdpr, sar] = await Promise.all([
      supabase.from("data_breaches").select("*").eq("organization_id", oid).eq("reporting_period_id", pid),
      supabase.from("narrative_disclosures").select("*").eq("organization_id", oid).eq("disclosure_type", "gdpr_compliance"),
      supabase.from("narrative_disclosures").select("*").eq("organization_id", oid).eq("disclosure_type", "sar_tracker"),
    ]);

    if (br.data?.length) setBreaches(br.data.map((x: any) => ({ btype: x.breach_type ?? "", records: String(x.records_affected ?? ""), notified: !!x.notified_authority, fines: String(x.fines_amount ?? ""), desc: "" })));
    if (gdpr.data?.length) setGdprItems(gdpr.data.map((x: any) => ({ ref: x.esrs_datapoint_ref ?? "", text: x.narrative_text ?? "" })));
    if (sar.data?.length) setSars(sar.data.map((x: any) => {
      const parts = (x.narrative_text ?? "").split("|");
      return { requestType: x.esrs_datapoint_ref ?? "", received: parts[0] ?? "", responded: parts[1] ?? "", status: parts[2] ?? "pending" };
    }));

    // Default GDPR items if empty
    if (!gdpr.data?.length) {
      setGdprItems([
        { ref: "processing_purposes", text: "" },
        { ref: "dpia_completed", text: "" },
        { ref: "dpa_in_place", text: "" },
        { ref: "retention_policy", text: "" },
        { ref: "cross_border_transfers", text: "" },
      ]);
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!orgId || !periodId) return;
    setSaving(true); setSaved(false);
    const tf = (s: string) => s === "" ? null : parseFloat(s);
    const ti = (s: string) => s === "" ? null : parseInt(s, 10);

    // Breaches
    await supabase.from("data_breaches").delete().eq("organization_id", orgId).eq("reporting_period_id", periodId);
    const vb = breaches.filter((b) => b.btype);
    const ops = [];
    if (vb.length) ops.push(supabase.from("data_breaches").insert(vb.map((b) => ({ organization_id: orgId, reporting_period_id: periodId, breach_type: b.btype, records_affected: ti(b.records), notified_authority: b.notified, fines_amount: tf(b.fines) }))));

    // GDPR items
    await supabase.from("narrative_disclosures").delete().eq("organization_id", orgId).eq("disclosure_type", "gdpr_compliance");
    const vg = gdprItems.filter((g) => g.text);
    if (vg.length) ops.push(supabase.from("narrative_disclosures").insert(vg.map((g) => ({ organization_id: orgId, reporting_period_id: periodId, esrs_datapoint_ref: g.ref, narrative_text: g.text, disclosure_type: "gdpr_compliance" }))));

    // SARs (pipe-delimited: received|responded|status)
    await supabase.from("narrative_disclosures").delete().eq("organization_id", orgId).eq("disclosure_type", "sar_tracker");
    const vs = sars.filter((s) => s.requestType);
    if (vs.length) ops.push(supabase.from("narrative_disclosures").insert(vs.map((s) => ({ organization_id: orgId, reporting_period_id: periodId, esrs_datapoint_ref: s.requestType, narrative_text: [s.received, s.responded, s.status].join("|"), disclosure_type: "sar_tracker" }))));

    await Promise.all(ops);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <div className="space-y-6 animate-pulse"><div className="h-6 w-48 rounded bg-gray-200" /><div className="h-64 rounded-xl bg-gray-100" /></div>;

  const totalBreaches = breaches.length;
  const totalRecords = breaches.reduce((s, b) => s + (parseInt(b.records) || 0), 0);
  const totalFines = breaches.reduce((s, b) => s + (parseFloat(b.fines) || 0), 0);
  const notifiedCount = breaches.filter((b) => b.notified).length;
  const notifiedPct = totalBreaches > 0 ? ((notifiedCount / totalBreaches) * 100).toFixed(1) : "0.0";
  const overdueSars = sars.filter((s) => s.status === "overdue").length;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-primary-600 hover:text-primary-700">← Back to Overview</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Data Privacy & Security</h1>
        <p className="text-gray-600">ESRS G1-6 · GDPR compliance, data breach register, subject access requests, processing purposes.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiBox label="Data Breaches" value={String(totalBreaches)} colour={totalBreaches > 0 ? "red" : "emerald"} />
        <KpiBox label="Records Affected" value={String(totalRecords)} colour={totalRecords > 0 ? "amber" : "emerald"} />
        <KpiBox label="Notified to DPA" value={`${notifiedPct}%`} colour={parseFloat(notifiedPct) >= 100 ? "emerald" : "amber"} sub={`${notifiedCount} of ${totalBreaches}`} />
        <KpiBox label="GDPR Fines" value={formatEuro(totalFines)} colour={totalFines > 0 ? "red" : "emerald"} sub={overdueSars > 0 ? `${overdueSars} overdue SARs` : undefined} />
      </div>

      <div className="flex border-b border-gray-200 gap-1">
        {[["breaches", "🔓 Breaches"], ["gdpr", "📋 GDPR Compliance"], ["sars", "📨 Subject Requests"]].map(([t, l]) => (
          <button key={t} type="button" onClick={() => setTab(t as any)} className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition ${tab === t ? "bg-white text-primary-700 border border-b-white -mb-px border-gray-200" : "text-gray-500 hover:text-gray-700"}`}>{l}</button>
        ))}
        <div className="flex-1 border-b border-gray-200" />
      </div>

      <form onSubmit={save} className="rounded-b-xl rounded-tr-xl border border-t-0 border-gray-200 bg-white p-6 space-y-8">
        {/* Data Breaches */}
        {tab === "breaches" && (
          <div className="space-y-4">
            <div className="flex justify-between"><div><h2 className="text-lg font-semibold text-gray-900">Data Breach Register</h2><p className="text-sm text-gray-500">Record all personal data breaches per Art. 33 GDPR. Each row is one breach event.</p></div><button type="button" onClick={() => setBreaches([...breaches, { btype: "", records: "", notified: false, fines: "", desc: "" }])} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Add breach</button></div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <strong>⚠️ Art. 33 GDPR:</strong> Notify your supervisory authority within 72 hours of becoming aware of a personal data breach. Check the &ldquo;Notified DPA&rdquo; box once notification is made.
            </div>

            {breaches.length === 0 && <div className="text-center py-12 text-gray-400"><p className="text-5xl mb-3">🔒</p><p>No breaches recorded. Click &ldquo;+ Add breach&rdquo; to register one.</p></div>}
            {breaches.map((b, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Breach type" value={b.btype} onChange={(v) => { const n = [...breaches]; n[i].btype = v; setBreaches(n); }} placeholder="e.g. Unauthorised access" />
                  <Field label="Records affected" value={b.records} onChange={(v) => { const n = [...breaches]; n[i].records = v; setBreaches(n); }} />
                </div>
                <div className="grid grid-cols-3 gap-3 items-end">
                  <Field label="Fines (EUR)" value={b.fines} onChange={(v) => { const n = [...breaches]; n[i].fines = v; setBreaches(n); }} type="decimal" />
                  <label className="flex items-center gap-2 text-sm mb-1"><input type="checkbox" checked={b.notified} onChange={(e) => { const n = [...breaches]; n[i].notified = e.target.checked; setBreaches(n); }} />Notified DPA within 72h</label>
                  <button type="button" onClick={() => setBreaches(breaches.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm mb-1 justify-self-end">✕ Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* GDPR Compliance */}
        {tab === "gdpr" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">GDPR Compliance Status</h2>
              <p className="text-sm text-gray-500">Document your GDPR compliance framework — processing purposes, DPIAs, data processing agreements, retention policies, and cross-border transfers.</p>
            </div>

            {[
              { ref: "processing_purposes", label: "Processing Purposes", placeholder: "List the purposes for which you process personal data and the lawful basis for each (Art. 6, 9 GDPR)..." },
              { ref: "dpia_completed", label: "Data Protection Impact Assessments", placeholder: "List DPIAs completed and their scope (Art. 35 GDPR). e.g. 'HR system DPIA completed June 2025 — covers recruitment, payroll, performance data'" },
              { ref: "dpa_in_place", label: "Data Processing Agreements", placeholder: "List DPAs in place with processors (Art. 28 GDPR). e.g. 'DPA signed with cloud provider (AWS, eu-central-1), payroll processor, CRM vendor'" },
              { ref: "retention_policy", label: "Data Retention Policy", placeholder: "Describe your data retention schedule. e.g. 'Employee records: duration of employment + 10 years; Customer data: 3 years after last transaction; CCTV: 30 days'" },
              { ref: "cross_border_transfers", label: "Cross-Border Data Transfers", placeholder: "Describe any transfers of personal data outside the EEA and the safeguards in place (Art. 44-49 GDPR). e.g. 'US transfers covered by EU-US Data Privacy Framework; UK covered by adequacy decision'" },
            ].map((item) => {
              const existing = gdprItems.find((g) => g.ref === item.ref);
              return (
                <div key={item.ref}>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{item.label}</label>
                  <textarea
                    value={existing?.text ?? ""}
                    onChange={(e) => {
                      const n = gdprItems.map((g) => g.ref === item.ref ? { ...g, text: e.target.value } : g);
                      setGdprItems(n);
                    }}
                    rows={3}
                    placeholder={item.placeholder}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 resize-vertical"
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Subject Access Requests */}
        {tab === "sars" && (
          <div className="space-y-4">
            <div className="flex justify-between"><div><h2 className="text-lg font-semibold text-gray-900">Data Subject Requests (SARs)</h2><p className="text-sm text-gray-500">Track subject access requests, erasure requests, and rectification requests per Art. 15-22 GDPR.</p></div><button type="button" onClick={() => setSars([...sars, { requestType: "", received: "", responded: "", status: "pending" }])} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Add request</button></div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              <strong>Art. 12 GDPR:</strong> Respond to SARs within 1 month (extendable by 2 months for complex requests). Track received and responded dates to demonstrate compliance.
            </div>

            {sars.length === 0 && <div className="text-center py-12 text-gray-400"><p className="text-5xl mb-3">📨</p><p>No SARs tracked. Click &ldquo;+ Add request&rdquo; to start.</p></div>}
            {sars.map((s, i) => (
              <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end border border-gray-100 rounded-lg p-3">
                <Field label="Request type" value={s.requestType} onChange={(v) => { const n = [...sars]; n[i].requestType = v; setSars(n); }} placeholder="e.g. Access request" />
                <Field label="Received" value={s.received} onChange={(v) => { const n = [...sars]; n[i].received = v; setSars(n); }} placeholder="YYYY-MM-DD" />
                <Field label="Responded" value={s.responded} onChange={(v) => { const n = [...sars]; n[i].responded = v; setSars(n); }} placeholder="YYYY-MM-DD" />
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Status</label>
                  <select value={s.status} onChange={(e) => { const n = [...sars]; n[i].status = e.target.value; setSars(n); }} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="pending">Pending</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="overdue">Overdue</option>
                  </select>
                </div>
                <button type="button" onClick={() => setSars(sars.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm mb-1">✕</button>
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

function KpiBox({ label, value, sub, colour }: { label: string; value: string; sub?: string; colour: string }) {
  const c: Record<string, string> = { blue: "bg-blue-50 border-blue-200 text-blue-700", emerald: "bg-emerald-50 border-emerald-200 text-emerald-700", amber: "bg-amber-50 border-amber-200 text-amber-700", red: "bg-red-50 border-red-200 text-red-700" };
  return <div className={`rounded-xl border px-4 py-3 ${c[colour] || c.blue}`}><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p><p className="text-2xl font-bold mt-1">{value}</p>{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}</div>;
}

function Field({ label, value, onChange, type = "int", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: "int" | "decimal"; placeholder?: string }) {
  const isNum = type === "int" || type === "decimal";
  return <div><label className="mb-1 block text-xs font-medium text-gray-600">{label}</label><input type={isNum ? "number" : "text"} min="0" step={type === "decimal" ? "0.01" : "1"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" /></div>;
}
