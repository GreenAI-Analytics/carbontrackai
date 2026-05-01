"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

const EU_COUNTRIES = [
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "BG", name: "Bulgaria" },
  { code: "HR", name: "Croatia" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czechia" },
  { code: "DK", name: "Denmark" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "GR", name: "Greece" },
  { code: "HU", name: "Hungary" },
  { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" },
  { code: "LV", name: "Latvia" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MT", name: "Malta" },
  { code: "NL", name: "Netherlands" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "RO", name: "Romania" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
];

const SECTORS = [
  "Agriculture & Forestry",
  "Construction",
  "Education",
  "Energy & Utilities",
  "Finance & Insurance",
  "Food & Beverage",
  "Healthcare",
  "Hospitality & Tourism",
  "IT & Software",
  "Logistics & Transport",
  "Manufacturing",
  "Professional Services",
  "Real Estate",
  "Retail & Wholesale",
  "Other",
];

type Step = "org" | "compliance" | "plan" | "done";

  /** Two-of-three SME classification per Recommendation 2003/361/EC */
  function classifySme(hc: number, turnover: number, balanceSheet: number): "micro" | "small" | "medium" | "non_sme" {
    if (hc < 10 && (turnover <= 2_000_000 || balanceSheet <= 2_000_000)) return "micro";
    if (hc < 50 && (turnover <= 10_000_000 || balanceSheet <= 10_000_000)) return "small";
    if (hc < 250 && (turnover <= 50_000_000 || balanceSheet <= 43_000_000)) return "medium";
    return "non_sme";
  }

  /** Recommend plan based on SME type + compliance drivers */
  function recommendPlan(smeCategory: string, isListed: boolean, isSubsidiary: boolean, hasRequests: boolean): "vsme_lite" | "vsme_full" | "csrd_full" {
    if (isSubsidiary) return "csrd_full";
    if (isListed && smeCategory === "medium") return "csrd_full";
    if (smeCategory === "medium" || hasRequests) return "vsme_full";
    return "vsme_lite";
  }

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("org");
  const [userId, setUserId] = useState<string | null>(null);

  // Organization fields
  const [orgName, setOrgName] = useState("");
  const [country, setCountry] = useState("");
  const [sector, setSector] = useState("");
  const [baseYear, setBaseYear] = useState(new Date().getFullYear() - 1);
  // SME classification fields
  const [headcount, setHeadcount] = useState("");
  const [annualTurnover, setAnnualTurnover] = useState("");
  const [annualBalanceSheet, setAnnualBalanceSheet] = useState("");
  // Compliance scope
  const [isListed, setIsListed] = useState(false);
  const [isSubsidiaryOfLargeGroup, setIsSubsidiaryOfLargeGroup] = useState(false);
  const [hasCounterpartyRequests, setHasCounterpartyRequests] = useState(false);
  // Derived
  const [plan, setPlan] = useState<"vsme_lite" | "vsme_full" | "csrd_full">("vsme_lite");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
      } else {
        setUserId(data.user.id);
      }
    });
  }, [router]);

  async function handleOrgSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStep("compliance");
  }

  async function handleFinish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!userId) {
      setError("Session expired. Please log in again.");
      setLoading(false);
      return;
    }

    // 1. Create organization
    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .insert({ name: orgName, country_code: country, sector, base_year: baseYear, headcount: parseInt(headcount) || null, annual_turnover: parseFloat(annualTurnover) || null, annual_balance_sheet: parseFloat(annualBalanceSheet) || null, sme_category: classifySme(parseInt(headcount) || 0, parseFloat(annualTurnover) || 0, parseFloat(annualBalanceSheet) || 0), reporting_basis: isSubsidiaryOfLargeGroup ? "mandatory_csrd" : (isListed ? "mandatory_csrd" : (hasCounterpartyRequests ? "counterparty_request" : "voluntary")), is_listed: isListed, is_subsidiary_of_large_group: isSubsidiaryOfLargeGroup, countries_of_operation: [country] })
      .select("id")
      .single();

    if (orgError || !orgData) {
      setError(orgError?.message ?? "Failed to create organization.");
      setLoading(false);
      return;
    }

    // 2. Assign the user as admin of the new org
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: userId,
      organization_id: orgData.id,
      role: "admin",
      is_primary: true,
    });

    if (roleError) {
      setError(roleError.message);
      setLoading(false);
      return;
    }

    // Auto-detect recommended plan
    const smeCat = classifySme(parseInt(headcount) || 0, parseFloat(annualTurnover) || 0, parseFloat(annualBalanceSheet) || 0);
    const recommended = recommendPlan(smeCat, isListed, isSubsidiaryOfLargeGroup, hasCounterpartyRequests);
    const effectivePlan = plan === "vsme_lite" && recommended !== "vsme_lite" ? recommended : plan;

    // 3. Provision feature flags based on chosen plan
    const isComprehensive = effectivePlan === "vsme_full" || effectivePlan === "csrd_full";
    const isCsrd = effectivePlan === "csrd_full";
    const { error: flagError } = await supabase.from("feature_flag_subscriptions").insert({
      organization_id: orgData.id,
      plan_type: effectivePlan,
      // Core modules (always free)
      esrs2_enabled: true,
      climate_enabled: true,
      materiality_enabled: true,
      report_builder_enabled: true,
      // Environmental extended (comprehensive only)
      pollution_enabled: isComprehensive,
      water_enabled: isComprehensive,
      biodiversity_enabled: isComprehensive,
      circular_economy_enabled: isComprehensive,
      // Social (comprehensive only)
      workforce_enabled: isComprehensive,
      valuechain_enabled: isComprehensive,
      communities_enabled: isComprehensive,
      consumers_enabled: isComprehensive,
      // Governance (comprehensive only)
      business_conduct_enabled: isComprehensive,
      // Cross-cutting
      taxonomy_enabled: isCsrd,
    });

    if (flagError) {
      setError(flagError.message);
      setLoading(false);
      return;
    }

    setStep("done");
    setLoading(false);
  }

  if (step === "done") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-2xl border border-green-100 bg-white p-10 shadow-lg text-center">
          <div className="text-5xl mb-4">🌱</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">You&apos;re all set!</h1>
          <p className="text-gray-600 mb-8">
            Your organisation <strong>{orgName}</strong> has been created. Time to start tracking emissions.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full rounded-lg bg-primary-600 px-4 py-2.5 font-semibold text-white transition hover:bg-primary-700"
          >
            Go to dashboard
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-green-100 bg-white p-8 shadow-lg">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Image
            src="/img/carbontrack-ai-logo.png"
            alt="CarbonTrackAI logo"
            width={128}
            height={32}
            className="h-8 w-auto"
            style={{ width: "auto" }}
            priority
          />
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center gap-2">
            {(["org", "compliance", "plan"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    step === s
                      ? "bg-primary-600 text-white"
                      : i < ["org", "compliance", "plan"].indexOf(step)
                      ? "bg-primary-100 text-primary-700"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {i + 1}
                </div>
                {i < 2 && <div className={`h-1 flex-1 rounded ${i < ["org", "plan"].indexOf(step) ? "bg-primary-600" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500">
            <span>Organisation</span>
            <span>Compliance</span>
            <span>Plan</span>
          </div>
        </div>

        {/* Step 1: Organisation details */}
        {step === "org" && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Tell us about your organisation</h1>
            <p className="text-gray-600 mb-6">This sets up your reporting profile and selects the right emission factors.</p>
            <form onSubmit={handleOrgSubmit} className="space-y-4">
              <div>
                <label htmlFor="orgName" className="mb-1 block text-sm font-medium text-gray-700">
                  Organisation name
                </label>
                <input
                  id="orgName"
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                  placeholder="Acme GmbH"
                />
              </div>

              <div>
                <label htmlFor="country" className="mb-1 block text-sm font-medium text-gray-700">
                  Country
                </label>
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                >
                  <option value="">Select a country…</option>
                  {EU_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="sector" className="mb-1 block text-sm font-medium text-gray-700">
                  Sector
                </label>
                <select
                  id="sector"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                >
                  <option value="">Select a sector…</option>
                  {SECTORS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="baseYear" className="mb-1 block text-sm font-medium text-gray-700">
                  Base year for reporting
                </label>
                <select
                  id="baseYear"
                  value={baseYear}
                  onChange={(e) => setBaseYear(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="headcount" className="mb-1 block text-sm font-medium text-gray-700">Employees (FTE)</label>
                  <input id="headcount" type="number" min="0" value={headcount} onChange={(e) => setHeadcount(e.target.value)} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200" placeholder="e.g. 42" />
                </div>
                <div>
                  <label htmlFor="turnover" className="mb-1 block text-sm font-medium text-gray-700">Annual turnover (EUR)</label>
                  <input id="turnover" type="number" min="0" step="0.01" value={annualTurnover} onChange={(e) => setAnnualTurnover(e.target.value)} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200" placeholder="e.g. 5000000" />
                </div>
                <div>
                  <label htmlFor="balanceSheet" className="mb-1 block text-sm font-medium text-gray-700">Balance sheet (EUR)</label>
                  <input id="balanceSheet" type="number" min="0" step="0.01" value={annualBalanceSheet} onChange={(e) => setAnnualBalanceSheet(e.target.value)} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200" placeholder="e.g. 2000000" />
                </div>
              </div>

              <p className="text-xs text-gray-500">Required for SME classification under EU Recommendation 2003/361/EC. An SME qualifies if it meets the headcount threshold AND at least one financial threshold (turnover OR balance sheet).</p>

              <button
                type="submit"
                className="w-full rounded-lg bg-primary-600 px-4 py-2.5 font-semibold text-white transition hover:bg-primary-700"
              >
                Continue →
              </button>
            </form>
          </>
        )}

        {/* Step 2: Compliance scope detection */}
        {step === "compliance" && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Compliance scope</h1>
            <p className="text-gray-600 mb-6">Help us understand your regulatory obligations so we can recommend the right reporting mode.</p>
            <form onSubmit={(e) => { e.preventDefault(); setStep("plan"); }} className="space-y-4">
              <div className="space-y-4">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition">
                  <input type="checkbox" checked={isListed} onChange={(e) => setIsListed(e.target.checked)} className="mt-1" />
                  <div>
                    <p className="font-semibold text-gray-900">Listed on an EU-regulated market?</p>
                    <p className="text-sm text-gray-600">Shares traded on a stock exchange within the EU/EEA. Under Omnibus I (2025), most listed SMEs now fall outside mandatory CSRD scope.</p>
                  </div>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition">
                  <input type="checkbox" checked={isSubsidiaryOfLargeGroup} onChange={(e) => setIsSubsidiaryOfLargeGroup(e.target.checked)} className="mt-1" />
                  <div>
                    <p className="font-semibold text-gray-900">Subsidiary of a large group?</p>
                    <p className="text-sm text-gray-600">Your parent company is a large undertaking required to report under CSRD. This may pull you into mandatory scope.</p>
                  </div>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition">
                  <input type="checkbox" checked={hasCounterpartyRequests} onChange={(e) => setHasCounterpartyRequests(e.target.checked)} className="mt-1" />
                  <div>
                    <p className="font-semibold text-gray-900">Receiving ESG data requests from banks, customers, or investors?</p>
                    <p className="text-sm text-gray-600">A VSME report serves as your value-chain shield — one standardised response for all counterparty requests.</p>
                  </div>
                </label>
              </div>

              <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
                Based on your answers, we recommend: <strong>{recommendPlan(classifySme(parseInt(headcount) || 0, parseFloat(annualTurnover) || 0, parseFloat(annualBalanceSheet) || 0), isListed, isSubsidiaryOfLargeGroup, hasCounterpartyRequests) === "vsme_lite" ? "VSME-Lite (Free)" : recommendPlan(classifySme(parseInt(headcount) || 0, parseFloat(annualTurnover) || 0, parseFloat(annualBalanceSheet) || 0), isListed, isSubsidiaryOfLargeGroup, hasCounterpartyRequests) === "vsme_full" ? "VSME-Full (99/mo)" : "CSRD-Full (99/mo)"}</strong>
              </p>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep("org")} className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 transition hover:bg-gray-50">Back</button>
                <button type="submit" className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 font-semibold text-white transition hover:bg-primary-700">Continue to plan</button>
              </div>
            </form>
          </>
        )}

        {/* Step 3: Plan selection */}
        {step === "plan" && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Choose your plan</h1>
            <p className="text-gray-600 mb-6">You can upgrade at any time from your account settings.</p>
            <form onSubmit={handleFinish} className="space-y-4">
              <div className="space-y-3">
                <label
                  className={`flex cursor-pointer rounded-xl border-2 p-4 transition gap-4 ${
                    plan === "vsme_lite" ? "border-primary-600 bg-primary-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value="vsme_lite"
                    checked={plan === "vsme_lite"}
                    onChange={() => setPlan("vsme_lite")}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">
                      VSME-Lite — Free
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Basic climate (Scope 1 & 2), basic workforce, basic governance, simplified materiality. Always free.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex cursor-pointer rounded-xl border-2 p-4 transition gap-4 ${
                    plan === "vsme_full" ? "border-primary-600 bg-primary-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value="vsme_full"
                    checked={plan === "vsme_full"}
                    onChange={() => setPlan("vsme_full")}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">
                      VSME-Full — €99 / month <span className="ml-1 text-xs font-normal text-gray-500">30-day free trial</span>
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Full Environmental (E1–E5), full Social (S1–S4), full Governance (G1), simplified EU Taxonomy. 30-day free trial.
                    </p>
                  </div>
                </label>
              </div>

              {error ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              ) : null}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("org")}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Setting up…" : "Finish setup"}
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
