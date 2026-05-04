export function Hero() {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-green-50 to-white">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-sm font-medium text-primary-600 uppercase tracking-wide mb-4">
          CSRD &amp; ESRS Compliance for EU SMEs
        </p>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Carbon reporting and CSRD compliance,{" "}
          <span className="text-primary-600">in one clean platform.</span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 mb-4 leading-relaxed max-w-2xl mx-auto">
          Map obligations from your NACE code, automate ESRS workflows, and ship audit-ready reports faster than traditional consulting cycles.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <a href="/signup" className="rounded-lg bg-primary-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-primary-700 shadow-md">
            Get Started Free
          </a>
          <a href="https://greenaianalytics.org#demo" target="_blank" rel="noreferrer" className="rounded-lg border-2 border-primary-200 px-8 py-4 text-lg font-semibold text-primary-700 transition hover:bg-primary-50">
            Book a 15-min Demo
          </a>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center text-sm md:text-base">
          <div>
            <div className="text-3xl font-bold text-primary-600">13</div>
            <p className="text-gray-600">ESRS Modules</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary-600">27</div>
            <p className="text-gray-600">EU Countries</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary-600">Free</div>
            <p className="text-gray-600">Climate + Materiality</p>
          </div>
        </div>
      </div>
    </section>
  );
}
