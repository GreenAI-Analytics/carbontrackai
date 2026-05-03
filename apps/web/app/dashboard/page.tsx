"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { formatTco2e, formatMWh } from "@/lib/calculations";

type UserProfile = {
  full_name: string | null;
  email: string;
};

type OrgRecord = {
  id: string;
  name: string;
  country_code: string;
  sector: string | null;
};

type LatestCalc = {
  scope1: number;
  scope2: number;
  totalMWh: number;
  year: number;
};

type EsgPillar = {
  key: string;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  modules: number;
  modulesCompleted: number;
  description: string;
  href: string;
};

const ESG_PILLARS: EsgPillar[] = [
  {
    key: "environmental",
    label: "Environmental",
    icon: "🌍",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    modules: 5,
    modulesCompleted: 5, // All E1-E5 implemented
    description: "Climate, Pollution, Water, Biodiversity, Circular Economy",
    href: "/dashboard/esg/environmental/climate",
  },
  {
    key: "social",
    label: "Social",
    icon: "👥",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    modules: 4,
    modulesCompleted: 4, // All S1-S4 implemented
    description: "Workforce, Value Chain, Communities, Consumers",
    href: "/dashboard/esg/social/workforce",
  },
  {
    key: "governance",
    label: "Governance",
    icon: "🏛️",
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    modules: 3,
    modulesCompleted: 2, // Business Conduct + Compliance
    description: "Board, Ethics, Compliance, Whistleblower, Data Privacy, Supply Chain",
    href: "/dashboard/esg/governance/ethics",
  },
  {
    key: "crosscutting",
    label: "Cross-Cutting",
    icon: "⚖️",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    modules: 3,
    modulesCompleted: 2, // EU Taxonomy + ESRS 2
    description: "Materiality, EU Taxonomy, Report Builder",
    href: "/dashboard/materiality",
  },
];

