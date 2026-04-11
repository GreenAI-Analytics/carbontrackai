const modules = [
  {
    number: 1,
    title: "Basic Emissions",
    subtitle: "Scope 1 & 2",
    description:
      "Log energy usage (electricity, gas, heating oil) and fuel consumption. Get instant emissions calculations with country-specific grid factors.",
    features: [
      "Natural gas & heating oil tracking",
      "Electricity consumption",
      "Company car fuel usage",
      "Automatic grid factor lookup (FR, ES, EU27)",
      "Annual reporting",
    ],
    price: "Free",
  },
  {
    number: 2,
    title: "Comprehensive Emissions",
    subtitle: "Scope 3 (Simplified)",
    description:
      "Track business travel, upstream transport, and supplier spending. Include relevant Scope 3 categories without complexity.",
    features: [
      "Business travel (flights, trains, hotels)",
      "Freight & logistics tracking",
      "Supplier spending analysis",
      "Spend-based factor fallback",
    ],
    price: "Paid",
  },
  {
    number: 3,
    title: "Reduction Targets",
    subtitle: "& Transition Planning",
    description:
      "Set science-based targets and receive decarbonization action recommendations. Track progress year-over-year.",
    features: [
      "Target-setting wizard",
      "SBTi 1.5°C pathway guidance",
      "50+ decarbonization actions",
      "Cost-benefit analysis",
      "Progress monitoring",
    ],
    price: "Paid",
  },
  {
    number: 4,
    title: "Climate Risk",
    subtitle: "& Physical Assets",
    description:
      "Assess location-based climate risks (floods, heatwaves) and evaluate real estate assets with energy labels.",
    features: [
      "Flood risk mapping (EU Climate-ADAPT)",
      "Heat stress assessment",
      "Building footprint & energy labels",
      "Renovation tracking",
      "Risk mitigation planning",
    ],
    price: "Paid",
  },
  {
    number: 5,
    title: "Supply Chain",
    subtitle: "& Product PCF",
    description:
      "Request emissions data from suppliers. Calculate product carbon footprints (cradle-to-gate) using standardized methodologies.",
    features: [
      "Supplier data request templates",
      "Email workflow automation",
      "Product PCF calculator",
      "EN 15804+A2 methodology",
      "Third-party verification ready",
    ],
    price: "Paid",
  },
];

export function Modules() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="section-header">Five Integrated Modules</h2>
          <p className="section-description">
            From basic Scope 1 & 2 to comprehensive climate risk assessment
          </p>
        </div>

        <div className="space-y-6">
          {modules.map((module) => (
            <div
              key={module.number}
              className="p-8 border-l-4 border-primary-600 bg-gray-50 rounded-r-lg hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                      {module.number}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {module.title}
                      </h3>
                      <p className="text-sm text-primary-600 font-semibold">
                        {module.subtitle}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">{module.description}</p>
                  <ul className="space-y-2">
                    {module.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-gray-700">
                        <span className="mr-3 text-primary-600">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="md:text-right">
                  <span
                    className={`inline-block px-4 py-2 rounded-full font-semibold ${
                      module.price === "Free"
                        ? "bg-green-100 text-primary-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {module.price}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
