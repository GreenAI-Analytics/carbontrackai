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

      // Fetch the most recent calculation run to surface on overview
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
    return <p className="text-gray-500 animate-pulse">Loading your workspace…</p>;
  }

  const displayName = profile?.full_name ?? profile?.email ?? "User";

  const kpiCards = [
    {
      label: "Scope 1 Emissions",
      value: latestCalc ? formatTco2e(latestCalc.scope1) : "—",
      unit: "tCO₂e",
      sub: latestCalc ? `${latestCalc.year} direct combustion` : "No calculation yet",
      color: "bg-orange-50 border-orange-200",
    },
    {
      label: "Scope 2 Emissions",
      value: latestCalc ? formatTco2e(latestCalc.scope2) : "—",
      unit: "tCO₂e",
      sub: latestCalc ? `${latestCalc.year} purchased electricity` : "No calculation yet",
      color: "bg-blue-50 border-blue-200",
    },
    {
      label: "Total Energy",
      value: latestCalc ? formatMWh(latestCalc.totalMWh) : "—",
      unit: "MWh",
      sub: latestCalc ? `${latestCalc.year} VSME B2` : "No calculation yet",
      color: "bg-green-50 border-green-200",
    },
  ];

  const checklist = [
    { label: "Create your account", done: true },
    { label: "Set up your organisation", done: !!org },
    { label: "Add your first activity record (electricity, gas, fuel)", done: false },
    { label: "Run your first Scope 1 & 2 calculation", done: latestCalc !== null },
    { label: "Export your annual report", done: false },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {displayName.split(" ")[0]}
        </h1>
        <p className="text-gray-600">
          {org
            ? `${org.name} · ${org.country_code}${org.sector ? ` · ${org.sector}` : ""}`
            : "No organisation found."}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpiCards.map((card) => (
          <div key={card.label} className={`rounded-xl border p-5 ${card.color}`}>
            <p className="text-sm font-medium text-gray-600">{card.label}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900 tabular-nums">{card.value}</p>
            <p className="text-xs text-gray-500">{card.unit}</p>
            <p className="mt-1 text-xs text-gray-400">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Getting started checklist */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Getting started</h2>
        <ol className="space-y-3">
          {checklist.map((item, idx) => (
            <li key={idx} className="flex items-center gap-3 text-sm">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
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

      {/* Module cards */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "Activity Data", description: "Log energy and fuel usage", href: "/dashboard/activity", badge: "Active" },
            { label: "Emissions", description: "Scope 1 & 2 calculation results", href: "/dashboard/emissions", badge: "Active" },
            { label: "Scope 3 & Targets", description: "Comprehensive module — track value chain", href: "#", badge: "Upgrade" },
            { label: "Climate Risk", description: "Physical asset risk assessment", href: "#", badge: "Upgrade" },
          ].map((mod) => (
            <Link
              key={mod.label}
              href={mod.href}
              className="flex items-start justify-between rounded-lg border border-gray-100 p-4 hover:border-primary-200 hover:bg-green-50 transition"
            >
              <div>
                <p className="font-medium text-gray-900">{mod.label}</p>
                <p className="text-sm text-gray-500">{mod.description}</p>
              </div>
              <span
                className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  mod.badge === "Active"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {mod.badge}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
