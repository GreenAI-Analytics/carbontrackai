"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { detectGreenwash, getGreenwashWarning } from "@/lib/greenwashing";

type GovRole = { roleName: string; responsibility: string; body: string; frequency: string };
type Stakeholder = { group: string; purpose: string; frequency: string; topics: string; feedback: string };
type Policy = { title: string; esrsRef: string; approvalDate: string; version: string; scope: string; reviewDate: string };

export default function GovernanceStrategyPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [periodId, setPeriodId] = useState<string | null>(null);
  // Strategy
  const [narrative, setNarrative] = useState("");
  const [valueChain, setValueChain] = useState("");
  const [keySectors, setKeySectors] = useState("");
  const [geographies, setGeographies] = useState("");
  const [employeeBreakdown, setEmployeeBreakdown] = useState("");
  // Governance roles
  const [roles, setRoles] = useState<GovRole[]>([]);
  // Stakeholders
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  // Policies
  const [policies, setPolicies] = useState<Policy[]>([]);
  // UI
  const [tab, setTab] = useState<"strategy" | "governance" | "stakeholders" | "policies">("strategy");
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

    const [sbm, groles, sh, pol] = await Promise.all([
      supabase.from("strategy_business_model").select("*").eq("organization_id", oid).eq("reporting_period_id", pid).single(),
      supabase.from("governance_sustainability_roles").select("*").eq("organization_id", oid).eq("reporting_period_id", pid),
      supabase.from("stakeholder_mapping").select("*").eq("organization_id", oid).eq("reporting_period_id", pid),
      supabase.from("policy_documents").select("*").eq("organization_id", oid),
    ]);

    if (sbm.data) {
      setNarrative(sbm.data.narrative_description ?? "");
      setValueChain(sbm.data.value_chain_stages ?? "");
      setKeySectors(sbm.data.key_sectors ?? "");
      setGeographies(sbm.data.geographies ?? "");
      setEmployeeBreakdown(sbm.data.employee_breakdown ?? "");
    }
    if (groles.data?.length) setRoles(groles.data.map((x: any) => ({ roleName: x.role_name ?? "", responsibility: x.esg_responsibility ?? "", body: x.oversight_body ?? "", frequency: x.meeting_frequency ?? "" })));
    if (sh.data?.length) setStakeholders(sh.data.map((x: any) => ({ group: x.stakeholder_group ?? "", purpose: x.engagement_purpose ?? "", frequency: x.frequency ?? "", topics: x.key_topics_raised ?? "", feedback: x.strategy_feedback ?? "" })));
    if (pol.data?.length) setPolicies(pol.data.map((x: any) => ({ title: x.policy_title ?? "", esrsRef: x.esrs_reference ?? "", approvalDate: x.approval_date ?? "", version: x.version ?? "", scope: x.scope_description ?? "", reviewDate: x.review_date ?? "" })));

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!orgId || !periodId) return;
    setSaving(true); setSaved(false);

    // Upsert strategy
    await supabase.from("strategy_business_model").upsert({
      organization_id: orgId, reporting_period_id: periodId,
      narrative_description: narrative || "(not provided)",
      value_chain_stages: valueChain || null, key_sectors: keySectors || null,
      geographies: geographies || null, employee_breakdown: employeeBreakdown || null,
    }, { onConflict: "organization_id,reporting_period_id" });

    // Delete + re-insert lists
    await Promise.all([
      supabase.from("governance_sustainability_roles").delete().eq("organization_id", orgId).eq("reporting_period_id", periodId),
      supabase.from("stakeholder_mapping").delete().eq("organization_id", orgId).eq("reporting_period_id", periodId),
    ]);
    const ops = [];
    const vr = roles.filter((r) => r.roleName);
    const vs = stakeholders.filter((s) => s.group);
    if (vr.length) ops.push(supabase.from("governance_sustainability_roles").insert(vr.map((r) => ({ organization_id: orgId, reporting_period_id: periodId, role_name: r.roleName, esg_responsibility: r.responsibility, oversight_body: r.body || null, meeting_frequency: r.frequency || null }))));
    if (vs.length) ops.push(supabase.from("stakeholder_mapping").insert(vs.map((s) => ({ organization_id: orgId, reporting_period_id: periodId, stakeholder_group: s.group, engagement_purpose: s.purpose || null, frequency: s.frequency || null, key_topics_raised: s.topics || null, strategy_feedback: s.feedback || null }))));

    // Policies: delete all org policies then re-insert
    await supabase.from("policy_documents").delete().eq("organization_id", orgId);
    const vp = policies.filter((p) => p.title);
    if (vp.length) ops.push(supabase.from("policy_documents").insert(vp.map((p) => ({ organization_id: orgId, policy_title: p.title, esrs_reference: p.esrsRef || null, approval_date: p.approvalDate || null, version: p.version || null, scope_description: p.scope || null, review_date: p.reviewDate || null }))));

    await Promise.all(ops);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <div className="space-y-6 animate-pulse"><div className="h-6 w-48 rounded bg-gray-200" /><div className="h-64 rounded-xl bg-gray-100" /></div>;

  const TABS = [
    ["strategy", "📋 Strategy & Business Model"],
    ["governance", "🏛️ Governance Roles"],
    ["stakeholders", "👥 Stakeholders"],
    ["policies", "📜 Policies"],
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-primary-600 hover:text-primary-700">← Back to Overview</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Governance & Strategy</h1>
        <p className="text-gray-600">ESRS 2 GOV-1 to SBM-3, MDR-P · Board oversight, business model, stakeholder engagement, policy registry.</p>
      </div>

      <div className="flex border-b border-gray-200 gap-1">
        {TABS.map(([t, l]) => (
          <button key={t} type="button" onClick={() => setTab(t as any)} className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition ${tab === t ? "bg-white text-primary-700 border border-b-white -mb-px border-gray-200" : "text-gray-500 hover:text-gray-700"}`}>{l}</button>
        ))}
        <div className="flex-1 border-b border-gray-200" />
      </div>

      <form onSubmit={save} className="rounded-b-xl rounded-tr-xl border border-t-0 border-gray-200 bg-white p-6 space-y-8">
        {/* Strategy */}
        {tab === "strategy" && (
          <div className="space-y-4">
            <Section title="Business Model & Strategy" desc="Describe your business model, value chain, sectors, and geographies per ESRS 2 SBM-1.">
              <Textarea label="Narrative description" value={narrative} onChange={setNarrative} rows={6} placeholder="Describe your organisation's business model, key products/services, markets served, and how sustainability is embedded in strategy..." />
              {(() => { const flags = detectGreenwash(narrative); if (flags.length === 0) return null; const warning = getGreenwashWarning(flags); return warning ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><strong>Green Claims Directive:</strong> {warning}</div> : null; })()}
              <Textarea label="Value chain stages" value={valueChain} onChange={setValueChain} rows={3} placeholder="Upstream (suppliers, raw materials) → Own operations → Downstream (distribution, customers, end-of-life)..." />
              <div className="grid grid-cols-3 gap-4">
                <Field label="Key sectors (NACE)" value={keySectors} onChange={setKeySectors} placeholder="e.g. C25, F41" />
                <Field label="Geographies" value={geographies} onChange={setGeographies} placeholder="e.g. DE, FR, IT" />
                <Field label="Employee breakdown" value={employeeBreakdown} onChange={setEmployeeBreakdown} placeholder="e.g. 60% ops, 40% admin" />
              </div>
            </Section>
          </div>
        )}

        {/* Governance Roles */}
        {tab === "governance" && (
          <div className="space-y-4">
            <div className="flex justify-between"><Section title="ESG Governance Roles" desc="Board and management roles responsible for sustainability oversight per ESRS 2 GOV-1."><></></Section><button type="button" onClick={() => setRoles([...roles, { roleName: "", responsibility: "", body: "", frequency: "" }])} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Add role</button></div>
            {roles.map((r, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Role name" value={r.roleName} onChange={(v) => { const n = [...roles]; n[i].roleName = v; setRoles(n); }} placeholder="e.g. Chief Sustainability Officer" />
                  <Field label="Oversight body" value={r.body} onChange={(v) => { const n = [...roles]; n[i].body = v; setRoles(n); }} placeholder="e.g. Audit Committee" />
                </div>
                <Textarea label="ESG responsibility" value={r.responsibility} onChange={(v) => { const n = [...roles]; n[i].responsibility = v; setRoles(n); }} rows={2} placeholder="Describe this role's specific ESG oversight duties..." />
                <div className="flex gap-3 items-end">
                  <Field label="Meeting frequency" value={r.frequency} onChange={(v) => { const n = [...roles]; n[i].frequency = v; setRoles(n); }} placeholder="e.g. Quarterly" />
                  <button type="button" onClick={() => setRoles(roles.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm mb-1">✕ Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stakeholders */}
        {tab === "stakeholders" && (
          <div className="space-y-4">
            <div className="flex justify-between"><Section title="Stakeholder Mapping" desc="Key stakeholder groups, engagement purpose, and feedback per ESRS 2 SBM-2."><></></Section><button type="button" onClick={() => setStakeholders([...stakeholders, { group: "", purpose: "", frequency: "", topics: "", feedback: "" }])} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Add stakeholder</button></div>
            {stakeholders.map((s, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Stakeholder group" value={s.group} onChange={(v) => { const n = [...stakeholders]; n[i].group = v; setStakeholders(n); }} placeholder="e.g. Employees" />
                  <Field label="Engagement purpose" value={s.purpose} onChange={(v) => { const n = [...stakeholders]; n[i].purpose = v; setStakeholders(n); }} placeholder="e.g. Working conditions" />
                  <Field label="Frequency" value={s.frequency} onChange={(v) => { const n = [...stakeholders]; n[i].frequency = v; setStakeholders(n); }} placeholder="e.g. Monthly" />
                </div>
                <Textarea label="Key topics raised" value={s.topics} onChange={(v) => { const n = [...stakeholders]; n[i].topics = v; setStakeholders(n); }} rows={2} placeholder="What topics were raised by this group?" />
                <div className="flex gap-3 items-end">
                  <Textarea label="Strategy feedback" value={s.feedback} onChange={(v) => { const n = [...stakeholders]; n[i].feedback = v; setStakeholders(n); }} rows={2} placeholder="How has their feedback influenced strategy?" />
                  <button type="button" onClick={() => setStakeholders(stakeholders.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm mb-1">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Policies */}
        {tab === "policies" && (
          <div className="space-y-4">
            <div className="flex justify-between"><Section title="Policy Registry" desc="ESG-related policies, versions, and approval dates per ESRS 2 MDR-P."><></></Section><button type="button" onClick={() => setPolicies([...policies, { title: "", esrsRef: "", approvalDate: "", version: "", scope: "", reviewDate: "" }])} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Add policy</button></div>
            {policies.map((p, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Policy title" value={p.title} onChange={(v) => { const n = [...policies]; n[i].title = v; setPolicies(n); }} placeholder="e.g. Anti-Corruption Policy" />
                  <Field label="ESRS reference" value={p.esrsRef} onChange={(v) => { const n = [...policies]; n[i].esrsRef = v; setPolicies(n); }} placeholder="e.g. G1-1" />
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <Field label="Version" value={p.version} onChange={(v) => { const n = [...policies]; n[i].version = v; setPolicies(n); }} placeholder="e.g. 2.1" />
                  <Field label="Approval date" value={p.approvalDate} onChange={(v) => { const n = [...policies]; n[i].approvalDate = v; setPolicies(n); }} placeholder="YYYY-MM-DD" />
                  <Field label="Review date" value={p.reviewDate} onChange={(v) => { const n = [...policies]; n[i].reviewDate = v; setPolicies(n); }} placeholder="YYYY-MM-DD" />
                  <button type="button" onClick={() => setPolicies(policies.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-sm mb-1">✕ Remove</button>
                </div>
                <Textarea label="Scope description" value={p.scope} onChange={(v) => { const n = [...policies]; n[i].scope = v; setPolicies(n); }} rows={2} placeholder="Who does this policy apply to? What does it cover?" />
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
