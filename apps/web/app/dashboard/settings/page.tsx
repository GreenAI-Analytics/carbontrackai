"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";

type OrgData = {
  name: string; country_code: string; sector: string; base_year: number;
  headcount: number | null; annual_turnover: number | null;
  annual_balance_sheet: number | null; sme_category: string | null;
  reporting_basis: string | null; is_listed: boolean;
  consolidation_approach: string | null; first_reporting_year: number | null;
};
type FeatureFlags = { plan_type: string; [key: string]: any };
type TeamMember = { user_id: string; role: string; email: string; is_primary: boolean };

const EU_COUNTRIES = [
  { code: "AT", name: "Austria" }, { code: "BE", name: "Belgium" }, { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croatia" }, { code: "CY", name: "Cyprus" }, { code: "CZ", name: "Czechia" },
  { code: "DK", name: "Denmark" }, { code: "EE", name: "Estonia" }, { code: "FI", name: "Finland" },
  { code: "FR", name: "France" }, { code: "DE", name: "Germany" }, { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" }, { code: "IE", name: "Ireland" }, { code: "IT", name: "Italy" },
  { code: "LV", name: "Latvia" }, { code: "LT", name: "Lithuania" }, { code: "LU", name: "Luxembourg" },
  { code: "MT", name: "Malta" }, { code: "NL", name: "Netherlands" }, { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" }, { code: "RO", name: "Romania" }, { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" }, { code: "ES", name: "Spain" }, { code: "SE", name: "Sweden" },
];

const SECTORS = ["Agriculture & Forestry","Construction","Education","Energy & Utilities","Finance & Insurance","Food & Beverage","Healthcare","Hospitality & Tourism","IT & Software","Logistics & Transport","Manufacturing","Professional Services","Real Estate","Retail & Wholesale","Other"];

const FLAG_LABELS: Record<string, string> = {
  esrs2_enabled: "ESRS 2 Disclosures", climate_enabled: "Climate (E1)", pollution_enabled: "Pollution (E2)",
  water_enabled: "Water (E3)", biodiversity_enabled: "Biodiversity (E4)", circular_economy_enabled: "Circular Economy (E5)",
  workforce_enabled: "Own Workforce (S1)", valuechain_enabled: "Value Chain (S2)", communities_enabled: "Communities (S3)",
  consumers_enabled: "Consumers (S4)", business_conduct_enabled: "Business Conduct (G1)",
  materiality_enabled: "Double Materiality", taxonomy_enabled: "EU Taxonomy", report_builder_enabled: "Report Builder",
};

export default function SettingsPage() {
  const [org, setOrg] = useState<OrgData | null>(null);
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [tab, setTab] = useState<"profile" | "plan" | "team" | "danger">("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  // Editable fields
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [sector, setSector] = useState("");
  const [baseYear, setBaseYear] = useState<number>(new Date().getFullYear());
  const [headcount, setHeadcount] = useState("");
  const [turnover, setTurnover] = useState("");
  const [balanceSheet, setBalanceSheet] = useState("");
  const [consolidation, setConsolidation] = useState("");

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: role } = await supabase.from("user_roles").select("organization_id,role").eq("user_id", user.id).single();
    if (!role) { setLoading(false); return; }
    const oid = role.organization_id;

    const [{ data: orgData }, { data: flagData }, { data: members }] = await Promise.all([
      supabase.from("organizations").select("*").eq("id", oid).single(),
      supabase.from("feature_flag_subscriptions").select("*").eq("organization_id", oid).single(),
      supabase.from("user_roles").select("user_id,role,is_primary").eq("organization_id", oid),
    ]);

    if (orgData) {
      setOrg(orgData);
      setName(orgData.name ?? "");
      setCountry(orgData.country_code ?? "");
      setSector(orgData.sector ?? "");
      setBaseYear(orgData.base_year ?? new Date().getFullYear());
      setHeadcount(orgData.headcount != null ? String(orgData.headcount) : "");
      setTurnover(orgData.annual_turnover != null ? String(orgData.annual_turnover) : "");
      setBalanceSheet(orgData.annual_balance_sheet != null ? String(orgData.annual_balance_sheet) : "");
      setConsolidation(orgData.consolidation_approach ?? "");
    }
    if (flagData) setFlags(flagData);
    if (members?.length) {
      const enriched = await Promise.all(members.map(async (m: any) => {
        const { data: { user: u } } = await supabase.auth.admin?.getUserById(m.user_id);
        return { user_id: m.user_id, role: m.role, is_primary: m.is_primary, email: u?.email ?? m.user_id };
      }));
      // Fallback if admin API not available: just show user IDs
      const simple = members.map((m: any) => ({ user_id: m.user_id, role: m.role, is_primary: m.is_primary, email: m.user_id }));
      setTeam(simple);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!org) return;
    setSaving(true); setSaved(false);
    await supabase.from("organizations").update({
      name, country_code: country, sector, base_year: baseYear,
      headcount: headcount ? parseInt(headcount) : null,
      annual_turnover: turnover ? parseFloat(turnover) : null,
      annual_balance_sheet: balanceSheet ? parseFloat(balanceSheet) : null,
      consolidation_approach: consolidation || null,
    }).eq("id", (org as any).id);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  }

  async function upgradePlan(newPlan: string) {
    if (!org || !flags) return;
    await supabase.from("feature_flag_subscriptions").update({ plan_type: newPlan }).eq("organization_id", (org as any).id);
    load();
  }

  async function deleteOrg() {
    if (!org || deleteConfirm !== "DELETE") return;
    await supabase.from("organizations").delete().eq("id", (org as any).id);
    window.location.href = "/";
  }

  if (loading) return <div className="space-y-6 animate-pulse"><div className="h-6 w-48 rounded bg-gray-200" /><div className="h-64 rounded-xl bg-gray-100" /></div>;

  const planLabel = flags?.plan_type === "vsme_lite" ? "VSME-Lite (Free)" : flags?.plan_type === "vsme_full" ? "VSME-Full (€99/mo)" : flags?.plan_type === "csrd_full" ? "CSRD-Full (€99/mo)" : flags?.plan_type ?? "Unknown";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-primary-600 hover:text-primary-700">← Back to Overview</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Settings</h1>
        <p className="text-gray-600">Manage your organisation profile, plan, team members, and account.</p>
      </div>

      <div className="flex border-b border-gray-200 gap-1">
        {[["profile","🏢 Profile"],["plan","💳 Plan"],["team","👥 Team"],["danger","⚠️ Danger Zone"]].map(([t,l]) => (
          <button key={t} type="button" onClick={() => setTab(t as any)} className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition ${tab===t?"bg-white text-primary-700 border border-b-white -mb-px border-gray-200":"text-gray-500 hover:text-gray-700"}`}>{l}</button>
        ))}
        <div className="flex-1 border-b border-gray-200" />
      </div>

      <div className="rounded-b-xl rounded-tr-xl border border-t-0 border-gray-200 bg-white p-6">
        {/* Profile */}
        {tab === "profile" && (
          <form onSubmit={saveProfile} className="space-y-6">
            <div><h2 className="text-lg font-semibold text-gray-900">Organisation Profile</h2><p className="text-sm text-gray-500">Update your organisation details. SME classification fields are used for regulatory mode detection.</p></div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Organisation name" value={name} onChange={setName} />
              <div><label className="mb-1 block text-xs font-medium text-gray-600">Country</label><select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="">Select…</option>{EU_COUNTRIES.map((c) => (<option key={c.code} value={c.code}>{c.name}</option>))}</select></div>
              <div><label className="mb-1 block text-xs font-medium text-gray-600">Sector</label><select value={sector} onChange={(e) => setSector(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="">Select…</option>{SECTORS.map((s) => (<option key={s} value={s}>{s}</option>))}</select></div>
              <div><label className="mb-1 block text-xs font-medium text-gray-600">Base year</label><input type="number" value={baseYear} onChange={(e) => setBaseYear(parseInt(e.target.value) || new Date().getFullYear())} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div>
            </div>

            <hr className="border-gray-200" />
            <div><h3 className="text-base font-semibold text-gray-900">SME Classification</h3><p className="text-sm text-gray-500">Per EU Recommendation 2003/361/EC. An SME qualifies if it meets headcount AND (turnover OR balance sheet).</p></div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Headcount (FTE)" value={headcount} onChange={setHeadcount} />
              <Field label="Annual turnover (EUR)" value={turnover} onChange={setTurnover} type="decimal" />
              <Field label="Balance sheet (EUR)" value={balanceSheet} onChange={setBalanceSheet} type="decimal" />
            </div>
            {org && (
              <div className="rounded-lg bg-gray-50 p-4 grid grid-cols-4 gap-4 text-sm">
                <div><span className="text-gray-500">SME Category:</span> <strong>{org.sme_category ?? "—"}</strong></div>
                <div><span className="text-gray-500">Reporting basis:</span> <strong>{org.reporting_basis ?? "—"}</strong></div>
                <div><span className="text-gray-500">Listed:</span> <strong>{org.is_listed ? "Yes" : "No"}</strong></div>
                <div><span className="text-gray-500">1st reporting year:</span> <strong>{org.first_reporting_year ?? "—"}</strong></div>
              </div>
            )}

            <hr className="border-gray-200" />
            <div><h3 className="text-base font-semibold text-gray-900">GHG Accounting</h3></div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Consolidation approach (ESRS E1-6)</label>
              <select value={consolidation} onChange={(e) => setConsolidation(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="">Not set</option><option value="operational_control">Operational control</option><option value="financial_control">Financial control</option><option value="equity_share">Equity share</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <button type="submit" disabled={saving} className="rounded-lg bg-primary-600 px-6 py-2.5 font-semibold text-white hover:bg-primary-700 disabled:opacity-60">{saving?"Saving…":"Save changes"}</button>
              {saved && <span className="text-sm text-emerald-600 font-medium">✓ Saved</span>}
            </div>
          </form>
        )}

        {/* Plan */}
        {tab === "plan" && (
          <div className="space-y-6">
            <div><h2 className="text-lg font-semibold text-gray-900">Plan & Billing</h2><p className="text-sm text-gray-500">Current plan and module access.</p></div>

            <div className="rounded-xl border-2 border-primary-200 bg-primary-50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Current plan</p>
                  <p className="text-2xl font-bold text-gray-900">{planLabel}</p>
                </div>
                <div className="flex gap-2">
                  {flags?.plan_type === "vsme_lite" && <button onClick={() => upgradePlan("vsme_full")} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">Upgrade to VSME-Full</button>}
                  {flags?.plan_type === "vsme_full" && <button onClick={() => upgradePlan("csrd_full")} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">Upgrade to CSRD-Full</button>}
                  {(flags?.plan_type === "vsme_full" || flags?.plan_type === "csrd_full") && <button onClick={() => upgradePlan("vsme_lite")} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Downgrade to VSME-Lite</button>}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-3">Module Access</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(FLAG_LABELS).map(([key, label]) => (
                  <div key={key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${flags?.[key] ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-gray-100 bg-gray-50 text-gray-400"}`}>
                    <span>{flags?.[key] ? "✅" : "🔒"}</span> {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Team */}
        {tab === "team" && (
          <div className="space-y-6">
            <div><h2 className="text-lg font-semibold text-gray-900">Team Members</h2><p className="text-sm text-gray-500">People with access to this organisation&apos;s ESG data.</p></div>
            {team.length === 0 && <p className="text-gray-400 py-8 text-center">No team members found.</p>}
            <div className="space-y-2">
              {team.map((m) => (
                <div key={m.user_id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{m.email}</p>
                    <p className="text-xs text-gray-500">{m.role}{m.is_primary ? " · Primary" : ""}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${m.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>{m.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Danger Zone */}
        {tab === "danger" && (
          <div className="space-y-6">
            <div><h2 className="text-lg font-semibold text-red-700">Danger Zone</h2><p className="text-sm text-gray-500">Irreversible actions. Please be certain.</p></div>

            <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6 space-y-4">
              <div>
                <p className="font-semibold text-red-800">Delete organisation</p>
                <p className="text-sm text-red-600">Permanently delete all ESG data, reports, and team access. This cannot be undone.</p>
              </div>
              {!showDelete ? (
                <button onClick={() => setShowDelete(true)} className="rounded-lg border-2 border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">Delete organisation</button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-red-700 font-medium">Type DELETE to confirm:</p>
                  <input type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm" placeholder="DELETE" />
                  <div className="flex gap-2">
                    <button onClick={deleteOrg} disabled={deleteConfirm !== "DELETE"} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">Confirm delete</button>
                    <button onClick={() => { setShowDelete(false); setDeleteConfirm(""); }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "int", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: "int" | "decimal"; placeholder?: string }) {
  const isNum = type === "int" || type === "decimal";
  return <div><label className="mb-1 block text-xs font-medium text-gray-600">{label}</label><input type={isNum?"number":"text"} min="0" step={type==="decimal"?"0.01":"1"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" /></div>;
}