const QUICK_LINKS = [
  { label: "Activity Data", href: "/dashboard/activity", icon: "⚡", description: "Log energy and fuel usage" },
  { label: "Emissions Results", href: "/dashboard/emissions", icon: "📊", description: "View Scope 1 & 2 calculations" },
  { label: "Double Materiality", href: "/dashboard/materiality", icon: "🎯", description: "Assess impact and financial materiality" },
  { label: "Report Builder", href: "/dashboard/reports", icon: "📄", description: "Generate CSRD-ready reports" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [org, setOrg] = useState<OrgRecord | null>(null);
  const [latestCalc, setLatestCalc] = useState<LatestCalc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setProfile({
        full_name: user.user_metadata?.full_name ?? null,
        email: user.email!,
      });

      // Fetch user's primary organisation
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("is_primary", true)
        .single();

      if (!roleData) {
        router.replace("/onboarding");
        return;
      }

      const { data: orgData } = await supabase
        .from("organizations")
        .select("id, name, country_code, sector")
        .eq("id", roleData.organization_id)
        .single();

      setOrg(orgData ?? null);

      // Fetch the most recent calculation run
      if (orgData) {
        const { data: periodData } = await supabase
          .from("reporting_periods")
          .select("id, year")
          .eq("organization_id", orgData.id)
          .order("year", { ascending: false })
          .limit(1)
          .single();

        if (periodData) {
          const { data: runs } = await supabase
            .from("calculation_runs")
            .select("scope_type, total_emissions, total_energy")
            .eq("reporting_period_id", periodData.id);

          if (runs && runs.length > 0) {
            const s1 = runs.find((r) => r.scope_type === "scope_1")?.total_emissions ?? 0;
            const s2 = runs.find((r) => r.scope_type === "scope_2_location")?.total_emissions ?? 0;
            const mwh = runs.find((r) => r.scope_type === "scope_1")?.total_energy ?? 0;
            setLatestCalc({ scope1: s1, scope2: s2, totalMWh: mwh, year: periodData.year });
          }
        }
      }

      setLoading(false);
    }

    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-64 bg-gray-200 rounded" />
        <div className="h-4 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const displayName = profile?.full_name ?? profile?.email ?? "User";
  const firstName = displayName.split(" ")[0];

  // Calculate overall completion across all pillars
  const totalModules = ESG_PILLARS.reduce((sum, p) => sum + p.modules, 0);
  const totalCompleted = ESG_PILLARS.reduce((sum, p) => sum + p.modulesCompleted, 0);
  const completionPercent = Math.round((totalCompleted / totalModules) * 100);

  const checklist = [
    { label: "Create your account", done: true },
    { label: "Set up your organisation", done: !!org },
    { label: "Log your first activity data", done: false },
    { label: "Run your first emissions calculation", done: latestCalc !== null },
    { label: "Complete double materiality assessment", done: false },
    { label: "Generate your first CSRD report", done: false },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {firstName}
          </h1>
          <p className="text-gray-500">
            {org
              ? `${org.name} · ${org.country_code}${org.sector ? ` · ${org.sector}` : ""}`
              : "No organisation found."}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">CSRD Readiness</span>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 rounded-full transition-all"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <span className="font-semibold text-gray-900">{completionPercent}%</span>
          </div>
        </div>
      </div>

      {/* ESG Pillar overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ESG_PILLARS.map((pillar) => {
          const pct = Math.round((pillar.modulesCompleted / pillar.modules) * 100);
          return (
            <Link
              key={pillar.key}
              href={pillar.href}
              className={`rounded-xl border ${pillar.borderColor} ${pillar.bgColor} p-5 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{pillar.icon}</span>
                <span className={`text-xs font-semibold ${pillar.color}`}>
                  {pillar.modulesCompleted}/{pillar.modules} modules
                </span>
              </div>
              <h3 className={`font-semibold text-gray-900 mb-1`}>{pillar.label}</h3>
              <p className="text-xs text-gray-500 mb-3">{pillar.description}</p>
              <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    pillar.key === "environmental"
                      ? "bg-emerald-500"
                      : pillar.key === "social"
                      ? "bg-blue-500"
                      : pillar.key === "governance"
                      ? "bg-purple-500"
                      : "bg-amber-500"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Carbon emissions KPIs (existing data) */}
      {latestCalc && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Latest Carbon Emissions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
              <p className="text-sm font-medium text-gray-600">Scope 1 Emissions</p>
              <p className="mt-1 text-3xl font-bold text-gray-900 tabular-nums">
                {formatTco2e(latestCalc.scope1)}
              </p>
              <p className="text-xs text-gray-500">tCO₂e · {latestCalc.year} direct combustion</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
              <p className="text-sm font-medium text-gray-600">Scope 2 Emissions</p>
              <p className="mt-1 text-3xl font-bold text-gray-900 tabular-nums">
                {formatTco2e(latestCalc.scope2)}
              </p>
              <p className="text-xs text-gray-500">tCO₂e · {latestCalc.year} purchased electricity</p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-5">
              <p className="text-sm font-medium text-gray-600">Total Energy</p>
              <p className="mt-1 text-3xl font-bold text-gray-900 tabular-nums">
                {formatMWh(latestCalc.totalMWh)}
              </p>
              <p className="text-xs text-gray-500">MWh · {latestCalc.year} consumption</p>
            </div>
          </div>
        </div>
      )}

      {/* No data banner */}
      {!latestCalc && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <p className="text-gray-500">
            No emissions data yet.{' '}
            <Link href="/dashboard/activity" className="text-primary-600 hover:text-primary-700 font-medium">
              Log your first activity record
            </Link>{' '}
            to get started.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Getting started checklist */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Getting Started</h2>
          <ol className="space-y-3">
            {checklist.map((item, idx) => (
              <li key={idx} className="flex items-center gap-3 text-sm">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    item.done
                      ? "bg-primary-600 text-white"
                      : "border-2 border-gray-300 text-gray-400"
                  }`}
                >
                  {item.done ? "✓" : idx + 1}
                </span>
                <span className={item.done ? "text-gray-400 line-through" : "text-gray-700"}>
                  {item.label}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Quick links */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 hover:border-primary-200 hover:bg-green-50 transition"
              >
                <span className="text-xl">{link.icon}</span>
                <div>
                  <p className="font-medium text-gray-900">{link.label}</p>
                  <p className="text-xs text-gray-500">{link.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ESRS Standards Reference */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">ESRS Coverage</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="space-y-2">
            <p className="font-semibold text-emerald-700">🌍 Environmental</p>
            <ul className="space-y-1 text-gray-600">
              <li>E1 — Climate Change</li>
              <li>E2 — Pollution</li>
              <li>E3 — Water & Marine Resources</li>
              <li>E4 — Biodiversity & Ecosystems</li>
              <li>E5 — Circular Economy</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-blue-700">👥 Social</p>
            <ul className="space-y-1 text-gray-600">
              <li>S1 — Own Workforce</li>
              <li>S2 — Workers in Value Chain</li>
              <li>S3 — Affected Communities</li>
              <li>S4 — Consumers & End-Users</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-purple-700">🏛️ Governance</p>
            <ul className="space-y-1 text-gray-600">
              <li>G1 — Business Conduct</li>
              <li className="mt-2 font-semibold text-amber-700">⚖️ Cross-Cutting</li>
              <li>ESRS 1 — Double Materiality</li>
              <li>ESRS 2 — General Disclosures</li>
              <li>EU Taxonomy Regulation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
