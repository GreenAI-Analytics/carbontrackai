"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import { EU_COUNTRIES } from "@/lib/eu-countries";

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

type Step = "org" | "plan" | "done";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("org");
  const [userId, setUserId] = useState<string | null>(null);

  // Organization fields
  const [orgName, setOrgName] = useState("");
  const [country, setCountry] = useState("");
  const [sector, setSector] = useState("");
  const [baseYear, setBaseYear] = useState(new Date().getFullYear() - 1);
  const [plan, setPlan] = useState<"basic" | "comprehensive">("basic");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
      } else {
        setUserId(data.user.id);
        const signupCountry = data.user.user_metadata?.signup_country_code;
        if (typeof signupCountry === "string" && signupCountry.length === 2) {
          setCountry(signupCountry.toUpperCase());
        }
      }
    });
  }, [router]);

  async function handleOrgSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStep("plan");
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
      .insert({ name: orgName, country_code: country, sector, base_year: baseYear })
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

    // 3. Provision feature flags based on chosen plan
    const { error: flagError } = await supabase.from("feature_flag_subscriptions").insert({
      organization_id: orgData.id,
      plan_type: plan,
      scope_3_enabled: plan === "comprehensive",
      targets_enabled: plan === "comprehensive",
      climate_risk_enabled: plan === "comprehensive",
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
            {(["org", "plan"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    step === s
                      ? "bg-primary-600 text-white"
                      : i < ["org", "plan"].indexOf(step)
                      ? "bg-primary-100 text-primary-700"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {i + 1}
                </div>
                {i < 1 && <div className={`h-1 flex-1 rounded ${i < ["org", "plan"].indexOf(step) ? "bg-primary-600" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500">
            <span>Organisation</span>
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

              <button
                type="submit"
                className="w-full rounded-lg bg-primary-600 px-4 py-2.5 font-semibold text-white transition hover:bg-primary-700"
              >
                Continue →
              </button>
            </form>
          </>
        )}

        {/* Step 2: Plan selection */}
        {step === "plan" && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Choose your plan</h1>
            <p className="text-gray-600 mb-6">You can upgrade at any time from your account settings.</p>
            <form onSubmit={handleFinish} className="space-y-4">
              <div className="space-y-3">
                <label
                  className={`flex cursor-pointer rounded-xl border-2 p-4 transition gap-4 ${
                    plan === "basic" ? "border-primary-600 bg-primary-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value="basic"
                    checked={plan === "basic"}
                    onChange={() => setPlan("basic")}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">
                      Basic — Free
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Scope 1 &amp; 2 reporting, country-specific grid factors, annual report export (Excel + PDF).
                    </p>
                  </div>
                </label>

                <label
                  className={`flex cursor-pointer rounded-xl border-2 p-4 transition gap-4 ${
                    plan === "comprehensive" ? "border-primary-600 bg-primary-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value="comprehensive"
                    checked={plan === "comprehensive"}
                    onChange={() => setPlan("comprehensive")}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">
                      Comprehensive — €99 / month <span className="ml-1 text-xs font-normal text-gray-500">30-day free trial</span>
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Everything in Basic plus Scope 3 tracking, reduction targets, climate risk, supplier &amp; product PCF.
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
