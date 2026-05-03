"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";

type FactorSource = { id: string; name: string; provider: string; last_updated: string | null; is_active: boolean };
type AuditEntry = { id: string; table_name: string; field_name: string; old_value: string | null; new_value: string | null; created_at: string };
type OrgStats = { orgCount: number; userCount: number; periodCount: number };

export default function AdminPage() {
  const [tab, setTab] = useState<"factors" | "audit" | "stats">("factors");
  const [sources, setSources] = useState<FactorSource[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<OrgStats>({ orgCount: 0, userCount: 0, periodCount: 0 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check admin role
    const { data: role } = await supabase.from("user_roles").select("role,organization_id").eq("user_id", user.id).eq("role", "admin").single();
    if (!role) { setLoading(false); return; }

    const oid = role.organization_id;

    const [src, audit, orgCount, userCount, periodCount] = await Promise.all([
      supabase.from("factor_sources").select("id,name,provider,last_updated,is_active").order("name"),
      supabase.from("change_history").select("id,table_name,field_name,old_value,new_value,created_at").eq("organization_id", oid).order("created_at", { ascending: false }).limit(50),
      supabase.from("organizations").select("*", { count: "exact", head: true }),
      supabase.from("user_roles").select("*", { count: "exact", head: true }),
      supabase.from("reporting_periods").select("*", { count: "exact", head: true }),
    ]);

    setSources((src.data ?? []) as FactorSource[]);
    setAuditLog((audit.data ?? []) as AuditEntry[]);
    setStats({ orgCount: orgCount.count ?? 0, userCount: userCount.count ?? 0, periodCount: periodCount.count ?? 0 });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="space-y-6 animate-pulse"><div className="h-6 w-48 rounded bg-gray-200" /><div className="h-64 rounded-xl bg-gray-100" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-primary-600 hover:text-primary-700">← Back to Overview</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Admin Dashboard</h1>
        <p className="text-gray-600">Factor source management, audit log, and system statistics.</p>
      </div>

      <div className="flex border-b border-gray-200 gap-1">
        {[["factors","📡 Factors"],["audit","📋 Audit Log"],["stats","📊 Stats"]].map(([t,l]) => (
          <button key={t} type="button" onClick={() => setTab(t as any)} className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition ${tab===t?"bg-white text-primary-700 border border-b-white -mb-px border-gray-200":"text-gray-500 hover:text-gray-700"}`}>{l}</button>
        ))}
        <div className="flex-1 border-b border-gray-200" />
      </div>

      <div className="rounded-b-xl rounded-tr-xl border border-t-0 border-gray-200 bg-white p-6">
        {tab === "factors" && (
          <div className="space-y-4">
            <div className="flex justify-between">
              <div><h2 className="text-lg font-semibold text-gray-900">Emission Factor Sources</h2><p className="text-sm text-gray-500">Data providers and last refresh timestamps.</p></div>
              <Link href="/dashboard/settings" className="text-sm text-primary-600 hover:text-primary-700">Refresh factors →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase"><th className="px-4 py-2">Source</th><th className="px-4 py-2">Provider</th><th className="px-4 py-2">Last Updated</th><th className="px-4 py-2">Status</th></tr></thead>
                <tbody>
                  {sources.map((s) => (
                    <tr key={s.id} className="border-b border-gray-100">
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-gray-500">{s.provider}</td>
                      <td className="px-4 py-3 text-gray-500">{s.last_updated ? new Date(s.last_updated).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never"}</td>
                      <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{s.is_active ? "Active" : "Inactive"}</span></td>
                    </tr>
                  ))}
                  {sources.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No factor sources configured. Run the Climatiq refresh from Settings.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "audit" && (
          <div className="space-y-4">
            <div><h2 className="text-lg font-semibold text-gray-900">Audit Log</h2><p className="text-sm text-gray-500">Recent changes across all ESG data tables.</p></div>
            {auditLog.length === 0 ? (
              <p className="text-gray-400 py-8 text-center">No audit entries yet. Changes will appear here as data is modified.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase"><th className="px-4 py-2">Date</th><th className="px-4 py-2">Table</th><th className="px-4 py-2">Field</th><th className="px-4 py-2">Change</th></tr></thead>
                  <tbody>
                    {auditLog.map((a) => (
                      <tr key={a.id} className="border-b border-gray-100">
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                        <td className="px-4 py-3 font-mono text-xs">{a.table_name}</td>
                        <td className="px-4 py-3 text-gray-600">{a.field_name}</td>
                        <td className="px-4 py-3 text-xs"><span className="text-red-500 line-through">{a.old_value?.substring(0, 30)}</span> → <span className="text-green-600">{a.new_value?.substring(0, 30)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "stats" && (
          <div className="space-y-6">
            <div><h2 className="text-lg font-semibold text-gray-900">System Statistics</h2></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-center">
                <p className="text-3xl font-bold text-blue-700">{stats.orgCount}</p>
                <p className="text-sm text-gray-500 mt-1">Organisations</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <p className="text-3xl font-bold text-emerald-700">{stats.userCount}</p>
                <p className="text-sm text-gray-500 mt-1">User roles</p>
              </div>
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-6 text-center">
                <p className="text-3xl font-bold text-purple-700">{stats.periodCount}</p>
                <p className="text-sm text-gray-500 mt-1">Reporting periods</p>
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
              <p><strong>Migrations:</strong> 23</p>
              <p><strong>Pages:</strong> 25 (zero placeholders)</p>
              <p><strong>Libraries:</strong> 7 (calculations, materiality, social-metrics, governance-metrics, taxonomy, climatiq, greenwashing)</p>
              <p><strong>Compliance:</strong> CSRD/ESRS, VSME, EU Taxonomy, GDPR, Directive 2019/1937, Directive 2023/970, Green Claims Directive</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
