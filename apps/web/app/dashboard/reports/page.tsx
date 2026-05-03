"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { generateIxbrl, mapReportToIxbrl } from "@/lib/ixbrl";

type Period = { id: string; year: number; is_locked: boolean };
type Snapshot = { id: string; title: string; status: string; created_at: string };

export default function ReportsPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [reportData, setReportData] = useState<any>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [view, setView] = useState<"build" | "snapshots">("build");

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: r } = await supabase.from("user_roles").select("organization_id").eq("user_id", user.id).single();
    if (!r) { setLoading(false); return; }
    const oid = r.organization_id; setOrgId(oid);

    const [{ data: pers }, { data: snaps }] = await Promise.all([
      supabase.from("reporting_periods").select("id,year,is_locked").eq("organization_id", oid).order("year", { ascending: false }),
      supabase.from("report_snapshots").select("id,title,status,created_at").eq("organization_id", oid).order("created_at", { ascending: false }).limit(10),
    ]);

    setPeriods(pers ?? []);
    setSnapshots(snaps ?? []);
    if (pers?.length && !selectedPeriod) setSelectedPeriod(pers[0].id);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Aggregate all data for the selected period
  async function buildReport() {
    if (!orgId || !selectedPeriod) return;
    setGenerating(true);

    const pid = selectedPeriod;
    const [
      { data: org }, { data: hc }, { data: to }, { data: hse }, { data: tr }, { data: pg },
      { data: calc }, { data: act }, { data: board }, { data: eth }, { data: comp },
      { data: breaches }, { data: wb }, { data: sc }, { data: pc },
      { data: poll }, { data: waterC }, { data: waterD }, { data: bio },
      { data: mat }, { data: waste }, { data: mat_iro }, { data: tax },
      { data: sbm }, { data: pols }, { data: dd },
    ] = await Promise.all([
      supabase.from("organizations").select("name,country_code,sector,sme_category,headcount").eq("id", orgId).single(),
      supabase.from("workforce_headcount").select("*").eq("organization_id", orgId).eq("reporting_period_id", pid).single(),
      supabase.from("workforce_turnover").select("*").eq("organization_id", orgId).eq("reporting_period_id", pid).single(),
      supabase.from("health_safety_incidents").select("*").eq("organization_id", orgId).eq("reporting_period_id", pid).single(),
      supabase.from("training_records").select("*").eq("organization_id", orgId).eq("reporting_period_id", pid).single(),
      supabase.from("gender_pay_gap").select("*").eq("organization_id", orgId).eq("reporting_period_id", pid).single(),
      supabase.from("calculation_runs").select("*").eq("organization_id", orgId).eq("reporting_period_id", pid).order("created_at", { ascending: false }).limit(1),
      supabase.from("activity_records").select("activity_type,quantity,unit").eq("organization_id", orgId).eq("reporting_period_id", pid),
      supabase.from("board_composition").select("*").eq("organization_id", orgId).eq("reporting_period_id", pid).single(),
      supabase.from("ethics_training").select("*").eq("organization_id", orgId).eq("reporting_period_id", pid),
      supabase.from("compliance_incidents").select("*").eq("organization_id", orgId).eq("reporting_period_id", pid),
      supabase.from("data_breaches").select("*").eq("organization_id", orgId).eq("reporting_period_id", pid),
      supabase.from("whistleblower_cases").select("*").eq("organization_id", orgId).eq("reporting_period_id", pid).single(),
      supabase.from("supplier_conduct_assessments").select("*").eq("organization_id", orgId).eq("reporting_period_id", pid),
      supabase.from("political_contributions").select("*").eq("organization_id", orgId).eq("reporting_period_id", pid),
      supabase.from("pollutant_inventories").select("*").eq("organization_id", orgId).eq("reporting_period_id", pid),
      supabase.from("water_consumption").select("*").eq("organization_id", orgId).eq("reporting_period_id", pid),
      supabase.from("water_discharge").select("*").eq("organization_id", orgId).eq("reporting_period_id", pid),
      supabase.from("biodiversity_sites").select("*").eq("organization_id", orgId),
      supabase.from("material_flows").select("*").eq("organization_id", orgId).eq("reporting_period_id", pid),
      supabase.from("waste_generation").select("*").eq("organization_id", orgId).eq("reporting_period_id", pid),
      supabase.from("materiality_iro").select("topic,title,double_materiality_score").eq("assessment_id", "(select id from materiality_assessments where organization_id=...)"), // fallback
      supabase.from("taxonomy_activities").select("*").eq("assessment_id", "(select id from taxonomy_assessments where organization_id=...)"),
      supabase.from("strategy_business_model").select("narrative_description").eq("organization_id", orgId).eq("reporting_period_id", pid).single(),
      supabase.from("policy_documents").select("policy_title,esrs_reference").eq("organization_id", orgId),
      supabase.from("due_diligence_process").select("scope_area").eq("organization_id", orgId).eq("reporting_period_id", pid),
    ]);

    const year = periods.find((p) => p.id === pid)?.year ?? new Date().getFullYear();

    const data = {
      meta: {
        organization: org?.data?.name ?? "Unknown",
        country: org?.data?.country_code ?? "",
        sector: org?.data?.sector ?? "",
        smeCategory: org?.data?.sme_category ?? "",
        headcount: org?.data?.headcount ?? null,
        reportingYear: year,
        generatedAt: new Date().toISOString(),
        mode: "VSME / CSRD",
      },
      environmental: {
        climate: {
          calculations: calc?.data?.length ? { scope1_tco2e: calc.data[0].scope1, scope2_tco2e: calc.data[0].scope2, total_mwh: calc.data[0].totalMWh } : null,
          activityRecords: act?.data?.length ?? 0,
        },
        pollution: { pollutants: poll?.data?.length ?? 0 },
        water: { consumptionSources: waterC?.data?.length ?? 0, dischargeRecords: waterD?.data?.length ?? 0 },
        biodiversity: { sites: bio?.data?.length ?? 0, nearProtected: bio?.data?.filter((s: any) => s.near_protected_area).length ?? 0 },
        circularEconomy: { materialTypes: mat?.data?.length ?? 0, wasteTypes: waste?.data?.length ?? 0 },
      },
      social: {
        workforce: {
          headcount: hc?.data?.total_employees ?? 0,
          turnover: to?.data ? { hires: to.data.hires, leavers: to.data.leavers, voluntaryLeavers: to.data.voluntary_leavers } : null,
          healthSafety: hse?.data ? { injuries: hse.data.recordable_injuries, lostDays: hse.data.lost_days } : null,
          training: tr?.data ? { totalHours: tr.data.total_training_hours, avgPerEmployee: hc?.data?.total_employees ? ((tr.data.total_training_hours || 0) / hc.data.total_employees).toFixed(1) : 0 } : null,
          payGap: pg?.data ? { mean: pg.data.mean_gap_percentage, median: pg.data.median_gap_percentage } : null,
        },
      },
      governance: {
        board: board?.data ? { size: board.data.board_size, independentMembers: board.data.independent_members, womenOnBoard: board.data.female_members } : null,
        ethicsTraining: eth?.data?.length ?? 0,
        complianceIncidents: comp?.data?.length ?? 0,
        dataBreaches: breaches?.data?.length ?? 0,
        whistleblower: wb?.data ? { reports: wb.data.reports_received, substantiated: wb.data.cases_substantiated } : null,
        supplierAssessments: sc?.data?.length ?? 0,
        politicalContributions: pc?.data?.length ?? 0,
      },
      crossCutting: {
        materiality: { irosAssessed: mat_iro?.data?.length ?? 0 },
        taxonomy: { activitiesAssessed: tax?.data?.length ?? 0 },
        esrs2: {
          strategy: sbm?.data?.narrative_description ? true : false,
          policies: pols?.data?.length ?? 0,
          dueDiligence: dd?.data?.length ?? 0,
        },
      },
    };

    setReportData(data);
    setGenerating(false);
  }

  useEffect(() => {
    if (selectedPeriod) buildReport();
  }, [selectedPeriod]);

  async function generateSnapshot() {
    if (!orgId || !selectedPeriod || !reportData) return;
    const year = periods.find((p) => p.id === selectedPeriod)?.year ?? new Date().getFullYear();
    await supabase.from("report_snapshots").insert({
      organization_id: orgId,
      reporting_period_id: selectedPeriod,
      title: `ESG Report ${year}`,
      report_data: reportData,
      status: "final",
    });
    setGenerated(true);
    setTimeout(() => setGenerated(false), 3000);
    // Refresh snapshots
    const { data: snaps } = await supabase.from("report_snapshots").select("id,title,status,created_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(10);
    setSnapshots(snaps ?? []);
  }

  function exportIxbrl() {
    if (!reportData) return;
    const dps = mapReportToIxbrl(reportData);
    const ixbrl = generateIxbrl(dps, {
      entityName: reportData.meta.organization,
      entityIdentifier: reportData.meta.country + "-" + (reportData.meta.sector || "N/A"),
      reportingYear: reportData.meta.reportingYear,
      generatedAt: new Date().toISOString(),
    });
    const blob = new Blob([ixbrl], { type: "application/xhtml+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "esg-report-" + reportData.meta.reportingYear + ".xhtml";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `esg-report-${reportData.meta.reportingYear}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="space-y-6 animate-pulse"><div className="h-6 w-48 rounded bg-gray-200" /><div className="h-64 rounded-xl bg-gray-100" /></div>;

  const periodYear = periods.find((p) => p.id === selectedPeriod)?.year;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-primary-600 hover:text-primary-700">← Back to Overview</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Report Builder</h1>
        <p className="text-gray-600">Generate CSRD/VSME-compliant ESG reports. Aggregate data across all pillars, create immutable snapshots, and export for filing.</p>
      </div>

      {/* View switcher */}
      <div className="flex gap-2">
        <button onClick={() => setView("build")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${view === "build" ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>📄 Build Report</button>
        <button onClick={() => setView("snapshots")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${view === "snapshots" ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>📦 Snapshots ({snapshots.length})</button>
      </div>

      {view === "build" && (
        <>
          {/* Period selector + actions */}
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Reporting period</label>
              <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {periods.map((p) => (<option key={p.id} value={p.id}>{p.year}{p.is_locked ? " 🔒" : ""}</option>))}
              </select>
            </div>
            <div className="flex gap-2 items-end">
              <button onClick={exportJSON} disabled={!reportData || generating} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">📥 JSON</button>
              <button onClick={exportIxbrl} disabled={!reportData || generating} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">📄 iXBRL</button>
              <button onClick={generateSnapshot} disabled={!reportData || generating} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">📸 Generate Snapshot</button>
              {generated && <span className="text-sm text-emerald-600 font-medium">✓ Snapshot saved</span>}
            </div>
          </div>

          {/* Report preview */}
          {generating && <div className="text-center py-12 text-gray-400"><div className="animate-spin inline-block w-8 h-8 border-2 border-gray-300 border-t-primary-600 rounded-full mb-3" /><p>Aggregating data…</p></div>}

          {reportData && !generating && (
            <div className="space-y-4">
              {/* Summary KPI banner */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <KpiBox label="Employees" value={String(reportData.social.workforce.headcount || "—")} colour="blue" />
                <KpiBox label="Scope 1+2" value={reportData.environmental.climate.calculations ? `${(reportData.environmental.climate.calculations.scope1_tco2e + reportData.environmental.climate.calculations.scope2_tco2e).toFixed(1)} t` : "—"} colour="emerald" />
                <KpiBox label="Pay Gap" value={reportData.social.workforce.payGap ? `${reportData.social.workforce.payGap.mean}%` : "—"} colour="purple" />
                <KpiBox label="Compliance" value={`${reportData.governance.complianceIncidents} incidents`} colour="amber" />
                <KpiBox label="Snapshot" value={periodYear ? String(periodYear) : "—"} colour="blue" />
              </div>

              {/* Pillar sections */}
              <Section title="🌍 Environmental" data={[
                { label: "Climate — Scope 1", value: reportData.environmental.climate.calculations ? `${reportData.environmental.climate.calculations.scope1_tco2e?.toFixed(2) ?? "—"} tCO₂e` : "No data" },
                { label: "Climate — Scope 2", value: reportData.environmental.climate.calculations ? `${reportData.environmental.climate.calculations.scope2_tco2e?.toFixed(2) ?? "—"} tCO₂e` : "No data" },
                { label: "Activity records", value: String(reportData.environmental.climate.activityRecords) },
                { label: "Pollutants tracked", value: String(reportData.environmental.pollution.pollutants) },
                { label: "Water sources", value: String(reportData.environmental.water.consumptionSources) },
                { label: "Biodiversity sites", value: String(reportData.environmental.biodiversity.sites) },
                { label: "Material types", value: String(reportData.environmental.circularEconomy.materialTypes) },
                { label: "Waste types", value: String(reportData.environmental.circularEconomy.wasteTypes) },
              ]} />

              <Section title="👥 Social" data={[
                { label: "Total employees", value: String(reportData.social.workforce.headcount || "—") },
                { label: "Hires / Leavers", value: reportData.social.workforce.turnover ? `${reportData.social.workforce.turnover.hires} / ${reportData.social.workforce.turnover.leavers}` : "—" },
                { label: "Injuries", value: reportData.social.workforce.healthSafety ? String(reportData.social.workforce.healthSafety.injuries) : "—" },
                { label: "Training (avg hrs)", value: reportData.social.workforce.training ? `${reportData.social.workforce.training.avgPerEmployee}h` : "—" },
                { label: "Pay gap (mean)", value: reportData.social.workforce.payGap ? `${reportData.social.workforce.payGap.mean}%` : "—" },
              ]} />

              <Section title="🏛️ Governance" data={[
                { label: "Board size", value: reportData.governance.board ? String(reportData.governance.board.size) : "—" },
                { label: "Independent members", value: reportData.governance.board ? String(reportData.governance.board.independentMembers) : "—" },
                { label: "Ethics trainings", value: String(reportData.governance.ethicsTraining) },
                { label: "Compliance incidents", value: String(reportData.governance.complianceIncidents) },
                { label: "Data breaches", value: String(reportData.governance.dataBreaches) },
                { label: "Whistleblower reports", value: reportData.governance.whistleblower ? String(reportData.governance.whistleblower.reports) : "—" },
              ]} />

              <Section title="⚖️ Cross-Cutting" data={[
                { label: "IROs assessed", value: String(reportData.crossCutting.materiality.irosAssessed) },
                { label: "Taxonomy activities", value: String(reportData.crossCutting.taxonomy.activitiesAssessed) },
                { label: "Strategy disclosed", value: reportData.crossCutting.esrs2.strategy ? "✓" : "✗" },
                { label: "Policies registered", value: String(reportData.crossCutting.esrs2.policies) },
              ]} />
            </div>
          )}
        </>
      )}

      {/* Snapshots list */}
      {view === "snapshots" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Generated Snapshots</h2>
          {snapshots.length === 0 && <p className="text-gray-400 py-8 text-center">No snapshots generated yet. Build a report and click &ldquo;Generate Snapshot&rdquo;.</p>}
          {snapshots.map((s) => (
            <div key={s.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-4">
              <div>
                <p className="font-medium text-gray-900">{s.title}</p>
                <p className="text-sm text-gray-500">{new Date(s.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {s.status}</p>
              </div>
              <button onClick={async () => {
                const { data } = await supabase.from("report_snapshots").select("report_data").eq("id", s.id).single();
                if (data?.report_data) {
                  const blob = new Blob([JSON.stringify(data.report_data, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = `${s.title.toLowerCase().replace(/\s+/g, "-")}.json`; a.click();
                  URL.revokeObjectURL(url);
                }
              }} className="text-sm text-primary-600 hover:text-primary-700 font-medium">📥 Download</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KpiBox({ label, value, colour }: { label: string; value: string; colour: string }) {
  const c: Record<string, string> = { blue: "bg-blue-50 border-blue-200 text-blue-700", emerald: "bg-emerald-50 border-emerald-200 text-emerald-700", amber: "bg-amber-50 border-amber-200 text-amber-700", purple: "bg-purple-50 border-purple-200 text-purple-700" };
  return <div className={`rounded-xl border px-4 py-3 ${c[colour] || c.blue}`}><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p><p className="text-xl font-bold mt-1">{value}</p></div>;
}

function Section({ title, data }: { title: string; data: Array<{ label: string; value: string }> }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-base font-semibold text-gray-900 mb-3">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {data.map((d) => (
          <div key={d.label} className="rounded-lg bg-gray-50 px-3 py-2">
            <p className="text-xs text-gray-500">{d.label}</p>
            <p className="text-sm font-semibold text-gray-900">{d.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
