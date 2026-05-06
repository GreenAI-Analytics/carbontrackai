"use client";

import type { IroRecord, IroType, IroDirection } from "@/lib/materiality";

// ─── Constants ───────────────────────────────────────────────────────────────

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
  1: "Very Low", 2: "Low", 3: "Medium", 4: "High", 5: "Very High",
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

// ─── Props ───────────────────────────────────────────────────────────────────

interface IroFormProps {
  iroForm: IroRecord;
  editingIroId: string | null;
  saving: boolean;
  topicOptions: React.ReactNode;
  subtopicOptions: { id: string; label: string }[];
  onClose: () => void;
  onUpdate: (field: keyof IroRecord, value: unknown) => void;
  onSave: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function IroForm({
  iroForm,
  editingIroId,
  saving,
  topicOptions,
  subtopicOptions,
  onClose,
  onUpdate,
  onSave,
}: IroFormProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingIroId ? "Edit IRO" : "New IRO"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
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
                  type="button"
                  onClick={() => onUpdate("iro_type", opt.value)}
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
              onChange={(e) => onUpdate("direction", e.target.value as IroDirection)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            >
              {DIRECTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              value={iroForm.title}
              onChange={(e) => onUpdate("title", e.target.value)}
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
                onChange={(e) => onUpdate("topic", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              >
                {topicOptions}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Subtopic</label>
              <select
                value={iroForm.subtopic ?? ""}
                onChange={(e) => onUpdate("subtopic", e.target.value || null)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              >
                <option value="">— Select subtopic —</option>
                {subtopicOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={iroForm.description ?? ""}
              onChange={(e) => onUpdate("description", e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              placeholder="Describe the impact, risk, or opportunity..."
            />
          </div>

          {/* Severity & Likelihood */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Severity / Magnitude: <strong>{iroForm.severity_scale ?? 3}</strong>
              </label>
              <input
                type="range" min={1} max={5}
                value={iroForm.severity_scale ?? 3}
                onChange={(e) => onUpdate("severity_scale", parseInt(e.target.value))}
                className="w-full accent-primary-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                {[1, 2, 3, 4, 5].map((v) => <span key={v}>{SCALE_LABELS[v]}</span>)}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Likelihood: <strong>{iroForm.likelihood_scale ?? 3}</strong>
              </label>
              <input
                type="range" min={1} max={5}
                value={iroForm.likelihood_scale ?? 3}
                onChange={(e) => onUpdate("likelihood_scale", parseInt(e.target.value))}
                className="w-full accent-primary-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                {[1, 2, 3, 4, 5].map((v) => <span key={v}>{SCALE_LABELS[v]}</span>)}
              </div>
            </div>
          </div>

          {/* ESRS 1 para 43: Scale × Scope × Irremediability */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-800 mb-3">ESRS 1 Scoring (Scale × Scope × Irremediability)</p>
            <div className="grid grid-cols-3 gap-4">
              {(["scale_score", "scope_score", "irremediability_score"] as const).map((field) => (
                <div key={field}>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    {field === "scale_score" ? "Scale" : field === "scope_score" ? "Scope" : "Irremediability"}:{" "}
                    <strong>{(iroForm[field] as number) ?? 3}</strong>
                  </label>
                  <input
                    type="range" min={1} max={5}
                    value={(iroForm[field] as number) ?? 3}
                    onChange={(e) => onUpdate(field, parseInt(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
              <span>1: Very Low</span><span>3: Medium</span><span>5: Very High</span>
            </div>
          </div>

          {/* Time horizon & value chain */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Time Horizon</label>
              <select
                value={iroForm.time_horizon ?? ""}
                onChange={(e) => onUpdate("time_horizon", e.target.value || null)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select…

</option>
                <option value="short">Short (&lt;1 year)</option>
                <option value="medium">Medium (1-5 years)</option>
                <option value="long">Long (&gt;5 years)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Value Chain Location</label>
              <select
                value={iroForm.value_chain_location ?? ""}
                onChange={(e) => onUpdate("value_chain_location", e.target.value || null)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                <option value="upstream">Upstream</option>
                <option value="own_operations">Own Operations</option>
                <option value="downstream">Downstream</option>
                <option value="multiple">Multiple</option>
              </select>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Computed Scores</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-xs text-gray-500 mb-1">Impact Materiality</p><p className={`text-xl font-bold ${scoreColor(iroForm.impact_materiality_score ?? 0)}`}>{iroForm.impact_materiality_score?.toFixed(1) ?? "0.0"}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">Financial Materiality</p><p className={`text-xl font-bold ${scoreColor(iroForm.financial_materiality_score ?? 0)}`}>{iroForm.financial_materiality_score?.toFixed(1) ?? "0.0"}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">Double Materiality</p><p className={`text-xl font-bold ${scoreColor(iroForm.double_materiality_score ?? 0)}`}>{iroForm.double_materiality_score?.toFixed(1) ?? "0.0"}</p></div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Stakeholder Input</label>
            <textarea value={iroForm.stakeholder_input ?? ""} onChange={(e) => onUpdate("stakeholder_input", e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200" placeholder="Any input from stakeholders regarding this IRO..." />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancel</button>
          <button type="button" onClick={onSave} disabled={saving || !iroForm.title.trim()} className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70 transition">{saving ? "Saving..." : editingIroId ? "Update IRO" : "Add IRO"}</button>
        </div>
      </div>
    </div>
  );
}
