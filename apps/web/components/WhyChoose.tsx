const reasons = [
  {
    icon: "🇪🇺",
    title: "VSME-Compliant",
    description:
      "Designed specifically for the EU Small and Medium-sized Enterprise (VSME) reporting framework.",
  },
  {
    icon: "💚",
    title: "Action-Focused",
    description:
      "We focus on real reductions, not just compliance. Every calculation drives toward net-zero.",
  },
  {
    icon: "📊",
    title: "Proportionate Data",
    description:
      "Activity-based (kWh, km) by default. Spend-based only as fallback—keeping it simple for SMEs.",
  },
  {
    icon: "🔐",
    title: "Secure & Private",
    description:
      "Your emissions data is yours. Transparent calculations, verifiable factors, no black boxes.",
  },
  {
    icon: "🌍",
    title: "Multi-Country",
    description:
      "25+ EU countries supported with country-specific electricity factors and regulatory data.",
  },
  {
    icon: "💰",
    title: "Affordable",
    description:
      "Free basic module for Scope 1 & 2. Premium modules ≤ €99/month. No enterprise lock-in.",
  },
];

export function WhyChoose() {
  return (
    <section id="why" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="section-header">Why Choose CarbonTrackAI?</h2>
          <p className="section-description">
            Built by carbon experts for European SMEs
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
