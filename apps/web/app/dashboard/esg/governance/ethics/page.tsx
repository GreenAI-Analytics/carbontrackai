"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import {
  computeGovernanceSnapshot,
  formatEuro,
  formatPct,
  type GovernanceSnapshot,
} from "@/lib/governance-metrics";

type Tab = "board" | "compliance" | "privacy" | "supplychain";

interface OrgContext {
  orgId: string;
  periodId: string | null;
}

const TABS: [Tab, string][] = [
  ["board", "🏛️ Board & Ethics"],
  ["compliance", "⚖️ Compliance"],
  ["privacy", "🔒 Data Privacy"],
  ["supplychain", "🔗 Supply Chain"],
];

export default function EthicsPage() {
  const [ctx, setCtx] = useState<OrgContext | null>(null);
  const [snapshot, setSnapshot] = useState<GovernanceSnapshot | null>(null);
  const [tab, setTab] = useState<Tab>("board");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Board form state ──
  const [boardSize, setBoardSize] = useState("");
  const [indepMembers, setIndepMembers] = useState("");
  const [femaleB, setFemaleB] = useState("");
  const [maleB, setMaleB] = useState("");
  const [avgTenure, setAvgTenure] = useState("");

  // ── Ethics training (list) ──
  const [trainings, setTrainings] = useState<Array<{ topic: string; covered: string; coveragePct: string; freq: string }>>([]);

  // ── Compliance incidents (list) ──
  const [incidents, setIncidents] = useState<Array<{ itype: string; fines: string; sanctions: string; legal: string }>>([]);

  // ── Data breaches (list) ──
  const [breaches, setBreaches] = useState<Array<{ btype: string; records: string; notified: boolean; bfines: string }>>([]);

  // ── Whistleblower ──
  const [wbReports, setWbReports] = useState("");
  const [wbInvestigated, setWbInvestigated] = useState("");
  const [wbSubstantiated, setWbSubstantiated] = useState("");

  // ── Supplier conduct (list) ──
  const [suppliers, setSuppliers] = useState<Array<{ sname: string; violations: string; audits: string; corrective: string }>>([]);

  // ── Political contributions (list) ──
  const [contributions, setContributions] = useState<Array<{ recipient: string; country: string; amount: string }>>([]);

  // ── Load ────────────────────────────────────────────────────────────────────
  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: role } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).single();
    if (!role) { setLoading(false); return; }
    const orgId = role.organization_id;

    const year = new Date().getFullYear();
    let { data: period } = await supabase.from("reporting_periods").select("id").eq("organization_id", orgId).eq("year", year).single();
    if (!period) {
      const { data: np } = await supabase.from("reporting_periods").insert({ organization_id: orgId, year, start_date: `${year}-01-01`, end_date: `${year}-12-31` }).select("id").single();
      period = np;
    }
    setCtx({ orgId, periodId: period?.id ?? null });
    const pid = period?.id;
    if (!pid) { setLoading(false); return; }

    const [
      { data: board }, { data: eth }, { data: comp }, { data: db },
      { data: wb }, { data: sc }, { data: pc },
    ] = await Promise.all([
      supabase.from("board_composition").select("*").eq("organization_id", orgId).eq("reporting_period_id", pid).single(),
      supabase.from("ethics_training").select("*").eq("organization_id", orgId).eq("reporting_period_id", pid),
      supabase.from("compliance_incidents").select("*").eq("organization_id", orgId).eq("reporting_period_id", pid),
      supabase.from("data_breaches").select("*").eq("organization_id", orgId).eq("reporting_period_id", pid),
      supabase.from("whistleblower_cases").select("*").eq("organization_id", orgId).eq("reporting_period_id", pid).single(),
      supabase.from("supplier_conduct_assessments").select("*").eq("organization_id", orgId).eq("reporting_period_id", pid),
      supabase.from("political_contributions").select("*").eq("organization_id", orgId).eq("reporting_period_id", pid),
    ]);

    if (board) {
      setBoardSize(String(board.board_size ?? ""));
      setIndepMembers(String(board.independent_members ?? ""));
      setFemaleB(String(board.female_members ?? ""));
      setMaleB(String(board.male_members ?? ""));
      setAvgTenure(String(board.avg_tenure_years ?? ""));
    }
    if (eth?.length) setTrainings(eth.map((t: any) => ({ topic: t.training_topic ?? "", covered: String(t.employees_covered ?? ""), coveragePct: String(t.coverage_percentage ?? ""), freq: t.frequency ?? "" })));
    if (comp?.length) setIncidents(comp.map((i: any) => ({ itype: i.incident_type ?? "", fines: String(i.regulatory_fines ?? ""), sanctions: String(i.non_monetary_sanctions ?? ""), legal: String(i.legal_actions ?? "") })));
    if (db?.length) setBreaches(db.map((b: any) => ({ btype: b.breach_type ?? "", records: String(b.records_affected ?? ""), notified: !!b.notified_authority, bfines: String(b.fines_amount ?? "") })));
    if (wb) { setWbReports(String(wb.reports_received ?? "")); setWbInvestigated(String(wb.cases_investigated ?? "")); setWbSubstantiated(String(wb.cases_substantiated ?? "")); }
    if (sc?.length) setSuppliers(sc.map((s: any) => ({ sname: s.supplier_name ?? "", violations: String(s.code_violations ?? ""), audits: String(s.audits_conducted ?? ""), corrective: String(s.corrective_actions_issued ?? "") })));
    if (pc?.length) setContributions(pc.map((p: any) => ({ recipient: p.recipient ?? "", country: p.country ?? "", amount: String(p.amount ?? "") })));

    const snap = computeGovernanceSnapshot(board, eth ?? [], comp ?? [], db ?? [], wb, sc ?? [], pc ?? []);
    setSnapshot(snap);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!ctx?.orgId || !ctx?.periodId) return;
    setSaving(true); setSaved(false);
    const { orgId, periodId } = ctx;
    const ti = (s: string) => s === "" ? null : parseInt(s, 10);
    const tf = (s: string) => s === "" ? null : parseFloat(s);

    // Delete existing list rows then re-insert for simplicity
    await Promise.all([
      supabase.from("ethics_training").delete().eq("organization_id", orgId).eq("reporting_period_id", periodId),
      supabase.from("compliance_incidents").delete().eq("organization_id", orgId).eq("reporting_period_id", periodId),
      supabase.from("data_breaches").delete().eq("organization_id", orgId).eq("reporting_period_id", periodId),
      supabase.from("supplier_conduct_assessments").delete().eq("organization_id", orgId).eq("reporting_period_id", periodId),
      supabase.from("political_contributions").delete().eq("organization_id", orgId).eq("reporting_period_id", periodId),
    ]);

    const ops = [
      supabase.from("board_composition").upsert({ organization_id: orgId, reporting_period_id: periodId, board_size: ti(boardSize), independent_members: ti(indepMembers), female_members: ti(femaleB), male_members: ti(maleB), avg_tenure_years: tf(avgTenure) }, { onConflict: "organization_id,reporting_period_id" }),
      supabase.from("whistleblower_cases").upsert({ organization_id: orgId, reporting_period_id: periodId, reports_received: ti(wbReports), cases_investigated: ti(wbInvestigated), cases_substantiated: ti(wbSubstantiated) }, { onConflict: "organization_id,reporting_period_id" }),
    ];

    // Insert list rows if they have content
    const listInserts = [];
    if (trainings.some((t) => t.topic)) listInserts.push(supabase.from("ethics_training").insert(trainings.filter((t) => t.topic).map((t) => ({ organization_id: orgId, reporting_period_id: periodId, training_topic: t.topic, employees_covered: ti(t.covered), coverage_percentage: tf(t.coveragePct), frequency: t.freq || null }))));
    if (incidents.some((i) => i.itype)) listInserts.push(supabase.from("compliance_incidents").insert(incidents.filter((i) => i.itype).map((i) => ({ organization_id: orgId, reporting_period_id: periodId, incident_type: i.itype, regulatory_fines: tf(i.fines), non_monetary_sanctions: ti(i.sanctions), legal_actions: ti(i.legal) }))));
    if (breaches.some((b) => b.btype)) listInserts.push(supabase.from("data_breaches").insert(breaches.filter((b) => b.btype).map((b) => ({ organization_id: orgId, reporting_period_id: periodId, breach_type: b.btype, records_affected: ti(b.records), notified_authority: b.notified, fines_amount: tf(b.bfines) }))));
    if (suppliers.some((s) => s.sname)) listInserts.push(supabase.from("supplier_conduct_assessments").insert(suppliers.filter((s) => s.sname).map((s) => ({ organization_id: orgId, reporting_period_id: periodId, supplier_name: s.sname, code_violations: ti(s.violations), audits_conducted: ti(s.audits), corrective_actions_issued: ti(s.corrective) }))));
    if (contributions.some((c) => c.recipient)) listInserts.push(supabase.from("political_contributions").insert(contributions.filter((c) => c.recipient).map((c) => ({ organization_id: orgId, reporting_period_id: periodId, recipient: c.recipient, country: c.country || null, amount: tf(c.amount) ?? 0 }))));
    ops.push(...listInserts);

    await Promise.all(ops);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    loadData();
  }

  // ── List helpers ────────────────────────────────────────────────────────────
  function addRow(list: string) {
    if (list === "trainings") setTrainings([...trainings, { topic: "", covered: "", coveragePct: "", freq: "" }]);
    if (list === "incidents") setIncidents([...incidents, { itype: "", fines: "", sanctions: "", legal: "" }]);
    if (list === "breaches") setBreaches([...breaches, { btype: "", records: "", notified: false, bfines: "" }]);
    if (list === "suppliers") setSuppliers([...suppliers, { sname: "", violations: "", audits: "", corrective: "" }]);
    if (list === "contributions") setContributions([...contributions, { recipient: "", country: "", amount: "" }]);
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-48 rounded bg-gray-200" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (<div key={i} className="h-24 rounded-xl bg-gray-100" />))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-primary-600 hover:text-primary-700">← Back to Overview</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Business Conduct</h1>
        <p className="text-gray-600">ESRS G1-1 to G1-6 · Board composition, ethics training, compliance incidents, data privacy, whistleblower, supplier conduct, political contributions.</p>
      </div>

      {/* KPI Dashboard */}
      {snapshot && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiBox label="Board Independence" value={formatPct(snapshot.board.independentPct)} sub={`${snapshot.board.size} members · ${snapshot.board.femalePct} women`} colour="blue" />
          <KpiBox label="Ethics Training" value={formatPct(snapshot.ethicsTraining.avgCoveragePct)} sub={`${snapshot.ethicsTraining.totalCovered} employees`} colour="emerald" />
          <KpiBox label="Compliance Fines" value={formatEuro(snapshot.compliance.totalFines)} sub={`${snapshot.compliance.totalSanctions} sanctions`} colour="amber" />
          <KpiBox label="Whistleblower" value={`${snapshot.whistleblower.reportsReceived} reports`} sub={`${snapshot.whistleblower.substantiationRate} substantiated`} colour="purple" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {TABS.map(([t, label]) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition ${tab === t ? "bg-white text-primary-700 border border-b-white -mb-px border-gray-200" : "text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
        <div className="flex-1 border-b border-gray-200" />
      </div>

      <form onSubmit={handleSave} className="rounded-b-xl rounded-tr-xl border border-t-0 border-gray-200 bg-white p-6 space-y-8">
        {/* ── Board & Ethics ── */}
        {tab === "board" && (
          <div className="space-y-6">
            <Section title="Board Composition" desc="Board size, independence, gender diversity, and tenure per ESRS G1-1.">
              <div className="grid grid-cols-3 gap-4">
                <Field label="Board size" value={boardSize} onChange={setBoardSize} />
                <Field label="Independent members" value={indepMembers} onChange={setIndepMembers} />
                <Field label="Avg tenure (years)" value={avgTenure} onChange={setAvgTenure} type="decimal" />
                <Field label="Female members" value={femaleB} onChange={setFemaleB} />
                <Field label="Male members" value={maleB} onChange={setMaleB} />
              </div>
            </Section>

            <hr className="border-gray-200" />

            <Section title="Ethics & Anti-Corruption Training" desc="Training topics, coverage, and frequency per ESRS G1-3.">
              {trainings.map((t, i) => (
                <div key={i} className="grid grid-cols-4 gap-3 items-end border border-gray-100 rounded-lg p-3">
                  <Field label="Topic" value={t.topic} onChange={(v) => { const n = [...trainings]; n[i].topic = v; setTrainings(n); }} placeholder="e.g. Anti-bribery" />
                  <Field label="Employees covered" value={t.covered} onChange={(v) => { const n = [...trainings]; n[i].covered = v; setTrainings(n); }} />
                  <Field label="Coverage %" value={t.coveragePct} onChange={(v) => { const n = [...trainings]; n[i].coveragePct = v; setTrainings(n); }} type="decimal" />
                  <div className="flex gap-2">
                    <Field label="Frequency" value={t.freq} onChange={(v) => { const n = [...trainings]; n[i].freq = v; setTrainings(n); }} placeholder="Annual" />
                    <button type="button" onClick={() => setTrainings(trainings.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm mb-1">✕</button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => addRow("trainings")} className="text-sm text-primary-600 hover:text-primary-700">+ Add training</button>
            </Section>
          </div>
        )}

        {/* ── Compliance ── */}
        {tab === "compliance" && (
          <div className="space-y-6">
            <Section title="Compliance Incidents" desc="Regulatory fines, non-monetary sanctions, and legal actions per ESRS G1-4.">
              {incidents.map((inc, i) => (
                <div key={i} className="grid grid-cols-4 gap-3 items-end border border-gray-100 rounded-lg p-3">
                  <Field label="Incident type" value={inc.itype} onChange={(v) => { const n = [...incidents]; n[i].itype = v; setIncidents(n); }} placeholder="e.g. Environmental" />
                  <Field label="Fines (EUR)" value={inc.fines} onChange={(v) => { const n = [...incidents]; n[i].fines = v; setIncidents(n); }} type="decimal" />
                  <Field label="Sanctions" value={inc.sanctions} onChange={(v) => { const n = [...incidents]; n[i].sanctions = v; setIncidents(n); }} />
                  <div className="flex gap-2">
                    <Field label="Legal actions" value={inc.legal} onChange={(v) => { const n = [...incidents]; n[i].legal = v; setIncidents(n); }} />
                    <button type="button" onClick={() => setIncidents(incidents.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm mb-1">✕</button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => addRow("incidents")} className="text-sm text-primary-600 hover:text-primary-700">+ Add incident</button>
            </Section>

            <hr className="border-gray-200" />

            <Section title="Whistleblower Channel" desc="Reports received, investigated, and substantiated per ESRS G1-1 and Directive 2019/1937.">
              <div className="grid grid-cols-3 gap-4">
                <Field label="Reports received" value={wbReports} onChange={setWbReports} />
                <Field label="Cases investigated" value={wbInvestigated} onChange={setWbInvestigated} />
                <Field label="Cases substantiated" value={wbSubstantiated} onChange={setWbSubstantiated} />
              </div>
              {snapshot && snapshot.whistleblower.reportsReceived > 0 && (
                <p className="text-sm text-gray-500">Substantiation rate: {formatPct(snapshot.whistleblower.substantiationRate)}</p>
              )}
            </Section>
          </div>
        )}

        {/* ── Data Privacy ── */}
        {tab === "privacy" && (
          <div className="space-y-6">
            <Section title="Data Breaches" desc="Breach type, records affected, authority notification, and fines per ESRS G1-6.">
              {breaches.map((b, i) => (
                <div key={i} className="grid grid-cols-4 gap-3 items-end border border-gray-100 rounded-lg p-3">
                  <Field label="Breach type" value={b.btype} onChange={(v) => { const n = [...breaches]; n[i].btype = v; setBreaches(n); }} placeholder="e.g. Unauthorised access" />
                  <Field label="Records affected" value={b.records} onChange={(v) => { const n = [...breaches]; n[i].records = v; setBreaches(n); }} />
                  <Field label="Fines (EUR)" value={b.bfines} onChange={(v) => { const n = [...breaches]; n[i].bfines = v; setBreaches(n); }} type="decimal" />
                  <div className="flex gap-2 items-end">
                    <label className="flex items-center gap-2 text-sm mb-1">
                      <input type="checkbox" checked={b.notified} onChange={(e) => { const n = [...breaches]; n[i].notified = e.target.checked; setBreaches(n); }} />
                      Notified authority
                    </label>
                    <button type="button" onClick={() => setBreaches(breaches.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm mb-1">✕</button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => addRow("breaches")} className="text-sm text-primary-600 hover:text-primary-700">+ Add breach</button>
            </Section>
          </div>
        )}

        {/* ── Supply Chain ── */}
        {tab === "supplychain" && (
          <div className="space-y-6">
            <Section title="Supplier Conduct Assessments" desc="Supplier audits, code violations, and corrective actions per ESRS G1-2.">
              {suppliers.map((s, i) => (
                <div key={i} className="grid grid-cols-4 gap-3 items-end border border-gray-100 rounded-lg p-3">
                  <Field label="Supplier name" value={s.sname} onChange={(v) => { const n = [...suppliers]; n[i].sname = v; setSuppliers(n); }} placeholder="Supplier Ltd" />
                  <Field label="Code violations" value={s.violations} onChange={(v) => { const n = [...suppliers]; n[i].violations = v; setSuppliers(n); }} />
                  <Field label="Audits" value={s.audits} onChange={(v) => { const n = [...suppliers]; n[i].audits = v; setSuppliers(n); }} />
                  <div className="flex gap-2">
                    <Field label="Corrective actions" value={s.corrective} onChange={(v) => { const n = [...suppliers]; n[i].corrective = v; setSuppliers(n); }} />
                    <button type="button" onClick={() => setSuppliers(suppliers.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm mb-1">✕</button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => addRow("suppliers")} className="text-sm text-primary-600 hover:text-primary-700">+ Add supplier</button>
            </Section>

            <hr className="border-gray-200" />

            <Section title="Political Contributions" desc="Recipients, countries, and amounts per ESRS G1-5.">
              {contributions.map((c, i) => (
                <div key={i} className="grid grid-cols-3 gap-3 items-end border border-gray-100 rounded-lg p-3">
                  <Field label="Recipient" value={c.recipient} onChange={(v) => { const n = [...contributions]; n[i].recipient = v; setContributions(n); }} />
                  <Field label="Country" value={c.country} onChange={(v) => { const n = [...contributions]; n[i].country = v; setContributions(n); }} />
                  <div className="flex gap-2">
                    <Field label="Amount (EUR)" value={c.amount} onChange={(v) => { const n = [...contributions]; n[i].amount = v; setContributions(n); }} type="decimal" />
                    <button type="button" onClick={() => setContributions(contributions.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm mb-1">✕</button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => addRow("contributions")} className="text-sm text-primary-600 hover:text-primary-700">+ Add contribution</button>
            </Section>
          </div>
        )}

        {/* Save */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <button type="submit" disabled={saving} className="rounded-lg bg-primary-600 px-6 py-2.5 font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60">
            {saving ? "Saving…" : "Save all changes"}
          </button>
          {saved && <span className="text-sm text-emerald-600 font-medium">✓ Saved</span>}
        </div>
      </form>
    </div>
  );
}

// ─── Reusable components ──────────────────────────────────────────────────────

function KpiBox({ label, value, sub, colour }: { label: string; value: string; sub?: string; colour: string }) {
  const colours: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${colours[colour] || colours.blue}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, required = false, type = "int", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: "int" | "decimal"; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <input type="number" min="0" step={type === "decimal" ? "0.1" : "1"} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200" />
    </div>
  );
}
