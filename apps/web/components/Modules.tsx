export const esrsModules = [
  {
    tier: "Free",
    tierLabel: "Always Included",
    description: "Essential CSRD/ESRS compliance — no cost, no credit card required.",
    modules: [
      {
        icon: "🌡️",
        ref: "E1-1 to E1-9",
        title: "Climate — Energy & Emissions",
        description:
          "Scope 1 & 2 calculation engine with EU27 emission factors (ADEME, MITECO, Climatiq, EEA). Activity data entry, intensity ratios, and basic Scope 3 tracking.",
        features: [
          "Energy & fuel consumption tracking",
          "Country-specific grid factors (25+ EU countries)",
          "Scope 1 & 2 automated calculation",
          "Scope 3 simplified (business travel, freight)",
          "Annual / quarterly reporting",
        ],
      },
      {
        icon: "⚖️",
        ref: "ESRS 1, IRO-1",
        title: "Double Materiality",
        description:
          "Impact × Financial materiality matrix. Stakeholder engagement tracker, IRO register, and automated disclosure mapping — the gateway to all other ESRS modules.",
        features: [
          "Impact & financial materiality scoring",
          "Stakeholder engagement log",
          "IRO (Impacts, Risks, Opportunities) register",
          "Automated disclosure mapping",
          "Simplified VSME-Lite variant available",
        ],
      },
      {
        icon: "📄",
        ref: "ESRS 1–G1",
        title: "Report Builder",
        description:
          "Generate CSRD-ready reports with full ESRS datapoint mapping. Export to Excel and PDF with immutable snapshots for assurance readiness.",
        features: [
          "CSRD-aligned report generation",
          "ESRS datapoint traceability",
          "Excel & PDF export",
          "Immutable report snapshots",
          "Scope adapts to platform mode (VSME-Lite / Full / CSRD-Full)",
        ],
      },
    ],
  },
  {
    tier: "Comprehensive",
    tierLabel: "€99/month — 30-day free trial",
    description:
      "All Free Tier features plus full Environmental, Social, Governance, and EU Taxonomy modules.",
    modules: [
      {
        icon: "🌍",
        ref: "E2–E5",
        title: "Environmental Extended",
        description:
          "Pollution, water & marine resources, biodiversity & ecosystems, and circular economy. Full ESRS E2–E5 coverage for medium and listed SMEs.",
        features: [
          "Air/water/soil pollutant inventory (E2)",
          "Water consumption & stress assessment (E3)",
          "Biodiversity action plans & offsets (E4)",
          "Material flows & circularity rate (E5)",
          "Waste tracking by type & disposal method",
        ],
      },
      {
        icon: "👥",
        ref: "S1–S4",
        title: "Social — Own Workforce & Value Chain",
        description:
          "Workforce demographics, health & safety, diversity, human rights due diligence, and community impact. Full ESRS S1–S4 coverage.",
        features: [
          "Headcount, diversity & turnover (S1-1 to S1-17)",
          "Health & safety incidents tracking",
          "Gender pay gap & work-life balance",
          "Supply chain human rights due diligence (S2)",
          "Community engagement & impact (S3–S4)",
        ],
      },
      {
        icon: "🏛️",
        ref: "G1",
        title: "Governance — Business Conduct",
        description:
          "Board composition, anti-corruption, whistleblower management, compliance incidents, and data privacy. Full ESRS G1 coverage.",
        features: [
          "Board composition & oversight",
          "Anti-corruption training tracking",
          "Whistleblower case management",
          "Compliance incident register",
          "Data breach & privacy reporting",
        ],
      },
      {
        icon: "⚖️",
        ref: "EU Tax. Reg.",
        title: "EU Taxonomy Alignment",
        description:
          "NACE activity screening, substantial contribution criteria, DNSH check, and minimum safeguards. Mandatory for CSRD-Full mode.",
        features: [
          "NACE activity eligibility screening",
          "Substantial contribution assessment",
          "DNSH (Do No Significant Harm) check",
          "Minimum safeguards verification",
          "Turnover / CapEx / OpEx KPI reporting",
        ],
      },
    ],
  },
];

export function Modules() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-2">
            ESRS Topical Standards
          </p>
          <h2 className="section-header">13 ESG Modules Across Three Pillars</h2>
          <p className="section-description">
            From climate to governance — every ESRS datapoint your SME needs for CSRD compliance
          </p>
        </div>

        {esrsModules.map((tier) => (
          <div key={tier.tier} className="mb-16 last:mb-0">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{tier.tier} Tier</h3>
                <p className="text-primary-600 font-semibold text-sm">{tier.tierLabel}</p>
              </div>
              <span
                className={`px-4 py-2 rounded-full text-sm font-bold ${
                  tier.tier === "Free"
                    ? "bg-green-100 text-green-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {tier.tier === "Free" ? "Free — No credit card" : "€99/mo"}
              </span>
            </div>

            <p className="text-gray-600 mb-8">{tier.description}</p>

            <div className="space-y-6">
              {tier.modules.map((module) => (
                <div
                  key={module.title}
                  className="p-6 border-l-4 border-primary-600 bg-gray-50 rounded-r-lg hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center text-lg font-bold">
                          {module.icon}
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-gray-900">
                            {module.title}
                          </h4>
                          <p className="text-xs text-primary-600 font-semibold font-mono">
                            {module.ref}
                          </p>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-4">{module.description}</p>
                      <ul className="space-y-2">
                        {module.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center text-gray-700 text-sm">
                            <span className="mr-3 text-primary-600">✓</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Cross-cutting note */}
        <div className="mt-8 p-6 bg-gray-100 rounded-lg text-center">
          <p className="text-gray-700 text-sm">
            <strong>Cross-cutting:</strong> ESRS 2 General Disclosures (governance, strategy, IRO management) are included across all tiers.
            All modules are feature-flagged — you only see what&apos;s relevant to your SME mode.
          </p>
        </div>
      </div>
    </section>
  );
}
