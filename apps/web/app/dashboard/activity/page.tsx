"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { ACTIVITY_META, ActivityType, ACTIVITY_TYPES } from "@/lib/calculations";

import { activityRecordSchema } from "@/lib/validations";

type ActivityRecord = {
  id: string;
  activity_type: ActivityType;
  quantity: number;
  unit: string;
  month: number | null;
  notes: string | null;
};

type ReportingPeriod = {
  id: string;
  year: number;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function ActivityPage() {
  const router = useRouter();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() - 1);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add-record form state
  const [activityType, setActivityType] = useState<ActivityType>("electricity");
  const [quantity, setQuantity] = useState("");
  const [month, setMonth] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [editMonth, setEditMonth] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const currentMeta = ACTIVITY_META[activityType];

  const loadRecords = useCallback(async (periodId: string) => {
    const { data, error: err } = await supabase
      .from("activity_records")
      .select("id, activity_type, quantity, unit, month, notes")
      .eq("reporting_period_id", periodId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (err) setError(err.message);
    else setRecords((data ?? []) as ActivityRecord[]);
  }, []);

  const refreshPeriods = useCallback(async (orgIdParam: string) => {
    const { data } = await supabase
      .from("reporting_periods")
      .select("id, year")
      .eq("organization_id", orgIdParam)
      .order("year", { ascending: false });
    return (data ?? []) as ReportingPeriod[];
  }, []);

  const getOrCreatePeriod = useCallback(
    async (orgIdParam: string, year: number): Promise<string | null> => {
      const { data: existing } = await supabase
        .from("reporting_periods")
        .select("id")
        .eq("organization_id", orgIdParam)
        .eq("year", year)
        .single();

      if (existing) return existing.id;

      const { data: created, error: err } = await supabase
        .from("reporting_periods")
        .insert({
          organization_id: orgIdParam,
          year,
          start_date: `${year}-01-01`,
          end_date: `${year}-12-31`,
        })
        .select("id")
        .single();

      if (err) { setError(err.message); return null; }
      return created?.id ?? null;
    },
    []
  );

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("is_primary", true)
        .single();

      if (!roleData) { router.replace("/onboarding"); return; }

      const id = roleData.organization_id;
      setOrgId(id);

      const perList = await refreshPeriods(id);
      const currentYear = new Date().getFullYear();
      const defaultYear = perList[0]?.year ?? currentYear;
      setSelectedYear(defaultYear);

      const periodId = await getOrCreatePeriod(id, defaultYear);
      setSelectedPeriodId(periodId);
      if (periodId) {
        await loadRecords(periodId);
        await refreshPeriods(id);
      }

      setLoading(false);
    }
    init();
  }, [router, getOrCreatePeriod, loadRecords, refreshPeriods]);

  async function handleYearChange(year: number) {
    if (!orgId) return;
    setSelectedYear(year);
    setRecords([]);
    const periodId = await getOrCreatePeriod(orgId, year);
    setSelectedPeriodId(periodId);
    if (periodId) {
      await loadRecords(periodId);
      await refreshPeriods(orgId);
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!selectedPeriodId || !orgId) return;
    setSaving(true);
    setError(null);
    const parsed = activityRecordSchema.safeParse({
      activityType,
      quantity: parseFloat(quantity),
      month: month ? parseInt(month) : null,
      notes: notes || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(", "));
      setSaving(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("activity_records").insert({
      organization_id: orgId,
      reporting_period_id: selectedPeriodId,
      activity_type: activityType,
      quantity: parseFloat(quantity),
      unit: currentMeta.unit,
      month: month ? parseInt(month) : null,
      notes: notes || null,
      created_by: user?.id ?? null,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setQuantity("");
      setMonth("");
      setNotes("");
      await loadRecords(selectedPeriodId);
    }
    setSaving(false);
  }

  const startEdit = (record: ActivityRecord) => {
    setEditingId(record.id);
    setEditQty(String(record.quantity));
    setEditMonth(record.month ? String(record.month) : "");
    setEditNotes(record.notes ?? "");
  };

  const cancelEdit = () => { setEditingId(null); };

  const saveEdit = async (id: string) => {
    if (!selectedPeriodId) return;
    const { error } = await supabase.from("activity_records").update({
      quantity: parseFloat(editQty) || 0,
      month: editMonth ? parseInt(editMonth) : null,
      notes: editNotes || null,
    }).eq("id", id);
    if (error) { setError(error.message); return; }
    setEditingId(null);
    await loadRecords(selectedPeriodId);
  };

  async function handleDelete(id: string) {
    await supabase
      .from("activity_records")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (selectedPeriodId) await loadRecords(selectedPeriodId);
  }

  // Year buttons: last 5 calendar years
  const currentYr = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYr - i);

  if (loading) {
    return <p className="text-gray-500 animate-pulse">Loading activity data…</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Data</h1>
          <p className="text-gray-600">
            Enter your energy and fuel consumption — then{" "}
            <Link href="/dashboard/emissions" className="text-primary-700 underline">
              run a calculation
            </Link>
            .
          </p>
        </div>
        <Link
          href="/dashboard/emissions"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition"
        >
          Calculate emissions →
        </Link>
      </div>

      {/* Year selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700">Reporting year:</span>
        {yearOptions.map((yr) => {
            const isHistorical = yr < currentYr;
            return (
          <button
            key={yr}
            onClick={() => handleYearChange(yr)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              selectedYear === yr
                ? "bg-primary-600 text-white"
                : isHistorical ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {yr}{isHistorical ? " 📜" : ""}
          </button>
            );
          })}
      </div>

      {/* Add record form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add activity record</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Activity type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Activity type</label>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as ActivityType)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            >
              {ACTIVITY_TYPES.map((t) => {
                const meta = ACTIVITY_META[t];
                return (
                  <option key={t} value={t}>
                    {meta.label} — {meta.scope === "scope_1" ? "Scope 1" : "Scope 2"} ({meta.unit})
                  </option>
                );
              })}
            </select>
            <p className="mt-1 text-xs text-gray-500">{currentMeta.hint}</p>
          </div>

          {/* Quantity */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Quantity ({currentMeta.unit})
            </label>
            <input
              type="number"
              min="0"
              step="any"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              placeholder={`e.g. 12 500 ${currentMeta.unit}`}
            />
          </div>

          {/* Month */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Month <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            >
              <option value="">Full year / unknown</option>
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notes <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              placeholder="e.g. Head office electricity bill"
            />
          </div>

          {error && (
            <p className="col-span-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 transition"
            >
              {saving ? "Adding…" : "+ Add record"}
            </button>
          </div>
        </form>
      </div>

      {/* Records table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Records for {selectedYear}
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({records.length} {records.length === 1 ? "record" : "records"})
            </span>
          </h2>
        </div>

        {records.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-500">
            <p className="text-base font-medium text-gray-700 mb-1">No records yet for {selectedYear}</p>
            <p className="text-sm">Use the form above to add your first activity record.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-6 py-3">Activity</th>
                  <th className="px-6 py-3">Scope</th>
                  <th className="px-6 py-3">Quantity</th>
                  <th className="px-6 py-3">Month</th>
                  <th className="px-6 py-3">Notes</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((record) => {
                  const meta = ACTIVITY_META[record.activity_type];
                  const isEditing = editingId === record.id;
                  return (
                    <tr key={record.id} className={isEditing ? "bg-yellow-50" : "hover:bg-gray-50"}>
                      <td className="px-6 py-3 font-medium text-gray-900">{meta?.label ?? record.activity_type}</td>
                      <td className={"px-6 py-3 text-xs font-semibold " + (meta?.scope === "scope_1" ? "text-orange-600" : "text-blue-600")}>{meta?.scope === "scope_1" ? "Scope 1" : "Scope 2"}</td>
                      <td className="px-6 py-3 text-gray-700 tabular-nums">
                        {isEditing ? (
                          <input type="number" min="0" step="any" value={editQty} onChange={(e) => setEditQty(e.target.value)} className="w-28 rounded border border-gray-300 px-2 py-1 text-sm" />
                        ) : (
                          <>{Number(record.quantity).toLocaleString()} {meta?.unit ?? record.unit}</>
                        )}
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {isEditing ? (
                          <select value={editMonth} onChange={(e) => setEditMonth(e.target.value)} className="rounded border border-gray-300 px-2 py-1 text-sm"><option value="">Full year</option>{MONTH_SHORT.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}</select>
                        ) : (record.month ? MONTH_SHORT[record.month - 1] : "—")}
                      </td>
                      <td className="px-6 py-3 text-gray-500 max-w-xs">
                        {isEditing ? (
                          <input type="text" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="w-full rounded border border-gray-300 px-2 py-1 text-sm" placeholder="Notes" />
                        ) : (<span className="truncate block">{record.notes ?? "—"}</span>)}
                      </td>
                      <td className="px-6 py-3 text-right whitespace-nowrap">
                        {isEditing ? (
                          <><button onClick={() => saveEdit(record.id)} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium mr-2">Save</button><button onClick={cancelEdit} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button></>
                        ) : (
                          <><button onClick={() => startEdit(record)} className="text-xs text-primary-600 hover:text-primary-700 font-medium mr-2">Edit</button><button onClick={() => handleDelete(record.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button></>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {records.length > 0 && (
        <div className="flex justify-end">
          <Link
            href="/dashboard/emissions"
            className="rounded-lg bg-primary-600 px-5 py-2.5 font-semibold text-white hover:bg-primary-700 transition"
          >
            Run calculation →
          </Link>
        </div>
      )}
    </div>
  );
}
