export function Hero() {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-green-50 to-white">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          ESG Reporting Made Simple
        </h1>
        <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
          The all-in-one CSRD & ESRS compliance platform for European SMEs. Measure environmental impact, track social metrics, and report on governance — without the complexity.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <a href="/signup" className="btn-primary text-lg">
            Start Free Trial
          </a>
          <a href="#features" className="btn-secondary text-lg">
            Explore Modules
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
