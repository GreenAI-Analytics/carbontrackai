const reasons = [
  {
    icon: "🇪🇺",
    title: "CSRD & ESRS Compliant",
    description:
      "Fully aligned with the European Sustainability Reporting Standards (ESRS E1–E5, S1–S4, G1) and the EU Taxonomy Regulation — built for CSRD assurance readiness.",
  },
  {
    icon: "📋",
    title: "Full ESG Coverage",
    description:
      "Not just carbon. Track Environmental (climate, pollution, water, biodiversity, circular economy), Social (workforce, value chain, communities, consumers), and Governance metrics in one place.",
  },
  {
    icon: "🎯",
    title: "VSME-First Design",
    description:
      "Proportionate for EU SMEs (< 250 employees). Three modes — VSME-Lite, VSME-Full, CSRD-Full — so you only see what's relevant to your compliance obligations.",
  },
  {
    icon: "🔐",
    title: "Audit-Ready & Secure",
    description:
      "Immutable report snapshots, full change history, and ESRS datapoint traceability. Every metric is designed for limited assurance verification.",
  },
  {
    icon: "🌍",
    title: "Multi-Country by Default",
    description:
      "25+ EU countries supported with country-specific emission factors (ADEME, MITECO, Climatiq, EEA), social benchmarks, and governance norms.",
  },
  {
    icon: "💰",
    title: "Free Climate + Materiality Tier",
    description:
      "Climate (E1), Double Materiality assessment, and Report Builder are always free. Unlock all E/S/G modules + EU Taxonomy for €99/mo. No enterprise lock-in.",
  },
];

export function WhyChoose() {
  return (
    <section id="why" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="section-header">Why Choose CarbonTrackAI?</h2>
          <p className="section-description">
            The one-stop ESG reporting platform built for European SMEs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reasons.map((reason, idx) => (
            <div key={idx} className="p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">{reason.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {reason.title}
              </h3>
              <p className="text-gray-600">{reason.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
