export function CTA() {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-primary-600">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-sm font-medium text-green-200 uppercase tracking-wide mb-4">
          Simple pricing, flexible adoption
        </p>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Ready to modernize your ESG reporting?
        </h2>
        <p className="text-xl text-green-100 mb-12 max-w-2xl mx-auto">
          Start free with Climate (E1), Double Materiality, and Report Builder. Unlock all E, S &amp; G modules as you grow — no enterprise lock-in.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 max-w-2xl mx-auto">
          <div className="rounded-xl bg-white/10 backdrop-blur p-8 text-left">
            <p className="text-green-200 text-sm font-medium mb-1">Carbon Track AI — Free</p>
            <p className="text-3xl font-bold text-white mb-3">Free</p>
            <ul className="space-y-2 text-green-100 text-sm mb-6">
              <li>✓ Climate E1 + Scope 1 &amp; 2 engine</li>
              <li>✓ Double materiality assessment</li>
              <li>✓ Report Builder with PDF/Excel export</li>
              <li>✓ ESRS 2 General Disclosures</li>
            </ul>
            <a href="/signup" className="inline-block w-full rounded-lg bg-white px-6 py-3 text-center font-semibold text-primary-600 transition hover:bg-gray-100">
              Get Started
            </a>
          </div>

          <div className="rounded-xl bg-white/10 backdrop-blur p-8 text-left border-2 border-green-300">
            <p className="text-green-200 text-sm font-medium mb-1">Carbon Track AI — Comprehensive</p>
            <p className="text-3xl font-bold text-white mb-3">&euro;99<span className="text-lg font-normal text-green-200">/month</span></p>
            <ul className="space-y-2 text-green-100 text-sm mb-6">
              <li>✓ All E/S/G modules (E2–E5, S1–S4, G1)</li>
              <li>✓ EU Taxonomy alignment</li>
              <li>✓ Full ESRS 2 narrative disclosures</li>
              <li>✓ 30-day free trial included</li>
            </ul>
            <a href="/signup" className="inline-block w-full rounded-lg bg-white px-6 py-3 text-center font-semibold text-primary-600 transition hover:bg-gray-100">
              Start Free Trial
            </a>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-green-100 text-sm">
            Prefer to talk first?{" "}
            <a href="https://greenaianalytics.org#demo" target="_blank" rel="noreferrer" className="underline font-medium text-white hover:text-green-200">
              Book a free demo
            </a>{" "}
            — we'll walk you through the platform in 15 minutes.
          </p>
          <p className="text-green-200 text-xs">
            Part of the{" "}
            <a href="https://greenaianalytics.org" target="_blank" rel="noreferrer" className="underline hover:text-white">
              GreenAI Analytics
            </a>{" "}
            ecosystem — Compliance Tracker, Carbon Track AI, and OS For Work.
          </p>
        </div>
      </div>
    </section>
  );
}
