"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import type { MaterialityStatus } from "@/lib/materiality";

interface AssessmentRecord {
  id: string;
  status: MaterialityStatus;
  methodology: string;
  reporting_period_id: string;
  created_at: string;
  updated_at: string;
  period_year: number | null;
  iro_count: number;
}

const STATUS_BADGES: Record<MaterialityStatus, { label: string; classes: string }> = {
  draft: {
    label: "Draft",
    classes: "bg-gray-100 text-gray-700 border-gray-300",
  },
  in_progress: {
    label: "In Progress",
    classes: "bg-blue-50 text-blue-700 border-blue-300",
  },
  completed: {
    label: "Completed",
    classes: "bg-green-50 text-green-700 border-green-300",
  },
  reviewed: {
    label: "Reviewed",
    classes: "bg-purple-50 text-purple-700 border-purple-300",
  },
};

export default function DoubleMaterialityPage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  const loadAssessments = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    // Find the user's primary organisation
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

    setOrgId(roleData.organization_id);

    // Fetch assessments with related data
    const { data } = await supabase
      .from("materiality_assessments")
      .select(
        `id, status, methodology, reporting_period_id, created_at, updated_at,
         reporting_periods ( year )`
      )
      .eq("organization_id", roleData.organization_id)
      .order("created_at", { ascending: false });

    if (data) {
      // For each assessment, count IROs
      const withCounts = await Promise.all(
        data.map(async (a: Record<string, unknown>) => {
          const { count } = await supabase
            .from("materiality_iro")
            .select("*", { count: "exact", head: true })
            .eq("assessment_id", a.id as string);
          const rp = a.reporting_periods as { year: number }[] | undefined;
          return {
            id: a.id as string,
            status: a.status as MaterialityStatus,
            methodology: a.methodology as string,
            reporting_period_id: a.reporting_period_id as string,
            created_at: a.created_at as string,
            updated_at: a.updated_at as string,
            period_year: rp?.[0]?.year ?? null,
            iro_count: count ?? 0,
          } as AssessmentRecord;
        })
      );
      setAssessments(withCounts);
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadAssessments().catch(console.error);
  }, [loadAssessments]);

  async function handleCreate() {
    if (!orgId) return;
    setCreating(true);

    // Find the latest reporting period for this org
    const { data: period } = await supabase
      .from("reporting_periods")
      .select("id")
      .eq("organization_id", orgId)
      .order("year", { ascending: false })
      .limit(1)
      .single();

    if (!period) {
      alert("No reporting period found. Please create one first.");
      setCreating(false);
      return;
    }

    const { data: newAssessment, error } = await supabase
      .from("materiality_assessments")
      .insert({
        organization_id: orgId,
        reporting_period_id: period.id,
        methodology: "double_materiality",
        status: "draft",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create assessment:", error);
      alert("Failed to create assessment. Please try again.");
      setCreating(false);
      return;
    }

    setCreating(false);
    router.push(`/dashboard/materiality/${newAssessment.id}`);
  }

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-72 bg-gray-200 rounded" />
        <div className="h-4 w-96 bg-gray-200 rounded" />
        <div className="mt-6 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────
  if (assessments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              ← Back to Overview
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">
              Double Materiality Assessment
            </h1>
            <p className="text-gray-600 mt-1 max-w-2xl">
              ESRS 1, IRO-1 • Assess which sustainability topics are material to
              your organisation. Double materiality considers both{" "}
              <strong>impact</strong> (inside-out) and{" "}
              <strong>financial</strong> (outside-in) perspectives.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-16 text-center">
          <div className="text-6xl mb-6">🎯</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Start your first materiality assessment
          </h2>
          <p className="text-gray-500 max-w-md mx-auto mb-8">
            Identify and evaluate your organisation&apos;s impacts, risks, and
            opportunities across all ESRS topics. This will determine which
            disclosure obligations apply.
          </p>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {creating ? "Creating…" : "Create Assessment"}
          </button>
        </div>
      </div>
    );
  }

  // ── Assessment list ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            ← Back to Overview
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            Double Materiality Assessment
          </h1>
          <p className="text-gray-600 mt-1">
            ESRS 1, IRO-1 • Select an assessment to view or edit.
          </p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="shrink-0 rounded-lg bg-primary-600 px-5 py-2.5 font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {creating ? "Creating…" : "+ New Assessment"}
        </button>
      </div>

      {/* Assessment cards */}
      <div className="space-y-3">
        {assessments.map((a) => {
          const badge = STATUS_BADGES[a.status] ?? STATUS_BADGES.draft;
          return (
            <Link
              key={a.id}
              href={`/dashboard/materiality/${a.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-5 hover:border-primary-300 hover:shadow-sm transition"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {a.period_year ?? "Unknown"} Assessment
                    </h3>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.classes}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {a.iro_count} IRO
                    {a.iro_count !== 1 ? "s" : ""} registered · Last updated{" "}
                    {new Date(a.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="shrink-0 text-gray-400">→</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
