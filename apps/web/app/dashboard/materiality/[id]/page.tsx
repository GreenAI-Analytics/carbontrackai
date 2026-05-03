
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import {
  ESRS_TOPICS,
  computeIroScores,
  buildMatrixData,
  generateSummary,
  createDefaultIro,
  classifyMateriality,
  MATERIAL_THRESHOLD,
  type IroRecord,
  type IroType,
  type IroDirection,
  type MaterialityStatus,
  type MaterialitySummary,
} from "@/lib/materiality";

// ─── Types ───────────────────────────────────────────────────────────────────

type TabId = "iro" | "matrix" | "summary";

interface AssessmentMeta {
  id: string;
  status: MaterialityStatus;
  methodology: string;
  organization_id: string;
  reporting_period_id: string;
  created_at: string;
  updated_at: string;
  reporting_periods: { year: number } | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: MaterialityStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "reviewed", label: "Reviewed" },
];

const IRO_TYPE_OPTIONS: { value: IroType; label: string }[] = [
  { value: "impact", label: "Impact" },
  { value: "risk", label: "Risk" },
  { value: "opportunity", label: "Opportunity" },
];

const DIRECTION_OPTIONS: { value: IroDirection; label: string }[] = [
  { value: "actual_negative", label: "Actual Negative" },
  { value: "potential_negative", label: "Potential Negative" },
  { value: "actual_positive", label: "Actual Positive" },
  { value: "potential_positive", label: "Potential Positive" },
  { value: "financial_risk", label: "Financial Risk" },
  { value: "financial_opportunity", label: "Financial Opportunity" },
];

const SCALE_LABELS: Record<number, string> = {
  1: "Very Low",
  2: "Low",
  3: "Medium",
  4: "High",
  5: "Very High",
};

function scoreColor(score: number): string {
  if (score >= 4) return "text-red-600";
  if (score >= 2.5) return "text-amber-600";
  return "text-gray-500";
}

