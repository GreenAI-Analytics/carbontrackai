"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import {
  computeWorkforceSnapshot,
  formatPct,
  type WorkforceSnapshot,
  type WorkforceNonEmployees,
  type WorkforceAdequateWages,
} from "@/lib/social-metrics";

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = "profile" | "hse" | "training" | "pay";

interface OrgContext {
  orgId: string;
  periodId: string | null;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

// ─── Component ────────────────────────────────────────────────────────────────

const TABS: [Tab, string][] = [
  ["profile", "👥 Workforce Profile"],
  ["hse", "🏥 Health & Safety"],
  ["training", "📚 Training"],
  ["pay", "💰 Pay & Conditions"],
];

export default function OwnWorkforcePage() {
  // Org context
  const [ctx, setCtx] = useState<OrgContext | null>(null);
  // Snapshot
  const [snapshot, setSnapshot] = useState<WorkforceSnapshot | null>(null);
  // Tab
  const [tab, setTab] = useState<Tab>("profile");
  // Form state — Profile
  const [totalEmployees, setTotalEmployees] = useState("");
  const [femaleCount, setFemaleCount] = useState("");
  const [maleCount, setMaleCount] = useState("");
  const [permContracts, setPermContracts] = useState("");
  const [tempContracts, setTempContracts] = useState("");
  const [fullTime, setFullTime] = useState("");
  const [partTime, setPartTime] = useState("");
  const [under30, setUnder30] = useState("");
  const [age30to50, setAge30to50] = useState("");
  const [over50, setOver50] = useState("");
  const [hires, setHires] = useState("");
  const [leavers, setLeavers] = useState("");
  const [volLeavers, setVolLeavers] = useState("");
  // Form state — HSE
  const [injuries, setInjuries] = useState("");
  const [lostDays, setLostDays] = useState("");
  const [fatalities, setFatalities] = useState("");
  const [nearMisses, setNearMisses] = useState("");
  // Form state — Training
  const [trainHours, setTrainHours] = useState("");
  const [trainFemale, setTrainFemale] = useState("");
  const [trainMale, setTrainMale] = useState("");
  // Form state — Pay
  const [meanGap, setMeanGap] = useState("");
  const [medianGap, setMedianGap] = useState("");
  const [q1Female, setQ1Female] = useState("");
  const [q2Female, setQ2Female] = useState("");
  const [q3Female, setQ3Female] = useState("");
  const [q4Female, setQ4Female] = useState("");
  const [baseGap, setBaseGap] = useState("");
  const [variableGap, setVariableGap] = useState("");
  const [bonusGap, setBonusGap] = useState("");
  const [womenMgmt, setWomenMgmt] = useState("");
  const [menMgmt, setMenMgmt] = useState("");
  const [empDisability, setEmpDisability] = useState("");
  const [parentalPct, setParentalPct] = useState("");
  const [flexPct, setFlexPct] = useState("");
  const [avgWkHrs, setAvgWkHrs] = useState("");

  // UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Init: load org context + existing data ──────────────────────────────────
  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: role } = await supabase
      .from("user_roles")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!role) { setLoading(false); return; }
    const orgId = role.organization_id;

    // Get or create reporting period for current year
    const year = new Date().getFullYear();
    let { data: period } = await supabase
      .from("reporting_periods")
      .select("id")
      .eq("organization_id", orgId)
      .eq("year", year)
      .single();

    if (!period) {
      const { data: newPeriod } = await supabase
        .from("reporting_periods")
        .insert({
          organization_id: orgId,
          year,
          start_date: `${year}-01-01`,
          end_date: `${year}-12-31`,
        })
        .select("id")
        .single();
      period = newPeriod;
    }

    setCtx({ orgId, periodId: period?.id ?? null });

    // Fetch all S1 tables
    const periodId = period?.id;
    if (!periodId) { setLoading(false); return; }

    const [
      { data: hc }, { data: to }, { data: div }, { data: hse },
      { data: tr }, { data: pg }, { data: ne }, { data: wl }, { data: wa },
    ] = await Promise.all([
      supabase.from("workforce_headcount").select("*").eq("organization_id", orgId).eq("reporting_period_id", periodId).single(),
      supabase.from("workforce_turnover").select("*").eq("organization_id", orgId).eq("reporting_period_id", periodId).single(),
      supabase.from("workforce_diversity").select("*").eq("organization_id", orgId).eq("reporting_period_id", periodId).single(),
      supabase.from("health_safety_incidents").select("*").eq("organization_id", orgId).eq("reporting_period_id", periodId).single(),
      supabase.from("training_records").select("*").eq("organization_id", orgId).eq("reporting_period_id", periodId).single(),
      supabase.from("gender_pay_gap").select("*").eq("organization_id", orgId).eq("reporting_period_id", periodId).single(),
      supabase.from("workforce_non_employees").select("*").eq("organization_id", orgId).eq("reporting_period_id", periodId),
      supabase.from("worklife_balance").select("*").eq("organization_id", orgId).eq("reporting_period_id", periodId).single(),
      supabase.from("workforce_adequate_wages").select("*").eq("organization_id", orgId).eq("reporting_period_id", periodId),
    ]);

    // Populate form fields
    if (hc) {
      setTotalEmployees(String(hc.total_employees ?? ""));
      setFemaleCount(String(hc.female_count ?? ""));
      setMaleCount(String(hc.male_count ?? ""));
      setPermContracts(String(hc.permanent_contracts ?? ""));
      setTempContracts(String(hc.temporary_contracts ?? ""));
      setFullTime(String(hc.full_time_count ?? ""));
      setPartTime(String(hc.part_time_count ?? ""));
      setUnder30(String(hc.under_30_count ?? ""));
      setAge30to50(String(hc.age_30_50_count ?? ""));
      setOver50(String(hc.over_50_count ?? ""));
    }
    if (to) {
      setHires(String(to.hires ?? ""));
      setLeavers(String(to.leavers ?? ""));
      setVolLeavers(String(to.voluntary_leavers ?? ""));
    }
    if (hse) {
      setInjuries(String(hse.recordable_injuries ?? ""));
      setLostDays(String(hse.lost_days ?? ""));
      setFatalities(String(hse.fatalities ?? ""));
      setNearMisses(String(hse.near_misses ?? ""));
    }
    if (tr) {
      setTrainHours(String(tr.total_training_hours ?? ""));
      setTrainFemale(String(tr.training_hours_female ?? ""));
      setTrainMale(String(tr.training_hours_male ?? ""));
    }
    if (pg) {
      setMeanGap(String(pg.mean_gap_percentage ?? ""));
      setMedianGap(String(pg.median_gap_percentage ?? ""));
      setQ1Female(String(pg.quartile_q1_female_pct ?? ""));
      setQ2Female(String(pg.quartile_q2_female_pct ?? ""));
      setQ3Female(String(pg.quartile_q3_female_pct ?? ""));
      setQ4Female(String(pg.quartile_q4_female_pct ?? ""));
      setBaseGap(String(pg.base_pay_gap_pct ?? ""));
      setVariableGap(String(pg.variable_pay_gap_pct ?? ""));
      setBonusGap(String(pg.bonus_pay_gap_pct ?? ""));
    }
    if (div) {
      setWomenMgmt(String(div.women_in_senior_management ?? ""));
      setMenMgmt(String(div.men_in_senior_management ?? ""));
      setEmpDisability(String(div.employees_with_disabilities ?? ""));
    }
    if (wl) {
      setParentalPct(String(wl.parental_leave_uptake_percentage ?? ""));
      setFlexPct(String(wl.flexible_work_percentage ?? ""));
      setAvgWkHrs(String(wl.avg_weekly_hours ?? ""));
    }

    // Compute snapshot
    const snap = computeWorkforceSnapshot(
      hc, to, div, hse, tr, pg,
      (ne ?? []) as WorkforceNonEmployees[],
      wl,
      (wa ?? []) as WorkforceAdequateWages[],
    );
    setSnapshot(snap);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!ctx?.orgId || !ctx?.periodId) return;
    setSaving(true);
    setSaved(false);

    const orgId = ctx.orgId;
    const periodId = ctx.periodId;
    const toInt = (s: string) => s === "" ? null : parseInt(s, 10);
    const toFloat = (s: string) => s === "" ? null : parseFloat(s);

    // Upsert each table
    const ops = [
      supabase.from("workforce_headcount").upsert({
        organization_id: orgId, reporting_period_id: periodId,
        total_employees: toInt(totalEmployees) ?? 0,
        female_count: toInt(femaleCount), male_count: toInt(maleCount),
        permanent_contracts: toInt(permContracts), temporary_contracts: toInt(tempContracts),
        full_time_count: toInt(fullTime), part_time_count: toInt(partTime),
        under_30_count: toInt(under30), age_30_50_count: toInt(age30to50),
        over_50_count: toInt(over50),
      }, { onConflict: "organization_id,reporting_period_id" }),

      supabase.from("workforce_turnover").upsert({
        organization_id: orgId, reporting_period_id: periodId,
        hires: toInt(hires), leavers: toInt(leavers),
        voluntary_leavers: toInt(volLeavers),
      }, { onConflict: "organization_id,reporting_period_id" }),

      supabase.from("health_safety_incidents").upsert({
        organization_id: orgId, reporting_period_id: periodId,
        recordable_injuries: toInt(injuries), lost_days: toInt(lostDays),
        fatalities: toInt(fatalities), near_misses: toInt(nearMisses),
      }, { onConflict: "organization_id,reporting_period_id" }),

      supabase.from("training_records").upsert({
        organization_id: orgId, reporting_period_id: periodId,
        total_training_hours: toFloat(trainHours),
        training_hours_female: toFloat(trainFemale),
        training_hours_male: toFloat(trainMale),
      }, { onConflict: "organization_id,reporting_period_id" }),

      supabase.from("gender_pay_gap").upsert({
        organization_id: orgId, reporting_period_id: periodId,
        mean_gap_percentage: toFloat(meanGap),
        median_gap_percentage: toFloat(medianGap),
        quartile_q1_female_pct: toFloat(q1Female),
        quartile_q2_female_pct: toFloat(q2Female),
        quartile_q3_female_pct: toFloat(q3Female),
        quartile_q4_female_pct: toFloat(q4Female),
        base_pay_gap_pct: toFloat(baseGap),
        variable_pay_gap_pct: toFloat(variableGap),
        bonus_pay_gap_pct: toFloat(bonusGap),
      }, { onConflict: "organization_id,reporting_period_id" }),

      supabase.from("workforce_diversity").upsert({
        organization_id: orgId, reporting_period_id: periodId,
        women_in_senior_management: toInt(womenMgmt),
        men_in_senior_management: toInt(menMgmt),
        employees_with_disabilities: toInt(empDisability),
      }, { onConflict: "organization_id,reporting_period_id" }),

      supabase.from("worklife_balance").upsert({
        organization_id: orgId, reporting_period_id: periodId,
        parental_leave_uptake_percentage: toFloat(parentalPct),
        flexible_work_percentage: toFloat(flexPct),
        avg_weekly_hours: toFloat(avgWkHrs),
      }, { onConflict: "organization_id,reporting_period_id" }),
    ];

    await Promise.all(ops);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    // Reload to refresh snapshot
    loadData();
  }


  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-gray-200" />
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-gray-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard" className="text-sm text-primary-600 hover:text-primary-700">
          ← Back to Overview
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Own Workforce</h1>
        <p className="text-gray-600">ESRS S1-1 to S1-17 · Track headcount, turnover, health &amp; safety, training, gender pay gap, and work-life balance.</p>
      </div>

      {/* KPI Dashboard */}
      {snapshot && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KpiCard
            kpiType="total"
            label="Total Employees"
            value={String(snapshot.totalEmployees)}
            sub={`${snapshot.genderRatio.female}F / ${snapshot.genderRatio.male}M`}
          />
          <KpiCard
            kpiType="turnover"
            label="Turnover Rate"
            value={formatPct(snapshot.turnover.turnoverRate)}
            sub={`${snapshot.turnover.hires} hired · ${snapshot.turnover.leavers} left`}
          />
          <KpiCard
            kpiType="injury"
            label="Injury Rate"
            value={`${snapshot.healthSafety.injuryRate}`}
            sub={`per 100 FTE · ${snapshot.healthSafety.lostDays} lost days`}
          />
          <KpiCard
            kpiType="training"
            label="Avg Training"
            value={`${snapshot.training.avgHoursPerEmployee}h`}
            sub={`${snapshot.training.totalHours}h total`}
          />
          <KpiCard
            kpiType="paygap"
            label="Pay Gap (mean)"
            value={formatPct(snapshot.payGap.meanGapPct)}
            sub={snapshot.payGap.meanGapPct > 0 ? "Women paid less" : snapshot.payGap.meanGapPct < 0 ? "Men paid less" : "No gap"}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {TABS.map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition ${
              tab === t
                ? "bg-white text-primary-700 border border-b-white -mb-px border-gray-200"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="flex-1 border-b border-gray-200" />
      </div>

      {/* Tab content */}
      <form onSubmit={handleSave} className="rounded-b-xl rounded-tr-xl border border-t-0 border-gray-200 bg-white p-6 space-y-8">
        {/* ── Profile ── */}
        {tab === "profile" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Headcount</h2>
              <p className="text-sm text-gray-500">Total workforce size, gender breakdown, and contract types per ESRS S1-6.</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Total employees" value={totalEmployees} onChange={setTotalEmployees} required />
              <Field label="Female" value={femaleCount} onChange={setFemaleCount} />
              <Field label="Male" value={maleCount} onChange={setMaleCount} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Permanent contracts" value={permContracts} onChange={setPermContracts} />
              <Field label="Temporary contracts" value={tempContracts} onChange={setTempContracts} />
              <Field label="Full-time" value={fullTime} onChange={setFullTime} />
              <Field label="Part-time" value={partTime} onChange={setPartTime} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Under 30" value={under30} onChange={setUnder30} />
              <Field label="Age 30–50" value={age30to50} onChange={setAge30to50} />
              <Field label="Over 50" value={over50} onChange={setOver50} />
            </div>

            <hr className="border-gray-200" />

            <div>
              <h2 className="text-lg font-semibold text-gray-900">Turnover</h2>
              <p className="text-sm text-gray-500">Hires, leavers, and turnover breakdown per ESRS S1-6.</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Hires" value={hires} onChange={setHires} />
              <Field label="Leavers (total)" value={leavers} onChange={setLeavers} />
              <Field label="Voluntary leavers" value={volLeavers} onChange={setVolLeavers} />
            </div>
          </div>
        )}

        {/* ── HSE ── */}
        {tab === "hse" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Health &amp; Safety Incidents</h2>
              <p className="text-sm text-gray-500">Recordable injuries, lost days, and near misses per ESRS S1-14.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Recordable injuries" value={injuries} onChange={setInjuries} />
              <Field label="Lost days" value={lostDays} onChange={setLostDays} />
              <Field label="Fatalities" value={fatalities} onChange={setFatalities} />
              <Field label="Near misses" value={nearMisses} onChange={setNearMisses} />
            </div>
            {snapshot && (
              <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                <p><strong>Computed:</strong> Injury rate = {snapshot.healthSafety.injuryRate} per 100 FTE · Lost day rate = {snapshot.healthSafety.lostDayRate} days/employee</p>
              </div>
            )}
          </div>
        )}

        {/* ── Training ── */}
        {tab === "training" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Training &amp; Development</h2>
              <p className="text-sm text-gray-500">Total training hours and gender breakdown per ESRS S1-13.</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Total training hours" value={trainHours} onChange={setTrainHours} type="decimal" />
              <Field label="Female training hours" value={trainFemale} onChange={setTrainFemale} type="decimal" />
              <Field label="Male training hours" value={trainMale} onChange={setTrainMale} type="decimal" />
            </div>
            {snapshot && (
              <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                <p><strong>Computed:</strong> Avg = {snapshot.training.avgHoursPerEmployee}h / employee</p>
              </div>
            )}
          </div>
        )}

        {/* ── Pay & Conditions ── */}
        {tab === "pay" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Gender Pay Gap</h2>
              <p className="text-sm text-gray-500">Mean and median gender pay gap per ESRS S1-16. Positive = women paid less.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Mean gap (%)" value={meanGap} onChange={setMeanGap} type="decimal" placeholder="e.g. 12.5" />
              <Field label="Median gap (%)" value={medianGap} onChange={setMedianGap} type="decimal" placeholder="e.g. 9.3" />
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-800 mb-3">Quartile Distribution by Gender (Art. 9(1)(g))</p>
              <div className="grid grid-cols-4 gap-3">
                <Field label="Q1 (lowest) % women" value={q1Female} onChange={setQ1Female} type="decimal" placeholder="e.g. 60" />
                <Field label="Q2 % women" value={q2Female} onChange={setQ2Female} type="decimal" placeholder="e.g. 45" />
                <Field label="Q3 % women" value={q3Female} onChange={setQ3Female} type="decimal" placeholder="e.g. 30" />
                <Field label="Q4 (highest) % women" value={q4Female} onChange={setQ4Female} type="decimal" placeholder="e.g. 20" />
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-gray-900">Pay Components Gap</h3>
              <p className="text-sm text-gray-500">Gap broken down by pay component — base, variable, and bonus.</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Base pay gap (%)" value={baseGap} onChange={setBaseGap} type="decimal" placeholder="e.g. 8.5" />
              <Field label="Variable pay gap (%)" value={variableGap} onChange={setVariableGap} type="decimal" placeholder="e.g. 15.2" />
              <Field label="Bonus gap (%)" value={bonusGap} onChange={setBonusGap} type="decimal" placeholder="e.g. 22.0" />
            </div>

            <hr className="border-gray-200" />

            <div>
              <h2 className="text-lg font-semibold text-gray-900">Management Diversity</h2>
              <p className="text-sm text-gray-500">Senior management gender balance per ESRS S1-9.</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Women in senior mgmt" value={womenMgmt} onChange={setWomenMgmt} />
              <Field label="Men in senior mgmt" value={menMgmt} onChange={setMenMgmt} />
              <Field label="Employees with disabilities" value={empDisability} onChange={setEmpDisability} />
            </div>

            <hr className="border-gray-200" />

            <div>
              <h2 className="text-lg font-semibold text-gray-900">Work-Life Balance</h2>
              <p className="text-sm text-gray-500">Parental leave, flexible work, and average weekly hours per ESRS S1-15.</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Parental leave uptake (%)" value={parentalPct} onChange={setParentalPct} type="decimal" placeholder="e.g. 85" />
              <Field label="Flexible work (%)" value={flexPct} onChange={setFlexPct} type="decimal" placeholder="e.g. 60" />
              <Field label="Avg weekly hours" value={avgWkHrs} onChange={setAvgWkHrs} type="decimal" placeholder="e.g. 38.5" />
            </div>
          </div>
        )}

        {/* Save button */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-600 px-6 py-2.5 font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save all changes"}
          </button>
          {saved && (
            <span className="text-sm text-emerald-600 font-medium">✓ Saved</span>
          )}
        </div>
      </form>
    </div>
  );
}

function kpiBg(label: string): string {
  if (label === "total") return "bg-blue-50 border-blue-200";
  if (label === "turnover") return "bg-amber-50 border-amber-200";
  if (label === "injury") return "bg-red-50 border-red-200";
  if (label === "training") return "bg-emerald-50 border-emerald-200";
  if (label === "paygap") return "bg-purple-50 border-purple-200";
  return "bg-gray-50 border-gray-200";
}

function kpiText(label: string): string {
  if (label === "total") return "text-blue-700";
  if (label === "turnover") return "text-amber-700";
  if (label === "injury") return "text-red-700";
  if (label === "training") return "text-emerald-700";
  if (label === "paygap") return "text-purple-700";
  return "text-gray-700";
}

function KpiCard({ label, value, sub, kpiType }: {
  label: string; value: string; sub?: string; kpiType: string;
}) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${kpiBg(kpiType)}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${kpiText(kpiType)}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}


// ─── Inline field component ───────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  required = false,
  type = "int",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: "int" | "decimal";
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <input
        type="number"
        min="0"
        step={type === "decimal" ? "0.1" : "1"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
      />
    </div>
  );
}
