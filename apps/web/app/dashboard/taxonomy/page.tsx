"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import {
  computeTaxonomySnapshot,
  formatPct,
  getNaceLabel,
  COMMON_ELIGIBLE_NACE,
  type AssessmentDepth,
  type TaxonomySnapshot,
} from "@/lib/taxonomy";

interface OrgContext { orgId: string; periodId: string | null; assessmentId: string | null; }

type ActivityForm = {
  nace: string; desc: string; sc: boolean; dnsh: boolean; ms: boolean;
  turnoverPct: string; capexPct: string; opexPct: string;
};

export default function TaxonomyPage() {
  const [ctx, setCtx] = useState<OrgContext | null>(null);
  const [snapshot, setSnapshot] = useState<TaxonomySnapshot | null>(null);
  const [depth, setDepth] = useState<AssessmentDepth>("full_alignment");
  const [activities, setActivities] = useState<ActivityForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showNaceRef, setShowNaceRef] = useState(false);

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
    const pid = period?.id;
    if (!pid) { setLoading(false); return; }

    // Get or create assessment
    let { data: assessment } = await supabase.from("taxonomy_assessments").select("id, status").eq("organization_id", orgId).eq("reporting_period_id", pid).single();
    if (!assessment) {
      const { data: na } = await supabase.from("taxonomy_assessments").insert({ organization_id: orgId, reporting_period_id: pid, status: "draft" }).select("id, status").single();
      assessment = na;
    }

    setCtx({ orgId, periodId: pid, assessmentId: assessment?.id ?? null });

    // Load activities
    const { data: acts } = await supabase.from("taxonomy_activities").select("*").eq("assessment_id", assessment?.id);
    if (acts?.length) {
      setActivities(acts.map((a: any) => ({
        nace: a.nace_code ?? "",
        desc: a.activity_description ?? "",
        sc: !!a.substantial_contribution_met,
        dnsh: !!a.dnsh_met,
        ms: !!a.minimum_safeguards_met,
        turnoverPct: String(a.turnover_percentage ?? ""),
        capexPct: String(a.capex_percentage ?? ""),
        opexPct: String(a.opex_percentage ?? ""),
      })));
    }

    const snap = computeTaxonomySnapshot((acts ?? []) as any[], depth);
    setSnapshot(snap);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Recompute when depth or activities change
  useEffect(() => {
    if (!loading) {
      const acts = activities.map((a) => ({
        nace_code: a.nace,
        activity_description: a.desc,
        substantial_contribution_met: a.sc,
        dnsh_met: depth === "eligibility_only" ? false : a.dnsh,
        minimum_safeguards_met: depth === "eligibility_only" ? false : a.ms,
        turnover_percentage: a.turnoverPct === "" ? null : parseFloat(a.turnoverPct),
        capex_percentage: a.capexPct === "" ? null : parseFloat(a.capexPct),
        opex_percentage: a.opexPct === "" ? null : parseFloat(a.opexPct),
      }));
      setSnapshot(computeTaxonomySnapshot(acts, depth));
    }
  }, [depth, activities, loading]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!ctx?.orgId || !ctx?.periodId || !ctx?.assessmentId) return;
    setSaving(true); setSaved(false);
    const aid = ctx.assessmentId;
    const tf = (s: string) => s === "" ? null : parseFloat(s);

    // Delete existing and re-insert
    await supabase.from("taxonomy_activities").delete().eq("assessment_id", aid);

    const valid = activities.filter((a) => a.nace);
    if (valid.length > 0) {
      await supabase.from("taxonomy_activities").insert(
        valid.map((a) => ({
          assessment_id: aid,
          nace_code: a.nace,
          activity_description: a.desc || getNaceLabel(a.nace),
          substantial_contribution_met: a.sc,
          dnsh_met: a.dnsh,
          minimum_safeguards_met: a.ms,
          turnover_percentage: tf(a.turnoverPct),
          capex_percentage: tf(a.capexPct),
          opex_percentage: tf(a.opexPct),
        }))
      );
    }

    await supabase.from("taxonomy_assessments").update({ status: "in_progress" }).eq("id", aid);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function addRow() {
    setActivities([...activities, { nace: "", desc: "", sc: false, dnsh: false, ms: false, turnoverPct: "", capexPct: "", opexPct: "" }]);
  }

  function quickAdd(nace: string) {
    setActivities([...activities, { nace, desc: getNaceLabel(nace), sc: false, dnsh: false, ms: false, turnoverPct: "", capexPct: "", opexPct: "" }]);
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-48 rounded bg-gray-200" />
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (<div key={i} className="h-24 rounded-xl bg-gray-100" />))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-primary-600 hover:text-primary-700">← Back to Overview</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">EU Taxonomy Alignment</h1>
        <p className="text-gray-600">EU Taxonomy Regulation · Assess economic activities against technical screening criteria for substantial contribution, DNSH, and minimum safeguards.</p>
      </div>

      {/* KPI Dashboard */}
      {snapshot && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KpiBox label="Eligible" value={formatPct(snapshot.eligiblePct)} sub={`${snapshot.eligibleCount} activities`} colour="blue" />
          <KpiBox label="Aligned" value={formatPct(snapshot.alignedPct)} sub={`${snapshot.alignedCount} fully aligned`} colour="emerald" />
          <KpiBox label="Turnover" value={formatPct(snapshot.turnoverAlignedPct)} sub={`${formatPct(snapshot.turnoverEligiblePct)} eligible`} colour="purple" />
          <KpiBox label="CapEx" value={formatPct(snapshot.capexAlignedPct)} sub={`${formatPct(snapshot.capexEligiblePct)} eligible`} colour="amber" />
          <KpiBox label="OpEx" value={formatPct(snapshot.opexAlignedPct)} sub={`${formatPct(snapshot.opexEligiblePct)} eligible`} colour="blue" />
        </div>
      )}

      {/* Depth selector */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <label className="text-sm font-medium text-gray-700 mb-2 block">Assessment depth (Omnibus I SME-proportionate)</label>
        <div className="flex gap-2">
          {([
            ["eligibility_only", "Eligibility only"],
            ["partial_alignment", "Partial alignment (SC only)"],
            ["full_alignment", "Full alignment (SC + DNSH + MS)"],
          ] as [AssessmentDepth, string][]).map(([d, label]) => (
            <button key={d} type="button" onClick={() => setDepth(d)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${depth === d ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {depth === "eligibility_only" && "SMEs can disclose eligibility only under Omnibus I — no DNSH or minimum safeguards needed."}
          {depth === "partial_alignment" && "Substantial contribution assessed. DNSH and minimum safeguards are deferred."}
          {depth === "full_alignment" && "Full assessment: substantial contribution, DNSH, and minimum safeguards all required."}
        </p>
      </div>

      {/* Activities table */}
      <form onSubmit={handleSave} className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Economic Activities</h2>
            <p className="text-sm text-gray-500">Add NACE-coded activities and assess each against the taxonomy criteria.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowNaceRef(!showNaceRef)} className="text-sm text-primary-600 hover:text-primary-700">
              {showNaceRef ? "Hide NACE reference" : "NACE reference"}
            </button>
            <button type="button" onClick={addRow} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
              + Add activity
            </button>
          </div>
        </div>

        {/* NACE quick-reference panel */}
        {showNaceRef && (
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Common taxonomy-eligible NACE codes (click to add):</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(COMMON_ELIGIBLE_NACE).map(([code, label]) => (
                <button key={code} type="button" onClick={() => quickAdd(code)}
                  className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:border-primary-300 hover:bg-primary-50 transition">
                  {code} — {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Activity rows */}
        {activities.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-5xl mb-3">🏷️</p>
            <p>No activities added yet. Click &ldquo;+ Add activity&rdquo; or pick from the NACE reference above.</p>
          </div>
        )}

        {activities.map((a, i) => (
          <div key={i} className="border border-gray-100 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">NACE code</label>
                <input type="text" value={a.nace} onChange={(e) => { const n = [...activities]; n[i].nace = e.target.value; setActivities(n); }}
                  placeholder="e.g. F41" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">Description</label>
                <input type="text" value={a.desc} onChange={(e) => { const n = [...activities]; n[i].desc = e.target.value; setActivities(n); }}
                  placeholder={getNaceLabel(a.nace)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" />
              </div>
              <button type="button" onClick={() => setActivities(activities.filter((_, j) => j !== i))}
                className="text-red-400 hover:text-red-600 text-sm mb-1 justify-self-end">✕ Remove</button>
            </div>

            {/* Criteria checkboxes */}
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={a.sc} onChange={(e) => { const n = [...activities]; n[i].sc = e.target.checked; setActivities(n); }} />
                Substantial contribution
              </label>
              {depth !== "eligibility_only" && (
                <>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={a.dnsh} onChange={(e) => { const n = [...activities]; n[i].dnsh = e.target.checked; setActivities(n); }} />
                    DNSH met
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={a.ms} onChange={(e) => { const n = [...activities]; n[i].ms = e.target.checked; setActivities(n); }} />
                    Minimum safeguards
                  </label>
                </>
              )}
            </div>

            {/* KPI percentages */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Turnover %</label>
                <input type="number" min="0" max="100" step="0.1" value={a.turnoverPct} onChange={(e) => { const n = [...activities]; n[i].turnoverPct = e.target.value; setActivities(n); }}
                  placeholder="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">CapEx %</label>
                <input type="number" min="0" max="100" step="0.1" value={a.capexPct} onChange={(e) => { const n = [...activities]; n[i].capexPct = e.target.value; setActivities(n); }}
                  placeholder="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">OpEx %</label>
                <input type="number" min="0" max="100" step="0.1" value={a.opexPct} onChange={(e) => { const n = [...activities]; n[i].opexPct = e.target.value; setActivities(n); }}
                  placeholder="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" />
              </div>
            </div>
          </div>
        ))}

        {/* Save */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <button type="submit" disabled={saving} className="rounded-lg bg-primary-600 px-6 py-2.5 font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60">
            {saving ? "Saving…" : "Save assessment"}
          </button>
          {saved && <span className="text-sm text-emerald-600 font-medium">✓ Saved</span>}
        </div>
      </form>
    </div>
  );
}

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