function iroTypeIcon(type: IroType): string {
  if (type === "impact") return "💥";
  if (type === "risk") return "⚠️";
  return "💡";
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function AssessmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  const [assessment, setAssessment] = useState<AssessmentMeta | null>(null);
  const [iros, setIros] = useState<IroRecord[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("iro");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // IRO form state
  const [showIroForm, setShowIroForm] = useState(false);
  const [editingIroId, setEditingIroId] = useState<string | null>(null);
  const [iroForm, setIroForm] = useState<IroRecord | null>(null);

  // Computed data
  const [summary, setSummary] = useState<MaterialitySummary | null>(null);

  // ── Data loading ───────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }

    // Fetch assessment metadata
    const { data: assessmentData } = await supabase
      .from("materiality_assessments")
      .select("*, reporting_periods(year)")
      .eq("id", assessmentId)
      .single();

    if (!assessmentData) {
      router.replace("/dashboard/materiality");
      return;
    }

    setAssessment(assessmentData as unknown as AssessmentMeta);

    // Fetch IROs
    const { data: iroData } = await supabase
      .from("materiality_iro")
      .select("*")
      .eq("assessment_id", assessmentId)
      .order("created_at", { ascending: true });

    const iroList = (iroData ?? []) as unknown as IroRecord[];
    setIros(iroList);

    // Compute summary
    const s = generateSummary(assessmentId, assessmentData.status, iroList);
    setSummary(s);

    setLoading(false);
  }, [assessmentId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Assessment status update ───────────────────────────────────────────────

  async function handleStatusChange(newStatus: MaterialityStatus) {
    if (!assessment) return;
    setSaving(true);
    await supabase
      .from("materiality_assessments")
      .update({ status: newStatus })
      .eq("id", assessmentId);
    setAssessment({ ...assessment, status: newStatus });
    setSaving(false);
  }

  // ── IRO CRUD ───────────────────────────────────────────────────────────────

  function openNewIroForm() {
    setEditingIroId(null);
    setIroForm(createDefaultIro(assessmentId, "E1"));
    setShowIroForm(true);
  }

  function openEditIroForm(iro: IroRecord) {
    setEditingIroId(iro.id ?? null);
    setIroForm({ ...iro });
    setShowIroForm(true);
  }

  function closeIroForm() {
    setShowIroForm(false);
    setEditingIroId(null);
    setIroForm(null);
  }

  function updateIroFormField(field: keyof IroRecord, value: unknown) {
    if (!iroForm) return;
    const updated = { ...iroForm, [field]: value };

    // Recompute scores when severity or likelihood changes
    if (field === "severity_scale" || field === "likelihood_scale" || field === "scale_score" || field === "scope_score" || field === "irremediability_score" || field === "likelihood_score" || field === "magnitude_score" || field === "financial_likelihood_score" || field === "iro_type" || field === "direction") {
      const scores = computeIroScores(updated);
      updated.impact_materiality_score = scores.impact_materiality_score;
      updated.financial_materiality_score = scores.financial_materiality_score;
      updated.double_materiality_score = scores.double_materiality_score;
    }

    setIroForm(updated);
  }

  async function saveIro() {
    if (!iroForm) return;
    setSaving(true);

    const record = {
      assessment_id: assessmentId,
      iro_type: iroForm.iro_type,
      direction: iroForm.direction,
      topic: iroForm.topic,
      subtopic: iroForm.subtopic || null,
      title: iroForm.title,
      description: iroForm.description || null,
      severity_scale: iroForm.severity_scale ?? 3,
      likelihood_scale: iroForm.likelihood_scale ?? 3,
      scale_score: iroForm.scale_score ?? iroForm.severity_scale ?? 3,
      scope_score: iroForm.scope_score ?? 3,
      irremediability_score: iroForm.irremediability_score ?? 3,
      likelihood_score: iroForm.likelihood_score ?? iroForm.likelihood_scale ?? 3,
      magnitude_score: iroForm.magnitude_score ?? iroForm.severity_scale ?? 3,
      financial_likelihood_score: iroForm.financial_likelihood_score ?? iroForm.likelihood_scale ?? 3,
      time_horizon: iroForm.time_horizon || null,
      value_chain_location: iroForm.value_chain_location || null,
      severity_rationale: iroForm.severity_rationale || null,
      financial_rationale: iroForm.financial_rationale || null,
      impact_materiality_score: iroForm.impact_materiality_score ?? 0,
      financial_materiality_score: iroForm.financial_materiality_score ?? 0,
      double_materiality_score: iroForm.double_materiality_score ?? 0,
      stakeholder_input: iroForm.stakeholder_input || null,
    };

    if (editingIroId) {
      // Update existing
      const { error } = await supabase
        .from("materiality_iro")
        .update(record)
        .eq("id", editingIroId);
      if (error) {
        alert("Failed to update IRO: " + error.message);
        setSaving(false);
        return;
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from("materiality_iro")
        .insert(record);
      if (error) {
        alert("Failed to create IRO: " + error.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    closeIroForm();
    loadData();
  }

  async function deleteIro(iroId: string) {
    if (!confirm("Delete this IRO? This action cannot be undone.")) return;
    const { error } = await supabase
      .from("materiality_iro")
      .delete()
      .eq("id", iroId);
    if (error) {
      alert("Failed to delete IRO: " + error.message);
      return;
    }
    loadData();
  }

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-64 bg-gray-200 rounded" />
        <div className="h-4 w-48 bg-gray-200 rounded" />
        <div className="mt-6 h-96 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (!assessment) return null;

  // ── Matrix data ────────────────────────────────────────────────────────────

  const matrixData = buildMatrixData(iros);
  const topicOptions = ESRS_TOPICS.map((t) => (
    <option key={t.id} value={t.id}>
      {t.standard} — {t.label}
    </option>
  ));

  const subtopicOptions = iroForm?.topic
    ? ESRS_TOPICS.find((t) => t.id === iroForm.topic)?.subtopics ?? []
    : [];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/dashboard/materiality"
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            ← Assessments
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            {assessment.reporting_periods?.year ?? "Unknown"} — Double Materiality
          </h1>
          <p className="text-gray-600 mt-1">
            {iros.length} IRO{iros.length !== 1 ? "s" : ""} ·{" "}
            {summary?.material_topics.length ?? 0} material topic
            {(summary?.material_topics.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Status controls */}
        <div className="flex items-center gap-3">
          <select
            value={assessment.status}
            onChange={(e) => handleStatusChange(e.target.value as MaterialityStatus)}
            disabled={saving}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6 -mb-px">
          {([
            { id: "iro" as TabId, label: "IRO Register", icon: "📋" },
            { id: "matrix" as TabId, label: "Materiality Matrix", icon: "📊" },
            { id: "summary" as TabId, label: "Summary", icon: "📄" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          TAB 1: IRO Register
          ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "iro" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Impacts, Risks & Opportunities
            </h2>
            <button
              onClick={openNewIroForm}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition"
            >
              + Add IRO
            </button>
          </div>

          {/* IRO table */}
          {iros.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <div className="text-4xl mb-4">📋</div>
              <p className="text-gray-500 mb-4">
                No impacts, risks, or opportunities registered yet.
              </p>
              <button
                onClick={openNewIroForm}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Add your first IRO →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Type</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Title</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Topic</th>
                    <th className="text-center px-3 py-3 font-semibold text-gray-700">Sev.</th>
                    <th className="text-center px-3 py-3 font-semibold text-gray-700">Like.</th>
                    <th className="text-center px-3 py-3 font-semibold text-gray-700">Impact</th>
                    <th className="text-center px-3 py-3 font-semibold text-gray-700">Financial</th>
                    <th className="text-center px-3 py-3 font-semibold text-gray-700">Double</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {iros.map((iro) => {
                    return (
                      <tr key={iro.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-lg">{iroTypeIcon(iro.iro_type)}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{iro.title}</p>
                          <p className="text-xs text-gray-400">{iro.direction.replace(/_/g, " ")}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{iro.topic}</td>
                        <td className="px-3 py-3 text-center text-gray-600">{iro.severity_scale ?? "—"}</td>
                        <td className="px-3 py-3 text-center text-gray-600">{iro.likelihood_scale ?? "—"}</td>
                        <td className={`px-3 py-3 text-center font-semibold ${scoreColor(iro.impact_materiality_score ?? 0)}`}>
                          {iro.impact_materiality_score?.toFixed(1) ?? "—"}
                        </td>
                        <td className={`px-3 py-3 text-center font-semibold ${scoreColor(iro.financial_materiality_score ?? 0)}`}>
                          {iro.financial_materiality_score?.toFixed(1) ?? "—"}
                        </td>
                        <td className={`px-3 py-3 text-center font-semibold ${scoreColor(iro.double_materiality_score ?? 0)}`}>
                          {iro.double_materiality_score?.toFixed(1) ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditIroForm(iro)}
                              className="text-sm text-primary-600 hover:text-primary-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => iro.id && deleteIro(iro.id)}
                              className="text-sm text-red-500 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* IRO Form Modal */}
          {showIroForm && iroForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingIroId ? "Edit IRO" : "New IRO"}
                  </h3>
                  <button
                    onClick={closeIroForm}
                    className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {/* IRO Type */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">IRO Type</label>
                    <div className="flex gap-2">
                      {IRO_TYPE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => updateIroFormField("iro_type", opt.value)}
                          className={`flex-1 rounded-lg border-2 px-4 py-2 text-sm font-medium transition ${
                            iroForm.iro_type === opt.value
                              ? "border-primary-600 bg-primary-50 text-primary-700"
                              : "border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {iroTypeIcon(opt.value)} {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Direction */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Direction</label>
                    <select
                      value={iroForm.direction}
                      onChange={(e) => updateIroFormField("direction", e.target.value as IroDirection)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                    >
                      {DIRECTION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
                    <input
                      type="text"
                      value={iroForm.title}
                      onChange={(e) => updateIroFormField("title", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                      placeholder="e.g. Greenhouse gas emissions from operations"
                    />
                  </div>

                  {/* Topic & Subtopic */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">ESRS Topic</label>
                      <select
                        value={iroForm.topic}
                        onChange={(e) => updateIroFormField("topic", e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                      >
                        {topicOptions}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Subtopic</label>
                      <select
                        value={iroForm.subtopic ?? ""}
                        onChange={(e) => updateIroFormField("subtopic", e.target.value || null)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                      >
                        <option value="">— Select subtopic —</option>
                        {subtopicOptions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={iroForm.description ?? ""}
                      onChange={(e) => updateIroFormField("description", e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                      placeholder="Describe the impact, risk, or opportunity..."
                    />
                  </div>

                  {/* Severity & Likelihood sliders */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Severity / Magnitude: <strong>{iroForm.severity_scale ?? 3}</strong>
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        value={iroForm.severity_scale ?? 3}
                        onChange={(e) => updateIroFormField("severity_scale", parseInt(e.target.value))}
                        className="w-full accent-primary-600"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        {[1, 2, 3, 4, 5].map((v) => (
                          <span key={v}>{SCALE_LABELS[v]}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Likelihood: <strong>{iroForm.likelihood_scale ?? 3}</strong>
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        value={iroForm.likelihood_scale ?? 3}
                        onChange={(e) => updateIroFormField("likelihood_scale", parseInt(e.target.value))}
                        className="w-full accent-primary-600"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        {[1, 2, 3, 4, 5].map((v) => (
                          <span key={v}>{SCALE_LABELS[v]}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ESRS 1 para 43: Scale × Scope × Irremediability */}
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-medium text-blue-800 mb-3">ESRS 1 Scoring (Scale × Scope × Irremediability)</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Scale: <strong>{iroForm.scale_score ?? 3}</strong></label>
                        <input type="range" min={1} max={5} value={iroForm.scale_score ?? 3} onChange={(e) => updateIroFormField("scale_score", parseInt(e.target.value))} className="w-full accent-blue-600" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Scope: <strong>{iroForm.scope_score ?? 3}</strong></label>
                        <input type="range" min={1} max={5} value={iroForm.scope_score ?? 3} onChange={(e) => updateIroFormField("scope_score", parseInt(e.target.value))} className="w-full accent-blue-600" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Irremediability: <strong>{iroForm.irremediability_score ?? 3}</strong></label>
                        <input type="range" min={1} max={5} value={iroForm.irremediability_score ?? 3} onChange={(e) => updateIroFormField("irremediability_score", parseInt(e.target.value))} className="w-full accent-blue-600" />
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                      <span>1: Very Low</span><span>3: Medium</span><span>5: Very High</span>
                    </div>
                  </div>

                  {/* ESRS 2 IRO-1: Time horizon & value chain */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Time Horizon</label>
                      <select value={iroForm.time_horizon ?? ""} onChange={(e) => updateIroFormField("time_horizon", e.target.value || null)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                        <option value="">Select…</option>
                        <option value="short">Short (&lt;1 year)</option>
                        <option value="medium">Medium (1–5 years)</option>
                        <option value="long">Long (&gt;5 years)</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Value Chain Location</label>
                      <select value={iroForm.value_chain_location ?? ""} onChange={(e) => updateIroFormField("value_chain_location", e.target.value || null)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                        <option value="">Select…</option>
                        <option value="upstream">Upstream</option>
                        <option value="own_operations">Own Operations</option>
                        <option value="downstream">Downstream</option>
                        <option value="multiple">Multiple</option>
                      </select>
                    </div>
                  </div>

                                    {/* Computed scores preview */}
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">Computed Scores</p>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Impact Materiality</p>
                        <p className={`text-xl font-bold ${scoreColor(iroForm.impact_materiality_score ?? 0)}`}>
                          {iroForm.impact_materiality_score?.toFixed(1) ?? "0.0"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Financial Materiality</p>
                        <p className={`text-xl font-bold ${scoreColor(iroForm.financial_materiality_score ?? 0)}`}>
                          {iroForm.financial_materiality_score?.toFixed(1) ?? "0.0"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Double Materiality</p>
                        <p className={`text-xl font-bold ${scoreColor(iroForm.double_materiality_score ?? 0)}`}>
                          {iroForm.double_materiality_score?.toFixed(1) ?? "0.0"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Stakeholder input */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Stakeholder Input
                    </label>
                    <textarea
                      value={iroForm.stakeholder_input ?? ""}
                      onChange={(e) => updateIroFormField("stakeholder_input", e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                      placeholder="Any input from stakeholders regarding this IRO..."
                    />
                  </div>
                </div>

                {/* Form actions */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={closeIroForm}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveIro}
                    disabled={saving || !iroForm.title.trim()}
                    className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70 transition"
                  >
                    {saving ? "Saving…" : editingIroId ? "Update IRO" : "Add IRO"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 2: Materiality Matrix
          ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "matrix" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Materiality Matrix</h2>
          <p className="text-sm text-gray-500">
            Each point represents an IRO. X-axis = impact materiality, Y-axis = financial materiality.
            IROs in the top-right quadrant are{" "}
            <strong className="text-gray-700">doubly material</strong>.
          </p>

          {matrixData.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <p className="text-gray-500">Add IROs to visualise the matrix.</p>
            </div>
          ) : (
            <>
              {/* Matrix Grid */}
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="relative w-full aspect-square max-w-lg mx-auto">
                  {/* SVG matrix */}
                  <svg viewBox="0 0 500 500" className="w-full h-full">
                    {/* Background quadrants */}
                    {/* Bottom-left: not material */}
                    <rect x="0" y="250" width="250" height="250" fill="#f9fafb" />
                    {/* Top-left: financial material */}
                    <rect x="0" y="0" width="250" height="250" fill="#fef3c7" opacity="0.5" />
                    {/* Bottom-right: impact material */}
                    <rect x="250" y="250" width="250" height="250" fill="#dbeafe" opacity="0.5" />
                    {/* Top-right: double material */}
                    <rect x="250" y="0" width="250" height="250" fill="#dcfce7" opacity="0.5" />

                    {/* Threshold lines */}
                    <line x1="250" y1="0" x2="250" y2="500" stroke="#d1d5db" strokeWidth="2" strokeDasharray="6,4" />
                    <line x1="0" y1="250" x2="500" y2="250" stroke="#d1d5db" strokeWidth="2" strokeDasharray="6,4" />

                    {/* Axis labels */}
                    <text x="250" y="490" textAnchor="middle" className="text-xs fill-gray-500" fontSize="12">
                      Impact Materiality →
                    </text>
                    <text x="15" y="260" textAnchor="middle" className="text-xs fill-gray-500" fontSize="12" transform="rotate(-90, 15, 260)">
                      Financial Materiality →
                    </text>

                    {/* Quadrant labels */}
                    <text x="125" y="380" textAnchor="middle" className="text-xs fill-gray-400" fontSize="11">Not Material</text>
                    <text x="125" y="120" textAnchor="middle" className="text-xs fill-amber-600" fontSize="11">Financial</text>
                    <text x="375" y="380" textAnchor="middle" className="text-xs fill-blue-600" fontSize="11">Impact</text>
                    <text x="375" y="120" textAnchor="middle" className="text-xs fill-green-600" fontSize="11">Double Material</text>

                    {/* Threshold numeric labels */}
                    <text x="255" y="265" className="text-xs fill-gray-400" fontSize="10">
                      {MATERIAL_THRESHOLD}
                    </text>

                    {/* Data points */}
                    {matrixData.map((point, idx) => {
                      // Scale: 0-5 maps to 25-475 in the SVG
                      const cx = 25 + (point.impact_score / 5) * 450;
                      const cy = 475 - (point.financial_score / 5) * 450; // SVG y is inverted
                      const colors: Record<string, string> = {
                        impact: "#ef4444",
                        risk: "#f59e0b",
                        opportunity: "#22c55e",
                      };
                      const size = 12 + point.double_score * 3;
                      return (
                        <g key={idx}>
                          <circle cx={cx} cy={cy} r={size} fill={colors[point.iro_type] ?? "#6b7280"} opacity="0.7" stroke="white" strokeWidth="2" />
                          <title>{point.label} ({point.impact_score.toFixed(1)}, {point.financial_score.toFixed(1)})</title>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Legend */}
                <div className="flex justify-center gap-6 mt-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    <span>Impact</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <span>Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500" />
                    <span>Opportunity</span>
                  </div>
                </div>
              </div>

              {/* Matrix data table */}
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">IRO</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700">Topic</th>
                      <th className="text-center px-3 py-3 font-semibold text-gray-700">Impact</th>
                      <th className="text-center px-3 py-3 font-semibold text-gray-700">Financial</th>
                      <th className="text-center px-3 py-3 font-semibold text-gray-700">Double</th>
                      <th className="text-center px-3 py-3 font-semibold text-gray-700">Quadrant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {matrixData.map((point, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{point.label}</td>
                        <td className="px-4 py-3 text-gray-600">{point.topic}</td>
                        <td className={`px-3 py-3 text-center font-semibold ${scoreColor(point.impact_score)}`}>{point.impact_score.toFixed(1)}</td>
                        <td className={`px-3 py-3 text-center font-semibold ${scoreColor(point.financial_score)}`}>{point.financial_score.toFixed(1)}</td>
                        <td className={`px-3 py-3 text-center font-semibold ${scoreColor(point.double_score)}`}>{point.double_score.toFixed(1)}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            point.quadrant === "double" ? "bg-green-50 text-green-700" :
                            point.quadrant === "impact" ? "bg-blue-50 text-blue-700" :
                            point.quadrant === "financial" ? "bg-amber-50 text-amber-700" :
                            "bg-gray-100 text-gray-500"
                          }`}>
                            {point.quadrant === "double" ? "Double" :
                             point.quadrant === "impact" ? "Impact" :
                             point.quadrant === "financial" ? "Financial" : "Not Material"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 3: Summary
          ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "summary" && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Assessment Summary</h2>

          {!summary ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
              <p className="text-gray-500">Add IROs and compute the assessment to see a summary.</p>
            </div>
          ) : (
            <>
              {/* Key metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-sm text-gray-500">Total IROs</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{summary.total_iros}</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm text-amber-700">Material Topics</p>
                  <p className="text-2xl font-bold text-amber-900 mt-1">{summary.material_topics.length}</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm text-red-700">Highly Material</p>
                  <p className="text-2xl font-bold text-red-900 mt-1">{summary.highly_material_topics.length}</p>
                </div>
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="text-sm text-green-700">Assessment Progress</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">{summary.completion_pct}%</p>
                </div>
              </div>

              {/* Materiality by topic */}
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="font-semibold text-gray-900 mb-4">ESRS Topics — Materiality Outcome</h3>
                <div className="space-y-2">
                  {ESRS_TOPICS.map((topic) => {
                    const topicIros = iros.filter((i) => i.topic === topic.id);
                    const highestScore = Math.max(
                      ...topicIros.map((i) => i.double_materiality_score ?? 0),
                      0
                    );
                    const level = classifyMateriality(highestScore);

                    let bgColor = "bg-gray-100";
                    let textColor = "text-gray-500";
                    let label = "Not assessed";
                    if (topicIros.length > 0) {
                      if (level === "highly_material") {
                        bgColor = "bg-red-50";
                        textColor = "text-red-700";
                        label = "Highly Material";
                      } else if (level === "material") {
                        bgColor = "bg-amber-50";
                        textColor = "text-amber-700";
                        label = "Material";
                      } else {
                        bgColor = "bg-gray-100";
                        textColor = "text-gray-500";
                        label = "Not Material";
                      }
                    }

                    return (
                      <div key={topic.id} className="flex items-center gap-4">
                        <div className="w-16 text-sm font-semibold text-gray-700">{topic.id}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{topic.label}</p>
                        </div>
                        <div className="w-24 text-right text-sm text-gray-500">{topicIros.length} IROs</div>
                        <div className={`w-28 text-center text-xs font-semibold px-3 py-1 rounded-full ${bgColor} ${textColor}`}>
                          {label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Next steps */}
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Next Steps</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  {summary.material_topics.length === 0 ? (
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">→</span>
                      <span>No topics deemed material yet. Add more IROs or review your severity/likelihood scores.</span>
                    </li>
                  ) : (
                    <>
                      {summary.highly_material_topics.length > 0 && (
                        <li className="flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">→</span>
                          <span>
                            <strong>{summary.highly_material_topics.length} highly material topic(s)</strong> require
                            detailed ESRS disclosures:{" "}
                            {summary.highly_material_topics.join(", ")}.
                          </span>
                        </li>
                      )}
                      {summary.material_topics.length > 0 && (
                        <li className="flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5">→</span>
                          <span>
                            <strong>{summary.material_topics.length} material topic(s)</strong> require standard
                            ESRS disclosures: {summary.material_topics.join(", ")}.
                          </span>
                        </li>
                      )}
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">→</span>
                        <span>
                          When ready, mark the assessment as{" "}
                          <strong>&quot;Completed&quot;</strong> above to finalise.
                        </span>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
