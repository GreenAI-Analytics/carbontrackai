export function CTA() {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-primary-600">
      <div className="max-w-5xl mx-auto text-center">
        <p className="text-sm font-medium text-green-200 uppercase tracking-wide mb-4">
          Simple pricing, SME-proportionate
        </p>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          One platform, three modes
        </h2>
        <p className="text-xl text-green-100 mb-12 max-w-2xl mx-auto">
          From voluntary VSME to mandatory CSRD — pay only for what your compliance obligations require. No enterprise lock-in.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
          {/* VSME Basic — Free */}
          <div className="rounded-xl bg-white/10 backdrop-blur p-8 text-left">
            <p className="text-green-200 text-sm font-medium mb-1">VSME Basic</p>
            <p className="text-3xl font-bold text-white mb-1">Free</p>
            <p className="text-green-300 text-xs mb-4">Always free — no credit card</p>
            <ul className="space-y-2 text-green-100 text-sm mb-6">
              <li>✓ Climate — Energy &amp; Emissions (E1)</li>
              <li>✓ Own Workforce — Basic (S1)</li>
              <li>✓ Business Conduct — Basic (G1)</li>
              <li>✓ Simplified Double Materiality</li>
              <li>✓ Report Builder (PDF / JSON / iXBRL)</li>
              <li>✓ ESRS 2 General Disclosures</li>
            </ul>
            <a href="/signup" className="inline-block w-full rounded-lg bg-white px-6 py-3 text-center font-semibold text-primary-600 transition hover:bg-gray-100">
              Get Started Free
            </a>
          </div>

          {/* VSME Comprehensive — €99/mo */}
          <div className="rounded-xl bg-white/10 backdrop-blur p-8 text-left border-2 border-green-300">
            <p className="text-green-200 text-sm font-medium mb-1">VSME Comprehensive</p>
            <p className="text-3xl font-bold text-white mb-1">&euro;99<span className="text-lg font-normal text-green-200">/month</span></p>
            <p className="text-green-300 text-xs mb-4">30-day free trial</p>
            <ul className="space-y-2 text-green-100 text-sm mb-6">
              <li>✓ Everything in VSME Basic</li>
              <li>✓ Environmental Extended (E2–E5)</li>
              <li>✓ Social Extended (S2–S4)</li>
              <li>✓ Full Governance (G1)</li>
              <li>✓ Simplified EU Taxonomy</li>
            </ul>
            <a href="/signup" className="inline-block w-full rounded-lg bg-white px-6 py-3 text-center font-semibold text-primary-600 transition hover:bg-gray-100">
              Start Free Trial
            </a>
          </div>

          {/* CSRD — €99/mo */}
          <div className="rounded-xl bg-white/10 backdrop-blur p-8 text-left">
            <p className="text-green-200 text-sm font-medium mb-1">CSRD</p>
            <p className="text-3xl font-bold text-white mb-1">&euro;99<span className="text-lg font-normal text-green-200">/month</span></p>
            <p className="text-green-300 text-xs mb-4">For listed SMEs &amp; subsidiaries</p>
            <ul className="space-y-2 text-green-100 text-sm mb-6">
              <li>✓ Everything in VSME Comprehensive</li>
              <li>✓ Full Double Materiality</li>
              <li>✓ Full EU Taxonomy Alignment</li>
              <li>✓ Expanded ESRS 2 Narratives</li>
              <li>✓ iXBRL / ESEF Export</li>
            </ul>
            <a href="/signup" className="inline-block w-full rounded-lg bg-white px-6 py-3 text-center font-semibold text-primary-600 transition hover:bg-gray-100">
              Get Started
            </a>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-green-100 text-sm">
            Prefer to talk first?{" "}
            <a href="https://greenaianalytics.org#demo" target="_blank" rel="noreferrer" className="underline font-medium text-white hover:text-green-200">
              Book a free demo
            </a>{" "}
            — we&apos;ll walk you through the platform in 15 minutes.
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
