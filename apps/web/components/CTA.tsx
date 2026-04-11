export function CTA() {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-primary-600">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Ready to measure your carbon footprint?
        </h2>
        <p className="text-xl text-green-100 mb-10">
          Start free with the Basic Module. Upgrade anytime as you scale.
        </p>

        <div className="space-y-4">
          <a
            href="/signup"
            className="inline-block px-8 py-4 bg-white text-primary-600 font-bold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Get Started Free
          </a>
          <p className="text-green-100 text-sm">No credit card required • 30-day free trial on premium modules</p>
        </div>
      </div>
    </section>
  );
}
